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
  - observability
  - logging
  - monitoring
  - metrics
  - tracing
  - alerting
  - devops
  - sre
relatedResources:
  - /es/docs/runbook-template
  - /es/guides/cicd-pipeline-guide
  - /es/recipes/logging
lastUpdated: "2026-06-11"
author: "StackPractices"
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

Reemplaza texto libre por JSON parseable por máquinas.

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

## Buenas Prácticas

- **Usar correlation IDs**: Pasa `trace_id` a través de cada llamada de servicio
- **Loguear en boundaries**: Entrada/salida de requests, jobs y transacciones
- **Evitar loguear datos sensibles**: No passwords, tokens o PII
- **Establecer SLOs y error budgets**: Define qué significa "bueno" y mide contra eso
- **La alert fatigue es real**: Pagear solo para issues accionables y críticos

## Errores Comunes

- Loguear todo a nivel INFO
- Métricas sin labels (sin dimensiones para cortar)
- Alertar sobre uso de CPU en vez de síntomas orientados a usuarios
- Almacenar logs indefinidamente sin política de retención
