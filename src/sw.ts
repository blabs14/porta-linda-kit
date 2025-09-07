/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

import { precacheAndRoute } from 'workbox-precaching';

// O Workbox irá injetar o pre-cache aqui durante o build.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: any) => {
  try {
    const data = event?.data ? event.data.json() : {};
    const title = data.title || 'Notificação';
    const options: NotificationOptions = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      data: { url: data.url || '/', items: data.items || [] },
      requireInteraction: true,
      tag: 'porta-linda-push'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // ignore
  }
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
    for (const client of clientList) {
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});