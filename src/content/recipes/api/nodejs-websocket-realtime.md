---
contentType: recipes
slug: nodejs-websocket-realtime
title: "Node.js WebSocket Real-Time Communication with Socket.io"
description: "Build real-time WebSocket applications in Node.js with Socket.io"
metaDescription: "Build real-time WebSocket apps in Node.js with Socket.io. Covers rooms, namespaces, broadcasting, reconnection, authentication, and scaling with Redis adapter."
difficulty: intermediate
topics:
  - api
tags:
  - nodejs
  - websocket
  - socket.io
  - realtime
  - express
  - communication
relatedResources:
  - /recipes/websocket-server
  - /recipes/websocket-bidirectional-chat
  - /recipes/websocket-authentication
  - /guides/real-time-communication
  - /patterns/pub-sub-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Build real-time WebSocket apps in Node.js with Socket.io. Covers rooms, namespaces, broadcasting, reconnection, authentication, and scaling with Redis adapter."
  keywords:
    - nodejs websocket socket.io
    - socket.io rooms
    - socket.io namespaces
    - realtime communication nodejs
    - socket.io redis adapter
    - websocket reconnection
---

## Overview

Real-time WebSocket communication enables instant data exchange between server and clients. Socket.io provides a robust layer over WebSockets with auto-reconnection, rooms, namespaces, and broadcasting. This recipe covers setting up Socket.io with Express, rooms for group messaging, namespaces for separation, authentication middleware, and scaling with the Redis adapter.

## When to Use

- You are building a chat application, notification system, or live dashboard
- You need server-to-client push without polling
- You want room-based broadcasting (e.g., send messages only to users in a specific channel)
- You need to scale WebSocket connections across multiple Node.js instances

## Solution

### Basic Socket.io server with Express

```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("message", (data) => {
        io.emit("message", { ...data, timestamp: Date.now() });
    });

    socket.on("disconnect", (reason) => {
        console.log(`User disconnected: ${socket.id} — ${reason}`);
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
```

### Client-side connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Connected:", socket.id);
});

socket.on("message", (data) => {
    console.log("Received:", data);
});

socket.emit("message", { user: "alice", text: "Hello world" });

socket.on("disconnect", () => {
    console.log("Disconnected from server");
});
```

### Rooms for group messaging

```javascript
io.on("connection", (socket) => {
    socket.on("join-room", (room) => {
        socket.join(room);
        socket.to(room).emit("user-joined", { id: socket.id });
        console.log(`${socket.id} joined room: ${room}`);
    });

    socket.on("leave-room", (room) => {
        socket.leave(room);
        socket.to(room).emit("user-left", { id: socket.id });
    });

    socket.on("room-message", ({ room, message }) => {
        socket.to(room).emit("room-message", {
            from: socket.id,
            message,
            timestamp: Date.now()
        });
    });
});
```

### Namespaces for separation

```javascript
const chatNamespace = io.of("/chat");
const adminNamespace = io.of("/admin");

chatNamespace.on("connection", (socket) => {
    console.log(`Chat user: ${socket.id}`);

    socket.on("send-message", (msg) => {
        chatNamespace.emit("new-message", { from: socket.id, msg });
    });
});

adminNamespace.on("connection", (socket) => {
    console.log(`Admin connected: ${socket.id}`);

    adminNamespace.emit("stats", {
        chatUsers: chatNamespace.sockets.size,
        adminUsers: adminNamespace.sockets.size
    });
});
```

### Authentication middleware

```javascript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication token required"));
    }

    try {
        const payload = verifyToken(token);
        socket.userId = payload.userId;
        socket.username = payload.username;
        next();
    } catch (err) {
        next(new Error("Invalid authentication token"));
    }
});

io.on("connection", (socket) => {
    console.log(`Authenticated user: ${socket.username} (${socket.userId})`);

    socket.on("private-message", ({ to, message }) => {
        io.to(to).emit("private-message", {
            from: socket.id,
            fromUser: socket.username,
            message
        });
    });
});

