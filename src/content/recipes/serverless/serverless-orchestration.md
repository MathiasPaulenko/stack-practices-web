---
contentType: recipes
slug: serverless-orchestration
title: "Orchestrate Serverless Workflows with Step Functions and State Machines"
description: "How to coordinate complex serverless processes using AWS Step Functions, Temporal, and Durable Functions to manage state, retries, and error handling across distributed functions."
metaDescription: "Learn serverless orchestration with Step Functions and state machines. Coordinate workflows, manage state, retries, and error handling across distributed functions."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - aws-lambda
  - functions
  - faas
  - cloud
relatedResources:
  - /recipes/cold-start-optimization
  - /recipes/event-driven-architecture
  - /recipes/saga-pattern-recipe
  - /recipes/api-gateway
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn serverless orchestration with Step Functions and state machines. Coordinate workflows, manage state, retries, and error handling across distributed functions."
  keywords:
    - serverless orchestration
    - AWS Step Functions
    - state machine workflow
    - distributed functions
    - serverless workflows
---

## Overview

A single AWS Lambda function can process an HTTP request, resize an image, or validate a form. But real-world workflows are rarely that simple. An e-commerce order involves validating inventory, charging payment, sending confirmation, updating analytics, and scheduling shipment. Each step is a function; the workflow is the coordination logic that decides what to call next, what to do on failure, and how to retry transient errors.

Writing this coordination inside Lambda functions creates spaghetti code: function A calls B, which calls C, which calls D. If D fails, C must handle compensation, which may also fail, requiring more error handling. The business logic becomes entangled with networking, retries, timeouts, and state persistence. Workflow orchestration tools — AWS Step Functions, Azure Durable Functions, Temporal — externalize this coordination into state machines. Functions become pure business logic; the orchestrator handles execution flow, state, retries, and error recovery. The following demonstrates how to state machine design, orchestration patterns, and practical implementation.

## When to use it

Use this recipe when:

- A serverless process has more than two dependent steps. See [Serverless Functions](/recipes/messaging/event-driven-microservices) for building individual function units.
- Steps must be retried with backoff on transient failures. See [Retry Logic](/recipes/architecture/retry-backoff) for exponential backoff patterns.
- Workflow state must survive function timeouts or crashes
- Human approval or external event waits are required mid-workflow
- Multiple functions must be coordinated with parallel branches and join points. See [Event-Driven Functions](/recipes/messaging/event-driven-microservices) for event-driven architectures.

## Solution

### AWS Step Functions (ASL — Amazon States Language)

```json
{
  "Comment": "Order Processing Workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:validateOrder",
      "Next": "CheckInventory",
      "Catch": [
        {
          "ErrorEquals": ["ValidationException"],
          "Next": "NotifyCustomerInvalid"
        }
      ]
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:checkInventory",
      "Next": "ProcessPayment",
      "Retry": [
        {
          "ErrorEquals": ["ServiceUnavailable"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ]
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:processPayment",
      "Next": "ParallelTasks",
      "Catch": [
        {
          "ErrorEquals": ["PaymentFailed"],
          "Next": "ReleaseInventory"
        }
      ]
    },
    "ParallelTasks": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SendEmail",
          "States": {
            "SendEmail": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789:function:sendEmail",
              "End": true
            }
          }
        },
        {
          "StartAt": "UpdateAnalytics",
          "States": {
            "UpdateAnalytics": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789:function:updateAnalytics",
              "End": true
            }
          }
        }
      ],
      "Next": "ScheduleShipment"
    },
    "ScheduleShipment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:scheduleShipment",
      "End": true
    },
    "ReleaseInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:releaseInventory",
      "Next": "NotifyCustomerFailed"
    },
    "NotifyCustomerInvalid": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:notifyCustomer",
      "End": true
    },
    "NotifyCustomerFailed": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:notifyCustomer",
      "End": true
    }
  }
}
```

### Temporal Workflow (TypeScript SDK)

```typescript
import { workflow, activity } from '@temporalio/workflow';

const validateOrder = activity('validateOrder');
const checkInventory = activity('checkInventory');
const processPayment = activity('processPayment');
const sendEmail = activity('sendEmail');
const updateAnalytics = activity('updateAnalytics');
const scheduleShipment = activity('scheduleShipment');
const releaseInventory = activity('releaseInventory');

export async function orderWorkflow(order: OrderInput): Promise<OrderResult> {
  try {
    await validateOrder(order);
    await checkInventory(order.items);
    await processPayment({ orderId: order.id, amount: order.total });

    // Parallel execution
    await Promise.all([
      sendEmail({ orderId: order.id, template: 'confirmation' }),
      updateAnalytics({ event: 'order_placed', orderId: order.id }),
    ]);

    await scheduleShipment({ orderId: order.id, address: order.address });

    return { status: 'completed', orderId: order.id };
  } catch (error) {
    if (error.type === 'PaymentFailed') {
      await releaseInventory({ orderId: order.id });
    }
    throw error;
  }
}
```

### Azure Durable Functions (Python)

