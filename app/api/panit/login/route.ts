import { NextResponse } from "next/server";
import { getPassword } from "@/lib/sheets";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const trimmedPassword = password.trim();
    if (trimmedPassword.length !== 6 || !/^\d{6}$/.test(trimmedPassword)) {
      return NextResponse.json(
        { error: "Password must be exactly 6 digits" },
        { status: 400 }
      );
    }

    const correctPassword = await getPassword();
    if (!correctPassword) {
      return NextResponse.json(
        { error: "Password not configured" },
        { status: 500 }
      );
    }

    if (trimmedPassword !== correctPassword.trim()) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/panit/login] Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}