/**
 * Google AI Studio Client
 * 
 * Uses official @google/genai SDK.
 */
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatCompletionOptions {
    messages: ChatMessage[];
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
}

function getAiClient() {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set. Please set it in your .env.local file.");
    }
    return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

/**
 * Send a chat completion request to Google AI Studio
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { messages, jsonMode = false, temperature = 0.7, maxTokens } = options;
    const ai = getAiClient();

    // The app mostly uses a single user message. Let's extract the text prompt.
    // If there are multiple messages, we'd need to map them to parts, but we'll map all text for simplicity.
    const combinedPrompt = messages.map(m => {
        if (typeof m.content === 'string') return m.content;
        // In case it's an array of parts
        return m.content.map(part => part.text || "").join("\n");
    }).join("\n\n");

    const config: any = {
        temperature,
    };

    if (jsonMode) {
        config.responseMimeType = "application/json";
    }
    if (maxTokens) {
        config.maxOutputTokens = maxTokens;
    }

    console.log(`[Google AI Studio] Calling model: ${GEMINI_MODEL}`);

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: combinedPrompt,
        config
    });

    const content = response.text || "";
    console.log(`[Google AI Studio] Response received, length: ${content.length}`);
    return content;
}

/**
 * Send a vision request (image + text prompt) via Google AI Studio
 */
export async function visionCompletion(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const ai = getAiClient();

    console.log(`[Google AI Studio Vision] Using model: ${GEMINI_MODEL}, image size: ${Math.round(imageBase64.length / 1024)}KB base64`);

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
            {
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { data: imageBase64, mimeType } }
                ]
            }
        ],
        config: {
            temperature: 0.3,
            maxOutputTokens: 4096,
        }
    });

    const content = response.text || "";
    console.log(`[Google AI Studio Vision] ✅ Success, response length: ${content.length}`);

    if (!content) {
        throw new Error("Google AI Studio Vision returned empty response.");
    }

    return content;
}

/**
 * Check if Google API is reachable
 */
export async function checkGatewayHealth(): Promise<boolean> {
    try {
        const ai = getAiClient();
        // A simple lightweight call to check if the API is working
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "hi",
            config: { maxOutputTokens: 1 }
        });
        return true;
    } catch {
        return false;
    }
}
