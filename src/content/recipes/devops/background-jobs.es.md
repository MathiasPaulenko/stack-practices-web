---
contentType: recipes
slug: background-jobs
title: "Tareas en Segundo Plano (Background Jobs)"
description: "Cómo programar y ejecutar tareas en segundo plano usando cron, colas de trabajo y workers."
metaDescription: "Aprende a programar tareas en segundo plano en Python, JavaScript y Java. Cubre cron, Celery, BullMQ y ScheduledExecutorService."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
relatedResources:
  - /recipes/cron-jobs
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /patterns/command-pattern
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a programar tareas en segundo plano en Python, JavaScript y Java. Cubre cron, Celery, BullMQ y ScheduledExecutorService."
  keywords:
    - tareas segundo plano cron
    - colas trabajo celery
    - bullmq javascript queue
    - scheduled executor java
    - workers redis tasks
---
## Visión General

Las tareas en segundo plano descargan trabajo lento o no crítico del ciclo de petición/respuesta. Enviar emails, generar reportes, procesar imágenes o sincronizar con APIs de terceros nunca deberían bloquear una petición HTTP del usuario. Esta receta implementa colas de tareas, programación con cron y patrones de workers en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Envíes emails o SMS que pueden esperar unos segundos. Consulta [Email Templates MJML](/recipes/frontend/email-templates-mjml) para generación de contenido de email.
- Generes exportaciones, reportes o PDFs que toman >1s. Consulta [Generate PDFs](/recipes/file-handling/generate-pdfs) para generación de documentos.
- Proceses imágenes, videos o documentos subidos por usuarios. Consulta [Image Optimization](/recipes/file-handling/image-optimization) para procesamiento de media.
- Sincronices datos con APIs externas según un horario. Consulta [Call REST API](/recipes/api/call-rest-api) para patrones de clientes API.
- Agregues análisis o ejecutes tareas de limpieza nocturnas. Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para tareas cron serverless.

## Solución

### Python (Celery + Redis)

```python
from celery import Celery
from celery.schedules import crontab

app = Celery("tasks", broker="redis://localhost:6379/0", backend="redis://localhost:6379/0")

@app.task(bind=True, max_retries=3)
def send_email(self, to, subject, body):
    try:
        print(f"Sending email to {to}")
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

@app.task
def generate_report(user_id):
    print(f"Generating report for user {user_id}")
    return f"/reports/{user_id}.pdf"

# Programar tareas periódicas
app.conf.beat_schedule = {
    "daily-cleanup": {
        "task": "tasks.cleanup_old_logs",
        "schedule": crontab(hour=2, minute=0),
    },
}

# Encolar desde la app web
send_email.delay("alice@example.com", "Welcome", "Hello!")
```

### JavaScript (BullMQ + Redis)

```javascript
const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({ host: "localhost", port: 6379, maxRetriesPerRequest: null });

const emailQueue = new Queue("emails", { connection });

const worker = new Worker("emails", async (job) => {
  const { to, subject, body } = job.data;
  console.log(`Sending email to ${to}`);
  return { sent: true };
}, { connection });

// Agregar trabajo desde una ruta de API
async function enqueueEmail(to, subject, body) {
  await emailQueue.add("send-email", { to, subject, body }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

// Cron job con BullMQ
const cronQueue = new Queue("cron", { connection });
await cronQueue.add("cleanup", {}, { repeat: { cron: "0 2 * * *" } });
```

### Java (ScheduledExecutorService + Spring @Scheduled)

```java
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

@Service
public class JobService {

    // Cron job: corre todos los días a las 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldLogs() {
        System.out.println("Running nightly cleanup");
    }

    // Fixed rate: corre cada 5 minutos
    @Scheduled(fixedRate = 300_000)
    public void syncExternalData() {
        System.out.println("Syncing with external API");
    }
}

// Ejecución async manual
ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
executor.setCorePoolSize(4);
executor.initialize();

CompletableFuture.runAsync(() -> {
    System.out.println("Running background task");
}, executor);
```

## Explicación

Las tareas en segundo plano separan **qué** debe suceder de **cuándo** sucede. La arquitectura básica tiene tres componentes:

