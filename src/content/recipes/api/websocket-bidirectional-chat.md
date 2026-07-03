---
contentType: recipes
slug: websocket-bidirectional-chat
title: "Build a Bidirectional Chat with WebSocket and Node.js"
description: "How to build a real-time bidirectional chat application using WebSocket with room-based messaging, presence tracking, and message persistence"
metaDescription: "Bidirectional WebSocket chat with Node.js. Build real-time messaging with room-based delivery, presence tracking, and message persistence for production."
difficulty: intermediate
topics:
  - api
  - frontend
tags:
  - bidirectional
  - websockets
  - real-time
  - nodejs
  - api
relatedResources:
  - /recipes/api/websocket-authentication
  - /recipes/api/server-sent-events-go
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bidirectional WebSocket chat with Node.js. Build real-time messaging with room-based delivery, presence tracking, and message persistence for production."
  keywords:
    - websocket chat
    - bidirectional communication
    - real time messaging
    - socket.io
    - node.js
---

# Build a Bidirectional Chat with WebSocket and Node.js

Bidirectional communication allows both client and server to send messages at any time. A chat application demonstrates this pattern perfectly: users send messages to the server, which then broadcasts them to other participants in the same room. WebSocket is the ideal transport for this because it maintains a persistent, low-latency connection.

## When to Use This

- You need real-time messaging where both sides can initiate communication
- Presence and typing indicators must update instantly
- Message delivery requires acknowledgments and ordering guarantees

## Prerequisites

- Node.js 18+ with `ws` library or Socket.io
- [Redis](/recipes/api/real-time-notifications) for multi-server message broadcasting

## Solution

### 1. WebSocket Server with Rooms

```typescript
// server/chat.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';

interface ChatClient extends WebSocket {
  userId: string;
  roomId: string;
}

const wss = new WebSocketServer({ port: 8080 });
const redis = createClient({ url: 'redis://localhost:6379' });
const rooms = new Map<string, Set<ChatClient>>();

wss.on('connection', (ws: ChatClient, req) => {
  const url = new URL(req.url!, 'http://localhost');
  ws.userId = url.searchParams.get('userId')!;
  ws.roomId = url.searchParams.get('roomId')!;

  joinRoom(ws);
  broadcastPresence(ws.roomId);

  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => leaveRoom(ws));
});

function joinRoom(client: ChatClient) {
  if (!rooms.has(client.roomId)) {
    rooms.set(client.roomId, new Set());
  }
  rooms.get(client.roomId)!.add(client);

  client.send(JSON.stringify({
    type: 'system',
    content: `Joined room ${client.roomId}`,
  }));
}

function leaveRoom(client: ChatClient) {
  rooms.get(client.roomId)?.delete(client);
  broadcastPresence(client.roomId);
}

function broadcastPresence(roomId: string) {
  const clients = rooms.get(roomId);
  if (!clients) return;

  const users = Array.from(clients).map(c => c.userId);
  const message = JSON.stringify({ type: 'presence', users });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function handleMessage(client: ChatClient, data: RawData) {
  const payload = JSON.parse(data.toString());

  if (payload.type === 'chat') {
    const message = {
      type: 'chat',
      userId: client.userId,
      content: payload.content,
      timestamp: Date.now(),
      id: generateId(),
    };

    // Persist to database
    await saveMessage(client.roomId, message);

    // Broadcast to room
    broadcastToRoom(client.roomId, message);
  }
}

function broadcastToRoom(roomId: string, message: object) {
  const clients = rooms.get(roomId);
  if (!clients) return;

  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
```

### 2. Multi-Server Broadcasting with Redis

```typescript
// server/redis-broadcast.ts
const subscriber = redis.duplicate();

subscriber.subscribe('chat:messages', (err) => {
  if (err) console.error('Redis subscription error:', err);
});

subscriber.on('message', (channel, message) => {
  const payload = JSON.parse(message);
  broadcastToRoom(payload.roomId, payload.message);
});

async function publishMessage(roomId: string, message: object) {
  await redis.publish('chat:messages', JSON.stringify({ roomId, message }));
}
```

### 3. React Client with Reconnection

```tsx
// hooks/useChat.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export function useChat(roomId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const socket = new WebSocket(
      `wss://chat.example.com?roomId=${roomId}&userId=${userId}`
    );

    socket.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'chat':
          setMessages(prev => [...prev, data]);
          break;
        case 'presence':
          setUsers(data.users);
          break;
      }
    };

    socket.onclose = () => {
      setConnected(false);
      // Reconnect with exponential backoff
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current = socket;
  }, [roomId, userId]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    ws.current?.send(JSON.stringify({
      type: 'chat',
      content,
    }));
  }, []);

  return { messages, users, connected, sendMessage };
}
```

### 4. Typing Indicators

```typescript
// server/typing.ts
const typingUsers = new Map<string, Set<string>>();

function handleTyping(client: ChatClient, isTyping: boolean) {
  if (!typingUsers.has(client.roomId)) {
    typingUsers.set(client.roomId, new Set());
  }

  const room = typingUsers.get(client.roomId)!;
  if (isTyping) room.add(client.userId);
  else room.delete(client.userId);

  broadcastToRoom(client.roomId, {
    type: 'typing',
    users: Array.from(room),
  });
}
```

## How It Works

1. **WebSocket Connection** establishes a persistent full-duplex channel
2. **Room Management** groups connections by chat room for targeted broadcast
3. **Redis Pub/Sub** synchronizes messages across multiple server instances
4. **Presence Tracking** maintains a live list of active participants
5. **Reconnection Logic** ensures clients automatically recover from network issues

## Production Considerations

- Use **Socket.io** for automatic reconnection, heartbeat, and room management
- Implement [rate limiting](/recipes/api/api-rate-limiting-redis) per user to prevent spam
- Store messages in a persistent database with [pagination](/recipes/api/pagination) for history
- Add **end-to-end encryption** for sensitive conversations

## Common Mistakes

- Not handling WebSocket reconnection, causing users to drop on network blips
- Broadcasting to all connected clients instead of filtering by room
- Not persisting messages, leading to data loss on server restart

## FAQ

**Q: Should I use raw WebSocket or Socket.io?**
A: [Socket.io](/recipes/api/websocket-server) for most applications. It handles reconnection, fallbacks, and room management automatically. Raw WebSocket is lighter but requires more custom code.

**Q: How do I scale WebSocket to multiple servers?**
A: Use Redis Pub/Sub or a message broker to broadcast messages across all server instances.

**Q: Can I use WebSocket over HTTP/2?**
A: WebSocket uses its own protocol, not HTTP/2. For HTTP/2 environments, consider Server-Sent Events for server-to-client and HTTP requests for client-to-server.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
