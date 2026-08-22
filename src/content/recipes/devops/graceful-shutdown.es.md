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
lastUpdated: "2026-08-22"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

Un graceful shutdown permite que tu aplicación termine las peticiones en vuelo, vacíe buffers, cierre
conexiones de base de datos y libere cualquier bloqueo antes de salir. Sin eso, los despliegues y
eventos de escalado pueden perder peticiones, corromper datos o desencadenar fallos en cascada. Este
artículo recorre el manejo de SIGTERM, el drenado de conexiones y los patrones de despliegue sin
downtime para servidores web, workers y contenedores.

## Cuándo Usarlo

Recurrí a esta receta si desplegás frecuentemente en Kubernetes, Docker o grupos de auto-escalado.
Los workers de long-polling, WebSocket o trabajos en background también se benefician, como cualquier
proceso que necesite vaciar métricas, logs o escrituras de base de datos antes de terminar. Los
despliegues sin downtime con rolling updates o releases blue/green son otra ocasión común.

## Cuándo NO Usarlo

Evitá agregar una capa completa de graceful shutdown a scripts de corta duración o comandos puntuales
que no mantienen estado. Cuando un proceso sale rápido y no tiene conexiones abiertas para drenar, la
complejidad extra generalmente no vale la pena.

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

Un shutdown limpio realmente se reduce a tres pasos.

Primero, el SO o runtime de contenedor envía `SIGTERM` (o `SIGINT` localmente). Tu aplicación necesita
interceptar esa señal en lugar de salir inmediatamente.

Segundo, empezá a drenar. Marcá el endpoint de health como `shutting-down` para que el balanceador
de
carga deje de enviar nuevo tráfico, y luego terminá las peticiones en vuelo dentro de la ventana de
timeout.

Tercero, limpiá. Empezá por cerrar los pools de base de datos y vaciar logs y métricas, liberá los
bloqueos que sigas teniendo y finalmente salí de forma limpia.

Los despliegues sin downtime dependen de que el orquestador corra el pod viejo y el nuevo al mismo
tiempo. El pod viejo recibe `SIGTERM`, drena y sale solo después de que el nuevo pase sus readiness
checks.

## Variantes

### Kubernetes preStop hook

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

### Go HTTP server con context cancellation

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

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("Shutdown signal received, draining...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Printf("Server forced to shutdown: %v", err)
    }

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

### Nginx upstream drain

```nginx
# nginx.conf
upstream backend {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;

    # Slow start para nuevas instancias
    server 10.0.1.12:8080 slow_start=30s;
}

location /health {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_502 http_503;
    proxy_connect_timeout 2s;
    proxy_read_timeout 5s;
}
```

### Python (uvicorn) lifespan

```python
import signal
import asyncio
from contextlib import asynccontextmanager

shutdown_event = asyncio.Event()

@asynccontextmanager
async def lifespan(app):
    print("Starting up...")
    yield
    print("Draining connections...")
    await asyncio.sleep(5)
    print("Closing resources...")
    await close_db_pool()
    print("Shutdown complete")

def handle_sigterm(signum, frame):
    print(f"Received signal {signum}, initiating shutdown...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)
```

### Resumen por tecnología

Cada plataforma resuelve el mismo problema de forma ligeramente distinta. Kubernetes usa
`terminationGracePeriodSeconds` más un preStop hook (el default es 30s, así que ajustalo a tu petición
más lenta). Docker envía `SIGTERM` primero, luego `SIGKILL` después del stop timeout; usá
`--stop-timeout` para extender esa ventana. En systemd, `TimeoutStopSec` debería alinearse con el
timeout de drenado de la app. Para Node.js, el truco es `server.close()` más tracking de conexiones
para destruir sockets persistentes. Spring Boot tiene graceful shutdown incorporado desde 2.3 y
funciona bien con readiness probes de Kubernetes. Gunicorn expone una config `graceful-timeout` que
permite a los workers pre-fork terminar las peticiones antes de salir.

## Buenas Prácticas

- Siempre exponé un endpoint `/health` que devuelva 503 durante el shutdown para que el balanceador
  redirija el tráfico.
- Hacé coincidir `terminationGracePeriodSeconds` (Kubernetes) o `stop-timeout` (Docker) con tu
  timeout de drenado.
- Emití un log estructurado `shutdown_initiated` para observabilidad y alertas.
- Manejá `SIGTERM`, `SIGINT` y señales específicas de plataforma como Windows `CTRL_CLOSE_EVENT`.
- Testeá graceful shutdown en CI: enviá `SIGTERM` durante una prueba de carga y confirmá cero
  peticiones fallidas.
- Paralelizá las tareas de cleanup. Cerrá conexiones de base de datos, caché y cola de mensajes al
  mismo tiempo en lugar de una por una.

## Errores Comunes

- **Salir inmediatamente al recibir SIGTERM**. Eso mata peticiones en vuelo; siempre drená primero.
- **No cambiar el readiness check**. El balanceador sigue enviando tráfico a un pod que ya se está
  apagando.
- **Bloquear el shutdown hook**. Los hooks corren en paralelo; usá un latch o executor
  single-threaded para secuenciar la limpieza.
- **Olvidar cerrar el pool de conexiones**. Conexiones fugadas pueden hacer que el siguiente inicio
  falle con "demasiadas conexiones".
- **Ignorar el preStop hook**. Kubernetes puede enviar `SIGTERM` antes de que el pod sea removido de
  los endpoints del servicio, así que un `sleep` corto en preStop previene esa carrera.
- **Cerrar sockets de forma abrupta en lugar de drenar**. El cierre abrupto causa errores del lado
    del
  cliente y reintentos innecesarios.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre SIGTERM y SIGKILL?

`SIGTERM` pregunta educadamente. Tu aplicación puede interceptarlo, drenar conexiones y salir
limpiamente. `SIGKILL` no puede ser interceptado; el SO termina el proceso a la fuerza. Kubernetes
envía `SIGKILL` después de que `terminationGracePeriodSeconds` expire.

### ¿Cuánto tiempo debería ser mi período de gracia?

Hacelo al menos tan largo como el timeout de tu endpoint o job más lento. Para APIs HTTP, 10–30
segundos es típico; los workers de batch pueden necesitar minutos. Agregá un pequeño buffer encima.

### ¿Puedo lograr zero-downtime sin Kubernetes?

Sí. Usá un reverse proxy (Nginx, HAProxy) o service mesh (Envoy) con health checks. Desplegá nuevas
instancias, caliéntalas, luego drená y remové las viejas. Los despliegues blue/green y rolling son
posibles con cualquier balanceador.

### ¿Debo drenar conexiones o solo dejar de aceptar nuevas?

Ambos. Primero dejá de aceptar conexiones nuevas (cerrar el listener), luego esperá que las
peticiones
en vuelo terminen. Seteá un timeout hard para forzar la terminación de requests largos:

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

### ¿Cómo pruebo graceful shutdown en CI?

Usá una prueba de carga con inyección de SIGTERM:

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

### ¿Cómo trackeo requests en vuelo?

Usá un contador para saber cuándo el drain está completo:

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

### ¿Puedo usar SO_REUSEPORT para restarts zero-downtime?

Sí. `SO_REUSEPORT` permite que los procesos nuevos y viejos compartan el puerto durante el handoff:

```python
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
sock.bind(("0.0.0.0", 8080))
```
