import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required." },
        { status: 400 }
      );
    }

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    await createSession(user.id, user.username);

    return NextResponse.json({ id: user.id, username: user.username }, { status: 200 });
  } catch (error) {
    console.error("Login err:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
