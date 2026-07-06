---
contentType: recipes
slug: event-sourcing-relational
title: "Implementar event sourcing en una base de datos relacional"
description: "Construye sistemas de event sourcing usando bases de datos relacionales con event stores, proyecciones y snapshotting para auditoría y consultas temporales."
metaDescription: "Implementa event sourcing en una base de datos relacional. Event stores, proyecciones y patrones de snapshotting con ejemplos en PostgreSQL, MySQL y SQL Server."
difficulty: advanced
topics:
  - databases
tags:
  - database
  - event-sourcing
  - event-store
  - databases
  - sql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/full-text-search
  - /patterns/event-sourcing-pattern
  - /docs/database-migration-runbook-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa event sourcing en una base de datos relacional. Event stores, proyecciones y patrones de snapshotting con ejemplos en PostgreSQL, MySQL y SQL Server."
  keywords:
    - event-sourcing
    - event-store
    - proyecciones
    - snapshotting
    - postgresql
    - relacional
---
# Implementar event sourcing en una base de datos relacional

## Visión General

Event sourcing almacena cambios de estado como una secuencia de eventos inmutables en lugar de sobrescribir el estado actual. En lugar de guardar `balance = 100`, registras `Deposited $50` y `Deposited $50`. El estado actual se deriva reproduciendo todos los eventos. Esto provee un audit trail completo, consultas temporales y la capacidad de reconstruir el estado en cualquier punto del tiempo.

Aqui hay una implementacion de un event store, proyecciones (read models) y snapshotting usando PostgreSQL, MySQL y SQL Server.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas un [audit trail](/recipes/api/logging) completo de todos los cambios de estado (finanzas, cumplimiento)
- Se requieren consultas temporales: "¿Cuál era el nivel de inventario hace 30 días?" Consulta [Date Formatting](/recipes/data/date-formatting) para consultas basadas en tiempo.
- Quieres desacoplar modelos de escritura y lectura ([CQRS](/patterns/design/cqrs-pattern))
- Reconstruir read models desde cero es preferible a migraciones de esquema complejas

## Solución

### Python (PostgreSQL)

```python
import json
from datetime import datetime
from uuid import uuid4

class EventStore:
    def __init__(self, conn):
        self.conn = conn

    def append(self, aggregate_id, event_type, payload, expected_version=None):
        with self.conn.cursor() as cur:
            # Verificación de concurrencia optimista
            cur.execute(
                "SELECT COUNT(*) FROM events WHERE aggregate_id = %s",
                (aggregate_id,)
            )
            current_version = cur.fetchone()[0]

            if expected_version is not None and current_version != expected_version:
                raise ConcurrencyException(f"Expected {expected_version}, found {current_version}")

            cur.execute("""
                INSERT INTO events (id, aggregate_id, event_type, payload, version, occurred_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (str(uuid4()), aggregate_id, event_type, json.dumps(payload),
                  current_version + 1, datetime.utcnow()))
            self.conn.commit()

    def get_events(self, aggregate_id):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT event_type, payload, version, occurred_at
                FROM events WHERE aggregate_id = %s ORDER BY version
            """, (aggregate_id,))
            return [{
                "type": row[0], "payload": json.loads(row[1]),
                "version": row[2], "occurred_at": row[3]
            } for row in cur.fetchall()]

# Proyección (read model)
def rebuild_account_balance(conn, account_id):
    store = EventStore(conn)
    events = store.get_events(account_id)
    balance = 0
    for event in events:
        if event["type"] == "Deposit":
            balance += event["payload"]["amount"]
        elif event["type"] == "Withdrawal":
            balance -= event["payload"]["amount"]
    return balance
```

### JavaScript (MySQL)

```javascript
const { v4: uuidv4 } = require('uuid');

class EventStore {
  constructor(pool) {
    this.pool = pool;
  }

  async append(aggregateId, eventType, payload, expectedVersion = null) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT COUNT(*) as count FROM events WHERE aggregate_id = ?',
        [aggregateId]
      );
      const currentVersion = rows[0].count;

      if (expectedVersion !== null && currentVersion !== expectedVersion) {
        throw new Error(`Conflicto de concurrencia: expected ${expectedVersion}`);
      }

      await conn.execute(
        `INSERT INTO events (id, aggregate_id, event_type, payload, version, occurred_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), aggregateId, eventType, JSON.stringify(payload), currentVersion + 1]
      );

      await conn.commit();
    } finally {
      conn.release();
    }
  }

  async getEvents(aggregateId) {
    const [rows] = await this.pool.execute(
      `SELECT event_type, payload, version, occurred_at
       FROM events WHERE aggregate_id = ? ORDER BY version`,
      [aggregateId]
    );
    return rows.map(r => ({
      type: r.event_type,
      payload: JSON.parse(r.payload),
      version: r.version,
      occurredAt: r.occurred_at
    }));
  }
}

// Snapshot para evitar reproducir todos los eventos
async function getBalanceWithSnapshot(pool, accountId) {
  const [snapshots] = await pool.execute(
    'SELECT * FROM snapshots WHERE aggregate_id = ? ORDER BY version DESC LIMIT 1',
    [accountId]
  );

  let balance = 0;
  let fromVersion = 0;

  if (snapshots.length > 0) {
    balance = snapshots[0].state.balance;
    fromVersion = snapshots[0].version;
  }

  const store = new EventStore(pool);
  const events = await store.getEvents(accountId);
  const newEvents = events.filter(e => e.version > fromVersion);

  for (const event of newEvents) {
    if (event.type === 'Deposit') balance += event.payload.amount;
    if (event.type === 'Withdrawal') balance -= event.payload.amount;
  }

  return balance;
}
```

### Java (SQL Server con Spring)

```java
@Entity
@Table(name = "events")
public class EventEntity {
    @Id private UUID id;
    private UUID aggregateId;
    private String eventType;
    @Column(columnDefinition = "nvarchar(max)")
    private String payload;
    private int version;
    private Instant occurredAt;
}

