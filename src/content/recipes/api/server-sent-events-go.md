---
contentType: recipes
slug: server-sent-events-go
title: "Implement Server-Sent Events in Go for Real-Time Updates"
description: "How to build a production-ready Server-Sent Events endpoint in Go with connection management, heartbeat pings, and graceful client disconnect handling"
metaDescription: "Server-Sent Events in Go. Build real-time update streams with connection management, heartbeat pings, and graceful handling of client disconnects."
difficulty: intermediate
topics:
  - api
  - performance
tags:
  - server-sent-events
  - real-time
  - golang
  - api
  - rest
relatedResources:
  - /recipes/api/websocket-authentication
  - /recipes/real-time-websockets
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Server-Sent Events in Go. Build real-time update streams with connection management, heartbeat pings, and graceful handling of client disconnects."
  keywords:
    - server sent events
    - sse
    - golang
    - real time api
    - event stream
---

# Implement Server-Sent Events in Go for Real-Time Updates

Server-Sent Events provide a lightweight, uni-directional channel for pushing real-time updates from server to client over HTTP. Unlike WebSockets, SSE uses standard HTTP connections, requires no protocol upgrade, and automatically handles reconnection through the browser's built-in EventSource API.

## When to Use This

- You need to push notifications, logs, or live metrics to browsers
- The server is the only sender; clients only receive (no bi-directional chat)
- You want to use existing HTTP infrastructure (load balancers, CDNs)

## Prerequisites

- Go 1.21+ installed
- Basic understanding of HTTP streaming and goroutines

## Solution

### 1. Basic SSE Handler

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
			event := Event{
				ID:   fmt.Sprintf("%d", time.Now().Unix()),
				Type: "ping",
				Data: `{"timestamp": ` + fmt.Sprintf("%d", time.Now().Unix()) + `}`,
			}
			fmt.Fprint(w, event.String())
			flusher.Flush()
		}
	}
}
```

### 2. Hub-Based Connection Management

```go
// sse/hub.go
package sse

import (
	"sync"
)

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

### 3. Production Handler with Heartbeat

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

### 4. Client-Side EventSource

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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  evtSource.close();
});
```

## How It Works

1. **HTTP Stream** sends events as text/plain with `text/event-stream` content type
2. **Event Format** uses `data:`, `event:`, `id:`, and `retry:` fields per line
3. **Browser Reconnection** is automatic with last-event-id tracking
4. **Heartbeat Comments** (`: ping`) keep connections alive through proxies

## Production Considerations

- Run SSE endpoints behind **[HTTP/2 capable load balancers](/recipes/api/nginx-reverse-proxy)** for multiplexing
- Use **Redis Pub/Sub** to broadcast across multiple Go server instances. See [Real-Time Notifications](/recipes/api/real-time-notifications) for Redis pub/sub patterns.
- Limit **connections per client IP** to prevent resource exhaustion
- Set appropriate **write timeouts** higher than standard REST endpoints

## Common Mistakes

- Forgetting to call `Flush()` after each event
- Not handling client disconnect, leaving goroutines running
- Missing `Cache-Control: no-cache`, causing proxies to buffer events

## FAQ

**Q: How does SSE compare to WebSockets?**
A: SSE is simpler for server-to-client push. Use [WebSockets](/recipes/api/websocket-server) when you need bi-directional communication or binary data.

**Q: Can SSE work through corporate proxies?**
A: Yes, but some proxies have aggressive timeouts. Send heartbeat comments every 30 seconds to keep connections open.

**Q: What is the maximum number of concurrent SSE connections?**
A: Browser limit is 6 connections per domain. Use HTTP/2 or a shared connection to avoid this.

### How do I handle client reconnection with Last-Event-ID?

The `Last-Event-ID` HTTP header is sent by the browser when an SSE connection drops and the client reconnects. On the server, read this header and replay any events with IDs greater than the last received one. Assign sequential IDs to events using the `id:` field in the SSE format. Store recent events in an in-memory ring buffer (e.g., last 100 events per channel) so reconnected clients can catch up without missing messages.

### Should I use SSE or WebSocket for real-time updates?

Use SSE for server-to-client only streams (notifications, live feeds, dashboards). SSE is simpler: it uses standard HTTP, supports auto-reconnection, and works through proxies with minimal configuration. Use WebSocket when you need bidirectional communication (chat, collaborative editing, gaming). SSE has a browser limit of 6 concurrent connections per domain over HTTP/1.1, but HTTP/2 removes this limit.

### How do I broadcast SSE to multiple clients in Go?

Maintain a map of connected clients, each with their own channel. When broadcasting, iterate over the map and send the event to each client's channel using a non-blocking send (`select` with `default` case). Remove disconnected clients from the map on close. For large fan-out, use a pub/sub broker like Redis Pub/Sub so multiple Go processes can share the broadcast load.

### How do I test SSE endpoints in Go?

Use `httptest.NewServer` to start the handler in-process. Connect with an SSE client (e.g., `eventsource` Go package or a raw HTTP client that reads the response body line by line). Assert that events arrive in order with correct data. For load testing, open many concurrent connections and measure event latency. Use `context.WithTimeout` to cancel long-running tests.

### How do I secure SSE endpoints with authentication?

Pass auth tokens as query parameters (`?token=...`) since SSE connections cannot set custom headers from the browser `EventSource` API. Validate the token server-side before registering the client. For production, use short-lived tokens and rotate them. Alternatively, use cookies for auth (the browser sends cookies with SSE requests automatically). For cross-origin SSE, configure CORS headers on the SSE endpoint.

### How do I handle SSE connection cleanup in Go?

Use `context.Context` to propagate cancellation. When the HTTP handler returns, the request context is cancelled — listen for `<-ctx.Done()` in your event loop and close the flusher. Remove the client from the connection map inside a `defer` block to ensure cleanup runs even on panic. Set a write timeout on each flush to detect stale connections. Run a background goroutine that periodically checks for dead connections and removes them.

### How do I compress SSE responses in Go?

Enable gzip compression with `middleware.Compress` from chi or gin's `Gzip` middleware. SSE responses benefit from compression when events contain repetitive JSON payloads. Set `Content-Encoding: gzip` and flush after each compressed chunk. Be aware that compression adds CPU overhead per event — benchmark with realistic payload sizes to determine if it improves throughput for your use case.

### How do I handle SSE behind a load balancer?

Use sticky sessions (session affinity) so a client always connects to the same backend instance. Configure your load balancer (ALB, nginx, HAProxy) with long timeouts (e.g., 1 hour) to prevent premature connection drops. Disable response buffering in nginx: `proxy_buffering off;` and `proxy_cache off;`. For multi-instance broadcasting, use Redis Pub/Sub to fan events to all backend instances, each maintaining its own SSE connections.

### How do I implement SSE event IDs for replay?

Assign a monotonically increasing ID to each event using the `id:` field in the SSE format. Store events in a ring buffer keyed by ID. When a client reconnects with `Last-Event-ID: 42`, replay events 43+ from the buffer. Set a TTL on stored events (e.g., 5 minutes) to limit memory usage. For events beyond the buffer window, return a `204 No Content` and let the client decide whether to start fresh or show a reconnection message.
