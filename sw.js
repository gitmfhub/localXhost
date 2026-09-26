const CACHE_NAME = 'localxhost-cache-v2';
const CORE_ASSETS = [
  '/localXhost/',
  '/localXhost/index.html',
  '/localXhost/manifest.json',
  'https://gitmfhub.github.io/localXhost/asset/images/localxhost1-1.jpg'
];

// تثبيت: خزّن الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(err => console.warn('[SW] Pre-cache failed:', err))
  );
  self.skipWaiting();
});

// تفعيل: احذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// جلب: Cache First مع تحديث في الخلفية (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // تجاهل طلبات chrome-extension وغيرها
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(networkRes => {
          // خزّن نسخة محدثة
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => cached); // في حال فشل الشبكة، أرجع الكاش

      return cached || fetchPromise;
    })
  );
});

// رسائل من التطبيق (اختياري)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
