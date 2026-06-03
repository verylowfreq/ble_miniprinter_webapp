const CACHE_NAME = "ble-miniprinter-v1";
const APP_ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./app-icon.svg",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    const isAppShellRequest =
        event.request.mode === "navigate" ||
        (url.origin === self.location.origin &&
            (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")));

    event.respondWith(
        (isAppShellRequest ? fetch(event.request) : caches.match(event.request))
            .then((response) => {
                if (response) {
                    if (url.origin === self.location.origin) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                }
                return fetch(event.request);
            })
            .then((networkResponse) => {
                if (url.origin === self.location.origin) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                if (isAppShellRequest) {
                    return caches.match("./index.html");
                }
                return caches.match(event.request);
            }),
    );
});
