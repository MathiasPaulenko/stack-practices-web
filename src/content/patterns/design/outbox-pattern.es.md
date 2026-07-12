---





contentType: patterns
slug: outbox-pattern
title: "Patrón Outbox"
description: "Publica eventos de dominio de forma confiable persistiéndolos en una tabla outbox dentro de la misma transacción de base de datos que la operación de negocio."
metaDescription: "Aprende el Patrón Outbox para publicación confiable de eventos en sistemas distribuidos. Ejemplos en Python, Java y SQL para entrega at-least-once."
difficulty: advanced
topics:
  - design
tags:
  - outbox
  - pattern
  - design-pattern
  - behavioral
  - microservices
  - messaging
  - reliability
  - distributed-systems
relatedResources:
  - /patterns/event-bus-pattern
  - /patterns/saga-pattern
  - /patterns/inbox-pattern
  - /patterns/aggregate-pattern
  - /patterns/claim-check-pattern
  - /patterns/compensating-transaction-pattern
  - /patterns/domain-event-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Outbox para publicación confiable de eventos en sistemas distribuidos. Ejemplos en Python, Java y SQL para entrega at-least-once."
  keywords:
    - outbox pattern
    - design pattern
    - microservices
    - event publishing
    - distributed systems





---

# Patrón Outbox

## Descripción General

El Patrón Outbox garantiza la entrega confiable de eventos de dominio en sistemas distribuidos escribiendo eventos en una tabla "outbox" de base de datos dentro de la misma transacción que la operación de negocio. Un proceso relay separado lee eventos no publicados del outbox y los reenvía a un message broker.

Sin el outbox, un servicio podría actualizar su base de datos, fallar antes de publicar el evento, y dejar a los sistemas downstream permanentemente desincronizados. El outbox asegura atomicidad: o se confirman tanto los datos de negocio como el evento, o ninguno.

## Cuándo Usar

Usa el Patrón Outbox cuando:
- Un microservicio debe publicar eventos después de una actualización de base de datos
- Necesitas garantías de entrega at-least-once a message brokers
- El message broker es poco confiable o temporalmente no disponible
- No puedes usar un coordinador de transacciones distribuidas (2PC)
- La consistencia eventual es aceptable, pero los eventos perdidos no lo son

## Cuándo Evitar

- La entrega síncrona de eventos es requerida (el outbox es inherentemente asíncrono)
- El sistema es un monolito con base de datos compartida
- La base de datos no soporta transacciones
- El ordenamiento de eventos entre aggregates es estrictamente requerido (considera event sourcing en su lugar)

## Solución

### SQL Schema

```sql
-- Tabla outbox: almacena eventos antes de publicarlos
CREATE TABLE outbox (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    retry_count INT DEFAULT 0
);

CREATE INDEX idx_outbox_unpublished ON outbox(published_at) WHERE published_at IS NULL;
```

### Python

