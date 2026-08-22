---
contentType: recipes
slug: server-sent-events-go
title: "Implement Server-Sent Events in Go for Real-Time Updates"
description: "Build a production-ready Server-Sent Events endpoint in Go with connection management, heartbeat pings, and graceful client disconnect handling."
metaDescription: "Server-Sent Events in Go. Build real-time update streams with connection management, heartbeat pings, and graceful handling of client disconnects."
difficulty: intermediate
topics:
  - api
  - performance
tags:
  - server-sent-events
  - sse
  - golang
  - real-time
  - api
  - http
relatedResources:
  - /recipes/server-sent-events
  - /recipes/server-sent-events-node
  - /recipes/real-time-websockets
  - /recipes/websocket-authentication
  - /recipes/go-rest-api-gin
  - /recipes/real-time-notifications
lastUpdated: "2026-08-22"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Server-Sent Events in Go. Build real-time update streams with connection management, heartbeat pings, and graceful handling of client disconnects."
  keywords:
    - server sent events
    - sse
    - golang
    - real time api
    - event stream
    - http streaming
---

Server-Sent Events give you a lightweight, one-way channel for pushing real-time updates from server
to client over plain HTTP. Unlike WebSockets, SSE doesn't need a protocol upgrade. It reuses
standard
HTTP connections, and the browser's built-in `EventSource` API handles reconnection automatically.

## When to Use

Reach for SSE when the server needs to push notifications, logs, or live metrics to browsers and the
clients only receive. It's a good fit if you want to reuse existing HTTP infrastructure such as load
balancers and CDNs, or if you need a simpler alternative to WebSockets for one-way streaming.

## When NOT to Use

Don't use SSE when clients need to send messages back to the server in real time; WebSockets are
better for that. Avoid it for binary or very high-frequency data, where WebSockets or WebTransport
fit better. And if you can't control proxy or load-balancer timeouts that may close idle
connections, SSE can be frustrating to keep alive.

## Solution

### Basic SSE handler

```go
// handlers/sse.go
package handlers

import (
    "fmt"
    "net/http"
    "time"
)

type Event struct {
    ID    string
    Type  string
    Data  string
    Retry int
}

func (e Event) String() string {
    var result string
    if e.ID != "" {
        result += fmt.Sprintf("id: %s\n", e.ID)
    }
    if e.Type != "" {
        result += fmt.Sprintf("event: %s\n", e.Type)
    }
    if e.Retry > 0 {
        result += fmt.Sprintf("retry: %d\n", e.Retry)
    }
    result += fmt.Sprintf("data: %s\n\n", e.Data)
    return result
}

func SSEHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
        return
    }

    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    clientGone := r.Context().Done()

    for {
        select {
        case <-clientGone:
            return
        case <-ticker.C:
            now := time.Now().Unix()
            event := Event{
                ID:   fmt.Sprintf("%d", now),
                Type: "ping",
                Data: fmt.Sprintf(`{"timestamp": %d}`, now),
            }
            fmt.Fprint(w, event.String())
            flusher.Flush()
        }
    }
}
```

### Hub-based connection management

```go
// sse/hub.go
package sse

import "sync"

type Hub struct {
    clients map[chan Event]bool
    mu      sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{clients: make(map[chan Event]bool)}
}

func (h *Hub) Subscribe() chan Event {
    ch := make(chan Event, 10)
    h.mu.Lock()
    h.clients[ch] = true
    h.mu.Unlock()
    return ch
}

func (h *Hub) Unsubscribe(ch chan Event) {
    h.mu.Lock()
    delete(h.clients, ch)
    h.mu.Unlock()
    close(ch)
}

func (h *Hub) Broadcast(event Event) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    for ch := range h.clients {
        select {
        case ch <- event:
        default:
            // Channel full, drop event for this client
        }
    }
}
```

### Production handler with heartbeat

```go
// handlers/events.go
func EventStream(hub *sse.Hub) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Connection", "keep-alive")

        flusher, ok := w.(http.Flusher)
        if !ok {
            http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
            return
        }

        client := hub.Subscribe()
        defer hub.Unsubscribe(client)

        heartbeat := time.NewTicker(30 * time.Second)
        defer heartbeat.Stop()

        clientGone := r.Context().Done()

        // Send initial connection event
        fmt.Fprintf(w, "event: connected\ndata: %s\n\n", `{"status": "ok"}`)
        flusher.Flush()

        for {
            select {
            case <-clientGone:
                return
            case event := <-client:
                fmt.Fprint(w, event.String())
                flusher.Flush()
            case <-heartbeat.C:
                fmt.Fprint(w, ": heartbeat\n\n")
                flusher.Flush()
            }
        }
    }
}
```

