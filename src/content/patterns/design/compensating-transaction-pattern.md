---
contentType: patterns
slug: compensating-transaction-pattern
title: "Compensating Transaction Pattern"
description: "Undo the effects of a completed transaction by executing a counter-operation, enabling eventual consistency in long-running business processes across distributed services."
metaDescription: "Learn the Compensating Transaction Pattern for undoing operations in sagas. Examples in Python, Java, and JavaScript with rollback workflows, retries, and idempotency."
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
  metaDescription: "Learn the Compensating Transaction Pattern for undoing operations in sagas. Examples in Python, Java, and JavaScript with rollback workflows, retries, and idempotency."
  keywords:
    - compensating transaction
    - design pattern
    - saga
    - distributed
    - rollback
    - eventual consistency
---

# Compensating Transaction Pattern

## Overview

The Compensating Transaction Pattern undoes the effects of a completed business operation by executing a semantic counter-operation. Unlike database rollback (which undoes uncommitted changes), compensating transactions undo operations that have already been committed to external systems — payments that have been charged, inventory that has been reserved, or emails that have been sent.

In distributed systems, ACID transactions across services are impractical. The Saga Pattern coordinates a sequence of local transactions, and when one step fails, compensating transactions roll back previously completed steps. This enables long-running business processes to maintain eventual consistency without distributed locks or two-phase commit.

## When to Use

Use the Compensating Transaction Pattern when:
- A business process spans multiple distributed services or databases
- You need to undo operations that have already been committed externally
- Two-phase commit (2PC) is unavailable or impractical (most microservice architectures)
- Long-running processes (seconds to days) need failure recovery semantics

## When to Avoid

- The operation is within a single database and a simple transaction rollback works
- Compensating logic is impossible (e.g., an email already sent to a customer)
- The business process is so short that distributed transactions are acceptable
- Compensating transactions would themselves fail, creating an unrecoverable state

## Solution

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
    """Coordinates a saga with compensating transactions"""
    def __init__(self):
        self.completed_steps: List[dict] = []
        self.compensation_log: List[dict] = []

    def execute(self, steps: List[dict]) -> StepResult:
        """
        steps: list of dicts with 'name', 'action', 'compensate'
        Each is a callable that returns success boolean
        """
        for i, step in enumerate(steps):
            print(f"Executing step {i+1}: {step['name']}")
            success = step['action']()

            if success:
                self.completed_steps.append({
                    "index": i,
                    "name": step["name"],
                    "compensate": step["compensate"]
                })
            else:
                print(f"Step {step['name']} failed! Running compensating transactions...")
                self._compensate()
                return StepResult(success=False, step_name=step["name"])

        return StepResult(success=True, step_name="all_steps")

    def _compensate(self):
        """Run compensating transactions in reverse order"""
        for step in reversed(self.completed_steps):
            print(f"Compensating: {step['name']}")
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
                print(f"WARNING: Compensation failed for {step['name']}: {e}")


# ============================================================================
# DOMAIN SERVICES WITH COMPENSATION
# ============================================================================

class PaymentService:
    def __init__(self):
        self.charges = {}

    def charge(self, order_id: str, amount: float) -> bool:
        txn_id = str(uuid.uuid4())
        self.charges[order_id] = {"txn_id": txn_id, "amount": amount, "status": "charged"}
        print(f"  [Payment] Charged ${amount} for order {order_id}, txn={txn_id}")
        return True

    def refund(self, order_id: str) -> bool:
        charge = self.charges.get(order_id)
        if charge:
            charge["status"] = "refunded"
            print(f"  [Payment] Refunded ${charge['amount']} for order {order_id}")
            return True
        print(f"  [Payment] No charge found for order {order_id}")
        return False

class InventoryService:
    def __init__(self):
        self.stock = {"SKU-001": 100, "SKU-002": 50}
        self.reservations = {}

    def reserve(self, order_id: str, sku: str, qty: int) -> bool:
        if self.stock.get(sku, 0) >= qty:
            self.stock[sku] -= qty
            self.reservations[order_id] = {"sku": sku, "qty": qty}
            print(f"  [Inventory] Reserved {qty}x {sku} for order {order_id}")
            return True
        print(f"  [Inventory] Insufficient stock for {sku}")
        return False

    def release(self, order_id: str) -> bool:
        reservation = self.reservations.pop(order_id, None)
        if reservation:
            self.stock[reservation["sku"]] += reservation["qty"]
            print(f"  [Inventory] Released {reservation['qty']}x {reservation['sku']}")
            return True
        return False

