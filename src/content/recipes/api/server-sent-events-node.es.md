---
contentType: recipes
slug: server-sent-events-node
title: "Server-Sent Events con Node.js y Express"
description: "Construí push de servidor a cliente con Server-Sent Events en Node.js y Express. Cubre conexiones, heartbeats, reconexión y broadcast seguro."
metaDescription: "Implementá Server-Sent Events en Node.js con Express. Incluye conexiones, heartbeats, reconexión y broadcast seguro para push en tiempo real."
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
  - /recipes/server-sent-events
  - /recipes/server-sent-events-go
  - /recipes/websocket-bidirectional-chat
  - /recipes/websockets-realtime
  - /recipes/redis-pub-sub-python
  - /patterns/publish-subscribe-pattern
lastUpdated: "2026-08-30"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Implementá Server-Sent Events en Node.js con Express. Incluye conexiones, heartbeats, reconexión y broadcast seguro para push en tiempo real."
  keywords:
    - server sent events
    - sse
    - nodejs
    - express
    - real time push
---

## Visión General

Server-Sent Events (SSE) permite que el servidor envíe eventos de texto al
browser a través de una conexión HTTP persistente. Es un canal unidireccional
sobre HTTP plano, así que funciona con la autenticación, load balancers y
proxies que ya tengas.

Uso SSE cuando el tráfico es principalmente de servidor a cliente y no quiero
agregar infraestructura de WebSockets solo para empujar unas pocas
actualizaciones. En una app de Node.js y Express, la receta es corta: seteá los
headers correctos, mantené la respuesta abierta y escribí líneas en formato
`text/event-stream`. La API `EventSource` del browser maneja la reconexión
automáticamente y envía el header `Last-Event-ID` para que el servidor pueda
reanudar el stream.

Esta receta incluye un endpoint de Express, un cliente de browser, un helper de
broadcast que maneja backpressure y algunas notas de producción que hubiera
querido tener cuando deployé SSE por primera vez detrás de nginx. Si querés
empezar por los conceptos del protocolo, mirá
[Server-Sent Events](/recipes/server-sent-events/); para chat bidireccional,
revisá [WebSocket Bidirectional Chat](/recipes/websocket-bidirectional-chat/).

## Cuándo Usar

Usá SSE en estos casos:

- Necesitás dashboards en vivo, feeds de actividad o notificaciones de servidor a
  cliente. Lo uso para barras de progreso de trabajos largos porque el browser
  solo escucha.
- El tráfico fluye principalmente de servidor a cliente, y los clientes solo
  escuchan. Pensá en tickers de acciones, resultados deportivos o colas de logs.
- Preferís reusar tu stack HTTP en lugar de agregar infraestructura de
  WebSockets. SSE atraviesa la mayoría de proxies corporativos y CDNs sin
  upgrades de protocolo.
- Tus mensajes son chicos y de texto; no necesitás payloads binarios.

### Cuándo evitar

- El flujo es genuinamente bidireccional o binario. Usá WebSockets en su lugar.
- Los clientes necesitan enviar mensajes frecuentes al servidor. SSE es solo de
  servidor a cliente.
- Tu despliegue bloquea conexiones HTTP persistentes. Algunos proxies o firewalls
  cortan sockets inactivos a menos que mantengas heartbeats y timeouts
  alineados.

## Solución

### Endpoint SSE con Express

```typescript
// sse/server.ts
import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';

const app = express();

interface Client {
  id: string;
  response: Response;
}

const clients = new Map<string, Client>();

function addClient(res: Response): string {
  const id = randomUUID();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(
    `event: connected\nid: ${id}\ndata: ${JSON.stringify({ clientId: id })}\n\n`
  );

  clients.set(id, { id, response: res });

  res.on('close', () => {
    clients.delete(id);
  });

  return id;
}

app.get('/events', (req: Request, res: Response) => {
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  const clientId = addClient(res);

  if (lastEventId) {
    replayEvents(clientId, lastEventId);
  }
});

// Reemplazá esto por un buffer acotado o un store persistente
function replayEvents(clientId: string, lastEventId: string) {
  // Enviá los eventos que el cliente se perdió
}

const PORT = 3000;
app.listen(PORT, () => console.log(`SSE server on port ${PORT}`));
```

