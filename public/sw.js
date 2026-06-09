const CACHE_NAME = 'uk-voice-tts-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // HuggingFace model/config files — immutable, cache first
  if (url.hostname.includes('huggingface.co')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Same-origin requests
  if (url.origin === self.location.origin) {
    // HTML navigation — network first so app updates are picked up
    if (event.request.mode === 'navigate') {
      event.respondWith(networkFirst(event.request));
      return;
    }
    // JS, CSS, WASM, ONNX runtime — cache first (filenames are hashed)
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
