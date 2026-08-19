---
contentType: recipes
slug: server-sent-events-node
title: "Server-Sent Events with Node.js and Express"
description: "Build server-to-client push with Server-Sent Events in Node.js and Express. Covers connections, heartbeats, reconnection, and safe broadcasting."
metaDescription: "Implement Server-Sent Events in Node.js with Express. Includes connection handling, heartbeats, client reconnection, and safe broadcasting for real-time push."
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
  - /recipes/server-sent-events
  - /recipes/server-sent-events-go
  - /recipes/websocket-bidirectional-chat
  - /recipes/websockets-realtime
  - /recipes/redis-pub-sub-python
  - /patterns/publish-subscribe-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Implement Server-Sent Events in Node.js with Express. Includes connection handling, heartbeats, client reconnection, and safe broadcasting for real-time push."
  keywords:
    - server sent events
    - sse
    - nodejs
    - express
    - real time push
---

## Overview

Server-Sent Events (SSE) let the server push text events to the browser over one
long-lived HTTP connection. It's a one-way channel over plain HTTP, so it works
with whatever auth, load balancers, and proxies you already have.

This recipe gives you an Express endpoint, a browser client, and a safe broadcast
helper that handles backpressure and cleanup.

## When to Use

Reach for SSE when:

- You need live dashboards, activity feeds, or notifications from server to
  client.
- Traffic mostly flows from server to client, and clients just listen.
- You'd rather reuse your HTTP stack than add WebSocket infrastructure.
- Your messages are small and text-only, so binary payloads aren't needed.

### When to avoid

- You genuinely need bidirectional or binary communication. Use WebSockets instead.
- Clients need to send frequent messages back to the server. SSE is
  server-to-client only.
- Your deployment blocks long-lived HTTP connections. Some proxies or firewalls
  block them.

## Solution

### Express SSE endpoint

```typescript
// sse/server.ts
import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';

const app = express();

interface Client {
  id: string;
  response: Response;
}

const clients = new Map<string, Client>();

function addClient(res: Response): string {
  const id = randomUUID();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(
    `event: connected\nid: ${id}\ndata: ${JSON.stringify({ clientId: id })}\n\n`
  );

  clients.set(id, { id, response: res });

  res.on('close', () => {
    clients.delete(id);
  });

  return id;
}

app.get('/events', (req: Request, res: Response) => {
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  const clientId = addClient(res);

  if (lastEventId) {
    replayEvents(clientId, lastEventId);
  }
});

// Replace this with a bounded buffer or persistent store
function replayEvents(clientId: string, lastEventId: string) {
  // Send missed events to the client
}

const PORT = 3000;
app.listen(PORT, () => console.log(`SSE server on port ${PORT}`));
```

### Broadcasting events with backpressure

```typescript
function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((client) => {
    const flushed = client.response.write(payload);

    if (!flushed) {
      client.response.once('drain', () => {
        // buffer cleared; writes can continue
      });
    }
  });
}

// Heartbeat every 30 seconds to keep connections alive
setInterval(() => {
  broadcast('heartbeat', { ts: Date.now() });
}, 30000);
```

### Client with auto-reconnect

```typescript
// client/sse.ts
let attempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
  const source = new EventSource('/events');

  source.addEventListener('connected', (e) => {
    attempts = 0;
    const { clientId } = JSON.parse(e.data);
    console.log('connected as', clientId);
  });

  source.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    showToast(data.message);
  });

  source.onerror = () => {
    source.close();

    if (reconnectTimer) return;

    const delay = Math.min(1000 * 2 ** attempts, 30000);
    attempts += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };
}

connect();
```

## Explanation

SSE reuses a normal HTTP response. The server leaves it open and writes lines in
`text/event-stream` format. Events carry `event:`, `data:`, `id:`, and `retry:`
fields. Browsers handle this through the `EventSource` API, which reconnects
automatically and sends the `Last-Event-ID` header.

The protocol is text-only, so any JSON goes encoded inside the `data:` field.
Heartbeats keep the connection alive so proxies don't close idle sockets. The
`Last-Event-ID` header lets the server resume from where the client left off.

Backpressure shows up when clients can't keep up. `response.write` returns
`false` the moment Node's internal buffer is full. After that, wait for the
`drain` event before writing again, or disconnect clients that stay behind.

## Variants

| Approach | Best for | Notes |
| --- | --- | --- |
| Native `EventSource` | Modern browsers | Auto-reconnect, `Last-Event-ID`, no polling |
| Manual `fetch` + `ReadableStream` | Custom headers or POST auth | More control, more code |
| `eventsource` npm package | Node clients or older browsers | Same API, works outside the browser |
| `better-sse` or `sse-channel` | Production Express | Handles rooms, heartbeat, and cleanup |

## Best Practices

- Set `X-Accel-Buffering: no` to stop nginx or other proxies from buffering the
  stream.
- Send a heartbeat every 15–30 seconds to avoid proxy and firewall timeouts.
- Use `Last-Event-ID` to resume after reconnections; store a bounded event
  history.
- Remove clients on `close` or `error`; otherwise they leak memory.
- Limit open connections and the message rate for each client.
- Use `res.write` backpressure signals; don't buffer unbounded messages.

## Common Mistakes

- Forgetting heartbeats and then wondering why connections drop silently.
- Broadcasting big payloads without checking the return value of `response.write`.
- Keeping the full event history in memory instead of a bounded buffer or
  persistent log.
- Opening many `EventSource` instances per page. Browsers cap connections per
  origin.
- Sending binary data or expecting the client to post data back over the same
  connection.

## FAQ

### Can I send binary data over SSE?

No. SSE is text-only. Encode binary as Base64, or use WebSockets for true binary
streams.

### How many concurrent SSE connections can one Node.js process handle?

Thousands, limited by memory and OS file descriptors. Every connection costs a
small heap allocation plus one socket. Use clustering or a load balancer with
sticky sessions for horizontal scaling.

### Does SSE work through a load balancer?

Yes, provided the balancer supports long-lived HTTP and sticky sessions once
you scale past one server. Disable response buffering and set idle timeouts high
enough.

### How do I authenticate SSE clients?

Pass a token in the URL query, a cookie, or use `fetch` with manual stream
parsing so you can send custom headers. Plain `EventSource` can't set
`Authorization` headers.

### What if the client disconnects and reconnects?

Add `id:` fields to events and read the `Last-Event-ID` header on the server.
Replay missed events from a bounded in-memory queue or a persistent store like
Redis.
