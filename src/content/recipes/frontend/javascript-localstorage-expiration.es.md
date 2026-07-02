---
contentType: recipes
slug: javascript-localstorage-expiration
title: "LocalStorage con Expiración TTL en JavaScript"
description: "Almacena datos con expiración TTL en el localStorage del navegador"
metaDescription: "Implementa expiración TTL en localStorage de JavaScript con wrappers, limpieza automática, serialización JSON y manejo de cuota."
difficulty: beginner
topics:
  - frontend
tags:
  - javascript
  - localstorage
  - ttl
  - caching
  - browser
  - storage
relatedResources:
  - /recipes/javascript-clipboard-copy-paste
  - /recipes/javascript-drag-drop-file-upload
  - /recipes/javascript-infinite-scroll-pagination
  - /guides/frontend-best-practices
  - /patterns/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implementa expiración TTL en localStorage de JavaScript con wrappers, limpieza automática, serialización JSON y manejo de cuota."
  keywords:
    - javascript localstorage ttl
    - localstorage expiration
    - localstorage with timeout
    - browser storage caching
    - localstorage wrapper
    - javascript cache expiry
---

## Visión General

`localStorage` almacena datos permanentemente sin expiración incorporada. Esta recipe envuelve localStorage con soporte TTL (time-to-live) para que las entradas auto-expiren tras una duración establecida. Cubre set/get con expiración, limpieza automática, serialización JSON y manejo de límites de cuota.

## Cuándo Usar

- Necesitas caché del lado del cliente con expiración automática (ej., respuestas de API)
- Quieres almacenar preferencias de usuario que se resetean tras un período
- Estás construyendo una app offline-first y necesitas patrones stale-while-revalidate
- Quieres almacenamiento tipo sesión que sobreviva recargas pero no indefinidamente

## Solución

### localStorage básico con TTL

```javascript
const storage = {
    set(key, value, ttlMs = 60000) {
        const item = {
            value,
            expiry: Date.now() + ttlMs
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    get(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        try {
            const item = JSON.parse(raw);

            if (Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }

            return item.value;
        } catch (err) {
            localStorage.removeItem(key);
            return null;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
    }
};

// Uso: cachear por 5 minutos
storage.set("api-data", { users: [1, 2, 3] }, 5 * 60 * 1000);
const data = storage.get("api-data");
console.log(data);
```

### Wrapper de storage con limpieza y soporte JSON

```javascript
class TTLStorage {
    constructor(prefix = "ttl:") {
        this.prefix = prefix;
    }

    set(key, value, ttlMs = 300000) {
        const fullKey = this.prefix + key;
        const item = {
            value: JSON.stringify(value),
            expiry: Date.now() + ttlMs,
            created: Date.now()
        };

        try {
            localStorage.setItem(fullKey, JSON.stringify(item));
            return true;
        } catch (err) {
            if (err.name === "QuotaExceededError") {
                this.cleanup();
                try {
                    localStorage.setItem(fullKey, JSON.stringify(item));
                    return true;
                } catch (err2) {
                    console.error("Storage quota exceeded even after cleanup");
                    return false;
                }
            }
            console.error("Failed to set item:", err);
            return false;
        }
    }

    get(key, fallback = null) {
        const fullKey = this.prefix + key;
        const raw = localStorage.getItem(fullKey);

        if (!raw) return fallback;

        try {
            const item = JSON.parse(raw);

            if (Date.now() > item.expiry) {
                localStorage.removeItem(fullKey);
                return fallback;
            }

            return JSON.parse(item.value);
        } catch (err) {
            localStorage.removeItem(fullKey);
            return fallback;
        }
    }

    has(key) {
        return this.get(key, undefined) !== undefined;
    }

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }

    cleanup() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));

        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            try {
                const item = JSON.parse(raw);
                if (Date.now() > item.expiry) {
                    localStorage.removeItem(key);
                }
            } catch (err) {
                localStorage.removeItem(key);
            }
        }
    }

    clearAll() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
        keys.forEach(key => localStorage.removeItem(key));
    }

    size() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
        return keys.length;
    }
}

const cache = new TTLStorage("app:");

// Cachear respuesta de API por 10 minutos
cache.set("users", [{ id: 1, name: "Alice" }], 10 * 60 * 1000);
const users = cache.get("users", []);
```

### Patrón stale-while-revalidate

```javascript
class SWRStorage {
    constructor(prefix = "swr:") {
        this.prefix = prefix;
    }

    set(key, value, ttlMs = 60000, staleMs = 300000) {
        const item = {
            value: JSON.stringify(value),
            expiry: Date.now() + ttlMs,
            staleUntil: Date.now() + ttlMs + staleMs
        };
        localStorage.setItem(this.prefix + key, JSON.stringify(item));
    }

    get(key) {
        const raw = localStorage.getItem(this.prefix + key);
        if (!raw) return { data: null, stale: false, expired: true };

        try {
            const item = JSON.parse(raw);
            const now = Date.now();

            if (now > item.expiry) {
                if (now > item.staleUntil) {
                    localStorage.removeItem(this.prefix + key);
                    return { data: null, stale: false, expired: true };
                }
                return { data: JSON.parse(item.value), stale: true, expired: false };
            }

            return { data: JSON.parse(item.value), stale: false, expired: false };
        } catch (err) {
            localStorage.removeItem(this.prefix + key);
            return { data: null, stale: false, expired: true };
        }
    }
}

const swr = new SWRStorage();

// Uso: servir fresco por 1 min, stale por 5 min más
swr.set("config", { theme: "dark" }, 60000, 300000);

async function getConfig() {
    const { data, stale, expired } = swr.get("config");

    if (expired) {
        const fresh = await fetch("/api/config").then(r => r.json());
        swr.set("config", fresh, 60000, 300000);
        return fresh;
    }

    if (stale) {
        // Retornar stale inmediatamente, fetch fresco en background
        fetch("/api/config")
            .then(r => r.json())
            .then(fresh => swr.set("config", fresh, 60000, 300000));
        return data;
    }

    return data;
}
```

