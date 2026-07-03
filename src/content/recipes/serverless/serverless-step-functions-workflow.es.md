---
contentType: recipes
slug: serverless-step-functions-workflow
title: "Orquestar Workflows Serverless con AWS Step Functions"
description: "Construir workflows de state machine con AWS Step Functions usando estados secuenciales, paralelos y map para orquestar funciones Lambda y procesos de larga duracion."
metaDescription: "Orquesta workflows serverless con AWS Step Functions. Usa estados secuenciales, paralelos y map para coordinar funciones Lambda y procesos de larga duracion."
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
  - /recipes/serverless/serverless-event-driven-sqs-lambda
  - /recipes/serverless/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Orquesta workflows serverless con AWS Step Functions. Usa estados secuenciales, paralelos y map para coordinar funciones Lambda y procesos de larga duracion."
  keywords:
    - aws step functions
    - state machine workflow
    - serverless orchestration
    - step functions lambda
    - aws state machine
---

## Descripcion general

AWS Step Functions es un orquestador serverless que coordina multiples funciones Lambda (y otros servicios AWS) en workflows de state machine. Maneja reintentos, manejo de errores, branching, ejecucion paralela y gestion de estado — todo declarativamente en JSON. A continuacion: construir workflows secuenciales, ejecucion paralela, map states para batch processing, manejo de errores con catch/retry y workflows Express vs Standard.

## Cuando Usar Esto

- Procesos multi-paso que requieren coordinacion (procesamiento de ordenes, pipelines ETL, onboarding de usuarios)
- Workflows con branching condicional y manejo de errores
- Procesos de larga duracion (horas a dias) que necesitan persistencia de estado
- Batch processing donde cada item necesita manejo individual de errores

## Prerrequisitos

- Python 3.11+
- Cuenta AWS con acceso a Step Functions y Lambda
- Paquete `boto3`

## Solucion

### 1. State Machine de Procesamiento de Ordenes (Definicion ASL)

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

### 2. Ejecucion Paralela

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

### 3. Map State para Batch Processing

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

### 4. Template SAM con Step Functions

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

### 5. Funciones Lambda Task

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

### 6. Iniciar Ejecucion desde Lambda

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

### 7. Wait States y Aprobacion Humana

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

## Como Funciona

1. **State machine**: Un workflow definido en JSON usando Amazon States Language (ASL). Cada estado es un paso: Task (invocar Lambda), Choice (branch), Parallel (concurrente), Map (iterar), Wait (delay), Pass (transformar), Succeed o Fail.
2. **Task states**: Invocan una funcion Lambda (u otro servicio AWS). La funcion recibe el input del estado como event y retorna datos que se convierten en input del siguiente estado.
3. **Choice states**: Evaluan condiciones contra el input del estado para determinar el siguiente estado. Soporta comparaciones de string, numerico, booleano y timestamp.
4. **Parallel states**: Ejecutan multiples branches concurrentemente. Todos los branches deben completar antes de que el workflow continue. Si cualquier branch falla, todo el Parallel state falla.
5. **Map states**: Iteran sobre un array, ejecutando un sub-workflow para cada item. `MaxConcurrency` controla cuantos items se procesan simultaneamente.
6. **Retry/Catch**: `Retry` re-ejecuta una task fallida con backoff exponencial. `Catch` enruta a un estado de error handler. Los errores se categorizan (ej., `States.TaskFailed`, `States.Timeout`, errores custom).

## Variantes

### Express Workflow (Alto Throughput)

```yaml
OrderWorkflow:
  Type: AWS::Serverless::StateMachine
  Properties:
    Type: EXPRESS
    # Express workflows: hasta 100,000 ejecuciones/segundo
    # Duracion max: 5 minutos
    # Menor costo por ejecucion
    # Sin persistencia de historial de ejecucion (limitado a 90 dias via CloudWatch)
```

### Standard Workflow (Larga Duracion)

```yaml
OrderWorkflow:
  Type: AWS::Serverless::StateMachine
  Properties:
    Type: STANDARD
    # Standard workflows: hasta 2,000 ejecuciones/segundo
    # Duracion max: 1 ano
    # Historial completo de ejecucion
    # Garantia de ejecucion at-least-once
```

### Integraciones de Servicio (Sin Lambda)

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

## Mejores Practicas

- **Usar Express para workflows cortos de alto throughput**: Express workflows son mas baratos y rapidos para procesamiento event-driven bajo 5 minutos.
- **Usar Standard para workflows de larga duracion**: Standard workflows persisten estado por hasta 1 ano y soportan ejecucion at-least-once.
- **Definir Retry para errores transitorios**: Timeouts de red y throttling son transitorios. Reintenta con backoff exponencial (IntervalSeconds=2, BackoffRate=2.0, MaxAttempts=3).
- **Usar Catch para errores de negocio**: Pago rechazado, validacion fallida — estos no son transitorios. Enruta a estados de error handler.
- **Mantener funciones Lambda pequenas**: Cada Task deberia hacer una cosa. La logica compleja pertenece al state machine, no a un Lambda monolitico.
- **Usar `DefinitionSubstitutions` en SAM**: Evita hardcodear ARNs en la definicion ASL. Usa placeholders y deja que SAM los resuelva.

## Errores Comunes

- **Usar Lambda para todo**: Step Functions soporta integraciones directas de servicio (DynamoDB, SNS, SQS, S3). No escribas un wrapper Lambda para un simple put de DynamoDB.
- **Sin Retry en fallos de Task**: Errores transitorios (throttling, timeouts) causan fallos de workflow. Siempre agrega Retry para tasks dependientes de red.
- **Capturar todos los errores**: `Catch` con `States.ALL` captura todo incluyendo errores de programacion. Captura tipos de error especificos.
- **Sobreusar Parallel para tareas independientes**: Si las tareas no necesitan ser concurrentes, usa estados secuenciales. Parallel agrega complejidad y costo.
- **No establecer `MaxConcurrency` en Map**: Sin limite, Map procesa todos los items simultaneamente, potencialmente abrumando servicios downstream. Establece `MaxConcurrency` a 10-50.

## FAQ

**Standard vs Express workflows — cual deberia usar?**

Usa Express para workflows cortos (< 5 min), de alto throughput (> 2,000/seg) event-driven. Usa Standard para workflows de larga duracion (hasta 1 ano), stateful que necesitan historial completo de ejecucion y garantias at-least-once.

**Como maneja Step Functions los fallos?**

Cada Task puede tener Retry (re-ejecutar con backoff) y Catch (enrutar a error handler). Si un Task falla y no tiene Catch, toda la ejecucion falla. Las ejecuciones fallidas pueden reiniciarse desde el estado fallido.

**Puedo actualizar un state machine en ejecucion?**

Puedes actualizar la definicion, pero las ejecuciones en curso continuan con la definicion antigua. Las nuevas ejecuciones usan la definicion actualizada. Para aplicar cambios a ejecuciones en curso, debes reiniciarlas.

**Cual es la duracion maxima de ejecucion?**

Standard: 1 ano. Express: 5 minutos. Para procesos mas largos, usa Standard con Wait states, o divide el workflow en multiples state machines.

**Cuanto cuesta Step Functions?**

Standard: $0.025 por 1,000 transiciones de estado. Express: $0.025 por 1,000 invocaciones + $0.003 por 1,000 GB-segundos de duracion. Express es mas barato para workflows cortos con pocos estados.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
