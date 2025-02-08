"use client";

import { useState } from 'react';
import Image from 'next/image';
import reps from '../../assets/aarnold-reps-1.png';

// Example code to show users
const EXAMPLE_CODE = `from openai import OpenAI

# Initialize the OpenAI client
client = OpenAI()

# Get history of Austin
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are a helpful assistant that provides historical information about Austin, TX."},
        {"role": "user", "content": "Give me a brief history of Austin, TX"}
    ]
)

# Print the response
print(response.choices[0].message.content)`;

export default function PythonRunner() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [triesLeft, setTriesLeft] = useState(3);

  const isHtmlContent = (str: string) => {
    return /<[a-z][\s\S]*>/i.test(str);
  };

  const runCode = async () => {
    if (triesLeft <= 0) {
      setError('No more attempts remaining');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');

    try {
      const response = await fetch('https://18.118.93.57:8000/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code');
      }

      if (data.error) {
        setError(data.error);
      }
      
      if (data.output) {
        setOutput(data.output);
      }

      setTriesLeft(prev => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-4">Daily Gauntlet AI Challenge</h1>
        <p className="text-gray-600 dark:text-gray-300 font-bold">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      
      <hr className="mb-8" />
      
      <header className="text-center mb-8">
        <div className="mb-8">
          <Image
            src={reps}
            alt="Arnold Schwarzenegger quote: There are no shortcuts, just reps, reps, reps."
            width={600}
            height={400}
            className="mx-auto rounded-lg shadow-lg"
          />
        </div>

        <h1 className="text-2xl font-bold mb-6">OpenAI API Python Challenge</h1>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg mb-8">
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-4">
            Create a Python script that uses the OpenAI API to get and display the history of Austin, TX.
          </p>

          <div className="text-left bg-white dark:bg-gray-900 p-4 rounded-lg">
            <p className="font-bold mb-2">Requirements:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Use the OpenAI API (API key is available as environment variable)</li>
              <li>Print the history of Austin, TX</li>
              <li>Output can be plain text or HTML formatted</li>
            </ul>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 font-medium">
          You have <span className="text-blue-600 dark:text-blue-400 font-bold">{triesLeft}</span> attempts remaining.
        </p>
      </header>
      
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium mb-2">Your Name</label>
        <input
          type="text"
          id="name"
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>
      
      <div className="relative">
        <textarea
          className="w-full h-[400px] p-4 border rounded mb-4 font-mono bg-gray-50 dark:bg-gray-800 disabled:bg-gray-200 dark:disabled:bg-gray-700"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!name.trim() || loading}
          placeholder={!name.trim() ? "Please enter your name first" : "Enter your Python code here"}
        />
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      <button
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        onClick={runCode}
        disabled={loading || !name.trim() || triesLeft <= 0}
      >
        {loading ? 'Running...' : triesLeft > 0 ? 'Run Code' : 'No attempts remaining'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-bold">Error:</p>
          <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {output && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">Output:</h2>
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {isHtmlContent(output) ? (
              <div dangerouslySetInnerHTML={{ __html: output }} />
            ) : (
              <pre className="whitespace-pre-wrap break-words">{output}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 