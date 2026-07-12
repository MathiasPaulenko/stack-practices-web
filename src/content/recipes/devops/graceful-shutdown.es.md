---


contentType: recipes
slug: graceful-shutdown
title: "Implementar graceful shutdown y reinicios sin downtime"
description: "Cómo implementar graceful shutdown y reinicios sin downtime para servidores web, workers y contenedores"
metaDescription: "Implementa graceful shutdown y reinicios sin downtime para servidores web y contenedores. Maneja SIGTERM, drena conexiones y recarga de forma segura."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - containers
  - deployment
  - ci-cd
  - automation
relatedResources:
  - /guides/deployment-strategies-guide
  - /docs/post-deployment-checklist-template
  - /guides/cicd-pipeline-guide
  - /guides/docker-for-developers-guide
  - /guides/kubernetes-basics-guide
  - /recipes/blue-green-deployment
  - /recipes/traffic-mirroring
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa graceful shutdown y reinicios sin downtime para servidores web y contenedores. Maneja SIGTERM, drena conexiones y recarga de forma segura."
  keywords:
    - graceful-shutdown
    - sin-downtime
    - sigterm
    - contenedores
    - servidor-web
    - despliegue


---

## Visión General

Un graceful shutdown asegura que tu aplicación termine peticiones en vuelo, vacíe buffers, cierre conexiones de base de datos y libere bloqueos antes de salir. Sin él, los despliegues y eventos de escalado causan peticiones caídas, corrupción de datos y fallos en cascada. Lo siguiente implementa manejo de SIGTERM, drenado de conexiones y patrones de despliegue sin downtime para servidores web, workers y contenedores.

## Cuándo Usar

Usa este recurso cuando:
- Despliegas frecuentemente en Kubernetes, Docker o grupos de auto-escalado. Consulta [Docker Basics](/recipes/devops/docker-basics) para fundamentos de contenedores.
- Ejecutas workers de long-polling, WebSocket o trabajos en background. Consulta [WebSockets Real-Time](/recipes/frontend/websockets-realtime) para gestión de ciclo de vida de conexiones.
- Necesitas vaciar métricas, logs o escrituras de base de datos antes de terminar. Consulta [Structured Logging](/recipes/observability/structured-logging) para patrones de flush de logs.
- Quieres despliegues sin downtime con rolling updates o releases blue/green. Consulta [Blue-Green Deployment](/recipes/devops/blue-green-deployment) para conmutación de tráfico.

## Solución

### Python

```python
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from flask import Flask

app = Flask(__name__)
executor = ThreadPoolExecutor(max_workers=4)
shutting_down = False

@app.route("/health")
def health():
    if shutting_down:
        return {"status": "shutting-down"}, 503
    return {"status": "ok"}

@app.route("/")
def home():
    if shutting_down:
        return {"error": "server is shutting down"}, 503
    time.sleep(0.5)  # simular trabajo
    return {"message": "hello"}

def graceful_shutdown(signum, frame):
    global shutting_down
    print("Received SIGTERM, starting graceful shutdown...")
    shutting_down = True

    # Dejar de aceptar nuevo trabajo
    executor.shutdown(wait=True)

    # Permitir que peticiones en vuelo terminen en hasta 15 segundos
    time.sleep(15)
    print("Shutdown complete. Exiting.")
    sys.exit(0)

signal.signal(signal.SIGTERM, graceful_shutdown)
signal.signal(signal.SIGINT, graceful_shutdown)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, threaded=True)
```

### JavaScript

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(isShuttingDown ? 503 : 200);
    res.end(JSON.stringify({ status: isShuttingDown ? 'shutting-down' : 'ok' }));
    return;
  }

  // Simular trabajo async
  setTimeout(() => {
    res.writeHead(isShuttingDown ? 503 : 200);
    res.end(JSON.stringify({ message: 'hello' }));
  }, 500);
});

let isShuttingDown = false;
let connections = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

