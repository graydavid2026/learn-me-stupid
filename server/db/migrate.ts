import { initDb, exec, queryAll, queryOne, run, PragmaColumnInfo, CountRow } from './index.js';
import logger from '../logger.js';
// initDb is used when running as standalone script

interface MediaBlockText {
  id: string;
  text_content: string | null;
}

export async function migrate(): Promise<void> {
  await initDb();

  exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'book',
      parent_topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_sets (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      card_set_id TEXT NOT NULL REFERENCES card_sets(id) ON DELETE CASCADE,
      sort_order INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sr_slot INTEGER DEFAULT 0,
      sr_last_reviewed_at TEXT,
      sr_next_due_at TEXT,
      sr_grace_deadline TEXT,
      sr_total_reviews INTEGER DEFAULT 0,
      sr_total_correct INTEGER DEFAULT 0,
      sr_is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS card_sides (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      side INTEGER NOT NULL CHECK (side IN (0, 1)),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_blocks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      card_side_id TEXT NOT NULL REFERENCES card_sides(id) ON DELETE CASCADE,
      block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'audio', 'video', 'youtube', 'hotspot')),
      sort_order INTEGER DEFAULT 0,
      text_content TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      youtube_url TEXT,
      youtube_embed_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mindmap_nodes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      node_type TEXT NOT NULL CHECK (node_type IN ('topic', 'card_set', 'card', 'custom')),
      ref_id TEXT,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      color TEXT,
      parent_node_id TEXT REFERENCES mindmap_nodes(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mindmap_edges (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      source_node_id TEXT NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
      target_node_id TEXT NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
      label TEXT,
      edge_type TEXT DEFAULT 'default'
    );

    CREATE TABLE IF NOT EXISTS review_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      reviewed_at TEXT DEFAULT (datetime('now')),
      result TEXT NOT NULL CHECK (result IN ('correct', 'wrong')),
      slot_before INTEGER NOT NULL,
      slot_after INTEGER NOT NULL,
      next_due_at TEXT,
      review_type TEXT DEFAULT 'standard',
      response_time_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(card_set_id);
    CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(sr_next_due_at, sr_is_active);
    CREATE INDEX IF NOT EXISTS idx_card_sides ON card_sides(card_id, side);
    CREATE INDEX IF NOT EXISTS idx_media_blocks ON media_blocks(card_side_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_topic ON mindmap_nodes(topic_id);
    CREATE INDEX IF NOT EXISTS idx_review_log_card ON review_log(card_id, reviewed_at);
  `);

  // Migration: rename sr_tier → sr_slot if old schema exists
  try {
    const cols = queryAll<PragmaColumnInfo>(`PRAGMA table_info(cards)`);
    const hasOldTier = cols.some((c) => c.name === 'sr_tier');
    const hasNewSlot = cols.some((c) => c.name === 'sr_slot');
    const hasGrace = cols.some((c) => c.name === 'sr_grace_deadline');

    if (hasOldTier && !hasNewSlot) {
      logger.info('Migrating: sr_tier -> sr_slot, adding sr_grace_deadline...');
      exec(`ALTER TABLE cards RENAME COLUMN sr_tier TO sr_slot`);
    }
    if (!hasGrace && (hasOldTier || hasNewSlot)) {
      exec(`ALTER TABLE cards ADD COLUMN sr_grace_deadline TEXT`);
    }
  } catch (_e) {
    // Table might not exist yet on first run
  }

  // Migration: rename review_log columns tier_before/after → slot_before/after
  try {
    const logCols = queryAll<PragmaColumnInfo>(`PRAGMA table_info(review_log)`);
    const hasOldTierBefore = logCols.some((c) => c.name === 'tier_before');
    const hasNewSlotBefore = logCols.some((c) => c.name === 'slot_before');

    if (hasOldTierBefore && !hasNewSlotBefore) {
      logger.info('Migrating review_log: tier_before/after -> slot_before/after...');
      exec(`ALTER TABLE review_log RENAME COLUMN tier_before TO slot_before`);
      exec(`ALTER TABLE review_log RENAME COLUMN tier_after TO slot_after`);
    }
    if (!logCols.some((c) => c.name === 'next_due_at')) {
      try { exec(`ALTER TABLE review_log ADD COLUMN next_due_at TEXT`); } catch (_) { /* column may already exist */ }
    }
    if (!logCols.some((c) => c.name === 'review_type')) {
      try { exec(`ALTER TABLE review_log ADD COLUMN review_type TEXT DEFAULT 'standard'`); } catch (_) { /* column may already exist */ }
    }
  } catch (_e) {
    // Table might not exist yet
  }

  // Migration: add sr_ease_factor column for SM-2 style per-card ease
  try {
    const cardCols = queryAll<PragmaColumnInfo>(`PRAGMA table_info(cards)`);
    if (!cardCols.some((c) => c.name === 'sr_ease_factor')) {
      exec(`ALTER TABLE cards ADD COLUMN sr_ease_factor REAL DEFAULT 2.5`);
      logger.info('Added sr_ease_factor column to cards');
    }
  } catch (_e) {
    // Table might not exist yet on first run
  }

  // Migration: add card_type column for cloze/typing card types
  try {
    const cardCols2 = queryAll<PragmaColumnInfo>(`PRAGMA table_info(cards)`);
    if (!cardCols2.some((c) => c.name === 'card_type')) {
      exec(`ALTER TABLE cards ADD COLUMN card_type TEXT DEFAULT 'standard'`);
      logger.info('Added card_type column to cards');
    }
  } catch (_e) {
    // Table might not exist yet on first run
  }

  // Migration: add sr_lapse_count column for leech tracking
  try {
    const cardColsLapse = queryAll<PragmaColumnInfo>(`PRAGMA table_info(cards)`);
    if (!cardColsLapse.some((c) => c.name === 'sr_lapse_count')) {
      exec(`ALTER TABLE cards ADD COLUMN sr_lapse_count INTEGER DEFAULT 0`);
      logger.info('Added sr_lapse_count column to cards');
    }
  } catch (_e) {
    // Table might not exist yet on first run
  }

  // Migration: create settings key-value table
  exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration: push_subscriptions table for web push notifications
  exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      endpoint TEXT NOT NULL UNIQUE,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default settings if not present
  try {
    const defaults: [string, string][] = [
      ['retention_target', '85'],
      ['daily_new_limit', '8'],
      ['cards_per_topic_limit', '2'],
    ];
    for (const [key, value] of defaults) {
      const existing = queryOne<{ key: string }>(`SELECT key FROM settings WHERE key = ?`, [key]);
      if (!existing) {
        run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
      }
    }
  } catch (e) {
    logger.warn({ err: e }, 'Settings seeding skipped');
  }

  // Create sr_slot index after migration ensures the column exists
  try {
    exec(`CREATE INDEX IF NOT EXISTS idx_cards_slot ON cards(sr_slot)`);
  } catch (_) { /* index may already exist */ }

  // One-time cleanup: remove pronunciation clutter from flashcards.
  try {
    const rows = queryAll<MediaBlockText>(
      `SELECT id, text_content FROM media_blocks WHERE block_type = 'text' AND text_content IS NOT NULL`
    );
    let cleaned = 0;
    for (const row of rows) {
      const original: string = row.text_content || '';
      let next = original
        .split(/\r?\n/)
        .filter((line) => !/^\s*pronunciation\s*:/i.test(line))
        .join('\n');
      next = next.replace(/\s*\([^)]*\)/g, '');
      next = next.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
      if (next !== original) {
        run(`UPDATE media_blocks SET text_content = ? WHERE id = ?`, [next, row.id]);
        cleaned++;
      }
    }
    if (cleaned > 0) logger.info(`Cleaned parenthetical annotations from ${cleaned} text blocks`);
  } catch (e) {
    logger.warn({ err: e }, 'Pronunciation cleanup skipped');
  }

  // Bump stale slot 2-3 cards to slot 4
  try {
    const stale23 = queryAll<CountRow>(
      `SELECT COUNT(*) AS n FROM cards WHERE sr_slot IN (2, 3)`
    );
    const n23 = stale23[0]?.n ?? 0;
    if (n23 > 0) {
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const graceDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      run(
        `UPDATE cards SET sr_slot = 4, sr_next_due_at = ?, sr_grace_deadline = ?, updated_at = datetime('now') WHERE sr_slot IN (2, 3)`,
        [oneDayFromNow, graceDeadline]
      );
      logger.info(`Graduated ${n23} cards from retired slots 2-3 to slot 4`);
    }
  } catch (e) {
    logger.warn({ err: e }, 'Retired-slot graduation skipped');
  }

  // One-time cleanup: wrong-on-new cards reset to slot 0
  try {
    const affected = queryOne<CountRow>(
      `SELECT COUNT(*) AS n FROM cards WHERE sr_slot > 0 AND id IN (
         SELECT rl.card_id FROM review_log rl
         JOIN (SELECT card_id, MAX(reviewed_at) AS m FROM review_log GROUP BY card_id) lt
           ON lt.card_id = rl.card_id AND lt.m = rl.reviewed_at
         WHERE rl.result = 'wrong' AND rl.slot_before = 0 AND rl.slot_after > 0
       )`
    );
    const n = affected?.n ?? 0;
    if (n > 0) {
      run(
        `UPDATE cards SET sr_slot = 0, sr_next_due_at = NULL, sr_grace_deadline = NULL, updated_at = datetime('now')
         WHERE sr_slot > 0 AND id IN (
           SELECT rl.card_id FROM review_log rl
           JOIN (SELECT card_id, MAX(reviewed_at) AS m FROM review_log GROUP BY card_id) lt
             ON lt.card_id = rl.card_id AND lt.m = rl.reviewed_at
           WHERE rl.result = 'wrong' AND rl.slot_before = 0 AND rl.slot_after > 0
         )`
      );
      logger.info(`Reset ${n} wrong-on-new cards back to slot 0`);
    }
  } catch (e) {
    logger.warn({ err: e }, 'Wrong-on-new reset skipped');
  }

  // Migration: FTS5 full-text search index on card content
  try {
    // Create FTS5 virtual table if it doesn't exist
    exec(`CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(card_id, content)`);

    // Check if FTS table needs population (empty or stale)
    const ftsCount = queryOne(`SELECT COUNT(*) as count FROM cards_fts`);
    const cardCount = queryOne(
      `SELECT COUNT(DISTINCT c.id) as count
       FROM cards c
       JOIN card_sides s ON s.card_id = c.id
       JOIN media_blocks mb ON mb.card_side_id = s.id
       WHERE mb.block_type = 'text' AND mb.text_content IS NOT NULL`
    );

    if ((ftsCount?.count || 0) < (cardCount?.count || 0)) {
      // Rebuild: clear and repopulate
      run(`DELETE FROM cards_fts`);
      const rows = queryAll(
        `SELECT c.id as card_id, GROUP_CONCAT(mb.text_content, ' ') as content
         FROM cards c
         JOIN card_sides s ON s.card_id = c.id
         JOIN media_blocks mb ON mb.card_side_id = s.id
         WHERE mb.block_type = 'text' AND mb.text_content IS NOT NULL
         GROUP BY c.id`
      );
      for (const row of rows) {
        run(`INSERT INTO cards_fts (card_id, content) VALUES (?, ?)`, [row.card_id, row.content]);
      }
      if (rows.length > 0) logger.info(`Populated FTS5 index with ${rows.length} cards`);
    }
  } catch (e) {
    logger.warn({ err: e }, 'FTS5 migration skipped');
  }

  logger.info('Database migrated successfully');
}

// Run directly when called as a script
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  initDb().then(() => migrate()).catch((err) => logger.error({ err }, 'Migration failed'));
}
