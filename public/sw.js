/* Mi Vestuario App service worker
 * Offline shell, network intercept, push, background sync.
 */
const CACHE = "mi-vestuario-v1";
const PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/icon-16.png",
  "/icon-48.png",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.svg",
  "/widgets/next-match-template.json",
  "/widgets/next-match-data.json",
];

function isViteInternal(url) {
  return (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.includes("/.vite/") ||
    url.pathname.endsWith(".tsx") ||
    url.pathname.endsWith(".ts")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isViteInternal(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const copy = fresh.clone();
    const cache = await caches.open(CACHE);
    cache.put(request, copy);
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    if (offline) return offline;
    return new Response("Mi Vestuario App está sin conexión.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("push", (event) => {
  let payload = { title: "Mi Vestuario App", body: "Hay novedades del plantel." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Mi Vestuario App", {
      body: payload.body || "Hay novedades del plantel.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      lang: "es-AR",
      tag: payload.tag || "vestuario-push",
      data: payload.data || { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(openOrFocus(target));
});

self.addEventListener("sync", (event) => {
  if (
    event.tag === "vestuario-sync" ||
    event.tag === "vestuario-chat" ||
    event.tag === "cancha-fija-sync" ||
    event.tag === "cancha-fija-chat"
  ) {
    event.waitUntil(flushPending(event.tag));
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "vestuario-refresh" || event.tag === "cancha-fija-refresh") {
    event.waitUntil(flushPending(event.tag));
  }
});

async function flushPending(tag) {
  const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({ type: "vestuario-sync", tag });
  }
  return Promise.resolve();
}

async function openOrFocus(path) {
  const url = new URL(path, self.location.origin).href;
  const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientsList) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client && client.url !== url) await client.navigate(url);
      return;
    }
  }
  await self.clients.openWindow(url);
}

self.addEventListener("widgetclick", (event) => {
  event.waitUntil(openOrFocus("/"));
});

self.addEventListener("widgetinstall", (event) => {
  event.waitUntil(self.registration.showNotification("Mi Vestuario App", {
    body: "El widget del próximo partido quedó en el panel.",
    icon: "/icon-192.png",
    tag: "vestuario-widget",
  }));
});
