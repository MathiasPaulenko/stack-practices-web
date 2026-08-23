---
contentType: patterns
slug: queue-based-load-leveling-pattern
title: "Patrón de Nivelación de Carga Basada en Colas: Suaviza Picos con Colas"
description: "Usá Queue-Based Load Leveling para desacoplar productores y consumidores, absorber picos y procesar trabajo constante. Ejemplos en Python, Java y JavaScript."
metaDescription: "Usá Queue-Based Load Leveling para desacoplar productores y consumidores, absorber picos y procesar trabajo constante. Ejemplos en Python, Java y JavaScript."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - design-pattern
  - messaging
  - queue
  - load-leveling
  - backpressure
  - decoupling
  - architecture
relatedResources:
  - /patterns/priority-queue-pattern
  - /patterns/throttling-pattern
  - /patterns/back-pressure-pattern
  - /patterns/sequential-convoy-pattern
  - /patterns/claim-check-pattern
  - /patterns/scheduler-agent-supervisor-pattern
lastUpdated: "2026-08-23"
publishedAt: "2026-06-26"
author: Mathias Paulenko
seo:
  metaDescription: "Usá Queue-Based Load Leveling para desacoplar productores y consumidores, absorber picos y procesar trabajo constante. Ejemplos en Python, Java y JavaScript."
  keywords:
    - nivelacion de carga basada en colas
    - patron de diseno
    - mensajeria
    - cola
    - nivelacion de carga
    - backpressure
    - desacoplamiento
---

## Descripción General

Queue-Based Load Leveling mete una cola de mensajes entre productores y consumidores de trabajo. En vez de que los
productores llamen a los consumidores directamente, los productores ponen las tareas en una cola
y los consumidores las extraen a un ritmo constante.

Este desacoplamiento convierte cargas de trabajo impredecibles y con ráfagas en un flujo suave. La cola actúa como
amortiguador: cuando el tráfico pica, los mensajes se acumulan en lugar de colapsar al consumidor.
Cuando baja el tráfico, la cola se vacía y el sistema puede reducir recursos.

Vas a encontrar este patrón detrás de procesadores de trabajos en segundo plano, microservicios orientados a eventos
y sistemas de triggers serverless.

## Cuándo Usarlo

Usalo cuando los productores generen trabajo más rápido de lo que los consumidores pueden procesar durante picos, o
cuando los servicios aguas abajo tengan límites de tasa o restricciones de capacidad. También encaja cuando el
trabajo puede diferirse, cuando necesitás que productores y consumidores sean independientes, cuando el tráfico es
muy variable y cuando construís arquitecturas serverless o auto-escalables que ajustan capacidad según la
profundidad de la cola.

## Cuándo Evitarlo

Evitalo cuando el usuario espere una respuesta sincrónica, porque encolar agrega latencia. Saltéalo si la cola
podría crecer sin límite y desbordarse, o si el orden de los mensajes es crítico y la cola no puede garantizar FIFO.
Tampoco sirve cuando el costo de serialización de la cola supera las llamadas directas, o cuando incluso un
milisegundo de latencia de cola es demasiado.

## Solución

### Python (Celery con Redis)

```python
from celery import Celery
import time

app = Celery('tasks')
app.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_default_rate_limit='100/m',
)

@app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_image(self, image_url, filters):
    try:
        print(f"Processing {image_url} with filters: {filters}")
        time.sleep(2)
        call_external_api(image_url)
        return {"status": "success", "url": image_url}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@app.task(rate_limit='10/m')
def generate_report(report_type, date_range):
    print(f"Generating {report_type} report for {date_range}")
    time.sleep(5)
    return {"report_id": f"{report_type}-{date_range}", "status": "completed"}

def call_external_api(image_url):
    pass

class ImageUploadService:
    def handle_upload(self, image_urls, filters):
        task_ids = []
        for url in image_urls:
            result = process_image.delay(url, filters)
            task_ids.append(result.id)

        return {
            "message": f"Queued {len(image_urls)} images for processing",
            "task_ids": task_ids,
        }
```

### Java (Spring con RabbitMQ)

```java
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

@Configuration
class QueueConfig {

    @Bean
    Queue taskQueue() {
        return QueueBuilder.durable("task-queue")
            .withArgument("x-max-length", 10000)
            .withArgument("x-overflow", "reject-publish")
            .withArgument("x-message-ttl", 3600000)
            .build();
    }

    @Bean
    DirectExchange exchange() {
        return new DirectExchange("task-exchange");
    }

    @Bean
    Binding binding(Queue queue, DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("task.routing.key");
    }
}

@RestController
class TaskController {

    private final RabbitTemplate rabbitTemplate;

    public TaskController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/tasks")
    public String enqueueTask(@RequestBody TaskRequest request) {
        rabbitTemplate.convertAndSend(
            "task-exchange",
            "task.routing.key",
            request
        );
        return "Task queued successfully";
    }
}

@Service
class TaskConsumer {

    @RabbitListener(queues = "task-queue",
                    concurrency = "4-8",
                    containerFactory = "rabbitListenerContainerFactory")
    public void processTask(TaskRequest task) {
        System.out.println("Processing task: " + task.getId());

        try {
            process(task);
        } catch (Exception e) {
            throw new AmqpRejectAndDontRequeueException("Failed: " + e.getMessage());
        }
    }

    private void process(TaskRequest task) {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

class TaskRequest {
    private String id;
    private String type;
    private Object payload;
}
```

