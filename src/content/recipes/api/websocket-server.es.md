---
contentType: recipes
slug: websocket-server
title: "Servidor WebSocket"
description: "Cómo construir un servidor WebSocket para comunicación en tiempo real bidireccional, con gestión de conexiones, broadcasting de mensajes y heartbeat keepalive."
metaDescription: "Aprende servidor WebSocket en Python, JavaScript y Java. Cubre mensajería bidireccional, gestión de conexiones y broadcasting."
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
  metaDescription: "Aprende servidor WebSocket en Python, JavaScript y Java. Cubre mensajería bidireccional, gestión de conexiones y broadcasting."
  keywords:
    - websocket
    - ws
    - tiempo-real
    - bidireccional
    - servidor
    - python
    - javascript
    - java
---
## Visión General

WebSockets proporcionan canales de comunicación full-duplex y bidireccionales sobre una única conexión TCP, permitiendo interacción en tiempo real entre navegadores y servidores. A diferencia de los ciclos de request/response de HTTP, una conexión WebSocket permanece abierta, permitiendo que ambas partes envíen mensajes en cualquier momento con overhead mínimo. Esta receta cubre la construcción de servidores WebSocket en Python, JavaScript (Node.js) y Java (Spring Boot), incluyendo gestión de conexiones, heartbeat keepalive, broadcasting de mensajes y mensajería basada en salas/canales.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas comunicación en tiempo real verdaderamente bidireccional (chat, edición colaborativa, juegos multijugador)
- Tu aplicación requiere updates de baja latencia en ambas direcciones (cliente → servidor y servidor → cliente)
- Quieres evitar el overhead del polling HTTP o la limitación unidireccional de SSE
- Necesitas enviar datos a clientes o grupos específicos (salas/canales) basado en lógica de negocio

## Solución

### Python (librería websockets)

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
    # Remover de todas las salas
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

### JavaScript (Node.js con ws)

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

### Java (Spring Boot con STOMP)

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

### Cliente del Navegador

```javascript
// Conexión básica
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

// Enviar mensaje de sala
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

## Explicación

- **Handshake de protocolo** — WebSockets comienzan como una petición HTTP con headers `Upgrade: websocket` y `Connection: Upgrade`. El servidor devuelve una respuesta `101 Switching Protocols`, tras lo cual la conexión TCP transiciona al protocolo de framing binario de WebSocket.
- **Gestión de conexiones** — mantén un registro de conexiones activas (usando sets o maps). Cuando un cliente se desconecta (gracefulmente o por fallo de red), remueve la conexión de tu registro para prevenir fugas de memoria y broadcasts fantasma.
- **Heartbeat keepalive** — las conexiones WebSocket pueden ser silenciosamente cerradas por proxies, gateways NAT o balanceadores de carga sin que ningún lado lo note. Implementa `ping`/`pong` periódicos (cada 30 segundos) o heartbeats a nivel de aplicación para detectar conexiones muertas y cerrarlas apropiadamente.
- **Arquitectura de salas/canales** — mapea nombres de sala a sets de conexiones. Cuando un mensaje apunta a una sala, itera solo sobre los miembros de esa sala en lugar de hacer broadcast a todos los clientes conectados. Esto reduce significativamente el ancho de banda y el overhead de procesamiento para despliegues grandes.

## Variantes

| Framework | Características de Protocolo | Mejor Para |
|-----------|------------------------------|------------|
| Python `websockets` | WebSocket raw, asyncio | Microservicios, protocolos custom |
| Node.js `ws` | WebSocket raw, alto rendimiento | Juegos en tiempo real, chat a escala |
| Spring Boot STOMP | Sub-protocolo sobre WebSocket | Apps enterprise, mensajería pub/sub |
| Socket.IO | WebSocket + fallback HTTP | Apps de navegador que necesitan fallback |
| AWS API Gateway | WebSocket gestionado | Arquitecturas serverless |

## Mejores Prácticas

1. **Siempre maneja errores de conexión** — fallos de red, crashes de clientes y timeouts de proxies pueden dejar conexiones stale. Envuelve operaciones de send en try/catch, maneja callbacks `onError`, e implementa limpieza basada en heartbeat.
2. **Autentica durante el handshake** — pasa tokens de autenticación via query parameters o cookies durante la petición de upgrade WebSocket. No intentes autenticar sobre el canal de mensajes WebSocket después de conectar; el handshake inicial es el punto más seguro.
3. **Valida todos los mensajes entrantes** — los payloads WebSocket no son confiables. Valida esquema JSON, sanitiza inputs, impone límites de tamaño de mensaje, y rate-limita clientes para prevenir ataques DoS via mensajes de gran tamaño o alta frecuencia.
4. **Usa salas para entrega dirigida** — en lugar de hacer broadcast de cada mensaje a todos los clientes, organiza clientes en salas/canales basado en lógica de aplicación (salas de chat, IDs de documento, grupos de usuarios). Esto reduce carga del servidor y filtrado del lado del cliente.
5. **Implementa lógica de reconexión en el cliente** — los navegadores no reconectan WebSockets automáticamente. Envuelve tu instancia `WebSocket` en un manager que detecta desconexiones, usa backoff exponencial, y rejoins salas después de la reconexión.

## Errores Comunes

1. Hacer broadcast de cada mensaje a todos los clientes conectados en lugar de usar salas, causando uso innecesario de ancho de banda y ruido del lado del cliente.
2. No implementar heartbeat keepalive, lo que produce fugas de conexión silenciosas donde el servidor cree que conexiones muertas siguen activas.
3. Enviar datos binarios sin verificar `ws.binaryType` del lado del cliente, causando confusión de parsing entre `Blob` y `ArrayBuffer` en JavaScript.
4. Asumir que las conexiones WebSocket están autenticadas simplemente porque pasaron por un endpoint HTTP autenticado. Los upgrades WebSocket son peticiones separadas; siempre verifica tokens de auth en el handshake de upgrade.
5. Olvidar manejar backpressure. Si un cliente es lento consumiendo mensajes (red lenta, CPU ocupada), el encolamiento ilimitado de mensajes en el servidor eventualmente agotará la memoria. Implementa flow control o descarta mensajes antiguos.

## Preguntas Frecuentes

### ¿Cuántas conexiones WebSocket concurrentes puede manejar un servidor?

Depende del lenguaje, framework y hardware. Node.js con `ws` puede manejar 10.000–50.000 conexiones en un único proceso. Python con `websockets` (asyncio) típicamente maneja 1.000–10.000. Java (Netty/Spring) puede escalar a 100.000+ con tuning apropiado. El escalado horizontal con sesiones sticky o pub/sub compartido (Redis) es necesario para despliegues verdaderamente masivos.

### ¿Debo usar WebSockets raw o una librería como Socket.IO?

Usa WebSockets raw si necesitas máximo control, overhead mínimo o framing custom. Usa Socket.IO si necesitas fallback automático a HTTP long-polling (para proxies que bloquean WebSockets), gestión integrada de salas, lógica de reconexión y manejo de heartbeats. Socket.IO añade ~20KB del lado del cliente y algo de overhead de protocolo.

### ¿Cómo escalo servidores WebSocket horizontalmente?

No puedes hacer broadcast entre múltiples instancias de servidor sin un bus de mensajes compartido. Usa Redis Pub/Sub, RabbitMQ o un servicio gestionado (AWS API Gateway, Pusher, Ably) para distribuir mensajes entre todas las instancias de servidor. Los clientes conectados al Servidor A deben recibir mensajes enviados por clientes en el Servidor B vía este bus compartido.
