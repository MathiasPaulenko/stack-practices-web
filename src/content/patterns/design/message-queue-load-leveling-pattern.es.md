---
contentType: patterns
slug: message-queue-load-leveling-pattern
title: "Patrón Message Queue Load Leveling"
description: "Suavizar picos de trafico colocando una cola entre el productor y el consumidor. El productor escribe mensajes a cualquier ritmo; el consumidor los procesa a un ritmo constante."
metaDescription: "Suavizar picos de trafico con una cola entre productor y consumidor. Los productores escriben a cualquier ritmo; los consumidores procesan a ritmo controlado."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - load-leveling
  - patron
  - patron-diseno
  - message-queue
  - traffic-smoothing
  - async-processing
  - backpressure
relatedResources:
  - /patterns/design/priority-queue-pattern
  - /patterns/design/publish-subscribe-pattern
  - /patterns/design/dead-letter-channel-pattern
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Suavizar picos de trafico con una cola entre productor y consumidor. Los productores escriben a cualquier ritmo; los consumidores procesan a ritmo controlado."
  keywords:
    - message queue load leveling
    - cola suavizado trafico
    - patron async processing
    - patron diseno
---

## Descripción General

Cuando un servicio recibe trafico irregular, puede saturar sistemas descendentes que no estan disenados para picos. Una base de datos puede manejar 50 consultas por segundo de forma constante pero fallar a 500 consultas por segundo en un pico. El patron Message Queue Load Leveling coloca una cola entre el productor y el consumidor para que el productor escriba mensajes a cualquier ritmo mientras el consumidor los procesa a un ritmo controlado y constante.

## Cuándo Usar

- El trafico hacia un sistema descendente es irregular y el sistema no maneja picos
- Necesitas desacoplar la tasa de peticiones de la tasa de procesamiento
- Las tareas no son sensibles al tiempo (los usuarios no necesitan respuestas inmediatas)
- Quieres escalar consumidores independientemente de los productores
- Trabajos en segundo plano como generacion de reportes, envio de emails o procesamiento de archivos
- Necesitas entrega confiable — los mensajes persisten en la cola incluso si el consumidor esta temporalmente offline

## Cuándo Evitar

- **Requests de usuario en tiempo real.** Load leveling anade latencia de cola. Si el usuario espera respuesta, procesa sincrono.
- **Orden estricto entre todos los mensajes.** Multiples consumidores rompen el orden. Usa un consumidor unico o el patron Sequential Convoy.
- **Trafico bajo sin picos.** Si el trafico es consistentemente bajo, la cola anade complejidad sin beneficio.
- **Los mensajes deben procesarse en una ventana de tiempo especifica.** Los delays de cola pueden causar que los mensajes pierdan su deadline.
- **No puedes tolerar procesamiento duplicado.** Las colas pueden reentregar. Si la idempotencia es imposible, usa una arquitectura diferente.

## Solución

### Python (Celery + Redis)

```python
from celery import Celery
import time

app = Celery("tasks", broker="redis://localhost:6379", backend="redis://localhost:6379")

# El consumidor procesa una tarea a la vez a su propio ritmo
@app.task(bind=True, max_retries=3)
def process_order(self, order_id):
    try:
        # Simular procesamiento lento (escrituras DB, llamadas API)
        time.sleep(2)
        print(f"Processed order {order_id}")
        return {"status": "done", "order_id": order_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)

# El productor encola a cualquier ritmo
def submit_orders(order_ids):
    for order_id in order_ids:
        process_order.delay(order_id)
    print(f"Enqueued {len(order_ids)} orders")

# Pico: 1000 ordenes enviadas al instante
# El consumidor las procesa 1 a la vez cada 2 segundos
submit_orders(range(1000))
```

### JavaScript (BullMQ + Redis)

```javascript
import { Queue, Worker } from "bullmq";

const orderQueue = new Queue("orders", {
  connection: { host: "localhost", port: 6379 },
});

// Productor: encolar a cualquier ritmo
async function submitOrders(orderIds) {
  const jobs = orderIds.map((id) => ({
    name: "process-order",
    data: { orderId: id },
  }));
  await orderQueue.addBulk(jobs);
  console.log(`Enqueued ${orderIds.length} orders`);
}

// Consumidor: procesar a ritmo controlado
const worker = new Worker(
  "orders",
  async (job) => {
    // Simular procesamiento lento
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`Processed order ${job.data.orderId}`);
    return { status: "done", orderId: job.data.orderId };
  },
  {
    connection: { host: "localhost", port: 6379 },
    concurrency: 1, // Procesar una a la vez
    limiter: { max: 1, duration: 2000 }, // Max 1 job cada 2 segundos
  }
);

// Pico: 1000 ordenes enviadas al instante
await submitOrders(Array.from({ length: 1000 }, (_, i) => i));
```

