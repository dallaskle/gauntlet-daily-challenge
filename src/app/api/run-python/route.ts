import { NextResponse } from "next/server";
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Add configuration for extended timeout
export const config = {
  maxDuration: 30, // 30 second timeout
};

// Define allowed environment variables
const ALLOWED_ENV_VARS = [
  'OPENAI_API_KEY',
  'PUBLIC_API_KEY',
  // Add other allowed environment variables here
];

// Define default imports that will be prepended to every script
const DEFAULT_IMPORTS = `import os
import openai

# Configure OpenAI with environment variable
openai.api_key = os.getenv('OPENAI_API_KEY')

# User code begins below
`;

// Get the Python interpreter path - use system Python on Vercel, venv locally
const PYTHON_PATH = process.env.VERCEL
  ? 'python3'  // Use system Python on Vercel
  : join(process.cwd(), '.venv', 
      process.platform === 'win32' ? 'Scripts\\python.exe' : 'bin/python3'
    );

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'No code provided' },
        { status: 400 }
      );
    }

    // Create a temporary file path with a unique name
    const tempFilePath = join(tmpdir(), `script-${Date.now()}.py`);

    try {
      // Write the code to the temporary file with default imports
      await writeFile(tempFilePath, DEFAULT_IMPORTS + code);

      // Filter environment variables to only include allowed ones
      const filteredEnv = Object.fromEntries(
        ALLOWED_ENV_VARS
          .map(key => [key, process.env[key]])
          .filter(([_, value]) => value !== undefined)
      );

      // Execute the Python code with filtered environment variables
      const output = await new Promise<string>((resolve, reject) => {
        execFile(PYTHON_PATH, [tempFilePath], {
          env: {
            ...filteredEnv,
            PATH: process.env.PATH, // Ensure Python can still access system paths
          }
        }, (error, stdout, stderr) => {
          // Clean up the temporary file
          unlink(tempFilePath).catch(console.error);

          if (error) {
            reject(stderr || error.message);
            return;
          }
          resolve(stdout);
        });
      });

      return NextResponse.json({ output });
    } catch (err) {
      // Clean up the temporary file in case of error
      unlink(tempFilePath).catch(console.error);
      throw err;
    }
  } catch (err) {
    console.error('Error executing Python code:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to execute Python code' },
      { status: 500 }
    );
  }
} 