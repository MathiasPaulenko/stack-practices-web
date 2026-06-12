---
contentType: patterns
slug: saga-pattern
title: "Saga Pattern"
description: "Manage distributed transactions across multiple services by chaining local transactions with compensating actions for rollbacks. A microservices pattern."
metaDescription: "Learn the Saga Pattern in Python, Java, and JavaScript. Microservices pattern for distributed transactions with compensating actions."
difficulty: advanced
topics:
  - design
tags:
  - saga
  - pattern
  - design-pattern
  - microservices
  - distributed-transactions
  - compensation
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/cqrs-pattern
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/retry-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Learn the Saga Pattern in Python, Java, and JavaScript. Microservices pattern for distributed transactions with compensating actions."
  keywords:
    - saga pattern
    - design pattern
    - microservices pattern
    - distributed transactions
    - compensation
    - python saga
    - java saga
    - javascript saga
---

# Saga Pattern

## Overview

The Saga Pattern manages distributed transactions across multiple services by breaking a long-running transaction into a sequence of local transactions. Each local transaction updates a single service and publishes an event or message to trigger the next step. If a step fails, the saga executes compensating transactions to undo the changes made by previous steps.

## When to Use

Use the Saga Pattern when:
- A business operation spans multiple microservices or databases
- Two-phase commit (2PC) is too slow or unavailable
- You need eventual consistency across distributed services
- Each service must remain autonomous with its own transaction boundaries
- Examples: e-commerce checkout, travel booking, financial transfers, order fulfillment

## Solution

### Python

```python
from typing import Callable, List, Dict, Any
from dataclasses import dataclass

@dataclass
class SagaResult:
    success: bool
    data: Any = None
    error: str = None
    step_index: int = 0

class SagaStep:
    def __init__(self, name: str, action: Callable, compensation: Callable = None):
        self.name = name
        self.action = action
        self.compensation = compensation

class SagaOrchestrator:
    def __init__(self):
        self.steps: List[SagaStep] = []
        self.completed: List[Dict] = []

    def add_step(self, name: str, action: Callable, compensation: Callable = None):
        self.steps.append(SagaStep(name, action, compensation))

    def execute(self, context: Dict) -> SagaResult:
        self.completed = []
        for i, step in enumerate(self.steps):
            try:
                result = step.action(context)
                self.completed.append({"step": step.name, "context": dict(context)})
                print(f"Step '{step.name}' completed")
            except Exception as e:
                print(f"Step '{step.name}' failed: {e}")
                self.rollback(i)
                return SagaResult(success=False, error=str(e), step_index=i)
        return SagaResult(success=True, data=context)

    def rollback(self, failed_index: int):
        print(f"Rolling back {failed_index} completed steps...")
        for j in range(failed_index - 1, -1, -1):
            step = self.steps[j]
            if step.compensation:
                try:
                    state = self.completed[j]
                    step.compensation(state["context"])
                    print(f"Compensated '{step.name}'")
                except Exception as e:
                    print(f"Compensation failed for '{step.name}': {e}")

# Usage: Travel booking saga
saga = SagaOrchestrator()

saga.add_step(
    "reserve_flight",
    action=lambda ctx: ctx.update({"flight": "FL123"}) or True,
    compensation=lambda ctx: print("Canceling flight reservation")
)

saga.add_step(
    "reserve_hotel",
    action=lambda ctx: ctx.update({"hotel": "HT456"}) or True,
    compensation=lambda ctx: print("Canceling hotel reservation")
)

saga.add_step(
    "charge_payment",
    action=lambda ctx: (_ for _ in ()).throw(Exception("Payment declined")),
    compensation=lambda ctx: print("Refunding payment")
)

result = saga.execute({"user": "alice"})
print(f"Saga success: {result.success}")
```

### JavaScript

```javascript
class SagaStep {
  constructor(name, action, compensation) {
    this.name = name;
    this.action = action;
    this.compensation = compensation;
  }
}

class SagaOrchestrator {
  constructor() {
    this.steps = [];
    this.completed = [];
  }

  addStep(name, action, compensation) {
    this.steps.push(new SagaStep(name, action, compensation));
  }

  async execute(context) {
    this.completed = [];
    for (let i = 0; i < this.steps.length; i++) {
      try {
        await this.steps[i].action(context);
        this.completed.push({ step: this.steps[i].name, context: { ...context } });
        console.log(`Step '${this.steps[i].name}' completed`);
      } catch (e) {
        console.log(`Step '${this.steps[i].name}' failed: ${e.message}`);
        await this.rollback(i);
        return { success: false, error: e.message, stepIndex: i };
      }
    }
    return { success: true, data: context };
  }

  async rollback(failedIndex) {
    console.log(`Rolling back ${failedIndex} completed steps...`);
    for (let j = failedIndex - 1; j >= 0; j--) {
      const step = this.steps[j];
      if (step.compensation) {
        try {
          await step.compensation(this.completed[j].context);
          console.log(`Compensated '${step.name}'`);
        } catch (e) {
          console.log(`Compensation failed for '${step.name}': ${e.message}`);
        }
      }
    }
  }
}

// Usage
const saga = new SagaOrchestrator();
saga.addStep("reserveFlight",
  async (ctx) => { ctx.flight = "FL123"; },
  async () => console.log("Canceling flight")
);
saga.addStep("reserveHotel",
  async (ctx) => { ctx.hotel = "HT456"; },
  async () => console.log("Canceling hotel")
);
saga.addStep("chargePayment",
  async () => { throw new Error("Payment declined"); },
  async () => console.log("Refunding payment")
);

saga.execute({ user: "alice" }).then(r => console.log("Success:", r.success));
```

