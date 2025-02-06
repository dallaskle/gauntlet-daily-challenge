import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

// Add configuration for extended timeout
export const config = {
  maxDuration: 60, // This extends the timeout to 60 seconds
};

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.STABILITY_API_KEY) {
      return NextResponse.json(
        { error: "Stability API key is not configured" },
        { status: 500 }
      );
    }

    const payload = {
      prompt,
      output_format: "jpeg",
    };

    const response = await axios.postForm(
      `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
      axios.toFormData(payload, new FormData()),
      {
        validateStatus: undefined,
        responseType: "arraybuffer",
        timeout: 55000, // 55 second timeout
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: "image/*",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`${response.status}: ${response.data.toString()}`);
    }

    // Convert the image buffer to base64
    const base64Image = Buffer.from(response.data).toString("base64");
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
} 