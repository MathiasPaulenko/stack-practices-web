---



contentType: patterns
slug: sidecar-pattern
title: "Patrón Sidecar: Extendé Services con Companion Containers"
description: "Cómo extendear services con companion containers para cross-cutting concerns. Cubre sidecar containers, shared volumes, health probes, y service mesh sidecars."
metaDescription: "Extendé services con companion containers para cross-cutting concerns. Aprende sidecar containers, shared volumes, health probes, y service mesh sidecar deployment."
difficulty: intermediate
topics:
  - architecture
  - infrastructure
tags:
  - architecture
  - sidecar
  - containers
  - kubernetes
  - pattern
category: architectural
relatedResources:
  - /patterns/ambassador-pattern
  - /patterns/modular-monolith-pattern
  - /patterns/strangler-fig-pattern
  - /patterns/multi-tenant-data-isolation-pattern
  - /guides/complete-guide-kubernetes-ingress
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Extendé services con companion containers para cross-cutting concerns. Aprende sidecar containers, shared volumes, health probes, y service mesh sidecar deployment."
  keywords:
    - architecture
    - sidecar
    - containers
    - kubernetes
    - pattern



---

## Overview

El sidecar pattern deployea un companion container alongside el main application container dentro del mismo pod. El sidecar handlea cross-cutting concerns: logging, monitoring, configuration, TLS termination, o service mesh proxying. El main application se mantiene focused en business logic y no necesita saber sobre infrastructure concerns. Ambos containers sharean el mismo network namespace, storage volumes, y lifecycle. El sidecar puede ser updated, restarted, o replaced independentemente del main container. Este pattern es fundamental para service meshes como Istio y Linkerd, donde un proxy sidecar handlea todo el inbound y outbound traffic.

## When to Use

- Offloadando cross-cutting concerns desde el application (logging, metrics, TLS)
- Service mesh deployment (Istio Envoy proxy, Linkerd)
- Configuration management sin modificar el application
- Log forwarding y aggregation
- Database connection pooling o caching proxies
- Agregando HTTPS termination a legacy HTTP-only services

## When NOT to Use

- Cuando el concern es suficientemente simple de handlear en el application code
- Cuando el sidecar agrega too much resource overhead relativo al main container
- Cuando el application necesita direct control sobre network traffic
- Serverless functions donde no podés deployear companion containers

## Solution

### Kubernetes pod con sidecar

```yaml
# kubernetes-pod.yaml — Pod con main container y sidecar
apiVersion: v1
kind: Pod
metadata:
  name: api-server
  labels:
    app: api-server
spec:
  containers:
    # Main application container
    - name: api
      image: shop/api-server:latest
      ports:
        - containerPort: 8080
      env:
        - name: LOG_LEVEL
          value: "info"
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
        - name: config
          mountPath: /etc/app/config

    # Sidecar: log forwarder
    - name: log-forwarder
      image: fluent-bit:2.1
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
          readOnly: true
      env:
        - name: LOG_OUTPUT
          value: "elasticsearch://es:9200"

    # Sidecar: config reloader
    - name: config-reloader
      image: config-reloader:latest
      volumeMounts:
        - name: config
          mountPath: /etc/app/config
      env:
        - name: CONFIG_SOURCE
          value: "configmap:api-config"

  volumes:
    - name: shared-logs
      emptyDir: {}
    - name: config
      emptyDir: {}
```

### Log forwarding sidecar (Fluent Bit)

```yaml
# fluentbit-sidecar.yaml — Fluent Bit sidecar para log forwarding
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentbit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info

    [INPUT]
        Name          tail
        Path          /var/log/app/*.log
        Parser        json
        Tag           app

    [OUTPUT]
        Name          es
        Match         *
        Host          elasticsearch
        Port          9200
        Index         app-logs
        Type          _doc

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-with-logging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: shop/api-server:latest
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
            - name: fluentbit-config
              mountPath: /fluent-bit/etc

        - name: log-sidecar
          image: fluent-bit:2.1
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
              readOnly: true
            - name: fluentbit-config
              mountPath: /fluent-bit/etc
              readOnly: true

      volumes:
        - name: logs
          emptyDir: {}
        - name: fluentbit-config
          configMap:
            name: fluentbit-config
```

### TLS termination sidecar (Envoy)

