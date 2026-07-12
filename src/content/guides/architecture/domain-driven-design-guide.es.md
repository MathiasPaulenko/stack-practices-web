---





contentType: guides
slug: domain-driven-design-guide
title: "Domain-Driven Design (DDD) — Guía Práctica"
description: "Aprende los fundamentos de DDD: bounded contexts, entidades, value objects, aggregates, y cómo modelar dominios de negocio complejos en código."
metaDescription: "Guía de Domain-Driven Design: bounded contexts, entidades, value objects, aggregates y repositorios. DDD práctico para dominios de negocio complejos."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - architecture
  - arquitectura
  - domain-driven-design
  - guia
  - design
relatedResources:
  - /guides/software-architecture-guide
  - /guides/design-patterns-guide
  - /patterns/repository-pattern
  - /recipes/multi-tenancy
  - /recipes/service-discovery
  - /recipes/event-sourcing-cqrs-pattern
  - /recipes/outbox-pattern-transactional-events
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de Domain-Driven Design: bounded contexts, entidades, value objects, aggregates y repositorios. DDD práctico para dominios de negocio complejos."
  keywords:
    - domain driven design
    - tutorial ddd
    - bounded context
    - aggregate root
    - entidad vs value object
    - arquitectura ddd





---

# Domain-Driven Design (DDD)

## Introducción

Domain-Driven Design es un enfoque de desarrollo de software donde la estructura y el lenguaje del código coinciden estrechamente con el dominio de negocio. Es más valioso para dominios complejos donde la lógica de negocio es la fuente principal de complejidad.

## Conceptos Core

### Ubiquitous Language

El equipo (desarrolladores, expertos de dominio, product managers) acuerda un vocabulario compartido que se usa consistentemente en conversaciones, documentación y código.

**Ejemplo:**
- ❌ `createUser()` — genérico
- ✅ `onboardCustomer()` — específico del dominio
- ❌ `orderStatus` = `1` — sin significado
- ✅ `orderStatus` = `PaymentPending` — autodocumentado

### Bounded Context

Un bounded context es un límite lógico dentro del cual un modelo de dominio particular aplica. Los términos y reglas son consistentes dentro de un contexto pero pueden diferir entre contextos.

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Sales Context   │  │ Inventory Context│  │ Shipping Context│
│  ─────────────   │  │ ───────────────  │  │ ───────────────  │
│  Customer        │  │ Product          │  │ Delivery         │
│  Order           │  │ StockItem        │  │ Shipment         │
│  Payment         │  │ Warehouse        │  │ Carrier          │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Mismo término, diferente significado:**
- En Sales, un `Customer` es alguien que realiza pedidos
- En Support, un `Customer` es alguien que abre tickets
- Son modelos diferentes en contextos diferentes

### Entities

Objetos con una identidad distinta que persiste a través del tiempo y los cambios de estado.

```python
class Order:
    def __init__(self, order_id: str):
        self.order_id = order_id  # Identidad
        self.items = []
        self.status = "pending"

    def add_item(self, product, qty):
        self.items.append(OrderLine(product, qty))

    def confirm(self):
        self.status = "confirmed"
```

**Rasgo clave:** Dos órdenes con el mismo `order_id` son la misma entidad, incluso si sus contenidos difieren.

### Value Objects

Objetos definidos por sus atributos, sin identidad conceptual.

```python
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
- Inmutables (cambiar atributos crea un nuevo value object)
- Intercambiables si los atributos coinciden (`$5 == $5`)
- Sin ciclo de vida; pueden crearse y descartarse libremente

### Aggregates

Un cluster de entidades y value objects tratados como una única unidad para cambios de datos. El aggregate root es la única entidad que el código externo puede referenciar directamente.

```python
class Order(AggregateRoot):
    def __init__(self, order_id: str):
        self.order_id = order_id
        self._lines: List[OrderLine] = []
        self._status = OrderStatus.PENDING

    def add_line(self, product_id: str, qty: int, unit_price: Money):
        if self._status != OrderStatus.PENDING:
            raise InvalidOperation("Cannot modify a confirmed order")
        self._lines.append(OrderLine(product_id, qty, unit_price))

    def total(self) -> Money:
        return sum(line.total() for line in self._lines)
