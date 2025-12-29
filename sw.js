const CACHE_NAME = 'asset-tracker-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // 立即激活新SW
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // 立即接管所有页面
});

// Fetch event - NETWORK FIRST for app files, cache as fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip WebSocket
  if (url.protocol === 'wss:' || url.protocol === 'ws:') return;

  // API requests - network only (no cache)
  if (url.hostname.includes('binance.com') ||
      url.hostname.includes('okx.com') ||
      url.hostname.includes('bitget.com') ||
      url.hostname.includes('mexc.com') ||
      url.hostname.includes('geckoterminal.com') ||
      url.hostname.includes('gtimg.cn') ||
      url.hostname.includes('tradingview.com')) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App files - NETWORK FIRST, then cache as fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // 成功获取网络响应，更新缓存
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 网络失败，使用缓存
        return caches.match(request);
      })
  );
});
