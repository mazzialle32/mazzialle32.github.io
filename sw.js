/* Tasca: service worker. Con rete prende sempre la versione più recente (aspetta al massimo 3 secondi);
   senza rete, o con segnale debole, usa la copia salvata. Se aggiorni i file, cambia la versione qui sotto. */
const CACHE = 'tasca-v7';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req.url, { cache: 'no-cache' })
      .then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    try {
      return await Promise.race([
        net,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
    } catch (err) {
      e.waitUntil(net.catch(() => null));
      const hit = (await cache.match(req, { ignoreSearch: true })) ||
                  (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
      return hit || Response.error();
    }
  })());
});
