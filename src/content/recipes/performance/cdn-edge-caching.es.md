---
contentType: recipes
slug: cdn-edge-caching
title: "Implementar CDN edge caching"
description: "Configura redes de entrega de contenido con reglas de edge caching, invalidación de caché y optimización geográfica para contenido estático y en vivo."
metaDescription: "Implementa CDN edge caching con reglas de caché, invalidación y geo-optimización. Configura CloudFront, Cloudflare y Fastly para contenido estático y en vivo."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - cdn
  - optimization
  - profiling
  - latency
relatedResources:
  - /guides/performance-optimization-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/debounce-throttle
  - /guides/system-design-interview-guide
  - /guides/logging-monitoring-observability-guide
  - /recipes/brotli-nginx-compression
  - /recipes/cache-invalidation
  - /recipes/caching-strategies
  - /recipes/connection-pooling
  - /recipes/lazy-loading
lastUpdated: "2026-06-12"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa CDN edge caching con reglas de caché, invalidación y geo-optimización. Configura CloudFront, Cloudflare y Fastly para contenido estático y en vivo."
  keywords:
    - cdn
    - edge-caching
    - invalidacion-cache
    - cloudfront
    - cloudflare
    - rendimiento


---
## Visión General

Una Red de Entrega de Contenido (CDN) distribuye tu contenido a través de servidores edge geográficamente dispersos, reduciendo la latencia al servir a los usuarios desde la ubicación más cercana, mejorando [rendimiento](/guides/performance/performance-optimization-guide). Un edge caching correctamente configurado puede reducir los tiempos de carga de página en un 50–80% y disminuir considerablemente la carga del servidor de origen.

Aqui se explica como la configuración de reglas de edge caching de CDN, estrategias de invalidación de caché y optimización geográfica para contenido estático y en vivo.

## Cuándo Usar

Usa este recurso cuando:
- Tu audiencia global experimenta tiempos de carga lentos desde un único origen
- Tu servidor de origen está saturado por peticiones repetidas del mismo contenido
- Necesitas cachear [respuestas de API](/recipes/api/call-rest-api) o páginas generadas en vivo
- Quieres reducir costos de ancho de banda y mejorar [tolerancia a fallos](/guides/devops/logging-monitoring-observability-guide)

## Solución

### Cloudflare (API de Configuración)

```bash
# Configurar reglas de caché para assets estátos
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/pagerules" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "*.css"}}],
    "actions": [{"id": "cache_level", "value": "cache_everything"}],
    "priority": 1
  }'
```

### AWS CloudFront (Terraform)

```hcl
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.default.id
  }
}

resource "aws_cloudfront_cache_policy" "default" {
  name = "static-assets-policy"
  default_ttl = 86400
  max_ttl     = 31536000
  parameters_in_cache_key {
    headers_config { header_behavior = "none" }
    cookies_config { cookie_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}
```

### Fastly (VCL)

```vcl
sub vcl_recv {
  # Cachear assets estáticos por 1 año
  if (req.url.ext ~ "^(css|js|png|jpg|woff2)$") {
    set req.http.X-Static = "true";
  }
}

sub vcl_fetch {
  if (req.http.X-Static == "true") {
    set beresp.ttl = 365d;
    set beresp.http.Cache-Control = "public, max-age=31536000, immutable";
  }
}
```

## Explicación

Las CDNs operan sobre un principio simple: replicar contenido más cerca de los usuarios. Conceptos clave:
- **Edge locations**: Puntos de presencia (PoPs) mundiales donde se cachea el contenido
- **Cache hit**: Contenido encontrado en el edge; servido directamente al usuario
- **Cache miss**: Contenido no está en el edge; se obtiene del origen y luego se cachea
- **TTL (Time to Live)**: Cuánto tiempo el contenido cacheado permanece válido antes de revalidación

El cacheo de contenido en vivo requiere configuración cuidadosa de headers. Usa `Cache-Control: max-age=0, s-maxage=60` para permitir cacheo de CDN mientras previenes cacheo de navegador, o usa surrogate keys para invalidación granular.

## Variantes

| Proveedor | Configuración | Ideal para | Cacheo en vivo |
|-----------|--------------|------------|-----------------|
| Cloudflare | Dashboard, API, Terraform | Uso general, integración DNS | Cache Rules, Workers |
| AWS CloudFront | Console, Terraform, SAM | Ecosistema AWS, orígenes S3 | Cache Policies, Lambda@Edge |
| Fastly | VCL, API, Terraform | Alto tráfico, purge en tiempo real | Surrogate Keys, lógica VCL |
| Akamai | Control Center, PAPI | Empresarial, streaming de media | EdgeWorkers, mPulse |

## Lo que funciona

