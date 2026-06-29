---
contentType: guides
slug: progressive-web-apps-guide
title: "Progressive Web Apps (PWA) — Guía Completa"
description: "Guía completa para construir Progressive Web Apps: service workers, soporte offline, Web App Manifest, notificaciones push e instalabilidad."
metaDescription: "Construye Progressive Web Apps con service workers, soporte offline, Web App Manifest, notificaciones push e instalabilidad. Guía PWA completa."
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
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Construye Progressive Web Apps con service workers, soporte offline, Web App Manifest, notificaciones push e instalabilidad. Guía PWA completa."
  keywords:
    - pwa
    - progressive-web-apps
    - service-worker
    - offline
    - web-app-manifest
    - push-notifications
    - installability
    - guia
---

## Visión General

Las Progressive Web Apps (PWA) usan capacidades web modernas para ofrecer una experiencia similar a una app: acceso offline, notificaciones push, instalación en la pantalla de inicio y sincronización en segundo plano. A diferencia de las apps nativas, funcionan en el navegador y no requieren aprobación de una tienda de apps. Esta guía cubre las tecnologías principales y lo que funciona para construir PWAs de producción.

## Cuándo Usar

- Necesitas funcionalidad offline para una aplicación web
- Quieres reducir la fricción de las tiendas de apps mientras proporcionas UX similar a nativa
- Tus usuarios están en móviles con conectividad intermitente
- Necesitas notificaciones push sin construir apps nativas separadas
- Quieres mejorar el engagement con prompts de agregar a pantalla de inicio

## Tecnologías Principales

| Tecnología | Propósito | Capacidad Clave |
|------------|-----------|---------------------|
| **Service Worker** | Proxy en segundo plano para solicitudes de red | Caché offline, sincronización en segundo plano |
| **Web App Manifest** | Describe metadatos de la app para instalación | Iconos, modo de visualización, color del tema |
| **HTTPS** | Requisito de origen seguro para capacidades PWA | Requerido para service workers |
| **Push API** | Mensajes iniciados por el servidor | Re-engagement de usuarios incluso cuando la app está cerrada |
| **Background Sync** | Diferir acciones hasta que la conectividad regrese | Encolar envíos de formularios offline |

## Service Workers

### Registro

Registra el service worker al iniciar la app.

```javascript
// main.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registrado:', registration.scope);
    } catch (error) {
      console.error('Fallo en registro de SW:', error);
    }
  });
}
```

### Estrategias de Caché

Elige la estrategia correcta para cada tipo de recurso.

```javascript
// sw.js — Caché-Primero para assets estáticos
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

### Resumen de Estrategias de Caché

| Estrategia | Mejor Para | Comportamiento |
|------------|-----------|---------------|
| Caché Primero | Assets estáticos (CSS, JS, imágenes) | Servir desde caché; fallback a red |
| Red Primero | Documentos HTML, llamadas API | Intentar red primero; fallback a caché |
| Stale-While-Revalidate | Contenido frecuentemente actualizado | Servir versión en caché; refrescar en segundo plano |
| Solo Red | Datos en tiempo real (chat, precios) | Siempre obtener de la red |
| Solo Caché | App shell pre-cacheada | Nunca consultar la red |

## Web App Manifest

El manifest habilita agregar a pantalla de inicio y define la experiencia de la app.

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

## Experiencia Offline

### Patrón de Página Offline

Muestra una página offline personalizada en lugar de la predeterminada del navegador.

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

### Sincronización en Segundo Plano

Encola acciones realizadas offline y reintenta cuando la conectividad regresa.

```javascript
// Encolar una sincronización en segundo plano
async function submitForm(data) {
  try {
    await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
  } catch {
    // Guardar en IndexedDB y registrar para sincronización
    await db.syncQueue.add(data);
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('submit-form');
  }
}

// Service Worker maneja el evento de sincronización
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-form') {
    event.waitUntil(processSyncQueue());
  }
});
```

## Notificaciones Push

### Suscribirse a Push

```javascript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Enviar suscripción al servidor
  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}
```

### Mostrar Notificaciones

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
        { action: 'open', title: 'Abrir App' },
        { action: 'dismiss', title: 'Descartar' }
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

## Prompt de Instalación

Prompt a los usuarios para instalar la PWA en navegadores compatibles.

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
    console.log('Usuario instaló la PWA');
  }
  deferredPrompt = null;
}
```

## Pruebas y Depuración

| Herramienta | Propósito |
|-------------|-----------|
| Chrome DevTools > Application | Inspeccionar service workers, manifests, cachés |
| Lighthouse | Auditar cumplimiento PWA |
| WebPageTest | Probar comportamiento offline en dispositivos reales |
| ngrok | Probar funciones que requieren HTTPS localmente |
| Workbox | Librería para simplificar patrones de service worker |

## Errores Comunes

- **No manejar actualizaciones de caché** — los usuarios pueden ver contenido obsoleto indefinidamente
- **Cachear respuestas de API sin versionado** — datos obsoletos después de despliegues
- **Ignorar cuotas de almacenamiento** — los navegadores pueden eliminar tu caché
- **Sobre-cachear contenido en vivo** — usa Red Primero para datos específicos del usuario
- **Faltar HTTPS** — service workers y push requieren un origen seguro

## FAQ

**Las PWAs funcionan en iOS?**
Sí, pero con limitaciones: Safari soporta service workers y agregar a pantalla de inicio, pero las notificaciones push solo están disponibles en iOS 16.4+ para PWAs instaladas.

**Cuánto código agrega una PWA?**
El service worker y el manifest típicamente pesan menos de 5KB. Librerías de terceros como Workbox agregan ~20KB pero manejan casos edge por ti.

**Una PWA puede reemplazar mi app nativa?**
Para apps enfocadas en contenido o moderadamente interactivas, sí. Para juegos, AR/VR pesado o integración profunda con hardware, las apps nativas aún tienen ventajas.