1. **Productor (API)**: Encola un trabajo cuando ocurre un evento (usuario se registra, archivo subido).
2. **Broker (Cola)**: Redis, RabbitMQ o Amazon SQS retienen trabajos de forma duradera hasta que un worker los toma.
3. **Consumidor (Worker)**: Un proceso separado sondea la cola y ejecuta trabajos. Los workers pueden correr en máquinas diferentes a la API web.

Los cron jobs son un caso especial: en vez de activarse por eventos de usuario, corren según un horario. La mayoría de sistemas de cola (Celery Beat, BullMQ, Spring @Scheduled) soportan ambos patrones.

## Variantes

| Herramienta | Lenguaje | Persistencia | Programación | Ideal Para |
|-------------|----------|--------------|--------------|------------|
| Celery + Redis | Python | Redis (o RabbitMQ) | Celery Beat | Colas de tareas completas |
| BullMQ | JavaScript | Redis | Cron integrado | Proyectos Node.js, TypeScript |
| Sidekiq | Ruby | Redis | Sidekiq-cron | Ruby on Rails |
| Hangfire | C# | SQL Server/Redis | Integrado | Ecosistema .NET |
| Spring @Scheduled | Java | N/A (en proceso) | Expresiones cron | Tareas programadas simples |
| AWS Lambda + EventBridge | Cualquiera | N/A (serverless) | Reglas EventBridge | Cloud-native, pago por uso |

## Lo que funciona

- **Haz trabajos idempotentes**: Ejecutar el mismo trabajo dos veces debería producir el mismo resultado. Usa IDs únicos de trabajo para prevenir duplicados.
- **Configura reintentos con backoff**: Fallos transitorios (cortes de red) deberían reintentar 3-5 veces con backoff exponencial.
- **Loguea contexto del trabajo**: Incluye job ID, user ID y timestamp en cada línea de log para debugging.
- **Separa colas por prioridad**: Pon procesamiento de pagos en una cola `high`, envío de emails en `default`.
- **Monitorea dead letter queues**: Trabajos que fallan todos los reintentos necesitan inspección manual. Alerta cuando la DLQ crece.

## Errores Comunes

- **Ejecutar tareas pesadas en el proceso web**: Generar un PDF de 100 páginas durante una petición HTTP provocará timeout y degradará la experiencia del usuario.
- **Sin reintentos ni manejo de dead letter**: Un reinicio de Redis puede perder todos los trabajos pendientes si no los persistes.
- **Asumir timing exacto de cron**: Cron es "correr en o después" del horario programado, no exactamente en ese momento. No dependas de precisión de milisegundos.
- **No manejar caídas de workers**: Si un worker muere en medio de un trabajo, puede perderse. Usa acknowledgments y visibility timeouts.
- **Sobrecargar la cola**: Encolar 100K trabajos a la vez puede abrumar a los workers. Usa rate limiting o encolado por lotes.

## Preguntas Frecuentes

### Debo usar Redis o RabbitMQ para mi cola de tareas?

**Redis** es más simple de operar y suficiente para la mayoría de cargas (<10K trabajos/seg). **RabbitMQ** ofrece mejores garantías de durabilidad, flexibilidad de routing y soporte del protocolo AMQP. Para datos financieros o de salud críticos, RabbitMQ o Amazon SQS es más seguro. Para la mayoría de apps web, Redis está bien.

### Cómo paso payloads grandes a un trabajo en segundo plano?

No pases datos grandes en el trabajo mismo. Guarda los datos en una base de datos o almacenamiento de objetos (S3) y pasa solo el ID al worker. Esto mantiene la cola ligera y evita que Redis/RabbitMQ se quede sin memoria.

### Qué pasa si un worker se cae mientras procesa un trabajo?

Depende del sistema de cola. **Celery** usa acknowledgments: el trabajo se elimina de la cola solo después de completarse. **BullMQ** usa un visibility timeout: si el worker no completa el trabajo a tiempo, reaparece en la cola. **Spring @Scheduled** corre en-proceso, así que una caída de JVM pierde la tarea en vuelo. Diseña siempre para entrega al-menos-una-vez y trabajos idempotentes.