function shutdown() {
  console.log('Received SIGTERM, starting graceful shutdown...');
  isShuttingDown = true;

  server.close(() => {
    console.log('HTTP server closed. Draining connections...');
  });

  // Forzar cierre de conexiones restantes después del timeout
  setTimeout(() => {
    connections.forEach((conn) => conn.destroy());
    console.log('Shutdown complete.');
    process.exit(0);
  }, 15000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(8080);
```

### Java

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

// Spring Boot maneja graceful shutdown nativamente desde 2.3
// application.properties:
// server.shutdown=graceful
// spring.lifecycle.timeout-per-shutdown-phase=15s
// management.endpoint.health.probes.enabled=true
// management.health.livenessState.enabled=true
// management.health.readinessState.enabled=true

@SpringBootApplication
public class App {
    public static void main(String[] args) {
        ConfigurableApplicationContext ctx = SpringApplication.run(App.class, args);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutdown hook triggered. Closing context...");
            ctx.close();
            System.out.println("Context closed gracefully.");
        }));
    }
}

// Para Java sin Spring (Jetty/Netty plano):
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.Handler;

Server server = new Server(8080);
server.setHandler(handler);
server.start();

Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try {
        server.stop();
        server.join();
    } catch (Exception e) {
        e.printStackTrace();
    }
}));
```

## Explicación

El graceful shutdown es un proceso de tres fases:

1. **Recepción de señal**: El SO o runtime de contenedor envía `SIGTERM` (o `SIGINT` localmente). Tu aplicación debe interceptarla en lugar de salir inmediatamente.
1. **Drenado**: Establece una bandera de health-check a `shutting-down` (devolviendo HTTP 503) para que el balanceador deje de enviar nuevo tráfico. Termina peticiones en vuelo dentro de una ventana de timeout.
1. **Limpieza**: Cierra pools de base de datos, vacía logs/métricas, libera bloqueos y sale.

**Despliegues sin downtime** dependen del orquestador (Kubernetes, AWS ECS) ejecutando los pods viejo y nuevo concurrentemente. El pod viejo recibe `SIGTERM`, drena y sale solo después de que el nuevo pase readiness checks.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Kubernetes | `terminationGracePeriodSeconds` + preStop hook | Default 30s; ajusta según tiempo máximo de petición |
| Docker | `docker stop` envía SIGTERM, luego SIGKILL después de 10s | Usa `--stop-timeout` para extender |
| systemd | `TimeoutStopSec` en unidad de servicio | Alinea con timeout de drenado de la app |
| Node.js | `server.close()` + tracking de conexiones | Destruye sockets persistentes después del período de gracia |
| Spring Boot | `server.shutdown=graceful` + readiness probe | Built-in desde 2.3; nativo para Kubernetes |
| Gunicorn | Config `graceful-timeout` | Workers pre-fork salen después de terminar peticiones |

## Lo que funciona

1. Siempre implementa un endpoint `/health` que devuelva 503 durante shutdown para que los balanceadores redirijan tráfico
2. Establece `terminationGracePeriodSeconds` (K8s) o `stop-timeout` (Docker) para que coincida con tu timeout de drenado
3. Usa logging estructurado para emitir un evento `shutdown_initiated` para observabilidad y alertas
4. Maneja `SIGTERM`, `SIGINT` y señales específicas de plataforma (Windows `CTRL_CLOSE_EVENT`)
5. Prueba graceful shutdown en CI: envía SIGTERM durante una prueba de carga y verifica cero peticiones fallidas

## Errores Comunes

1. **Salir inmediatamente al recibir SIGTERM** — mata peticiones en vuelo; siempre drena primero
1. **No cambiar readiness del health-check** — el balanceador sigue enrutando a un pod moribundo
1. **Bloquear el shutdown hook** — los hooks de shutdown corren en paralelo; usa un latch o executor single-threaded para secuenciar limpieza
1. **No cerrar el pool de conexiones de base de datos** — conexiones fugadas causan que el siguiente inicio falle con "demasiadas conexiones"
1. **Ignorar el preStop hook** — Kubernetes puede enviar SIGTERM antes de que el pod sea removido de los endpoints del servicio; un `sleep 5` en preStop previene esta carrera

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre SIGTERM y SIGKILL?

`SIGTERM` pregunta educadamente. Tu aplicación puede interceptarla, drenar conexiones y salir limpiamente. `SIGKILL` no puede ser interceptado; el SO termina el proceso a la fuerza. Kubernetes envía SIGKILL después de que `terminationGracePeriodSeconds` expire.

### ¿Cuánto tiempo debería ser mi período de gracia?

Al menos tan largo como tu endpoint o timeout de job más lento. Para APIs HTTP, 10–30 segundos es típico. Para workers de batch, minutos pueden ser necesarios. Siempre agrega un pequeño buffer.

### ¿Puedo lograr zero-downtime sin Kubernetes?

Sí. Usa un reverse proxy (Nginx, HAProxy) o service mesh (Envoy) con health checks. Despliega nuevas instancias, caliéntalas, luego drena y remueve instancias viejas. Los despliegues blue/green y rolling son posibles con cualquier balanceador de carga.

### Go HTTP Server con Context Cancellation

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      http.HandlerFunc(handler),
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
    }

    go func() {
        log.Println("Server starting on :8080")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server failed: %v", err)
        }
    }()

    // Esperar señal de interrupción
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("Shutdown signal received, draining...")

    // Dar 30 segundos a requests pendientes
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Printf("Server forced to shutdown: %v", err)
    }

    // Cerrar conexiones de base de datos, flush buffers
    cleanupResources()

    log.Println("Server exited gracefully")
}

func cleanupResources() {
    log.Println("Cleaning up resources...")
}

