---
contentType: recipes
slug: outbox-pattern-transactional-events
title: "Implementar el Patron Outbox Transaccional para Publicacion Confiable de Eventos"
description: "Usar el patron outbox transaccional para publicar eventos de dominio junto con cambios de base de datos, con un procesador relay, estrategias de polling y garantias de entrega exactly-once."
metaDescription: "Implementa el patron outbox transaccional para publicacion confiable de eventos. Usa relay processor, polling y entrega exactly-once con Python y PostgreSQL."
difficulty: advanced
topics:
  - messaging
  - architecture
  - databases
tags:
  - outbox-pattern
  - transactional-events
  - python
  - postgresql
  - event-driven
relatedResources:
  - /recipes/messaging/event-sourcing-cqrs-pattern
  - /recipes/messaging/kafka-python-consumer-groups
  - /guides/domain-driven-design-guide
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa el patron outbox transaccional para publicacion confiable de eventos. Usa relay processor, polling y entrega exactly-once con Python y PostgreSQL."
  keywords:
    - transactional outbox pattern
    - outbox relay processor
    - reliable event publishing
    - dual write problem
    - transactional outbox python
---

## Descripcion general

El patron outbox transaccional resuelve el problema dual-write: cuando necesitas actualizar una base de datos y publicar un mensaje, hacer ambos en una sola transaccion no es posible entre sistemas diferentes. En su lugar, escribe el evento a una tabla outbox en la misma transaccion de base de datos que tus datos de negocio. Un proceso relay separado lee el outbox y publica eventos al message broker. A continuacion: diseno de tabla outbox, relay processor, estrategias de polling, garantias de ordenamiento y entrega exactly-once.

## Cuando Usar Esto

- Microservicios que deben publicar eventos de forma confiable despues de cambios en base de datos
- Arquitecturas event-driven donde los eventos perdidos causan inconsistencia de datos
- Sistemas que reemplazan transacciones distribuidas con consistencia eventual
- Cualquier aplicacion donde escrituras de base de datos y publicacion de mensajes deben ser atomicas

## Prerrequisitos

- Python 3.11+
- PostgreSQL
- Paquetes `sqlalchemy`, `psycopg2` y `confluent-kafka`

## Solucion

### 1. Schema de Tabla Outbox

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_status ON outbox_events (status, created_at);
CREATE INDEX idx_outbox_aggregate ON outbox_events (aggregate_id, created_at);
```

### 2. Escribir Eventos al Outbox

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
import uuid
from datetime import datetime

engine = create_engine('postgresql://user:pass@localhost/myapp')
Session = sessionmaker(bind=engine)

class OrderService:
    def __init__(self, session_factory):
        self.Session = session_factory

    def create_order(self, order_data: dict):
        session = self.Session()
        try:
            # Insertar la orden
            order_id = str(uuid.uuid4())
            session.execute(
                text("""INSERT INTO orders (id, customer_id, total, status)
                        VALUES (:id, :cid, :total, 'PENDING')"""),
                {'id': order_id, 'cid': order_data['customer_id'], 'total': order_data['total']}
            )

            # Insertar el evento outbox en la MISMA transaccion
            event_id = str(uuid.uuid4())
            session.execute(
                text("""INSERT INTO outbox_events
                        (id, aggregate_id, aggregate_type, event_type, payload, headers)
                        VALUES (:id, :aid, :atype, :etype, :payload, :headers)"""),
                {
                    'id': event_id,
                    'aid': order_id,
                    'atype': 'Order',
                    'etype': 'OrderCreated',
                    'payload': json.dumps({
                        'orderId': order_id,
                        'customerId': order_data['customer_id'],
                        'total': order_data['total'],
                        'items': order_data.get('items', []),
                    }),
                    'headers': json.dumps({
                        'event_id': event_id,
                        'source': 'order-service',
                    }),
                }
            )

            # Ambos inserts commitean atomicamente — sin problema dual-write
            session.commit()
            return order_id

        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
```

### 3. Relay Processor (Basado en Polling)