```yaml
# envoy-tls-sidecar.yaml — Envoy sidecar para TLS termination
static_resources:
  listeners:
    - address:
        socket_address:
          address: 0.0.0.0
          port_value: 8443
      filter_chains:
        - transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain:
                      filename: /etc/ssl/certs/server.crt
                    private_key:
                      filename: /etc/ssl/certs/server.key
          filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_https
                route_config:
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: backend }
                http_filters:
                  - name: envoy.filters.http.router
  clusters:
    - name: backend
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: backend
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8080
```

### Python sidecar para metrics export

```python
# metrics_sidecar.py — sidecar que leé app metrics y exportéa a Prometheus
import os
import time
import requests
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

PROMETHEUS_URL = os.environ.get("PROMETHEUS_PUSHGATEWAY", "http://prometheus:9091")
APP_URL = os.environ.get("APP_URL", "http://localhost:8080")
SCRAPE_INTERVAL = int(os.environ.get("SCRAPE_INTERVAL", "15"))

class MetricsSidecar:
    """Sidecar que scrapeéa app metrics y pusheéa a Prometheus."""

    def __init__(self, app_url, pushgateway_url):
        self.app_url = app_url
        self.pushgateway_url = pushgateway_url
        self.registry = CollectorRegistry()
        self.request_count = Gauge(
            "app_request_count", "Total requests",
            ["method", "endpoint"], registry=self.registry
        )
        self.response_time = Gauge(
            "app_response_time_ms", "Response time in ms",
            ["endpoint"], registry=self.registry
        )

    def scrape(self):
        """Scrapeéa metrics desde el main application."""
        try:
            resp = requests.get(f"{self.app_url}/metrics", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                for metric in data.get("counters", []):
                    self.request_count.labels(
                        method=metric["method"],
                        endpoint=metric["endpoint"]
                    ).set(metric["value"])

                for metric in data.get("timers", []):
                    self.response_time.labels(
                        endpoint=metric["endpoint"]
                    ).set(metric["p99"])

                self.push()
        except Exception as e:
            print(f"Scrape failed: {e}")

    def push(self):
        """Pusheéa metrics a Prometheus pushgateway."""
        try:
            push_to_gateway(
                self.pushgateway_url,
                job="api-server",
                registry=self.registry
            )
            print(f"Pushed metrics to {self.pushgateway_url}")
        except Exception as e:
            print(f"Push failed: {e}")

    def run(self):
        """Corré el sidecar loop."""
        print(f"Starting metrics sidecar for {self.app_url}")
        while True:
            self.scrape()
            time.sleep(SCRAPE_INTERVAL)

if __name__ == "__main__":
    sidecar = MetricsSidecar(APP_URL, PROMETHEUS_URL)
    sidecar.run()
```

### Docker Compose con sidecar

```yaml
# docker-compose.yaml — sidecar pattern con Docker Compose
version: "3.8"
services:
  # Main application
  api:
    image: shop/api-server:latest
    ports:
      - "8080:8080"
    volumes:
      - shared-logs:/var/log/app
    environment:
      - DB_URL=postgresql://db:5432/shop
    depends_on:
      - db

  # Sidecar: log forwarder
  log-sidecar:
    image: fluent-bit:2.1
    volumes:
      - shared-logs:/var/log/app:ro
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
    depends_on:
      - api

  # Sidecar: metrics exporter
  metrics-sidecar:
    image: shop/metrics-sidecar:latest
    environment:
      - APP_URL=http://api:8080
      - PROMETHEUS_PUSHGATEWAY=http://prometheus:9091
    depends_on:
      - api

  # Infrastructure
  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=shop
      - POSTGRES_PASSWORD=secret

  prometheus:
    image: prom/pushgateway:latest
    ports:
      - "9091:9091"

volumes:
  shared-logs:
```

### Java sidecar para configuration reload

```java
// ConfigReloaderSidecar.java — sidecar que watchéa config y signalea reload
import java.nio.file.*;
import java.net.http.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;

public class ConfigReloaderSidecar {
    private static final String CONFIG_PATH = "/etc/app/config";
    private static final String APP_RELOAD_URL = "http://localhost:8080/admin/reload";

    public void watchAndReload() throws Exception {
        var watchService = FileSystems.getDefault().newWatchService();
        var configDir = Paths.get(CONFIG_PATH);
        configDir.register(watchService, StandardWatchEventKinds.ENTRY_MODIFY);

        System.out.println("Config reloader sidecar started, watching " + CONFIG_PATH);

        while (true) {
            var key = watchService.take();
            for (var event : key.pollEvents()) {
                if (event.kind() == StandardWatchEventKinds.ENTRY_MODIFY) {
                    var filename = (Path) event.context();
                    System.out.println("Config changed: " + filename);
                    signalReload();
                }
            }
            key.reset();
        }
    }

    private void signalReload() {
        try {
            var client = HttpClient.newHttpClient();
            var request = HttpRequest.newBuilder()
                .uri(URI.create(APP_RELOAD_URL))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

            var response = client.send(request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (response.statusCode() == 200) {
                System.out.println("App reloaded config successfully");
            } else {
                System.err.println("Reload failed: " + response.statusCode());
            }
        } catch (Exception e) {
            System.err.println("Reload request failed: " + e.getMessage());
        }
    }

    public static void main(String[] args) throws Exception {
        new ConfigReloaderSidecar().watchAndReload();
    }
}
```