function verifyToken(token) {
    // Replace with actual JWT verification
    if (token === "valid-token") {
        return { userId: 1, username: "alice" };
    }
    throw new Error("Invalid token");
}
```

### Scaling with Redis adapter

```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pubClient = new Redis({ host: "localhost", port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

io.on("connection", (socket) => {
    socket.on("broadcast", (data) => {
        io.emit("broadcast", data);
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
```

### Complete chat application

```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const users = new Map();

io.on("connection", (socket) => {
    socket.on("user-join", (username) => {
        users.set(socket.id, { username, joinedAt: Date.now() });
        io.emit("user-list", [...users.values()].map(u => u.username));
        socket.broadcast.emit("notification", `${username} joined the chat`);
    });

    socket.on("chat-message", (message) => {
        const user = users.get(socket.id);
        if (!user) return;

        io.emit("chat-message", {
            username: user.username,
            message,
            timestamp: Date.now()
        });
    });

    socket.on("typing", (isTyping) => {
        const user = users.get(socket.id);
        if (!user) return;
        socket.broadcast.emit("typing", { username: user.username, isTyping });
    });

    socket.on("disconnect", () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            io.emit("user-list", [...users.values()].map(u => u.username));
            socket.broadcast.emit("notification", `${user.username} left the chat`);
        }
    });
});

server.listen(3000, () => console.log("Chat server running on port 3000"));
```

## Explanation

Socket.io wraps the WebSocket protocol with additional features:

- **Auto-reconnection**: If the connection drops, the client automatically retries with exponential backoff. You can configure retry attempts and delays.
- **Rooms**: Sockets can join named rooms. `socket.to(room).emit()` sends to all sockets in that room except the sender. `io.to(room).emit()` sends to all including the sender.
- **Namespaces**: Separate channels on the same server. Useful for splitting features (e.g., `/chat` and `/admin`) with different middleware and event handlers.
- **Broadcasting**: `socket.broadcast.emit()` sends to all connected sockets except the sender. `io.emit()` sends to everyone.
- **Redis adapter**: When running multiple Node.js instances, the Redis adapter ensures messages broadcast across all instances. Without it, messages only reach sockets connected to the current instance.
- **Fallback**: Socket.io automatically falls back to HTTP long-polling if WebSocket is not available, ensuring compatibility with restrictive networks.

## Variants

| Feature | Method | Use When |
|---------|--------|----------|
| Broadcast to all | `io.emit()` | Global announcements |
| Broadcast excluding sender | `socket.broadcast.emit()` | Chat messages |
| Room messaging | `io.to(room).emit()` | Group channels |
| Namespace separation | `io.of("/namespace")` | Feature isolation |
| Private message | `io.to(socketId).emit()` | Direct messaging |
| Multi-instance | Redis adapter | Horizontal scaling |

## Guidelines

- Always handle the `disconnect` event to clean up user state.
- Use rooms for group messaging instead of iterating over connected sockets.
- Set CORS origins explicitly in production.
- Use the Redis adapter when running more than one Node.js instance.
- Validate and authenticate socket connections via middleware.
- Avoid sending large payloads over WebSockets. Use REST for bulk data.
- Implement rate limiting on socket events to prevent abuse.

## Common Mistakes

- Not cleaning up user state on disconnect. Users appear online forever.
- Using `io.emit()` when `socket.broadcast.emit()` is needed. Sender gets duplicate messages.
- Not setting CORS in production. Browser clients cannot connect.
- Running multiple instances without Redis adapter. Messages only reach sockets on one instance.
- Not handling reconnection events. Users lose their room memberships after reconnect.
- Emitting sensitive data to all sockets instead of specific rooms or users.

## Frequently Asked Questions

### How do I get the socket ID of a specific user?

Maintain a mapping of userId to socketId:

```javascript
const userSockets = new Map();

io.on("connection", (socket) => {
    socket.on("authenticate", (userId) => {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
    });

    socket.on("disconnect", () => {
        userSockets.delete(socket.userId);
    });
});

function sendToUser(userId, event, data) {
    const socketId = userSockets.get(userId);
    if (socketId) {
        io.to(socketId).emit(event, data);
    }
}
```

### How do I handle reconnection and rejoin rooms?

Listen to the `connect` event on the client and rejoin rooms:

```javascript
socket.on("connect", () => {
    socket.emit("join-room", currentRoom);
});
```

Socket.io handles reconnection automatically. The `connect` event fires after each successful reconnection.

### Socket.io vs raw WebSocket — which should I use?

Use Socket.io when you need auto-reconnection, rooms, namespaces, or fallback to long-polling. Use raw WebSocket (`ws` package) when you want minimal overhead, no extra dependencies, or need to interoperate with non-Socket.io clients.

### How do I limit the number of concurrent connections?

Use middleware to enforce limits:

```javascript
const MAX_CONNECTIONS = 1000;

io.use((socket, next) => {
    if (io.engine.clientsCount > MAX_CONNECTIONS) {
        return next(new Error("Server at capacity"));
    }
    next();
});
```
