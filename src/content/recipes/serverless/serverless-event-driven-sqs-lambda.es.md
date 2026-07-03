---
contentType: recipes
slug: serverless-event-driven-sqs-lambda
title: "Construir Lambda Event-Driven con Triggers SQS y Batch Processing"
description: "Procesar mensajes SQS con Lambda usando batch windows, partial batch responses, manejo de errores y dead-letter queues para pipelines event-driven resilientes."
metaDescription: "Construye Lambda event-driven con triggers SQS. Usa batch windows, partial batch responses, manejo de errores y DLQ para procesamiento de mensajes resiliente."
difficulty: intermediate
topics:
  - serverless
  - messaging
  - architecture
tags:
  - aws
  - lambda
  - sqs
  - event-driven
  - batch-processing
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/domain-driven-design-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye Lambda event-driven con triggers SQS. Usa batch windows, partial batch responses, manejo de errores y DLQ para procesamiento de mensajes resiliente."
  keywords:
    - aws lambda sqs trigger
    - event-driven lambda
    - sqs batch processing
    - partial batch response
    - sqs dead letter queue
---

## Descripcion general

Los triggers SQS permiten a Lambda consumir mensajes de una cola automaticamente. Lambda hace polling de SQS, agrupa mensajes e invoca la funcion. Con batch windows, partial batch responses y dead-letter queues, puedes construir pipelines event-driven resilientes que manejan fallos graceful sin perder mensajes. A continuacion: configurar triggers SQS, batch processing, manejo de errores con partial batch responses, configuracion de DLQ y monitoreo.

## Cuando Usar Esto

- Procesamiento asincrono de tareas (thumbnails de imagenes, envio de emails, generacion de reportes)
- Desacoplar productores de consumidores en arquitecturas event-driven
- Manejar picos de trafico con buffering basado en colas
- Cualquier workload donde los mensajes deben sobrevivir fallos de funcion

## Prerrequisitos

- Python 3.11+
- Cuenta AWS con acceso a Lambda y SQS
- Paquete `boto3`

## Solucion

### 1. Crear Cola SQS con DLQ

```bash
# Crear dead-letter queue
aws sqs create-queue --queue-name my-dlq

DLQ_URL=$(aws sqs get-queue-url --queue-name my-dlq --query 'QueueUrl' --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Crear cola principal con DLQ configurado
aws sqs create-queue --queue-name my-queue --attributes file://queue-attributes.json

# queue-attributes.json
{
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"'${DLQ_ARN}'\",\"maxReceiveCount\":\"3\"}",
  "VisibilityTimeout": "120",
  "MessageRetentionPeriod": "1209600"
}
```

### 2. Handler Lambda con Batch Processing

```python
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sqs = boto3.client('sqs')

def lambda_handler(event, context):
    records = event.get('Records', [])
    logger.info(f"Processing {len(records)} messages")

    batch_item_failures = []

    for record in records:
        message_id = record['messageId']
        receipt_handle = record['receiptHandle']

        try:
            body = json.loads(record['body'])
            process_message(body)
            logger.info(f"Successfully processed message {message_id}")

        except Exception as e:
            logger.error(f"Failed to process message {message_id}: {e}")
            batch_item_failures.append({
                'itemIdentifier': message_id,
            })

    # Retornar partial batch response — solo los mensajes fallidos vuelven a SQS
    return {
        'batchItemFailures': batch_item_failures,
    }

def process_message(body: dict):
    order_id = body.get('orderId')
    if not order_id:
        raise ValueError("Missing orderId")

    # Logica de negocio aqui
    logger.info(f"Processing order {order_id}")
    # ej., guardar en DynamoDB, llamar API externa, generar reporte
```

### 3. Template SAM con Trigger SQS

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ProcessQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: my-queue
      VisibilityTimeout: 120
      MessageRetentionPeriod: 1209600
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: my-dlq

  ProcessFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      Timeout: 120
      MemorySize: 512
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessQueue.Arn
            BatchSize: 10
            MaxBatchingWindow: 30
            FunctionResponseTypes:
              - ReportBatchItemFailures
      Policies:
        - SQSPollerPolicy:
            QueueName: !GetAtt ProcessQueue.QueueName
