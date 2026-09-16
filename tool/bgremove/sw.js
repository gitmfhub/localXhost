/* Service Worker — BgRemove / localXhost
   Strategy:
   - App shell (HTML, manifest, icons): cache-first with network fallback
   - Same-origin images / assets: stale-while-revalidate
   - Everything else: network with cache fallback
*/

const CACHE_VERSION = 'bgremove-v1';
const RUNTIME_CACHE = 'bgremove-runtime-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  'https://gitmfhub.github.io/localXhost/tool/bgremove/icon.jpg'
];

/* Install: pre-cache app shell */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Activate: clean old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: routing */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isImage = req.destination === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
  const isShell = sameOrigin && (
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('manifest.json')
  );

  /* App shell: cache-first */
  if(isShell){
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  /* Images: stale-while-revalidate */
  if(isImage){
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if(res && res.status === 200){
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  /* Everything else: network with cache fallback */
  event.respondWith(
    fetch(req).then((res) => {
      if(res && res.status === 200 && sameOrigin){
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
