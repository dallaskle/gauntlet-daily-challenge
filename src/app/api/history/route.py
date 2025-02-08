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