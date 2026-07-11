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

La arquitectura orientada a eventos (EDA) es un patrón donde los servicios se comunican produciendo y consumiendo eventos en lugar de llamadas directas. Desacopla productores de consumidores, habilita crecimiento y soporta desacoplamiento temporal — los consumidores no necesitan estar online cuando los eventos se producen.

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

Separa modelos de lectura y escritura. Las escrituras van al modelo de comando; las lecturas vienen de modelos de lectura optimizados poblados por eventos. Consulta [diseño de bases de datos](/guides/databases/database-design-guide).

```
┌──────────────┐    Evento OrderPlaced     ┌──────────────┐
│  Comando     │ ───────────────────────> │  Modelo      │
│  Modelo      │                          │  Lectura     │
│  (PostgreSQL)│                          │  (Elastic)   │
└──────────────┘                          │  búsqueda    │
                                          └──────────────┘
```

**Cuándo usar:** Los patrones de lectura y escritura difieren considerablemente (ej: escrituras relacionales, lecturas optimizadas para búsqueda).

### 4. Patrón Saga

Maneja transacciones distribuidas usando una secuencia de transacciones locales, cada una publicando un evento que dispara la siguiente. Común en [microservicios](/guides/architecture/microservices-architecture-guide).

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

## Lo que funciona

- **Diseña eventos como hechos, no instrucciones** — `OrderPlaced`, no `ProcessOrder`
- **Incluye correlation IDs** — [traza una solicitud](/recipes/observability/distributed-tracing) a través de servicios y tiempo
- **Hace consumidores idempotentes** — la entrega at-least-once significa que los eventos pueden procesarse dos veces. Consulta [idempotencia de mensajes](/recipes/messaging/message-idempotency).
- **Versiona tus eventos** — `OrderPlacedV1`, `OrderPlacedV2` para soportar migración gradual
- **Monitorea consumer lag** — consumidores con lag son señal de problemas de escalado o performance
- **Usa dead letter queues** — mensajes fallidos no deberían bloquear la cola. Consulta [dead letter queues](/recipes/messaging/dead-letter-queue).

## Errores Comunes

- Tratar eventos como comandos — los eventos anuncian hechos; no exigen acción
- No manejar duplicados — asume at-least-once y diseña para [idempotencia](/recipes/messaging/message-idempotency)
- Ignorar consumer lag hasta que es una crisis — monitorea y alerta sobre métricas de lag
- Construir brokers de mensajes custom — usa sistemas probados (Kafka, RabbitMQ, NATS, AWS SNS/SQS)
- Usar eventos para request/response simple — agrega complejidad innecesaria

## Preguntas Frecuentes

### ¿Cómo debuggeo un sistema orientado a eventos?

Usa [trazado distribuido](/recipes/observability/distributed-tracing) (OpenTelemetry, Jaeger) e IDs de correlación. Loguea cada evento producido y consumido con el mismo trace ID. Construye un "trace viewer" que muestre el camino de una solicitud a través de servicios.

### ¿Qué pasa si un consumidor está caído cuando se publica un evento?

Con brokers durables (Kafka, colas persistentes), los eventos se retienen. El consumidor se pone al día cuando vuelve. Define políticas de retención basadas en tus objetivos de tiempo de recuperación.

### ¿Toda comunicación entre microservicios debería ser async?

No. Usa sync para consultas en tiempo real y cuando el llamador necesita una respuesta inmediata. Usa async para trabajo en background, notificaciones y desacoplamiento. Un sistema saludable usa ambos.


## Temas Avanzados

### Escenario Detallado: Procesamiento de Ordenes con Kafka y Saga

