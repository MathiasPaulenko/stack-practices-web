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
  - ui
  - css
  - javascript
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
| SSR | Por request | Datos en vivo; contenido personalizado |
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

## Lo que funciona

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
5. **Over-cachear contenido en vivo**: Cachear SSG dashboards personalizados muestra datos incorrectos al usuario equivocado

## Variantes y Alternativas

- **SSR vs SSG vs CSR vs ISR**: SSR renderiza en cada request (dinamico, mas lento). SSG renderiza en build time (estatico, mas rapido). CSR renderiza en el browser (build rapido, carga inicial lenta). ISR revalida paginas estaticas en un schedule (balance de velocidad y frescura)
- **Estrategias de hydration**: hydration completa (default de React, hidrata todo el tree). Hydration parcial (Astro islands, hidrata solo componentes interactivos). Streaming SSR (React 18, envia HTML en chunks). Arquitectura de islas (solo hidrata lo que necesita interactividad)
- **Next.js vs Remix vs Astro vs Nuxt**: Next.js (React, App Router, RSC). Remix (React, nested routes, web standards). Astro (framework-agnostic, islands, SSG-first). Nuxt (Vue, hybrid rendering). Elije basado en preferencia de framework y necesidades de renderizado
- **Server components vs client components**: server components renderizan en el servidor con cero JS enviado al cliente. Client components hidratan en el cliente. Usa server components para contenido estatico, client components para interactividad
- **Edge rendering vs origin rendering**: edge rendering corre en locations de CDN edge (baja latencia, APIs limitadas). Origin rendering corre en tus servidores (APIs completas, mayor latencia). Usa edge para contenido personalizado, origin para paginas database-heavy
- **Progressive enhancement vs full JS**: progressive enhancement funciona sin JS (HTML forms, links). Full JS requiere JavaScript para todas las interacciones. Usa progressive enhancement para sitios de contenido, full JS para aplicaciones

## Pitfalls Comunes en Produccion

- **Hydration mismatches**: el servidor y el cliente renderizan HTML diferente. Causa warnings de React y UI rota. Causas comunes: usar Date.now(), Math.random(), o window durante el render. Usa useEffect para logica client-only
- **Data fetching en waterfall**: llamadas wait anidadas en server components causan fetches secuenciales. Usa Promise.all para fetching paralelo. Considera preloading datos criticos en componentes layout
- **Bundle size bloat**: importar librerias grandes en client components aumenta el bundle JS. Usa dynamic imports (
ext/dynamic, lazy()) para componentes no criticos. Mueve logica pesada a server components
- **Bugs de cache invalidation**: paginas cacheadas muestran datos stale despues de updates. Usa revalidacion basada en tags (
evalidateTag) o ISR basado en tiempo (
evalidate: 60). Testea cache invalidation en staging
- **Problemas SEO con client-side routing**: los motores de busqueda pueden no ejecutar JS. Usa SSR o SSG para paginas SEO-criticas. Incluye meta tags apropiados, sitemap y structured data en el HTML server-rendered
- **Memory leaks en SSR long-running**: caches del lado servidor crecen sin bounds. Usa LRU caches con max size. Monitorea uso de memoria. Reinicia workers periodicamente (usa un process manager como PM2)

## Patrones de Integracion

- **SSR con API routes**: el componente de pagina fetchea datos de API routes durante SSR. API route queryea base de datos. La respuesta se cachea en el edge. La navegacion del cliente usa fetching client-side para cargas subsecuentes
- **Renderizado hibrido**: paginas estaticas usan SSG (marketing, blog). Paginas dinamicas usan SSR (dashboard, profile). Usa ISR para paginas que se actualizan frecuentemente pero no necesitan datos en tiempo real. Configura estrategia de renderizado por ruta
- **SSR con autenticacion**: el servidor lee la cookie de session -> valida la session -> renderiza contenido personalizado -> envia HTML. La navegacion del cliente fetchea la session via API. Usa cookies httpOnly para seguridad
- **Streaming SSR con Suspense**: envuelve componentes lentos en <Suspense>. React streamea HTML como chunks. El cliente recibe HTML inicial inmediatamente y llena las partes lentas a medida que resuelven. Mejora TTFB y FCP
- **Edge middleware para A/B testing**: el middleware corre en el edge antes del renderizado. Asigna variante basado en cookie o random. Reescribe el request a una version de pagina diferente. Sin flicker del lado cliente
- **Connection pooling de base de datos en SSR**: cada request SSR necesita una conexion a base de datos. Usa un connection pool (pgBouncer, Prisma Data Proxy). Comparte el pool a traves de requests. Cierra conexiones en shutdown

