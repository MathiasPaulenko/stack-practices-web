---
contentType: patterns
slug: dead-letter-channel-pattern
title: "Patrón Dead Letter Channel"
description: "Rutar mensajes no procesables a una cola de mensajes muertos separada para inspeccion y replay. Evitar que mensajes venenosos bloqueen la cola principal indefinidamente."
metaDescription: "Rutar mensajes no procesables a una dead letter queue para inspeccion y replay. Evitar que mensajes venenosos bloqueen la cola principal indefinidamente."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - dead-letter-queue
  - patron
  - patron-diseno
  - poison-message
  - error-handling
  - message-queue
  - dlq
relatedResources:
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/message-deferral-pattern
  - /patterns/design/message-deduplication-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Rutar mensajes no procesables a una dead letter queue para inspeccion y replay. Evitar que mensajes venenosos bloqueen la cola principal indefinidamente."
  keywords:
    - patron dead letter queue
    - manejo poison message
    - dlq message queue
    - patron diseno
---

## Descripción General

Cuando un mensaje falla consistentemente en el procesamiento, reintentarlo para siempre bloquea al consumidor y desperdicia recursos. Esto se llama mensaje venenoso. El patron Dead Letter Channel rutea mensajes que exceden un umbral de reintentos a una cola separada (dead letter queue o DLQ) para inspeccion, debugging y replay manual o automatico posteriores.

## Cuándo Usar

- Los mensajes fallan repetidamente y no pueden procesarse (payload malformado, dependencias faltantes, estado invalido)
- Necesitas preservar mensajes fallidos para debugging y auditoria
- Quieres activar la cola principal para que los mensajes sanos continuen procesandose
- Necesitas reprocesar mensajes fallidos despues de corregir el problema subyacente

## Solución

### Python (SQS + boto3)

```python
import boto3
import json

sqs = boto3.client("sqs", endpoint_url="http://localhost:4566")  # LocalStack

MAIN_QUEUE_URL = "http://localhost:4566/000000000000/main-queue"
DLQ_URL = "http://localhost:4566/000000000000/dead-letter-queue"
MAX_RETRIES = 3

def process_message(message):
    body = json.loads(message["Body"])
    attempt = message.get("Attributes", {}).get("ApproximateReceiveCount", "1")
    attempt = int(attempt)

    try:
        result = handle_order(body)
        return result
    except Exception as e:
        if attempt >= MAX_RETRIES:
            # Mover a dead letter queue
            sqs.send_message(
                QueueUrl=DLQ_URL,
                MessageBody=message["Body"],
                MessageAttributes={
                    "failure_reason": {"StringValue": str(e), "DataType": "String"},
                    "original_queue": {"StringValue": MAIN_QUEUE_URL, "DataType": "String"},
                    "attempt_count": {"StringValue": str(attempt), "DataType": "Number"},
                },
            )
            print(f"Moved message {message['MessageId']} to DLQ after {attempt} attempts")
        else:
            # Dejar que SQS reentregue tras visibility timeout
            print(f"Attempt {attempt} failed: {e}. Will retry.")
        raise

def handle_order(body):
    if body.get("order_id") is None:
        raise ValueError("Missing order_id")
    print(f"Processing order {body['order_id']}")
    return {"status": "done"}
```

### JavaScript (RabbitMQ + amqplib)

```javascript
import amqp from "amqplib";

const MAX_RETRIES = 3;

async function setupQueues(channel) {
  // Dead letter exchange en cola principal
  await channel.assertExchange("dlx", "direct", { durable: true });
  await channel.assertQueue("main-queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dlx",
      "x-dead-letter-routing-key": "dead",
    },
  });
  await channel.assertQueue("dead-letter-queue", { durable: true });
  await channel.bindQueue("dead-letter-queue", "dlx", "dead");

  // Cola de retry con exponential backoff
  await channel.assertQueue("retry-queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": "main-queue",
      "x-message-ttl": 10000, // Delay de 10 segundos antes de retry
    },
  });
}

async function consume() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();
  await setupQueues(channel);

  channel.consume("main-queue", async (msg) => {
    if (!msg) return;

    const headers = msg.properties.headers || {};
    const retryCount = headers["x-retry-count"] || 0;

    try {
      const body = JSON.parse(msg.content.toString());
      if (!body.orderId) throw new Error("Missing orderId");
      console.log(`Processing order ${body.orderId}`);
      channel.ack(msg);
    } catch (err) {
      if (retryCount >= MAX_RETRIES) {
        // Rutar a dead letter queue
        console.log(`Moving to DLQ after ${retryCount} retries: ${err.message}`);
        channel.ack(msg); // Ack para remover de cola principal
        channel.publish("dlx", "dead", msg.content, {
          headers: {
            ...headers,
            "x-death-reason": err.message,
            "x-retry-count": retryCount,
          },
        });
      } else {
        // Rutar a cola de retry
        console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}: ${err.message}`);
        channel.ack(msg);
        channel.sendToQueue("retry-queue", msg.content, {
          headers: { "x-retry-count": retryCount + 1 },
        });
      }
    }
  });
}

