const CACHE = 'socksort-v2'; // bumped version — invalidates old cached HTML

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache Firebase, Cloudinary, API calls, fonts — always network
  if (url.includes('firebase') || url.includes('cloudinary') ||
      url.includes('anthropic') || url.includes('googleapis') ||
      url.includes('gstatic')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // For HTML/JS/CSS — NETWORK FIRST so updates are always picked up.
  // Only fall back to cache if offline.
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
