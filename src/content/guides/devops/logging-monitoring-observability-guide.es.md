---
contentType: guides
slug: logging-monitoring-observability-guide
title: "Guía de Logging, Monitoreo y Observabilidad"
description: "Guía para construir sistemas observables con logging estructurado, métricas y tracing distribuido."
metaDescription: "Aprende prácticas de observabilidad: logging estructurado, recolección de métricas, alerting y tracing distribuido para sistemas en producción."
difficulty: intermediate
topics:
  - devops
  - performance
tags:
  - alerting
  - devops
  - logging
  - metrics
  - monitoring
  - observability
  - performance
  - sre
  - tracing
relatedResources:
  - /docs/runbook-template
  - /guides/cicd-pipeline-guide
  - /recipes/logging
  - /docs/load-test-execution-plan-template
  - /recipes/parse-log-files
  - /recipes/prometheus-monitoring-alerts
  - /recipes/cdn-edge-caching
lastUpdated: "2026-06-11"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende prácticas de observabilidad: logging estructurado, recolección de métricas, alerting y tracing distribuido para sistemas en producción."
  keywords:
    - observability
    - structured logging
    - monitoring
    - metrics
    - distributed tracing
    - alerting




---
## Resumen

La observabilidad es la capacidad de entender el estado interno de un sistema examinando sus salidas. Los tres pilares — logs, métricas y traces — proveen diferentes perspectivas sobre el comportamiento del sistema.

## Los Tres Pilares

| Pilar | Pregunta | Granularidad | Retención |
|-------|----------|-------------|-----------|
| **Logs** | ¿Qué pasó? | Alta (eventos individuales) | Días a semanas |
| **Métricas** | ¿Cómo está la tendencia? | Baja (agregada) | Meses a años |
| **Traces** | ¿Dónde se fue el tiempo? | Media (caminos de requests) | Días a semanas |

## Logging Estructurado

Reemplaza texto libre por JSON parseable por máquinas. Consulta [Structured Logging](/recipes/observability/structured-logging) para implementación práctica.

### Formato

```json
{
  "timestamp": "2026-06-11T14:32:01Z",
  "level": "ERROR",
  "message": "Pago fallido",
  "service": "billing-api",
  "trace_id": "abc123",
  "user_id": "user_456",
  "amount": 99.99,
  "error": "Tarjeta rechazada",
  "duration_ms": 245
}
```

### Niveles de Log

| Nivel | Caso de Uso | Ejemplo |
|-------|-------------|---------|
| **DEBUG** | Detalle de desarrollo | Valores de variables, iteraciones de loops |
| **INFO** | Operaciones normales | Request completado, job iniciado |
| **WARN** | Inesperado pero manejado | Reintento realizado, API deprecada usada |
| **ERROR** | Operación fallida | Request fallido, excepción atrapada |
| **FATAL** | Indisponibilidad del sistema | Conexión a base de datos perdida |

## Métricas

Las métricas son puntos numéricos recolectados a lo largo del tiempo.

### Tipos de Métricas

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Counter** | Solo aumenta | Requests servidos, errores ocurridos |
| **Gauge** | Puede subir o bajar | Tamaño actual de cola, uso de memoria |
| **Histogram** | Distribución de valores | Duración de request, tamaño de payload |
| **Summary** | Percentiles calculados | Latencia p95, latencia p99 |

## Tracing Distribuido

Los traces siguen un request a través de múltiples servicios.

```
Trace ID: abc123
├── Service A: 5ms  (HTTP request recibido)
├── Service B: 12ms (Auth check)
├── Service C: 45ms (Database query)
│   ├── Adquirir conexión: 2ms
│   ├── Ejecución de query: 30ms
│   └── Mapeo de resultados: 13ms
└── Service D: 8ms  (Formato de respuesta)
```

## Alerting

Alertar sobre síntomas, no causas.

### Niveles de Severidad de Alertas

| Severidad | Tiempo de Respuesta | Ejemplo |
|-----------|---------------------|---------|
| **Crítico** | Inmediato | Servicio caído, riesgo de pérdida de datos |
| **Warning** | Dentro de 1 hora | Tasa de error elevada, alta latencia |
| **Info** | Próximo día hábil | Capacidad cercana al límite |

## Lo que funciona

- **Usar correlation IDs**: Pasa `trace_id` a través de cada llamada de servicio
- **Loguear en boundaries**: Entrada/salida de requests, jobs y transacciones
- **Evitar loguear datos sensibles**: No passwords, tokens o PII
- **Establecer SLOs y error budgets**: Define qué significa "bueno" y mide contra eso. Consulta [monitoreo](/guides/devops/monitoring-alerting-guide).
- **La alert fatigue es real**: Pagear solo para issues útiles y críticos

## Errores Comunes

- Loguear todo a nivel INFO
- Métricas sin labels (sin dimensiones para cortar)
- Alertar sobre uso de CPU en vez de [síntomas orientados a usuarios](/guides/devops/monitoring-alerting-guide)
- Almacenar logs indefinidamente sin política de retención




## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de alerting y devops para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica guía de logging, monitoreo y observabilidad** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### Cuál es la diferencia entre logs, métricas y traces?

