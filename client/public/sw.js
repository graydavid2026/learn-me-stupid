// Minimal service worker for push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Learn Me Stupid', body: 'You have cards to review!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (_e) {
    // Use default data
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'study-reminder',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow('/study');
    })
  );
});
