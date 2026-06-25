---
contentType: patterns
slug: compensating-transaction-pattern
title: "Patrón Compensating Transaction"
description: "Deshace los efectos de una transacción completada ejecutando una operación contraria, habilitando consistencia eventual en procesos de negocio de larga duración a través de servicios distribuidos."
metaDescription: "Aprende el Patrón Compensating Transaction para deshacer operaciones en sagas. Ejemplos en Python, Java y JavaScript con workflows de rollback, reintentos e idempotencia."
difficulty: advanced
topics:
  - design
  - architecture
  - messaging
tags:
  - compensating-transaction
  - pattern
  - design-pattern
  - saga
  - distributed
  - rollback
  - eventual-consistency
  - resilience
relatedResources:
  - /patterns/design/saga-pattern
  - /patterns/design/outbox-pattern
  - /patterns/design/idempotent-consumer-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Compensating Transaction para deshacer operaciones en sagas. Ejemplos en Python, Java y JavaScript con workflows de rollback, reintentos e idempotencia."
  keywords:
    - compensating transaction
    - design pattern
    - saga
    - distributed
    - rollback
    - eventual consistency
---

# Patrón Compensating Transaction

## Descripción General

El Patrón Compensating Transaction deshace los efectos de una operación de negocio completada ejecutando una operación contraria semántica. A diferencia del rollback de base de datos (que deshace cambios no commiteados), las transacciones compensatorias deshacen operaciones que ya fueron commiteadas a sistemas externos — pagos que fueron cobrados, inventario que fue reservado, o emails que fueron enviados.

En sistemas distribuidos, las transacciones ACID a través de servicios son impracticables. El Patrón Saga coordina una secuencia de transacciones locales, y cuando un paso falla, las transacciones compensatorias revierten los pasos previamente completados. Esto permite que procesos de negocio de larga duración mantengan consistencia eventual sin locks distribuidos o two-phase commit.

## Cuándo Usar

Usa el Patrón Compensating Transaction cuando:
- Un proceso de negocio abarca múltiples servicios o bases de datos distribuidos
- Necesitas deshacer operaciones que ya fueron commiteadas externamente
- El two-phase commit (2PC) no está disponible o es impracticable (la mayoría de las arquitecturas de microservicios)
- Los procesos de larga duración (segundos a días) necesitan semánticas de recuperación por fallas

## Cuándo Evitar

- La operación está dentro de una única base de datos y un simple rollback de transacción funciona
- La lógica de compensación es imposible (ej. un email ya enviado a un cliente)
- El proceso de negocio es tan corto que las transacciones distribuidas son aceptables
- Las transacciones compensatorias mismas fallarían, creando un estado irrecuperable

## Solución

### Python

