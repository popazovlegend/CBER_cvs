import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// @ts-ignore
const pdf = require("pdf-parse");

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY || "";
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

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
            // Use Gemini Vision via Google SDK
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

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: file.type
                    }
                }
            ]);

            return NextResponse.json({ text: result.response.text() });

        } else {
            // Fallback for text files
            const text = buffer.toString("utf-8");
            return NextResponse.json({ text });
        }

    } catch (error) {
        console.error("Processing error:", error);
        return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }
}
