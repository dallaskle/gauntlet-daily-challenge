"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";

interface PuzzleSubmission {
  id: number;
  user_name: string;
  prompt: string;
  ai_response: string;
  answer: string;
  created_at: string;
}

function debounce<T extends (name: string) => Promise<void>>(
  func: T,
  wait: number
): (name: string) => void {
  let timeout: NodeJS.Timeout;
  return (name: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(name), wait);
  };
}

export default function Feb7_LogicPuzzle() {
  const [prompt, setPrompt] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [parsedAnswer, setParsedAnswer] = useState("");
  const [userHistory, setUserHistory] = useState<PuzzleSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<PuzzleSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'solve' | 'submissions'>('solve');

  // Function to check user's attempts
  const checkUserAttempts = useCallback(async (name: string) => {
    console.log('Checking user attempts for:', name);
    
    const { data, error: fetchError } = await supabase
      .from('logic_puzzle_submissions')
      .select('*')
      .eq('user_name', name)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching user history:', fetchError);
      return;
    }

    if (data) {
      setUserHistory(data);
    } else {
      setUserHistory([]);
    }
  }, []);

  // Calculate triesLeft based on userHistory
  const triesLeft = userName.trim() ? 3 - userHistory.length : 3;

  // Fetch all submissions
  const fetchAllSubmissions = async () => {
    const { data, error: fetchError } = await supabase
      .from('logic_puzzle_submissions')
      .select('*')
      .order('user_name');

    if (fetchError) {
      console.error('Error fetching all submissions:', fetchError);
      return;
    }

    if (data) {
      setAllSubmissions(data);
    }
  };

  // Update the debouncedFetchData to only handle user attempts
  const debouncedFetchData = useCallback(
    debounce((name: string) => {
      if (name.trim()) {
        return checkUserAttempts(name);
      } else {
        setUserHistory([]);
        return Promise.resolve();
      }
    }, 500),
    [checkUserAttempts]
  );

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
    setUserHistory([]); // Clear immediately
    debouncedFetchData(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (triesLeft <= 0) {
      setError("You have used all your attempts.");
      return;
    }

    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/solve-puzzle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to solve puzzle");
      }

      const data = await response.json();
      setAiResponse(data.response);
      setParsedAnswer(data.answer);

      // Store in database
      const { error: dbError } = await supabase
        .from('logic_puzzle_submissions')
        .insert({
          user_name: userName,
          prompt: prompt,
          ai_response: data.response,
          answer: data.answer
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to save to database: ${dbError.message}`);
      }

      // Update user history and all submissions
      await checkUserAttempts(userName);
      await fetchAllSubmissions();
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : "Failed to process submission. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPrompt = () => {
    setPrompt("");
    setAiResponse("");
    setParsedAnswer("");
    setError("");
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-4">Daily Gauntlet AI Challenge</h1>
        <p className="text-gray-600 dark:text-gray-300 font-bold">Wednesday, February 7th 2025</p>
      </div>
      
      <hr className="mb-8" />
      
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-4">Logic Puzzle Challenge</h1>
        <div className="prose dark:prose-invert max-w-none mb-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">Four boys (John, Jim, Bill, and Tim) helped their grandma collect strawberries.</p>
          <p className="text-gray-600 dark:text-gray-300 mb-2">They picked 20, 22, 24, and 26 strawberries in no particular order.</p>
          <p className="text-gray-600 dark:text-gray-300 mb-2">Each boy used a basket of a different color and collected a certain amount of strawberries.</p>
          <p className="text-gray-600 dark:text-gray-300 mb-2">How many strawberries are in the green basket?</p>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4">
            <p className="mb-2">Given:</p>
            <ul className="list-disc list-inside">
              <li>John used the white basket.</li>
              <li>John carried 4 more strawberries than the boy that used the red basket.</li>
              <li>The boy that carried 20 strawberries is either the boy that used the red basket or the boy that used the white basket.</li>
              <li>Jim carried 4 more strawberries than Bill.</li>
              <li>Bill used the blue basket.</li>
            </ul>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mt-4">You have {triesLeft} attempts remaining.</p>
      </header>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('solve')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'solve'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Solve
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'submissions'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Submissions {allSubmissions.length > 0 ? `(${allSubmissions.length})` : ''}
        </button>
      </div>

      <main className="space-y-8">
        {activeTab === 'solve' ? (
          <>
            {/* AI Response Display Area */}
            {aiResponse && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4">AI Response</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{aiResponse}</p>
                </div>
                {parsedAnswer && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p className="font-semibold">Parsed Answer:</p>
                    <p className="text-lg">{parsedAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={userName}
                  onChange={handleNameInput}
                  placeholder="Enter your name..."
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 mb-4"
                  disabled={isLoading}
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt to help solve the puzzle..."
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                  disabled={!userName.trim() || triesLeft === 0}
                />
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  type="submit"
                  disabled={!prompt || !userName || triesLeft === 0 || isLoading}
                  className={`px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold
                    ${
                      (!prompt || !userName || triesLeft === 0 || isLoading)
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-blue-700"
                    }`}
                >
                  {isLoading ? "Processing..." : "Submit"}
                </button>
                {aiResponse && (
                  <button
                    type="button"
                    onClick={handleNewPrompt}
                    className="px-6 py-3 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700"
                  >
                    New Prompt
                  </button>
                )}
              </div>

              {error && (
                <div className="text-red-500 text-center mt-4">{error}</div>
              )}
            </form>

            {/* History Section */}
            {userName && userHistory.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Your Previous Attempts</h2>
                <div className="space-y-4">
                  {userHistory.map((submission) => (
                    <div key={submission.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                      <p className="font-semibold mb-2">Prompt:</p>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{submission.prompt}</p>
                      <p className="font-semibold mb-2">Response:</p>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{submission.ai_response}</p>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        <p className="font-semibold">Answer:</p>
                        <p className="text-lg">{submission.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* All Submissions Section */
          <div className="space-y-8">
            {allSubmissions.length > 0 ? (
              Object.entries(
                allSubmissions.reduce((acc, submission) => {
                  if (!acc[submission.user_name]) {
                    acc[submission.user_name] = [];
                  }
                  acc[submission.user_name].push(submission);
                  return acc;
                }, {} as Record<string, PuzzleSubmission[]>)
              ).map(([submissionUserName, submissions]) => (
                <div key={submissionUserName} className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">{submissionUserName}&apos;s Submissions</h3>
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <p className="text-sm text-gray-500 mb-2">
                          {new Date(submission.created_at).toLocaleString()}
                        </p>
                        {/* Only show details if it's the current user's submission or they've used all attempts */}
                        {(submissionUserName === userName || userHistory.length >= 3) ? (
                          <>
                            <p className="font-semibold mb-2">Prompt:</p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{submission.prompt}</p>
                            <p className="font-semibold mb-2">Response:</p>
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{submission.ai_response}</p>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                              <p className="font-semibold">Answer:</p>
                              <p className="text-lg">{submission.answer}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400">
                            Complete your attempts to see other users&apos; solutions
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-600 dark:text-gray-400">
                No submissions yet
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 