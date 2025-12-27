// Minimal service worker for PWA installability
// No offline caching, push notifications, or background sync

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// Minimal fetch handler - just pass through to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