consume();
```

### Java (Spring + RabbitMQ)

```java
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderConsumer {

    private final RabbitTemplate rabbitTemplate;
    private static final int MAX_RETRIES = 3;

    public OrderConsumer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = "main-queue")
    public void processOrder(Order order, Message message) {
        Integer retryCount = (Integer) message.getMessageProperties()
            .getHeader("x-retry-count");
        if (retryCount == null) retryCount = 0;

        try {
            if (order.getOrderId() == null) {
                throw new IllegalArgumentException("Missing orderId");
            }
            System.out.println("Processing order " + order.getOrderId());
        } catch (Exception e) {
            if (retryCount >= MAX_RETRIES) {
                System.out.println("Moving to DLQ: " + e.getMessage());
                rabbitTemplate.convertAndSend("dlx", "dead", order, m -> {
                    m.getMessageProperties().setHeader("x-death-reason", e.getMessage());
                    m.getMessageProperties().setHeader("x-retry-count", retryCount);
                    return m;
                });
            } else {
                System.out.println("Retry " + (retryCount + 1) + "/" + MAX_RETRIES);
                rabbitTemplate.convertAndSend("retry-queue", order, m -> {
                    m.getMessageProperties().setHeader("x-retry-count", retryCount + 1);
                    return m;
                });
            }
        }
    }
}
```

## Explicación

La dead letter queue es una cola separada que recibe mensajes que el consumidor no pudo procesar. El consumidor rastrea los intentos de retry. Despues de un umbral configurable (tipicamente 3-5 reintentos), en lugar de devolver el mensaje a la cola principal, el consumidor lo envia a la DLQ.

La DLQ sirve tres propositos:

1. **Desbloquea la cola principal**: Los mensajes venenosos ya no bloquean mensajes sanos
2. **Preserva evidencia**: Los mensajes fallidos se almacenan con metadata sobre la razon del fallo
3. **Habilita replay**: Despues de corregir el bug, puedes mover mensajes de la DLQ de vuelta a la cola principal

La mayoria de brokers soportan DLQs nativamente. SQS usa redrive policies. RabbitMQ usa dead letter exchanges. Kafka no tiene DLQs nativas pero puedes implementarlas con un topico separado.

## Variantes

| Variante | Mecanismo | Caso de Uso | Compromiso |
|----------|-----------|-------------|------------|
| **DLQ del Broker** | SQS redrive, RabbitMQ DLX | Soporte nativo del broker | Configuracion especifica del broker |
| **DLQ Aplicacion** | Envio manual a cola de errores | Control total, logica custom | Mas codigo, debes manejar el ruteo |
| **Topico DLQ** | Topico de errores Kafka | Entornos Kafka | Sin soporte nativo, implementacion manual |
| **Exponential Backoff + DLQ** | Retry con delay, luego DLQ | Fallos transitorios + permanentes | Mas complejo, maneja ambos casos |
| **DLQ Transaccional** | Transaccion DB con escritura DLQ | Exactly-once con manejo de errores | Mas lento, dependencia de DB |

## Qué Funciona

- Establece un umbral razonable de reintentos (3-5 intentos) antes de mover a DLQ
- Incluye metadata de fallo: mensaje de error, stack trace, timestamp original, conteo de reintentos
- Monitorea la profundidad de DLQ y alerta cuando aparecen mensajes
- Construye un mecanismo de replay para mover mensajes de DLQ a cola principal despues de corregir bugs
- Usa exponential backoff entre reintentos para manejar fallos transitorios
- Establece un TTL en mensajes de DLQ para evitar crecimiento sin limite del almacenamiento
- Registra cada transferencia a DLQ para auditoria

## Errores Comunes

- **Sin retry antes de DLQ**: Un solo fallo envia el mensaje a DLQ. Los fallos transitorios (caidas de red) deben reintentarse primero.
- **Reintentos infinitos sin DLQ**: El mensaje loop para siempre, bloqueando la cola. Siempre establece un maximo de reintentos.
- **No preservar mensaje original**: El mensaje de DLQ debe contener el payload original, no solo el error.
- **Sin monitoreo de DLQ**: Los mensajes se acumulan en la DLQ sin ser notados. Configura alarmas en la profundidad de DLQ.
- **Replay sin corregir**: Mover mensajes de vuelta a la cola principal sin corregir el bug causa que fallen de nuevo.
- **DLQ como basurero**: La DLQ es para inspeccion y replay, no almacenamiento permanente. Procesa o archiva mensajes regularmente.

## Preguntas Frecuentes

### ¿Cuántos reintentos antes de enviar a DLQ?

Tipicamente 3-5 para reintentos inmediatos. Con exponential backoff puedes ir mas alto (5-10) ya que los delays aumentan. El numero correcto depende de tu tolerancia a latencia vs. tu deseo de manejar fallos transitorios.

### ¿Debería usar DLQ nativa del broker o a nivel aplicación?

Nativa del broker (SQS redrive, RabbitMQ DLX) cuando sea posible — menos codigo y menos bugs. A nivel aplicación cuando necesitas logica custom (DLQ condicional segun tipo de error, diferentes DLQs para diferentes fallos).

### ¿Cómo hago replay de mensajes desde la DLQ?

Escribe una herramienta o endpoint admin que lea desde la DLQ y envie mensajes de vuelta a la cola principal. Incluye un flag o header para indicar que es replay para que el consumidor pueda saltar la deduplicacion si es necesario.

### ¿Qué pasa si la DLQ se llena?

Establece un TTL o politica de retencion en la DLQ. Para SQS, la retencion maxima es 14 dias. Para RabbitMQ, configura max-length o TTL en la cola. Archiva mensajes antiguos de DLQ a almacenamiento frio si es necesario.

### ¿Puedo tener diferentes DLQs para diferentes tipos de error?

Si. Rutea mensajes a diferentes DLQs segun el tipo de error (ej. `validation-errors` vs `infrastructure-errors`). Esto facilita el debugging y replay ya que puedes corregir un tipo de error y reprocesar solo esos mensajes.


## Temas Avanzados

### Escenario: Dead Letter Queue para Pagos Fallidos

```typescript
// DLQ: mensajes que fallan tras N retries van a una dead letter queue
// Arquitectura: Queue Principal -> Worker -> Retry Queue -> DLQ

