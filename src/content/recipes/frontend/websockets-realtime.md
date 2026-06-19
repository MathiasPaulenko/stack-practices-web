---
contentType: recipes
slug: websockets-realtime
title: "WebSockets for Real-Time Communication"
description: "Build bidirectional real-time communication with WebSockets, handling connection management, reconnection, and fallbacks."
metaDescription: "WebSocket real-time communication: connection management, reconnection strategies, fallbacks to SSE/long-polling, and scaling WebSocket servers."
difficulty: intermediate
topics:
  - frontend
tags:
  - real-time
  - nodejs
  - frontend
relatedResources:
  - /recipes/server-sent-events-node
  - /recipes/websocket-bidirectional-chat
  - /patterns/mvc-pattern-frontend
  - /recipes/express-middleware-patterns
  - /recipes/url-encoding-decoding
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "WebSocket real-time communication: connection management, reconnection strategies, fallbacks to SSE/long-polling, and scaling WebSocket servers."
  keywords:
    - websocket
    - real-time
    - nodejs
    - frontend
---
## Overview

WebSockets provide full-duplex, persistent communication between browsers and servers over a single TCP connection. Unlike HTTP polling, WebSockets enable real-time data flow with minimal latency, making them ideal for chat, live dashboards, multiplayer games, and collaborative editing.

## When to Use

Use this resource when:
- Building chat applications or live comment systems
- Streaming real-time data to dashboards (stocks, metrics, IoT)
- Implementing multiplayer game state synchronization
- Creating collaborative editing tools (like Google Docs)

## Solution

### Server with ws (Node.js)

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log('Client connected:', req.socket.remoteAddress);

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    // Broadcast to all connected clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'chat',
          from: message.user,
          text: message.text,
          timestamp: Date.now()
        }));
      }
    });
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', (err) => console.error('WebSocket error:', err));
});
```

### Client Reconnection Logic

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 3000;
    this.maxReconnectInterval = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectInterval = 3000; // Reset backoff
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onMessage(data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 2,
        this.maxReconnectInterval
      );
    };

    this.ws.onerror = (err) => console.error('WebSocket error:', err);
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
```

## Explanation

WebSocket handshake upgrades an HTTP connection:

1. **Client sends upgrade request** with Connection: Upgrade and Upgrade: websocket headers
2. **Server responds 101 Switching Protocols** to confirm
3. **Bidirectional frames** are exchanged over the persistent TCP socket
4. **Close handshake** cleanly terminates the connection

**Key differences from SSE**:
- WebSockets are bidirectional; SSE is server-to-client only
- WebSockets use binary frames; SSE uses text/event-stream
- WebSockets need custom heartbeat/ping; SSE uses HTTP keep-alive

## Variants

| Technology | Direction | Best For |
|------------|-----------|----------|
| WebSockets | Bidirectional | Chat, games, collaboration |
| SSE | Server-to-client | Live feeds, notifications |
| Long Polling | Server-to-client | Legacy browser support |
| MQTT over WebSocket | Pub/sub | IoT, telemetry |

## Best Practices

- **Implement heartbeat/ping**: Detect dead connections with periodic ping/pong frames
- **Authenticate during handshake**: Pass JWT in query string or subprotocol
- **Use rooms/channels**: Do not broadcast everything to all clients
- **Handle backpressure**: Drop or queue messages if clients are slow
- **Fallback to SSE**: For clients behind strict proxies that block WebSockets

## Common Mistakes

1. **No reconnection logic**: Network hiccups permanently disconnect users
2. **Broadcasting to all clients**: Scales poorly; use pub/sub or channel rooms
3. **Ignoring memory leaks**: Closed connections not removed from client sets cause OOM
4. **Sending binary without framing**: Always serialize structured data (JSON, Protobuf)
5. **Not handling proxy timeouts**: Corporate proxies may kill idle connections after 30s

## Frequently Asked Questions

**Q: How many concurrent WebSocket connections can a server handle?**
A: Node.js handles ~10k-50k connections per core. Use Redis pub/sub or a message bus to scale horizontally.

**Q: Can WebSockets work over HTTPS?**
A: Yes — use wss:// (WebSocket Secure). Browsers block mixed-content ws:// on HTTPS pages.

**Q: What is the best fallback if WebSockets are blocked?**
A: Server-Sent Events for server-to-client; HTTP long polling for bidirectional needs.
