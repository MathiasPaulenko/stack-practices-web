---
contentType: recipes
slug: spa-code-splitting-lazy
title: "Rendimiento SPA: Code Splitting y Lazy Loading"
description: "Mejora tiempos de carga de single-page applications dividiendo bundles a nivel de ruta y componente, implementando lazy loading con React.lazy e imports en vivo"
metaDescription: "Mejora rendimiento de SPAs con code splitting y lazy loading. Divide bundles a nivel de ruta y componente usando React.lazy e imports en vivo para cargas mas rapidas."
difficulty: intermediate
topics:
  - frontend
  - performance
tags:
  - spa
  - react
  - performance
  - frontend
  - ui
relatedResources:
  - /patterns/design/composite-pattern-ui
  - /patterns/design/bridge-pattern-ui-themes
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mejora rendimiento de SPAs con code splitting y lazy loading. Divide bundles a nivel de ruta y componente usando React.lazy e imports en vivo para cargas mas rapidas."
  keywords:
    - code splitting
    - lazy loading
    - react lazy
    - spa performance
    - live imports
---

# Rendimiento SPA: Code Splitting y Lazy Loading

Reduce el tamano del bundle inicial en [single-page applications](/recipes/performance/lazy-loading) dividiendo codigo a nivel de ruta y componente. Esta recipe demuestra React.lazy, imports en vivo y estrategias de preload que mantienen time-to-interactive bajo sin sacrificar experiencia de usuario.

## Cuando Usar Esto

- Tu bundle de SPA excede 200KB gzip y carga lentamente en mobile
- No todas las rutas son accedidas por cada usuario en la primera visita
- Componentes pesados (graficos, editores, mapas) solo se necesitan en paginas especificas. Consulta [MVC Pattern Frontend](/patterns/design/mvc-pattern-frontend) para arquitectura de componentes.

## Solucion

### 1. Code Splitting a Nivel de Ruta

```typescript
// router.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 2. Lazy Loading a Nivel de Componente

```typescript
// components/HeavyChart.tsx
import { lazy, Suspense, useState } from 'react';

const Chart = lazy(() => import('./ChartLibrary'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <Chart data={getData()} />
        </Suspense>
      )}
    </div>
  );
}
```

### 3. Prefetch en Hover

```typescript
// utils/prefetch.ts
const lazyPages = {
  '/reports': () => import('./pages/Reports'),
  '/analytics': () => import('./pages/Analytics'),
};

export function prefetchRoute(path: string): void {
  const loader = lazyPages[path as keyof typeof lazyPages];
  if (loader) loader();
}

// Navigation.tsx
import { prefetchRoute } from './utils/prefetch';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={to}
      onMouseEnter={() => prefetchRoute(to)}
    >
      {children}
    </a>
  );
}
```

### 4. Configuracion Vite para Chunking

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod'],
        },
      },
    },
  },
});
```

## Como Funciona

- `React.lazy` envuelve un import en vivo y renderiza un fallback mientras carga
- `Suspense` boundaries capturan estados de carga y muestran fallback UI
- Prefetching en hover inicia la carga antes de que el usuario haga click
- Manual chunks agrupan codigo vendor compartido en bundles cacheables

## Variacion: Intersection Observer para Contenido Below-Fold

