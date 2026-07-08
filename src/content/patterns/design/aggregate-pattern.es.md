---
contentType: patterns
slug: aggregate-pattern
title: "Patrón Aggregate"
description: "Encapsula un cluster de objetos de dominio tratado como una unidad única para cambios de datos. Un Aggregate Root controla el acceso a sus entidades internas y value objects."
metaDescription: "Aprende el Patrón Aggregate en Domain-Driven Design. Ejemplos en Python, Java y JavaScript para forzar invariantes a través de clusters de entidades."
difficulty: advanced
topics:
  - design
tags:
  - aggregate
  - pattern
  - design-pattern
  - behavioral
  - ddd
  - entity
  - domain-driven-design
relatedResources:
  - /patterns/design/value-object-pattern
  - /patterns/design/repository-pattern
  - /patterns/design/outbox-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Aggregate en Domain-Driven Design. Ejemplos en Python, Java y JavaScript para forzar invariantes a través de clusters de entidades."
  keywords:
    - aggregate pattern
    - design pattern
    - domain driven design
    - aggregate root
    - ddd
---

# Patrón Aggregate

## Descripción General

El Patrón Aggregate es un bloque fundamental de Domain-Driven Design (DDD). Un aggregate es un cluster de objetos asociados tratado como una única unidad para cambios de datos. Cada aggregate tiene una entidad raíz — el Aggregate Root — que controla el acceso a sus miembros internos.

El código externo solo puede referenciar al aggregate root directamente. Las entidades internas y value objects no pueden modificarse independientemente; todos los cambios deben pasar por la raíz. Este límite fuerza invariantes (reglas de negocio) que abarcan múltiples objetos dentro del aggregate.

## Cuándo Usar

Usa el Patrón Aggregate cuando:
- Una regla de negocio involucra consistencia a través de múltiples objetos relacionados
- Necesitas forzar invariantes que abarcan un cluster de entidades
- Los cambios a objetos internos deben ser controlados y validados
- El modelo de dominio tiene límites transaccionales naturales

## Cuándo Evitar

- CRUD simple sobre entidades independientes no necesita límites de aggregate
- Aggregates demasiado grandes causan cuellos de botella de concurrencia (evita "god aggregates")
- El sistema usa event sourcing exclusivamente (los aggregates pueden modelarse diferentemente)

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import List
from datetime import datetime
import uuid

@dataclass(frozen=True)
class OrderLine:
    product_id: str
    quantity: int
    unit_price: float

    def total(self) -> float:
        return self.quantity * self.unit_price


class Order:
    def __init__(self, customer_id: str):
        self.id = str(uuid.uuid4())
        self.customer_id = customer_id
        self.lines: List[OrderLine] = []
        self.status = "pending"
        self.created_at = datetime.now()
        self.version = 0

    def add_line(self, product_id: str, quantity: int, unit_price: float):
        if quantity <= 0:
            raise ValueError("La cantidad debe ser positiva")
        if self.status != "pending":
            raise ValueError("No se puede modificar un pedido no pendiente")

        self.lines.append(OrderLine(product_id, quantity, unit_price))
        self.version += 1

    def remove_line(self, product_id: str):
        if self.status != "pending":
            raise ValueError("No se puede modificar un pedido no pendiente")

        self.lines = [line for line in self.lines if line.product_id != product_id]
        self.version += 1

    def total(self) -> float:
        return sum(line.total() for line in self.lines)

    def submit(self):
        if not self.lines:
            raise ValueError("No se puede enviar un pedido vacío")
        self.status = "submitted"
        self.version += 1


# Uso
order = Order(customer_id="cust-123")
order.add_line("prod-1", 2, 9.99)
order.add_line("prod-2", 1, 19.99)
print(f"Total: {order.total():.2f}")  # Total: 39.97
order.submit()
```

### Java

```java
import java.time.Instant;
import java.util.*;

public class Order {
    private final UUID id;
    private final String customerId;
    private final List<OrderLine> lines = new ArrayList<>();
    private String status = "pending";
    private final Instant createdAt;
    private int version = 0;

    public Order(String customerId) {
        this.id = UUID.randomUUID();
        this.customerId = customerId;
        this.createdAt = Instant.now();
    }

