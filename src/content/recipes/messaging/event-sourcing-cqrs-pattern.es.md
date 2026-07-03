---
contentType: recipes
slug: event-sourcing-cqrs-pattern
title: "Implementar Event Sourcing con CQRS en Python"
description: "Construir un sistema event-sourced con separacion CQRS usando Python, persistencia de event store, reconstruccion de proyecciones, snapshots y event handlers idempotentes para arquitecturas auditables."
metaDescription: "Implementa event sourcing con CQRS en Python. Usa event store, proyecciones, snapshots y handlers idempotentes para arquitecturas auditables."
difficulty: advanced
topics:
  - messaging
  - architecture
  - databases
tags:
  - event-sourcing
  - cqrs
  - python
  - architecture
  - event-driven
relatedResources:
  - /recipes/messaging/kafka-python-consumer-groups
  - /recipes/messaging/python-celery-task-queue
  - /guides/complete-guide-event-driven-design
  - /guides/complete-guide-cqrs-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa event sourcing con CQRS en Python. Usa event store, proyecciones, snapshots y handlers idempotentes para arquitecturas auditables."
  keywords:
    - event sourcing python
    - cqrs pattern python
    - event store implementation
    - projection rebuild
    - event sourcing snapshots
---

## Descripcion general

Event sourcing almacena cada cambio de estado como un evento inmutable en un log append-only. El estado actual se deriva reproduciendo eventos. CQRS separa los modelos de lectura (queries) de escritura (commands), permitiendo a cada uno escalar independientemente. A continuacion: construir un event store, aggregate roots, command handlers, proyecciones para lectura, snapshots para rendimiento y procesamiento idempotente de eventos.

## Cuando Usar Esto

- Sistemas que requieren trazas de auditoria completas (transacciones financieras, registros de salud)
- Logica de dominio compleja donde el replay de eventos ayuda a debugging y testing
- Sistemas read-heavy que necesitan diferentes modelos de lectura (vistas de lista, dashboards, indices de busqueda)
- Sistemas que necesitan queries temporales ("cual era el estado en el tiempo X?")

## Prerrequisitos

- Python 3.11+
- PostgreSQL (o cualquier base de datos ACID-compliant)
- Paquetes `sqlalchemy` y `pydantic`

## Solucion

### 1. Definiciones de Eventos

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

class DomainEvent(BaseModel):
    event_id: str = str(uuid.uuid4())
    event_type: str
    aggregate_id: str
    version: int
    timestamp: datetime = datetime.utcnow()
    metadata: dict = {}

class AccountCreated(DomainEvent):
    event_type: str = "AccountCreated"
    owner_name: str
    initial_balance: float

class MoneyDeposited(DomainEvent):
    event_type: str = "MoneyDeposited"
    amount: float
    description: str

class MoneyWithdrawn(DomainEvent):
    event_type: str = "MoneyWithdrawn"
    amount: float
    description: str

class AccountClosed(DomainEvent):
    event_type: str = "AccountClosed"
    reason: str
```

### 2. Event Store

```python
import json
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, text
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import List, Optional

Base = declarative_base()

class EventRecord(Base):
    __tablename__ = 'event_store'
    id = Column(String, primary_key=True)
    aggregate_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    version = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    data = Column(Text, nullable=False)
    metadata = Column(Text, nullable=False, default='{}')