```python
from dataclasses import dataclass
from typing import List, Callable, Optional
from datetime import datetime
import uuid

@dataclass
class StepResult:
    success: bool
    step_name: str
    compensation_needed: bool = False
    compensation_error: Optional[str] = None

class SagaOrchestrator:
    """Coordina una saga con transacciones compensatorias"""
    def __init__(self):
        self.completed_steps: List[dict] = []
        self.compensation_log: List[dict] = []

    def execute(self, steps: List[dict]) -> StepResult:
        """
        steps: lista de dicts con 'name', 'action', 'compensate'
        Cada uno es un callable que retorna booleano de éxito
        """
        for i, step in enumerate(steps):
            print(f"Ejecutando paso {i+1}: {step['name']}")
            success = step['action']()

            if success:
                self.completed_steps.append({
                    "index": i,
                    "name": step["name"],
                    "compensate": step["compensate"]
                })
            else:
                print(f"Paso {step['name']} falló! Ejecutando transacciones compensatorias...")
                self._compensate()
                return StepResult(success=False, step_name=step["name"])

        return StepResult(success=True, step_name="all_steps")

    def _compensate(self):
        """Ejecuta compensaciones en orden inverso"""
        for step in reversed(self.completed_steps):
            print(f"Compensando: {step['name']}")
            try:
                step["compensate"]()
                self.compensation_log.append({
                    "step": step["name"],
                    "status": "success",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                self.compensation_log.append({
                    "step": step["name"],
                    "status": "failed",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
                print(f"ADVERTENCIA: Compensación falló para {step['name']}: {e}")


# ============================================================================
# SERVICIOS DE DOMINIO CON COMPENSACIÓN
# ============================================================================

class PaymentService:
    def __init__(self):
        self.charges = {}

    def charge(self, order_id: str, amount: float) -> bool:
        txn_id = str(uuid.uuid4())
        self.charges[order_id] = {"txn_id": txn_id, "amount": amount, "status": "charged"}
        print(f"  [Payment] Cobrado ${amount} para orden {order_id}, txn={txn_id}")
        return True

    def refund(self, order_id: str) -> bool:
        charge = self.charges.get(order_id)
        if charge:
            charge["status"] = "refunded"
            print(f"  [Payment] Reembolsado ${charge['amount']} para orden {order_id}")
            return True
        print(f"  [Payment] No se encontró cargo para orden {order_id}")
        return False

class InventoryService:
    def __init__(self):
        self.stock = {"SKU-001": 100, "SKU-002": 50}
        self.reservations = {}

    def reserve(self, order_id: str, sku: str, qty: int) -> bool:
        if self.stock.get(sku, 0) >= qty:
            self.stock[sku] -= qty
            self.reservations[order_id] = {"sku": sku, "qty": qty}
            print(f"  [Inventory] Reservado {qty}x {sku} para orden {order_id}")
            return True
        print(f"  [Inventory] Stock insuficiente para {sku}")
        return False

    def release(self, order_id: str) -> bool:
        reservation = self.reservations.pop(order_id, None)
        if reservation:
            self.stock[reservation["sku"]] += reservation["qty"]
            print(f"  [Inventory] Liberado {reservation['qty']}x {reservation['sku']}")
            return True
        return False

class ShippingService:
    def __init__(self):
        self.shipments = {}

    def create_label(self, order_id: str, address: str) -> bool:
        self.shipments[order_id] = {"address": address, "status": "label_created"}
        print(f"  [Shipping] Etiqueta creada para orden {order_id}")
        return True

    def cancel_label(self, order_id: str) -> bool:
        shipment = self.shipments.pop(order_id, None)
        if shipment:
            print(f"  [Shipping] Etiqueta cancelada para orden {order_id}")
            return True
        return False


# ============================================================================
# DEFINICIÓN DE SAGA
# ============================================================================

class OrderSaga:
    def __init__(self, payments: PaymentService, inventory: InventoryService,
                 shipping: ShippingService):
        self.payments = payments
        self.inventory = inventory
        self.shipping = shipping

    def create_order(self, order_id: str, amount: float, sku: str, qty: int,
                     address: str) -> StepResult:
        saga = SagaOrchestrator()

        steps = [
            {
                "name": "charge_payment",
                "action": lambda: self.payments.charge(order_id, amount),
                "compensate": lambda: self.payments.refund(order_id)
            },
            {
                "name": "reserve_inventory",
                "action": lambda: self.inventory.reserve(order_id, sku, qty),
                "compensate": lambda: self.inventory.release(order_id)
            },
            {
                "name": "create_shipping_label",
                "action": lambda: self.shipping.create_label(order_id, address),
                "compensate": lambda: self.shipping.cancel_label(order_id)
            }
        ]

        return saga.execute(steps)


# ============================================================================
# USO
# ============================================================================

payments = PaymentService()
inventory = InventoryService()
shipping = ShippingService()

saga = OrderSaga(payments, inventory, shipping)

# Orden exitosa
print("=== ORDEN 1 (Éxito) ===")
result = saga.create_order("ORD-001", 99.99, "SKU-001", 2, "123 Main St")
print(f"Resultado: {'ÉXITO' if result.success else 'FALLIDO'}")

# Orden fallida (stock insuficiente dispara compensación)
print("\n=== ORDEN 2 (Fallo -> Compensación) ===")
result = saga.create_order("ORD-002", 999.99, "SKU-999", 500, "456 Oak Ave")
print(f"Resultado: {'ÉXITO' if result.success else 'FALLIDO'}")
print(f"Pago reembolsado: {payments.charges.get('ORD-002', {}).get('status')}")
```

