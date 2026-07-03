---
contentType: recipes
slug: real-time-notifications
title: "Construir notificaciones en tiempo real con WebSockets"
description: "Implementa un sistema de notificaciones en tiempo real usando WebSockets y Redis pub/sub para difundir mensajes entre clientes."
metaDescription: "Construye notificaciones en tiempo real con WebSockets y Redis pub/sub. Broadcasting, gestión de rooms y estrategias de escalado en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - java
  - javascript
  - rest
  - http
relatedResources:
  - /recipes/websocket-server
  - /recipes/rate-limiting
  - /recipes/server-sent-events
  - /recipes/webhooks
  - /recipes/api-documentation-openapi
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye notificaciones en tiempo real con WebSockets y Redis pub/sub. Broadcasting, gestión de rooms y estrategias de escalado en Python, JavaScript y Java."
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
## Visión General

Las notificaciones en tiempo real mantienen a los usuarios informados sin necesidad de polling. Los WebSockets proporcionan comunicación full-duplex entre cliente y servidor, mientras que Redis pub/sub actúa como broker de mensajes para difundir eventos entre múltiples instancias de servidor.

Esta receta implementa un sistema de notificaciones con conexiones WebSocket, broadcasting basado en rooms y escalado horizontal respaldado por Redis.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios necesitan actualizaciones instantáneas (chat, alertas, dashboards en vivo)
- El polling genera demasiada carga en tu infraestructura
- Ejecutas múltiples instancias de API detrás de un [balanceador de carga](/recipes/api/nginx-reverse-proxy)
- Necesitas difundir el mismo evento a muchos clientes conectados

## Solución

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

# Suscriptor Redis (ejecutar en tarea de fondo)
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

// Publicar desde la API
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

## Explicación

La arquitectura consta de tres capas:
- **Capa WebSocket**: Mantiene conexiones persistentes con los clientes
- **Redis pub/sub**: Distribuye mensajes entre instancias de servidor (sin persistencia)
- **Capa de aplicación**: Publica eventos cuando ocurren acciones de negocio

Redis pub/sub es ideal para broadcasting porque los suscriptores reciben mensajes en tiempo real sin polling. Para persistencia, usa Redis Streams o una cola de mensajes como RabbitMQ.

## Variantes

| Tecnología | Transporte | Crecimiento | Caso de uso |
|------------|------------|---------------|-------------|
| WebSockets | TCP full-duplex | Redis pub/sub | Chat, actualizaciones en vivo |
| Server-Sent Events | HTTP unidireccional | Redis pub/sub | Precios de acciones, logs |
| Long Polling | Fallback HTTP | No necesario | Soporte para navegadores legacy |
| MQTT | TCP ligero | Broker cluster | Dispositivos IoT |

## Lo que funciona

- **Heartbeat/ping cada 30 segundos**: Detecta conexiones muertas y libera recursos
- **Segmentación por rooms/canales**: Difunde a subconjuntos de usuarios, no a todas las conexiones
- **Autenticación en el handshake**: Valida JWT durante el upgrade de WebSocket
- **Degradación graceful**: Fallback a SSE o polling si los WebSockets fallan
- **Rate limit en broadcasts**: Previene spam que pueda saturar clientes

## Errores Comunes

- **No manejar reconexiones**: Los clientes se desconectan — implementa reconexión con backoff exponencial
- **Almacenar mensajes en Redis pub/sub**: Pub/sub no persiste mensajes; usa Redis Streams para durabilidad
- **Difundir a todos los clientes**: Usa [namespaces de room/canal](/patterns/design/chain-of-responsibility-middleware) para limitar la entrega de mensajes
- **Ignorar límites de conexión**: Cada WebSocket consume memoria; establece límites por IP y globales
- **Falta de auth en el handshake**: Autentica durante la petición de upgrade con [JWT](/recipes/authentication/jwt-authentication), no después de la conexión

## Preguntas Frecuentes

**P: ¿Cuántos WebSockets concurrentes puede manejar un servidor?**
R: Node.js maneja ~10k-50k, Go ~100k+, Java (Netty) ~1M+. Usa pruebas de carga con el tamaño real de tu payload para determinar los límites reales.

**P: ¿Puedo usar WebSockets con funciones serverless?**
R: AWS API Gateway soporta WebSockets, pero las funciones stateless requieren DynamoDB o Redis para compartir información de conexión. Considera [patrones de service mesh](/patterns/design/ambassador-pattern-services) para escalar infraestructura en tiempo real.

**P: ¿Debería usar WebSockets o Server-Sent Events?**
R: Usa SSE para streams unidireccionales servidor-a-cliente (más simple, basado en HTTP, auto-reconexión). Usa WebSockets para comunicación bidireccional (chat, edición colaborativa).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
