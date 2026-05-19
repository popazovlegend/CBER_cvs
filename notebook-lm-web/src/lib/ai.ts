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
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

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
 * Uses a vision-capable model with automatic fallback
 */
export async function visionCompletion(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set. Get a free key at https://openrouter.ai/keys");
    }

    // Compress large images by reducing base64 if too big (>4MB base64 ≈ 3MB image)
    const MAX_BASE64_SIZE = 4 * 1024 * 1024;
    let finalBase64 = imageBase64;
    if (imageBase64.length > MAX_BASE64_SIZE) {
        console.log(`[OpenRouter Vision] Image too large (${Math.round(imageBase64.length / 1024)}KB base64), will try anyway...`);
        // OpenRouter should handle it, but log a warning
    }

    const dataUrl = `data:${mimeType};base64,${finalBase64}`;

    // Vision-capable models to try (in order of preference)
    const configuredModel = process.env.OPENROUTER_VISION_MODEL || "";
    const fallbackModels = [
        "google/gemini-2.0-flash-exp:free",
        "google/gemma-3-4b-it:free",
        "meta-llama/llama-4-scout:free",
        "qwen/qwen2.5-vl-72b-instruct:free",
    ];

    // Build the list: configured model first, then fallbacks
    const modelsToTry = configuredModel 
        ? [configuredModel, ...fallbackModels.filter(m => m !== configuredModel)]
        : fallbackModels;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "CortexNote",
    };

    let lastError = "";

    for (const visionModel of modelsToTry) {
        console.log(`[OpenRouter Vision] Trying model: ${visionModel}, image size: ${Math.round(imageBase64.length / 1024)}KB base64`);

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
            max_tokens: 4096,
        };

        try {
            const response = await fetch(`${OPENROUTER_URL}/v1/chat/completions`, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OpenRouter Vision] Error ${response.status} with ${visionModel}:`, errorText);
                lastError = `${visionModel}: ${response.status} - ${errorText}`;
                continue; // Try next model
            }

            const data = await response.json();

            if (data.error) {
                console.error(`[OpenRouter Vision] API error with ${visionModel}:`, data.error);
                lastError = `${visionModel}: ${data.error.message || JSON.stringify(data.error)}`;
                continue; // Try next model
            }

            const content = data.choices?.[0]?.message?.content || "";
            console.log(`[OpenRouter Vision] ✅ Success with ${visionModel}, response length: ${content.length}`);

            if (!content) {
                lastError = `${visionModel}: empty response`;
                continue; // Try next model
            }

            return content;
        } catch (e: any) {
            console.error(`[OpenRouter Vision] Network error with ${visionModel}:`, e.message);
            lastError = `${visionModel}: ${e.message}`;
            continue; // Try next model
        }
    }

    throw new Error(`Все vision-модели недоступны. Последняя ошибка: ${lastError}`);
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
