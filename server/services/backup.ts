import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flushDb, queryOne, queryAll } from '../db/index.js';
import logger from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'mnemonic.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'data', 'backups');
// Must match the upload dir used by index.ts / routes/media.ts. In prod this is
// the persistent Azure Files share (/app/data/uploads).
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
// Append-only archive of every uploaded file ever seen. Uploads themselves live
// on the persistent share, but that protects only against restarts — not against
// an accidental file delete or the uploads dir being cleared. The archive keeps a
// second copy (deduped by name+size, never pruned) so any DB-referenced image can
// be self-healed back onto disk on startup. Mirrors the DB self-heal philosophy.
const UPLOADS_ARCHIVE_DIR = path.join(BACKUP_DIR, 'uploads-archive');
// Keep a month of daily backups. A backup runs on every startup, so a short
// window means a wiped DB can prune away every good backup within a handful of
// restarts. 30 gives a real recovery window.
const MAX_BACKUPS = 30;

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Returns the number of cards currently in the DB, or null if that can't be
 * determined (table missing / query error). Used to refuse backing up a
 * wiped/empty DB over good backups.
 */
function cardCount(): number | null {
  try {
    const row = queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM cards');
    return row ? row.n : null;
  } catch {
    return null;
  }
}

/**
 * Create a timestamped backup of the database file. Returns the backup path,
 * or null if the backup was skipped because the DB is empty.
 *
 * Skipping empty DBs is the single most important safety property here: after
 * a wipe, the next startup would otherwise snapshot the empty DB and prune a
 * good backup — propagating the wipe into the backup set until recovery is
 * impossible (this nearly destroyed the only good backup on 2026-06-06).
 */
export function createBackup(): string | null {
  ensureBackupDir();

  // Flush any pending writes to disk first
  flushDb();

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found at ${DB_PATH}`);
  }

  const cards = cardCount();
  if (cards === 0 || cards === null) {
    logger.warn(
      { cardCount: cards },
      'Skipping backup: DB has no cards (refusing to overwrite/prune good backups with an empty snapshot)'
    );
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const backupName = `mnemonic-${today}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(DB_PATH, backupPath);
  return backupPath;
}

/** Remove old backups, keeping only the most recent MAX_BACKUPS files. */
export function pruneBackups(): number {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('mnemonic-') && f.endsWith('.db'))
    .sort()
    .reverse(); // newest first

  let removed = 0;
  for (let i = MAX_BACKUPS; i < files.length; i++) {
    fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
    removed++;
  }

  return removed;
}

/**
 * Copy any upload file not already archived (deduped by name + byte size) into
 * the append-only archive. Never deletes from the archive, so a file removed
 * from the live uploads dir stays recoverable. Returns the number of newly
 * archived files. Failures on individual files are logged, not thrown — a
 * backup of the rest must still proceed.
 */
export function backupUploads(): number {
  if (!fs.existsSync(UPLOADS_DIR)) return 0;
  if (!fs.existsSync(UPLOADS_ARCHIVE_DIR)) {
    fs.mkdirSync(UPLOADS_ARCHIVE_DIR, { recursive: true });
  }

  let archived = 0;
  for (const name of fs.readdirSync(UPLOADS_DIR)) {
    try {
      const src = path.join(UPLOADS_DIR, name);
      if (!fs.statSync(src).isFile()) continue;
      const dest = path.join(UPLOADS_ARCHIVE_DIR, name);
      if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) {
        continue; // already archived
      }
      fs.copyFileSync(src, dest);
      archived++;
    } catch (err) {
      logger.error({ err, name }, 'Failed to archive upload');
    }
  }
  return archived;
}

/**
 * Self-heal: for every file_path referenced by a media block, if the file is
 * missing from the live uploads dir but present in the archive, copy it back.
 * Only restores DB-referenced files (not every orphan ever uploaded) so a
 * deliberately deleted image is not resurrected. Call once on startup, after
 * the DB is initialized. Returns the number of files restored.
 */
export function restoreMissingUploads(): number {
  if (!fs.existsSync(UPLOADS_ARCHIVE_DIR)) return 0;
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  let referenced: { file_path: string }[];
  try {
    referenced = queryAll<{ file_path: string }>(
      "SELECT DISTINCT file_path FROM media_blocks WHERE file_path IS NOT NULL AND file_path != ''"
    );
  } catch (err) {
    logger.error({ err }, 'Could not read media_blocks for upload self-heal');
    return 0;
  }

  let restored = 0;
  for (const { file_path } of referenced) {
    try {
      const safe = path.basename(file_path); // guard against path traversal
      const live = path.join(UPLOADS_DIR, safe);
      if (fs.existsSync(live)) continue;
      const archived = path.join(UPLOADS_ARCHIVE_DIR, safe);
      if (!fs.existsSync(archived)) continue;
      fs.copyFileSync(archived, live);
      restored++;
    } catch (err) {
      logger.error({ err, file_path }, 'Failed to restore upload from archive');
    }
  }
  if (restored > 0) {
    logger.info(`Restored ${restored} missing upload${restored !== 1 ? 's' : ''} from archive`);
  }
  return restored;
}

/** Run a full backup cycle: create backup + prune old ones + archive uploads. */
export function runBackupCycle(): { backupPath: string | null; removedCount: number; uploadsArchived: number } {
  // Archive uploads regardless of DB state — they are independent of the DB and
  // archiving is append-only, so it is always safe (never overwrites good data).
  let uploadsArchived = 0;
  try {
    uploadsArchived = backupUploads();
  } catch (err) {
    logger.error({ err }, 'Upload archive step failed');
  }

  const backupPath = createBackup();
  // Only prune when we actually created a backup. If the backup was skipped
  // (empty DB), pruning would delete good backups for nothing.
  if (!backupPath) {
    if (uploadsArchived > 0) {
      logger.info(`Archived ${uploadsArchived} new upload${uploadsArchived !== 1 ? 's' : ''} (DB backup skipped)`);
    }
    return { backupPath: null, removedCount: 0, uploadsArchived };
  }
  const removedCount = pruneBackups();
  logger.info(
    `Backup created: ${backupPath} (pruned ${removedCount} old backup${removedCount !== 1 ? 's' : ''}, archived ${uploadsArchived} new upload${uploadsArchived !== 1 ? 's' : ''})`
  );
  return { backupPath, removedCount, uploadsArchived };
}

/** Start the daily backup interval. Call once on server startup. */
export function startScheduledBackups(): void {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Run first backup shortly after startup (10 seconds)
  const startupTimer = setTimeout(() => {
    try {
      runBackupCycle();
    } catch (err) {
      logger.error({ err }, 'Scheduled backup failed');
    }
  }, 10_000);
  if (startupTimer.unref) startupTimer.unref();

  // Then every 24 hours
  const interval = setInterval(() => {
    try {
      runBackupCycle();
    } catch (err) {
      logger.error({ err }, 'Scheduled backup failed');
    }
  }, TWENTY_FOUR_HOURS);
  if (interval.unref) interval.unref();

  logger.info('Scheduled daily backups enabled');
}