class EventStore:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def append(self, aggregate_id: str, events: List[DomainEvent], expected_version: int):
        session = self.Session()
        try:
            for event in events:
                # Check de concurrencia optimista
                current = session.execute(
                    text("SELECT MAX(version) FROM event_store WHERE aggregate_id = :aid"),
                    {'aid': aggregate_id}
                ).scalar() or -1

                if current != expected_version:
                    raise ConcurrencyError(
                        f"Expected version {expected_version}, got {current}"
                    )

                session.execute(
                    text("""INSERT INTO event_store (id, aggregate_id, event_type, version, timestamp, data, metadata)
                            VALUES (:id, :aid, :etype, :ver, :ts, :data, :meta)"""),
                    {
                        'id': event.event_id,
                        'aid': aggregate_id,
                        'etype': event.event_type,
                        'ver': event.version,
                        'ts': event.timestamp,
                        'data': event.model_dump_json(),
                        'meta': json.dumps(event.metadata),
                    }
                )
                expected_version = event.version

            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_events(self, aggregate_id: str, from_version: int = 0) -> List[DomainEvent]:
        session = self.Session()
        try:
            records = session.execute(
                text("""SELECT data FROM event_store
                        WHERE aggregate_id = :aid AND version > :ver
                        ORDER BY version ASC"""),
                {'aid': aggregate_id, 'ver': from_version}
            ).fetchall()

            events = []
            for record in records:
                data = json.loads(record[0])
                event_class = EVENT_REGISTRY.get(data['event_type'], DomainEvent)
                events.append(event_class(**data))
            return events
        finally:
            session.close()

class ConcurrencyError(Exception):
    pass

EVENT_REGISTRY = {
    'AccountCreated': AccountCreated,
    'MoneyDeposited': MoneyDeposited,
    'MoneyWithdrawn': MoneyWithdrawn,
    'AccountClosed': AccountClosed,
}
```

### 3. Aggregate Root

```python
from abc import ABC, abstractmethod
from typing import List

class AggregateRoot(ABC):
    def __init__(self, aggregate_id: str):
        self.id = aggregate_id
        self.version = -1
        self._pending_events: List[DomainEvent] = []

    @abstractmethod
    def apply(self, event: DomainEvent):
        pass

    def raise_event(self, event: DomainEvent):
        event.version = self.version + 1
        self.apply(event)
        self._pending_events.append(event)

    def get_pending_events(self) -> List[DomainEvent]:
        return self._pending_events

    def clear_pending_events(self):
        self._pending_events.clear()

    @classmethod
    def from_events(cls, aggregate_id: str, events: List[DomainEvent]):
        aggregate = cls(aggregate_id)
        for event in events:
            aggregate.apply(event)
            aggregate.version = event.version
        return aggregate

class BankAccount(AggregateRoot):
    def __init__(self, aggregate_id: str):
        super().__init__(aggregate_id)
        self.owner_name: str = ""
        self.balance: float = 0
        self.status: str = "nonexistent"

    def apply(self, event: DomainEvent):
        if isinstance(event, AccountCreated):
            self.owner_name = event.owner_name
            self.balance = event.initial_balance
            self.status = "active"
        elif isinstance(event, MoneyDeposited):
            self.balance += event.amount
        elif isinstance(event, MoneyWithdrawn):
            self.balance -= event.amount
        elif isinstance(event, AccountClosed):
            self.status = "closed"

    # Metodos de comando — validar y disparar eventos
    def create(self, owner_name: str, initial_balance: float):
        if self.status != "nonexistent":
            raise ValueError("Account already exists")
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")

        self.raise_event(AccountCreated(
            aggregate_id=self.id,
            version=0,
            owner_name=owner_name,
            initial_balance=initial_balance,
        ))

    def deposit(self, amount: float, description: str = ""):
        if self.status != "active":
            raise ValueError("Account is not active")
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")

        self.raise_event(MoneyDeposited(
            aggregate_id=self.id,
            version=self.version + 1,
            amount=amount,
            description=description,
        ))

    def withdraw(self, amount: float, description: str = ""):
        if self.status != "active":
            raise ValueError("Account is not active")
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if self.balance < amount:
            raise ValueError("Insufficient funds")

        self.raise_event(MoneyWithdrawn(
            aggregate_id=self.id,
            version=self.version + 1,
            amount=amount,
            description=description,
        ))

    def close(self, reason: str):
        if self.status != "active":
            raise ValueError("Account is not active")
        if self.balance != 0:
            raise ValueError("Balance must be zero to close")

        self.raise_event(AccountClosed(
            aggregate_id=self.id,
            version=self.version + 1,
            reason=reason,
        ))
