---


contentType: recipes
slug: dead-letter-queue
title: "Dead Letter Queues"
description: "Maneja mensajes fallidos gracefulmente con dead letter queues, políticas de retry y detección de poison pills en arquitecturas message-driven."
metaDescription: "Dead letter queues: detección de poison pills, límites de retry, replay de mensajes y estrategias de recuperación para sistemas async."
difficulty: intermediate
topics:
  - messaging
tags:
  - dead-letter-queue
  - messaging
  - resilience
  - error-handling
  - kafka
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /docs/api-error-response-template
  - /patterns/bulkhead-pattern
  - /recipes/message-idempotency
  - /guides/message-queue-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Dead letter queues: detección de poison pills, límites de retry, replay de mensajes y estrategias de recuperación para sistemas async."
  keywords:
    - dead-letter-queue
    - messaging
    - resilience
    - error-handling


---
## Visión General

Las dead letter queues (DLQs) capturan mensajes que fallan el procesamiento después de intentos repetidos en sistemas [message-driven](/guides/architecture/event-driven-architecture-guide). Sin ellas, los mensajes fallidos bloquearían la cola o se perderían por completo. Un sistema DLQ bien diseñado distingue entre poison pills (mensajes permanentemente malos) y fallas transitorias, habilitando a operadores a replayear, inspeccionar o descartar mensajes problemáticos sin impactar el flujo principal de procesamiento.

## Cuándo Usar

Usa este recurso cuando:
- Los consumers de mensajes encuentran errores irrecuperables (payloads malformados, referencias faltantes)
- Necesitas prevenir que un mensaje malo bloquee una partición de cola completa
- Los equipos de operaciones requieren visibilidad en mensajes fallidos para intervención manual
- Compliance requiere audit trails de todos los mensajes procesados y fallidos. Usa una [política de retención de datos](/guides/databases/database-design-guide).

## Solución

### SQS DLQ Configuration (AWS CLI)

```bash
# Crear cola principal y DLQ
aws sqs create-queue --queue-name orders-queue
aws sqs create-queue --queue-name orders-dlq

# Obtener URLs de colas
QUEUE_URL=$(aws sqs get-queue-url --queue-name orders-queue --query 'QueueUrl' --output text)
DLQ_URL=$(aws sqs get-queue-url --queue-name orders-dlq --query 'QueueUrl' --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Setear redrive policy: enviar a DLQ después de 3 receives fallidos
aws sqs set-queue-attributes \
  --queue-url $QUEUE_URL \
  --attributes '{
    "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"'$DLQ_ARN'\\",\\"maxReceiveCount\\":3}"
  }'
```

### RabbitMQ Dead Letter Exchange (Python + pika)

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# DLX y DLQ
channel.exchange_declare(exchange='orders.dlx', exchange_type='direct')
channel.queue_declare(queue='orders-dlq', durable=True)
channel.queue_bind(queue='orders-dlq', exchange='orders.dlx', routing_key='failed')

# Cola principal con TTL y dead-letter routing
args = {
    'x-dead-letter-exchange': 'orders.dlx',
    'x-dead-letter-routing-key': 'failed',
    'x-message-ttl': 300000  # 5 minutos
}
channel.queue_declare(queue='orders', durable=True, arguments=args)

# Rechazar un mensaje para enviar a DLQ
channel.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
```

### Kafka Dead Letter Topic (Node.js + KafkaJS)

```javascript
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ brokers: ['localhost:9092'] });

const consumer = kafka.consumer({ groupId: 'order-processors' });

await consumer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: false });