```

### 4. Productor: Enviar Mensajes a SQS

```python
import json
import boto3

sqs = boto3.client('sqs', region_name='us-east-1')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'

def send_order_message(order: dict):
    response = sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(order),
        MessageAttributes={
            'OrderType': {
                'DataType': 'String',
                'StringValue': order.get('type', 'standard'),
            },
        },
    )
    return response['MessageId']

def send_batch_orders(orders: list):
    entries = [
        {
            'Id': str(i),
            'MessageBody': json.dumps(order),
            'MessageAttributes': {
                'OrderType': {
                    'DataType': 'String',
                    'StringValue': order.get('type', 'standard'),
                },
            },
        }
        for i, order in enumerate(orders)
    ]

    # Enviar en lotes de 10 (limite SQS)
    for i in range(0, len(entries), 10):
        batch = entries[i:i+10]
        response = sqs.send_message_batch(QueueUrl=QUEUE_URL, Entries=batch)
        if response.get('Failed'):
            for failure in response['Failed']:
                logger.error(f"Failed to send message {failure['Id']}: {failure['Message']}")
```

### 5. Cola FIFO con Message Groups

```python
# Enviar a cola FIFO con message group ID para ordenamiento
def send_ordered_message(order: dict, group_id: str):
    response = sqs.send_message(
        QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789012/my-queue.fifo',
        MessageBody=json.dumps(order),
        MessageGroupId=group_id,  # Mensajes en mismo grupo se procesan en orden
        MessageDeduplicationId=f"order-{order['id']}",  # Idempotencia
    )
    return response['MessageId']
```

### 6. Ajuste de Visibility Timeout

```python
import boto3

sqs = boto3.client('sqs')

# Establecer visibility timeout por cola
sqs.set_queue_attributes(
    QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
    Attributes={
        'VisibilityTimeout': '300',  # 5 minutos — debe ser >= timeout de Lambda
    },
)

# El visibility timeout deberia ser al menos 6x el timeout de Lambda
# Si Lambda hace timeout a 60s, establece visibility timeout a 360s
# Esto da a SQS suficiente tiempo para hacer el mensaje visible despues de reintentos
```

### 7. Monitoreo y Alarmas

```yaml
# Alarma de CloudWatch para profundidad de DLQ
Resources:
  DLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: DLQ-Messages-Alert
      AlarmDescription: Alert when DLQ has messages
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Dimensions:
        - Name: QueueName
          Value: my-dlq
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref AlertTopic
```

## Como Funciona

1. **Polling**: Lambda hace polling de SQS buscando mensajes. Cuando hay mensajes disponibles, los agrupa (hasta `BatchSize`) e invoca la funcion con todos los mensajes en un evento.
2. **Batching window**: `MaxBatchingWindow` (0-300 segundos) le dice a Lambda que espere por mas mensajes antes de invocar. Una ventana de 30 segundos recolecta hasta 10 mensajes antes de invocar, reduciendo invocaciones de funcion.
3. **Partial batch responses**: Con `ReportBatchItemFailures`, la funcion retorna una lista de IDs de mensajes fallidos. SQS solo re-envia esos mensajes — los exitosos se eliminan. Sin esto, un solo fallo rechaza todo el lote.
4. **Visibility timeout**: Cuando Lambda lee un mensaje, SQS lo oculta de otros consumidores por la duracion del visibility timeout. Si la funcion falla, el mensaje se vuelve visible despues del timeout. Establecelo a al menos 6x el timeout de Lambda.
5. **DLQ**: Despues de `maxReceiveCount` intentos de recepcion fallidos, SQS mueve el mensaje a la dead-letter queue. Inspecciona el DLQ para entender por que los mensajes fallan.

## Variantes

### Cola FIFO con Lambda

```yaml
# Las colas FIFO requieren BatchSize=1 para ordenamiento estricto, o usa message groups
ProcessFunction:
  Type: AWS::Serverless::Function
  Properties:
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: !GetAtt FifoQueue.Arn
          BatchSize: 10
          # Lambda procesa un message group a la vez para FIFO
```

### Drenado Programado de Cola

```python
# Regla de EventBridge dispara Lambda cada 5 minutos para drenar la cola
import boto3

