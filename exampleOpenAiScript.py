import openai
import os
# Set your API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Call the Chat API with a simple conversation
response = openai.chat.completions.create(
    model="gpt-4o-mini",  # or your chosen model
    messages=[
        {"role": "user", "content": "Tell me about the history of Austin, TX!"}
    ]
)

print(response.choices[0].message.content)


print("""
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h1 style="color: #2c5282; text-align: center; font-size: 2.5em; margin-bottom: 20px;">Welcome to Austin!</h1>
    <p style="color: #4a5568; line-height: 1.6; font-size: 1.1em; text-align: center;">
        The Live Music Capital of the World 🎸
    </p>
</div>
""")