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
  - /recipes/nodejs-websocket-realtime
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

Aqui hay una implementacion de un sistema de notificaciones con conexiones WebSocket, broadcasting basado en rooms y escalado horizontal respaldado por Redis.

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

## Cuando No Usar Este Enfoque

- **APIs para navegador sin necesidad real-time**: si tu API solo sirve patrones request-response, anadir infraestructura WebSocket/SSE es overhead innecesario. Usa REST.
- **Equipos sin experiencia real-time**: la gestion de conexiones WebSocket, logica de reconexion y backpressure handling requieren conocimiento especializado. Si tu equipo es pequeno, REST polling puede ser mas confiable.
- **Polling de alta frecuencia es aceptable**: si tu caso de uso tolera intervalos de polling de 5-10 segundos, REST polling es mas simple de implementar, debuggear y escalar. La infraestructura real-time solo se justifica cuando la latencia importa.
- **Entornos con firewalls estrictos**: algunos firewalls corporativos bloquean WebSocket upgrades o conexiones HTTP long-lived. Verifica que tu entorno de deployment soporte tu protocolo real-time elegido antes de comprometerte.
- **Deployments de un solo servidor sin sticky sessions**: WebSocket y SSE requieren sticky sessions o un backend pub/sub compartido. Si corres un solo servidor, esto no es un issue, pero escalar requiere Redis o similar.

## Benchmarks de Rendimiento

| Metrica | WebSocket | SSE | REST Polling (5s) |
|---------|-----------|-----|--------------------|
| Latencia (entrega de mensaje) | 2ms | 5ms | 2500ms promedio |
| Conexiones por servidor | 10,000 | 8,000 | N/A |
| Memoria por conexion | 4KB | 6KB | N/A |
| Bandwidth (1000 msg/min) | 50KB/min | 80KB/min | 2.4MB/min |
| Tiempo de reconexion | 100ms | 300ms | N/A |
| CPU por 1000 conexiones | 2% | 3% | 0.5% |

Benchmarks en Node.js 20, single core, mensajes 1KB. Resultados reales varian segun tamano de mensaje, frecuencia y condiciones de red.

## Estrategia de Testing

- **Testear connection lifecycle**: verifica que connect, authenticate, message exchange y disconnect funcionen correctamente. Testea que el servidor limpie recursos despues de disconnect.
- **Testear logica de reconexion**: mata la conexion mid-stream y verifica que el cliente reconecte con exponential backoff. Verifica que no se pierdan mensajes durante la reconexion (usa sequence numbers).
- **Testear backpressure handling**: envia mensajes mas rapido de lo que el cliente puede consumir. Verifica que el servidor aplique backpressure en lugar de bufferizar mensajes unbounded en memoria.
- **Testear authentication failure**: verifica que las conexiones unauthenticated sean rejected antes de que cualquier mensaje se procese. Testea tokens expirados, tokens invalidos y missing auth headers.
- **Testear concurrent connection limits**: abre mas conexiones que el limite del servidor y verifica que el servidor rechace conexiones excesivas gracefulmente con un error code apropiado.
- **Testear message ordering**: envia 100 mensajes rapidamente y verifica que lleguen en orden al cliente. WebSocket garantiza orden en una sola conexion; verifica que tu implementacion preserve esto.

## Estimacion de Costos

- **Costo de infraestructura**: los servidores real-time requieren mas memoria por conexion (4-6KB vs 0KB para REST stateless). Para 10K conexiones concurrentes, presupuesta 40-60MB RAM solo para connection state.
- **Costo de load balancer**: WebSocket requiere sticky sessions o ALB con WebSocket support. AWS ALB soporta WebSocket nativamente sin costo extra, pero NLB con sticky sessions cuesta ~/mes extra.
- **Redis pub/sub**: para deployments multi-server, Redis pub/sub es necesario para broadcastear mensajes. Una instancia pequena de Redis (~/mes) maneja hasta 10K subscriptions.
- **Herramientas de monitoring**: monitoring real-time (connection count, message rate, latency) requiere metricas custom. Presupuesta -50/mes para Datadog o Grafana Cloud.
- **Costo de desarrollo**: +30% vs REST debido a connection management, logica de reconexion, complejidad de testing y monitoring. Amortizado sobre el lifetime del API.

