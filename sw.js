const CACHE_NAME = 'cryptonative-cache-v1';
const urlsToCache = [
  '/',
  'https://gitmfhub.github.io/mfrepo/manifest.json',
  'https://gitmfhub.github.io/mfrepo/asset/cryptonativelogo.png'
];

// تثبيت الخدمة وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// اعتراض طلبات الشبكة لتشغيل المدونة أوفلاين
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إذا وجد الملف مخزناً، يتم إرجاعه فوراً أوفلاين، وإلا يتم جلبه من الشبكة وتخزينه
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // في حال انقطاع الإنترنت تماماً وعدم توفر الصفحة في الذاكرة المؤقتة
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
