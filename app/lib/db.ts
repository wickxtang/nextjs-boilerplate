import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS snacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    risk_level TEXT,
    risk_label TEXT,
    interpretation TEXT,
    record_time TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS snack_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snack_id INTEGER NOT NULL,
    ingredient_name TEXT NOT NULL,
    FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
  );
`);

// 兼容旧表：如果 snacks 表缺少 user_id 列则补上
const columns = db.prepare("PRAGMA table_info(snacks)").all() as { name: string }[];
if (!columns.some(c => c.name === 'user_id')) {
  db.exec(`ALTER TABLE snacks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
}

export default db;