```typescript
// hooks/useLazyLoad.ts
import { useEffect, useRef, useState } from 'react';

function useLazyLoad() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

## Consideraciones de Produccion

- Setea fallback UI apropiado para prevenir layout shifts mientras carga
- Monitorea [Core Web Vitals](/guides/performance/performance-optimization-guide) (LCP, INP, CLS) despues de hacer splitting
- Usa `preload` para rutas criticas accedidas por la mayoria de usuarios

## Errores Comunes

- Envolver cada componente en lazy, causando excessive network requests
- No manejar errores de carga con un `ErrorBoundary`
- Olvidar que rutas lazy-loaded aun necesitan que sus datos sean fetched

## Manejo de Errores y Recuperacion

- **Fallos de compression**: cuando Brotli compression falla, sirve uncompressed content como fallback. Monitorea compression error rate. Setea compression quality basado en CPU availability. Testea compression con diferentes content types. Documenta fallback behavior. Alerta en compression failure spikes. Usa gzip como secondary fallback. Revisa compression settings trimestralmente
- **Fallos de CDN origin**: cuando CDN no puede alcanzar origin, sirve stale content. Configura stale-while-revalidate headers. Setea appropriate TTLs. Monitorea origin health. Alerta en origin error rate. Usa multiples origins para redundancy. Testea failover entre origins. Documenta CDN failover configuration. Revisa CDN health mensualmente
- **Connection pool exhaustion**: cuando todas las connections estan in use, requests queuean o fallan. Setea max pool size basado en database capacity. Monitorea pool utilization. Alerta en pool exhaustion. Implementa connection timeout. Usa retry con backoff. Documenta pool sizing guidelines. Testea bajo peak load. Revisa pool configuration trimestralmente
- **Fallos de lazy loading intersection observer**: cuando Intersection Observer falla, content nunca loads. Implementa fallback a scroll event listeners. Testea en older browsers. Usa polyfill para unsupported browsers. Monitorea lazy load failures. Documenta fallback strategy. Testea con diferentes viewport sizes. Revisa browser support matrix
- **Fallos de load test scripts**: cuando k6 scripts fallan, test results son invalid. Valida test scripts antes de execution. Usa k6 checks para response validation. Monitorea test failure rate. Documenta test script standards. Testea scripts en staging primero. Usa version control para test scripts. Revisa test script quality. Implementa test data management
- **Fallos de code splitting**: cuando dynamic imports fallan, components no loadean. Implementa error boundaries para split components. Usa fallback UI para failed loads. Monitorea dynamic import failures. Testea code splitting en production. Documenta error handling para split chunks. Usa prefetch para critical chunks. Revisa splitting strategy trimestralmente

## Performance y Escalabilidad

- **Tuning de compression level**: balancea entre compression ratio y CPU usage. Brotli level 4 para dynamic content. Brotli level 11 para static assets. Gzip level 6 como fallback. Monitorea compression time. Alerta en slow compression. Testea diferentes levels. Documenta compression configuration. Revisa compression performance mensualmente
- **Optimizacion de CDN cache hit ratio**: maximiza cache hit ratio para reducir origin load. Setea appropriate Cache-Control headers. Usa cache keys que incluyan relevant parameters. Purga cache en content updates. Monitorea cache hit ratio. Alerta en hit ratio drops. Usa CDN caching rules. Documenta caching strategy. Revisa cache configuration mensualmente
- **Sizing de connection pool**: dimensiona pools basado en concurrent request volume. Empieza con 10 connections por pool. Monitorea wait time. Incrementa pool size si wait time excede 100ms. Decrementa si connections estan idle. Usa connection validation. Documenta sizing guidelines. Testea bajo peak load. Revisa pool size trimestralmente. Usa lazy initialization
- **Tuning de lazy loading threshold**: setea root margin para early loading. Usa 200px root margin para images. Usa 400px para heavy components. Monitorea user scroll behavior. Ajusta threshold basado en device performance. Testea en mobile devices. Documenta threshold configuration. Revisa thresholds trimestralmente. Usa placeholder dimensions
- **Patrones de load test ramp**: usa ramping stages para realistic load. Empieza con 10 users. Rampea a 100 over 2 minutes. Hold por 5 minutes. Rampea a peak. Hold por 10 minutes. Ramp down. Monitorea response times en cada stage. Documenta ramp patterns. Testea diferentes patterns. Revisa test scenarios trimestralmente
- **Optimizacion de bundle size**: minimiza bundle size para faster loads. Usa tree shaking. Splitea vendor y app code. Analiza bundle con webpack-bundle-analyzer. Setea performance budgets. Monitorea bundle size en CI. Alerta en budget violations. Documenta splitting strategy. Revisa bundle size mensualmente. Usa dynamic imports para large dependencies
## Consideraciones de Seguridad

- **HTTPS y compression**: habilita compression solo sobre HTTPS para prevenir BREACH attacks. No comprimas sensitive responses con user-controlled input. Setea 
o-transform header para content ya compressed. Monitorea compression-related vulnerabilities. Documenta security configuration. Testea con security scanners. Revisa security trimestralmente
- **Seguridad de CDN**: secura CDN con proper access controls. Usa signed URLs para protected content. Configura WAF rules en CDN. Habilita DDoS protection. Monitorea CDN access logs. Alerta en suspicious traffic patterns. Documenta CDN security configuration. Testea CDN security. Revisa WAF rules trimestralmente. Usa rate limiting
- **Seguridad de connection pool**: usa TLS para database connections. Setea connection timeout para prevenir slow-loris attacks. Rota database credentials. Usa per-service connection pools. Monitorea connection leaks. Alerta en unusual connection patterns. Documenta connection security. Testea connection security. Revisa credentials trimestralmente
- **Content Security Policy para lazy loading**: setea CSP headers para permitir lazy-loaded resources. Usa nonce-based CSP para dynamic imports. Configura script-src para code-split chunks. Monitorea CSP violations. Alerta en CSP violation spikes. Documenta CSP configuration. Testea CSP con lazy loading. Revisa CSP policy trimestralmente

## Deployment y CI/CD

- **Performance testing en CI**: corre performance tests en cada PR. Usa Lighthouse CI para web performance. Usa k6 para load testing. Setea performance budgets. Failea builds en budget violations. Monitorea performance trends. Documenta CI performance checks. Testea CI integration. Revisa performance budgets trimestralmente. Usa caching para test artifacts
- **Deployment progresivo para performance changes**: deploya performance changes gradualmente. Usa canary deployment. Monitorea performance metrics. Roll back en regression. Documenta deployment strategy. Testea canary detection. Revisa canary thresholds. Usa feature flags para performance changes. Monitorea canary metrics. Documenta rollback procedures
- **Bundle analysis en CI**: analiza bundle size en cada build. Compara con baseline. Alerta en size increase. Usa webpack-bundle-analyzer o source-map-explorer. Setea size budgets por chunk. Documenta bundle analysis setup. Testea bundle analysis. Revisa bundle budgets trimestralmente. Trackea bundle size trends. Usa CI artifacts para analysis

## Testing y Quality Assurance

- **Performance regression testing**: corre performance tests en cada release. Compara con previous baseline. Alerta en regressions excediendo 5%. Usa synthetic monitoring para key user journeys. Documenta regression thresholds. Testea en production-like environment. Revisa regression trends. Automatiza regression detection. Documenta test procedures
- **Best practices de load testing**: testea con realistic user patterns. Rampea up gradualmente. Monitorea system resources. Testea diferentes endpoints. Usa think time entre requests. Documenta test scenarios. Testea en staging primero. Revisa test coverage. Usa production-like data volumes. Monitorea memory leaks durante tests
- **CDN cache testing**: verifica que cache headers esten seteados correctamente. Testea cache purge functionality. Verifica stale content serving. Testea cache key normalization. Monitorea cache hit ratio en testing. Documenta cache testing procedures. Testea con query parameters. Revisa cache behavior. Testea edge cases. Valida cache invalidation
## Herramientas y Plataformas

- **WebPageTest**: herramienta detailed de web performance testing. Waterfall view de resource loading. Filmstrip view de visual progress. Testea desde diferentes locations y devices. Setea custom connectivity profiles. Documenta testing workflow. Testea key pages regularmente. Revisa performance trends. Usa para deep analysis. Compara con Lighthouse results
- **Lighthouse**: herramienta de Google para web performance auditing. Scorea performance, accessibility, SEO y best practices. Corre en Chrome DevTools o CLI. Usa en CI para automated checks. Setea performance budget basado en Lighthouse scores. Documenta Lighthouse workflow. Testea en mobile y desktop. Revisa scores mensualmente. Trackea score trends
- **k6**: herramienta modern de load testing por Grafana. Test scripts basados en JavaScript. Soporte para HTTP, gRPC, WebSocket. Thresholds para pass/fail. Cloud execution option. Integration con Grafana. Documenta k6 usage. Crea reusable test scenarios. Testea en staging. Revisa test coverage. Usa k6 cloud para distributed tests
- **webpack-bundle-analyzer**: visualiza bundle composition. Identifica large dependencies. Encuentra duplicate modules. Optimiza tree shaking. Documenta bundle analysis workflow. Corre en CI. Revisa bundle mensualmente. Setea size alerts. Usa con performance budgets. Trackea bundle composition en el tiempo
- **Cloudflare CDN**: CDN global con edge caching. Workers para edge compute. Cache rules y page rules. Real-time analytics. DDoS protection incluido. Documenta Cloudflare configuration. Testea cache behavior. Revisa cache rules trimestralmente. Monitorea cache hit ratio. Usa Workers para edge logic
- **Fastly CDN**: CDN con instant purge. VCL para edge configuration. Real-time logging. Image optimization. Documenta Fastly configuration. Testea purge functionality. Revisa VCL rules. Monitorea cache performance. Usa real-time logging para debugging. Testea edge logic

## Pitfalls Comunes y Anti-Patrones

- **Over-compression**: comprimir content ya compressed wastea CPU. No comprimas images, videos o pre-compressed assets. Setea gzip_types y rotli_types cuidadosamente. Monitorea CPU usage. Testea compression overhead. Documenta compression rules. Revisa content types trimestralmente. Usa Content-Encoding checks
- **Miconfiguracion de CDN**: incorrect cache headers causan poor hit ratio. No cachees personalized content. Usa Vary header para content negotiation. Setea appropriate TTLs. Monitorea cache hit ratio. Testea cache behavior. Documenta CDN rules. Revisa cache configuration mensualmente. Usa cache tags para targeted purging
- **Connection pool over-sizing**: demasiadas connections wastean database resources. Cada connection usa memory en el database server. Setea max pool size basado en database capacity. Monitorea database connection count. Alerta en too many connections. Documenta sizing guidelines. Testea bajo load. Revisa pool size trimestralmente
- **Lazy loading everything**: lazy loading above-the-fold content perjudica LCP. Loadea critical content eagerly. Usa loading="eager" para hero images. Usa etchpriority="high" para LCP elements. Monitorea LCP metrics. Documenta lazy loading strategy. Testea above-the-fold performance. Revisa lazy loading coverage. Usa preload para critical resources
- **Load testing sin think time**: load testing sin think time crea unrealistic load. Agrega think time entre requests. Usa random think time. Simula real user behavior. Documenta test scenarios. Testea con diferentes think times. Revisa test realism. Usa k6 sleep() function. Monitorea unrealistic patterns
- **Code splitting demasiado granular**: demasiados small chunks causan excessive network requests. Groupa related components en chunks. Setea minimum chunk size. Usa maxAsyncRequests y maxInitialRequests sabiamente. Monitorea chunk count. Documenta splitting strategy. Testea loading performance. Revisa chunk configuration. Usa manual chunks para vendor code

## Resumen de Best Practices

- **Setea performance budgets**: define budgets para key metrics. LCP under 2.5 segundos. FID under 100ms. CLS under 0.1. Bundle size under 200KB. Monitorea budgets en CI. Failea builds en violations. Documenta budget rationale. Revisa budgets trimestralmente. Comunica budget status. Usa Lighthouse para budget enforcement
- **Monitorea Core Web Vitals**: trackea LCP, INP y CLS. Usa RUM para real user data. Usa synthetic monitoring para lab data. Setea alerts en metric degradation. Documenta monitoring setup. Testea alerting. Revisa metrics mensualmente. Investiga regressions. Usa Search Console para field data. Prioriza fixes basado en impact
- **Optimiza critical rendering path**: minimiza render-blocking resources. Inlinea critical CSS. Deferea non-critical JavaScript. Usa preload para key resources. Optimiza font loading. Documenta CRP optimization. Testea con WebPageTest. Revisa rendering performance. Monitorea FCP y LCP. Usa sync y defer attributes
- **Usa progressive enhancement**: builda core functionality primero. Enhancea con JavaScript. Testea sin JavaScript. Usa feature detection. Documenta enhancement strategy. Testea en low-end devices. Revisa accessibility. Monitorea JavaScript failures. Usa server-side rendering. Provee fallbacks para critical features
## Optimizacion de Costos

- **Gestion de costos de CDN**: monitorea CDN bandwidth costs. Usa cache optimization para reducir origin requests. Setea appropriate TTLs para maximizar cache hits. Usa CDN tiering para diferentes content types. Revisa CDN bills mensualmente. Documenta cost optimization strategies. Alerta en cost spikes. Usa compression para reducir bandwidth. Revisa CDN pricing plans anualmente
- **Costos de CPU de compression**: balancea compression savings con CPU costs. Usa Brotli level 4 para dynamic content. Pre-comprime static assets en build time. Monitorea CPU usage de compression. Documenta compression cost analysis. Testea diferentes compression levels. Revisa compression cost trimestralmente. Usa hardware acceleration donde disponible
- **Costos de resources de connection pool**: cada connection usa memory y CPU. Right-sizea pools para minimizar waste. Monitorea idle connections. Cierra unused connections. Documenta pool cost analysis. Testea pool sizing impact. Revisa pool costs trimestralmente. Usa connection pooling eficientemente. Monitorea database resource usage
- **Costos de load testing infrastructure**: optimiza load testing infrastructure costs. Usa spot instances para load tests. Programa tests durante off-peak. Usa k6 open source para basic tests. Documenta cost optimization. Revisa testing costs trimestralmente. Usa cloud-native load testing. Monitorea test infrastructure costs. Usa auto-scaling para test runners

## Guia de Troubleshooting

- **Slow page load**: diagnostica con WebPageTest. Chequea LCP element. Identifica render-blocking resources. Optimiza images. Minifica CSS y JavaScript. Usa CDN para static assets. Documenta troubleshooting steps. Testea fixes. Monitorea improvement. Revisa page load mensualmente
- **High CDN origin requests**: chequea cache headers. Verifica cache key configuration. Revisa TTL settings. Chequea cache bypass patterns. Monitorea cache hit ratio. Documenta troubleshooting steps. Testea cache fixes. Revisa CDN configuration. Purga y retestea
- **Connection pool timeouts**: chequea pool size. Monitorea connection usage. Identifica slow queries. Optimiza database performance. Incrementa pool size si needed. Documenta troubleshooting steps. Testea pool changes. Revisa pool configuration. Monitorea wait times
- **Poor load test results**: chequea test script. Verifica test environment. Monitorea system resources. Identifica bottlenecks. Optimiza application code. Scalea infrastructure. Documenta troubleshooting steps. Testea fixes. Revisa test results. Compara con baseline
## Monitoring y Alerting

- **Estrategia de performance monitoring**: monitorea key metrics continuamente. Trackea LCP, INP, CLS para web vitals. Trackea response times para APIs. Trackea error rates. Setea thresholds para alerts. Usa RUM para real user data. Usa synthetic monitoring para lab data. Documenta monitoring strategy. Revisa metrics mensualmente. Ajusta thresholds basado en trends
- **Configuracion de alerts para performance**: setea alerts en metric degradation. LCP above 2.5 segundos. Error rate above 1%. Response time above 500ms. Usa multi-level alerts: warning y critical. Documenta alert thresholds. Testea alert delivery. Revisa alert effectiveness mensualmente. Reduce alert noise. Usa runbooks para cada alert
- **Diseno de dashboards para performance**: crea dashboards para diferentes audiences. Executive dashboard para high-level metrics. Engineering dashboard para detailed metrics. Operations dashboard para real-time monitoring. Usa clear visualizations. Documenta dashboard usage. Revisa dashboards mensualmente. Remueve unused panels. Optimiza dashboard queries. Usa templating para reuse
- **Deteccion de performance regression**: automatiza regression detection. Compara current metrics con baseline. Usa statistical analysis para significance. Alerta en regressions excediendo threshold. Documenta detection rules. Testea detection accuracy. Revisa thresholds trimestralmente. Trackea regression trends. Usa canary analysis para deployments

## Patrones Avanzados

- **Edge computing para performance**: mueve computation al edge. Usa Cloudflare Workers o AWS Lambda@Edge. Reduce latency para global users. Cachea dynamic content en edge. Documenta edge computing strategy. Testea edge performance. Revisa edge configuration. Monitorea edge function performance. Usa edge para personalization
- **Optimizacion de resource hints**: usa preconnect para critical origins. Usa preload para key resources. Usa prefetch para next-page resources. Usa dns-prefetch para external domains. Monitorea resource hint effectiveness. Documenta hint strategy. Testea con WebPageTest. Revisa hints trimestralmente. Remueve unused hints
- **Pipeline de image optimization**: automatiza image optimization. Usa responsive images con srcset. Usa modern formats como WebP y AVIF. Genera multiples sizes en build time. Usa CDN para image transformation. Documenta optimization pipeline. Testea image loading. Revisa image formats. Monitorea image payload size. Usa lazy loading para below-fold images
## Estrategias de Migracion

- **Migracion de gzip a Brotli**: habilita Brotli junto a gzip para gradual migration. Testea Brotli con diferentes browsers. Monitorea compression ratios. Manten gzip como fallback para older browsers. Documenta migration strategy. Testea en staging. Revisa compression performance. Roll out progresivamente. Monitorea issues
- **Migracion a un nuevo CDN**: corre ambos CDNs en paralelo durante migration. Compara cache hit ratios. Testea purge functionality. Verifica SSL certificates. Monitorea performance metrics. Switchea DNS gradualmente. Documenta migration runbook. Testea failback procedures. Revisa migration progress. Completa DNS switch despues de validation
- **Migracion de connection pools**: migra pool configuration gradualmente. Testea new pool size en staging. Monitorea connection usage. Roll out a un service a la vez. Documenta migration strategy. Testea failback. Revisa pool performance. Completa migration despues de validation. Monitorea connection issues

## Compliance y Governance

- **Performance SLAs**: define performance SLAs para critical endpoints. API response time under 200ms. Page load time under 3 segundos. Trackea SLA compliance. Alerta en SLA violations. Documenta SLA definitions. Revisa SLAs trimestralmente. Comunica SLA status. Testea SLA monitoring. Usa SLA para priorizacion
- **Performance reporting**: genera weekly performance reports. Incluye key metrics y trends. Highlighta regressions y improvements. Comparte con stakeholders. Documenta reporting methodology. Automatiza report generation. Revisa report content. Trackea performance en el tiempo. Usa reports para planning
## FAQ

**P: Funciona con SSR?**
R: Si, pero usa `@loadable/component` en lugar de `React.lazy` para soporte de server-side rendering.

**P: Que tan pequeno deberia ser cada chunk?**
R: Apunta a 30-100KB gzip por chunk de ruta. Demasiados chunks pequenos afectan rendimiento por overhead de requests.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.