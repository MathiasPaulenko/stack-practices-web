---
contentType: patterns
slug: content-delivery-network-pattern
title: "Patrón Content Delivery Network (CDN)"
description: "Distribuye contenido estático y dinámico a través de servidores edge geográficamente dispersos para reducir latencia, mejorar disponibilidad y descargar infraestructura de origen."
metaDescription: "Aprende el Patrón CDN para edge caching y distribución de contenido. Ejemplos en JavaScript, Python y Terraform con CloudFront, Fastly y Vercel Edge."
difficulty: beginner
topics:
  - design
  - architecture
  - infrastructure
  - performance
tags:
  - content-delivery-network
  - pattern
  - design-pattern
  - edge
  - caching
  - performance
  - cloudfront
  - fastly
relatedResources:
  - /patterns/design/static-content-hosting-pattern
  - /patterns/design/throttling-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón CDN para edge caching y distribución de contenido. Ejemplos en JavaScript, Python y Terraform con CloudFront, Fastly y Vercel Edge."
  keywords:
    - cdn
    - content delivery network
    - edge caching
    - performance
    - cloudfront
    - fastly
---

# Patrón Content Delivery Network (CDN)

## Descripción General

El Patrón Content Delivery Network (CDN) distribuye contenido a través de una red geográficamente dispersa de servidores edge, colocando copias cacheadas de assets más cerca de los usuarios finales. En lugar de que cada request viaje a un único servidor de origen, los usuarios son enrutados a la ubicación edge más cercana, reduciendo dramáticamente la latencia, mejorando la disponibilidad y descargando tráfico de la infraestructura de origen.

Los CDNs sirven contenido estático (imágenes, CSS, JavaScript, videos) desde caches edge e incrementalmente soportan aceleración de contenido en vivo, edge computing (Cloudflare Workers, Lambda@Edge), y protección DDoS. Un CDN bien configurado puede reducir los tiempos de carga de página en un 50% o más y absorber picos de tráfico que abrumarían un servidor de origen.

## Cuándo Usar

Usa el Patrón CDN cuando:
- Los usuarios están geográficamente distribuidos y la latencia importa
- Los assets estáticos (imágenes, CSS, JS, fuentes, videos) representan la mayor parte del tráfico
- Necesitas manejar picos de tráfico sin escalar infraestructura de origen
- Se requiere protección DDoS y funcionalidad WAF en el edge
- El edge computing (A/B testing, geo-routing, autenticación) es beneficioso

## Cuándo Evitar

- Todos los usuarios están en la misma región geográfica que el servidor de origen
- El contenido es altamente personalizado y no puede ser cacheado (datos en tiempo real)
- La aplicación es completamente interna sin usuarios externos
- La complejidad de invalidación de cache supera el beneficio de latencia

## Solución

### JavaScript (CloudFront + S3 Origin)

```javascript
// AWS SDK v3 configuration para invalidación de CDN
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

/**
 * Invalida cache de CDN para paths específicos después de deployment
 */
async function invalidateCache(distributionId, paths = ['/*']) {
  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: paths.length,
        Items: paths
      }
    }
  });

  const response = await cloudfront.send(command);
  console.log(`Invalidación creada: ${response.Invalidation.Id}`);
  return response.Invalidation.Id;
}

// Uso: invalidar después de deployment de assets estáticos
await invalidateCache('E1234567890ABC', ['/assets/*', '/index.html']);
```

### Python (CDN Cache Warmup + Edge Logic)

```python
import requests
import hashlib
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor

class CDNManager:
    """Gestiona interacciones de CDN para cache warmup, purging y health checks"""
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.edge_locations = [
            "us-east", "us-west", "eu-west", "eu-central",
            "ap-southeast", "ap-northeast", "sa-east"
        ]

    def generate_cache_key(self, path: str, params: Dict = None) -> str:
        """Genera una clave de cache determinística para una URL"""
        content = f"{path}:{sorted(params.items()) if params else ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def warmup_cache(self, paths: List[str]) -> Dict[str, bool]:
        """Pre-pobla caches edge de CDN solicitando a través de cada ubicación"""
        results = {}

        def fetch(path):
            try:
                response = requests.get(
                    f"{self.base_url}{path}",
                    headers={"X-Cache-Warmup": "true"},
                    timeout=30
                )
                return path, response.status_code == 200
            except Exception:
                return path, False

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch, p) for p in paths]
            for future in futures:
                path, success = future.result()
                results[path] = success

        return results

    def purge_cache(self, path: str) -> bool:
        """Purge un path específico del cache de CDN"""
        try:
            response = requests.post(
                f"{self.base_url}/__purge",
                json={"path": path},
                headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Purge falló para {path}: {e}")
            return False

    def get_cache_status(self, path: str) -> Dict:
        """Verifica estado de cache HIT/MISS para un path"""
        response = requests.get(f"{self.base_url}{path}")
        return {
            "path": path,
            "cache_status": response.headers.get("X-Cache", "unknown"),
            "age": response.headers.get("Age", "0"),
            "ttl_remaining": response.headers.get("Cache-Control", "")
        }


# Uso
cdn = CDNManager("https://cdn.example.com", api_key="secret-key")

# Warmup de paths críticos después de deployment
warmup_results = cdn.warmup_cache([
    "/assets/main.css",
    "/assets/app.js",
    "/api/config"
])
print(f"Cache warmup: {sum(warmup_results.values())}/{len(warmup_results)} exitoso")

# Verificar estado de cache
status = cdn.get_cache_status("/assets/main.css")
print(f"Cache: {status['cache_status']}, Age: {status['age']}s")
```