Los headers importan. El header `Content-Type: text/event-stream` le dice al
browser que está viendo un stream de eventos. `Cache-Control: no-cache` evita
que los proxies hagan buffering de la respuesta, y `X-Accel-Buffering: no`
hace lo mismo para nginx. También seteo `Connection: keep-alive`, aunque
HTTP/1.1 mantiene las conexiones abiertas por defecto; es un recordatorio útil
para quien lea el código después.

### Broadcast de eventos con backpressure

```typescript
function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((client) => {
    const flushed = client.response.write(payload);

    if (!flushed) {
      client.response.once('drain', () => {
        // el buffer se limpió; los writes pueden continuar
      });
    }
  });
}

// Heartbeat cada 30 segundos para mantener vivas las conexiones
setInterval(() => {
  broadcast('heartbeat', { ts: Date.now() });
}, 30000);
```

`response.write` devuelve `false` cuando el buffer interno de Node se llena. Esa
es la señal de backpressure. En el snippet de arriba espero al evento `drain`,
pero en producción suelo desconectar clientes que se quedan atrás por mucho
tiempo, porque una cola de mensajes pendientes sin límite se come la memoria.

### Cliente con auto-reconexión

```typescript
// client/sse.ts
let attempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
  const source = new EventSource('/events');

  source.addEventListener('connected', (e) => {
    attempts = 0;
    const { clientId } = JSON.parse(e.data);
    console.log('connected as', clientId);
  });

  source.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    showToast(data.message);
  });

  source.onerror = () => {
    source.close();

    if (reconnectTimer) return;

    const delay = Math.min(1000 * 2 ** attempts, 30000);
    attempts += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };
}

connect();
```

El browser ya reconecta automáticamente, pero el loop manual de retry te da
control sobre el tope del backoff y permite resetear el contador cuando llega
un evento `connected`. Pongo el tope en 30 segundos para que una mala conexión
no deje al usuario esperando minutos entre intentos.

### Manejo de eventos con nombre y `retry`

Un cliente productivo suele escuchar más de un tipo de evento. Seteá un campo
`retry` por defecto en milisegundos para que el browser espere el tiempo
adecuado antes de reconectar:

```typescript
function sendNotification(res: Response, event: string, data: unknown, retry = 2000) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n`);
  res.write(`retry: ${retry}\n\n`);
}
```

Del lado del cliente, `addEventListener('order-update', ...)` solo se dispara
para mensajes cuyo campo `event:` coincide. A mí me resulta más limpio que
enterrar el tipo de evento adentro del payload JSON.

### Testear el stream con curl

Antes de cablear el browser, verifico el endpoint con curl:

```bash
curl -N -H "Accept: text/event-stream" http://localhost:3000/events
```

El flag `-N` desactiva el buffering de salida para que veas los eventos a
medida que llegan. Si no ves el evento `connected` inmediatamente, los headers
o el formato de la respuesta están probablemente mal.

### CORS y autenticación

`EventSource` no permite setear headers custom, así que no podés enviar un
token `Authorization` tipo bearer directo. En la práctica elijo una de tres
opciones.

Una cookie funciona cuando la página del browser y la API comparten el mismo
origen. Un query token es un valor de corta vida en la URL, pero puede filtrarse
en logs del servidor e historial del browser. Un `fetch` manual con
`ReadableStream` te da control total de los headers, aunque tenés que
re-implementar la reconexión.

Para CORS, uso el middleware `cors` y permito el origen específico en Express:

```typescript
import cors from 'cors';

