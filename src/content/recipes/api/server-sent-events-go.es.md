---
contentType: recipes
slug: server-sent-events-go
title: "Implementa Server-Sent Events en Go para Actualizaciones en Tiempo Real"
description: "Como construir un endpoint de Server-Sent Events en Go listo para produccion con gestion de conexiones, heartbeats y manejo graceful de desconexiones de clientes"
metaDescription: "Server-Sent Events en Go. Construye streams de actualizacion en tiempo real con gestion de conexiones, heartbeats y manejo graceful de desconexiones de clientes."
difficulty: intermediate
topics:
  - api
  - performance
tags:
  - server-sent-events
  - real-time
  - golang
  - api
  - rest
relatedResources:
  - /recipes/api/websocket-authentication
  - /recipes/real-time-websockets
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Server-Sent Events en Go. Construye streams de actualizacion en tiempo real con gestion de conexiones, heartbeats y manejo graceful de desconexiones de clientes."
  keywords:
    - server sent events
    - sse
    - golang
    - real time api
    - event stream
---

# Implementa Server-Sent Events en Go para Actualizaciones en Tiempo Real

Server-Sent Events proporcionan un canal ligero y unidireccional para enviar actualizaciones en tiempo real del servidor al cliente sobre HTTP. A diferencia de WebSockets, SSE usa conexiones HTTP estandar, no requiere upgrade de protocolo, y maneja reconexion automaticamente a traves de la API EventSource del navegador.

## Cuando Usar Esto

- Necesitas enviar notificaciones, logs o metricas en vivo a navegadores
- El servidor es el unico emisor; los clientes solo reciben (sin chat bidireccional)
- Quieres usar infraestructura HTTP existente (load balancers, CDNs)

## Requisitos Previos

- Go 1.21+ instalado
- Comprension basica de HTTP streaming y goroutines

## Solucion

### 1. Handler SSE Basico

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
			event := Event{
				ID:   fmt.Sprintf("%d", time.Now().Unix()),
				Type: "ping",
				Data: `{"timestamp": ` + fmt.Sprintf("%d", time.Now().Unix()) + `}`,
			}
			fmt.Fprint(w, event.String())
			flusher.Flush()
		}
	}
}
```

### 2. Hub para Gestion de Conexiones

```go
// sse/hub.go
package sse

import (
	"sync"
)

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
			// Canal lleno, descarta evento para este cliente
		}
	}
}
```

### 3. Handler de Produccion con Heartbeat

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

		// Enviar evento inicial de conexion
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

### 4. Cliente EventSource

```javascript
// client.js
const evtSource = new EventSource('/api/events');

evtSource.addEventListener('connected', (e) => {
  console.log('Conectado:', JSON.parse(e.data));
});

evtSource.addEventListener('price-update', (e) => {
  const update = JSON.parse(e.data);
  document.getElementById('price').textContent = update.price;
});

evtSource.onerror = (err) => {
  console.error('Error SSE:', err);
  // El navegador se reconecta automaticamente con backoff exponencial
};

