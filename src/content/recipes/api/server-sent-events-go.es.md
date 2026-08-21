---
contentType: recipes
slug: server-sent-events-go
title: "Implementa Server-Sent Events en Go para Actualizaciones"
description: "Construí un endpoint de Server-Sent Events en Go listo para producción con gestión de conexiones, heartbeats y manejo graceful de desconexiones de clientes."
metaDescription: "Server-Sent Events en Go. Construye streams de actualización en tiempo real con gestión de conexiones, heartbeats y manejo graceful de desconexiones de clientes."
difficulty: intermediate
topics:
  - api
  - performance
tags:
  - server-sent-events
  - sse
  - golang
  - real-time
  - api
  - http
relatedResources:
  - /recipes/server-sent-events
  - /recipes/server-sent-events-node
  - /recipes/real-time-websockets
  - /recipes/websocket-authentication
  - /recipes/go-rest-api-gin
  - /recipes/real-time-notifications
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Server-Sent Events en Go. Construye streams de actualización en tiempo real con gestión de conexiones, heartbeats y manejo graceful de desconexiones de clientes."
  keywords:
    - server sent events
    - sse
    - golang
    - real time api
    - event stream
    - http streaming
---

## Resumen

Server-Sent Events proporcionan un canal ligero y unidireccional para enviar actualizaciones en
 tiempo real del servidor al cliente sobre HTTP. A diferencia de WebSockets, SSE usa conexiones
 HTTP estándar, no requiere upgrade de protocolo y la API `EventSource` del navegador maneja la
 reconexión automáticamente.

## Cuándo Usarlo

- Necesitás enviar notificaciones, logs o métricas en vivo a navegadores.
- El servidor es el único emisor; los clientes solo reciben.
- Querés reutilizar infraestructura HTTP existente como load balancers y CDNs.
- Necesitás una alternativa más simple a WebSockets para streaming unidireccional.

## Cuándo NO Usarlo

- Los clientes necesitan enviar mensajes al servidor en tiempo real — usá WebSockets.
- Necesitás datos binarios o de muy alta frecuencia — WebSockets o WebTransport se ajustan mejor.
- No podés controlar timeouts de proxies o load balancers que pueden cerrar conexiones inactivas.

## Solución

### Handler SSE básico

```go
// handlers/sse.go
package handlers

import (
    "fmt"
    "net/http"
    "time"
)

type Event struct {
    ID    string
    Type  string
    Data  string
    Retry int
}

func (e Event) String() string {
    var result string
    if e.ID != "" {
        result += fmt.Sprintf("id: %s\n", e.ID)
    }
    if e.Type != "" {
        result += fmt.Sprintf("event: %s\n", e.Type)
    }
    if e.Retry > 0 {
        result += fmt.Sprintf("retry: %d\n", e.Retry)
    }
    result += fmt.Sprintf("data: %s\n\n", e.Data)
    return result
}

func SSEHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
        return
    }

    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    clientGone := r.Context().Done()

    for {
        select {
        case <-clientGone:
            return
        case <-ticker.C:
            now := time.Now().Unix()
            event := Event{
                ID:   fmt.Sprintf("%d", now),
                Type: "ping",
                Data: fmt.Sprintf(`{"timestamp": %d}`, now),
            }
            fmt.Fprint(w, event.String())
            flusher.Flush()
        }
    }
}
```

### Gestión de conexiones con un hub

```go
// sse/hub.go
package sse

import "sync"

type Hub struct {
    clients map[chan Event]bool
    mu      sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{clients: make(map[chan Event]bool)}
}

func (h *Hub) Subscribe() chan Event {
    ch := make(chan Event, 10)
    h.mu.Lock()
    h.clients[ch] = true
    h.mu.Unlock()
    return ch
}

func (h *Hub) Unsubscribe(ch chan Event) {
    h.mu.Lock()
    delete(h.clients, ch)
    h.mu.Unlock()
    close(ch)
}

func (h *Hub) Broadcast(event Event) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    for ch := range h.clients {
        select {
        case ch <- event:
        default:
            // Channel full, drop event for this client
        }
    }
}
```

### Handler de producción con heartbeat

```go
// handlers/events.go
func EventStream(hub *sse.Hub) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Connection", "keep-alive")

        flusher, ok := w.(http.Flusher)
        if !ok {
            http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
            return
        }

        client := hub.Subscribe()
        defer hub.Unsubscribe(client)

        heartbeat := time.NewTicker(30 * time.Second)
        defer heartbeat.Stop()

        clientGone := r.Context().Done()

        // Send initial connection event
        fmt.Fprintf(w, "event: connected\ndata: %s\n\n", `{"status": "ok"}`)
        flusher.Flush()

        for {
            select {
            case <-clientGone:
                return
            case event := <-client:
                fmt.Fprint(w, event.String())
                flusher.Flush()
            case <-heartbeat.C:
                fmt.Fprint(w, ": heartbeat\n\n")
                flusher.Flush()
            }
        }
    }
}
```

