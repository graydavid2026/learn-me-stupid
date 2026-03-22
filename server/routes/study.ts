import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import { processReview, calculateDecayedTier, TIER_LABELS } from '../services/srEngine.js';

const router = Router();

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

// Helper: get full card with sides and media blocks (same as cards route)
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

// GET /api/study/due — Get all due cards (with filters)
router.get('/due', (req, res) => {
  try {
    const { topic, set, tags, tierMin, tierMax } = req.query;

    let sql = `
      SELECT c.* FROM cards c
      JOIN card_sets cs ON cs.id = c.card_set_id
      WHERE c.sr_is_active = 1
        AND (c.sr_next_due_at IS NULL OR c.sr_next_due_at <= datetime('now'))
    `;
    const params: any[] = [];

    if (topic) {
      sql += ' AND cs.topic_id = ?';
      params.push(topic);
    }
    if (set) {
      sql += ' AND c.card_set_id = ?';
      params.push(set);
    }
    if (tierMin !== undefined) {
      sql += ' AND c.sr_tier >= ?';
      params.push(Number(tierMin));
    }
    if (tierMax !== undefined) {
      sql += ' AND c.sr_tier <= ?';
      params.push(Number(tierMax));
    }

    sql += ' ORDER BY c.sr_tier ASC, c.sr_next_due_at ASC';

    const cards = queryAll(sql, params);
    let fullCards = cards.map((c: any) => getFullCard(c.id)).filter(Boolean);

    // Filter by tags if specified
    if (tags) {
      const tagList = (tags as string).split(',').map((t) => t.trim().toLowerCase());
      fullCards = fullCards.filter((c: any) => {
        const cardTags: string[] = JSON.parse(c.tags || '[]').map((t: string) => t.toLowerCase());
        return tagList.some((t) => cardTags.includes(t));
      });
    }

    res.json(fullCards);
  } catch (err) {
    console.error('Error fetching due cards:', err);
    res.status(500).json({ error: 'Failed to fetch due cards' });
  }
});

