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

  // Initialize billing tables
  const billingSchema = readFileSync(join(__dirname, 'billing-schema.sql'), 'utf-8');
  database.run(billingSchema);

  // Initialize EMS tables
  const emsSchema = readFileSync(join(__dirname, 'ems-schema.sql'), 'utf-8');
  database.run(emsSchema);

  // Add type column to encounters if it doesn't exist (migration for existing DBs)
  try {
    database.run("ALTER TABLE encounters ADD COLUMN type TEXT NOT NULL DEFAULT 'clinical'");
  } catch (e) {
    // Column already exists — ignore
  }

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

  // Seed EMS encounters if ems_encounters table is empty
  const emsCount = database.exec('SELECT COUNT(*) as count FROM ems_encounters');
  const emsExists = emsCount[0]?.values[0]?.[0] || 0;
  if (emsExists === 0) {
    const emsSeed = readFileSync(join(__dirname, 'ems-seed.sql'), 'utf-8');
    const emsStmts = emsSeed.split(/;\s*\n/).filter(s => s.trim());
    for (const stmt of emsStmts) {
      if (stmt.trim()) {
        try {
          database.run(stmt);
        } catch (e) {
          console.error('EMS seed error:', e.message, '\nStatement:', stmt.substring(0, 100));
        }
      }
    }
    saveDb();
    console.log('Database seeded with EMS demo data');
  }

  // Seed billing data if organizations table is empty
  const orgCount = database.exec('SELECT COUNT(*) as count FROM organizations');
  const orgExists = orgCount[0]?.values[0]?.[0] || 0;
  if (orgExists === 0) {
    const billingSeed = readFileSync(join(__dirname, 'billing-seed.sql'), 'utf-8');
    const billingStmts = billingSeed.split(/;\s*\n/).filter(s => s.trim());
    for (const stmt of billingStmts) {
      if (stmt.trim()) {
        try {
          database.run(stmt);
        } catch (e) {
          console.error('Billing seed error:', e.message, '\nStatement:', stmt.substring(0, 100));
        }
      }
    }
    saveDb();
    console.log('Database seeded with billing demo data');
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
