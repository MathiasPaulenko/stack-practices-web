---
contentType: docs
slug: api-deprecation-notice-template
title: "Plantilla de Aviso de Deprecacion de API"
description: "Plantilla para comunicar deprecaciones de API, cambios breaking, y plazos de retiro a los consumidores."
metaDescription: "Usa esta plantilla de aviso de deprecacion de API para comunicar cambios breaking, plazos de migracion y fechas de retiro a consumidores."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - deprecacion
  - migracion
  - comunicacion
  - plantilla
relatedResources:
  - /docs/architecture/api-lifecycle-management-template
  - /docs/architecture/microservice-contract-template
  - /docs/architecture/technical-spec-template
  - /docs/devops/rollout-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de aviso de deprecacion de API para comunicar cambios breaking, plazos de migracion y fechas de retiro a consumidores."
  keywords:
    - deprecacion api
    - cambios breaking
    - aviso de migracion
    - politica de retiro
    - versionado api
---

## Resumen

Las APIs evolucionan. Los campos se renombran, los endpoints se reemplazan y las versiones antiguas se retiran. Sin un aviso de deprecacion claro, los consumidores descubren los cambios breaking solo despues de que sus integraciones fallan. Esta plantilla proporciona un formato estandar para anunciar deprecaciones, comunicar plazos y guiar a los consumidores a traves de las migraciones.

## Cuando Usar

Usa este recurso cuando:
- Elimines o renombres un endpoint, campo o parametro de API
- Cierres una version completa de API
- Migres consumidores de un servicio legacy a un reemplazo
- Actualices mecanismos de autenticacion que rompan clientes existentes

## Solucion

```markdown
# Aviso de Deprecacion de API: `<Endpoint / Campo / Version>`

**API:** `api.ejemplo.com/v1/...`
**Deprecado Desde:** `2026-07-01`
**Fecha de Retiro:** `2026-10-01` (aviso de 92 dias)
**Severidad:** `Cambio Breaking` | `Deprecacion No Breaking`

## Que Esta Cambiando

### Antes
```
GET /v1/orders?customer_id=123
Response: { "order_id": "abc", "total": 100.00 }
```

### Despues
```
GET /v2/orders?customerId=123
Response: { "orderId": "abc", "totalAmount": 100.00 }
```

## Por Que Este Cambio

- Alinear los nombres de campos con el estandar camelCase de la empresa
- Consolidar los modelos de datos v1 y v2 para reducir mantenimiento
- Eliminar campos deprecados que exponen identificadores internos

## Pasos de Migracion

1. **Actualizar nombres de campos:** Renombrar `customer_id` a `customerId`, `order_id` a `orderId`
2. **Actualizar parsing de respuesta:** Reemplazar `total` por `totalAmount` (mismo tipo de dato)
3. **Cambiar endpoint:** Cambiar la ruta base de `/v1/orders` a `/v2/orders`
4. **Probar en sandbox:** Validar la integracion contra `sandbox-api.ejemplo.com/v2`
5. **Desplegar a produccion:** Antes del `2026-10-01`

## Cronograma

| Hito | Fecha | Accion Requerida |
|------|-------|-------------------|
| Aviso Enviado | 2026-07-01 | Revisar guia de migracion |
| Sandbox Disponible | 2026-07-01 | Comenzar pruebas de endpoints v2 |
| v1 Marcado Deprecado | 2026-07-01 | Monitorear headers de deprecacion |
| Recordatorio Final | 2026-09-01 | Completar migracion o solicitar extension |
| Retiro de v1 | 2026-10-01 | v1 retorna 410 Gone |

## Soporte y Contacto

- **Guia de Migracion:** https://docs.ejemplo.com/api-migration
- **Entorno Sandbox:** https://sandbox-api.ejemplo.com
- **Email de Soporte:** api-soporte@ejemplo.com
- **Horarios de Atencion:** Cada martes 10:00 UTC

## Excepciones

Si no puedes migrar antes de la fecha de retiro, contactanos en api-soporte@ejemplo.com con:
- Tu caso de uso
- Cronograma estimado de migracion
- Bloqueantes que impidan la migracion a tiempo
```

## Explicacion

La plantilla separa **que** esta cambiando de **por que** y **como** migrar. La tabla de cronograma crea responsabilidad y elimina ambiguedad sobre las fechas limite. Incluir un entorno sandbox y contacto de soporte reduce la friccion para los consumidores. La seccion de excepciones reconoce que no todos los consumidores pueden migrar en el mismo plazo.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| API Publica | Aviso de 90+ dias, blog post, email | La confianza del consumidor depende de plazos predecibles |
| API Interna | Aviso de 30 dias, anuncio en Slack | Iteracion mas rapida, base de consumidores menor |
| Parche de seguridad de emergencia | Aviso de 7 dias, contacto directo | La seguridad tiene prioridad sobre la conveniencia |

## Lo que funciona

1. **Enviar headers de deprecacion en respuestas de API** al menos 90 dias antes del retiro (`Deprecation: true`, `Sunset: <fecha>`)
2. **Proporcionar un reemplazo funcional** antes de eliminar el endpoint antiguo
3. **Mantener un changelog** con todas las deprecaciones y migraciones
4. **Rastrear el progreso de migracion** monitoreando el trafico a endpoints deprecados
5. **Ofrecer horarios de atencion** o una guia de migracion para cambios complejos

## Errores Comunes

1. **Anunciar deprecacion sin un reemplazo** — los consumidores no tienen a donde ir
2. **Plazos de aviso demasiado cortos** — los clientes enterprise necesitan trimestres para planificar cambios
3. **Cambiar comportamiento silenciosamente** sin anunciar deprecacion primero
4. **No rastrear que consumidores aun usan endpoints deprecados**
5. **Eliminar sin periodo de gracia** — siempre retornar 410 Gone primero

## Preguntas Frecuentes

### Cuanto aviso debo dar?

APIs publicas: 90-180 dias. APIs internas: 30-60 dias. Cambios relacionados con seguridad: tan rapido como sea posible con contacto directo.

### Deberia soportar ambas versiones indefinidamente?

No. Mantener multiples versiones aumenta el costo operativo y la superficie de seguridad. Establece una fecha firme de retiro y cumplela, con excepciones limitadas.

### Que codigo de estado HTTP deberia retornar un endpoint deprecado despues del retiro?

Retornar `410 Gone` para indicar eliminacion permanente. Incluir un header `Location` o mensaje apuntando al endpoint de reemplazo.
