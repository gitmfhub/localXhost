/* sw.js — localXhost-bgRemove Service Worker */

const CACHE_NAME = 'bgremove-v1';

/* الملفات التي سيتم تخزينها مسبقًا */
const PRECACHE_URLS = [
  '/localXhost/tool/bgremove/index.html',
  '/localXhost/tool/bgremove/manifest.json',
  '/localXhost/asset/images/localxhost16-9.png'
];

/* التثبيت: تخزين الملفات الأساسية */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* التفعيل: حذف الإصدارات القديمة من الكاش */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* الجلب: استراتيجية Cache-First مع fallback للشبكة */
self.addEventListener('fetch', (event) => {
  /* تجاهل الطلبات غير GET */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        /* لا تخزن الاستجابات غير الصالحة */
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        /* عند فشل الشبكة وطلب التنقل، أعد index.html */
        if (event.request.mode === 'navigate') {
          return caches.match('/localXhost/tool/bgremove/index.html');
        }
      });
    })
  );
});
