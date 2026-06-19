---
contentType: recipes
slug: distributed-tracing
title: "Tracing Distribuido"
description: "Tracea requests a través de microservicios distribuidos con OpenTelemetry, Jaeger y Zipkin para debuguear latencia y optimizar performance."
metaDescription: "Tracing distribuido con OpenTelemetry, Jaeger y Zipkin: tracea requests a través de microservicios, identifica cuellos de botella de latencia y optimiza performance."
difficulty: intermediate
topics:
  - observability
tags:
  - distributed-tracing
  - observability
  - microservices
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Tracing distribuido con OpenTelemetry, Jaeger y Zipkin: tracea requests a través de microservicios, identifica cuellos de botella de latencia y optimiza performance."
  keywords:
    - distributed-tracing
    - observability
    - opentelemetry
    - microservices
---
## Visión General

El tracing distribuido sigue una única request mientras viaja a través de microservicios, bases de datos, colas de mensajes y APIs de terceros. A diferencia de los logs (eventos discretos) o métricas (números agregados), los traces revelan el viaje completo — mostrando exactamente dónde se gasta el tiempo y qué servicio causa demoras. OpenTelemetry se ha convertido en el estándar de la industria para instrumentar aplicaciones y exportar traces a Jaeger, Zipkin o proveedores cloud.

## Cuándo Usar

Usa este recurso cuando:
- Debugueas latencia en arquitecturas de microservicios
- Entiendes grafos de llamadas a través de 10+ servicios
- Optimizas journeys críticos de usuario (checkout, login, búsqueda)
- Identificas fallas en cascada y retry storms

## Solución

### Auto-Instrumentación con OpenTelemetry (Node.js)

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Creación de Span Personalizado (Go)

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func processOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")
    
    ctx, span := tracer.Start(ctx, "processOrder",
        trace.WithAttributes(attribute.String("order.id", orderID)))
    defer span.End()
    
    // Span hijo para llamada a base de datos
    ctx, dbSpan := tracer.Start(ctx, "validateInventory")
    err := db.CheckStock(orderID)
    dbSpan.End()
    
    if err != nil {
        span.RecordError(err)
        return err
    }
    
    span.SetStatus(codes.Ok, "order processed")
    return nil
}
```

### Propagación vía HTTP Headers

```python
from opentelemetry import trace
from opentelemetry.propagate import extract, inject
import requests

tracer = trace.get_tracer(__name__)

def handle_request(headers):
    # Extraer contexto padre de request entrante
    context = extract(headers)
    
    with tracer.start_as_current_span("process-payment", context=context):
        # Request saliente lleva contexto de trace
        outgoing_headers = {}
        inject(outgoing_headers)
        
        response = requests.post(
            "https://payment-api.example.com/charge",
            headers=outgoing_headers
        )
        return response.json()
```

## Explicación

**Anatomía de un trace**:
- **Trace**: Una request completa de usuario (ej. "add to cart")
- **Span**: Una única operación dentro del trace (ej. "query database")
- **Span context**: Trace ID + Span ID + flags, propagados a través de límites de servicio
- **Baggage**: Pares key-value compartidos a través de todo el trace

**Estándar W3C Trace Context**:
- `traceparent`: 00-traceid-spanid-flags
- `tracestate`: Extensiones específicas de vendor

**Estrategias de sampling**:
- **Head-based**: Decidir en el edge (simple; consistente)
- **Tail-based**: Decidir después de completar (captura errores raros; costoso)
- **Probability**: Porcentaje aleatorio (barato; puede perder casos edge)

## Variantes

| Backend | Ideal Para | Características Destacadas |
|---------|------------|----------------------------|
| Jaeger | Open source, self-hosted | OpenTelemetry nativo; buena UI |
| Zipkin | Setups simples | Mínima huella de recursos |
| AWS X-Ray | Apps AWS-native | Service map; integración con ALB/Lambda |
| Datadog | Enterprise SaaS | APM + traces + logs unificados |
| Grafana Tempo | Stack Grafana | Costo-efectivo a escala |

## Mejores Prácticas

- **Instrumenta a nivel de framework**: Auto-instrumenta clientes HTTP, [gRPC](/recipes/api/grpc-api), [DB](/guides/databases/database-design-guide) y colas de mensajes
- **Agrega atributos de negocio**: user_id, order_id, tenant_id hacen los traces accionables
- **Mantén cardinalidad baja**: No pongas IDs únicos en nombres de span (usa atributos en su lugar)
- **Sample agresivamente en producción**: 1-5% suele ser suficiente para debugging
- **Vincula traces a logs**: Incluye trace_id en [entradas de log](/recipes/observability/structured-logging) para cross-referencing

## Errores Comunes

1. **Propagación de contexto faltante**: Los spans se rompen a través de [límites de servicio](/guides/architecture/microservices-architecture-guide) si los headers no se reenvían
2. **Span explosion**: Crear spans para cada iteración de loop genera traces ilegibles
3. **Tags de alta cardinalidad**: User IDs o session IDs como nombres de span saturan storage
4. **No samplear en dev**: Full tracing en desarrollo facilita verificar instrumentación
5. **Ignorar flujos async**: Jobs en background, callbacks y timers necesitan parenting manual de spans

## Preguntas Frecuentes

**P: ¿Necesito cambiar mi código para cada función?**
R: No. La auto-instrumentación cubre HTTP, DB y clientes de cola. Solo agrega spans manuales para operaciones críticas de negocio.

**P: ¿Cuál es el overhead de performance?**
R: Típicamente <1% CPU y memoria al samplear 1-5%. El sampling head-based es más barato que tail-based.

**P: ¿Puedo trazar JavaScript frontend también?**
R: Sí. OpenTelemetry JS instrumenta apps de browser, conectando clicks de usuario a backend traces end-to-end.
