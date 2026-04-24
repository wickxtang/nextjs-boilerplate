import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS snacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    risk_level TEXT,
    risk_label TEXT,
    interpretation TEXT,
    record_time TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS snack_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snack_id INTEGER NOT NULL,
    ingredient_name TEXT NOT NULL,
    FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
  );
`);

export default db;
