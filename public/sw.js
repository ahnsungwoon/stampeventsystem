self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || '도우미 호출', {
      body: data.body || '새로운 호출이 있습니다.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'helper-call',
      renotify: true,
      data: { url: data.url || '/helper' },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/helper') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
