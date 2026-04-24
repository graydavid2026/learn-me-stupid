import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, getDb, CardRow, CardSideRow, MediaBlockRow, MaxOrderRow } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import {
  processReview,
} from '../services/srEngine.js';
import logger from '../logger.js';
import { logAudit } from '../services/auditLog.js';

const router = Router();

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

interface MediaBlockInput {
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

interface BatchCardInput {
  card_set_id: string;
  tags?: string[];
  front?: CardSideInput;
  back?: CardSideInput;
  card_type?: string;
}

interface BatchReviewInput {
  card_id: string;
  result: 'correct' | 'wrong';
  response_time_ms?: number;
}

interface FullCardResult {
  id: string;
  front: { id: string | null; side: 0; media_blocks: MediaBlockRow[] };
  back: { id: string | null; side: 1; media_blocks: MediaBlockRow[] };
  [key: string]: unknown;
}

// Helper: get full card with sides and media blocks
function getFullCard(cardId: string): FullCardResult | null {
  const card = queryOne<CardRow>('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return null;

  const sides = queryAll<CardSideRow>('SELECT * FROM card_sides WHERE card_id = ? ORDER BY side', [cardId]);
  const frontSide = sides.find((s) => s.side === 0) || null;
  const backSide = sides.find((s) => s.side === 1) || null;

  const frontBlocks = frontSide
    ? queryAll<MediaBlockRow>('SELECT * FROM media_blocks WHERE card_side_id = ? ORDER BY sort_order', [frontSide.id])
    : [];
  const backBlocks = backSide
    ? queryAll<MediaBlockRow>('SELECT * FROM media_blocks WHERE card_side_id = ? ORDER BY sort_order', [backSide.id])
    : [];

  return {
    ...card,
    front: frontSide
      ? { id: frontSide.id, side: 0 as const, media_blocks: frontBlocks }
      : { id: null, side: 0 as const, media_blocks: [] },
    back: backSide
      ? { id: backSide.id, side: 1 as const, media_blocks: backBlocks }
      : { id: null, side: 1 as const, media_blocks: [] },
  };
}

interface ReviewResultItem {
  card_id: string;
  slotBefore?: number;
  slotAfter?: number;
  reviewType?: string;
  error?: string;
}

// POST /api/batch/reviews — Batch submit reviews in a single transaction
router.post('/reviews', (req: Request, res: Response) => {
  try {
    const { reviews } = req.body as { reviews?: BatchReviewInput[] };
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'reviews array is required and must not be empty' });
    }

    const d = getDb();
    const results: ReviewResultItem[] = [];

    try {
      d.exec('BEGIN TRANSACTION');

      for (const review of reviews) {
        const { card_id, result, response_time_ms: rawResponseTime } = review;

        if (!card_id || !['correct', 'wrong'].includes(result)) {
          results.push({ card_id, error: 'card_id and result (correct/wrong) required' });
          continue;
        }

        const response_time_ms = (() => {
          const n = Number(rawResponseTime);
          return Number.isFinite(n) && n >= 0 && n < 3600000 ? Math.floor(n) : null;
        })();

        const card = queryOne<CardRow>('SELECT * FROM cards WHERE id = ?', [card_id]);
        if (!card) {
          results.push({ card_id, error: 'Card not found' });
          continue;
        }

        const slotBefore = card.sr_slot;
        const reviewResult = processReview(
          result,
          card.sr_slot,
          card.sr_next_due_at,
          card.sr_ease_factor ?? 2.5,
          response_time_ms,
        );

        // Log the review
        run(
          `INSERT INTO review_log (id, card_id, result, slot_before, slot_after, next_due_at, review_type, response_time_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [genId(), card_id, result, slotBefore, reviewResult.newSlot, reviewResult.nextDueAt, reviewResult.reviewType, response_time_ms]
        );

        // Update card SR state
        if (reviewResult.scheduleLocked) {
          run(
            `UPDATE cards SET
              sr_total_reviews = sr_total_reviews + 1,
              sr_total_correct = sr_total_correct + ?,
              sr_last_reviewed_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?`,
            [result === 'correct' ? 1 : 0, card_id]
          );
        } else {
          run(
            `UPDATE cards SET
              sr_slot = ?,
              sr_next_due_at = ?,
              sr_grace_deadline = ?,
              sr_ease_factor = ?,
              sr_total_reviews = sr_total_reviews + 1,
              sr_total_correct = sr_total_correct + ?,
              sr_last_reviewed_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?`,
            [
              reviewResult.newSlot,
              reviewResult.nextDueAt,
              reviewResult.graceDeadline,
              reviewResult.easeAfter,
              result === 'correct' ? 1 : 0,
              card_id,
            ]
          );
        }

        results.push({
          card_id,
          slotBefore,
          slotAfter: reviewResult.newSlot,
          reviewType: reviewResult.reviewType,
        });
      }

      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    res.json({ results });
  } catch (err) {
    logger.error({ err }, 'Error batch reviewing');
    res.status(500).json({ error: 'Batch review failed' });
  }
});

// POST /api/batch/cards — Bulk create cards
router.post('/cards', (req: Request, res: Response) => {
  try {
    const { cards } = req.body as { cards?: BatchCardInput[] };
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'cards array is required and must not be empty' });
    }

    const d = getDb();
    const created: (FullCardResult | { error: string; card_set_id?: string })[] = [];

    try {
      d.exec('BEGIN TRANSACTION');

      for (const cardData of cards) {
        const { card_set_id, tags, front, back, card_type } = cardData;

        if (!card_set_id) {
          created.push({ error: 'card_set_id is required' });
          continue;
        }

        const set = queryOne<{ id: string }>('SELECT id FROM card_sets WHERE id = ?', [card_set_id]);
        if (!set) {
          created.push({ card_set_id, error: 'Card set not found' });
          continue;
        }

        const cardId = genId();
        const maxOrder = queryOne<MaxOrderRow>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM cards WHERE card_set_id = ?',
          [card_set_id]
        );

        const validCardType = card_type && ['standard', 'cloze', 'typing'].includes(card_type) ? card_type : 'standard';

        run(
          `INSERT INTO cards (id, card_set_id, sort_order, tags, card_type) VALUES (?, ?, ?, ?, ?)`,
          [cardId, card_set_id, maxOrder!.next, JSON.stringify(tags || []), validCardType]
        );

        // Create front side
        const frontId = genId();
        run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 0)`, [frontId, cardId]);

        // Create back side
        const backId = genId();
        run(`INSERT INTO card_sides (id, card_id, side) VALUES (?, ?, 1)`, [backId, cardId]);

        // Insert media blocks for front
        if (front?.media_blocks) {
          for (let i = 0; i < front.media_blocks.length; i++) {
            const block = front.media_blocks[i];
            run(
              `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [genId(), frontId, block.block_type, i, block.text_content || null, block.file_path || null, block.file_name || null, block.file_size || null, block.mime_type || null, block.youtube_url || null, block.youtube_embed_id || null]
            );
          }
        }

        // Insert media blocks for back
        if (back?.media_blocks) {
          for (let i = 0; i < back.media_blocks.length; i++) {
            const block = back.media_blocks[i];
            run(
              `INSERT INTO media_blocks (id, card_side_id, block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [genId(), backId, block.block_type, i, block.text_content || null, block.file_path || null, block.file_name || null, block.file_size || null, block.mime_type || null, block.youtube_url || null, block.youtube_embed_id || null]
            );
          }
        }

        const fullCard = getFullCard(cardId);
        if (fullCard) created.push(fullCard);
      }

      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    res.status(201).json({ cards: created });
  } catch (err) {
    logger.error({ err }, 'Error batch creating cards');
    res.status(500).json({ error: 'Batch card creation failed' });
  }
});

// DELETE /api/batch/cards — Bulk delete cards
router.delete('/cards', (req: Request, res: Response) => {
  try {
    const { card_ids } = req.body as { card_ids?: string[] };
    if (!Array.isArray(card_ids) || card_ids.length === 0) {
      return res.status(400).json({ error: 'card_ids array is required and must not be empty' });
    }

    const d = getDb();
    let deleted = 0;
    const notFound: string[] = [];

    try {
      d.exec('BEGIN TRANSACTION');

      for (const id of card_ids) {
        const existing = queryOne<{ id: string }>('SELECT id FROM cards WHERE id = ?', [id]);
        if (!existing) {
          notFound.push(id);
          continue;
        }
        run('DELETE FROM cards WHERE id = ?', [id]);
        deleted++;
      }

      d.exec('COMMIT');
    } catch (txErr) {
      d.exec('ROLLBACK');
      throw txErr;
    }

    if (deleted > 0) {
      logAudit({
        action: 'bulk_delete',
        entity_type: 'batch_cards',
        cards_affected: deleted,
        metadata: { requested: card_ids.length, not_found: notFound.length },
        req,
      });
    }

    res.json({ deleted, notFound });
  } catch (err) {
    logger.error({ err }, 'Error batch deleting cards');
    res.status(500).json({ error: 'Batch card deletion failed' });
  }
});

export default router;
