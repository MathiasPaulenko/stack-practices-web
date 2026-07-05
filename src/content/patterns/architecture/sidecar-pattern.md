---
contentType: patterns
slug: sidecar-pattern
title: "Sidecar Pattern: Extend Services with Companion Containers"
description: "How to extend services with companion containers for cross-cutting concerns. Covers sidecar containers, shared volumes, health probes, and service mesh sidecars."
metaDescription: "Extend services with companion containers for cross-cutting concerns. Learn sidecar containers, shared volumes, health probes, and service mesh sidecar deployment."
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
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Extend services with companion containers for cross-cutting concerns. Learn sidecar containers, shared volumes, health probes, and service mesh sidecar deployment."
  keywords:
    - architecture
    - sidecar
    - containers
    - kubernetes
    - pattern
---

## Overview

The sidecar pattern deploys a companion container alongside the main application container within the same pod. The sidecar handles cross-cutting concerns: logging, monitoring, configuration, TLS termination, or service mesh proxying. The main application stays focused on business logic and doesn't need to know about infrastructure concerns. Both containers share the same network namespace, storage volumes, and lifecycle. The sidecar can be updated, restarted, or replaced independently of the main container. This pattern is fundamental to service meshes like Istio and Linkerd, where a proxy sidecar handles all inbound and outbound traffic.

## When to Use

- Offloading cross-cutting concerns from the application (logging, metrics, TLS)
- Service mesh deployment (Istio Envoy proxy, Linkerd)
- Configuration management without modifying the application
- Log forwarding and aggregation
- Database connection pooling or caching proxies
- Adding HTTPS termination to legacy HTTP-only services

## When NOT to Use

- When the concern is simple enough to handle in the application code
- When the sidecar adds too much resource overhead relative to the main container
- When the application needs direct control over network traffic
- Serverless functions where you can't deploy companion containers

## Solution

### Kubernetes pod with sidecar

```yaml
# kubernetes-pod.yaml — Pod with main container and sidecar
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
# fluentbit-sidecar.yaml — Fluent Bit sidecar for log forwarding
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
# envoy-tls-sidecar.yaml — Envoy sidecar for TLS termination
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

### Python sidecar for metrics export

```python
# metrics_sidecar.py — sidecar that reads app metrics and exports to Prometheus
import os
import time
import requests
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

PROMETHEUS_URL = os.environ.get("PROMETHEUS_PUSHGATEWAY", "http://prometheus:9091")
APP_URL = os.environ.get("APP_URL", "http://localhost:8080")
SCRAPE_INTERVAL = int(os.environ.get("SCRAPE_INTERVAL", "15"))

class MetricsSidecar:
    """Sidecar that scrapes app metrics and pushes to Prometheus."""

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
        """Scrape metrics from the main application."""
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
        """Push metrics to Prometheus pushgateway."""
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
        """Run the sidecar loop."""
        print(f"Starting metrics sidecar for {self.app_url}")
        while True:
            self.scrape()
            time.sleep(SCRAPE_INTERVAL)

if __name__ == "__main__":
    sidecar = MetricsSidecar(APP_URL, PROMETHEUS_URL)
    sidecar.run()
```

### Docker Compose with sidecar

```yaml
# docker-compose.yaml — sidecar pattern with Docker Compose
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

### Java sidecar for configuration reload

```java
// ConfigReloaderSidecar.java — sidecar that watches config and signals reload
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
# istio-injection.yaml — Pod automatically gets Envoy sidecar
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled  # Istio auto-injects sidecar
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
      # Istio automatically injects the Envoy sidecar
      # No need to define it manually
```

### Init container as pre-sidecar

```yaml
# init-container.yaml — init container runs before main and sidecar
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

- Keep sidecars lightweight — they consume resources from the pod's total allocation
- Share volumes for communication — use emptyDir for shared files between containers
- Use standard sidecars when possible — Fluent Bit for logs, Envoy for mesh, Prometheus exporter for metrics
- Monitor sidecar health — if the sidecar dies, the pod may need restart
- Update sidecars independently — the sidecar image can be updated without touching the main app
- Don't put business logic in sidecars — they're for infrastructure concerns only
- Consider init containers for setup — run configuration or data fetch before the main app starts
- Use service mesh sidecars for production — they handle mTLS, retries, circuit breaking, observability

## Common Mistakes

- **Bloated sidecar**: the sidecar uses more CPU/memory than the main app. Keep sidecars minimal.
- **No health checks on sidecar**: the sidecar silently fails and nobody notices. Add liveness/readiness probes.
- **Tight coupling between main and sidecar**: the main app depends on sidecar-specific behavior. Keep them loosely coupled.
- **Business logic in sidecar**: putting domain logic in the sidecar. It should only handle infrastructure concerns.
- **No resource limits**: the sidecar consumes all pod resources. Set CPU and memory limits.

## FAQ

### What is a sidecar container?

A companion container deployed alongside the main application container in the same pod. It handles cross-cutting concerns like logging, monitoring, TLS, or configuration. Both containers share the same network, storage, and lifecycle.

### How does the sidecar communicate with the main container?

Through shared volumes (files), shared network namespace (localhost), or environment variables. The most common approach is shared volumes for log files and localhost for HTTP communication.

### What is a service mesh sidecar?

A proxy (usually Envoy) injected as a sidecar that handles all inbound and outbound traffic for the main container. It provides mTLS, load balancing, retries, circuit breaking, and observability without modifying the application. Istio and Linkerd use this approach.

### Should I use a sidecar or a library for cross-cutting concerns?

Use a library when the concern is simple and language-native (structured logging, basic metrics). Use a sidecar when the concern is complex (service mesh, TLS termination, log aggregation) or when you need to support multiple languages without re-implementing the concern in each.

### Can I have multiple sidecars in one pod?

Yes. A pod can have one main container and multiple sidecars: one for logging, one for metrics, one for config reload. Keep the total number reasonable — each sidecar adds resource overhead and operational complexity.
