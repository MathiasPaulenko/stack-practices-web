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
lastUpdated: "2026-06-18"
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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