### Java

```java
import java.util.*;
import java.util.function.Consumer;

class SagaStep {
    String name;
    Consumer<Map<String, Object>> action;
    Consumer<Map<String, Object>> compensation;

    SagaStep(String name, Consumer<Map<String, Object>> action, Consumer<Map<String, Object>> compensation) {
        this.name = name;
        this.action = action;
        this.compensation = compensation;
    }
}

class SagaResult {
    boolean success;
    String error;
    int stepIndex;

    SagaResult(boolean success, String error, int stepIndex) {
        this.success = success;
        this.error = error;
        this.stepIndex = stepIndex;
    }
}

class SagaOrchestrator {
    private final List<SagaStep> steps = new ArrayList<>();
    private final List<Map<String, Object>> completed = new ArrayList<>();

    void addStep(String name, Consumer<Map<String, Object>> action, Consumer<Map<String, Object>> compensation) {
        steps.add(new SagaStep(name, action, compensation));
    }

    SagaResult execute(Map<String, Object> context) {
        completed.clear();
        for (int i = 0; i < steps.size(); i++) {
            try {
                steps.get(i).action.accept(context);
                completed.add(new HashMap<>(context));
                System.out.println("Step '" + steps.get(i).name + "' completed");
            } catch (Exception e) {
                System.out.println("Step '" + steps.get(i).name + "' failed: " + e.getMessage());
                rollback(i);
                return new SagaResult(false, e.getMessage(), i);
            }
        }
        return new SagaResult(true, null, steps.size());
    }

    void rollback(int failedIndex) {
        System.out.println("Rolling back " + failedIndex + " completed steps...");
        for (int j = failedIndex - 1; j >= 0; j--) {
            SagaStep step = steps.get(j);
            if (step.compensation != null) {
                try {
                    step.compensation.accept(completed.get(j));
                    System.out.println("Compensated '" + step.name + "'");
                } catch (Exception e) {
                    System.out.println("Compensation failed: " + e.getMessage());
                }
            }
        }
    }
}

// Usage
SagaOrchestrator saga = new SagaOrchestrator();
saga.addStep("reserveFlight",
    ctx -> ctx.put("flight", "FL123"),
    ctx -> System.out.println("Canceling flight")
);
saga.addStep("reserveHotel",
    ctx -> ctx.put("hotel", "HT456"),
    ctx -> System.out.println("Canceling hotel")
);
saga.addStep("chargePayment",
    ctx -> { throw new RuntimeException("Payment declined"); },
    ctx -> System.out.println("Refunding payment")
);

SagaResult result = saga.execute(new HashMap<>(Map.of("user", "alice")));
System.out.println("Success: " + result.success);
```

## Explanation

The Saga Pattern has two styles:

- **Orchestration**: A central orchestrator manages the sequence and handles failures
- **Choreography**: Services communicate via events; each service listens for events and acts, publishing the next event

Both approaches use **compensating transactions** to undo work when a step fails. Unlike ACID transactions, sagas are **eventually consistent** — intermediate states are visible.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Orchestrated Saga** | Central coordinator manages flow | Complex flows; need visibility |
| **Choreographed Saga** | Event-driven, no central coordinator | Simple flows; loose coupling |
| **Parallel Saga** | Independent steps run concurrently | Non-dependent operations |
| **Nested Saga** | A saga calls another saga | Complex domain decompositions |

## Best Practices

- **Design compensations first** — every step must have a reliable undo operation
- **Idempotency**: Steps and compensations should be safe to run multiple times
- **Timeouts**: Each step must have a timeout; missing responses should trigger compensation
- **Logging**: Log every step, compensation, and failure for observability
- **Retries**: Retry transient failures within a step before declaring failure

## Common Mistakes

- Forgetting compensations for steps that have side effects
- Not handling partial failures in compensations (some succeed, some fail)
- Allowing sagas to run indefinitely without timeouts
- Not making steps idempotent, causing duplicate side effects on retry
- Mixing synchronous and async compensations inconsistently

## Frequently Asked Questions

**Q: What is the difference between Saga and 2PC?**
A: 2PC locks resources across services until commit, ensuring strong consistency but blocking and brittle. Saga releases locks immediately after each local transaction, achieving eventual consistency with better availability and performance.

**Q: How do I handle a compensation that also fails?**
A: Log the failure and alert an operator. Some compensations may require manual intervention (e.g., refunding a payment). Design compensations to be as simple and reliable as possible.

**Q: Orchestration vs. Choreography — which should I use?**
A: Use orchestration for complex flows where visibility and control are critical. Use choreography for simpler flows where loose coupling and autonomy are more important.
