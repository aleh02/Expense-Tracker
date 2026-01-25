const CACHE_NAME = 'expense-tracker-v1';

const PRECACHE_URLS = ['/', 'index/html', 'offline.html'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        //precache
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    //cleanup old caches
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    //only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    //navigation req, network-first, fallback to offline.html
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/offline.html'))
        );
        return;
    }

    //static assets, cache-first then network
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;

            return fetch(req).then((res) => {
                //cache successful responses
                if (res.ok) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                }
                return res;
            });
        })
    );
});