import { Router } from 'express';
import { queryAll, queryOne } from '../db/index.js';

const router = Router();

/** Extract text content from a card side's media blocks, joined with newline. */
function sideText(cardId: string, side: 0 | 1): string {
  const sideRow: any = queryOne(
    'SELECT id FROM card_sides WHERE card_id = ? AND side = ?',
    [cardId, side]
  );
  if (!sideRow) return '';
  const blocks: any[] = queryAll(
    `SELECT text_content FROM media_blocks
     WHERE card_side_id = ? AND block_type = 'text'
     ORDER BY sort_order`,
    [sideRow.id]
  );
  return blocks
    .map((b) => b.text_content || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

/** Get all media blocks for a card side, preserving full block data. */
function sideBlocks(cardSideId: string): any[] {
  return queryAll(
    `SELECT block_type, sort_order, text_content, file_path, file_name, file_size, mime_type, youtube_url, youtube_embed_id
     FROM media_blocks WHERE card_side_id = ? ORDER BY sort_order`,
    [cardSideId]
  );
}

/** Escape a value for CSV: wrap in quotes if it contains comma, quote, or newline. */
function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

// GET /api/export/csv
router.get('/csv', (_req, res) => {
  try {
    const rows = queryAll(
      `SELECT c.id, c.sr_slot, c.sr_total_reviews, c.sr_total_correct,
              c.sr_last_reviewed_at, c.sr_next_due_at, c.created_at,
              cs.name as set_name, t.name as topic_name
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       JOIN topics t ON t.id = cs.topic_id
       ORDER BY t.name, cs.name, c.sort_order`
    );

    const header = [
      'topic_name', 'set_name', 'front_text', 'back_text',
      'sr_slot', 'sr_total_reviews', 'sr_total_correct',
      'sr_last_reviewed_at', 'sr_next_due_at', 'created_at',
    ].join(',');

    const lines = rows.map((r: any) => {
      const front = sideText(r.id, 0);
      const back = sideText(r.id, 1);
      return [
        csvEscape(r.topic_name || ''),
        csvEscape(r.set_name || ''),
        csvEscape(front),
        csvEscape(back),
        String(r.sr_slot ?? 0),
        String(r.sr_total_reviews ?? 0),
        String(r.sr_total_correct ?? 0),
        csvEscape(r.sr_last_reviewed_at || ''),
        csvEscape(r.sr_next_due_at || ''),
        csvEscape(r.created_at || ''),
      ].join(',');
    });

    const csv = [header, ...lines].join('\n');
    const today = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="learn-me-stupid-export-${today}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/export/json
router.get('/json', (_req, res) => {
  try {
    const topics = queryAll('SELECT * FROM topics ORDER BY sort_order, created_at');

    const result = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      topics: topics.map((t: any) => {
        const sets = queryAll(
          'SELECT * FROM card_sets WHERE topic_id = ? ORDER BY sort_order, created_at',
          [t.id]
        );
        return {
          name: t.name,
          description: t.description || null,
          color: t.color,
          icon: t.icon,
          sets: sets.map((s: any) => {
            const cards = queryAll(
              'SELECT * FROM cards WHERE card_set_id = ? ORDER BY sort_order',
              [s.id]
            );
            return {
              name: s.name,
              description: s.description || null,
              cards: cards.map((c: any) => {
                const sides = queryAll(
                  'SELECT * FROM card_sides WHERE card_id = ? ORDER BY side',
                  [c.id]
                );
                const frontSide = sides.find((sd: any) => sd.side === 0);
                const backSide = sides.find((sd: any) => sd.side === 1);
                return {
                  front: frontSide ? sideBlocks(frontSide.id) : [],
                  back: backSide ? sideBlocks(backSide.id) : [],
                  sr: {
                    slot: c.sr_slot,
                    total_reviews: c.sr_total_reviews,
                    total_correct: c.sr_total_correct,
                    last_reviewed_at: c.sr_last_reviewed_at || null,
                    next_due_at: c.sr_next_due_at || null,
                    is_active: c.sr_is_active,
                  },
                  tags: JSON.parse(c.tags || '[]'),
                  created_at: c.created_at,
                };
              }),
            };
          }),
        };
      }),
    };

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="learn-me-stupid-backup-${today}.json"`);
    res.json(result);
  } catch (err) {
    console.error('Error exporting JSON:', err);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// GET /api/export/stats
router.get('/stats', (_req, res) => {
  try {
    const totalCards = queryOne('SELECT COUNT(*) as count FROM cards')?.count || 0;

    const totalReviews = queryOne(
      'SELECT COUNT(*) as count FROM review_log'
    )?.count || 0;

    const totalCorrect = queryOne(
      "SELECT COUNT(*) as count FROM review_log WHERE result = 'correct'"
    )?.count || 0;

    // Accuracy by topic
    const accuracyByTopic = queryAll(
      `SELECT t.name as topic_name,
              COUNT(rl.id) as reviews,
              SUM(CASE WHEN rl.result = 'correct' THEN 1 ELSE 0 END) as correct
       FROM review_log rl
       JOIN cards c ON c.id = rl.card_id
       JOIN card_sets cs ON cs.id = c.card_set_id
       JOIN topics t ON t.id = cs.topic_id
       GROUP BY t.id
       ORDER BY t.name`
    ).map((r: any) => ({
      topic: r.topic_name,
      reviews: r.reviews,
      correct: r.correct,
      accuracy: r.reviews > 0 ? Math.round((r.correct / r.reviews) * 100) : 0,
    }));

    // Slot distribution
    const slotDistribution = queryAll(
      `SELECT sr_slot as slot, COUNT(*) as count
       FROM cards WHERE sr_is_active = 1
       GROUP BY sr_slot ORDER BY sr_slot`
    );

    // Streak
    const recentDays = queryAll(
      'SELECT DISTINCT date(reviewed_at) as day FROM review_log ORDER BY day DESC LIMIT 60'
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < recentDays.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().slice(0, 10);
      if (recentDays[i]?.day === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      totalCards,
      totalReviews,
      totalCorrect,
      overallAccuracy: totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0,
      accuracyByTopic,
      slotDistribution,
      streak,
    });
  } catch (err) {
    console.error('Error fetching export stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