```

**Reglas:**
- Todas las modificaciones pasan por el aggregate root
- El aggregate root controla invariantes (reglas de negocio)
- Una transacción = una actualización de aggregate

### Repositories

Los repositories median entre el dominio y las capas de mapeo de datos, actuando como una colección en memoria de aggregates.

```python
class OrderRepository:
    def get(self, order_id: str) -> Order:
        ...

    def save(self, order: Order):
        ...

    def find_by_customer(self, customer_id: str) -> List[Order]:
        ...
```

### Domain Events

Eventos que capturan algo importante sucediendo en el dominio.

```python
@dataclass
class OrderConfirmed:
    order_id: str
    customer_id: str
    total: Money
    confirmed_at: datetime
```

Los domain events permiten acoplamiento flojo entre bounded contexts. Consulta [arquitectura event-driven](/guides/architecture/event-driven-architecture-guide).

## DDD Estratégico vs. DDD Táctico

| | DDD Estratégico | DDD Táctico |
|---|-----------------|-------------|
| **Enfoque** | Visión general, organización de equipos | Patrones de implementación |
| **Output** | Bounded contexts, context maps | Entities, aggregates, repositories |
| **Cuándo** | Temprano en el proyecto, durante discovery | Durante implementación |
| **Quién** | Arquitectos, tech leads, expertos de dominio | Equipos de desarrollo |

## Cuándo Usar DDD

Usa DDD cuando:
- El dominio es complejo y cambia frecuentemente
- Las reglas de negocio son centrales para la aplicación
- El equipo incluye expertos de dominio que pueden colaborar
- El proyecto es lo suficientemente grande para justificar el overhead

**Evita DDD cuando:**
- El dominio es CRUD simple con pocas reglas de negocio
- El equipo carece de acceso a expertos de dominio
- El proyecto es pequeño y de corta duración

## Lo que funciona

- **Empieza con el ubiquitous language**, no con el esquema de base de datos
- **Mantén los aggregates pequeños** — los aggregates grandes dañan la [concurrencia](/guides/concurrency/concurrency-patterns-guide)
- **Prefiere value objects** sobre entidades cuando sea posible (más simples, inmutables)
- **Una transacción por aggregate** — no actualices múltiples aggregates en una transacción. Consulta [diseño de bases de datos](/guides/databases/database-design-guide).
- **Usa domain events** para comunicación cross-aggregate
- **No sobre-ingenieres** — no todo proyecto necesita DDD completo

## Errores Comunes

- Diseñar el [esquema de base de datos](/guides/databases/database-design-guide) primero, luego forzar patrones DDD encima
- Hacer cada objeto una entidad en lugar de usar value objects
- Crear aggregates gigantes que abarcan la mitad del dominio
- Usar DDD para aplicaciones CRUD simples
- Ignorar los límites de bounded context, creando una "bola de lodo"
- Confundir servicios de aplicación con servicios de dominio

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre una entidad y un aggregate root?**
R: Un aggregate root es una entidad especial que funciona como punto de entrada a un aggregate. Todas las referencias externas al aggregate pasan por la root, y todas las modificaciones se hacen vía los métodos de la root.

**P: ¿Puedo usar DDD con microservicios?**
R: Sí. Cada [microservicio](/guides/architecture/microservices-architecture-guide) típicamente se alinea con un bounded context. El límite del servicio refuerza el límite del contexto, y los servicios se comunican vía domain events o APIs.

**P: ¿Cómo identifico bounded contexts?**
R: Busca áreas donde la terminología cambia, diferentes equipos tienen ownership, o donde las capacidades de negocio son independientes. Los workshops de [Event Storming](/guides/architecture/event-driven-architecture-guide) son una técnica común.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Modelado de Dominio para E-commerce

```text
Proyecto: Plataforma e-commerce (Java + Spring Boot)
Dominio: Ventas, Inventario, Envios, Soporte
Equipo: 12 desarrolladores divididos por bounded context

