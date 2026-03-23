import { NextRequest, NextResponse } from "next/server";
import { getAllNotebooks, createNotebook } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/notebooks — list notebooks
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.userId as string | undefined;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const isExplore = searchParams.get("explore") === "true";

    const notebooks = getAllNotebooks(query, subject, userId, isExplore);
    return NextResponse.json(notebooks);
  } catch (error) {
    console.error("GET /api/notebooks error:", error);
    return NextResponse.json({ error: "Failed to fetch notebooks" }, { status: 500 });
  }
}

// POST /api/notebooks — create a new notebook
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, subject, author, sourceText, sources } = body;

    const notebook = createNotebook({
      title: title?.trim() || "Untitled Project",
      subject: subject || "General",
      author: author || session.username, // Default author to username
      sourceText: sourceText || "",
      sources: sources || "[]",
      userId: session.userId as string,
    });

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error("POST /api/notebooks error:", error);
    return NextResponse.json({ error: "Failed to create notebook" }, { status: 500 });
  }
}
