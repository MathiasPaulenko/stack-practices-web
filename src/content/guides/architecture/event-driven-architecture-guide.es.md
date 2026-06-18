---
contentType: guides
slug: event-driven-architecture-guide
title: "Arquitectura Orientada a Eventos — Colas, Tópicos y Streams"
description: "Guía práctica de arquitectura orientada a eventos: eventos vs comandos, brokers de mensajes, patrones como CQRS y Saga, y cuándo elegir async sobre sync."
metaDescription: "Guía de arquitectura orientada a eventos: eventos vs comandos, brokers de mensajes, CQRS, Saga. Aprende cuándo usar colas, tópicos y streams en sistemas distribuidos."
difficulty: advanced
topics:
  - architecture
  - devops
tags:
  - architecture
  - cqrs
  - devops
  - event-driven
  - guia
  - saga
relatedResources:
  - /guides/architecture/microservices-architecture-guide
  - /guides/architecture/domain-driven-design-guide
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de arquitectura orientada a eventos: eventos vs comandos, brokers de mensajes, CQRS, Saga. Aprende cuándo usar colas, tópicos y streams en sistemas distribuidos."
  keywords:
    - arquitectura orientada a eventos
    - brokers de mensajes kafka
    - patron cqrs
    - patron saga
    - event sourcing
    - comunicacion asincrona
---

# Arquitectura Orientada a Eventos

## Introducción

La arquitectura orientada a eventos (EDA) es un patrón donde los servicios se comunican produciendo y consumiendo eventos en lugar de llamadas directas. Desacopla productores de consumidores, habilita escalabilidad y soporta desacoplamiento temporal — los consumidores no necesitan estar online cuando los eventos se producen.

## Eventos vs Comandos

Entender la diferencia es fundamental para diseñar EDA correctamente.

| | Evento | Comando |
|---|--------|---------|
| **Intención** | Algo pasó | Haz algo |
| **Dirección** | Broadcast (muchos pueden escuchar) | Dirigido (un handler) |
| **Ejemplo** | `OrderPlaced` | `ChargeCustomer` |
| **Manejo de fallos** | Los consumidores manejan sus propios reintentos | El emisor debe saber si falló |
| **Acoplamiento** | Débil | Más fuerte |

```python
# Evento: el servicio de órdenes anuncia que una orden fue colocada
def publish_order_placed(order):
    bus.publish("orders.placed", {
        "order_id": order.id,
        "user_id": order.user_id,
        "total": order.total
    })

# Comando: el servicio de órdenes le dice al servicio de pagos que cobre
# (Solo haz esto cuando el servicio de pagos DEBE procesarlo)
def charge_customer(payment_request):
    payment_service.charge(payment_request)  # sync o command queue
```

**Regla general:** Prefiere eventos. Usa comandos solo cuando la acción debe pasar y el llamador necesita saber el resultado.

## Tipos de Message Broker

### Colas (Punto a Punto)

Un mensaje → un consumidor. Bueno para distribuir trabajo.

```python
import pika

# Productor
channel.basic_publish(exchange='', routing_key='email_queue', body=message)

# Consumidor (uno de muchos workers)
channel.basic_consume(queue='email_queue', on_message_callback=process_email)
```

**Usar para:** jobs en background, colas de tareas, nivelación de carga.

### Tópicos (Publicar-Suscribir)

Un mensaje → muchos consumidores. Bueno para broadcasting.

```python
# Kafka: un evento, múltiples grupos de consumidores
producer.send('orders', order_event)

# Grupo de consumidores A: envía email de confirmación
consumer_a.subscribe(['orders'])

# Grupo de consumidores B: actualiza data warehouse de analytics
consumer_b.subscribe(['orders'])
```

**Usar para:** fan-out, event sourcing, notificaciones cross-servicio.

### Streams

Log de eventos ordenado, replayable y durable.

| Característica | Cola | Tópico | Stream |
|---------|------|--------|--------|
| Durabilidad | Hasta consumir | Hasta que todos los grupos consumen | Retenido por política (días) |
| Ordenamiento | Dentro de la cola | Dentro de partición | Dentro de partición |
| Replay | No | No | Sí |
| Paralelismo | Múltiples consumidores | Grupos de consumidores | Grupos de consumidores |

**Usa streams cuando:** necesites replay, garantías de ordenamiento, o event sourcing.

## Patrones Principales

### 1. Event Notification

El patrón más simple: un servicio notifica a otros que algo pasó.

```
Servicio de Órdenes ──OrderPlaced──> Servicio de Email (envía confirmación)
               ──OrderPlaced──> Servicio de Analytics (registra métricas)
               ──OrderPlaced──> Servicio de Inventario (reserva stock)
```