// GET /api/study/pipeline — Get upcoming cards not yet due
router.get('/pipeline', (req, res) => {
  try {
    const { topic, set, limit } = req.query;

    let sql = `
      SELECT c.* FROM cards c
      JOIN card_sets cs ON cs.id = c.card_set_id
      WHERE c.sr_is_active = 1
        AND c.sr_next_due_at > datetime('now')
    `;
    const params: any[] = [];

    if (topic) {
      sql += ' AND cs.topic_id = ?';
      params.push(topic);
    }
    if (set) {
      sql += ' AND c.card_set_id = ?';
      params.push(set);
    }

    sql += ' ORDER BY c.sr_next_due_at ASC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(Number(limit));
    }

    const cards = queryAll(sql, params);
    const fullCards = cards.map((c: any) => getFullCard(c.id)).filter(Boolean);
    res.json(fullCards);
  } catch (err) {
    console.error('Error fetching pipeline:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// GET /api/study/stats — Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const { topic } = req.query;

    let whereClause = 'WHERE c.sr_is_active = 1';
    const params: any[] = [];
    if (topic) {
      whereClause += ' AND cs.topic_id = ?';
      params.push(topic);
    }

    // Total cards
    const total = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause}`,
      params
    );

    // Due today
    const dueToday = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND (c.sr_next_due_at IS NULL OR c.sr_next_due_at <= datetime('now'))`,
      params
    );

    // Overdue (due date more than 1 day in the past)
    const overdue = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_next_due_at <= datetime('now', '-1 day')`,
      params
    );

    // Tier distribution
    const tierDist = queryAll(
      `SELECT c.sr_tier as tier, COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} GROUP BY c.sr_tier ORDER BY c.sr_tier`,
      params
    );

    // Mastered (tier 7-8)
    const mastered = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_tier >= 7`,
      params
    );

    // New (tier 0)
    const newCards = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_tier = 0`,
      params
    );

    // Reviews today
    const reviewsToday = queryOne(
      `SELECT COUNT(*) as count, SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct FROM review_log WHERE reviewed_at >= date('now')`,
      []
    );

    // Streak (consecutive days with reviews)
    const recentDays = queryAll(
      `SELECT DISTINCT date(reviewed_at) as day FROM review_log ORDER BY day DESC LIMIT 60`,
      []
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
      total: total?.count || 0,
      dueToday: dueToday?.count || 0,
      overdue: overdue?.count || 0,
      mastered: mastered?.count || 0,
      newCards: newCards?.count || 0,
      reviewsToday: reviewsToday?.count || 0,
      correctToday: reviewsToday?.correct || 0,
      streak,
      tierDistribution: tierDist,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/study/history — Daily review counts for charts
router.get('/history', (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const rows = queryAll(
      `SELECT date(reviewed_at) as day,
              COUNT(*) as total,
              SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct
       FROM review_log
       WHERE reviewed_at >= date('now', '-' || ? || ' days')
       GROUP BY date(reviewed_at)
       ORDER BY day`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
});

// GET /api/study/timeline — Spaced repetition timeline (upcoming due cards per day)
router.get('/timeline', (req, res) => {
  try {
    const { topic, days: daysParam } = req.query;
    const days = Math.min(Math.max(Number(daysParam) || 14, 1), 60);

    let topicJoin = '';
    const params: any[] = [];
    if (topic) {
      topicJoin = ' JOIN card_sets cs ON cs.id = c.card_set_id';
    }
    let topicWhere = '';
    if (topic) {
      topicWhere = ' AND cs.topic_id = ?';
      params.push(topic);
    }

    const result: { day: string; due: number; overdue: number; label: string }[] = [];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < days; i++) {
      // Build date strings for the day range
      const offsetStr = i === 0 ? '' : `'+${i} days'`;
      const dayStart = i === 0 ? "date('now')" : `date('now', '+${i} days')`;
      const dayEnd = i === 0 ? "date('now', '+1 day')" : `date('now', '+${i + 1} days')`;

      let due = 0;
      let overdue = 0;

      if (i === 0) {
        // Today: due = cards with sr_next_due_at <= now, overdue = cards due more than 1 day ago
        const dueRow = queryOne(
          `SELECT COUNT(*) as count FROM cards c${topicJoin}
           WHERE c.sr_is_active = 1${topicWhere}
             AND (c.sr_next_due_at IS NULL OR c.sr_next_due_at <= datetime('now'))`,
          topic ? [topic] : []
        );
        const overdueRow = queryOne(
          `SELECT COUNT(*) as count FROM cards c${topicJoin}
           WHERE c.sr_is_active = 1${topicWhere}
             AND c.sr_next_due_at <= datetime('now', '-1 day')`,
          topic ? [topic] : []
        );
        due = dueRow?.count || 0;
        overdue = overdueRow?.count || 0;
      } else {
        // Future day: count cards where sr_next_due_at falls within that day
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards c${topicJoin}
           WHERE c.sr_is_active = 1${topicWhere}
             AND c.sr_next_due_at >= ${dayStart}
             AND c.sr_next_due_at < ${dayEnd}`,
          topic ? [topic] : []
        );
        due = row?.count || 0;
        overdue = 0;
      }

      // Compute the actual date for labels
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isoDay = d.toISOString().slice(0, 10);
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()];

      result.push({ day: isoDay, due, overdue, label });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching timeline:', err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// POST /api/study/review — Submit a review
