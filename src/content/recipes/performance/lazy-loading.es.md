---
contentType: recipes
slug: lazy-loading
title: "Implementar Lazy Loading para Imágenes, Componentes y Datos"
description: "Cómo diferir la carga de recursos no críticos hasta que sean necesarios, mejorando el tiempo de carga inicial de página, reduciendo el ancho de banda y optimizando Core Web Vitals."
metaDescription: "Aprende lazy loading para imágenes, componentes y datos. Mejora el tiempo de carga inicial de tu sitio web y optimiza Core Web Vitals con estos ejemplos prácticos."
difficulty: beginner
topics:
  - performance
tags:
  - performance
  - lazy-loading
  - imagenes
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
  - /recipes/image-optimization
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende lazy loading para imágenes, componentes y datos. Mejora el tiempo de carga inicial de tu sitio web y optimiza Core Web Vitals con estos ejemplos prácticos."
  keywords:
    - lazy loading
    - carga diferida
    - intersection observer
    - lazy load imagenes
    - lazy load componentes
---

## Visión general

El lazy loading es una estrategia de optimización de rendimiento que difiere la carga de recursos no críticos hasta que son realmente necesarios. En lugar de descargar cada imagen, componente y chunk de datos en la carga inicial de página, la aplicación solo obtiene lo que el usuario puede ver o con el que puede interactuar inmediatamente. Los recursos bajo el fold, tabs ocultas o carruseles fuera de pantalla se cargan bajo demanda — típicamente cuando el usuario hace scroll, clic o hover.

Esta técnica mejora directamente tres métricas clave: **Largest Contentful Paint (LCP)** al priorizar contenido above-the-fold, **Time to Interactive (TTI)** al reducir el parsing de JavaScript en startup, y **uso de ancho de banda acumulado** al evitar descargas innecesarias. Consulta [optimización de rendimiento](/guides/performance/performance-optimization-guide) para más sobre Core Web Vitals. Los navegadores modernos proveen lazy loading nativo para imágenes vía el atributo `loading="lazy"`, mientras que frameworks como React y Vue ofrecen code splitting a nivel de componente. Esta receta cubre imágenes, componentes UI y datos de API.

## Cuándo usarlo

Usa esta receta cuando:

- Una página contiene muchas imágenes o archivos multimedia bajo el viewport inicial
- Tu bundle de JavaScript es grande y ralentiza el render inicial
- Dashboards o paneles de admin tienen tabs, modales o secciones raramente accedidas
- Listas o tablas cargan cientos de filas donde solo las primeras diez son visibles
- Usuarios móviles en conexiones lentas experimentan tiempos de carga inicial largos

## Solución

### Lazy Loading Nativo de Imágenes (HTML)

```html
<img src="hero.jpg" alt="Hero" loading="eager" width="1200" height="600">

<img src="gallery-1.jpg" alt="Gallery" loading="lazy" width="800" height="600">
<img src="gallery-2.jpg" alt="Gallery" loading="lazy" width="800" height="600">
<img src="gallery-3.jpg" alt="Gallery" loading="lazy" width="800" height="600">
```

### Intersection Observer (JavaScript Vanilla)

```javascript
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      observer.unobserve(img);
    }
  });
}, {
  rootMargin: '50px 0px',
  threshold: 0.01
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

### Lazy Loading en React (Componentes)

```jsx
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const VideoPlayer = lazy(() => import('./VideoPlayer'));

function Dashboard() {
  return (
    <div>
      <SummaryCards />
      <Suspense fallback={<SkeletonChart />}>
        <HeavyChart />
      </Suspense>
      <Suspense fallback={<SkeletonPlayer />}>
        <VideoPlayer />
      </Suspense>
    </div>
  );
}
```

### Lazy Loading de Datos (React Query / TanStack Query)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function ProductList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['products'],
      queryFn: ({ pageParam = 1 }) =>
        fetch(`/api/products?page=${pageParam}`).then(r => r.json()),
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    });

  return (
    <>
      {data?.pages.map(page =>
        page.products.map(p => <ProductCard key={p.id} product={p} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </>
  );
}
```

## Explicación

