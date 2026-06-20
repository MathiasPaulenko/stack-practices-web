---
contentType: recipes
slug: api-rate-limiting
title: "[ES] API Rate Limiting"
description: "[ES] Protect APIs from abuse and ensure fair resource usage with token bucket, sliding window, and leaky bucket rate limiting."
metaDescription: "[ES] API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - api
  - redis
  - security
relatedResources:
  - /guides/api-security-checklist-guide
  - /recipes/api-rate-limiting-redis
  - /guides/web-application-security-guide
  - /recipes/rate-limiting
  - /docs/api-deprecation-notice-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "[ES] API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
  keywords:
    - rate-limiting
    - api
    - redis
    - security
---
## Visión General

El rate limiting protege las APIs de abuso y asegura distribución justa de recursos. Consulta [Rate Limiting de APIs con Redis](/recipes/api/api-rate-limiting-redis) para una implementación completa basada en Redis y [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para prácticas generales de seguridad.

## Cuándo Usar

Use this resource when:
- APIs públicas necesitan protección contra brute force y scraping
- Diferentes tiers de usuarios requieren diferentes rate limits
- Múltiples nodos de API deben compartir estado de rate limit consistentemente

## Solución

### Python

```python
# Add your Python solution here
```

### JavaScript

```javascript
// Add your JavaScript solution here
```

### Java

```java
// Add your Java solution here
```

## Explicación

[Explain how it works, edge cases, and trade-offs.]

## Variantes

| Technology | Approach | Notes |
|------------|----------|-------|
| [Technology] | [Approach] | [Notes] |

## Mejores Prácticas

1. Usa token bucket para bursts controlados y ventana deslizante para límites estrictos
2. Retorna headers `Retry-After` con respuestas 429 para que los clientes sepan cuándo reintentar
3. Rate limita por ID de usuario, no solo por IP, para evitar bloquear usuarios legítimos detrás de NAT
4. Loguea violaciones de rate limit para monitoreo de seguridad y detección de abuso
5. Implementa [circuit breaker](/patterns/design/circuit-breaker-pattern) alrededor de Redis para fail open si el cache cae

## Errores Comunes

1. Rate limitar solo por IP, bloqueando usuarios legítimos detrás de NAT
2. No manejar fallos de Redis gracefulmente, causando outages de API
3. Retornar 429 sin headers `Retry-After`, dejando clientes adivinando
4. Usar el mismo rate limit para todos los endpoints sin importar costo o sensibilidad
5. Ignorar violaciones de rate limit en lugar de loguearlas para análisis de seguridad

## Preguntas Frecuentes

### Pregunta 1

Respuesta 1

### Pregunta 2

Respuesta 2.

### Pregunta 3

Respuesta 3.
