---





contentType: recipes
slug: python-prometheus-metrics-exporter
title: "Expón Métricas Personalizadas de Aplicación con Python y"
description: "Construye un exporter personalizado de métricas Prometheus en Python usando prometheus_client para counters, gauges, histograms y summaries."
metaDescription: "Construye un exporter personalizado de Prometheus en Python con prometheus_client. Expón counters, gauges, histograms, summaries y endpoints de métricas."
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
  - prometheus-client
relatedResources:
  - /recipes/docker-logging-fluentd
  - /recipes/docker-health-check-configuration
  - /guides/observability-guide
  - /guides/complete-guide-structured-logging
  - /patterns/claim-check-pattern
  - /recipes/prometheus-monitoring-alerts
  - /guides/complete-guide-observability-grafana-stack
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Construye un exporter personalizado de Prometheus en Python con prometheus_client. Expón counters, gauges, histograms, summaries y endpoints de métricas."
  keywords:
    - python prometheus exporter
    - prometheus_client python
    - custom metrics prometheus
    - python monitoring metrics
    - prometheus counter gauge histogram
    - application metrics python





---

## Visión General

Prometheus es un sistema de monitoring basado en pull. Tu aplicación expone un endpoint `/metrics`, y Prometheus lo scrapea a intervalos regulares. La librería `prometheus_client` de Python proporciona tipos de métricas integrados (counter, gauge, histogram, summary) y un servidor HTTP para exponerlos. Esta recipe muestra cómo instrumentar una app Python con métricas personalizadas.

## Cuándo Usar


- For alternatives, see [Complete Guide to Observability with the Grafana Stack](/es/guides/complete-guide-observability-grafana-stack/).

- Necesitas métricas a nivel de aplicación (conteo de requests, latencia, profundidad de cola)
- Usas Prometheus o Grafana para monitoring y alerting
- Quieres trackear métricas de negocio personalizadas (usuarios activos, órdenes procesadas)
- Necesitas exponer métricas desde un servicio Python para scraping

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

Tipos de métricas de Prometheus:

- **Counter**: Valor monótonamente creciente. Usar para conteo de requests, conteo de errores, bytes enviados. Nunca decrece. Usar `.inc()` para añadir 1 o `.inc(value)` para añadir una cantidad específica.
- **Gauge**: Valor que sube y baja. Usar para conexiones activas, profundidad de cola, uso de memoria. Usar `.set(value)` para establecer, `.inc()` / `.dec()` para cambiar.
- **Histogram**: Agrupa observaciones en buckets. Usar para distribuciones de latencia. Proporciona time series `_bucket`, `_sum`, y `_count`. Definir buckets personalizados basados en tus SLOs.
- **Summary**: Similar a histogram pero calcula quantiles en el lado del cliente. Usar cuando necesitas percentiles exactos y tienes pocas instancias.

Los labels añaden dimensiones a las métricas. Cada combinación de labels crea una time series separada. Evitar labels de alta cardinalidad (user IDs, request IDs) — explotan el número de time series.

La librería `prometheus_client` expone métricas en el formato de exposición de texto de Prometheus en `/metrics`. Prometheus scrapea este endpoint en el `scrape_interval` configurado.

## Variantes

| Tipo de Métrica | Caso de Uso | Ejemplo |
|------------|----------|---------|
| Counter | Conteos acumulativos | Total requests, errors enviados |
| Gauge | Estado actual | Conexiones activas, profundidad de cola |
| Histogram | Distribuciones | Latencia de request, tamaño de respuesta |
| Summary | Quantiles en cliente | Latencia p99 por instancia |

## Pautas

- Usar counters para valores monótonamente crecientes (requests, errors, bytes).
- Usar gauges para valores que suben y bajan (conexiones, profundidad de cola, memoria).
- Usar histograms para distribuciones de latencia. Definir buckets que coincidan con tus SLOs.
- Mantener cardinalidad de labels baja. Evitar user IDs, session IDs, o request IDs como labels.
- Usar los buckets por defecto o definir personalizados. Los buckets por defecto están optimizados para ~0.005s a ~10s.
- Exponer métricas en un puerto o path separado de tu aplicación.
- Configurar `scrape_interval` a 15-60s. Intervalos más altos reducen storage pero pierden spikes cortos.
- Usar middleware para instrumentar todos los requests automáticamente (Flask `before_request`, FastAPI middleware).
- Trackear métricas de negocio junto con técnicas (órdenes procesadas, usuarios activos).
- Monitorear la salud de tu endpoint de métricas — si cae, Prometheus no tiene datos.

## Errores Comunes

- Usar labels de alta cardinalidad. Cada combinación única de labels crea una nueva time series. Un label con 10K user IDs crea 10K series por métrica.
- Usar un gauge para counters. Los counters nunca deben decrecer. Usar un gauge pierde la capacidad de cálculo de rate.
- No definir buckets personalizados de histogram. Los buckets por defecto pueden no coincidir con tu perfil de latencia.
- Exponer métricas en el mismo puerto que la app sin autenticación. En producción, proteger el endpoint de métricas.
- Olvidar llamar `.inc()` o `.observe()`. Métricas que nunca se actualizan son inútiles.
- Usar summaries en lugar de histograms. Los summaries no se pueden agregar entre instancias. Usar histograms para sistemas distribuidos.
- No instrumentar paths de error. Si solo trackeas requests exitosos, tu error rate aparece como cero.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre un histogram y un summary?

Los histograms agrupan observaciones en buckets configurables y dejan que Prometheus calcule quantiles en el servidor (agregables entre instancias). Los summaries calculan quantiles en el cliente (no agregables). Usar histograms para latencia en sistemas distribuidos. Usar summaries solo cuando necesitas percentiles exactos por instancia.

### ¿Cómo elijo los buckets del histogram?

Establece buckets basados en tus SLOs. Si tu SLO es 99 por ciento de requests bajo 200ms, usa buckets como `[0.01, 0.05, 0.1, 0.2, 0.5, 1.0]`. El bucket `+Inf` se añade automáticamente.

### ¿Puedo usar prometheus_client con Django?

Sí. Usa el paquete `django-prometheus` para integración específica de Django, o monta `make_wsgi_app()` en tu configuración de URLs.

### ¿Cómo testeo mis métricas localmente?

Ejecuta `prometheus_client.start_http_server(8000)` y abre `http://localhost:8000/metrics` en un navegador. Deberías ver el formato de exposición de texto con todas tus métricas.