### Limpieza periódica al cargar la página

```javascript
function cleanupExpiredEntries() {
    const keys = Object.keys(localStorage);

    for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
            const item = JSON.parse(raw);
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
            }
        } catch (err) {
            // No es una entrada TTL, saltar
        }
    }
}

// Ejecutar limpieza al cargar la página
window.addEventListener("DOMContentLoaded", cleanupExpiredEntries);

// Ejecutar limpieza cada 5 minutos
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
```

## Explicación

localStorage no tiene TTL nativo. El enfoque es envolver cada valor en un objeto de metadatos conteniendo `expiry` (un timestamp). Al leer, verificar si `Date.now()` excede `expiry`. Si es así, remover la entrada y retornar null.

Consideraciones clave:

- **Serialización**: localStorage solo almacena strings. JSON.stringify/parse maneja objetos. La doble serialización (valor dentro del objeto de metadatos) asegura que el valor mismo pueda ser cualquier tipo compatible con JSON.
- **Límites de cuota**: Los navegadores suelen permitir 5-10 MB por origen. Cuando se excede la cuota, se lanza `QuotaExceededError`. Ejecutar limpieza antes de reintentar puede liberar espacio.
- **Estrategia de limpieza**: Las entradas expiradas solo se eliminan al acceder (limpieza lazy). Para limpieza activa, ejecutar un escaneo periódico o limpiar al cargar la página.
- **Stale-while-revalidate**: Servir datos stale inmediatamente mientras se obtienen datos frescos en background. Esto mejora el rendimiento percibido.
- **Prefijos**: Usar un prefijo (ej., `app:`) evita colisiones con otro código que use localStorage en el mismo origen.

## Variantes

| Enfoque | Complejidad | Features | Usar Cuando |
|---------|------------|----------|-------------|
| TTL básico | Baja | Set/get con expiración | Necesidades simples de caché |
| Clase TTLStorage | Media | Limpieza, manejo de cuota, prefijo | Apps en producción |
| Patrón SWR | Alta | Datos stale, refresh en background | Caché de respuestas API |
| Limpieza periódica | Baja | Auto-eliminar expirados | Sesiones largas |

## Pautas

- Siempre envolver valores con un timestamp de expiración. Nunca almacenar valores raw sin TTL.
- Usar un prefijo para namespacar tus entradas y evitar colisiones.
- Manejar `QuotaExceededError` ejecutando limpieza y reintentando.
- Ejecutar limpieza al cargar la página para remover entradas expiradas de sesiones previas.
- Usar stale-while-revalidate para caché de respuestas API y mejorar UX.
- No almacenar datos sensibles (tokens, passwords) en localStorage. Usar sessionStorage o cookies.
- Mantener valores TTL razonables. TTLs muy largos derrotan el propósito de la expiración.
- Doble-serializar valores para soportar cualquier tipo compatible con JSON dentro del wrapper.

## Errores Comunes

- Almacenar valores raw sin metadatos de expiración. Los datos persisten para siempre.
- No manejar `QuotaExceededError`. La app crashea cuando el storage está lleno.
- Usar la misma key entre diferentes features. Los datos se sobreescriben.
- No ejecutar limpieza. Las entradas expiradas se acumulan y desperdician storage.
- Almacenar objetos grandes en localStorage. Tiene un límite de 5-10 MB por origen.
- Almacenar datos sensibles como JWT tokens. localStorage es accesible vía XSS.

## Preguntas Frecuentes

### ¿Cuántos datos puedo almacenar en localStorage?

La mayoría de los navegadores permiten 5-10 MB por origen. El límite exacto varía. Siempre maneja `QuotaExceededError` y limpia entradas expiradas para mantenerse dentro de los límites.

### ¿Debería usar localStorage o sessionStorage?

Usa `localStorage` para datos que deben persistir entre sesiones (ej., preferencias de usuario, respuestas de API cacheadas). Usa `sessionStorage` para datos que deben limpiarse al cerrar la pestaña (ej., borradores de formularios, estado temporal).

### ¿Cómo manejo el modo de navegación privada?

En navegación privada, `localStorage.setItem()` puede lanzar `QuotaExceededError` incluso para datos pequeños. Siempre envuelve setItem en try/catch y provee un fallback (ej., un Map en memoria).

### ¿Puedo usar IndexedDB para datos más grandes?

Sí. IndexedDB soporta almacenamiento mucho mayor (cientos de MB) y maneja datos estructurados mejor. Usa IndexedDB para apps offline-first complejas. Usa localStorage con TTL para caché simple key-value.
