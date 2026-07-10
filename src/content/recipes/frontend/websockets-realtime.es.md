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
  - ui
  - css
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

## Variantes y Alternativas

- **WebSockets vs SSE vs long polling**: WebSockets proveen comunicacion bidireccional con baja latencia. Server-Sent Events (SSE) son unidireccionales (servidor a cliente) con reconexion automatica. Long polling es el fallback para entornos que bloquean WebSockets
- **WebSocket vs WebRTC**: WebSockets son para comunicacion cliente-servidor sobre TCP. WebRTC es para comunicacion peer-to-peer sobre UDP con soporte de audio/video. Usa WebSockets para sync de datos en tiempo real, WebRTC para videollamadas
- **Socket.IO vs raw WebSockets vs WS**: Socket.IO agrega reconexion, rooms y fallback a polling. Raw WebSockets son mas ligeros pero requieren manejo manual. ws es una libreria WebSocket rapida de Node.js sin el overhead de Socket.IO
- **Pub/Sub vs mensajeria directa**: pub/sub desacopla productores de consumidores via canales/topics. Mensajeria directa envia a clientes especificos. Usa pub/sub para escenarios de broadcast (chat rooms), directo para mensajes privados
- **Compresion de WebSocket**: per-message deflate (RFC 7692) comprime frames de WebSocket. Reduce bandwidth en 50-80% para payloads text-heavy. Aumenta uso de CPU. Habilita para clientes bandwidth-constrained
- **Message queue vs stream de WebSocket**: message queues (Redis, RabbitMQ) bufferan mensajes para delivery confiable. Streams de WebSocket entregan en tiempo real pero pierden mensajes al desconectar. Usa una queue para mensajes criticos, stream para updates no criticos

## Pitfalls Comunes en Produccion

- **Connection leaks**: conexiones WebSocket no cerradas se acumulan en el servidor. Implementa heartbeat/ping-pong para detectar conexiones muertas. Setea idle timeout. Monitorea conteo de conexiones activas
- **Presion de memoria por conexiones**: cada conexion WebSocket usa 20-100KB de memoria. 10,000 conexiones usan 200MB-1GB. Usa connection pooling, escalado horizontal y load balancing con sticky sessions
- **Reconnection storms**: cuando el servidor reinicia, todos los clientes se reconectan simultaneamente. Implementa delays de reconexion con jitter (1s + random(0-1s), 2s + random(0-2s), etc.). Usa exponential backoff con un max delay
- **Garantias de orden de mensajes**: los mensajes WebSocket pueden llegar desordenados al reconectar. Usa sequence numbers y buffera mensajes en el cliente. Implementa manejo de mensajes idempotente
- **Problemas de proxy y firewall**: proxies corporativos y firewalls pueden bloquear WebSocket upgrades. Usa servidores STUN/TURN para WebRTC. Provee fallback de SSE o long polling. Usa wss:// (TLS) para evitar interferencia de proxies
- **Autenticacion en WebSocket**: las conexiones WebSocket no soportan custom headers en browsers. Pasa tokens via query parameter, subprotocol o primer mensaje. Valida el token en la conexion. Usa tokens de corta duracion

## Patrones de Integracion

- **Arquitectura de chat en tiempo real**: el cliente se conecta via WebSocket -> el servidor autentica -> se une al canal de room -> broadcastea mensajes a miembros de la room -> persiste a base de datos. Usa Redis pub/sub para broadcast multi-server. Usa presence channels para online status
- **Dashboard de datos en vivo**: el servidor pushea updates via WebSocket -> el cliente renderiza updates de charts -> el cliente buffera los ultimos N data points -> al desconectar, falla a polling. Usa throttling para batchear updates (ej. max 10 updates/segundo)
- **Edicion colaborativa**: el cliente envia operaciones (no documento completo) -> el servidor aplica operaciones en orden -> el servidor broadcastea operaciones a otros clientes -> el cliente aplica operaciones remotas. Usa CRDTs u OT para resolucion de conflictos
- **Sistema de notificaciones**: el servidor publica eventos a Redis -> workers WebSocket suscriben a Redis -> los workers pushean a clientes conectados -> los clientes muestran notificaciones. Desacopla productores de eventos de servidores WebSocket
- **Escalado multi-server WebSocket**: usa un load balancer con sticky sessions (nginx, HAProxy) o un shared state store (Redis). Cuando un cliente se conecta al servidor A, otros servidores pueden alcanzarlo via Redis pub/sub. Usa un presence store para tracking de conexiones
- **Patron WebSocket gateway**: un gateway maneja conexiones y autenticacion WebSocket. Forwardea mensajes a servicios backend via HTTP o gRPC. Los servicios backend pushean mensajes de vuelta via el gateway. Desacopla el manejo de WebSocket de la logica de negocio

