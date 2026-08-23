---
contentType: recipes
slug: event-sourcing-relational
title: "Implementar event sourcing en una base de datos relacional"
description: "Implementa event sourcing en una base de datos relacional. Almacena eventos inmutables, proyecta read models y usa snapshots con PostgreSQL, MySQL y SQL Server."
metaDescription: "Implementa event sourcing en una base de datos relacional. Almacena eventos inmutables, proyecta read models y usa snapshots con PostgreSQL, MySQL y SQL Server."
difficulty: advanced
topics:
  - databases
tags:
  - database
  - event-sourcing
  - event-store
  - postgresql
  - mysql
  - sql
  - cqrs
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /patterns/event-sourcing-pattern
  - /recipes/caching-redis
  - /recipes/database-migrations-safely
  - /recipes/database-transactions
lastUpdated: "2026-08-23"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa event sourcing en una base de datos relacional. Almacena eventos inmutables, proyecta read models y usa snapshots con PostgreSQL, MySQL y SQL Server."
  keywords:
    - event sourcing
    - event store
    - base de datos relacional
    - proyecciones
    - snapshotting
    - postgresql
---

## Visión General

Event sourcing almacena cambios de estado como una secuencia de eventos inmutables en lugar de sobrescribir
el estado actual. En lugar de guardar `balance = 100`, registras `Deposited $50` y `Deposited $50`.
Obtenés el estado actual reproduciendo esos eventos. Eso te da un audit trail completo, consultas
temporales y la opción de reconstruir el estado en cualquier punto del tiempo.

A continuación hay ejemplos para PostgreSQL, MySQL y SQL Server que implementan un event store,
proyecciones y snapshotting.

## Cuándo Usar

Usá event sourcing cuando necesitás un [audit trail](/es/recipes/logging/) completo de cada cambio de
estado, como en finanzas o cumplimiento. También sirve cuando las consultas temporales importan, por
ejemplo "¿Cuál era el nivel de inventario hace 30 días?". Es una buena opción si querés desacoplar modelos
de escritura y lectura con [CQRS](/es/patterns/cqrs-pattern/), o si reconstruir read models desde cero es
más simple que mantener migraciones de esquema complejas.

## Cuándo Evitar

Evitalo cuando tu dominio tenga necesidades simples de CRUD sin auditoría ni requerimientos de replay.
Tampoco conviene si el almacenamiento es caro y no tenés un plan de archivo o retención. Tampoco es buena
idea si tu equipo no está preparado para manejar la evolución de esquema de eventos y la consistencia
eventual de las proyecciones.

## Solución

### Python (PostgreSQL)

```python
import json
from datetime import datetime, timezone
from uuid import uuid4

class ConcurrencyException(Exception):
    pass

class EventStore:
    def __init__(self, conn):
        self.conn = conn

    def append(self, aggregate_id, event_type, payload, expected_version=None):
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM events WHERE aggregate_id = %s",
                (aggregate_id,)
            )
            current_version = cur.fetchone()[0]

            if expected_version is not None and current_version != expected_version:
                raise ConcurrencyException(
                    f"Expected {expected_version}, found {current_version}"
                )

            cur.execute("""
                INSERT INTO events (id, aggregate_id, event_type, payload, version, occurred_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (str(uuid4()), aggregate_id, event_type, json.dumps(payload),
                  current_version + 1, datetime.now(timezone.utc)))
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

class ConcurrencyException extends Error {}

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
        throw new ConcurrencyException(
          `Expected ${expectedVersion}, found ${currentVersion}`
        );
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
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

class ConcurrencyException extends RuntimeException {
    ConcurrencyException(String message) { super(message); }
}

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

    // getters and setters omitted for brevity
}

interface EventRepository {
    int countByAggregateId(UUID aggregateId);
    List<EventEntity> findByAggregateIdOrderByVersionAsc(UUID aggregateId);
}

@Service
public class EventStore {
    private final EventRepository repo;

    public EventStore(EventRepository repo) { this.repo = repo; }

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

class AccountState {
    private int balance;
    AccountState(int balance) { this.balance = balance; }
    public int getBalance() { return balance; }
    public void setBalance(int balance) { this.balance = balance; }
}

interface SnapshotRepository {
    Optional<Snapshot> findTopByAggregateIdOrderByVersionDesc(UUID aggregateId);
}

class Snapshot {
    private UUID aggregateId;
    private int version;
    private AccountState state;
    public int getVersion() { return version; }
    public AccountState getState() { return state; }
}

@Service
public class SnapshotService {
    private final EventStore eventStore;
    private final SnapshotRepository snapshotRepo;

    public SnapshotService(EventStore eventStore, SnapshotRepository snapshotRepo) {
        this.eventStore = eventStore;
        this.snapshotRepo = snapshotRepo;
    }

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

    private AccountState applyEvent(AccountState state, EventEntity event) {
        // apply event payload to state
        return state;
    }
}
```

