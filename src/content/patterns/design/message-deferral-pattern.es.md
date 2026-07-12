---


contentType: patterns
slug: message-deferral-pattern
title: "Patrón Message Deferral"
description: "Retrasar el procesamiento de mensajes a un horario programado. Mover mensajes que no pueden procesarse ahora a una cola diferida o programarlos para entrega posterior."
metaDescription: "Retrasar procesamiento de mensajes a un horario programado. Mover mensajes a cola diferida o programarlos para entrega posterior cuando se cumplan condiciones."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - message-deferral
  - patron
  - patron-diseno
  - delayed-delivery
  - scheduling
  - retry
  - message-queue
relatedResources:
  - /patterns/message-queue-load-leveling-pattern
  - /patterns/dead-letter-channel-pattern
  - /patterns/message-deduplication-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Retrasar procesamiento de mensajes a un horario programado. Mover mensajes a cola diferida o programarlos para entrega posterior cuando se cumplan condiciones."
  keywords:
    - patron message deferral
    - entrega retrasada de mensajes
    - programar procesamiento de mensajes
    - patron diseno


---

## Descripción General

Algunos mensajes no pueden procesarse inmediatamente pero no deberian descartarse. Un mensaje puede depender de un recurso temporalmente no disponible, necesitar ejecutarse en un momento especifico (notificaciones programadas) o requerir un retraso antes de reintentar (exponential backoff). El patron Message Deferral mueve estos mensajes a un estado diferido y los entrega despues cuando se cumplen las condiciones o llega el horario programado.

## Cuándo Usar


- For alternatives, see [Dead Letter Channel Pattern](/es/patterns/dead-letter-channel-pattern/).

- Los mensajes dependen de recursos temporalmente no disponibles (mantenimiento de DB, APIs con rate limit)
- Necesitas entrega programada (enviar un recordatorio 24 horas despues del registro)
- Implementas retry con exponential backoff (reintentar en 5s, 30s, 2min)
- Los mensajes deben esperar una condicion (procesar orden solo despues de confirmar pago)

## Solución

### Python (Celery + Redis — countdown)

```python
from celery import Celery

app = Celery("tasks", broker="redis://localhost:6379", backend="redis://localhost:6379")

@app.task(bind=True, max_retries=5)
def process_payment(self, payment_id):
    try:
        result = charge_payment(payment_id)
        if result.status == "pending":
            # Diferir: reintentar en 30 segundos
            raise self.retry(countdown=30)
        return result
    except GatewayUnavailable as exc:
        # Exponential backoff: 5s, 10s, 20s, 40s, 80s
        retry_count = self.request.retries
        delay = 5 * (2 ** retry_count)
        raise self.retry(exc=exc, countdown=delay)

def charge_payment(payment_id):
    # Simular gateway no disponible
    raise GatewayUnavailable("Payment gateway down")

class GatewayUnavailable(Exception):
    pass

# Programar una notificacion 24 horas despues
@app.task
def send_reminder(user_id):
    print(f"Sending reminder to user {user_id}")

def schedule_reminder(user_id, delay_seconds=86400):
    send_reminder.apply_async(args=[user_id], countdown=delay_seconds)
```

### JavaScript (BullMQ — delayed jobs)

```javascript
import { Queue, Worker } from "bullmq";

const paymentQueue = new Queue("payments", {
  connection: { host: "localhost", port: 6379 },
});

// Programar un job con delay
async function schedulePaymentRetry(paymentId, delayMs) {
  await paymentQueue.add(
    "process-payment",
    { paymentId },
    { delay: delayMs } // BullMQ entrega despues del delay
  );
}

// Programar recordatorio 24 horas despues
async function scheduleReminder(userId, delayMs = 86400000) {
  await paymentQueue.add(
    "send-reminder",
    { userId },
    { delay: delayMs }
  );
}

const worker = new Worker(
  "payments",
  async (job) => {
    try {
      const result = await chargePayment(job.data.paymentId);
      return result;
    } catch (err) {
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const retryCount = job.attemptsMade;
      const delay = 5000 * Math.pow(2, retryCount);
      throw err; // BullMQ reintenta con config de backoff
    }
  },
  {
    connection: { host: "localhost", port: 6379 },
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  }
);

async function chargePayment(paymentId) {
  throw new Error("Payment gateway down");
}
```

### Java (RabbitMQ — dead letter exchange con TTL)

