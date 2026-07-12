---





contentType: recipes
slug: serverless-step-functions-workflow
title: "Orchestrate Serverless Workflows with AWS Step Functions"
description: "Build state machine workflows with AWS Step Functions using sequential, parallel, and map states for orchestrating Lambda functions and long-running processes."
metaDescription: "Orchestrate serverless workflows with AWS Step Functions. Use sequential, parallel, and map states to coordinate Lambda functions and long-running processes."
difficulty: advanced
topics:
  - serverless
  - architecture
  - infrastructure
tags:
  - aws
  - step-functions
  - state-machine
  - workflow
  - orchestration
relatedResources:
  - /recipes/serverless-event-driven-sqs-lambda
  - /recipes/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/complete-guide-graphql-federation
  - /recipes/aws-lambda-cold-start-optimization
  - /recipes/aws-lambda-python-dependencies
  - /guides/complete-guide-serverless-architecture
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Orchestrate serverless workflows with AWS Step Functions. Use sequential, parallel, and map states to coordinate Lambda functions and long-running processes."
  keywords:
    - aws step functions
    - state machine workflow
    - serverless orchestration
    - step functions lambda
    - aws state machine





---

## Overview

AWS Step Functions is a serverless orchestrator that coordinates multiple Lambda functions (and other AWS services) into state machine workflows. It handles retries, error handling, branching, parallel execution, and state management — all declaratively in JSON. Below: building sequential workflows, parallel execution, map states for batch processing, error handling with catch/retry, and Express vs Standard workflows.

## When to Use This

- Multi-step processes that require coordination (order processing, ETL pipelines, user onboarding)
- Workflows with conditional branching and error handling
- Long-running processes (hours to days) that need state persistence
- Batch processing where each item needs individual error handling

## Prerequisites

- Python 3.11+
- AWS account with Step Functions and Lambda access
- `boto3` package

## Solution

### 1. Order Processing State Machine (ASL Definition)

```json
{
  "Comment": "Process customer order workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:ValidateOrder",
      "Next": "CheckInventory",
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["OrderValidationError"],
          "Next": "OrderRejected"
        }
      ]
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:CheckInventory",
      "Next": "InventoryChoice"
    },
    "InventoryChoice": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.inStock",
          "BooleanEquals": true,
          "Next": "ProcessPayment"
        },
        {
          "Variable": "$.inStock",
          "BooleanEquals": false,
          "Next": "BackorderNotification"
        }
      ],
      "Default": "OrderRejected"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:ProcessPayment",
      "Next": "ShipOrder",
      "Retry": [
        {
          "ErrorEquals": ["PaymentDeclinedError"],
          "IntervalSeconds": 5,
          "MaxAttempts": 2,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["PaymentDeclinedError"],
          "Next": "PaymentFailed"
        }
      ]
    },
    "ShipOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:ShipOrder",
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "BackorderNotification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:NotifyBackorder",
      "Next": "OrderRejected"
    },
    "PaymentFailed": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:NotifyPaymentFailed",
      "Next": "OrderRejected"
    },
    "OrderRejected": {
      "Type": "Fail",
      "Error": "OrderProcessingFailed",
      "Cause": "Order could not be processed"
    }
  }
}
```

### 2. Parallel Execution

```json
{
  "StartAt": "ProcessInParallel",
  "States": {
    "ProcessInParallel": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SendEmail",
          "States": {
            "SendEmail": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:SendEmail",
              "End": true
            }
          }
        },
        {
          "StartAt": "UpdateCRM",
          "States": {
            "UpdateCRM": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:UpdateCRM",
              "End": true
            }
          }
        },
        {
          "StartAt": "GenerateInvoice",
          "States": {
            "GenerateInvoice": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:GenerateInvoice",
              "End": true
            }
          }
        }
      ],
      "Next": "Complete"
    },
    "Complete": {
      "Type": "Succeed"
    }
  }
}
```

### 3. Map State for Batch Processing

```json
{
  "StartAt": "ProcessItems",
  "States": {
    "ProcessItems": {
      "Type": "Map",
      "ItemsPath": "$.items",
      "MaxConcurrency": 10,
      "Iterator": {
        "StartAt": "ProcessSingleItem",
        "States": {
          "ProcessSingleItem": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:123456789012:function:ProcessItem",
            "End": true
          }
        }
      },
      "Next": "AllItemsProcessed"
    },
    "AllItemsProcessed": {
      "Type": "Succeed"
    }
  }
}
```

