---




contentType: patterns
slug: event-carried-state-transfer-pattern
title: "Patrón Event-Carried State Transfer"
description: "Replica cambios de estado a través de servicios publicando eventos que llevan el estado completo actualizado de la entidad, permitiendo a los consumidores mantener sus propias copias locales sin consultar el origen."
metaDescription: "Aprende el Patrón Event-Carried State Transfer para replicar estado via eventos. Ejemplos en Python, Java y JavaScript con Kafka y proyecciones locales."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - event-carried-state-transfer
  - pattern
  - design-pattern
  - event-driven
  - state-replication
  - kafka
  - microservices
relatedResources:
  - /patterns/event-sourcing-pattern
  - /patterns/cqrs-pattern
  - /patterns/database-per-service-pattern
  - /patterns/compensating-transaction-pattern
  - /patterns/claim-check-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Event-Carried State Transfer para replicar estado via eventos. Ejemplos en Python, Java y JavaScript con Kafka y proyecciones locales."
  keywords:
    - event carried state transfer
    - design pattern
    - event driven
    - state replication
    - kafka
    - microservices




---

# Patrón Event-Carried State Transfer

## Descripción General

El Patrón Event-Carried State Transfer (ECST) replica cambios de estado a través de servicios distribuidos publicando eventos que llevan el estado completo actualizado de la entidad. Cuando un servicio modifica una entidad, emite un evento conteniendo el nuevo estado completo de esa entidad. Los servicios consumidores almacenan este estado localmente, eliminando la necesidad de consultar el servicio origen para lecturas.

A diferencia de Event Sourcing (que almacena una secuencia de eventos de dominio como fuente de verdad), ECST usa eventos puramente como mecanismo de distribución. El evento mismo es un snapshot: `CustomerUpdated` lleva el objeto cliente completo, no solo los campos que cambiaron. Los consumidores tratan esto como un reemplazo de su copia local.

Este patrón es particularmente valioso en arquitecturas de microservicios donde los servicios necesitan acceso de solo-lectura a datos poseídos por otros servicios. En lugar de llamadas API síncronas (que crean acoplamiento y latencia), los consumidores mantienen réplicas eventualmente consistentes alimentadas por el stream de eventos.

## Cuándo Usar


- For alternatives, see [Idempotent Consumer Pattern](/es/patterns/idempotent-consumer-pattern/).

Usa el Patrón Event-Carried State Transfer cuando:
- Múltiples servicios necesitan acceso de lectura a datos poseídos por otro servicio
- La latencia de lectura debe ser baja y predecible (sin llamadas cross-service)
- La disponibilidad del servicio origen no debería afectar operaciones de lectura
- Los datos cambian relativamente infrecuentemente comparado con el volumen de lectura

## Cuándo Evitar

- Los datos cambian extremadamente frecuentemente (alto volumen de escritura crea tormenta de eventos)
- Se requiere consistencia fuerte entre origen y réplicas (ECST es eventualmente consistente)
- Los datos son demasiado grandes para caber eficientemente en eventos (usa Claim Check en su lugar)
- Una simple llamada API en lectura es suficiente y el caching maneja la carga

## Solución

### Python (Kafka + Proyecciones Locales)