```java
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Component
public class DeferralHandler {

    private final RabbitTemplate rabbitTemplate;

    public DeferralHandler(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    // Cola diferida: los mensajes esperan aqui con TTL, luego se enrutan a la cola principal
    @Bean
    public Queue deferredQueue() {
        return QueueBuilder.durable("deferred-payments")
            .withArgument("x-dead-letter-exchange", "")
            .withArgument("x-dead-letter-routing-key", "payments")
            .withArgument("x-message-ttl", 30000) // Delay de 30 segundos
            .build();
    }

    // Diferir un mensaje: enviar a cola diferida, se ruteara de vuelta tras TTL
    public void deferPayment(Integer paymentId, int delayMs) {
        rabbitTemplate.convertAndSend(
            "deferred-payments",
            "payment." + paymentId,
            paymentId,
            message -> {
                message.getMessageProperties().setExpiration(String.valueOf(delayMs));
                return message;
            }
        );
        System.out.println("Deferred payment " + paymentId + " for " + delayMs + "ms");
    }

    // Procesar mensaje diferido cuando llega a la cola principal
    public void processPayment(Integer paymentId) {
        try {
            System.out.println("Processing deferred payment " + paymentId);
            // Logica de negocio
        } catch (Exception e) {
            // Re-diferir con delay mayor (exponential backoff)
            deferPayment(paymentId, 60000);
        }
    }
}
```

## Explicación

Hay tres enfoques principales para la diferencia de mensajes:

**Delay nativo del broker**: Algunos brokers soportan entrega retrasada directamente. BullMQ usa sorted sets de Redis para entregar mensajes despues de un delay. SQS tiene delay queues y message timers. Azure Service Bus soporta encolado programado.

**TTL + dead letter exchange**: RabbitMQ no soporta entrega retrasada nativamente, pero puedes simularla. Envia un mensaje a una cola con TTL por mensaje y un dead letter exchange. Cuando el TTL expira, RabbitMQ enruta el mensaje al dead letter exchange, que apunta a tu cola principal. El mensaje llega a la cola principal despues del delay.

**Programacion a nivel aplicacion**: El consumidor almacena el mensaje y un horario programado en una base de datos, luego un scheduler lo recoge cuando llega el momento. Es mas flexible pero anade complejidad.

## Variantes

| Variante | Mecanismo | Caso de Uso | Compromiso |
|----------|-----------|-------------|------------|
| **Delay del Broker** | SQS delay, BullMQ delay | Entrega programada simple | Precision limitada, dependiente del broker |
| **TTL + DLX** | RabbitMQ TTL + dead letter | Entornos RabbitMQ | Configuracion compleja, TTL por mensaje es costoso |
| **Almacen Programado** | DB + scheduler | Programacion precisa, entrega condicional | Mas infraestructura, overhead de polling |
| **Exponential Backoff** | Retry con delay creciente | Recuperacion de fallos transitorios | Los mensajes pueden esperar mucho tiempo |
| **Horario Fijo** | Disparador tipo cron | Tareas recurrentes | No orientado a mensajes, sistema separado |

## Qué Funciona

- Usa delay nativo del broker cuando este disponible (SQS, BullMQ, Azure Service Bus)
- Establece un maximo de reintentos para evitar loops de diferimiento infinitos
- Usa exponential backoff para fallos transitorios y evitar saturar el sistema
- Registra mensajes diferidos para visibilidad y debugging
- Monitorea la profundidad de la cola diferida — una cola diferida creciente indica problemas sistemicos
- Establece un tiempo maximo de diferimiento (ej. 24 horas) despues del cual los mensajes van a dead-letter

## Errores Comunes

- **Loops de diferimiento infinitos**: Un mensaje que siempre falla se difiere para siempre. Establece un maximo de reintentos y enruta a dead-letter despues.
- **TTL por mensaje en RabbitMQ**: RabbitMQ solo verifica la cabeza de la cola para expiracion de TTL. Un mensaje con TTL largo bloquea mensajes detras con TTLs mas cortos.
- **No rastrear mensajes diferidos**: Si el broker se reinicia, los mensajes diferidos pueden perderse. Usa colas durables y mensajes persistentes.
- **Diferir en lugar de corregir**: Si un mensaje siempre falla por un bug, diferir solo retrasa el problema. Corrige la causa raiz.
- **Diferir mensajes que deberían rechazarse**: Algunos mensajes son invalidos y nunca funcionaran. Rechazalos a una dead-letter queue en lugar de diferirlos.

