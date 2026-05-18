/**
 * OpenRouter AI Client
 * 
 * Uses OpenRouter's OpenAI-compatible API endpoint.
 * OpenRouter provides access to many models (Gemini, Claude, Llama, etc.)
 * with free tiers available. Works from any country.
 * 
 * Free models: append ":free" to model name
 * Docs: https://openrouter.ai/docs
 */

const OPENROUTER_URL = "https://openrouter.ai/api";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it:free";

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

/**
 * Send a chat completion request to OpenRouter
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { messages, jsonMode = false, temperature = 0.7, maxTokens } = options;

    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set. Get a free key at https://openrouter.ai/keys");
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "CortexNote",
    };

    const body: Record<string, any> = {
        model: OPENROUTER_MODEL,
        messages,
        temperature,
    };

    // Note: free models don't support response_format, JSON is requested via prompt

    if (maxTokens) {
        body.max_tokens = maxTokens;
    }

    console.log(`[OpenRouter] Calling model: ${OPENROUTER_MODEL}`);

    const response = await fetch(`${OPENROUTER_URL}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenRouter] Error ${response.status}:`, errorText);
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
        console.error(`[OpenRouter] API returned error:`, data.error);
        throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const content = data.choices?.[0]?.message?.content || "";
    console.log(`[OpenRouter] Response received, length: ${content.length}`);
    return content;
}

/**
 * Send a vision request (image + text prompt) via OpenRouter
 * Uses a vision-capable model automatically
 */
export async function visionCompletion(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    // Use a vision-capable free model for image processing
    const visionModel = process.env.OPENROUTER_VISION_MODEL || "google/gemma-2-9b-it:free";

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "CortexNote",
    };

    const body = {
        model: visionModel,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: dataUrl } },
                ],
            },
        ],
        temperature: 0.3,
    };

    const response = await fetch(`${OPENROUTER_URL}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Vision API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Check if OpenRouter API is reachable
 */
export async function checkGatewayHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${OPENROUTER_URL}/v1/models`, {
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
        });
        return response.ok;
    } catch {
        return false;
    }
}
