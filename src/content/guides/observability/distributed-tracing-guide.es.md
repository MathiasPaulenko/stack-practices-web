---
contentType: guides
slug: distributed-tracing-guide
title: "Trazas Distribuidas — Flujo de Peticiones de Extremo a Extremo en Microservicios"
description: "Guía práctica sobre trazas distribuidas: instrumentación de aplicaciones, propagación de trazas, estrategias de muestreo y diagnóstico de latencia en arquitecturas de microservicios con OpenTelemetry, Jaeger y Zipkin."
metaDescription: "Aprende trazas distribuidas: instrumenta aplicaciones, propaga trazas, estrategias de muestreo y diagnostica latencia con OpenTelemetry, Jaeger y Zipkin."
difficulty: intermediate
topics:
  - observability
  - devops
  - performance
tags:
  - distributed-tracing
  - opentelemetry
  - jaeger
  - zipkin
  - microservices
  - latency
  - guide
relatedResources:
  - /guides/observability-guide
  - /guides/observability/log-aggregation-guide
  - /guides/observability/metrics-and-dashboards-guide
  - /guides/devops/service-mesh-guide
  - /guides/devops/opentelemetry-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende trazas distribuidas: instrumenta aplicaciones, propaga trazas, estrategias de muestreo y diagnostica latencia con OpenTelemetry, Jaeger y Zipkin."
  keywords:
    - distributed-tracing
    - opentelemetry
    - jaeger
    - zipkin
    - microservices
    - latency
    - guide
---

## Descripción General

Las trazas distribuidas capturan el recorrido completo de una petición a medida que viaja por múltiples servicios. A diferencia de los logs y las métricas, las trazas muestran causalidad y tiempos a través de los límites de los servicios, haciéndolas esenciales para depurar latencia, entender dependencias y optimizar rutas de petición en sistemas distribuidos.

Esta guía cubre instrumentación, propagación de contexto de traza, muestreo y prácticas operativas.

## Cuándo Usar

- Operas una arquitectura de microservicios con más de 5 servicios
- Depurar latencia requiere correlacionar logs entre múltiples servicios
- Necesitas entender dependencias y rutas críticas de los servicios
- Tu tiempo medio de resolución (MTTR) para problemas entre servicios excede los 30 minutos
- Quieres medir la latencia de petición de extremo a extremo, no solo por servicio

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Traza** | Un registro completo del viaje de una única petición a través del sistema |
| **Span** | Una única operación dentro de una traza (una unidad de trabajo) |
| **Contexto de Span** | Metadatos propagados a través de los límites de servicios (trace ID, span ID, baggage) |
| **Padre-Hijo** | Relación que muestra qué span causó otro span |
| **Baggage** | Pares clave-valor propagados junto con el contexto de traza |
| **Muestreo** | Decidir qué trazas capturar (head, tail o adaptativo) |

## Arquitectura

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   API     │──→│  Auth   │──→│ Orders  │──→│ Payment │
│  Gateway  │   │ Service │   │ Service │   │ Service │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                        ↓
                  [Trace Collector]
                        ↓
              [Jaeger / Zipkin / Tempo]
```

## Configuración de Trazas Distribuidas Paso a Paso

### 1. Instrumenta Tu Aplicación

Añade el SDK de OpenTelemetry a tus servicios:

```python
# Ejemplo: Python Flask con OpenTelemetry
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

# Configurar proveedor de trazas
resource = Resource.create({SERVICE_NAME: "orders-service"})
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

# Exportar al colector (Jaeger, Zipkin o Tempo)
otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Auto-instrumentar Flask
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

tracer = trace.get_tracer(__name__)

@app.route("/orders/<order_id>")
def get_order(order_id):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)
        
        # Añadir spans hijos para llamadas a base de datos
        with tracer.start_as_current_span("fetch_order_db") as db_span:
            order = db.query(Order).get(order_id)
            db_span.set_attribute("db.rows_returned", 1)
        
        # Añadir spans hijos para llamadas externas
        with tracer.start_as_current_span("verify_payment") as payment_span:
            status = payment_client.verify(order.payment_id)
            payment_span.set_attribute("payment.status", status)
        
        return jsonify(order.to_dict())
```

```javascript
// Ejemplo: Node.js Express con OpenTelemetry
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4317' }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'payment-service'
});
sdk.start();

