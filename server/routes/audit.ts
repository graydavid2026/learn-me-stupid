import { Router, Request, Response } from 'express';
import { listAudit } from '../services/auditLog.js';
import logger from '../logger.js';

const router = Router();

// GET /api/audit — Recent destructive operations. Useful for post-incident
// forensics (e.g. "what cascaded when?").
router.get('/', (req: Request, res: Response) => {
  try {
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) || 100 : 100;
    const rows = listAudit(limit);
    res.json(
      rows.map((r) => ({
        ...r,
        metadata: r.metadata ? safeParse(r.metadata) : null,
      }))
    );
  } catch (err) {
    logger.error({ err }, 'Error reading audit log');
    res.status(500).json({ error: 'Failed to read audit log' });
  }
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export default router;
