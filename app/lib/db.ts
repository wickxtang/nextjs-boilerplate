import { createClient, type Client, type InValue } from '@libsql/client';

let _db: Client | null = null;
let _initialized: Promise<void> | null = null;

function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

function ensureInit(): Promise<void> {
  if (!_initialized) {
    _initialized = getDb().executeMultiple(`
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
        image_data TEXT,
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

      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        snack_id INTEGER NOT NULL,
        checkin_date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
      );
    `);
  }
  return _initialized;
}

export async function queryOne<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  await ensureInit();
  const result = await getDb().execute({ sql, args });
  return result.rows[0] as unknown as T | undefined;
}

export async function queryAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureInit();
  const result = await getDb().execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function execute(sql: string, args: InValue[] = []) {
  await ensureInit();
  return getDb().execute({ sql, args });
}

export async function batch(stmts: Array<{ sql: string; args: InValue[] }>) {
  await ensureInit();
  return getDb().batch(stmts, 'write');
}
