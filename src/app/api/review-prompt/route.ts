import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "../../../utils/supabase";
import { Review } from "../../../types/reviews";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  try {
    // Get userName from URL params
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');

    console.log('Fetching reviews for user:', userName);

    if (!userName) {
      return NextResponse.json(
        { error: "userName is required" },
        { status: 400 }
      );
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch reviews from Supabase
    const { data, error } = await supabase
      .from('prompt_reviews')
      .select<'*', Review>('*')
      .eq('user_name', userName)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    console.log('Found reviews:', data);

    if (error) {
      console.error('Error fetching reviews:', error);
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }

    return NextResponse.json({ reviews: data });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { prompt, userName } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // If no existing review, proceed with creating a new one
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a Stable Diffusion prompt expert. You will review prompts based on the provided guide and give a score out of 100. Provide a brief explanation for the score and suggestions for improvement."
        },
        {
          role: "user",
          content: `Please review this prompt based on the Stable Diffusion guide and give it a score out of 100:
          
          Prompt: "${prompt}"
          
          Guide:
          ${process.env.STABLE_DIFFUSION_GUIDE}
          
          Format your response as JSON with the following fields:
          - score: number between 0-100
          - review: brief explanation of the score
          - suggestions: list of suggestions for improvement`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Add null check and throw error if content is null
    if (!response.choices[0].message.content) {
      throw new Error("OpenAI response content was null");
    }

    const review = JSON.parse(response.choices[0].message.content as string);

    // Save to Supabase
    const { data: newReview, error: dbError } = await supabase
      .from('prompt_reviews')
      .insert({
        user_name: userName,
        prompt: prompt,
        score: review.score,
        review: review.review,
        suggestions: review.suggestions
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save review to database: ${dbError.message}`);
    }

    return NextResponse.json(newReview);
  } catch (error) {
    console.error("Error reviewing prompt:", error);
    return NextResponse.json(
      { error: "Failed to review prompt" },
      { status: 500 }
    );
  }
} 