// Creación manual de spans
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('payment-service');

app.post('/payments', async (req, res) => {
  const span = tracer.startSpan('process_payment');
  span.setAttribute('payment.amount', req.body.amount);
  
  try {
    const result = await processPayment(req.body);
    span.setAttribute('payment.status', 'success');
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: trace.StatusCode.ERROR });
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});
```

**Checklist de instrumentación:**
- Instrumenta frameworks HTTP, clientes de base de datos y librerías de mensajería automáticamente
- Crea spans manuales para operaciones de negocio (no solo infraestructura)
- Añade atributos a los spans para filtrado y correlación
- Registra excepciones con stack traces
- Establece el estado del span (OK, ERROR) explícitamente

### 2. Propaga el Contexto de Traza

Asegúrate de que los trace IDs fluyan a través de todos los límites de servicios:

```python
# Ejemplo: Propagar contexto de traza en headers HTTP
import requests
from opentelemetry.propagate import inject
from opentelemetry import trace

def call_user_service(user_id):
    headers = {}
    inject(headers)  # Añade traceparent, tracestate headers
    
    response = requests.get(
        f"http://user-service/users/{user_id}",
        headers=headers
    )
    return response.json()
```

```java
// Ejemplo: Spring Boot con propagación de trazas
@RestController
public class OrderController {
    @Autowired
    private RestTemplate restTemplate;
    
    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable String id) {
        // El contexto de traza se propaga automáticamente vía RestTemplate
        User user = restTemplate.getForObject(
            "http://user-service/users/{id}", User.class, id
        );
        return orderService.findById(id, user);
    }
}
```

**Requisitos de propagación:**
- **HTTP:** Usa headers `traceparent` y `tracestate` (estándar W3C)
- **gRPC:** Usa metadatos `traceparent` y `tracestate`
- **Colas de mensajes:** Incrusta el contexto de traza en atributos/headers del mensaje
- **Procesamiento asíncrono:** Asegúrate de que el contexto se propague a pools de hilos y callbacks

### 3. Configura el Muestreo

Captura trazas eficientemente sin saturar el almacenamiento:

| Tipo de Muestreo | Cuándo Usar | Compromiso |
|------------------|-------------|------------|
| **Head-based** | Decide al inicio de la petición basado en tasa | Simple, pero puede perder trazas lentas interesantes |
| **Tail-based** | Recolecta todos los spans, decide tras completarse | Captura trazas lentas/de error, mayor costo de memoria |
| **Adaptativo** | Ajusta la tasa basado en patrones de tráfico | Mejor cobertura, configuración más compleja |

```yaml
# Ejemplo: Configuración de muestreo del Colector OpenTelemetry
processors:
  prob_sampler:
    type: probabilistic
    sampling_percentage: 10.0  # Muestrea 10% de trazas
    
  tail_sampler:
    type: tail_based
    policies:
      - name: slow_requests
        type: latency
        latency_threshold_ms: 1000
      - name: errors
        type: status_code
        status_codes: [ERROR]
```

```python
# Ejemplo: Muestreo programático
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Muestrea 5% de trazas determinísticamente
sampler = TraceIdRatioBased(0.05)
provider = TracerProvider(sampler=sampler)
```

**Mejores prácticas de muestreo:**
- Comienza con 1-10% de muestreo en producción
- Muestrea siempre trazas de error y peticiones lentas (tail-based)
- Usa muestreo consistente entre servicios (mismo trace ID → misma decisión)
- Monitoriza la tasa de muestreo y los costes de almacenamiento

### 4. Correlaciona con Logs y Métricas

Vincula trazas con otras señales de observabilidad:

```python
# Ejemplo: Añadir contexto de traza a logs
import structlog
from opentelemetry import trace

logger = structlog.get_logger()

def log_with_trace(message, **kwargs):
    current_span = trace.get_current_span()
    span_context = current_span.get_span_context()
    
    logger.info(
        message,
        trace_id=format(span_context.trace_id, '032x'),
        span_id=format(span_context.span_id, '016x'),
        **kwargs
    )

