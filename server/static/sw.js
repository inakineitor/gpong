const cacheKey = 'PongCache_v1';

// Assets to precache
const precachedAssets = [
  '/fonts/bit5x3/bit5x3.ttf',
  '/fonts/bit5x3/bit5x3.woff',
  '/fonts/bit5x3/bit5x3.woff2',
  '/index.html',
  '/index.js',
  '/style.css',
];

self.addEventListener('install', (event) => {
  console.log('I HAVE BEEN INSTALLED');

  // Precache assets on install
  event.waitUntil(
    caches.open(cacheKey).then((cache) => {
      return cache.addAll(precachedAssets);
    }),
  );
});

self.addEventListener('activate', (event) => {
  console.log('I HAVE BEEN ACTIVATED');

  // Specify allowed cache keys
  const cacheAllowList = [cacheKey];

  // Get all the currently active `Cache` instances.
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete all caches that aren't in the allow list:
      return Promise.all(
        keys.map((key) => {
          if (!cacheAllowList.includes(key)) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
});

self.addEventListener('fetch', (event) => {
  // Is this one of our precached assets?
  const url = new URL(event.request.url);
  const isPrecachedRequest = precachedAssets.includes(url.pathname);

  console.log(url);

  if (isPrecachedRequest) {
    console.log(`Responding from cache: ${event.request.url}`);
    // Grab the precached asset from the cache
    event.respondWith(
      caches.open(cacheKey).then((cache) => {
        return cache.match(event.request.url);
      }),
    );
  } else {
    // Go to the network
    return;
  }
});
