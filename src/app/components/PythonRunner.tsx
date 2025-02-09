"use client";

import { useState, useEffect, useCallback } from 'react';
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

interface PythonSubmission {
  id: number;
  user_name: string;
  code_input: string;
  output: string | null;
  error: string | null;
  created_at: string;
}

export default function PythonRunner() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'challenge' | 'submissions'>('challenge');
  const [userSubmissions, setUserSubmissions] = useState<PythonSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<PythonSubmission[]>([]);

  const isHtmlContent = (str: string) => {
    return /<[a-z][\s\S]*>/i.test(str);
  };

  // Add function to fetch user submissions
  const fetchUserSubmissions = useCallback(async (userName: string) => {
    try {
      const response = await fetch(`/api/python-submissions?userName=${encodeURIComponent(userName)}`);
      if (!response.ok) throw new Error('Failed to fetch user submissions');
      const data = await response.json();
      setUserSubmissions(data.submissions);
    } catch (error) {
      console.error('Error fetching user submissions:', error);
    }
  }, []);

  // Add function to fetch all submissions
  const fetchAllSubmissions = useCallback(async () => {
    try {
      const response = await fetch('/api/python-submissions');
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      setAllSubmissions(data.submissions);
    } catch (error) {
      console.error('Error fetching all submissions:', error);
    }
  }, []);

  // Update handleNameInput to a simpler version
  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setError(''); // Clear any existing errors
    
    if (newName.trim()) {
      fetchUserSubmissions(newName);
    } else {
      setUserSubmissions([]);
    }
  };

  // Modify runCode with simpler check
  const runCode = async () => {
    if (!name.trim()) {
      setError('Please enter your name first');
      return;
    }

    if (userSubmissions.length >= 3) {
      setError('Maximum submission limit (3) reached for this username');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');

    try {
      // Create initial submission
      const createResponse = await fetch('/api/python-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: name, code }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create submission');
      }

      // Execute code
      const response = await fetch('https://python.bydallas.com:8000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code');
      }

      // Update submission with results
      const updateResponse = await fetch('/api/python-submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: name,
          code,
          output: data.output,
          error: data.error
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update submission');
      }

      if (data.error) {
        setError(data.error);
      }
      
      if (data.output) {
        setOutput(data.output);
      }

      // Refresh submissions
      await fetchUserSubmissions(name);
      await fetchAllSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to fetch all submissions on mount
  useEffect(() => {
    fetchAllSubmissions();
  }, [fetchAllSubmissions]);

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
          <p className="text-gray-600 dark:text-gray-300 font-medium">
          The output should be either a basic print statement with a string, such as <br /><br />
          <code>print(&quot;The History of Austin!&quot;)</code>, 
          <br /><br />or a print statement with HTML output 
          wrapped in a string like<br /><br /> 
          <code>print(&quot;&lt;html&gt;&lt;h1&gt;The History of Austin!&lt;/h1&gt;&lt;/html&gt;&quot;)</code>. <br /><br />
          You have access to the &quot;OPENAI_API_KEY&quot; environment variable. <br /><br />
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
          You have <span className="text-blue-600 dark:text-blue-400 font-bold">{3 - userSubmissions.length}</span> attempts remaining.
        </p>
      </header>
      
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium mb-2">Your Name</label>
        <input
          type="text"
          id="name"
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
          value={name}
          onChange={handleNameInput}
          placeholder="Enter your name"
        />
      </div>
      
      <div className="relative">
        <p className="text-gray-600 dark:text-gray-300 font-medium">Just write/paste your full python script here. Imports and everything | requirements.txt= openai==1.55.3</p>
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
        disabled={loading || !name.trim() || userSubmissions.length >= 3}
      >
        {loading ? 'Running...' : userSubmissions.length < 3 ? 'Run Code' : 'No attempts remaining'}
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

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Past Submissions</h2>
        
        <div className="flex space-x-2 mb-8 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('challenge')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              activeTab === 'challenge'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Your Submissions
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              activeTab === 'submissions'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            All Submissions
          </button>
        </div>

        {activeTab === 'challenge' ? (
          <>
            {userSubmissions.length > 0 ? (
              <div className="space-y-4">
                {userSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <p className="text-sm text-gray-500 mb-4">
                      {new Date(submission.created_at).toLocaleString()}
                    </p>
                    <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded whitespace-pre-wrap">
                      {submission.code_input}
                    </pre>
                    {submission.output && (
                      <div className="mt-4">
                        <h4 className="font-bold">Output:</h4>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                          {isHtmlContent(submission.output) ? (
                            <div dangerouslySetInnerHTML={{ __html: submission.output }} />
                          ) : (
                            <pre className="whitespace-pre-wrap">{submission.output}</pre>
                          )}
                        </div>
                      </div>
                    )}
                    {submission.error && (
                      <div className="mt-4">
                        <h4 className="font-bold text-red-500">Error:</h4>
                        <pre className="p-4 bg-red-50 dark:bg-red-900 rounded whitespace-pre-wrap">
                          {submission.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">
                No submissions yet
              </p>
            )}
          </>
        ) : (
          <div className="space-y-8">
            {Object.entries(
              allSubmissions.reduce((acc, submission) => {
                if (!acc[submission.user_name]) {
                  acc[submission.user_name] = [];
                }
                acc[submission.user_name].push(submission);
                return acc;
              }, {} as Record<string, PythonSubmission[]>)
            ).map(([submissionUserName, submissions]) => (
              <div key={submissionUserName} className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">{submissionUserName}&apos;s Submissions</h3>
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <details key={submission.id} className="border-t pt-4">
                      <summary className="cursor-pointer">
                        Submission from {new Date(submission.created_at).toLocaleString()}
                      </summary>
                      <div className="mt-4">
                        <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded whitespace-pre-wrap">
                          {submission.code_input}
                        </pre>
                        {submission.output && (
                          <div className="mt-2">
                            <h4 className="font-bold">Output:</h4>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                              {isHtmlContent(submission.output) ? (
                                <div dangerouslySetInnerHTML={{ __html: submission.output }} />
                              ) : (
                                <pre className="whitespace-pre-wrap">{submission.output}</pre>
                              )}
                            </div>
                          </div>
                        )}
                        {submission.error && (
                          <div className="mt-2">
                            <h4 className="font-bold text-red-500">Error:</h4>
                            <pre className="p-4 bg-red-50 dark:bg-red-900 rounded whitespace-pre-wrap">
                              {submission.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 