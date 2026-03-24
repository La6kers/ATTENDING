import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', '..', '..', 'data', 'attending.db');

let db;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(DB_PATH, buffer);
}

export async function initDatabase() {
  const database = await getDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  database.run(schema);
  saveDb();
}

export async function seedDatabase() {
  const database = await getDb();
  const result = database.exec('SELECT COUNT(*) as count FROM patients');
  const count = result[0]?.values[0]?.[0] || 0;
  if (count === 0) {
    const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf-8');
    // Split on semicolons and run each statement
    const statements = seed.split(/;\s*\n/).filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          database.run(stmt);
        } catch (e) {
          console.error('Seed error:', e.message, '\nStatement:', stmt.substring(0, 100));
        }
      }
    }
    saveDb();
    console.log('Database seeded with demo patients');
  }
}

// Helper: run a query and return all rows as objects
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return first row as object
export function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

// Helper: run an insert/update and return lastInsertRowid
export function execute(sql, params = []) {
  db.run(sql, params);
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  return { lastInsertRowid: result[0]?.values[0]?.[0] };
}

export default { getDb, saveDb, queryAll, queryOne, execute };