### Client-side EventSource

```javascript
// client.js
const evtSource = new EventSource('/api/events');

evtSource.addEventListener('connected', (e) => {
  console.log('Connected:', JSON.parse(e.data));
});

evtSource.addEventListener('price-update', (e) => {
  const update = JSON.parse(e.data);
  document.getElementById('price').textContent = update.price;
});

evtSource.onerror = (err) => {
  console.error('SSE error:', err);
  // Browser auto-reconnects with exponential backoff
};

window.addEventListener('beforeunload', () => {
  evtSource.close();
});
```

## Explanation

An SSE endpoint responds with `Content-Type: text/event-stream` and writes events as plain text.
Each
event is made up of fields like `data`, `event`, `id`, and `retry`. The browser keeps track
of
the last event ID and sends it back in the `Last-Event-ID` header when it reconnects, so the server
can resume the stream. Lines that start with `:` are heartbeat comments; they keep the connection
open through proxies without triggering an actual event. When the client disconnects,
`r.Context().Done()`
fires, the handler returns, and the `defer` unsubscribes the client from the hub.

## Variants

### Broadcast with Redis for multiple Go instances

For horizontal scaling, publish events to Redis Pub/Sub and have each Go process subscribe, then fan
them out to its local SSE clients. See [Real-Time Notifications](/recipes/real-time-notifications/)
for Redis pub/sub patterns.

### Authenticate SSE connections

The catch is that browsers can't set custom headers through `EventSource`. Instead, pass a
short-lived token as a query parameter and validate it before subscribing:

```go
token := r.URL.Query().Get("token")
if !validateToken(token) {
    http.Error(w, "Unauthorized", http.StatusUnauthorized)
    return
}
```

For cross-origin SSE, set CORS headers explicitly on the endpoint.

### Test with `httptest`

```go
func TestSSEHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/events", nil)
    rec := httptest.NewRecorder()

    SSEHandler(rec, req)

    res := rec.Result()
    if res.Header.Get("Content-Type") != "text/event-stream" {
        t.Fatalf("expected text/event-stream, got %s", res.Header.Get("Content-Type"))
    }
}
```

## Best Practices

- Always call `Flusher.Flush()` after each event, or the client will see nothing until the buffer
    fills.
- Run SSE behind HTTP/2-capable load balancers so many streams can share a single connection.
- Set `Cache-Control: no-cache` and `Connection: keep-alive` to prevent proxies from buffering.
- Send a heartbeat comment every 25–30 seconds to keep connections alive through corporate proxies.
- Limit connections per client IP or require authentication to avoid resource exhaustion.
- Use longer write timeouts than for standard REST endpoints, or the server may close long-lived
    streams.

## Common Mistakes

- **Forgetting to call `Flush()`**. Without flushing, the event sits buffered and the client sees
    nothing.
- **Ignoring client disconnect**. A missing `r.Context().Done()` check leaves goroutines and
    channels running forever.
- **Missing `Cache-Control: no-cache`**. Proxies buffer the response, so events arrive in bursts or
    not at all.
- **Sending events without IDs**. Without `id:` fields, the browser can't replay missed events after
    reconnecting.
- **Running the same handler without state isolation**. Each Go process needs its own hub or a
    shared Redis fan-out.

## FAQ

### How does SSE compare to WebSockets?

SSE is simpler for server-to-client push. Use [WebSockets](/recipes/real-time-websockets/) when you
need bi-directional communication or binary data.

### Can SSE work through corporate proxies?

Yes, but some proxies have short timeouts. Send heartbeat comments every 30 seconds to keep
connections open.

### What is the maximum number of concurrent SSE connections?

Over HTTP/1.1, browsers allow about 6 connections per domain. HTTP/2 removes this limit.

### How do I handle client reconnection with Last-Event-ID?

Read the `Last-Event-ID` header and replay any events with higher IDs. Assign sequential IDs with
the
`id:` field and store recent events in a small in-memory ring buffer.

### How do I broadcast SSE to multiple clients in Go?

Maintain a map of subscribed channels. Use a non-blocking send with a `default` case in a `select`
to
avoid slow clients blocking the broadcast. For fan-out across instances, add Redis Pub/Sub.

### How do I handle SSE behind a load balancer?

Use long timeouts, disable response buffering in nginx with `proxy_buffering off;`, and use Redis
Pub/Sub to share events across instances if clients may land on different backends.