## Tooling y Ecosistema

- **Next.js**: framework React con App Router, RSC, SSR, SSG, ISR. 120K+ GitHub stars. Image optimization, font optimization y route handlers built-in. Deployment en Vercel first-class
- **Remix**: framework React con nested routes y web standards. 28K+ GitHub stars. Construido sobre Web Fetch API. Excelente para apps form-heavy. Deployment en Vercel y Fly.io
- **Astro**: framework agnostico SSG-first con arquitectura de islas. 45K+ GitHub stars. Soporta componentes React, Vue, Svelte, Solid. Cero JS por default. Mejor para sitios de contenido
- **Nuxt**: framework Vue con hybrid rendering. 52K+ GitHub stars. Auto-imports, file-based routing, motor Nitro. Mejor para equipos Vue
- **SvelteKit**: framework Svelte con SSR y SSG. 18K+ GitHub stars. Bundle size minimal. Optimizaciones en compile-time. Mejor para apps performance-critical
- **TanStack Start**: framework SSR React type-safe. Nuevo (2024). Construido sobre TanStack Router. Routing y data loading type-safe

## Resumen de Best Practices

- Usa SSG para contenido estatico (marketing, blog, docs). Usa SSR para contenido personalizado
- Implementa hydration parcial (islands) para reducir el JS enviado al cliente
- Usa Promise.all para data fetching paralelo en server components
- Evita hydration mismatches usando useEffect para logica client-only
- Monitorea Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Usa edge rendering para contenido personalizado con baja latencia
- Implementa streaming SSR con Suspense para componentes lentos
- Cachea agresivamente en el edge con invalidacion basada en tags
- Usa connection pooling para acceso a base de datos en SSR
- Testea SEO con Google Search Console y mobile-friendly test
## Manejo de Errores y Recuperacion

- **Error boundaries en SSR**: envuelve componentes de pagina en error boundaries. En error, renderiza una pagina 500 con el status code apropiado. Loguea el error con stack trace. No crashees el proceso del servidor. Usa React error boundaries o componentes de error framework-specific
- **Fallos de data fetching**: si un server component falla al fetchar datos, renderiza una UI de fallback con un boton de retry. Usa caching stale-while-revalidate para servir los ultimos datos buenos conocidos. Setea un timeout en llamadas fetch (ej. 5 segundos)
- **Fallos de conexion a base de datos**: usa un patron circuit breaker. Despues de 5 fallos consecutivos, deja de intentar conexiones por 30 segundos. Falla a contenido cacheado. Alerta al equipo. Usa un endpoint de health check para detectar fallos
- **Recuperacion de errores de hydration**: en hydration mismatch, React loguea un warning y re-renderiza el subtree afectado. En produccion, esto es usualmente invisible para el usuario. En desarrollo, ayuda a atrapar bugs. Usa suppressHydrationWarning para diferencias intencionales (ej. timestamps)
- **Errores de build-time vs runtime**: errores de build-time (sintaxis, type errors) deben fallar el build. Errores de runtime (base de datos, API) deben ser atrapados y manejados gracefully. Usa TypeScript para safety de build-time. Usa try/catch para resiliencia de runtime
- **Degradacion graceful**: si un componente no critico falla (ej. seccion de comentarios), renderiza el resto de la pagina sin el. Loguea el error. No falles la pagina entera por un componente roto. Usa Suspense boundaries para aislar fallos

## Tips de Optimizacion de Performance

- Usa 
ext/streaming o React 18 Suspense para streamear chunks de HTML. Mejora TTFB en 50-80%
- Implementa caching stale-while-revalidate en el edge. Sirve contenido cacheado inmediatamente mientras revalida en background
- Usa React.memo y useMemo para prevenir re-renders innecesarios en client components
- Preloada recursos criticos (fonts, CSS, imagenes) con <link rel="preload"> en el head del HTML
- Usa 
ext/image o stro:image para optimizacion automatica de imagenes (WebP, responsive sizes, lazy loading)
- Minimiza el JavaScript del lado cliente. Mueve logica a server components. Usa arquitectura de islas para hydration parcial
- Implementa code splitting con dynamic imports para rutas no criticas. Reduce el bundle inicial en 30-50%
- Usa headers Cache-Control con s-maxage y stale-while-revalidate para caching en CDN
- Comprime el output HTML con gzip o brotli a nivel servidor. Reduce el tamaÃ±o de transferencia en 60-80%
- Monitorea Core Web Vitals en produccion usando herramientas de Real User Monitoring (RUM) como Vercel Analytics o Speed Insights
## Consideraciones de Seguridad

