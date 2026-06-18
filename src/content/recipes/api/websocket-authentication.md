---
contentType: recipes
slug: websocket-authentication
title: "WebSocket Authentication and Security Patterns"
description: "How to authenticate WebSocket connections, implement token validation, and handle authorization for real-time messaging in production"
metaDescription: "WebSocket authentication and security patterns. Validate tokens on connection, implement room-based authorization, and prevent unauthorized real-time access."
difficulty: intermediate
topics:
  - api
  - security
tags:
  - websockets
  - security
  - authentication
  - real-time
relatedResources:
  - /recipes/api/call-rest-api
  - /recipes/real-time-websockets
  - /patterns/design/decorator-pattern-pipeline
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "WebSocket authentication and security patterns. Validate tokens on connection, implement room-based authorization, and prevent unauthorized real-time access."
  keywords:
    - websockets
    - authentication
    - real-time security
    - token validation
    - room authorization
---

# WebSocket Authentication and Security Patterns

WebSocket connections are long-lived and stateful, which makes authentication and authorization different from REST. Tokens must be validated during the handshake, and ongoing messages must be checked against room-based permissions to prevent unauthorized real-time access.

## When to Use This

- You need to identify users in a persistent WebSocket connection
- Different users should see different real-time data based on permissions
- You want to prevent connection hijacking and replay attacks

## Prerequisites

- A WebSocket server (Node.js ws, Socket.io, or Deno)
- JWT or session-based authentication system already in place

## Solution

### 1. Token Validation on Handshake

```typescript
// server/ws.ts
import { WebSocketServer } from 'ws';
import { verifyToken } from './auth';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws, req) => {
  const token = extractToken(req);
  
  try {
    const user = await verifyToken(token);
    ws.userId = user.id;
    ws.rooms = new Set();
    console.log(`User ${user.id} connected`);
  } catch {
    ws.close(1008, 'Invalid token');
    return;
  }

  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => handleDisconnect(ws));
});

function extractToken(req: IncomingMessage): string {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  return url.searchParams.get('token') || '';
}
```

### 2. Room-Based Authorization

```typescript
// server/rooms.ts
interface RoomMessage {
  type: 'join' | 'leave' | 'message';
  room: string;
  payload?: unknown;
}

const rooms = new Map<string, Set<WebSocket>>();
const roomPermissions = new Map<string, string[]>(); // room -> userIds

function handleMessage(ws: AuthenticatedWebSocket, data: RawData) {
  const msg: RoomMessage = JSON.parse(data.toString());

  switch (msg.type) {
    case 'join':
      if (canJoinRoom(ws.userId, msg.room)) {
        joinRoom(ws, msg.room);
        ws.send(JSON.stringify({ type: 'joined', room: msg.room }));
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
      }
      break;

    case 'message':
      if (ws.rooms.has(msg.room)) {
        broadcast(msg.room, { type: 'message', room: msg.room, payload: msg.payload });
      }
      break;

    case 'leave':
      leaveRoom(ws, msg.room);
      break;
  }
}

function canJoinRoom(userId: string, room: string): boolean {
  const allowed = roomPermissions.get(room);
  return !allowed || allowed.includes(userId);
}

function joinRoom(ws: AuthenticatedWebSocket, room: string) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(ws);
  ws.rooms.add(room);
}

function broadcast(room: string, message: object) {
  const clients = rooms.get(room);
  if (!clients) return;
  
  const data = JSON.stringify(message);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}
```

### 3. Rate Limiting per Connection

```typescript
// server/rateLimit.ts
class ConnectionRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private readonly capacity = 50;
  private readonly refillRate = 10; // tokens per second

  canSend(userId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(userId);
    
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(userId, bucket);
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }
}

const limiter = new ConnectionRateLimiter();

// In handleMessage:
if (!limiter.canSend(ws.userId)) {
  ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
  return;
}
```

## How It Works

1. **Handshake Validation** rejects connections before they are established
2. **Room Authorization** enforces that users only receive data they are allowed to see
3. **Rate Limiting** prevents a single connection from flooding the server
4. **Graceful Disconnect** cleans up room memberships to prevent memory leaks

## Production Considerations

- Use **Redis Pub/Sub** to broadcast across multiple WebSocket server instances
- Implement **heartbeat/ping-pong** to detect and clean up stale connections
- Log connection events for security auditing and debugging
- Consider **Socket.io** for automatic reconnection and room management

## FAQ

**Q: Should I use JWT or session cookies for WebSocket auth?**
A: JWT is easier for cross-domain connections. Session cookies work well if the WebSocket and HTTP API share the same origin.

**Q: How do I handle token expiration during a long-lived connection?**
A: Send a refresh token over the existing connection or implement a silent refresh before expiration.

**Q: Can I use the same auth middleware for HTTP and WebSocket?**
A: Partially. The validation logic can be shared, but WebSocket requires extracting the token from query parameters or headers during the handshake.
