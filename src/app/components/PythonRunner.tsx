"use client";

import { useState } from 'react';

export default function PythonRunner() {
  const [code, setCode] = useState('print("Hello from Python!")');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Python Code Runner</h1>
      
      <textarea
        className="w-full h-48 p-2 border rounded mb-4 font-mono bg-gray-50 dark:bg-gray-800"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        onClick={runCode}
        disabled={loading}
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