    public void addLine(String productId, int quantity, double unitPrice) {
        if (quantity <= 0) throw new IllegalArgumentException("Cantidad debe ser positiva");
        if (!"pending".equals(status)) throw new IllegalStateException("No se puede modificar pedido enviado");
        lines.add(new OrderLine(productId, quantity, unitPrice));
        version++;
    }

    public void removeLine(String productId) {
        if (!"pending".equals(status)) throw new IllegalStateException("No se puede modificar pedido enviado");
        lines.removeIf(line -> line.productId().equals(productId));
        version++;
    }

    public double total() {
        return lines.stream().mapToDouble(OrderLine::total).sum();
    }

    public void submit() {
        if (lines.isEmpty()) throw new IllegalStateException("No se puede enviar pedido vacío");
        status = "submitted";
        version++;
    }

    public UUID getId() { return id; }
    public String getStatus() { return status; }
    public int getVersion() { return version; }
}

record OrderLine(String productId, int quantity, double unitPrice) {
    public double total() { return quantity * unitPrice; }
}
```

### JavaScript

```javascript
class Order {
  constructor(customerId) {
    this.id = crypto.randomUUID();
    this.customerId = customerId;
    this.lines = [];
    this.status = 'pending';
    this.createdAt = new Date();
    this.version = 0;
  }

  addLine(productId, quantity, unitPrice) {
    if (quantity <= 0) throw new Error('La cantidad debe ser positiva');
    if (this.status !== 'pending') throw new Error('No se puede modificar pedido enviado');

    this.lines.push({ productId, quantity, unitPrice });
    this.version++;
  }

  removeLine(productId) {
    if (this.status !== 'pending') throw new Error('No se puede modificar pedido enviado');

    this.lines = this.lines.filter(line => line.productId !== productId);
    this.version++;
  }

  total() {
    return this.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }

  submit() {
    if (this.lines.length === 0) throw new Error('No se puede enviar pedido vacío');
    this.status = 'submitted';
    this.version++;
  }
}

// Uso
const order = new Order('cust-123');
order.addLine('prod-1', 2, 9.99);
order.addLine('prod-2', 1, 19.99);
console.log(order.total().toFixed(2)); // 39.97
order.submit();
```

## Explicación

Un aggregate tiene tres límites:

- **Aggregate Root**: La entidad de nivel superior que el código externo referencia. Tiene una identidad global.
- **Internal Entities**: Objetos con identidad significativa solo dentro del aggregate (ej., `OrderLine` identificado por product ID dentro de un pedido).
- **Value Objects**: Objetos inmutables dentro del aggregate que no tienen identidad (ej., `Money`, `Address`).

Todas las modificaciones fluyen a través de la raíz. Esto asegura que invariantes como "un pedido debe tener al menos una línea para ser enviado" siempre se cumplan.

## Variantes

| Variante | Alcance | Caso de Uso |
|----------|---------|-------------|
| **Aggregate Estándar** | Root + entidades + value objects | Pedido con líneas, cliente con direcciones |
| **Large Aggregate** | Root con muchos niveles | Catálogo de productos con categorías, variantes, precios |
| **Event-Sourced Aggregate** | Rehidratado desde stream de eventos | Cuenta bancaria reconstruida desde eventos `Deposit` / `Withdraw` |

## Lo que funciona

- **Mantén los aggregates pequeños.** Un buen aggregate cabe en memoria y se carga en una única query de base de datos. Aggregates grandes afectan performance.
- **Referencia otros aggregates por ID.** No mantengas referencias directas a objectos de otros aggregate roots. Esto previene cargar el grafo completo.
- **Una transacción por aggregate.** No modifiques dos aggregates en la misma transacción. Usa consistencia eventual y eventos de dominio para coordinación cross-aggregate.
- **Versiona los aggregates para optimistic locking.** Incrementa un campo versión en cada cambio para detectar modificaciones concurrentes.
- **Valida invariantes dentro del aggregate.** Las reglas de negocio pertenecen al modelo de dominio, no a los servicios de aplicación.

## Errores Comunes

- **God aggregates** que cargan cientos de objetos causan problemas de base de datos y memoria. Divide en aggregates más pequeños.
- **Modificación directa de entidades internas** rompe la encapsulación. Todos los cambios deben pasar por la raíz.
- **Transacción a través de aggregates** crea acoplamiento y contención de locks. Publica un evento de dominio en su lugar.
- **Anemic domain models** donde los aggregates son solo bolsas de datos con getters y setters. Pon comportamiento en el aggregate.
- **Ignorar consistencia eventual** entre aggregates. Acepta que aggregates separados pueden estar temporalmente inconsistentes.

## Ejemplos del Mundo Real

### Pedido E-Commerce

Un aggregate `Order` contiene `OrderLines`, un value object `ShippingAddress`, y referencias `Payment`. La raíz del pedido fuerza que los totales coincidan con la suma de líneas y que los pedidos enviados no puedan modificarse.

### Cuenta Bancaria

Un aggregate `Account` contiene entidades `Transaction`. La raíz asegura que el balance nunca baje de cero (reglas de sobregiro) y que las transacciones sean inmutables una vez registradas.

### Carrito de Compras

Un aggregate `Cart` contiene entidades `CartItem`. Al agregar un item para un producto existente, incrementa la cantidad en lugar de agregar una línea duplicada.

## Preguntas Frecuentes

**Q: Qué tan grande debe ser un aggregate?**
A: Tan pequeño como sea posible mientras aún proteja invariantes. Si dos objetos pueden cambiarse independientemente, pertenecen a aggregates separados.

**Q: Puedo referenciar otro aggregate dentro de un aggregate?**
A: Solo por ID, no por referencia directa a objetos. Esto mantiene los aggregates débilmente acoplados e independientemente cargables.

**Q: Cómo fuerza un aggregate reglas entre aggregates?**
A: No lo hace. La consistencia cross-aggregate se logra vía eventos de dominio asíncronos y consistencia eventual, no transacciones.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

## Soluciones Avanzadas

### Aggregate event-sourced con eventos de dominio

Reconstruye el estado del aggregate desde un stream de eventos en lugar de almacenar el estado actual:

```python
from dataclasses import dataclass
from typing import List
from datetime import datetime
import uuid