## Preguntas Frecuentes

### ¿En qué se diferencia deferral de retry?

Retry es un mecanismo automatico donde el broker reentrega un mensaje fallido. Deferral es una decision explicita del consumidor de retrasar el procesamiento. Retry es reactivo, deferral es proactivo.

### ¿Cuál es el delay máximo que puedo establecer?

SQS soporta hasta 15 minutos por delay. BullMQ soporta delays arbitrarios. RabbitMQ TTL + DLX puede manejar cualquier delay pero con advertencias. Para delays muy largos (horas, dias), usa un almacen programado.

### ¿Debería usar una cola separada para mensajes diferidos?

Si, si usas RabbitMQ TTL + DLX. La cola diferida mantiene los mensajes durante el delay, y el dead letter exchange los enruta a la cola principal cuando el TTL expira.

### ¿Puedo cancelar un mensaje diferido?

Con delay nativo del broker (SQS, BullMQ), no puedes cancelar un mensaje una vez enviado. Con un almacen programado, puedes marcar el mensaje como cancelado antes de que el scheduler lo recoja.


## Temas Avanzados

### Escenario: Message Deferral para Reintentos con Delay

```typescript
// Message deferral: retrasar el procesamiento de un mensaje
// Caso: pago con tarjeta requiere espera de 30s antes de reintentar

// Usando Azure Service Bus deferred messages
async function deferPaymentVerification(messageId: string, delaySeconds: number) {
  const sender = serviceBusClient.createSender("payments");
  const message = {
    body: { messageId, retryCount: 0 },
    scheduledEnqueueTimeUtc: new Date(Date.now() + delaySeconds * 1000),
  };
  await sender.sendMessages(message);
}

// Usando SQS con delay queue
async function deferWithSQS(message: unknown, delaySeconds: number) {
  await sqs.sendMessage({
    QueueUrl: DELAY_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    DelaySeconds: Math.min(delaySeconds, 900), // max 15 min en SQS
  }).promise();
}

// Worker: procesar con logica de deferral
async function processWithDeferral(msg: PaymentMessage) {
  try {
    const result = await verifyPayment(msg.paymentId);
    if (result.status === "pending") {
      if (msg.retryCount < 5) {
        const delay = Math.pow(2, msg.retryCount) * 10; // 10s, 20s, 40s...
        await deferPaymentVerification(msg.id, delay);
        console.log(`Deferred ${msg.id} for ${delay}s (retry ${msg.retryCount + 1})`);
      } else {
        await moveToDLQ(msg, "Max retries exceeded");
      }
    } else {
      console.log(`Payment ${msg.paymentId} verified: ${result.status}`);
    }
  } catch (err) {
    if (msg.retryCount < 3) {
      await deferPaymentVerification(msg.id, 30);
    } else {
      await moveToDLQ(msg, err.message);
    }
  }
}

// Comparacion: deferral strategies
  | Estrategia | Implementacion | Max delay | Use case |
  |-------------|----------------|-----------|----------|
  | SQS DelaySeconds | SQS delay queue | 900s (15min) | Retries cortos |
  | SQS scheduled | Message timer | 900s | Retries con delay exacto |
  | EventBridge schedule | Cron/rate | Ilimitado | Schedules periodicos |
  | Service Bus deferred | Scheduled enqueue | Ilimitado | Azure nativo |
  | RabbitMQ DLX + TTL | Dead letter + TTL | Configurable | RabbitMQ |
```

Lecciones:
  - Deferral retrasa el procesamiento sin bloquear el worker
  - Backoff exponencial: 10s, 20s, 40s, 80s, 160s
  - Max 5 retries: despues va a DLQ
  - SQS DelaySeconds max 900s (15 min): para delays mayores, usar EventBridge
  - El worker no se bloquea esperando: el mensaje vuelve a la queue tras el delay
  - Idempotencia: el worker debe ser idempotente, el mensaje puede procesarse multiples veces
```

### Como garantizo idempotencia con deferral?

Usa un id unico (messageId) y un store (Redis/DB) para trackear el estado. Antes de procesar, verifica si ya se proceso: si result.status === "completed", skip. Si "processing", esperar o skip. Usa optimistic locking: UPDATE messages SET status=processing WHERE id=X AND status=pending. Si affected_rows=0, alguien mas lo proceso. Idempotencia es obligatoria en sistemas distribuidos: el mismo mensaje puede entregarse 1+ veces.
