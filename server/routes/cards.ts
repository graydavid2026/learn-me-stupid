import { Router, Request, Response } from 'express';
import multer from 'multer';
import { queryAll, queryOne, run, getDb, CardRow, CardSideRow, MediaBlockRow, MaxOrderRow } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import logger from '../logger.js';
import { syncCardFts, removeCardFts } from './search.js';
import { generateCards } from '../services/aiCardGenerator.js';
import { extractFromPdf, splitIntoCards } from '../services/documentExtractor.js';

const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

/** Row shape from the JOIN query that fetches card + sides + media in one shot */
interface FullCardJoinRow {
  // card fields
  id: string;
  card_set_id: string;
  sort_order: number;
  tags: string;
  card_type: string;
  sr_slot: number;
  sr_last_reviewed_at: string | null;
  sr_next_due_at: string | null;
  sr_consecutive_correct: number;
  sr_consecutive_wrong: number;
  sr_total_reviews: number;
  sr_total_correct: number;
  sr_is_active: number;
  sr_grace_deadline: string | null;
  sr_ease_factor: number;
  created_at: string;
  updated_at: string;
  // side fields
  side_id: string | null;
  side: number | null;
  // media block fields
  mb_id: string | null;
  mb_block_type: string | null;
  mb_sort_order: number | null;
  mb_text_content: string | null;
  mb_file_path: string | null;
  mb_file_name: string | null;
  mb_file_size: number | null;
  mb_mime_type: string | null;
  mb_youtube_url: string | null;
  mb_youtube_embed_id: string | null;
}

interface FullCardResult {
  id: string;
  card_set_id: string;
  sort_order: number;
  tags: string;
  card_type: string;
  sr_slot: number;
  sr_last_reviewed_at: string | null;
  sr_next_due_at: string | null;
  sr_consecutive_correct: number;
  sr_consecutive_wrong: number;
  sr_total_reviews: number;
  sr_total_correct: number;
  sr_is_active: number;
  sr_grace_deadline: string | null;
  sr_ease_factor: number;
  created_at: string;
  updated_at: string;
  front: { id: string | null; side: 0; media_blocks: MediaBlockRow[] };
  back: { id: string | null; side: 1; media_blocks: MediaBlockRow[] };
}

interface MediaBlockInput {
  id?: string;
  block_type: string;
  text_content?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  youtube_url?: string | null;
  youtube_embed_id?: string | null;
}

interface CardSideInput {
  media_blocks?: MediaBlockInput[];
}

// Helper: get full card with sides and media blocks in a single JOIN query
function getFullCard(cardId: string): FullCardResult | null {
  const rows = queryAll<FullCardJoinRow>(
    `SELECT
       c.*,
       cs.id AS side_id,
       cs.side AS side,
       mb.id AS mb_id,
       mb.block_type AS mb_block_type,
       mb.sort_order AS mb_sort_order,
       mb.text_content AS mb_text_content,
       mb.file_path AS mb_file_path,
       mb.file_name AS mb_file_name,
       mb.file_size AS mb_file_size,
       mb.mime_type AS mb_mime_type,
       mb.youtube_url AS mb_youtube_url,
       mb.youtube_embed_id AS mb_youtube_embed_id
     FROM cards c
     LEFT JOIN card_sides cs ON cs.card_id = c.id
     LEFT JOIN media_blocks mb ON mb.card_side_id = cs.id
     WHERE c.id = ?
     ORDER BY cs.side, mb.sort_order`,
    [cardId]
  );

  if (rows.length === 0) return null;

  const first = rows[0];
  const result: FullCardResult = {
    id: first.id,
    card_set_id: first.card_set_id,
    sort_order: first.sort_order,
    tags: first.tags,
    card_type: first.card_type,
    sr_slot: first.sr_slot,
    sr_last_reviewed_at: first.sr_last_reviewed_at,
    sr_next_due_at: first.sr_next_due_at,
    sr_consecutive_correct: first.sr_consecutive_correct,
    sr_consecutive_wrong: first.sr_consecutive_wrong,
    sr_total_reviews: first.sr_total_reviews,
    sr_total_correct: first.sr_total_correct,
    sr_is_active: first.sr_is_active,
    sr_grace_deadline: first.sr_grace_deadline,
    sr_ease_factor: first.sr_ease_factor,
    created_at: first.created_at,
    updated_at: first.updated_at,
    front: { id: null, side: 0, media_blocks: [] },
    back: { id: null, side: 1, media_blocks: [] },
  };

  for (const row of rows) {
    if (row.side_id == null || row.side == null) continue;

    const target = row.side === 0 ? result.front : result.back;
    if (target.id === null) {
      target.id = row.side_id;
    }

    if (row.mb_id != null) {
      target.media_blocks.push({
        id: row.mb_id,
        card_side_id: row.side_id,
        block_type: row.mb_block_type!,
        sort_order: row.mb_sort_order!,
        text_content: row.mb_text_content,
        file_path: row.mb_file_path,
        file_name: row.mb_file_name,
        file_size: row.mb_file_size,
        mime_type: row.mb_mime_type,
        youtube_url: row.mb_youtube_url,
        youtube_embed_id: row.mb_youtube_embed_id,
      });
    }
  }

  return result;
}

