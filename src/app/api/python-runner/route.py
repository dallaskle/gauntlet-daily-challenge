from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from io import StringIO
import contextlib

@contextlib.contextmanager
def capture_output():
    """Capture stdout and stderr"""
    new_out, new_err = StringIO(), StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    try:
        sys.stdout, sys.stderr = new_out, new_err
        yield sys.stdout, sys.stderr
    finally:
        sys.stdout, sys.stderr = old_out, old_err

def execute_python_code(code):
    # Set up allowed environment variables
    allowed_env = {
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY')
    }
    
    # Create a restricted globals dictionary
    restricted_globals = {
        '__builtins__': {
            'print': print,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'list': list,
            'dict': dict,
            'len': len,
            'range': range,
            'os': os,  # Only included because we need it for OpenAI
        },
        'os': os,  # Only included because we need it for OpenAI
    }
    
    # Add OpenAI imports
    exec('import openai', restricted_globals)
    exec('from openai import OpenAI', restricted_globals)
    
    with capture_output() as (out, err):
        try:
            # Execute the code with restricted globals
            exec(code, restricted_globals)
            output = out.getvalue()
            error = err.getvalue()
            return output, error, None
        except Exception as e:
            return out.getvalue(), err.getvalue(), str(e)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Get content length
        content_length = int(self.headers['Content-Length'])
        
        # Read the POST data
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        # Get the code from the request
        code = data.get('code')
        
        if not code:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "No code provided"
            }).encode('utf-8'))
            return
            
        # Execute the code
        output, error_output, exception = execute_python_code(code)
        
        # Prepare response
        response_data = {
            "output": output,
            "error": error_output or exception
        }
        
        # Send response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response_data).encode('utf-8')) 