```python
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import psycopg2

@dataclass
class DomainEvent:
    event_type: str
    aggregate_type: str
    aggregate_id: str
    payload: dict

class OutboxPublisher:
    def __init__(self, db_connection):
        self.conn = db_connection

    def publish(self, event: DomainEvent):
        """Escribe el evento en la tabla outbox dentro de la transacción del caller."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
                VALUES (%s, %s, %s, %s)
                """,
                (event.aggregate_type, event.aggregate_id,
                 event.event_type, json.dumps(event.payload))
            )

class OrderService:
    def __init__(self, db_connection, outbox: OutboxPublisher):
        self.conn = db_connection
        self.outbox = outbox

    def place_order(self, user_id: str, product_id: str, amount: float):
        with self.conn:
            with self.conn.cursor() as cur:
                # Operación de negocio
                cur.execute(
                    "INSERT INTO orders (user_id, product_id, amount) VALUES (%s, %s, %s) RETURNING id",
                    (user_id, product_id, amount)
                )
                order_id = cur.fetchone()[0]

                # Evento escrito en la misma transacción
                self.outbox.publish(DomainEvent(
                    event_type="OrderPlaced",
                    aggregate_type="Order",
                    aggregate_id=str(order_id),
                    payload={"user_id": user_id, "product_id": product_id, "amount": amount}
                ))

class OutboxRelay:
    def __init__(self, db_connection, message_broker):
        self.conn = db_connection
        self.broker = message_broker

    def run(self):
        with self.conn:
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, aggregate_type, aggregate_id, event_type, payload
                    FROM outbox
                    WHERE published_at IS NULL
                    ORDER BY id
                    LIMIT 100
                    FOR UPDATE SKIP LOCKED
                    """
                )
                rows = cur.fetchall()

                for row in rows:
                    event_id, agg_type, agg_id, event_type, payload = row
                    try:
                        self.broker.publish(event_type, {
                            "aggregate_type": agg_type,
                            "aggregate_id": agg_id,
                            "payload": payload
                        })
                        cur.execute(
                            "UPDATE outbox SET published_at = NOW() WHERE id = %s",
                            (event_id,)
                        )
                    except Exception:
                        cur.execute(
                            "UPDATE outbox SET retry_count = retry_count + 1 WHERE id = %s",
                            (event_id,)
                        )
```

### Java

```java
import java.sql.*;
import java.time.Instant;

public class OutboxPublisher {
    private final Connection conn;

    public OutboxPublisher(Connection conn) {
        this.conn = conn;
    }

    public void publish(String aggregateType, String aggregateId,
                        String eventType, String payload) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
            "INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload) VALUES (?, ?, ?, ?)")) {
            ps.setString(1, aggregateType);
            ps.setString(2, aggregateId);
            ps.setString(3, eventType);
            ps.setString(4, payload);
            ps.executeUpdate();
        }
    }
}

public class OrderService {
    private final Connection conn;
    private final OutboxPublisher outbox;

    public OrderService(Connection conn, OutboxPublisher outbox) {
        this.conn = conn;
        this.outbox = outbox;
    }

    public void placeOrder(String userId, String productId, double amount) throws SQLException {
        conn.setAutoCommit(false);
        try {
            long orderId;
            try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO orders (user_id, product_id, amount) VALUES (?, ?, ?)", Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, userId);
                ps.setString(2, productId);
                ps.setDouble(3, amount);
                ps.executeUpdate();
                ResultSet rs = ps.getGeneratedKeys();
                rs.next();
                orderId = rs.getLong(1);
            }

            outbox.publish("Order", String.valueOf(orderId), "OrderPlaced",
                String.format("{\"user_id\":\"%s\",\"product_id\":\"%s\",\"amount\":%f}", userId, productId, amount));

            conn.commit();
        } catch (Exception e) {
            conn.rollback();
            throw e;
        }
    }
}
```

### JavaScript

```javascript
class OutboxPublisher {
  constructor(db) {
    this.db = db;
  }

  async publish(aggregateType, aggregateId, eventType, payload) {
    await this.db.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2, $3, $4)`,
      [aggregateType, aggregateId, eventType, JSON.stringify(payload)]
    );
  }
}

class OrderService {
  constructor(db, outbox) {
    this.db = db;
    this.outbox = outbox;
  }

