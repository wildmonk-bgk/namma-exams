/* Offline support for all decks. Network first (so edits show up), cache as fallback.
   Every file a deck loads is cached the first time it is opened online. */
const CACHE = 'namma-exams-v4';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './engine/deck.css', './engine/deck.js', './engine/perfect-freehand.js', './engine/youtube.js',
  './engine/icons/mark.png', './engine/icons/icon-180.png', './engine/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http') || req.headers.has('range')) return;
  e.respondWith(new URL(req.url).hostname === 'fonts.gstatic.com' ? cacheFirst(req) : networkFirst(req));
});

function put(req, res) {
  if (res.ok || res.type === 'opaque') caches.open(CACHE).then(c => c.put(req, res));
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  // Same-origin files are revalidated every time, so edited decks never show stale.
  const same = new URL(req.url).origin === self.location.origin;
  const net = (same ? fetch(req.url, { cache: 'no-cache' }) : fetch(req)).then(res => { put(req, res.clone()); return res; });
  net.catch(() => {});
  try {
    const first = await Promise.race([net, new Promise(r => setTimeout(r, 4000, 'slow'))]);
    if (first !== 'slow') return first;
  } catch (_) {}
  return (await caches.match(req)) || net;
}
