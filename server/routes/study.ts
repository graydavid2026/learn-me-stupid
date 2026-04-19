import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import {
  processReview,
  calculateCascadeRegression,
  calculateNextDue,
  calculateGraceDeadline,
  SLOT_LABELS,
  SLOT_TRANCHE,
  TRANCHE_NAMES,
  MAX_SLOT,
  MIN_SLOT,
  LEARNING_SLOT,
  GRADUATION_SLOT,
} from '../services/srEngine.js';
import { getSettingNum } from './settings.js';

const router = Router();

function safeInt(val: unknown, fallback: number, min = 0, max = 1000): number {
  const n = Number(val);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}

function genId(): string {
  return uuid().replace(/-/g, '').slice(0, 16);
}

const INDIANA_TZ = 'America/Indiana/Indianapolis';

// Start-of-day cutoff in Indiana timezone as a SQLite-friendly UTC datetime
// string. New-card budget resets at midnight Indiana time, not on a rolling
// 12-hour window, so the daily cap is consistent regardless of study time.
function indianaDayCutoffUtc(): string {
  // Get today's date string in Indiana timezone (YYYY-MM-DD)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: INDIANA_TZ });
  // Build a Date representing midnight Indiana time on that date,
  // then convert back to a real UTC timestamp.
  const midnightIndiana = new Date(`${todayStr}T00:00:00`);
  // Get the offset: difference between UTC and Indiana "wall clock"
  const utcNow = new Date();
  const indianaWall = new Date(utcNow.toLocaleString('en-US', { timeZone: INDIANA_TZ }));
  const offsetMs = utcNow.getTime() - indianaWall.getTime();
  const cutoffUtc = new Date(midnightIndiana.getTime() + offsetMs);
  return cutoffUtc.toISOString().replace('T', ' ').slice(0, 19);
}

// How many slot-0 cards have been promoted past slot 0 in the last 12 hours.
// Wrong answers on a New card don't count — the card never advanced.
// Pass a topicId to scope the count to a single topic; the new-card
// budget is per-topic, not global, so studying English doesn't starve
// Russian (or any other topic).
function newCardsLearnedToday(topicId?: string): number {
  const cutoff = indianaDayCutoffUtc();
  if (topicId) {
    const row = queryOne(
      `SELECT COUNT(*) as count FROM review_log rl
         JOIN cards c ON c.id = rl.card_id
         JOIN card_sets cs ON cs.id = c.card_set_id
        WHERE rl.reviewed_at >= ?
          AND rl.slot_before = 0
          AND rl.slot_after > 0
          AND cs.topic_id = ?`,
      [cutoff, topicId]
    );
    return row?.count || 0;
  }
  const row = queryOne(
    `SELECT COUNT(*) as count FROM review_log
     WHERE reviewed_at >= ?
       AND slot_before = 0
       AND slot_after > 0`,
    [cutoff]
  );
  return row?.count || 0;
}

