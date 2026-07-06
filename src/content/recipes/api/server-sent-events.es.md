---
contentType: recipes
slug: server-sent-events
title: "Server-Sent Events (SSE)"
description: "Cómo implementar streaming en tiempo real unidireccional del servidor al navegador usando Server-Sent Events, con reconexión, tipos de eventos y broadcasting a múltiples clientes."
metaDescription: "Aprende Server-Sent Events en Python, JavaScript y Java. Cubre protocolo SSE, streaming de eventos, manejo de reconexión y broadcasting a múltiples clientes."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - sse
  - server-sent-events
  - rest
  - http
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/handle-errors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende Server-Sent Events en Python, JavaScript y Java. Cubre protocolo SSE, streaming de eventos, manejo de reconexión y broadcasting a múltiples clientes."
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
## Visión General

Server-Sent Events (SSE) es una API de navegador y protocolo basado en HTTP que permite a los servidores enviar actualizaciones en tiempo real a los clientes sobre una única conexión persistente. A diferencia de [WebSockets](/recipes/api/websocket-server) (full-duplex), SSE es unidireccional: solo servidor → cliente. Funciona sobre HTTP estándar, atraviesa la mayoría de firewalls y proxies, tiene reconexión automática integrada con `Last-Event-ID`, y no requiere upgrades de protocolo especiales. El siguiente enfoque cubre la implementación de endpoints SSE en Python, JavaScript (Node.js) y Java (Spring Boot), con tipos de eventos, keepalives de heartbeat y broadcasting a múltiples clientes.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas actualizaciones en tiempo real del servidor al cliente (scores en vivo, precios de acciones, notificaciones, logs)
- El flujo de datos es principalmente unidireccional (el servidor envía, el cliente solo escucha)
- Quieres reconexión automática sin escribir lógica de reconexión WebSocket personalizada
- Necesitas una solución simple que funcione a través de firewalls corporativos y proxies HTTP

## Solución

### Python (Flask con Generator)

```python
from flask import Flask, Response
import json
import time

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

# Eventos nombrados con tipos de evento
@app.route("/notifications")
def notifications():
    def generate():
        yield "event: connected\ndata: \"Stream started\"\n\n"

        for i in range(1, 10):
            event_type = "alert" if i % 3 == 0 else "info"
            data = {"level": event_type, "msg": f"Notification {i}"}
            yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
            time.sleep(2)

    return Response(generate(), mimetype="text/event-stream")

# Broadcasting a múltiples clientes con una cola compartida
from queue import Queue
import threading

clients = []

def broadcast(message):
    for client in clients:
        client.put(message)

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

### JavaScript (Node.js con Express)

```javascript
const express = require("express");
const app = express();

// Endpoint SSE básico
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Desactiva buffering de Nginx

  let counter = 0;

  const interval = setInterval(() => {
    counter++;
    const data = JSON.stringify({ message: `Update ${counter}`, timestamp: Date.now() });
    res.write(`data: ${data}\n\n`);
  }, 2000);

  // Limpieza al desconectar
  req.on("close", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});

// Broadcasting a todos los clientes conectados
const clients = new Set();

app.get("/broadcast", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

function broadcastToAll(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => client.write(message));
}

// Eventos nombrados
app.get("/notifications", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  res.write("event: connected\ndata: \"Stream started\"\n\n");

  const types = ["info", "info", "alert", "info"];
  let i = 0;

  const interval = setInterval(() => {
    if (i >= types.length) {
      clearInterval(interval);
      res.end();
      return;
    }

    const eventType = types[i];
    const data = JSON.stringify({ level: eventType, msg: `Notification ${i + 1}` });
    res.write(`event: ${eventType}\ndata: ${data}\n\n`);
    i++;
  }, 2000);

  req.on("close", () => clearInterval(interval));
});
```

### Java (Spring Boot)

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
  private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

  @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamEvents() {
    SseEmitter emitter = new SseEmitter(0L); // Sin timeout
    emitters.add(emitter);

    emitter.onCompletion(() -> emitters.remove(emitter));
    emitter.onTimeout(() -> emitters.remove(emitter));
    emitter.onError((e) -> emitters.remove(emitter));

    // Enviar updates cada 2 segundos
    scheduler.scheduleAtFixedRate(() -> {
      try {
        emitter.send(SseEmitter.event()
          .data("{\"message\": \"Update\", \"timestamp\": " + System.currentTimeMillis() + "}"));
      } catch (IOException e) {
        emitters.remove(emitter);
      }
    }, 0, 2, TimeUnit.SECONDS);

    return emitter;
  }

  @GetMapping(value = "/notifications", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamNotifications() {
    SseEmitter emitter = new SseEmitter(0L);

    try {
      emitter.send(SseEmitter.event()
        .name("connected")
        .data("Stream started"));

      String[] types = {"info", "info", "alert", "info"};

      scheduler.scheduleAtFixedRate(new Runnable() {
        int i = 0;
        @Override
        public void run() {
          if (i >= types.length) {
            emitter.complete();
            return;
          }
          try {
            emitter.send(SseEmitter.event()
              .name(types[i])
              .data("{\"level\": \"" + types[i] + "\", \"msg\": \"Notification " + (i + 1) + "\"}"));
            i++;
          } catch (IOException e) {
            emitter.completeWithError(e);
          }
        }
      }, 2, 2, TimeUnit.SECONDS);

    } catch (IOException e) {
      emitter.completeWithError(e);
    }

    return emitter;
  }

  // Broadcast a todos los clientes conectados
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

### Cliente del Navegador

```javascript
// Conexión básica
const eventSource = new EventSource("/events");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

eventSource.onerror = (error) => {
  console.error("SSE error:", error);
};

