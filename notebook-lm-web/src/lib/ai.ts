/**
 * OpenClaw Gateway AI Client
 * 
 * Sends requests to OpenClaw's OpenAI-compatible API endpoint.
 * OpenClaw Gateway runs locally and proxies to configured model providers
 * (Anthropic Claude, OpenAI GPT, Google Gemini, etc.)
 */

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || "openclaw";

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
 * Send a chat completion request to OpenClaw Gateway
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { messages, jsonMode = false, temperature = 0.7, maxTokens } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (OPENCLAW_TOKEN) {
        headers["Authorization"] = `Bearer ${OPENCLAW_TOKEN}`;
    }

    const body: Record<string, any> = {
        model: OPENCLAW_MODEL,
        messages,
        temperature,
    };

    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    if (maxTokens) {
        body.max_tokens = maxTokens;
    }

    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Send a vision request (image + text prompt) to OpenClaw Gateway
 */
export async function visionCompletion(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    return chatCompletion({
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
    });
}

/**
 * Check if OpenClaw Gateway is reachable
 */
export async function checkGatewayHealth(): Promise<boolean> {
    try {
        const headers: Record<string, string> = {};
        if (OPENCLAW_TOKEN) {
            headers["Authorization"] = `Bearer ${OPENCLAW_TOKEN}`;
        }

        const response = await fetch(`${OPENCLAW_URL}/v1/models`, { headers });
        return response.ok;
    } catch {
        return false;
    }
}