```python
from dataclasses import dataclass, asdict
from typing import Dict, Optional, List
import json
import sqlite3
from datetime import datetime

# ============================================================================
# EVENTOS DE DOMINIO (llevando estado completo de entidad)
# ============================================================================

@dataclass
class CustomerStateTransferEvent:
    event_id: str
    event_type: str  # "CUSTOMER_CREATED" o "CUSTOMER_UPDATED"
    customer_id: str
    payload: dict    # Estado completo del cliente
    timestamp: str
    version: int     # Número de secuencia para ordenamiento


# ============================================================================
# SOURCE SERVICE: Publica eventos de state transfer
# ============================================================================

class CustomerService:
    """Posee datos de cliente y publica eventos de state transfer"""
    def __init__(self, event_publisher):
        self.customers: Dict[str, dict] = {}
        self.event_publisher = event_publisher
        self.version_counter = 0

    def create_customer(self, customer_id: str, name: str, email: str,
                        tier: str = "basic") -> dict:
        customer = {
            "customer_id": customer_id,
            "name": name,
            "email": email,
            "tier": tier,
            "loyalty_points": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        self.customers[customer_id] = customer

        event = CustomerStateTransferEvent(
            event_id=f"evt-{self.version_counter}",
            event_type="CUSTOMER_CREATED",
            customer_id=customer_id,
            payload=customer.copy(),
            timestamp=datetime.now().isoformat(),
            version=self.version_counter
        )
        self.version_counter += 1
        self.event_publisher.publish(event)
        return customer

    def update_customer_tier(self, customer_id: str, new_tier: str) -> Optional[dict]:
        customer = self.customers.get(customer_id)
        if not customer:
            return None

        customer["tier"] = new_tier
        customer["updated_at"] = datetime.now().isoformat()

        event = CustomerStateTransferEvent(
            event_id=f"evt-{self.version_counter}",
            event_type="CUSTOMER_UPDATED",
            customer_id=customer_id,
            payload=customer.copy(),
            timestamp=datetime.now().isoformat(),
            version=self.version_counter
        )
        self.version_counter += 1
        self.event_publisher.publish(event)
        return customer


# ============================================================================
# EVENT BUS (simulando Kafka/RabbitMQ)
# ============================================================================

class EventBus:
    def __init__(self):
        self.topics: Dict[str, List[callable]] = {}

    def subscribe(self, topic: str, handler: callable):
        self.topics.setdefault(topic, []).append(handler)

    def publish(self, event: CustomerStateTransferEvent):
        topic = f"customer.{event.event_type.lower()}"
        for handler in self.topics.get(topic, []):
            handler(event)


# ============================================================================
# CONSUMER SERVICE: Mantiene réplica local
# ============================================================================

class OrderServiceConsumer:
    """Mantiene una copia local de solo-lectura de datos de clientes para procesamiento de órdenes"""
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_replicas (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                tier TEXT NOT NULL,
                loyalty_points INTEGER DEFAULT 0,
                version INTEGER NOT NULL,
                updated_at TIMESTAMP
            )
        """)
        self.conn.commit()

    def on_customer_event(self, event: CustomerStateTransferEvent):
        """Aplica evento de state transfer a réplica local"""
        payload = event.payload
        self.conn.execute("""
            INSERT OR REPLACE INTO customer_replicas
            (customer_id, name, email, tier, loyalty_points, version, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            payload["customer_id"], payload["name"], payload["email"],
            payload["tier"], payload.get("loyalty_points", 0),
            event.version, payload["updated_at"]
        ))
        self.conn.commit()
        print(f"[OrderService] Replicado cliente {payload['customer_id']} (v{event.version})")

    def get_customer_for_order(self, customer_id: str) -> Optional[dict]:
        """Lee desde réplica local — no se necesita llamada cross-service"""
        cursor = self.conn.execute(
            "SELECT * FROM customer_replicas WHERE customer_id = ?", (customer_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "customer_id": row[0], "name": row[1], "email": row[2],
                "tier": row[3], "loyalty_points": row[4], "version": row[5]
            }
        return None


# ============================================================================
# USO
# ============================================================================

bus = EventBus()
customer_service = CustomerService(bus)
order_service = OrderServiceConsumer()

# Suscribir order service a eventos de cliente
bus.subscribe("customer.customer_created", order_service.on_customer_event)
bus.subscribe("customer.customer_updated", order_service.on_customer_event)

# Crear cliente en source service
customer_service.create_customer("C-001", "Alice Johnson", "alice@example.com", "premium")

# Order service lee desde réplica local instantáneamente
customer = order_service.get_customer_for_order("C-001")
print(f"Order service ve: {customer}")

# Actualizar en source service
customer_service.update_customer_tier("C-001", "gold")

# Réplica local se actualiza via evento
customer = order_service.get_customer_for_order("C-001")
print(f"Después de update: {customer}")
```

### Java (Spring Cloud Stream + Kafka)

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

// Evento de state transfer
record CustomerStateTransferEvent(
    String eventId,
    String eventType,
    String customerId,
    CustomerPayload payload,
    long timestamp,
    int version
) {}

record CustomerPayload(
    String customerId, String name, String email,
    String tier, int loyaltyPoints, String updatedAt
) {}

// Source service: publica estado completo en cada cambio
@Service
class CustomerService {
    private final KafkaTemplate<String, CustomerStateTransferEvent> kafka;
    private final Map<String, CustomerPayload> customers = new HashMap<>();
    private int versionCounter = 0;

