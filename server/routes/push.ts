import { Router, Request, Response } from 'express';
import { getVapidPublicKey, subscribe, unsubscribe } from '../services/pushNotifications.js';
import logger from '../logger.js';

const router = Router();

// GET /api/push/vapid-key — returns the public VAPID key
router.get('/vapid-key', (_req: Request, res: Response) => {
  try {
    const key = getVapidPublicKey();
    res.json({ publicKey: key });
  } catch (err) {
    logger.error({ err }, 'Error fetching VAPID key');
    res.status(500).json({ error: 'Failed to fetch VAPID key' });
  }
});

// POST /api/push/subscribe — save a push subscription
router.post('/subscribe', (req: Request, res: Response) => {
  try {
    const { endpoint, keys } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription: endpoint and keys (p256dh, auth) required' });
    }

    subscribe({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error saving push subscription');
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// POST /api/push/unsubscribe — remove a push subscription
router.post('/unsubscribe', (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    unsubscribe(endpoint);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error removing push subscription');
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

export default router;
