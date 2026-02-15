/* Service worker for Live Chat Web Push. Handles push events and notification click. */
var baseUrl = self.location.origin;

self.addEventListener('push', function (event) {
  if (!event.data) return;
  var options = {
    body: 'Ada pesan masuk di Live Chat.',
    data: { url: '/' },
    tag: 'livechat-push',
    renotify: true,
    icon: baseUrl + '/favicon.svg',
    badge: baseUrl + '/favicon.svg',
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  try {
    var payload = event.data.json();
    options.body = payload.body || options.body;
    options.data = { url: payload.url || '/' };
    if (payload.title) options.title = payload.title;
    event.waitUntil(self.registration.showNotification(payload.title || 'Pesan baru', options));
  } catch (e) {
    options.title = 'Pesan baru';
    event.waitUntil(self.registration.showNotification('Pesan baru', options));
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
