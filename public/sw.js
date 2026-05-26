// Minimal service worker for PWA installability
const CACHE_NAME = "odyssey-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy for API calls, cache for static assets
  if (event.request.url.includes("/api/")) {
    return; // Don't cache API calls
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request) as any)
  );
});
