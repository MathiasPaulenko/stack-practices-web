---
contentType: recipes
slug: websocket-server
title: "WebSocket Server"
description: "How to build a WebSocket server for bidirectional real-time communication, with connection management, message broadcasting, and heartbeat keepalive."
metaDescription: "Learn WebSocket server implementation in Python, JavaScript, and Java. Covers bidirectional messaging, connection management, and broadcasting."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - bidirectional
  - java
relatedResources:
  - /recipes/server-sent-events
  - /recipes/webhooks
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/handle-cors
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn WebSocket server implementation in Python, JavaScript, and Java. Covers bidirectional messaging, connection management, and broadcasting."
  keywords:
    - websocket
    - ws
    - real-time
    - bidirectional
    - server
    - python
    - javascript
    - java
---
## Overview

WebSockets provide full-duplex, bidirectional communication channels over a single TCP connection, enabling real-time interaction between browsers and servers. Unlike HTTP request/response cycles, a WebSocket connection stays open, allowing both parties to push messages at any time with minimal overhead. This recipe covers building WebSocket servers in Python, JavaScript (Node.js), and Java (Spring Boot), including connection management, heartbeat keepalive, message broadcasting, and room/channel-based messaging.

## When to Use

Use this resource when:
- You need true bidirectional real-time communication (chat, collaborative editing, multiplayer games)
- Your application requires low-latency updates in both directions (client → server and server → client)
- You want to avoid the overhead of HTTP polling or the uni-directional limitation of [SSE](/recipes/api/server-sent-events)
- You need to push data to specific clients or groups (rooms/channels) based on business logic

## Solution

### Python (websockets library)

```python
import asyncio
import websockets
import json

connected = set()
rooms = {}  # room_name -> set of websockets

async def register(websocket):
    connected.add(websocket)

async def unregister(websocket):
    connected.discard(websocket)
    # Remove from all rooms
    for room in rooms.values():
        room.discard(websocket)

async def broadcast(message, sender=None):
    for client in connected:
        if client != sender:
            await client.send(message)

async def broadcast_to_room(room, message):
    if room in rooms:
        for client in rooms[room]:
            await client.send(message)

async def handler(websocket, path):
    await register(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)

            if data.get("action") == "join":
                room = data["room"]
                rooms.setdefault(room, set()).add(websocket)
                await websocket.send(json.dumps({"status": "joined", "room": room}))

            elif data.get("action") == "message":
                room = data["room"]
                await broadcast_to_room(room, json.dumps({
                    "room": room,
                    "user": data.get("user", "anonymous"),
                    "message": data["message"]
                }))

            elif data.get("action") == "broadcast":
                await broadcast(json.dumps({"message": data["message"]}), sender=websocket)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await unregister(websocket)

# Heartbeat keepalive
async def heartbeat():
    while True:
        await asyncio.sleep(30)
        disconnected = []
        for client in connected:
            try:
                await client.ping()
            except websockets.exceptions.ConnectionClosed:
                disconnected.append(client)
        for client in disconnected:
            await unregister(client)

start_server = websockets.serve(handler, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
```

### JavaScript (Node.js with ws)

```javascript
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8765 });
const clients = new Map(); // websocket -> metadata
const rooms = new Map();     // room -> Set of websockets

wss.on("connection", (ws, req) => {
  const clientId = generateId();
  clients.set(ws, { id: clientId, rooms: new Set() });

  console.log(`Client ${clientId} connected`);
  ws.send(JSON.stringify({ type: "welcome", id: clientId }));

  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage);

      if (data.action === "join") {
        const room = data.room;
        clients.get(ws).rooms.add(room);
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(ws);
        ws.send(JSON.stringify({ type: "joined", room }));
      }

      else if (data.action === "message") {
        const room = data.room;
        const message = JSON.stringify({
          type: "message",
          room,
          user: data.user || "anonymous",
          message: data.message
        });
        broadcastToRoom(room, message);
      }

      else if (data.action === "broadcast") {
        const message = JSON.stringify({ type: "broadcast", message: data.message });
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }
  });

  ws.on("close", () => {
    const meta = clients.get(ws);
    meta.rooms.forEach(room => rooms.get(room)?.delete(ws));
    clients.delete(ws);
    console.log(`Client ${meta.id} disconnected`);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

function broadcastToRoom(room, message) {
  const members = rooms.get(room);
  if (!members) return;
  members.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Heartbeat
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);
```

### Java (Spring Boot with STOMP)

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  @Override
  public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableSimpleBroker("/topic", "/queue");
    config.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();
  }
}

// Controller
import org.springframework.messaging.handler.annotation.*;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

  @MessageMapping("/chat/{room}")
  @SendTo("/topic/rooms/{room}")
  public ChatMessage send(@DestinationVariable String room,
                          @Payload ChatMessage message) {
    return message;
  }

  @MessageMapping("/broadcast")
  @SendTo("/topic/broadcast")
  public String broadcast(@Payload String message) {
    return message;
  }
}

