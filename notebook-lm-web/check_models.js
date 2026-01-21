const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to access model manager if needed, but SDK usually has listModels on client or similar.
        // Actually standard SDK usage:
        // Unfortunately the node SDK purely wraps inference usually. 
        // Checking documentation knowledge: The ModelService usually handles listing.
        // Let's try to infer or just test the most probable ones if listing fails.
        // But wait, the SDK *does* support listModels via the AI client in recent versions?
        // Let's try to just output the known common ones if dynamic listing is complex without specific manager instantiation.
        // Actually, let's try to run a simple generation on a few candidates to see what works? 
        // No, let's try to use the REST API approach for listing if SDK doesn't expose it easily in this version.
        // Or just a standard script.
        console.log("Checking Common Models:");
        const candidates = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-pro-exp-0827", "gemini-1.5-flash-8b"];

        for (const m of candidates) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello");
                console.log(`✅ ${m} is available.`);
            } catch (e) {
                console.log(`❌ ${m} failed: ${e.message}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