// Cleanup al cerrar pagina
window.addEventListener('beforeunload', () => {
  evtSource.close();
});
```

## Como Funciona

1. **HTTP Stream** envia eventos como text/plain con content type `text/event-stream`
2. **Formato de Evento** usa campos `data:`, `event:`, `id:`, y `retry:` por linea
3. **Reconexion del Navegador** es automatica con tracking de last-event-id
4. **Heartbeat Comments** (`: ping`) mantienen conexiones vivas a traves de proxies

## Consideraciones de Produccion

- Ejecuta endpoints SSE detras de **[load balancers HTTP/2](/recipes/api/nginx-reverse-proxy)** para multiplexing
- Usa **Redis Pub/Sub** para broadcast entre multiples instancias de servidor Go. Consulta [Notificaciones en Tiempo Real](/recipes/api/real-time-notifications) para patrones de Redis pub/sub.
- Limita **conexiones por IP de cliente** para prevenir agotamiento de recursos
- Configura **write timeouts** apropiados, mayores que endpoints REST estandar

## Errores Comunes

- Olvidar llamar `Flush()` despues de cada evento
- No manejar desconexion de cliente, dejando goroutines ejecutandose
- Faltar `Cache-Control: no-cache`, causando que proxies bufferdeen eventos

## FAQ

**P: Como se compara SSE con WebSockets?**
R: SSE es mas simple para push servidor-a-cliente. Usa [WebSockets](/recipes/api/websocket-server) cuando necesites comunicacion bidireccional o datos binarios.

**P: Puede SSE funcionar a traves de proxies corporativos?**
R: Si, pero algunos proxies tienen timeouts agresivos. Envia heartbeat comments cada 30 segundos para mantener conexiones abiertas.

**P: Cual es el numero maximo de conexiones SSE concurrentes?**
R: El limite del navegador es 6 conexiones por dominio. Usa HTTP/2 o una conexion compartida para evitar esto.

### ¿Cómo manejo la reconexión del cliente con Last-Event-ID?

El header HTTP `Last-Event-ID` es enviado por el navegador cuando una conexión SSE cae y el cliente se reconecta. En el servidor, lee este header y replayea cualquier evento con ID mayor que el último recibido. Asigna IDs secuenciales a los eventos usando el campo `id:` en el formato SSE. Almacena eventos recientes en un ring buffer en memoria (ej., últimos 100 eventos por canal) para que los clientes reconectados puedan ponerse al día sin perder mensajes.

### ¿Debo usar SSE o WebSocket para actualizaciones en tiempo real?

Usa SSE para streams solo servidor-a-cliente (notificaciones, feeds en vivo, dashboards). SSE es más simple: usa HTTP estándar, soporta auto-reconexión y funciona a través de proxies con configuración mínima. Usa WebSocket cuando necesitas comunicación bidireccional (chat, edición colaborativa, gaming). SSE tiene un límite de navegador de 6 conexiones concurrentes por dominio sobre HTTP/1.1, pero HTTP/2 elimina este límite.

### ¿Cómo broadcasteo SSE a múltiples clientes en Go?

Mantén un map de clientes conectados, cada uno con su propio channel. Al broadcastear, itera sobre el map y envía el evento al channel de cada cliente usando un send non-blocking (`select` con case `default`). Remueve clientes desconectados del map al cerrar. Para fan-out grande, usa un pub/sub broker como Redis Pub/Sub para que múltiples procesos Go compartan la carga de broadcast.

### ¿Cómo testeo endpoints SSE en Go?

Usa `httptest.NewServer` para iniciar el handler in-process. Conéctate con un cliente SSE (ej., paquete Go `eventsource` o un cliente HTTP raw que lea el body línea por línea). Aserta que los eventos lleguen en orden con data correcta. Para load testing, abre muchas conexiones concurrentes y mide la latencia de eventos. Usa `context.WithTimeout` para cancelar tests de larga duración.

### ¿Cómo aseguro endpoints SSE con autenticación?

Pasa tokens de auth como query parameters (`?token=...`) ya que las conexiones SSE no pueden setear headers custom desde la API `EventSource` del navegador. Valida el token server-side antes de registrar al cliente. Para producción, usa tokens de corta duración y rotalos. Alternativamente, usa cookies para auth (el navegador envía cookies con requests SSE automáticamente). Para SSE cross-origin, configura headers CORS en el endpoint SSE.

### ¿Cómo manejo la limpieza de conexiones SSE en Go?

Usa `context.Context` para propagar cancelación. Cuando el HTTP handler retorna, el context del request es cancelado — escucha `<-ctx.Done()` en tu event loop y cierra el flusher. Remueve el cliente del connection map dentro de un `defer` block para asegurar que la limpieza se ejecute incluso en panic. Setea un write timeout en cada flush para detectar conexiones stale. Ejecuta una goroutine en background que periódicamente chequee conexiones muertas y las remueva.

### ¿Cómo comprimo respuestas SSE en Go?

Habilita compresión gzip con `middleware.Compress` de chi o el middleware `Gzip` de gin. Las respuestas SSE se benefician de compresión cuando los eventos contienen payloads JSON repetitivos. Setea `Content-Encoding: gzip` y flushea después de cada chunk comprimido. Ten en cuenta que la compresión añade overhead de CPU por evento — benchmarkea con tamaños de payload realistas para determinar si mejora el throughput para tu caso de uso.

### ¿Cómo manejo SSE detrás de un load balancer?

Usa sticky sessions (session affinity) para que un cliente siempre se conecte a la misma instancia de backend. Configura tu load balancer (ALB, nginx, HAProxy) con timeouts largos (ej., 1 hora) para prevenir drops prematuros de conexión. Deshabilita response buffering en nginx: `proxy_buffering off;` y `proxy_cache off;`. Para broadcasting multi-instancia, usa Redis Pub/Sub para fanear eventos a todas las instancias de backend, cada una manteniendo sus propias conexiones SSE.

### ¿Cómo implemento event IDs SSE para replay?

Asigna un ID monotonically incremental a cada evento usando el campo `id:` en el formato SSE. Almacena eventos en un ring buffer keyed por ID. Cuando un cliente se reconecta con `Last-Event-ID: 42`, replayea eventos 43+ desde el buffer. Setea un TTL en los eventos almacenados (ej., 5 minutos) para limitar el uso de memoria. Para eventos más allá del window del buffer, retorna `204 No Content` y deja que el cliente decida si empezar fresh o mostrar un mensaje de reconexión.
