---
contentType: recipes
slug: server-sent-events
title: "Server-Sent Events (SSE): One-Way Real-Time Streaming"
description: "Implement one-way real-time streaming from server to browser using Server-Sent Events. Covers Python, Node.js, Java, event types, reconnection, and broadcasting."
metaDescription: "Implement Server-Sent Events in Python, JavaScript, and Java. Covers SSE protocol, event streaming, reconnection, and broadcasting to multiple clients."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - sse
  - server-sent-events
  - real-time
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
  metaDescription: "Implement Server-Sent Events in Python, JavaScript, and Java. Covers SSE protocol, event streaming, reconnection, and broadcasting to multiple clients."
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

Server-Sent Events (SSE) is a browser API and HTTP-based protocol that lets a server push
real-time updates to clients over a single long-lived connection. Unlike WebSockets, SSE
is uni-directional: server → client only. It runs over standard HTTP, works through most
firewalls and proxies, has built-in auto-reconnection with `Last-Event-ID`, and needs no
special protocol upgrade.

## When to Use

- You need real-time server-to-client updates, such as live scores, stock prices,
  notifications, or logs.
- The data flow is mostly one-directional: the server pushes and the client only listens.
- You want automatic reconnection without writing custom WebSocket reconnection logic.
- You need a simple solution that works through corporate firewalls and HTTP proxies.

## When NOT to Use

- For bidirectional chat, gaming, or collaborative editing: use WebSockets.
- For binary data: SSE only supports UTF-8 text; base64-encode or use WebSockets.
- When the client needs to send frequent messages to the server.

## Solution

### Python with Flask

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

# Broadcasting to multiple clients
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

### Node.js with Express

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

### Java with Spring Boot

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

### Browser client

```javascript
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

notifications.addEventListener("alert", (e) => {
  const data = JSON.parse(e.data);
  showAlert(data.msg);
});
```

### Named events and heartbeats

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

## Explanation

SSE uses standard HTTP with `Content-Type: text/event-stream`. Each message is a set of
`field: value` lines ending with a blank line. The browser's `EventSource` API handles
connection lifecycle, auto-reconnection, and parsing.

Key fields:

- `data` — the payload.
- `event` — the event type name.
- `id` — used by the browser as `Last-Event-ID` on reconnect.
- `retry` — reconnection delay in milliseconds.
- `: comment` — a heartbeat or comment line that keeps the connection alive.

If the connection drops, the browser waits the `retry` interval and reconnects,
sending the last received `id`. The server can use that header to resume from the right
point.

## Variants

|Approach|Transport|Direction|Best for|
|--------|---------|---------|--------|
|SSE|HTTP|Server → client|Notifications, live feeds, progress bars|
|WebSocket|TCP upgrade|Bidirectional|Chat, gaming, collaborative editing|
|Long polling|HTTP|Client request → server push|Legacy browsers, simple updates|
|HTTP/2 SSE|HTTP/2|Server → client|Shared streams, lower overhead|

## Best Practices

- Set `X-Accel-Buffering: no` to prevent Nginx and other proxies from buffering messages.
- Use `Cache-Control: no-cache` so browsers and proxies don’t cache the live stream.
- Send heartbeat comments (`: ping\n\n`) every 15-30 seconds to keep idle connections
  open.
- Handle disconnects immediately (`req.on("close")` or `onCompletion`) to avoid memory
  leaks in the broadcast registry.
- Use `event` types for routing instead of putting the type inside the JSON payload.

## Common Mistakes

- Forgetting `X-Accel-Buffering: no` or `Cache-Control: no-cache`, which causes delayed
  batched delivery.
- Not cleaning up disconnected clients, leading to memory leaks.
- Sending SSE data without the final `\n\n` terminator; the browser waits forever.
- Using SSE for bidirectional communication; use WebSockets for two-way flows.
- Sending binary data directly; SSE only supports UTF-8 text.

## FAQ

### How is SSE different from WebSockets?

SSE runs over standard HTTP, is uni-directional, has built-in auto-reconnection with
`Last-Event-ID`, and works through most firewalls and proxies. WebSockets require a
protocol upgrade, support bidirectional communication, and need custom reconnection.

### Can SSE work with HTTP/2?

Yes. HTTP/2 improves SSE by supporting several independent streams over one TCP
connection. Browsers limit SSE connections to 6 per domain on HTTP/1.1; HTTP/2 removes
that limit.

### How do I resume after a network interruption?

The browser tracks the last received `id` and sends it as the `Last-Event-ID` header when
reconnecting. The server reads that header and resumes from that point. If no `id` was
sent, the stream starts from the beginning.

### How do I scale SSE to many clients?

Use a message broker or pub/sub system to fan out events. Each server instance keeps a
registry of local `EventSource` or `SseEmitter` connections. The broker pushes new events
to all instances, which then broadcast to their local clients.
