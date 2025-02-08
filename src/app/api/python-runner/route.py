import json
import os
import sys
from io import StringIO
import contextlib
from typing import Dict, Any
from http.server import BaseHTTPRequestHandler
from http import HTTPStatus

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

def create_safe_globals():
    """Create a safe globals dictionary with necessary imports"""
    safe_builtins = {
        name: getattr(__builtins__, name)
        for name in [
            'print', 'str', 'int', 'float', 'bool', 'list', 'dict', 
            'len', 'range', 'TypeError', 'ValueError', 'Exception'
        ]
    }
    
    safe_globals = {
        '__builtins__': safe_builtins,
        'os': {
            'getenv': os.getenv  # Only expose getenv for API keys
        }
    }
    
    # Add OpenAI client
    try:
        from openai import OpenAI
        safe_globals['OpenAI'] = OpenAI
        safe_globals['client'] = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    except ImportError as e:
        print(f"Warning: OpenAI import failed: {e}")
    
    return safe_globals

def execute_python_code(code: str):
    """Execute Python code in a restricted environment"""
    safe_globals = create_safe_globals()
    
    with capture_output() as (out, err):
        try:
            # First try to compile the code to catch syntax errors
            compiled_code = compile(code, '<string>', 'exec')
            
            # Then execute if compilation succeeded
            exec(compiled_code, safe_globals)
            
            output = out.getvalue()
            error = err.getvalue()
            return {
                'status': HTTPStatus.OK,
                'body': {
                    'output': output,
                    'error': error if error else None
                }
            }
        except Exception as e:
            return {
                'status': HTTPStatus.BAD_REQUEST,
                'body': {
                    'output': out.getvalue(),
                    'error': f"{type(e).__name__}: {str(e)}"
                }
            }

def POST(request):
    """Handle POST requests to execute Python code"""
    try:
        # Get the request body
        if not hasattr(request, 'body'):
            return {
                'status': HTTPStatus.BAD_REQUEST,
                'body': {'error': 'No request body found'}
            }
            
        data = json.loads(request.body.decode())
        code = data.get('code')
        
        if not code:
            return {
                'status': HTTPStatus.BAD_REQUEST,
                'body': {'error': 'No code provided'}
            }
        
        # Execute the code and return results
        result = execute_python_code(code)
        return result
        
    except json.JSONDecodeError:
        return {
            'status': HTTPStatus.BAD_REQUEST,
            'body': {'error': 'Invalid JSON in request body'}
        }
    except Exception as e:
        return {
            'status': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': {'error': f'Server error: {str(e)}'}
        } 