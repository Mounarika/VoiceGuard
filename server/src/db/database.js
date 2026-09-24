import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/voiceguard.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS callers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      phone_number TEXT,
      email TEXT,
      name TEXT NOT NULL,
      spam_score INTEGER DEFAULT 0,
      carrier TEXT,
      location TEXT,
      status TEXT DEFAULT 'neutral',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS genuine_voice_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      caller_id INTEGER,
      caller_name TEXT NOT NULL,
      caller_phone TEXT,
      caller_email TEXT,
      sample_name TEXT NOT NULL,
      file_path TEXT,
      duration REAL,
      characteristics_json TEXT NOT NULL,
      feature_vector_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (caller_id) REFERENCES callers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS voice_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sample_name TEXT NOT NULL,
      file_path TEXT,
      duration REAL,
      is_ai INTEGER NOT NULL,
      confidence_score REAL NOT NULL,
      characteristics_json TEXT NOT NULL,
      ai_reasons_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      caller_id INTEGER,
      caller_name TEXT NOT NULL,
      caller_phone TEXT,
      caller_email TEXT,
      match_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      is_ai_detected INTEGER DEFAULT 0,
      verification_status TEXT DEFAULT 'unverified',
      secondary_verification_method TEXT,
      secondary_verification_recipient TEXT,
      secondary_verification_otp TEXT,
      duration_sec INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (caller_id) REFERENCES callers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS spam_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      caller_id INTEGER,
      caller_phone TEXT,
      caller_email TEXT,
      caller_name TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      spam_score INTEGER NOT NULL,
      reason_summary TEXT NOT NULL,
      forensic_details_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (caller_id) REFERENCES callers(id) ON DELETE SET NULL
    );
  `);

  // Migrate any missing columns on existing tables
  const addColumn = (table, col, type) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (_) {}
  };
  addColumn('callers', 'email', 'TEXT');
  addColumn('genuine_voice_reports', 'caller_phone', 'TEXT');
  addColumn('genuine_voice_reports', 'caller_email', 'TEXT');
  addColumn('live_calls', 'caller_email', 'TEXT');
  addColumn('live_calls', 'secondary_verification_recipient', 'TEXT');
  addColumn('spam_reports', 'caller_email', 'TEXT');

  // Ensure user and admin accounts exist
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@voiceguard.ai');
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('Admin@VoiceGuard2026!', 10);
    const userHash = bcrypt.hashSync('User@VoiceGuard2026!', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('admin@voiceguard.ai', adminHash, 'System Administrator', 'admin');
    insertUser.run('user@voiceguard.ai', userHash, 'Authorized Security User', 'user');
  }

  // Remove any previously seeded demo callers or fake reports to keep data strictly user-provided
  db.exec(`
    DELETE FROM callers WHERE phone_number IN ('+1 (415) 890-2341', '+1 (650) 432-8890', '+1 (800) 555-0199', '+1 (555) 012-3456');
    DELETE FROM genuine_voice_reports WHERE sample_name = 'david_miller_enrollment_baseline.wav';
    DELETE FROM spam_reports WHERE caller_name = 'Internal IT Desk (Spoofed)';
  `);
}

export default db;
