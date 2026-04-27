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
          quantity REAL DEFAULT 100,
          unit TEXT DEFAULT 'g',
          FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS checkins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          snack_id INTEGER NOT NULL,
          checkin_date TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          quantity REAL DEFAULT 100,
          unit TEXT DEFAULT 'g',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
        );
      `);

      // 动态升级：为 snacks 表添加新列
      const snackColumnsToAdd = [
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
        { name: 'record_time', type: 'TEXT' },
        { name: 'brand_name', type: 'TEXT' },
        { name: 'serving_size', type: 'REAL DEFAULT 100' },
        { name: 'serving_unit', type: "TEXT DEFAULT 'g'" }
      ];

      for (const col of snackColumnsToAdd) {
        try {
          await db.execute(`ALTER TABLE snacks ADD COLUMN ${col.name} ${col.type}`);
        } catch (e: any) {
          if (!e.message?.includes('duplicate column name') && !e.message?.includes('already exists')) {
            console.error(`Error adding column ${col.name} to snacks:`, e.message);
          }
        }
      }

      // 基础建表 - 新增 meals 表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS meals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
          image_data TEXT,
          food_items TEXT, -- JSON string of identified foods
          total_calories REAL,
          meal_date TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 动态升级：为 snack_ingredients 表添加数量和单位列
      const snackIngredientColumnsToAdd = [
        { name: 'quantity', type: 'REAL DEFAULT 100' },
        { name: 'unit', type: "TEXT DEFAULT 'g'" }
      ];

      for (const col of snackIngredientColumnsToAdd) {
        try {
          await db.execute(`ALTER TABLE snack_ingredients ADD COLUMN ${col.name} ${col.type}`);
        } catch (e: any) {
          if (!e.message?.includes('duplicate column name') && !e.message?.includes('already exists')) {
            console.error(`Error adding column ${col.name} to snack_ingredients:`, e.message);
          }
        }
      }

      // 动态升级：为 checkins 表添加摄入量和热量列
      const checkinColumnsToAdd = [
        { name: 'amount', type: 'REAL' },   // 摄入量 (g 或 ml)
        { name: 'calories', type: 'REAL' }, // 计算出的热量 (kcal)
        { name: 'quantity', type: 'REAL DEFAULT 100' },
        { name: 'unit', type: "TEXT DEFAULT 'g'" }
      ];

      for (const col of checkinColumnsToAdd) {
        try {
          await db.execute(`ALTER TABLE checkins ADD COLUMN ${col.name} ${col.type}`);
        } catch (e: any) {
          if (!e.message?.includes('duplicate column name') && !e.message?.includes('already exists')) {
            console.error(`Error adding column ${col.name} to checkins:`, e.message);
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
