---
contentType: guides
slug: complete-guide-modular-monolith
title: "Modular Monolith: Límites de Módulos y Shared Kernel"
description: "Diseñá un monolito modular con límites claros, un shared kernel, reglas de dependencias y un camino de migración a microservicios cuando la escala lo exija."
metaDescription: "Diseñá un monolito modular: definí límites de módulos, un shared kernel, reglas de dependencias y un camino limpio de migración a microservicios."
difficulty: advanced
topics:
  - architecture
tags:
  - guide
  - modular-monolith
  - architecture
  - module-boundaries
  - microservices
  - ddd
  - domain-driven-design
relatedResources:
  - /guides/complete-guide-strangler-fig-migration
  - /guides/complete-guide-api-gateway-pattern
  - /patterns/modular-monolith-pattern
  - /guides/complete-guide-event-sourcing-cqrs
lastUpdated: "2026-08-18"
publishedAt: "2026-07-06"
author: Mathias Paulenko
estimatedReadTime: 22
seo:
  metaDescription: "Diseñá un monolito modular: definí límites de módulos, un shared kernel, reglas de dependencias y un camino limpio de migración a microservicios."
  keywords:
    - monolito modular
    - límites de módulos
    - shared kernel
    - reglas de dependencias
    - migración a microservicios
    - domain driven design
---

## Visión General

Un monolito modular es una aplicación que se despliega como una sola unidad,
pero con el código organizado en módulos independientes. Cada módulo posee su
propia lógica de dominio, datos e interfaz pública, y solo se comunica con los
otros a través de contratos bien definidos. Eso da la simplicidad operativa de un
monolito, pero mantiene la separación de responsabilidades que vas a necesitar si
más adelante dividís el sistema en servicios.

En esta guía vamos a ver la estructura de módulos, las APIs públicas, el shared
kernel, las reglas de dependencias, los patrones de comunicación y cómo extraer
módulos de a uno.

## Cuándo Usar

Un monolito modular encaja bien cuando:

- Tu equipo quiere límites claros y módulos independientes sin la complejidad de
  un sistema distribuido.
- Algunas partes del sistema pueden necesitar escalar o desplegarse por separado
  más adelante, pero todavía no.
- Querés una sola base de datos y un solo repositorio, pero evitando el "bola de
  barro" del monolito clásico.
- Todavía no estás seguro de que los microservicios justifiquen el gasto.

## Estructura del Módulo

```text
src/
├── modules/
│   ├── orders/
│   │   ├── domain/           # Entidades, value objects, eventos de dominio
│   │   │   ├── Order.ts
│   │   │   ├── OrderItem.ts
│   │   │   └── events/
│   │   │       ├── OrderPlaced.ts
│   │   │       └── OrderCancelled.ts
│   │   ├── application/      # Casos de uso, handlers de comandos/consultas
│   │   │   ├── PlaceOrder.ts
│   │   │   ├── CancelOrder.ts
│   │   │   └── GetOrderDetails.ts
│   │   ├── infrastructure/   # Base de datos, servicios externos
│   │   │   ├── OrderRepository.ts
│   │   │   └── OrderSchema.ts
│   │   ├── api/              # API pública del módulo
│   │   │   ├── OrdersModule.ts  # Interfaz pública
│   │   │   └── types.ts
│   │   └── presentation/     # Controladores, DTOs
│   │       ├── OrdersController.ts
│   │       └── dto/
│   ├── customers/
│   ├── inventory/
│   └── billing/
├── shared/                   # Shared kernel — usado por todos los módulos
│   ├── events/
│   │   ├── EventBus.ts
│   │   └── DomainEvent.ts
│   ├── types/
│   │   ├── Money.ts
│   │   └── Address.ts
│   └── utils/
└── kernel/                   # Composition root
    ├── AppModule.ts
    └── bootstrap.ts
```

## API Pública del Módulo