### EventSource del cliente

```javascript
// client.js
const evtSource = new EventSource('/api/events');

evtSource.addEventListener('connected', (e) => {
  console.log('Connected:', JSON.parse(e.data));
});

evtSource.addEventListener('price-update', (e) => {
  const update = JSON.parse(e.data);
  document.getElementById('price').textContent = update.price;
});

evtSource.onerror = (err) => {
  console.error('SSE error:', err);
  // Browser auto-reconnects with exponential backoff
};

window.addEventListener('beforeunload', () => {
  evtSource.close();
});
```

## Explicación

1. **HTTP stream**: el servidor responde con `Content-Type: text/event-stream` y escribe eventos
   como texto plano.
2. **Formato de evento**: cada evento usa campos como `data:`, `event:`, `id:` y `retry:`.
3. **Reconexión**: el navegador rastrea el último event ID y lo reenvía en el header
   `Last-Event-ID` al reconectar.
4. **Heartbeat comments**: las líneas que empiezan con `:` mantienen la conexión abierta a través
   de proxies.
5. **Limpieza de goroutines**: `r.Context().Done()` se dispara cuando el cliente se desconecta,
   así que el handler retorna y el `defer` desuscribe al cliente.

## Variantes

### Broadcast con Redis para múltiples instancias de Go

Para escalar horizontalmente, publicá eventos en Redis Pub/Sub y que cada proceso Go se
suscriba, luego fan-out a sus clientes SSE locales. Consultá [Real-Time
Notifications](/es/recipes/real-time-notifications/) para patrones de Redis pub/sub.

### Autenticar conexiones SSE

Los navegadores no pueden setear headers custom a través de `EventSource`. Pasá un token de corta
 duración como query parameter y validalo antes de suscribir:

```go
token := r.URL.Query().Get("token")
if !validateToken(token) {
    http.Error(w, "Unauthorized", http.StatusUnauthorized)
    return
}
```

Para SSE cross-origin, seteá los headers CORS explícitamente en el endpoint.

### Test con `httptest`

```go
func TestSSEHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/events", nil)
    rec := httptest.NewRecorder()

    SSEHandler(rec, req)

    res := rec.Result()
    if res.Header.Get("Content-Type") != "text/event-stream" {
        t.Fatalf("expected text/event-stream, got %s", res.Header.Get("Content-Type"))
    }
}
```

## Buenas Prácticas

- Siempre llamá a `Flusher.Flush()` después de cada evento; de lo contrario, proxies y clientes
  bufferan la respuesta.
- Ejecutá SSE detrás de load balancers con HTTP/2 para distribuir muchos streams sobre una sola
  conexión.
- Seteá `Cache-Control: no-cache` y `Connection: keep-alive` para evitar buffering.
- Usá un heartbeat comment cada 25–30 segundos para mantener conexiones abiertas a través de
  proxies corporativos.
- Limitá conexiones por IP de cliente o requerí autenticación para evitar agotamiento de
  recursos.
- Usá write timeouts más largos que para endpoints REST estándar.

## Errores Comunes

- Olvidar llamar a `Flush()` después de cada evento.
- No manejar la desconexión del cliente, dejando goroutines corriendo.
- Faltar `Cache-Control: no-cache`, lo que hace que los proxies bufferen eventos.
- Enviar eventos sin IDs, perdiendo el replay al reconectar.
- Ejecutar el mismo handler sin aislamiento de estado entre varios procesos Go.

## Preguntas Frecuentes

### ¿Cómo se compara SSE con WebSockets?

SSE es más simple para push servidor-a-cliente. Usá [WebSockets](/es/recipes/real-time-websockets/)
cuando necesites comunicación bidireccional o datos binarios.

### ¿Puede SSE funcionar a través de proxies corporativos?

Sí, pero algunos proxies tienen timeouts cortos. Enviá heartbeat comments cada 30 segundos para
mantener conexiones abiertas.

### ¿Cuál es el número máximo de conexiones SSE concurrentes?

Sobre HTTP/1.1, los navegadores permiten unas 6 conexiones por dominio. HTTP/2 elimina ese
límite.

### ¿Cómo manejo la reconexión del cliente con Last-Event-ID?

Leé el header `Last-Event-ID` y reproducí eventos con IDs mayores. Asigná IDs secuenciales con el
 campo `id:` y guardá eventos recientes en un pequeño ring buffer en memoria.

### ¿Cómo broadcasteo SSE a múltiples clientes en Go?

Mantené un map de channels suscritos. Usá un send non-blocking con un case `default` en un
`select` para evitar que clientes lentos bloqueen el broadcast. Para fan-out entre instancias,
agregá Redis Pub/Sub.

### ¿Cómo manejo SSE detrás de un load balancer?

Usá timeouts largos, deshabilitá el response buffering en nginx con `proxy_buffering off;`, y usá
Redis Pub/Sub para compartir eventos entre instancias si los clientes pueden caer en distintos
backends.