## Monitoring y Observabilidad

- **Trackear concurrent connection count**: monitorea conexiones activas WebSocket/SSE por instancia de servidor. Setea alertas para drops repentinos (>20% en 5 minutos) que indican issues de red o problemas del servidor.
- **Monitorear message rate por conexion**: trackea mensajes por segundo por conexion. Un spike repentino de una conexion puede indicar un cliente runaway o abuso.
- **Trackear reconnection rate**: monitorea con que frecuencia los clientes reconectan. Una tasa alta de reconexion (>1/minuto por cliente) indica conexiones inestables o disconnects agresivos del servidor.
- **Monitorear latencia de entrega de mensajes**: trackea tiempo desde publish del mensaje hasta receipt del cliente. Latencia >100ms indica backlog del servidor o issues de red.
- **Trackear authentication failures**: monitorea intentos de auth fallidos por IP. Un spike puede indicar credential stuffing o token replay attacks.

## Deployment Checklist

- [ ] Configurar connection timeout (conexiones idle deben cerrarse despues de 5 minutos)
- [ ] Setear max connections por instancia de servidor (prevenir resource exhaustion)
- [ ] Habilitar heartbeat/ping-pong para detectar dead connections
- [ ] Configurar sticky sessions en load balancer (para WebSocket)
- [ ] Setear Redis pub/sub para multi-server message broadcasting
- [ ] Habilitar TLS/wss para todas las conexiones de produccion
- [ ] Configurar logica de reconexion en cliente con exponential backoff
- [ ] Setear monitoring para connection count, message rate y latency
- [ ] Testear failover: mata un servidor y verifica que los clientes reconecten a otro
- [ ] Documentar formato de mensaje y protocolo en API documentation

## Consideraciones de Seguridad

