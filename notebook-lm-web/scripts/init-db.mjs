import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "notebooks.db");

console.log(`Initializing database at: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    rating REAL NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    source_text TEXT NOT NULL DEFAULT '',
    sources TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    audio_script TEXT NOT NULL DEFAULT '[]',
    slides TEXT NOT NULL DEFAULT '[]'
  );
`);

console.log("Database initialized successfully!");
db.close();
