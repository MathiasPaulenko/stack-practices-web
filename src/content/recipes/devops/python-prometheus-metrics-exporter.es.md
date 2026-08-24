---
contentType: recipes
slug: python-prometheus-metrics-exporter
title: "Expón métricas de aplicación con Python y Prometheus"
description: "Construye un exporter de métricas Prometheus en Python con prometheus_client. Cubre counters, gauges, histograms, summaries e integración con Flask y FastAPI."
metaDescription: "Construye un exporter de Prometheus en Python con prometheus_client. Expón counters, gauges, histograms, summaries y endpoints de métricas personalizadas."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - python
  - prometheus
  - metrics
  - observability
  - monitoring
relatedResources:
  - /recipes/docker-logging-fluentd
  - /recipes/docker-health-check-configuration
  - /guides/observability-guide
  - /guides/complete-guide-structured-logging
  - /recipes/prometheus-monitoring-alerts
  - /guides/complete-guide-observability-grafana-stack
lastUpdated: "2026-08-24"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Construye un exporter de Prometheus en Python con prometheus_client. Expón counters, gauges, histograms, summaries y endpoints de métricas personalizadas."
  keywords:
    - python prometheus exporter
    - prometheus_client python
    - custom metrics prometheus
    - python monitoring metrics
    - prometheus counter gauge histogram
    - application metrics python
---

## Descripción General

Prometheus extrae métricas de tu app por HTTP. Exponés un endpoint `/metrics` y
Prometheus lo scrapea según un intervalo. La librería `prometheus_client` te da
cuatro tipos de métricas y un servidor HTTP rápido, así que instrumentar una app
Python es directo.

## Cuándo Usar

Usá esta receta cuando necesitás números a nivel de aplicación como cantidad de
requests, latencia o profundidad de cola. También sirve si ya usás Prometheus o
Grafana para monitoreo, o si querés publicar métricas de negocio personalizadas
como usuarios activos u órdenes procesadas desde un servicio Python.

No es la mejor opción si solo necesitás salida de debug temporal, o si tu stack
de monitoreo ya usa un recolector push con un backend que no es Prometheus.

Para alternativas, consultá la [Guía Completa de Observabilidad con el Stack de
Grafana](/es/guides/complete-guide-observability-grafana-stack/).

## Solución

### Endpoint básico de métricas

```python
from prometheus_client import start_http_server, Counter, Gauge, Histogram
import time
import random

# Definir métricas
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_CONNECTIONS = Gauge(
    "active_connections",
    "Number of active connections"
)

QUEUE_DEPTH = Gauge(
    "queue_depth",
    "Number of items in the processing queue",
    ["queue_name"]
)

def handle_request(method: str, endpoint: str):
    start = time.time()
    status = 200

    try:
        time.sleep(random.uniform(0.01, 0.3))
        if random.random() < 0.05:
            status = 500
    except Exception:
        status = 500

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

if __name__ == "__main__":
    start_http_server(8000)  # Métricas en puerto 8000
    print("Metrics server on http://localhost:8000/metrics")

    while True:
        handle_request("GET", "/api/users")
        handle_request("POST", "/api/orders")
        ACTIVE_CONNECTIONS.set(random.randint(1, 50))
        QUEUE_DEPTH.labels(queue_name="email").set(random.randint(0, 100))
        time.sleep(0.1)
```

### Integración con Flask

```python
from flask import Flask, request
from prometheus_client import Counter, Histogram, make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware
import time

app = Flask(__name__)

REQUEST_COUNT = Counter(
    "flask_requests_total",
    "Total Flask requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "flask_request_duration_seconds",
    "Flask request latency",
    ["endpoint"]
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    endpoint = request.path
    method = request.method
    status = response.status_code

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint).observe(time.time() - request.start_time)

    return response

@app.route("/health")
def health():
    return {"status": "healthy"}, 200

@app.route("/api/users")
def get_users():
    return {"users": []}, 200

# Montar endpoint de métricas Prometheus
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    "/metrics": make_wsgi_app()
})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

### Integración con FastAPI

```python
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram, make_asgi_app
import time