// Eventos nombrados
const notifications = new EventSource("/notifications");

notifications.addEventListener("connected", (e) => {
  console.log("Connected:", e.data);
});

notifications.addEventListener("alert", (e) => {
  const data = JSON.parse(e.data);
  showAlert(data.msg); // Handler de alerta personalizado
});

notifications.addEventListener("info", (e) => {
  const data = JSON.parse(e.data);
  appendToLog(data.msg);
});

// Reconexión manual con ID personalizado
const source = new EventSource("/events");
source.addEventListener("update", (e) => {
  const lastId = e.lastEventId; // El navegador envía esto automáticamente en reconexión
  processUpdate(e.data, lastId);
});
```

## Explicación

- **Protocolo** — SSE usa HTTP estándar con `Content-Type: text/event-stream`. El servidor envía mensajes como pares `field: value\n\n`. La API `EventSource` del navegador maneja el ciclo de vida de la conexión, reconexión automática y parsing.
- **Formato de mensaje** — cada mensaje consiste en campos: `data` (payload), `event` (nombre de tipo), `id` (para tracking de reconexión) y `retry` (delay de reconexión en ms). Múltiples líneas `data` se concatenan con saltos de línea.
- **Reconexión automática** — si la conexión cae, el navegador espera (default 3 segundos, customizable via campo `retry`) y se reconecta automáticamente, enviando el último `id` recibido como header `Last-Event-ID`. El servidor puede usar esto para reanudar desde el punto correcto.
- **Broadcasting** — mantén un registro de streams de respuesta activos (u objetos `SseEmitter` en Spring). Cuando llega nueva data, itera sobre todos los clientes y escribe el mensaje SSE formateado. Siempre maneja desconexiones para prevenir fugas de memoria.

## Variantes

| Enfoque | Transporte | Dirección | Mejor Para |
|---------|------------|-----------|------------|
| SSE | HTTP | Servidor → Cliente | Notificaciones, feeds en vivo, barras de progreso |
| WebSocket | Upgrade TCP | Bidireccional | Chat, gaming, edición colaborativa |
| Long Polling | HTTP | Cliente → Servidor → Cliente | Soporte legacy de navegadores, updates simples |
| SSE con HTTP/2 | HTTP/2 | Servidor → Cliente | Streams multiplexados, menor overhead |

## Lo que funciona

1. **Siempre establece `X-Accel-Buffering: no`** — [los proxies reversos como Nginx](/recipes/api/nginx-reverse-proxy) bufferan respuestas por defecto. Este header desactiva el buffering para que los mensajes SSE lleguen inmediatamente en lugar de por lotes.
2. **Usa heartbeats de keepalive** — envía líneas de comentario periódicas (`:heartbeat\n\n`) cada 15-30 segundos para prevenir que proxies y balanceadores de carga cierren conexiones inactivas.
3. **Maneja desconexiones de clientes** — registra callbacks `onCompletion`, `onTimeout` y `onError` (o `req.on("close")` en Node.js) para remover conexiones muertas del registro de broadcast y prevenir fugas de memoria.
4. **Establece `Cache-Control` apropiado** — usa `no-cache` para prevenir que navegadores y proxies cacheen el stream. SSE es inherentemente en vivo y el cacheo rompe la entrega en tiempo real.
5. **Usa tipos de `event` para routing** — en lugar de poner el tipo de evento dentro del payload JSON, usa el campo nativo `event: typename`. Esto permite al navegador despachar a handlers `addEventListener` específicos sin parsear JSON primero.

## Errores Comunes

1. Olvidar `X-Accel-Buffering: no` o `Cache-Control: no-cache`, causando que Nginx o navegadores bufferen mensajes SSE y los entreguen en lotes en lugar de tiempo real.
2. No manejar desconexiones de clientes, lo que produce fugas de memoria a medida que las conexiones muertas se acumulan en el registro de broadcast.
3. Enviar datos SSE sin newlines apropiadas (terminador `\n\n`). El navegador espera indefinidamente a que el mensaje se complete.
4. Usar SSE para comunicación bidireccional. SSE es unidireccional; para chat o data de dos vías, usa [WebSockets](/recipes/api/websocket-bidirectional-chat).
5. Enviar datos binarios directamente. SSE solo soporta texto UTF-8. Codifica payloads binarios en Base64 o usa WebSockets para streaming binario.

## Preguntas Frecuentes

### ¿En qué se diferencia SSE de WebSockets?

SSE funciona sobre HTTP estándar (sin upgrade de protocolo), es unidireccional (solo servidor → cliente), tiene reconexión automática integrada con `Last-Event-ID`, y funciona a través de la mayoría de firewalls y proxies. WebSockets requieren un upgrade de protocolo, soportan comunicación bidireccional, pero necesitan lógica de reconexión personalizada. Usa SSE para streaming unidireccional; usa [WebSockets](/recipes/api/websocket-server) para apps en tiempo real bidireccionales como chat o juegos multijugador.

### ¿Puede SSE funcionar con HTTP/2?

Sí, y HTTP/2 mejora considerablemente SSE al permitir múltiples streams independientes sobre una única conexión TCP. En HTTP/1.1, los navegadores limitan conexiones SSE a 6 por dominio. HTTP/2 elimina este límite, haciendo SSE mucho más escalable para aplicaciones con múltiples streams de eventos.

### ¿Cómo reanudo después de una interrupción de red?

El navegador rastrea automáticamente el último campo `id` recibido y lo envía como header HTTP `Last-Event-ID` en la reconexión. Tu servidor debe leer este header y reanudar el streaming desde ese punto. Si no se envió `id`, el navegador se reconecta desde el inicio del stream.