app.use(cors({ origin: 'https://app.example.com', credentials: true }));
```

Esa config deja que el browser se conecte desde otro origen manteniendo las
credentials habilitadas.

### Despliegue detrás de nginx

Nginx es el lugar más común donde se rompe SSE. La configuración por defecto
intenta hacer buffering de la respuesta, lo que convierte un stream vivo en un
lote demorado. Siempre agrego esto al bloque `location`:

```nginx
location /events {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Connection '';
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 86400s;
  proxy_send_timeout 86400s;
}
```

Sin `proxy_buffering off`, el cliente no ve los eventos hasta que el buffer se
llena. `proxy_read_timeout` tiene que ser mayor que el intervalo de heartbeat,
si no nginx cierra el socket entre latidos.

### Escalar más allá de un servidor

Cuando agregás un segundo proceso de Node, cada servidor solo conoce los
clientes que tiene conectados. Suelo poner un canal de pub/sub de Redis
adelante de la función de broadcast. Cada instancia de Node se subscribe al
canal y reenvía los mensajes a sus clientes locales:

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
const subscriber = redis.duplicate();

subscriber.subscribe('sse:events', (message) => {
  const { event, data } = JSON.parse(message);
  broadcast(event, data);
});

async function publishEvent(event: string, data: unknown) {
  await redis.publish('sse:events', JSON.stringify({ event, data }));
}
```

Si corrés varias instancias detrás de un load balancer, usá sticky sessions para
que un cliente que reconecta caiga en el mismo servidor. Si no, el header
`Last-Event-ID` puede llegar a un nodo que no tiene el historial de ese
cliente.

## Explicación

SSE reutiliza una respuesta HTTP. El servidor la mantiene abierta y escribe
líneas en formato `text/event-stream`. Los eventos traen campos `event:`,
`data:`, `id:` y `retry:`. Los browsers lo manejan a través de la API
`EventSource`, que reconecta automáticamente y envía el header
`Last-Event-ID`.

```mermaid
flowchart LR
  Cliente[Browser / EventSource] -->|GET /events| Servidor[Servidor Express]
  Servidor -->|headers text/event-stream| Cliente
  Servidor -->|event: connected| Cliente
  Servidor -->|heartbeat| Cliente
  Cliente -->|Last-Event-ID| Servidor
  Servidor -->|repetir eventos| Cliente
```

El protocolo es solo texto, así que cualquier JSON se codifica dentro del campo
`data:`. Los heartbeats mantienen la conexión viva frente a proxies que pueden
cerrar sockets inactivos. El header `Last-Event-ID` permite reanudar desde donde
el cliente se quedó.

El backpressure aparece cuando los clientes no pueden seguir el ritmo.
`response.write` devuelve `false` en cuanto el buffer interno de Node se llena.
Después podés esperar al evento `drain` antes de escribir de nuevo, o
 desconectar clientes que se quedan atrás. Yo suelo desconectar consumidores
lentos después de unos segundos de backpressure, porque mantenerlos en memoria
afecta al resto del cluster.

El campo `id:` es opcional pero potente. El browser guarda el último `id:` que
recibió y lo envía como `Last-Event-ID` al reconectar. Eso significa que podés
reanudar el stream sin que el cliente pierda mensajes, siempre que el servidor
mantenga un historial acotado. Suelo guardar los últimos 100 a 500 eventos en
memoria o en Redis, según el tamaño de cada mensaje.

## Variantes

| Enfoque | Ideal para | Notas |
| --- | --- | --- |
| `EventSource` nativo | Browsers modernos | Auto-reconexión, `Last-Event-ID`, sin polling |
| `fetch` + `ReadableStream` manual | Headers custom o auth POST | Más control, más código |
| Paquete `eventsource` de npm | Clientes Node o viejos browsers | Misma API, funciona fuera del browser |
| `better-sse` o `sse-channel` | Express productivo | Maneja rooms, heartbeat y limpieza |

Si necesitás que el mismo cliente reciba distintos tipos de eventos,
`better-sse` te da canales y rooms sin escribir el registro vos mismo. Para
streams simples uno a uno, el enfoque manual de esta receta alcanza.

## Mejores Prácticas

- Seteá `X-Accel-Buffering: no` para que nginx u otros proxies no hagan
  buffering del stream. También seteo `Cache-Control: no-cache` y desactivo
  `proxy_buffering` en nginx.
- Enviá un heartbeat cada 15–30 segundos para evitar timeouts de proxies y
  firewalls. Uso un evento `heartbeat` simple con un payload vacío, con
  `data: {}` como contenido.
