const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    console.log("File content length:", envConfig.length);
    envConfig.split(/\r?\n/).forEach(line => {
        if (!line.trim()) return;
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            console.log("Key found:", key);
            const value = parts.slice(1).join('=').trim();
            if (key && value && !key.startsWith('#')) {
                const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
                process.env[key] = cleanValue;
            }
        } else {
            console.log("Skipping line:", line);
        }
    });
} else {
    console.log(".env.local does NOT exist at", envPath);
}

async function test() {
    console.log("Testing API...");
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey) {
        console.log("OPENROUTER_API_KEY is present (length: " + apiKey.length + ")");
    } else {
        console.error("OPENROUTER_API_KEY is MISSING in process.env");
    }

    const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey || "dummy",
    });

    try {
        const imagePath = path.resolve(__dirname, 'test_image.jpg');
        if (!fs.existsSync(imagePath)) {
            console.error("test_image.jpg not found!");
            return;
        }
        const buffer = fs.readFileSync(imagePath);
        const base64Image = buffer.toString('base64');

        console.log("Image read, size: " + buffer.length + " bytes");

        console.log("Sending request to google/gemini-2.0-flash-exp:free...");
        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Transcribe all text from this image." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        },
                    ],
                },
            ],
        });

        console.log("Success!");
        console.log("Response preview:", completion.choices[0].message.content.substring(0, 200));

    } catch (error) {
        console.error("Error Information:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

test();