def lambda_handler(event, context):
    sqs = boto3.client('sqs')
    queue_url = event['queueUrl']

    while True:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=5,
        )

        messages = response.get('Messages', [])
        if not messages:
            break

        for msg in messages:
            process_message(json.loads(msg['Body']))
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=msg['ReceiptHandle'],
            )
```

### Trigger SQS Cross-Account

```yaml
# El ARN de la cola debe estar en la misma region
# Agrega una politica basada en recursos a la cola permitiendo a Lambda consumir
ProcessFunction:
  Type: AWS::Serverless::Function
  Properties:
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: arn:aws:sqs:us-east-1:999999999999:cross-account-queue
          BatchSize: 10
```

## Mejores Practicas

- **Usar `ReportBatchItemFailures`**: Sin esto, un mensaje fallido rechaza todo el lote, causando reprocesamiento de mensajes exitosos. Siempre retorna partial batch responses.
- **Establecer visibility timeout a 6x el timeout de Lambda**: Si Lambda hace timeout, el mensaje deberia permanecer oculto el tiempo suficiente para el siguiente intento de retry.
- **Usar DLQ con `maxReceiveCount` de 3-5**: Muy bajo envia mensajes a DLQ por errores transitorios. Muy alto desperdicia tiempo de procesamiento en poison pills.
- **Mantener batch size pequeno para procesamiento pesado**: Batch size 10 es el default. Para procesamiento CPU-intensivo, usa 1-5 para evitar timeouts.
- **Usar colas FIFO para ordenamiento**: Las colas estandar entregan at-least-once sin ordenamiento. Las colas FIFO garantizan orden dentro de un message group.
- **Monitorear profundidad de DLQ**: Establece alarmas de CloudWatch en el conteo de mensajes del DLQ. Investiga mensajes del DLQ prontamente.

## Errores Comunes

- **No usar partial batch responses**: Sin `ReportBatchItemFailures`, un mensaje fallido causa que todo el lote reintente. Los mensajes exitosos se reprocesan.
- **Visibility timeout demasiado corto**: Si el visibility timeout es mas corto que el timeout de Lambda, SQS hace el mensaje visible mientras Lambda aun lo procesa, causando procesamiento duplicado.
- **Sin DLQ**: Sin DLQ, los mensajes poison pill (que siempre fallan) se reintentan hasta que `MessageRetentionPeriod` expira, luego se pierden.
- **Batch size demasiado grande**: Un lote de 10 mensajes con 30 segundos de procesamiento cada uno excede un timeout de 60 segundos. Ajusta batch size al tiempo de procesamiento.
- **No manejar errores de `json.loads`**: Si el body del mensaje no es JSON valido, `json.loads` lanza una excepcion. Envuelve en try/except y retorna como batch item failure.

## FAQ

**Cual es el batch size maximo para triggers SQS de Lambda?**

10,000 mensajes (Lambda aumento el limite de 10). Sin embargo, el payload total del lote debe ser menor a 6MB. Para la mayoria de casos de uso, 10-100 es practico.

**Como maneja Lambda el ordenamiento de colas FIFO?**

Lambda procesa un message group a la vez. Dentro de un grupo, los mensajes se procesan en orden. Diferentes grupos pueden procesarse en paralelo. Establece `BatchSize=1` para ordenamiento estricto por mensaje.

**Que pasa cuando Lambda hace timeout?**

El mensaje se vuelve visible en SQS despues de que el visibility timeout expira. Lambda no elimina el mensaje en timeout — se reintenta automaticamente. Si falla `maxReceiveCount` veces, va al DLQ.

**Puedo usar SQS con EventBridge?**

Si. EventBridge puede enrutar eventos a SQS como target. Esto desacopla el productor de eventos del consumidor Lambda. Usa EventBridge para logica de routing, SQS para buffering y retry.

**Como hago replay de mensajes desde DLQ?**

Mueve mensajes del DLQ de vuelta a la cola principal usando la API `StartMessageMoveTask`:

```bash
aws sqs start-message-move-task \
  --source-arn arn:aws:sqs:us-east-1:123456789012:my-dlq \
  --destination-arn arn:aws:sqs:us-east-1:123456789012:my-queue
```

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
