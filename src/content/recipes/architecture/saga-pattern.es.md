---
contentType: recipes
slug: saga-pattern
title: "Gestionar Transacciones Distribuidas con el Saga Pattern"
description: "Cómo implementar orquestación y coreografía de sagas para mantener consistencia de datos entre microservicios sin transacciones distribuidas ni two-phase commit."
metaDescription: "Aprende saga pattern para transacciones distribuidas. Implementa orquestación y coreografía para mantener consistencia entre microservicios sin 2PC."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - compensation
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/event-driven-architecture
  - /recipes/cqrs-pattern
  - /recipes/database-transactions
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende saga pattern para transacciones distribuidas. Implementa orquestación y coreografía para mantener consistencia entre microservicios sin 2PC."
  keywords:
    - saga pattern
    - transacciones distribuidas
    - orquestacion saga
    - consistencia microservicios
    - compensacion transacciones
---

## Visión general

En una aplicación monolítica, una única transacción de base de datos envuelve múltiples operaciones: debitar una cuenta, acreditar otra, actualizar el estado de una orden. Si algún paso falla, la base de datos hace rollback de todo. La atomicidad está garantizada por el motor de base de datos. En una arquitectura de microservicios, cada servicio posee su propia base de datos. No hay un gestor de transacciones compartido. No puedes envolver un débito en el servicio de pagos, una reserva en el servicio de inventario y un envío en el servicio de logística en un solo bloque `BEGIN...COMMIT`.

El saga pattern resuelve esto dividiendo una transacción de larga duración en una secuencia de transacciones locales. Cada paso actualiza datos en un servicio y publica un evento o comando para activar el siguiente paso. Si un paso falla, la saga ejecuta transacciones compensatorias — deshaciendo los cambios realizados por los pasos anteriores. Hay dos estilos: coreografía (los servicios reaccionan a los eventos de los demás) y orquestación (un gestor de saga central dirige cada paso). Esta receta cubre ambos enfoques, diseño de compensaciones y manejo de fallas.

## Cuándo usarlo

Usa esta receta cuando:

- Una operación de negocio abarca múltiples microservicios con bases de datos independientes
- Two-phase commit (2PC) no está disponible o es inaceptable por latencia o contención de locks. Consulta [Arquitectura Event-Driven](/recipes/architecture/event-driven-architecture) para coordinación sin bloqueos.
- Las operaciones de larga duración deben sobrevivir a la indisponibilidad temporal de servicios
- Las acciones compensatorias son factibles (ej. reembolsar pago, liberar inventario, cancelar envío). Consulta [Microservices Patterns](/guides/architecture/microservices-architecture-guide) para estrategias de resiliencia.
- La consistencia eventual es aceptable para el caso de uso

## Solución

### Saga por Coreografía (Event-Driven)

```typescript
class OrderService {
  async createOrder(orderData: OrderData): Promise<void> {
    const order = await this.orderRepo.create(orderData);
    await this.eventBus.publish('OrderCreated', {
      orderId: order.id,
      items: order.items,
      total: order.total,
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.orderRepo.updateStatus(orderId, 'cancelled');
  }
}

class InventoryService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('OrderCreated', this.onOrderCreated.bind(this));
    this.eventBus.subscribe('PaymentFailed', this.onPaymentFailed.bind(this));
  }

  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.inventoryRepo.reserve(event.items);
    await this.eventBus.publish('InventoryReserved', {
      orderId: event.orderId,
      items: event.items,
    });
  }

  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    await this.inventoryRepo.release(event.orderId);
  }
}

class PaymentService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('InventoryReserved', this.onInventoryReserved.bind(this));
  }

  async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    try {
      await this.paymentGateway.charge(event.orderId, event.total);
      await this.eventBus.publish('PaymentProcessed', { orderId: event.orderId });
    } catch (error) {
      await this.eventBus.publish('PaymentFailed', { orderId: event.orderId, reason: error.message });
    }
  }

  async refund(orderId: string): Promise<void> {
    await this.paymentGateway.refund(orderId);
  }
}
```

