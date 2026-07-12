---




contentType: recipes
slug: websocket-bidirectional-chat
title: "Construye un Chat Bidireccional con WebSocket y Node.js"
description: "Como construir una aplicacion de chat en tiempo real bidireccional usando WebSocket con mensajeria basada en salas, tracking de presencia y persistencia de mensajes"
metaDescription: "Chat bidireccional con WebSocket y Node.js. Construye mensajeria en tiempo real con delivery por salas, tracking de presencia y persistencia de mensajes para produccion."
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
  - /recipes/websocket-authentication
  - /recipes/server-sent-events-go
  - /recipes/nodejs-websocket-realtime
  - /recipes/server-sent-events-node
  - /recipes/websockets-realtime
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Chat bidireccional con WebSocket y Node.js. Construye mensajeria en tiempo real con delivery por salas, tracking de presencia y persistencia de mensajes para produccion."
  keywords:
    - websocket chat
    - bidirectional communication
    - real time messaging
    - socket.io
    - node.js




---

# Construye un Chat Bidireccional con WebSocket y Node.js

La comunicacion bidireccional permite tanto al cliente como al servidor enviar mensajes en cualquier momento. Una aplicacion de chat demuestra este patron perfectamente: los usuarios envian mensajes al servidor, que luego los difunde a otros participantes en la misma sala. WebSocket es el transporte ideal para esto porque mantiene una conexion persistente de baja latencia.

## Cuando Usar Esto

- Necesitas mensajeria en tiempo real donde ambos lados pueden iniciar comunicacion
- Los indicadores de presencia y de escritura deben actualizarse instantaneamente
- El delivery de mensajes requiere acknowledgments y garantias de orden

## Requisitos Previos

- Node.js 18+ con libreria `ws` o Socket.io
- [Redis](/recipes/api/real-time-notifications) para broadcast de mensajes multi-servidor

## Solucion

### 1. Servidor WebSocket con Salas

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
    content: `Unido a sala ${client.roomId}`,
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

    // Persistir en base de datos
    await saveMessage(client.roomId, message);

    // Broadcast a sala
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

### 2. Broadcast Multi-Servidor con Redis

```typescript
// server/redis-broadcast.ts
const subscriber = redis.duplicate();

subscriber.subscribe('chat:messages', (err) => {
  if (err) console.error('Error de suscripcion Redis:', err);
});

subscriber.on('message', (channel, message) => {
  const payload = JSON.parse(message);
  broadcastToRoom(payload.roomId, payload.message);
});

async function publishMessage(roomId: string, message: object) {
  await redis.publish('chat:messages', JSON.stringify({ roomId, message }));
}
```

### 3. Cliente React con Reconexion

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
      // Reconectar con backoff exponencial
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

### 4. Indicadores de Escritura

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

## Como Funciona

1. **Conexion WebSocket** establece un canal full-duplex persistente
2. **Gestion de Salas** agrupa conexiones por sala de chat para broadcast dirigido
3. **Redis Pub/Sub** sincroniza mensajes entre multiples instancias de servidor
4. **Tracking de Presencia** mantiene una lista actualizada de participantes activos
5. **Logica de Reconexion** asegura que clientes se recuperen automaticamente de issues de red

## Consideraciones de Produccion

- Usa **Socket.io** para reconexion automatica, heartbeat y manejo de salas
- Implementa [rate limiting](/recipes/api/api-rate-limiting-redis) por usuario para prevenir spam
- Almacena mensajes en base de datos persistente con [paginacion](/recipes/api/pagination) para historial
- Agrega **encriptacion end-to-end** para conversaciones sensitivas

## Errores Comunes

- No manejar reconexion de WebSocket, causando que usuarios caigan en blips de red
- Broadcastear a todos los clientes conectados en lugar de filtrar por sala
- No persistir mensajes, llevando a perdida de datos en reinicio de servidor

## FAQ

**P: Deberia usar WebSocket raw o Socket.io?**
R: [Socket.io](/recipes/api/websocket-server) para la mayoria de aplicaciones. Maneja reconexion, fallbacks y gestion de salas automaticamente. WebSocket raw es mas ligero pero requiere mas codigo custom.

**P: Como escalo WebSocket a multiples servidores?**
R: Usa Redis Pub/Sub o un broker de mensajes para difundir mensajes entre todas las instancias de servidor.

**P: Puedo usar WebSocket sobre HTTP/2?**
R: WebSocket usa su propio protocolo, no HTTP/2. Para ambientes HTTP/2, considera Server-Sent Events para servidor-a-cliente y peticiones HTTP para cliente-a-servidor.

### ¿Cómo manejo el orden de mensajes con WebSocket?

WebSocket no garantiza el orden de mensajes entre reconexiones. Asigna un número de secuencia a cada mensaje en el servidor. En el cliente, bufferiza los mensajes fuera de orden y entregalos en secuencia. Para orden estricto, usa una cola de mensajes del lado servidor (Redis Streams, Kafka) y acuse cada mensaje antes de enviar el siguiente.

### ¿Cómo testeo conexiones WebSocket en CI?

Usa el cliente de la librería `ws` en tests de Node.js. Conéctate al servidor, envía un mensaje y aserta la respuesta. Para load testing, usa Artillery o k6 con escenarios WebSocket. Mockea el servidor WebSocket en tests unitarios usando `mock-socket` para evitar iniciar un servidor real.

### ¿Cómo implemento detección de presencia (estado online/offline)?

Rastrea las conexiones de usuarios en un `Map<userId, Set<ws>>` en el servidor. Al conectar, agrega el socket y broadcastea un evento `presence:online` a las salas del usuario. Al desconectar (escucha `ws.on('close')`), remueve el socket y broadcastea `presence:offline` si no quedan sockets para ese usuario. Usa un intervalo heartbeat ping/pong (30 segundos) para detectar conexiones stale. Limpia sockets muertos en el handler del intervalo para prevenir memory leaks.

### ¿Cuál es el número máximo de conexiones WebSocket concurrentes?

Node.js puede manejar aproximadamente 10.000-25.000 conexiones WebSocket concurrentes por proceso, dependiendo de la frecuencia de mensajes y tamaño del payload. Para escalar más allá, usa un cluster de procesos Node.js detrás de un load balancer con sticky sessions. Usa Redis Pub/Sub para broadcastear mensajes entre procesos. Para deployments más grandes, considera gateways WebSocket dedicados como Centrifugo o servicios managed como AWS API Gateway WebSocket.

### ¿Cómo manejo backpressure cuando un cliente es lento?

Las conexiones WebSocket pueden bufferizar mensajes si el cliente lee más lento de lo que el servidor envía. Monitorea `ws.bufferedAmount` — cuando excede un umbral (ej., 1MB), pausa el envío y reanuda una vez que el cliente drena el buffer. Para chat basado en salas, descarta mensajes no críticos (como indicadores de typing) bajo backpressure y encola mensajes importantes (como mensajes de chat) para entrega posterior. Implementa un check de `highWaterMark` antes de cada broadcast para evitar memory exhaustion. Loggea eventos de backpressure para identificar clientes lentos que pueden necesitar ser desconectados o rate-limited.

Para deployments multi-server, usa un store compartido de backpressure (Redis) para que todas las instancias sepan qué clientes están saturados.

Desconecta clientes que permanezcan saturados más allá de un timeout (ej., 30 segundos) para proteger la estabilidad del servidor.
