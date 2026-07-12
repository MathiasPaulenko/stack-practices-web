---





contentType: patterns
slug: serverless-function-composition-pattern
title: "Patron Serverless Function Composition"
description: "Encadena funciones serverless via Step Functions u orquestadores para construir workflows multi-paso con reintentos, branching y gestion de estado."
metaDescription: "Serverless function composition: encadena Lambda via Step Functions para workflows multi-paso. Implementa con AWS CDK, Python y TypeScript."
difficulty: advanced
topics:
  - serverless
  - design
tags:
  - serverless
  - function-composition
  - patron
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
  metaDescription: "Serverless function composition: encadena Lambda via Step Functions para workflows multi-paso. Implementa con AWS CDK, Python y TypeScript."
  keywords:
    - serverless function composition
    - aws step functions
    - lambda orchestration
    - serverless workflow
    - function chaining
    - aws cdk step functions





---

# Patron Serverless Function Composition

## Descripcion general

La composicion de funciones encadena multiples funciones serverless en un workflow coordinado. En lugar de una funcion grande que maneja todo, cada funcion maneja un solo paso. Un orquestador (AWS Step Functions, Azure Durable Functions, o un orquestador custom) gestiona la secuencia, maneja reintentos, ramifica segun condiciones y mantiene estado entre pasos.

Este patron aborda la limitacion de serverless de funcion unica: limites de tiempo de ejecucion, falta de gestion de estado y sin logica de reintento entre fronteras de funciones. Al descomponer el trabajo en pasos y usar un orquestador, obtienes visibilidad, manejo de errores y la capacidad de reproducir pasos fallidos.

## Cuando usarlo


- For alternatives, see [Serverless Warm Pool Pattern](/es/patterns/serverless-warm-pool-pattern/).

- Procesos de negocio multi-paso que requieren estado entre pasos (procesamiento de ordenes, pipelines ETL)
- Workflows con branching condicional (aprobar/rechazar, reintentar en fallo)
- Necesitas reintentos y timeouts por paso, no solo a nivel de funcion
- Procesos de larga duracion que exceden los limites de ejecucion de funcion unica
- Multiples equipos son duenos de diferentes pasos del mismo workflow

## Solucion

### AWS Step Functions con Python (CDK)

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

        # Definir funciones Lambda para cada paso
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

        # Construir la maquina de estados
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

        # Definir workflow con branching y manejo de errores
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

### TypeScript con AWS SDK

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

// Comprobar estado de ejecucion
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

  // Paso 1: Validar
  const validationResult = yield context.df.callActivity('ValidateOrder', order);
  if (!validationResult.valid) {
    return { status: 'FAILED', error: validationResult.error };
  }

  // Paso 2: Procesar pago (con reintento)
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
    // Accion compensatoria: reembolsar
    yield context.df.callActivity('RefundPayment', { orderId: order.orderId });
    return { status: 'FAILED', error: 'PaymentFailed' };
  }

  // Paso 3: Reservar inventario (paralelo para multiples items)
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

  // Paso 4: Enviar notificacion
  yield context.df.callActivity('SendNotification', {
    customerId: order.customerId,
    message: `Order ${order.orderId} confirmed`,
  });

  return { status: 'SUCCESS', orderId: order.orderId };
});