### Terraform (AWS CloudFront Distribution)

```hcl
# Infrastructure as Code para distribución CloudFront CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StackPractices CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All" # Distribución global

  # Origin: S3 bucket para assets estáticos
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-assets"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  # Origin: ALB para API dinámica
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior: assets estáticos desde S3
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    compress         = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 1 día
    max_ttl                = 31536000 # 1 año
  }

  # Ordered cache behavior: API calls sin caching
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-api"
    compress         = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Edge caching para tipos de asset específicos
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    compress         = true

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400    # 1 día
    default_ttl            = 604800    # 1 semana
    max_ttl                = 31536000  # 1 año
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = "production"
    Service     = "cdn"
  }
}
```

## Explicación

Un CDN opera sobre tres principios:

1. **Distribución geográfica**: Servidores edge en cientos de ubicaciones mundiales sirven contenido desde el punto más cercano al usuario
2. **Jerarquía de caching**: El contenido se cachea en edge, regional y tiers de origen con expiración basada en TTL
3. **Enrutamiento de requests**: Enrutamiento basado en DNS o anycast dirige usuarios a la ubicación edge óptima

El comportamiento de cache se controla a través de:
- **Headers TTL**: `Cache-Control: max-age=3600` le dice al CDN cuánto tiempo cachear
- **Claves de cache**: Identificadores únicos que determinan cuándo el contenido se considera idéntico
- **Invalidación**: Eliminación explícita de contenido cacheado cuando se vuelve obsoleto

## Variantes

| Variante | Caso de Uso | Ejemplo |
|----------|-------------|---------|
| **CDN de assets estáticos** | Imágenes, CSS, JS, fuentes | CloudFront + S3 |
| **Aceleración de edge** | Respuestas de API, páginas HTML | Cloudflare Argo, Fastly |
| **Video streaming** | Segmentos HLS/DASH, streams en vivo | AWS MediaPackage, Akamai |
| **Edge computing** | A/B testing, auth, personalización | Cloudflare Workers, Lambda@Edge |
| **Multi-CDN** | Resiliencia y optimización de costo | CloudFront + Fastly failover |

## Lo que funciona

- **Usa nombres de archivo versionados para cache-busting.** `app.v2.js` en lugar de `app.js` con caching agresivo.
- **Establece TTLs apropiados.** Assets estáticos: 1 año. HTML: corto o sin cache. API: dependiente de contexto.
- **Configura claves de cache personalizadas cuidadosamente.** Parámetros de query, headers y cookies afectan la tasa de cache hit.
- **Implementa degradación graceful.** Si el CDN falla, los requests deberían fallback al origen.
- **Monitorea el ratio de cache hit.** Por debajo de 80% sugiere problemas de configuración; por encima de 95% es excelente.

## Errores Comunes

- **Olvidar invalidar después de deployment.** Los usuarios ven contenido obsoleto porque el cache no fue purgado.
- **Over-caching de contenido personalizado.** Páginas personalizadas cacheadas públicamente filtran datos entre usuarios.
- **Ignorar variaciones de clave de cache.** `?utm_source=x` y `?utm_source=y` crean entradas cacheadas duplicadas.
- **No comprimir en el edge.** Gzip/Brotli debería ser aplicado por el CDN, no solo el origen.
- **Single point of failure.** Usar un único proveedor CDN sin fallback a origen es riesgoso.

## Ejemplos del Mundo Real

### Netflix Open Connect

Netflix despliega sus propios appliances CDN dentro de redes ISP. Esto reduce costos de tránsito y entrega video 4K con buffering mínimo colocando contenido dentro de la infraestructura del ISP.

### StackPractices.com

Este sitio usa GitHub Pages con Cloudflare al frente. HTML estático, CSS y JS son cacheados en edge de Cloudflare, reduciendo carga de origen y mejorando tiempos de carga globales.

### Shopify Storefronts

Shopify usa Fastly para servir millones de storefronts. Los assets de tema de cada tienda son cacheados en ubicaciones edge, habilitando tiempos de carga de página sub-segundo globalmente aunque la plataforma origen esté centralizada.

## Preguntas Frecuentes

**Q: Un CDN solo funciona para contenido estático?**
A: No. Los CDNs modernos aceleran contenido en vivo optimizando conexiones TCP, routing y terminación TLS. El edge computing también habilita lógica en vivo en el edge.

**Q: Cómo manejo la invalidación de cache?**
A: Usa nombres de archivo versionados para assets estáticos (inmutable). Para recursos nombrados, usa APIs de purge de CDN o establece TTLs cortos. Un patrón común es `Cache-Control: max-age=0, s-maxage=3600` para CDNs mientras mantienes el navegador sin cachear.

**Q: Cuál es la diferencia entre pull y push CDN?**
A: Los CDNs pull obtienen contenido del origen en el primer request. Los CDNs push requieren que subas contenido explícitamente. La mayoría de CDNs modernos son pull-based con shielding de origen opcional.

**Q: Debería usar un CDN para una aplicación interna?**
A: Usualmente no, a menos que los usuarios estén distribuidos entre oficinas. Las aplicaciones internas típicamente se benefician más de optimizar el origen que de la distribución geográfica.
