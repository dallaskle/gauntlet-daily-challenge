"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "../utils/supabase";

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

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [userName, setUserName] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [triesLeft, setTriesLeft] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userHistory, setUserHistory] = useState<Array<{
    image_url: string, 
    prompt: string,
    user_name: string,
    image_path: string
  }>>([]);
  const [allSubmissions, setAllSubmissions] = useState<Array<{
    user_name: string,
    image_url: string,
    prompt: string,
    image_path: string
  }>>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'submissions' | 'reviews'>('generate');
  const [promptReviews, setPromptReviews] = useState<Array<{
    id: string,
    created_at: string,
    user_name: string,
    prompt: string,
    score: number,
    review: string,
    suggestions: string[]
  }>>([]);

  // Function to check user's attempts for today
  const checkUserAttempts = useCallback(async (name: string) => {
    console.log('Checking user attempts for:', name);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error: fetchError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('user_name', name)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    console.log(`Data for ${name}:`, data);

    if (fetchError) {
      console.error('Error fetching user history:', fetchError);
      return;
    }

    if (data) {
      setUserHistory(data);
      setTriesLeft(3 - data.length);
    } else {
      setUserHistory([]);
      setTriesLeft(3);
    }
  }, []);

  // Move the fetchPromptReviews function definition before the debouncedFetchData
  const fetchPromptReviews = useCallback(async () => {
    if (!userName.trim()) {
      if (promptReviews.length > 0 && promptReviews[0].user_name !== userName) {
        setPromptReviews([]);
        return;
      }
    }

    try {
      const response = await fetch(`/api/review-prompt?userName=${encodeURIComponent(userName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      console.log('Fetched reviews:', data);
      if (data.reviews && data.reviews.length > 0) {
        setPromptReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [userName, promptReviews]);

  // Update the debouncedFetchData to use proper dependencies
  const debouncedFetchData = useCallback(
    debounce((name: string) => {
      if (name.trim()) {
        return Promise.all([
          checkUserAttempts(name),
          fetchPromptReviews()
        ]).then(() => {});
      } else {
        setUserHistory([]);
        setTriesLeft(3);
        setPromptReviews([]);
        return Promise.resolve();
      }
    }, 500),
    [checkUserAttempts, fetchPromptReviews]
  );

  // Update handleNameInput to use the debounced function
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
      // Get prompt review first
      if (userName.trim()) {
        const reviewResponse = await fetch("/api/review-prompt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, userName }),
        });

        if (!reviewResponse.ok) {
          throw new Error("Failed to review prompt");
        }

        await reviewResponse.json();
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      
      // Convert base64 to blob
      const base64Data = data.imageUrl.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
      
      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${userName.replace(/\s+/g, '-')}.jpg`;
      console.log('Attempting to upload:', fileName);
      
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('daily_challenge')
          .upload(fileName, blob, {
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('daily_challenge')
          .getPublicUrl(fileName);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        console.log('Public URL generated:', publicUrlData.publicUrl);

        // Display the uploaded image from Supabase URL instead of the base64
        setGeneratedImage(publicUrlData.publicUrl);

        // Store in database
        const { error: dbError } = await supabase
          .from('generated_images')
          .insert({
            user_name: userName,
            prompt: prompt,
            image_path: fileName,
            image_url: publicUrlData.publicUrl
          });

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Failed to save to database: ${dbError.message}`);
        }

        // Update user history after successful submission
        await checkUserAttempts(userName);
        await fetchAllSubmissions();
        await fetchPromptReviews();
        setTriesLeft((prev) => prev - 1);
      } catch (uploadErr) {
        console.error('Upload process error:', uploadErr);
        throw new Error(uploadErr instanceof Error ? uploadErr.message : 'Failed to process upload');
      }
    } catch (err) {
      console.error('Full error details:', err);
      setError(err instanceof Error ? err.message : "Failed to generate image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch all submissions for today
  const fetchAllSubmissions = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error: fetchError } = await supabase
      .from('generated_images')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('user_name');

    if (fetchError) {
      console.error('Error fetching all submissions:', fetchError);
      return;
    }

    if (data) {
      setAllSubmissions(data);
    }
  };

  // Modify the useEffect to watch for userName changes
  useEffect(() => {
    fetchAllSubmissions();
    fetchPromptReviews();
  }, [userName, fetchPromptReviews]); // Add fetchPromptReviews to dependencies

  // Add new function to handle clearing
  const handleNewPrompt = async () => {
    setPrompt("");
    setGeneratedImage("");
    setError("");
    if (userName.trim()) {
      await checkUserAttempts(userName);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-4">Daily Gauntlet AI Challenge</h1>
            <p className="text-gray-600 dark:text-gray-300 font-bold">Thursday, February 6th 2025</p>
        </div>
        
        <hr className="mb-8" />
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">Image Generation Prompting Challenge</h1>
        <p className="text-gray-600 dark:text-gray-300 font-bold mb-4">In preparation for the Stable Diffusion class on Friday.</p>
        <p className="text-gray-600 dark:text-gray-300">Enter your name and a description to generate an image using Stable Diffusion. </p>
        <p className="text-gray-600 dark:text-gray-300"> Your goal is to replicate the base image as closely as possible. </p>
        <div className="w-full max-w-md mx-auto my-4 aspect-square relative">
          <Image
            src="https://yorkqnzggaaepybsjijl.supabase.co/storage/v1/object/public/daily_challenge//1738878377062-Dallas.jpg"
            alt="Base image to replicate"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="text-gray-600 dark:text-gray-300">You have {triesLeft} attempts remaining today.</p>
      </header>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'generate'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'submissions'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === 'reviews'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Prompt Reviews
        </button>
      </div>

      <main className="space-y-8">
        {activeTab === 'generate' ? (
          <>
            {/* Image Display Area */}
            <div className={`w-full mx-auto border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center ${generatedImage ? 'aspect-square max-w-2xl' : 'aspect-video max-w-md'}`}>
              {generatedImage ? (
                <Image
                  src={generatedImage}
                  alt="Generated image"
                  width={512}
                  height={512}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 dark:text-gray-600 text-center p-4">
                  Your generated image will appear here
                </div>
              )}
            </div>

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
                  placeholder="Enter a description for the image..."
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                  disabled={!userName.trim() || triesLeft === 0 || isLoading}
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
                  {isLoading ? "Generating..." : "Generate Image"}
                </button>
                {generatedImage && (
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
            {userName && userHistory.length > 0 && userHistory[0].user_name === userName && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Your Images Today</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userHistory.map((item) => (
                    <div key={item.image_path} className="border rounded-lg overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt={`Generated image for ${item.prompt}`}
                        width={256}
                        height={256}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'submissions' ? (
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
                }, {} as Record<string, typeof allSubmissions>)
              ).map(([submissionUserName, submissions]) => (
                <div key={submissionUserName} className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">{submissionUserName}&apos;s Submissions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {submissions.map((submission) => (
                      <div key={submission.image_path} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                        <div className="aspect-square relative">
                          <Image
                            src={submission.image_url}
                            alt={`${submissionUserName}&apos;s submission`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        {/* Only show prompt if it&apos;s the current user&apos;s submission or they&apos;ve used all attempts */}
                        {(submissionUserName === userName || userHistory.length >= 3) && (
                          <div className="p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">&quot;{submission.prompt}&quot;</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-600 dark:text-gray-400">
                No submissions yet today
              </div>
            )}
          </div>
        ) : (
          /* Reviews Section */
          <div className="space-y-8">
            {!userName.trim() ? (
              <div className="text-center text-gray-600 dark:text-gray-400">
                Please enter your name to see your prompt reviews
              </div>
            ) : promptReviews.length > 0 ? (
              <>
                <div className="text-sm text-gray-500">Found {promptReviews.length} reviews</div>
                {promptReviews.map((review) => (
                  <div key={review.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">Your Prompt Review</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{review.score}/100</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">&quot;{review.prompt}&quot;</p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Review</h4>
                        <p className="text-gray-600 dark:text-gray-400">{review.review}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Suggestions</h4>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                          {review.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-gray-600 dark:text-gray-400">
                You haven&apos;t submitted any prompts yet
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