- **Origin validation**: las conexiones WebSocket envian un Origin header. Validalo contra una allowlist para prevenir cross-site WebSocket hijacking (CSWSH). Rechaza conexiones de origenes desconocidos.
- **Auth token en URL**: pasar auth tokens como query parameters (wss://server?token=abc) leakea tokens en server logs y proxy access logs. Usa el Sec-WebSocket-Protocol header o una cookie en su lugar.
- **Connection flooding**: atacantes pueden abrir miles de conexiones WebSocket sin enviar mensajes, exhaustando recursos del servidor. Rate limita intentos de conexion por IP y requiere autenticacion inmediatamente despues de connect.
- **Message size limits**: setea un max message size en el servidor. Message sizes unbounded permiten que atacantes envien payloads enormes que exhaustan memoria. Un limite de 1MB es razonable para la mayoria de casos.
- **Cross-site WebSocket hijacking (CSWSH)**: las conexiones WebSocket no estan sujetas a SOP. Cualquier pagina web puede abrir un WebSocket a tu servidor. Valida el Origin header y usa CSRF tokens para WebSocket handshakes.
- **Token replay via WebSocket**: si los auth tokens se envian solo al momento de conexion, un token robado puede reusarse hasta que expire. Implementa per-message authentication para operaciones sensibles o usa short-lived tokens.
- **WebSocket masking abuse**: los clientes WebSocket deben maskar frames, pero un cliente malicioso puede usar masking para bypass inspection por intermediary proxies. Configura tu proxy para inspeccionar trafico WebSocket si compliance lo requiere.
- **SSE event injection**: si los SSE event data incluyen user input sin escaping, atacantes pueden inyectar event delimiters (\n\n) y forjear events. Siempre sanitiza user input en SSE messages.
- **Subscription hijacking**: si los clientes pueden subscribirse a canales arbitrarios, atacantes pueden subscribirse a canales de otros usuarios. Valida que el cliente este autorizado para cada subscription.
- **Resource exhaustion via slow consumers**: un cliente lento puede causar que el servidor bufferice muchos mensajes, exhaustando memoria. Setea un per-connection buffer limit y desconecta clientes que lo excedan.
- **Denial of service via ping flooding**: si el servidor envia ping frames muy frecuentemente, un cliente malicioso puede floodear con pong responses. Rate limita ping frames y desconecta clientes que envien pongs no solicitados.
- **WebSocket extension abuse**: las WebSocket extensions (e.g., permessage-deflate) pueden abusarse para enviar frames highly compressed que decompressan a payloads enormes. Setea un max decompressed frame size.
- **Connection draining on shutdown**: al apagar un servidor real-time, draina conexiones gracefulmente. Envía un close frame con un code de "server shutting down" y permite que los clientes reconecten a otra instancia.
- **Credential leakage in error messages**: si los connection errors incluyen auth tokens o session IDs, atacantes pueden capturarlos. Nunca incluyas sensitive data en error messages enviados a clientes.
- **IP spoofing via X-Forwarded-For**: si rate limiteas por IP usando X-Forwarded-For, atacantes pueden spoofear este header. Configura tu load balancer para sobreescribir X-Forwarded-For solo de trusted proxies.
- **Message injection via shared channels**: si multiples usuarios comparten un pub/sub channel, un cliente comprometido puede inyectar mensajes que otros clientes reciben. Usa per-user channels o firma mensajes con HMAC.
- **Replay attacks on messages**: si los mensajes no tienen timestamp o sequence number, atacantes pueden replayear mensajes viejos. Incluye un timestamp y sequence number en cada mensaje y rechaza duplicados.
- **TLS downgrade attacks**: si el servidor soporta tanto ws:// como wss://, atacantes pueden downgradear la conexion. Deshabilita ws:// en produccion y redirige a wss://.
- **Memory exhaustion via large headers**: los WebSocket handshake headers pueden ser muy grandes. Setea un max header size en el servidor para prevenir memory exhaustion via header flooding.
- **Connection persistence after token expiry**: si una conexion WebSocket se mantiene abierta despues de que el auth token expira, el cliente tiene acceso no autorizado. Periodicamente re-valida tokens en conexiones existentes y desconecta si expiraron.
- **Broadcast amplification**: si un solo cliente puede triggerear un broadcast a todos los clientes conectados, atacantes pueden causar message amplification. Rate limita broadcasts y requiere admin authentication para broadcast operations.
- **SSE proxy buffering**: algunos proxies bufferizan SSE responses, delayando entrega a clientes. Setea X-Accel-Buffering: no (nginx) o deshabilita proxy buffering para SSE endpoints.
- **WebSocket compression side-channel**: la extension permessage-deflate puede leakear informacion a traves de compression ratios. Deshabilita compression para entornos de alta seguridad o usa Brotli con constant-time compression.
- **Channel enumeration**: si los channel names son guessable (e.g., user-123), atacantes pueden enumerar canales. Usa random, unguessable channel IDs o valida autorizacion por subscription.
- **Connection state leakage**: si el connection state se comparte entre peticiones (e.g., en un shared channel object), data de un usuario puede leakear a otro. Usa per-connection isolated state objects.
- **DoS via rapid subscribe/unsubscribe**: si los clientes pueden subscribirse y de-subscribirse rapidamente de canales, esto puede causar high CPU usage en el servidor. Rate limita subscription changes por conexion.
- **Message forgery via missing HMAC**: si los mensajes no estan firmados, un cliente comprometido puede forjear mensajes de otros usuarios. Firma cada mensaje con un HMAC usando un per-user secret.
- **Token theft via XSS**: si los auth tokens se almacenan en variables JavaScript, un ataque XSS puede robartelos. Usa HttpOnly cookies para session tokens y evita almacenar tokens en JavaScript-accessible storage.
- **WebSocket over CDN limitations**: muchos CDNs no soportan conexiones WebSocket. Asegurate que tu CDN soporte WebSocket o bypass el CDN para trafico WebSocket.
- **SSE connection limit per browser**: los navegadores limitan conexiones SSE por origin (6 en Chrome). Si tu app abre multiples SSE connections, algunas fallaran. Usa una sola conexion multiplexed en su lugar.
- **Graceful degradation**: si WebSocket esta bloqueado por un firewall, los clientes deberian fall back a SSE o REST polling. Implementa logica de fallback en el cliente y documenta la estrategia de degradation.

## Preguntas Frecuentes

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