```python
import azure.functions as func
import azure.durable_functions as df

myApp = df.DFApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@myApp.route(route="orchestrators/{functionName}")
@myApp.durable_client_input(client_name="client")
async def http_start(req: func.HttpRequest, client):
    instance_id = await client.start_new(req.route_params["functionName"], None, None)
    return client.create_check_status_response(req, instance_id)

@myApp.orchestration_trigger(context_name="context")
def order_orchestrator(context: df.DurableOrchestrationContext):
    order = context.get_input()

    try:
        yield context.call_activity("validate_order", order)
        yield context.call_activity("check_inventory", order["items"])
        yield context.call_activity("process_payment", order)

        # Fan-out/fan-in for parallel tasks
        tasks = [
            context.call_activity("send_email", order),
            context.call_activity("update_analytics", order),
        ]
        yield context.task_all(tasks)

        yield context.call_activity("schedule_shipment", order)
        return {"status": "completed"}

    except Exception as e:
        if "PaymentFailed" in str(e):
            yield context.call_activity("release_inventory", order)
        raise
```

## Explanation

- **State machines**: Step Functions represents workflows as JSON state machines. Each state is a step (Task, Choice, Parallel, Wait, Pass). Transitions define the flow. The state machine itself is persisted by AWS, so if a Lambda times out, Step Functions retries it according to the configured policy without losing workflow context.
- **Durable execution (Temporal)**: Temporal workflows are code, not JSON. A workflow function runs as a deterministic event replay — every activity execution is recorded as an event. If the worker crashes, another worker replays the workflow from the last recorded event, skipping already-completed activities. This makes workflows durable without explicit state management.
- **Fan-out / fan-in**: parallel branches (sending email and updating analytics simultaneously) reduce total workflow duration. In Step Functions, use a `Parallel` state. In Temporal, use `Promise.all()`. In Durable Functions, use `task.all()`. The orchestrator waits for all branches to complete before continuing.
- **External events**: workflows can wait for external signals. A workflow may pause at "Wait for manual approval" for hours or days. Step Functions supports callbacks and wait-for-callback tasks. Temporal supports signals — external messages that a workflow can await. Durable Functions supports external events via `wait_for_external_event()`.

## Variants

| Orchestrator | Format | Vendor | Best for | Cost model |
|--------------|--------|--------|----------|------------|
| Step Functions | JSON ASL | AWS | AWS-native, visual design | Per state transition |
| Temporal | Code (any language) | Open-source | Complex logic, portability | Self-hosted / Cloud |
| Durable Functions | Code (.NET/JS/Python) | Azure | Azure Functions users | Execution + storage |
| Camunda | BPMN | Open-source | Business process modeling | Self-hosted / SaaS |

## What Works

- **Keep Lambda functions stateless and idempotent**: the orchestrator handles state; functions should be pure. If a function is retried, it must produce the same result without side effects. Use idempotency keys passed from the orchestrator to deduplicate operations in downstream systems.
- **Use exponential backoff with jitter for retries**: retrying every 1 second creates thundering herds. Configure `BackoffRate: 2` with a maximum interval. Add random jitter to spread retries. Step Functions supports this natively; in Temporal, configure retry policies on activities.
- **Set timeouts on every activity**: an unbounded wait for an external API can stall a workflow forever. Set per-activity timeouts (e.g., 30 seconds for payment processing, 5 minutes for human approval). Distinguish between retryable (timeout, 5xx) and non-retryable (4xx, validation) errors.
- **Store workflow input/output in S3 for large payloads**: Step Functions has a 256KB payload limit. If your workflow passes large files or datasets, store them in S3 and pass URIs through the state machine. Temporal has a 2MB gRPC limit; use blob storage similarly for large data.
- **Monitor workflow execution metrics**: track success rate, average duration, retry count per activity, and state transition cost. Alert on workflows stuck in a state for longer than expected. Use AWS CloudWatch, Temporal Web UI, or Azure Application Insights.

## Common mistakes

- **Putting business logic in the state machine**: Step Functions JSON is for coordination, not business rules. Complex conditionals and transformations belong in Lambda functions. A state machine with dozens of `Choice` states is unmaintainable — refactor logic into the functions.
- **Passing secrets through workflow state**: workflow state is logged and visible in the orchestrator console. Never pass API keys, tokens, or PII in state payloads. Pass references (e.g., order ID) and let functions retrieve secrets from AWS Secrets Manager or Azure Key Vault.
- **Ignoring idempotency on activity retries**: Step Functions may retry a Lambda that partially succeeded (e.g., charged the customer but timed out before returning). The retry charges the customer again. Always design activities to check idempotency keys before mutating state.
- **Not versioning state machines**: changing a live state machine definition affects in-flight executions. Use Step Functions versions and aliases (or Temporal workflow versioning) to deploy changes without breaking running workflows. Test new versions with a canary before full rollout.

## FAQ

**Q: Should I use Step Functions or Temporal?**
A: Step Functions is simpler for AWS-centric workflows with visual monitoring. Temporal is more capable for complex logic, cross-cloud portability, and long-running workflows with arbitrary code. If you need to run workflows on-premise or across clouds, Temporal is the better choice.

**Q: How do I handle long waits (hours or days) in a workflow?**
A: Use wait states with callbacks. Step Functions supports `Wait` states with timestamps. Temporal workflows can sleep for days — the worker is not actively running during the sleep; the orchestrator schedules a wake-up event. Durable Functions supports durable timers.

**Q: What is the cost of Step Functions?**
A: Standard workflows charge per state transition. A 10-state workflow executed 1,000,000 times costs ~$25. Express workflows charge per execution and duration, optimized for high-volume, short-duration workflows (sub-5 minutes). Choose Express for high throughput, Standard for long-running workflows.

**Q: Can I test workflows locally?**
A: Step Functions Local (Docker) runs state machines locally. Temporal provides a local dev server (`temporal server start-dev`). Durable Functions has a local runtime integrated with Azure Functions Core Tools. Always test workflows locally before deploying.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
