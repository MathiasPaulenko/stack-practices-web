---
contentType: recipes
slug: server-sent-events-node
title: "Server-Sent Events con Node.js y Express"
description: "Implementa push en tiempo real de servidor a cliente usando Server-Sent Events en Node.js con Express, cubriendo gestion de conexiones, tipos de eventos, logica de reconexion y manejo de backpressure"
metaDescription: "Implementa Server-Sent Events en Node.js con Express. Push en tiempo real con gestion de conexiones, tipos de eventos, reconexion y manejo de backpressure."
difficulty: intermediate
topics:
  - api
  - frontend
tags:
  - sse
  - real-time
  - nodejs
  - express
relatedResources:
  - /recipes/api/websocket-bidirectional-chat
  - /recipes/messaging/kafka-event-streaming
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa Server-Sent Events en Node.js con Express. Push en tiempo real con gestion de conexiones, tipos de eventos, reconexion y manejo de backpressure."
  keywords:
    - server sent events
    - sse
    - nodejs
    - express
    - real time push
---

# Server-Sent Events con Node.js y Express

Server-Sent Events (SSE) provee un canal liviano unidireccional para push de actualizaciones en tiempo real del servidor al browser sobre HTTP. A diferencia de WebSockets, SSE usa HTTP estandar, auto-reconecta y funciona sin problemas con infraestructura existente como load balancers. Esta recipe cubre implementacion Express, tipos de eventos, gestion de conexiones y reconexion graceful del cliente.

## Cuando Usar Esto

- Dashboards en vivo, feeds de actividad o streams de notificacion necesitan actualizaciones iniciadas por el servidor
- Quieres push en tiempo real sin la complejidad de WebSockets bidireccionales
- La infraestructura HTTP existente (cache, auth, [LB](/recipes/api/nginx-reverse-proxy)) debe reutilizarse

## Solucion

### 1. Endpoint SSE de Express

```typescript
// sse/SSEEndpoint.ts
import express, { Request, Response } from 'express';

interface Client {
  id: string;
  response: Response;
  lastEventId: string | null;
}

class SSEManager {
  private clients = new Map<string, Client>();

  addClient(res: Response): string {
    const id = crypto.randomUUID();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`event: connected\nid: ${id}\ndata: ${JSON.stringify({ clientId: id })}\n\n`);

    this.clients.set(id, { id, response: res, lastEventId: null });
    res.on('close', () => this.removeClient(id));
    return id;
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      client.response.write(payload);
    });
  }

  sendTo(clientId: string, event: string, data: unknown): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  }
}

const sseManager = new SSEManager();

app.get('/events', (req: Request, res: Response) => {
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  const clientId = sseManager.addClient(res);

  if (lastEventId) {
    replayEvents(clientId, lastEventId);
  }
});
```

### 2. Protocolo de Eventos Tipado

```typescript
// sse/EventProtocol.ts
type SSEEvent =
  | { type: 'user:joined'; data: { userId: string; name: string } }
  | { type: 'user:left'; data: { userId: string } }
  | { type: 'notification'; data: { message: string; severity: 'info' | 'warning' | 'error' } }
  | { type: 'heartbeat'; data: { timestamp: number } };

function sendEvent(clientId: string, event: SSEEvent): void {
  sseManager.sendTo(clientId, event.type, event.data);
}

setInterval(() => {
  sseManager.broadcast('heartbeat', { timestamp: Date.now() });
}, 30000);
```

### 3. Conexion del Cliente

```typescript
// client/SSEClient.ts
class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  connect(url: string): void {
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.eventSource.addEventListener('user:joined', (e) => {
      const data = JSON.parse(e.data);
      console.log('Usuario conectado:', data.name);
    });

    this.eventSource.addEventListener('notification', (e) => {
      const data = JSON.parse(e.data);
      showToast(data.message, data.severity);
    });

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.scheduleReconnect(url);
    };
  }

  private scheduleReconnect(url: string): void {
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect(url);
    }, this.reconnectDelay);
  }

  disconnect(): void {
    this.eventSource?.close();
  }
}
```

### 4. Backpressure y Manejo de Errores

```typescript
// sse/BackpressureHandler.ts
class SafeSSEManager extends SSEManager {
  broadcastSafe(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      if (!client.response.writable) {
        deadClients.push(client.id);
        return;
      }
      const flushed = client.response.write(payload);
      if (!flushed) {
        client.response.once('drain', () => {});
      }
    });

    deadClients.forEach((id) => this.removeClient(id));
  }
}
```

## Como Funciona

- **Event stream** es una respuesta HTTP persistente con `Content-Type: text/event-stream`
- **API EventSource** en browsers auto-reconecta y parsea campos `event:`, `data:` e `id:`
- **Mensajes de heartbeat** previenen timeouts de proxy y detectan conexiones stale
- **Header Last-Event-ID** habilita replay de eventos perdidos despues de reconexion

## Consideraciones de Produccion

- Deshabilita buffering de respuesta en reverse proxies (nginx, HAProxy) para delivery inmediato
- Setea valores de timeout apropiados en load balancers para conexiones long-lived
- Monitorea conteo de conexiones para prevenir agotamiento de memoria bajo carga alta

## Errores Comunes

- No enviar heartbeats, causando desconexiones silenciosas detras de proxies
- Broadcastear payloads grandes a todos los clientes sin manejo de backpressure
- Almacenar todos los eventos en memoria para replay en lugar de usar buffer acotado o log persistente

## FAQ

**P: SSE vs WebSockets: cual elegir?**
R: Usa SSE para push de servidor a cliente sobre HTTP. Usa [WebSockets](/recipes/api/websocket-server) cuando necesites comunicacion verdaderamente bidireccional o datos binarios.

**P: Cuantas conexiones SSE concurrentes puede manejar un servidor Node.js?**
R: Miles por proceso, limitado por memoria y file descriptors del OS. Usa clustering o [patrones de service mesh](/patterns/design/ambassador-pattern-services) para escalado horizontal.
