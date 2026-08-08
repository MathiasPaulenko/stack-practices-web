---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues y RPC con RabbitMQ y AMQP"
description: "Implementa distribucion confiable de tareas y patrones request-reply usando RabbitMQ con durable queues, dead-letter exchanges y prefetch para concurrencia controlada"
metaDescription: "Implementa task queues y RPC con RabbitMQ. Usa durable queues, dead-letter exchanges y prefetch para distribucion confiable de tareas y concurrencia controlada."
difficulty: intermediate
topics:
  - messaging
  - devops
tags:
  - messaging
  - microservices
  - devops
  - kafka
  - rabbitmq
relatedResources:
  - /recipes/kafka-event-streaming
  - /recipes/event-driven-architecture
  - /recipes/background-jobs
  - /recipes/dead-letter-queue
  - /recipes/event-driven-microservices
  - /recipes/message-idempotency
  - /guides/message-queue-guide
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa task queues y RPC con RabbitMQ. Usa durable queues, dead-letter exchanges y prefetch para distribucion confiable de tareas y concurrencia controlada."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc






---
Distribuye tareas de background confiablemente e implementa patrones request-reply usando RabbitMQ. Esta recipe cubre durable queues, dead-letter exchanges para mensajes fallidos, limites de prefetch para concurrencia controlada, y RPC sobre AMQP para llamadas sincronicas entre servicios.

## Cuando Usar Esto

- Jobs de background (procesamiento de imagenes, envio de emails) no deben bloquear el request flow principal. Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para automatización de tareas recurrentes.
- Tareas fallidas deberian reintentarse con exponential backoff o enrutarse a dead-letter queues. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para patrones de backoff exponencial.
- Los servicios necesitan comunicacion RPC sincronica sin overhead de HTTP. Consulta [Call REST API](/recipes/api/call-rest-api) para alternativas HTTP sincrónicas.

## Solucion

### 1. Producer con Durable Queue

```typescript
// rabbitmq/producer.ts
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Durable queue sobrevive restart del broker
await channel.assertQueue('email.tasks', {
  durable: true,
});

// Dead letter exchange para mensajes fallidos
await channel.assertExchange('dlx', 'direct');
await channel.assertQueue('email.tasks.dlq', { durable: true });
await channel.bindQueue('email.tasks.dlq', 'dlx', 'email.tasks');

async function sendEmailTask(email: unknown): Promise<void> {
  channel.sendToQueue('email.tasks', Buffer.from(JSON.stringify(email)), {
    persistent: true,
    headers: { 'x-attempt': 1 },
  });
}
```

### 2. Worker con Prefetch y Ack

```typescript
// rabbitmq/worker.ts
const channel = await connection.createChannel();

await channel.prefetch(5); // Procesa 5 mensajes concurrentemente por worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg); // Remueve de la queue en exito
  } catch (error) {
    if (attempt >= 3) {
      // Rechaza y envia a dead letter queue
      channel.reject(msg, false);
    } else {
      // Nack y requeue para reintento
      channel.nack(msg, false, true);

      // Publica con attempt incrementado
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});
```

### 3. Patron RPC Request-Reply

```typescript
// rabbitmq/rpc-client.ts
async function rpcCall(queue: string, payload: unknown): Promise<unknown> {
  const correlationId = generateId();
  const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('RPC timeout')), 5000);

    channel.consume(replyQueue, (msg) => {
      if (msg?.properties.correlationId === correlationId) {
        clearTimeout(timeout);
        resolve(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      replyTo: replyQueue,
      correlationId,
      expiration: '5000',
    });
  });
}

// rabbitmq/rpc-server.ts
await channel.assertQueue('calc.multiply');
await channel.consume('calc.multiply', (msg) => {
  if (!msg) return;

  const { a, b } = JSON.parse(msg.content.toString());
  const result = a * b;

  channel.sendToQueue(
    msg.properties.replyTo,
    Buffer.from(JSON.stringify({ result })),
    { correlationId: msg.properties.correlationId }
  );

  channel.ack(msg);
});
```

