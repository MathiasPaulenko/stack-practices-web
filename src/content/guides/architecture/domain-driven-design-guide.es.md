---
contentType: guides
slug: domain-driven-design-guide
title: "Domain-Driven Design (DDD): Guía Práctica"
description: "Aprende los fundamentos de DDD: bounded contexts, entidades, value objects, aggregates, y cómo modelar dominios de negocio complejos en código."
metaDescription: "Guía de Domain-Driven Design: aprendé bounded contexts, entidades, value objects, aggregates y repositorios para dominios complejos."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - architecture
  - domain-driven-design
  - guide
  - design
  - pattern
relatedResources:
  - /guides/software-architecture-guide
  - /guides/design-patterns-guide
  - /patterns/repository-pattern
  - /guides/event-driven-architecture-guide
  - /guides/microservices-architecture-guide
  - /guides/solid-principles-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Guía de Domain-Driven Design: aprendé bounded contexts, entidades, value objects, aggregates y repositorios para dominios complejos."
  keywords:
    - domain driven design
    - tutorial ddd
    - bounded context
    - aggregate root
    - entidad vs value object
    - arquitectura ddd
---

## Visión General

Domain-Driven Design (DDD) es un enfoque de desarrollo de software donde la
estructura y el lenguaje del código coinciden con el dominio de negocio. Es más
valioso para dominios complejos donde la lógica de negocio es la principal fuente
de complejidad.

## Cuándo Usar

- El dominio es complejo y cambia frecuentemente.
- Las reglas de negocio son centrales para la aplicación.
- Los expertos de dominio están disponibles para colaborar con desarrolladores.
- El proyecto es lo suficientemente grande como para justificar el overhead de
  modelado.

### Cuándo evitarlo

- El dominio es CRUD simple con pocas reglas de negocio.
- El equipo no tiene acceso a expertos de dominio.
- El proyecto es pequeño y de corta duración.

## Conceptos Core

### Lenguaje ubicuo

El equipo (desarrolladores, expertos de dominio, product managers) acuerda un
vocabulario compartido que se usa en conversaciones, documentación y código.

**Ejemplos:**

- ❌ `createUser()`: genérico
- ✅ `onboardCustomer()`: específico del dominio
- ❌ `orderStatus = 1`: sin significado
- ✅ `orderStatus = PaymentPending`: autodocumentado

### Bounded context

Un bounded context es un límite lógico dentro del cual aplica un modelo de dominio
particular. Los términos y reglas son consistentes dentro del contexto pero pueden
diferir entre contextos.

```text
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Sales Context   │  │ Inventory Context│  │ Shipping Context │
│  ─────────────   │  │ ───────────────  │  │ ───────────────  │
│  Customer        │  │ Product          │  │ Delivery         │
│  Order           │  │ StockItem        │  │ Shipment         │
│  Payment         │  │ Warehouse        │  │ Carrier          │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Mismo término, diferente significado:**

- En Sales, `Customer` es quien realiza pedidos.
- En Support, `Customer` es quien abre tickets.
- Son modelos diferentes en contextos diferentes.

### Entities

Objetos con una identidad distinta que persiste a través del tiempo y los cambios
de estado.

```python
class Order:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self.items = []
        self.status = "pending"

    def add_item(self, product, qty):
        self.items.append(OrderLine(product, qty))

    def confirm(self):
        self.status = "confirmed"
```

**Rasgo clave:** dos órdenes con el mismo `order_id` son la misma entidad, incluso
si sus contenidos difieren.

### Value objects

Objetos definidos por sus atributos, sin identidad conceptual.

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

@dataclass(frozen=True)
class Address:
    street: str
    city: str
    postal_code: str
```

**Rasgos clave:**

- Inmutables; cambiar atributos crea un nuevo value object.
- Intercambiables si los atributos coinciden (`$5 == $5`).
- Sin lifecycle; pueden crearse y descartarse libremente.

### Aggregates

Un cluster de entidades y value objects tratado como una unidad para cambios de
datos. El aggregate root es la única entidad que el código externo puede
referenciar directamente.

```python
class Order:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self._lines = []
        self._status = OrderStatus.PENDING

    def add_line(self, product_id: str, qty: int, unit_price: Money):
        if self._status != OrderStatus.PENDING:
            raise InvalidOperation("Cannot modify a confirmed order")
        self._lines.append(OrderLine(product_id, qty, unit_price))

    def total(self) -> Money:
        return sum((line.total() for line in self._lines), Money("0", "USD"))
```

**Reglas:**

- Todas las modificaciones pasan por el aggregate root.
- El aggregate root controla los invariantes.
- Una transacción = una actualización de aggregate.

### Repositories

Los repositories median entre el dominio y la capa de persistencia. Actúan como
una colección en memoria de aggregates.

```python
class OrderRepository:
    def get(self, order_id: str) -> Order:
        ...

    def save(self, order: Order):
        ...

    def find_by_customer(self, customer_id: str) -> List[Order]:
        ...
```

### Domain events

Eventos que capturan algo importante que ocurre en el dominio.

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class OrderConfirmed:
    order_id: str
    customer_id: str
    total: Money
    confirmed_at: datetime