@dataclass(frozen=True)
class DomainEvent:
    event_id: str
    aggregate_id: str
    event_type: str
    occurred_at: datetime
    data: dict

@dataclass(frozen=True)
class OrderCreated(DomainEvent):
    pass

@dataclass(frozen=True)
class OrderLineAdded(DomainEvent):
    pass

class OrderAggregate:
    def __init__(self, customer_id: str):
        self.id = str(uuid.uuid4())
        self.customer_id = customer_id
        self.lines = []
        self.status = "pending"
        self.version = 0
        self._uncommitted_events: List[DomainEvent] = []

    def add_line(self, product_id: str, quantity: int, unit_price: float):
        if self.status != "pending":
            raise ValueError("No se puede modificar pedido enviado")
        
        event = OrderLineAdded(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            event_type="OrderLineAdded",
            occurred_at=datetime.now(),
            data={"product_id": product_id, "quantity": quantity, "unit_price": unit_price}
        )
        self._apply_event(event)
        self._uncommitted_events.append(event)
        self.version += 1

    def _apply_event(self, event: DomainEvent):
        """Reconstruye estado desde evento."""
        if event.event_type == "OrderLineAdded":
            self.lines.append((event.data["product_id"], event.data["quantity"], event.data["unit_price"]))

    def get_uncommitted_events(self) -> List[DomainEvent]:
        """Retorna eventos no persistidos aún."""
        return self._uncommitted_events.copy()

    def mark_events_as_committed(self):
        """Limpia eventos no comprometidos después de persistencia."""
        self._uncommitted_events.clear()

    @classmethod
    def rebuild_from_events(cls, events: List[DomainEvent]) -> "OrderAggregate":
        """Rehidrata aggregate desde stream de eventos."""
        # Encontrar evento OrderCreated para inicializar
        created = next(e for e in events if e.event_type == "OrderCreated")
        aggregate = cls(created.data["customer_id"])
        aggregate.id = created.aggregate_id
        
        # Aplicar todos los eventos en orden
        for event in events:
            if event.event_type != "OrderCreated":
                aggregate._apply_event(event)
                aggregate.version += 1
        
        return aggregate
```

### Aggregate con optimización de snapshot para event sourcing

Almacena snapshots periódicos para evitar reprocesar todos los eventos:

```python
from dataclasses import dataclass
import json

@dataclass
class AggregateSnapshot:
    aggregate_id: str
    version: int
    state: dict

