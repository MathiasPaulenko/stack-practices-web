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
  - images
  - optimization
  - profiling
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
  - /recipes/image-optimization
lastUpdated: "2026-06-13"
publishedAt: "2026-06-14"
author: Mathias Paulenko
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

Esta técnica mejora directamente tres métricas clave: **Largest Contentful Paint (LCP)** al priorizar contenido above-the-fold, **Time to Interactive (TTI)** al reducir el parsing de JavaScript en startup, y **uso de ancho de banda acumulado** al evitar descargas innecesarias. Consulta [optimización de rendimiento](/guides/performance/performance-optimization-guide) para más sobre Core Web Vitals. Los navegadores modernos proveen lazy loading nativo para imágenes vía el atributo `loading="lazy"`, mientras que frameworks como React y Vue ofrecen code splitting a nivel de componente. A continuacion se cubre imágenes, componentes UI y datos de API.

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

- **`loading="lazy"` nativo**: el enfoque más simple.   El navegador decide cuándo obtener la imagen basándose en la distancia al viewport.   Soportado en todos los navegadores modernos.
- **Intersection Observer**: una API performante que observa cuando los elementos entran al viewport.   A diferencia de listeners de scroll, no corre continuamente en el main thread.   Úsala para comportamientos de lazy loading personalizados, imágenes de fondo o iframes.
- **Code splitting de componentes**: [bundlers como Webpack, Vite y Rollup](/recipes/performance/spa-code-splitting-lazy) dividen automáticamente las llamadas a `import()` dinámicas en chunks separados.   El `lazy()` de React envuelve estos chunks en un boundary de Suspense, mostrando un fallback mientras el chunk carga.
- **Scroll infinito / paginación**: en lugar de cargar todos los datos upfront, obtén páginas a medida que el usuario hace scroll o clickea "cargar más".   Esto reduce el payload inicial de API y el costo de query de base de datos.

## Variantes

| Técnica | Tipo de recurso | Soporte de navegador | Framework | Mejor para |
|---------|----------------|----------------------|-----------|------------|
| `loading="lazy"` | Imágenes | Navegadores modernos | Cualquiera | Galerías de imágenes simples |
| Intersection Observer | Imágenes, iframes | Navegadores modernos | Cualquiera | Triggers de scroll personalizados |
| `import()` dinámico | Componentes JS | Universal | React, Vue, Svelte | Chunks de UI grandes |
| Lazy loading por ruta | Rutas | Universal | React Router, Vue Router | Navegación SPA |
| Query infinita | Datos | Universal | React Query, SWR | Listas, feeds |

## Lo que funciona

- **Establece dimensiones en imágenes lazy**: sin `width` y `height` explícitos, el navegador no puede reservar espacio antes de que la imagen cargue.   Esto causa Cumulative Layout Shift (CLS), una penalización de [Core Web Vitals](/guides/performance/performance-optimization-guide).
- **Usa `eager` para imágenes above-the-fold**: la imagen hero, logo y CTA principal deberían cargar inmediatamente con `loading="eager"`.   Solo difiere contenido que el usuario no puede ver en el primer paint.
- **Preload recursos críticos**: para contenido que probablemente se necesite pronto (por ejemplo, la siguiente ruta en una SPA), usa `<link rel="preload">` o `prefetch` para que cargue en tiempo idle.
- **Muestra skeleton placeholders**: mientras un componente o imagen lazy carga, muestra una UI skeleton ligera que coincida con el layout final.
- **Respeta `prefers-reduced-data`**: algunos usuarios habilitan modo de ahorro de datos.   Honra esto reduciendo o deshabilitando contenido heavy lazy-loaded como videos de autoplay.

## Errores comunes

- **Lazy loading la imagen LCP**: el elemento de largest contentful paint nunca debería ser lazy loaded.   Si la imagen hero tiene `loading="lazy"`, LCP se retrasará hasta que el usuario haga scroll — derrotando el propósito.
- **No manejar errores**: si una imagen lazy falla al cargar (error de red, 404), el usuario ve un icono roto o spinner infinito.   Agrega handlers `onerror` e imágenes de fallback.
- **Over-splitting de componentes**: dividir cada componente en su propio chunk crea excesivas peticiones HTTP.   Agrupa componentes relacionados y divide solo chunks mayores a 20-30KB.
- **Olvidar server-side rendering**: si un componente lazy es necesario para SSR o paint inicial, bloqueará el renderizado.   Considera [code splitting SPA](/recipes/performance/spa-code-splitting-lazy) para contenido above-the-fold.

## Manejo de Errores y Recuperacion

- **Fallos de compression**: cuando Brotli compression falla, sirve uncompressed content como fallback.   Setea compression quality basado en CPU availability.
- **Fallos de CDN origin**: cuando CDN no puede alcanzar origin, sirve stale content.   Setea appropriate TTLs.
- **Connection pool exhaustion**: cuando todas las connections estan in use, requests queuean o fallan.   Setea max pool size basado en database capacity.
- **Fallos de lazy loading intersection observer**: cuando Intersection Observer falla, content nunca loads.
- **Fallos de load test scripts**: cuando k6 scripts fallan, test results son invalid.   Valida test scripts antes de execution.   Usa version control para test scripts.
- **Fallos de code splitting**: cuando dynamic imports fallan, components no loadean.   Usa prefetch para critical chunks.