```python
import json
import logging
import time
from confluent_kafka import Producer
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OutboxRelay:
    def __init__(self, database_url: str, kafka_config: dict, batch_size: int = 100):
        self.engine = create_engine(database_url)
        self.producer = Producer(kafka_config)
        self.batch_size = batch_size
        self._running = True

    def run(self, poll_interval: float = 1.0):
        logger.info("Starting outbox relay...")
        while self._running:
            try:
                processed = self._process_batch()
                if processed == 0:
                    time.sleep(poll_interval)
            except Exception as e:
                logger.error(f"Relay error: {e}")
                time.sleep(5)

    def _process_batch(self) -> int:
        with self.engine.connect() as conn:
            # Seleccionar eventos no publicados con row-level locking
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers
                        FROM outbox_events
                        WHERE status = 'PENDING'
                        ORDER BY created_at ASC
                        LIMIT :batch_size
                        FOR UPDATE SKIP LOCKED"""),
                {'batch_size': self.batch_size}
            ).fetchall()

            if not events:
                return 0

            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers = event

                topic = f'{agg_type.lower()}.events'
                key = agg_id.encode('utf-8')

                self.producer.produce(
                    topic=topic,
                    key=key,
                    value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                    headers=[(k, v.encode('utf-8')) for k, v in json.loads(headers).items()],
                    on_delivery=self._delivery_callback(event_id, conn),
                )

            self.producer.flush(timeout=10)
            conn.commit()
            return len(events)

    def _delivery_callback(self, event_id, conn):
        def callback(err, msg):
            if err:
                logger.error(f"Failed to publish event {event_id}: {err}")
                conn.execute(
                    text("""UPDATE outbox_events
                            SET retry_count = retry_count + 1,
                                next_retry_at = NOW() + INTERVAL '30 seconds'
                            WHERE id = :id"""),
                    {'id': event_id}
                )
            else:
                conn.execute(
                    text("""UPDATE outbox_events
                            SET status = 'PUBLISHED', published_at = NOW()
                            WHERE id = :id"""),
                    {'id': event_id}
                )
        return callback

    def stop(self):
        self._running = False

# Ejecutar el relay
relay = OutboxRelay(
    'postgresql://user:pass@localhost/myapp',
    {'bootstrap.servers': 'localhost:9092'},
    batch_size=100,
)
relay.run()
```

### 4. Relay con Entrega Exactly-Once

```python
class ExactlyOnceRelay:
    """Asegura que los eventos se publiquen exactamente una vez usando transacciones de Kafka."""

    def __init__(self, database_url: str, kafka_config: dict):
        self.engine = create_engine(database_url)
        self.kafka_config = {**kafka_config, 'transactional.id': 'outbox-relay-txn'}
        self.producer = Producer(self.kafka_config)
        self.producer.init_transactions()

    def process_batch(self) -> int:
        with self.engine.connect() as conn:
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers
                        FROM outbox_events
                        WHERE status = 'PENDING'
                        ORDER BY created_at ASC
                        LIMIT 100
                        FOR UPDATE SKIP LOCKED""")
            ).fetchall()

            if not events:
                return 0

            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers = event

                self.producer.begin_transaction()
                try:
                    self.producer.produce(
                        topic=f'{agg_type.lower()}.events',
                        key=agg_id.encode('utf-8'),
                        value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                    )

                    # Marcar como publicado en la misma transaccion de Kafka
                    # El update de DB ocurre despues del commit de Kafka
                    self.producer.commit_transaction()

                    # Actualizar estado de DB despues del commit exitoso de Kafka
                    conn.execute(
                        text("""UPDATE outbox_events
                                SET status = 'PUBLISHED', published_at = NOW()
                                WHERE id = :id"""),
                        {'id': event_id}
                    )
                    conn.commit()

                except Exception as e:
                    logger.error(f"Transaction failed for {event_id}: {e}")
                    self.producer.abort_transaction()
                    conn.rollback()

            return len(events)
```

### 5. Relay con Change Data Capture (CDC)

```python
"""Usando replicacion logica de PostgreSQL para relay outbox basado en CDC.
Esto evita polling y proporciona publicacion de eventos near-real-time."""

import psycopg2
from psycopg2.extras import LogicalReplicationConnection

class CDCOutboxRelay:
    def __init__(self, dsn: str, slot_name: str = 'outbox_slot'):
        self.conn = psycopg2.connect(
            dsn,
            connection_factory=LogicalReplicationConnection,
        )
        self.slot_name = slot_name

    def start(self):
        cur = self.conn.cursor()
        try:
            cur.create_replication_slot(self.slot_name, output_plugin='wal2json')
        except psycopg2.errors.DuplicateObject:
            pass  # El slot ya existe

        cur.start_replication(
            slot_name=self.slot_name,
            options={'table-names': 'public.outbox_events'},
        )

        def process_msg(msg):
            import json
            changes = json.loads(msg.payload)
            for change in changes.get('change', []):
                if change['table'] == 'outbox_events' and change['kind'] == 'insert':
                    row = {col['name']: col['value'] for col in change['columnvalues']}
                    publish_to_kafka(row)
            msg.cursor.send_feedback(flush_lsn=msg.data_start)

        cur.consume_stream(process_msg)
```

