import { NextResponse } from "next/server";
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Add configuration for extended timeout
export const config = {
  maxDuration: 30, // 30 second timeout
};

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
      // Write the code to the temporary file
      await writeFile(tempFilePath, code);

      // Execute the Python code
      const output = await new Promise<string>((resolve, reject) => {
        execFile('python3', [tempFilePath], (error, stdout, stderr) => {
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