// SQS: configurar redrive policy
const redrivePolicy = {
  deadLetterTargetArn: "arn:aws:sqs:us-east-1:123:payment-dlq",
  maxReceiveCount: "3",  // Tras 3 intentos fallidos -> DLQ
};

// Worker: procesar pagos con manejo de errores
async function processPaymentMessage(message: SQSMessage): Promise<void> {
  const payment = JSON.parse(message.Body);
  try {
    await processPayment(payment);
    await sqs.deleteMessage({
      QueueUrl: PAYMENT_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    }).promise();
  } catch (err) {
    // El mensaje vuelve a la queue tras visibility timeout
    // Tras maxReceiveCount, SQS lo mueve a DLQ automaticamente
    console.error(`Pago ${payment.id} fallido:`, err.message);
  }
}

// Consumidor de DLQ: investigar y reprocesar
async function processDLQ(): Promise<void> {
  const result = await sqs.receiveMessage({
    QueueUrl: PAYMENT_DLQ_URL,
    MaxNumberOfMessages: 10,
  }).promise();

  for (const msg of result.Messages || []) {
    const payment = JSON.parse(msg.Body);
    const error = JSON.parse(msg.MessageAttributes?.error?.StringValue || "{}");

    // Categorizar fallo
    if (error.type === "insufficient_funds") {
      await notifyCustomer(payment.customerId, "Pago fallido: fondos insuficientes");
    } else if (error.type === "card_declined") {
      await retryWithNewCard(payment);
    } else {
      await alertOpsTeam(payment, error);
    }

    // Archivar para auditoria
    await archiveFailedPayment(payment, error);
    await sqs.deleteMessage({ QueueUrl: PAYMENT_DLQ_URL, ReceiptHandle: msg.ReceiptHandle }).promise();
  }
}

// Monitoreo
  | Metrica | Objetivo | Alerta |
  |---------|----------|--------|
  | DLQ depth | 0 | > 10 |
  | DLQ age (mas viejo) | < 1h | > 4h |
  | Fallos en queue principal | < 1% | > 5% |
  | Exito de reproceso | > 80% | < 50% |
```

Lecciones:
  - DLQ aísla mensajes que fallan tras max retries
  - SQS mueve a DLQ automaticamente tras maxReceiveCount
  - El consumidor de DLQ investiga, categoriza y reprocesa
  - Algunos fallos son permanentes (tarjeta rechazada): notificar cliente
  - Algunos son transitorios (servicio caido): reprocesar tras fix
  - Siempre archivar mensajes de DLQ para auditoria
  - Monitorear DLQ depth: alertar si crece
```

### Como reproceso desde DLQ?

Mueve el mensaje de vuelta a la queue principal tras fixear el root cause. En SQS: leer de DLQ, enviar a queue principal, borrar de DLQ. Usa una herramienta o script: no reprocesar manualmente en produccion. Anade un contador de retries para evitar loops infinitos. Para fallos permanentes (datos invalidos), no reprocesar: archivar y notificar. Para fallos transitorios (servicio caido), reprocesar tras confirmar que el servicio esta saludable.