```typescript
// modules/orders/api/OrdersModule.ts — Interfaz pública del módulo Orders
export interface OrdersModule {
  placeOrder(command: PlaceOrderCommand): Promise<OrderId>;
  cancelOrder(command: CancelOrderCommand): Promise<void>;
  getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails>;
  getOrderHistory(query: GetOrderHistoryQuery): Promise<OrderSummary[]>;
}

export interface PlaceOrderCommand {
  customerId: string;
  items: { productId: string; quantity: number; price: number }[];
  shippingAddress: Address;
}

export interface OrderDetails {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  items: { productId: string; quantity: number; price: number }[];
  totalAmount: number;
  createdAt: Date;
}

// La implementación es interna; los otros módulos solo ven la interfaz
class OrdersModuleImpl implements OrdersModule {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly inventoryModule: InventoryModule,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<OrderId> {
    // Verificá disponibilidad en inventario
    for (const item of command.items) {
      const available = await this.inventoryModule.checkAvailability({
        productId: item.productId,
        quantity: item.quantity,
      });
      if (!available) {
        throw new Error(`Product ${item.productId} not available`);
      }
    }

    // Creá la orden
    const order = Order.create(command.customerId, command.items, command.shippingAddress);
    await this.orderRepo.save(order);

    // Publicá el evento de dominio
    await this.eventBus.publish(new OrderPlaced(order.id, order.customerId, order.totalAmount));

    return order.id;
  }

  async cancelOrder(command: CancelOrderCommand): Promise<void> {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) throw new Error('Order not found');

    order.cancel(command.reason);
    await this.orderRepo.save(order);

    await this.eventBus.publish(new OrderCancelled(order.id, order.customerId, command.reason));
  }

  async getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails> {
    const order = await this.orderRepo.findById(query.orderId);
    if (!order) throw new Error('Order not found');

    return {
      id: order.id.value,
      status: order.status,
      items: order.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      })),
      totalAmount: order.totalAmount.value,
      createdAt: order.createdAt,
    };
  }

  async getOrderHistory(query: GetOrderHistoryQuery): Promise<OrderSummary[]> {
    const orders = await this.orderRepo.findByCustomerId(query.customerId);
    return orders.map(o => ({
      id: o.id.value,
      status: o.status,
      totalAmount: o.totalAmount.value,
      createdAt: o.createdAt,
    }));
  }
}
```

## Shared Kernel

```typescript
// shared/events/EventBus.ts — Bus de eventos en proceso para comunicación entre módulos
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  register<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): void {
    const existing = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.constructor.name) || [];
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Handler failed for ${event.constructor.name}:`, error);
        // No relances el error; un handler no debería bloquear a los otros
      }
    }
  }
}

// shared/types/Money.ts — Value object compartido
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (amount < 0) throw new Error('Money cannot be negative');
  }

  static create(amount: number, currency = 'USD'): Money {
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  multiply(quantity: number): Money {
    return Money.create(this.amount * quantity, this.currency);
  }
}
```

## Reglas de Dependencias

```typescript
// ARCHITECTURE TEST — Reforzá los límites del módulo con reglas de dependencias
// Usando dependency-cruiser o un test custom

// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internal-access',
      comment: 'Los módulos no deben acceder a los internos de otros módulos',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/' },
      to: { path: 'src/modules/(?!$1)([^/]+)/((?!api/).*)' },
    },
    {
      name: 'no-domain-to-infrastructure',
      comment: 'El dominio no debe depender de la infraestructura',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/domain/' },
      to: { path: 'src/modules/$1/infrastructure/' },
    },
    {
      name: 'no-domain-to-presentation',
      comment: 'El dominio no debe depender de la presentación',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/domain/' },
      to: { path: 'src/modules/$1/presentation/' },
    },
    {
      name: 'modules-must-not-share-database-tables',
      comment: 'Cada módulo posee sus tablas',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/infrastructure/' },
      to: { path: 'src/modules/(?!$1)([^/]+)/infrastructure/.*Schema' },
    },
  ],
};
```

## Comunicación Entre Módulos

### Vía API pública (síncrona)

```typescript
// modules/billing/application/GenerateInvoice.ts
class GenerateInvoice {
  constructor(
    private readonly ordersModule: OrdersModule,  // Depende solo de la API pública
    private readonly invoiceRepo: InvoiceRepository,
  ) {}

