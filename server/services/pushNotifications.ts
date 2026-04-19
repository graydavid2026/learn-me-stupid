import webPush from 'web-push';
import { queryAll, queryOne, run } from '../db/index.js';
import logger from '../logger.js';

interface SettingRow {
  value: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  created_at: string;
}

interface DueCountRow {
  count: number;
}

let vapidConfigured = false;

/** Ensure VAPID keys exist in the settings table and configure web-push. */
export function initVapid(): void {
  if (vapidConfigured) return;

  let publicKey = queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', ['vapid_public'])?.value;
  let privateKey = queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', ['vapid_private'])?.value;
  const email = queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', ['vapid_email'])?.value || 'mailto:david@grayroadconsulting.com';

  if (!publicKey || !privateKey) {
    const keys = webPush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['vapid_public', publicKey]);
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['vapid_private', privateKey]);
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['vapid_email', email]);
    logger.info('Generated new VAPID keys');
  }

  webPush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
}

/** Get the public VAPID key for the client. */
export function getVapidPublicKey(): string {
  initVapid();
  const row = queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', ['vapid_public']);
  if (!row) throw new Error('VAPID public key not found');
  return row.value;
}

/** Save a push subscription. */
export function subscribe(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): void {
  initVapid();
  // Upsert by endpoint
  const existing = queryOne<SubscriptionRow>('SELECT id FROM push_subscriptions WHERE endpoint = ?', [subscription.endpoint]);
  if (existing) {
    run('UPDATE push_subscriptions SET keys_p256dh = ?, keys_auth = ? WHERE endpoint = ?', [
      subscription.keys.p256dh,
      subscription.keys.auth,
      subscription.endpoint,
    ]);
  } else {
    run(
      'INSERT INTO push_subscriptions (endpoint, keys_p256dh, keys_auth) VALUES (?, ?, ?)',
      [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
  }
}

/** Remove a push subscription by endpoint. */
export function unsubscribe(endpoint: string): void {
  run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

/** Send a push notification to all subscribers. */
export async function sendReminder(title: string, body: string): Promise<void> {
  initVapid();

  const subs = queryAll<SubscriptionRow>('SELECT * FROM push_subscriptions');
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body });
  const staleEndpoints: string[] = [];

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        payload
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        staleEndpoints.push(sub.endpoint);
      } else {
        logger.warn({ err, endpoint: sub.endpoint }, 'Push notification failed');
      }
    }
  }

  // Clean up stale subscriptions
  for (const endpoint of staleEndpoints) {
    run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  }
}

/** Check if user has cards due and send a reminder. Called by the daily timer. */
export async function checkAndSendDueReminder(): Promise<void> {
  try {
    const subs = queryAll<SubscriptionRow>('SELECT id FROM push_subscriptions');
    if (subs.length === 0) return;

    const now = new Date().toISOString();
    const dueRow = queryOne<DueCountRow>(
      'SELECT COUNT(*) as count FROM cards WHERE sr_is_active = 1 AND sr_next_due_at IS NOT NULL AND sr_next_due_at <= ?',
      [now]
    );
    const dueCount = dueRow?.count ?? 0;

    if (dueCount > 0) {
      await sendReminder(
        'Cards due for review',
        `You have ${dueCount} card${dueCount !== 1 ? 's' : ''} ready for review. Keep your streak going!`
      );
      logger.info(`Sent push reminder for ${dueCount} due cards`);
    }
  } catch (err) {
    logger.warn({ err }, 'Due-card reminder check failed');
  }
}
