---
contentType: guides
slug: distributed-tracing-guide
title: "Distributed Tracing: End-to-End Request Flow Across Microservices"
description: "A practical guide to distributed tracing: instrumenting applications, trace propagation, sampling strategies, and diagnosing latency in microservice architectures with OpenTelemetry, Jaeger, and Zipkin."
metaDescription: "Learn distributed tracing: instrument applications, propagate traces, sampling strategies, and diagnose latency with OpenTelemetry, Jaeger, and Zipkin."
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
  metaDescription: "Learn distributed tracing: instrument applications, propagate traces, sampling strategies, and diagnose latency with OpenTelemetry, Jaeger, and Zipkin."
  keywords:
    - distributed-tracing
    - opentelemetry
    - jaeger
    - zipkin
    - microservices
    - latency
    - guide
---

## Overview

Distributed tracing captures the full journey of a request as it travels through multiple services. Unlike logs and metrics, traces show causality and timing across service boundaries, making them essential for debugging latency, understanding dependencies, and optimizing request paths in distributed systems.

This guide covers instrumentation, trace context propagation, sampling, and operational practices.

## When to Use

- You operate a microservices architecture with more than 5 services
- Debugging latency requires correlating logs across multiple services
- You need to understand service dependencies and critical paths
- Your mean time to resolution (MTTR) for cross-service issues exceeds 30 minutes
- You want to measure end-to-end request latency, not just per-service metrics

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Trace** | A complete record of a single request's journey through the system |
| **Span** | A single operation within a trace (one unit of work) |
| **Span Context** | Metadata propagated across service boundaries (trace ID, span ID, baggage) |
| **Parent-Child** | Relationship showing which span caused another span |
| **Baggage** | Key-value pairs propagated alongside the trace context |
| **Sampling** | Deciding which traces to capture (head, tail, or adaptive) |

## Architecture

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

## Step-by-Step Distributed Tracing Setup

### 1. Instrument Your Application

Add OpenTelemetry SDK to your services:

```python
# Example: Python Flask with OpenTelemetry
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

# Configure tracer provider
resource = Resource.create({SERVICE_NAME: "orders-service"})
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

# Export to collector (Jaeger, Zipkin, or Tempo)
otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Auto-instrument Flask
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

tracer = trace.get_tracer(__name__)

@app.route("/orders/<order_id>")
def get_order(order_id):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)
        
        # Add child spans for database calls
        with tracer.start_as_current_span("fetch_order_db") as db_span:
            order = db.query(Order).get(order_id)
            db_span.set_attribute("db.rows_returned", 1)
        
        # Add child spans for external calls
        with tracer.start_as_current_span("verify_payment") as payment_span:
            status = payment_client.verify(order.payment_id)
            payment_span.set_attribute("payment.status", status)
        
        return jsonify(order.to_dict())
```

```javascript
// Example: Node.js Express with OpenTelemetry
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4317' }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'payment-service'
});
sdk.start();

// Manual span creation
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

#### Instrumentation Checklist
- Auto-instrument HTTP frameworks, database clients, and messaging libraries
- Create manual spans for business operations (not just infrastructure)
- Add attributes to spans for filtering and correlation
- Record exceptions with stack traces
- Set span status (OK, ERROR) explicitly

### 2. Propagate Trace Context

Ensure trace IDs flow across all service boundaries:

```python
# Example: Propagate trace context in HTTP headers
import requests
from opentelemetry.propagate import inject
from opentelemetry import trace

def call_user_service(user_id):
    headers = {}
    inject(headers)  # Adds traceparent, tracestate headers
    
    response = requests.get(
        f"http://user-service/users/{user_id}",
        headers=headers
    )
    return response.json()