app = FastAPI()

REQUEST_COUNT = Counter(
    "fastapi_requests_total",
    "Total FastAPI requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "fastapi_request_duration_seconds",
    "FastAPI request latency",
    ["endpoint"]
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=str(response.status_code)
    ).inc()
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(duration)

    return response

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/users")
async def get_users():
    return {"users": []}

# Montar métricas Prometheus
app.mount("/metrics", make_asgi_app())
```

### Collector personalizado para datos externos

```python
from prometheus_client import CollectorRegistry, Gauge, generate_latest
import requests

class DatabaseCollector:
    """Collector personalizado que scrapea stats de base de datos."""

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.registry = CollectorRegistry()

        self.active_queries = Gauge(
            "db_active_queries",
            "Number of active database queries",
            registry=self.registry
        )
        self.connection_pool = Gauge(
            "db_connection_pool_size",
            "Database connection pool size",
            ["state"],
            registry=self.registry
        )

    def collect(self):
        # Obtener stats de la base de datos
        stats = requests.get(f"{self.db_url}/stats").json()

        self.active_queries.set(stats["active_queries"])
        self.connection_pool.labels(state="idle").set(stats["pool"]["idle"])
        self.connection_pool.labels(state="active").set(stats["pool"]["active"])
        self.connection_pool.labels(state="waiting").set(stats["pool"]["waiting"])

        yield from self.registry.collect()

# Uso en un endpoint de métricas
from flask import Flask, Response

app = Flask(__name__)
collector = DatabaseCollector("http://localhost:8080")

@app.route("/metrics")
def metrics():
    collector.collect()
    return Response(
        generate_latest(collector.registry),
        mimetype="text/plain; version=0.0.4; charset=utf-8"
    )
```

### Métrica Summary para percentiles

```python
from prometheus_client import Summary

REQUEST_SIZE = Summary(
    "request_size_bytes",
    "Request payload size in bytes",
    ["endpoint"]
)

# Summary proporciona _sum, _count, y quantiles (0.5, 0.9, 0.99 por defecto)
REQUEST_SIZE.labels(endpoint="/upload").observe(1024)
REQUEST_SIZE.labels(endpoint="/upload").observe(5120)
REQUEST_SIZE.labels(endpoint="/upload").observe(256)

# Acceder a quantiles: p50, p90, p99
```

### Configuración de scrape de Prometheus

```yaml
# prometheus.yml
scrape_configs:
    - job_name: "python-app"
      scrape_interval: 15s
      metrics_path: /metrics
      static_configs:
          - targets: ["localhost:8000"]

    - job_name: "flask-app"
      scrape_interval: 15s
      static_configs:
          - targets: ["localhost:5000"]
```

### Docker Compose con Prometheus + Grafana

```yaml
# docker-compose.yml
services:
    app:
        build: .
        ports:
            - "8000:8000"

    prometheus:
        image: prom/prometheus:v2.52.0
        ports:
            - "9090:9090"
        volumes:
            - ./prometheus.yml:/etc/prometheus/prometheus.yml

    grafana:
        image: grafana/grafana:11.0.0
        ports:
            - "3000:3000"
        environment:
            - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Explicación

Empezá por averiguar qué es lo que la métrica tiene que medir.

Si la pregunta es "cuántos" y la respuesta solo puede subir, usá un `Counter`.
Requests atendidos, errores levantados, bytes escritos — todo eso entra acá.
Incrementalo con `.inc()` para un evento, o pasale un valor a `.inc()` si ya
contaste un lote.

Si el valor sube y baja — conexiones activas, profundidad de cola, memoria libre
— un `Gauge` es la herramienta. Asignale un valor con `.set(value)` o ajustalo
con `.inc()` y `.dec()`.

Para tiempos o tamaño, la elección es entre un histogram y un summary. Un
`Histogram` mete cada observación en buckets y expone las series `_bucket`,
`_sum` y `_count`. La latencia es el caso clásico, y vos elegís dónde cortan los
buckets. Un `Summary` es el primo más exigente: calcula percentiles dentro de tu
app, así que tenés números exactos por instancia, pero no podés agregarlos entre
réplicas. Reservalo para despliegues chicos y estables.

