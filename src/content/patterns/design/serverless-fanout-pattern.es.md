---
contentType: patterns
slug: serverless-fanout-pattern
title: "Patron Serverless Fanout"
description: "Difunde un solo evento a multiples consumidores independientes via SNS, EventBridge o SQS para que cada consumidor procese sin acoplamiento."
metaDescription: "Patron serverless fanout: difunde un evento a muchos consumidores Lambda via SNS o EventBridge. Desacopla productores de consumidores en AWS."
difficulty: intermediate
topics:
  - serverless
  - design
tags:
  - serverless
  - fanout
  - patron
  - sns
  - eventbridge
  - sqs
  - pub-sub
  - python
  - typescript
relatedResources:
  - /patterns/design/serverless-function-composition-pattern
  - /patterns/design/serverless-event-sourcing-pattern
  - /patterns/design/serverless-throttling-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron serverless fanout: difunde un evento a muchos consumidores Lambda via SNS o EventBridge. Desacopla productores de consumidores en AWS."
  keywords:
    - serverless fanout
    - sns fanout lambda
    - eventbridge fanout
    - sqs fanout pattern
    - serverless pub sub
    - event broadcast serverless
---

# Patron Serverless Fanout

## Descripcion general

El patron fanout difunde un solo evento a multiples consumidores independientes. Un productor publica un mensaje en un topic (SNS, EventBridge). El topic entrega una copia a cada suscriptor (cola SQS, Lambda, endpoint HTTP). Cada consumidor procesa el evento independientemente, a su propio ritmo, sin afectar a otros.

Esto desacopla productores de consumidores. El productor no sabe cuantos consumidores existen ni que hacen. Anadir un consumidor nuevo requiere solo suscribirse al topic, no modificar el productor. Si un consumidor falla, otros continuan procesando.

## Cuando usarlo

- Un evento debe disparar multiples acciones independientes (orden realizada: actualizar inventario, enviar email, generar factura)
- Quieres anadir o eliminar consumidores sin modificar el productor
- Los consumidores procesan a diferentes velocidades y no deben bloquearse entre si
- Necesitas entrega fiable: si un consumidor esta caido, el evento debe esperar y reintentar
- Diferentes equipos son duenos de diferentes consumidores

## Solucion

### SNS + SQS Fanout (Python CDK)

```python
from aws_cdk import (
    Stack,
    aws_sns as sns,
    aws_sns_subscriptions as subs,
    aws_sqs as sqs,
    aws_lambda as lambda_,
    aws_lambda_event_sources as events,
    Duration,
)
from constructs import Construct

class FanoutStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # SNS topic — el punto de fanout
        topic = sns.Topic(self, "OrderEventsTopic",
            topic_name="order-events",
            display_name="Order Events",
        )

        # Consumidor 1: Notificacion por email
        email_queue = sqs.Queue(self, "EmailQueue",
            visibility_timeout=Duration.seconds(300),
            retention_period=Duration.days(7),
        )
        topic.add_subscription(subs.SqsSubscription(email_queue))

        email_lambda = lambda_.Function(self, "EmailConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="email.handler",
            code=lambda_.Code.from_asset("lambda/email"),
            timeout=Duration.seconds(60),
        )
        email_lambda.add_event_source(events.SqsEventSource(email_queue, batch_size=10))

        # Consumidor 2: Actualizacion de inventario
        inventory_queue = sqs.Queue(self, "InventoryQueue",
            visibility_timeout=Duration.seconds(300),
            retention_period=Duration.days(7),
        )
        topic.add_subscription(subs.SqsSubscription(inventory_queue))

        inventory_lambda = lambda_.Function(self, "InventoryConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="inventory.handler",
            code=lambda_.Code.from_asset("lambda/inventory"),
            timeout=Duration.seconds(60),
        )
        inventory_lambda.add_event_source(events.SqsEventSource(inventory_queue, batch_size=10))

        # Consumidor 3: Analytics
        analytics_queue = sqs.Queue(self, "AnalyticsQueue",
            visibility_timeout=Duration.seconds(300),
        )
        topic.add_subscription(subs.SqsSubscription(analytics_queue))

        analytics_lambda = lambda_.Function(self, "AnalyticsConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="analytics.handler",
            code=lambda_.Code.from_asset("lambda/analytics"),
            timeout=Duration.seconds(60),
        )
        analytics_lambda.add_event_source(events.SqsEventSource(analytics_queue, batch_size=100))
```

