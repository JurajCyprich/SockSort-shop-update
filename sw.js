const CACHE = 'socksort-v3'; // bumped again — fixes the Response TypeError bug

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
  // Only handle GET requests — POST/PUT etc must always go to network untouched
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Never intercept Firebase, Cloudinary, Anthropic, Google APIs/fonts, or auth popups —
  // just let the browser handle these directly.
  if (url.includes('firebase') || url.includes('cloudinary') ||
      url.includes('anthropic') || url.includes('googleapis') ||
      url.includes('gstatic') || url.includes('google.com') ||
      url.includes('accounts.google')) {
    return; // do not call respondWith — browser handles it normally
  }

  // Network first, cache as fallback. Always guarantee a valid Response.
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Only cache successful, basic (same-origin) responses
        if (resp && resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(()=>{});
        }
        return resp;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        // No cache available either — return a safe placeholder instead of undefined
        return new Response('Offline a stránka nie je uložená v cache.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
