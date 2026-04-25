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

async function ensureInit(): Promise<void> {
  if (!_initialized) {
    _initialized = (async () => {
      const db = getDb();
      
      // 基础建表
      await db.executeMultiple(`
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

      // 动态升级：为已存在的表添加新列 (SQLite 不支持 ADD COLUMN IF NOT EXISTS)
      // 我们通过捕获错误来模拟这一行为
      const columnsToAdd = [
        { name: 'category', type: "TEXT DEFAULT 'snack'" },
        { name: 'risk_level', type: 'TEXT' },
        { name: 'risk_label', type: 'TEXT' },
        { name: 'interpretation', type: 'TEXT' },
        { name: 'image_data', type: 'TEXT' },
        { name: 'energy_kj', type: 'REAL' },
        { name: 'protein_g', type: 'REAL' },
        { name: 'fat_g', type: 'REAL' },
        { name: 'carbohydrate_g', type: 'REAL' },
        { name: 'sodium_mg', type: 'REAL' },
        { name: 'record_time', type: 'TEXT' }
      ];

      for (const col of columnsToAdd) {
        try {
          await db.execute(`ALTER TABLE snacks ADD COLUMN ${col.name} ${col.type}`);
          console.log(`Added column ${col.name} to snacks table.`);
        } catch (e: any) {
          // 如果列已存在，SQLite 会报错，我们直接忽略
          if (!e.message?.includes('duplicate column name') && !e.message?.includes('already exists')) {
            console.error(`Error adding column ${col.name}:`, e.message);
          }
        }
      }
    })();
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
