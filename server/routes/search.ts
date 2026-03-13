import { Router } from 'express';
import { queryAll } from '../db/index.js';

const router = Router();

// GET /api/search?q=term&topic=X&set=Y
router.get('/', (req, res) => {
  try {
    const { q, topic, set } = req.query;
    if (!q || (q as string).trim().length < 1) {
      return res.json({ topics: [], sets: [], cards: [] });
    }

    const term = `%${(q as string).trim()}%`;

    // Search topics
    const topics = queryAll(
      'SELECT * FROM topics WHERE name LIKE ? OR description LIKE ? LIMIT 5',
      [term, term]
    );

    // Search card sets
    let setsQuery = 'SELECT cs.*, t.name as topic_name FROM card_sets cs JOIN topics t ON t.id = cs.topic_id WHERE (cs.name LIKE ? OR cs.description LIKE ?)';
    const setsParams: any[] = [term, term];
    if (topic) {
      setsQuery += ' AND cs.topic_id = ?';
      setsParams.push(topic);
    }
    setsQuery += ' LIMIT 10';
    const sets = queryAll(setsQuery, setsParams);

    // Search cards by text content in media blocks
    let cardsQuery = `
      SELECT DISTINCT c.*, mb.text_content as match_text, cs.name as set_name, t.name as topic_name
      FROM cards c
      JOIN card_sides s ON s.card_id = c.id
      JOIN media_blocks mb ON mb.card_side_id = s.id
      JOIN card_sets cs ON cs.id = c.card_set_id
      JOIN topics t ON t.id = cs.topic_id
      WHERE mb.text_content LIKE ?
    `;
    const cardsParams: any[] = [term];
    if (topic) {
      cardsQuery += ' AND cs.topic_id = ?';
      cardsParams.push(topic);
    }
    if (set) {
      cardsQuery += ' AND c.card_set_id = ?';
      cardsParams.push(set);
    }
    cardsQuery += ' LIMIT 20';
    const cards = queryAll(cardsQuery, cardsParams);

    // Search tags
    const tagCards = queryAll(
      `SELECT c.*, cs.name as set_name, t.name as topic_name
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       JOIN topics t ON t.id = cs.topic_id
       WHERE c.tags LIKE ?
       LIMIT 10`,
      [term]
    );

    // Merge card results (deduplicate by id)
    const cardMap = new Map<string, any>();
    for (const c of [...cards, ...tagCards]) {
      if (!cardMap.has(c.id)) cardMap.set(c.id, c);
    }

    res.json({
      topics,
      sets,
      cards: Array.from(cardMap.values()),
    });
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
