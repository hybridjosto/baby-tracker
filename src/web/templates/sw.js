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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }
  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : "Feed due";
  const body = typeof payload.body === "string" && payload.body.trim()
    ? payload.body.trim()
    : "Time for a feed.";
  const url = typeof payload.url === "string" && payload.url.trim() ? payload.url.trim() : "./";
  const tag = typeof payload.tag === "string" && payload.tag.trim() ? payload.tag.trim() : "feed-due";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? new URL(event.notification.data.url, self.location.origin).toString()
    : new URL("./", self.location.origin).toString();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    }),
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