df.app.orchestrate('OrderOrchestrator', orchestrator);
```

## Explicacion

El patron de composicion separa orquestacion de ejecucion:

1. **Orquestador** — define el workflow como una maquina de estados. Conoce el orden de pasos, condiciones de branching, politicas de reintento y timeouts. El orquestador mismo es stateless: lee estado de un store gestionado (Step Functions, Durable Functions).

2. **Funciones de paso** — cada Lambda o Activity maneja una unidad de trabajo. Recibe input del orquestador, realiza su tarea y devuelve output. Los pasos no conocen otros pasos.

3. **Gestion de estado** — el orquestador pasa datos entre pasos. El output de cada paso se convierte en input del siguiente. El orquestador persiste estado, por lo que si un paso falla, el workflow puede reanudarse desde el ultimo paso exitoso.

4. **Manejo de errores** — el orquestador define reintentos por paso (ej. 3 intentos con backoff exponencial). Si un paso agota reintentos, el workflow puede ramificar a un paso de compensacion (ej. reembolso) o fallar gracefulmente.

## Variantes

| Enfoque | Orquestador | Ideal para |
|---------|-------------|------------|
| AWS Step Functions | Maquina de estados gestionada | Workflows nativos AWS |
| Azure Durable Functions | Orquestador basado en codigo | Workflows nativos Azure |
| EventBridge + Lambda | Encadenamiento por eventos | Secuencias simples, sin estado |
| Orquestador custom (Lambda) | Auto-construido | Logica custom compleja |
| Lambda encadenado (invocacion directa) | Funcion-a-funcion | Flujos simples de 2-3 pasos |

## Buenas practicas

- **Mantén los pasos idempotentes** — el orquestador puede reintentar un paso. Cada paso debe producir el mismo resultado si se llama una o multiples veces. Usa idempotency keys para operaciones de pago e inventario.
- **Usa pasos de compensacion** — si un paso falla despues de efectos secundarios (ej. pago exitoso pero inventario falla), anade un paso de compensacion (ej. reembolso) para revertir.
- **Establece timeouts por paso** — cada paso debe tener su propio timeout. Un paso atascado no debe retener todo el workflow indefinidamente.
- **Monitoriza el historial de ejecucion** — trackea duracion del workflow, tasas de fallo por paso y conteos de reintento. Usa CloudWatch o Application Insights.
- **Mantén la logica del orquestador declarativa** — define el workflow como maquina de estados, no codigo imperativo. Esto facilita visualizar, debuggear y modificar.

## Errores comunes

- **Encadenar funciones directamente** — invocacion Lambda-to-Lambda sin orquestador pierde estado, logica de reintento y visibilidad. Usa Step Functions o Durable Functions.
- **Pasos no idempotentes** — si un paso cobra una tarjeta de credito y se reintenta, el cliente es cobrado dos veces. Usa idempotency keys.
- **Sin logica de compensacion** — cuando un paso falla despues de efectos secundarios, el sistema queda en estado inconsistente. Siempre define pasos de compensacion para workflows con efectos secundarios.
- **Sobre-orquestacion** — no uses Step Functions para un proceso simple de 2 pasos. La invocacion directa o EventBridge es mas simple y barato.
- **Pasar payloads grandes entre pasos** — Step Functions tiene un limite de 256KB. Pasa referencias (S3 keys, database IDs) en lugar de datos completos.

## Preguntas frecuentes

### Cual es la diferencia entre orquestacion y coreografia?

En orquestacion, un orquestador central (Step Functions) controla el workflow e invoca pasos. En coreografia, cada funcion emite eventos que disparan otras funciones, sin controlador central. La orquestacion es mas facil de debuggear y monitorizar; la coreografia es mas desacoplada y escalable.

### Cuando debo usar Step Functions vs invocacion directa Lambda?

Usa Step Functions cuando tienes workflows multi-paso con branching, reintentos o estado. Usa invocacion directa para procesos simples de 1-2 pasos donde el llamador puede manejar errores. Step Functions cuesta mas pero proporciona visibilidad y fiabilidad.

### Como manejo workflows de larga duracion?

Step Functions Express Workflows soporta hasta 5 minutos. Standard Workflows soporta hasta 1 ano. Para workflows de larga duracion, usa Standard y dividelos en etapas con pasos de aprobacion humana o wait states.

### Puedo versionar workflows sin romper ejecuciones en curso?

Si. Step Functions soporta versionado. Cuando actualizas una maquina de estados, las ejecuciones en curso continuan en la version antigua. Las nuevas ejecuciones usan la version actualizada. Esto permite despliegues sin downtime.