### JavaScript (BullMQ con Redis)

```javascript
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({ maxRetriesPerRequest: null });

const taskQueue = new Queue('tasks', { connection });

const worker = new Worker('tasks', async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    switch (job.name) {
        case 'send-email':
            return await sendEmail(job.data);
        case 'process-payment':
            return await processPayment(job.data);
        case 'generate-report':
            return await generateReport(job.data);
        default:
            throw new Error(`Unknown job type: ${job.name}`);
    }
}, {
    connection,
    concurrency: 5,
    limiter: {
        max: 50,
        duration: 60000,
    },
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

class TaskProducer {
    async enqueueEmail(emailData) {
        return await taskQueue.add('send-email', emailData, {
            priority: 2,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
        });
    }

    async enqueuePayment(paymentData) {
        return await taskQueue.add('process-payment', paymentData, {
            priority: 1,
            attempts: 5,
            backoff: { type: 'fixed', delay: 5000 },
        });
    }

    async enqueueReport(reportData) {
        return await taskQueue.add('generate-report', reportData, {
            priority: 3,
            delay: 60000,
            attempts: 2,
        });
    }

    async getQueueStatus() {
        const waiting = await taskQueue.getWaitingCount();
        const active = await taskQueue.getActiveCount();
        const completed = await taskQueue.getCompletedCount();
        const failed = await taskQueue.getFailedCount();

        return { waiting, active, completed, failed };
    }
}

process.on('SIGTERM', async () => {
    await worker.close();
    await taskQueue.close();
    await connection.quit();
});

module.exports = { TaskProducer, taskQueue };
```

## Explicación

La cola se mete entre productores y consumidores y absorbe las ráfagas. Cuando llegan 10,000 solicitudes en un
segundo, los consumidores siguen procesando a su ritmo mientras los mensajes se acumulan. Cuando la profundidad de
la cola cruza un umbral, el auto-escalamiento agrega más consumidores; cuando la cola se vacía, se reduce.

Los productores no esperan porque solo encolan y siguen. Si un consumidor falla, los mensajes permanecen en la cola
y el procesamiento se reanuda cuando vuelve.

La idea clave es cambiar una pequeña latencia predecible por throughput predecible y resiliencia.

## Variantes

Para comunicación de un solo proceso con baja latencia, usá colas en memoria como `BlockingQueue` o canales.
RabbitMQ o ActiveMQ son brokers de mensajes para sistemas distribuidos con entrega garantizada. SQS, Azure Queue y
Pub/Sub son colas en la nube ideales para serverless e infraestructura gestionada. Kafka o Kinesis son streams que
soportan event sourcing y reproducción. Celery, BullMQ y Hangfire son colas de tareas: agregan programación de
trabajos, reintentos y seguimiento de resultados.

## Mejores Prácticas

Poné un límite a la profundidad de la cola. Las colas sin límite esconden problemas y consumen memoria, así que
definí una longitud máxima y un comportamiento de desbordamiento como rechazar, dead-letter o descartar. Monitoreá
la
profundidad continuamente; una cola en crecimiento es la señal más clara de que necesitás más consumidores. Usá
dead-letter queues para aislar mensajes fallidos en lugar de bloquear la línea. Implementá
backpressure para que, cuando la cola esté llena, el upstream reciba un `503 Service Unavailable` y pueda reducir la
carga. Establecé un TTL para que el trabajo viejo expire en lugar de procesarse.

## Errores Comunes

Las colas sin límite eventualmente agotan la memoria y caen al broker. Un solo mensaje envenenado puede bloquear la
cola si no lo movés a una dead-letter queue. Asumir FIFO sin verificar rompe las garantías de orden. Ignorar las
alarmas de profundidad convierte al backlog en una caída. Encolar sincrónicamente desde los productores mata el
beneficio del desacoplamiento.

## Preguntas Frecuentes

### ¿En qué se diferencia del patrón Back-Pressure?

El back-pressure le avisa aguas arriba que reduzca la velocidad. La nivelación de carga recibe todo el trabajo y lo
deja en buffer. Podés combinarlos: una cola llena señala backpressure mientras sigue absorbiendo ráfagas
aceptables.

### ¿Qué tecnología de cola debería usar?

Usá colas en memoria para aplicaciones de un solo proceso, Redis para simplicidad, RabbitMQ para enrutamiento
complejo, Kafka para event sourcing y reproducción, y colas nativas en la nube como SQS o Pub/Sub para
infraestructura gestionada.

### ¿Cómo evito que la cola crezca para siempre?

Definí límites de longitud máxima, TTL y auto-escalamiento. Exponé métricas de profundidad de cola y alertá antes
del desbordamiento.

### ¿La nivelación de carga aumenta la latencia?

Sí. Las tareas pasan tiempo en la cola antes de procesarse. El trade-off es latencia predecible bajo carga en vez de
fallos impredecibles sin cola. Para caminos sensibles a la latencia, mantené un fast path separado o reservá capacidad.

### ¿Puedo usar nivelación de carga con APIs sincrónicas?

Sí. Aceptá la solicitud de forma sincrónica, encolá el trabajo y devolvé un job ID. El cliente consulta estado o
usa webhooks para ver cuándo terminó. Este es el patrón de uso para operaciones de larga duración.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes puede agregar complejidad innecesaria. Empezá simple y agregalo
cuando sientas el problema que resuelve.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos empiezan con la idea central y agregan límites de profundidad, dead-letter queues y
auto-escalamiento a medida que los necesitan.
