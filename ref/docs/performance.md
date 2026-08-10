# Rendimiento (Performance) — StackPractices

> Optimizaciones, objetivos de Core Web Vitals, y estrategia de performance.

---

## 1. Objetivos de Core Web Vitals

| Metrica | Objetivo | Estado |
|---------|----------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | Pendiente medir |
| INP (Interaction to Next Paint) | < 200ms | Pendiente medir |
| CLS (Cumulative Layout Shift) | < 0.1 | Pendiente medir |
| TTFB (Time to First Byte) | < 600ms | Bueno (GitHub Pages CDN) |
| FCP (First Contentful Paint) | < 1.8s | Pendiente medir |

---

## 2. Estrategia de Performance

### 2.1 Static Site Generation (SSG)

- Todo el HTML se genera en build time
- Sin queries a base de datos en runtime
- Sin SSR que anada latencia
- CDN sirve archivos estaticos pre-generados

### 2.2 Zero JavaScript by Default

Astro envia 0KB de JavaScript para componentes estaticos. El unico JS cargado es:
- Google Analytics (gtag.js)
- Google Tag Manager
- Pagefind (busqueda estatica, carga bajo demanda)
- Cookie banner (JS vanilla inline)
- Copy code buttons (JS vanilla inline)

### 2.3 HTML Minificado

```js
// astro.config.mjs
compressHTML: true
```

### 2.4 CSS Optimizado

- Tailwind v4 genera solo las clases usadas
- CSS se minifica en build
- `cssCodeSplit: true` para code splitting

---

## 3. Optimizaciones de Imagenes

### 3.1 Astro Image (cuando se implemente)

Astro 5 incluye `@astrojs/image` o `astro:assets` para:
- Conversion a WebP/AVIF
- Generacion de srcset responsivo
- Lazy loading automatico

### 3.2 Imagenes Actuales

- `og-image.png`: 1200x630px, optimizada manualmente
- `favicon.svg`: SVG vectorial, sin costo de peso
- Hero background: CSS gradients (0 bytes de imagen)

### 3.3 Checklist de Imagenes

- [ ] Comprimir antes de subir
- [ ] Usar formato WebP cuando sea posible
- [ ] Anadir `width` y `height` para evitar CLS
- [ ] Usar `loading="lazy"` para imagenes below-fold

---

## 4. Fuentes Web

### 4.1 Inter y JetBrains Mono

Actualmente cargadas via Google Fonts o local. Estrategia recomendada:

```css
/* Preconnect a dominios de fuentes */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

/* Font display swap para no bloquear render */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  /* ... */
}
```

### 4.2 Subsetting

Cargar solo los subsets necesarios:
- `latin` para contenido en ingles
- `latin-ext` si se incluyen caracteres especiales

---

## 5. Scripts de Terceros

### 5.1 Carga Condicional

| Script | Carga | Condicion |
|--------|-------|-----------|
| GA4 | Async | Siempre (despues de consent default denied) |
| GTM | Async | Siempre |
| AdSense | Condicional | Solo si `ad_storage === 'granted'` |
| Pagefind | Bajo demanda | Solo cuando usuario abre busqueda |

### 5.2 Async y Defer

Todos los scripts externos usan `async` para no bloquear parsing.

---

## 6. Caché y CDN

### 6.1 GitHub Pages CDN

- Distribucion global via Fastly CDN
- Cache automatico de assets estaticos
- No se puede configurar headers custom

### 6.2 Service Worker (Futuro)

Para cache offline de contenido critico:
```js
// Cache first para assets estaticos
// Network first para contenido dinamico
```

---

## 7. Metricas de Referencia

### 7.1 Bundle Size

| Asset | Tamano estimado |
|-------|-----------------|
| HTML medio | ~15-25 KB |
| CSS (Tailwind) | ~8-12 KB (minified) |
| GA4 (gtag.js) | ~30 KB (cached) |
| Pagefind (lazy) | ~50 KB (solo al buscar) |
| Total first load | < 100 KB (sin imagenes) |

### 7.2 Lighthouse Targets

| Categoria | Objetivo |
|-----------|----------|
| Performance | > 90 |
| Accessibility | > 95 |
| Best Practices | > 90 |
| SEO | 100 |

---

## 8. Monitoring

### 8.1 Google PageSpeed Insights

URL: https://pagespeed.web.dev/

Verificar mensualmente:
- Core Web Vitals movil y desktop
- Opportunities de optimizacion
- Diagnostics

### 8.2 Chrome DevTools

- Performance tab para profiling
- Lighthouse panel para audit
- Network tab para verificar carga condicional

### 8.3 Web Vitals Extension

Extension de Chrome para monitoreo en tiempo real durante desarrollo.

---

## 9. Optimizaciones Futuras

- [ ] Implementar `astro:assets` para imagenes
- [ ] Anadir resource hints (`preload`, `prefetch`)
- [ ] Implementar service worker con Workbox
- [ ] Critical CSS inlining para above-the-fold
- [ ] Preconnect a dominios de terceros
- [ ] Lazy load iframes y embeds
- [ ] HTTP/2 server push (si el hosting lo soporta)
