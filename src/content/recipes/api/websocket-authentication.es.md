---
contentType: recipes
slug: websocket-authentication
title: "Autenticacion y Patrones de Seguridad para WebSockets"
description: "Como autenticar conexiones WebSocket, implementar validacion de tokens y manejar autorizacion para mensajeria en tiempo real en produccion"
metaDescription: "Autenticacion y seguridad para WebSockets. Valida tokens en conexion, implementa autorizacion basada en salas y previene acceso en tiempo real no autorizado."
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
  metaDescription: "Autenticacion y seguridad para WebSockets. Valida tokens en conexion, implementa autorizacion basada en salas y previene acceso en tiempo real no autorizado."
  keywords:
    - websockets
    - authentication
    - real-time security
    - token validation
    - room authorization
---

# Autenticacion y Patrones de Seguridad para WebSockets

Las conexiones WebSocket son persistentes y stateful, lo que hace la autenticacion y autorizacion diferente de REST. Los tokens deben validarse durante el handshake, y los mensajes continuous deben verificarse contra permisos basados en salas para prevenir acceso en tiempo real no autorizado.

## Cuando Usar Esto

- Necesitas identificar usuarios en una conexion WebSocket persistente
- Diferentes usuarios deben ver datos en tiempo real distintos segun permisos
- Quieres prevenir secuestro de conexion y ataques de replay

## Requisitos Previos

- Un servidor WebSocket (Node.js ws, Socket.io, o Deno)
- Sistema de autenticacion basado en JWT o sesiones ya implementado

## Solucion

### 1. Validacion de Token en Handshake

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
    console.log(`Usuario ${user.id} conectado`);
  } catch {
    ws.close(1008, 'Token invalido');
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

### 2. Autorizacion Basada en Salas

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
        ws.send(JSON.stringify({ type: 'error', message: 'Acceso denegado' }));
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

### 3. Rate Limiting por Conexion

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

// En handleMessage:
if (!limiter.canSend(ws.userId)) {
  ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
  return;
}
```

## Como Funciona

1. **Validacion de Handshake** rechaza conexiones antes de que se establezcan
2. **Autorizacion de Salas** enforcea que los usuarios solo reciban datos que pueden ver
3. **Rate Limiting** previene que una sola conexion inunde el servidor
4. **Desconexion Graceful** limpia membresias de salas para prevenir memory leaks

## Consideraciones de Produccion

- Usa **Redis Pub/Sub** para broadcast entre multiples instancias de servidor WebSocket
- Implementa **heartbeat/ping-pong** para detectar y limpiar conexiones stale
- Loggea eventos de conexion para auditoria de seguridad y debugging
- Considera **Socket.io** para reconexion automatica y manejo de salas

## FAQ

**P: Debo usar JWT o cookies de sesion para auth de WebSocket?**
R: JWT es mas facil para conexiones cross-domain. Las cookies de sesion funcionan bien si WebSocket y API HTTP comparten el mismo origen.

**P: Como manejo expiracion de token durante una conexion persistente?**
R: Envia un refresh token sobre la conexion existente o implementa un silent refresh antes de la expiracion.

**P: Puedo usar el mismo middleware de auth para HTTP y WebSocket?**
R: Parcialmente. La logica de validacion puede compartirse, pero WebSocket requiere extraer el token de query parameters o headers durante el handshake.