### Saga por Orquestación (Controlador Central)

```typescript
class OrderSagaOrchestrator {
  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private shippingService: ShippingService
  ) {}

  async execute(orderData: OrderData): Promise<SagaResult> {
    const state: SagaState = { orderId: generateUUID(), status: 'started' };

    try {
      await this.orderService.createOrder({ ...orderData, id: state.orderId });
      state.orderCreated = true;

      await this.inventoryService.reserve(state.orderId, orderData.items);
      state.inventoryReserved = true;

      await this.paymentService.charge(state.orderId, orderData.total);
      state.paymentProcessed = true;

      await this.shippingService.schedule(state.orderId, orderData.address);
      state.shipped = true;

      return { success: true, orderId: state.orderId };
    } catch (error) {
      await this.compensate(state);
      return { success: false, orderId: state.orderId, error: error.message };
    }
  }

  private async compensate(state: SagaState): Promise<void> {
    if (state.shipped) {
      await this.shippingService.cancel(state.orderId);
    }
    if (state.paymentProcessed) {
      await this.paymentService.refund(state.orderId);
    }
    if (state.inventoryReserved) {
      await this.inventoryService.release(state.orderId);
    }
    if (state.orderCreated) {
      await this.orderService.cancelOrder(state.orderId);
    }
  }
}
```

### Máquina de Estados de Saga (Temporal / Cadence)

```typescript
import { workflow, activity } from '@temporalio/workflow';

const createOrder = activity('createOrder');
const reserveInventory = activity('reserveInventory');
const processPayment = activity('processPayment');
const scheduleShipping = activity('scheduleShipping');
const refundPayment = activity('refundPayment');
const releaseInventory = activity('releaseInventory');

async function orderSaga(orderData: OrderData): Promise<void> {
  const orderId = await createOrder(orderData);

  try {
    await reserveInventory({ orderId, items: orderData.items });
  } catch (error) {
    await compensateOrder(orderId);
    throw error;
  }

  try {
    await processPayment({ orderId, amount: orderData.total });
  } catch (error) {
    await releaseInventory({ orderId });
    await compensateOrder(orderId);
    throw error;
  }

  try {
    await scheduleShipping({ orderId, address: orderData.address });
  } catch (error) {
    await refundPayment({ orderId });
    await releaseInventory({ orderId });
    await compensateOrder(orderId);
    throw error;
  }
}
```

## Explicación

- **Coreografía**: cada servicio publica un evento después de completar su paso. Otros servicios se suscriben y reaccionan. No hay un controlador central. La saga emerge de la interacción de servicios independientes. Es altamente desacoplado pero puede volverse difícil de trazar a medida que crece el número de servicios.
- **Orquestación**: un orquestador de saga dedicado ejecuta pasos secuencialmente, llamando a cada servicio directamente. El orquestador mantiene el estado de la saga y maneja compensaciones si un paso falla. Centraliza la lógica y hace el flujo explícito, pero introduce un punto de control único.
- **Transacciones compensatorias**: a diferencia de los rollbacks de base de datos, las compensaciones son operaciones de negocio explícitas. Reembolsar un pago no es lo mismo que deshacer un `BEGIN...ROLLBACK`. La compensación puede fallar por sí misma, requiriendo reintento o intervención humana. Diseña compensaciones idempotentes que puedan reintentarse de forma segura.
- **Idempotencia**: cada paso de saga y compensación debe ser idempotente. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación. Si la red se agota, el orquestador puede reintentar un paso que ya tuvo éxito. El servicio debe reconocer la solicitud duplicada y devolver el resultado anterior, no ejecutar la operación de nuevo.

## Variantes

| Estilo | Acoplamiento | Visibilidad | Complejidad | Mejor para |
|--------|-------------|-------------|-------------|------------|
| Coreografía | Débil | Pobre (distribuida) | Baja inicial, alta a escala | Flujos simples, pocos servicios |
| Orquestación | Más fuerte | Buena (central) | Media | Flujos complejos, muchos pasos |
| Máquina de estados | Débil | Excelente | Alta | Larga duración, aprobación humana |