  async placeOrder(userId, productId, amount) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'INSERT INTO orders (user_id, product_id, amount) VALUES ($1, $2, $3) RETURNING id',
        [userId, productId, amount]
      );
      const orderId = result.rows[0].id;

      await this.outbox.publish('Order', String(orderId), 'OrderPlaced', {
        user_id: userId, product_id: productId, amount
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

class OutboxRelay {
  constructor(db, broker) {
    this.db = db;
    this.broker = broker;
  }

  async run() {
    const result = await this.db.query(
      `SELECT id, event_type, payload FROM outbox
       WHERE published_at IS NULL ORDER BY id LIMIT 100`
    );

    for (const row of result.rows) {
      try {
        await this.broker.publish(row.event_type, row.payload);
        await this.db.query(
          'UPDATE outbox SET published_at = NOW() WHERE id = $1',
          [row.id]
        );
      } catch (err) {
        await this.db.query(
          'UPDATE outbox SET retry_count = retry_count + 1 WHERE id = $1',
          [row.id]
        );
      }
    }
  }
}
```

## Explicación

El Patrón Outbox funciona en dos fases:

1. **Fase de escritura**: La operación de negocio y el evento se escriben en la base de datos en una única transacción ACID. El evento llega a la tabla `outbox`.
2. **Fase de relay**: Un proceso de fondo consulta el outbox, publica eventos en el message broker, y los marca como publicados.

Esto garantiza entrega at-least-once. El message broker puede recibir duplicados si el relay falla después de publicar pero antes de actualizar la fila. Los consumidores deben ser idempotentes.

## Variantes

| Variante | Estrategia de Relay | Caso de Uso |
|----------|---------------------|-------------|
| **Polling relay** | Job cron consulta cada N segundos | Simple, funciona con cualquier base de datos |
| **CDC relay** | Lee WAL / binlog de la base de datos | Casi tiempo real, sin overhead de polling |
| **Transactional outbox** | Relay corre en el mismo proceso de la app | Menos piezas móviles, pero acopla relay a la app |

## Lo que funciona

- **Usa `FOR UPDATE SKIP LOCKED`** para que múltiples instancias de relay puedan correr en paralelo sin contención.
- **Mantén los payloads pequeños.** El outbox no es una cola de mensajes. Almacena referencias, no documentos completos.
- **Monitorea los conteos de reintentos.** Eventos que fallan repetidamente necesitan inspección manual o una dead-letter queue.
- **Archiva eventos publicados.** Las tablas outbox crecen indefinidamente. Mueve filas antiguas a una tabla de historial o bórralas.
- **Haz los consumidores idempotentes.** La entrega at-least-once significa que el mismo evento puede procesarse múltiples veces.

## Errores Comunes

- **Publicar el evento en una transacción separada** anula el propósito. La actualización de base de datos y la inserción en outbox deben ser atómicas.
- **Sin lógica de reintentos** significa que fallos transientes del broker detienen permanentemente la entrega de eventos.
- **Olvidar limpiar filas publicadas** llena la base de datos y ralentiza el relay.
- **Asumir entrega exactly-once.** El patrón provee at-least-once; consumidores idempotentes son obligatorios.
- **Incluir datos sensibles en payloads** que fluyen a través de múltiples sistemas. Usa referencias y encripta donde sea necesario.

## Ejemplos del Mundo Real

### Debezium

Debezium lee el write-ahead log (WAL) de PostgreSQL para stream changes fuera de una tabla outbox hacia Kafka sin polling.

### Netflix Maestro

Netflix usa tablas outbox para publicar eventos de workflow desde su motor de tareas a sistemas de analytics downstream.

### Sistemas de Pedidos E-Commerce

La mayoría de los servicios de pedidos usan un outbox para publicar eventos `OrderPlaced`. Los servicios de pago, inventario y envío consumen estos eventos independientemente.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Outbox e Inbox?**
A: El [Outbox](/patterns/design/outbox-pattern) almacena eventos que tu servicio publica. El [Inbox](/patterns/design/inbox-pattern) almacena eventos entrantes de otros servicios para prevenir procesamiento duplicado.

**Q: Cómo manejo el ordenamiento de eventos?**
A: Los eventos dentro del mismo aggregate están ordenados por `id` o `created_at`. El ordenamiento entre aggregates no está garantizado por el outbox en sí.

**Q: Puedo eliminar filas del outbox publicadas inmediatamente?**
A: Sí, pero mantenlas por un período de retención (ej., 7 días) para debugging y auditoría.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