    public CustomerService(KafkaTemplate<String, CustomerStateTransferEvent> kafka) {
        this.kafka = kafka;
    }

    public CustomerPayload createCustomer(String id, String name, String email) {
        CustomerPayload customer = new CustomerPayload(
            id, name, email, "basic", 0, new Date().toString()
        );
        customers.put(id, customer);
        publishEvent("CUSTOMER_CREATED", customer);
        return customer;
    }

    public CustomerPayload updateTier(String id, String tier) {
        CustomerPayload existing = customers.get(id);
        CustomerPayload updated = new CustomerPayload(
            existing.customerId(), existing.name(), existing.email(),
            tier, existing.loyaltyPoints(), new Date().toString()
        );
        customers.put(id, updated);
        publishEvent("CUSTOMER_UPDATED", updated);
        return updated;
    }

    private void publishEvent(String type, CustomerPayload payload) {
        CustomerStateTransferEvent event = new CustomerStateTransferEvent(
            "evt-" + versionCounter, type, payload.customerId(),
            payload, System.currentTimeMillis(), versionCounter++
        );
        kafka.send("customer.state-transfer", event);
    }
}

// Consumer service: mantiene réplica local
@Service
class OrderServiceCustomerProjection {
    private final Map<String, CustomerPayload> localReplica = new HashMap<>();

    @KafkaListener(topics = "customer.state-transfer", groupId = "order-service")
    public void onCustomerEvent(CustomerStateTransferEvent event) {
        localReplica.put(event.customerId(), event.payload());
        System.out.println("[OrderService] Replicado cliente " + event.customerId());
    }

    public CustomerPayload getCustomerForOrder(String customerId) {
        return localReplica.get(customerId);
    }
}
```

### JavaScript (Node.js con Event Emitter / Redis Pub-Sub)

```javascript
const { EventEmitter } = require('events');

// Estructura de evento de state transfer
class CustomerStateTransferEvent {
  constructor(eventType, customerId, payload, version) {
    this.eventId = `evt-${Date.now()}`;
    this.eventType = eventType;
    this.customerId = customerId;
    this.payload = payload;
    this.timestamp = new Date().toISOString();
    this.version = version;
  }
}

// Source service: Customer Service
class CustomerService {
  constructor(eventBus) {
    this.customers = new Map();
    this.eventBus = eventBus;
    this.versionCounter = 0;
  }

  createCustomer(customerId, name, email, tier = 'basic') {
    const customer = {
      customerId, name, email, tier,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.customers.set(customerId, customer);

    const event = new CustomerStateTransferEvent(
      'CUSTOMER_CREATED', customerId, { ...customer }, this.versionCounter++
    );
    this.eventBus.emit('customer.state-transfer', event);
    return customer;
  }

  updateTier(customerId, newTier) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    customer.tier = newTier;
    customer.updatedAt = new Date().toISOString();

    const event = new CustomerStateTransferEvent(
      'CUSTOMER_UPDATED', customerId, { ...customer }, this.versionCounter++
    );
    this.eventBus.emit('customer.state-transfer', event);
    return customer;
  }
}

// Consumer: Order Service mantiene réplica local
class OrderServiceProjection {
  constructor() {
    this.localReplica = new Map();
  }

  onCustomerEvent(event) {
    this.localReplica.set(event.customerId, event.payload);
    console.log(`[OrderService] Replicado cliente ${event.customerId} (v${event.version})`);
  }

  getCustomerForOrder(customerId) {
    return this.localReplica.get(customerId);
  }
}

// Uso
const eventBus = new EventEmitter();
const customerService = new CustomerService(eventBus);
const orderService = new OrderServiceProjection();

eventBus.on('customer.state-transfer', (event) => {
  orderService.onCustomerEvent(event);
});

// Crear y actualizar cliente
customerService.createCustomer('C-001', 'Alice', 'alice@example.com', 'premium');
console.log('Copia local de order service:', orderService.getCustomerForOrder('C-001'));