- **Configura TTLs largos para assets inmutables**: Versiona nombres de archivo (`app.  v2.
- **Usa cache busting para despliegues**: Cambia URLs en lugar de invalidar — es más rápido y confiable
- **Configura stale-while-revalidate**: Sirve contenido stale mientras obtienes actualizaciones en segundo plano
- **Habilita compresión en el edge**: Brotli o Gzip reduce el tamaño de transferencia en un 60–80%
- **Usa surrogate keys para invalidación dirigida**: Etiqueta grupos de contenido y purga por tag en lugar de vaciar todo

## Errores Comunes

- **Cachear sin headers apropiados**: Falta de `Cache-Control` causa comportamiento impredecible entre navegadores y CDNs
- **Sobre-invalidation**: Vaciar todo el caché en cada despliegue anula el propósito de una CDN
- **Ignorar normalización de query strings**: `?  v=1` y `?
- **No monitorear el cache hit ratio**: Ratios bajos indican mala configuración — apunta a 85%+
- **Cachear contenido autenticado**: Nunca cachees respuestas con `Set-Cookie` o datos personalizados sin headers `Vary` apropiados

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




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de performance y cdn para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica implementar cdn edge caching** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿Cómo cacheo respuestas en vivo de API?**
R: Usa `s-maxage` (surrogate max age) para cacheo solo de CDN manteniendo `max-age=0` para navegadores. Invalida via surrogate keys cuando los datos subyacentes cambien.

**P: ¿Cuál es la diferencia entre purging e invalidation?**
R: Purging elimina contenido de los caches edge inmediatamente. Invalidation marca contenido como stale pero puede servirlo mientras obtiene actualizaciones. Purging es explícito; invalidation puede ser pasivo.

**P: ¿Debería usar una CDN para backends solo de API?**
R: Sí, si las respuestas son cacheables. [GraphQL](/recipes/api/call-rest-api) es más difícil de cachear en el edge que REST, pero servicios como Cloudflare Workers o Fastly Compute pueden implementar cacheo de queries a nivel edge.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cómo elijo el CDN provider correcto?

Considera geographic coverage, pricing, features y performance. Cloudflare para global reach y Workers. Fastly para instant purge y VCL. AWS CloudFront para AWS integration. Google Cloud CDN para GCP integration. Testea con tus actual traffic patterns. Compara cache hit ratios. Revisa pricing para tu data volume.

### ¿Cuál es la diferencia entre CDN caching y browser caching?

CDN caching storea content en edge servers mas cerca de users. Browser caching storea content en el user device. CDN caching reduce origin load. Browser caching elimina network requests enteramente. Usa ambos: CDN para first visit, browser para subsequent visits. Setea appropriate Cache-Control headers para cada layer.

### ¿Cómo manejo personalized content en un CDN?

No cachees personalized content en el CDN level. Usa `Cache-Control: private` para user-specific responses. Usa `Vary: Cookie` para cookie-based personalization. Usa edge-side includes para personalized fragments. Cachea shared content en CDN. Fetchea personalized content desde origin. Documenta caching strategy para cada endpoint.

### ¿Cómo purgo CDN cache efectivamente?

Usa el CDN API para programmatic purging. Purga por URL para specific pages. Purga por cache tag para related content. Purga por surrogate key para grouped content. Evita full cache purges en production. Testea purge propagation time. Documenta purge procedures. Monitorea purge effectiveness. Setea webhooks para purge confirmation. Usa gradual purging para large-scale updates.

### ¿Qué es stale-while-revalidate?

Stale-while-revalidate es un Cache-Control directive que permite servir stale content mientras fetchea fresh content en el background. Mejora perceived performance sirviendo cached content inmediatamente. El CDN sirve stale content y asincronicamente fetchea fresh content. Configura appropriate stale window. Monitorea stale content serving. Documenta SWR configuration. Testea con diferentes content types.

### ¿Cómo monitoreo CDN performance?

Usa CDN analytics dashboards para cache hit ratio, bandwidth y request volume. Setea real-time alerts para origin error rate y cache hit ratio drops. Usa RUM para medir user-perceived latency desde diferentes geographic regions. Monitorea CDN costs y compara con budget. Revisa CDN performance mensualmente. Documenta monitoring setup y alert thresholds.

### ¿Cuál es la diferencia entre push y pull CDN zones?

Push zones requieren que subas content al CDN antes de servir. Controlas exactamente que se cachea. Bueno para static assets con known update schedules. Pull zones fetchean content desde origin en first request y lo cachean. Bueno para dynamic sites con frequent updates. La mayoria de modern CDNs usa pull zones por default. Elije push para static assets y pull para dynamic content. Testea ambos approaches para tu use case.

### ¿Cómo manejo CDN failover?

Configura primary y fallback CDN providers. Usa DNS-based failover para automatic switching. Monitorea CDN health endpoints. Setea health checks a regular intervals. Documenta failover procedures. Testea failover en staging. Revisa failover time. Monitorea partial failures. Usa multi-CDN strategy para critical applications. Manten origin servers como final fallback.

### ¿Puedo usar multiples CDNs simultaneamente?

Si. Multi-CDN strategies mejoran availability y performance. Usa DNS routing o CDN load balancers para distribuir traffic. Configura geographic routing para regional optimization. Monitorea cada CDN independientemente. Documenta routing rules. Testea failover entre CDNs. Compara costs across providers.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
