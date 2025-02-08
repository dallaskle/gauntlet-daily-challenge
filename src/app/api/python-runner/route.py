import json
import os
import sys
from io import StringIO
import contextlib
from typing import Dict, Any
from http import HTTPStatus
from next.server import NextRequest, NextResponse

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

def execute_python_code(code: str):
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

async def POST(request: NextRequest):
    try:
        # Get the request body
        data = await request.json()
        
        # Get the code from the request
        code = data.get('code')
        
        if not code:
            return NextResponse.json(
                {"error": "No code provided"},
                status=400
            )
            
        # Execute the code
        output, error_output, exception = execute_python_code(code)
        
        # Prepare response
        response_data = {
            "output": output,
            "error": error_output or exception
        }
        
        # Send response
        return NextResponse.json(response_data)
        
    except Exception as e:
        return NextResponse.json(
            {"error": str(e)},
            status=500
        ) 