```

### 4. Command Handler (Lado de Escritura)

```python
class CommandHandler:
    def __init__(self, event_store: EventStore):
        self.event_store = event_store

    def handle(self, aggregate_id: str, command: callable):
        # Cargar aggregate desde event store
        events = self.event_store.get_events(aggregate_id)
        account = BankAccount.from_events(aggregate_id, events)

        # Ejecutar comando (dispara eventos)
        command(account)

        # Persistir nuevos eventos
        pending = account.get_pending_events()
        if pending:
            self.event_store.append(aggregate_id, pending, account.version - len(pending))
            account.clear_pending_events()

        return account

# Uso
store = EventStore('postgresql://user:pass@localhost/eventstore')
handler = CommandHandler(store)

account_id = str(uuid.uuid4())

# Crear cuenta
handler.handle(account_id, lambda acc: acc.create("Alice", 1000))

# Deposito
handler.handle(account_id, lambda acc: acc.deposit(500, "Salary"))

# Retiro
handler.handle(account_id, lambda acc: acc.withdraw(200, "Groceries"))
```

### 5. Proyeccion (Lado de Lectura)

```python
from sqlalchemy import Column, String, Float, DateTime, Boolean

class AccountProjection(Base):
    __tablename__ = 'account_projection'
    id = Column(String, primary_key=True)
    owner_name = Column(String, nullable=False)
    balance = Column(Float, nullable=False, default=0)
    status = Column(String, nullable=False, default='active')
    last_updated = Column(DateTime)

class TransactionProjection(Base):
    __tablename__ = 'transaction_projection'
    id = Column(String, primary_key=True)
    account_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # deposit, withdrawal
    amount = Column(Float, nullable=False)
    description = Column(String)
    timestamp = Column(DateTime, nullable=False)

class AccountProjector:
    """Proyecta eventos en tablas optimizadas para lectura."""

    def __init__(self, session_factory):
        self.Session = session_factory
        self._processed_events = set()

    def handle(self, event: DomainEvent):
        # Idempotencia — saltar eventos ya procesados
        if event.event_id in self._processed_events:
            return

        session = self.Session()
        try:
            if isinstance(event, AccountCreated):
                session.execute(
                    text("""INSERT INTO account_projection (id, owner_name, balance, status, last_updated)
                            VALUES (:id, :name, :bal, 'active', :ts)"""),
                    {'id': event.aggregate_id, 'name': event.owner_name,
                     'bal': event.initial_balance, 'ts': event.timestamp}
                )

            elif isinstance(event, MoneyDeposited):
                session.execute(
                    text("""UPDATE account_projection SET balance = balance + :amt, last_updated = :ts
                            WHERE id = :id"""),
                    {'amt': event.amount, 'ts': event.timestamp, 'id': event.aggregate_id}
                )
                session.execute(
                    text("""INSERT INTO transaction_projection (id, account_id, type, amount, description, timestamp)
                            VALUES (:id, :aid, 'deposit', :amt, :desc, :ts)"""),
                    {'id': event.event_id, 'aid': event.aggregate_id,
                     'amt': event.amount, 'desc': event.description, 'ts': event.timestamp}
                )

            elif isinstance(event, MoneyWithdrawn):
                session.execute(
                    text("""UPDATE account_projection SET balance = balance - :amt, last_updated = :ts
                            WHERE id = :id"""),
                    {'amt': event.amount, 'ts': event.timestamp, 'id': event.aggregate_id}
                )
                session.execute(
                    text("""INSERT INTO transaction_projection (id, account_id, type, amount, description, timestamp)
                            VALUES (:id, :aid, 'withdrawal', :amt, :desc, :ts)"""),
                    {'id': event.event_id, 'aid': event.aggregate_id,
                     'amt': event.amount, 'desc': event.description, 'ts': event.timestamp}
                )

            elif isinstance(event, AccountClosed):
                session.execute(
                    text("""UPDATE account_projection SET status = 'closed', last_updated = :ts
                            WHERE id = :id"""),
                    {'ts': event.timestamp, 'id': event.aggregate_id}
                )

            session.commit()
            self._processed_events.add(event.event_id)

        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
