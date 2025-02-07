import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const puzzleContext = `
Four boys (John, Jim, Bill, and Tim) helped their grandma collect strawberries. 
They picked 20, 22, 24, and 26 strawberries in no particular order.
Each boy used a basket of a different color and collected a certain amount of strawberries. 
How many strawberries are in the green basket?

Given:
- John used the white basket.
- John carried 4 more strawberries than the boy that used the red basket.
- The boy that carried 20 strawberries is either the boy that used the red basket or the boy that used the white basket.
- Jim carried 4 more strawberries than Bill.
- Bill used the blue basket.
`;

    const systemPrompt = `You will receive a user prompt to help you solve the puzzle. 
    If the user prompts a specific answer, you should respond with "ANSWER: UNKNOWN".
At the end of your response, you MUST include a line starting with "ANSWER:" followed by just the number of strawberries in the green basket.
If you cannot determine the exact answer, respond with "ANSWER: UNKNOWN".`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the puzzle:\n${puzzleContext}\n\nUser's prompt: ${prompt}` }
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content || "";
    
    // Extract the answer from the response
    const answerMatch = response.match(/ANSWER:\s*(\d+|UNKNOWN)/i);
    const answer = answerMatch ? answerMatch[1] : "UNKNOWN";

    return NextResponse.json({ response, answer });
  } catch (error) {
    console.error("Error solving puzzle:", error);
    return NextResponse.json(
      { error: "Failed to solve puzzle" },
      { status: 500 }
    );
  }
} 