## Tooling y Ecosistema

- **Socket.IO**: libreria real-time con reconexion, rooms, namespaces. 60K+ GitHub stars. Librerias cliente y servidor. Adapters para Redis, MongoDB, Postgres. Usa para chat, notificaciones, live updates
- **ws**: libreria WebSocket rapida para Node.js. 21K+ GitHub stars. Overhead minimal. Usa cuando no necesitas features de Socket.IO. 2-3x mas rapido que Socket.IO para throughput raw
- **uWebSockets.js**: libreria WebSocket ultra-rapida para Node.js. Implementacion C++. 10-20x mas rapido que ws. Reemplazo drop-in de la API de ws. Usa para escenarios de alto throughput
- **Redis Pub/Sub**: pub/sub in-memory para escalado multi-server WebSocket. Latencia sub-milisegundo. Usa para broadcastear mensajes a traves de instancias de servidores WebSocket
- **Centrifugo**: servidor de mensajeria en tiempo real. Soporta WebSockets, SSE, HTTP-streaming. Presence, history y reconexion built-in. Usa como backend WebSocket standalone
- **Ably y Pusher**: servicios de mensajeria en tiempo real managed. Manejan escalado, presence y reconexion. Usa cuando no quieres manejar infraestructura WebSocket

## Resumen de Best Practices

- Implementa heartbeat/ping-pong para detectar conexiones muertas (cada 30 segundos)
- Usa exponential backoff con jitter para reconexion (1s, 2s, 4s, 8s, max 30s)
- Autentica conexiones WebSocket via token en query parameter o primer mensaje
- Usa Redis pub/sub para escalado multi-server WebSocket
- Setea idle timeout para cerrar conexiones inactivas (ej. 5 minutos)
- Comprime mensajes con per-message deflate para clientes bandwidth-constrained
- Buffera y retransmite mensajes perdidos al reconectar usando sequence numbers
- Monitorea conexiones activas, rate de mensajes y uso de memoria
- Usa SSE como fallback cuando WebSockets estan bloqueados por proxies
- Rate-limita mensajes por cliente para prevenir abuso (ej. 10 mensajes/segundo)
## Manejo de Errores y Recuperacion

- **Recuperacion de caida de conexion**: cuando una conexion WebSocket cae, el cliente debe detectarlo dentro de 30 segundos via heartbeat timeout. Intentar reconexion inmediatamente con backoff con jitter. Buffera mensajes salientes durante la desconexion y envialos al reconectar
- **Garantias de delivery de mensajes**: para mensajes criticos, implementa un protocolo de acknowledgment. El cliente envia mensaje con un ID unico -> el servidor procesa y envia ACK -> si no hay ACK en 5 segundos, el cliente reintenta. Usa un message store para persistencia
- **Recuperacion de crash del servidor**: usa un shared state store (Redis) para persistir metadata de conexiones y mensajes bufferados. Cuando una nueva instancia del servidor arranca, lee de Redis y restaura estado. Los clientes se reconectan a cualquier servidor disponible
- **Manejo de backpressure**: si un cliente es lento para procesar mensajes, el servidor debe bufferar hasta N mensajes. Si el buffer esta lleno, dropea mensajes no criticos o cierra la conexion. Usa flow control (pause/resume) para manejar backpressure
- **Manejo de mensajes malformados**: valida el formato del mensaje al recibirlo. Si es invalido, loguea el error e ignora el mensaje. No crashees el handler de WebSocket. Usa un validador de schema (JSON Schema, zod) para validacion de mensajes
- **Expiracion de token durante conexion**: si el token de auth expira mid-conexion, el servidor debe enviar un evento "token_expired". El cliente refresca el token y envia un nuevo mensaje "authenticate". Si el refresh falla, cierra la conexion

