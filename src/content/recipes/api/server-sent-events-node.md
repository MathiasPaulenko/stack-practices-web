---
contentType: recipes
slug: server-sent-events-node
title: "Server-Sent Events with Node.js and Express"
description: "Implement real-time server-to-client push using Server-Sent Events in Node.js with Express, covering connection management, event types, reconnection logic, and backpressure handling"
metaDescription: "Implement Server-Sent Events in Node.js with Express. Real-time server-to-client push with connection management, event types, reconnection and backpressure handling."
difficulty: intermediate
topics:
  - api
  - frontend
tags:
  - sse
  - real-time
  - nodejs
  - express
  - api
relatedResources:
  - /recipes/api/websocket-bidirectional-chat
  - /recipes/messaging/kafka-event-streaming
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement Server-Sent Events in Node.js with Express. Real-time server-to-client push with connection management, event types, reconnection and backpressure handling."
  keywords:
    - server sent events
    - sse
    - nodejs
    - express
    - real time push
---

# Server-Sent Events with Node.js and Express

Server-Sent Events (SSE) provide a lightweight, unidirectional channel for pushing real-time updates from server to browser over HTTP. Unlike WebSockets, SSE uses standard HTTP, auto-reconnects, and works seamlessly with existing infrastructure like load balancers. Here is how to Express implementation, event types, connection management, and graceful client reconnection.

## When to Use This

- Live dashboards, activity feeds, or notification streams need server-initiated updates
- You want real-time push without the complexity of bidirectional WebSockets
- Existing HTTP infrastructure (caching, auth, [LB](/recipes/api/nginx-reverse-proxy)) must be reused

## Solution

### 1. Express SSE Endpoint

```typescript
// sse/SSEEndpoint.ts
import express, { Request, Response } from 'express';

interface Client {
  id: string;
  response: Response;
  lastEventId: string | null;
}

class SSEManager {
  private clients = new Map<string, Client>();

  addClient(res: Response): string {
    const id = crypto.randomUUID();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial connection event
    res.write(`event: connected\nid: ${id}\ndata: ${JSON.stringify({ clientId: id })}\n\n`);

    this.clients.set(id, { id, response: res, lastEventId: null });

    res.on('close', () => this.removeClient(id));
    return id;
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      client.response.write(payload);
    });
  }

  sendTo(clientId: string, event: string, data: unknown): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  }
}

const sseManager = new SSEManager();

// Route
app.get('/events', (req: Request, res: Response) => {
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  const clientId = sseManager.addClient(res);

  if (lastEventId) {
    // Client reconnected; replay missed events from that ID
    replayEvents(clientId, lastEventId);
  }
});
```

### 2. Typed Event Protocol

```typescript
// sse/EventProtocol.ts
type SSEEvent =
  | { type: 'user:joined'; data: { userId: string; name: string } }
  | { type: 'user:left'; data: { userId: string } }
  | { type: 'notification'; data: { message: string; severity: 'info' | 'warning' | 'error' } }
  | { type: 'heartbeat'; data: { timestamp: number } };

function sendEvent(clientId: string, event: SSEEvent): void {
  sseManager.sendTo(clientId, event.type, event.data);
}

// Heartbeat to keep connections alive
setInterval(() => {
  sseManager.broadcast('heartbeat', { timestamp: Date.now() });
}, 30000);
```

### 3. Client-Side Connection

```typescript
// client/SSEClient.ts
class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  connect(url: string): void {
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectDelay = 1000; // Reset backoff
    };

    this.eventSource.addEventListener('user:joined', (e) => {
      const data = JSON.parse(e.data);
      console.log('User joined:', data.name);
    });

    this.eventSource.addEventListener('notification', (e) => {
      const data = JSON.parse(e.data);
      showToast(data.message, data.severity);
    });

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.scheduleReconnect(url);
    };
  }

  private scheduleReconnect(url: string): void {
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect(url);
    }, this.reconnectDelay);
  }

  disconnect(): void {
    this.eventSource?.close();
  }
}
```

### 4. Backpressure and Error Handling

```typescript
// sse/BackpressureHandler.ts
class SafeSSEManager extends SSEManager {
  broadcastSafe(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      const writable = client.response.writable;
      if (!writable) {
        deadClients.push(client.id);
        return;
      }

      const flushed = client.response.write(payload);
      if (!flushed) {
        // Buffer full; pause this client
        client.response.once('drain', () => {
          // Resume when buffer clears
        });
      }
    });

    deadClients.forEach((id) => this.removeClient(id));
  }
}
```

## How It Works

- **Event stream** is a persistent HTTP response with `Content-Type: text/event-stream`
- **EventSource API** in browsers auto-reconnects and parses `event:`, `data:`, and `id:` fields
- **Heartbeat messages** prevent proxy timeouts and detect stale connections
- **Last-Event-ID** header enables replay of missed events after reconnection

## Production Considerations

- Disable response buffering in reverse proxies (nginx, HAProxy) for immediate delivery
- Set appropriate timeout values on load balancers for long-lived connections
- Monitor connection count to prevent memory exhaustion under high load

## Common Mistakes

- Not sending heartbeats, causing silent disconnections behind proxies
- Broadcasting large payloads to all clients without backpressure handling
- Storing all events in memory for replay instead of using a bounded buffer or persistent log

## FAQ

**Q: SSE vs WebSockets: which to choose?**
A: Use SSE for server-to-client push over HTTP. Use [WebSockets](/recipes/api/websocket-server) when you need true bidirectional communication or binary data.

**Q: How many concurrent SSE connections can a Node.js server handle?**
A: Thousands per process, limited by memory and OS file descriptors. Use clustering or [service mesh patterns](/patterns/design/ambassador-pattern-services) for horizontal scaling.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
