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
relatedResources:
  - /guides/performance-optimization-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/debounce-throttle
  - /guides/system-design-interview-guide
  - /guides/logging-monitoring-observability-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
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
# Implementar CDN edge caching

## Visión General

Una Red de Entrega de Contenido (CDN) distribuye tu contenido a través de servidores edge geográficamente dispersos, reduciendo la latencia al servir a los usuarios desde la ubicación más cercana, mejorando [rendimiento](/guides/performance/performance-optimization-guide). Un edge caching correctamente configurado puede reducir los tiempos de carga de página en un 50–80% y disminuir considerablemente la carga del servidor de origen.

Esta receta cubre la configuración de reglas de edge caching de CDN, estrategias de invalidación de caché y optimización geográfica para contenido estático y en vivo.

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

- **Configura TTLs largos para assets inmutables**: Versiona nombres de archivo (`app.v2.js`) y cachea por 1 año
- **Usa cache busting para despliegues**: Cambia URLs en lugar de invalidar — es más rápido y confiable
- **Configura stale-while-revalidate**: Sirve contenido stale mientras obtienes actualizaciones en segundo plano
- **Habilita compresión en el edge**: Brotli o Gzip reduce el tamaño de transferencia en un 60–80%
- **Usa surrogate keys para invalidación dirigida**: Etiqueta grupos de contenido y purga por tag en lugar de vaciar todo

## Errores Comunes

- **Cachear sin headers apropiados**: Falta de `Cache-Control` causa comportamiento impredecible entre navegadores y CDNs
- **Sobre-invalidation**: Vaciar todo el caché en cada despliegue anula el propósito de una CDN
- **Ignorar normalización de query strings**: `?v=1` y `?v=2` deberían tratarse como la misma clave de caché para assets estáticos
- **No monitorear el cache hit ratio**: Ratios bajos indican mala configuración — apunta a 85%+
- **Cachear contenido autenticado**: Nunca cachees respuestas con `Set-Cookie` o datos personalizados sin headers `Vary` apropiados

## Preguntas Frecuentes

**P: ¿Cómo cacheo respuestas en vivo de API?**
R: Usa `s-maxage` (surrogate max age) para cacheo solo de CDN manteniendo `max-age=0` para navegadores. Invalida via surrogate keys cuando los datos subyacentes cambien.

**P: ¿Cuál es la diferencia entre purging e invalidation?**
R: Purging elimina contenido de los caches edge inmediatamente. Invalidation marca contenido como stale pero puede servirlo mientras obtiene actualizaciones. Purging es explícito; invalidation puede ser pasivo.

**P: ¿Debería usar una CDN para backends solo de API?**
R: Sí, si las respuestas son cacheables. [GraphQL](/recipes/api/call-rest-api) es más difícil de cachear en el edge que REST, pero servicios como Cloudflare Workers o Fastly Compute pueden implementar cacheo de queries a nivel edge.
