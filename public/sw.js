const SW_VERSION = 'eij-v53-online-only';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Remove caches left by older PWA attempts so the app always loads the newest online version.
    if ('caches' in self) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // This PWA intentionally stays online-first. It does not cache Supabase data or old app bundles.
  event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
