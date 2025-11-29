
const CACHE_NAME = 'treasapp-cache-v9-offline-ready';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  // Local Source Files
  './index.tsx',
  './App.tsx',
  './types.ts',
  './constants.ts',
  './hooks/useLocalStorage.ts',
  './hooks/useTheme.ts',
  './components/BottomNav.tsx',
  './components/NetworkStatus.tsx',
  './components/AddCollectionModal.tsx',
  './components/RemitModal.tsx',
  './components/AddStudentModal.tsx',
  './components/ExportModal.tsx',
  './components/EditStudentModal.tsx',
  './components/CopyPaymentsModal.tsx',
  './components/ImportStudentsModal.tsx',
  './components/StudentPaymentDetailModal.tsx',
  './components/CollectionFormComponents.tsx',
  './components/CashOnHandBreakdownModal.tsx',
  './components/icons/NavIcons.tsx',
  './components/icons/ExtraIcons.tsx',
  './components/icons/StatusIcons.tsx',
  './contexts/StudentsContext.tsx',
  './contexts/CollectionsContext.tsx',
  './contexts/RemittedCollectionsContext.tsx',
  './contexts/ArchivedCollectionsContext.tsx',
  './contexts/ProfileContext.tsx',
  './contexts/ValueSetsContext.tsx',
  './contexts/HistoryContext.tsx',
  './screens/CollectionScreen.tsx',
  './screens/RemittedScreen.tsx',
  './screens/FundsScreen.tsx',
  './screens/StudentsScreen.tsx',
  './screens/MenuScreen.tsx',
  './screens/CollectionDetailScreen.tsx',
  './screens/ArchivedScreen.tsx',
  './screens/ProfileScreen.tsx',
  './screens/AddCollectionScreen.tsx',
  './screens/EditCollectionScreen.tsx',
  './screens/HistoryScreen.tsx',
  // External Initial Scripts 
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
  // React Dependencies from Import Map
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0'
];

let isCaching = false;

// Helper to send messages to all clients
async function sendMessageToClients(msg) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
        client.postMessage(msg);
    });
}

// Reusable function to perform caching
async function cacheResources() {
    isCaching = true;
    const cache = await caches.open(CACHE_NAME);
    const total = URLS_TO_CACHE.length;
    let current = 0;

    // Sequential loading to report progress accurately
    for (const url of URLS_TO_CACHE) {
        try {
            // cache: 'reload' ensures we download fresh content from network
            const response = await fetch(url, { cache: 'reload' }); 
            if (!response.ok) throw new Error(`Status ${response.status}`);
            await cache.put(url, response);
        } catch (err) {
            console.warn(`Failed to cache ${url}:`, err);
        }
        current++;
        // Send progress for each file
        await sendMessageToClients({ type: 'CACHE_PROGRESS', current, total });
    }

    isCaching = false;
    await sendMessageToClients({ type: 'CACHE_COMPLETE' });
    console.log('Caching resources complete.');
}

self.addEventListener('install', event => {
  self.skipWaiting(); // Force this SW to become active immediately
  event.waitUntil(cacheResources());
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Become available to all pages immediately
    .then(() => {
        // Notify clients after activation/claim to ensure they know we are ready
        return sendMessageToClients({ type: 'CACHE_COMPLETE' });
    })
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
        // Network fetch promise for Stale-While-Revalidate
        const fetchPromise = fetch(event.request).then(networkResponse => {
           // Check if we received a valid response
           if(networkResponse && (networkResponse.status === 200 || networkResponse.status === 0) && networkResponse.type !== 'error') {
               // Clone and put in cache
               const responseClone = networkResponse.clone();
               caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
           }
           return networkResponse;
        }).catch(err => {
            // If we have a cached response, a network failure is fine (offline mode).
            // If we DO NOT have a cached response, we must throw the error so the browser shows a network error.
            if (!cachedResponse) {
                throw err;
            }
        });

        // Return cached response right away if we have it, 
        // otherwise wait for network fetch.
        return cachedResponse || fetchPromise;
    })
  );
});

// Listen for messages from the client
self.addEventListener('message', event => {
    if (event.data) {
        if (event.data.type === 'CHECK_FOR_UPDATES') {
            self.registration.update();
        } else if (event.data.type === 'CACHE_RESOURCES') {
            // Manually trigger the caching process
            cacheResources();
        } else if (event.data.type === 'CHECK_OFFLINE_READY') {
            // Check if we have assets cached and aren't currently busy caching
            if (!isCaching) {
                caches.open(CACHE_NAME).then(cache => {
                    cache.keys().then(keys => {
                        // If we have keys, we assume the app is substantially cached.
                        if (keys.length > 0) {
                            // Notify the specific client that asked
                            event.source.postMessage({ type: 'CACHE_COMPLETE' });
                        } else {
                            // If empty, trigger cache
                            cacheResources();
                        }
                    });
                });
            } else {
               // If currently caching, do nothing, the progress events will handle it
            }
        }
    }
});