### Java (RabbitMQ + Spring AMQP)

```java
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class OrderProcessor {

    private final RabbitTemplate rabbitTemplate;

    public OrderProcessor(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    // Productor: enviar a cualquier ritmo
    public void submitOrders(List<Integer> orderIds) {
        for (Integer orderId : orderIds) {
            rabbitTemplate.convertAndSend("orders", "order." + orderId, orderId);
        }
        System.out.println("Enqueued " + orderIds.size() + " orders");
    }

    // Consumidor: procesar una a la vez
    @RabbitListener(queues = "orders", concurrency = "1")
    public void processOrder(Integer orderId) {
        try {
            Thread.sleep(2000); // Simular procesamiento lento
            System.out.println("Processed order " + orderId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## Explicación

La cola actua como buffer entre productor y consumidor. El productor empuja mensajes a la cola tan rapido como puede. El consumidor extrae mensajes a un ritmo que puede manejar. Si el productor envia 1000 mensajes en un segundo pero el consumidor procesa 1 cada 2 segundos, la cola crece a 1000 mensajes y se vacia lentamente en 2000 segundos.

Esto protege al sistema descendente de saturarse. La contrapartida es latencia: los mensajes esperan en la cola hasta que el consumidor puede procesarlos. Para cargas sensibles al tiempo, aumenta la concurrencia del consumidor o usa el patron Priority Queue.

## Variantes

| Variante | Tipo de Cola | Caso de Uso | Compromiso |
|----------|-------------|-------------|------------|
| **Consumidor Unico** | Cola FIFO | Orden estricto, simple | Throughput lento |
| **Multiples Consumidores** | Cola FIFO | Mayor throughput | Sin garantia de orden |
| **Cola de Prioridad** | Cola prioritaria | Algunos mensajes son urgentes | Complejidad en logica de prioridad |
| **Retardo Programado** | Cola con delay | Procesar en momentos especificos | Los mensajes esperan hasta el horario |
| **Procesamiento por Lotes** | Consumidor batch | Agrupar mensajes para eficiencia | Mayor latencia por mensaje |

## Qué Funciona

- Dimensiona la cola segun el volumen de pico esperado y la tasa de procesamiento del consumidor
- Monitorea la profundidad de cola y alerta cuando crece mas alla de un umbral
- Escala consumidores horizontalmente cuando la profundidad es consistentemente alta
- Usa dead-letter queues para mensajes que fallan tras maximos reintentos
- Establece visibility timeouts para evitar doble procesamiento si un consumidor cae
- Usa consumidores idempotentes para manejar entregas duplicadas de forma segura

## Errores Comunes

- **Sin monitoreo de profundidad de cola**: Una cola creciente significa que los consumidores no dan abasto. Sin monitoreo, te enteras cuando la cola se queda sin almacenamiento.
- **Consumidor muy lento para trafico sostenido**: Load leveling maneja picos, no sobrecarga sostenida. Si la tasa promedio de produccion excede la de consumo, la cola crece infinitamente.
- **No manejar mensajes venenosos**: Un mensaje que siempre falla bloquea al consumidor. Usa una dead-letter queue despues de N reintentos.
- **Productor sincrono esperando al consumidor**: Derrota el proposito. El productor debe fire-and-forget.
- **Ignorar el orden de mensajes**: Si el orden importa, se necesita un consumidor unico o estrategia de particion. Multiples consumidores rompen el orden.

## Como Funciona

1. **El productor escribe a la cola**: El productor envia mensajes a la cola sin esperar al consumidor. La cola acusa recibo inmediatamente.
2. **La cola bufferiza mensajes**: Los mensajes persisten en la cola hasta que un consumidor esta disponible. La cola garantiza entrega incluso si el consumidor esta offline.
3. **El consumidor tira a su ritmo**: El consumidor lee mensajes uno a uno (o en lotes) a una tasa que puede manejar. El tiempo de procesamiento por mensaje determina el throughput efectivo.
4. **Acknowledgment cierra el ciclo**: Tras procesar, el consumidor acusa recibo del mensaje. Si el consumidor cae antes de acusar, el broker reentrega el mensaje a otro consumidor.

El insight clave es **desacoplamiento de tasas**: la tasa del productor y la del consumidor son independientes. La cola absorbe la diferencia durante picos.

## Mejores Practicas

- **Establece alerta de profundidad maxima.** Cuando la profundidad excede 80% de capacidad, dispara una alerta. Te da tiempo para escalar consumidores antes de que la cola se llene.
- **Usa backoff exponencial para reintentos.** Si un mensaje falla, reintenta con delays crecientes (1s, 2s, 4s, 8s). Previene que tormentas de reintentos saturen al consumidor.
- **Separa colas por prioridad.** Usa la variante Priority Queue para mensajes urgentes. Una cola unica trata todos los mensajes igual.
- **Consumidores idempotentes.** Los brokers pueden reentregar mensajes. Disena consumidores para que procesar el mismo mensaje dos veces produzca el mismo resultado.
- **Dimensiona consumidores para carga sostenida, no pico.** Si el pico es 10x el promedio, dimensionar para pico desperdicia recursos. Dimensiona para promedio + 20% de margen y deja que la cola absorba picos.

## Ejemplos del Mundo Real

### Amazon SQS + Lambda

Una plataforma de e-commerce usa SQS para bufferizar mensajes de pedidos durante Black Friday. Los pedidos llegan a 50,000/s pero el backend de procesamiento de pagos maneja 5,000/s. SQS bufferiza el pico. Funciones Lambda consumen a 5,000/s con concurrencia controlada. La cola se vacia en 10 segundos despues del burst.

### RabbitMQ en Sistemas Financieros

Una plataforma de trading recibe bursts de datos de mercado al abrir. Las colas de RabbitMQ bufferizan el burst mientras el servicio de analitica procesa a ritmo constante. Sin load leveling, el servicio de analitica caeria bajo el burst de apertura.

### Azure Service Bus para IoT

Una plataforma IoT recolecta telemetria de millones de dispositivos. Los mensajes llegan en bursts cuando los dispositivos se reconectan tras cortes de red. Las colas de Service Bus bufferizan los bursts mientras los servicios backend procesan a tasa controlada, previniendo sobrecarga de base de datos.

## Preguntas Frecuentes

**P: En que se diferencia del patron Producer-Consumer?**
R: Load Leveling se centra en suavizar picos de trafico mediante buffer en cola. Producer-Consumer es un patron general de concurrencia para dividir trabajo. Load Leveling es una aplicacion especifica con enfasis en desacoplamiento de tasas.

**P: Que pasa si la cola crece demasiado?**
R: Necesitas escalar consumidores, shed load (descartar mensajes de baja prioridad) o implementar backpressure para ralentizar al productor. Monitorea la profundidad y configura alertas.

**P: Deberia usar un servicio de cola administrado o auto-alojado?**
R: Servicios administrados (SQS, Azure Service Bus, Cloud Pub/Sub) manejan escalado, durabilidad y monitoreo. Auto-alojado (RabbitMQ, Redis) da mas control pero requiere ops. Para la mayoria, administrado es la opcion correcta.

**P: Puedo usar esto con funciones serverless?**
R: Si. SQS dispara Lambda, que actua como consumidor. Lambda escala automaticamente segun la profundidad de cola, pero puedes controlar la concurrencia para proteger sistemas descendentes.

**P: Como elijo el tamano correcto de cola?**
R: Estima tu volumen de pico y divide por la tasa de procesamiento del consumidor. Si el pico es 10,000 mensajes y los consumidores procesan 100/s, la cola necesita contener 10,000 mensajes. Agrega un margen de seguridad de 2x. Monitorea la profundidad real para ajustar.

**P: Cual es la diferencia entre load leveling y rate limiting?**
R: Rate limiting rechaza requests sobre un umbral. Load leveling los encola para procesamiento posterior. Rate limiting protege descartando trabajo; load leveling protege bufferizandolo. Usa rate limiting cuando el trabajo es prescindible, load leveling cuando debe hacerse.

**P: Como manejo el orden de mensajes con multiples consumidores?**
R: Multiples consumidores rompen el orden. Si el orden importa, usa un consumidor unico o particiona mensajes por clave (como partition keys de Kafka). Cada particion tiene un consumidor, preservando el orden dentro de esa particion.

**P: Que monitoreo deberia tener para load leveling?**
R: Rastrea profundidad de cola, throughput del consumidor, edad del mensaje (tiempo en cola), tasa de error, y profundidad de dead-letter queue. Alerta sobre: profundidad sobre umbral, edad del mensaje excediendo SLA, picos de tasa de error, y crecimiento sostenido de cola.

**P: Puedo usar este patron para requests de usuario en tiempo real?**
R: No. Load leveling anade latencia por diseno. Para requests en tiempo real donde los usuarios esperan respuesta, usa procesamiento sincrono con circuit breakers y timeouts. Load leveling es para tareas en segundo plano.

**P: Como implemento backpressure del consumidor al productor?**
R: Cuando la profundidad de cola excede un umbral, el consumidor envia una senal al productor. Opciones: HTTP 429 (Too Many Requests), un flag compartido en Redis, o un mensaje en una cola de control. El productor se ralentiza o detiene hasta que la senal se despeja.

**P: Que pasa si la cola misma falla?**
R: El productor no puede encolar mensajes. Opciones: (1) fallar rapido y retornar errores a usuarios, (2) caer a procesamiento sincrono, (3) bufferizar localmente y reintentar. Usa un servicio de cola administrado con replicacion multi-AZ para minimizar este riesgo.

**P: Como testeo load leveling?**
R: Envia una rafaga de mensajes y verifica que la cola crece. Comprueba que los consumidores procesan a la tasa configurada. Verifica que la cola se vacia despues de la rafaga. Testea fallos del consumidor y confirma que los mensajes se reentregan. Load test con volumenes realistas.

**P: Deberia usar una cola unica o multiples colas?**
R: Usa colas separadas para diferentes tipos de mensajes (pedidos, notificaciones, reportes). Esto permite escalar consumidores independientemente y previene que un tipo de mensaje bloquee a otros. Usa una cola unica solo cuando todos los mensajes tienen los mismos requisitos de procesamiento.

**P: Como manejo consumidores lentos que bloquean la cola?**
R: Establece un visibility timeout para que el broker reentregue el mensaje a otro consumidor si el original es muy lento. Usa una dead-letter queue para mensajes que exceden max reintentos. Monitorea el tiempo de procesamiento del consumidor y escala horizontalmente si es consistentemente lento.

**P: Cual es la diferencia entre cola y topic?**
R: Una cola entrega cada mensaje a un consumidor (point-to-point). Un topic entrega cada mensaje a todos los suscriptores (publish-subscribe). Usa cola para load leveling (distribucion de trabajo). Usa topic para notificacion de eventos (broadcast).

**P: Como manejo la expiracion de mensajes?**
R: Establece un TTL en los mensajes. Si un mensaje permanece en la cola mas que su TTL, el broker lo descarta o lo mueve a dead-letter queue. Esto previene que mensajes stale se procesen despues de que ya no son relevantes.

**P: Puedo batchear mensajes para eficiencia?**
R: Si. Los consumidores batch fetch multiples mensajes a la vez, los procesan juntos, y acusan recibo como lote. Esto reduce overhead por mensaje. SQS soporta `MaxNumberOfMessages` (hasta 10). RabbitMQ soporta prefetch counts. Batching aumenta la latencia por mensaje individual.

**P: Como manejo el graceful shutdown del consumidor?**
R: Deja de aceptar mensajes nuevos, termina de procesar el mensaje actual, acusa recibo, luego cierra la conexion. La mayoria de librerias de broker soportan graceful shutdown via metodos `close()`. Usa handlers SIGTERM en contenedores para disparar graceful shutdown antes de SIGKILL.

**P: Que es un poison message y como lo manejo?**
R: Un poison message siempre falla el procesamiento — los datos estan malformados o el sistema descendente los rechaza. Sin manejo, bloquea al consumidor indefinidamente. Muevelo a dead-letter queue despues de N reintentos, loggea el payload para debug, y alerta al equipo.

**P: Como elijo entre SQS, RabbitMQ y Kafka?**
R: SQS: administrado, simple, sin garantias de orden en colas estandar. RabbitMQ: enrutamiento flexible, colas de prioridad, self-hosted o administrado. Kafka: alto throughput, ordenamiento por particion, event streaming. Para load leveling simple, SQS o RabbitMQ. Para streaming con orden, Kafka.

**P: Como manejo el orden de mensajes con colas particionadas?**
R: Particiona mensajes por una clave (ej., ID de cliente). Todos los mensajes con la misma clave van a la misma particion y los procesa un solo consumidor en orden. Kafka soporta esto nativamente con partition keys. SQS FIFO soporta message groups. RabbitMQ soporta single-active consumer por cola.

**P: Cual es el periodo maximo de retencion de cola?**
R: SQS: 14 dias max. RabbitMQ: TTL configurable por cola. Kafka: retencion configurable por topic (default 7 dias). Establece la retencion de cola para exceder tu maximo delay de procesamiento aceptable. Si los mensajes expiran antes de procesarse, se pierden o se mueven a dead-letter queue.

**P: Como implemento load leveling sin un message broker?**
R: Usa una tabla de base de datos como cola: inserta filas para mensajes, los consumidores seleccionan y borran filas. Es mas lento que un broker real pero funciona para sistemas de bajo throughput. Para mayor throughput, usa listas de Redis con `LPUSH`/`BRPOP` como cola ligera.

**P: Como monitoreo la salud de la cola en produccion?**
R: Rastrea profundidad de cola, consumer lag, edad de mensaje, throughput, tasa de error y tamano de dead-letter queue. Configura dashboards con estas metricas. Alerta sobre: profundidad de cola creciendo, edad de mensaje excediendo SLA, tasa de error sobre 5%, y dead-letter queue recibiendo mensajes. Usa CloudWatch (SQS), RabbitMQ Management plugin, o metricas de consumer lag de Kafka.
