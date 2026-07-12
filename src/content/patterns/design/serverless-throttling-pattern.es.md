---




contentType: patterns
slug: serverless-throttling-pattern
title: "Patron Serverless Throttling"
description: "Maneja backpressure en serverless usando SQS, token buckets y limites de concurrencia para proteger servicios downstream de trafico burst."
metaDescription: "Serverless throttling: maneja backpressure con SQS, token buckets y limites de concurrencia Lambda. Protege servicios downstream de trafico burst."
difficulty: advanced
topics:
  - serverless
  - design
tags:
  - serverless
  - throttling
  - backpressure
  - patron
  - sqs
  - rate-limiting
  - concurrency
  - python
  - typescript
relatedResources:
  - /patterns/serverless-fanout-pattern
  - /patterns/serverless-function-composition-pattern
  - /patterns/priority-queue-pattern
  - /patterns/serverless-db-connection-pooling-pattern
  - /patterns/serverless-warm-pool-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless throttling: maneja backpressure con SQS, token buckets y limites de concurrencia Lambda. Protege servicios downstream de trafico burst."
  keywords:
    - serverless throttling
    - lambda backpressure
    - sqs rate limiting
    - lambda concurrency limits
    - token bucket serverless
    - serverless rate control




---

# Patron Serverless Throttling

## Descripcion general

Las funciones serverless escalan automaticamente, pero los servicios downstream (bases de datos, APIs) a menudo no pueden manejar el trafico burst que la concurrencia Lambda produce. El patron throttling controla la tasa a la que las funciones Lambda procesan eventos, protegiendo los sistemas downstream de sobrecarga.

Tres enfoques principales: SQS con procesamiento controlado por lotes, limites de concurrencia reservada, y rate limiting con token bucket. Cada uno controla el throughput a un nivel diferente: throttling basado en cola suaviza el trafico en el tiempo, la concurrencia reservada limita las ejecuciones paralelas, y los token buckets imponen una tasa de peticiones precisa.

## Cuando usarlo


- For alternatives, see [Serverless Fanout Pattern](/es/patterns/serverless-fanout-pattern/).

- Lambda bursts sobrecargan bases de datos o APIs downstream con limites de conexiones
- Necesitas mantener una tasa de peticiones especifica a una API de terceros con rate limits
- Picos de trafico causan timeouts downstream o agotamiento de pool de conexiones
- Quieres procesar mensajes a un ritmo controlado en lugar de lo mas rapido posible
- Multiples funciones Lambda compiten por un recurso downstream compartido

## Solucion

### Estrategia 1: SQS con procesamiento controlado por lotes (Python)

```python
import boto3
import json
import time

sqs = boto3.client('sqs')
QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/order-queue"

def handler(event, context):
    # Procesar mensajes en lotes pequenos con pacing deliberado
    batch_size = 5
    processed = 0

    for record in event["Records"]:
        message = json.loads(record["body"])

        try:
            process_order(message)
            processed += 1
        except Exception as e:
            # Devolver mensaje a la cola para reintento
            raise e

    return {"processed": processed}

def process_order(order: dict):
    # Simular llamada a API downstream con conciencia de rate limit
    api_client.post("/orders", json=order)
```

### CDK: SQS con visibility timeout y batch size

```python
from aws_cdk import (
    Stack,
    aws_sqs as sqs,
    aws_lambda as lambda_,
    aws_lambda_event_sources as events,
    Duration,
)
from constructs import Construct

class ThrottledConsumerStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Cola con visibility timeout largo para prevenir procesamiento concurrente
        queue = sqs.Queue(self, "ThrottledQueue",
            visibility_timeout=Duration.seconds(300),
            receive_message_wait_time=Duration.seconds(20),  # Long polling
        )

        # Dead-letter queue para mensajes fallidos
        dlq = sqs.Queue(self, "DeadLetterQueue",
            retention_period=Duration.days(14),
        )

        # Lambda consumidor con concurrencia limitada
        consumer = lambda_.Function(self, "ThrottledConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset("lambda/consumer"),
            timeout=Duration.seconds(60),
            reserved_concurrent_executions=10,  # Limitar paralelismo
        )

        # Batch size pequeno para controlar throughput
        consumer.add_event_source(events.SqsEventSource(
            queue,
            batch_size=5,
            max_batching_window=Duration.seconds(30),
            report_batch_item_failures=True,
        ))

        # Suscripcion DLQ
        queue.add_to_dead_letter_queue(
            max_receive_count=5,
            dead_letter_queue=dlq,
        )
```

