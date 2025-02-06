import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "../../../utils/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, userName } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get the guide content
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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

    const review = JSON.parse(response.choices[0].message.content);

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('prompt_reviews')
      .insert({
        user_name: userName,
        prompt: prompt,
        score: review.score,
        review: review.review,
        suggestions: review.suggestions
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save review to database: ${dbError.message}`);
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error reviewing prompt:", error);
    return NextResponse.json(
      { error: "Failed to review prompt" },
      { status: 500 }
    );
  }
} 