  async execute(orderId: string): Promise<InvoiceId> {
    const order = await this.ordersModule.getOrderDetails({ orderId });
    if (order.status !== 'completed') {
      throw new Error('Cannot invoice non-completed orders');
    }

    const invoice = Invoice.create(order.id, order.totalAmount, order.items);
    await this.invoiceRepo.save(invoice);
    return invoice.id;
  }
}
```

### Vía eventos de dominio (asíncrona)

```typescript
// modules/inventory/application/OnOrderPlaced.ts — Reaccioná a eventos del módulo Orders
class OnOrderPlaced implements EventHandler<OrderPlaced> {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    // Reservá inventario cuando se crea una orden
    for (const item of event.items) {
      await this.inventoryRepo.reserve(item.productId, item.quantity, event.aggregateId);
    }
  }
}

// modules/billing/application/OnOrderCompleted.ts
class OnOrderCompleted implements EventHandler<OrderCompleted> {
  constructor(
    private readonly invoiceGenerator: GenerateInvoice,
  ) {}

  async handle(event: OrderCompleted): Promise<void> {
    await this.invoiceGenerator.execute(event.aggregateId);
  }
}

// Conectá todo en el composition root
eventBus.register('OrderPlaced', new OnOrderPlaced(inventoryRepo));
eventBus.register('OrderCompleted', new OnOrderCompleted(invoiceGenerator));
```

## Base de Datos por Módulo

```typescript
// Cada módulo tiene su propio esquema/tablas — sin acceso cruzado
// modules/orders/infrastructure/OrderSchema.ts
const OrderSchema = {
  tableName: 'orders',
  columns: {
    id: 'uuid PRIMARY KEY',
    customer_id: 'uuid NOT NULL',
    status: 'varchar(20) NOT NULL',
    total_amount: 'decimal(10,2) NOT NULL',
    created_at: 'timestamp NOT NULL',
    updated_at: 'timestamp',
  },
};

// modules/customers/infrastructure/CustomerSchema.ts
const CustomerSchema = {
  tableName: 'customers',
  columns: {
    id: 'uuid PRIMARY KEY',
    email: 'varchar(255) UNIQUE NOT NULL',
    name: 'varchar(255) NOT NULL',
    created_at: 'timestamp NOT NULL',
  },
};

// MAL: el módulo Orders consulta directamente la tabla customers
// class OrderRepository {
//   async findWithCustomer(orderId: string) {
//     return db.query('SELECT o.*, c.name FROM orders o JOIN customers c ON o.customer_id = c.id');
//   }
// }

// BIEN: usá la API pública del módulo Customers
class OrderService {
  constructor(private customersModule: CustomersModule) {}

  async getOrderWithCustomer(orderId: string) {
    const order = await this.ordersModule.getOrderDetails({ orderId });
    const customer = await this.customersModule.getCustomer({ id: order.customerId });
    return { order, customer };
  }
}
```

## Migración a Microservicios

### Paso 1: Extraer un módulo a su propio proceso

```typescript
// Antes: llamada en proceso
const order = await ordersModule.getOrderDetails({ orderId });

// Después: llamada HTTP al servicio extraído
const order = await ordersClient.getOrderDetails(orderId);

// Misma interfaz, distinta implementación
interface OrdersModule {
  getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails>;
}

class OrdersModuleHttp implements OrdersModule {
  constructor(private readonly httpClient: HttpClient) {}

  async getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails> {
    const response = await this.httpClient.get(`/api/orders/${query.orderId}`);
    return response.data;
  }
}

// Intercambialo en el composition root
const ordersModule = isMicroservice
  ? new OrdersModuleHttp(httpClient)
  : new OrdersModuleImpl(orderRepo, eventBus, inventoryModule);
```

### Paso 2: Reemplazar eventos en proceso por un message broker

```typescript
// Antes: bus de eventos en proceso
eventBus.publish(new OrderPlaced(orderId, customerId, total));