### Estrategia 2: Token Bucket Rate Limiter (TypeScript)

```typescript
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });

class TokenBucket {
  private tableName = 'rate_limits';
  private capacity: number;
  private refillRate: number;  // tokens por segundo

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
  }

  async allowRequest(bucketKey: string, tokens = 1): Promise<boolean> {
    const now = Date.now();

    // Obtener estado actual del bucket
    const getResponse = await ddb.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ bucketKey }),
    }));

    let tokensAvailable = this.capacity;
    let lastRefill = now;

    if (getResponse.Item) {
      const bucket = unmarshall(getResponse.Item);
      tokensAvailable = parseFloat(bucket.tokens);
      lastRefill = parseInt(bucket.lastRefill);

      // Rellenar tokens basado en tiempo transcurrido
      const elapsedSeconds = (now - lastRefill) / 1000;
      const refilled = elapsedSeconds * this.refillRate;
      tokensAvailable = Math.min(this.capacity, tokensAvailable + refilled);
    }

    if (tokensAvailable < tokens) {
      return false;  // Rate limit excedido
    }

    // Consumir tokens
    tokensAvailable -= tokens;

    await ddb.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ bucketKey }),
      UpdateExpression: 'SET tokens = :t, lastRefill = :r',
      ExpressionAttributeValues: marshall({
        ':t': tokensAvailable.toFixed(2),
        ':r': now.toString(),
      }),
    }));

    return true;
  }
}

// Uso en Lambda handler
const rateLimiter = new TokenBucket(100, 10);  // 100 tokens, 10/sec refill

export const handler = async (event: any): Promise<{ statusCode: number }> => {
  const apiKey = event.requestContext.identity.apiId;

  const allowed = await rateLimiter.allowRequest(apiKey);
  if (!allowed) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    };
  }

  // Procesar peticion
  return { statusCode: 200 };
};
```

### Estrategia 3: Concurrencia reservada + SQS (Python)

```python
import boto3
import json
import os

sqs = boto3.client('sqs')
QUEUE_URL = os.environ["QUEUE_URL"]

def handler(event, context):
    failed_records = []

    for record in event["Records"]:
        try:
            message = json.loads(record["body"])
            process_with_rate_limit(message)
        except Exception as e:
            # Reportar fallo individual para reintento parcial del lote
            failed_records.append({
                "itemIdentifier": record["messageId"]
            })

    if failed_records:
        return {
            "batchItemFailures": failed_records
        }

    return {"batchItemFailures": []}

def process_with_rate_limit(message: dict):
    # Comprobar capacidad downstream antes de procesar
    if not check_downstream_capacity():
        raise Exception("Downstream capacity exceeded")

    # Procesar con timeout
    api_client.post("/process", json=message, timeout=10)

def check_downstream_capacity() -> bool:
    # Consultar endpoint de salud downstream
    response = api_client.get("/health")
    return response.status_code == 200 and response.json()["capacity"] > 0
```

## Explicacion

Cada estrategia de throttling controla el throughput a un nivel diferente:

- **Control de lotes SQS** — la cola bufferiza el trafico entrante. Lambda procesa lotes pequenos (5-10 mensajes) con una ventana de batching (30s). Esto suaviza bursts: los mensajes esperan en la cola en lugar de golpear downstream todos a la vez. El visibility timeout previene procesamiento duplicado durante invocaciones de larga duracion.

- **Concurrencia reservada** — AWS limita el numero de ejecuciones Lambda concurrentes. Establecer `reserved_concurrent_executions=10` significa que como maximo 10 instancias corren simultaneamente. Las invocaciones excesivas se encolan. Esto limita directamente la carga paralela en sistemas downstream.