# Uso
log_with_trace("Processing payment", payment_id="pay-123", amount=99.99)
```

**Patrones de correlación:**
- **Logs:** Incluye `trace_id` y `span_id` en cada entrada de log
- **Métricas:** Etiqueta métricas de latencia con `trace_id` para profundizar
- **Errores:** Adjunta contexto de traza al seguimiento de errores (Sentry, Bugsnag)
- **Dashboards:** Vincula desde picos de latencia directamente a trazas de ejemplo

### 5. Consulta y Analiza Trazas

Usa tu backend de trazas para encontrar y diagnosticar problemas:

```jaegerql
# Ejemplo: Patrones de consulta en Jaeger

# Encuentra trazas para un servicio específico
service=orders-service

# Encuentra trazas lentas (>500ms)
service=orders-service duration>500ms

# Encuentra trazas de error
service=orders-service error=true

# Encuentra trazas para un usuario específico
tags={"user.id":"user-123"}

# Encuentra trazas que tocaron múltiples servicios
service=orders-service | select traceID, spanID, duration
```

**Consultas comunes de análisis de trazas:**
- **Puntos calientes de latencia:** Agrupa por servicio, encuentra los spans más lentos
- **Correlación de errores:** ¿Qué servicios fallan juntos?
- **Mapeo de dependencias:** ¿Qué servicios llaman a cuáles?
- **Identificación de cuellos de botella:** ¿Dónde se gasta el tiempo en una traza?

## Mejores Prácticas

- **Instrumenta a nivel de framework primero.** Clientes HTTP, bases de datos y colas de mensajes dan el mayor valor con menos esfuerzo.
- **Usa convenciones semánticas.** Sigue las convenciones semánticas de OpenTelemetry para nombres de spans y atributos.
- **Evita atributos de alta cardinalidad.** Los IDs de usuario en nombres de span causan explosión de índices; usa atributos en su lugar.
- **Muestrea inteligentemente.** El muestreo tail-based captura las trazas más importantes.
- **Mantén la profundidad de traza razonable.** Limita a 50-100 spans por traza; la anidación profunda afecta la legibilidad.
- **Monitoriza el monitoreo.** Alerta si la tasa de recolección de trazas cae o la cola del colector se acumula.

## Errores Comunes

- **Falta de propagación de contexto.** Una traza rota es peor que no tener traza — verifica que los headers fluyan en todas partes.
- **Sobre-instrumentación.** Cada iteración de bucle no necesita un span. Instrumenta operaciones, no iteraciones.
- **Usar trace IDs como búsqueda de logs.** Las trazas complementan los logs; no las reemplazan.
- **Ignorar los costos de muestreo.** El muestreo 100% en sistemas de alto tráfico genera terabytes de datos.
- **No correlacionar con métricas.** Las trazas muestran qué pasó; las métricas muestran qué tan a menudo. Usa ambas.

## Variantes

- **Shadowing de peticiones:** Duplica tráfico a un entorno shadow con trazas completas
- **Trazas sintéticas:** Inyecta peticiones falsas para monitorear continuamente las rutas
- **Trazas basadas en eBPF:** Trazas a nivel de kernel sin instrumentación de aplicación
- **Trazas de service mesh:** Istio/Linkerd con propagación automática de trazas

## FAQ

**P: ¿Qué diferencia hay entre trazas distribuidas y logs?**
Los logs son eventos discretos. Las trazas muestran causalidad y tiempos entre servicios. Usa ambos: trazas para el flujo de peticiones, logs para el estado detallado.

**P: ¿Cuánta sobrecarga añade el tracing?**
Típicamente 1-5% de CPU y memoria. El muestreo reduce esto aún más. La sobrecarga suele valer la aceleración en depuración.

**P: ¿Debería usar Jaeger, Zipkin o Tempo?**
Todos soportan OpenTelemetry. Jaeger tiene la comunidad más grande. Zipkin es más simple. Tempo es nativo de Grafana y eficiente en costo a escala.

**P: ¿Puedo trazar flujos de trabajo asíncronos?**
Sí, pero asegúrate de que el contexto de traza se propague a través de colas de mensajes, callbacks y pools de hilos. Esta es la fuente más común de trazas rotas.

## Conclusión

Las trazas distribuidas son esenciales para operar microservicios a escala. Al instrumentar tus aplicaciones, propagar el contexto fielmente y muestrear inteligentemente, transformas fallas opacas entre servicios en flujos de petición visuales y depurables.
