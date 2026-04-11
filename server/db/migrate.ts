import { initDb, exec, queryAll, run } from './index.js';
// initDb is used when running as standalone script

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
    const cols = queryAll(`PRAGMA table_info(cards)`);
    const hasOldTier = cols.some((c: any) => c.name === 'sr_tier');
    const hasNewSlot = cols.some((c: any) => c.name === 'sr_slot');
    const hasGrace = cols.some((c: any) => c.name === 'sr_grace_deadline');

    if (hasOldTier && !hasNewSlot) {
      console.log('Migrating: sr_tier → sr_slot, adding sr_grace_deadline...');
      exec(`ALTER TABLE cards RENAME COLUMN sr_tier TO sr_slot`);
    }
    if (!hasGrace && (hasOldTier || hasNewSlot)) {
      exec(`ALTER TABLE cards ADD COLUMN sr_grace_deadline TEXT`);
    }
  } catch (e) {
    // Table might not exist yet on first run
  }

  // Migration: rename review_log columns tier_before/after → slot_before/after
  try {
    const logCols = queryAll(`PRAGMA table_info(review_log)`);
    const hasOldTierBefore = logCols.some((c: any) => c.name === 'tier_before');
    const hasNewSlotBefore = logCols.some((c: any) => c.name === 'slot_before');

    if (hasOldTierBefore && !hasNewSlotBefore) {
      console.log('Migrating review_log: tier_before/after → slot_before/after...');
      exec(`ALTER TABLE review_log RENAME COLUMN tier_before TO slot_before`);
      exec(`ALTER TABLE review_log RENAME COLUMN tier_after TO slot_after`);
    }
    if (!logCols.some((c: any) => c.name === 'next_due_at')) {
      try { exec(`ALTER TABLE review_log ADD COLUMN next_due_at TEXT`); } catch (_) {}
    }
    if (!logCols.some((c: any) => c.name === 'review_type')) {
      try { exec(`ALTER TABLE review_log ADD COLUMN review_type TEXT DEFAULT 'standard'`); } catch (_) {}
    }
  } catch (e) {
    // Table might not exist yet
  }

  // Create sr_slot index after migration ensures the column exists
  try {
    exec(`CREATE INDEX IF NOT EXISTS idx_cards_slot ON cards(sr_slot)`);
  } catch (_) {}

  // One-time cleanup: remove pronunciation clutter from flashcards.
  //   1. Strip "Pronunciation: ..." lines entirely
  //   2. Strip any parenthesized annotations (romanizations like "(klyuch)",
  //      part-of-speech tags like "(noun/adj)", etc.)
  // Idempotent — running again on already-cleaned text is a no-op.
  try {
    const rows = queryAll(
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
    if (cleaned > 0) console.log(`Cleaned parenthetical annotations from ${cleaned} text blocks`);
  } catch (e) {
    console.warn('Pronunciation cleanup skipped:', e);
  }

  console.log('Database migrated successfully');
}

// Run directly when called as a script
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  initDb().then(() => migrate()).catch(console.error);
}
