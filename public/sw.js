/* Service worker for Live Chat Web Push. Handles push events and notification click. */
self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'Pesan baru';
    const body = payload.body || '';
    const url = payload.url || '/';
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        data: { url: url },
        tag: 'livechat-push',
        renotify: true,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
      })
    );
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('Pesan baru', {
        body: 'Ada pesan masuk di Live Chat.',
        data: { url: '/' },
        tag: 'livechat-push',
        icon: '/favicon.svg',
        vibrate: [200, 100, 200],
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && 'focus' in clientList[i]) {
          clientList[i].navigate(url);
          return clientList[i].focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
