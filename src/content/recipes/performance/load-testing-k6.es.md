---
contentType: recipes
slug: load-testing-k6
title: "Testing de Carga de APIs con k6 y Aserciones Basadas en"
description: "Como escribir y ejecutar tests de carga con k6 para medir rendimiento de APIs, validar SLOs e identificar cuellos de botella antes del despliegue a produccion"
metaDescription: "Testing de carga de APIs con k6. Mide rendimiento, valida SLOs con aserciones de umbrales e identifica cuellos de botella antes del despliegue a produccion."
difficulty: intermediate
topics:
  - testing
  - performance
tags:
  - benchmarks
  - testing
  - performance
  - api
  - unit-tests
relatedResources:
  - /recipes/load-testing
  - /recipes/integration-testing
  - /guides/testing-strategy-guide
  - /recipes/api-mocking
  - /docs/api-testing-strategy-template
  - /docs/load-test-report-template
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Testing de carga de APIs con k6. Mide rendimiento, valida SLOs con aserciones de umbrales e identifica cuellos de botella antes del despliegue a produccion."
  keywords:
    - k6 load testing
    - api performance
    - load test
    - benchmarking
    - slo validation



---
k6 es una herramienta moderna de testing de carga construida para desarrolladores. Usa JavaScript para scripting de tests y proporciona metricas integradas, aserciones de umbrales y escenarios modulares que te ayudan a validar requerimientos de rendimiento antes de que el codigo llegue a produccion.

## Cuando Usar Esto

- Necesitas verificar que las APIs cumplen SLOs de tiempo de respuesta y throughput. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para monitoreo de APIs.
- Quieres simular patrones de trafico de usuarios realistas. Consulta [Load Testing](/recipes/testing/load-testing) para estrategias de carga.
- El testing de regresion debe detectar degradacion de rendimiento en CI/CD. Consulta [CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para integración continua.

## Requisitos Previos

- k6 instalado (`brew install k6` o descargar desde k6.io)
- Un endpoint de API ejecutandose para testear

## Solucion

### 1. Script Basico de Test de Carga

```javascript
// load-tests/basic.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Estado estable
    { duration: '2m', target: 200 },   // Spike
    { duration: '5m', target: 200 },   // Carga sostenida
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% bajo 500ms
    http_req_failed: ['rate<0.01'],     // Tasa de error bajo 1%
  },
};

export default function () {
  const response = http.get('https://api.example.com/products');

  check(response, {
    'status es 200': (r) => r.status === 200,
    'tiempo de respuesta < 500ms': (r) => r.timings.duration < 500,
    'tiene array de productos': (r) => r.json().length > 0,
  });

  sleep(1);
}
```

### 2. Testing de API Autenticada

```javascript
// load-tests/authenticated.js
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  vus: 50,
  duration: '10m',
};

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  // Simular un flujo de usuario
  const cart = http.post(`${BASE_URL}/cart`, JSON.stringify({ items: [1, 2, 3] }), params);
  check(cart, { 'carrito creado': (r) => r.status === 201 });

  const checkout = http.post(`${BASE_URL}/checkout`, JSON.stringify({ cartId: cart.json('id') }), params);
  check(checkout, {
    'checkout exitoso': (r) => r.status === 200,
    'orden confirmada': (r) => r.json('status') === 'confirmed',
  });
}
```

### 3. Ejecutar Tests e Interpretar Resultados

```bash
# Ejecutar test de carga basico
k6 run load-tests/basic.js

# Ejecutar con variables de entorno
k6 run --env BASE_URL=https://staging.example.com --env AUTH_TOKEN=token123 load-tests/authenticated.js

# Output a InfluxDB para dashboards de Grafana
k6 run --out influxdb=http://localhost:8086/k6 load-tests/basic.js

# Ejecucion en cloud para carga distribuida
k6 cloud run load-tests/basic.js
```

### 4. Smoke Test para CI/CD

```javascript
// load-tests/smoke.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['max<2000'],
    http_req_failed: ['rate===0'],
  },
};

export default function () {
  const endpoints = [
    '/health',
    '/products',
    '/users/me',
  ];

  for (const endpoint of endpoints) {
    const res = http.get(`https://api.example.com${endpoint}`);
    check(res, {
      [`${endpoint} es 200`]: (r) => r.status === 200,
    });
  }
}
```

## Como Funciona

1. **Virtual Users (VUs)** simulan clientes concurrentes haciendo peticiones
2. **Stages** definen patrones de ramp-up, carga sostenida y ramp-down
3. **Thresholds** aseguran que metricas cumplan SLOs; thresholds fallidos salen con estado no-cero
4. **Checks** validan correccion funcional bajo carga

## Consideraciones de Produccion

- Ejecuta smoke tests en cada pull request para detectar regresiones basicas
- Programa soak tests (ejecuciones de horas) para encontrar memory leaks
- Usa ambientes separados para testing de carga; nunca testees produccion directamente
- Correlaciona metricas de k6 con herramientas APM (Datadog, New Relic) para analisis de root cause

## Errores Comunes

- Testear desde una sola maquina que se convierte en cuello de botella
- No calentar la aplicacion antes de medir rendimiento de estado estable
- Usar `sleep()` con intervalos aleatorios que no coinciden con think time de usuarios reales

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
## FAQ

**P: Cuantos VUs necesito para simular 10,000 usuarios reales?**
R: Depende de la frecuencia de peticiones. Si cada usuario hace una peticion cada 30 segundos, 50-100 VUs pueden simular 10,000 usuarios.

**P: Puede k6 testear conexiones WebSocket?**
R: Si, a traves del modulo experimental `k6/ws`, aunque herramientas dedicadas de WebSocket pueden ser mas apropiadas.

**P: Como manejo datos en vivo en tests de carga?**
R: Usa `papaparse` para leer archivos CSV o genera datos randomizados con funciones `random` integradas.

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
- **Guías relacionadas**: explora las guías de benchmarks y testing para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica testing de carga de apis con k6 y aserciones basadas en** cuando necesites una solución práctica para tu caso de uso.
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
