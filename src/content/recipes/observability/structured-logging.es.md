---
contentType: recipes
slug: structured-logging
title: "Logging Estructurado"
description: "Implementa logging estructurado con salida JSON, correlation IDs y agregación de logs para observabilidad en producción."
metaDescription: "Mejores prácticas de logging estructurado: formato JSON, correlation IDs, niveles de log, agregación con ELK/Loki e integración con trazas distribuidas."
difficulty: intermediate
topics:
  - observability
tags:
  - logging
  - observability
  - devops
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Mejores prácticas de logging estructurado: formato JSON, correlation IDs, niveles de log, agregación con ELK/Loki e integración con trazas distribuidas."
  keywords:
    - logging
    - observability
    - elk
    - devops
---
## Visión General

El logging estructurado reemplaza mensajes de log de texto libre con objetos JSON legibles por máquinas. Esto habilita filtrado potente, agregación y correlación a través de servicios distribuidos. En lugar de parsear regex de strings como "User 123 logged in at 10:00", los logs estructurados emiten { "event": "login", "user_id": 123, "timestamp": "..." } — haciendo el análisis de logs trivial en ELK, Loki o plataformas cloud.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutes más de un servicio que necesite agregación de logs centralizada
- Debuggees issues que abarcan múltiples microservicios o jobs async
- Construyas dashboards y alertas basadas en eventos de log
- Migres de logs de texto plano a un stack moderno de observabilidad

## Solución

### Logger JSON (Node.js con Pino)

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'user-api', version: '1.2.3' }
});

function handleRequest(req, res) {
  const child = logger.child({
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    user_id: req.user?.id,
    route: req.route?.path
  });

  child.info({ event: 'request_start', method: req.method });
  
  try {
    const result = processOrder(req.body);
    child.info({ event: 'order_processed', order_id: result.id });
  } catch (err) {
    child.error({ event: 'order_failed', error: err.message });
  }
}
```

### Python con structlog

```python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

def transfer_funds(from_account, to_account, amount):
    logger.info(
        "transfer_initiated",
        from_account=from_account,
        to_account=to_account,
        amount_cents=amount,
        request_id=get_current_request_id()
    )
```

### Middleware de Correlation ID (Go)

```go
func CorrelationIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), "request_id", id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Explicación

**Campos clave para cada entrada de log**:
- **timestamp**: ISO 8601 con timezone
- **level**: debug, info, warn, error, fatal
- **service**: Nombre de aplicación o componente
- **request_id**: Correlaciona todos los logs de un solo request de usuario a través de servicios
- **event**: Nombre de acción legible por máquinas (snake_case)
- **message**: Descripción legible por humanos (opcional en logging puramente estructurado)

**¿Por qué estructurado sobre texto?**
- Consulta logs sin regex frágiles: { event: "payment_failed", amount: { $gt: 1000 } }
- Agregación automática por cualquier campo en Elasticsearch/Loki
- Fácil integración con tracing (OpenTelemetry) y métricas

## Variantes

| Stack | Componentes | Ideal Para |
|-------|-------------|------------|
| ELK | Elasticsearch, Logstash, Kibana | Búsqueda full-text; dashboards complejos |
| PLG | Promtail, Loki, Grafana | Kubernetes-native; queries basadas en labels |
| CloudWatch | AWS nativo | Infraestructura AWS; setup mínimo |
| Datadog | SaaS | APM + logs + trazas unificados |
| Splunk | Enterprise | Cumplimiento; analytics avanzados |

## Mejores Prácticas

- **Siempre incluye request_id**: Traza un viaje de usuario a través de 10+ servicios
- **Usa niveles de log consistentemente**: debug para dev; info para operaciones normales; error para issues accionables
- **Nunca loguees datos sensibles**: Enmascara PII, tokens y passwords antes de serialización
- **Loguea en boundaries de servicio**: Entrada/salida de cada handler HTTP, consumer de cola y job en background
- **Emite métricas desde logs**: Usa métricas derivadas de logs para dashboards en lugar de instrumentación custom

## Errores Comunes

1. **Concatenación de strings en logs**: `log.info("User " + id + " failed")` — previene indexación
2. **Contexto faltante**: Logs dicen "Payment failed" sin user_id, amount o error code
3. **Nivel de log incorrecto**: info para cada línea de código; error para excepciones manejadas
4. **Ignorar volumen de logs**: Logs debug en producción pueden costar miles en fees de ingestión
5. **Nombres de campo inconsistentes**: userId vs user_id vs userID rompe agregación

## Preguntas Frecuentes

**P: ¿Debería usar una librería de logging o console.log?**
R: Siempre usa una librería (Pino, Winston, structlog, Zap). Manejan buffering, serialización y niveles de log correctamente.

**P: ¿Cómo correlaciono logs a través de microservicios?**
R: Propaga un correlation ID en headers HTTP (X-Request-ID) e inclúyelo en cada entrada de log. Usa una librería de tracing (OpenTelemetry) para trazas distribuidas completas.

**P: ¿Cuál es la diferencia entre logs y trazas?**
R: Los logs son eventos discretos con timestamps. Las trazas conectan operaciones relacionadas (spans) a través de servicios. Usa ambos: logs estructurados para eventos, trazas para flujo de requests.