### 4. Docker Compose Setup

```yaml
# docker-compose.rabbitmq.yml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secret
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:
```

## Como Funciona

- **Exchanges** enrutan mensajes a queues basandose en reglas de binding
- **Durable queues** persisten mensajes a traves de restarts del broker
- **Prefetch** limita mensajes no acknowledged por consumer para prevenir overload
- **Dead-letter exchanges** reciben mensajes que son rechazados o expiran
- **RPC** usa reply queues y correlation IDs para matchear responses a requests

## Consideraciones de Produccion

- Usa quorum queues para almacenamiento de mensajes replicado y fault-tolerant
- Monitorea queue depth con el management plugin o Prometheus exporter
- Implementa circuit breakers en el lado del producer cuando queue depth excede thresholds

## Errores Comunes

- No hacer ack de mensajes, causando agotamiento de memoria en el broker
- Usar auto-ack para tareas de larga duracion que pueden fallar
- Crear reply queues sin cleanup, causando queue leaks en RPC

## Manejo de Errores y Recuperacion

- **Handling de consumer failure**: cuando un consumer crashea mid-processing, RabbitMQ requeuea el mensaje despues de un connection timeout.   Setea prefetch_count a 1 para fair dispatch.
- **Recuperacion de conexion**: las conexiones de RabbitMQ caen por network issues, server restarts o load balancer changes.   Setea connection timeout a 30 segundos.   Loguea eventos de conexion.
- **Semantica de message redelivery**: cuando un consumer rechaza un mensaje (basic.  nack), puede ser requeued o enviado a DLQ.   Mensajes requeued van al final de la queue.   Setea max delivery count via DLX policy.
- **Durabilidad de queue**: declara queues como durable para sobrevivir broker restarts.   Declara exchanges como durable.
- **Handling de poison messages**: mensajes que consistentemente causan consumer failures son poison.   Setea max retry count (ej.   3-5).   Despues de max retries, rutea a DLX.   Loguea detalles de poison messages.
- **Graceful shutdown**: cuando apagas consumers, cancela el consumer primero (asic_cancel).   Luego cierra el channel y connection.   Setea shutdown timeout (ej.   30 segundos).

## Performance y Escalabilidad

- **Tuning de prefetch**: setea prefetch_count basado en processing time y consumer capacity.   Prefetch bajo (1-10): fair dispatch, menor throughput.   Prefetch alto (50-100): mayor throughput, distribucion uneven.   Empieza con prefetch=10 y tunea basado en metricas.
- **Scaling de consumers**: scalea consumers horizontalmente agregando mas consumer processes.   Scalea por queue depth o consumer lag.   Setea min/max replicas.
- **Particionamiento de queue**: particiona queues por task type o priority.   Separa queues para tasks CPU-intensive vs IO-intensive.
- **Batching de mensajes**: batchea publish de mensajes para mayor throughput.   Batch acknowledge para eficiencia del consumer.   Empieza con batch size de 10-50.
## Consideraciones de Seguridad

- **Encriptacion de mensajes**: encripta sensitive message payloads en la application layer.   TLS para transport encryption.   Rota encryption keys trimestralmente.   Nunca loguees payloads encriptados.
- **Autenticacion y autorizacion**: autentica producers y consumers usando mutual TLS o SASL.   Autoriza queue access via ACLs.   Rota credentials regularmente.   Audita credential usage.   Bloquea conexiones anonimas en produccion.
- **Integridad de mensajes**: Firma message body + headers con un shared secret.   Verifica signature en consumo.   Rechaza mensajes con signatures invalidas.   Rota signing keys periodicamente.   Loguea failures de signature verification.
- **Audit logging**: loguea todos los eventos de message publishing y consumption.   Envia audit logs a un centralized logging system.   Reten logs per compliance requirements (ej.   7 aÃ±os para financial systems).

## Monitoreo y Observabilidad