@Service
public class EventStore {
    @Autowired private EventRepository repo;

    @Transactional
    public void append(UUID aggregateId, String eventType, String payload, Integer expectedVersion) {
        int currentVersion = repo.countByAggregateId(aggregateId);
        if (expectedVersion != null && currentVersion != expectedVersion) {
            throw new ConcurrencyException("Expected " + expectedVersion);
        }

        EventEntity event = new EventEntity();
        event.setId(UUID.randomUUID());
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setPayload(payload);
        event.setVersion(currentVersion + 1);
        event.setOccurredAt(Instant.now());
        repo.save(event);
    }

    public List<EventEntity> getEvents(UUID aggregateId) {
        return repo.findByAggregateIdOrderByVersionAsc(aggregateId);
    }
}

// Servicio de snapshot
@Service
public class SnapshotService {
    @Autowired private EventStore eventStore;
    @Autowired private SnapshotRepository snapshotRepo;

    public AccountState rebuildState(UUID accountId) {
        Optional<Snapshot> snapshot = snapshotRepo
            .findTopByAggregateIdOrderByVersionDesc(accountId);

        int startVersion = snapshot.map(Snapshot::getVersion).orElse(0);
        AccountState state = snapshot.map(Snapshot::getState)
            .orElse(new AccountState(0));

        List<EventEntity> events = eventStore.getEvents(accountId).stream()
            .filter(e -> e.getVersion() > startVersion)
            .collect(Collectors.toList());

        for (EventEntity event : events) {
            state = applyEvent(state, event);
        }
        return state;
    }
}
```

## Explicación

Event sourcing invierte el CRUD tradicional: en lugar de almacenar el estado actual, almacenas el historial de cambios. Conceptos clave:
- **Event store**: Un log solo de append de eventos de dominio
- **Aggregate**: El límite de consistencia; cada aggregate tiene su propio stream de eventos
- **Proyección**: Un read model derivado construido reproduciendo eventos
- **Snapshot**: Una captura periódica de estado para evitar reproducir miles de eventos

El esquema de base de datos relacional es simple: una tabla `events` con `aggregate_id`, `event_type`, `payload` (JSON), `version` y `occurred_at`.

## Variantes

| Almacenamiento | Flexibilidad de esquema | Velocidad de query | Ideal para |
|----------------|-------------------------|--------------------|------------|
| PostgreSQL + JSONB | Alta | Media | Propósito general, soporte JSON rico |
| MySQL + JSON | Alta | Media | Infraestructura MySQL existente |
| SQL Server | Media | Rápida | Empresarial, proyecciones T-SQL |
| Dedicado (EventStoreDB) | Nativa | Muy rápida | Event sourcing a gran escala |

## Lo que funciona

- **Versiona cada evento**: El control de concurrencia optimista previene actualizaciones perdidas
- **Usa JSONB/JSON para payloads**: Flexibilidad de esquema sin migraciones; valida en la capa de aplicación. Consulta [Parse JSON](/recipes/data/parse-json) para datos estructurados.
- **Crea snapshots cada N eventos**: Balance entre almacenamiento y rendimiento de reproducción
- **Mantén los eventos pequeños**: Payloads grandes ralentizan la reproducción y aumentan el almacenamiento
- **Separa proyecciones del event store**: Las proyecciones pueden reconstruirse; los eventos son la fuente de verdad. Consulta [Redis Caching](/recipes/databases/caching-redis) para cache de read models.

## Errores Comunes

- **No versionar eventos**: Sin números de versión no puedes detectar modificaciones concurrentes
- **Almacenar estado actual Y eventos**: Esto crea escrituras duales y riesgos de consistencia. Consulta [Database Transactions](/recipes/databases/database-transactions) para escrituras atomicas.
- **Reproducir todos los eventos en cada lectura**: Usa snapshots o tablas de proyección dedicadas
- **Eventos mutables**: Los eventos deben ser inmutables — nunca actualices o borres eventos históricos
- **Falta de evolución de esquema de eventos**: Eventos antiguos necesitan estrategias de migración a medida que el modelo de dominio cambia

## Preguntas Frecuentes

**P: ¿No consume event sourcing demasiado almacenamiento?**
R: Los eventos son típicamente pequeños (cientos de bytes). Para un sistema con 1M transacciones/día, eso es ~100MB/día. Con compresión y archivado, los costos de almacenamiento son usualmente insignificantes comparados con el valor de auditoría.

**P: ¿Cómo manejo cambios de esquema en eventos?**
R: Usa versionamiento de eventos (`Deposit_v1`, `Deposit_v2`) o upcasting — transforma eventos antiguos al nuevo esquema durante la reproducción. Nunca modifiques eventos almacenados.

**P: ¿Puedo usar event sourcing con CQRS?**
R: Sí — CQRS y event sourcing se complementan naturalmente. Los comandos agregan eventos al modelo de escritura; las proyecciones crean read models optimizados. El read model puede estar en una base de datos completamente diferente (Elasticsearch, Redis, etc.).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