// Message class
public record ChatMessage(String user, String message, long timestamp) {}
```

### Browser Client

```javascript
// Basic connection
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ action: "join", room: "general" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "welcome":
      console.log("Assigned ID:", data.id);
      break;
    case "message":
      appendMessage(data.room, data.user, data.message);
      break;
    case "broadcast":
      showNotification(data.message);
      break;
  }
};

ws.onclose = () => {
  console.log("Disconnected, attempting reconnect...");
  setTimeout(() => connect(), 3000);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

// Send a room message
function sendMessage(room, text) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: "message",
      room,
      user: "alice",
      message: text
    }));
  }
}
```

## Explanation

- **Protocol handshake** — WebSockets start as an HTTP request with `Upgrade: websocket` and `Connection: Upgrade` headers. The server returns a `101 Switching Protocols` response, after which the TCP connection transitions to the WebSocket binary framing protocol.
- **Connection management** — maintain a registry of active connections (using sets or maps). When a client disconnects (gracefully or via network failure), remove the connection from your registry to prevent memory leaks and phantom broadcasts.
- **Heartbeat keepalive** — WebSocket connections can be silently dropped by proxies, NAT gateways, or load balancers without either side noticing. Implement periodic `ping`/`pong` frames (every 30 seconds) or application-level heartbeats to detect dead connections and close them properly.
- **Room/channel architecture** — map room names to sets of connections. When a message targets a room, iterate over only that room's members rather than broadcasting to all connected clients. This considerably reduces bandwidth and processing overhead for large deployments.

## Variants

| Framework | Protocol Capabilities | Best For |
|-----------|-------------------|----------|
| Python `websockets` | Raw WebSocket, asyncio | Microservices, custom protocols |
| Node.js `ws` | Raw WebSocket, high performance | Real-time games, chat at scale |
| Spring Boot STOMP | Sub-protocol over WebSocket | Enterprise apps, pub/sub messaging |
| Socket.IO | WebSocket + HTTP fallback | Browser apps needing fallback transport |
| AWS API Gateway | Managed WebSocket | Serverless architectures |

## What Works

1. **Always handle connection errors** — network failures, client crashes, and proxy timeouts can leave stale connections. Wrap send operations in try/catch, handle `onError` callbacks, and implement heartbeat-based cleanup.
2. **Authenticate during handshake** — pass [authentication tokens](/recipes/authentication/jwt-authentication) via query parameters or cookies during the WebSocket upgrade request. Do not attempt to authenticate over the WebSocket message channel after connection; the initial handshake is the safest point.
3. **Validate all incoming messages** — WebSocket payloads are untrusted. [Validate input](/recipes/api/input-validation), sanitize inputs, enforce message size limits, and rate-limit clients to prevent DoS attacks via oversized or high-frequency messages.
4. **Use rooms for targeted delivery** — instead of broadcasting every message to all clients, organize clients into rooms/channels based on application logic (chat rooms, document IDs, user groups). This reduces server load and client-side filtering.
5. **Implement reconnection logic on the client** — browsers do not auto-reconnect WebSockets. Wrap your `WebSocket` instance in a manager that detects disconnections, uses exponential backoff, and rejoins rooms after reconnection.

## Common Mistakes

1. Broadcasting every message to all connected clients instead of using rooms, causing unnecessary bandwidth usage and client-side noise.
2. Not implementing heartbeat keepalive, leading to silent connection leaks where the server believes dead connections are still active.
3. Sending binary data without checking `ws.binaryType` on the client side, causing `Blob` vs `ArrayBuffer` parsing confusion in JavaScript.
4. Assuming WebSocket connections are authenticated simply because they passed through an authenticated HTTP endpoint. WebSocket upgrades are separate requests; always verify auth tokens on the upgrade handshake.
5. Forgetting to handle backpressure. If a client is slow to consume messages (slow network, busy CPU), unbounded message queuing on the server will eventually exhaust memory. Implement flow control or drop old messages.

## Frequently Asked Questions

### How many concurrent WebSocket connections can a server handle?

It depends on your language, framework, and hardware. Node.js with `ws` can handle 10,000–50,000 connections on a single process. Python with `websockets` (asyncio) typically handles 1,000–10,000. Java (Netty/Spring) can scale to 100,000+ with proper tuning. Horizontal scaling with sticky sessions or [shared pub/sub (Redis)](/recipes/api/real-time-notifications) is required for truly massive deployments.

### Should I use raw WebSockets or a library like Socket.IO?

Use raw WebSockets if you need maximum control, minimal overhead, or custom framing. Use Socket.IO if you need automatic fallback to HTTP long-polling (for proxies that block WebSockets), built-in room management, reconnection logic, and heartbeat handling. Socket.IO adds ~20KB client-side and some protocol overhead.

### How do I scale WebSocket servers horizontally?

You cannot broadcast across multiple server instances without a shared message bus. Use Redis Pub/Sub, RabbitMQ, or a managed service (AWS API Gateway, Pusher, Ably) to distribute messages across all server instances. Clients connected to Server A must receive messages sent by clients on Server B via this shared bus.