### Publicar eventos (Python)

```python
import boto3
import json

sns = boto3.client('sns')

def publish_order_event(order_id: str, event_type: str, data: dict):
    message = {
        "eventType": event_type,
        "orderId": order_id,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }

    response = sns.publish(
        TopicArn="arn:aws:sns:us-east-1:123456789012:order-events",
        Message=json.dumps(message),
        Subject=f"Order {event_type}",
        MessageAttributes={
            "eventType": {"DataType": "String", "StringValue": event_type},
        },
    )

    return response["MessageId"]
```

### Lambda Consumer Handler (Python)

```python
import json

def handler(event, context):
    for record in event["Records"]:
        # SQS envuelve mensaje SNS
        sns_message = json.loads(record["body"])
        message = json.loads(sns_message["Message"])

        event_type = message["eventType"]
        order_id = message["orderId"]
        data = message["data"]

        if event_type == "ORDER_PLACED":
            send_order_email(order_id, data)
        elif event_type == "ORDER_SHIPPED":
            send_shipping_notification(order_id, data)

def send_order_email(order_id, data):
    # Logica de envio de email
    pass
```

### EventBridge Fanout (TypeScript)

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({ region: 'us-east-1' });

interface OrderEvent {
  eventType: string;
  orderId: string;
  customerId: string;
  total: number;
  items: any[];
}

async function publishOrderEvent(event: OrderEvent): Promise<void> {
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      EventBusName: 'default',
      Source: 'order.service',
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
    }],
  }));
}

// Consumer Lambda con filtrado por patron de evento
// EventBridge rule: { "source": ["order.service"], "detail-type": ["ORDER_PLACED"] }
export const emailConsumerHandler = async (event: any): Promise<void> => {
  const orderEvent: OrderEvent = JSON.parse(event.detail);

  console.log(`Sending email for order ${orderEvent.orderId}`);
  // Logica de email aqui
};

