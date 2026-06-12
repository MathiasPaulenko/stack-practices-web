---
contentType: recipes
slug: real-time-notifications
title: "Build Real-Time Notifications with WebSockets"
description: "Implement a real-time notification system using WebSockets and Redis pub/sub for broadcasting messages across clients."
metaDescription: "Build real-time notifications with WebSockets and Redis pub/sub. Broadcasting, room management, and scaling strategies in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - api
tags:
  - websocket
  - real-time
  - redis
  - publish-subscribe
  - notifications
  - python
  - javascript
  - java
relatedResources:
  - /recipes/websocket-server
  - /recipes/rate-limiting
  - /recipes/server-sent-events
  - /recipes/webhooks
  - /recipes/api-documentation-openapi
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Build real-time notifications with WebSockets and Redis pub/sub. Broadcasting, room management, and scaling strategies in Python, JavaScript, and Java."
  keywords:
    - websocket
    - real-time
    - redis
    - publish-subscribe
    - notifications
    - python
    - javascript
    - java
---
# Build Real-Time Notifications with WebSockets

## Overview

Real-time notifications keep users informed without polling. WebSockets provide full-duplex communication between client and server, while Redis pub/sub acts as a message broker to broadcast events across multiple server instances.

This recipe implements a notification system with WebSocket connections, room-based broadcasting, and Redis-backed horizontal scaling.

## When to Use

Use this resource when:
- Users need instant updates (chat, alerts, live dashboards)
- Polling creates too much load on your infrastructure
- You run multiple API instances behind a load balancer
- You need to broadcast the same event to many connected clients

## Solution

### Python

```python
import asyncio
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket
from fastapi.websockets import WebSocketDisconnect

app = FastAPI()
redis_client = redis.from_url("redis://localhost:6379")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await redis_client.publish("notifications", data)
    except WebSocketDisconnect:
        manager.active_connections.remove(websocket)

# Redis subscriber (run in background task)
async def redis_listener():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("notifications")
    async for message in pubsub.listen():
        if message["type"] == "message":
            await manager.broadcast(message["data"].decode())
```

### JavaScript

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');
const redis = new Redis();
const subscriber = new Redis();

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

subscriber.subscribe('notifications');
subscriber.on('message', (channel, message) => {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

// Publish from API
redis.publish('notifications', JSON.stringify({ type: 'alert', text: 'New order!' }));
```

### Java

```java
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Component
public class NotificationHandler extends TextWebSocketHandler {
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    public void broadcast(String message) {
        for (WebSocketSession session : sessions) {
            session.sendMessage(new TextMessage(message));
        }
    }
}

@Component
public class RedisNotificationListener implements MessageListener {
    @Autowired private NotificationHandler handler;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        handler.broadcast(new String(message.getBody()));
    }
}
```

## Explanation

The architecture consists of three layers:
- **WebSocket layer**: Maintains persistent connections with clients
- **Redis pub/sub**: Distributes messages across server instances (no persistence)
- **Application layer**: Publishes events when business actions occur

Redis pub/sub is ideal for broadcasting because subscribers receive messages in real-time without polling. For persistence, use Redis Streams or a message queue like RabbitMQ.

## Variants

| Technology | Transport | Scalability | Use Case |
|------------|-----------|------------|----------|
| WebSockets | Full-duplex TCP | Redis pub/sub | Chat, live updates |
| Server-Sent Events | One-way HTTP | Redis pub/sub | Stock prices, logs |
| Long Polling | HTTP fallback | None needed | Legacy browser support |
| MQTT | Lightweight TCP | Broker cluster | IoT devices |

## Best Practices

- **Heartbeat/ping every 30 seconds**: Detect dead connections and free resources
- **Room/channel segmentation**: Broadcast to subsets of users, not all connections
- **Authentication on handshake**: Validate JWT during WebSocket upgrade
- **Graceful degradation**: Fall back to SSE or polling if WebSockets fail
- **Rate limit broadcasts**: Prevent spam from overwhelming clients

## Common Mistakes

- **Not handling reconnections**: Clients disconnect — implement exponential backoff reconnection
- **Storing messages in Redis pub/sub**: Pub/sub does not persist messages; use Redis Streams for durability
- **Broadcasting to all clients**: Use room/channel namespaces to limit message delivery
- **Ignoring connection limits**: Each WebSocket consumes memory; set per-IP and global limits
- **Missing auth on handshake**: Authenticate during the upgrade request, not after connection

## Frequently Asked Questions

**Q: How many concurrent WebSockets can one server handle?**
A: Node.js handles ~10k-50k, Go ~100k+, Java (Netty) ~1M+. Use load testing with your actual payload size to determine real limits.

**Q: Can I use WebSockets with serverless functions?**
A: AWS API Gateway supports WebSockets, but stateless functions require DynamoDB or Redis to share connection info. Consider managed services like Pusher or Ably for simplicity.

**Q: Should I use WebSockets or Server-Sent Events?**
A: Use SSE for one-way server-to-client streams (simpler, HTTP-based, auto-reconnect). Use WebSockets for bidirectional communication (chat, collaborative editing).