```

### 6. Lado de Query (Modelos de Lectura)

```python
class AccountQueryService:
    def __init__(self, session_factory):
        self.Session = session_factory

    def get_account(self, account_id: str) -> dict:
        session = self.Session()
        try:
            result = session.execute(
                text("SELECT id, owner_name, balance, status FROM account_projection WHERE id = :id"),
                {'id': account_id}
            ).fetchone()
            return dict(result._mapping) if result else None
        finally:
            session.close()

    def get_transactions(self, account_id: str, limit: int = 50) -> list:
        session = self.Session()
        try:
            results = session.execute(
                text("""SELECT type, amount, description, timestamp FROM transaction_projection
                        WHERE account_id = :id ORDER BY timestamp DESC LIMIT :lim"""),
                {'id': account_id, 'lim': limit}
            ).fetchall()
            return [dict(r._mapping) for r in results]
        finally:
            session.close()

    def get_all_accounts(self) -> list:
        session = self.Session()
        try:
            results = session.execute(
                text("SELECT id, owner_name, balance, status FROM account_projection WHERE status = 'active'")
            ).fetchall()
            return [dict(r._mapping) for r in results]
        finally:
            session.close()
```

### 7. Snapshot para Rendimiento

```python
class SnapshotStore:
    """Almacena snapshots de aggregates para evitar reproducir todos los eventos."""

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)

    def save_snapshot(self, aggregate_id: str, version: int, state: dict):
        session = self.Session()
        try:
            session.execute(
                text("""INSERT INTO snapshots (aggregate_id, version, state, created_at)
                        VALUES (:id, :ver, :state, NOW())
                        ON CONFLICT (aggregate_id) DO UPDATE SET version = :ver, state = :state, created_at = NOW()"""),
                {'id': aggregate_id, 'ver': version, 'state': json.dumps(state)}
            )
            session.commit()
        finally:
            session.close()

    def get_snapshot(self, aggregate_id: str) -> Optional[tuple]:
        session = self.Session()
        try:
            result = session.execute(
                text("SELECT version, state FROM snapshots WHERE aggregate_id = :id"),
                {'id': aggregate_id}
            ).fetchone()
            if result:
                return result[0], json.loads(result[1])
            return None
        finally:
            session.close()

# Uso: cargar desde snapshot, luego reproducir solo eventos mas nuevos
def load_aggregate(aggregate_id: str, event_store: EventStore, snapshot_store: SnapshotStore):
    snapshot = snapshot_store.get_snapshot(aggregate_id)
    if snapshot:
        version, state = snapshot
        account = BankAccount(aggregate_id)
        account.__dict__.update(state)
        # Reproducir solo eventos despues del snapshot
        events = event_store.get_events(aggregate_id, from_version=version)
        for event in events:
            account.apply(event)
            account.version = event.version
        return account
    else:
        events = event_store.get_events(aggregate_id)
        return BankAccount.from_events(aggregate_id, events)
```

## Como Funciona

1. **Event store**: Una tabla append-only que almacena cada evento de dominio con su aggregate ID, version y datos serializados. Los eventos nunca se modifican ni eliminan — solo se agregan.
2. **Aggregate root**: Encapsula logica de dominio. Los comandos validan invariantes y disparan eventos. Los eventos se aplican para mutar estado. El aggregate se puede reconstruir desde su historial de eventos.
3. **Concurrencia optimista**: Cada evento tiene un numero de version. Al agregar, la version esperada se verifica contra la version actual. Los desajustes indican una modificacion concurrente — el comando se rechaza.
4. **Proyecciones**: Tablas optimizadas para lectura construidas desde eventos. Cada proyeccion maneja tipos de evento especificos y actualiza tablas desnormalizadas. Las proyecciones se pueden reconstruir desde el event store en cualquier momento.
5. **Snapshots**: Para aggregates con muchos eventos, reproducir todos los eventos es lento. Los snapshots almacenan el estado del aggregate en un punto en el tiempo. La carga usa el snapshot mas solo los eventos despues de la version del snapshot.

## Variantes

### Event Sourcing con Kafka

```python
# Publicar eventos a Kafka despues de agregar al event store
from confluent_kafka import Producer

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def append_and_publish(aggregate_id: str, events: List[DomainEvent], expected_version: int):
    event_store.append(aggregate_id, events, expected_version)
    for event in events:
        producer.produce(
            'domain-events',
            key=aggregate_id.encode('utf-8'),
            value=event.model_dump_json().encode('utf-8'),
        )
    producer.flush()
