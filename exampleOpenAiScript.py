import openai
import os
# Set your API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Call the Chat API with a simple conversation
response = openai.chat.completions.create(
    model="gpt-4o-mini",  # or your chosen model
    messages=[
        {"role": "user", "content": "Hello, world!"}
    ]
)

print(response.choices[0].message.content)