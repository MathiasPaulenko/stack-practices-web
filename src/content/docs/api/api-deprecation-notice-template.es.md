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
  - /docs/api-lifecycle-management-template
  - /docs/microservice-contract-template
  - /docs/technical-spec-template
  - /docs/rollout-communication-template
  - /docs/api-changelog-template
  - /docs/sla-definition-template
  - /docs/api-error-response-template
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


- For alternatives, see [API Changelog Template](/es/docs/api-changelog-template/).

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

## Implementacion de Headers de Deprecacion

Los headers HTTP `Deprecation` y `Sunset` (estandar IETF en borrador) permiten que el codigo cliente detecte endpoints deprecados programaticamente. Implementalos en tu middleware de API.

### Middleware en Express.js

```javascript
function deprecationMiddleware(req, res, next) {
  const deprecatedPaths = {
    "/v1/orders": { sunset: "2026-10-01", replacement: "/v2/orders" },
    "/v1/products": { sunset: "2026-10-01", replacement: "/v2/products" },
  };

  const match = Object.keys(deprecatedPaths).find((path) =>
    req.path.startsWith(path)
  );

  if (match) {
    const info = deprecatedPaths[match];
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", new Date(info.sunset).toUTCString());
    res.setHeader(
      "Link",
      `<https://docs.ejemplo.com/api-migration>; rel="deprecation"`
    );
  }

  next();
}

app.use(deprecationMiddleware);
```

### Middleware en Python Flask

```python
from datetime import datetime
from flask import Flask, request, g

DEPRECATED_PATHS = {
    "/v1/orders": {"sunset": "2026-10-01", "replacement": "/v2/orders"},
    "/v1/products": {"sunset": "2026-10-01", "replacement": "/v2/products"},
}

@app.before_request
def add_deprecation_headers():
    for path, info in DEPRECATED_PATHS.items():
        if request.path.startswith(path):
            g.deprecation_sunset = info["sunset"]
            g.deprecation_replacement = info["replacement"]
            break

@app.after_request
def set_deprecation_headers(response):
    if hasattr(g, "deprecation_sunset"):
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = datetime.strptime(
            g.deprecation_sunset, "%Y-%m-%d"
        ).strftime("%a, %d %b %Y 00:00:00 GMT")
        response.headers["Link"] = (
            '<https://docs.ejemplo.com/api-migration>; rel="deprecation"'
        )
    return response
```

## Rastreo del Progreso de Migracion

Monitorea el trafico a endpoints deprecados para saber que consumidores no han migrado aun.

### Consulta SQL para Trafico de Deprecacion

```sql
SELECT
    endpoint,
    COUNT(*) AS request_count,
    COUNT(DISTINCT client_id) AS unique_clients,
    MAX(timestamp) AS last_request
FROM api_requests
WHERE endpoint LIKE '/v1/%'
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY request_count DESC;
```

### Alertas para Consumidores sin Migrar

Configura una alerta cuando un consumidor con trafico significativo no haya comenzado a migrar:

```yaml
alert: stale_deprecation_consumer
expr: |
  sum by (client_id) (
    rate(api_requests_total{endpoint=~"/v1/.*"}[1h])
  ) > 10
for: 24h
labels:
  severity: warning
annotations:
  summary: "Cliente {{ $labels.client_id }} aun usa endpoints v1 deprecados"
  description: "Este cliente ha hecho >10 req/h a endpoints v1 en las ultimas 24h"
