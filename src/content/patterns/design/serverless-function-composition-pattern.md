---





contentType: patterns
slug: serverless-function-composition-pattern
title: "Serverless Function Composition Pattern"
description: "Chain serverless functions via Step Functions or orchestration layers to build multi-step workflows with retries, branching, and state management."
metaDescription: "Serverless function composition: chain Lambda via Step Functions for multi-step workflows. Implement with AWS CDK, Python, and TypeScript examples."
difficulty: advanced
topics:
  - serverless
  - design
tags:
  - serverless
  - function-composition
  - pattern
  - aws-step-functions
  - lambda
  - orchestration
  - python
  - typescript
relatedResources:
  - /patterns/serverless-event-sourcing-pattern
  - /patterns/serverless-fanout-pattern
  - /recipes/aws-lambda-cold-start-optimization
  - /patterns/serverless-db-connection-pooling-pattern
  - /patterns/serverless-throttling-pattern
  - /patterns/serverless-warm-pool-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless function composition: chain Lambda via Step Functions for multi-step workflows. Implement with AWS CDK, Python, and TypeScript examples."
  keywords:
    - serverless function composition
    - aws step functions
    - lambda orchestration
    - serverless workflow
    - function chaining
    - aws cdk step functions





---

# Serverless Function Composition Pattern

## Overview

Function composition chains multiple serverless functions into a coordinated workflow. Instead of one large function handling everything, each function handles a single step. An orchestrator (AWS Step Functions, Azure Durable Functions, or a custom orchestrator) manages the sequence, handles retries, branches on conditions, and maintains state between steps.

This pattern addresses the limitation of single-function serverless: execution time limits, lack of state management, and no built-in retry logic across function boundaries. By decomposing work into steps and using an orchestrator, you get visibility, error handling, and the ability to replay failed steps.

## When to Use

- Multi-step business processes that require state between steps (order processing, ETL pipelines)
- Workflows with conditional branching (approve/reject, retry on failure)
- You need retries and timeouts per step, not just at the function level
- Long-running processes that exceed single-function execution limits
- Multiple teams own different steps of the same workflow

## Solution

### AWS Step Functions with Python (CDK)

```python
from aws_cdk import (
    Stack,
    Duration,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as tasks,
    aws_lambda as lambda_,
)
from constructs import Construct

class OrderProcessingStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Define Lambda functions for each step
        validate_order = lambda_.Function(
            self, "ValidateOrder",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="validate.handler",
            code=lambda_.Code.from_asset("lambda/order"),
            timeout=Duration.seconds(30),
        )

        process_payment = lambda_.Function(
            self, "ProcessPayment",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="payment.handler",
            code=lambda_.Code.from_asset("lambda/payment"),
            timeout=Duration.seconds(60),
        )

        reserve_inventory = lambda_.Function(
            self, "ReserveInventory",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="inventory.handler",
            code=lambda_.Code.from_asset("lambda/inventory"),
            timeout=Duration.seconds(30),
        )

        send_notification = lambda_.Function(
            self, "SendNotification",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="notify.handler",
            code=lambda_.Code.from_asset("lambda/notification"),
            timeout=Duration.seconds(15),
        )

        refund_payment = lambda_.Function(
            self, "RefundPayment",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="refund.handler",
            code=lambda_.Code.from_asset("lambda/payment"),
            timeout=Duration.seconds(60),
        )

        # Build the state machine
        validate_task = tasks.LambdaInvoke(
            self, "ValidateOrderTask",
            lambda_function=validate_order,
            output_path="$.Payload",
        )

        payment_task = tasks.LambdaInvoke(
            self, "ProcessPaymentTask",
            lambda_function=process_payment,
            output_path="$.Payload",
            retry_on_service_exceptions=True,
        )

        inventory_task = tasks.LambdaInvoke(
            self, "ReserveInventoryTask",
            lambda_function=reserve_inventory,
            output_path="$.Payload",
        )

        notify_task = tasks.LambdaInvoke(
            self, "SendNotificationTask",
            lambda_function=send_notification,
            output_path="$.Payload",
        )

        refund_task = tasks.LambdaInvoke(
            self, "RefundPaymentTask",
            lambda_function=refund_payment,
            output_path="$.Payload",
        )

        # Define workflow with branching and error handling
        definition = (
            validate_task
            .next(payment_task)
            .next(sfn.Choice(self, "PaymentResult")
                .when(
                    sfn.Condition.string_equals("$.paymentStatus", "SUCCESS"),
                    inventory_task.next(notify_task)
                )
                .when(
                    sfn.Condition.string_equals("$.paymentStatus", "FAILED"),
                    refund_task.next(sfn.Fail(self, "OrderFailed",
                        error="PaymentFailed",
                        cause="Payment processing failed"
                    ))
                )
                .otherwise(sfn.Fail(self, "UnknownPaymentStatus"))
            )
        )

        sfn.StateMachine(
            self, "OrderProcessingStateMachine",
            definition=definition,
            timeout=Duration.minutes(5),
            retry_on_failure=True,
        )
```

