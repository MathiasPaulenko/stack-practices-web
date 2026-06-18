---
contentType: docs
slug: api-deprecation-notice-template
templateType: api-deprecation
title: "Plantilla de Aviso de Deprecación de API"
description: "Plantilla para comunicar deprecaciones de API a consumidores con timelines, paths de migración y fechas de sunset claras que minimizan rupturas."
metaDescription: "Plantilla de aviso de deprecación de API: comunica deprecaciones de endpoints y campos con timelines, paths de migración y fechas de sunset claras."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - backward-compatibility
  - template
  - versioning
relatedResources:
  - /guides/api/rest-api-design-guide
  - /docs/templates/release-notes-template
  - /guides/architecture/microservices-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de aviso de deprecación de API: comunica deprecaciones de endpoints y campos con timelines, paths de migración y fechas de sunset claras."
  keywords:
    - aviso deprecacion api
    - plantilla sunset api
    - politica deprecacion
    - api versioning deprecacion
    - plantilla migracion api
---

# Plantilla de Aviso de Deprecación de API

Usa esta plantilla para comunicar deprecaciones de API claramente y reducir rupturas en consumidores.

## Plantilla

```markdown
# Aviso de Deprecación de API: [Nombre de Endpoint/Feature]

## Qué Está Cambiando
[Endpoint o campo] está siendo deprecado y será eliminado el [fecha de sunset].

## Timeline
| Hito | Fecha |
|------|-------|
| Deprecación anunciada | AAAA-MM-DD |
| Nueva versión disponible | AAAA-MM-DD |
| Fecha de sunset (eliminación) | AAAA-MM-DD |

## Impacto
- **Consumidores afectados:** [lista o "todos los que usan v1"]
- **Nivel de riesgo:** [bajo / medio / alto]
- **Breaking change:** [sí / no con migración]

## Path de Migración
### Antes (deprecado)
```http
GET /api/v1/orders?status=pending
```

### Después (recomendado)
```http
GET /api/v2/orders?filter=status:pending
```

## Cambios Requeridos
1. Actualizar URL base de `/v1/` a `/v2/`
2. Reemplazar parámetro de query `status` con `filter`
3. Manejar nuevo schema de respuesta: [link a docs]

## Soporte
- **Guía de migración:** [link]
- **Contacto:** api-team@company.com
- **Horarios de oficina:** Jueves 14:00 UTC
```

## Recomendaciones de Política de Deprecación

| Fase | Duración Mínima | Comunicación |
|------|----------------|-------------|
| **Anuncio** | Día 0 | Email, changelog, banner en docs |
| **Advertencia en respuestas** | 30 días antes de sunset | Headers `Deprecation` y `Sunset` |
| **Aviso final** | 7 días antes | Email directo a consumidores activos |

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: </api/v2/orders>; rel="successor-version"
```

## Mejores Prácticas

- **Nunca elimines sin aviso** — mínimo 6 meses para APIs públicas, 30 días para internas
- **Provee un path de migración funcional** — los consumidores deberían poder cambiar en un PR
- **Agrega headers de deprecación** — herramientas automatizadas pueden flaggear uso en CI
- **Trackea adopción de consumidores** — sabes quién no ha migrado antes del sunset
- **Evita breaking changes en patch versions** — semver existe por una razón

## Errores Comunes

- Anunciar deprecación la misma semana de eliminación — los consumidores necesitan tiempo
- Sin guía de migración — "solo usa v2" no es suficiente detalle
- Cambiar comportamiento antes de deprecar — introduce bugs silenciosos
- No trackear qué consumidores usan el endpoint deprecado — no puedes empujar a quien no conoces

## Preguntas Frecuentes

### ¿Cuánto deberían durar los períodos de deprecación?

APIs públicas: mínimo 6-12 meses. APIs internas: 1-3 meses. Cuantos más consumidores, más largo el plazo. Revisa tus analytics de API para estimar esfuerzo de migración.

### ¿Qué pasa si un consumidor no migra para la fecha de sunset?

Extiende el sunset si el consumidor es crítico. Para consumidores no críticos, devuelve `410 Gone` con link a la guía de migración. Nunca rompas integraciones silenciosamente.

### ¿Los endpoints deprecados deberían devolver advertencias?

Sí. Usa el header `Deprecation` e incluye un `Link` a la versión sucesora. Algunas librerías cliente pueden mostrar estas advertencias automáticamente en modo desarrollo.
