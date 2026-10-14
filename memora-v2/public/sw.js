// MEMORA V1 -> V2 retirement worker. Keep this URL available for old installs.
// No fetch handler: requests go to the network. Never erase learner storage.
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window' });
    await self.registration.unregister();
    await Promise.allSettled(windows.map((client) => {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
      return client.navigate(client.url);
    }));
  })());
});
