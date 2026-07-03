---
contentType: recipes
slug: server-sent-events
title: "Server-Sent Events (SSE)"
description: "How to implement one-way real-time streaming from server to browser using Server-Sent Events, with reconnection, event types, and multi-client broadcasting."
metaDescription: "Learn Server-Sent Events in Python, JavaScript, and Java. Covers SSE protocol, event streaming, reconnection handling, and broadcasting to multiple clients."
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
  metaDescription: "Learn Server-Sent Events in Python, JavaScript, and Java. Covers SSE protocol, event streaming, reconnection handling, and broadcasting to multiple clients."
  keywords:
    - sse
    - server-sent-events
    - streaming
    - real-time
    - api
    - python
    - javascript
    - java
---
## Overview

Server-Sent Events (SSE) is a browser API and HTTP-based protocol that enables servers to push real-time updates to clients over a single long-lived connection. Unlike [WebSockets](/recipes/api/websocket-server) (full-duplex), SSE is uni-directional: server → client only. It runs over standard HTTP, works through most firewalls and proxies, has built-in auto-reconnection with `Last-Event-ID`, and requires no special protocol upgrades. This recipe covers implementing SSE endpoints in Python, JavaScript (Node.js), and Java (Spring Boot), with event types, heartbeat keepalives, and broadcasting to multiple clients.

## When to Use

Use this resource when:
- You need real-time server-to-client updates (live scores, stock prices, notifications, logs)
- The data flow is primarily one-directional (server pushes, client only listens)
- You want automatic reconnection without writing custom WebSocket reconnection logic
- You need a simple solution that works through corporate firewalls and HTTP proxies

## Solution

### Python (Flask with Generator)

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

# Named events with event types
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

# Broadcasting to multiple clients with a shared queue
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

### JavaScript (Node.js with Express)

```javascript
const express = require("express");
const app = express();

// Basic SSE endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering

  let counter = 0;

  const interval = setInterval(() => {
    counter++;
    const data = JSON.stringify({ message: `Update ${counter}`, timestamp: Date.now() });
    res.write(`data: ${data}\n\n`);
  }, 2000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});

// Broadcasting to all connected clients
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

// Named events
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
    SseEmitter emitter = new SseEmitter(0L); // No timeout
    emitters.add(emitter);

    emitter.onCompletion(() -> emitters.remove(emitter));
    emitter.onTimeout(() -> emitters.remove(emitter));
    emitter.onError((e) -> emitters.remove(emitter));

    // Send updates every 2 seconds
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

  // Broadcast to all connected clients
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

### Browser Client

```javascript
// Basic connection
const eventSource = new EventSource("/events");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

eventSource.onerror = (error) => {
  console.error("SSE error:", error);
};

// Named events
const notifications = new EventSource("/notifications");

notifications.addEventListener("connected", (e) => {
  console.log("Connected:", e.data);
});

notifications.addEventListener("alert", (e) => {
  const data = JSON.parse(e.data);
  showAlert(data.msg); // Custom alert handler
});

notifications.addEventListener("info", (e) => {
  const data = JSON.parse(e.data);
  appendToLog(data.msg);
});

// Manual reconnection with custom ID
const source = new EventSource("/events");
source.addEventListener("update", (e) => {
  const lastId = e.lastEventId; // Browser auto-sends this on reconnect
  processUpdate(e.data, lastId);
});
```

## Explanation

- **Protocol** — SSE uses standard HTTP with `Content-Type: text/event-stream`. The server sends messages as `field: value\n\n` pairs. The browser's `EventSource` API handles connection lifecycle, auto-reconnection, and parsing automatically.
- **Message format** — each message consists of fields: `data` (payload), `event` (type name), `id` (for reconnection tracking), and `retry` (reconnection delay in ms). Multiple `data` lines are concatenated with newlines.
- **Auto-reconnection** — if the connection drops, the browser waits (default 3 seconds, customizable via `retry` field) and reconnects automatically, sending the last received `id` as `Last-Event-ID` header. The server can use this to resume from the correct point.
- **Broadcasting** — maintain a registry of active response streams (or `SseEmitter` objects in Spring). When new data arrives, iterate over all clients and write the formatted SSE message. Always handle disconnections to prevent memory leaks.

## Variants

| Approach | Transport | Direction | Best For |
|----------|-----------|-----------|----------|
| SSE | HTTP | Server → Client | Notifications, live feeds, progress bars |
| WebSocket | TCP upgrade | Bidirectional | Chat, gaming, collaborative editing |
| Long Polling | HTTP | Client → Server → Client | Legacy browser support, simple updates |
| Server-Sent Events with HTTP/2 | HTTP/2 | Server → Client | Multiplexed streams, lower overhead |

## What Works

1. **Always set `X-Accel-Buffering: no`** — [reverse proxies like Nginx](/recipes/api/nginx-reverse-proxy) buffer responses by default. This header disables buffering so SSE messages arrive immediately instead of being batched.
2. **Use heartbeat keepalives** — send periodic comment lines (`:heartbeat\n\n`) every 15-30 seconds to prevent proxies and load balancers from closing idle connections.
3. **Handle client disconnections** — register `onCompletion`, `onTimeout`, and `onError` callbacks (or `req.on("close")` in Node.js) to remove dead connections from your broadcast registry and prevent memory leaks.
4. **Set appropriate `Cache-Control`** — use `no-cache` to prevent browsers and proxies from caching the stream. SSE is inherently live and caching breaks real-time delivery.
5. **Use `event` types for routing** — instead of putting event type inside the JSON payload, use the native `event: typename` field. This lets the browser dispatch to specific `addEventListener` handlers without parsing JSON first.

## Common Mistakes

1. Forgetting `X-Accel-Buffering: no` or `Cache-Control: no-cache`, causing Nginx or browsers to buffer SSE messages and deliver them in batches instead of real-time.
2. Not handling client disconnections, leading to memory leaks as dead connections accumulate in the broadcast registry.
3. Sending SSE data without proper newlines (`\n\n` terminator). The browser waits indefinitely for the message to complete.
4. Using SSE for bidirectional communication. SSE is uni-directional; for chat or two-way data, use [WebSockets](/recipes/api/websocket-bidirectional-chat) instead.
5. Sending binary data directly. SSE only supports UTF-8 text. Base64-encode binary payloads or use WebSockets for binary streaming.

## Frequently Asked Questions

### How is SSE different from WebSockets?

SSE runs over standard HTTP (no protocol upgrade), is uni-directional (server → client only), has built-in auto-reconnection with `Last-Event-ID`, and works through most firewalls and proxies. WebSockets require a protocol upgrade, support bidirectional communication, but need custom reconnection logic. Use SSE for one-way streaming; use [WebSockets](/recipes/api/websocket-server) for bidirectional real-time apps like chat or multiplayer games.

### Can SSE work with HTTP/2?

Yes, and HTTP/2 considerably improves SSE by allowing multiple independent streams over a single TCP connection. In HTTP/1.1, browsers limit SSE connections to 6 per domain. HTTP/2 removes this limit, making SSE much more scalable for applications with multiple event streams.

### How do I resume after a network interruption?

The browser automatically tracks the last received `id` field and sends it as the `Last-Event-ID` HTTP header on reconnection. Your server should read this header and resume streaming from that point. If no `id` was sent, the browser reconnects from the beginning of the stream.
