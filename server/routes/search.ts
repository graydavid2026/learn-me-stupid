import { Router, Request, Response } from 'express';
import { queryAll, run } from '../db/index.js';
import logger from '../logger.js';

const router = Router();

interface SearchCardRow {
  id: string;
  card_set_id: string;
  sort_order: number;
  tags: string;
  card_type: string;
  sr_slot: number;
  match_text?: string;
  set_name: string;
  topic_name: string;
}

interface SearchTopicRow {
  id: string;
  name: string;
  description: string | null;
}

interface SearchSetRow {
  id: string;
  name: string;
  description: string | null;
  topic_name: string;
}

// Helper: update FTS index for a card after create/update
export function syncCardFts(cardId: string): void {
  try {
    // Remove existing entry
    run(`DELETE FROM cards_fts WHERE card_id = ?`, [cardId]);

    // Re-insert with aggregated text content
    const rows = queryAll(
      `SELECT GROUP_CONCAT(mb.text_content, ' ') as content
       FROM card_sides s
       JOIN media_blocks mb ON mb.card_side_id = s.id
       WHERE s.card_id = ? AND mb.block_type = 'text' AND mb.text_content IS NOT NULL`,
      [cardId]
    );
    const content = rows[0]?.content;
    if (content) {
      run(`INSERT INTO cards_fts (card_id, content) VALUES (?, ?)`, [cardId, content]);
    }
  } catch {
    // FTS table may not exist yet on first run — silently skip
  }
}

// Helper: remove FTS entry for a deleted card
export function removeCardFts(cardId: string): void {
  try {
    run(`DELETE FROM cards_fts WHERE card_id = ?`, [cardId]);
  } catch {
    // Silently skip if FTS table not available
  }
}

// GET /api/search?q=term&topic=X&set=Y
router.get('/', (req: Request, res: Response) => {
  try {
    const { q, topic, set } = req.query;
    if (!q || (q as string).trim().length < 1) {
      return res.json({ topics: [], sets: [], cards: [] });
    }

    const searchTerm = (q as string).trim();
    const likeTerm = `%${searchTerm}%`;

    // Search topics
    const topics = queryAll<SearchTopicRow>(
      'SELECT * FROM topics WHERE name LIKE ? OR description LIKE ? LIMIT 5',
      [likeTerm, likeTerm]
    );

    // Search card sets
    let setsQuery = 'SELECT cs.*, t.name as topic_name FROM card_sets cs JOIN topics t ON t.id = cs.topic_id WHERE (cs.name LIKE ? OR cs.description LIKE ?)';
    const setsParams: unknown[] = [likeTerm, likeTerm];
    if (topic) {
      setsQuery += ' AND cs.topic_id = ?';
      setsParams.push(topic);
    }
    setsQuery += ' LIMIT 10';
    const sets = queryAll<SearchSetRow>(setsQuery, setsParams);

    // Search cards using FTS5 — falls back to LIKE if FTS unavailable
    let cards: SearchCardRow[] = [];
    try {
      const ftsQuery = searchTerm.split(/\s+/).map(t => `"${t.replace(/"/g, '""')}"*`).join(' ');

      let ftsCardQuery = `
        SELECT DISTINCT c.*, fts.content as match_text, cs.name as set_name, t.name as topic_name
        FROM cards_fts fts
        JOIN cards c ON c.id = fts.card_id
        JOIN card_sets cs ON cs.id = c.card_set_id
        JOIN topics t ON t.id = cs.topic_id
        WHERE cards_fts MATCH ?
      `;
      const ftsParams: unknown[] = [ftsQuery];
      if (topic) {
        ftsCardQuery += ' AND cs.topic_id = ?';
        ftsParams.push(topic);
      }
      if (set) {
        ftsCardQuery += ' AND c.card_set_id = ?';
        ftsParams.push(set);
      }
      ftsCardQuery += ' LIMIT 20';
      cards = queryAll<SearchCardRow>(ftsCardQuery, ftsParams);
    } catch {
      // Fallback to LIKE if FTS5 table not available
      let cardsQuery = `
        SELECT DISTINCT c.*, mb.text_content as match_text, cs.name as set_name, t.name as topic_name
        FROM cards c
        JOIN card_sides s ON s.card_id = c.id
        JOIN media_blocks mb ON mb.card_side_id = s.id
        JOIN card_sets cs ON cs.id = c.card_set_id
        JOIN topics t ON t.id = cs.topic_id
        WHERE mb.text_content LIKE ?
      `;
      const cardsParams: unknown[] = [likeTerm];
      if (topic) {
        cardsQuery += ' AND cs.topic_id = ?';
        cardsParams.push(topic);
      }
      if (set) {
        cardsQuery += ' AND c.card_set_id = ?';
        cardsParams.push(set);
      }
      cardsQuery += ' LIMIT 20';
      cards = queryAll<SearchCardRow>(cardsQuery, cardsParams);
    }

    // Search tags
    const tagCards = queryAll<SearchCardRow>(
      `SELECT c.*, cs.name as set_name, t.name as topic_name
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       JOIN topics t ON t.id = cs.topic_id
       WHERE c.tags LIKE ?
       LIMIT 10`,
      [likeTerm]
    );

    // Merge card results (deduplicate by id)
    const cardMap = new Map<string, SearchCardRow>();
    for (const c of [...cards, ...tagCards]) {
      if (!cardMap.has(c.id)) cardMap.set(c.id, c);
    }

    res.json({
      topics,
      sets,
      cards: Array.from(cardMap.values()),
    });
  } catch (err) {
    logger.error({ err }, 'Error searching');
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
