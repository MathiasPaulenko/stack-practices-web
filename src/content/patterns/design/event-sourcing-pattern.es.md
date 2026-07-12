---





contentType: patterns
slug: event-sourcing-pattern
title: "Patrón Event Sourcing"
description: "Almacena el estado de una aplicación como una secuencia de eventos en lugar de almacenar solo el estado actual. Un patrón arquitectónico para sistemas auditables."
metaDescription: "Aprende el Patrón Event Sourcing en Python, Java y JavaScript. Patrón arquitectónico para gestión de estado audit-friendly mediante streams de eventos."
difficulty: advanced
topics:
  - design
tags:
  - event-sourcing
  - patron
  - patron-de-diseno
  - arquitectura
  - auditoria
  - event-store
  - python
  - javascript
  - java
relatedResources:
  - /patterns/cqrs-pattern
  - /patterns/saga-pattern
  - /patterns/observer-pattern
  - /patterns/database-per-service-pattern
  - /patterns/event-carried-state-transfer-pattern
  - /patterns/idempotent-consumer-pattern
  - /patterns/inbox-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Event Sourcing en Python, Java y JavaScript. Patrón arquitectónico para gestión de estado audit-friendly mediante streams de eventos."
  keywords:
    - patron event sourcing
    - patron de diseno
    - patron arquitectonico
    - trail de auditoria
    - event store
    - python event sourcing
    - java event sourcing
    - javascript event sourcing





---

# Patrón Event Sourcing

## Resumen

El Patrón Event Sourcing almacena el estado de una aplicación como una secuencia de eventos en lugar de almacenar solo el estado actual. En lugar de actualizar un registro in-place, añades un evento describiendo lo que sucedió. El estado actual se deriva reproduciendo todos los eventos de una entidad. Esto proporciona un trail de auditoría completo, consultas temporales y la capacidad de reconstruir el estado en cualquier momento.

## Cuándo usarlo

Usa el Patrón Event Sourcing cuando:
- Necesites un trail de auditoría completo de cada cambio de estado (finanzas, salud, cumplimiento)
- Quieras reconstruir estados históricos o depurar reproduciendo eventos
- Las arquitecturas impulsadas por eventos ya existan, haciendo que los event stores sean naturales
- [CQRS](/patterns/design/cqrs-pattern) esté en uso, y los modelos de lectura puedan construirse desde proyecciones de eventos
- Necesites compensar fallas reproduciendo o invirtiendo eventos (consulta [Saga](/patterns/design/saga-pattern))
- Ejemplos: libros contables, sistemas de inventario, seguimiento de órdenes, edición colaborativa

## Solución

### Python

```python
from dataclasses import dataclass
from typing import List, Dict
from datetime import datetime

@dataclass
class Event:
    type: str
    entity_id: str
    payload: dict
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

class EventStore:
    def __init__(self):
        self.streams: Dict[str, List[Event]] = {}

    def append(self, entity_id: str, event: Event):
        self.streams.setdefault(entity_id, []).append(event)

    def get_stream(self, entity_id: str) -> List[Event]:
        return list(self.streams.get(entity_id, []))

# Entidad: reconstruye estado desde eventos
class BankAccount:
    def __init__(self, account_id: str):
        self.account_id = account_id
        self.balance = 0
        self.version = 0

    def apply(self, event: Event):
        if event.type == "Deposited":
            self.balance += event.payload["amount"]
        elif event.type == "Withdrawn":
            self.balance -= event.payload["amount"]
        self.version += 1

    @classmethod
    def rehydrate(cls, account_id: str, events: List[Event]):
        account = cls(account_id)
        for e in events:
            account.apply(e)
        return account

# Uso
store = EventStore()
account_id = "ACC-123"

store.append(account_id, Event("Deposited", account_id, {"amount": 100}))
store.append(account_id, Event("Withdrawn", account_id, {"amount": 30}))
store.append(account_id, Event("Deposited", account_id, {"amount": 50}))

# Reconstruye estado
account = BankAccount.rehydrate(account_id, store.get_stream(account_id))
print(f"Balance: {account.balance}")  # 120

# Trail de auditoría completo
for e in store.get_stream(account_id):
    print(f"{e.timestamp}: {e.type} {e.payload}")
```

### JavaScript

```javascript
class Event {
  constructor(type, entityId, payload) {
    this.type = type;
    this.entityId = entityId;
    this.payload = payload;
    this.timestamp = new Date().toISOString();
  }
}

class EventStore {
  constructor() {
    this.streams = new Map();
  }

  append(entityId, event) {
    if (!this.streams.has(entityId)) this.streams.set(entityId, []);
    this.streams.get(entityId).push(event);
  }

  getStream(entityId) {
    return this.streams.get(entityId) || [];
  }
}

class BankAccount {
  constructor(accountId) {
    this.accountId = accountId;
    this.balance = 0;
    this.version = 0;
  }

  apply(event) {
    if (event.type === "Deposited") this.balance += event.payload.amount;
    if (event.type === "Withdrawn") this.balance -= event.payload.amount;
    this.version++;
  }

  static rehydrate(accountId, events) {
    const account = new BankAccount(accountId);
    events.forEach(e => account.apply(e));
    return account;
  }
}

// Uso
const store = new EventStore();
const accountId = "ACC-123";

store.append(accountId, new Event("Deposited", accountId, { amount: 100 }));
store.append(accountId, new Event("Withdrawn", accountId, { amount: 30 }));
store.append(accountId, new Event("Deposited", accountId, { amount: 50 }));

const account = BankAccount.rehydrate(accountId, store.getStream(accountId));
console.log("Balance:", account.balance); // 120

// Trail de auditoría
store.getStream(accountId).forEach(e =>
  console.log(`${e.timestamp}: ${e.type}`, e.payload)
);
```