- Usá `Last-Event-ID` para reanudar tras reconexiones; guardá un historial
  acotado. Un ring buffer de los últimos 100 eventos suele alcanzar para
  dashboards.
- Eliminá clientes en `close` o `error`; si no, quedan en memoria. Node no va a
  cerrar la respuesta por vos.
- Limitá la cantidad de conexiones abiertas y el rate de mensajes por cliente.
  El rate limiting importa si los clientes pueden disparar muchos eventos.
- Usá las señales de backpressure de `res.write`; no acumules mensajes sin
  límite. Cuando el buffer del kernel está lleno, decidí entre esperar y
  desconectar.
- Testeá detrás de tu proxy real antes de salir a producción, porque un `curl`
  local puede mentir cuando no hay buffering.

## Errores Comunes

- Olvidar los heartbeats y luego preguntarse por qué las conexiones se caen en
  silencio. El timeout del proxy casi siempre es el culpable.
- Hacer broadcast de payloads grandes sin revisar lo que devuelve
  `response.write`. Así se llena el buffer de Node y se frena el event loop.
- Guardar todo el historial de eventos en memoria en lugar de un buffer acotado
  o un log persistente. La memoria crece con cada cliente que reconecta.
- Abrir muchas instancias de `EventSource` por página. Los browsers limitan
  conexiones por origen, generalmente a seis por dominio en HTTP/1.1.
- Enviar datos binarios o esperar que el cliente postee datos por la misma
  conexión. SSE es solo texto unidireccional; usá WebSockets para los otros
  casos.
- Reusar `Last-Event-ID` en dos o más servidores sin estado compartido. El
  cliente puede reconectar a un proceso diferente que no vio ese `id`.

## Ver También

- [Server-Sent Events](/recipes/server-sent-events/) — el protocolo y la
  vista general multi-lenguaje.
- [WebSocket Bidirectional Chat](/recipes/websocket-bidirectional-chat/) — para
  comunicación en tiempo real bidireccional.
- [Publish-Subscribe Pattern](/patterns/publish-subscribe-pattern/) — el patrón
  arquitectónico detrás del fan-out.
- MDN [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource).
- HTML Living Standard [Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html).
- Documentación de Node.js [http](https://nodejs.org/api/http.html) y
  [stream](https://nodejs.org/api/stream.html).

## Preguntas Frecuentes

### ¿Puedo enviar datos binarios por SSE?

No. SSE es solo texto. Codificá binarios como Base64, o usá WebSockets para
streams binarios verdaderos. Base64 agrega un overhead de aproximadamente un 33 %
, lo cual está bien para íconos chicos pero no para video.

### ¿Cuántas conexiones SSE simultáneas maneja un proceso de Node.js?

Miles, limitado por memoria y file descriptors del SO. Cada conexión cuesta un
pequeño chunk de heap más un socket. Usá clustering o un load balancer con
sticky sessions para escalar horizontalmente. El número exacto depende del
 tamaño del payload y la frecuencia de heartbeats, pero un solo proceso suele
sostener decenas de miles de conexiones inactivas.

### ¿Funciona SSE a través de un load balancer?

Sí, siempre que el balancer soporte HTTP persistente y sticky sessions una vez
que escalás más allá de un servidor. Deshabilitá el buffering de respuestas y
seteá timeouts de inactividad lo suficientemente largos. Sin sticky sessions,
una reconexión puede caer en un proceso diferente y perder eventos.

### ¿Cómo autentico clientes SSE?

Pasá un token por query string, una cookie, o usá `fetch` con stream manual para
poder enviar headers custom. `EventSource` plano no puede setear headers
`Authorization`. Las cookies son la opción más limpia cuando la página del
browser y el servidor comparten origen.

### ¿Qué pasa si el cliente se desconecta y reconecta?

Agregá campos `id:` a los eventos y leé el header `Last-Event-ID` en el
servidor. Repetí los eventos perdidos desde una cola en memoria acotada o un
store persistente como Redis. Mantené el historial acotado para que la memoria
no crezca sin límite.
