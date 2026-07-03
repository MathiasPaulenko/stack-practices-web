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
