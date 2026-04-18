import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB path is overridable via env var so production can point at a mounted
// Azure Files volume (e.g. /app/data/mnemonic.db) without the mount
// clobbering source .ts files that live alongside the default location.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mnemonic.db');

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;
let dirty = false;
let saveInterval: ReturnType<typeof setInterval> | null = null;

export async function initDb(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    // Start the debounced save interval (every 2 seconds)
    saveInterval = setInterval(() => {
      if (dirty) {
        dirty = false;
        persistAsync();
      }
    }, 2000);
    // Don't let the interval keep the process alive
    if (saveInterval.unref) saveInterval.unref();

    return db;
  })();

  return initPromise;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function markDirty(): void {
  dirty = true;
}

function persistAsync(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFile(DB_PATH, buffer).catch((err) => {
      console.error('Failed to persist database:', err);
    });
  } catch (err) {
    console.error('Failed to export database for save:', err);
  }
}

/** Synchronous flush for graceful shutdown — writes any pending changes immediately. */
export function flushDb(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  if (!db || !dirty) return;
  dirty = false;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to flush database on shutdown:', err);
  }
}

// Graceful shutdown hooks
process.on('beforeExit', flushDb);
process.on('SIGTERM', () => {
  flushDb();
  process.exit(0);
});

// Helper: run a query and return rows as objects
export function queryAll(sql: string, params: any[] = []): any[] {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length) stmt.bind(params);

  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return first row as object or null
export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run a mutation (INSERT/UPDATE/DELETE)
export function run(sql: string, params: any[] = []): void {
  const d = getDb();
  d.run(sql, params);
  markDirty();
}

// Helper: run multiple statements (for migrations)
export function exec(sql: string): void {
  const d = getDb();
  d.exec(sql);
  markDirty();
}