class OrderAggregate:
    # ... (código anterior)
    
    def to_snapshot(self) -> AggregateSnapshot:
        """Crea snapshot del estado actual."""
        return AggregateSnapshot(
            aggregate_id=self.id,
            version=self.version,
            state={
                "customer_id": self.customer_id,
                "lines": self.lines,
                "status": self.status
            }
        )

    @classmethod
    def from_snapshot(cls, snapshot: AggregateSnapshot, events: List[DomainEvent]) -> "OrderAggregate":
        """Reconstruye desde snapshot y eventos después del snapshot."""
        aggregate = cls(snapshot.state["customer_id"])
        aggregate.id = snapshot.aggregate_id
        aggregate.lines = snapshot.state["lines"]
        aggregate.status = snapshot.state["status"]
        aggregate.version = snapshot.version
        
        # Aplicar solo eventos después de versión del snapshot
        for event in events:
            if event.event_type != "OrderCreated":
                aggregate._apply_event(event)
                aggregate.version += 1
        
        return aggregate
```

### Aggregate con control de concurrencia optimista

Detecta y maneja modificaciones concurrentes usando números de versión:

```python
class ConcurrencyError(Exception):
    pass

class OrderAggregate:
    # ... (código anterior con campo versión)
    
    def add_line(self, product_id: str, quantity: int, unit_price: float, expected_version: int):
        if self.version != expected_version:
            raise ConcurrencyError(f"Se esperaba versión {expected_version}, pero actual es {self.version}")
        
        if self.status != "pending":
            raise ValueError("No se puede modificar pedido enviado")
        
        self.lines.append((product_id, quantity, unit_price))
        self.version += 1

# Uso en servicio de aplicación
try:
    order.add_line("prod-1", 2, 9.99, expected_version=order.version)
    repository.save(order)
except ConcurrencyError:
    # Manejar conflicto: recargar aggregate, reintentar, o notificar usuario
    pass
```

## Mejores Practicas Adicionales

1. **Diseña aggregates alrededor de invariantes de negocio.** El límite del aggregate debe alinearse con requisitos de consistencia transaccional. Si una regla de negocio requiere que múltiples objetos cambien atómicamente, pertenecen al mismo aggregate.

2. **Usa eventos de dominio para comunicar cambios de estado.** Cuando un aggregate cambia, emite un evento de dominio para notificar a otros aggregates o bounded contexts. Esto desacopla aggregates mientras mantiene consistencia eventual.

```python
class OrderAggregate:
    # ... (código anterior)
    
    def submit(self):
        if not self.lines:
            raise ValueError("No se puede enviar pedido vacío")
        self.status = "submitted"
        self.version += 1
        
        # Emitir evento de dominio
        event = OrderSubmitted(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            event_type="OrderSubmitted",
            occurred_at=datetime.now(),
            data={"customer_id": self.customer_id, "total": self.total()}
        )
        self._uncommitted_events.append(event)
```

## Errores Comunes Adicionales

1. **Mezclar concerns en aggregates.** Los aggregates deben contener solo lógica de dominio. Concerns de infraestructura como persistencia, validación para sistemas externos, o lógica de notificación pertenecen a servicios de aplicación, no al aggregate.

2. **Mantener referencias a otros aggregates.** Referencias directas de objetos entre aggregates rompen el límite y causan cascadas de carga. Siempre referencia otros aggregates solo por ID. Cárgalos lazy cuando se necesiten.

## FAQs Adicionales

### ¿Cómo manejo validación entre aggregates?

La validación cross-aggregate se maneja vía eventos de dominio y consistencia eventual. Por ejemplo, para asegurar que un cliente tenga crédito suficiente antes de enviar un pedido, el aggregate de pedido emite un evento `OrderSubmitted`. Un bounded context de verificación de crédito escucha este evento y aprueba o rechaza el pedido asíncronamente. El estado del pedido se actualiza vía otro evento.

### ¿Deben ser los aggregates inmutables?

No. Los aggregates son mutables dentro de su límite. Los métodos de la aggregate root modifican estado interno. Sin embargo, los value objects dentro del aggregate deben ser inmutables. Esto previene que referencias compartidas causen efectos secundarios inesperados.

### ¿Cómo pruebo aggregates?

Prueba aggregates verificando que los invariantes se cumplan y que las reglas de negocio produzcan los cambios de estado esperados. Usa tests unitarios que llaman métodos del aggregate y asercionan el estado resultante o eventos emitidos. Evita probar lógica de persistencia en tests de aggregates; eso pertenece a tests de repositorio.
