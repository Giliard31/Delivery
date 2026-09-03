const CACHE_NAME = 'delivery-pwa-v1';
const urlsToCache = [
  './',
  './Meudelivery2.html',
  './manifest.json'
];

// Instala o service worker e guarda os arquivos básicos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta as requisições para o app funcionar de forma rápida e leve
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});