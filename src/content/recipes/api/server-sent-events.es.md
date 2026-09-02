---
contentType: recipes
slug: server-sent-events
title: "Server-Sent Events (SSE): Streaming en Tiempo Real"
description: "Implementá streaming unidireccional en tiempo real del servidor al navegador con Server-Sent Events. Cubre Python, Node.js, Java, tipos de eventos, reconexión y broadcasting."
metaDescription: "Implementá Server-Sent Events en Python, JavaScript y Java. Incluye protocolo SSE, streaming de eventos, reconexión automática y broadcasting a múltiples clientes."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - sse
  - server-sent-events
  - tiempo-real
  - streaming
  - rest
  - http
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/grpc-api
  - /recipes/handle-errors
  - /recipes/real-time-notifications
  - /recipes/websocket-server
lastUpdated: "2026-08-19"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Implementá Server-Sent Events en Python, JavaScript y Java. Incluye protocolo SSE, streaming de eventos, reconexión automática y broadcasting a múltiples clientes."
  keywords:
    - sse
    - server-sent-events
    - streaming
    - tiempo-real
    - api
    - python
    - javascript
    - java
---

## Resumen

Server-Sent Events (SSE) es una API del navegador y un protocolo basado en HTTP que
permite al servidor enviar actualizaciones en tiempo real a los clientes sobre una única
conexión persistente. A diferencia de WebSockets, SSE es unidireccional: servidor →
cliente. Funciona sobre HTTP estándar, atraviesa la mayoría de firewalls y proxies, tiene
reconexión automática con `Last-Event-ID` y no requiere upgrade de protocolo.

## Cuándo Usar

- Necesitás actualizaciones en tiempo real del servidor al cliente: resultados en vivo,
  precios, notificaciones o logs.
- El flujo de datos es principalmente unidireccional: el servidor empuja y el cliente solo
  escucha.
- Querés reconexión automática sin escribir lógica de reconexión WebSocket.
- Necesitás una solución simple que funcione a través de firewalls y proxies corporativos.

## Cuándo NO Usar

- Para chat, gaming o edición colaborativa: usá WebSockets.
- Para datos binarios: SSE solo soporta texto UTF-8; usá base64 o WebSockets.
- Cuando el cliente necesita enviar mensajes frecuentes al servidor.

## Solución

### Python con Flask

```python
from flask import Flask, Response
import json
import time
from queue import Queue

app = Flask(__name__)

@app.route("/events")
def events():
    def generate():
        counter = 0
        while True:
            counter += 1
            data = {"message": f"Update {counter}", "timestamp": time.time()}
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(2)

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache",
                             "X-Accel-Buffering": "no"})

# Broadcasting a múltiples clientes
clients = []

@app.route("/broadcast")
def broadcast_stream():
    q = Queue()
    clients.append(q)

    def generate():
        try:
            while True:
                msg = q.get()
                yield f"data: {json.dumps(msg)}\n\n"
        finally:
            clients.remove(q)

    return Response(generate(), mimetype="text/event-stream")
```

### Node.js con Express

```javascript
const express = require("express");
const app = express();

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let counter = 0;

  const interval = setInterval(() => {
    counter++;
    const data = JSON.stringify({
      message: `Update ${counter}`,
      timestamp: Date.now()
    });
    res.write(`data: ${data}\n\n`);
  }, 2000);

  req.on("close", () => clearInterval(interval));
});

// Broadcasting
const clients = new Set();

app.get("/broadcast", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.add(res);
  req.on("close", () => clients.delete(res));
});

function broadcastToAll(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => client.write(message));
}
```

### Java con Spring Boot

```java
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@RestController
public class SseController {

  private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();
  private final ScheduledExecutorService scheduler =
    Executors.newSingleThreadScheduledExecutor();

  @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamEvents() {
    SseEmitter emitter = new SseEmitter(0L);
    emitters.add(emitter);

    emitter.onCompletion(() -> emitters.remove(emitter));
    emitter.onTimeout(() -> emitters.remove(emitter));
    emitter.onError((e) -> emitters.remove(emitter));

    scheduler.scheduleAtFixedRate(() -> {
      try {
        emitter.send(SseEmitter.event()
          .data("{\"message\": \"Update\"}"));
      } catch (IOException e) {
        emitters.remove(emitter);
      }
    }, 0, 2, TimeUnit.SECONDS);

    return emitter;
  }

  public void broadcast(String message) {
    for (SseEmitter emitter : emitters) {
      try {
        emitter.send(SseEmitter.event().data(message));
      } catch (IOException e) {
        emitters.remove(emitter);
      }
    }
  }
}
```

