---



contentType: recipes
slug: javascript-infinite-scroll-pagination
title: "JavaScript Infinite Scroll Pagination with"
description: "Implement scroll-based data loading in JavaScript with IntersectionObserver"
metaDescription: "Build infinite scroll pagination in JavaScript with IntersectionObserver, fetch API, loading states, and error handling for scroll-based data loading."
difficulty: intermediate
topics:
  - frontend
tags:
  - javascript
  - infinite-scroll
  - pagination
  - intersection-observer
  - lazy-loading
  - browser
relatedResources:
  - /recipes/javascript-localstorage-expiration
  - /recipes/javascript-drag-drop-file-upload
  - /recipes/javascript-clipboard-copy-paste
  - /guides/terraform-best-practices-guide
  - /patterns/eager-loading-pattern
  - /recipes/javascript-debounce-throttle-implementation
  - /recipes/javascript-service-worker-offline
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Build infinite scroll pagination in JavaScript with IntersectionObserver, fetch API, loading states, and error handling for scroll-based data loading."
  keywords:
    - javascript infinite scroll
    - intersection observer pagination
    - scroll based loading js
    - lazy load content javascript
    - infinite scroll implementation
    - javascript pagination observer



---

## Overview

Infinite scroll loads content automatically as the user scrolls down, eliminating pagination buttons. This recipe uses `IntersectionObserver` to detect when a sentinel element enters the viewport, then fetches the next page of data via the fetch API. Covers loading indicators, error handling, debounce, and cleanup.

## When to Use


- For alternatives, see [JavaScript Clipboard Copy and Paste](/recipes/javascript-clipboard-copy-paste/).

- You have a feed-style listing (social posts, search results, images) where pagination buttons hurt UX
- You want lazy-loading of content without a virtual scroll library
- You need to load data on demand as the user approaches the bottom of the page
- You are building a mobile-first interface where scroll is the primary navigation

## Solution

### Basic infinite scroll with IntersectionObserver

```javascript
const sentinel = document.getElementById("sentinel");
const container = document.getElementById("list");
let page = 1;
let loading = false;
let hasMore = true;

async function loadPage(pageNum) {
    const res = await fetch(`/api/items?page=${pageNum}`);
    const data = await res.json();
    return data;
}

function renderItems(items) {
    for (const item of items) {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.title;
        container.appendChild(div);
    }
}

const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && !loading && hasMore) {
        loading = true;
        page++;
        const data = await loadPage(page);
        renderItems(data.items);
        hasMore = data.hasMore;
        loading = false;
    }
});

observer.observe(sentinel);
```

### Complete infinite scroll with loading and error states

```javascript
class InfiniteScroll {
    constructor(options) {
        this.container = options.container;
        this.sentinel = options.sentinel;
        this.fetchUrl = options.fetchUrl;
        this.renderItem = options.renderItem;
        this.pageSize = options.pageSize ?? 10;
        this.threshold = options.threshold ?? 200;

        this.page = 1;
        this.loading = false;
        this.hasMore = true;
        this.observer = null;
    }

    init() {
        this.loadInitial();
        this.setupObserver();
    }

    async loadInitial() {
        this.showLoading();
        try {
            const data = await this.fetchPage(1);
            this.renderItems(data.items);
            this.hasMore = data.hasMore;
            this.page = 1;
        } catch (err) {
            this.showError("Failed to load initial data");
        }
        this.hideLoading();
    }

    setupObserver() {
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            { rootMargin: `${this.threshold}px` }
        );
        this.observer.observe(this.sentinel);
    }

    async handleIntersection(entries) {
        if (!entries[0].isIntersecting || this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoading();

        try {
            this.page++;
            const data = await this.fetchPage(this.page);
            this.renderItems(data.items);
            this.hasMore = data.hasMore;

            if (!this.hasMore) {
                this.observer.unobserve(this.sentinel);
                this.showEndMessage();
            }
        } catch (err) {
            this.page--;
            this.showError("Failed to load more items. Retrying...");
            setTimeout(() => { this.loading = false; }, 2000);
            return;
        }

        this.loading = false;
        this.hideLoading();
    }

    async fetchPage(pageNum) {
        const url = `${this.fetchUrl}?page=${pageNum}&limit=${this.pageSize}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        return res.json();
    }

    renderItems(items) {
        for (const item of items) {
            const element = this.renderItem(item);
            this.container.appendChild(element);
        }
    }

    showLoading() {
        let loader = document.getElementById("scroll-loader");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "scroll-loader";
            loader.className = "scroll-loader";
            loader.textContent = "Loading...";
            this.container.parentElement.appendChild(loader);
        }
        loader.style.display = "block";
    }

    hideLoading() {
        const loader = document.getElementById("scroll-loader");
        if (loader) loader.style.display = "none";
    }

    showError(message) {
        let error = document.getElementById("scroll-error");
        if (!error) {
            error = document.createElement("div");
            error.id = "scroll-error";
            error.className = "scroll-error";
            this.container.parentElement.appendChild(error);
        }
        error.textContent = message;
        error.style.display = "block";
        setTimeout(() => { error.style.display = "none"; }, 3000);
    }

    showEndMessage() {
        const end = document.createElement("div");
        end.className = "scroll-end";
        end.textContent = "No more items to load.";
        this.container.parentElement.appendChild(end);
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Usage
const scroll = new InfiniteScroll({
    container: document.getElementById("list"),
    sentinel: document.getElementById("sentinel"),
    fetchUrl: "/api/posts",
    renderItem: (post) => {
        const div = document.createElement("div");
        div.className = "post-card";
        div.innerHTML = `<h3>${post.title}</h3><p>${post.excerpt}</p>`;
        return div;
    },
    pageSize: 20,
    threshold: 300
});

scroll.init();

// Cleanup on page navigation
window.addEventListener("beforeunload", () => scroll.destroy());
```

### Scroll event with debounce fallback

```javascript
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

let page = 1;
let loading = false;
let hasMore = true;

const handleScroll = debounce(async () => {
    const scrollY = window.scrollY + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    if (scrollY >= docHeight - 300 && !loading && hasMore) {
        loading = true;
        page++;

        try {
            const res = await fetch(`/api/items?page=${page}`);
            const data = await res.json();
            renderItems(data.items);
            hasMore = data.hasMore;
        } catch (err) {
            page--;
            console.error("Load failed:", err);
        }

        loading = false;
    }
}, 150);

window.addEventListener("scroll", handleScroll);
```

### IntersectionObserver with React hook

```jsx
import { useEffect, useRef, useState, useCallback } from "react";

function useInfiniteScroll(fetchUrl) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef(null);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const res = await fetch(`${fetchUrl}?page=${page}`);
            const data = await res.json();
            setItems(prev => [...prev, ...data.items]);
            setHasMore(data.hasMore);
            setPage(prev => prev + 1);
        } catch (err) {
            console.error("Failed to load:", err);
        }
        setLoading(false);
    }, [fetchUrl, page, loading, hasMore]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { rootMargin: "300px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    return { items, loading, hasMore, sentinelRef };
}

