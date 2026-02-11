const STATIC_VERSION = "{{ static_version }}";
const CACHE_NAME = `baby-tracker-shell-${STATIC_VERSION}`;
const PRECACHE_URLS = [
  "./",
  "./log",
  "./summary",
  "./timeline",
  "./calendar",
  "./calendar/add",
  "./goals",
  "./settings",
  "./sw.js",
  `./static/app.js?v=${STATIC_VERSION}`,
  `./static/styles.css?v=${STATIC_VERSION}`,
  "./static/manifest.json",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "SKIP_WAITING") {
    return;
  }
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((resp) => resp || caches.match("./"))),
    );
    return;
  }
  const url = new URL(request.url);
  if (url.pathname.includes("/static/") || url.pathname.endsWith("/apple-touch-icon.png")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => null);
        if (cached) {
          return cached;
        }
        return fetchPromise.then((response) => response || caches.match(request));
      }),
    );
  }
});
