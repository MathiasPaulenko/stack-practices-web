---
contentType: recipes
slug: rest-api-design
title: "Diseño de APIs REST: Mejores Prácticas"
description: "Diseña APIs REST robustas y escalables con métodos HTTP adecuados, códigos de estado, versionado y estrategias de paginación."
metaDescription: "Mejores prácticas para diseñar APIs REST: métodos HTTP, códigos de estado, versionado, paginación, HATEOAS y convenciones de nomenclatura de recursos."
difficulty: intermediate
topics:
  - api
tags:
  - rest-api
  - http
relatedResources:
  - /docs/api-error-response-template
  - /guides/rest-api-design-guide
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Mejores prácticas para diseñar APIs REST: métodos HTTP, códigos de estado, versionado, paginación, HATEOAS y convenciones de nomenclatura de recursos."
  keywords:
    - rest-api
    - api-design
    - http
    - backend
---
## Visión General

REST es el estilo arquitectónico dominante para diseñar APIs de red. Una API REST bien diseñada usa la semántica HTTP de manera consistente, provee URLs predecibles y devuelve códigos de estado significativos. Un diseño deficiente conduce a consumidores confundidos, clientes rotos e integraciones frágiles.

## Cuándo Usar

Usa este recurso cuando:
- Diseñes una API pública o interna desde cero
- Refactorices una API estilo RPC legacy a REST
- Documentes una API con OpenAPI/Swagger
- Elijas entre [REST](/recipes/api/call-rest-api), [GraphQL](/recipes/api/graphql-api) o [gRPC](/recipes/api/grpc-api) para un nuevo servicio

## Solución

### Nomenclatura de Recursos

```
GET    /users                # Listar usuarios
GET    /users/:id            # Obtener un usuario
POST   /users                # Crear un usuario
PUT    /users/:id            # Actualización completa
PATCH  /users/:id            # Actualización parcial
DELETE /users/:id            # Eliminar un usuario
GET    /users/:id/orders     # Recurso anidado
```

### Códigos de Estado

```javascript
// Respuestas exitosas
200 OK              // GET, PUT, DELETE exitoso
201 Created         // POST exitoso
204 No Content      // DELETE exitoso (opcional)

// Errores del cliente
400 Bad Request     // Fallo de validación
401 Unauthorized    // Token de auth faltante
403 Forbidden       // Permisos insuficientes
404 Not Found       // El recurso no existe
409 Conflict        // Duplicado o conflicto de estado
422 Unprocessable   // Error de validación semántica

// Errores del servidor
500 Internal Error  // Fallo inesperado del servidor
502 Bad Gateway     // Fallo upstream
503 Service Unavail // Rate limiting o mantenimiento
```

### Paginación con Cursor

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "prev_cursor": null,
    "has_more": true
  }
}
```

## Explicación

REST aprovecha HTTP como protocolo de aplicación, no solo como transporte:

- **Idempotencia**: GET, PUT, DELETE deben ser seguros de reintentar. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones. POST no es idempotente.
- **Sin estado**: Cada request contiene toda la información necesaria; sin sesión del lado del servidor.
- **Cacheabilidad**: Usa Cache-Control, ETag y Last-Modified agresivamente. Consulta [Manejo de CORS](/recipes/api/handle-cors) para configuración de headers.
- **HATEOAS**: Incluye links a recursos relacionados (opcional pero mejora descubribilidad).

## Variantes

| Estilo | Caso de Uso | Notas |
|--------|-------------|-------|
| REST | CRUD, orientado a recursos | Ecosistema maduro; caching HTTP |
| GraphQL | Queries flexibles; mobile | Un solo endpoint; client-driven |
| gRPC | Microservicios internos | Binario; streaming; schema-first |
| JSON-RPC | RPC simple | Liviano; menos nativo HTTP |

## Mejores Prácticas

- **Usa sustantivos plurales**: /orders, no /order ni /getOrder
- **Versiona en la URL**: /v1/users (más explícito que headers)
- **Devuelve estructura consistente**: { data, error, meta }
- **Soporta filtrado**: GET /users?role=admin&active=true
- **Rate limit desde el inicio**: Devuelve 429 con header Retry-After. Consulta [Rate Limiting con Redis](/recipes/api/api-rate-limiting-redis) para implementación.

## Errores Comunes

1. **Usar verbos en URLs**: /createUser, /getOrders — usa sustantivos y métodos HTTP
2. **Ignorar códigos HTTP**: Devolver 200 con cuerpo de error rompe middleware. Consulta [Manejo de Errores](/recipes/api/handle-errors) para uso de códigos de estado.
3. **No versionar**: Cambios breaking sin versionado abandonan clientes existentes
4. **Over-fetching**: Devolver objetos anidados enormes cuando el cliente necesita un subset
5. **Faltar negociación de contenido**: No respetar Accept y Content-Type headers

## Preguntas Frecuentes

**P: ¿Debería usar PUT o PATCH para actualizaciones?**
R: PUT para reemplazo completo (todos los campos requeridos). PATCH para actualizaciones parciales (solo campos cambiados).

**P: ¿Cómo manejo uploads de archivos en REST?**
R: Usa multipart/form-data para uploads simples. Para archivos grandes, usa signed URLs (S3, GCS) o uploads resumibles.

**P: ¿Vale la pena implementar HATEOAS?**
R: Para APIs públicas consumidas por diversos clientes, sí. Para APIs internas con clientes generados, opcional.
