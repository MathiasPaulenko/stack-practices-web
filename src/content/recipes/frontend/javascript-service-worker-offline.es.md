---
contentType: recipes
slug: javascript-service-worker-offline
title: "Service Worker Offline Caching para PWA en JavaScript"
description: "Cachéa assets para soporte offline PWA con Service Workers y Cache API"
metaDescription: "Implementa soporte offline en JavaScript con Service Workers, Cache API, stale-while-revalidate y background sync para PWAs."
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
  metaDescription: "Implementa soporte offline en JavaScript con Service Workers, Cache API, stale-while-revalidate y background sync para PWAs."
  keywords:
    - javascript service worker
    - pwa offline caching
    - cache api javascript
    - service worker install activate
    - stale while revalidate sw
    - progressive web app offline
---

## Visión General

Los Service Workers habilitan soporte offline interceptando peticiones de red y sirviendo respuestas cacheadas. Esta recipe cubre el registro de un service worker, estrategias de caché (cache-first, network-first, stale-while-revalidate), limpieza de caché y background sync para progressive web apps.

## Cuándo Usar

- Quieres que tu web app funcione offline o en conexiones inestables
- Necesitas cachear assets estáticos (JS, CSS, imágenes) para carga instantánea en visitas repetidas
- Estás construyendo una PWA y necesitas acceso a datos offline
- Quieres reducir la carga del servidor sirviendo respuestas cacheadas

## Solución

### Registrar un service worker

```javascript
// main.js
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => console.log("SW registrado:", reg.scope))
            .catch((err) => console.error("Error al registrar SW:", err));
    });
}
```

### Estrategia cache-first para assets estáticos

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

### Estrategia stale-while-revalidate

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

### Network-first para datos de API con fallback a caché

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

### Limpieza de caché en la activación

```javascript
self.addEventListener("activate", (event) => {
    const allowedCaches = ["static-v2", "api-v2"];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!allowedCaches.includes(cacheName)) {
                        console.log("Eliminando caché antigua:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
```

### Background sync para envío de formularios offline

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

## Explicación

Los Service Workers se ejecutan en un hilo separado y actúan como un proxy de red programable entre la web app y la red. Interceptan cada petición fetch y deciden si servir desde caché, obtener de la red, o devolver un fallback.

Ciclo de vida:

- **Install**: Se dispara cuando el SW se registra por primera vez. Pre-cachea assets estáticos críticos con `cache.addAll()`. Llama `skipWaiting()` para activar inmediatamente.
- **Activate**: Se dispara después de que install completa. Limpia cachés antiguas eliminando cualquier caché que no esté en la lista permitida. Llama `clients.claim()` para tomar control de las pestañas abiertas inmediatamente.
- **Fetch**: Se dispara para cada petición de red. Elegir una estrategia de caché según el tipo de petición.
- **Sync**: Se dispara cuando background sync se registra y el navegador tiene conectividad. Usado para reintentar peticiones fallidas.

Estrategias de caché:

- **Cache-first**: Verifica caché primero. Si encuentra, devuelve cacheado. Si no, obtiene, cachea y devuelve. Mejor para assets estáticos que rara vez cambian.
- **Network-first**: Intenta red primero. Si falla, recurre a caché. Mejor para datos de API donde la frescura importa.
- **Stale-while-revalidate**: Devuelve cacheado inmediatamente si disponible, pero obtiene una copia fresca en background para actualizar la caché. Mejor para assets que se actualizan frecuentemente pero toleran lecturas stale.

## Variantes

| Estrategia | Mejor Para | Frescura | Offline |
|---------|----------|-----------|---------|
| Cache-first | Assets estáticos (CSS, JS, fuentes) | Baja | Completa |
| Network-first | Datos de API, contenido dinámico | Alta | Fallback |
| Stale-while-revalidate | Imágenes, fuentes, updates frecuentes | Media | Completa |
| Cache-only | Páginas offline | Ninguna | Completa |
| Network-only | Analítica, no-cacheable | Alta | Ninguna |

## Pautas

- Pre-cachear solo assets críticos durante install (app shell, página offline). Mantener la lista pequeña.
- Usar cache-first para assets estáticos y network-first para datos de API.
- Limpiar cachés antiguas en activate para evitar exceder límites de almacenamiento.
- Siempre manejar el evento `fetch` con `event.respondWith()` para prevenir el comportamiento por defecto del navegador.
- Saltar peticiones non-GET en el fetch handler (POST, PUT, DELETE deben ir a la red).
- Proveer una página fallback offline para peticiones de navegación.
- Versionar los nombres de caché (ej., `static-v1`, `static-v2`) para forzar updates.
- Usar `skipWaiting()` y `clients.claim()` para activación inmediata durante desarrollo.

## Errores Comunes

- No versionar los nombres de caché. Los usuarios quedan atrapados con contenido cacheado antiguo que nunca se actualiza.
- Cachear demasiado durante install. Listas grandes de pre-cache ralentizan la instalación y pueden fallar.
- No manejar peticiones de navegación separadamente. Los usuarios ven una página en blanco en lugar de un fallback offline.
- Cachear respuestas POST. Solo cachear peticiones GET; las respuestas POST no son idempotentes.
- No limpiar cachés antiguas. El almacenamiento crece indefinidamente y alcanza límites del navegador.
- Olvidar llamar `event.respondWith()`. El navegador pasa a la red, saltando el SW.
- Servir respuestas opacas incorrectamente. Las respuestas cross-origin con `type: "opaque"` no pueden inspeccionarse.

## Preguntas Frecuentes

### ¿Cómo fuerzo la actualización del service worker?

Incrementa la versión de caché (ej., `static-v1` a `static-v2`). El navegador detecta el nuevo archivo SW, lo instala, y en la activación la caché antigua se elimina. Los usuarios obtienen el nuevo contenido tras cerrar todas las pestañas y reabrir.

### ¿Pueden los service workers acceder a localStorage?

No. Los Service Workers no pueden acceder a `localStorage` ni `window`. Usa la Cache API o IndexedDB para almacenamiento dentro del contexto del service worker.

### ¿Cómo depuro un service worker?

Usa Chrome DevTools > Application > Service Workers. Puedes ver los SWs registrados, desregistrar manualmente, actualizar al recargar, y bypass para red. La pestaña Console muestra los logs del SW.

### ¿Cuál es la diferencia entre skipWaiting y clients.claim?

`skipWaiting()` le dice al SW en espera que se active inmediatamente, saltándose la espera normal de que todas las pestañas se cierren. `clients.claim()` hace que el SW activo tome control de todas las pestañas abiertas inmediatamente. Usa ambos juntos para updates instantáneos durante desarrollo.

### ¿Cómo pruebo el comportamiento offline?

Usa Chrome DevTools > Application > Service Workers > checkbox Offline. Esto simula sin red. También prueba con "Update on reload" habilitado para forzar updates del SW en cada page load. Para testing automatizado, usa Playwright con `context.setOffline(true)`.