// EventBridge rule: { "source": ["order.service"], "detail-type": ["ORDER_PLACED", "ORDER_SHIPPED"] }
export const analyticsConsumerHandler = async (event: any): Promise<void> => {
  const orderEvent: OrderEvent = JSON.parse(event.detail);

  console.log(`Recording analytics for ${orderEvent.eventType}`);
  // Logica de analytics aqui
};
```

### CDK para EventBridge Fanout (TypeScript)

```typescript
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class FanoutStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Funciones consumidoras
    const emailConsumer = new lambda.Function(this, 'EmailConsumer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'email.handler',
      code: lambda.Code.fromAsset('lambda/email'),
    });

    const inventoryConsumer = new lambda.Function(this, 'InventoryConsumer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'inventory.handler',
      code: lambda.Code.fromAsset('lambda/inventory'),
    });

    const analyticsConsumer = new lambda.Function(this, 'AnalyticsConsumer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'analytics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
    });

    // Reglas con filtrado por patron de evento
    const orderPlacedRule = new events.Rule(this, 'OrderPlacedRule', {
      eventPattern: {
        source: ['order.service'],
        detailType: ['ORDER_PLACED'],
      },
    });

    // Fanout: un evento dispara multiples targets
    orderPlacedRule.addTarget(new targets.LambdaFunction(emailConsumer));
    orderPlacedRule.addTarget(new targets.LambdaFunction(inventoryConsumer));
    orderPlacedRule.addTarget(new targets.LambdaFunction(analyticsConsumer));
  }
}
```

## Explicacion

El patron fanout funciona insertando un topic entre el productor y los consumidores:

1. **Productor** publica un mensaje en el topic (SNS o EventBridge). El productor no sabe quien esta suscrito.

2. **Topic** entrega una copia del mensaje a cada suscriptor. SNS pusha a colas SQS, funciones Lambda, o endpoints HTTP. EventBridge evalua reglas e invoca targets que coinciden.

3. **Cola SQS** (opcional pero recomendado) bufferiza mensajes para cada consumidor. Si el Lambda consumidor esta caido o rate-limited, el mensaje espera en la cola. Esto desacopla la disponibilidad del consumidor del productor.

4. **Consumidor** procesa el mensaje desde su cola. Si el procesamiento falla, el mensaje vuelve a la cola para reintento. Tras max reintentos, pasa a una dead-letter queue.

El beneficio clave es aislamiento: si el consumidor de email es lento o falla, los consumidores de inventario y analytics no se ven afectados. Cada consumidor tiene su propia cola, politica de reintento y scaling.

## Variantes

| Enfoque | Topic | Ideal para |
|---------|-------|------------|
| SNS + SQS | Topic SNS, SQS por consumidor | Entrega fiable, buffering |
| EventBridge | Event bus con reglas | Filtrado por contenido, multiples tipos de evento |
| SNS directo a Lambda | Topic SNS, suscripcion Lambda | Simple, sin necesidad de buffering |
| Kinesis fanout | Stream Kinesis, consumidores | Streaming de alto throughput |
| SNS + SQS + DLQ | SNS, SQS, dead-letter queue | Produccion con manejo de errores |

## Buenas practicas

- **Usa SQS entre SNS y Lambda** — las invocaciones directas SNS-a-Lambda fallan si Lambda esta throttled. SQS bufferiza mensajes y reintenta. Este es el patron recomendado para produccion.
- **Establece visibility timeout a 6x el timeout de Lambda** — si Lambda tarda 60s, establece el visibility timeout de SQS a 360s. Esto previene procesamiento duplicado mientras una invocacion de larga duracion esta en curso.
- **Usa dead-letter queues** — tras max receive count, mueve mensajes a una DLQ para inspeccion. No pierdas eventos silenciosamente.
- **Filtra eventos en el topic** — SNS soporta filtrado por atributos de mensaje. EventBridge soporta filtrado por contenido. Solo entrega eventos relevantes a cada consumidor.
- **Haz los consumidores idempotentes** — SQS puede entregar un mensaje dos veces (at-least-once). Los consumidores deben manejar duplicados gracefulmente usando idempotency keys.

## Errores comunes

- **SNS directo a Lambda sin SQS** — si Lambda esta throttled, SNS reintenta con backoff pero puede perder mensajes tras max reintentos. Usa SQS para entrega fiable.
- **Sin dead-letter queue** — los mensajes fallidos desaparecen tras max reintentos. Siempre configura una DLQ para inspeccionar y reprocesar fallos.
- **Visibility timeout demasiado corto** — si Lambda tarda mas que el visibility timeout, SQS reentrega el mensaje, causando procesamiento duplicado. Establecelo a 6x el timeout de Lambda.
- **Acoplar productor a consumidores** — si el productor comprueba el estado del consumidor o envia diferentes mensajes a diferentes consumidores, el fanout no esta verdaderamente desacoplado. El productor debe publicar un evento y dejar que el topic maneje la entrega.
- **Sin idempotencia en consumidores** — la entrega at-least-once de SQS significa que los consumidores pueden procesar el mismo mensaje dos veces. Usa idempotency keys para prevenir efectos secundarios duplicados.

## Preguntas frecuentes

### Cual es la diferencia entre SNS fanout y EventBridge fanout?

SNS entrega cada mensaje a cada suscriptor. EventBridge evalua reglas y solo entrega a targets que coinciden con el patron del evento. EventBridge es mejor para filtrado por contenido; SNS es mas simple para fanout incondicional.

### Debo usar SQS entre SNS y Lambda?

Si, para produccion. SQS bufferiza mensajes cuando Lambda esta throttled o caido. Sin SQS, SNS reintenta con backoff pero puede perder mensajes tras agotar la politica de reintentos. SQS proporciona entrega fiable con soporte de reintento y DLQ.

### Como filtro eventos en SNS?

Usa atributos de mensaje. Establece `FilterPolicy` en la suscripcion para solo recibir mensajes que coincidan con valores de atributos especificos. Por ejemplo, un consumidor de email se suscribe con `{"eventType": ["ORDER_PLACED"]}` y solo recibe eventos de orden realizada.

### Como manejo mensajes veneno?

Configura una dead-letter queue en la cola SQS. Tras `maxReceiveCount` (ej. 5), el mensaje pasa a la DLQ. Monitoriza la DLQ e investiga por que el mensaje no pudo procesarse. Arregla el consumidor o el formato del mensaje, luego redrive desde la DLQ.
