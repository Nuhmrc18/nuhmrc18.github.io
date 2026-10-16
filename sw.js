const CACHE = 'cep-dosya-static-v11';
const SHELL = ['./', './index.html', './style.css', './app.js', './offline.html', './manifest.webmanifest', './icon.svg?v=3'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.protocol === 'blob:') return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && request.destination !== 'document' && !url.pathname.endsWith('/')) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match('./offline.html');
    return Response.error();
  }));
});





