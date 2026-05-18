import { NextResponse } from "next/server";
import { updateNotebook } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";

export async function POST(req: Request) {
    try {
        const { type, context, notebookId } = await req.json();

        if (!context) {
            return NextResponse.json({ error: "Context is required" }, { status: 400 });
        }

        let prompt = "";
        let jsonMode = false;

        if (type === "audio_script") {
            jsonMode = true;
            prompt = `
            You are an expert educational podcast producer. Create a detailed dialogue script in RUSSIAN (Русский язык) between two hosts (Host 1 and Host 2) discussing the provided content.
            
            GOAL: Create a comprehensive study guide/notes in the form of a conversation.
            - Language: RUSSIAN ONLY.
            - Host 1: Explains the concepts clearly.
            - Host 2: Asks clarifying questions and summarizes key points.
            - The script must cover ALL the details from the source text.
            
            Output ONLY valid JSON in the following format:
            [
                { "speaker": "Host 1", "text": "..." },
                { "speaker": "Host 2", "text": "..." }
            ]

            Source Text based on which to write the script:
            ${context}
            `;
        } else if (type === "presentation") {
            jsonMode = true;
            prompt = `
            You are an expert presentation designer. Create a slide deck summary in RUSSIAN (Русский язык) of the provided content.
            
            GOAL: Create a structured lecture presentation.
            - Language: RUSSIAN ONLY.
            - Create multiple slides to cover the entire content.
            - Use detailed bullet points.
            
            Output ONLY valid JSON in the following format:
            [
                { "title": "Slide Title", "bullets": ["point 1", "point 2"], "notes": "Speaker notes for this slide" }
            ]

            Source Text:
            ${context}
            `;
        } else {
            // Summary
            prompt = `
            You are an expert academic assistant. Create a detailed note/summary (конспект) in RUSSIAN (Русский язык) of the provided text.
            
            INSTRUCTIONS:
            1. Language: RUSSIAN ONLY.
            2. Structure the notes with clear headers and bullet points.
            3. Capture ALL details, numbers, and facts from the text.
            4. Do not miss any information.
            5. FORMATTING: Use **Bold** for key terms.
            6. MATH/FORMULAS: Use LaTeX format for ALL formulas and equations. 
               - Inline math: $ ... $ (e.g., $ E = mc^2 $)
               - Block math: $$ ... $$

            Text to summarize:
            ${context}
            `;
        }

        const content = await chatCompletion({
            messages: [{ role: "user", content: prompt }],
            jsonMode,
            temperature: 0.7,
        });

        if (jsonMode) {
            let parsedContent;
            try {
                parsedContent = JSON.parse(content);
                // Handle formatting quirks if any
                if (!Array.isArray(parsedContent) && (parsedContent.script || parsedContent.slides)) {
                    parsedContent = parsedContent.script || parsedContent.slides || parsedContent;
                }

                // Auto-save to DB if notebookId is provided
                if (notebookId) {
                    const updateData = type === "audio_script"
                        ? { audioScript: JSON.stringify(parsedContent) }
                        : { slides: JSON.stringify(parsedContent) };
                    updateNotebook(notebookId, updateData);
                }

                return NextResponse.json(parsedContent);
            } catch (e) {
                console.error("JSON Parse Error", e);
                return NextResponse.json({ error: "Failed to parse JSON" }, { status: 500 });
            }
        }

        // Auto-save summary to DB if notebookId is provided
        if (notebookId) {
            updateNotebook(notebookId, { summary: content });
        }

        return NextResponse.json({ summary: content });

    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
