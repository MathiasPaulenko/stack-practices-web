---
contentType: recipes
slug: websockets-realtime
title: "WebSockets para Comunicación en Tiempo Real"
description: "Construye comunicación bidireccional en tiempo real con WebSockets, manejando gestión de conexiones, reconexión y fallbacks."
metaDescription: "Comunicación en tiempo real con WebSockets: gestión de conexiones, estrategias de reconexión, fallbacks a SSE/long-polling y escalado de servidores WebSocket."
difficulty: intermediate
topics:
  - frontend
tags:
  - real-time
  - nodejs
  - frontend
relatedResources:
  - /recipes/server-sent-events-node
  - /recipes/websocket-bidirectional-chat
  - /patterns/mvc-pattern-frontend
  - /recipes/express-middleware-patterns
  - /recipes/url-encoding-decoding
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Comunicación en tiempo real con WebSockets: gestión de conexiones, estrategias de reconexión, fallbacks a SSE/long-polling y escalado de servidores WebSocket."
  keywords:
    - websocket
    - real-time
    - nodejs
    - frontend
---
## Visión General

WebSockets proveen comunicación full-duplex persistente entre navegadores y servidores sobre una sola conexión TCP. A diferencia del polling HTTP, los WebSockets habilitan flujo de datos en tiempo real con latencia mínima, haciéndolos ideales para chat, dashboards en vivo, juegos multijugador y edición colaborativa.

## Cuándo Usar

Usa este recurso cuando:
- Construyas aplicaciones de chat o sistemas de comentarios en vivo. Consulta [Event-Driven Functions](/recipes/messaging/event-driven-microservices) para manejo de eventos backend.
- Streamings de datos en tiempo real a dashboards (acciones, métricas, IoT). Consulta [Prometheus API Monitoring](/recipes/observability/prometheus-api-monitoring) para dashboards de métricas.
- Implementes sincronización de estado de juegos multijugador. Consulta [Cold Start Optimization](/recipes/performance/connection-pooling) para serverless de baja latencia.
- Crees herramientas de edición colaborativa (como Google Docs). Consulta [JavaScript Event Loop](/recipes/frontend/javascript-event-loop) para actualizaciones de UI non-blocking.

## Solución

### Servidor con ws (Node.js)

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'chat',
          from: message.user,
          text: message.text,
          timestamp: Date.now()
        }));
      }
    });
  });

  ws.on('close', () => clients.delete(ws));
});
```

### Lógica de Reconexión del Cliente

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 3000;
    this.maxReconnectInterval = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectInterval = 3000;
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 2,
        this.maxReconnectInterval
      );
    };
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
```

## Explicación

El handshake de WebSocket actualiza una conexión HTTP:

1. **El cliente envía un request de upgrade** con headers Connection: Upgrade y Upgrade: websocket
2. **El servidor responde 101 Switching Protocols** para confirmar
3. **Frames bidireccionales** se intercambian sobre el socket TCP persistente
4. **Handshake de cierre** termina la conexión limpiamente

**Diferencias clave con SSE**:
- WebSockets son bidireccionales; SSE es solo servidor-a-cliente
- WebSockets usan frames binarios; SSE usa text/event-stream
- WebSockets necesitan heartbeat/ping propio; SSE usa HTTP keep-alive

## Variantes

| Tecnología | Dirección | Ideal Para |
|------------|-----------|------------|
| WebSockets | Bidireccional | Chat, juegos, colaboración |
| SSE | Servidor-a-cliente | Feeds en vivo, notificaciones |
| Long Polling | Servidor-a-cliente | Soporte de navegadores legacy |
| MQTT sobre WebSocket | Pub/sub | IoT, telemetría |

## Lo que funciona

- **Implementa heartbeat/ping**: Detecta conexiones muertas con frames ping/pong periódicos
- **Autentica durante el handshake**: Pasa JWT en query string o subprotocolo
- **Usa rooms/canales**: No transmitas todo a todos los clientes
- **Maneja backpressure**: Descarta o encola mensajes si los clientes son lentos
- **Fallback a SSE**: Para clientes detrás de proxies estrictos que bloquean WebSockets

## Errores Comunes

1. **Sin lógica de reconexión**: Problemas de red desconectan permanentemente a los usuarios
2. **Broadcasting a todos**: No escala; usa pub/sub o salas de canal
3. **Ignorar fugas de memoria**: Conexiones cerradas no removidas del set de clientes causan OOM
4. **Enviar binario sin framing**: Siempre serializa datos estructurados (JSON, Protobuf)
5. **No manejar timeouts de proxy**: Proxies corporativos pueden matar conexiones inactivas después de 30s

## Preguntas Frecuentes

**P: ¿Cuántas conexiones WebSocket concurrentes puede manejar un servidor?**
R: Node.js maneja ~10k-50k conexiones por core. Usa Redis pub/sub o un message bus para escalar horizontalmente.

**P: ¿Funcionan WebSockets sobre HTTPS?**
R: Sí — usa wss:// (WebSocket Secure). Los navegadores bloquean ws:// mixto en páginas HTTPS.

**P: ¿Cuál es el mejor fallback si WebSockets están bloqueados?**
R: Server-Sent Events para servidor-a-cliente; HTTP long polling para necesidades bidireccionales.