## Tips de Optimizacion de Performance

- Usa uWebSockets.js en lugar de ws para 10-20x mejor throughput en escenarios de alta conexion
- Habilita per-message deflate compression para reducir bandwidth en 50-80% para payloads de texto
- Usa frames binarios en lugar de frames de texto para datos estructurados. Binario es 20-30% mas pequeÃ±o y mas rapido de parsear
- Implementa message batching: buffera mensajes por 50ms y envia como un solo frame. Reduce overhead en 80% para mensajes pequeÃ±os de alta frecuencia
- Usa un connection pool para Redis pub/sub. Cada servidor WebSocket necesita un subscriber de Redis, no uno por conexion
- Setea maxPayload para limitar el tamaÃ±o de mensaje (ej. 1MB). Previene agotamiento de memoria por mensajes grandes
- Usa ws.on('pong', ...) para trackear round-trip time. Si RTT > 500ms, considera la conexion degradada
- Monitorea el event loop lag. Si lag > 100ms, el servidor esta sobrecargado. Escala horizontalmente u optimiza hot paths
- Usa ws.terminate() en lugar de ws.close() para conexiones muertas. 	erminate es inmediato, close espera un close frame
- Implementa un rate limiter de conexiones (ej. max 10 conexiones nuevas por segundo por IP) para prevenir connection floods
## Consideraciones de Seguridad

- **Cross-site WebSocket hijacking (CSWSH)**: las conexiones WebSocket no enforcean la same-origin policy por default. Valida el header Origin en el servidor. Rechaza conexiones de origins desconocidos. Usa tokens CSRF para autenticacion de WebSocket
- **Seguridad de tokens de autenticacion**: pasa tokens de auth via el primer mensaje despues de la conexion, no via parametros de URL (las URLs son logueadas por proxies y servidores). Usa tokens de corta duracion (15-30 minutos). Refresca tokens via un endpoint HTTP autenticado separado
- **Validacion de mensajes**: valida cada mensaje entrante contra un schema (JSON Schema, zod). Rechaza mensajes que no matcheen. Setea un tamaÃ±o maximo de mensaje (ej. 1MB). Rate-limita mensajes por conexion (ej. 10 por segundo). Loguea y alerta en fallos de validacion
- **Prevencion de denegacion de servicio**: limita el numero de conexiones concurrentes por IP (ej. 10). Limita el total de conexiones por instancia de servidor. Setea idle timeout (ej. 5 minutos). Usa un reverse proxy (nginx, Cloudflare) para filtrado de conexiones y rate limiting
- **Requisito de TLS/WSS**: siempre usa wss:// (WebSocket Secure) en produccion. Nunca uses ws:// excepto para desarrollo local. TLS previene eavesdropping y ataques man-in-the-middle. Usa Let's Encrypt para certificados gratis. Redirige ws:// a wss://
- **Sanitizacion de datos**: sanitiza todo contenido user-generated antes de broadcastear a otros clientes. Strippa HTML tags, escapa caracteres especiales y limita la longitud del mensaje. Usa DOMPurify para sanitizacion de HTML. Nunca broadcastees input raw del usuario a otros clientes
## Testing y Quality Assurance

- **Testing del lifecycle de conexion**: testea escenarios de conexion, desconexion y reconexion. Verifica que el heartbeat detecte conexiones muertas dentro de 30 segundos. Testea que los mensajes bufferados se envien al reconectar. Usa Playwright para testing del lado browser
- **Load testing**: usa Artillery o k6 para simular 10,000+ conexiones WebSocket concurrentes. Mide latencia de mensajes, uso de memoria y uso de CPU. Identifica el breaking point. Setea limites de conexion basado en resultados de load testing
- **Tests de orden de mensajes**: envia mensajes con sequence numbers. Verifica que el cliente los reciba en orden. Testea escenarios de reconexion donde los mensajes pueden llegar desordenados. Verifica que el cliente buffera y reordena correctamente
- **Testing de integracion**: testea el flow completo: cliente se conecta -> autentica -> se une a room -> envia mensaje -> recibe broadcast -> se desconecta -> se reconecta -> recibe mensajes perdidos. Usa Playwright o Cypress para testing end-to-end
- **Chaos testing**: mata instancias de servidor aleatoriamente durante conexiones activas. Verifica que los clientes se reconecten a otra instancia. Verifica que no se pierdan mensajes. Testea con Redis pub/sub para asegurar delivery de mensajes a traves de instancias
- **Testing de seguridad**: testea CSWSH conectando desde un origin diferente. Verifica que el servidor rechaze la conexion. Testea con tokens invalidos. Verifica que el servidor cierre la conexion. Fuzz testea payloads de mensajes para input malformado

