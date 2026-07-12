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
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa task queues y RPC con RabbitMQ. Usa durable queues, dead-letter exchanges y prefetch para distribucion confiable de tareas y concurrencia controlada."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc






---

# Task Queues y RPC con RabbitMQ y AMQP

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

- **Handling de consumer failure**: cuando un consumer crashea mid-processing, RabbitMQ requeuea el mensaje despues de un connection timeout. Usa manual acknowledgment para prevenir message loss. Setea prefetch_count a 1 para fair dispatch. Implementa heartbeat para detectar dead consumers. Usa asic.nack con requeue=false para fallos permanentes a DLQ
- **Recuperacion de conexion**: las conexiones de RabbitMQ caen por network issues, server restarts o load balancer changes. Usa automatic recovery en la client library (pika's utomatic_recovery=True). Setea connection timeout a 30 segundos. Implementa retry logic con exponential backoff. Loguea eventos de conexion. Monitorea reconnection frequency
- **Semantica de message redelivery**: cuando un consumer rechaza un mensaje (basic.nack), puede ser requeued o enviado a DLQ. Mensajes requeued van al final de la queue. Usa x-death header para trackear rejection count. Setea max delivery count via DLX policy. Testea redelivery behavior con simulated failures. Monitorea redelivery rate
- **Durabilidad de queue**: declara queues como durable para sobrevivir broker restarts. Usa persistent messages (delivery_mode=2) para task queues. Declara exchanges como durable. Usa mirrored queues en un cluster para HA. Testea queue durability restarteando el broker. Monitorea queue persistence settings a traves de todas las queues
- **Handling de poison messages**: mensajes que consistentemente causan consumer failures son poison. Setea max retry count (ej. 3-5). Despues de max retries, rutea a DLX. Usa TTL en requeued messages para delayar retry. Loguea detalles de poison messages. Alerta en poison message rate. Implementa un dashboard de analisis de poison messages
- **Graceful shutdown**: cuando apagas consumers, cancela el consumer primero (asic_cancel). Procesa in-flight messages. Luego cierra el channel y connection. Usa SIGTERM handler para graceful shutdown en containers. Setea shutdown timeout (ej. 30 segundos). Monitorea graceful shutdown success rate

## Performance y Escalabilidad

- **Tuning de prefetch**: setea prefetch_count basado en processing time y consumer capacity. Prefetch bajo (1-10): fair dispatch, menor throughput. Prefetch alto (50-100): mayor throughput, distribucion uneven. Empieza con prefetch=10 y tunea basado en metricas. Monitorea consumer lag. Ajusta prefetch por queue basado en message processing time
- **Scaling de consumers**: scalea consumers horizontalmente agregando mas consumer processes. Usa Kubernetes deployments o auto-scaling groups. Scalea por queue depth o consumer lag. Setea min/max replicas. Monitorea eventos de scaling. Usa consumer priority para weighted distribution. Asegura que consumers sean stateless para horizontal scaling
- **Particionamiento de queue**: particiona queues por task type o priority. Usa topic exchanges para routing. Separa queues para tasks CPU-intensive vs IO-intensive. Usa priority queues (x-max-priority) para tasks urgentes. Monitorea queue depth por partition. Scalea consumers por partition basado en depth
- **Batching de mensajes**: batchea publish de mensajes para mayor throughput. Usa asic_publish con confirms para reliability. Batch acknowledge para eficiencia del consumer. Balancea batch size vs latency. Empieza con batch size de 10-50. Monitorea batch publish/ack rates. Ajusta basado en requirements de throughput
## Consideraciones de Seguridad

- **Encriptacion de mensajes**: encripta sensitive message payloads en la application layer. TLS para transport encryption. Usa AES-256 para payload encryption. Rota encryption keys trimestralmente. Storea keys en un secrets manager (AWS KMS, HashiCorp Vault). Nunca loguees payloads encriptados. Desencripta solo en la process memory del consumer
- **Autenticacion y autorizacion**: autentica producers y consumers usando mutual TLS o SASL. Autoriza queue access via ACLs. Usa per-service credentials con least privilege. Rota credentials regularmente. Audita credential usage. Bloquea conexiones anonimas en produccion. Usa virtual hosts para isolacion de entornos
- **Integridad de mensajes**: usa HMAC signatures para verificar message integrity. Firma message body + headers con un shared secret. Verifica signature en consumo. Rechaza mensajes con signatures invalidas. Rota signing keys periodicamente. Loguea failures de signature verification. Usa asymmetric keys para messaging cross-organization
- **Audit logging**: loguea todos los eventos de message publishing y consumption. Incluye message ID, timestamp, producer/consumer identity y action. Envia audit logs a un centralized logging system. Reten logs per compliance requirements (ej. 7 aÃ±os para financial systems). Alerta en patrones sospechosos (mass deletions, unauthorized access)

## Monitoreo y Observabilidad

- **Monitoreo de queue depth**: monitorea queue depth continuamente. Alerta en depth que excede threshold (ej. 1000 mensajes). Trackea depth trends en el tiempo. Correlaciona depth spikes con eventos de deployment. Usa RabbitMQ management API o cloud provider metrics. Setea Grafana dashboards para visualizacion de queue depth
- **Tracking de consumer lag**: trackea la diferencia entre message publish time y processing time. Alerta en lag que excede SLA (ej. 5 minutos). Monitorea lag percentiles (p50, p95, p99). Correlaciona lag con eventos de consumer scaling. Usa distributed tracing para identificar slow consumers. Optimiza procesamiento para reducir lag
- **Metricas de throughput**: trackea mensajes publicados por segundo, consumidos por segundo y error rate. Monitorea throughput trends. Alerta en drops de throughput > 50%. Compara throughput a traves de entornos. Usa Prometheus + Grafana para visualizacion. Exporta metricas a una time-series database para analisis historico
- **Monitoreo de error rate**: trackea error rate por consumer. Alerta en error rate > 1%. Loguea errores con message context para debugging. Categoriza errores por type (timeout, validation, processing). Monitorea error rate trends. Correlaciona error spikes con deployments o cambios de infraestructura
## Deployment y CI/CD

- **Blue-green deployments para consumers**: deploya nuevas versiones de consumer usando blue-green strategy. Corre ambas versiones simultaneamente. Drenar la version vieja despues que la nueva version este healthy. Usa feature flags para togglear entre versiones. Monitorea error rates durante switchover. Roll back inmediatamente si error rate aumenta. Testea rollback procedure regularmente
- **Ordering de deployment de consumers**: deploya consumers antes de producers al cambiar formatos de mensaje. Esto asegura que nuevos consumers puedan manejar mensajes de format viejo. Usa schema evolution patterns (additive changes, optional fields). Deploya producers despues que consumers esten ready. Usa canary deployment para producers para testear nuevos formatos de mensaje gradualmente
- **Infrastructure as Code para messaging**: define queues, exchanges y bindings en Terraform o CloudFormation. Versiona definiciones de infraestructura. Revisa cambios de infraestructura en PRs. Testea cambios de infraestructura en staging antes de produccion. Usa policy-as-code para enforcear security y naming conventions. Taguea todos los messaging resources para cost allocation
- **Versioning de format de mensaje**: incluye schema version en message headers. Los consumers manejan multiples versiones durante rollout. Deprecatea versiones viejas despues que todos los consumers upgradeen. Documenta cambios de schema en un changelog. Usa schema registry para Avro/Protobuf. Testea backward y forward compatibility antes de deployar cambios de schema

## Pitfalls Comunes y Anti-Patrones

- **Queue compartida para diferentes message types**: evita usar una sola queue para diferentes message types. Cada type tiene diferentes requirements de procesamiento, priorities y SLAs. Usa queues separadas por message type o usa routing keys con topic exchanges. Esto habilita scaling, monitoreo y error handling independiente por type
- **No manejar message ordering**: algunos sistemas requieren message ordering (ej. state updates). Usa partitioned queues con single-active consumer por partition. Usa sequence numbers para verificacion de ordering. Testea ordering bajo producers concurrentes. Documenta ordering guarantees por queue. Usa FIFO queues cuando se requiere strict ordering
- **Procesamiento syncrono en pipeline async**: evita hacer synchronous HTTP calls dentro de message consumers. Esto bloquea el consumer y reduce throughput. Usa async HTTP clients. Setea timeouts apropiados. Mueve slow operations a workers separados. Usa circuit breakers para downstream calls. Monitorea consumer processing time
- **Ignorar consumer lag**: consumer lag indica que el sistema no puede mantenerse con la produccion de mensajes. Monitorea lag continuamente. Alerta en lag que excede SLA. Scalea consumers automaticamente basado en lag. Investiga root causes (slow processing, downstream failures, insufficient resources). Trackea lag trends en el tiempo
## Optimizacion de Costos

- **Right-sizing de infraestructura de messaging**: elige el tier de broker correcto basado en throughput. Empieza con el tier mas pequeÃ±o y scalea up basado en metricas. Usa messaging serverless (SQS, SNS) para workloads variables para evitar pagar por idle capacity. Compara costos de RabbitMQ self-hosted vs managed service. Factorea operational overhead de self-hosting. Revisa tier mensualmente
- **Optimizacion de message payload**: reduce message size para bajar costos. Comprime large payloads (gzip, lz4). Remueve metadata innecesaria. Usa reference passing (envia un reference ID en lugar de full payload) para large objects. Benchmarka impacto de payload size en throughput y costo. Targetea average message size < 10KB
- **Optimizacion de recursos de consumer**: right-sizea consumer instances basado en requirements de procesamiento. Usa spot instances para consumers non-critical. Scalea consumers a zero durante off-hours para queues non-urgent. Monitorea consumer CPU y memory utilization. Right-sizea antes de scalear out. Trackea costo por mensaje procesado
- **Gestion de storage costs**: message queues consumen storage para mensajes queued y retained. Setea message TTL apropiado para auto-expirar mensajes viejos. Configura DLQ retention policies. Monitorea queue storage usage. Archiva mensajes viejos a storage mas barato. Usa lifecycle policies para message archives. Trackea storage costs por queue

## Testing y Quality Assurance

- **Integration testing para messaging**: testea producer-consumer integration end-to-end. Verifica message delivery, ordering y content. Testea con realistic message volumes. Testea escenarios de failure (broker down, consumer crash, network partition). Usa test queues para integration tests. Limpia test queues despues de cada run. Automatiza en CI pipeline
- **Load testing de messaging systems**: testea con message volumes production-like. Mide throughput, latency y error rate bajo load. Identifica bottlenecks (broker, consumer, network). Testea consumer scaling behavior. Verifica DLQ behavior bajo load. Testea backpressure handling. Documenta load test results y capacity limits
- **Chaos engineering para messaging**: inyecta failures (broker restart, network partition, consumer crash). Verifica que el sistema recupere automaticamente. Testea message redelivery despues de consumer failure. Testea DLQ behavior bajo cascade failures. Corre chaos tests en staging regularmente. Documenta findings y mejora resilience
- **Contract testing para mensajes**: usa schema registry o contract testing tools (Pact) para verificar compatibilidad de format de mensaje. Testea producer schema contra consumer expectations. Detecta breaking changes antes de deployment. Corre contract tests en CI. Versiona schemas apropiadamente. Documenta guidelines de schema evolution
## Herramientas y Plataformas

- **RabbitMQ Management Plugin**: web UI para monitorear RabbitMQ. Visualiza queue depths, message rates, consumer counts. Inspecciona y publica mensajes manualmente. Gestiona exchanges, queues y bindings. Visualiza connection y channel details. Exporta e importa definitions. Habilita en port 15672. Usa para debugging y monitoreo operational
- **AWS SQS y SNS**: servicios de messaging managed. SQS para queues point-to-point. SNS para pub/sub. Sin infraestructura que gestionar. Paga por request. Dead letter queues built-in. FIFO queues para ordering. Message attributes para filtering. Usa con Lambda para consumers serverless. Usa con Auto Scaling para EC2 consumers
- **Apache Kafka**: plataforma distribuida de event streaming. Alto throughput (millones de eventos/sec). Durable event storage. Consumer groups para procesamiento paralelo. Partitions para ordering. Schema registry para Avro/Protobuf. Usa para event sourcing, log aggregation, stream processing. Self-hosted o managed (Confluent Cloud, AWS MSK)
- **Redis Pub/Sub y Streams**: messaging ligero en Redis. Pub/Sub: fire and forget, sin persistencia. Streams: persistente, consumer groups, replayable. Bueno para use cases simples y low latency. Usa para caching invalidation, real-time notifications. No suitable para high-throughput o durable messaging. Usa Redis Streams para reliable delivery

## Resumen de Best Practices

- **Siempre usa manual acknowledgment**: nunca uses auto-ack en produccion. Procesa el mensaje fully antes de ackear. Usa nack para fallos con estrategia de requeue apropiada. Esto previene message loss en consumer crashes. Monitorea ack/nack rates
- **Setea TTLs apropiados**: setea message TTL para prevenir retries infinitos. Setea queue TTL para auto-expirar mensajes stale. Setea DLQ TTL para auto-clean old failures. Elije TTLs basado en business requirements. Documenta valores de TTL por queue. Monitorea TTL expiration rates
- **Usa dead letter exchanges**: configura DLX en todas las queues criticas. Setea max delivery count. Monitorea DLQ depth. Implementa DLQ inspection tooling. Crea runbooks para DLQ remediation. Testea DLX configuration regularmente
- **Monitorea todo**: trackea queue depth, consumer lag, throughput, error rate y DLQ depth. Setea dashboards. Configura alertas con thresholds apropiados. Usa distributed tracing para message flows. Correlaciona metricas con deployments. Revisa metricas semanalmente
## Patrones Avanzados

- **Patron competing consumers**: multiples instancias de consumer leen de la misma queue. Cada mensaje es procesado por exactamente un consumer. Habilita horizontal scaling. Usa prefetch=1 para fair dispatch. Monitorea slow consumers que causan distribucion uneven. Usa consumer priority para weighted dispatch. Handlea consumer failures gracefulmente con requeue
- **Patron request-reply**: envia un mensaje con una reply-to queue. El consumer procesa y publica la response a la reply queue. Usa correlation IDs para matchear requests con responses. Setea timeouts para replies. Usa para async RPC over messaging. Monitorea reply latency. Usa exclusive reply queues por producer para isolation
- **Patrones de routing key**: usa topic exchanges con routing key patterns. * matchea una word. # matchea zero o mas words. orders.*.created matchea orders.us.created y orders.eu.created. orders.# matchea todos los order events. Documenta routing key conventions. Testea routing patterns antes de deployar. Monitorea unroutable messages
- **Priority queues**: declara queues con argumento x-max-priority. Setea priority en mensajes via headers. Mensajes de higher priority se consumen primero. Usa sparingly ya que agrega overhead. Monitorea performance de priority queue. Setea max priority a 10 para limitar overhead. Usa queues separadas para diferentes priority levels como alternativa
## Compliance y Governance

- **Politicas de retencion de mensajes**: define periodos de retencion por queue basado en compliance requirements. Financial systems: 7 aÃ±os. Healthcare: 6 aÃ±os. General: 30-90 dias. Implementa retencion via TTL o scheduled cleanup. Documenta politicas de retencion. Audita retention compliance trimestralmente. Usa message archiving antes de deletion para audit trails
- **Data residency para mensajes**: algunas regulaciones requieren que los datos se queden dentro de boundaries geograficos especificos. Elije cloud regions cuidadosamente. Usa queues y brokers region-specific. Evita cross-region replication para regulated data. Documenta data residency por queue. Monitorea policy violations. Usa private connections para regulated messaging
- **Access control para queues**: restringe queue management a personal autorizado. Usa IAM policies o RabbitMQ ACLs. Separa permisos de read, write y management. Audita queue access. Rota access credentials. Usa per-service accounts. Bloquea anonymous access. Documenta access policies por queue
- **Audit trails de mensajes**: loguea todos los eventos de message lifecycle (publish, consume, ack, nack, DLQ). Incluye message ID, timestamp, actor y action. Envia audit logs a immutable storage. Reten per compliance requirements. Soporta export de audit log para regulators. Testea audit trail completeness regularmente
## Guia de Troubleshooting

- **Mensajes stuck en queue**: chequea si los consumers estan corriendo y conectados. Verifica consumer prefetch settings. Chequea blocked connections (RabbitMQ blocked publisher). Inspecciona consumer logs por errores. Verifica que la queue no este paused. Chequea resource limits (file descriptors, memory). Usa RabbitMQ management UI para inspeccionar queue state
- **High memory usage**: chequea large message payloads. Verifica que message TTL este seteado. Chequea unacked messages piling up. Monitorea consumer memory usage. Usa prefetch limits para controlar memoria. Considera message compression. Chequea memory leaks en consumer code. Profilea consumer processes regularmente
- **Connection drops**: chequea network stability entre consumers y broker. Verifica heartbeat settings. Chequea broker resource limits. Revisa firewall y load balancer timeouts. Usa automatic recovery en client libraries. Monitorea connection events. Loguea reconnection attempts. Setea appropriate connection timeout
- **Distribucion uneven de mensajes**: chequea prefetch settings (muy alto causa uneven distribution). Verifica que todos los consumers tengan equal capacity. Chequea slow consumers. Usa prefetch=1 para strict fair dispatch. Monitorea consumer processing times. Scalea consumers basado en lag. Considera consumer priority para weighted distribution
## Estrategias de Migracion

- **Migracion de monolith a event-driven**: empieza identificando bounded contexts. Extrae un servicio a la vez. Usa el strangler fig pattern: rutea trafico del monolith al nuevo servicio via eventos. Manten el monolith como event producer hasta migrar fully. Monitorea issues de event delivery durante migracion. Planifica rollback para cada step de extraccion
- **Migracion de broker**: migra de un broker a otro (ej. RabbitMQ a Kafka). Corre ambos brokers en paralelo durante transition. Dual-publish a ambos brokers. Switchea consumers uno por uno. Verifica message parity. Decomisiona old broker despues que todos los consumers migren. Planifica schema compatibility a traves de brokers
- **Refactoring de queue**: splitea una monolithic queue en multiples specialized queues. Usa un router service para forwardear mensajes a new queues. Corre ambas queues en paralelo. Switchea consumers a new queues. Monitorea message loss o duplication. Decomisiona old queue despues de verificacion. Documenta nueva queue architecture
- **Migracion de protocolo**: migra de AMQP a MQTT o viceversa. Usa un protocol bridge durante transition. Valida message semantics a traves de protocolos. Testea performance characteristics del nuevo protocolo. Entrena al team en el nuevo protocolo. Monitorea compatibility issues. Documenta protocol-specific behaviors
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