// Después: publicá en RabbitMQ/Kafka
messageBroker.publish('order.events', new OrderPlaced(orderId, customerId, total));

// Suscriptor en el servicio extraído
messageBroker.subscribe('order.events', async (event) => {
  if (event.type === 'OrderPlaced') {
    await inventoryService.reserveItems(event.items);
  }
});
```

## Mejores Prácticas

- Definí una API pública clara para cada módulo, y hacé que los demás se
  comuniquen con él a través de esa API.
- Usá eventos de dominio para el trabajo que no necesita una respuesta
  inmediata. Eso desacopla los módulos en tiempo de ejecución.
- Reforzá los límites con tests de arquitectura. Herramientas como
  dependency-cruiser o ArchUnit van a detectar regresiones en CI.
- Cada módulo debe poseer sus propias tablas, y evitá joins o claves foráneas que
  crucen los límites del módulo.
- Mantené el shared kernel mínimo. Solo deben ir conceptos realmente compartidos
  como `Money`, `Address` o los contratos del bus de eventos.
- Depende de interfaces, no de implementaciones. Las clases concretas se conectan
  en el composition root.
- Versioná las APIs de los módulos. Los cambios roturos necesitan coordinación
  con los consumidores.
- Cuando integres con sistemas legacy, usá capas anticorrupción para traducir
  sus modelos a los tuyos.
- Quédate en monolito hasta tener una razón clara para dividir. La distribución
  agrega latencia, modos de fallo y trabajo operativo.

## Errores Comunes

- **Compartir tablas entre módulos**: un cambio de esquema en un módulo rompe
  otros.
- **No tener una API pública**: los módulos acceden a los internos de otros y
  refactorizar se vuelve riesgoso.
- **Shared kernel demasiado grande**: meter demasiados tipos compartidos ata los módulos entre sí.
- **Llamar todo de forma síncrona**: eso genera un acoplamiento fuerte en tiempo
  de ejecución. Usá eventos para el trabajo que no necesite una respuesta
  inmediata.
- **No tener tests de arquitectura**: los límites se erosionan con el tiempo.
  Reforzalos con tests automatizados.
- **Extraer a microservicios demasiado temprano**: los sistemas distribuidos
  agregan latencia, complejidad y modos de fallo. Dividí un módulo solo cuando
  realmente necesite escalar, desplegarse o tener un equipo dueño distinto.

## Preguntas Frecuentes

### ¿Qué es un monolito modular?

Un monolito modular es una aplicación que se despliega como una sola unidad,
dividida en módulos. Cada uno posee su propia lógica, datos e interfaz pública, y
los módulos se comunican a través de contratos en lugar de meterse en las bases
de datos o internos de los otros.

### ¿Qué es un shared kernel?

El shared kernel es un conjunto compacto de tipos, interfaces y utilidades que
todos los módulos pueden usar. Suele contener value objects como `Money` o
`Address`, los contratos del bus de eventos y tipos de error comunes. Mantenelo
pequeño, porque cada ítem extra del shared kernel agrega acoplamiento.

### ¿En qué se diferencia un monolito modular de los microservicios?

Un monolito modular se despliega como una unidad y se comunica en proceso. Los
microservicios se despliegan de forma independiente y se comunican por la red. El
monolito modular es un punto de partida natural, y podés extraer un módulo a
microservicio cuando aparezca una frontera real.

### ¿Cuándo debería extraer un módulo a microservicio?

Extraélo cuando un módulo tenga distintas necesidades de escala, una cadencia de
despliegue distinta o un equipo dueño distinto. Mové un módulo a la vez,
empezando por el que tenga menos dependencias. Reemplazá las llamadas en proceso
por HTTP o gRPC, y los eventos en proceso por un broker de mensajes.

### ¿Cómo reforzás los límites de los módulos?

Usá tests de arquitectura como dependency-cruiser o ArchUnit, y reglas de lint
que bloqueen importaciones desde rutas que no sean la API de otro módulo. En el
code review, rechazá cualquier acceso directo a bases de datos que cruce los
límites del módulo.