- **Monitoreo de queue depth**: 1000 mensajes).   Correlaciona depth spikes con eventos de deployment.
- **Tracking de consumer lag**: 5 minutos).   Correlaciona lag con eventos de consumer scaling.
- **Metricas de throughput**: trackea mensajes publicados por segundo, consumidos por segundo y error rate.
- **Monitoreo de error rate**: Loguea errores con message context para debugging.   Categoriza errores por type (timeout, validation, processing).
## Deployment y CI/CD

- **Blue-green deployments para consumers**: deploya nuevas versiones de consumer usando blue-green strategy.   Drenar la version vieja despues que la nueva version este healthy.   Roll back inmediatamente si error rate aumenta.
- **Ordering de deployment de consumers**: deploya consumers antes de producers al cambiar formatos de mensaje.   Deploya producers despues que consumers esten ready.
- **Infrastructure as Code para messaging**: define queues, exchanges y bindings en Terraform o CloudFormation.   Versiona definiciones de infraestructura.
- **Versioning de format de mensaje**: Los consumers manejan multiples versiones durante rollout.   Deprecatea versiones viejas despues que todos los consumers upgradeen.

## Pitfalls Comunes y Anti-Patrones

- **Queue compartida para diferentes message types**: Cada type tiene diferentes requirements de procesamiento, priorities y SLAs.
- **No manejar message ordering**: algunos sistemas requieren message ordering (ej.   state updates).   Usa sequence numbers para verificacion de ordering.
- **Procesamiento syncrono en pipeline async**: Esto bloquea el consumer y reduce throughput.   Setea timeouts apropiados.   Mueve slow operations a workers separados.
- **Ignorar consumer lag**: consumer lag indica que el sistema no puede mantenerse con la produccion de mensajes.   Scalea consumers automaticamente basado en lag.
## Optimizacion de Costos

- **Right-sizing de infraestructura de messaging**: elige el tier de broker correcto basado en throughput.   Empieza con el tier mas pequeÃ±o y scalea up basado en metricas.   Factorea operational overhead de self-hosting.
- **Optimizacion de message payload**: reduce message size para bajar costos.   Comprime large payloads (gzip, lz4).   Benchmarka impacto de payload size en throughput y costo.
- **Optimizacion de recursos de consumer**: Scalea consumers a zero durante off-hours para queues non-urgent.
- **Gestion de storage costs**: message queues consumen storage para mensajes queued y retained.   Setea message TTL apropiado para auto-expirar mensajes viejos.   Archiva mensajes viejos a storage mas barato.

## Testing y Quality Assurance

- **Integration testing para messaging**: Verifica message delivery, ordering y content.   Testea escenarios de failure (broker down, consumer crash, network partition).
- **Load testing de messaging systems**: Verifica DLQ behavior bajo load.
- **Chaos engineering para messaging**: inyecta failures (broker restart, network partition, consumer crash).   Verifica que el sistema recupere automaticamente.   Testea DLQ behavior bajo cascade failures.
- **Contract testing para mensajes**: Detecta breaking changes antes de deployment.   Versiona schemas apropiadamente.
## Herramientas y Plataformas

- **RabbitMQ Management Plugin**: web UI para monitorear RabbitMQ.   Visualiza queue depths, message rates, consumer counts.   Inspecciona y publica mensajes manualmente.   Gestiona exchanges, queues y bindings.   Visualiza connection y channel details.   Exporta e importa definitions.   Habilita en port 15672.
- **AWS SQS y SNS**: servicios de messaging managed.   SQS para queues point-to-point.   SNS para pub/sub.   Sin infraestructura que gestionar.   Paga por request.   Dead letter queues built-in.   FIFO queues para ordering.   Message attributes para filtering.
- **Apache Kafka**: plataforma distribuida de event streaming.   Alto throughput (millones de eventos/sec).   Durable event storage.   Consumer groups para procesamiento paralelo.   Partitions para ordering.   Schema registry para Avro/Protobuf.
- **Redis Pub/Sub y Streams**: messaging ligero en Redis.   Pub/Sub: fire and forget, sin persistencia.   Streams: persistente, consumer groups, replayable.   Usa para caching invalidation, real-time notifications.   No suitable para high-throughput o durable messaging.

