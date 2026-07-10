---
contentType: recipes
slug: javascript-localstorage-expiration
title: "JavaScript LocalStorage with TTL Expiration"
description: "Store data with TTL expiration in browser localStorage"
metaDescription: "Implement TTL-based expiration in JavaScript localStorage. Wrapper functions for setItem, getItem with automatic cleanup, JSON serialization, and storage limits."
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
  - /guides/terraform-best-practices-guide
  - /patterns/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implement TTL-based expiration in JavaScript localStorage. Wrapper functions for setItem, getItem with automatic cleanup, JSON serialization, and storage limits."
  keywords:
    - javascript localstorage ttl
    - localstorage expiration
    - localstorage with timeout
    - browser storage caching
    - localstorage wrapper
    - javascript cache expiry
---

## Overview

`localStorage` stores data permanently with no built-in expiration. This recipe wraps localStorage with TTL (time-to-live) support so entries auto-expire after a set duration. It covers set/get with expiration, automatic cleanup, JSON serialization, and handling storage quota limits.

## When to Use

- You need client-side caching with automatic expiration (e.g., API responses)
- You want to store user preferences that reset after a period
- You are building an offline-first app and need stale-while-revalidate patterns
- You want session-like storage that survives page reloads but not indefinitely

## Solution

### Basic localStorage with TTL

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

// Usage: cache for 5 minutes
storage.set("api-data", { users: [1, 2, 3] }, 5 * 60 * 1000);
const data = storage.get("api-data");
console.log(data);
```

### Storage wrapper with cleanup and JSON support

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
            const item = JSON.parse(item);

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

// Cache API response for 10 minutes
cache.set("users", [{ id: 1, name: "Alice" }], 10 * 60 * 1000);
const users = cache.get("users", []);
```

### Stale-while-revalidate pattern

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

// Usage: serve fresh for 1 min, stale for 5 more min
swr.set("config", { theme: "dark" }, 60000, 300000);

async function getConfig() {
    const { data, stale, expired } = swr.get("config");

    if (expired) {
        const fresh = await fetch("/api/config").then(r => r.json());
        swr.set("config", fresh, 60000, 300000);
        return fresh;
    }

    if (stale) {
        // Return stale immediately, fetch fresh in background
        fetch("/api/config")
            .then(r => r.json())
            .then(fresh => swr.set("config", fresh, 60000, 300000));
        return data;
    }

    return data;
}
```

### Periodic cleanup on page load

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
            // Not a TTL entry, skip
        }
    }
}

// Run cleanup on page load
window.addEventListener("DOMContentLoaded", cleanupExpiredEntries);

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
```

## Explanation

localStorage has no native TTL. The approach is to wrap each value in a metadata object containing `expiry` (a timestamp). On read, check if `Date.now()` exceeds `expiry`. If so, remove the entry and return null.

Key considerations:

- **Serialization**: localStorage only stores strings. JSON.stringify/parse handles objects. Double-serialization (value inside the metadata object) ensures the value itself can be any JSON-compatible type.
- **Quota limits**: Browsers typically allow 5-10 MB per origin. When quota is exceeded, a `QuotaExceededError` is thrown. Running cleanup before retrying can free space.
- **Cleanup strategy**: Expired entries are only removed when accessed (lazy cleanup). For active cleanup, run a periodic scan or clean on page load.
- **Stale-while-revalidate**: Serve stale data immediately while fetching fresh data in the background. This improves perceived performance.
- **Prefixing**: Using a prefix (e.g., `app:`) avoids collisions with other code using localStorage on the same origin.

## Variants

| Approach | Complexity | Features | Use When |
|----------|-----------|----------|----------|
| Basic TTL | Low | Set/get with expiry | Simple caching needs |
| TTLStorage class | Medium | Cleanup, quota handling, prefix | Production apps |
| SWR pattern | High | Stale data serving, background refresh | API response caching |
| Periodic cleanup | Low | Auto-remove expired entries | Long-running sessions |

## Guidelines

- Always wrap values with an expiry timestamp. Never store raw values without TTL.
- Use a prefix to namespace your entries and avoid collisions.
- Handle `QuotaExceededError` by running cleanup and retrying.
- Run cleanup on page load to remove expired entries from previous sessions.
- Use stale-while-revalidate for API response caching to improve UX.
- Do not store sensitive data (tokens, passwords) in localStorage. Use sessionStorage or cookies.
- Keep TTL values reasonable. Very long TTLs defeat the purpose of expiration.
- Double-serialize values to support any JSON-compatible type inside the metadata wrapper.

## Common Mistakes

- Storing raw values without expiry metadata. Data persists forever.
- Not handling `QuotaExceededError`. The app crashes when storage is full.
- Using the same key across different features. Data gets overwritten.
- Not running cleanup. Expired entries accumulate and waste storage.
- Storing large objects in localStorage. It has a 5-10 MB limit per origin.
- Storing sensitive data like JWT tokens. localStorage is accessible via XSS.

## Frequently Asked Questions

### How much data can I store in localStorage?

Most browsers allow 5-10 MB per origin. The exact limit varies. Always handle `QuotaExceededError` and clean up expired entries to stay within limits.

### Should I use localStorage or sessionStorage?

Use `localStorage` for data that should persist across sessions (e.g., user preferences, cached API responses). Use `sessionStorage` for data that should clear when the tab closes (e.g., form drafts, temporary state).

### How do I handle private browsing mode?

In private browsing, `localStorage.setItem()` may throw `QuotaExceededError` even for small data. Always wrap setItem in try/catch and provide a fallback (e.g., in-memory Map).

### Can I use IndexedDB instead for larger data?

Yes. IndexedDB supports much larger storage (hundreds of MB) and handles structured data better. Use IndexedDB for complex offline-first apps. Use localStorage with TTL for simple key-value caching.

### How do I sync localStorage across tabs?

Use the `storage` event listener. When one tab writes to localStorage, other tabs receive a `StorageEvent` with the key, old value, and new value. This enables cross-tab synchronization without polling or WebSockets.