```text
Sistema: Procesamiento de ordenes e-commerce (Java + Spring Boot + Kafka)
Servicios: Order, Payment, Inventory, Shipping, Notifications
Patron: Choreography Saga con topics de Kafka

Topics de Kafka:
  orders.created      (particionado por order_id, 12 particiones)
  payments.processed  (particionado por order_id, 6 particiones)
  inventory.reserved  (particionado por order_id, 6 particiones)
  shipping.created    (particionado por order_id, 6 particiones)
  orders.cancelled    (particionado por order_id, 6 particiones)
  orders.completed    (particionado por order_id, 6 particiones)

Flujo saga (camino feliz):
  1. Order Service: crear orden (PENDING) -> publica orders.created
  2. Payment Service: consume orders.created -> cobra tarjeta
     - Exito: publica payments.processed { status: SUCCESS }
     - Fallo: publica payments.processed { status: FAILED }
  3. Inventory Service: consume payments.processed (SUCCESS)
     - Reservar stock -> publica inventory.reserved { status: RESERVED }
     - Sin stock: publica inventory.reserved { status: FAILED }
  4. Shipping Service: consume inventory.reserved (RESERVED)
     - Crear envio -> publica shipping.created
  5. Order Service: consume shipping.created
     - Actualizar orden a SHIPPED -> publica orders.completed
  6. Notifications Service: consume orders.completed
     - Envia email de confirmacion de envio

Flujo saga (compensacion - pago falla):
  1. Payment Service: publica payments.processed { status: FAILED }
  2. Order Service: consume payments.processed (FAILED)
     - Actualizar orden a CANCELLED
     - Publica orders.cancelled { reason: PAYMENT_FAILED }
  3. Notifications Service: consume orders.cancelled
     - Envia email de fallo de pago

Configuracion de consumer (Spring Boot):
  @KafkaListener(topics = "orders.created", groupId = "payment-service")
  public void handleOrderCreated(OrderCreatedEvent event) {
      try {
          PaymentResult result = paymentGateway.charge(
              event.getPaymentMethodId(), event.getTotal());
          if (result.isSuccess()) {
              kafkaTemplate.send("payments.processed",
                  new PaymentProcessedEvent(event.getOrderId(), "SUCCESS"));
          } else {
              kafkaTemplate.send("payments.processed",
                  new PaymentProcessedEvent(event.getOrderId(), "FAILED"));
          }
      } catch (Exception e) {
          throw new PaymentProcessingException(e);
      }
  }

Idempotencia (critico para entrega at-least-once):
  @KafkaListener(topics = "orders.created", groupId = "payment-service")
  public void handleOrderCreated(OrderCreatedEvent event) {
      if (processedOrders.contains(event.getOrderId())) {
          return; // Ya procesado, saltar
      }
      processPayment(event);
      processedOrders.add(event.getOrderId()); // Redis SET con TTL
  }

Configuracion de dead letter queue:
  spring.kafka.consumer.properties.max.poll.records=500
  spring.kafka.listener.retry.max-attempts=3
  spring.kafka.listener.retry.back-off-initial-interval=1000
  spring.kafka.listener.retry.back-off-multiplier=2.0
  // Despues de 3 reintentos, mensaje va a topic DLT
  // Naming: orders.created.DLT

Monitoreo:
  - Consumer lag: kafka-consumer-groups --describe --group payment-service
  - Alertar si lag > 1000 mensajes por > 5 minutos
  - Dashboard Grafana: lag por particion, throughput, error rate
  - Correlacion de traces: X-Trace-Id propagado en headers de eventos

Evolucion de esquema (Avro + Schema Registry):
  - Eventos serializados como Avro con esquema en Confluent Schema Registry
  - Cambios backward compatible: anadir campos opcionales con defaults
  - Cambios breaking: nuevo topic (orders.created.v2) o check de compatibilidad falla
  - Consumer auto-deserializa usando schema ID del registry
```

### Como testeo sistemas orientados a eventos?

Usa tres niveles: (1) Tests unitarios para handlers de eventos con Kafka mockeado, (2) Tests de integracion con Testcontainers (Kafka real en Docker), (3) Tests de contrato para esquemas de eventos usando compatibility checks del schema registry. Para end-to-end, usa un consumer de test que se suscribe a todos los topics y verifica que la saga completa. Testea rutas de compensacion explicitamente: inyecta un fallo de pago y verifica que la orden se cancele y se envien notificaciones.
