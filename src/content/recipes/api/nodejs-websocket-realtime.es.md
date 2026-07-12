---





contentType: recipes
slug: nodejs-websocket-realtime
title: "Comunicación WebSocket en Tiempo Real con Socket.io en"
description: "Construye aplicaciones WebSocket en tiempo real en Node.js con Socket.io"
metaDescription: "Construye apps WebSocket en tiempo real en Node.js con Socket.io. Cubre rooms, namespaces, broadcasting, reconexión, autenticación y escalado con Redis adapter."
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
  - /recipes/real-time-notifications
  - /recipes/redis-pub-sub-python
  - /recipes/javascript-fetch-retry-logic
  - /recipes/python-async-http-requests
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Construye apps WebSocket en tiempo real en Node.js con Socket.io. Cubre rooms, namespaces, broadcasting, reconexión, autenticación y escalado con Redis adapter."
  keywords:
    - nodejs websocket socket.io
    - socket.io rooms
    - socket.io namespaces
    - realtime communication nodejs
    - socket.io redis adapter
    - websocket reconnection





---

## Visión General

La comunicación WebSocket en tiempo real permite el intercambio instantáneo de datos entre servidor y clientes. Socket.io provee una capa robusta sobre WebSockets con auto-reconexión, rooms, namespaces y broadcasting. Esta recipe cubre la configuración de Socket.io con Express, rooms para mensajería grupal, namespaces para separación, middleware de autenticación y escalado con Redis adapter.

## Cuándo Usar


- For alternatives, see [Express.js Middleware Composition Patterns](/es/recipes/express-middleware-patterns/).

- Estás construyendo una aplicación de chat, sistema de notificaciones o dashboard en vivo
- Necesitas push del servidor al cliente sin polling
- Quieres broadcasting basado en rooms (ej., enviar mensajes solo a usuarios en un canal específico)
- Necesitas escalar conexiones WebSocket a través de múltiples instancias de Node.js

## Solución

### Servidor Socket.io básico con Express

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

### Conexión del lado del cliente

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

### Rooms para mensajería grupal

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

### Namespaces para separación

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

### Middleware de autenticación

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
    if (token === "valid-token") {
        return { userId: 1, username: "alice" };
    }
    throw new Error("Invalid token");
}
```

### Escalado con Redis adapter

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

### Aplicación de chat completa

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

## Explicación

Socket.io envuelve el protocolo WebSocket con características adicionales:

- **Auto-reconexión**: Si la conexión cae, el cliente reintenta automáticamente con backoff exponencial. Puedes configurar intentos y delays.
- **Rooms**: Los sockets pueden unirse a rooms nombrados. `socket.to(room).emit()` envía a todos los sockets en ese room excepto al remitente. `io.to(room).emit()` envía a todos incluyendo al remitente.
- **Namespaces**: Canales separados en el mismo servidor. Útiles para dividir features (ej., `/chat` y `/admin`) con diferentes middleware y handlers.
- **Broadcasting**: `socket.broadcast.emit()` envía a todos los sockets conectados excepto al remitente. `io.emit()` envía a todos.
- **Redis adapter**: Cuando ejecutas múltiples instancias de Node.js, el Redis adapter asegura que los mensajes se transmitan entre todas las instancias. Sin él, los mensajes solo llegan a los sockets conectados a la instancia actual.
- **Fallback**: Socket.io automáticamente hace fallback a HTTP long-polling si WebSocket no está disponible, asegurando compatibilidad con redes restrictivas.

## Variantes

| Feature | Método | Usar Cuando |
|---------|--------|-------------|
| Broadcast a todos | `io.emit()` | Anuncios globales |
| Broadcast excluyendo remitente | `socket.broadcast.emit()` | Mensajes de chat |
| Mensajería por room | `io.to(room).emit()` | Canales grupales |
| Separación por namespace | `io.of("/namespace")` | Aislamiento de features |
| Mensaje privado | `io.to(socketId).emit()` | Mensajería directa |
| Multi-instancia | Redis adapter | Escalado horizontal |

## Pautas

- Siempre maneja el evento `disconnect` para limpiar el estado del usuario.
- Usa rooms para mensajería grupal en vez de iterar sobre sockets conectados.
- Configura los orígenes CORS explícitamente en producción.
- Usa el Redis adapter cuando ejecutes más de una instancia de Node.js.
- Valida y autentica conexiones de socket vía middleware.
- Evita enviar payloads grandes por WebSockets. Usa REST para datos masivos.
- Implementa rate limiting en eventos de socket para prevenir abuso.

## Errores Comunes

- No limpiar el estado del usuario al desconectar. Los usuarios aparecen online para siempre.
- Usar `io.emit()` cuando se necesita `socket.broadcast.emit()`. El remitente recibe mensajes duplicados.
- No configurar CORS en producción. Los clientes del navegador no pueden conectarse.
- Ejecutar múltiples instancias sin Redis adapter. Los mensajes solo llegan a sockets de una instancia.
- No manejar eventos de reconexión. Los usuarios pierden sus membresías de room tras reconectar.
- Emitir datos sensibles a todos los sockets en vez de rooms o usuarios específicos.

## Preguntas Frecuentes

### ¿Cómo obtengo el socket ID de un usuario específico?

Mantén un mapeo de userId a socketId:

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

### ¿Cómo manejo la reconexión y el reingreso a rooms?

Escucha el evento `connect` en el cliente y vuelve a unirte a los rooms:

```javascript
socket.on("connect", () => {
    socket.emit("join-room", currentRoom);
});
```

Socket.io maneja la reconexión automáticamente. El evento `connect` se dispara después de cada reconexión exitosa.

### ¿Socket.io o WebSocket puro — cuál debería usar?

Usa Socket.io cuando necesites auto-reconexión, rooms, namespaces o fallback a long-polling. Usa WebSocket puro (paquete `ws`) cuando quieras overhead mínimo, sin dependencias extra, o necesites interoperar con clientes no-Socket.io.

### ¿Cómo limito el número de conexiones concurrentes?

Usa middleware para imponer límites:

```javascript
const MAX_CONNECTIONS = 1000;

io.use((socket, next) => {
    if (io.engine.clientsCount > MAX_CONNECTIONS) {
        return next(new Error("Server at capacity"));
    }
    next();
});
```