class ShippingService:
    def __init__(self):
        self.shipments = {}

    def create_label(self, order_id: str, address: str) -> bool:
        self.shipments[order_id] = {"address": address, "status": "label_created"}
        print(f"  [Shipping] Label created for order {order_id}")
        return True

    def cancel_label(self, order_id: str) -> bool:
        shipment = self.shipments.pop(order_id, None)
        if shipment:
            print(f"  [Shipping] Label cancelled for order {order_id}")
            return True
        return False


# ============================================================================
# SAGA DEFINITION
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
# USAGE
# ============================================================================

payments = PaymentService()
inventory = InventoryService()
shipping = ShippingService()

saga = OrderSaga(payments, inventory, shipping)

# Successful order
print("=== ORDER 1 (Success) ===")
result = saga.create_order("ORD-001", 99.99, "SKU-001", 2, "123 Main St")
print(f"Result: {'SUCCESS' if result.success else 'FAILED'}")

# Failed order (insufficient stock triggers compensation)
print("\n=== ORDER 2 (Failure -> Compensation) ===")
result = saga.create_order("ORD-002", 999.99, "SKU-999", 500, "456 Oak Ave")
print(f"Result: {'SUCCESS' if result.success else 'FAILED'}")
print(f"Payment refunded: {payments.charges.get('ORD-002', {}).get('status')}")
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
        System.out.println("  [Payment] Charged $" + amount + " for " + orderId);
        return true;
    }

    public boolean refund(String orderId) {
        Map<String, Object> charge = charges.get(orderId);
        if (charge != null) {
            charge.put("status", "refunded");
            System.out.println("  [Payment] Refunded $" + charge.get("amount") + " for " + orderId);
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
            System.out.println("  [Inventory] Reserved " + qty + "x " + sku);
            return true;
        }
        System.out.println("  [Inventory] Insufficient stock for " + sku);
        return false;
    }

    public boolean release(String orderId) {
        Map<String, Object> res = reservations.remove(orderId);
        if (res != null) {
            String sku = (String) res.get("sku");
            int qty = (Integer) res.get("qty");
            stock.put(sku, stock.get(sku) + qty);
            System.out.println("  [Inventory] Released " + qty + "x " + sku);
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
            System.out.println("Executing: " + step.name);
            if (step.action.get()) {
                completedSteps.add(step);
            } else {
                System.out.println(step.name + " failed! Compensating...");
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
            System.out.println("Compensating: " + step.name);
            try {
                step.compensate.run();
            } catch (Exception e) {
                System.err.println("WARNING: Compensation failed for " + step.name + ": " + e.getMessage());
            }
        }
    }
}

// Usage
PaymentService payments = new PaymentService();
InventoryService inventory = new InventoryService();

SagaOrchestrator saga = new SagaOrchestrator();
List<SagaStep> steps = List.of(
    new SagaStep("charge", () -> payments.charge("ORD-001", 99.99), () -> payments.refund("ORD-001")),
    new SagaStep("reserve", () -> inventory.reserve("ORD-001", "SKU-001", 2), () -> inventory.release("ORD-001"))
);

boolean success = saga.execute(steps);
System.out.println("Saga result: " + (success ? "SUCCESS" : "FAILED"));
```

### JavaScript

```javascript
class PaymentService {
  constructor() {
    this.charges = new Map();
  }

  charge(orderId, amount) {
    this.charges.set(orderId, { amount, status: 'charged' });
    console.log(`  [Payment] Charged $${amount} for ${orderId}`);
    return true;
  }

  refund(orderId) {
    const charge = this.charges.get(orderId);
    if (charge) {
      charge.status = 'refunded';
      console.log(`  [Payment] Refunded $${charge.amount} for ${orderId}`);
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
      console.log(`  [Inventory] Reserved ${qty}x ${sku}`);
      return true;
    }
    console.log(`  [Inventory] Insufficient stock for ${sku}`);
    return false;
  }