// GET /api/cards — List all cards with pagination
// Supports: ?page=1&limit=50
// Default (no params) returns all items for backwards compatibility
router.get('/cards', (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const wantsPagination = page !== undefined || limit !== undefined;

    if (!wantsPagination) {
      const cards = queryAll<CardRow>('SELECT * FROM cards ORDER BY created_at DESC');
      const fullCards = cards.map((c) => getFullCard(c.id));
      return res.json(fullCards);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const totalRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM cards');
    const total = totalRow?.count || 0;

    const cards = queryAll<CardRow>(
      'SELECT * FROM cards ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    const fullCards = cards.map((c) => getFullCard(c.id));

    res.json({ data: fullCards, total, page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, 'Error fetching cards');
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /api/sets/:setId/cards — List cards in a set with full media blocks
// Supports pagination: ?page=1&limit=50
// Default (no params) returns all items for backwards compatibility
router.get('/sets/:setId/cards', (req: Request, res: Response) => {
  try {
    const { setId } = req.params;
    const { page, limit } = req.query;
    const wantsPagination = page !== undefined || limit !== undefined;

    if (!wantsPagination) {
      const cards = queryAll<CardRow>('SELECT * FROM cards WHERE card_set_id = ? ORDER BY sort_order', [setId]);
      const fullCards = cards.map((c) => getFullCard(c.id));
      return res.json(fullCards);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const totalRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM cards WHERE card_set_id = ?', [setId]);
    const total = totalRow?.count || 0;

    const cards = queryAll<CardRow>(
      'SELECT * FROM cards WHERE card_set_id = ? ORDER BY sort_order LIMIT ? OFFSET ?',
      [setId, pageSize, offset]
    );
    const fullCards = cards.map((c) => getFullCard(c.id));

    res.json({ data: fullCards, total, page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, 'Error fetching cards');
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /api/cards/:id — Get single card with all data
router.get('/cards/:id', (req: Request, res: Response) => {
  try {
    const card = getFullCard(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    logger.error({ err }, 'Error fetching card');
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// POST /api/sets/:setId/cards — Create card with sides and media blocks
router.post('/sets/:setId/cards', (req: Request, res: Response) => {
  try {
    const { setId } = req.params;
    const { tags, front, back, card_type } = req.body as {
      tags?: string[];
      front?: CardSideInput;
      back?: CardSideInput;
      card_type?: string;
    };

    // Verify set exists
    const set = queryOne<{ id: string }>('SELECT id FROM card_sets WHERE id = ?', [setId]);
    if (!set) return res.status(404).json({ error: 'Card set not found' });

    const cardId = genId();
    const maxOrder = queryOne<MaxOrderRow>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
      [setId]
    );

    const validCardType = card_type && ['standard', 'cloze', 'typing', 'reversible'].includes(card_type) ? card_type : 'standard';

    // Create card
    run(
      `INSERT INTO cards (id, card_set_id, sort_order, tags, card_type) VALUES (?, ?, ?, ?, ?)`,
      [cardId, setId, maxOrder!.next, JSON.stringify(tags || []), validCardType]
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
    syncCardFts(cardId);
    res.status(201).json(fullCard);
  } catch (err) {
    logger.error({ err }, 'Error creating card');
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// PUT /api/cards/:id — Update card metadata + sides + media blocks
router.put('/cards/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags, front, back, card_type } = req.body as {
      tags?: string[];
      front?: CardSideInput;
      back?: CardSideInput;
      card_type?: string;
    };

    const existing = queryOne<CardRow>('SELECT * FROM cards WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card not found' });

    // Update card metadata
    const updates: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }
    if (card_type !== undefined && ['standard', 'cloze', 'typing', 'reversible'].includes(card_type)) {
      updates.push('card_type = ?');
      params.push(card_type);
    }
    params.push(id);
    run(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`, params);

    // Update media blocks within a transaction to prevent partial writes
    const d = getDb();
    try {
      d.exec('BEGIN TRANSACTION');

      // Update front side media blocks
      if (front?.media_blocks) {
        const frontSide = queryOne<CardSideRow>('SELECT * FROM card_sides WHERE card_id = ? AND side = 0', [id]);
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
        const backSide = queryOne<CardSideRow>('SELECT * FROM card_sides WHERE card_id = ? AND side = 1', [id]);
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

      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    const fullCard = getFullCard(id);
    syncCardFts(id);
    res.json(fullCard);
  } catch (err) {
    logger.error({ err }, 'Error updating card');
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// DELETE /api/cards/:id — Delete card
router.delete('/cards/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne<CardRow>('SELECT * FROM cards WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card not found' });

    removeCardFts(id);
    run('DELETE FROM cards WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error deleting card');
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// PATCH /api/cards/:id/move — Move card to a different set
router.patch('/cards/:id/move', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { card_set_id } = req.body as { card_set_id: string };

    const card = queryOne<CardRow>('SELECT * FROM cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const targetSet = queryOne<{ id: string }>('SELECT id FROM card_sets WHERE id = ?', [card_set_id]);
    if (!targetSet) return res.status(404).json({ error: 'Target set not found' });

    const maxOrder = queryOne<MaxOrderRow>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
      [card_set_id]
    );

    run(
      'UPDATE cards SET card_set_id = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [card_set_id, maxOrder!.next, id]
    );

    const fullCard = getFullCard(id);
    res.json(fullCard);
  } catch (err) {
    logger.error({ err }, 'Error moving card');
    res.status(500).json({ error: 'Failed to move card' });
  }
});

// POST /api/cards/generate — AI-generate flashcards using Claude
router.post('/cards/generate', async (req: Request, res: Response) => {
  try {
    const { topic_id, card_set_id, count, style, prompt, autoCreate } = req.body as {
      topic_id?: string;
      card_set_id?: string;
      count?: number;
      style?: 'standard' | 'cloze';
      prompt?: string;
      autoCreate?: boolean;
    };

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const cardCount = Math.max(1, Math.min(20, count || 5));
    const cardStyle = style === 'cloze' ? 'cloze' : 'standard';

    const generated = await generateCards(prompt, cardCount, cardStyle);

    // If autoCreate and card_set_id provided, create the cards in the database
    if (autoCreate && card_set_id) {
      const set = queryOne<{ id: string }>('SELECT id FROM card_sets WHERE id = ?', [card_set_id]);
      if (!set) return res.status(404).json({ error: 'Card set not found' });

      const created = [];
      for (const card of generated) {
        const cardId = genId();
        const maxOrder = queryOne<MaxOrderRow>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
          [card_set_id]
        );

        run(
          `INSERT INTO cards (id, card_set_id, sort_order, tags, card_type) VALUES (?, ?, ?, ?, ?)`,
          [cardId, card_set_id, maxOrder!.next, '[]', cardStyle === 'cloze' ? 'cloze' : 'standard']
        );

        const frontId = genId();
        run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 0)`, [frontId, cardId]);
        const backId = genId();
        run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 1)`, [backId, cardId]);

        run(
          `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content) VALUES (?, ?, 'text', 0, ?)`,
          [genId(), frontId, card.front]
        );
        run(
          `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content) VALUES (?, ?, 'text', 0, ?)`,
          [genId(), backId, card.back]
        );

        syncCardFts(cardId);
        created.push(getFullCard(cardId));
      }

      return res.json({ cards: created, generated: generated.length, imported: created.length });
    }

    // Otherwise, return previews
    res.json({ cards: generated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Error generating cards with AI');
    res.status(500).json({ error: message });
  }
});

// POST /api/cards/extract — Extract cards from an uploaded PDF
router.post('/cards/extract', pdfUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const text = await extractFromPdf(req.file.buffer);
    if (!text.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from the PDF' });
    }

    const cards = splitIntoCards(text);
    res.json({ cards, extractedLength: text.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Error extracting cards from PDF');
    res.status(500).json({ error: message });
  }
});

export default router;
