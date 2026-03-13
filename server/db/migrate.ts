import { initDb, exec } from './index.js';
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
      sr_tier INTEGER DEFAULT 0,
      sr_last_reviewed_at TEXT,
      sr_next_due_at TEXT,
      sr_consecutive_correct INTEGER DEFAULT 0,
      sr_consecutive_wrong INTEGER DEFAULT 0,
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
      block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'audio', 'video', 'youtube')),
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
      tier_before INTEGER NOT NULL,
      tier_after INTEGER NOT NULL,
      response_time_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(card_set_id);
    CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(sr_next_due_at, sr_is_active);
    CREATE INDEX IF NOT EXISTS idx_cards_tier ON cards(sr_tier);
    CREATE INDEX IF NOT EXISTS idx_card_sides ON card_sides(card_id, side);
    CREATE INDEX IF NOT EXISTS idx_media_blocks ON media_blocks(card_side_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_topic ON mindmap_nodes(topic_id);
    CREATE INDEX IF NOT EXISTS idx_review_log_card ON review_log(card_id, reviewed_at);
  `);

  console.log('Database migrated successfully');
}

// Run directly when called as a script
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  initDb().then(() => migrate()).catch(console.error);
}
