import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/index.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/topics — List all topics with card counts and due counts
router.get('/', (_req, res) => {
  try {
    const topics = queryAll(`
      SELECT
        t.*,
        COALESCE(cc.card_count, 0) as card_count,
        COALESCE(dc.due_count, 0) as due_count
      FROM topics t
      LEFT JOIN (
        SELECT cs.topic_id, COUNT(c.id) as card_count
        FROM card_sets cs
        JOIN cards c ON c.card_set_id = cs.id
        GROUP BY cs.topic_id
      ) cc ON cc.topic_id = t.id
      LEFT JOIN (
        SELECT cs.topic_id, COUNT(c.id) as due_count
        FROM card_sets cs
        JOIN cards c ON c.card_set_id = cs.id
        WHERE c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND c.sr_next_due_at <= datetime('now')
        GROUP BY cs.topic_id
      ) dc ON dc.topic_id = t.id
      ORDER BY t.sort_order, t.created_at
    `);
    res.json(topics);
  } catch (err) {
    console.error('Error fetching topics:', err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /api/topics — Create topic
router.post('/', (req, res) => {
  try {
    const { name, description, color, icon, parent_topic_id } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const maxOrder = queryOne('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM topics');
    const id = uuid().replace(/-/g, '').slice(0, 16);

    run(
      `INSERT INTO topics (id, name, description, color, icon, parent_topic_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), description || null, color || '#6366f1', icon || 'book', parent_topic_id || null, maxOrder.next]
    );

    const topic = queryOne('SELECT * FROM topics WHERE id = ?', [id]);
    res.status(201).json(topic);
  } catch (err) {
    console.error('Error creating topic:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// PUT /api/topics/:id — Update topic
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, parent_topic_id, sort_order } = req.body;

    const existing = queryOne('SELECT * FROM topics WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Topic not found' });

    run(
      `UPDATE topics SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        parent_topic_id = ?,
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now')
      WHERE id = ?`,
      [
        name || null,
        description !== undefined ? description : null,
        color || null,
        icon || null,
        parent_topic_id !== undefined ? parent_topic_id : existing.parent_topic_id,
        sort_order ?? null,
        id,
      ]
    );

    const topic = queryOne('SELECT * FROM topics WHERE id = ?', [id]);
    res.json(topic);
  } catch (err) {
    console.error('Error updating topic:', err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

// DELETE /api/topics/:id — Delete topic (cascades)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM topics WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Topic not found' });

    run('DELETE FROM topics WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting topic:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
