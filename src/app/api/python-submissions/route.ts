import { NextResponse } from "next/server";
import { supabase } from "../../../utils/supabase";

export async function POST(request: Request) {
  try {
    const { userName, code } = await request.json();

    if (!userName || !code) {
      return NextResponse.json(
        { error: "Username and code are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('python_submissions')
      .insert({
        user_name: userName,
        code_input: code
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ submission: data });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');

    let query = supabase
      .from('python_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (userName) {
      query = query.eq('user_name', userName);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ submissions: data });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userName, code, output, error } = await request.json();

    if (!userName || !code) {
      return NextResponse.json(
        { error: "Username and code are required" },
        { status: 400 }
      );
    }

    const { data, error: dbError } = await supabase
      .from('python_submissions')
      .update({
        output,
        error
      })
      .eq('user_name', userName)
      .eq('code_input', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ submission: data });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
} 