- **Token bucket** — un contador respaldado en DynamoDB trackea los tokens disponibles. Cada peticion consume un token. Los tokens se rellenan a una tasa fija. Si no hay tokens disponibles, la peticion se rechaza con 429. Esto impone una tasa de peticiones precisa independientemente de la concurrencia Lambda.

## Variantes

| Enfoque | Nivel de control | Ideal para |
|---------|-----------------|------------|
| SQS batch + batching window | Nivel cola | Suavizar bursts de trafico |
| Concurrencia reservada | Nivel ejecucion | Limitar invocaciones paralelas |
| Token bucket (DynamoDB) | Nivel peticion | Tasa precisa por API key |
| Leaky bucket | Nivel peticion | Tasa estricta sin bursts |
| Circuit breaker | Nivel downstream | Proteger servicios que fallan |
| Semaforo (in-function) | Nivel instancia | Limitar llamadas async concurrentes |

## Buenas practicas

- **Combina SQS con concurrencia reservada** — SQS bufferiza trafico; la concurrencia reservada limita el paralelismo. Juntos proporcionan suavizado y limites duros.
- **Usa reporte de fallo parcial por lote** — cuando un mensaje en un lote falla, devuelve solo ese message ID en `batchItemFailures`. SQS reentrega solo el mensaje fallido, no todo el lote.
- **Establece visibility timeout a 6x el timeout de Lambda** — previene reentrega mientras una invocacion de larga duracion sigue procesando.
- **Monitoriza la metrica Throttles** — si Lambda throttlea frecuentemente, aumenta la concurrencia reservada o escala la capacidad downstream. Los throttles significan invocaciones perdidas.
- **Usa long polling** — establece `receive_message_wait_time` a 20 segundos. Esto reduce receives vacios y baja los costes de API de SQS.

## Errores comunes

- **Sin concurrencia reservada** — sin un limite, Lambda escala a miles de ejecuciones concurrentes, sobrecargando bases de datos downstream. Siempre establece concurrencia reservada para funciones que llaman a servicios downstream.
- **Batch size demasiado grande** — procesar 100 mensajes a la vez aumenta la probabilidad de fallos parciales e invocaciones de larga duracion. Usa 5-10 para la mayoria de workloads.
- **Sin visibility timeout** — sin visibility timeout, SQS reentrega mensajes mientras Lambda sigue procesandolos, causando duplicados. Establecelo a 6x el timeout de Lambda.
- **Ignorar la capacidad downstream** — throttling a nivel Lambda no ayuda si el servicio downstream tiene sus propios limites de conexiones. Monitoriza la salud downstream y ajusta la concurrencia.
- **No manejar 429 del downstream** — cuando una API downstream devuelve 429, Lambda deberia reintentar con backoff o fallar el mensaje para reprocesamiento posterior, no crashar.

## Preguntas frecuentes

### Cual es la diferencia entre throttling y rate limiting?

Throttling controla la tasa de procesamiento para proteger sistemas downstream. Rate limiting rechaza peticiones que exceden una tasa definida. Throttling suaviza trafico; rate limiting descarta trafico excesivo. En serverless, el throttling basado en SQS suaviza, y el rate limiting con token bucket descarta.

### Como elijo el valor correcto de concurrencia reservada?

Empieza con el tamano del pool de conexiones del servicio downstream. Si tu base de datos soporta 50 conexiones y cada Lambda usa 1 conexion, establece la concurrencia reservada a 50. Monitoriza la latencia downstream y ajusta. Si la latencia aumenta, reduce la concurrencia.

### Puedo usar throttling de API Gateway en lugar de throttling de Lambda?

Si. API Gateway soporta usage plans con limites de tasa y burst. Esto throttlea a nivel API antes de que Lambda se invoque. Usa throttling de API Gateway para APIs publicas. Usa concurrencia reservada de Lambda para funciones internas event-driven.

### Que pasa cuando Lambda es throttled?

Para invocaciones sincronas (API Gateway), el llamador recibe un error 429. Para invocaciones asincronas (SNS, EventBridge), el evento se reintenta con backoff exponencial. Para funciones disparadas por SQS, el mensaje permanece en la cola y se reintenta en el siguiente poll. Configura DLQs para todos los casos.
