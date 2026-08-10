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
  - /patterns/composite-pattern-ui
  - /patterns/bridge-pattern-ui-themes
  - /guides/performance-optimization-guide
  - /recipes/email-templates-mjml
  - /recipes/javascript-event-loop
  - /recipes/server-side-rendering
  - /recipes/web-performance
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Mejora rendimiento de SPAs con code splitting y lazy loading. Divide bundles a nivel de ruta y componente usando React.lazy e imports en vivo para cargas mas rapidas."
  keywords:
    - code splitting
    - lazy loading
    - react lazy
    - spa performance
    - live imports





---
Reduce el tamano del bundle inicial en [single-page applications](/recipes/lazy-loading/) dividiendo codigo a nivel de ruta y componente. Esta recipe demuestra React.lazy, imports en vivo y estrategias de preload que mantienen time-to-interactive bajo sin sacrificar experiencia de usuario.

## Cuando Usar Esto

- Tu bundle de SPA excede 200KB gzip y carga lentamente en mobile
- No todas las rutas son accedidas por cada usuario en la primera visita
- Componentes pesados (graficos, editores, mapas) solo se necesitan en paginas especificas. Consulta [MVC Pattern Frontend](/patterns/mvc-pattern-frontend/) para arquitectura de componentes.

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
- Monitorea [Core Web Vitals](/guides/performance-optimization-guide/) (LCP, INP, CLS) despues de hacer splitting
- Usa `preload` para rutas criticas accedidas por la mayoria de usuarios

## Errores Comunes

- Envolver cada componente en lazy, causando excessive network requests
- No manejar errores de carga con un `ErrorBoundary`
- Olvidar que rutas lazy-loaded aun necesitan que sus datos sean fetched

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





## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de spa y react para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica rendimiento spa: code splitting y lazy loading** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
