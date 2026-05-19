import { NextResponse } from "next/server";
import { visionCompletion } from "@/lib/ai";

// @ts-ignore
const pdf = require("pdf-parse");

// Allow large file uploads (default is 1MB which is too small for photos)
export const config = {
    api: {
        bodyParser: false,
    },
};

// Next.js App Router: increase body size limit to 50MB
export const maxDuration = 60; // Allow up to 60 seconds for vision processing

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`[Process] Received file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

        const buffer = Buffer.from(await file.arrayBuffer());

        if (file.type === "application/pdf") {
            try {
                const data = await pdf(buffer);
                return NextResponse.json({ text: data.text });
            } catch (e) {
                console.error("PDF Error", e);
                return NextResponse.json({ error: "PDF Parse Failed" }, { status: 500 });
            }
        } else if (file.type.startsWith("image/")) {
            // Use OpenRouter Vision via OpenAI-compatible API
            const base64Image = buffer.toString("base64");

            const prompt = `
            Transcribe EVERYTHING in this image into text. 
            
            IMPORTANT Instructions:
            1. If there is handwriting, transcribe it exactly.
            2. If there are tables or diagrams, describe them in detail.
            3. The output should be a perfect textual representation of the image for note-taking purposes.
            4. If the text in the image is in Russian, keep it in Russian. If it's English, keep it English (but translate explanation if needed). 
            5. PREFER RUSSIAN for descriptions.
            `;

            try {
                const text = await visionCompletion(prompt, base64Image, file.type);
                return NextResponse.json({ text });
            } catch (e: any) {
                console.error("[Process] Vision error:", e.message);
                return NextResponse.json(
                    { error: `Ошибка распознавания изображения: ${e.message}` },
                    { status: 500 }
                );
            }

        } else {
            // Fallback for text files
            const text = buffer.toString("utf-8");
            return NextResponse.json({ text });
        }

    } catch (error: any) {
        console.error("Processing error:", error);
        return NextResponse.json(
            { error: `Failed to process file: ${error.message}` },
            { status: 500 }
        );
    }
}