## Variants

### Service mesh sidecar (Istio)

```yaml
# istio-injection.yaml — Pod automáticamente obtiene Envoy sidecar
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled  # Istio auto-injectéa sidecar
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: shop/api-server:latest
          ports:
            - containerPort: 8080
      # Istio automáticamente injectéa el Envoy sidecar
      # No need de definirlo manualmente
```

### Init container as pre-sidecar

```yaml
# init-container.yaml — init container corre antes de main y sidecar
spec:
  initContainers:
    - name: config-init
      image: config-fetcher:latest
      command: ["sh", "-c", "fetch-config --output /config/app.yaml"]
      volumeMounts:
        - name: config
          mountPath: /config

  containers:
    - name: api
      image: shop/api-server:latest
      volumeMounts:
        - name: config
          mountPath: /etc/app/config

    - name: config-reloader
      image: config-reloader:latest
      volumeMounts:
        - name: config
          mountPath: /etc/app/config

  volumes:
    - name: config
      emptyDir: {}
```

## Best Practices


- For a deeper guide, see [Graceful Shutdown: Drain In-Flight Requests Before Exit](/es/patterns/graceful-shutdown-pattern/).

- Mantené los sidecars lightweight — consumen resources del pod's total allocation
- Shareá volumes para communication — usá emptyDir para shared files entre containers
- Usá standard sidecars cuando sea possible — Fluent Bit para logs, Envoy para mesh, Prometheus exporter para metrics
- Monitoreá sidecar health — si el sidecar muere, el pod puede necesitar restart
- Updateéa sidecars independentemente — el sidecar image puede ser updated sin tocar el main app
- No pongas business logic en sidecars — son para infrastructure concerns only
- Considerá init containers para setup — corré configuration o data fetch antes de que el main app arranque
- Usá service mesh sidecars para production — handlean mTLS, retries, circuit breaking, observability

## Common Mistakes

- **Bloated sidecar**: el sidecar usa más CPU/memory que el main app. Mantené los sidecars minimal.
- **No health checks en sidecar**: el sidecar silenciosamente falla y nadie nota. Agregá liveness/readiness probes.
- **Tight coupling entre main y sidecar**: el main app depende de sidecar-specific behavior. Mantenelos loosely coupled.
- **Business logic en sidecar**: poner domain logic en el sidecar. Debería solo handlear infrastructure concerns.
- **No resource limits**: el sidecar consume todos los pod resources. Seteá CPU y memory limits.

## FAQ

### ¿Qué es un sidecar container?

Un companion container deployed alongside el main application container en el mismo pod. Handlea cross-cutting concerns como logging, monitoring, TLS, o configuration. Ambos containers sharean el mismo network, storage, y lifecycle.

### ¿Cómo communicatea el sidecar con el main container?

A través de shared volumes (files), shared network namespace (localhost), o environment variables. El approach más common es shared volumes para log files y localhost para HTTP communication.

### ¿Qué es un service mesh sidecar?

Un proxy (usualmente Envoy) injected como sidecar que handlea todo el inbound y outbound traffic para el main container. Provee mTLS, load balancing, retries, circuit breaking, y observability sin modificar el application. Istio y Linkerd usan este approach.

### ¿Debería usar un sidecar o una library para cross-cutting concerns?

Usá una library cuando el concern es simple y language-native (structured logging, basic metrics). Usá un sidecar cuando el concern es complex (service mesh, TLS termination, log aggregation) o cuando necesitás soportar múltiples languages sin re-implementar el concern en cada uno.

### ¿Puedo tener múltiples sidecars en un pod?

Sí. Un pod puede tener un main container y múltiples sidecars: uno para logging, uno para metrics, uno para config reload. Mantené el total number reasonable — cada sidecar agrega resource overhead y operational complexity.