- **`loading="lazy"` nativo**: el enfoque más simple. El navegador decide cuándo obtener la imagen basándose en la distancia al viewport. Soportado en todos los navegadores modernos. Siempre incluye `width` y `height` para prevenir layout shift (CLS).
- **Intersection Observer**: una API performante que observa cuando los elementos entran al viewport. A diferencia de listeners de scroll, no corre continuamente en el main thread. Úsala para comportamientos de lazy loading personalizados, imágenes de fondo o iframes.
- **Code splitting de componentes**: [bundlers como Webpack, Vite y Rollup](/recipes/performance/spa-code-splitting-lazy) dividen automáticamente las llamadas a `import()` dinámicas en chunks separados. El `lazy()` de React envuelve estos chunks en un boundary de Suspense, mostrando un fallback mientras el chunk carga.
- **Scroll infinito / paginación**: en lugar de cargar todos los datos upfront, obtén páginas a medida que el usuario hace scroll o clickea "cargar más". Esto reduce el payload inicial de API y el costo de query de base de datos.

## Variantes

| Técnica | Tipo de recurso | Soporte de navegador | Framework | Mejor para |
|---------|----------------|----------------------|-----------|------------|
| `loading="lazy"` | Imágenes | Navegadores modernos | Cualquiera | Galerías de imágenes simples |
| Intersection Observer | Imágenes, iframes | Navegadores modernos | Cualquiera | Triggers de scroll personalizados |
| `import()` dinámico | Componentes JS | Universal | React, Vue, Svelte | Chunks de UI grandes |
| Lazy loading por ruta | Rutas | Universal | React Router, Vue Router | Navegación SPA |
| Query infinita | Datos | Universal | React Query, SWR | Listas, feeds |

## Lo que funciona

- **Establece dimensiones en imágenes lazy**: sin `width` y `height` explícitos, el navegador no puede reservar espacio antes de que la imagen cargue. Esto causa Cumulative Layout Shift (CLS), una penalización de [Core Web Vitals](/guides/performance/performance-optimization-guide).
- **Usa `eager` para imágenes above-the-fold**: la imagen hero, logo y CTA principal deberían cargar inmediatamente con `loading="eager"`. Solo difiere contenido que el usuario no puede ver en el primer paint.
- **Preload recursos críticos**: para contenido que probablemente se necesite pronto (por ejemplo, la siguiente ruta en una SPA), usa `<link rel="preload">` o `prefetch` para que cargue en tiempo idle.
- **Muestra skeleton placeholders**: mientras un componente o imagen lazy carga, muestra una UI skeleton ligera que coincida con el layout final. Evita espacios en blanco o contenido que salte.
- **Respeta `prefers-reduced-data`**: algunos usuarios habilitan modo de ahorro de datos. Honra esto reduciendo o deshabilitando contenido heavy lazy-loaded como videos de autoplay.

## Errores comunes

- **Lazy loading la imagen LCP**: el elemento de largest contentful paint nunca debería ser lazy loaded. Si la imagen hero tiene `loading="lazy"`, LCP se retrasará hasta que el usuario haga scroll — derrotando el propósito.
- **No manejar errores**: si una imagen lazy falla al cargar (error de red, 404), el usuario ve un icono roto o spinner infinito. Agrega handlers `onerror` e imágenes de fallback.
- **Over-splitting de componentes**: dividir cada componente en su propio chunk crea excesivas peticiones HTTP. Agrupa componentes relacionados y divide solo chunks mayores a 20-30KB.
- **Olvidar server-side rendering**: si un componente lazy es necesario para SSR o paint inicial, bloqueará el renderizado. Considera [code splitting SPA](/recipes/performance/spa-code-splitting-lazy) para contenido above-the-fold. Usa flags específicos de framework como `ssr: true` o carga eager para contenido above-the-fold.

## Preguntas frecuentes

**P: ¿El lazy loading perjudica el SEO?**
R: No. Googlebot renderiza imágenes y contenido lazy-loaded. Mientras las imágenes estén en el HTML inicial o cargadas vía JavaScript estándar (no interacción de usuario), los motores de búsqueda las indexarán. Usa fallbacks `<noscript>` para seguridad absoluta.

**P: ¿Cuál es la diferencia entre lazy loading y prefetching?**
R: El lazy loading difiere hasta que se necesita. El prefetching carga por adelantado durante tiempo idle. Usa lazy loading para contenido below-the-fold y prefetching para objetivos de navegación probables.

**P: ¿Puedo hacer lazy load de CSS?**
R: Sí. Usa `rel="preload"` para CSS crítico y carga hojas de estilo no críticas asíncronamente con el truco `media="print"` o `loadCSS`. Sin embargo, el flashing de contenido sin estilo (FOUC) es un riesgo — prueba cuidadosamente.

**P: ¿Cómo pruebo el rendimiento de lazy loading?**
R: Usa el panel Network de Chrome DevTools, limita a "Slow 3G," y haz scroll por la página. Revisa el waterfall chart — las imágenes y chunks deberían cargar solo al entrar al viewport, no al inicio de página.

