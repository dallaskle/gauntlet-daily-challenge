"use client";

import { useState } from 'react';

export default function PythonRunner() {
  const [code, setCode] = useState('print("Hello from Python!")');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [triesLeft, setTriesLeft] = useState(3);
  const runCode = async () => {
    setLoading(true);
    setError('');
    setOutput('');

    try {
      const response = await fetch('/api/run-python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setOutput(data.output);
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
        <p className="text-gray-600 dark:text-gray-300 font-bold">Saturday, February 8th 2025</p>
      </div>
      
      <hr className="mb-8" />
      
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-6">Open AI API Python Challenge</h1>

        <p className="text-gray-600 dark:text-gray-300 font-medium">
          Set up a single file python script that will use the Open AI API that provides the history of Austin, TX.
        </p>

        <p className="text-gray-600 dark:text-gray-300 font-medium">
          The output should be either a basic print statement with a string, such as <code>print("Hello, Austin!")</code>, 
          or a print statement with HTML output wrapped in a string like <code>print("&lt;html&gt;&lt;h1&gt;Welcome to Austin!&lt;/h1&gt;&lt;/html&gt;")</code>.
        </p>

        <p className="text-gray-600 dark:text-gray-300 font-medium">
          You have <span className="text-blue-600 dark:text-blue-400 font-bold">{triesLeft}</span> attempts remaining.
        </p>
      </header>
      <h1 className="text-2xl font-bold mb-4">Python Code Runner</h1>
      
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
      
      <textarea
        className="w-full h-48 p-2 border rounded mb-4 font-mono bg-gray-50 dark:bg-gray-800 disabled:bg-gray-200 dark:disabled:bg-gray-700"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={!name.trim()}
        placeholder={!name.trim() ? "Please enter your name first" : "Enter your Python code here"}
      />
      
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        onClick={runCode}
        disabled={loading || !name.trim()}
      >
        {loading ? 'Running...' : 'Run Code'}
      </button>

      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {output && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">Output:</h2>
          <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded">{output}</pre>
        </div>
      )}
    </div>
  );
} 