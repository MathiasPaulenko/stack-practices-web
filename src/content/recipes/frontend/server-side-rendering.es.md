---
contentType: recipes
slug: server-side-rendering
title: "Server-Side Rendering"
description: "Mejora performance y SEO con server-side rendering usando Next.js, Nuxt, Astro y otros frameworks con estrategias de hydration."
metaDescription: "Guía de server-side rendering: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering y optimización de performance para SEO y Core Web Vitals."
difficulty: intermediate
topics:
  - frontend
tags:
  - server-side-rendering
  - frontend
relatedResources:
  - /patterns/mvc-pattern-frontend
  - /recipes/url-encoding-decoding
  - /recipes/email-templates-mjml
  - /recipes/websockets-realtime
  - /recipes/spa-code-splitting-lazy
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Guía de server-side rendering: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering y optimización de performance para SEO y Core Web Vitals."
  keywords:
    - server-side-rendering
    - frontend
    - nextjs
    - astro
---
## Visión General

El server-side rendering (SSR) genera HTML en el servidor para cada request, enviando una página completamente renderizada al navegador. Esto mejora la carga inicial de página, [SEO](/guides/performance/performance-optimization-guide) y previews de social sharing. Frameworks modernos como Next.js, Nuxt y Astro combinan SSR con hydration del lado del cliente para entregar first paints rápidos e experiencias interactivas sin sacrificar crawlability.

## Cuándo Usar

Usa este recurso cuando:
- Construyes sitios con mucho contenido que dependen de indexación por motores de búsqueda
- El sharing social requiere previews de Open Graph precisos
- Usuarios en redes lentas necesitan contenido significativo inmediatamente
- SPAs con mucho JavaScript tienen malos scores de [Core Web Vitals](/recipes/performance/web-performance)

## Solución

### Next.js App Router con Streaming SSR

```tsx
// app/page.tsx
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 60 }
  });
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <h1>Products</h1>
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name} — ${p.price}</li>
        ))}
      </ul>
    </main>
  );
}
```

### Astro Islands Architecture

```astro
---
// Server-rendered at build time or on request
const response = await fetch('https://api.example.com/stats');
const stats = await response.json();
---

<html>
  <body>
    <h1>Dashboard</h1>
    <!-- HTML estático, server-rendered -->
    <p>Total Users: {stats.users}</p>

    <!-- Island interactiva se hidrata en el cliente -->
    <LiveChart client:load data={stats.chart} />
  </body>
</html>
```

### Nuxt 3 SSR con Hybrid Rendering

```vue
<script setup>
const { data: posts } = await useFetch('/api/posts', {
  server: true,   // Render en servidor
  default: () => []
});
</script>

<template>
  <div>
    <h1>Blog</h1>
    <article v-for="post in posts" :key="post.id">
      <h2>{{ post.title }}</h2>
      <p>{{ post.excerpt }}</p>
    </article>
  </div>
</template>
```

## Explicación

**Cómo funciona la hydration**:
1. El servidor renderiza HTML completo y lo envía al navegador
2. El navegador muestra el contenido inmediatamente (LCP rápido)
3. El bundle de JavaScript carga y "hidrata" la página
4. Los event listeners se adjuntan; los componentes se vuelven interactivos

**SSR vs. SSG vs. CSR**:

| Estrategia | Tiempo de Render | Caso de Uso |
|------------|-----------------|-------------|
| SSR | Por request | Datos dinámicos; contenido personalizado |
| SSG | Build time | Contenido estático; máxima cacheabilidad |
| CSR | Lado del cliente | Dashboards altamente interactivos; SPAs |
| ISR | Híbrido | Sitios de noticias; catálogos de productos |

## Variantes

| Framework | Enfoque | Destacado |
|-----------|---------|-----------|
| Next.js | SSR + SSG + ISR | React; optimización Vercel |
| Nuxt | SSR + SSG | Vue; routing file-based |
| Astro | Islands | Zero JS por default; hydration parcial |
| SvelteKit | SSR + CSR | Svelte; edge-ready |
| Remix | SSR + progressive enhancement | Forms funcionan sin JS |

## Mejores Prácticas

- **Usa streaming para datos lentos**: Suspense boundaries permiten que UI crítica renderice mientras datos cargan
- **Evita hydration mismatches**: El HTML del servidor y cliente debe coincidir exactamente
- **Serializa estado mínimo**: Solo pasa datos que el cliente necesita; evita full database dumps
- **Cachea responses de SSR**: [CDN caching](/recipes/data/caching) con `stale-while-revalidate` reduce carga del servidor
- **Lazy-load below-fold**: Usa `client:visible` (Astro) o dynamic imports para interactividad no crítica

## Errores Comunes

1. **Hidratar todo**: No todo componente necesita ser interactivo; la arquitectura de islands ahorra JS
2. **Blocking en APIs lentas**: Una query de base de datos de 5 segundos retrasa toda la página; usa streaming
3. **Ignorar memory leaks**: Cada request de SSR crea nuevas instancias de componentes; limpia suscripciones
4. **Sin error boundaries**: Crashes de SSR deberían retornar una página estática degradada, no un 500
5. **Over-cachear contenido dinámico**: Cachear SSG dashboards personalizados muestra datos incorrectos al usuario equivocado

## Preguntas Frecuentes

**P: ¿SSR perjudica el performance?**
R: Mejora la carga inicial pero agrega costo de servidor. Usa SSG o ISR para contenido que no cambia por usuario.

**P: ¿Puedo usar SSR con un headless CMS?**
R: Sí. Obtén datos del CMS durante SSR; el CMS solo sirve la API, no la página renderizada.

**P: ¿Cuál es la diferencia entre SSR y hydration?**
R: SSR produce HTML en el servidor. La hydration hace ese HTML estático interactivo en el cliente.