  release(orderId) {
    const res = this.reservations.get(orderId);
    if (res) {
      this.stock.set(res.sku, this.stock.get(res.sku) + res.qty);
      console.log(`  [Inventory] Released ${res.qty}x ${res.sku}`);
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
      console.log(`Executing: ${step.name}`);
      const success = await step.action();

      if (success) {
        this.completedSteps.push(step);
      } else {
        console.log(`${step.name} failed! Compensating...`);
        await this.compensate();
        return { success: false, failedStep: step.name };
      }
    }
    return { success: true };
  }

  async compensate() {
    const reverse = [...this.completedSteps].reverse();
    for (const step of reverse) {
      console.log(`Compensating: ${step.name}`);
      try {
        await step.compensate();
      } catch (e) {
        console.error(`WARNING: Compensation failed for ${step.name}: ${e.message}`);
      }
    }
  }
}

// Usage
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
  console.log('Result:', result.success ? 'SUCCESS' : 'FAILED');
}

demo().catch(console.error);
```

## Explanation

A compensating transaction is a **semantic undo** rather than a database rollback:

1. **Charge payment** → compensation is **refund payment**
2. **Reserve inventory** → compensation is **release inventory**
3. **Create shipping label** → compensation is **cancel shipping label**

The Saga orchestrator executes steps sequentially. If any step fails, it runs compensations in **reverse order** for all previously completed steps. This ensures the system returns to a consistent state, even though individual operations were already committed.

Key properties:
- Compensations are themselves business operations, not database commands
- Compensations may fail (e.g., a refund rejected by the payment processor) and must be monitored
- The saga log records what happened for audit and manual intervention

## Variants

| Variant | Coordination | Use Case |
|---------|-------------|----------|
| **Orchestrated Saga** | Central coordinator manages steps and compensations | Complex workflows with clear ordering |
| **Choreographed Saga** | Services emit events; listeners trigger next steps or compensations | Decoupled, event-driven architectures |
| **Parallel Saga** | Independent steps run concurrently; compensations run for all on failure | High-throughput, loosely coupled steps |
| **Nested Saga** | A saga step is itself a sub-saga with its own compensations | Recursive business processes |

## What Works

- **Design compensations upfront.** They are harder to retrofit than the original operations.
- **Make compensations idempotent.** They may be retried if the first attempt fails.
- **Log everything.** Saga state, compensation results, and failures must be observable.
- **Set timeouts.** A step that hangs forever blocks the entire saga.
- **Provide manual intervention hooks.** Some compensations require human approval (e.g., refunds over a threshold).

## Common Mistakes

- **Assuming compensations always succeed.** Payment refunds can be rejected; inventory may already be shipped.
- **Missing compensation for a step.** Every saga step must have a defined counter-operation.
- **Non-idempotent compensations.** Running a compensation twice should not double-refund.
- **Losing saga state.** If the orchestrator crashes, in-flight sagas must be recoverable from a persistent log.
- **Ignoring partial failures.** A step that "half succeeds" (e.g., payment charged but not recorded) is the hardest case to compensate.

## Real-World Examples

### E-Commerce Order Processing

Placing an order involves payment, inventory reservation, and shipping. If shipping fails after payment succeeds, the saga compensates by refunding the payment and releasing inventory.

### Travel Booking

Booking a trip involves flights, hotels, and car rentals. If the hotel booking fails after the flight is booked, the saga cancels the flight reservation (if possible) and refunds the customer.

### Banking Transfers

An inter-bank transfer saga debits the source account, initiates a wire, and credits the destination. If the wire fails, the saga credits the source account back (compensating the debit).

## Frequently Asked Questions

**Q: What is the difference between compensating transaction and database rollback?**
A: Rollback undoes uncommitted changes within a single database transaction. Compensation undoes committed changes across distributed systems by executing counter-business-operations.

**Q: Can all operations be compensated?**
A: No. Some operations are irreversible (e.g., an email sent, a physical item shipped). These require alternative strategies: retries, human intervention, or accepting the inconsistency.

**Q: How does this relate to the Saga Pattern?**
A: Compensating Transaction is the mechanism used by Saga to achieve rollback in distributed systems. Saga is the coordination strategy; Compensation is the undo mechanism.

**Q: What if a compensation itself fails?**
A: Log the failure, alert operations, and potentially retry. Some systems maintain a "compensation queue" that retries failed compensations with exponential backoff until resolved or manually handled.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
