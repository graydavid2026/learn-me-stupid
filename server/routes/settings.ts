import { Router, Request, Response } from 'express';
import { queryOne, run } from '../db/index.js';
import logger from '../logger.js';

const router = Router();

const ALLOWED_KEYS = ['retention_target', 'daily_new_limit', 'cards_per_topic_limit'];

interface SettingRow {
  value: string;
}

// GET /api/settings/:key — Get a single setting
router.get('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const row = queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', [key]);
    if (!row) return res.status(404).json({ error: `Setting '${key}' not found` });
    res.json({ key, value: row.value });
  } catch (err) {
    logger.error({ err }, 'Error fetching setting');
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key — Upsert a setting
router.put('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value?: unknown };

    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: `Unknown setting key '${key}'. Allowed: ${ALLOWED_KEYS.join(', ')}` });
    }
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'value is required' });
    }

    const stringValue = String(value);
    run(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, stringValue]
    );
    res.json({ key, value: stringValue });
  } catch (err) {
    logger.error({ err }, 'Error updating setting');
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;

/** Helper: read a numeric setting with a default fallback */
export function getSettingNum(key: string, fallback: number): number {
  try {
    const row = queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', [key]);
    if (!row) return fallback;
    const n = Number(row.value);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
