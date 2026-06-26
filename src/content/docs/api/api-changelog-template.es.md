---
contentType: docs
slug: api-changelog-template
title: "Plantilla de Changelog de API"
description: "Plantilla para documentar cambios de API incluyendo cambios breaking, nuevas funciones, deprecaciones y correcciones."
metaDescription: "Usa esta plantilla de changelog de API para documentar cambios breaking, nuevas funciones, deprecaciones y correcciones con versionado claro."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - changelog
  - versionado
  - documentacion
  - plantilla
relatedResources:
  - /docs/architecture/api-lifecycle-management-template
  - /docs/api/api-deprecation-notice-template
  - /docs/architecture/technical-spec-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de changelog de API para documentar cambios breaking, nuevas funciones, deprecaciones y correcciones con versionado claro."
  keywords:
    - changelog api
    - versionado
    - cambios breaking
    - notas de lanzamiento
    - documentacion api
    - plantilla changelog
---

## Resumen

Los consumidores de API necesitan saber que cambio, cuando cambio, y si necesitan actuar. Un changelog no estructurado — o la ausencia de changelog — obliga a los consumidores a comparar tu API o descubrir cambios breaking en produccion. Esta plantilla proporciona un formato estandarizado para documentar cada cambio de API con version, fecha, severidad y guia de migracion.

## Cuando Usar

Usa este recurso cuando:
- Lanaces una nueva version o funcion de API
- Depreces o elimines un endpoint o campo
- Corrijas un bug que afecte el comportamiento de la API
- Publiques una actualizacion mensual o trimestral de API

## Solucion

```markdown
# Changelog de API

## 2.5.0 — 2026-06-26

### Cambios Breaking
- **Eliminado:** `GET /v1/orders/{id}/items` — Usar `GET /v2/orders/{id}?expand=items` en su lugar
- **Cambiado:** Campo `total` renombrado a `totalAmount` en todas las respuestas de orden
- **Requerido:** Header `X-Request-ID` ahora obligatorio para todas las operaciones de escritura

### Nuevas Funciones
- **Agregado:** `POST /v2/orders/bulk` — Crear hasta 100 ordenes en una sola solicitud
- **Agregado:** Campo `paymentStatus` en respuestas de orden (`pending`, `paid`, `failed`)
- **Agregado:** Evento de webhook `order.payment_failed` para notificaciones de pago fallido

### Correcciones
- **Corregido:** `GET /v2/products` ahora retorna arreglo vacio `[]` en lugar de `null` cuando no existen productos
- **Corregido:** Los campos de fecha ahora retornan consistentemente formato ISO 8601 con offset de zona horaria

### Deprecaciones
- **Deprecado:** Parametro de consulta `customer_id` — Usar `customerId` en su lugar (retiro: 2026-10-01)
- **Deprecado:** Ruta base `v1` de API — Migrar a `v2` antes del 2026-12-01

## 2.4.0 — 2026-05-15

### Nuevas Funciones
- **Agregado:** `PATCH /v2/orders/{id}` para actualizaciones parciales de orden
- **Agregado:** Headers de limite de tasa (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) en todas las respuestas

### Correcciones
- **Corregido:** `500 Internal Server Error` en `POST /v2/orders` cuando el arreglo `items` estaba vacio

---

## Politica de Versionado

Seguimos [Versionado Semantico](https://semver.org/lang/es/):
- **MAJOR:** Cambios breaking que requieren accion del consumidor
- **MINOR:** Nuevas funciones, compatibles hacia atras
- **PATCH:** Correcciones de bugs, compatibles hacia atras

## Categorias de Cambio

| Categoria | Descripcion | Accion Requerida del Consumidor |
|-----------|-------------|--------------------------------|
| Cambio Breaking | Las integraciones existentes pueden fallar | Si — migracion requerida |
| Nueva Funcion | Nuevos endpoints, campos o comportamientos | Opcional — adoptar cuando este listo |
| Correccion | Bug corregido o comportamiento inconsistente | No — pero verificar si dependias del comportamiento anterior |
| Deprecacion | Funcion programada para eliminacion | Si — antes de la fecha de retiro |

## Suscribirse a Cambios

- **Feed RSS:** https://developer.ejemplo.com/changelog.xml
- **Email:** Suscribirse en https://developer.ejemplo.com/subscribe
- **Webhook:** Configurar evento `api.changelog_published` en tu panel
- **Slack:** Unirse a #api-announcements en nuestro Slack comunitario
```

## Explicacion

El changelog usa una jerarquia de **version-fecha-entrada** para que los consumidores puedan escanear su version actual y ver todo lo que cambio desde entonces. Los cambios breaking se listan primero porque demandan atencion inmediata. Cada entrada incluye un verbo (`Agregado`, `Eliminado`, `Corregido`, `Deprecado`) para que los consumidores entiendan la naturaleza del cambio de un vistazo. La seccion de politica de versionado reduce confusion sobre lo que significa cada numero de version.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| API Publica | Changelog completo con RSS/email | Los consumidores se autoserven, reducen tickets de soporte |
| API Interna | Slack + resumen corto | Mas rapido, menos ceremonia |
| API de Partners | Email + enlace a guia de migracion | Los partners necesitan comunicacion de lujo |

## Mejores Practicas

1. **Publicar el changelog antes de desplegar el cambio** — no despues de que los consumidores reporten problemas
2. **Agrupar entradas por severidad** — cambios breaking primero, luego funciones, luego correcciones
3. **Incluir instrucciones de migracion** con cada cambio breaking, no solo una descripcion
4. **Enlazar a documentacion** para funciones nuevas complejas en lugar de explicar en el changelog
5. **Archivar versiones antiguas** pero mantenerlas accesibles — los clientes enterprise pueden estar varias versiones atras

## Errores Comunes

1. **Mezclar correcciones de bugs y cambios breaking** sin categorizacion clara
2. **Escribir "varias correcciones de bugs"** en lugar de listar correcciones especificas que les importan a los consumidores
3. **Publicar changelogs dias despues del despliegue** — los consumidores ya estan rotos
4. **No versionar el changelog mismo** — si el changelog cambia, los consumidores pierden confianza
5. **Olvidar documentar campos eliminados** — los consumidores descubren datos faltantes solo en produccion

## Preguntas Frecuentes

### Hasta donde atras deberia ir el changelog?

Mantener al menos los ultimos 12 meses de cambios en linea. Archivar versiones mas antiguas en una pagina separada. Los clientes enterprise con ciclos de adquisicion largos pueden necesitar referenciar cambios de hace un ano.

### Deberia documentar cambios solo internos?

No. El changelog es para consumidores. La refactorizacion interna, cambios de CI/CD o actualizaciones de infraestructura pertenecen a notas de lanzamiento internas, no al changelog publico de API.

### Que pasa si una correccion de bug cambia comportamiento en el que algunos consumidores dependian?

Documentarlo como un cambio breaking si el comportamiento anterior estaba documentado. Si el comportamiento anterior era un bug, documentarlo como una correccion pero incluir una nota: "El comportamiento anterior era involuntario e inconsistente con la documentacion."