```

```java
// Example: Spring Boot with trace propagation
@RestController
public class OrderController {
    @Autowired
    private RestTemplate restTemplate;
    
    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable String id) {
        // Trace context automatically propagated via RestTemplate
        User user = restTemplate.getForObject(
            "http://user-service/users/{id}", User.class, id
        );
        return orderService.findById(id, user);
    }
}
```

#### Propagation Requirements

- HTTP: Use `traceparent` and `tracestate` headers (W3C standard)
- gRPC: Use metadata keys `traceparent` and `tracestate`
- Message queues: Embed trace context in message attributes/headers
- Async processing: Ensure context propagates to thread pools and callbacks

### 3. Configure Sampling

Capture traces efficiently without overwhelming storage:

| Sampling Type | When to Use | Trade-off |
|---------------|-------------|-----------|
| **Head-based** | Decide at request start based on rate | Simple, but may miss interesting slow traces |
| **Tail-based** | Collect all spans, decide after completion | Catches slow/error traces, higher memory cost |
| **Adaptive** | Adjust rate based on traffic patterns | Best coverage, more complex configuration |

```yaml
# Example: OpenTelemetry Collector sampling configuration
processors:
  prob_sampler:
    type: probabilistic
    sampling_percentage: 10.0  # Sample 10% of traces
    
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
# Example: Programmatic sampling
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Sample 5% of traces deterministically
sampler = TraceIdRatioBased(0.05)
provider = TracerProvider(sampler=sampler)
```

#### Sampling: What Works
- Start with 1-10% sampling in production
- Always sample error traces and slow requests (tail-based)
- Use consistent sampling across services (same trace ID → same decision)
- Monitor sampling rate and storage costs

### 4. Correlate with Logs and Metrics

Link traces to other observability signals:

```python
# Example: Adding trace context to logs
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

# Usage
log_with_trace("Processing payment", payment_id="pay-123", amount=99.99)
```

#### Correlation Patterns

- Logs: Include `trace_id` and `span_id` in every log entry
- Metrics: Tag latency metrics with `trace_id` for drill-down
- Errors: Attach trace context to error tracking (Sentry, Bugsnag)
- Dashboards: Link from latency spikes directly to example traces

### 5. Query and Analyze Traces

Use your trace backend to find and diagnose issues:

```jaegerql
# Example: Jaeger query patterns

# Find traces for a specific service
service=orders-service

# Find slow traces (>500ms)
service=orders-service duration>500ms

# Find error traces
service=orders-service error=true

# Find traces for a specific user
tags={"user.id":"user-123"}

# Find traces that touched multiple services
service=orders-service | select traceID, spanID, duration
```

#### Common Trace Analysis Queries

- Latency hotspots: Group by service, find slowest spans
- Error correlation: Which services fail together?
- Dependency mapping: Which services call which?
- Bottleneck identification: Where is time spent in a trace?

## What Works

- Instrument at the framework level first. HTTP clients, databases, and message queues give the most value with least effort.
- Use semantic conventions. Follow OpenTelemetry semantic conventions for span names and attributes.
- Avoid high-cardinality attributes. User IDs in span names cause index explosion; use attributes instead.
- Sample intelligently. Tail-based sampling captures the most important traces.
- Keep trace depth reasonable. Limit to 50-100 spans per trace; deep nesting hurts readability.
- Monitor the monitoring. Alert if trace collection rate drops or collector queue backs up.

## Common Mistakes

- Missing context propagation. A broken trace is worse than no trace. Verify headers flow everywhere.
- Over-instrumenting. Every loop iteration does not need a span. Instrument operations, not iterations.
- Using trace IDs as log search. Traces complement logs; they do not replace them.
- Ignoring sampling costs. 100% sampling in high-traffic systems generates terabytes of data.
- Not correlating with metrics. Traces show what happened; metrics show how often. Use both.

## Variants

- Request shadowing: Duplicate traffic to a shadow environment with full tracing
- Synthetic tracing: Inject fake requests to continuously monitor paths
- eBPF-based tracing: Kernel-level tracing without application instrumentation
- Service mesh tracing: Istio/Linkerd automatic trace propagation

## FAQ

**Q: What is the difference between distributed tracing and logging?**
Logs are discrete events. Traces show causality and timing across services. Use both: traces for request flow, logs for detailed state.

**Q: How much overhead does tracing add?**
Typically 1-5% CPU and memory. Sampling reduces this further. The overhead is usually worth the debugging speedup.

**Q: Should I use Jaeger, Zipkin, or Tempo?**
All support OpenTelemetry. Jaeger has the largest community. Zipkin is simpler. Tempo is Grafana-native and cost-efficient at scale.

**Q: Can I trace asynchronous workflows?**
Yes, but ensure trace context propagates across message queues, callbacks, and thread pools. This is the most common source of broken traces.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.

## Conclusion

Distributed tracing is essential for operating microservices at scale. By instrumenting your applications, propagating context faithfully, and sampling intelligently, you transform opaque cross-service failures into visual, debuggable request flows.

