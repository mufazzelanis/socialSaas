// Minimal service worker: makes the app installable ("Add to Home Screen") and
// keeps it launchable when the network briefly drops — it does NOT cache API
// calls, only same-origin static assets (the built JS/CSS/HTML shell), so data
// (posts, accounts, auth) is always fetched fresh from the backend.
const CACHE = 'social-saas-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests for the app shell itself. Everything
  // else (API calls to the backend, POST/PUT/DELETE, cross-origin requests)
  // passes straight through to the network untouched.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