### 6. Ordenamiento de Eventos con Particionado

```python
class OrderedOutboxRelay:
    """Publica eventos ordenados por aggregate_id usando particionado basado en key de Kafka."""

    def process_batch(self) -> int:
        with self.engine.connect() as conn:
            # Agrupar por aggregate_id para mantener ordenamiento
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers
                        FROM outbox_events
                        WHERE status = 'PENDING'
                        ORDER BY aggregate_id, created_at ASC
                        LIMIT 100
                        FOR UPDATE SKIP LOCKED""")
            ).fetchall()

            if not events:
                return 0

            current_aggregate = None
            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers = event

                # Usar aggregate_id como key de Kafka — mismo aggregate va a misma particion
                self.producer.produce(
                    topic=f'{agg_type.lower()}.events',
                    key=agg_id.encode('utf-8'),  # La key asegura ordenamiento por aggregate
                    value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                )

                conn.execute(
                    text("""UPDATE outbox_events
                            SET status = 'PUBLISHED', published_at = NOW()
                            WHERE id = :id"""),
                    {'id': event_id}
                )

            self.producer.flush()
            conn.commit()
            return len(events)
```

### 7. Retry y Manejo de Errores

```python
class ResilientOutboxRelay(OutboxRelay):
    def _process_batch(self) -> int:
        with self.engine.connect() as conn:
            # Incluir eventos elegibles para retry
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers, retry_count
                        FROM outbox_events
                        WHERE status = 'PENDING'
                          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
                          AND retry_count < 5
                        ORDER BY created_at ASC
                        LIMIT :batch_size
                        FOR UPDATE SKIP LOCKED"""),
                {'batch_size': self.batch_size}
            ).fetchall()

            if not events:
                return 0

            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers, retry_count = event

                try:
                    self.producer.produce(
                        topic=f'{agg_type.lower()}.events',
                        key=agg_id.encode('utf-8'),
                        value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                    )
                    self.producer.flush(timeout=10)

                    conn.execute(
                        text("""UPDATE outbox_events
                                SET status = 'PUBLISHED', published_at = NOW()
                                WHERE id = :id"""),
                        {'id': event_id}
                    )

                except Exception as e:
                    logger.error(f"Failed to publish {event_id}: {e}")
                    backoff = min(30 * (2 ** retry_count), 3600)  # Backoff exponencial, max 1 hora
                    conn.execute(
                        text("""UPDATE outbox_events
                                SET retry_count = retry_count + 1,
                                    next_retry_at = NOW() + :backoff * INTERVAL '1 second'
                                WHERE id = :id"""),
                        {'id': event_id, 'backoff': backoff}
                    )

                    if retry_count >= 4:
                        conn.execute(
                            text("""UPDATE outbox_events SET status = 'FAILED' WHERE id = :id"""),
                            {'id': event_id}
                        )
                        logger.error(f"Event {event_id} moved to FAILED status")

            conn.commit()
            return len(events)
```

## Como Funciona

1. **Problema dual-write**: Actualizar una base de datos y publicar a un message broker son dos operaciones separadas. Si el commit de la base de datos tiene exito pero la publicacion falla, el evento se pierde. Si la publicacion tiene exito pero el commit falla, se envia un evento fantasma.
2. **Tabla outbox**: En lugar de publicar directamente, escribe el evento a una tabla outbox en la misma transaccion de base de datos que los datos de negocio. Ambos commitean atomicamente — si la transaccion tiene exito, el evento esta almacenado de forma segura.
3. **Relay processor**: Un proceso separado lee eventos no publicados de la tabla outbox y los publica al message broker. Despues de publicar exitosamente, marca el evento como `PUBLISHED`.
4. **`FOR UPDATE SKIP LOCKED`**: Esta clausula SQL bloquea las filas seleccionadas y salta las filas ya bloqueadas por otras instancias de relay. Esto habilita multiples instancias de relay para procesar el outbox concurrentemente sin conflictos.
5. **Entrega at-least-once**: El relay publica, luego marca como publicado. Si crashea entre publicar y marcar, el evento se re-publica. Los consumers deben ser idempotentes — usa event IDs para deduplicar.

## Variantes

### Debezium CDC (Sin Polling)