// Helper: get full card with sides and media blocks.
// When `reverse` is true, front and back are swapped (for reversible cards).
function getFullCard(cardId: string, reverse = false) {
  const card = queryOne('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return null;

  const sides = queryAll('SELECT * FROM card_sides WHERE card_id = ? ORDER BY side', [cardId]);
  let front = sides.find((s: any) => s.side === 0) || null;
  let back = sides.find((s: any) => s.side === 1) || null;

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

  const frontSide = front || { id: null, side: 0, media_blocks: [] };
  const backSide = back || { id: null, side: 1, media_blocks: [] };

  return {
    ...card,
    front: reverse ? backSide : frontSide,
    back: reverse ? frontSide : backSide,
    reverse,
  };
}

// Helper: expand reversible cards — for each reversible card, include both
// the normal version and a reversed version (back→front) in the study queue.
function expandReversible(cards: any[]): any[] {
  const result: any[] = [];
  for (const card of cards) {
    if (!card) continue;
    result.push(card);
    if (card.card_type === 'reversible') {
      const reversed = getFullCard(card.id, true);
      if (reversed) result.push(reversed);
    }
  }
  return result;
}

/**
 * Intelligent interleaving: reorder cards so that:
 * 1. Cards from the same card_set are spaced apart
 * 2. Consecutive cards don't have the same difficulty (sr_slot)
 * 3. Overdue cards (lower slots, earlier due dates) still come first overall
 *
 * Algorithm: sort by priority (overdue first), then round-robin by set_id,
 * alternating difficulty bands within each round.
 */
function interleaveCards(cards: any[]): any[] {
  if (cards.length <= 2) return cards;

  // Group cards by card_set_id
  const bySet = new Map<string, any[]>();
  for (const card of cards) {
    const setId = card.card_set_id || '__none__';
    if (!bySet.has(setId)) bySet.set(setId, []);
    bySet.get(setId)!.push(card);
  }

  // Within each set, sort by priority: lower slot first, then earlier due date
  for (const group of bySet.values()) {
    group.sort((a: any, b: any) => {
      if (a.sr_slot !== b.sr_slot) return a.sr_slot - b.sr_slot;
      const aDue = a.sr_next_due_at ? new Date(a.sr_next_due_at).getTime() : 0;
      const bDue = b.sr_next_due_at ? new Date(b.sr_next_due_at).getTime() : 0;
      return aDue - bDue;
    });
  }

  // Round-robin across sets, picking one card from each set per round
  const result: any[] = [];
  const setKeys = Array.from(bySet.keys());
  // Sort sets so the set with the most urgent card goes first
  setKeys.sort((a, b) => {
    const aFirst = bySet.get(a)![0];
    const bFirst = bySet.get(b)![0];
    if (aFirst.sr_slot !== bFirst.sr_slot) return aFirst.sr_slot - bFirst.sr_slot;
    const aDue = aFirst.sr_next_due_at ? new Date(aFirst.sr_next_due_at).getTime() : 0;
    const bDue = bFirst.sr_next_due_at ? new Date(bFirst.sr_next_due_at).getTime() : 0;
    return aDue - bDue;
  });

  let exhausted = 0;
  const indices = new Map<string, number>(setKeys.map(k => [k, 0]));

  while (exhausted < setKeys.length) {
    for (const setId of setKeys) {
      const idx = indices.get(setId)!;
      const group = bySet.get(setId)!;
      if (idx >= group.length) continue;

      // Pick next card from this set, but try to avoid same difficulty as last card
      let pick = idx;
      if (result.length > 0) {
        const lastSlot = result[result.length - 1].sr_slot;
        // Look ahead up to 3 cards in this set for a different difficulty
        for (let lookahead = 0; lookahead < Math.min(3, group.length - idx); lookahead++) {
          if (group[idx + lookahead].sr_slot !== lastSlot) {
            pick = idx + lookahead;
            break;
          }
        }
        // If we picked a non-adjacent card, swap it into position
        if (pick !== idx) {
          const tmp = group[pick];
          group[pick] = group[idx];
          group[idx] = tmp;
        }
      }

      result.push(group[idx]);
      indices.set(setId, idx + 1);
      if (idx + 1 >= group.length) exhausted++;
    }
  }

  return result;
}

/**
 * Compute a retention-based interval multiplier.
 * Looks at review_log for the slot range the card is moving into.
 * If retention is below the target, returns 0.9 to compress intervals.
 * Otherwise returns undefined (no adjustment).
 */
function getRetentionMultiplier(slotRangeMin: number, slotRangeMax: number): number | undefined {
  const retentionTarget = getSettingNum('retention_target', 85);

  const row = queryOne(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct
     FROM review_log
     WHERE review_type = 'standard'
       AND slot_before >= ? AND slot_before <= ?
       AND reviewed_at >= date('now', '-30 days')`,
    [slotRangeMin, slotRangeMax]
  );

  if (!row || row.total < 10) return undefined; // Not enough data
  const retention = (row.correct / row.total) * 100;
  if (retention < retentionTarget) return 0.9;
  return undefined;
}

// GET /api/study/due — Get due cards (with filters)
// ?mode=review  — only cards with slot > 0 that are past due (previously studied)
// ?mode=new     — only slot 0 cards (never studied), limited batch
// ?mode=mixed   — review-due first, then new cards up to limit (default)
// (no mode)     — legacy: all due cards (review + new)
router.get('/due', (req, res) => {
  try {
    // Auto-graduate slot-1 (learning) cards whose session has ended.
    // Slot 1 is an in-session re-test; if the grace deadline has passed
    // (user didn't come back within the session), promote to slot 3
    // (post-learning bridge).
    const staleLearnCards = queryAll(
      `SELECT id FROM cards
       WHERE sr_is_active = 1 AND sr_slot = ?
         AND sr_grace_deadline IS NOT NULL
         AND datetime(sr_grace_deadline) < datetime('now')`,
      [LEARNING_SLOT]
    );
    if (staleLearnCards.length > 0) {
      for (const lc of staleLearnCards) {
        const nextDue = calculateNextDue(GRADUATION_SLOT);
        const grace = calculateGraceDeadline(nextDue, GRADUATION_SLOT);
        run(
          `UPDATE cards SET sr_slot = ?, sr_next_due_at = ?, sr_grace_deadline = ?, updated_at = datetime('now') WHERE id = ?`,
          [GRADUATION_SLOT, nextDue, grace, lc.id]
        );
      }
    }

    const { topic, set, tags, slotMin, slotMax, mode, limit, order, ids, dailyNewLimit, globalNewLimit, sessionSize } = req.query;
    const requestedNewLimit = safeInt(limit, 10, 1, 1000);

    // Use settings as defaults when query params aren't provided
    const settingsDailyLimit = getSettingNum('daily_new_limit', 8);
    const settingsPerTopicLimit = getSettingNum('cards_per_topic_limit', 2);

    const dailyCap = dailyNewLimit !== undefined
      ? safeInt(dailyNewLimit, 0, 0, 1000)
      : settingsPerTopicLimit;
    // Hard ceiling across ALL topics combined (e.g. 8/day). Per-topic cap
    // (dailyCap) still applies within this global ceiling.
    const globalCap = globalNewLimit !== undefined
      ? safeInt(globalNewLimit, 0, 0, 1000)
      : settingsDailyLimit;

    // ids=a,b,c — fetch specific cards by id regardless of SR state.
    // Used by "Study Again" to re-drill cards just answered wrong. Wrong
    // answers on new cards now stay at slot 0, so this id-fetch is what
    // surfaces them again within the same session.
    if (ids && typeof ids === 'string') {
      const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
      if (idList.length === 0) return res.json([]);
      const placeholders = idList.map(() => '?').join(',');
      const rows = queryAll(
        `SELECT * FROM cards WHERE id IN (${placeholders})`,
        idList
      );
      const byId = new Map(rows.map((r: any) => [r.id, r]));
      const ordered = idList.map((id) => byId.get(id)).filter(Boolean);
      return res.json(expandReversible(ordered.map((c: any) => getFullCard(c.id)).filter(Boolean)));
    }

    // Global ceiling: how many new cards across ALL topics remain today.
    const globalUsed = globalCap !== null ? newCardsLearnedToday() : 0;
    const globalRemaining = globalCap !== null ? Math.max(0, globalCap - globalUsed) : Infinity;

    // Per-topic daily budget for new cards: when mode=new and no specific
    // topic is selected, pull up to `dailyCap` new cards from EACH topic
    // that still has budget remaining, capped by the global ceiling.
    if (mode === 'new' && dailyCap !== null && !topic) {
      const allTopics = queryAll(`SELECT id FROM topics`);
      let allNewCards: any[] = [];
      let globalBudgetLeft = globalRemaining;
      for (const t of allTopics) {
        if (globalBudgetLeft <= 0) break;
        const used = newCardsLearnedToday(t.id);
        const remaining = Math.max(0, dailyCap - used);
        if (remaining <= 0) continue;
        const topicLimit = Math.min(requestedNewLimit, remaining, globalBudgetLeft);
        const orderClause = order === 'random'
          ? 'ORDER BY RANDOM()'
          : 'ORDER BY c.created_at ASC';
        const rows = queryAll(
          `SELECT c.* FROM cards c
             JOIN card_sets cs ON cs.id = c.card_set_id
            WHERE c.sr_is_active = 1 AND c.sr_slot = 0
              AND (c.sr_next_due_at IS NULL OR datetime(c.sr_next_due_at) <= datetime('now'))
              AND cs.topic_id = ?
            ${orderClause} LIMIT ?`,
          [t.id, topicLimit]
        );
        allNewCards.push(...rows);
        globalBudgetLeft -= rows.length;
      }
      const fullCards = allNewCards.map((c: any) => getFullCard(c.id)).filter(Boolean);
      return res.json(expandReversible(fullCards));
    }

    // Single-topic budget: min of per-topic remaining and global remaining
    let newCardLimit = requestedNewLimit;
    if (dailyCap !== null) {
      const used = newCardsLearnedToday(typeof topic === 'string' ? topic : undefined);
      const remaining = Math.max(0, dailyCap - used);
      newCardLimit = Math.min(requestedNewLimit, remaining, globalRemaining);
    } else if (globalCap !== null) {
      newCardLimit = Math.min(requestedNewLimit, globalRemaining);
    }

    // ── Cram mode: ALL cards regardless of due date, worst-performing first ──
    if (mode === 'cram') {
      let cramSql = `
        SELECT c.* FROM cards c
        JOIN card_sets cs ON cs.id = c.card_set_id
        WHERE c.sr_is_active = 1
      `;
      const cramParams: any[] = [];
      if (topic) { cramSql += ' AND cs.topic_id = ?'; cramParams.push(topic); }
      if (set) { cramSql += ' AND c.card_set_id = ?'; cramParams.push(set); }
      // Order: worst accuracy first (cards with reviews but low correct ratio),
      // then by slot ASC so weaker cards surface first.
      cramSql += ` ORDER BY
        CASE WHEN c.sr_total_reviews > 0
             THEN CAST(c.sr_total_correct AS REAL) / c.sr_total_reviews
             ELSE 0.5 END ASC,
        c.sr_slot ASC`;
      const cramCards = queryAll(cramSql, cramParams);
      let cramFull = cramCards.map((c: any) => getFullCard(c.id)).filter(Boolean);
      if (tags) {
        const tagList = (tags as string).split(',').map((t) => t.trim().toLowerCase());
        cramFull = cramFull.filter((c: any) => {
          const cardTags: string[] = JSON.parse(c.tags || '[]').map((t: string) => t.toLowerCase());
          return tagList.some((t) => cardTags.includes(t));
        });
      }
      return res.json(expandReversible(cramFull));
    }

    // ── Smart mode: auto-balanced session (overdue → due today → new) ──
    if (mode === 'smart') {
      const targetSize = safeInt(sessionSize, 20, 1, 200);
      const smartParams: any[] = [];
      let topicClause = '';
      if (topic) { topicClause = ' AND cs.topic_id = ?'; smartParams.push(topic); }

      // 1. Overdue cards (past grace deadline), oldest first
      const overdue = queryAll(
        `SELECT c.* FROM cards c
           JOIN card_sets cs ON cs.id = c.card_set_id
          WHERE c.sr_is_active = 1
            AND c.sr_slot > 0
            AND c.sr_grace_deadline IS NOT NULL
            AND datetime(c.sr_grace_deadline) <= datetime('now')
            ${topicClause}
          ORDER BY c.sr_next_due_at ASC`,
        smartParams
      );

      // 2. Due-today cards (due but not yet past grace), oldest first
      const dueToday = queryAll(
        `SELECT c.* FROM cards c
           JOIN card_sets cs ON cs.id = c.card_set_id
          WHERE c.sr_is_active = 1
            AND c.sr_slot > 0
            AND c.sr_next_due_at IS NOT NULL
            AND datetime(c.sr_next_due_at) <= datetime('now')
            AND (c.sr_grace_deadline IS NULL OR datetime(c.sr_grace_deadline) > datetime('now'))
            ${topicClause}
          ORDER BY c.sr_next_due_at ASC`,
        smartParams
      );

      // 3. New cards up to daily limit
      const newParams: any[] = [];
      if (topic) newParams.push(topic);
      const smartNewCards = queryAll(
        `SELECT c.* FROM cards c
           JOIN card_sets cs ON cs.id = c.card_set_id
          WHERE c.sr_is_active = 1 AND c.sr_slot = 0
            AND (c.sr_next_due_at IS NULL OR datetime(c.sr_next_due_at) <= datetime('now'))
            ${topicClause}
          ORDER BY c.created_at ASC
          LIMIT ?`,
        [...newParams, newCardLimit]
      );

      // Combine: overdue first, then due, then new — all capped at targetSize
      const combined: any[] = [];
      const seenIds = new Set<string>();
      for (const pool of [overdue, dueToday, smartNewCards]) {
        for (const card of pool) {
          if (combined.length >= targetSize) break;
          if (!seenIds.has(card.id)) {
            seenIds.add(card.id);
            combined.push(card);
          }
        }
      }

      let smartFull = combined.map((c: any) => getFullCard(c.id)).filter(Boolean);
      if (tags) {
        const tagList = (tags as string).split(',').map((t) => t.trim().toLowerCase());
        smartFull = smartFull.filter((c: any) => {
          const cardTags: string[] = JSON.parse(c.tags || '[]').map((t: string) => t.toLowerCase());
          return tagList.some((t) => cardTags.includes(t));
        });
      }
      return res.json(expandReversible(smartFull));
    }

    let sql = `
      SELECT c.* FROM cards c
      JOIN card_sets cs ON cs.id = c.card_set_id
      WHERE c.sr_is_active = 1
    `;
    const params: any[] = [];

    if (mode === 'review') {
      sql += ' AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime(\'now\')';
    } else if (mode === 'new') {
      sql += ' AND c.sr_slot = 0 AND (c.sr_next_due_at IS NULL OR datetime(c.sr_next_due_at) <= datetime(\'now\'))';
    } else {
      sql += ' AND (c.sr_next_due_at IS NULL OR datetime(c.sr_next_due_at) <= datetime(\'now\'))';
    }

    if (topic) {
      sql += ' AND cs.topic_id = ?';
      params.push(topic);
    }
    if (set) {
      sql += ' AND c.card_set_id = ?';
      params.push(set);
    }
    if (slotMin !== undefined) {
      sql += ' AND c.sr_slot >= ?';
      params.push(safeInt(slotMin, 0, 0, MAX_SLOT));
    }
    if (slotMax !== undefined) {
      sql += ' AND c.sr_slot <= ?';
      params.push(safeInt(slotMax, MAX_SLOT, 0, MAX_SLOT));
    }

    if (mode === 'new') {
      // Random sampling across the full new-card pool so a small limit
      // (e.g. 2) doesn't keep drawing the same alphabetically-earliest cards.
      sql += order === 'random'
        ? ' ORDER BY RANDOM() LIMIT ?'
        : ' ORDER BY c.created_at ASC LIMIT ?';
      params.push(newCardLimit);
    } else {
      sql += ' ORDER BY c.sr_slot ASC, c.sr_next_due_at ASC';
    }

    const cards = queryAll(sql, params);
    let fullCards = cards.map((c: any) => getFullCard(c.id)).filter(Boolean);

    if (tags) {
      const tagList = (tags as string).split(',').map((t) => t.trim().toLowerCase());
      fullCards = fullCards.filter((c: any) => {
        const cardTags: string[] = JSON.parse(c.tags || '[]').map((t: string) => t.toLowerCase());
        return tagList.some((t) => cardTags.includes(t));
      });
    }

    // For mixed mode: put review cards first, then cap new cards
    if (mode === 'mixed') {
      const reviewCards = fullCards.filter((c: any) => c.sr_slot > 0);
      const newCards = fullCards.filter((c: any) => c.sr_slot === 0).slice(0, newCardLimit);
      fullCards = [...reviewCards, ...newCards];
    }

    // Apply intelligent interleaving: space apart same-set cards and
    // alternate difficulty levels so the user doesn't see 3 hard cards in a row
    fullCards = interleaveCards(fullCards);

    res.json(expandReversible(fullCards));
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
        AND datetime(c.sr_next_due_at) > datetime('now')
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
    res.json(expandReversible(fullCards));
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

    const total = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause}`,
      params
    );

    const dueToday = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now')`,
      params
    );

    const newCards = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_slot = 0 AND (c.sr_next_due_at IS NULL OR datetime(c.sr_next_due_at) <= datetime('now'))`,
      params
    );

    const overdue = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_grace_deadline IS NOT NULL AND datetime(c.sr_grace_deadline) <= datetime('now')`,
      params
    );

    const slotDist = queryAll(
      `SELECT c.sr_slot as slot, COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} GROUP BY c.sr_slot ORDER BY c.sr_slot`,
      params
    );

    const mastered = queryOne(
      `SELECT COUNT(*) as count FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id ${whereClause} AND c.sr_slot >= 12`,
      params
    );

    const reviewsToday = queryOne(
      `SELECT COUNT(*) as count, SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct FROM review_log WHERE reviewed_at >= date('now')`,
      []
    );

    const recentDays = queryAll(
      `SELECT DISTINCT date(reviewed_at) as day FROM review_log ORDER BY day DESC LIMIT 60`,
      []
    );
    let streak = 0;
    // Use Indiana timezone for day boundaries so streaks align with the
    // user's local calendar, not the server's UTC or local time.
    const todayIndStr = new Date().toLocaleDateString('en-CA', { timeZone: INDIANA_TZ });
    const todayInd = new Date(todayIndStr + 'T00:00:00');
    for (let i = 0; i < recentDays.length; i++) {
      const expected = new Date(todayInd);
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
      slotDistribution: slotDist,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/study/history — Daily review counts for charts
router.get('/history', (req, res) => {
  try {
    const days = safeInt(req.query.days, 30, 1, 365);
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

// GET /api/study/timeline — Upcoming due cards per day
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
      const dayStart = i === 0 ? "date('now')" : `date('now', '+${i} days')`;
      const dayEnd = i === 0 ? "date('now', '+1 day')" : `date('now', '+${i + 1} days')`;

      let due = 0;
      let overdue = 0;

      if (i === 0) {
        const dueRow = queryOne(
          `SELECT COUNT(*) as count FROM cards c${topicJoin}
           WHERE c.sr_is_active = 1${topicWhere}
             AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now')`,
          topic ? [topic] : []
        );
        const overdueRow = queryOne(
          `SELECT COUNT(*) as count FROM cards c${topicJoin}
           WHERE c.sr_is_active = 1${topicWhere}
             AND c.sr_grace_deadline IS NOT NULL AND datetime(c.sr_grace_deadline) <= datetime('now')`,
          topic ? [topic] : []
        );
        due = dueRow?.count || 0;
        overdue = overdueRow?.count || 0;
      } else {
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards c${topicJoin}
           WHERE c.sr_is_active = 1${topicWhere}
             AND datetime(c.sr_next_due_at) >= ${dayStart}
             AND datetime(c.sr_next_due_at) < ${dayEnd}`,
          topic ? [topic] : []
        );
        due = row?.count || 0;
        overdue = 0;
      }

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
    const { cardId, result, response_time_ms: rawResponseTime, review_type: clientReviewType } = req.body;

    if (!cardId || !['correct', 'wrong'].includes(result)) {
      return res.status(400).json({ error: 'cardId and result (correct/wrong) required' });
    }

    // Validate response_time_ms: must be a finite number >= 0 and < 1 hour
    const response_time_ms = (() => {
      const n = Number(rawResponseTime);
      return Number.isFinite(n) && n >= 0 && n < 3600000 ? Math.floor(n) : null;
    })();

    const card = queryOne('SELECT * FROM cards WHERE id = ?', [cardId]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const slotBefore = card.sr_slot;
    const isCramReview = clientReviewType === 'cram';

    if (isCramReview) {
      // Cram review — log it but do NOT update SR schedule (sandbox mode)
      run(
        `INSERT INTO review_log (id, card_id, result, slot_before, slot_after, next_due_at, review_type, response_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, 'cram', ?)`,
        [genId(), cardId, result, slotBefore, slotBefore, card.sr_next_due_at, response_time_ms]
      );

      const updatedCard = getFullCard(cardId);
      return res.json({
        card: updatedCard,
        slotBefore,
        slotAfter: slotBefore,
        scheduleLocked: true,
        reviewType: 'cram',
        easeAfter: card.sr_ease_factor ?? 2.5,
      });
    }

    // Compute retention-based interval multiplier for the target slot range
    const intervalMultiplier = getRetentionMultiplier(
      Math.max(card.sr_slot - 1, MIN_SLOT),
      Math.min(card.sr_slot + 1, MAX_SLOT),
    );

    const reviewResult = processReview(
      result,
      card.sr_slot,
      card.sr_next_due_at,
      card.sr_ease_factor ?? 2.5,
      response_time_ms,
      intervalMultiplier,
    );

    // Always log the review
    run(
      `INSERT INTO review_log (id, card_id, result, slot_before, slot_after, next_due_at, review_type, response_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [genId(), cardId, result, slotBefore, reviewResult.newSlot, reviewResult.nextDueAt, reviewResult.reviewType, response_time_ms]
    );

    // Lapse tracking: increment lapse count when wrong at slot 5+
    if (reviewResult.lapsed) {
      run(`UPDATE cards SET sr_lapse_count = COALESCE(sr_lapse_count, 0) + 1 WHERE id = ?`, [cardId]);
    }

    // Update card SR state
    if (reviewResult.scheduleLocked) {
      // Early review — update counters only, don't change schedule
      run(
        `UPDATE cards SET
          sr_total_reviews = sr_total_reviews + 1,
          sr_total_correct = sr_total_correct + ?,
          sr_last_reviewed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?`,
        [result === 'correct' ? 1 : 0, cardId]
      );
    } else {
      // Standard review — update slot + schedule + ease factor
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
          cardId,
        ]
      );
    }

    const updatedCard = getFullCard(cardId);
    res.json({
      card: updatedCard,
      slotBefore,
      slotAfter: reviewResult.newSlot,
      scheduleLocked: reviewResult.scheduleLocked,
      reviewType: reviewResult.reviewType,
      easeAfter: reviewResult.easeAfter,
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// POST /api/study/decay-check — Run cascade regression on all active cards
router.post('/decay-check', (_req, res) => {
  try {
    // Cascade regression only applies to review-phase cards (slot >= MIN_SLOT).
    // Learning (slot 1) and bridge (slot 3) cards are demoted to slot 0 by
    // processReview on the next review attempt, not by auto-decay. Running
    // cascade on slot 3 would silently promote it to slot 4 because the
    // loop `while (slot > MIN_SLOT)` never executes for slot < 4 and the
    // function returns `Math.max(slot, MIN_SLOT)`.
    const cards = queryAll(
      'SELECT id, sr_slot, sr_next_due_at FROM cards WHERE sr_is_active = 1 AND sr_next_due_at IS NOT NULL AND sr_slot >= ?',
      [MIN_SLOT]
    );

    let regressed = 0;
    for (const card of cards) {
      const newSlot = calculateCascadeRegression(card.sr_slot, card.sr_next_due_at);
      if (newSlot !== card.sr_slot) {
        const newNextDueAt = calculateNextDue(newSlot);
        const newGraceDeadline = calculateGraceDeadline(newNextDueAt, newSlot);
        run(
          `UPDATE cards SET sr_slot = ?, sr_next_due_at = ?, sr_grace_deadline = ?, updated_at = datetime('now') WHERE id = ?`,
          [newSlot, newNextDueAt, newGraceDeadline, card.id]
        );
        regressed++;
      }
    }

    res.json({ checked: cards.length, regressed });
  } catch (err) {
    console.error('Error running decay check:', err);
    res.status(500).json({ error: 'Failed to run decay check' });
  }
});

// GET /api/study/calendar — Per-day card counts by topic for calendar view
router.get('/calendar', (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 60, 120);

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
                 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now')
               GROUP BY t.id`;
      } else {
        sql = `SELECT t.id as topic_id, t.name as topic_name, t.color as topic_color, COUNT(*) as count
               FROM cards c
               JOIN card_sets cs ON cs.id = c.card_set_id
               JOIN topics t ON t.id = cs.topic_id
               WHERE c.sr_is_active = 1
                 AND datetime(c.sr_next_due_at) >= ${dayStart}
                 AND datetime(c.sr_next_due_at) < ${dayEnd}
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
    const topicSummaries = queryAll(
      `SELECT t.id, t.name, t.color,
              COUNT(c.id) as total_cards,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now') THEN 1 ELSE 0 END) as due_now,
              SUM(CASE WHEN c.sr_slot >= 12 THEN 1 ELSE 0 END) as mastered,
              SUM(CASE WHEN c.sr_slot = 0 THEN 1 ELSE 0 END) as new_cards,
              AVG(c.sr_slot) as avg_slot,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_grace_deadline IS NOT NULL AND datetime(c.sr_grace_deadline) <= datetime('now') THEN 1 ELSE 0 END) as overdue
       FROM topics t
       LEFT JOIN card_sets cs ON cs.topic_id = t.id
       LEFT JOIN cards c ON c.card_set_id = cs.id
       GROUP BY t.id
       ORDER BY due_now DESC`,
      []
    );

    const weekForecast = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = i === 0 ? "datetime('now')" : `datetime('now', '+${i} days', 'start of day')`;
      const dayEnd = `datetime('now', '+${i + 1} days', 'start of day')`;

      let count: number;
      if (i === 0) {
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards WHERE sr_is_active = 1 AND sr_slot > 0 AND sr_next_due_at IS NOT NULL AND datetime(sr_next_due_at) <= datetime('now')`,
          []
        );
        count = row?.count || 0;
      } else {
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards WHERE sr_is_active = 1 AND datetime(sr_next_due_at) >= ${dayStart} AND datetime(sr_next_due_at) < ${dayEnd}`,
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

// GET /api/study/forecast-30d — 30-day workload prediction with new-card estimation
router.get('/forecast-30d', (_req, res) => {
  try {
    // Estimate daily new-card rate from the last 14 days of review_log
    const newRateRow = queryOne(
      `SELECT COUNT(*) as total,
              COUNT(DISTINCT date(reviewed_at)) as days
       FROM review_log
       WHERE slot_before = 0 AND slot_after > 0
         AND reviewed_at >= date('now', '-14 days')`,
      []
    );
    const activeDays = Math.max(1, newRateRow?.days || 1);
    const dailyNewRate = Math.round((newRateRow?.total || 0) / activeDays);

    const forecast: { date: string; dueCount: number; estimatedNew: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isoDay = d.toISOString().slice(0, 10);

      let dueCount: number;
      if (i === 0) {
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards
           WHERE sr_is_active = 1 AND sr_slot > 0
             AND sr_next_due_at IS NOT NULL
             AND datetime(sr_next_due_at) <= datetime('now')`,
          []
        );
        dueCount = row?.count || 0;
      } else {
        const dayStart = `datetime('now', '+${i} days', 'start of day')`;
        const dayEnd = `datetime('now', '+${i + 1} days', 'start of day')`;
        const row = queryOne(
          `SELECT COUNT(*) as count FROM cards
           WHERE sr_is_active = 1
             AND datetime(sr_next_due_at) >= ${dayStart}
             AND datetime(sr_next_due_at) < ${dayEnd}`,
          []
        );
        dueCount = row?.count || 0;
      }

      forecast.push({
        date: isoDay,
        dueCount,
        estimatedNew: i === 0 ? 0 : dailyNewRate,
      });
    }

    res.json(forecast);
  } catch (err) {
    console.error('Error fetching 30-day forecast:', err);
    res.status(500).json({ error: 'Failed to fetch 30-day forecast' });
  }
});

// GET /api/study/duration — Study duration distribution from review_log
router.get('/duration', (_req, res) => {
  try {
    const buckets = [
      { label: '<3s', min: 0, max: 3000 },
      { label: '3-5s', min: 3000, max: 5000 },
      { label: '5-10s', min: 5000, max: 10000 },
      { label: '10-20s', min: 10000, max: 20000 },
      { label: '20-60s', min: 20000, max: 60000 },
      { label: '>60s', min: 60000, max: 3600000 },
    ];

    const result = buckets.map((b) => {
      const row = queryOne(
        `SELECT COUNT(*) as count FROM review_log
         WHERE response_time_ms IS NOT NULL
           AND response_time_ms >= ? AND response_time_ms < ?`,
        [b.min, b.max]
      );
      return { label: b.label, count: row?.count || 0 };
    });

    const avgRow = queryOne(
      `SELECT AVG(response_time_ms) as avg_ms, COUNT(*) as total
       FROM review_log WHERE response_time_ms IS NOT NULL`,
      []
    );

    res.json({
      buckets: result,
      averageMs: avgRow?.avg_ms ? Math.round(avgRow.avg_ms) : null,
      totalReviews: avgRow?.total || 0,
    });
  } catch (err) {
    console.error('Error fetching duration:', err);
    res.status(500).json({ error: 'Failed to fetch duration data' });
  }
});

// GET /api/study/topic-sr/:topicId — Detailed SR overview for one topic
router.get('/topic-sr/:topicId', (req, res) => {
  try {
    const { topicId } = req.params;

    const slotDist = queryAll(
      `SELECT c.sr_slot as slot, COUNT(*) as count
       FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ? AND c.sr_is_active = 1
       GROUP BY c.sr_slot ORDER BY c.sr_slot`,
      [topicId]
    );

    const sets = queryAll(
      `SELECT cs.id, cs.name,
              COUNT(c.id) as total,
              SUM(CASE WHEN c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now') THEN 1 ELSE 0 END) as due,
              SUM(CASE WHEN c.sr_slot >= 12 THEN 1 ELSE 0 END) as mastered,
              AVG(c.sr_slot) as avg_slot
       FROM card_sets cs
       LEFT JOIN cards c ON c.card_set_id = cs.id AND c.sr_is_active = 1
       WHERE cs.topic_id = ?
       GROUP BY cs.id`,
      [topicId]
    );

    const cards = queryAll(
      `SELECT c.id, c.sr_slot, c.sr_next_due_at, c.sr_grace_deadline, c.sr_last_reviewed_at, c.sr_total_reviews, c.sr_total_correct, cs.name as set_name,
              (SELECT mb.text_content FROM card_sides s JOIN media_blocks mb ON mb.card_side_id = s.id WHERE s.card_id = c.id AND s.side = 0 AND mb.block_type = 'text' LIMIT 1) as preview
       FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ? AND c.sr_is_active = 1
       ORDER BY c.sr_next_due_at ASC NULLS FIRST`,
      [topicId]
    );

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

    const topic = queryOne('SELECT * FROM topics WHERE id = ?', [topicId]);

    res.json({ topic, slotDistribution: slotDist, sets, cards, accuracy });
  } catch (err) {
    console.error('Error fetching topic SR:', err);
    res.status(500).json({ error: 'Failed to fetch topic SR data' });
  }
});

// GET /api/study/master-dashboard — Per-topic, per-tranche due counts for master dashboard
router.get('/master-dashboard', (_req, res) => {
  try {
    // Get all topics with their card counts
    const topics = queryAll(
      `SELECT t.id, t.name, t.color,
              COUNT(c.id) as total_cards,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now') THEN 1 ELSE 0 END) as due_now,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_grace_deadline IS NOT NULL AND datetime(c.sr_grace_deadline) <= datetime('now') THEN 1 ELSE 0 END) as overdue,
              SUM(CASE WHEN c.sr_slot >= 12 THEN 1 ELSE 0 END) as mastered,
              MIN(CASE WHEN datetime(c.sr_next_due_at) > datetime('now') THEN c.sr_next_due_at ELSE NULL END) as next_due
       FROM topics t
       LEFT JOIN card_sets cs ON cs.topic_id = t.id
       LEFT JOIN cards c ON c.card_set_id = cs.id
       GROUP BY t.id
       ORDER BY due_now DESC`,
      []
    );

    // Per-topic, per-tranche breakdown for due cards
    // Tranche 1: slots 1-3, Tranche 2: slots 4-6, Tranche 3: slots 7-9, Tranche 4: slots 10-11, Tranche 5: slots 12-13
    const trancheBreakdown = queryAll(
      `SELECT cs.topic_id,
              CASE
                WHEN c.sr_slot <= 3 THEN 1
                WHEN c.sr_slot <= 6 THEN 2
                WHEN c.sr_slot <= 9 THEN 3
                WHEN c.sr_slot <= 11 THEN 4
                ELSE 5
              END as tranche,
              COUNT(*) as count
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE c.sr_is_active = 1
         AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now')
       GROUP BY cs.topic_id, tranche`,
      []
    );

    // Attach tranche data to topics
    const topicsWithTranches = topics.map((t: any) => ({
      ...t,
      tranches: [1, 2, 3, 4, 5].map(tr => ({
        tranche: tr,
        count: trancheBreakdown.find((b: any) => b.topic_id === t.id && b.tranche === tr)?.count || 0,
      })),
    }));

    // Global totals
    const totalDue = topics.reduce((sum: number, t: any) => sum + (t.due_now || 0), 0);
    const totalOverdue = topics.reduce((sum: number, t: any) => sum + (t.overdue || 0), 0);
    const totalCards = topics.reduce((sum: number, t: any) => sum + (t.total_cards || 0), 0);

    res.json({ topics: topicsWithTranches, totalDue, totalOverdue, totalCards });
  } catch (err) {
    console.error('Error fetching master dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch master dashboard' });
  }
});

// GET /api/study/topic-dashboard/:topicId — Per-card-set, per-tranche breakdown for topic drill-down
router.get('/topic-dashboard/:topicId', (req, res) => {
  try {
    const { topicId } = req.params;

    const topic = queryOne('SELECT * FROM topics WHERE id = ?', [topicId]);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    // Per-card-set summary
    const sets = queryAll(
      `SELECT cs.id, cs.name,
              COUNT(c.id) as total,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now') THEN 1 ELSE 0 END) as due,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_grace_deadline IS NOT NULL AND datetime(c.sr_grace_deadline) <= datetime('now') THEN 1 ELSE 0 END) as overdue,
              SUM(CASE WHEN c.sr_slot >= 12 THEN 1 ELSE 0 END) as mastered
       FROM card_sets cs
       LEFT JOIN cards c ON c.card_set_id = cs.id
       WHERE cs.topic_id = ?
       GROUP BY cs.id`,
      [topicId]
    );

    // Per-card-set, per-tranche breakdown for due cards
    const setTranches = queryAll(
      `SELECT c.card_set_id,
              CASE
                WHEN c.sr_slot <= 3 THEN 1
                WHEN c.sr_slot <= 6 THEN 2
                WHEN c.sr_slot <= 9 THEN 3
                WHEN c.sr_slot <= 11 THEN 4
                ELSE 5
              END as tranche,
              COUNT(*) as count
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ?
         AND c.sr_is_active = 1
         AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now')
       GROUP BY c.card_set_id, tranche`,
      [topicId]
    );

    // Topic-level summary
    const summary = queryOne(
      `SELECT COUNT(c.id) as total,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_slot > 0 AND c.sr_next_due_at IS NOT NULL AND datetime(c.sr_next_due_at) <= datetime('now') THEN 1 ELSE 0 END) as due,
              SUM(CASE WHEN c.sr_is_active = 1 AND c.sr_grace_deadline IS NOT NULL AND datetime(c.sr_grace_deadline) <= datetime('now') THEN 1 ELSE 0 END) as overdue,
              SUM(CASE WHEN c.sr_slot >= 12 THEN 1 ELSE 0 END) as mastered
       FROM cards c
       JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ?`,
      [topicId]
    );

    // Slot distribution
    const slotDist = queryAll(
      `SELECT c.sr_slot as slot, COUNT(*) as count
       FROM cards c JOIN card_sets cs ON cs.id = c.card_set_id
       WHERE cs.topic_id = ? AND c.sr_is_active = 1
       GROUP BY c.sr_slot ORDER BY c.sr_slot`,
      [topicId]
    );

    const setsWithTranches = sets.map((s: any) => ({
      ...s,
      tranches: [1, 2, 3, 4, 5].map(tr => ({
        tranche: tr,
        count: setTranches.find((b: any) => b.card_set_id === s.id && b.tranche === tr)?.count || 0,
      })),
    }));

    res.json({ topic, sets: setsWithTranches, summary, slotDistribution: slotDist });
  } catch (err) {
    console.error('Error fetching topic dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch topic dashboard' });
  }
});

// GET /api/study/tranche-dashboard — Due cards grouped by SR slot, with the
// chip-level data the Study tab dashboard needs. Only tranches with at least
// one due card are returned; only DUE cards are returned. Cards are sorted
// oldest due_at first within each tranche.
router.get('/tranche-dashboard', (req, res) => {
  try {
    const topicId = typeof req.query.topic === 'string' ? req.query.topic : undefined;
    const params: any[] = [];
    let topicClause = '';
    if (topicId) {
      topicClause = ' AND cs.topic_id = ?';
      params.push(topicId);
    }
    const rows = queryAll(
      `SELECT c.id, c.sr_slot, c.sr_next_due_at, c.sr_last_reviewed_at,
              (SELECT result FROM review_log
                WHERE card_id = c.id
                ORDER BY reviewed_at DESC LIMIT 1) as last_result
         FROM cards c
         JOIN card_sets cs ON cs.id = c.card_set_id
        WHERE c.sr_is_active = 1
          AND c.sr_slot > 0
          AND c.sr_next_due_at IS NOT NULL
          AND datetime(c.sr_next_due_at) <= datetime('now')
          ${topicClause}
        ORDER BY c.sr_slot ASC, c.sr_next_due_at ASC`,
      params
    );

    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;

    type Chip = {
      id: string;
      slot: number;
      due_at: string;
      last_reviewed_at: string | null;
      last_result: 'correct' | 'wrong' | null;
    };
    const bySlot = new Map<number, Chip[]>();
    let dueIn24hTotal = 0;

    for (const r of rows as any[]) {
      const chip: Chip = {
        id: r.id,
        slot: r.sr_slot,
        due_at: r.sr_next_due_at,
        last_reviewed_at: r.sr_last_reviewed_at || null,
        last_result: r.last_result || null,
      };
      if (!bySlot.has(r.sr_slot)) bySlot.set(r.sr_slot, []);
      bySlot.get(r.sr_slot)!.push(chip);
      const dueMs = new Date(r.sr_next_due_at).getTime();
      if (dueMs <= in24h) dueIn24hTotal++;
    }

    // Pull last-studied from the review log directly — not from the due-cards
    // query, because just-studied cards have been promoted out of the "due"
    // window and wouldn't show up there.
    const lastReviewRow = topicId
      ? queryOne(
          `SELECT MAX(rl.reviewed_at) as last FROM review_log rl
             JOIN cards c ON c.id = rl.card_id
             JOIN card_sets cs ON cs.id = c.card_set_id
            WHERE cs.topic_id = ?`,
          [topicId]
        )
      : queryOne(`SELECT MAX(reviewed_at) as last FROM review_log`);
    const lastStudiedAt: string | null = lastReviewRow?.last || null;

    const trancheLabels = SLOT_LABELS as Record<number, string>;
    const tranches = Array.from(bySlot.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([slot, cards]) => {
        const dueIn24hCount = cards.filter(
          (c) => new Date(c.due_at).getTime() <= in24h
        ).length;
        return {
          slot,
          label: trancheLabels[slot] ?? `Slot ${slot}`,
          dueCount: cards.length,
          dueIn24hCount,
          soonestDueAt: cards[0]?.due_at ?? null,
          cards,
        };
      });

    // Pool of slot-0 cards still available to introduce (independent of daily cap).
    const newPoolRow = topicId
      ? queryOne(
          `SELECT COUNT(*) as count FROM cards c
             JOIN card_sets cs ON cs.id = c.card_set_id
            WHERE c.sr_is_active = 1 AND c.sr_slot = 0
              AND (c.sr_next_due_at IS NULL OR datetime(c.sr_next_due_at) <= datetime('now'))
              AND cs.topic_id = ?`,
          [topicId]
        )
      : queryOne(
          `SELECT COUNT(*) as count FROM cards
            WHERE sr_is_active = 1 AND sr_slot = 0
              AND (sr_next_due_at IS NULL OR datetime(sr_next_due_at) <= datetime('now'))`,
          []
        );

    // Cards due within 24h and 48h (includes cards not yet due but upcoming)
    const upcomingParams: any[] = [];
    let upcomingTopicClause = '';
    if (topicId) {
      upcomingTopicClause = ' AND cs.topic_id = ?';
      upcomingParams.push(topicId);
    }
    const dueIn24hRow = queryOne(
      `SELECT COUNT(*) as count FROM cards c
         JOIN card_sets cs ON cs.id = c.card_set_id
        WHERE c.sr_is_active = 1 AND c.sr_slot > 0
          AND c.sr_next_due_at IS NOT NULL
          AND datetime(c.sr_next_due_at) <= datetime('now', '+24 hours')
          ${upcomingTopicClause}`,
      upcomingParams
    );
    const dueIn48hRow = queryOne(
      `SELECT COUNT(*) as count FROM cards c
         JOIN card_sets cs ON cs.id = c.card_set_id
        WHERE c.sr_is_active = 1 AND c.sr_slot > 0
          AND c.sr_next_due_at IS NOT NULL
          AND datetime(c.sr_next_due_at) <= datetime('now', '+48 hours')
          ${upcomingTopicClause}`,
      upcomingParams
    );

    res.json({
      tranches,
      totals: {
        dueNow: rows.length,
        dueIn24h: dueIn24hRow?.count || 0,
        dueIn48h: dueIn48hRow?.count || 0,
      },
      newToday: {
        used: newCardsLearnedToday(topicId),
        usedGlobal: newCardsLearnedToday(),
        available: newPoolRow?.count || 0,
      },
      lastStudiedAt,
    });
  } catch (err) {
    console.error('Error fetching tranche dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch tranche dashboard' });
  }
});

// GET /api/study/retention — Retention rate by SR slot
router.get('/retention', (_req, res) => {
  try {
    const rows = queryAll(
      `SELECT slot_before as sr_slot,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct,
        ROUND(100.0 * SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) / COUNT(*), 1) as retention_pct
       FROM review_log
       WHERE review_type = 'standard'
       GROUP BY slot_before
       ORDER BY slot_before`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching retention:', err);
    res.status(500).json({ error: 'Failed to fetch retention data' });
  }
});

// GET /api/study/velocity — Cards promoted past slot 6 per week (last 8 weeks)
router.get('/velocity', (_req, res) => {
  try {
    const rows = queryAll(
      `SELECT
        strftime('%Y-W%W', reviewed_at) as week,
        COUNT(*) as promotions
       FROM review_log
       WHERE slot_after >= 6 AND slot_before < 6
         AND reviewed_at > datetime('now', '-56 days')
       GROUP BY week
       ORDER BY week`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching velocity:', err);
    res.status(500).json({ error: 'Failed to fetch velocity data' });
  }
});

// GET /api/study/efficiency — Study efficiency stats
router.get('/efficiency', (_req, res) => {
  try {
    // Average response time for correct vs wrong
    const responseTime = queryAll(
      `SELECT result,
        ROUND(AVG(response_time_ms)) as avg_ms,
        COUNT(*) as count
       FROM review_log
       WHERE response_time_ms IS NOT NULL
       GROUP BY result`,
      []
    );

    // Cards reviewed per session (grouped by date)
    const perDay = queryAll(
      `SELECT date(reviewed_at) as day,
        COUNT(*) as total,
        SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct
       FROM review_log
       WHERE reviewed_at >= date('now', '-30 days')
       GROUP BY date(reviewed_at)
       ORDER BY day`,
      []
    );

    // Daily accuracy for last 37 days (extra 7 for rolling window computation)
    const accuracyTrend = queryAll(
      `SELECT date(reviewed_at) as day,
        COUNT(*) as total,
        SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct,
        ROUND(100.0 * SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy_pct
       FROM review_log
       WHERE reviewed_at >= date('now', '-37 days')
       GROUP BY date(reviewed_at)
       ORDER BY day`,
      []
    );

    res.json({ responseTime, perDay, accuracyTrend });
  } catch (err) {
    console.error('Error fetching efficiency:', err);
    res.status(500).json({ error: 'Failed to fetch efficiency data' });
  }
});

// GET /api/study/leeches — Cards with lapse_count >= 3 (cards the user keeps forgetting)
router.get('/leeches', (req, res) => {
  try {
    const { topic } = req.query;
    let sql = `
      SELECT c.*, cs.name as set_name, cs.topic_id
      FROM cards c
      JOIN card_sets cs ON cs.id = c.card_set_id
      WHERE c.sr_is_active = 1
        AND COALESCE(c.sr_lapse_count, 0) >= 3
    `;
    const params: any[] = [];
    if (topic) {
      sql += ' AND cs.topic_id = ?';
      params.push(topic);
    }
    sql += ' ORDER BY c.sr_lapse_count DESC, c.sr_slot ASC';

    const cards = queryAll(sql, params);
    const fullCards = cards.map((c: any) => {
      const full = getFullCard(c.id);
      if (full) {
        (full as any).set_name = c.set_name;
        (full as any).topic_id = c.topic_id;
      }
      return full;
    }).filter(Boolean);

    res.json(fullCards);
  } catch (err) {
    console.error('Error fetching leeches:', err);
    res.status(500).json({ error: 'Failed to fetch leech cards' });
  }
});

export default router;