### Java

```java
import java.util.*;
import java.util.function.*;

// Domain services
class PaymentService {
    private final Map<String, Map<String, Object>> charges = new HashMap<>();

    public boolean charge(String orderId, double amount) {
        Map<String, Object> charge = new HashMap<>();
        charge.put("amount", amount);
        charge.put("status", "charged");
        charges.put(orderId, charge);
        System.out.println("  [Payment] Cobrado $" + amount + " para " + orderId);
        return true;
    }

    public boolean refund(String orderId) {
        Map<String, Object> charge = charges.get(orderId);
        if (charge != null) {
            charge.put("status", "refunded");
            System.out.println("  [Payment] Reembolsado $" + charge.get("amount") + " para " + orderId);
            return true;
        }
        return false;
    }
}

class InventoryService {
    private final Map<String, Integer> stock = new HashMap<>(Map.of("SKU-001", 100));
    private final Map<String, Map<String, Object>> reservations = new HashMap<>();

    public boolean reserve(String orderId, String sku, int qty) {
        int available = stock.getOrDefault(sku, 0);
        if (available >= qty) {
            stock.put(sku, available - qty);
            Map<String, Object> res = new HashMap<>();
            res.put("sku", sku); res.put("qty", qty);
            reservations.put(orderId, res);
            System.out.println("  [Inventory] Reservado " + qty + "x " + sku);
            return true;
        }
        System.out.println("  [Inventory] Stock insuficiente para " + sku);
        return false;
    }

    public boolean release(String orderId) {
        Map<String, Object> res = reservations.remove(orderId);
        if (res != null) {
            String sku = (String) res.get("sku");
            int qty = (Integer) res.get("qty");
            stock.put(sku, stock.get(sku) + qty);
            System.out.println("  [Inventory] Liberado " + qty + "x " + sku);
            return true;
        }
        return false;
    }
}

// Saga step
class SagaStep {
    final String name;
    final Supplier<Boolean> action;
    final Runnable compensate;

    SagaStep(String name, Supplier<Boolean> action, Runnable compensate) {
        this.name = name; this.action = action; this.compensate = compensate;
    }
}

// Saga orchestrator
class SagaOrchestrator {
    private final List<SagaStep> completedSteps = new ArrayList<>();

    public boolean execute(List<SagaStep> steps) {
        for (SagaStep step : steps) {
            System.out.println("Ejecutando: " + step.name);
            if (step.action.get()) {
                completedSteps.add(step);
            } else {
                System.out.println(step.name + " falló! Compensando...");
                compensate();
                return false;
            }
        }
        return true;
    }

    private void compensate() {
        List<SagaStep> reverse = new ArrayList<>(completedSteps);
        Collections.reverse(reverse);
        for (SagaStep step : reverse) {
            System.out.println("Compensando: " + step.name);
            try {
                step.compensate.run();
            } catch (Exception e) {
                System.err.println("ADVERTENCIA: Compensación falló para " + step.name + ": " + e.getMessage());
            }
        }
    }
}

// Uso
PaymentService payments = new PaymentService();
InventoryService inventory = new InventoryService();

SagaOrchestrator saga = new SagaOrchestrator();
List<SagaStep> steps = List.of(
    new SagaStep("charge", () -> payments.charge("ORD-001", 99.99), () -> payments.refund("ORD-001")),
    new SagaStep("reserve", () -> inventory.reserve("ORD-001", "SKU-001", 2), () -> inventory.release("ORD-001"))
);

boolean success = saga.execute(steps);
System.out.println("Resultado de saga: " + (success ? "ÉXITO" : "FALLIDO"));
```