### Lambda Handler (Python)

```python
import json
import boto3

def handler(event, context):
    order_id = event.get("orderId")
    customer_id = event.get("customerId")
    items = event.get("items", [])
    total = event.get("total", 0)

    if not order_id or not customer_id or not items:
        return {
            "statusCode": 400,
            "error": "INVALID_ORDER",
            "message": "Missing required fields"
        }

    if total <= 0:
        return {
            "statusCode": 400,
            "error": "INVALID_TOTAL",
            "message": "Total must be positive"
        }

    return {
        "statusCode": 200,
        "orderId": order_id,
        "customerId": customer_id,
        "items": items,
        "total": total,
        "validated": True
    }
```

### TypeScript with AWS SDK

```typescript
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: 'us-east-1' });

interface OrderRequest {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}

async function startOrderWorkflow(order: OrderRequest): Promise<string> {
  const command = new StartExecutionCommand({
    stateMachineArn: process.env.ORDER_STATE_MACHINE_ARN!,
    input: JSON.stringify(order),
    name: `order-${order.orderId}-${Date.now()}`,
  });

  const response = await sfnClient.send(command);
  return response.executionArn!;
}

// Check execution status
import { DescribeExecutionCommand } from '@aws-sdk/client-sfn';

async function getWorkflowStatus(executionArn: string): Promise<{
  status: string;
  output?: any;
  error?: string;
}> {
  const command = new DescribeExecutionCommand({ executionArn });
  const response = await sfnClient.send(command);

  return {
    status: response.status!,
    output: response.output ? JSON.parse(response.output) : undefined,
    error: response.error,
  };
}
```

### Azure Durable Functions (TypeScript)

```typescript
import * as df from 'durable-functions';
import { AzureFunction, Context } from '@azure/functions';

const orchestrator: df.Orchestrator = df.orchestrator(function* (context):
  Generator<any, any, any> {

  const order = context.df.getInput();

  // Step 1: Validate
  const validationResult = yield context.df.callActivity('ValidateOrder', order);
  if (!validationResult.valid) {
    return { status: 'FAILED', error: validationResult.error };
  }

  // Step 2: Process payment (with retry)
  const paymentResult = yield context.df.callActivityWithRetry(
    'ProcessPayment',
    {
      retryOptions: {
        firstRetryIntervalInMilliseconds: 5000,
        maxNumberOfAttempts: 3,
      },
    },
    { orderId: order.orderId, total: order.total }
  );

  if (paymentResult.status !== 'SUCCESS') {
    // Compensating action: refund
    yield context.df.callActivity('RefundPayment', { orderId: order.orderId });
    return { status: 'FAILED', error: 'PaymentFailed' };
  }

  // Step 3: Reserve inventory (parallel for multiple items)
  const inventoryResults = yield context.df.Task.all(
    order.items.map((item: any) =>
      context.df.callActivity('ReserveItem', { productId: item.productId, quantity: item.quantity })
    )
  );

  const allReserved = inventoryResults.every((r: any) => r.reserved);
  if (!allReserved) {
    yield context.df.callActivity('RefundPayment', { orderId: order.orderId });
    return { status: 'FAILED', error: 'InventoryUnavailable' };
  }

  // Step 4: Send notification
  yield context.df.callActivity('SendNotification', {
    customerId: order.customerId,
    message: `Order ${order.orderId} confirmed`,
  });

  return { status: 'SUCCESS', orderId: order.orderId };
});

df.app.orchestrate('OrderOrchestrator', orchestrator);
```

