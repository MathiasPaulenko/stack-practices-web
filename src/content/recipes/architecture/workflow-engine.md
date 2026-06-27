---
contentType: recipes
slug: workflow-engine
title: "Workflow Engines"
description: "Orchestrate complex business processes with workflow engines, state machines, and long-running task coordination across distributed services."
metaDescription: "Workflow engines and state machines: Temporal, Camunda, state machine patterns, saga orchestration, and long-running task coordination for business processes."
difficulty: advanced
topics:
  - architecture
tags:
  - workflow-engine
  - architecture
  - distributed-systems
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /docs/adr-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Workflow engines and state machines: Temporal, Camunda, state machine patterns, saga orchestration, and long-running task coordination for business processes."
  keywords:
    - workflow-engine
    - architecture
    - state-machines
    - distributed-systems
---
## Overview

Workflow engines orchestrate complex, multi-step business processes that span services, time, and failure domains. Unlike simple job queues that execute independent tasks, workflows manage state transitions, retries, timeouts, and compensations across [distributed systems](/guides/architecture/microservices-architecture-guide). Whether processing an e-commerce order, underwriting an insurance policy, or approving a loan, workflow engines ensure each step executes in the right order with proper error handling.

## When to Use

Use this resource when:
- Business processes have 5+ sequential steps with failure handling requirements
- Steps need to wait for human approval or external events (hours or days)
- Partial failures require compensating transactions ([saga pattern](/recipes/saga-pattern-recipe))
- You need audit trails and visibility into long-running process state

## Solution

### Temporal Workflow (TypeScript)

```typescript
import { Workflow, Activity } from '@temporalio/workflow';

const { sendEmail, chargePayment, shipOrder } = proxyActivities<{
  sendEmail(email: string): Promise<void>;
  chargePayment(amount: number): Promise<string>;
  shipOrder(orderId: string): Promise<string>;
}>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3 }
});

export async function orderWorkflow(order: Order): Promise<void> {
  await sendEmail(order.customerEmail);

  const paymentId = await chargePayment(order.total);
  if (!paymentId) {
    await sendCompensationEmail(order);
    throw new Error('Payment failed');
  }

  try {
    await shipOrder(order.id);
  } catch (err) {
    await refundPayment(paymentId);
    throw err;
  }

  await sendEmail(order.customerEmail, 'Order shipped!');
}
```

### State Machine (Python + transitions)

```python
from transitions import Machine

class OrderWorkflow:
    states = ['pending', 'paid', 'shipped', 'cancelled']

    def __init__(self):
        self.machine = Machine(
            model=self,
            states=OrderWorkflow.states,
            initial='pending',
            transitions=[
                {'trigger': 'pay', 'source': 'pending', 'dest': 'paid'},
                {'trigger': 'ship', 'source': 'paid', 'dest': 'shipped'},
                {'trigger': 'cancel', 'source': ['pending', 'paid'], 'dest': 'cancelled',
                 'after': 'refund_payment'}
            ]
        )

    def refund_payment(self):
        print("Refunding payment...")

order = OrderWorkflow()
order.pay()      # pending -> paid
order.ship()     # paid -> shipped
```

### Camunda BPMN Process

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions>
  <bpmn:process id="OrderProcess" isExecutable="true">
    <bpmn:startEvent id="StartEvent" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent" targetRef="CheckInventory" />
    
    <bpmn:serviceTask id="CheckInventory" camunda:delegateExpression="${inventoryChecker}" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="CheckInventory" targetRef="Gateway_1" />
    
    <bpmn:exclusiveGateway id="Gateway_1" default="Flow_4">
      <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="ProcessPayment"
                         conditionExpression="${inventoryAvailable}" />
      <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_1" targetRef="NotifyOutOfStock" />
    </bpmn:exclusiveGateway>
  </bpmn:process>
</bpmn:definitions>
```

## Explanation

**Core concepts**:
- **Workflow definition**: The blueprint describing steps, transitions, and conditions
- **Activity**: A single unit of work (API call, database update, human task)
- **State**: The current position in the workflow ( persisted for durability)
- **Compensation**: Reversing already completed steps when a later step fails
- **Timer**: Delaying execution or setting deadlines for activities

**When to use workflow engines vs. code**:

| Complexity | Approach | Example |
|------------|----------|---------|
| 1-2 steps | Direct function calls | Sending a welcome email |
| 3-5 steps | Code with retry logic | Order processing with payment |
| 5+ steps | Workflow engine | Loan approval with 10+ departments |
| Human tasks | BPMN engine | Insurance claim review |

## Variants

| Engine | Model | Best For |
|--------|-------|----------|
| Temporal | Code-as-workflow | Developer-centric; durable execution |
| Camunda | BPMN | Business analyst visibility; human tasks |
| Apache Airflow | DAGs | Data pipelines; scheduled workflows |
| Netflix Conductor | JSON DSL | Microservices orchestration |
| AWS Step Functions | State machines | Serverless; AWS integration |

## Best Practices

- **Idempotent activities**: Running the same activity twice should produce the same result. See [message idempotency](/recipes/messaging/rabbitmq-task-queue).
- **Idempotency keys**: Pass unique keys to external APIs to prevent double charges
- **Set timeouts on everything**: Default 10-minute timeout prevents stuck workflows
- **Version workflow definitions**: New deployments shouldn't break in-flight workflows
- **Query workflow state**: Expose APIs to check progress without inspecting internal state

## Common Mistakes

1. **Tight coupling to orchestrator**: Business logic bleeding into workflow definitions makes testing hard
2. **No compensation paths**: Failed workflows that already charged the customer need explicit refunds. Learn more in [saga pattern](/recipes/saga-pattern-recipe).
3. **Polling instead of events**: Waiting 30 seconds to check status wastes resources; use callbacks
4. **Ignoring workflow history**: Old completed workflows fill storage; implement retention policies
5. **No replay testing**: Temporal and similar engines replay history; non-deterministic code breaks

## Frequently Asked Questions

**Q: When should I use a workflow engine instead of a message queue?**
A: Use [message queues](/guides/architecture/event-driven-architecture-guide) for independent, parallel tasks. Use workflow engines for coordinated, sequential processes with state.

**Q: How do workflow engines handle crashes?**
A: They persist state after each activity. On restart, they resume from the last completed step.

**Q: Can business analysts modify workflows without developers?**
A: BPMN-based engines (Camunda) allow this. Code-based engines (Temporal) require developers but offer more flexibility.