### JavaScript

```javascript
class PaymentService {
  constructor() {
    this.charges = new Map();
  }

  charge(orderId, amount) {
    this.charges.set(orderId, { amount, status: 'charged' });
    console.log(`  [Payment] Cobrado $${amount} para ${orderId}`);
    return true;
  }

  refund(orderId) {
    const charge = this.charges.get(orderId);
    if (charge) {
      charge.status = 'refunded';
      console.log(`  [Payment] Reembolsado $${charge.amount} para ${orderId}`);
      return true;
    }
    return false;
  }
}

class InventoryService {
  constructor() {
    this.stock = new Map([['SKU-001', 100]]);
    this.reservations = new Map();
  }

  reserve(orderId, sku, qty) {
    const available = this.stock.get(sku) || 0;
    if (available >= qty) {
      this.stock.set(sku, available - qty);
      this.reservations.set(orderId, { sku, qty });
      console.log(`  [Inventory] Reservado ${qty}x ${sku}`);
      return true;
    }
    console.log(`  [Inventory] Stock insuficiente para ${sku}`);
    return false;
  }

  release(orderId) {
    const res = this.reservations.get(orderId);
    if (res) {
      this.stock.set(res.sku, this.stock.get(res.sku) + res.qty);
      console.log(`  [Inventory] Liberado ${res.qty}x ${res.sku}`);
      this.reservations.delete(orderId);
      return true;
    }
    return false;
  }
}

class SagaOrchestrator {
  constructor() {
    this.completedSteps = [];
  }

  async execute(steps) {
    for (const step of steps) {
      console.log(`Ejecutando: ${step.name}`);
      const success = await step.action();

      if (success) {
        this.completedSteps.push(step);
      } else {
        console.log(`${step.name} falló! Compensando...`);
        await this.compensate();
        return { success: false, failedStep: step.name };
      }
    }
    return { success: true };
  }

  async compensate() {
    const reverse = [...this.completedSteps].reverse();
    for (const step of reverse) {
      console.log(`Compensando: ${step.name}`);
      try {
        await step.compensate();
      } catch (e) {
        console.error(`ADVERTENCIA: Compensación falló para ${step.name}: ${e.message}`);
      }
    }
  }
}

// Uso
async function demo() {
  const payments = new PaymentService();
  const inventory = new InventoryService();
  const saga = new SagaOrchestrator();

  const steps = [
    {
      name: 'charge',
      action: () => payments.charge('ORD-001', 99.99),
      compensate: () => payments.refund('ORD-001')
    },
    {
      name: 'reserve',
      action: () => inventory.reserve('ORD-001', 'SKU-001', 2),
      compensate: () => inventory.release('ORD-001')
    }
  ];

  const result = await saga.execute(steps);
  console.log('Resultado:', result.success ? 'ÉXITO' : 'FALLIDO');
}

demo().catch(console.error);
```

## Explicación

Una transacción compensatoria es un **deshacer semántico** en lugar de un rollback de base de datos:

1. **Cobrar pago** → compensación es **reembolsar pago**
2. **Reservar inventario** → compensación es **liberar inventario**
3. **Crear etiqueta de envío** → compensación es **cancelar etiqueta de envío**

El orquestador de saga ejecuta pasos secuencialmente. Si algún paso falla, ejecuta compensaciones en **orden inverso** para todos los pasos previamente completados. Esto asegura que el sistema retorne a un estado consistente, aunque las operaciones individuales ya fueran commiteadas.