customerService.updateTier('C-001', 'gold');
console.log('Después de update:', orderService.getCustomerForOrder('C-001'));
```

## Explicación

ECST funciona tratando los eventos como **snapshots de estado** en lugar de deltas de cambio:

1. **Source service** realiza un cambio en una entidad y emite el estado completo nuevo
2. **Message broker** (Kafka, RabbitMQ, Redis Streams) almacena y distribuye durablemente el evento
3. **Consumer services** reciben el evento y reemplazan su copia local con el nuevo estado
4. **Local reads** son rápidos y siempre disponibles, incluso si el source service está caído

Esto es fundamentalmente diferente de:
- **Event Sourcing**: Los eventos son la fuente de verdad, no snapshots para distribución
- **Change Data Capture (CDC)**: Eventos de cambio a nivel de base de datos, no snapshots de estado a nivel de dominio
- **API polling**: Los consumidores consultan activamente; ECST empuja estado proactivamente

## Variantes

| Variante | Payload | Caso de Uso |
|----------|---------|-------------|
| **Estado completo** | Snapshot completo de entidad | Entidades pequeñas, alta necesidad de lectura |
| **Delta + snapshot** | Campos cambiados + snapshot más reciente | Entidades grandes, sensible a ancho de banda |
| **Referencia + API** | Evento lleva ID, consumer obtiene si es necesario | Entidades muy grandes, lecturas selectivas |
| **Tombstones de delete** | Payload nulo con flag `isDeleted` | Tracking de borrados en réplicas |

## Lo que Funciona

- **Incluye un número de versión/secuencia.** Los consumidores pueden detectar eventos fuera de orden o duplicados.
- **Haz los eventos inmutables y aditivos.** Nunca modifiques un evento después de publicarlo.
- **Maneja replays gracefully.** Los consumidores deberían ser idempotentes (mismo evento dos veces = mismo resultado).
- **Establece políticas de retención.** Los topics de Kafka necesitan suficiente retención para que los consumidores alcancen después de downtime.
- **Monitorea el lag de replicación.** Alerta cuando un consumer se retrasa mucho del productor.

## Errores Comunes

- **Publicar solo deltas.** Los consumidores que inician después no pueden reconstruir estado sin el historial completo.
- **Olvidar eventos de borrado.** Sin tombstones, las entidades borradas permanecen para siempre en réplicas de consumidores.
- **No manejar evolución de schema.** Agrega campos sin romper consumidores existentes (compatibilidad hacia adelante).
- **Usar ECST para necesidades de tiempo real.** El lag de replicación significa que los datos están segundos atrás; no lo uses para consistencia estricta.
- **Oversharing de eventos.** No todo servicio necesita toda entidad. Usa partición de topics o filtrado.

## Ejemplos del Mundo Real

### Uber

Los microservicios de Uber usan Kafka y Apache Flink para replicar estado a través de servicios. La ubicación de un conductor, el perfil de un pasajero y el estado de un viaje se propagan todos via eventos que llevan snapshots completos, permitiendo a cada servicio servir lecturas desde stores locales.

### Shopify

Shopify replica datos de comerciantes (productos, inventario, órdenes) a servicios de búsqueda usando event-carried state transfer. El índice de búsqueda es una proyección local mantenida consumiendo eventos de state transfer, habilitando búsqueda rápida de productos sin golpear la base de datos primaria.

### LinkedIn

LinkedIn usa Brooklin (su plataforma de data streaming) para replicar datos entre microservicios. Perfiles de miembros, grafos de conexiones y feeds de actividad se distribuyen todos como eventos de state transfer a servicios que necesitan acceso de lectura.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre ECST y Event Sourcing?**
A: En Event Sourcing, una secuencia de eventos de dominio es la fuente de verdad. En ECST, los eventos son un mecanismo de distribución llevando snapshots de estado completos. La base de datos permanece como fuente de verdad en ECST.

**Q: Cómo se compara esto con CQRS?**
A: ECST se usa frecuentemente para implementar CQRS. El write model emite eventos de state transfer; el read model los consume para construir proyecciones optimizadas para queries.

**Q: Qué pasa si el evento es más grande que el límite del broker de mensajes?**
A: Usa el Patrón Claim Check: almacena el payload completo en object storage y envía una referencia en el evento.

**Q: Cómo manejo un consumidor que ha estado caído por días?**
A: Los consumidores de Kafka reanudan desde su último offset commiteado. Si la retención expiró, implementa un patrón de snapshot + catch-up donde el consumidor primero obtiene el estado actual, luego consume desde el offset más reciente.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