```

### Multiples Proyecciones

```python
# Diferentes proyecciones para diferentes necesidades de lectura
class ProjectorManager:
    def __init__(self, projectors: list):
        self.projectors = projectors

    def handle(self, event: DomainEvent):
        for projector in self.projectors:
            projector.handle(event)

# Registrar multiples proyecciones
manager = ProjectorManager([
    AccountProjector(session_factory),
    TransactionHistoryProjector(session_factory),
    SearchIndexProjector(elasticsearch_client),
    NotificationProjector(notification_service),
])
```

## Mejores Practicas

- **Hacer eventos inmutables**: Nunca modifiques ni elimines eventos. Si se cometio un error, publica un evento compensatorio. El log de eventos es la fuente de verdad.
- **Usar concurrencia optimista**: Verifica la version esperada al agregar. Esto previene lost updates cuando dos comandos modifican el mismo aggregate concurrentemente.
- **Mantener proyecciones idempotentes**: El mismo evento procesado dos veces debe producir el mismo resultado. Usa event IDs para detectar duplicados.
- **Snapshot de aggregates long-lived**: Los aggregates con miles de eventos son lentos de reconstruir. Snapshot cada N eventos (ej., cada 100) para limitar el replay.
- **Separar bases de datos de escritura y lectura**: CQRS permite diferentes motores de base de datos para escritura (PostgreSQL para eventos) y lectura (Elasticsearch para busqueda, Redis para cache).
- **Versionar tus eventos**: Los schemas de eventos evolucionan con el tiempo. Usa un campo version y upcasters para transformar eventos viejos a nuevos formatos.

## Errores Comunes

- **Almacenar estado actual en lugar de eventos**: El event store debe contener eventos, no el estado final. El estado actual se deriva reproduciendo eventos.
- **No manejar concurrencia**: Sin concurrencia optimista, los comandos concurrentes se sobreescriben entre si. Siempre verifica la version esperada al agregar.
- **Proyecciones no idempotentes**: Si un evento se procesa dos veces (ej., despues de un crash), la proyeccion debe detectarlo y saltarlo. Usa event IDs.
- **Reproducir todos los eventos en cada carga**: Para aggregates long-lived, esto es O(n) en el numero de eventos. Usa snapshots para reducir a O(1) + eventos recientes.
- **Acoplar proyecciones al modelo de escritura**: Las proyecciones deben ser independientes. Una falla de proyeccion no debe bloquear escrituras. Usa procesamiento async de eventos.

## FAQ

**Cual es la diferencia entre event sourcing y audit logging?**

Audit logging registra que paso para compliance. Event sourcing usa eventos como el modelo de datos primario — el estado actual se deriva de eventos. Los audit logs son suplementarios; event sourcing es fundamental.

**Como manejo la evolucion de schema en eventos?**

Usa un campo version en cada evento. Al cargar eventos viejos, aplica upcasters (transformadores) que convierten formatos viejos a nuevos. Nunca modifiques eventos almacenados — transforma al leer.

**Que pasa si una proyeccion falla?**

Las proyecciones deben ser independientes. Si una proyeccion falla, el evento se reintenta o se envia a una dead-letter queue. El event store no se ve afectado. Reconstruye la proyeccion desde el event store cuando este listo.

**Como debuggeo el estado de un aggregate?**

Reproduce eventos desde el event store. El log de eventos proporciona un historial completo de cada cambio de estado. Puedes reproducir a cualquier punto en el tiempo deteniendote en una version especifica.

**Es event sourcing siempre CQRS?**

No, pero se usan comunmente juntos. Event sourcing separa naturalmente escritura (agregar eventos) de lectura (proyecciones). Puedes usar event sourcing sin CQRS derivando el estado actual en cada lectura, pero esto es lento para aggregates complejos.
