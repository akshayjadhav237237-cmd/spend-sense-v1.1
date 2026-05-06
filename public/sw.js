// SpendSense Service Worker — v5 (force-bust stale v4 cache)
const CACHE_VERSION = 'spendsense-v5';

// Only cache truly static assets (manifest, icons) — NOT index.html or JS/CSS bundles
// because those have hashed filenames managed by Vite and must always come from network
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ─── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // ignoreSearch + individual catches so one failure doesn't break install
      Promise.allSettled(PRECACHE_ASSETS.map((url) => cache.add(url)))
    )
  );
  // Activate immediately — don't wait for old SW to idle
  self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION) // delete every old cache version
          .map((k) => caches.delete(k))
      )
    )
  );
  // Take control of ALL open tabs immediately (no waiting for page reload)
  self.clients.claim();
});

// ─── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 1. Navigation requests (HTML page) → NETWORK FIRST
  //    This ensures every fresh load gets the latest index.html with correct asset hashes
  //    Falls back to cached index.html only when completely offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // Cache a fresh copy while we're at it
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() =>
          // Offline fallback — serve cached index.html
          caches.match('/index.html').then((r) => r || caches.match('/'))
        )
    );
    return;
  }

  // 2. Hashed JS/CSS bundles (/assets/*.js, /assets/*.css) → CACHE FIRST
  //    Safe because Vite appends a content hash — same URL = same bytes forever
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // 3. Everything else (icons, manifest, fonts) → CACHE FIRST with network fallback
  e.respondWith(
    caches.match(e.request).then(
      (cached) => cached || fetch(e.request).catch(() => new Response('', { status: 408 }))
    )
  );
});

// ─── BROADCAST update to all tabs so they can auto-reload ──────────────────
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
  });
});
