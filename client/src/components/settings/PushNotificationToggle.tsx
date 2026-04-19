import { useState, useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';

const PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!PUSH_SUPPORTED) {
      setLoading(false);
      return;
    }
    // Check current subscription state
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setEnabled(!!sub);
        setLoading(false);
      });
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleToggle = async () => {
    if (!PUSH_SUPPORTED) return;
    setError(null);
    setLoading(true);

    try {
      if (enabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setEnabled(false);
      } else {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('Notification permission was denied.');
          setLoading(false);
          return;
        }

        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Get VAPID key from server
        const vapidRes = await fetch('/api/push/vapid-key');
        if (!vapidRes.ok) throw new Error('Failed to fetch VAPID key');
        const { publicKey } = await vapidRes.json();

        // Subscribe
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });

        // Send subscription to server
        const subJson = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          }),
        });

        setEnabled(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-3">
        <Bell className={`w-5 h-5 shrink-0 ${enabled ? 'text-accent' : 'text-text-tertiary'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-text-primary">Push notifications</div>
          <div className="text-xs text-text-tertiary">
            Get a daily reminder when you have cards due for review. Notifications are
            sent once per day if you have pending reviews.
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading || !PUSH_SUPPORTED}
          role="switch"
          aria-checked={enabled}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-accent' : 'bg-surface-elevated border border-border'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {!PUSH_SUPPORTED && (
        <div className="mt-3 flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-warning">
            Push notifications aren't supported in this browser. Use Chrome, Edge, or Firefox on desktop.
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3 flex items-start gap-2 bg-error/10 border border-error/30 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <div className="text-xs text-error">{error}</div>
        </div>
      )}
    </div>
  );
}