## Explicación

Event sourcing da vuelta el modelo CRUD habitual. En lugar de almacenar el último estado, almacenás el
historial de cambios. Obtenés el estado actual reproduciendo ese historial.

Los cuatro conceptos clave son el **event store**, que es un log solo de append de eventos de dominio; el
**aggregate**, que marca el límite de consistencia y es dueño de su propio stream de eventos; la
**proyección**, que es un read model construido reproduciendo eventos; y el **snapshot**, que es una captura
periódica de estado que evita reproducir miles de eventos.

El esquema de base de datos se mantiene deliberadamente simple. Una tabla `events` contiene
`aggregate_id`, `event_type`, un `payload` JSON, `version` y `occurred_at`. La columna version es lo que
permite aplicar concurrencia optimista. Los eventos nuevos se agregan, nunca se actualizan ni borran. Las
proyecciones leen el stream y aplican cada evento para armar un read model. Un snapshot captura el estado
en una versión específica para que el sistema solo reproduzca los eventos posteriores.

## Variantes

| Almacenamiento | Flexibilidad de esquema | Velocidad de query | Ideal para |
| ---------------- | ------------------------- | -------------------- | ------------ |
| **PostgreSQL + JSONB** | Alta | Media | Propósito general, soporte JSON rico |
| **MySQL + JSON** | Alta | Media | Infraestructura MySQL existente |
| **SQL Server** | Media | Rápida | Empresarial, proyecciones T-SQL |
| **EventStoreDB** | Nativa | Muy rápida | Event sourcing a gran escala |

## Mejores Prácticas

Versioná cada evento y usá controles de concurrencia optimista para prevenir actualizaciones perdidas.
Almacená los payloads como JSONB o JSON para mantener flexibilidad de esquema y validar en la capa de
aplicación. Consultá [parse JSON](/es/recipes/parse-json/) para trabajar con payloads estructurados. Tomá
snapshots cada N eventos, o cuando el tiempo de replay empiece a degradarse, para balancear almacenamiento
y rendimiento de lectura. Mantené cada evento pequeño y enfocado en una sola cosa, porque payloads grandes
ralentizan el replay y aumentan el almacenamiento. Separá las proyecciones del event store y reconstruilas
cuando sea necesario; los eventos son la fuente de verdad. Usá [Redis caching](/es/recipes/caching-redis/)
para cachear read models. Aplicá cada evento dentro de una transacción cuando también escribís una
proyección, o mantené las proyecciones asíncronas y con consistencia eventual. Consultá [database
transactions](/es/recipes/database-transactions/) para escrituras atómicas.

## Errores Comunes

No versionar eventos hace imposible detectar modificaciones concurrentes. Almacenar el estado actual junto
con los eventos crea escrituras duales y riesgos de consistencia. Reproducir todos los eventos en cada
lectura, sin snapshots o tablas de proyección dedicadas, mata el rendimiento de lectura. Tratar los eventos
como mutables es un error: los eventos históricos nunca deberían modificarse ni borrarse. Ignorar la
evolución del esquema de eventos también es problemático; los eventos más antiguos necesitan una estrategia
de migración a medida que el modelo de dominio cambia.

## Preguntas Frecuentes

### ¿No consume event sourcing demasiado almacenamiento?

Cada evento suele ser pequeño, a menudo solo unos pocos cientos de bytes. Si manejás un millón de
transacciones por día, eso es aproximadamente 100 MB por día. Con compresión y archivado, los costos de
almacenamiento suelen ser bajos comparados con el valor de auditoría.

### ¿Cómo manejo cambios de esquema en eventos?

Usá versionamiento de eventos, como `Deposit_v1` y `Deposit_v2`, o upcasting. El upcasting transforma
eventos viejos al nuevo esquema durante la reproducción. Nunca modifiques eventos almacenados.

### ¿Puedo usar event sourcing con CQRS?

Sí. CQRS y event sourcing se complementan naturalmente. Los comandos agregan eventos al modelo de
escritura, mientras que las proyecciones construyen read models optimizados. Esos read models pueden vivir
en una base de datos diferente, como Elasticsearch o Redis.

### ¿Cómo elijo la frecuencia de snapshot?

Tomá un snapshot cuando reproducir un aggregate tarde más de lo que tu read model tolera. Un punto de
partida común es cada 100 o 1.000 eventos, ajustado midiendo la latencia de replay para tu carga.