router.post('/review', (req, res) => {
  try {
    const { cardId, result, response_time_ms } = req.body;

    if (!cardId || !['correct', 'wrong'].includes(result)) {
      return res.status(400).json({ error: 'cardId and result (correct/wrong) required' });
    }

    const card = queryOne('SELECT * FROM cards WHERE id = ?', [cardId]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const tierBefore = card.sr_tier;

    const reviewResult = processReview(
      result,
      card.sr_tier,
      card.sr_consecutive_correct,
      card.sr_consecutive_wrong,
      card.sr_last_reviewed_at,
      card.sr_next_due_at
    );

    // Always log the review
    run(
      `INSERT INTO review_log (id, card_id, result, tier_before, tier_after, response_time_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [genId(), cardId, result, tierBefore, reviewResult.newTier, response_time_ms || null]
    );

    // Update card SR state
    if (reviewResult.scheduleLocked) {
      // Already reviewed today — update counters and tier but NOT schedule
      run(
        `UPDATE cards SET
          sr_tier = ?,
          sr_consecutive_correct = ?,
          sr_consecutive_wrong = ?,
          sr_total_reviews = sr_total_reviews + 1,
          sr_total_correct = sr_total_correct + ?,
          sr_last_reviewed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          reviewResult.newTier,
          reviewResult.consecutiveCorrect,
          reviewResult.consecutiveWrong,
          result === 'correct' ? 1 : 0,
          cardId,
        ]
      );
    } else {
      // First review of the day — set full schedule
      run(
        `UPDATE cards SET
          sr_tier = ?,
          sr_next_due_at = ?,
          sr_consecutive_correct = ?,
          sr_consecutive_wrong = ?,
          sr_total_reviews = sr_total_reviews + 1,
          sr_total_correct = sr_total_correct + ?,
          sr_last_reviewed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          reviewResult.newTier,
          reviewResult.nextDueAt,
          reviewResult.consecutiveCorrect,
          reviewResult.consecutiveWrong,
          result === 'correct' ? 1 : 0,
          cardId,
        ]
      );
    }

    const updatedCard = getFullCard(cardId);
    res.json({
      card: updatedCard,
      tierBefore,
      tierAfter: reviewResult.newTier,
      scheduleLocked: reviewResult.scheduleLocked,
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// POST /api/study/decay-check — Run decay on all active cards
router.post('/decay-check', (_req, res) => {
  try {
    const cards = queryAll(
      'SELECT id, sr_tier, sr_next_due_at FROM cards WHERE sr_is_active = 1 AND sr_next_due_at IS NOT NULL',
      []
    );

    let decayed = 0;
    for (const card of cards) {
      const newTier = calculateDecayedTier(card.sr_tier, card.sr_next_due_at);
      if (newTier !== card.sr_tier) {
        run(
          'UPDATE cards SET sr_tier = ?, sr_consecutive_correct = 0, updated_at = datetime(\'now\') WHERE id = ?',
          [newTier, card.id]
        );
        decayed++;
      }
    }

    res.json({ checked: cards.length, decayed });
  } catch (err) {
    console.error('Error running decay check:', err);
    res.status(500).json({ error: 'Failed to run decay check' });
  }
});

// GET /api/study/calendar — Per-day card counts by topic for calendar view
router.get('/calendar', (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 60, 120);

    // Due cards per day per topic (next N days)
    const upcoming: any[] = [];
    for (let i = 0; i < days; i++) {
      const dayStart = i === 0 ? "datetime('now')" : `datetime('now', '+${i} days', 'start of day')`;
      const dayEnd = `datetime('now', '+${i + 1} days', 'start of day')`;

      let sql: string;
      if (i === 0) {
        sql = `SELECT t.id as topic_id, t.name as topic_name, t.color as topic_color, COUNT(*) as count
               FROM cards c
               JOIN card_sets cs ON cs.id = c.card_set_id
               JOIN topics t ON t.id = cs.topic_id
               WHERE c.sr_is_active = 1
                 AND (c.sr_next_due_at IS NULL OR c.sr_next_due_at <= datetime('now'))
               GROUP BY t.id`;
      } else {
        sql = `SELECT t.id as topic_id, t.name as topic_name, t.color as topic_color, COUNT(*) as count
               FROM cards c
               JOIN card_sets cs ON cs.id = c.card_set_id
               JOIN topics t ON t.id = cs.topic_id
               WHERE c.sr_is_active = 1
                 AND c.sr_next_due_at >= ${dayStart}
                 AND c.sr_next_due_at < ${dayEnd}
               GROUP BY t.id`;
      }

      const rows = queryAll(sql, []);
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isoDay = d.toISOString().slice(0, 10);

      for (const row of rows) {
        upcoming.push({
          day: isoDay,
          dayOffset: i,
          topicId: row.topic_id,
          topicName: row.topic_name,
          topicColor: row.topic_color,
          count: row.count,
        });
      }
    }

    // Review history per day per topic (last 60 days)
    const history = queryAll(
      `SELECT date(rl.reviewed_at) as day, t.id as topic_id, t.name as topic_name, t.color as topic_color,
              COUNT(*) as total,
              SUM(CASE WHEN rl.result = 'correct' THEN 1 ELSE 0 END) as correct
       FROM review_log rl
       JOIN cards c ON c.id = rl.card_id
       JOIN card_sets cs ON cs.id = c.card_set_id
       JOIN topics t ON t.id = cs.topic_id
       WHERE rl.reviewed_at >= date('now', '-60 days')
       GROUP BY date(rl.reviewed_at), t.id
       ORDER BY day`,
      []
    );

    res.json({ upcoming, history });
  } catch (err) {
    console.error('Error fetching calendar:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// GET /api/study/forecast — Workload prediction across all topics
router.get('/forecast', (_req, res) => {
  try {
    // Per-topic summary
    const topicSummaries = queryAll(
      `SELECT t.id, t.name, t.color,
              COUNT(c.id) as total_cards,
              SUM(CASE WHEN c.sr_is_active = 1 AND (c.sr_next_due_at IS NULL OR c.sr_next_due_at <= datetime('now')) THEN 1 ELSE 0 END) as due_now,
              SUM(CASE WHEN c.sr_tier >= 7 THEN 1 ELSE 0 END) as mastered,
              SUM(CASE WHEN c.sr_tier = 0 THEN 1 ELSE 0 END) as new_cards,
              AVG(c.sr_tier) as avg_tier,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_next_due_at <= datetime('now', '-1 day') THEN 1 ELSE 0 END) as overdue
       FROM topics t
       LEFT JOIN card_sets cs ON cs.topic_id = t.id
       LEFT JOIN cards c ON c.card_set_id = cs.id
       GROUP BY t.id
       ORDER BY due_now DESC`,
      []
    );

    // Week forecast (next 7 days)
    const weekForecast = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = i === 0 ? "datetime('now')" : `datetime('now', '+${i} days', 'start of day')`;
      const dayEnd = `datetime('now', '+${i + 1} days', 'start of day')`;

      let count: number;
      if (i === 0) {
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards WHERE sr_is_active = 1 AND (sr_next_due_at IS NULL OR sr_next_due_at <= datetime('now'))`,
          []
        );
        count = row?.count || 0;
      } else {
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards WHERE sr_is_active = 1 AND sr_next_due_at >= ${dayStart} AND sr_next_due_at < ${dayEnd}`,
          []
        );
        count = row?.count || 0;
      }

      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weekForecast.push({
        day: d.toISOString().slice(0, 10),
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()],
        count,
      });
    }

    res.json({ topics: topicSummaries, weekForecast });
  } catch (err) {
    console.error('Error fetching forecast:', err);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// GET /api/study/topic-sr/:topicId — Detailed SR overview for one topic
router.get('/topic-sr/:topicId', (req, res) => {
  try {
    const { topicId } = req.params;

    // Tier distribution
    const tierDist = queryAll(
      `SELECT c.sr_tier as tier, COUNT(*) as count
       FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ? AND c.sr_is_active = 1
       GROUP BY c.sr_tier ORDER BY c.sr_tier`,
      [topicId]
    );

    // Per-set breakdown
    const sets = queryAll(
      `SELECT cs.id, cs.name,
              COUNT(c.id) as total,
              SUM(CASE WHEN c.sr_next_due_at IS NULL OR c.sr_next_due_at <= datetime('now') THEN 1 ELSE 0 END) as due,
              SUM(CASE WHEN c.sr_tier >= 7 THEN 1 ELSE 0 END) as mastered,
              AVG(c.sr_tier) as avg_tier
       FROM card_sets cs
       LEFT JOIN cards c ON c.card_set_id = cs.id AND c.sr_is_active = 1
       WHERE cs.topic_id = ?
       GROUP BY cs.id`,
      [topicId]
    );

    // Cards with their SR state (for timeline visualization)
    const cards = queryAll(
      `SELECT c.id, c.sr_tier, c.sr_next_due_at, c.sr_last_reviewed_at, c.sr_total_reviews, c.sr_total_correct, cs.name as set_name,
              (SELECT mb.text_content FROM card_sides s JOIN media_blocks mb ON mb.card_side_id = s.id WHERE s.card_id = c.id AND s.side = 0 AND mb.block_type = 'text' LIMIT 1) as preview
       FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ? AND c.sr_is_active = 1
       ORDER BY c.sr_next_due_at ASC NULLS FIRST`,
      [topicId]
    );

    // Recent accuracy for this topic
    const accuracy = queryAll(
      `SELECT date(rl.reviewed_at) as day,
              COUNT(*) as total,
              SUM(CASE WHEN rl.result = 'correct' THEN 1 ELSE 0 END) as correct
       FROM review_log rl
       JOIN cards c ON c.id = rl.card_id
       JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ? AND rl.reviewed_at >= date('now', '-30 days')
       GROUP BY date(rl.reviewed_at)
       ORDER BY day`,
      [topicId]
    );

    // Topic info
    const topic = queryOne('SELECT * FROM topics WHERE id = ?', [topicId]);

    res.json({ topic, tierDistribution: tierDist, sets, cards, accuracy });
  } catch (err) {
    console.error('Error fetching topic SR:', err);
    res.status(500).json({ error: 'Failed to fetch topic SR data' });
  }
});

export default router;
