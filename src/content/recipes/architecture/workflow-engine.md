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
  - architecture
  - distributed-systems
  - design
  - pattern
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /docs/adr-template
  - /recipes/retry-backoff
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
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

## What Works

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

## FAQ

**Q: When should I use a workflow engine instead of a message queue?**
A: Use [message queues](/guides/architecture/event-driven-architecture-guide) for independent, parallel tasks. Use workflow engines for coordinated, sequential processes with state.

**Q: How do workflow engines handle crashes?**
A: They persist state after each activity. On restart, they resume from the last completed step.

**Q: Can business analysts modify workflows without developers?**
A: BPMN-based engines (Camunda) allow this. Code-based engines (Temporal) require developers but offer more flexibility.

### AWS Step Functions State Machine (TypeScript)

```typescript
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: 'us-east-1' });

const orderWorkflowDefinition = {
  StartAt: 'ValidateOrder',
  States: {
    ValidateOrder: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:validate-order',
      Next: 'CheckInventory',
      Retry: [
        {
          ErrorEquals: ['States.TaskFailed'],
          IntervalSeconds: 2,
          MaxAttempts: 3,
          BackoffRate: 2.0,
        },
      ],
    },
    CheckInventory: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:check-inventory',
      Next: 'InventoryChoice',
    },
    InventoryChoice: {
      Type: 'Choice',
      Choices: [
        {
          Variable: '$.inventoryAvailable',
          BooleanEquals: true,
          Next: 'ProcessPayment',
        },
      ],
      Default: 'NotifyOutOfStock',
    },
    ProcessPayment: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:process-payment',
      Next: 'ShipOrder',
      Catch: [
        {
          ErrorEquals: ['States.ALL'],
          Next: 'RefundAndNotify',
        },
      ],
    },
    ShipOrder: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:ship-order',
      End: true,
    },
    NotifyOutOfStock: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:notify-oos',
      End: true,
    },
    RefundAndNotify: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:refund-notify',
      End: true,
    },
  },
};

async function startOrderWorkflow(order: Order): Promise<string> {
  const command = new StartExecutionCommand({
    stateMachineArn: 'arn:aws:states:us-east-1:123:stateMachine:OrderWorkflow',
    input: JSON.stringify(order),
    name: `order-${order.id}-${Date.now()}`,
  });
  const response = await sfnClient.send(command);
  return response.executionArn!;
}
```

### Human Task with Approval Timeout (Python + Camunda)

```python
from datetime import datetime, timedelta
from typing import Optional

class HumanTaskManager:
    def __init__(self, camunda_client):
        self.client = camunda_client

    def create_approval_task(
        self,
        process_id: str,
        assignee: str,
        approval_type: str,
        timeout_hours: int = 48
    ) -> str:
        task = self.client.task.create(
            process_instance_id=process_id,
            name=f'Approval: {approval_type}',
            assignee=assignee,
            due_date=(datetime.now() + timedelta(hours=timeout_hours)).isoformat(),
            follow_up_date=(datetime.now() + timedelta(hours=24)).isoformat(),
        )
        return task.id

    def complete_task(self, task_id: str, approved: bool, comment: str = '') -> None:
        variables = {'approved': approved, 'comment': comment}
        self.client.task.complete(task_id, variables=variables)

    def check_overdue_tasks(self) -> list:
        tasks = self.client.task.list(due_before=datetime.now().isoformat())
        return [t for t in tasks if t.due_date and t.due_date < datetime.now()]

    def auto_escalate_overdue(self) -> int:
        overdue = self.check_overdue_tasks()
        for task in overdue:
            manager = self._get_manager(task.assignee)
            self.client.task.update(
                task.id,
                assignee=manager,
                due_date=(datetime.now() + timedelta(hours=24)).isoformat(),
            )
        return len(overdue)
```

### Workflow Versioning and Migration (TypeScript)

```typescript
interface WorkflowVersion {
  version: string;
  definition: any;
  migrationFn?: (oldState: any) => any;
}

class WorkflowRegistry {
  private versions: Map<string, WorkflowVersion> = new Map();

  register(version: WorkflowVersion): void {
    this.versions.set(version.version, version);
  }

  getLatest(): WorkflowVersion {
    const sorted = Array.from(this.versions.values())
      .sort((a, b) => b.version.localeCompare(a.version));
    return sorted[0];
  }

  getVersion(version: string): WorkflowVersion | undefined {
    return this.versions.get(version);
  }

  migrate(state: any, fromVersion: string, toVersion: string): any {
    let currentState = state;
    const versions = Array.from(this.versions.keys()).sort();
    const fromIdx = versions.indexOf(fromVersion);
    const toIdx = versions.indexOf(toVersion);

    for (let i = fromIdx; i < toIdx; i++) {
      const v = this.versions.get(versions[i + 1]);
      if (v?.migrationFn) {
        currentState = v.migrationFn(currentState);
      }
    }
    return currentState;
  }
}

// Register versions
const registry = new WorkflowRegistry();
registry.register({
  version: '1.0.0',
  definition: orderWorkflowV1,
});
registry.register({
  version: '1.1.0',
  definition: orderWorkflowV1_1,
  migrationFn: (oldState) => ({
    ...oldState,
    shippingAddress: oldState.address || null,
  }),
});
```



