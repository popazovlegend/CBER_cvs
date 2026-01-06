import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { DialogLine, Slide } from "@/types";

export async function POST(req: Request) {
    const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY || "dummy",
    });
    try {
        const { type, context } = await req.json();

        if (!context) {
            return NextResponse.json({ error: "Context is required" }, { status: 400 });
        }

        let systemPrompt = "";
        let userPrompt = "";

        if (type === "audio_script") {
            systemPrompt = `You are an expert podcast producer. Create a dialogue script between two hosts (Host 1 and Host 2) discussing the provided content. 
      The dialogue should be engaging, conversational, and easy to listen to. 
      Output ONLY valid JSON in the following format:
      [
        { "speaker": "Host 1", "text": "..." },
        { "speaker": "Host 2", "text": "..." }
      ]`;
            userPrompt = `Generate a podcast script based on this text:\n\n${context}`;
        } else if (type === "presentation") {
            systemPrompt = `You are a presentation expert. Create a slide deck summary of the provided content.
      Output ONLY valid JSON in the following format:
      [
        { "title": "Slide Title", "bullets": ["point 1", "point 2"], "notes": "Speaker notes for this slide" }
      ]`;
            userPrompt = `Generate a presentation based on this text:\n\n${context}`;
        } else {
            systemPrompt = "You are a helpful assistant. Summarize the following text.";
            userPrompt = `Summarize this:\n\n${context}`;
        }

        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        let parsedContent;
        try {
            parsedContent = JSON.parse(content || "[]");
            // Handle case where Gemini wraps it in a key
            if (!Array.isArray(parsedContent) && (parsedContent.script || parsedContent.slides)) {
                parsedContent = parsedContent.script || parsedContent.slides || parsedContent;
            }
        } catch (e) {
            console.error("Failed to parse JSON", content);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }

        return NextResponse.json(parsedContent);

    } catch (error: any) {
        console.error("Generation error:", error);
        const errorMessage = error.message || "Internal server error";
        const status = error.status || 500;
        return NextResponse.json({ error: errorMessage }, { status });
    }
}
