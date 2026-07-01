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
relatedResources:
  - /guides/deployment-strategies-guide
  - /docs/post-deployment-checklist-template
  - /guides/cicd-pipeline-guide
  - /guides/docker-for-developers-guide
  - /guides/kubernetes-basics-guide
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

Un graceful shutdown asegura que tu aplicación termine peticiones en vuelo, vacíe buffers, cierre conexiones de base de datos y libere bloqueos antes de salir. Sin él, los despliegues y eventos de escalado causan peticiones caídas, corrupción de datos y fallos en cascada. Esta receta implementa manejo de SIGTERM, drenado de conexiones y patrones de despliegue sin downtime para servidores web, workers y contenedores.

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
2. **Drenado**: Establece una bandera de health-check a `shutting-down` (devolviendo HTTP 503) para que el balanceador deje de enviar nuevo tráfico. Termina peticiones en vuelo dentro de una ventana de timeout.
3. **Limpieza**: Cierra pools de base de datos, vacía logs/métricas, libera bloqueos y sale.

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
2. **No cambiar readiness del health-check** — el balanceador sigue enrutando a un pod moribundo
3. **Bloquear el shutdown hook** — los hooks de shutdown corren en paralelo; usa un latch o executor single-threaded para secuenciar limpieza
4. **No cerrar el pool de conexiones de base de datos** — conexiones fugadas causan que el siguiente inicio falle con "demasiadas conexiones"
5. **Ignorar el preStop hook** — Kubernetes puede enviar SIGTERM antes de que el pod sea removido de los endpoints del servicio; un `sleep 5` en preStop previene esta carrera

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre SIGTERM y SIGKILL?

`SIGTERM` pregunta educadamente. Tu aplicación puede interceptarla, drenar conexiones y salir limpiamente. `SIGKILL` no puede ser interceptado; el SO termina el proceso a la fuerza. Kubernetes envía SIGKILL después de que `terminationGracePeriodSeconds` expire.

### ¿Cuánto tiempo debería ser mi período de gracia?

Al menos tan largo como tu endpoint o timeout de job más lento. Para APIs HTTP, 10–30 segundos es típico. Para workers de batch, minutos pueden ser necesarios. Siempre agrega un pequeño buffer.

### ¿Puedo lograr zero-downtime sin Kubernetes?

Sí. Usa un reverse proxy (Nginx, HAProxy) o service mesh (Envoy) con health checks. Despliega nuevas instancias, caliéntalas, luego drena y remueve instancias viejas. Los despliegues blue/green y rolling son posibles con cualquier balanceador de carga.