## Explanation

The composition pattern separates orchestration from execution:

1. **Orchestrator** — defines the workflow as a state machine. It knows the order of steps, branching conditions, retry policies, and timeouts. The orchestrator itself is stateless: it reads state from a managed store (Step Functions, Durable Functions).

2. **Step functions** — each Lambda or Activity handles one unit of work. It receives input from the orchestrator, performs its task, and returns output. Steps do not know about other steps.

3. **State management** — the orchestrator passes data between steps. Each step's output becomes the next step's input. The orchestrator persists state, so if a step fails, the workflow can resume from the last successful step.

4. **Error handling** — the orchestrator defines retries per step (e.g. 3 attempts with exponential backoff). If a step exhausts retries, the workflow can branch to a compensation step (e.g. refund) or fail gracefully.

## Variants

| Approach | Orchestrator | Best For |
|----------|-------------|----------|
| AWS Step Functions | Managed state machine | AWS-native workflows |
| Azure Durable Functions | Code-based orchestrator | Azure-native workflows |
| EventBridge + Lambda | Event-driven chaining | Simple sequences, no state |
| Custom orchestrator (Lambda) | Self-built | Complex custom logic |
| Chained Lambda (direct invoke) | Function-to-function | Simple 2-3 step flows |

## Best Practices


- For a deeper guide, see [Serverless Warm Pool Pattern](/patterns/serverless-warm-pool-pattern/).

- **Keep steps idempotent** — the orchestrator may retry a step. Each step must produce the same result whether called once or multiple times. Use idempotency keys for payment and inventory operations.
- **Use compensation steps** — if a step fails after side effects (e.g. payment succeeded but inventory failed), add a compensation step (e.g. refund) to roll back.
- **Set per-step timeouts** — each step should have its own timeout. A stuck step should not hold the entire workflow indefinitely.
- **Monitor execution history** — track workflow duration, step failure rates, and retry counts. Use CloudWatch or Application Insights.
- **Keep orchestrator logic declarative** — define the workflow as a state machine, not imperative code. This makes it easier to visualize, debug, and modify.

## Common Mistakes

- **Chaining functions directly** — Lambda-to-Lambda invocation without an orchestrator loses state, retry logic, and visibility. Use Step Functions or Durable Functions.
- **Non-idempotent steps** — if a step charges a credit card and is retried, the customer is charged twice. Use idempotency keys.
- **No compensation logic** — when a step fails after side effects, the system is left in an inconsistent state. Always define compensation steps for workflows with side effects.
- **Over-orchestration** — do not use Step Functions for a simple 2-step process. Direct invocation or EventBridge is simpler and cheaper.
- **Passing large payloads between steps** — Step Functions has a 256KB payload limit. Pass references (S3 keys, database IDs) instead of full data.

## Frequently Asked Questions

### What is the difference between orchestration and choreography?

In orchestration, a central orchestrator (Step Functions) controls the workflow and invokes steps. In choreography, each function emits events that trigger other functions, with no central controller. Orchestration is easier to debug and monitor; choreography is more decoupled and scalable.

### When should I use Step Functions vs direct Lambda invocation?

Use Step Functions when you have multi-step workflows with branching, retries, or state. Use direct invocation for simple 1-2 step processes where the caller can handle errors. Step Functions cost more but provide visibility and reliability.

### How do I handle long-running workflows?

Step Functions Express Workflows support up to 5 minutes. Standard Workflows support up to 1 year. For long-running workflows, use Standard and break them into stages with human approval steps or wait states.

### Can I version workflows without breaking in-flight executions?

Yes. Step Functions supports versioning. When you update a state machine, in-flight executions continue on the old version. New executions use the updated version. This allows zero-downtime deployments.
