import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/index.js';
import { v4 as uuid } from 'uuid';

const router = Router();

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

// Helper: get full card with sides and media blocks
function getFullCard(cardId: string) {
  const card = queryOne('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return null;

  const sides = queryAll('SELECT * FROM card_sides WHERE card_id = ? ORDER BY side', [cardId]);
  const front = sides.find((s: any) => s.side === 0) || null;
  const back = sides.find((s: any) => s.side === 1) || null;

  if (front) {
    front.media_blocks = queryAll(
      'SELECT * FROM media_blocks WHERE card_side_id = ? ORDER BY sort_order',
      [front.id]
    );
  }
  if (back) {
    back.media_blocks = queryAll(
      'SELECT * FROM media_blocks WHERE card_side_id = ? ORDER BY sort_order',
      [back.id]
    );
  }

  return {
    ...card,
    front: front || { id: null, side: 0, media_blocks: [] },
    back: back || { id: null, side: 1, media_blocks: [] },
  };
}

// GET /api/sets/:setId/cards — List cards with full media blocks
router.get('/sets/:setId/cards', (req, res) => {
  try {
    const { setId } = req.params;
    const cards = queryAll('SELECT * FROM cards WHERE card_set_id = ? ORDER BY sort_order', [setId]);
    const fullCards = cards.map((c: any) => getFullCard(c.id));
    res.json(fullCards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /api/cards/:id — Get single card with all data
router.get('/cards/:id', (req, res) => {
  try {
    const card = getFullCard(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// POST /api/sets/:setId/cards — Create card with sides and media blocks
router.post('/sets/:setId/cards', (req, res) => {
  try {
    const { setId } = req.params;
    const { tags, front, back } = req.body;

    // Verify set exists
    const set = queryOne('SELECT id FROM card_sets WHERE id = ?', [setId]);
    if (!set) return res.status(404).json({ error: 'Card set not found' });

    const cardId = genId();
    const maxOrder = queryOne(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
      [setId]
    );

    // Create card
    run(
      `INSERT INTO cards (id, card_set_id, sort_order, tags) VALUES (?, ?, ?, ?)`,
      [cardId, setId, maxOrder.next, JSON.stringify(tags || [])]
    );

    // Create front side
    const frontId = genId();
    run(
      `INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 0)`,
      [frontId, cardId]
    );

    // Create back side
    const backId = genId();
    run(
      `INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 1)`,
      [backId, cardId]
    );

    // Insert media blocks for front
    if (front?.media_blocks) {
      for (let i = 0; i < front.media_blocks.length; i++) {
        const block = front.media_blocks[i];
        const blockId = genId();
        run(
          `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [blockId, frontId, block.block_type, i, block.text_content || null, block.file_path || null, block.file_name || null, block.file_size || null, block.mime_type || null, block.youtube_url || null, block.youtube_embed_id || null]
        );
      }
    }

    // Insert media blocks for back
    if (back?.media_blocks) {
      for (let i = 0; i < back.media_blocks.length; i++) {
        const block = back.media_blocks[i];
        const blockId = genId();
        run(
          `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [blockId, backId, block.block_type, i, block.text_content || null, block.file_path || null, block.file_name || null, block.file_size || null, block.mime_type || null, block.youtube_url || null, block.youtube_embed_id || null]
        );
      }
    }

    const fullCard = getFullCard(cardId);
    res.status(201).json(fullCard);
  } catch (err) {
    console.error('Error creating card:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// PUT /api/cards/:id — Update card metadata + sides + media blocks
router.put('/cards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { tags, front, back } = req.body;

    const existing = queryOne('SELECT * FROM cards WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card not found' });

    // Update card metadata
    if (tags !== undefined) {
      run('UPDATE cards SET tags = ?, updated_at = datetime(\'now\') WHERE id = ?', [JSON.stringify(tags), id]);
    } else {
      run('UPDATE cards SET updated_at = datetime(\'now\') WHERE id = ?', [id]);
    }

    // Update front side media blocks
    if (front?.media_blocks) {
      const frontSide = queryOne('SELECT * FROM card_sides WHERE card_id = ? AND side = 0', [id]);
      if (frontSide) {
        // Delete existing blocks
        run('DELETE FROM media_blocks WHERE card_side_id = ?', [frontSide.id]);
        // Insert new blocks
        for (let i = 0; i < front.media_blocks.length; i++) {
          const block = front.media_blocks[i];
          const blockId = block.id && block.id.length > 0 ? block.id : genId();
          run(
            `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [blockId, frontSide.id, block.block_type, i, block.text_content || null, block.file_path || null, block.file_name || null, block.file_size || null, block.mime_type || null, block.youtube_url || null, block.youtube_embed_id || null]
          );
        }
      }
    }

    // Update back side media blocks
    if (back?.media_blocks) {
      const backSide = queryOne('SELECT * FROM card_sides WHERE card_id = ? AND side = 1', [id]);
      if (backSide) {
        run('DELETE FROM media_blocks WHERE card_side_id = ?', [backSide.id]);
        for (let i = 0; i < back.media_blocks.length; i++) {
          const block = back.media_blocks[i];
          const blockId = block.id && block.id.length > 0 ? block.id : genId();
          run(
            `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [blockId, backSide.id, block.block_type, i, block.text_content || null, block.file_path || null, block.file_name || null, block.file_size || null, block.mime_type || null, block.youtube_url || null, block.youtube_embed_id || null]
          );
        }
      }
    }

    const fullCard = getFullCard(id);
    res.json(fullCard);
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// DELETE /api/cards/:id — Delete card
router.delete('/cards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM cards WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card not found' });

    run('DELETE FROM cards WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// PATCH /api/cards/:id/move — Move card to a different set
router.patch('/cards/:id/move', (req, res) => {
  try {
    const { id } = req.params;
    const { card_set_id } = req.body;

    const card = queryOne('SELECT * FROM cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const targetSet = queryOne('SELECT id FROM card_sets WHERE id = ?', [card_set_id]);
    if (!targetSet) return res.status(404).json({ error: 'Target set not found' });

    const maxOrder = queryOne(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
      [card_set_id]
    );

    run(
      'UPDATE cards SET card_set_id = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [card_set_id, maxOrder.next, id]
    );

    const fullCard = getFullCard(id);
    res.json(fullCard);
  } catch (err) {
    console.error('Error moving card:', err);
    res.status(500).json({ error: 'Failed to move card' });
  }
});

export default router;
