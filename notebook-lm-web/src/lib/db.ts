import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "notebooks.db");

// Singleton database instance
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");

    // Create tables
    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

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
        slides TEXT NOT NULL DEFAULT '[]',
        user_id TEXT
      );
    `);

    // Safely attempt to add user_id if migrating from older schema
    try {
      _db.exec(`ALTER TABLE notebooks ADD COLUMN user_id TEXT`);
    } catch (e) {
      // Column might already exist, safe to ignore
    }
  }
  return _db;
}

// ─── Types ────────────────────────────────────────────

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface NotebookRow {
  id: string;
  title: string;
  subject: string;
  author: string;
  created_at: string;
  updated_at: string;
  rating: number;
  views: number;
  source_text: string;
  sources: string;      // JSON string
  summary: string;
  audio_script: string; // JSON string
  slides: string;       // JSON string
  user_id?: string | null;
}

// ─── Helpers ──────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ─── User CRUD ────────────────────────────────────────

export function getUserByUsername(username: string): UserRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get(username) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) as UserRow | undefined;
}

export function createUser(username: string, passwordHash: string): UserRow {
  const db = getDb();
  const id = generateId();
  const stmt = db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)");
  stmt.run(id, username, passwordHash);
  return getUserById(id)!;
}

// ─── Notebook CRUD ─────────────────────────────────────

export function getAllNotebooks(query?: string, subject?: string, userId?: string, isExplore?: boolean): NotebookRow[] {
  const db = getDb();

  let sql = "SELECT * FROM notebooks WHERE 1=1";
  const params: Record<string, string> = {};

  if (query && query.trim()) {
    sql += " AND (title LIKE @query OR author LIKE @query)";
    params.query = `%${query.trim()}%`;
  }

  if (subject && subject !== "Все" && subject.trim()) {
    sql += " AND subject = @subject";
    params.subject = subject.trim();
  }

  if (!isExplore && userId) {
    // Your Projects
    sql += " AND user_id = @userId";
    params.userId = userId;
  } else if (!isExplore && !userId) {
    // Not logged in, viewing "Your Projects" -> returns empty
    sql += " AND 1=0";
  }

  if (isExplore) {
    // In Explore mode, only show notebooks that actually have content (summary)
    sql += " AND summary != '' AND summary IS NOT NULL";
  }

  sql += " ORDER BY created_at DESC";

  const stmt = db.prepare(sql);
  return stmt.all(params) as NotebookRow[];
}

export function getNotebookById(id: string): NotebookRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM notebooks WHERE id = ?");
  return stmt.get(id) as NotebookRow | undefined;
}

export interface CreateNotebookInput {
  title: string;
  subject: string;
  author: string;
  sourceText?: string;
  sources?: string; 
  userId?: string;
}

export function createNotebook(input: CreateNotebookInput): NotebookRow {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO notebooks (id, title, subject, author, created_at, updated_at, source_text, sources, user_id)
    VALUES (@id, @title, @subject, @author, @created_at, @updated_at, @source_text, @sources, @user_id)
  `);

  stmt.run({
    id,
    title: input.title || "",
    subject: input.subject || "",
    author: input.author || "",
    created_at: now,
    updated_at: now,
    source_text: input.sourceText || "",
    sources: input.sources || "[]",
    user_id: input.userId || null
  });

  return getNotebookById(id)!;
}

export interface UpdateNotebookInput {
  title?: string;
  subject?: string;
  author?: string;
  sourceText?: string;
  sources?: string;
  summary?: string;
  audioScript?: string;
  slides?: string;
  rating?: number;
  views?: number;
}

export function updateNotebook(id: string, input: UpdateNotebookInput, allowedUserId?: string): NotebookRow | undefined {
  const db = getDb();
  const existing = getNotebookById(id);
  if (!existing) return undefined;
  
  // Security check: Only author can update
  if (allowedUserId && existing.user_id && existing.user_id !== allowedUserId) {
    return undefined; // unauthorized
  }

  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (input.title !== undefined) { fields.push("title = @title"); params.title = input.title; }
  if (input.subject !== undefined) { fields.push("subject = @subject"); params.subject = input.subject; }
  if (input.author !== undefined) { fields.push("author = @author"); params.author = input.author; }
  if (input.sourceText !== undefined) { fields.push("source_text = @source_text"); params.source_text = input.sourceText; }
  if (input.sources !== undefined) { fields.push("sources = @sources"); params.sources = input.sources; }
  if (input.summary !== undefined) { fields.push("summary = @summary"); params.summary = input.summary; }
  if (input.audioScript !== undefined) { fields.push("audio_script = @audio_script"); params.audio_script = input.audioScript; }
  if (input.slides !== undefined) { fields.push("slides = @slides"); params.slides = input.slides; }
  if (input.rating !== undefined) { fields.push("rating = @rating"); params.rating = input.rating; }
  if (input.views !== undefined) { fields.push("views = @views"); params.views = input.views; }

  if (fields.length === 0) return existing;

  fields.push("updated_at = @updated_at");
  params.updated_at = new Date().toISOString();

  const sql = `UPDATE notebooks SET ${fields.join(", ")} WHERE id = @id`;
  db.prepare(sql).run(params);

  return getNotebookById(id);
}

export function deleteNotebook(id: string, allowedUserId?: string): boolean {
  const db = getDb();
  
  if (allowedUserId) {
    const existing = getNotebookById(id);
    if (!existing || (existing.user_id && existing.user_id !== allowedUserId)) {
        return false;
    }
  }

  const result = db.prepare("DELETE FROM notebooks WHERE id = ?").run(id);
  return result.changes > 0;
}

export function incrementViews(id: string): void {
  const db = getDb();
  db.prepare("UPDATE notebooks SET views = views + 1 WHERE id = ?").run(id);
}