// Usage in a component
function ItemList() {
    const { items, loading, hasMore, sentinelRef } = useInfiniteScroll("/api/items");

    return (
        <div>
            {items.map(item => (
                <div key={item.id} className="item-card">
                    {item.title}
                </div>
            ))}
            {loading && <p>Loading...</p>}
            {hasMore && <div ref={sentinelRef} style={{ height: "1px" }} />}
            {!hasMore && <p>No more items.</p>}
        </div>
    );
}
```

## Explanation

`IntersectionObserver` watches a target element (the sentinel) and fires a callback when it enters or exits the viewport. Place the sentinel at the bottom of the list. When it becomes visible, fetch the next page and append items.

Key concepts:

- **`rootMargin`**: Expands the observer's bounding box so it triggers before the sentinel is actually visible. Setting `rootMargin: "300px"` triggers loading when the user is 300px from the bottom, creating a smooth experience.
- **Loading guard**: The `loading` flag prevents duplicate fetches when multiple intersection events fire rapidly.
- **`hasMore` flag**: The API response should include a `hasMore` boolean. When false, disconnect the observer to stop further attempts.
- **Error recovery**: On fetch failure, decrement the page counter and allow retry. Show an error message with a delay before resetting the loading flag.
- **Cleanup**: Always call `observer.disconnect()` when the component unmounts or the user navigates away. This prevents memory leaks and phantom fetches.
- **Scroll event fallback**: For older browsers without `IntersectionObserver`, use a debounced `scroll` event listener checking `window.scrollY + window.innerHeight >= docHeight - threshold`.

## Variants

| Approach | Browser Support | Complexity | Use When |
|---------|-----------------|------------|----------|
| IntersectionObserver | Modern browsers | Low | Default choice |
| Scroll event + debounce | All browsers | Medium | Legacy support needed |
| React hook | React apps | Medium | React projects |
| Virtual scroll | All browsers | High | Very large lists (10k+ items) |

## Guidelines

- Use `IntersectionObserver` over scroll events for better performance.
- Set `rootMargin` to trigger loading before the user reaches the bottom (200-400px).
- Guard against duplicate fetches with a `loading` flag.
- Include a `hasMore` flag from the API to know when to stop.
- Disconnect the observer when done to prevent memory leaks.
- Show loading indicators and error messages for user feedback.
- Debounce scroll event handlers if using the fallback approach (100-200ms).
- Consider virtual scrolling for lists with thousands of items to avoid DOM bloat.

## Common Mistakes

- Not guarding against duplicate fetches. Multiple intersection events fire rapidly, causing redundant API calls.
- Not disconnecting the observer on unmount. This causes memory leaks and phantom fetches.
- Setting `rootMargin` to 0. The sentinel must be visible before loading triggers, creating a visible gap.
- Not handling fetch errors. The scroll stops working silently after a network failure.
- Appending thousands of items to the DOM without virtual scrolling. This degrades performance severely.
- Not including a `hasMore` flag. The observer keeps firing forever, making unnecessary API calls.

## Frequently Asked Questions

### How is IntersectionObserver better than scroll events?

`IntersectionObserver` runs outside the main thread's event loop, so it does not block scrolling. Scroll events fire on every pixel change and require manual throttling. `IntersectionObserver` is also simpler to set up with `rootMargin`.

### How do I prevent too many items in the DOM?

For lists with thousands of items, use virtual scrolling libraries like `react-window` or `vue-virtual-scroller`. These render only visible items plus a small buffer, keeping DOM nodes under 50 even for 100k items.

### What should the API response look like?

```json
{
    "items": [...],
    "page": 2,
    "hasMore": true,
    "total": 500
}
```

The `hasMore` flag tells the client whether to continue loading. The `total` is optional but useful for progress indicators.

### How do I handle rapid scrolling past the sentinel?

The `loading` flag prevents duplicate fetches. Even if the user scrolls past the sentinel multiple times, only one fetch runs at a time. The observer does not re-fire while the sentinel remains visible — it only fires on intersection state changes.