### Cliente del navegador

```javascript
const eventSource = new EventSource("/events");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

eventSource.onerror = (error) => {
  console.error("SSE error:", error);
};

// Eventos con nombre
const notifications = new EventSource("/notifications");

notifications.addEventListener("alert", (e) => {
  const data = JSON.parse(e.data);
  showAlert(data.msg);
});
```

### Eventos con nombre y heartbeats

```python
def generate():
    yield "event: connected\ndata: \"Stream started\"\n\n"

    for i in range(1, 10):
        event_type = "alert" if i % 3 == 0 else "info"
        data = {"level": event_type, "msg": f"Notification {i}"}
        yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

        # Heartbeat comment
        yield ": heartbeat\n\n"
```

## Explicación

SSE usa HTTP estándar con `Content-Type: text/event-stream`. Cada mensaje es un conjunto
de líneas `field: value` terminadas con una línea en blanco. La API `EventSource` del
navegador maneja el ciclo de vida, la reconexión automática y el parsing.

Campos clave:

- `data` — el payload.
- `event` — nombre del tipo de evento.
- `id` — el navegador lo usa como `Last-Event-ID` al reconectar.
- `retry` — demora de reconexión en milisegundos.
- `: comment` — un heartbeat o comentario para mantener la conexión activa.

Si la conexión se cae, el navegador espera el intervalo `retry` y se reconecta enviando el
último `id` recibido. El servidor puede usar ese header para reanudar desde el punto
correcto.

## Variantes

|Enfoque|Transporte|Dirección|Ideal para|
|-------|----------|---------|----------|
|SSE|HTTP|Servidor → cliente|Notificaciones, feeds en vivo, progress bars|
|WebSocket|TCP upgrade|Bidireccional|Chat, gaming, edición colaborativa|
|Long polling|HTTP|Petición → push|Navegadores legacy, actualizaciones simples|
|HTTP/2 SSE|HTTP/2|Servidor → cliente|Streams compartidos, menor overhead|

## Buenas Prácticas

- Seteá `X-Accel-Buffering: no` para evitar que Nginx u otros proxies buffericen
  mensajes.
- Usá `Cache-Control: no-cache` para que navegadores y proxies no cacheen el stream.
- Enviá comentarios de heartbeat (`: ping\n\n`) cada 15-30 segundos para mantener
  conexiones inactivas.
- Manejá las desconexiones inmediatamente (`req.on("close")` u `onCompletion`) para
  evitar fugas de memoria en el registro de broadcast.
- Usá tipos de `event` para rutear en vez de meter el tipo dentro del payload JSON.

## Errores Comunes

- Olvidar `X-Accel-Buffering: no` o `Cache-Control: no-cache`, lo que genera entrega
  retardada en lotes.
- No limpiar clientes desconectados, causando fugas de memoria.
- Enviar datos SSE sin el terminador `\n\n` final; el navegador espera indefinidamente.
- Usar SSE para comunicación bidireccional; usá WebSockets para flujos de dos vías.
- Enviar datos binarios directamente; SSE solo soporta texto UTF-8.

## Preguntas Frecuentes

### ¿En qué se diferencia SSE de WebSockets?

SSE corre sobre HTTP estándar, es unidireccional, tiene reconexión automática con
`Last-Event-ID` y atraviesa la mayoría de firewalls y proxies. WebSockets requieren
upgrade de protocolo, soportan comunicación bidireccional y necesitan reconexión
personalizada.

### ¿Puede SSE funcionar con HTTP/2?

Sí. HTTP/2 mejora SSE permitiendo múltiples streams sobre una sola conexión TCP. En
HTTP/1.1 los navegadores limitan SSE a 6 conexiones por dominio; HTTP/2 elimina ese
límite.

### ¿Cómo reanudo después de una interrupción de red?

El navegador trackea el último `id` recibido y lo envía como header `Last-Event-ID` al
reconectar. El servidor lee ese header y reanuda desde ese punto. Si no se envió un `id`,
el stream comienza desde el principio.

### ¿Cómo escalo SSE a muchos clientes?

Usá un broker de mensajes o pub/sub para fan-out de eventos. Cada instancia del servidor
mantiene un registro de conexiones `EventSource` o `SseEmitter` locales. El broker empuja
nuevos eventos a todas las instancias, que luego hacen broadcast a sus clientes locales.