Los labels te permiten cortar una métrica por detalles extra. El detalle es que
cada combinación única de valores de labels se convierte en su propia time
series, así que labels de alta cardinalidad como user IDs o request IDs explotan
la cantidad de series.

Por debajo, `prometheus_client` renderiza las métricas en formato de exposición
de texto de Prometheus en `/metrics`. Luego Prometheus scrapea ese endpoint según
el `scrape_interval` que configures.

## Mejores Prácticas

Los counters sirven para cualquier cosa que solo crezca: requests, errores,
bytes. Los gauges funcionan para valores que fluctúan, como conexiones activas o
profundidad de cola. Los histograms son para latencia, y deberías definir buckets
que coincidan con tus SLOs.

Mantené la cardinalidad de labels baja. Nunca uses user IDs, session IDs o
request IDs como labels. Decidí si los buckets por defecto del histogram tienen
sentido para tu tráfico o si definís los tuyos; los defaults cubren
aproximadamente de 0.005s a 10s. Intentá mantener el endpoint de métricas en un
puerto o path separado de tu aplicación principal.

Configurá `scrape_interval` entre 15 y 60 segundos. Intervalos más altos ahorran
almacenamiento pero pueden perder spikes cortos. Usá middleware en Flask o
FastAPI para instrumentar todos los requests automáticamente. Una vez que las
métricas fluyan, configurá alertas con [Monitoreo y Alertas con
Prometheus](/es/recipes/prometheus-monitoring-alerts/). No te olvides de las
métricas de negocio: órdenes procesadas, usuarios activos, checkouts
completados. Muchas veces dicen más que las técnicas. Y monitoreá la salud de tu
endpoint de métricas: si falla, Prometheus deja de recibir datos.

## Errores Comunes

La trampa más grande es usar labels de alta cardinalidad. Cada combinación única
crea una time series nueva, así que un label con 10.000 user IDs produce 10.000
series por métrica. Usar un gauge cuando necesitás un counter es otro error — los
counters nunca deben decrecer, y un gauge no sirve para calcular rates.

No definir buckets personalizados del histogram también es frecuente; los defaults
pueden no coincidir con tu perfil de latencia. Exponer `/metrics` en el mismo
puerto que la app sin autenticación es riesgoso en producción, así que protegé el
endpoint. Olvidarte de llamar `.inc()` o `.observe()` te deja con métricas
estancadas. Los summaries se rompen en sistemas distribuidos porque no se pueden
agregar entre instancias, así que no los uses si necesitás percentiles de todo el
cluster. Y solo instrumentar el camino feliz esconde errores — tu error rate va a
parecer cero.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre un histogram y un summary?

Ambos tratan distribuciones, pero la cuenta corre en distintos lugares. Con un
histogram, Prometheus recibe los buckets crudos y calcula los quantiles en el
servidor. Eso lo hace agregable entre instancias. Un summary calcula los quantiles
dentro de tu app, así que cada proceso reporta su propio percentile y no podés
sumarlos. Usá histograms para latencia en sistemas distribuidos; reservá los
summaries para percentiles exactos por instancia.

### ¿Cómo elijo los buckets del histogram?

Basalos en tus SLOs. Si el 99% de los requests debería terminar bajo 200ms, usá
buckets como `[0.01, 0.05, 0.1, 0.2, 0.5, 1.0]`. Prometheus añade el bucket
`+Inf` automáticamente.

### ¿Puedo usar prometheus_client con Django?

Sí. Usá el paquete `django-prometheus` para ayudantes específicos de Django, o
montá `make_wsgi_app()` en tu configuración de URLs.

### ¿Cómo testeo mis métricas localmente?

Ejecutá `prometheus_client.start_http_server(8000)` y abrí
`http://localhost:8000/metrics` en un navegador. Vas a ver el formato de
exposición de texto listando todas tus métricas.