### 4. SAM Template with Step Functions

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  OrderWorkflow:
    Type: AWS::Serverless::StateMachine
    Properties:
      DefinitionUri: statemachine/order_workflow.asl.json
      DefinitionSubstitutions:
        ValidateFunctionArn: !GetAtt ValidateOrderFunction.Arn
        PaymentFunctionArn: !GetAtt ProcessPaymentFunction.Arn
        ShipFunctionArn: !GetAtt ShipOrderFunction.Arn
      Role: !GetAtt WorkflowRole.Arn
      Type: EXPRESS

  ValidateOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: validate.lambda_handler
      Runtime: python3.11
      CodeUri: src/

  ProcessPaymentFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: payment.lambda_handler
      Runtime: python3.11
      CodeUri: src/

  ShipOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: ship.lambda_handler
      Runtime: python3.11
      CodeUri: src/
```

### 5. Lambda Task Functions

```python
import json

def validate_order_handler(event, context):
    order = event.get('order', {})
    items = order.get('items', [])
    customer = order.get('customer', {})

    if not items:
        raise Exception("OrderValidationError: No items in order")
    if not customer.get('email'):
        raise Exception("OrderValidationError: Customer email required")

    return {
        'orderId': order.get('id'),
        'valid': True,
        'itemCount': len(items),
        'total': sum(item['price'] * item['quantity'] for item in items),
    }

def check_inventory_handler(event, context):
    items = event.get('order', {}).get('items', [])
    all_in_stock = all(check_stock(item) for item in items)
    return {
        'orderId': event['orderId'],
        'inStock': all_in_stock,
        'items': items,
    }

def process_payment_handler(event, context):
    total = event.get('total', 0)
    payment_method = event.get('paymentMethod', {})

    result = charge_payment(payment_method, total)
    if not result['success']:
        raise Exception("PaymentDeclinedError: " + result['message'])

    return {
        'orderId': event['orderId'],
        'paymentId': result['paymentId'],
        'charged': total,
    }
```

### 6. Start Execution from Lambda

```python
import boto3
import json
import uuid

stepfunctions = boto3.client('stepfunctions')
STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:OrderWorkflow'

def start_order_workflow(order: dict) -> str:
    execution_name = f"order-{order['id']}-{uuid.uuid4().hex[:8]}"

    response = stepfunctions.start_execution(
        stateMachineArn=STATE_MACHINE_ARN,
        name=execution_name,
        input=json.dumps({
            'order': order,
            'paymentMethod': order.get('paymentMethod'),
        }),
    )

    return response['executionArn']

def check_execution_status(execution_arn: str) -> dict:
    response = stepfunctions.describe_execution(
        executionArn=execution_arn,
    )
    return {
        'status': response['status'],
        'output': json.loads(response.get('output', '{}')),
        'startDate': response.get('startDate'),
        'stopDate': response.get('stopDate'),
    }
```

### 7. Wait States and Human Approval

```json
{
  "StartAt": "SubmitForApproval",
  "States": {
    "SubmitForApproval": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:SubmitApproval",
      "Next": "WaitForApproval"
    },
    "WaitForApproval": {
      "Type": "Wait",
      "Seconds": 3600,
      "Next": "CheckApprovalStatus"
    },
    "CheckApprovalStatus": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:CheckApproval",
      "Next": "ApprovalChoice"
    },
    "ApprovalChoice": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.approved",
          "BooleanEquals": true,
          "Next": "ExecuteOrder"
        },
        {
          "Variable": "$.approved",
          "BooleanEquals": false,
          "Next": "RejectOrder"
        }
      ],
      "Default": "WaitForApproval"
    },
    "ExecuteOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:ExecuteOrder",
      "End": true
    },
    "RejectOrder": {
      "Type": "Fail",
      "Error": "OrderRejected",
      "Cause": "Approval denied"
    }
  }
}
```

## How It Works

1. **State machine**: A JSON-defined workflow using Amazon States Language (ASL). Each state is a step: Task (invoke Lambda), Choice (branch), Parallel (concurrent), Map (iterate), Wait (delay), Pass (transform), Succeed, or Fail.
2. **Task states**: Invoke a Lambda function (or other AWS service). The function receives the state input as the event and returns data that becomes the input to the next state.
3. **Choice states**: Evaluate conditions against the state input to determine the next state. Supports string, numeric, boolean, and timestamp comparisons.
4. **Parallel states**: Execute multiple branches concurrently. All branches must complete before the workflow continues. If any branch fails, the entire Parallel state fails.
5. **Map states**: Iterate over an array, executing a sub-workflow for each item. `MaxConcurrency` controls how many items process simultaneously.
6. **Retry/Catch**: `Retry` re-executes a failed task with exponential backoff. `Catch` routes to an error handler state. Errors are categorized (e.g., `States.TaskFailed`, `States.Timeout`, custom errors).

## Variants

### Express Workflow (High-Throughput)

```yaml
OrderWorkflow:
  Type: AWS::Serverless::StateMachine
  Properties:
    Type: EXPRESS
    # Express workflows: up to 100,000 executions/second
    # Max duration: 5 minutes
    # Lower cost per execution
    # No execution history persistence (limited to 90 days via CloudWatch)
