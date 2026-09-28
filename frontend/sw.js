const CACHE_NAME = 'ndrf-sos-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/citizen_app.html',
  '/command_center.html',
  '/govt_portal.html',
  '/css/styles.css',
  '/js/i18n.js',
  '/js/ndrf_directory.js',
  '/js/mesh_network.js',
  '/js/citizen_app.js',
  '/js/command_center.js',
  '/js/govt_portal.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching NDRF Emergency App Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback for offline API sync
        if (event.request.url.includes('/api/')) {
          return new Response(JSON.stringify({ offline: true, message: "Operating in offline BLE mesh mode" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });
    })
  );
});
