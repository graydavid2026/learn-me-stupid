import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.js';

export interface CardRow {
  id: string;
  card_set_id: string;
  sort_order: number;
  tags: string;
  card_type: string;
  sr_slot: number;
  sr_last_reviewed_at: string | null;
  sr_next_due_at: string | null;
  sr_consecutive_correct: number;
  sr_consecutive_wrong: number;
  sr_total_reviews: number;
  sr_total_correct: number;
  sr_is_active: number;
  sr_grace_deadline: string | null;
  sr_ease_factor: number;
  created_at: string;
  updated_at: string;
}

export interface CardSideRow {
  id: string;
  card_id: string;
  side: number;
  created_at: string;
}

export interface MediaBlockRow {
  id: string;
  card_side_id: string;
  block_type: string;
  sort_order: number;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  youtube_url: string | null;
  youtube_embed_id: string | null;
}

export interface TopicRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_topic_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CardSetRow {
  id: string;
  topic_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Row shape returned by PRAGMA table_info() */
export interface PragmaColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/** Generic row with a single aggregate 'next' field */
export interface MaxOrderRow {
  next: number;
}

/** Generic row with a count field */
export interface CountRow {
  count: number;
  n?: number;
}

/** Row with a date string from review_log */
export interface DayRow {
  day: string;
}

export interface ReviewLogRow {
  id: string;
  card_id: string;
  reviewed_at: string;
  result: string;
  slot_before: number;
  slot_after: number;
  response_time_ms: number | null;
  review_type: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB path is overridable via env var so production can point at a mounted
// Azure Files volume (e.g. /app/data/mnemonic.db) without the mount
// clobbering source .ts files that live alongside the default location.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mnemonic.db');

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;
let dirty = false;
let saveInterval: ReturnType<typeof setInterval> | null = null;

// Wait for the DB directory to become available. Azure Files volume mounts
// are sometimes not ready the instant the container starts; if we proceeded
// eagerly we would see "file missing" and create a fresh empty DB that would
// later overwrite the real data on the share (2026-04-22 incident).
async function waitForDbDirectory(dbPath: string, timeoutMs = 30_000): Promise<void> {
  const dir = path.dirname(dbPath);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(dir)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `DB directory ${dir} not available after ${timeoutMs}ms — volume mount may not be ready`
  );
}

export async function initDb(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      await waitForDbDirectory(DB_PATH);
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      // File missing. In production this is almost always a volume-mount race,
      // not a genuine first-time setup. Creating an empty DB here causes the
      // subsequent persist to overwrite the real DB on the share. Refuse to
      // start unless the operator has explicitly opted in.
      if (isProd && process.env.ALLOW_FRESH_DB !== 'true') {
        throw new Error(
          `Database file not found at ${DB_PATH}. Refusing to create a fresh empty DB in production ` +
          `(guard against volume-mount races — see 2026-04-22 wipe). If this is a genuine first-time ` +
          `setup, set ALLOW_FRESH_DB=true for one deploy, then remove it.`
        );
      }
      logger.warn(`No DB file at ${DB_PATH} — creating fresh empty DB`);
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
      logger.error({ err }, 'Failed to persist database');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to export database for save');
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
    logger.error({ err }, 'Failed to flush database on shutdown');
  }
}

// Graceful shutdown hooks
process.on('beforeExit', flushDb);
process.on('SIGTERM', () => {
  flushDb();
  process.exit(0);
});

// Helper: run a query and return rows as objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function queryAll<T = any>(sql: string, params: unknown[] = []): T[] {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length) stmt.bind(params);

  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return first row as object or null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function queryOne<T = any>(sql: string, params: unknown[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run a mutation (INSERT/UPDATE/DELETE)
export function run(sql: string, params: unknown[] = []): void {
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
