import { NextResponse } from "next/server";
import { OpenAI } from "openai";
// @ts-ignore
const pdf = require("pdf-parse");

export async function POST(req: Request) {
    const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY || "dummy", // Fallback for build
    });
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        if (file.type === "application/pdf") {
            const data = await pdf(buffer);
            return NextResponse.json({ text: data.text });
        } else if (file.type.startsWith("image/")) {
            // Use Gemini Vision to extract text
            const base64Image = buffer.toString("base64");
            const completion = await openai.chat.completions.create({
                model: "google/gemini-2.0-flash-exp:free",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Transcribe all text from this image. If it's a diagram or scene, describe it in detail." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${file.type};base64,${base64Image}`
                                }
                            },
                        ],
                    },
                ],
            });
            return NextResponse.json({ text: completion.choices[0].message.content });
        } else {
            // Fallback for text files
            const text = buffer.toString("utf-8");
            return NextResponse.json({ text });
        }

    } catch (error: any) {
        console.error("Processing error:", error);
        const errorMessage = error.message || "Failed to process file";
        const status = error.status || 500;
        return NextResponse.json({ error: errorMessage }, { status });
    }
}