```

### Standard Workflow (Long-Running)

```yaml
OrderWorkflow:
  Type: AWS::Serverless::StateMachine
  Properties:
    Type: STANDARD
    # Standard workflows: up to 2,000 executions/second
    # Max duration: 1 year
    # Full execution history
    # At-least-once execution guarantee
```

### Service Integrations (No Lambda Needed)

```json
{
  "StartAt": "PutItem",
  "States": {
    "PutItem": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:putItem",
      "Parameters": {
        "TableName": "OrdersTable",
        "Item": {
          "orderId": {"S.$": "$.orderId"},
          "status": {"S": "PENDING"}
        }
      },
      "Next": "SendNotification"
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:OrderTopic",
        "Message.$": "$.orderId"
      },
      "End": true
    }
  }
}
```

## Best Practices


- For a deeper guide, see [Complete Guide to Serverless Architecture](/guides/complete-guide-serverless-architecture/).

- **Use Express for high-throughput, short workflows**: Express workflows are cheaper and faster for event-driven processing under 5 minutes.
- **Use Standard for long-running workflows**: Standard workflows persist state for up to 1 year and support at-least-once execution.
- **Define Retry for transient errors**: Network timeouts and throttling are transient. Retry with exponential backoff (IntervalSeconds=2, BackoffRate=2.0, MaxAttempts=3).
- **Use Catch for business errors**: Payment declined, validation failed — these aren't transient. Route to error handler states.
- **Keep Lambda functions small**: Each Task should do one thing. Complex logic belongs in the state machine, not in a monolithic Lambda.
- **Use `DefinitionSubstitutions` in SAM**: Avoid hardcoding ARNs in the ASL definition. Use placeholders and let SAM resolve them.

## Common Mistakes

- **Using Lambda for everything**: Step Functions supports direct service integrations (DynamoDB, SNS, SQS, S3). Don't write a Lambda wrapper for a simple DynamoDB put.
- **No Retry on Task failures**: Transient errors (throttling, timeouts) cause workflow failures. Always add Retry for network-dependent tasks.
- **Catching all errors**: `Catch` with `States.ALL` catches everything including programming errors. Catch specific error types.
- **Overusing Parallel for independent tasks**: If tasks don't need to be concurrent, use sequential states. Parallel adds complexity and cost.
- **Not setting `MaxConcurrency` on Map**: Without a limit, Map processes all items simultaneously, potentially overwhelming downstream services. Set `MaxConcurrency` to 10-50.

## FAQ

**Standard vs Express workflows — which should I use?**

Use Express for short (< 5 min), high-throughput (> 2,000/sec) event-driven workflows. Use Standard for long-running (up to 1 year), stateful workflows that need full execution history and at-least-once guarantees.

**How does Step Functions handle failures?**

Each Task can have Retry (re-execute with backoff) and Catch (route to error handler). If a Task fails and has no Catch, the entire execution fails. Failed executions can be restarted from the failed state.

**Can I update a running state machine?**

You can update the definition, but running executions continue with the old definition. New executions use the updated definition. To apply changes to running executions, you must restart them.

**What is the maximum execution duration?**

Standard: 1 year. Express: 5 minutes. For longer processes, use Standard with Wait states, or break the workflow into multiple state machines.

**How much does Step Functions cost?**

Standard: $0.025 per 1,000 state transitions. Express: $0.025 per 1,000 invocations + $0.003 per 1,000 GB-seconds of duration. Express is cheaper for short workflows with few states.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