Los logs son eventos discretos que responden "qué pasó?". Las métricas son datos numéricos agregados que responden "cómo está la tendencia?". Los traces siguen un request a través de servicios y responden "dónde se fue el tiempo?"

### Cuánto tiempo debería retener logs?

Retén logs de error y auditoría por 30-90 días. Los logs de debug pueden mantenerse por 7 días. Ajusta según requisitos de compliance y costo. Usa log sampling para servicios de alto volumen.

### Sobre qué debería alertar?

Alerta sobre síntomas orientados a usuarios: tasa de error, latencia y disponibilidad. Evita alertar sobre métricas de infraestructura como CPU o memoria a menos que correlacionen directamente con impacto en usuarios.


## Temas Avanzados

### Escenario: Observabilidad para Microservicios E-commerce

```text
Sistema: 15 microservicios, 500K requests/min
Stack: OpenTelemetry -> Jaeger (traces), Prometheus (metrics), Loki (logs)

Arquitectura:
  App -> OpenTelemetry SDK -> OTLP exporter -> Collector
  Collector -> Jaeger (traces)
  Collector -> Prometheus (metrics)
  Collector -> Loki (logs)

Instrumentacion (Node.js):
  const { trace, metrics } = require("@opentelemetry/api");
  const tracer = trace.getTracer("payment-service");

  async function processPayment(payment) {
    const span = tracer.startSpan("processPayment");
    span.setAttribute("payment.amount", payment.amount);
    span.setAttribute("payment.currency", payment.currency);
    try {
      const result = await gateway.charge(payment);
      span.setAttribute("payment.status", result.status);
      metrics.getOrCreateCounter("payments.total").add(1, {
        status: result.status, gateway: "stripe"
      });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      metrics.getOrCreateCounter("payments.errors").add(1, {
        type: error.constructor.name
      });
      throw error;
    } finally {
      span.end();
    }
  }

Estructura de logs (JSON estructurado):
  {
    "timestamp": "2026-01-15T10:30:00Z",
    "level": "error",
    "service": "payment-service",
    "traceId": "abc123",
    "spanId": "def456",
    "message": "Payment failed",
    "paymentId": "pay_789",
    "amount": 99.99,
    "currency": "USD",
    "error": "InsufficientFunds"
  }

  // Correlacion: traceId conecta logs, metrics y traces
  // Busca por traceId en Loki -> ve todos los logs del request
  // Busca por traceId en Jaeger -> ve el trace completo

Dashboard de SLOs:
  | SLO | Objetivo | Metrica |
  |-----|----------|---------|
  | Disponibilidad | 99.9% | http_requests_total{status!~5..} / total |
  | Latencia p99 | < 500ms | histogram_quantile(0.99, http_duration_bucket) |
  | Tasa de error | < 0.1% | http_requests_total{status=~5..} / total |
  | Throughput | > 10K/s | rate(http_requests_total[5m]) |

Alertas (sintomas orientados a usuarios):
  - Tasa de error > 1% durante 5 min -> page on-call
  - Latencia p99 > 1s durante 10 min -> page on-call
  - SLO burn rate > 14x en 1h -> page on-call
  - Throughput < 5K/s durante 5 min -> ticket (no page)

Lecciones:
  - OpenTelemetry unifica traces, metrics y logs
  - traceId es la forma de correlacionar todo
  - Logs JSON estructurados > texto plano
  - Alerta sobre SLOs, no sobre infraestructura
  - El collector desacopla la app del backend de observabilidad
```

### Que es el SLO burn rate?

El burn rate mide que tan rapido consumes tu presupuesto de error. Si tu SLO es 99.9% (43.2 min de error/mes), un burn rate de 14x significa que estas gastando el presupuesto 14 veces mas rapido de lo normal. A ese ritmo, agotaras el presupuesto en ~3 horas. Alertar sobre burn rate detecta problemas antes de que violen el SLO.




































































End of document. Review and update quarterly.

## Troubleshooting

- **Pipeline fails silently**: enable verbose logging and store pipeline artifacts between stages so you can inspect the exact state that failed.
- **Container crashes on startup**: check that environment variables, secrets, and config files are mounted correctly. Read the first 50 lines of logs before scaling replicas.
- **Deployment rolls back repeatedly**: verify health checks, resource limits, and startup probes. A failing readiness probe is a common cause of rolling restarts.
- **Slow CI builds**: cache dependencies and docker layers. Split large test suites into parallel jobs to reduce wall-clock time.
- **Drift between environments**: use infrastructure-as-code and immutable artifacts. Compare deployed versions with the declared source of truth before debugging behavior differences.

## Errores Comunes en Producción

- Tratar la guía como un checklist para completar una vez en lugar de una práctica por evolucionar.
- Adoptar cada recomendación de golpe en lugar de comenzar con un cambio medido.
- Saltar la evaluación de madurez e imponer prácticas avanzadas a un equipo no preparado.
- No actualizar runbooks y expectativas de guardia al introducir nuevas prácticas.
- Ignorar datos reales de incidentes al priorizar qué partes de la guía aplicar primero.
- No asignar un responsable que revise decisiones trimestralmente.
- Copiar ejemplos sin adaptarlos a las herramientas y restricciones reales del equipo.
- Olvidar medir resultados antes de agregar la siguiente mejora.
