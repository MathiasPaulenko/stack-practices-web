---
contentType: recipes
slug: server-sent-events-node
title: "Server-Sent Events con Node.js y Express"
description: "Construí push de servidor a cliente con Server-Sent Events en Node.js y Express. Cubre conexiones, heartbeats, reconexión y broadcast seguro."
metaDescription: "Implementá Server-Sent Events en Node.js con Express. Incluye manejo de conexiones, heartbeats, reconexión del cliente y broadcast seguro para push en tiempo real."
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
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Implementá Server-Sent Events en Node.js con Express. Incluye manejo de conexiones, heartbeats, reconexión del cliente y broadcast seguro para push en tiempo real."
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

Esta receta muestra un endpoint de Express, un cliente de browser y un helper de
broadcast que maneja backpressure y limpieza.

## Cuándo Usar

Usá SSE en estos casos:

- Necesitás dashboards en vivo, feeds de actividad o notificaciones de servidor a
  cliente.
- El tráfico fluye principalmente de servidor a cliente, y los clientes solo
  escuchan.
- Preferís reusar tu stack HTTP en lugar de agregar infraestructura de
  WebSockets.
- Tus mensajes son chicos y de texto; no necesitás payloads binarios.

### Cuándo evitar

- Necesitás comunicación bidireccional o binaria de verdad. Usá WebSockets en su
  lugar.
- Los clientes necesitan enviar mensajes frecuentes al servidor. SSE es solo de
  servidor a cliente.
- Tu despliegue bloquea conexiones HTTP persistentes. Algunos proxies o firewalls
  lo hacen.

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

## Explicación

SSE reutiliza una respuesta HTTP. El servidor la mantiene abierta y escribe
líneas en formato `text/event-stream`. Los eventos traen campos `event:`,
`data:`, `id:` y `retry:`. Los browsers lo manejan a través de la API
`EventSource`, que reconecta automáticamente y envía el header
`Last-Event-ID`.

El protocolo es solo texto, así que cualquier JSON se codifica dentro del campo
`data:`. Los heartbeats mantienen la conexión viva frente a proxies que pueden
cerrar sockets inactivos. El header `Last-Event-ID` permite reanudar desde donde
el cliente se quedó.

El backpressure aparece cuando los clientes son lentos. `response.write`
devuelve `false` en cuanto el buffer interno de Node se llena. Después podés
esperar al evento `drain` antes de escribir de nuevo, o desconectar clientes
que se quedan atrás.

## Variantes

| Enfoque | Ideal para | Notas |
| --- | --- | --- |
| `EventSource` nativo | Browsers modernos | Auto-reconexión, `Last-Event-ID`, sin polling |
| `fetch` + `ReadableStream` manual | Headers custom o auth POST | Más control, más código |
| Paquete `eventsource` de npm | Clientes Node o viejos browsers | Misma API, funciona fuera del browser |
| `better-sse` o `sse-channel` | Express productivo | Maneja rooms, heartbeat y limpieza |

## Mejores Prácticas

- Seteá `X-Accel-Buffering: no` para que nginx u otros proxies no hagan
  buffering del stream.
- Enviá un heartbeat cada 15–30 segundos para evitar timeouts de proxies y
  firewalls.
- Usá `Last-Event-ID` para reanudar tras reconexiones; guardá un historial
  acotado.
- Eliminá clientes en `close` o `error`; si no, quedan en memoria.
- Limitá la cantidad de conexiones abiertas y el rate de mensajes por cliente.
- Usá las señales de backpressure de `res.write`; no acumules mensajes sin
  límite.

## Errores Comunes

- Olvidar los heartbeats y luego preguntarse por qué las conexiones se caen en
  silencio.
- Hacer broadcast de payloads grandes sin revisar lo que devuelve
  `response.write`.
- Guardar todo el historial de eventos en memoria en lugar de un buffer acotado
  o un log persistente.
- Abrir muchas instancias de `EventSource` por página. Los browsers limitan
  conexiones por origen.
- Enviar datos binarios o esperar que el cliente postee datos por la misma
  conexión.

## Preguntas Frecuentes

### ¿Puedo enviar datos binarios por SSE?

No. SSE es solo texto. Codificá binarios como Base64, o usá WebSockets para
streams binarios verdaderos.

### ¿Cuántas conexiones SSE simultáneas maneja un proceso de Node.js?

Miles, limitado por memoria y file descriptors del SO. Cada conexión cuesta un
pequeño chunk de heap más un socket. Usá clustering o un load balancer con
sticky sessions para escalar horizontalmente.

### ¿Funciona SSE a través de un load balancer?

Sí, siempre que el balancer soporte HTTP persistente y sticky sessions una vez
que escalás más allá de un servidor. Deshabilitá el buffering de respuestas y
seteá timeouts de inactividad lo suficientemente largos.

### ¿Cómo autentico clientes SSE?

Pasá un token por query string, cookie, o usá `fetch` con stream manual para
poder enviar headers custom. `EventSource` plano no puede setear headers
`Authorization`.

### ¿Qué pasa si el cliente se desconecta y reconecta?

Agregá campos `id:` a los eventos y leé el header `Last-Event-ID` en el
servidor. Repetí los eventos perdidos desde una cola en memoria acotada o un
store persistente como Redis.