### Java

```java
import java.util.*;

class Event {
    String type;
    String entityId;
    Map<String, Object> payload;
    String timestamp;

    Event(String type, String entityId, Map<String, Object> payload) {
        this.type = type;
        this.entityId = entityId;
        this.payload = payload;
        this.timestamp = new Date().toString();
    }
}

class EventStore {
    private final Map<String, List<Event>> streams = new HashMap<>();

    void append(String entityId, Event event) {
        streams.computeIfAbsent(entityId, k -> new ArrayList<>()).add(event);
    }

    List<Event> getStream(String entityId) {
        return new ArrayList<>(streams.getOrDefault(entityId, List.of()));
    }
}

class BankAccount {
    String accountId;
    double balance = 0;
    int version = 0;

    BankAccount(String accountId) {
        this.accountId = accountId;
    }

    void apply(Event event) {
        switch (event.type) {
            case "Deposited" -> balance += (double) event.payload.get("amount");
            case "Withdrawn" -> balance -= (double) event.payload.get("amount");
        }
        version++;
    }

    static BankAccount rehydrate(String accountId, List<Event> events) {
        BankAccount account = new BankAccount(accountId);
        events.forEach(account::apply);
        return account;
    }
}

// Uso
EventStore store = new EventStore();
String accountId = "ACC-123";

store.append(accountId, new Event("Deposited", accountId, Map.of("amount", 100.0)));
store.append(accountId, new Event("Withdrawn", accountId, Map.of("amount", 30.0)));
store.append(accountId, new Event("Deposited", accountId, Map.of("amount", 50.0)));

BankAccount account = BankAccount.rehydrate(accountId, store.getStream(accountId));
System.out.println("Balance: " + account.balance); // 120.0
```

## Explicación

Event Sourcing reemplaza el modelo CRUD tradicional con un log de eventos append-only:

- **Event Store**: Log append-only de todos los eventos de dominio por entidad
- **Eventos**: Registros inmutables describiendo lo que sucedió (ej. `Deposited`, `Withdrawn`)
- **Rehidratación de Entidades**: Reconstruir el estado actual reproduciendo todos los eventos de una entidad
- **Proyecciones**: Crear vistas optimizadas para lectura suscribiéndose al stream de eventos
- **Snapshots**: Guardar periódicamente el estado computado para evitar reproducir miles de eventos

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Event Sourcing Completo** | Todo el estado proviene de eventos; sin DB mutable | Máxima auditabilidad; cumplimiento |
| **Híbrido** | Eventos + snapshot de estado actual | Rendimiento; reducir costo de reproducción |
| **Consultas Temporales** | Consultar estado en cualquier momento | Depuración; reportes históricos |
| **Reproducción de Eventos** | Reproducir eventos para reconstruir o migrar | Migraciones de esquema; recuperación de bugs |

## Lo que funciona

- **Los eventos deben describir intención de negocio** (ej. `OrderPlaced`) no acciones técnicas (`RowInserted`)
- **Nunca borres o mutues eventos** — el log es inmutable
- **Usa snapshots para entidades de larga vida** para evitar reproducir miles de eventos
- **Versiona tus esquemas de eventos** para compatibilidad hacia adelante/atrás
- **Consumidores idempotentes** — el mismo evento debería ser seguro de procesar múltiples veces
- **Encripta campos sensibles del payload** a nivel de aplicación

## Errores comunes

- Usar eventos como bus de mensajes en lugar de almacén de estado (separar preocupaciones)
- Mutar o borrar eventos, rompiendo el trail de auditoría
- Olvidar manejar la evolución de esquemas de eventos (rompiendo reproducciones antiguas)
- Reproducir todos los eventos desde el inicio de los tiempos sin snapshots
- Almacenar payloads binarios grandes dentro de eventos en lugar de referencias
- No manejar la entrega duplicada de eventos en sistemas distribuidos

## Preguntas frecuentes

**P: ¿Cómo manejo cambios de esquema en eventos?**
R: Versiona tus tipos de eventos (`OrderPlaced_v1`, `OrderPlaced_v2`). Durante la reproducción, usa un upcaster que transforma eventos antiguos al esquema actual antes de aplicarlos.

**P: ¿Puedo borrar datos bajo GDPR con Event Sourcing?**
R: No puedes borrar eventos, pero puedes encriptarlos con una clave específica del usuario y borrar esa clave. Alternativamente, añade un evento `DataForgotten` y filtralo en las proyecciones.

**P: ¿Cómo funcionan los snapshots?**
R: Después de cada N eventos, guarda el estado computado de la entidad. Al rehidratar, carga el último snapshot y reproduce solo los eventos posteriores a este. Esto mantiene el tiempo de reproducción constante. Consulta [CQRS](/patterns/design/cqrs-pattern) para patrones de modelos de lectura que funcionan bien con Event Sourcing.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
