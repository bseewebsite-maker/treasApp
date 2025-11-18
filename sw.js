const CACHE_NAME = 'treasapp-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css', // Assuming you have a stylesheet
  '/app.js',     // Assuming you have a main JavaScript file
  '/icon.svg',
  '/manifest.json'
];

// Install the service worker and cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        return response || fetch(event.request);
      })
  );
});