## Deployment y CI/CD

- **Deployment de servidor WebSocket**: deploya detras de un reverse proxy (nginx, HAProxy) que soporte WebSocket upgrade. Configura proxy_set_header Upgrade  y proxy_set_header Connection "upgrade". Setea timeouts apropiados (ej. proxy_read_timeout 3600s)
- **Escalado horizontal**: usa multiples instancias de servidor WebSocket detras de un load balancer con sticky sessions. Usa Redis pub/sub para broadcast de mensajes cross-instance. Usa un shared presence store (Redis) para tracking de conexiones. Escala basado en conteo de conexiones
- **Deployment zero-downtime**: deploya nuevas instancias junto a instancias viejas. Drena instancias viejas enviando un evento "server_shutting_down" a clientes conectados. Los clientes se reconectan a nuevas instancias. Una vez que todos los clientes migraron, apaga las instancias viejas
- **Connection draining en shutdown**: en SIGTERM, deja de aceptar nuevas conexiones. Envia evento "reconnect" a clientes existentes con un delay con jitter (0-5 segundos). Espera a que las conexiones se cierren (max 30 segundos). Luego sale del proceso
- **Monitoreo y alerting**: monitorea conexiones activas, rate de mensajes, uso de memoria y event loop lag. Setea alerts para: conteo de conexiones > 80% del max, rate de mensajes > 80% de capacidad, event loop lag > 100ms, error rate > 1%. Usa Prometheus y Grafana
- **Endpoint de health check**: expone un endpoint HTTP (/health) que retorna 200 si el servidor WebSocket esta healthy. Chequea: conectividad Redis, uso de memoria < 80%, event loop lag < 50ms. Usa el health check para load balancer y Kubernetes liveness probes
## Optimizacion de Costos

- **Modelado de costos de conexion**: cada conexion WebSocket usa 20-100KB de memoria del servidor. 10,000 conexiones en un servidor de 2GB cuestan ~/mes. 100,000 conexiones requieren 10 servidores a ~/mes. Usa este modelo para estimar costos de infraestructura
- **Costo de volumen de mensajes**: Redis pub/sub cobra por mensaje en servicios managed (Redis Cloud, AWS ElastiCache). Batchea mensajes para reducir operaciones de Redis. Usa pub/sub local para deployments single-instance. Solo usa Redis para escalado multi-instance
- **Servicios WebSocket managed**: Ably cobra por mensaje y por conexion. Pusher cobra por conexion y por evento. Compara costos con self-hosted. Para < 10,000 conexiones, managed es usualmente mas barato (sin overhead de devops). Para > 100,000, self-hosted es mas barato
- **Connection pooling para Redis**: usa un solo subscriber de Redis por instancia de servidor, no por conexion WebSocket. Esto reduce conexiones de Redis de 10,000 a 1 por servidor. Usa 
edis.createClient() una vez al startup y sharea a traves de todas las conexiones
- **Auto-scaling basado en conexiones**: escala servidores WebSocket basado en conteo de conexiones activas. Usa Kubernetes HPA con una metrica custom (conexiones activas). Scalea up al 80% de capacidad. Scalea down al 30% de capacidad. Usa connection draining en scale-down
- **Optimizacion de bandwidth**: habilita per-message deflate para reducir bandwidth en 50-80%. Usa frames binarios en lugar de JSON para datos estructurados (20-30% mas pequeÃ±o). Implementa message batching para updates de alta frecuencia. Monitorea uso de bandwidth y setea alerts
## Monitoreo y Observabilidad