```

## Plan de Comunicacion

| Canal | Momento | Audiencia | Contenido |
|-------|---------|-----------|-----------|
| Email masivo | T-90 dias | Todos los consumidores registrados | Aviso completo de deprecacion + enlace a guia |
| Blog post | T-90 dias | Publico | Anuncio + contexto del cambio |
| Headers en respuesta API | T-90 dias | Integraciones activas | `Deprecation: true`, header `Sunset` |
| Banner en panel | T-60 dias | Usuarios del panel | Banner persistente con fecha limite |
| Email de seguimiento | T-30 dias | Consumidores no migrados | Recordatorio + ofrecer horarios de atencion |
| Contacto directo | T-14 dias | Alto trafico no migrado | Email o llamada personal del equipo de API |
| Email final | T-7 dias | Todos los restantes | "Retiro de v1 en 7 dias" |
| Pagina de estado | T-0 | Todos | v1 retorna 410 Gone, actualizacion de estado |

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| API Publica | Aviso de 90+ dias, blog post, email | La confianza del consumidor depende de plazos predecibles |
| API Interna | Aviso de 30 dias, anuncio en Slack | Iteracion mas rapida, base de consumidores menor |
| Parche de seguridad de emergencia | Aviso de 7 dias, contacto directo | La seguridad tiene prioridad sobre la conveniencia |
| API GraphQL | Directiva `@deprecated` + aviso | Deprecacion a nivel de esquema junto con comunicacion |

## Lo que funciona

1. **Enviar headers de deprecacion en respuestas de API** al menos 90 dias antes del retiro (`Deprecation: true`, `Sunset: <fecha>`)
2. **Proporcionar un reemplazo funcional** antes de eliminar el endpoint antiguo
3. **Mantener un changelog** con todas las deprecaciones y migraciones
4. **Rastrear el progreso de migracion** monitoreando el trafico a endpoints deprecados
5. **Ofrecer horarios de atencion** o una guia de migracion para cambios complejos
6. **Usar multiples canales de comunicacion** — el email solo no es suficiente
7. **Registrar el uso de headers de deprecacion** para saber que clientes estan al tanto

## Errores Comunes

1. **Anunciar deprecacion sin un reemplazo** — los consumidores no tienen a donde ir
2. **Plazos de aviso demasiado cortos** — los clientes enterprise necesitan trimestres para planificar cambios
3. **Cambiar comportamiento silenciosamente** sin anunciar deprecacion primero
4. **No rastrear que consumidores aun usan endpoints deprecados**
5. **Eliminar sin periodo de gracia** — siempre retornar 410 Gone primero
6. **Enviar un solo email y asumir que todos lo leyeron** — usar multiples canales
7. **No proporcionar sandbox** para que los consumidores prueben el nuevo endpoint
8. **Extender la fecha de retiro repetidamente** — socava la confianza en futuros plazos
9. **Olvidar actualizar SDKs y librerias cliente** junto con el cambio de API

## Preguntas Frecuentes

### Cuanto aviso debo dar?

APIs publicas: 90-180 dias. APIs internas: 30-60 dias. Cambios relacionados con seguridad: tan rapido como sea posible con contacto directo.

### Deberia soportar ambas versiones indefinidamente?

No. Mantener multiples versiones aumenta el costo operativo y la superficie de seguridad. Establece una fecha firme de retiro y cumplela, con excepciones limitadas.

### Que codigo de estado HTTP deberia retornar un endpoint deprecado despues del retiro?

Retornar `410 Gone` para indicar eliminacion permanente. Incluir un header `Location` o mensaje apuntando al endpoint de reemplazo.

### Que pasa si un cliente importante no puede migrar a tiempo?

Ofrecer una extension temporal con una fecha de expiracion documentada. Rastrear la extension en el log de deprecacion. No extender indefinidamente — eso derrota el proposito del retiro.

### Deberia retornar advertencias durante el periodo de deprecacion?

Si. Retornar `299 Miscellaneous Persistent Warning` con un mensaje de deprecacion en el header `Warning`. Es una senal suave que no rompe a los clientes pero aparece en los logs.

### Como depreco un campo de GraphQL?

Usar la directiva `@deprecated` en tu esquema:

```graphql
type Order {
  total: Float @deprecated(reason: "Usar totalAmount en su lugar. Eliminado en 2026-10-01.")
  totalAmount: Float
}
```

Los clientes de GraphQL reciben advertencias de deprecacion en sus consultas de introspeccion.

### Deberia versionar toda la API o solo los endpoints cambiados?

Preferir versionado por endpoint para cambios pequenos. Reservar cambios de version completa de API (v1 a v2) para cambios coordinados que afectan a muchos endpoints a la vez.

### Como manejo la deprecacion en una integracion basada en webhooks?

Enviar un evento de webhook `deprecation.notice` a todos los endpoints suscritos. Incluir la misma informacion que el aviso de deprecacion: que cambio, fecha de retiro y enlace de migracion. Enviar eventos de recordatorio en T-30 y T-7 dias.
