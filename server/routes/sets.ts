import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/index.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/topics/:topicId/sets — List sets in a topic
router.get('/topics/:topicId/sets', (req, res) => {
  try {
    const { topicId } = req.params;
    const sets = queryAll(
      `SELECT
        cs.*,
        COUNT(c.id) as card_count,
        SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND c.sr_next_due_at <= datetime('now') THEN 1 ELSE 0 END) as due_count,
        SUM(CASE WHEN c.sr_slot = 0 THEN 1 ELSE 0 END) as new_count
      FROM card_sets cs
      LEFT JOIN cards c ON c.card_set_id = cs.id
      WHERE cs.topic_id = ?
      GROUP BY cs.id
      ORDER BY cs.sort_order, cs.created_at`,
      [topicId]
    );
    res.json(sets);
  } catch (err) {
    console.error('Error fetching sets:', err);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// POST /api/topics/:topicId/sets — Create card set
router.post('/topics/:topicId/sets', (req, res) => {
  try {
    const { topicId } = req.params;
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const topic = queryOne('SELECT id FROM topics WHERE id = ?', [topicId]);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const maxOrder = queryOne(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM card_sets WHERE topic_id = ?',
      [topicId]
    );
    const id = uuid().replace(/-/g, '').slice(0, 16);

    run(
      `INSERT INTO card_sets (id, topic_id, name, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [id, topicId, name.trim(), description || null, maxOrder.next]
    );

    const set = queryOne('SELECT * FROM card_sets WHERE id = ?', [id]);
    res.status(201).json(set);
  } catch (err) {
    console.error('Error creating set:', err);
    res.status(500).json({ error: 'Failed to create set' });
  }
});

// PUT /api/sets/:id — Update card set
router.put('/sets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order } = req.body;

    const existing = queryOne('SELECT * FROM card_sets WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card set not found' });

    run(
      `UPDATE card_sets SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now')
      WHERE id = ?`,
      [name || null, description !== undefined ? description : null, sort_order ?? null, id]
    );

    const set = queryOne('SELECT * FROM card_sets WHERE id = ?', [id]);
    res.json(set);
  } catch (err) {
    console.error('Error updating set:', err);
    res.status(500).json({ error: 'Failed to update set' });
  }
});

// DELETE /api/sets/:id — Delete card set (cascades)
router.delete('/sets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM card_sets WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card set not found' });

    run('DELETE FROM card_sets WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting set:', err);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

export default router;
