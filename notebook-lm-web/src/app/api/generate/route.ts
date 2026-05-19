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
            You are an expert academic assistant. Create a highly detailed, beautifully structured note/summary (конспект) in RUSSIAN (Русский язык) of the provided text.
            
            INSTRUCTIONS:
            1. Language: RUSSIAN ONLY.
            2. Structure the notes logically with clear Markdown headers (##, ###), bullet points, and paragraphs.
            3. Capture ALL important details, numbers, and facts from the text. Do not miss any crucial information.
            4. FORMATTING: Use **Bold** for key terms and definitions. Use blockquotes (>) for important thoughts or rules.
            5. MATH/FORMULAS: Use LaTeX format for ALL formulas and equations. 
               - Inline math: $ ... $ (e.g., $ E = mc^2 $)
               - Block math: $$ ... $$
            6. VISUALS / IMAGES: You MUST generate relevant and beautiful contextual images for the summary to make it engaging.
               - To add an image, use this exact Markdown syntax: ![Image description](https://image.pollinations.ai/prompt/{english_visual_description}?width=800&height=400&nologo=true)
               - Replace {english_visual_description} with a highly detailed, descriptive prompt IN ENGLISH for an AI image generator (e.g., highly_detailed_illustration_of_a_black_hole_in_space). Use underscores (_) instead of spaces.
               - Insert at least 1-3 images in the summary at relevant sections to visually illustrate the concepts being discussed.

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
                // Free models often wrap JSON in ```json ... ``` blocks
                let cleanContent = content.trim();
                
                // Extract JSON from markdown code blocks
                const jsonBlockMatch = cleanContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
                if (jsonBlockMatch) {
                    cleanContent = jsonBlockMatch[1].trim();
                }
                
                // Try to find array or object boundaries if markdown extraction didn't trigger
                if (!cleanContent.startsWith('[') && !cleanContent.startsWith('{')) {
                    const arrayStart = cleanContent.indexOf('[');
                    const objStart = cleanContent.indexOf('{');
                    const start = arrayStart >= 0 && objStart >= 0 
                        ? Math.min(arrayStart, objStart) 
                        : Math.max(arrayStart, objStart);
                    if (start >= 0) cleanContent = cleanContent.substring(start);
                }
                
                parsedContent = JSON.parse(cleanContent);
                
                // Handle formatting quirks if any
                if (!Array.isArray(parsedContent)) {
                    if (parsedContent.slides) {
                        parsedContent = parsedContent.slides;
                    } else if (parsedContent.script) {
                        parsedContent = parsedContent.script;
                    } else if (parsedContent.title || parsedContent.text || parsedContent.speaker) {
                        // Wrap single object in array
                        parsedContent = [parsedContent];
                    }
                }

                // Ensure presentation bullets is an array (to prevent crashes in the viewer)
                if (type === "presentation" && Array.isArray(parsedContent)) {
                    parsedContent = parsedContent.map((slide: any) => ({
                        ...slide,
                        bullets: Array.isArray(slide.bullets) 
                            ? slide.bullets 
                            : typeof slide.bullets === 'string' 
                                ? [slide.bullets] 
                                : []
                    }));
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
                console.error("JSON Parse Error:", e);
                console.error("Raw content was:", content.substring(0, 500));
                // Fallback: return as summary text instead of failing
                return NextResponse.json({ summary: content });
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
