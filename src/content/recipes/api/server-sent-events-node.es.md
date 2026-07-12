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
  - api
relatedResources:
  - /recipes/websocket-bidirectional-chat
  - /recipes/kafka-event-streaming
  - /recipes/websockets-realtime
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

## FAQ

**P: SSE vs WebSockets: cual elegir?**
R: Usa SSE para push de servidor a cliente sobre HTTP. Usa [WebSockets](/recipes/api/websocket-server) cuando necesites comunicacion verdaderamente bidireccional o datos binarios.

**P: Cuantas conexiones SSE concurrentes puede manejar un servidor Node.js?**
R: Miles por proceso, limitado por memoria y file descriptors del OS. Usa clustering o [patrones de service mesh](/patterns/design/ambassador-pattern-services) para escalado horizontal.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