Propiedades clave:
- Las compensaciones son operaciones de negocio en sí mismas, no comandos de base de datos
- Las compensaciones pueden fallar (ej. un reembolso rechazado por el procesador de pagos) y deben ser monitoreadas
- El log de saga registra lo que sucedió para auditoría e intervención manual

## Variantes

| Variante | Coordinación | Caso de Uso |
|----------|-------------|-------------|
| **Saga Orquestada** | Coordinador central maneja pasos y compensaciones | Workflows complejos con ordenamiento claro |
| **Saga Coreografiada** | Servicios emiten eventos; listeners disparan siguientes pasos o compensaciones | Arquitecturas desacopladas, orientadas a eventos |
| **Saga Paralela** | Pasos independientes corren concurrentemente; compensaciones corren para todos al fallar | Alto throughput, pasos débilmente acoplados |
| **Saga Anidada** | Un paso de saga es en sí mismo una sub-saga con sus propias compensaciones | Procesos de negocio recursivos |

## Mejores Prácticas

- **Diseña compensaciones desde el inicio.** Son más difíciles de agregar retrospectivamente que las operaciones originales.
- **Haz compensaciones idempotentes.** Pueden ser reintentadas si el primer intento falla.
- **Loggea todo.** Estado de saga, resultados de compensación, y fallas deben ser observables.
- **Establece timeouts.** Un paso que cuelga para siempre bloquea toda la saga.
- **Provee hooks para intervención manual.** Algunas compensaciones requieren aprobación humana (ej. reembolsos sobre un umbral).

## Errores Comunes

- **Asumir que las compensaciones siempre tienen éxito.** Los reembolsos de pago pueden ser rechazados; el inventario puede ya haber sido enviado.
- **Faltar compensación para un paso.** Cada paso de saga debe tener una contraparte definida.
- **Compensaciones no idempotentes.** Ejecutar una compensación dos veces no debería duplicar el reembolso.
- **Perder estado de saga.** Si el orquestador se cae, las sagas en vuelo deben ser recuperables desde un log persistente.
- **Ignorar fallas parciales.** Un paso que "medio tiene éxito" (ej. pago cobrado pero no registrado) es el caso más difícil de compensar.

## Ejemplos del Mundo Real

### Procesamiento de Órdenes E-Commerce

Realizar una orden involucra pago, reserva de inventario, y envío. Si el envío falla después de que el pago tiene éxito, la saga compensa reembolsando el pago y liberando el inventario.

### Reserva de Viajes

Reservar un viaje involucra vuelos, hoteles y renta de autos. Si la reserva de hotel falla después de que el vuelo fue reservado, la saga cancela la reserva de vuelo (si es posible) y reembolsa al cliente.

### Transferencias Bancarias

Una saga de transferencia inter-bancaria debita la cuenta origen, inicia un wire, y acredita la cuenta destino. Si el wire falla, la saga acredita de vuelta la cuenta origen (compensando el débito).

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre transacción compensatoria y rollback de base de datos?**
A: El rollback deshace cambios no commiteados dentro de una única transacción de base de datos. La compensación deshace cambios commiteados a través de sistemas distribuidos ejecutando contrapartes de operaciones de negocio.

**Q: Pueden compensarse todas las operaciones?**
A: No. Algunas operaciones son irreversibles (ej. un email enviado, un artículo físico enviado). Estas requieren estrategias alternativas: reintentos, intervención humana, o aceptar la inconsistencia.

**Q: Cómo se relaciona esto con el Patrón Saga?**
A: Compensating Transaction es el mecanismo usado por Saga para lograr rollback en sistemas distribuidos. Saga es la estrategia de coordinación; Compensation es el mecanismo de deshacer.

**Q: Qué pasa si una compensación misma falla?**
A: Loggea la falla, alerta a operaciones, y potencialmente reintenta. Algunos sistemas mantienen una "cola de compensación" que reintenta compensaciones fallidas con backoff exponencial hasta que se resuelvan o se manejen manualmente.
