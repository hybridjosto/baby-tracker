const CACHE_NAME = "baby-tracker-shell-v2";
const PRECACHE_URLS = [
  "./",
  "./log",
  "./summary",
  "./timeline",
  "./goals",
  "./settings",
  "./sw.js",
  "./static/app.js",
  "./static/styles.css",
  "./static/manifest.json",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))),
      ),
    ),
  );
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
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
