---
contentType: recipes
slug: domain-driven-design
title: "Modelar Dominios de Negocio Complejos con Domain-Driven Design"
description: "Cómo estructurar código alrededor de conceptos de negocio usando bounded contexts, aggregates, entities, value objects y domain events para gestionar complejidad en aplicaciones grandes."
metaDescription: "Aprende Domain-Driven Design para dominios de negocio complejos. Usa bounded contexts, aggregates, entities, value objects y domain events para gestionar complejidad."
difficulty: advanced
topics:
  - design
tags:
  - domain-driven-design
  - ddd
  - bounded-context
  - aggregates
  - entities
  - value-objects
  - domain-events
  - clean-architecture
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/event-driven-functions
  - /recipes/api-contract-testing
  - /recipes/database-migrations
lastUpdated: "2026-06-14"
author: "StackPractices"
seo:
  metaDescription: "Aprende Domain-Driven Design para dominios de negocio complejos. Usa bounded contexts, aggregates, entities, value objects y domain events para gestionar complejidad."
  keywords:
    - domain driven design
    - bounded contexts
    - aggregates ddd
    - value objects
    - domain events
---

## Visión general

Domain-Driven Design (DDD) es un enfoque de desarrollo de software donde el foco primario está en el dominio de negocio core y su lógica. En lugar de organizar el código alrededor de capas técnicas (controllers, services, repositories) o estructuras de datos (tablas, documentos), DDD estructura el código alrededor de conceptos de negocio: órdenes, pagos, inventario, envíos. El objetivo es hacer que el código sea un modelo preciso de cómo el negocio realmente funciona, para que las reglas de negocio sean explícitas, testeables y resistentes a la divergencia que ocurre cuando la implementación técnica se separa de la realidad del negocio.

La idea central de DDD es que los dominios grandes son demasiado complejos para modelarse como un sistema unificado. En cambio, el dominio se divide en bounded contexts — áreas autónomas con su propio lenguaje ubicuo, modelos y reglas. Dentro de cada contexto, los aggregates agrupan entidades y value objects relacionados en límites de consistencia. Los domain events comunican cambios entre contextos sin acoplamiento fuerte. Esta receta cubre los patrones tácticos de DDD con ejemplos de implementación en Python, TypeScript y Java.

## Cuándo usarlo

Usa esta receta cuando:

- Construyendo aplicaciones donde las reglas de negocio son complejas, cambian frecuentemente o son poco comprendidas
- Trabajando con expertos de dominio que usan terminología precisa que debería reflejarse en el código
- Descomponiendo un monolito donde diferentes departamentos tienen modelos conflictivos del mismo concepto
- Implementando sistemas event-sourced donde el modelo de dominio impulsa la persistencia
- Refactorizando código legacy donde la lógica de negocio está dispersa entre capas y frameworks

## Solución

### Value Object (TypeScript)

```typescript
class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    if (amount < 0) throw new Error("Amount cannot be negative");
    if (!currency || currency.length !== 3) throw new Error("Invalid currency code");
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

const price = new Money(100, "USD");
const tax = new Money(8, "USD");
const total = price.add(tax); // USD 108.00
```

### Aggregate con Domain Events (Python)

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from uuid import UUID, uuid4

class DomainEvent:
    pass

@dataclass
class OrderItem:
    product_id: UUID
    quantity: int
    unit_price: float

    def total(self) -> float:
        return self.quantity * self.unit_price

@dataclass
class OrderPlaced(DomainEvent):
    order_id: UUID
    customer_id: UUID
    total: float
    occurred_at: datetime

class Order:
    def __init__(self, customer_id: UUID):
        self.id = uuid4()
        self.customer_id = customer_id
        self.items: List[OrderItem] = []
        self.status = "pending"
        self.domain_events: List[DomainEvent] = []

    def add_item(self, product_id: UUID, quantity: int, unit_price: float):
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.status != "pending":
            raise ValueError("Cannot modify a submitted order")
        self.items.append(OrderItem(product_id, quantity, unit_price))

    def submit(self):
        if not self.items:
            raise ValueError("Cannot submit an empty order")
        if self.status != "pending":
            raise ValueError("Order already submitted")

        self.status = "submitted"
        total = sum(item.total() for item in self.items)

        event = OrderPlaced(
            order_id=self.id,
            customer_id=self.customer_id,
            total=total,
            occurred_at=datetime.utcnow()
        )
        self.domain_events.append(event)

    def clear_events(self):
        self.domain_events.clear()
```

### Bounded Context con Anti-Corruption Layer (Java)

```java
public class Order {
    private OrderId id;
    private CustomerId customerId;
    private List<OrderLine> lines;
    private OrderStatus status;

    public void submit() {
        if (lines.isEmpty()) throw new IllegalStateException("Empty order");
        this.status = OrderStatus.SUBMITTED;
        registerEvent(new OrderSubmittedEvent(id, customerId));
    }
}

public class Shipment {
    private ShipmentId id;
    private DeliveryAddress address;
    private List<Package> packages;
}

