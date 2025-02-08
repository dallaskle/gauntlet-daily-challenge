import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const code = data.code;

    if (!code) {
      return NextResponse.json(
        { error: "No code provided" },
        { status: 400 }
      );
    }

    // Write the code to a temporary file
    const fs = require('fs').promises;
    const tempFile = `/tmp/python_code_${Date.now()}.py`;
    await fs.writeFile(tempFile, code);

    try {
      // Execute the Python code
      const { stdout, stderr } = await execAsync(`python3 ${tempFile}`);
      
      // Clean up the temporary file
      await fs.unlink(tempFile);

      return NextResponse.json({
        output: stdout,
        error: stderr
      });
    } catch (execError: any) {
      // Clean up the temporary file even if execution failed
      await fs.unlink(tempFile);

      return NextResponse.json({
        output: execError.stdout || "",
        error: execError.stderr || execError.message
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 