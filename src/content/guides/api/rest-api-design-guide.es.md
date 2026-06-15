---
contentType: guides
slug: rest-api-design-guide
title: "Guía de Diseño de APIs REST"
description: "Una guía completa para diseñar APIs REST limpias, escalables y mantenibles."
metaDescription: "Aprende mejores prácticas de diseño de APIs REST: estructura de URLs, métodos HTTP, códigos de estado, versionado, paginación y manejo de errores."
difficulty: intermediate
topics:
  - api
  - architecture
tags:
  - rest
  - api
  - diseno
  - http
  - arquitectura
  - mejores-practicas
relatedResources:
  - /recipes/api/call-rest-api
  - /recipes/api/handle-errors
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende mejores prácticas de diseño de APIs REST: estructura de URLs, métodos HTTP, códigos de estado, versionado, paginación y manejo de errores."
  keywords:
    - diseno api rest
    - mejores practicas api
    - arquitectura restful
    - metodos http
    - versionado api
    - paginacion api
---

# Guía de Diseño de APIs REST

## Overview

REST (Representational State Transfer) es el estilo arquitectónico dominante para diseñar aplicaciones en red. Una API REST bien diseñada es predecible, autodescriptiva y fácil de consumir desde múltiples clientes.

Esta guía cubre los principios fundamentales y decisiones prácticas que separan las APIs amateur de las de grado producción.

## When to Use

Esta guía aplica cuando:
- Construyes APIs HTTP públicas o internas
- Diseñas límites de comunicación entre microservicios
- Creas servicios backend consumidos por web, mobile o clientes CLI
- Migras de RPC o SOAP a REST

## Core Principles

### 1. Recursos y URLs

Una API REST se organiza alrededor de **recursos** — sustantivos, no acciones:

| Bien (Recurso) | Mal (Acción) |
|-----------------|--------------|
| `GET /users` | `GET /getUsers` |
| `POST /orders` | `POST /createOrder` |
| `DELETE /posts/42` | `DELETE /deletePost?id=42` |

Usa sustantivos plurales para colecciones y singulares para instancias específicas:

```
GET    /users          # Listar todos los usuarios
GET    /users/123      # Obtener usuario 123
POST   /users          # Crear nuevo usuario
PUT    /users/123      # Reemplazar usuario 123
PATCH  /users/123      # Actualizar parcialmente usuario 123
DELETE /users/123      # Eliminar usuario 123
```

### 2. Métodos HTTP

| Método | Propósito | Idempotente |
|--------|---------|------------|
| `GET` | Recuperar un recurso | Sí |
| `POST` | Crear un recurso | No |
| `PUT` | Reemplazar un recurso | Sí |
| `PATCH` | Actualizar parcialmente | Sí (usualmente) |
| `DELETE` | Eliminar un recurso | Sí |

### 3. Códigos de Estado

Usa el código HTTP correcto para comunicar la intención:

| Código | Significado | Cuándo Usar |
|------|---------|-------------|
| `200 OK` | Éxito | Respuesta estándar para peticiones exitosas |
| `201 Created` | Recurso creado | Después de un `POST` exitoso |
| `204 No Content` | Éxito vacío | Después de un `DELETE` exitoso |
| `400 Bad Request` | Error cliente | Input inválido, fallo de validación |
| `401 Unauthorized` | No autenticado | Credenciales faltantes o inválidas |
| `403 Forbidden` | Sin permiso | Autenticado pero no autorizado |
| `404 Not Found` | Recurso no encontrado | URL o ID no existe |
| `409 Conflict` | Conflicto de estado | Email duplicado, edición concurrente |
| `422 Unprocessable` | Error semántico | JSON válido pero lógica de negocio inválida |
| `500 Internal Error` | Error servidor | Fallo inesperado, loguear y reportar |

## Advanced Patterns

### Versionado

Siempre versiona tu API desde el día uno:

```
/api/v1/users
/api/v2/users
```

Prefiere versionado por URL sobre headers por simplicidad. Documenta la política de deprecación y retiro.

### Paginación

Para endpoints de colección, nunca devuelvas listas sin límite:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

Usa paginación por cursor para datos de alta rotación, por offset para datasets estables.

### Filtrado, Ordenamiento y Búsqueda

```
GET /users?role=admin&sort=-created_at
GET /products?search=laptop&category=electronics
```

Usa query parameters consistentemente. Documenta los filtros soportados en tu documentación API.

### Respuestas de Error

Devuelve un envelope de error consistente:

```json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "El formato de email es inválido.",
    "field": "email",
    "documentation_url": "https://docs.example.com/errors/INVALID_EMAIL"
  }
}
```

## Best Practices

- **Usa JSON** como tipo de contenido por defecto (`application/json`)
- **Devuelve envelopes consistentes** — envuelve respuestas en una estructura predecible
- **Soporta headers `Content-Type` y `Accept`** correctamente
- **Implementa rate limiting** — protege tu infraestructura y usuarios
- **Usa HTTPS en todas partes** — nunca expongas APIs sobre HTTP plano
- **Documenta con OpenAPI** — genera specs y docs interactivas
- **Versiona desde v1** — versionado retroactivo es doloroso
- **Devuelve headers `Location`** en respuestas `201 Created`

## Common Mistakes

- **Usar verbos en URLs** — `/createUser` rompe la semántica REST
- **Devolver `200 OK` para errores** — confunde clientes y rompe reintentos
- **Sin paginación** — endpoints que colapsan bajo carga real
- **Exponer IDs internos** — usa UUIDs o identificadores basados en slugs
- **Naming inconsistente** — mezclar `camelCase` y `snake_case` en JSON
- **Manejo de `Content-Type` faltante** — clientes reciben páginas HTML en lugar de JSON
- **Sin rate limiting** — invita abuso y DDoS accidental
- **Acoplamiento fuerte al schema de BD** — filtra detalles de implementación

## Frequently Asked Questions

**Q: ¿Debería usar PUT o PATCH para actualizaciones?**
A: Usa `PUT` para reemplazos completos (el cliente envía el recurso completo) y `PATCH` para actualizaciones parciales. Si solo soportas uno, documéntalo claramente.

**Q: ¿Cómo manejo uploads de archivos en una API REST?**
A: Usa `multipart/form-data` para uploads simples. Para archivos grandes, usa URLs prefirmadas (estilo S3) o endpoints de upload por chunks.

**Q: ¿Qué es HATEOAS y lo necesito?**
A: HATEOAS (Hypermedia as the Engine of Application State) incluye links en respuestas. Es deseable para APIs públicas pero excesivo para servicios internos.

**Q: ¿Cómo autentico una API REST?**
A: Para server-to-server, usa API keys o OAuth 2.0 client credentials. Para apps orientadas a usuarios, usa OAuth 2.0 con PKCE o auth basada en sesiones con protección CSRF.
