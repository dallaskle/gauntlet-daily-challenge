"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Add auto-resize function
  const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setPrompt(textarea.value);
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set new height based on scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Add function to compute answer distribution
  const getAnswerDistribution = () => {
    const distribution = allSubmissions.reduce((acc: { [key: string]: number }, submission) => {
      const answer = submission.answer;
      acc[answer] = (acc[answer] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution).map(([answer, count]) => ({
      answer,
      count
    }));
  };

  // Add function to check if user has correct answer
  const hasCorrectAnswer = (userSubmissions: PuzzleSubmission[]) => {
    return userSubmissions.some(submission => submission.answer === "26");
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-4">Daily Gauntlet AI Challenge</h1>
        <p className="text-gray-600 dark:text-gray-300 font-bold">Wednesday, February 7th 2025</p>
      </div>
      
      <hr className="mb-8" />
      
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-6">Logic Puzzle Challenge</h1>

        <p className="text-gray-600 dark:text-gray-300 font-medium">
          Try to see if you can get gpt-4o-mini to reason through this logic puzzle and solve it correctly. <br />
          It will be fed a basic system prompt (so you can&apos;t cheat), the puzzle, and your prompt.
        </p>

        {/* Resources */}
        <div className="mt-4 mb-6 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Helpful resources:
            <br />
            <a href="https://platform.openai.com/docs/guides/prompt-engineering" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500">
              OpenAI Prompt Engineering Guide
            </a>
            <br />
            <a href="https://community.openai.com/t/a-better-chain-of-thought-prompt/128180" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500">
              Chain of Thought Prompting Discussion
            </a>
          </p>
        </div>
        
        {/* Initial puzzle description */}
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">
              Four boys (John, Jim, Bill, and Tim) helped their grandma collect strawberries.
              They picked 20, 22, 24, and 26 strawberries in no particular order.
              Each boy used a basket of a different color and collected a certain amount of strawberries.
            </p>
            <p className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              How many strawberries are in the green basket?
            </p>
          </div>
        </div>

        {/* Given information in a styled card */}
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Given:</h3>
          <ul className="space-y-2 text-left list-none">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">John used the white basket.</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">John carried 4 more strawberries than the boy that used the red basket.</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">The boy that carried 20 strawberries is either the boy that used the red basket or the boy that used the white basket.</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Tim wore a red shirt while collecting strawberries.</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">One of the baskets was handmade by Grandma.</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Jim carried 4 more strawberries than Bill.</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 mt-2 mr-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Bill used the blue basket.</span>
            </li>
          </ul>
        </div>

        <p className="text-gray-600 dark:text-gray-300 font-medium">
          You have <span className="text-blue-600 dark:text-blue-400 font-bold">{triesLeft}</span> attempts remaining.
        </p>
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
                    <div className="flex items-center gap-2">
                      <p className="text-lg">{parsedAnswer}</p>
                      {parsedAnswer === "26" && (
                        <span className="text-green-500 font-bold">✓ Correct!</span>
                      )}
                      {parsedAnswer !== "26" && parsedAnswer !== "UNKNOWN" && (
                        <span className="text-red-500 font-bold">✗ Incorrect</span>
                      )}
                    </div>
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
                  onChange={handleTextAreaInput}
                  placeholder="Enter your prompt to help solve the puzzle..."
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 min-h-[200px] resize-none overflow-hidden"
                  rows={8}
                  style={{ height: 'auto' }}
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
                        <div className="flex items-center gap-2">
                          <p className="text-lg">{submission.answer}</p>
                          {submission.answer === "26" && (
                            <span className="text-green-500 font-bold">✓ Correct!</span>
                          )}
                          {submission.answer !== "26" && submission.answer !== "UNKNOWN" && (
                            <span className="text-red-500 font-bold">✗ Incorrect</span>
                          )}
                        </div>
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
            {/* Add Answer Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Answer Distribution</h3>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAnswerDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="answer" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

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
                        {/* Only show details if it's the current user's submission, they've used all attempts, or they have a correct answer */}
                        {(submissionUserName === userName || 
                          userHistory.length >= 3 || 
                          (userName && hasCorrectAnswer(userHistory))) ? (
                          <>
                            <p className="font-semibold mb-2">Prompt:</p>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{submission.prompt}</p>
                            <p className="font-semibold mb-2">Response:</p>
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{submission.ai_response}</p>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                              <p className="font-semibold">Answer:</p>
                              <div className="flex items-center gap-2">
                                <p className="text-lg">{submission.answer}</p>
                                {submission.answer === "26" && (
                                  <span className="text-green-500 font-bold">✓ Correct!</span>
                                )}
                                {submission.answer !== "26" && submission.answer !== "UNKNOWN" && (
                                  <span className="text-red-500 font-bold">✗ Incorrect</span>
                                )}
                              </div>
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