## Performance y Escalabilidad

- **Tuning de compression level**: Brotli level 4 para dynamic content.   Brotli level 11 para static assets.   Gzip level 6 como fallback.
- **Optimizacion de CDN cache hit ratio**: maximiza cache hit ratio para reducir origin load.   Setea appropriate Cache-Control headers.   Purga cache en content updates.
- **Sizing de connection pool**: dimensiona pools basado en concurrent request volume.   Empieza con 10 connections por pool.   Incrementa pool size si wait time excede 100ms.   Decrementa si connections estan idle.
- **Tuning de lazy loading threshold**: setea root margin para early loading.   Usa 400px para heavy components.   Ajusta threshold basado en device performance.
- **Patrones de load test ramp**: Empieza con 10 users.   Rampea a 100 over 2 minutes.   Hold por 5 minutes.   Rampea a peak.   Hold por 10 minutes.   Ramp down.
- **Optimizacion de bundle size**: Splitea vendor y app code.   Analiza bundle con webpack-bundle-analyzer.   Setea performance budgets.
## Consideraciones de Seguridad

- **HTTPS y compression**: habilita compression solo sobre HTTPS para prevenir BREACH attacks.   No comprimas sensitive responses con user-controlled input.
o-transform header para content ya compressed. Monitorea compression-related vulnerabilities. Documenta security configuration. Testea con security scanners. Revisa security trimestralmente
- **Seguridad de CDN**: secura CDN con proper access controls.   Habilita DDoS protection.
- **Seguridad de connection pool**: Setea connection timeout para prevenir slow-loris attacks.   Rota database credentials.
- **Content Security Policy para lazy loading**: setea CSP headers para permitir lazy-loaded resources.

## Deployment y CI/CD

- **Performance testing en CI**: corre performance tests en cada PR.   Usa k6 para load testing.   Setea performance budgets.   Failea builds en budget violations.
- **Deployment progresivo para performance changes**: deploya performance changes gradualmente.   Roll back en regression.
- **Bundle analysis en CI**: analiza bundle size en cada build.   Setea size budgets por chunk.

## Testing y Quality Assurance

- **Performance regression testing**: corre performance tests en cada release.
- **Best practices de load testing**: Rampea up gradualmente.   Usa production-like data volumes.
- **CDN cache testing**: verifica que cache headers esten seteados correctamente.   Verifica stale content serving.   Testea con query parameters.
## Herramientas y Plataformas

- **WebPageTest**: herramienta detailed de web performance testing.   Waterfall view de resource loading.   Filmstrip view de visual progress.   Setea custom connectivity profiles.
- **Lighthouse**: herramienta de Google para web performance auditing.   Scorea performance, accessibility, SEO y best practices.   Setea performance budget basado en Lighthouse scores.
- **k6**: herramienta modern de load testing por Grafana.   Soporte para HTTP, gRPC, WebSocket.   Thresholds para pass/fail.   Cloud execution option.   Integration con Grafana.   Crea reusable test scenarios.
- **webpack-bundle-analyzer**: visualiza bundle composition.   Encuentra duplicate modules.   Setea size alerts.
- **Cloudflare CDN**: CDN global con edge caching.   Workers para edge compute.   Cache rules y page rules.   Real-time analytics.   DDoS protection incluido.
- **Fastly CDN**: CDN con instant purge.   VCL para edge configuration.   Real-time logging.   Image optimization.

## Pitfalls Comunes y Anti-Patrones

- **Over-compression**: comprimir content ya compressed wastea CPU.   No comprimas images, videos o pre-compressed assets.   Setea gzip_types y rotli_types cuidadosamente.
- **Miconfiguracion de CDN**: incorrect cache headers causan poor hit ratio.   No cachees personalized content.   Setea appropriate TTLs.
- **Connection pool over-sizing**: demasiadas connections wastean database resources.   Setea max pool size basado en database capacity.
- **Lazy loading everything**: lazy loading above-the-fold content perjudica LCP.   Loadea critical content eagerly.   Usa etchpriority="high" para LCP elements.
- **Load testing sin think time**: load testing sin think time crea unrealistic load.   Agrega think time entre requests.   Simula real user behavior.
- **Code splitting demasiado granular**: demasiados small chunks causan excessive network requests.   Groupa related components en chunks.   Setea minimum chunk size.

## Resumen de Best Practices

- **Setea performance budgets**: define budgets para key metrics.   LCP under 2.  5 segundos.   FID under 100ms.   CLS under 0.  1.   Bundle size under 200KB.   Failea builds en violations.
- **Monitorea Core Web Vitals**: Usa synthetic monitoring para lab data.   Setea alerts en metric degradation.
- **Optimiza critical rendering path**: Inlinea critical CSS.   Deferea non-critical JavaScript.
- **Usa progressive enhancement**: builda core functionality primero.   Enhancea con JavaScript.   Usa server-side rendering.
## Optimizacion de Costos

