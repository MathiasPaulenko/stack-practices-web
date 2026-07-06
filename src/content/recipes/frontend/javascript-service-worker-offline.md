---
contentType: recipes
slug: javascript-service-worker-offline
title: "JavaScript Service Worker Offline Caching for PWA"
description: "Cache assets for offline PWA support with Service Workers and Cache API"
metaDescription: "Implement offline support in JavaScript with Service Workers, Cache API, stale-while-revalidate, and background sync for progressive web apps."
difficulty: intermediate
topics:
  - frontend
tags:
  - javascript
  - service-worker
  - pwa
  - offline
  - cache-api
  - progressive-web-app
relatedResources:
  - /recipes/javascript-infinite-scroll-pagination
  - /recipes/javascript-localstorage-expiration
  - /recipes/javascript-drag-drop-file-upload
  - /guides/terraform-best-practices-guide
  - /patterns/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implement offline support in JavaScript with Service Workers, Cache API, stale-while-revalidate, and background sync for progressive web apps."
  keywords:
    - javascript service worker
    - pwa offline caching
    - cache api javascript
    - service worker install activate
    - stale while revalidate sw
    - progressive web app offline
---

## Overview

Service Workers enable offline support by intercepting network requests and serving cached responses. The solution below covers registering a service worker, caching strategies (cache-first, network-first, stale-while-revalidate), cache cleanup, and background sync for progressive web apps.

## When to Use

- You want your web app to work offline or on flaky connections
- You need to cache static assets (JS, CSS, images) for instant load on repeat visits
- You are building a PWA and need offline data access
- You want to reduce server load by serving cached responses

## Solution

### Register a service worker

```javascript
// main.js
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => console.log("SW registered:", reg.scope))
            .catch((err) => console.error("SW registration failed:", err));
    });
}
```

### Cache-first strategy for static assets

```javascript
// sw.js
const CACHE_NAME = "app-v1";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/styles.css",
    "/app.js",
    "/offline.html",
    "/favicon.ico"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request)
                .then((response) => {
                    if (!response || response.status !== 200) return response;

                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });

                    return response;
                })
                .catch(() => {
                    if (event.request.mode === "navigate") {
                        return caches.match("/offline.html");
                    }
                });
        })
    );
});
```

### Stale-while-revalidate strategy

```javascript
// sw.js
const CACHE_NAME = "swr-v1";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cached) => {
                const fetchPromise = fetch(event.request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => cached);

                return cached || fetchPromise;
            });
        })
    );
});
```

### Network-first for API data with cache fallback

```javascript
// sw.js
const API_CACHE = "api-v1";
const STATIC_CACHE = "static-v1";

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== "GET") return;

    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        if (cached) return cached;
                        return new Response(
                            JSON.stringify({ error: "Offline" }),
                            { headers: { "Content-Type": "application/json" } }
                        );
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                const clone = response.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(() => caches.match("/offline.html"));
        })
    );
});
```

### Cache cleanup on activation

```javascript
self.addEventListener("activate", (event) => {
    const allowedCaches = ["static-v2", "api-v2"];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!allowedCaches.includes(cacheName)) {
                        console.log("Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
```

### Background sync for offline form submission

```javascript
// main.js
async function submitForm(data) {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        await storeFormData(data);
        reg.sync.register("submit-form");
    } else {
        await fetch("/api/submit", {
            method: "POST",
            body: JSON.stringify(data)
        });
    }
}

// sw.js
self.addEventListener("sync", (event) => {
    if (event.tag === "submit-form") {
        event.waitUntil(replayFormSubmission());
    }
});

async function replayFormSubmission() {
    const stored = await getStoredFormData();
    for (const data of stored) {
        try {
            await fetch("/api/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            await removeStoredFormData(data.id);
        } catch (err) {
            throw err;
        }
    }
}
```

## Explanation

Service Workers run in a separate thread and act as a programmable network proxy between the web app and the network. They intercept every fetch request and decide whether to serve from cache, fetch from network, or return a fallback.

Lifecycle:

- **Install**: Fired when the SW is first registered. Pre-cache critical static assets with `cache.addAll()`. Call `skipWaiting()` to activate immediately.
- **Activate**: Fired after install completes. Clean up old caches by deleting any cache not in the allowlist. Call `clients.claim()` to take control of open tabs immediately.
- **Fetch**: Fired for every network request. Choose a caching strategy based on the request type.
- **Sync**: Fired when background sync is registered and the browser has connectivity. Used to replay failed requests.

Caching strategies:

- **Cache-first**: Check cache first. If found, return cached. Otherwise fetch, cache, and return. Best for static assets that rarely change.
- **Network-first**: Try network first. If it fails, fall back to cache. Best for API data where freshness matters.
- **Stale-while-revalidate**: Return cached immediately if available, but fetch a fresh copy in the background to update the cache. Best for assets that update frequently but can tolerate stale reads.

## Variants

| Strategy | Best For | Freshness | Offline |
|---------|----------|-----------|---------|
| Cache-first | Static assets (CSS, JS, fonts) | Low | Full |
| Network-first | API data, dynamic content | High | Fallback |
| Stale-while-revalidate | Images, fonts, frequent updates | Medium | Full |
| Cache-only | Offline pages | None | Full |
| Network-only | Analytics, non-cacheable | High | None |

## Guidelines

- Pre-cache only critical assets during install (app shell, offline page). Keep the list small.
- Use cache-first for static assets and network-first for API data.
- Clean up old caches on activate to avoid exceeding storage limits.
- Always handle the `fetch` event with `event.respondWith()` to prevent the browser default.
- Skip non-GET requests in the fetch handler (POST, PUT, DELETE should go to network).
- Provide an offline fallback page for navigation requests.
- Version your cache names (e.g., `static-v1`, `static-v2`) to force updates.
- Use `skipWaiting()` and `clients.claim()` for immediate activation during development.

## Common Mistakes

- Not versioning cache names. Users get stuck with old cached content that never updates.
- Caching too much during install. Large pre-cache lists slow down installation and may fail.
- Not handling navigation requests separately. Users see a blank page instead of an offline fallback.
- Caching POST responses. Only cache GET requests; POST responses are not idempotent.
- Not cleaning up old caches. Storage grows indefinitely and hits browser limits.
- Forgetting to call `event.respondWith()`. The browser falls through to network, bypassing the SW.
- Serving opaque responses incorrectly. Cross-origin responses with `type: "opaque"` cannot be inspected.

## Frequently Asked Questions

### How do I force the service worker to update?

Bump the cache version (e.g., `static-v1` to `static-v2`). The browser detects the new SW file, installs it, and on activation the old cache is deleted. Users get the new content after closing all tabs and reopening.

### Can service workers access localStorage?

No. Service Workers cannot access `localStorage` or `window`. Use the Cache API or IndexedDB for storage within the service worker context.

### How do I debug a service worker?

Use Chrome DevTools > Application > Service Workers. You can see registered SWs, manually unregister, update on reload, and bypass for network. The Console tab shows SW logs.

### What is the difference between skipWaiting and clients.claim?

`skipWaiting()` tells the waiting SW to activate immediately, bypassing the normal wait for all tabs to close. `clients.claim()` makes the active SW take control of all open tabs immediately. Use both together for instant updates during development.
