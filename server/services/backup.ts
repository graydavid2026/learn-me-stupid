import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flushDb } from '../db/index.js';
import logger from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'mnemonic.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'data', 'backups');
const MAX_BACKUPS = 7;

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/** Create a timestamped backup of the database file. Returns the backup path. */
export function createBackup(): string {
  ensureBackupDir();

  // Flush any pending writes to disk first
  flushDb();

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found at ${DB_PATH}`);
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

/** Run a full backup cycle: create backup + prune old ones. */
export function runBackupCycle(): { backupPath: string; removedCount: number } {
  const backupPath = createBackup();
  const removedCount = pruneBackups();
  logger.info(`Backup created: ${backupPath} (pruned ${removedCount} old backup${removedCount !== 1 ? 's' : ''})`);
  return { backupPath, removedCount };
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