- **Gestion de costos de CDN**: Setea appropriate TTLs para maximizar cache hits.   Usa compression para reducir bandwidth.
- **Costos de CPU de compression**: Pre-comprime static assets en build time.
- **Costos de resources de connection pool**: Cierra unused connections.
- **Costos de load testing infrastructure**: Programa tests durante off-peak.   Usa cloud-native load testing.

## Guia de Troubleshooting

- **Slow page load**: diagnostica con WebPageTest.   Minifica CSS y JavaScript.
- **High CDN origin requests**: Verifica cache key configuration.
- **Connection pool timeouts**: chequea pool size.   Incrementa pool size si needed.
- **Poor load test results**: Verifica test environment.   Scalea infrastructure.
## Monitoring y Alerting

- **Estrategia de performance monitoring**: Setea thresholds para alerts.   Usa synthetic monitoring para lab data.
- **Configuracion de alerts para performance**: setea alerts en metric degradation.   LCP above 2.  5 segundos.   Error rate above 1%.   Response time above 500ms.   Reduce alert noise.
- **Diseno de dashboards para performance**: crea dashboards para diferentes audiences.   Executive dashboard para high-level metrics.   Engineering dashboard para detailed metrics.   Operations dashboard para real-time monitoring.
- **Deteccion de performance regression**: automatiza regression detection.

## Patrones Avanzados

- **Edge computing para performance**: mueve computation al edge.   Reduce latency para global users.   Cachea dynamic content en edge.
- **Optimizacion de resource hints**: Usa preload para key resources.   Usa dns-prefetch para external domains.
- **Pipeline de image optimization**: Usa modern formats como WebP y AVIF.
## Estrategias de Migracion

- **Migracion de gzip a Brotli**: habilita Brotli junto a gzip para gradual migration.   Roll out progresivamente.
- **Migracion a un nuevo CDN**: corre ambos CDNs en paralelo durante migration.   Verifica SSL certificates.   Switchea DNS gradualmente.
- **Migracion de connection pools**: migra pool configuration gradualmente.   Roll out a un service a la vez.   Completa migration despues de validation.

## Compliance y Governance

- **Performance SLAs**: define performance SLAs para critical endpoints.   API response time under 200ms.   Page load time under 3 segundos.
- **Performance reporting**: genera weekly performance reports.





## Glosario

- **Implementar Lazy Loading para Imágenes, Componentes y Datos**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de performance y lazy-loading para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica implementar lazy loading para imágenes, componentes y datos** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿El lazy loading perjudica el SEO?**
R: No. Googlebot renderiza imágenes y contenido lazy-loaded. Mientras las imágenes estén en el HTML inicial o cargadas vía JavaScript estándar (no interacción de usuario), los motores de búsqueda las indexarán. Usa fallbacks `<noscript>` para seguridad absoluta.

**P: ¿Cuál es la diferencia entre lazy loading y prefetching?**
R: El lazy loading difiere hasta que se necesita. El prefetching carga por adelantado durante tiempo idle. Usa lazy loading para contenido below-the-fold y prefetching para objetivos de navegación probables.

**P: ¿Puedo hacer lazy load de CSS?**
R: Sí. Usa `rel="preload"` para CSS crítico y carga hojas de estilo no críticas asíncronamente con el truco `media="print"` o `loadCSS`. Sin embargo, el flashing de contenido sin estilo (FOUC) es un riesgo — prueba cuidadosamente.

**P: ¿Cómo pruebo el rendimiento de lazy loading?**
R: Usa el panel Network de Chrome DevTools, limita a "Slow 3G," y haz scroll por la página. Revisa el waterfall chart — las imágenes y chunks deberían cargar solo al entrar al viewport, no al inicio de página.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cuál es la diferencia entre lazy loading y code splitting?

Lazy loading difiere loading de content hasta que se necesita, tipicamente cuando entra al viewport. Code splitting divide bundles en chunks mas chicos loaded on demand. Lazy loading es para content como images y components. Code splitting es para JavaScript bundles. Ambos reducen initial page load. Usalos juntos para maximo impact.

### ¿Cómo mido la effectiveness de lazy loading?

Trackea LCP, FCP y TBT metrics. Compara page load con y sin lazy loading. Usa Lighthouse para medir impact. Monitorea scroll depth y engagement. Chequea que below-fold content loadee on scroll. Usa WebPageTest para waterfall analysis. Documenta performance gains.

### ¿Debo usar native loading="lazy" o una JavaScript library?

Empieza con native `loading="lazy"` attribute. Es soportado por all modern browsers. Usa una JavaScript library solo si necesitas advanced features como custom thresholds, animations o placeholders. Testea native lazy loading primero. Monitorea browser support. Usa polyfill para older browsers. Documenta tu approach.

### ¿Cómo manejo SEO con lazy loaded images?

Search engines pueden no loadear lazy images durante crawling. Provee descriptive `alt` text para all images. Usa `noscript` fallback con image tags para crawlers que no ejecutan JavaScript. Incluye image URLs en tu sitemap. Usa structured data para images. Testea con Google Search Console URL Inspector. Monitorea indexed image count.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