- **XSS en SSR**: el HTML server-rendered debe escapar todo input del usuario. React auto-escapa por default, pero dangerouslySetInnerHTML bypassa esto. Nunca uses dangerouslySetInnerHTML con input del usuario. Usa DOMPurify para sanitizar HTML proporcionado por el usuario
- **Proteccion CSRF**: los forms SSR deben incluir tokens CSRF. Genera un token por session y valida en POST. Usa cookies SameSite=Strict. Para llamadas API desde el cliente, usa SameSite=Lax con un chequeo de custom header
- **Exposicion de secretos del servidor**: nunca expongas secretos del servidor (API keys, passwords de base de datos) al cliente. Los server components corren en el servidor y pueden acceder a secretos. Los client components se envian al browser. No pases secretos como props de server a client components
- **HTTP headers para seguridad**: setea X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security: max-age=31536000, Content-Security-Policy: default-src 'self'. Usa un middleware de security headers o helmet para Express
- **Seguridad de cookies**: usa httpOnly (previene acceso JS), secure (solo HTTPS), sameSite (proteccion CSRF). Setea expiracion apropiadamente. Usa prefijo __Host- para cookies de session para prevenir ataques de subdomain
- **Rate limiting de endpoints SSR**: paginas SSR que hacen trabajo caro (queries de base de datos, llamadas API) deben tener rate limiting. Usa un rate limiter de sliding window (ej. 60 requests por minuto por IP). Retorna 429 con header Retry-After cuando se excede
## Testing y Quality Assurance

- **Snapshot testing de SSR**: renderiza paginas en el servidor y snapshottea el output HTML. Compara snapshots en cada run de CI. Detecta cambios no intencionales en el output renderizado. Usa Jest snapshot testing o comparaciones visuales de Playwright
- **Testing de hydration**: testea que la hydration del lado cliente matchee el HTML server-rendered. Usa React DevTools Profiler para detectar hydration mismatches. Testea con ct() y 
enderToString en unit tests. Habilita React strict mode en desarrollo
- **Testing de performance**: mide LCP, FID y CLS para cada pagina. Usa Lighthouse CI en GitHub Actions. Setea budgets: LCP < 2.5s, FID < 100ms, CLS < 0.1. Bloquea deployment si se exceden los budgets. Trackea regresiones de performance en el tiempo
- **Testing end-to-end con SSR**: usa Playwright para testear paginas SSR. Verifica que las paginas carguen sin JavaScript. Testea submit de forms con y sin JS habilitado. Verifica que los meta tags y structured data esten presentes en el HTML inicial
- **Testing de accesibilidad en SSR**: corre axe-core en tests de Playwright contra paginas server-rendered. Chequea compliance con WCAG 2.2. Testea navegacion con keyboard. Verifica que los atributos ARIA esten presentes en el output SSR. Testea con screen readers
- **Testing SEO**: verifica canonical URLs, meta descriptions, OG tags y hreflang tags en el output SSR. Usa una herramienta SEO checker. Verifica que el sitemap incluya todas las paginas SSR. Testea con Google Rich Results Test para structured data

## Deployment y CI/CD

- **Prerendering en build-time**: pre-renderiza paginas estaticas en build time. Usa 
ext build o stro build. Deploya HTML pre-renderizado a un CDN. Reduce la carga del servidor y mejora TTFB. Usa SSR solo para paginas dinamicas
- **Deployment de servidor SSR**: deploya servidor SSR a una plataforma managed (Vercel, Netlify, Cloudflare Workers) o un entorno containerizado (Docker, Kubernetes). Usa un process manager (PM2, systemd) para servidores Node.js. Setea health checks y auto-restart
- **Deployment en edge**: deploya SSR a locations de edge para baja latencia. Usa Cloudflare Workers, Vercel Edge Functions o Deno Deploy. Limita dependencias a las que funcionan en edge runtimes. Usa drivers de base de datos edge-compatible (Prisma Data Proxy, PlanetScale)
- **Deployment blue-green**: deploya la nueva version junto a la version vieja. Rutea un porcentaje de trafico a la nueva version. Monitorea error rate y performance. Si esta healthy, rutea 100% a la nueva version. Si esta unhealthy, roll back inmediatamente
- **Cache invalidation en deploy**: al deployar nuevo contenido, invalida el cache del CDN para paginas afectadas. Usa invalidacion basada en tags (
evalidateTag) o basada en paths. Espera a que el cache se warm antes de rutear trafico a la nueva version
- **Gestion de variables de entorno**: usa diferentes env vars para desarrollo, staging y produccion. Nunca commitees secrets a git. Usa un secrets manager (Doppler, Vault, AWS Secrets Manager). Valida env vars al startup con un schema validator
## Optimizacion de Costos