```yaml
# Configuracion de conector Debezium — stream cambios del outbox a Kafka
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "localhost",
    "database.port": "5432",
    "database.user": "user",
    "database.password": "pass",
    "database.dbname": "myapp",
    "table.include.list": "public.outbox_events",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload"
  }
}
```

### Outbox Multi-Tenant

```sql
-- Agregar tenant_id para aislamiento multi-tenant
ALTER TABLE outbox_events ADD COLUMN tenant_id VARCHAR(100) NOT NULL;
CREATE INDEX idx_outbox_tenant ON outbox_events (tenant_id, status, created_at);
```

```python
# El relay procesa eventos por tenant
events = conn.execute(
    text("""SELECT * FROM outbox_events
            WHERE status = 'PENDING' AND tenant_id = :tenant
            ORDER BY created_at ASC LIMIT 100 FOR UPDATE SKIP LOCKED"""),
    {'tenant': tenant_id}
).fetchall()
```

## Mejores Practicas

- **Usar `FOR UPDATE SKIP LOCKED`**: Esto habilita multiples instancias de relay sin conflictos. Cada instancia bloquea y procesa filas diferentes.
- **Ordenar por `created_at`**: Procesa eventos en orden de creacion. Usa `aggregate_id` como key de Kafka para asegurar ordenamiento por aggregate dentro de una particion.
- **Hacer consumers idempotentes**: El relay proporciona entrega at-least-once. Si crashea entre publicar y marcar, los eventos se re-publican. Los consumers deben deduplicar usando event IDs.
- **Establecer un limite de reintentos**: Los eventos fallidos deben reintentarse con backoff exponencial. Despues del maximo de reintentos, marcar como `FAILED` para intervencion manual.
- **Monitorear crecimiento del outbox**: Una tabla outbox creciente significa que el relay no puede mantenerse. Alerta en el conteo de eventos pendientes y la edad del evento no publicado mas antiguo.
- **Usar CDC para baja latencia**: El polling agrega latencia (1-5 segundos). Change Data Capture (Debezium, wal2json) publica eventos en near-real-time transmitiendo el write-ahead log de la base de datos.

## Errores Comunes

- **Publicar fuera de la transaccion**: Si publicas al broker antes de commitear la transaccion de DB, un rollback crea un evento fantasma. Siempre escribe al outbox en la misma transaccion.
- **No usar `SKIP LOCKED`**: Sin esto, multiples instancias de relay se bloquean entre si. `SKIP LOCKED` permite a cada instancia procesar filas diferentes concurrentemente.
- **Sin estrategia de retry**: Fallos transitorios del broker causan que los eventos permanezcan `PENDING` para siempre. Implementa backoff exponencial y un limite maximo de reintentos.
- **No manejar publicaciones duplicadas**: Si el relay crashea despues de publicar pero antes de marcar, el evento se re-publica. Los consumers deben manejar duplicados.
- **Polling demasiado frecuente**: Polling cada 10ms sin eventos desperdicia recursos. Usa polling adaptativo — poll rapido cuando hay eventos, mas lento cuando esta idle.

## FAQ

**Cual es el problema dual-write?**

Actualizar una base de datos y publicar a un message broker son dos operaciones separadas que no pueden ser atomicas. Si una tiene exito y la otra falla, obtienes inconsistencia — ya sea un evento perdido o un evento fantasma.

**Como resuelve el patron outbox el problema dual-write?**

En lugar de publicar directamente, escribe el evento a una tabla outbox en la misma transaccion de base de datos. Los datos de negocio y el evento commitean atomicamente. Un proceso relay separado publica eventos del outbox al broker.

**Que es `FOR UPDATE SKIP LOCKED`?**

Una clausula de PostgreSQL que bloquea las filas seleccionadas para update y salta las filas ya bloqueadas por otras transacciones. Esto habilita procesamiento concurrente — multiples instancias de relay pueden procesar diferentes filas del outbox sin bloquearse entre si.

**Como aseguro entrega exactly-once?**

El patron outbox proporciona entrega at-least-once. Para exactly-once, usa transacciones de Kafka (vincula la publicacion y el update de estado del outbox) o haz que los consumers sean idempotentes deduplicando por event ID.

**Polling vs CDC — cual deberia usar?**

Polling es mas simple pero agrega 1-5 segundos de latencia. CDC (Debezium, wal2json) transmite cambios de base de datos en near-real-time (milisegundos) pero requiere mas infraestructura. Usa polling para simplicidad, CDC para requisitos de baja latencia.