## Mejores prácticas

- **Haz cada paso idempotente**: una saga puede reintentar pasos por timeouts de red. Si `reserveInventory` se llama dos veces para la misma orden, debe devolver el mismo ID de reserva en lugar de crear una duplicada. Usa IDs de orden como claves de deduplicación.
- **Diseña compensaciones antes de implementar pasos**: para cada acción hacia adelante, define la compensación correspondiente antes de escribir la acción. Si no puedes definir una compensación (ej. enviar un email no se puede deshacer), reconsidera si el saga pattern encaja.
- **Persiste el estado de la saga**: el orquestador debe almacenar el progreso de la saga en una base de datos, no solo en memoria. Si el orquestador falla en medio de una saga, una nueva instancia debe poder reanudar desde el último paso completado y ejecutar las compensaciones apropiadas.
- **Configura timeouts en cada paso**: un paso de saga que se cuelga indefinitivamente bloquea toda la saga. Configura timeouts por paso (ej. 5 segundos para reserva de inventario, 10 segundos para pago). Si un timeout se dispara, trátalo como falla y compensa.
- **Monitorea la tasa de completitud de sagas**: rastrea el porcentaje de sagas que completan exitosamente vs. las que requieren compensación. Una alta tasa de compensación indica problemas sistémicos — pagos fallando, inventario insuficiente, o servicios downstream inestables. Arregla la causa raíz, no solo los síntomas.

## Errores comunes

- **Compensación faltante para un paso**: la saga debita el pago pero no tiene compensación para la reserva de inventario. Si el pago falla después de la reserva, el inventario permanece reservado para siempre. Cada paso debe tener una transacción compensatoria correspondiente.
- **Orden de compensación incorrecto**: compensar en el orden equivocado puede causar fallas. Si reembolsas el pago antes de cancelar el envío, el servicio de envío puede cobrar de nuevo. Compensa en orden inverso a los pasos hacia adelante: deshaz el último paso primero.
- **Tratar sagas como transacciones ACID**: las sagas proveen consistencia eventual, no atomicidad. Entre el paso de pago y el de envío, el pago está comprometido y el envío aún no está programado. Hay una ventana donde el sistema es inconsistente. Diseña la UI y los procesos downstream para manejar esto.
- **Falta de visibilidad de saga**: una saga atascada (compensación fallando repetidamente) es invisible sin monitoreo dedicado. Construye un dashboard de sagas mostrando activas, completadas y en compensación. Alerta sobre sagas atascadas en compensación por más de 5 minutos.

## Preguntas frecuentes

**P: ¿Es saga mejor que two-phase commit (2PC)?**
R: Para microservicios, generalmente sí. 2PC mantiene locks entre servicios durante la fase de preparación, causando latencia y problemas de disponibilidad. Las sagas liberan locks inmediatamente después de cada transacción local. El trade-off es consistencia eventual en lugar de consistencia fuerte.

**P: ¿Cómo manejo una compensación que falla?**
R: Reintenta con backoff exponencial. Si los reintentos se agotan, alerta a un operador y estaciona la saga en una cola de resolución manual. Algunas compensaciones (reembolsos) pueden requerir aprobación humana. Construye flujos de escalación para compensaciones irresolubles.

**P: ¿Puedo consultar el estado de una saga?**
R: Sí — mantén una tabla de estado de saga en la base de datos del orquestador. Cada fila representa una instancia de saga con columnas para el paso actual, pasos completados y detalles de error. Expón una API de lectura para equipos de soporte y dashboards de monitoreo.

**P: ¿Debería toda interacción entre microservicios usar saga?**
R: No. Las sagas agregan complejidad. Úsalas para procesos de negocio de múltiples pasos que deben ser todo-o-nada. Para llamadas simples uno-a-uno que pueden fallar independientemente, usa llamadas API directas con [retries](/recipes/architecture/retry-backoff) y [circuit breakers](/recipes/architecture/circuit-breaker-pattern).