public class OrderToShipmentAdapter {
    public ShipmentRequest adapt(OrderSubmittedEvent event, Order order) {
        return new ShipmentRequest(
            event.getOrderId().toString(),
            order.getShippingAddress(),
            order.getLines().stream()
                .map(line -> new PackageSpec(line.getProductId(), line.getQuantity()))
                .collect(Collectors.toList())
        );
    }
}
```

## Explicación

- **Bounded context**: un límite lógico dentro del cual un modelo de dominio es consistente. El término "cliente" significa algo diferente en billing (perfil de pago) que en soporte (historial de tickets). Cada contexto tiene su propio modelo, lenguaje y esquema de base de datos. Los contextos se integran vía APIs, eventos o anti-corruption layers.
- **Aggregate**: un clúster de entidades y value objects tratados como una única unidad para cambios de datos. La aggregate root es la única entidad que código externo puede referenciar directamente. Todos los cambios dentro del aggregate deben pasar por la root, asegurando que los invariantes sean respetados. Ejemplo: un aggregate `Order` contiene value objects `OrderLine`.
- **Value object**: un objeto inmutable definido por sus atributos, no por identidad. Dos objetos `Money` con amount 100 y currency USD son iguales e intercambiables. Los value objects embeben reglas de negocio (ej. currency debe ser código ISO de 3 letras) y previenen estados inválidos.
- **Domain event**: una notificación de que algo significativo ocurrió en el dominio. `OrderPlaced` se publica cuando una orden es enviada. Otros contextos se suscriben a estos eventos para reaccionar — inventario decrementa stock, billing crea una factura, shipping prepara un paquete.

## Variantes

| Patrón | Foco | Mutabilidad | Identidad | Ejemplo |
|--------|------|-------------|-----------|---------|
| Entity | Identidad de negocio | Mutable | Sí | Customer, Order |
| Value object | Atributos | Inmutable | No | Money, Address, DateRange |
| Aggregate | Límite de consistencia | Mutable | Root tiene ID | Order + OrderLines |
| Domain service | Lógica cross-aggregate | Stateless | N/A | PricingEngine |
| Repository | Abstracción de persistencia | Stateless | N/A | OrderRepository |

## Mejores prácticas

- **Mantén aggregates pequeños**: un aggregate debería caber cómodamente en memoria y ser escribible en una sola transacción. Si cargar una orden requiere unir 50 tablas, tu aggregate es demasiado grande. Separa en aggregates más pequeños y usa consistencia eventual vía domain events.
- **Diseña para invariantes, no CRUD**: en lugar de métodos genéricos `create`, `update`, `delete`, expón métodos orientados a comportamiento como `add_item`, `submit`, `cancel`. Estos métodos enforce reglas de negocio (ej. "no se puede cancelar una orden enviada") en la capa de dominio.
- **Usa el lenguaje ubicuo**: nombra clases, métodos y variables usando los mismos términos que usan los expertos de dominio. Si los contadores dicen "postear un asiento contable", tu código debería tener `journal.post_entry()`, no `create_transaction_record()`. Esto cierra la brecha entre código y conversación.
- **Publica domain events antes de persistencia**: el patrón es — mutar aggregate, colectar eventos, persistir aggregate, publicar eventos. Si la persistencia falla, los eventos nunca fueron publicados, manteniendo consistencia. Nunca publiques eventos antes de que la transacción se confirme.
- **Evita modelos de dominio anémicos**: un modelo anémico tiene entidades con solo getters y setters, mientras toda la lógica vive en clases de servicio. Esto es solo un esquema de base de datos en código. Empuja las reglas de negocio hacia entidades y value objects donde pertenecen.

## Errores comunes

- **Un bounded context gigante**: modelar toda una empresa como un único contexto crea un enredo. Si dos equipos frecuentemente conflictúan sobre la definición de un término, necesitan contextos separados. Fusiona contextos solo cuando el costo de traducción excede el costo de coordinación.
- **Filtrar persistencia al dominio**: los aggregates no deberían saber sobre anotaciones de ORM, queries SQL o esquemas de documentos. La capa de dominio define repositories como interfaces; la infraestructura los implementa. Esto permite testear lógica de negocio sin base de datos.
- **Sobre-ingeniería dominios simples**: DDD es poderoso pero costoso. Un panel de administración CRUD para un catálogo de 10 entidades no necesita aggregates, domain events y mapas de contexto. Usa DDD cuando la complejidad del negocio justifique el costo de abstracción.
- **Faltar anti-corruption layers**: al integrar con sistemas externos, usar directamente sus modelos de datos contamina tu dominio. Crea una anti-corruption layer que traduzca conceptos externos a tu lenguaje ubicuo, protegiendo tu modelo de cambios externos.

## Preguntas frecuentes

**P: ¿Cómo sé si mi límite de aggregate es correcto?**
R: Un aggregate debería proteger un invariante que debe mantenerse consistente en una sola transacción. Si cambiar una línea de orden debe actualizar inmediatamente el total de la orden, pertenecen al mismo aggregate. Si el stock de inventario puede actualizarse asíncronamente, pertenece a un aggregate diferente.

**P: ¿Puedo usar DDD con una base de datos relacional?**
R: Sí. Los aggregates mapean a tablas, las entities a filas, los value objects pueden ser columnas embebidas o JSON. El patrón repository abstrae la persistencia para que el modelo de dominio no dependa de SQL o detalles de ORM.

**P: ¿Cuál es la diferencia entre un domain service y un application service?**
R: Un domain service contiene lógica de negocio que no pertenece a ninguna entidad (ej. calcular costo de envío entre múltiples carriers). Un application service orquesta casos de uso, llamando repositories y domain services, sin contener reglas de negocio.

**P: ¿Todo proyecto debería usar event sourcing con DDD?**
R: No. Event sourcing almacena estado como una secuencia de eventos. Es poderoso para dominios con fuerte auditoría pero agrega complejidad significativa. Empieza con persistencia estándar y domain events. Solo adopta event sourcing si genuinamente necesitas trails de auditoría completos, queries temporales o capacidades de replay de eventos.

