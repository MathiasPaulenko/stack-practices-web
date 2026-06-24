---
contentType: guides
slug: progressive-web-apps-guide
title: "Progressive Web Apps (PWA) — Complete Guide"
description: "A comprehensive guide to building Progressive Web Apps: service workers, offline support, Web App Manifest, push notifications, and installability."
metaDescription: "Build Progressive Web Apps with service workers, offline support, Web App Manifest, push notifications, and installability. Complete PWA guide."
difficulty: intermediate
topics:
  - frontend
tags:
  - pwa
  - progressive-web-apps
  - service-worker
  - offline
  - web-app-manifest
  - push-notifications
  - installability
  - guide
relatedResources:
  - /guides/accessibility-wcag-guide
  - /guides/web-components-guide
  - /patterns/design/circuit-breaker-pattern
  - /recipes/frontend/implement-accessible-modal
  - /recipes/frontend/build-responsive-layout
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Build Progressive Web Apps with service workers, offline support, Web App Manifest, push notifications, and installability. Complete PWA guide."
  keywords:
    - pwa
    - progressive-web-apps
    - service-worker
    - offline
    - web-app-manifest
    - push-notifications
    - installability
    - guide
---

## Overview

Progressive Web Apps (PWA) use modern web capabilities to deliver an app-like experience: offline access, push notifications, home screen installation, and background sync. Unlike native apps, they run in the browser and require no app store approval. This guide covers the core technologies and best practices for building production PWAs.

## When to Use

- You need offline functionality for a web application
- You want to reduce app store friction while providing native-like UX
- Your users are on mobile with intermittent connectivity
- You need push notifications without building separate native apps
- You want to improve engagement with add-to-home-screen prompts

## Core Technologies

| Technology | Purpose | Key Feature |
|------------|---------|-------------|
| **Service Worker** | Background proxy for network requests | Offline caching, background sync |
| **Web App Manifest** | Describes app metadata for installation | Icons, display mode, theme color |
| **HTTPS** | Secure origin requirement for PWA features | Required for service workers |
| **Push API** | Server-initiated messages | Re-engage users even when app is closed |
| **Background Sync** | Defer actions until connectivity returns | Queue form submissions offline |

## Service Workers

### Registration

Register the service worker at app startup.

```javascript
// main.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}
```

### Cache Strategies

Choose the right strategy for each resource type.

```javascript
// sw.js — Cache-First for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request));
  } else if (event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached || fetch(request).then(response => {
    caches.open('v1').then(cache => cache.put(request, response.clone()));
    return response;
  });
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open('v1');
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    return caches.match(request);
  }
}
```

### Cache Strategies Summary

| Strategy | Best For | Behavior |
|----------|----------|----------|
| Cache First | Static assets (CSS, JS, images) | Serve from cache; fall back to network |
| Network First | HTML documents, API calls | Try network first; fall back to cache |
| Stale-While-Revalidate | Frequently updated content | Serve cached version; refresh in background |
| Network Only | Real-time data (chat, stock prices) | Always fetch from network |
| Cache Only | Pre-cached app shell | Never hit the network |

## Web App Manifest

The manifest enables add-to-home-screen and defines the app experience.

```json
{
  "name": "Task Manager Pro",
  "short_name": "Tasks",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "screenshots": [
    { "src": "/screenshot-1.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide" },
    { "src": "/screenshot-2.png", "sizes": "750x1334", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

## Offline Experience

### Offline Page Pattern

Show a custom offline page instead of the browser default.

```javascript
// sw.js
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_PAGE))
    );
  }
});
```

### Background Sync

Queue actions performed offline and retry when connectivity returns.

```javascript
// Queue a background sync
async function submitForm(data) {
  try {
    await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
  } catch {
    // Save to IndexedDB and register for sync
    await db.syncQueue.add(data);
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('submit-form');
  }
}

// Service Worker handles the sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-form') {
    event.waitUntil(processSyncQueue());
  }
});
```

## Push Notifications

### Subscribe to Push

```javascript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Send subscription to server
  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}
```

### Display Notifications

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
```

## Install Prompt

Prompt users to install the PWA on supported browsers.

```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('User installed PWA');
  }
  deferredPrompt = null;
}
```

## Testing and Debugging

| Tool | Purpose |
|------|---------|
| Chrome DevTools > Application | Inspect service workers, manifests, caches |
| Lighthouse | Audit PWA compliance |
| WebPageTest | Test offline behavior on real devices |
| ngrok | Test HTTPS-required features locally |
| Workbox | Library for simplifying service worker patterns |

## Common Mistakes

- **Not handling cache updates** — users may see stale content indefinitely
- **Caching API responses without versioning** — stale data after deployments
- **Ignoring storage quotas** — browsers may evict your cache
- **Over-caching dynamic content** — use Network First for user-specific data
- **Missing HTTPS** — service workers and push require a secure origin

## FAQ

**Do PWAs work on iOS?**
Yes, but with limitations: Safari supports service workers and add-to-home-screen, but push notifications are only available in iOS 16.4+ for installed PWAs.

**How much code does a PWA add?**
The service worker and manifest are typically under 5KB. Third-party libraries like Workbox add ~20KB but handle edge cases for you.

**Can a PWA replace my native app?**
For content-focused or moderately interactive apps, yes. For games, heavy AR/VR, or deep hardware integration, native apps still have advantages.