- **SSR serverless vs always-on**: SSR serverless (Vercel, Netlify) cobra por request. Servidores always-on cobran por hora. Para trafico bajo (< 1000 requests/hora), serverless es mas barato. Para trafico alto, always-on es mas barato. Calcula el break-even point para tu workload
- **Costos de edge functions**: las edge functions se facturan por request y por GB-second. Manten el tiempo de ejecucion bajo 50ms. Minimiza dependencias. Usa frameworks ligeros (Hono, Astro). Evita operaciones de runtime pesadas en el edge
- **Caching en CDN para reducir llamadas al origin**: cachea paginas SSR en el CDN con s-maxage=300 y stale-while-revalidate=600. Esto reduce requests al origin en 80-95% para paginas que pueden cachearse. Usa invalidacion basada en tags para cache busting inmediato
- **Costos de optimizacion de imagenes**: usa 
ext/image o Cloudflare Images para optimizacion automatica. Evita generar multiples sizes on-the-fly para cada request. Pre-genera imagenes optimizadas en build time para contenido estatico. Usa formato WebP o AVIF
- **Costos de conexion a base de datos**: usa connection pooling (PgBouncer, Prisma Data Proxy) para reducir el numero de conexiones a base de datos. Cada conexion usa memoria en el servidor de base de datos. Las serverless functions deben usar pooled connections, no conexiones directas
- **Analisis de bundle**: usa @next/bundle-analyzer o 
ollup-plugin-visualizer para identificar dependencias grandes. Reemplaza librerias pesadas con alternativas mas ligeras (ej. date-fns en lugar de moment.js, zustand en lugar de 
edux). Tree-shakea exports no usados
## Monitoreo y Observabilidad

- **Real User Monitoring (RUM)**: colecta Core Web Vitals de usuarios reales. Usa Vercel Analytics, Speed Insights o Google Analytics 4. Trackea LCP, INP, CLS por pagina. Segmenta por dispositivo, tipo de conexion y geografia. Setea alerts para regresion
- **Metricas del lado servidor**: trackea tiempo de respuesta SSR, uso de memoria y error rate por ruta. Usa Prometheus con prom-client para Node.js. Exporta metricas en /metrics. Setea dashboards de Grafana. Alerta en p95 latency > 2s o error rate > 1%
- **Distributed tracing**: usa OpenTelemetry para tracear requests desde el CDN edge a traves del servidor SSR hasta la base de datos. Identifica bottlenecks en el path del request. Usa Jaeger o Zipkin para visualizacion de traces. Samplea al 1-10% para reducir overhead
- **Agregacion de logs**: estructura logs como JSON con timestamp, level, ruta, requestId y mensaje. Usa pino para logging estructurado rapido en Node.js. Envia logs a Elasticsearch o CloudWatch. Setea alerts basadas en logs para errores
- **Tracking de errores**: usa Sentry o Bugsnag para capturar errores SSR. Incluye contexto del request (URL, headers, usuario). Setea release tracking para correlacionar errores con deployments. Alerta en errores nuevos y picos de error rate
- **Monitoreo sintetico**: usa Checkly o Uptime Robot para pingear paginas criticas cada 5 minutos. Verifica HTTP status, tiempo de respuesta y contenido. Alerta en downtime. Testea desde multiples regiones geograficas
## Preguntas Frecuentes

**P: ¿SSR perjudica el performance?**
R: Mejora la carga inicial pero agrega costo de servidor. Usa SSG o ISR para contenido que no cambia por usuario.

**P: ¿Puedo usar SSR con un headless CMS?**
R: Sí. Obtén datos del CMS durante SSR; el CMS solo sirve la API, no la página renderizada.

**P: ¿Cuál es la diferencia entre SSR y hydration?**
R: SSR produce HTML en el servidor. La hydration hace ese HTML estático interactivo en el cliente.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.