**Trade-off:** Los consumidores son responsables de traer los datos que necesitan. El evento es una notificación, no un payload.

### 2. Event-Carried State Transfer

El evento lleva los datos que los consumidores necesitan, eliminando consultas extra.

```json
{
  "event_type": "OrderPlaced",
  "order_id": "ord-123",
  "user_id": "usr-456",
  "items": [
    {"sku": "A1", "qty": 2, "price": 10.00}
  ],
  "total": 20.00,
  "timestamp": "2024-06-12T10:00:00Z"
}
```

**Trade-off:** Los eventos son más grandes y pueden traer datos que los consumidores no necesitan. El versionado se vuelve importante a medida que evolucionan los esquemas.

### 3. CQRS (Command Query Responsibility Segregation)

Separa modelos de lectura y escritura. Las escrituras van al modelo de comando; las lecturas vienen de modelos de lectura optimizados poblados por eventos.

```
┌──────────────┐    Evento OrderPlaced     ┌──────────────┐
│  Comando     │ ───────────────────────> │  Modelo      │
│  Modelo      │                          │  Lectura     │
│  (PostgreSQL)│                          │  (Elastic)   │
└──────────────┘                          │  búsqueda    │
                                          └──────────────┘
```

**Cuándo usar:** Los patrones de lectura y escritura difieren significativamente (ej: escrituras relacionales, lecturas optimizadas para búsqueda).

### 4. Patrón Saga

Maneja transacciones distribuidas usando una secuencia de transacciones locales, cada una publicando un evento que dispara la siguiente.

```
Servicio de Órdenes: crea orden → publica OrderCreated
Servicio de Pagos: carga tarjeta → publica PaymentProcessed
Servicio de Inventario: reserva stock → publica InventoryReserved
Servicio de Envíos: crea envío → publica ShipmentCreated
```

**Transacciones compensatorias** deshacen pasos previos si uno posterior falla:

```python
def on_payment_failed(event):
    # Compensar: cancelar la orden
    order_service.cancel(event.order_id)
    inventory_service.release(event.order_id)
```

**Cuándo usar:** Procesos de negocio de larga duración que abarcan múltiples servicios.

## Cuándo Elegir Async Sobre Sync

| Sync (REST/gRPC) | Async (Eventos) |
|------------------|-----------------|
| Respuesta en tiempo real necesaria | Consistencia eventual aceptable |
| Acoplamiento ajustado aceptable | Desacoplamiento requerido |
| Modos de fallo simples aceptables | Manejo de fallos complejo aceptable |
| Latencia baja crítica | Throughput y resiliencia críticos |

## Mejores Prácticas

- **Diseña eventos como hechos, no instrucciones** — `OrderPlaced`, no `ProcessOrder`
- **Incluye correlation IDs** — traza una solicitud a través de servicios y tiempo
- **Hace consumidores idempotentes** — la entrega at-least-once significa que los eventos pueden procesarse dos veces
- **Versiona tus eventos** — `OrderPlacedV1`, `OrderPlacedV2` para soportar migración gradual
- **Monitorea consumer lag** — consumidores con lag son señal de problemas de escalado o performance
- **Usa dead letter queues** — mensajes fallidos no deberían bloquear la cola; analízalos por separado

## Errores Comunes

- Tratar eventos como comandos — los eventos anuncian hechos; no exigen acción
- No manejar duplicados — asume at-least-once y diseña para idempotencia
- Ignorar consumer lag hasta que es una crisis — monitorea y alerta sobre métricas de lag
- Construir brokers de mensajes custom — usa sistemas probados (Kafka, RabbitMQ, NATS, AWS SNS/SQS)
- Usar eventos para request/response simple — agrega complejidad innecesaria

## Preguntas Frecuentes

### ¿Cómo debuggeo un sistema orientado a eventos?

Usa trazado distribuido (OpenTelemetry, Jaeger) e IDs de correlación. Loguea cada evento producido y consumido con el mismo trace ID. Construye un "trace viewer" que muestre el camino de una solicitud a través de servicios.

### ¿Qué pasa si un consumidor está caído cuando se publica un evento?

Con brokers durables (Kafka, colas persistentes), los eventos se retienen. El consumidor se pone al día cuando vuelve. Define políticas de retención basadas en tus objetivos de tiempo de recuperación.

### ¿Toda comunicación entre microservicios debería ser async?

No. Usa sync para consultas en tiempo real y cuando el llamador necesita una respuesta inmediata. Usa async para trabajo en background, notificaciones y desacoplamiento. Un sistema saludable usa ambos.
