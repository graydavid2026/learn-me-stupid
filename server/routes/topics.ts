import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, TopicRow, CardSideRow, MaxOrderRow } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import logger from '../logger.js';

const router = Router();

interface TopicWithCounts extends TopicRow {
  card_count: number;
  due_count: number;
}

interface SetSummary {
  id: string;
  name: string;
  description: string | null;
  card_count: number;
}

interface SampleCard {
  id: string;
  set_name: string;
}

interface TextBlock {
  text_content: string | null;
}

// GET /api/topics — List all topics with card counts and due counts
// Supports pagination: ?page=1&limit=20
// Default (no params) returns all items for backwards compatibility
router.get('/', (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const wantsPagination = page !== undefined || limit !== undefined;

    let baseSql = `
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
        WHERE c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now')
        GROUP BY cs.topic_id
      ) dc ON dc.topic_id = t.id
      ORDER BY t.sort_order, t.created_at
    `;

    if (!wantsPagination) {
      const topics = queryAll<TopicWithCounts>(baseSql);
      return res.json(topics);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    const totalRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM topics');
    const total = totalRow?.count || 0;

    baseSql += ' LIMIT ? OFFSET ?';
    const topics = queryAll<TopicWithCounts>(baseSql, [pageSize, offset]);

    res.json({ data: topics, total, page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, 'Error fetching topics');
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /api/topics — Create topic
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, color, icon, parent_topic_id } = req.body as {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      parent_topic_id?: string;
    };
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const maxOrder = queryOne<MaxOrderRow>('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM topics');
    const id = uuid().replace(/-/g, '').slice(0, 16);

    run(
      `INSERT INTO topics (id, name, description, color, icon, parent_topic_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), description || null, color || '#6366f1', icon || 'book', parent_topic_id || null, maxOrder!.next]
    );

    const topic = queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id]);
    res.status(201).json(topic);
  } catch (err) {
    logger.error({ err }, 'Error creating topic');
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// PUT /api/topics/:id — Update topic
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, parent_topic_id, sort_order } = req.body as {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      parent_topic_id?: string | null;
      sort_order?: number;
    };

    const existing = queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id]);
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

    const topic = queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id]);
    res.json(topic);
  } catch (err) {
    logger.error({ err }, 'Error updating topic');
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

// GET /api/topics/:id/prompt — Generate an LLM prompt seeded with topic context
router.get('/:id/prompt', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topic = queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id]);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const sets = queryAll<SetSummary>(
      `SELECT cs.id, cs.name, cs.description, COUNT(c.id) as card_count
       FROM card_sets cs
       LEFT JOIN cards c ON c.card_set_id = cs.id
       WHERE cs.topic_id = ?
       GROUP BY cs.id
       ORDER BY cs.sort_order, cs.created_at`,
      [id]
    );

    // Sample up to 8 cards from this topic to show the LLM the existing style.
    const sampleCards = queryAll<SampleCard>(
      `SELECT c.id, cs.name as set_name
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ?
       ORDER BY RANDOM()
       LIMIT 8`,
      [id]
    );

    const cardTextOfSide = (cardId: string, side: 0 | 1): string => {
      const sideRow = queryOne<CardSideRow>(
        'SELECT id FROM card_sides WHERE card_id = ? AND side = ?',
        [cardId, side]
      );
      if (!sideRow) return '';
      const blocks = queryAll<TextBlock>(
        `SELECT text_content FROM media_blocks
         WHERE card_side_id = ? AND block_type = 'text'
         ORDER BY sort_order`,
        [sideRow.id]
      );
      return blocks.map((b) => b.text_content || '').filter(Boolean).join('\n').trim();
    };

    const exampleBlocks = sampleCards
      .map((c, i) => {
        const front = cardTextOfSide(c.id, 0);
        const back = cardTextOfSide(c.id, 1);
        return `### Example ${i + 1} — Set: ${c.set_name}
Front:
${front || '(empty)'}

Back:
${back || '(empty)'}`;
      })
      .join('\n\n---\n\n');

    const setLines = sets
      .map((s) => `- ${s.name}${s.description ? ` — ${s.description}` : ''} (${s.card_count} cards, id: ${s.id})`)
      .join('\n') || '(no card sets yet)';

    const prompt = `You are helping me build flashcards for the topic "${topic.name}" in a spaced-repetition study app.

# Topic
**Name:** ${topic.name}
${topic.description ? `**Description:** ${topic.description}` : ''}
**Topic ID:** ${topic.id}

# Existing Card Sets
${setLines}

# Style Examples (existing cards in this topic)
${exampleBlocks || '(no existing cards — infer a reasonable style from the topic name)'}

# What I need
Generate 10 NEW flashcards for this topic that match the style above.
- Do not duplicate any of the existing examples.
- Front should be a prompt (term / question / concept).
- Back should be a concise, complete answer.
- Keep markdown formatting (e.g. \`**bold**\`) consistent with the examples.
- If the topic involves a non-English language, keep the target word clean on the front; do NOT include parenthesized romanizations or part-of-speech tags — the app strips them.

# Output — give me BOTH of these

## 1. Human-readable (for copy/paste into the Create Card UI)
\`\`\`
Card 1
Front: ...
Back: ...

Card 2
Front: ...
Back: ...
\`\`\`

## 2. Claude Code bulk-insert JSON
A single JSON blob I can hand to Claude Code with the instruction "insert these cards into the Gray Road learn-me-stupid DB". Pick an appropriate existing card set id from the list above, or tell me which new set to create.

\`\`\`json
{
  "topic_id": "${topic.id}",
  "card_set_id": "<pick one from the list above>",
  "cards": [
    {
      "tags": [],
      "front": { "text": "..." },
      "back":  { "text": "..." }
    }
  ]
}
\`\`\`
`;

    res.json({ prompt });
  } catch (err) {
    logger.error({ err }, 'Error generating topic prompt');
    res.status(500).json({ error: 'Failed to generate prompt' });
  }
});

// DELETE /api/topics/:id — Delete topic (cascades)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne<TopicRow>('SELECT * FROM topics WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Topic not found' });

    run('DELETE FROM topics WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error deleting topic');
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
