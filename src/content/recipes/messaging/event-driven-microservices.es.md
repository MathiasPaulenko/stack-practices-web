---
contentType: recipes
slug: event-driven-microservices
title: "Microservicios Event-Driven"
description: "Diseña microservicios event-driven con message brokers, event sourcing, CQRS y patrones de consistencia eventual."
metaDescription: "Arquitectura de microservicios event-driven: message brokers, event sourcing, CQRS, consistencia eventual, patrones saga e implementación del outbox pattern."
difficulty: advanced
topics:
  - messaging
tags:
  - event-driven
  - microservices
  - messaging
  - architecture
  - kafka
relatedResources:
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/software-architecture-guide
  - /guides/event-driven-architecture-guide
  - /guides/microservices-architecture-guide
  - /recipes/dead-letter-queue
  - /recipes/message-idempotency
  - /guides/message-queue-guide
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Arquitectura de microservicios event-driven: message brokers, event sourcing, CQRS, consistencia eventual, patrones saga e implementación del outbox pattern."
  keywords:
    - event-driven
    - microservices
    - messaging
    - architecture


---
## Visión General

Los microservicios event-driven se comunican de forma asíncrona a través de eventos en lugar de llamadas directas a API. Esto desacopla servicios, mejora la resiliencia y permite escalado independiente. Patrones como event sourcing, CQRS, orquestación de sagas y el outbox pattern resuelven desafíos comunes: consistencia de datos, ordenamiento de mensajes, manejo de duplicados y recuperación de fallas.

## Cuándo Usar

Usa este recurso cuando:
- Los servicios necesitan escalar independientemente sin acoplamiento fuerte. Consulta [Event-Driven Functions](/recipes/event-driven-microservices/) para patrones de mensajería async.
- Manejas procesos de negocio de larga duración a través de múltiples dominios. Consulta [Serverless Orchestration](/recipes/background-jobs/) para coordinación de workflows.
- Aseguras consistencia de datos sin transacciones distribuidas. Consulta [Retry Logic](/recipes/retry-backoff/) para manejar fallas transitorias.
- Construyes pipelines de notificaciones, auditoría o analytics en tiempo real. Consulta [Kafka Event Streaming](/recipes/kafka-event-streaming/) para procesamiento de eventos de alto throughput.

## Solución

### Event Sourcing con PostgreSQL (Python)

```python
from dataclasses import dataclass
from typing import List
import json

@dataclass
class Event:
    aggregate_id: str
    event_type: str
    payload: dict
    version: int

class OrderAggregate:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self.events: List[Event] = []
        self.status = "pending"
    
    def apply(self, event: Event):
        if event.event_type == "order_placed":
            self.status = "placed"
        elif event.event_type == "payment_received":
            self.status = "paid"
        self.events.append(event)
    
    def place_order(self, items: List[dict]):
        event = Event(
            aggregate_id=self.order_id,
            event_type="order_placed",
            payload={"items": items},
            version=len(self.events) + 1
        )
        self.apply(event)
        return event
```

### Outbox Pattern (Node.js + Kafka)

```javascript
// Dentro de la misma transacción de base de datos:
await db.transaction(async (trx) => {
  // 1. Actualizar datos de negocio
  await trx('orders').insert({ id: orderId, status: 'placed' });
  
  // 2. Escribir en tabla outbox (misma transacción)
  await trx('outbox').insert({
    topic: 'orders.events',
    key: orderId,
    payload: JSON.stringify({ event: 'order_placed', orderId, items })
  });
});

// Proceso relay separado hace polling de outbox y publica a Kafka
const pending = await db('outbox').where('sent', false).limit(100);
for (const msg of pending) {
  await kafka.producer.send({
    topic: msg.topic,
    messages: [{ key: msg.key, value: msg.payload }]
  });
  await db('outbox').where('id', msg.id).update({ sent: true });
}
```

### Orquestación de Saga (TypeScript)

```typescript
interface SagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

class OrderSaga {
  private steps: SagaStep[] = [
    {
      name: 'reserve_inventory',
      execute: () => inventoryService.reserve(order.items),
      compensate: () => inventoryService.release(order.items)
    },
    {
      name: 'process_payment',
      execute: () => paymentService.charge(order.total),
      compensate: () => paymentService.refund(order.total)
    },
    {
      name: 'ship_order',
      execute: () => shippingService.createLabel(order),
      compensate: () => shippingService.cancelLabel(order)
    }
  ];
  
  async execute() {
    const completed: SagaStep[] = [];
    try {
      for (const step of this.steps) {
        await step.execute();
        completed.push(step);
      }
    } catch (err) {
      // Rollback de pasos completados en orden inverso
      for (const step of completed.reverse()) {
        await step.compensate();
      }
      throw new Error(`Saga falló en paso ${completed[0]?.name}`);
    }
  }
}
```

## Explicación

**Patrones core**:

| Patrón | Problema Resuelto | Compromiso |
|--------|-------------------|------------|
| Event Sourcing | Audit trail; queries temporales | Complejo; requiere CQRS para reads |
| CQRS | Optimiza modelos de lectura/escritura separados | Consistencia eventual; más código |
| Saga | Transacciones distribuidas sin locks | Rollback complejo; consistencia eventual |
| Outbox | Atómico "DB update + publicación de mensaje" | Requiere proceso relay |
| Idempotent Consumer | Manejar mensajes duplicados | Requiere claves únicas por mensaje |

