"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [userName, setUserName] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [triesLeft, setTriesLeft] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Image Generation Challenge</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Enter a description below to generate an image using Stable Diffusion.
          You have {triesLeft} attempts remaining.
        </p>
      </header>

      <main className="space-y-8">
        {/* Image Display Area */}
        <div className="w-full aspect-square max-w-2xl mx-auto border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 mb-4"
              disabled={triesLeft === 0 || isLoading}
            />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a description for the image..."
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
              rows={3}
              disabled={triesLeft === 0 || isLoading}
            />
          </div>

          <div className="flex justify-center">
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
          </div>

          {error && (
            <div className="text-red-500 text-center mt-4">{error}</div>
          )}
        </form>
      </main>
    </div>
  );
}
