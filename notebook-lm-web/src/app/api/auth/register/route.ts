import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByUsername } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password || username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: "Username must be 3+ chars, password 6+ chars." },
        { status: 400 }
      );
    }

    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: "Username already taken." },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const user = createUser(username, hash);

    await createSession(user.id, user.username);

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (error) {
    console.error("Register err:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
