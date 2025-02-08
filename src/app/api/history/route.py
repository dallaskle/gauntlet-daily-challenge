from http.server import BaseHTTPRequestHandler
import json
import os
from openai import OpenAI

def get_austin_history():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that provides historical information about Austin, TX."},
            {"role": "user", "content": "Give me a brief history of Austin, TX."}
        ]
    )
    
    return response.choices[0].message.content

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            history = get_austin_history()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response_data = {
                "output": history
            }
            
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Get the code from the request
            code = request_data.get('code', '')
            
            # For now, let's just execute the code and capture its output
            # Note: In a production environment, you'd want to add security measures
            output = {}
            try:
                # Create a dictionary to capture the output
                local_dict = {}
                exec(code, {"__builtins__": __builtins__}, local_dict)
                output["output"] = str(local_dict.get('output', ''))
            except Exception as e:
                output["error"] = str(e)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(output).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8')) 