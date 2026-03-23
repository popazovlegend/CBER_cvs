import { NextRequest, NextResponse } from "next/server";
import { getNotebookById, updateNotebook, deleteNotebook, incrementViews } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/notebooks/[id] — get single notebook
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notebook = getNotebookById(id);

    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    incrementViews(id);

    return NextResponse.json({ ...notebook, views: notebook.views + 1 });
  } catch (error) {
    console.error("GET /api/notebooks/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch notebook" }, { status: 500 });
  }
}

// PATCH /api/notebooks/[id] — update notebook
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updated = updateNotebook(id, {
      title: body.title,
      subject: body.subject,
      author: body.author,
      sourceText: body.sourceText,
      sources: body.sources,
      summary: body.summary,
      audioScript: body.audioScript,
      slides: body.slides,
      rating: body.rating,
      views: body.views,
    }, session.userId as string);

    if (!updated) {
      return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/notebooks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update notebook" }, { status: 500 });
  }
}

// DELETE /api/notebooks/[id] — delete notebook
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const success = deleteNotebook(id, session.userId as string);

    if (!success) {
      return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notebooks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete notebook" }, { status: 500 });
  }
}