Paso 1: Event Storming (taller de 2 dias)
  Participantes: 2 expertos de dominio, 1 product manager, 4 desarrolladores
  Output: 340 eventos post-it, 47 comandos, 12 agregados identificados

  Eventos clave descubiertos:
    - CarritoAbandonado, CarritoConvertido
    - OrdenCreada, OrdenConfirmada, OrdenCancelada
    - PagoProcesado, PagoRechazado, ReembolsoEmitido
    - StockReservado, StockLiberado, StockAgotado
    - EnvioCreado, EnvioDespachado, EnvioEntregado

Paso 2: Identificar bounded contexts
  | Contexto | Responsabilidad | Equipo |
  |----------|----------------|--------|
  | Ventas | Carrito, ordenes, checkout | 4 devs |
  | Pagos | Procesamiento, reembolsos | 2 devs |
  | Inventario | Stock, reservas, reabastecimiento | 3 devs |
  | Envios | Logistica, carriers, tracking | 3 devs |

  Context map:
    Ventas -> Pagos: Customer/Supplier (ACL en Ventas)
    Ventas -> Inventario: Customer/Supplier (ACL en Ventas)
    Inventario -> Envios: Shared Kernel (modelo de envio compartido)
    Soporte -> Ventas: Conformist (Soporte se adapta a Ventas)

Paso 3: Modelar agregados (contexto Ventas)

  Aggregate: Order (root)
    - OrderId (identidad)
    - CustomerId (value object)
    - List<OrderLine> (entidades dentro del aggregate)
    - OrderStatus (value object: PENDING, CONFIRMED, SHIPPED, CANCELLED)
    - Money total (value object)

  Invariantes del aggregate Order:
    - No se pueden agregar items a una orden confirmada
    - El total debe ser > 0 para confirmar
    - Una orden cancelada no puede cambiar de estado
    - Max 50 items por orden (regla de negocio)

  // Order.java (aggregate root)
  public class Order extends AggregateRoot {
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

Paso 4: Domain events para integracion cross-context

  OrderConfirmed (publicado por Ventas):
    - Pagos escucha -> procesa pago
    - Inventario escucha -> reserva stock
    - Notificaciones escucha -> envia confirmacion al cliente

  Integracion via Kafka (eventos como Avro):
    topic: orders.confirmed
    schema: OrderConfirmed.avsc
    particiones: 12 (por order_id)

Paso 5: Anti-Corruption Layer (ACL)
  Ventas necesita datos de Inventario, pero no quiere acoplarse
  al modelo de Inventario. Usa un ACL:

  // En el contexto de Ventas
  public interface InventoryService {
      boolean isAvailable(ProductId productId, int quantity);
  }

  // Implementacion del ACL (adapter)
  public class InventoryServiceACL implements InventoryService {
      private InventoryApiClient client; // llama al API de Inventario

      public boolean isAvailable(ProductId productId, int quantity) {
          // Traduce del modelo de Ventas al modelo de Inventario
          var request = new CheckStockRequest(productId.value(), quantity);
          var response = client.checkStock(request);
          return response.available();
      }
  }

Lecciones aprendidas:
  - Event Storming revelo eventos que el equipo no habia considerado
  - Los bounded contexts se alinearon con la estructura de equipos
  - Los aggregates pequenos permitieron concurrencia sin conflictos
  - Los domain events desacoplaron Ventas de Pagos e Inventario
  - El ACL protegio a Ventas de cambios en el modelo de Inventario
```

### Como manejo la consistencia entre bounded contexts?

Usa consistencia eventual con domain events. Dentro de un bounded context, usa transacciones ACID para mantener invariantes del aggregate. Entre bounded contexts, publica domain events y deja que cada contexto reaccione de forma independiente. Si necesitas consistencia fuerte cross-context, reconsidera los limites: quizas pertenecen al mismo contexto. Para procesos multi-paso, usa el patron Saga con compensaciones.