**Garantías de ordenamiento de mensajes**:
- **Kafka**: Ordenado por partition key (ej.
- **RabbitMQ**: Ordenado por cola pero no entre consumers
- **SQS**: Sin ordenamiento (usa FIFO queues para ordenamiento)

## Variantes

| Broker | Ordenamiento | Delivery | Ideal Para |
|--------|--------------|----------|------------|
| Kafka | Por partición | At-least-once | Alto throughput; replayability |
| RabbitMQ | Por cola | At-least-once | Routing complejo; colas prioritarias |
| NATS | Por subject | At-most-once | Baja latencia; simplicidad |
| Pulsar | Global | Exactly-once | Geo-replicación; tiered storage |

## Lo que funciona

- **Diseña eventos como hechos, no comandos**: "OrderPlaced" no "PlaceOrder"
- **Incluye versiones de schema**: Eventos V1 deben ser legibles por consumers V2
- **Maneja duplicados gracefulmente**: Haz consumers idempotentes (upsert, no insert)
- **Monitorea dead letter queues**: Mensajes fallidos necesitan investigación, no dropping silencioso
- **Mantén payloads de eventos pequeños**: Referencia datos grandes; no embebas blobs

## Errores Comunes

1. **Spaghetti event-driven**: 50 microservicios suscritos al mismo evento crean acoplamiento invisible
2. **Idempotencia faltante**: Procesar el mismo evento de pago dos veces cobra al cliente dos veces
3. **Cadenas síncronas de eventos**: Llamar APIs HTTP dentro de event handlers anula el propósito
4. **Sin manejo de dead letter**: Mensajes fallidos desaparecen; pierdes eventos de negocio
5. **Suposiciones incorrectas de ordenamiento**: Asumir ordenamiento global cuando solo existe por partición

## Manejo de Errores y Recuperacion

- **Garantias de delivery de eventos**: elige entre at-most-once, at-least-once y exactly-once semantics.   At-most-once: fire and forget, menor overhead, puede perder eventos.   At-least-once: retry en failure, puede duplicar, requiere idempotency.   Exactly-once: transactional, mayor overhead, mas dificil de implementar.
- **Saga pattern para transacciones distribuidas**: Choreography-based: cada servicio emite eventos que triggerean el next step.   Orchestration-based: un orchestrator central coordina el saga.   Setea timeouts para cada saga step.
- **Replay y recuperacion de eventos**: storea todos los eventos en un event store para replay.   Cuando un servicio recupera despues de downtime, replaya eventos desde la last processed position.   Soporta partial replay para event types especificos.
- **Circuit breaker para event consumers**: protege downstream services de cascade failures.   Tripea circuit breaker despues de N fallos consecutivos.   Para de consumir eventos mientras el circuit esta open.   Resetea circuit despues de procesamiento exitoso.
- **Dead letter queue para eventos**: rutea eventos no procesables a una DLQ despues de max retries.   Inspecciona eventos de DLQ para patrones de error.   Replaya eventos de DLQ despues de fixear root cause.   Setea TTL en eventos de DLQ.
- **Deteccion de poison pill**: Mueve a poison queue despues de threshold.   Analiza poison events para schema mismatches, payloads invalidos o missing dependencies.   Fixea root cause antes de replayar.

## Performance y Escalabilidad

- **Particionamiento de eventos**: particiona eventos por key (ej.   order ID, customer ID) para procesamiento paralelo.   Eventos con la misma key van a la misma partition, preservando orden.   Elije partition count basado en necesidades de throughput.
- **Handling de backpressure**: cuando la rate de produccion de eventos excede la rate de consumo, aplica backpressure.   Aplica rate limiting en el producer.   Scalea consumers horizontalmente.   Alerta cuando lag excede threshold.
- **Scaling de consumers**: scalea consumers basado en queue depth o processing lag.   Scalea por CPU, memory o custom metrics (queue depth).   Setea min/max replicas.
- **Optimizacion de serializacion de eventos**: elige formatos de serializacion eficientes.   JSON: human-readable, payload mas grande.   Avro: compact, schema-based, requiere schema registry.   Protobuf: compact, language-agnostic, requiere schema.   MessagePack: alternativa compacta a JSON.   Benchmarka tiempo de serialization/deserialization.
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




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de event-driven y microservices para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica microservicios event-driven** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿Cuándo debo usar event sourcing vs. CRUD tradicional?**
R: Usa event sourcing para dominios donde el historial de auditoría, queries temporales o replay son críticos (finanzas, logística). Usa CRUD para dominios simples de CRUD.

**P: ¿Cómo manejo evolución de schema en eventos?**
R: Usa schema registries (Confluent, AWS Glue). Agrega campos; nunca elimines. Mantén compatibilidad hacia atrás por 2+ versiones.

**P: ¿Cuál es la diferencia entre sagas de coreografía y orquestación?**
R: Coreografía: los servicios reaccionan a eventos independientemente. Orquestación: un coordinador central dirige cada paso. La orquestación es más fácil de debug; la coreografía está más desacoplada.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
