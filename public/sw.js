/**
 * FileFix Service Worker (v1.0.0)
 * Enables 100% offline functionality, cache-first vendor scripts, and PWA installation.
 */

const CACHE_NAME = 'unfumble-cache-v7';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/vendor/pdf-lib.min.js',
  '/vendor/jszip.min.js',
  '/vendor/lucide.min.js',
  '/js/app.js',
  '/js/operations/registry.js',
  '/js/operations/pdf-ops.js',
  '/js/operations/image-ops.js',
  '/js/operations/file-ops.js',
  '/js/operations/data-ops.js',
  '/js/workflow/engine.js',
  '/js/workflow/nlp-parser.js',
  '/js/workflow/templates.js',
  '/js/workflow/share.js',
  '/js/smartfix/smartfix.js',
  '/js/ui/dynamic-tool.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache item missed (will cache dynamically):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Vendor scripts and icons: Cache-First
  if (url.pathname.startsWith('/vendor/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: Network-First so updates appear immediately on reload, with offline cache fallback
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // App code and pages: Stale-While-Revalidate with offline fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback to index.html if navigating
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      return cached || fetchPromise;
    })
  );
});