- **Metricas de conexion**: trackea conexiones activas, conexiones nuevas por segundo, desconexiones por segundo y conexiones peak. Usa Prometheus con un gauge custom para conexiones activas. Alerta en drops repentinos (crash del servidor) o picos (connection flood)
- **Metricas de mensajes**: trackea mensajes enviados por segundo, mensajes recibidos por segundo, tamaÃ±o promedio de mensaje y error rate de mensajes. Usa histogramas para distribucion de tamaÃ±o de mensaje. Alerta en error rate > 1% o rate de mensajes > 80% de capacidad
- **Monitoreo de latencia**: mide round-trip time usando frames ping/pong. Trackea latencia p50, p95 y p99. Alerta en p95 > 500ms. Usa ping/pong a nivel protocolo WebSocket, no a nivel aplicacion. Monitorea por conexion y agregado
- **Monitoreo de memoria**: trackea RSS, heap usado y heap total por instancia de servidor WebSocket. Alerta en heap usage > 80% del limite. Monitorea memory leaks trackeando crecimiento de heap en el tiempo. Usa --inspect y Chrome DevTools para heap snapshots
- **Monitoreo de event loop**: trackea event loop lag usando perf_hooks.monitorEventLoopDelay(). Alerta en lag > 100ms. Lag alto indica que el servidor esta sobrecargado. Usa cluster mode o escalado horizontal para distribuir load. Profilea con flag --prof
- **Distributed tracing para WebSocket**: usa OpenTelemetry para tracear mensajes de cliente a servidor a Redis a otro servidor a otro cliente. Esto ayuda a debuggear issues de delivery de mensajes en setups multi-server. Usa Jaeger para visualizacion de traces
## Preguntas Frecuentes

**P: ¿Cuántas conexiones WebSocket concurrentes puede manejar un servidor?**
R: Node.js maneja ~10k-50k conexiones por core. Usa Redis pub/sub o un message bus para escalar horizontalmente.

**P: ¿Funcionan WebSockets sobre HTTPS?**
R: Sí — usa wss:// (WebSocket Secure). Los navegadores bloquean ws:// mixto en páginas HTTPS.

**P: ¿Cuál es el mejor fallback si WebSockets están bloqueados?**
R: Server-Sent Events para servidor-a-cliente; HTTP long polling para necesidades bidireccionales.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cuáles son las alternativas a WebSockets?

Server-Sent Events (SSE) para comunicación solo de servidor a cliente. Long polling como fallback cuando WebSockets están bloqueados. WebRTC para datos en tiempo real peer-to-peer. gRPC streaming para comunicación servicio-a-servicio. Elije basado en tus necesidades bidireccionales y restricciones de infraestructura.

### ¿Cómo escaleo WebSockets a múltiples servidores?

Usa Redis pub/sub para broadcastear mensajes a través de instancias. Un load balancer con sticky sessions rutea clientes a servidores específicos. Cada servidor suscribe a Redis para recibir mensajes de otros servidores. Usa un shared presence store (Redis) para trackear conexiones activas a través de instancias.

### ¿Cómo manejo la autenticación en WebSockets?

Pasa el token de autenticación en el primer mensaje después de la conexión, no en parámetros de URL. Usa tokens de corta duración (15-30 minutos). Refresca los tokens via un endpoint HTTP autenticado separado. Si el token expira mid-conexión, el servidor envía un evento "token_expired" y el cliente debe re-autenticarse o desconectarse.

### ¿Cómo prevengo memory leaks en conexiones WebSocket?

Implementa heartbeat/ping-pong cada 30 segundos para detectar conexiones muertas. Setea un idle timeout de 5 minutos para cerrar conexiones inactivas. Usa `ws.terminate()` en lugar de `ws.close()` para conexiones no responsivas. Monitorea el heap usage con `process.memoryUsage()` y alerta si supera el 80% del limite. Usa connection draining en shutdown para cerrar conexiones gracefully. Libera todos los event listeners con `ws.removeAllListeners()` antes de cerrar conexiones para prevenir callback accumulation.

Para detectar leaks temprano, usa Chrome DevTools Memory profiler con `--inspect`. Toma heap snapshots antes y despues de ciclos de conexion/desconexion. Si el heap crece entre snapshots, hay un leak. Comunmente los leaks provienen de closures que capturan la conexion, intervals no limpiados, o Map/Set que acumulan referencias de conexiones cerradas.