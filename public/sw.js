// ShuttleCashFlow Minimal Service Worker (Network-Only Strategy)
// PWA installable requirement while keeping the app purely online.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass all requests directly to the network — no offline cache
  event.respondWith(fetch(event.request));
});