```

Los domain events permiten acoplamiento flexible entre bounded contexts. Consultá
la [guía de arquitectura event-driven](/guides/event-driven-architecture-guide/).

## Estratégico vs Táctico

| | DDD estratégico | DDD táctico |
| --- | --- | --- |
| Enfoque | Panorama general, organización de equipos | Patrones de implementación |
| Output | Bounded contexts, context maps | Entidades, aggregates, repositorios |
| Cuándo | Al inicio del proyecto, durante discovery | Durante la implementación |
| Quién | Arquitectos, tech leads, expertos de dominio | Equipos de desarrollo |

## Mejores Prácticas

- Empezar por el lenguaje ubicuo, no por el esquema de base de datos.
- Mantener los aggregates pequeños; los aggregates grandes lastran concurrencia.
- Preferir value objects sobre entidades donde sea posible.
- Actualizar un solo aggregate por transacción.
- Usar domain events para comunicación cross-aggregate.
- No sobre-ingenieriar; no todo proyecto necesita DDD completo.

## Errores Comunes

- Diseñar el esquema de base de datos primero y forzar DDD encima.
- Convertir todo objeto en entidad en vez de usar value objects.
- Crear aggregates gigantes que abarcan medio dominio.
- Usar DDD para aplicaciones CRUD simples.
- Ignorar los límites del bounded context, creando una "big ball of mud".
- Confundir application services con domain services.

## FAQ

### ¿Qué diferencia hay entre una entidad y un aggregate root?

Un aggregate root es una entidad especial que sirve como punto de entrada a un
aggregate. Todas las referencias externas pasan por la root, y todas las
modificaciones se hacen a través de sus métodos.

### ¿Puedo usar DDD con microservicios?

Sí. Cada microservicio suele alinearse con un bounded context. El límite del
servicio refuerza el límite del contexto, y los servicios se comunican con domain
events o APIs. Consultá la
[guía de arquitectura de microservicios](/guides/microservices-architecture-guide/).

### ¿Cómo identifico bounded contexts?

Buscá áreas donde la terminología cambia, diferentes equipos tienen ownership, o
las capabilities de negocio son independientes. Los talleres de Event Storming
son una técnica común. Consultá la
[guía de arquitectura event-driven](/guides/event-driven-architecture-guide/).

### ¿Cómo manejo la consistencia entre bounded contexts?

Usá eventual consistency con domain events. Dentro de un contexto, usá
transacciones ACID para mantener invariantes del aggregate. Entre contextos,
publicá domain events y dejá que cada contexto reaccione. Si necesitás
consistencia fuerte entre contextos, reconsiderá los límites: quizás pertenecen
al mismo contexto.

### ¿Cómo empiezo con DDD en un proyecto existente?

Empezá con un módulo o servicio pequeño e aislado. Aplicá los conceptos, medí el
impacto y expandí. Consultá la
[guía de migración de monolito a microservicios](/guides/monolith-to-microservices-migration-guide/).

### ¿Qué herramientas necesito para DDD?

No se requiere ninguna herramienta específica. Usá tu lenguaje de programación,
unit tests y colaboración con expertos de dominio. Consultá la
[guía de design patterns](/guides/design-patterns-guide/) y el
[patrón repository](/patterns/repository-pattern/).

## Ejemplo de Dominio E-Commerce

```text
Proyecto: plataforma de e-commerce (Java + Spring Boot)
Dominio: Sales, Inventory, Shipping, Support
Equipo: 12 desarrolladores divididos por bounded context

Paso 1: Event Storming
  Output: 340 eventos, 47 comandos, 12 aggregates

Paso 2: Bounded contexts
  | Context | Responsabilidad | Equipo |
  |---------|----------------|--------|
  | Sales | Carrito, órdenes, checkout | 4 devs |
  | Payments | Procesamiento, reembolsos | 2 devs |
  | Inventory | Stock, reservas | 3 devs |
  | Shipping | Logística, carriers | 3 devs |

  Context map:
    Sales -> Payments: Customer/Supplier
    Sales -> Inventory: Customer/Supplier
    Inventory -> Shipping: Shared Kernel
    Support -> Sales: Conformist

Paso 3: Aggregate (Sales)
  public class Order {
      private OrderId id;
      private CustomerId customerId;
      private List<OrderLine> lines = new ArrayList<>();
      private OrderStatus status = OrderStatus.PENDING;
      private Money total = Money.ZERO;

      public void addLine(ProductId productId, int quantity, Money unitPrice) {
          if (status != OrderStatus.PENDING)
              throw new DomainException("Cannot modify confirmed order");
          if (lines.size() >= 50)
              throw new DomainException("Max 50 items per order");
          if (quantity <= 0)
              throw new DomainException("Quantity must be positive");
          lines.add(new OrderLine(productId, quantity, unitPrice));
          total = total.add(unitPrice.multiply(quantity));
      }

      public void confirm() {
          if (lines.isEmpty())
              throw new DomainException("Cannot confirm empty order");
          if (total.isZero())
              throw new DomainException("Total must be positive");
          status = OrderStatus.CONFIRMED;
          registerEvent(new OrderConfirmed(id, customerId, total));
      }
  }

Paso 4: Anti-Corruption Layer (ACL)
  public interface InventoryService {
      boolean isAvailable(ProductId productId, int quantity);
  }

  public class InventoryServiceACL implements InventoryService {
      private InventoryApiClient client;

      public boolean isAvailable(ProductId productId, int quantity) {
          var request = new CheckStockRequest(productId.value(), quantity);
          var response = client.checkStock(request);
          return response.available();
      }
  }

Lecciones:
  - Event Storming reveló eventos que el equipo no había considerado.
  - Los bounded contexts se alinearon con la estructura del equipo.
  - Aggregates pequeños habilitaron concurrencia sin conflictos.
  - Domain events desacoplaron Sales de Payments e Inventory.
  - El ACL protegió a Sales de cambios en el modelo de Inventory.
```
