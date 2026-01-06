const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');

try {
    // Read as UTF-16LE
    const content = fs.readFileSync(envPath, 'utf16le');
    console.log("Read " + content.length + " characters.");

    // Write as UTF-8
    fs.writeFileSync(envPath, content, 'utf8');
    console.log("Successfully converted .env.local to UTF-8.");
} catch (e) {
    console.error("Error converting file:", e);
}