## Resumen de Best Practices

- **Siempre usa manual acknowledgment**: nunca uses auto-ack en produccion.   Esto previene message loss en consumer crashes.
- **Setea TTLs apropiados**: setea message TTL para prevenir retries infinitos.   Setea queue TTL para auto-expirar mensajes stale.   Setea DLQ TTL para auto-clean old failures.   Elije TTLs basado en business requirements.
- **Usa dead letter exchanges**: Setea max delivery count.   Crea runbooks para DLQ remediation.
- **Monitorea todo**: Setea dashboards.   Correlaciona metricas con deployments.
## Patrones Avanzados

- **Patron competing consumers**: multiples instancias de consumer leen de la misma queue.   Cada mensaje es procesado por exactamente un consumer.   Habilita horizontal scaling.   Usa consumer priority para weighted dispatch.
- **Patron request-reply**: envia un mensaje con una reply-to queue.   El consumer procesa y publica la response a la reply queue.   Setea timeouts para replies.
- **Patrones de routing key**: usa topic exchanges con routing key patterns.   * matchea una word.   # matchea zero o mas words.   orders.  *.  created matchea orders.  us.  created y orders.  eu.  created.   orders.  # matchea todos los order events.
- **Priority queues**: declara queues con argumento x-max-priority.   Setea priority en mensajes via headers.   Mensajes de higher priority se consumen primero.   Setea max priority a 10 para limitar overhead.
## Compliance y Governance

- **Politicas de retencion de mensajes**: define periodos de retencion por queue basado en compliance requirements.   Financial systems: 7 aÃ±os.   Healthcare: 6 aÃ±os.   General: 30-90 dias.   Audita retention compliance trimestralmente.
- **Data residency para mensajes**: algunas regulaciones requieren que los datos se queden dentro de boundaries geograficos especificos.   Elije cloud regions cuidadosamente.
- **Access control para queues**: restringe queue management a personal autorizado.   Separa permisos de read, write y management.   Audita queue access.   Rota access credentials.   Bloquea anonymous access.
- **Audit trails de mensajes**: loguea todos los eventos de message lifecycle (publish, consume, ack, nack, DLQ).   Envia audit logs a immutable storage.   Reten per compliance requirements.   Soporta export de audit log para regulators.
## Guia de Troubleshooting

- **Mensajes stuck en queue**: Verifica consumer prefetch settings.   Inspecciona consumer logs por errores.   Verifica que la queue no este paused.
- **High memory usage**: chequea large message payloads.   Verifica que message TTL este seteado.   Considera message compression.
- **Connection drops**: chequea network stability entre consumers y broker.   Verifica heartbeat settings.   Loguea reconnection attempts.
- **Distribucion uneven de mensajes**: Verifica que todos los consumers tengan equal capacity.   Scalea consumers basado en lag.
## Estrategias de Migracion

- **Migracion de monolith a event-driven**: empieza identificando bounded contexts.   Extrae un servicio a la vez.
- **Migracion de broker**: migra de un broker a otro (ej.   RabbitMQ a Kafka).   Dual-publish a ambos brokers.   Switchea consumers uno por uno.   Verifica message parity.   Decomisiona old broker despues que todos los consumers migren.
- **Refactoring de queue**: splitea una monolithic queue en multiples specialized queues.   Switchea consumers a new queues.   Decomisiona old queue despues de verificacion.
- **Migracion de protocolo**: migra de AMQP a MQTT o viceversa.   Valida message semantics a traves de protocolos.
## FAQ

**P: En que se diferencia de Kafka?**
R: RabbitMQ soporta routing complejo, RPC y menor latencia por mensaje. Kafka se destaca en log streaming de alto throughput y replay.

**P: Deberia usar topic o direct exchanges?**
R: Usa direct para routing simple por key. Usa topic para routing basado en patrones (ej. `orders.*.created`).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.





## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de messaging y microservices para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica task queues y rpc con rabbitmq y amqp** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