func handler(w http.ResponseWriter, r *http.Request) {
    time.Sleep(100 * time.Millisecond)
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

### Detalle de Kubernetes PreStop Hook

```yaml
# deployment.yaml
spec:
  template:
    spec:
      containers:
        - name: app
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - |
                    # Marcar como not ready
                    curl -X POST http://localhost:8080/admin/shutdown
                    # Esperar a que el endpoint controller remueva el pod del Service
                    sleep 10
      terminationGracePeriodSeconds: 45  # Debe ser > preStop + drain time
```

### Configuración de Nginx Upstream Drain

```nginx
# nginx.conf
upstream backend {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;

    # Slow start para nuevas instancias
    server 10.0.1.12:8080 slow_start=30s;
}

# Health check para detectar instancias drenando
location /health {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_502 http_503;
    proxy_connect_timeout 2s;
    proxy_read_timeout 5s;
}
```

### Python (uvicorn) Graceful Shutdown

```python
import signal
import asyncio
from contextlib import asynccontextmanager

shutdown_event = asyncio.Event()

@asynccontextmanager
async def lifespan(app):
    # Startup
    print("Starting up...")
    yield
    # Shutdown
    print("Draining connections...")
    await asyncio.sleep(5)  # Dejar que requests en vuelo terminen
    print("Closing resources...")
    await close_db_pool()
    print("Shutdown complete")

def handle_sigterm(signum, frame):
    print(f"Received signal {signum}, initiating shutdown...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)
```

## Mejores Prácticas Adicionales

1. **Loguea eventos de shutdown con timestamps.** Ayuda a diagnosticar shutdowns lentos:

```python
import logging
import time

logger = logging.getLogger(__name__)

def on_shutdown():
    logger.info("shutdown_initiated", extra={
        "timestamp": time.time(),
        "in_flight_requests": get_active_request_count(),
    })
```

1. **Usa una readiness probe separada de liveness.** Durante shutdown, falla readiness pero mantiene liveness:

```yaml
# readiness falla primero, removiendo pod del Service
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  failureThreshold: 1
  periodSeconds: 2

# liveness se mantiene para que kubelet no reinicie durante drain
livenessProbe:
  httpGet:
    path: /alive
    port: 8080
  periodSeconds: 10
```

## Errores Comunes Adicionales

1. **No setear `terminationGracePeriodSeconds` lo suficientemente alto.** Si tu drain toma 20s y el default es 30s, solo tienes 10s de buffer:

```yaml
# Calcular: drain_time + preStop_sleep + buffer
terminationGracePeriodSeconds: 45  # 20s drain + 10s preStop + 15s buffer
```

1. **Olvidar cerrar consumers de message queue.** Los consumers siguen pullando mensajes durante shutdown:

```python
def graceful_shutdown(consumer):
    # Dejar de aceptar mensajes nuevos
    consumer.stop_consuming()
    # Procesar mensajes en vuelo restantes
    consumer.wait_for_messages(timeout=10)
    # Cerrar conexión
    consumer.close()
```

## FAQ

### ¿Cómo pruebo graceful shutdown en CI?

Usa una prueba de carga con inyección de SIGTERM:

```bash
#!/bin/bash
# ci/test-graceful-shutdown.sh
start_server &
SERVER_PID=$!
sleep 2  # Esperar startup

# Iniciar prueba de carga en background
vegeta attack -duration=30s -rate=100 | vegeta report &
LOAD_PID=$!

# Enviar SIGTERM después de 10s
sleep 10
kill -TERM $SERVER_PID

# Esperar a que termine la prueba de carga
wait $LOAD_PID

# Verificar resultados: success rate debe ser 100%
vegeta attack -duration=30s -rate=100 | vegeta report | grep -q "100.00%"
```

### ¿Debo drenar conexiones o solo dejar de aceptar nuevas?

Ambos. Primero dejar de aceptar conexiones nuevas (cerrar listener), luego esperar que requests en vuelo terminen. Setear un timeout hard para forzar-kill de requests largos:

```javascript
server.close(() => {
    console.log("All connections closed");
});

// Forzar cierre después de 30s
setTimeout(() => {
    console.error("Force closing remaining connections");
    process.exit(1);
}, 30000);
```

## Tips de Rendimiento

1. **Usa connection draining, no cierre abrupto.** Cierre abrupto causa errores y retries en el cliente:

```nginx
# Nginx: drenar por 30s antes de cerrar
worker_shutdown_timeout 30s;
```

1. **Paraleliza tareas de cleanup.** Cierra DB, cache y MQ simultáneamente:

```python
import concurrent.futures

def cleanup_all():
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(close_db_pool),
            executor.submit(close_redis),
            executor.submit(close_mq),
        ]
        concurrent.futures.wait(futures, timeout=10)
```

1. **Trackea requests en vuelo.** Usa un contador para saber cuándo el drain está completo:

```go
var inFlight int32

func handler(w http.ResponseWriter, r *http.Request) {
    atomic.AddInt32(&inFlight, 1)
    defer atomic.AddInt32(&inFlight, -1)
    // ... handle request
}

func shutdown() {
    for atomic.LoadInt32(&inFlight) > 0 {
        time.Sleep(100 * time.Millisecond)
    }
}
```

1. **Usa `SO_REUSEPORT` para restarts zero-downtime.** Procesos nuevos y viejos comparten el puerto durante el handoff:

```python
# Python con SO_REUSEPORT
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
sock.bind(("0.0.0.0", 8080))
```