const producer = kafka.producer();
await producer.connect();

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      await processOrder(JSON.parse(message.value));
    } catch (err) {
      // Enviar a DLQ con metadata de error
      await producer.send({
        topic: 'orders-dlq',
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            'error.type': err.name,
            'error.message': err.message,
            'original.topic': topic,
            'original.partition': String(partition),
            'original.offset': String(message.offset),
            'retry.count': '3'
          }
        }]
      });
    }
  }
});
```

## Explicación

**Condiciones de trigger de DLQ**:

| Condición | Cuándo hacer DLQ | Acción |
|-----------|------------------|--------|
| Max retries excedido | Después de N intentos fallidos | Mover a DLQ |
| Mensaje no parseable | JSON inválido, schema mismatch | Mover inmediatamente |
| Dependencia faltante | Registro referenciado no existe | Reintentar, luego DLQ |
| Violación de business rule | Orden para producto inexistente | Mover inmediatamente |

**Monitoreo de DLQ**:
- **Alerting de profundidad**: DLQ > 10 mensajes dispara PagerDuty
- **Alerting de edad**: Mensaje en DLQ > 24 horas necesita investigación
- **Tooling de replay**: UI de admin para reprocesar o purgar mensajes de DLQ
- **Correlación**: Vincular mensaje de DLQ al trace ID original. Consulta [distributed tracing](/recipes/observability/distributed-tracing).

## Variantes

| Broker | Mecanismo DLQ | Configuración |
|--------|---------------|---------------|
| AWS SQS | Redrive policy | maxReceiveCount + target ARN |
| RabbitMQ | Dead letter exchange | x-dead-letter-exchange |
| Kafka | Consumer-managed | Topic separado + lógica de producer |
| Azure SB | Forwarding | maxDeliveryCount + forwardTo |
| Google Pub/Sub | Dead letter topic | deadLetterPolicy.maxDeliveryAttempts |

## Lo que funciona

- **Setea counts de retry razonables**: 3-5 intentos balancean tiempo de recuperación contra presión de cola
- **Incluye contexto completo en DLQ**: Headers originales, retry count, tipo de error y stack trace
- **Separa DLQs por severidad**: Errores de validación vs. fallas de infraestructura necesitan manejo diferente
- **Monitorea profundidad de DLQ como métrica**: Es un indicador leading de salud del sistema. Consulta [recolección de métricas](/recipes/observability/metrics-collection).
- **Automatiza replay con cautela**: Replay después de arreglar el bug; replay ciego amplifica fallas

## Errores Comunes

1. **Sin DLQ**: Mensajes fallidos desaparecen silenciosamente o bloquean consumers para siempre
2. **Loops infinitos de retry**: Requeuear sin un count máximo crea procesamiento perpetuo. Usa [retry con backoff exponencial](/recipes/architecture/retry-backoff).
3. **Ignorar mensajes de DLQ**: La DLQ se convierte en un basurero que nadie monitorea
4. **Sin razón de dead-letter**: Operadores no pueden distinguir "bad JSON" de "database down"
5. **DLQ compartida para todos los topics**: Un poison pill del topic A no pertenece con fallas del topic B

## Manejo de Errores y Recuperacion

- **Deteccion de poison messages**: implementa un max delivery count (ej. 5 retries). Despues de max retries, mueve el mensaje a la DLQ automaticamente. Usa exponential backoff entre retries (1s, 2s, 4s, 8s, 16s). Loguea cada intento de retry con message ID y detalles del error. Alerta al equipo de operations cuando mensajes entran a la DLQ. Monitorea DLQ depth continuamente
- **Inspeccion de mensajes en DLQ**: provee tooling para inspeccionar mensajes de DLQ sin consumirlos. Usa RabbitMQ management plugin o AWS SQS DLQ console. Muestra message body, headers, original queue, reason de failure y timestamp. Habilita filtering por error type o date range. Soporta message requeue para retry despues de fixear el issue subyacente
- **Reprocesamiento automatico**: implementa un pipeline de reprocesamiento para mensajes de DLQ. Despues de fixear el root cause, replaya mensajes desde DLQ a la original queue. Usa un worker separado para drenar la DLQ. Valida format del mensaje antes de requeue. Trackea success rate de reprocesamiento. Setea max reprocessing count para prevenir loops infinitos
- **Alertas y notificaciones de DLQ**: setea alertas para DLQ depth que excede threshold (ej. 10 mensajes). Envia notificaciones a Slack/PagerDuty. Incluye message count, oldest message age y error categories en la alerta. Crea un dashboard mostrando DLQ trends en el tiempo. Pagea on-call engineer para DLQ depth critico
- **Expiracion de mensajes en DLQ**: setea un TTL en mensajes de DLQ (ej. 7 dias). Mensajes expirados se eliminan automaticamente. Previene que la DLQ crezca indefinidamente. Archiva mensajes expirados a cold storage antes de eliminar para propositos de audit. Loguea eventos de expiracion con metadata del mensaje
- **Integracion con circuit breaker**: cuando DLQ depth excede un threshold critico, tripea un circuit breaker para parar el procesamiento de nuevos mensajes. Esto previene cascade failures. El circuit breaker resetea despues de un cooldown period o intervencion manual. Monitorea estado del circuit breaker y alerta en trips

## Performance y Escalabilidad

- **Sizing de throughput de DLQ**: dimensiona la infraestructura de DLQ basado en failure rate esperado (tipicamente 1-5% del volumen de mensajes). Para sistemas de alto throughput procesando 10K msg/s, un 1% de failure rate genera 100 msg/s a la DLQ. Asegurate que la DLQ pueda manejar bursts peak de failure. Usa infraestructura separada para DLQ para evitar impactar performance de primary queue
- **Batch processing desde DLQ**: procesa mensajes de DLQ en batches para eficiencia. Fetchea 10-50 mensajes a la vez. Analiza patrones de error a traves del batch. Agrupa mensajes por error type para remediacion dirigida. Batch requeue cuando el root cause se fixea. Trackea metricas de batch processing
- **Estrategia multi-level DLQ**: usa DLQ primaria para errores retryable y DLQ secundaria para fallos permanentes. DLQ primaria: errores transients (timeouts, connection issues). DLQ secundaria: errores permanentes (invalid format, schema mismatch). Esto separa mensajes retryable de non-retryable. Limpia DLQ secundaria manualmente despues de investigacion
- **Optimizacion de storage de DLQ**: mensajes de DLQ retienen full body y headers, consumiendo storage. Comprime large message bodies antes de storear en DLQ. Setea storage limits por DLQ. Monitorea storage usage de DLQ. Archiva mensajes viejos de DLQ a S3/GCS. Implementa lifecycle policies para DLQ storage
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
## Reporting y Comunicacion

- **Review semanal de metricas de messaging**: revisa queue depths, throughput, error rates y consumer lag semanalmente. Identifica trends y anomalias. Compara con semanas anteriores. Documenta findings y action items. Comparte con equipos de ingenieria y operations. Usa metricas para priorizar optimization work. Trackea mejoras en el tiempo
- **Post-mortems de incidentes de messaging**: conduce post-mortems para incidentes significantes de messaging (message loss, DLQ overflow, broker outage). Usa formato blameless. Documenta timeline, root cause, impact y remediation. Comparte learnings a traves de equipos. Trackea remediation items a completion. Updatea runbooks basado en findings
- **Capacity planning**: proyecta growth de message volume trimestralmente. Planifica broker capacity basado en proyecciones. Planifica consumer capacity basado en processing time y volume. Factorea estacionalidad y lanzamientos de producto planificados. Documenta capacity assumptions. Revisa capacity plan mensualmente. Provisiona capacity antes de que se necesite
## Automatizacion y Tooling

- **Monitoreo automatizado de DLQ**: deploya scripts automatizados que chequean DLQ depth cada 5 minutos. Alerta en threshold breach. Auto-crea tickets para investigacion de DLQ. Genera daily DLQ summary reports. Trackea time-to-resolution para DLQ issues. Usa Lambda o scheduled containers para monitoreo. Integra con incident management tools
- **Automatizacion de message replay**: construye tooling para replayar mensajes desde DLQ a original queue. Soporta selective replay por message ID, date range o error type. Modo dry-run para preview replay sin ejecutar. Trackea replay success rate. Loguea replay events para audit. Rate-limitea replay para evitar overwhelming consumers
- **Health checks de consumer**: implementa health check endpoints para consumers. Chequea database connectivity, downstream service availability y processing capacity. Retorna health status al orchestrator. Auto-restartea unhealthy consumers. Monitorea health check history. Alerta en repeated health check failures
## Consideraciones de Sostenibilidad

- **Procesamiento de mensajes energy-efficient**: optimiza consumer code para reducir CPU cycles por mensaje. Batchea mensajes para reducir per-message overhead. Usa formatos de serializacion eficientes (Avro, Protobuf) para reducir network transfer. Right-sizea consumer infrastructure para evitar idle energy consumption. Programa non-urgent batch processing durante off-peak hours cuando grid carbon intensity es lower
- **Arquitectura de messaging green**: prefiere managed messaging services que sharean infraestructura a traves de tenants, reduciendo per-message carbon footprint. Usa auto-scaling para matchear consumer capacity a demand, eliminando idle resources. Elije cloud regions con renewable energy. Archiva mensajes viejos a cold storage para reducir active storage energy. Monitorea carbon footprint de messaging infrastructure
## Preguntas Frecuentes

**P: ¿Debería replayear mensajes de DLQ automáticamente?**
R: Solo después de identificar y arreglar la causa raíz. El replay ciego desperdicia recursos y puede re-disparar el mismo error.

**P: ¿Cuánto tiempo debería mantener mensajes de DLQ?**
R: Más que tu SLA de respuesta a incidentes. 7-14 días es típico; archiva a storage barato después.

**P: ¿Cuál es la diferencia entre una DLQ y una cola de retry?**
R: Las [colas de retry](/recipes/architecture/retry-backoff) retienen mensajes para reprocesamiento posterior. Las DLQs retienen mensajes que agotaron todos los retries.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.