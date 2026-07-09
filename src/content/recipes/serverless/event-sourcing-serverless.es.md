---
contentType: recipes
slug: event-sourcing-serverless
title: "Implementar Event Sourcing en Arquitecturas Serverless"
description: "Cómo capturar todos los cambios como eventos inmutables usando event sourcing con AWS Lambda, DynamoDB streams y event stores para audit trails y consultas temporales."
metaDescription: "Aprende event sourcing en arquitecturas serverless. Captura cambios como eventos inmutables usando Lambda, DynamoDB streams y event stores para audit trails."
difficulty: advanced
topics:
  - serverless
tags:
  - serverless
  - cqrs
  - aws-lambda
  - functions
  - faas
relatedResources:
  - /recipes/cqrs-pattern-recipe
  - /recipes/saga-pattern-recipe
  - /recipes/serverless-orchestration
  - /recipes/event-driven-architecture
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende event sourcing en arquitecturas serverless. Captura cambios como eventos inmutables usando Lambda, DynamoDB streams y event stores para audit trails."
  keywords:
    - event sourcing serverless
    - eventos inmutables
    - event store
    - DynamoDB streams
    - audit trail
---

## Visión general

Los sistemas tradicionales almacenan el estado actual. Una orden está "enviada," y la fila de base de datos dice `status = shipped`. Si un usuario pregunta "¿cuándo cambió el estado a enviado?" la base de datos no tiene respuesta — el valor anterior fue sobrescrito. Si un analista pregunta "¿cuántas órdenes fueron canceladas y re-enviadas el mes pasado?" el sistema no puede responder sin agregar columnas de auditoría explícitas que rastreen cada cambio manualmente.

Event sourcing almacena cada cambio de estado como un evento inmutable en un log append-only. El estado actual se computa reproduciendo eventos. El estado de una orden no es una fila — es la secuencia `[OrderCreated, ItemAdded, PaymentProcessed, Shipped]`. Esto provee un audit trail completo, soporta consultas temporales ("¿cuál era el estado a las 3pm de ayer?"), y permite reconstruir proyecciones desde cero. En arquitecturas serverless, los eventos se capturan vía DynamoDB streams, SQS o EventBridge, y las funciones Lambda proyectan el modelo de lectura. La solucion a continuacion cubre implementación de event sourcing, event stores, proyecciones y consideraciones específicas de serverless.

## Cuándo usarlo

Usa esta receta cuando:

- El historial completo de auditoría de todos los cambios es un requerimiento de negocio. Consulta [Event-Driven Functions](/recipes/messaging/event-driven-microservices) para arquitecturas event-driven.
- Necesitas responder preguntas temporales sobre estados pasados
- Reconstruir modelos de lectura desde cero es una capacidad necesaria. Consulta [Serverless Orchestration](/recipes/devops/background-jobs) para gestionar workflows stateful.
- El modelo de escritura es complejo y el modelo de lectura necesita optimizarse separadamente
- Requerimientos de compliance o regulatorios mandatan logs de cambio inmutables. Consulta [CQRS Pattern](/patterns/design/cqrs-pattern) para separar modelos de lectura y escritura.

## Solución

### Event Store con DynamoDB y Streams

```typescript
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  version: number;
}

class OrderEventStore {
  constructor(private tableName: string, private client: DynamoDBDocument) {}

  async appendEvents(aggregateId: string, events: DomainEvent[]): Promise<void> {
    const currentVersion = await this.getCurrentVersion(aggregateId);

    const transactItems = events.map((event, index) => ({
      Put: {
        TableName: this.tableName,
        Item: {
          pk: `ORDER#${aggregateId}`,
          sk: `EVENT#${(currentVersion + index + 1).toString().padStart(10, '0')}`,
          eventId: event.eventId,
          eventType: event.eventType,
          payload: event.payload,
          timestamp: new Date().toISOString(),
          version: currentVersion + index + 1,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    }));

    await this.client.transactWrite({ TransactItems: transactItems });
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const result = await this.client.query({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORDER#${aggregateId}`,
        ':sk': 'EVENT#',
      },
      ScanIndexForward: true,
    });

    return (result.Items || []).map(item => ({
      eventId: item.eventId,
      aggregateId,
      eventType: item.eventType,
      payload: item.payload,
      timestamp: item.timestamp,
      version: item.version,
    }));
  }

  private async getCurrentVersion(aggregateId: string): Promise<number> {
    const events = await this.getEvents(aggregateId);
    return events.length > 0 ? events[events.length - 1].version : 0;
  }
}
```

### Lambda Projection Handler

```typescript
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;

    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    const domainEvent: DomainEvent = {
      eventId: newImage.eventId,
      aggregateId: newImage.aggregateId,
      eventType: newImage.eventType,
      payload: newImage.payload,
      timestamp: newImage.timestamp,
      version: newImage.version,
    };

    await projectEvent(domainEvent);
  }
};

async function projectEvent(event: DomainEvent): Promise<void> {
  switch (event.eventType) {
    case 'OrderCreated':
      await createOrderProjection(event.aggregateId, event.payload);
      break;
    case 'ItemAdded':
      await addItemToOrderProjection(event.aggregateId, event.payload);
      break;
    case 'OrderShipped':
      await updateOrderStatus(event.aggregateId, 'shipped');
      break;
  }
}
```

### Reconstrucción de Agregado

```typescript
class OrderAggregate {
  private status: string = 'pending';
  private items: OrderItem[] = [];
  private total: number = 0;

  applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.status = 'created';
        this.total = event.payload.total as number;
        break;
      case 'ItemAdded':
        this.items.push(event.payload.item as OrderItem);
        this.total += (event.payload.item as OrderItem).price;
        break;
      case 'OrderShipped':
        this.status = 'shipped';
        break;
      case 'OrderCancelled':
        this.status = 'cancelled';
        break;
    }
  }

  static fromEvents(events: DomainEvent[]): OrderAggregate {
    const order = new OrderAggregate();
    for (const event of events) {
      order.applyEvent(event);
    }
    return order;
  }
}
```

## Explicación

- **Event store**: el event store es un log append-only. Los eventos nunca se actualizan ni eliminan. Cada evento tiene un ID único, un aggregate ID (la entidad a la que pertenece), un tipo, un payload y una versión. La versión asegura ordenamiento y previene escrituras concurrentes (control de concurrencia optimista vía `ConditionExpression`).
- **Reconstrucción de agregado**: el estado actual de una entidad no se almacena directamente. En su lugar, cargas todos los eventos de un agregado y los reproduces en orden. El objeto agregado comienza vacío y aplica cada evento, mutando su estado interno. Esto es determinista — la misma secuencia de eventos siempre produce el mismo estado.
- **Proyecciones (modelos de lectura)**: los modelos de lectura se construyen suscribiéndose al stream de eventos. Cuando un evento es agregado, una Lambda (disparada por DynamoDB streams) actualiza la vista optimizada para lectura. Puedes tener múltiples proyecciones para los mismos eventos — una para el dashboard del cliente, otra para analytics, otra para indexación de búsqueda.
- **Snapshots**: reproducir miles de eventos para un agregado de larga vida es lento. Los snapshots cachean el estado del agregado en una versión específica. Para reconstruir, carga el último snapshot y reproduce solo eventos después de esa versión. Almacena snapshots periódicamente (ej. cada 100 eventos) y asíncronamente.

## Variantes

| Enfoque | Store | Proyecciones | Mejor para |
|---------|-------|-------------|------------|
| DynamoDB + Streams | DynamoDB | Lambda | Nativo AWS, escala moderada |
| EventStoreDB | EventStoreDB | Subscriptions | Alto volumen, dominios complejos |
| Kafka + KTables | Kafka | Kafka Streams | Stream processing, replay |
| S3 + Athena | S3 | Athena queries | Audit, compliance, analytics |
| Aurora + Outbox | PostgreSQL | CDC | Event sourcing relacional |

## Lo que funciona

- **Versiona cada evento**: incluye una versión monotónicamente creciente por agregado. Usa `ConditionExpression` de DynamoDB para rechazar escrituras con versiones stale. Esto previene updates perdidos cuando dos usuarios modifican simultáneamente el mismo agregado.
- **Haz los eventos inmutables y autocontenidos**: un evento debería llevar todos los datos necesarios para entenderlo, no solo deltas. `OrderCreated` debería incluir customer ID, dirección de envío y líneas de items — no solo "la orden 123 fue creada." Consumidores futuros no deberían necesitar consultar otros sistemas para interpretar el evento.
- **Usa correlation IDs a través de la cadena de eventos**: cuando un evento dispara otro (ej. `OrderShipped` dispara `InventoryDecremented`), propaga el correlation ID. Esto habilita tracing end-to-end y debugging a través de cadenas de eventos distribuidas.
- **Implementa proyecciones idempotentes**: las funciones Lambda reintentan ante fallas. Una proyección que incrementa un contador en cada invocación sobrecuentará. Diseña proyecciones idempotentes — escribe el event ID en la fila de proyección y salta si ya fue procesado.
- **Archiva eventos viejos a cold storage**: DynamoDB es caro para almacenamiento a largo plazo de millones de eventos. Mueve eventos mayores a 90 días a S3 usando TTL de DynamoDB o jobs de export. Mantén el event store lean y consulta datos archivados vía Athena cuando sea necesario.

## Errores comunes

- **Almacenar estado actual junto a eventos**: si mantienes tanto un log de eventos como una tabla de estado actual, pueden divergir. Un bug en la proyección escribe estado A mientras el log contiene eventos para estado B. La fuente de verdad es el event store; las proyecciones son derivadas. No trates la proyección como estado primario.
- **Exponer tipos de evento a sistemas externos**: los consumidores externos no deberían depender de schemas internos de eventos. Usa un schema de evento público (ej. `OrderConfirmed`) y mapea eventos internos a públicos. El refactoring interno de tipos de evento no debería romper integraciones externas.
- **No manejar la evolución de schema de eventos**: cuando un tipo de evento cambia (agregando un campo), eventos viejos en el log no tienen el nuevo campo. El agregado debe manejar campos faltantes gracefulmente. Usa versionado de schema y valores por defecto, o upcast eventos viejos al cargar.
- **Reproducir eventos desde el inicio para cada query**: siempre usa snapshots para agregados con historias largas. Reproducir 10,000 eventos para cada `GET /order/123` destruye el rendimiento. Toma snapshots asíncronamente y carga desde ellos.

## Preguntas frecuentes

### ¿Es event sourcing más complejo que CRUD?

Sí. Agrega conceptos (agregados, proyecciones, versionado de eventos) e infraestructura (event stores, stream processors). Úsalo solo cuando los beneficios (auditoría, consultas temporales, capacidad de reconstrucción) justifiquen la complejidad. Para CRUD simple sin requerimientos de auditoría, el almacenamiento tradicional de estado es suficiente.

### ¿Cómo elimino datos bajo GDPR si los eventos son inmutables?

Implementa crypto-shredding: encripta payloads de eventos con una clave por usuario. Para "eliminar" los datos de un usuario, borra su clave de encriptación. Los eventos permanecen pero son ilegibles. Alternativamente, almacena PII en un store mutable separado y referéncialo desde los eventos.

### ¿Puedo usar event sourcing con bases de datos relacionales?

Sí — usa el outbox pattern. Escribe eventos a una tabla `outbox` en la misma transacción que los cambios de datos de negocio. Un proceso CDC (change data capture) sondea el outbox y publica eventos. Esto te da garantías ACID con semántica de event sourcing.

### ¿Cómo consulto a través de agregados?

No consultes el event store directamente para queries cross-aggregate. Construye proyecciones de modelo de lectura que desnormalicen datos para eficiencia de query. El event store es el modelo de escritura; las proyecciones son el modelo de lectura. Esta separación es CQRS.

### ¿Cómo manejo la evolución del schema de eventos?

Versiona eventos explícitamente: incluye un campo `version` en cada evento. Usa upcasters (transformadores que convierten versiones viejas de eventos a nuevas) al leer eventos del store. Nunca modifiques clases de evento existentes — crea una nueva versión y escribe un upcaster. Para protobuf, usa campos `reserved` y agrega nuevos campos con nuevos números. Para eventos JSON, usa evolución de `json-schema` con cambios additive-only.

### ¿Cómo manejo eventos duplicados en serverless?

Usa idempotency keys: incluye un event ID único (UUID) y trackea IDs procesados en una tabla de deduplicación. En AWS Lambda, usa DynamoDB conditional writes para marcar atómicamente un evento como procesado. Setea un TTL en la tabla de deduplicación (ej., 7 días) para limitar storage. Para Kinesis, usa el sequence number como key de deduplicación. Procesa eventos idempotentemente para que reprocesar el mismo evento produzca el mismo resultado.

### ¿Cómo reproceso eventos para reconstruir read models?

Lee todos los eventos del event store en orden, aplica cada uno al handler de proyección, y escribe el read model actualizado. Usa una tabla de checkpoint para trackear el último sequence number procesado. Para event stores grandes, reprocesá en batches (ej., 1000 eventos a la vez) para evitar memory pressure. Corre el replay como una Lambda function separada o batch job. Pausa el handler de proyección real-time durante el replay para evitar conflictos, luego resume desde el checkpoint.

### ¿Cómo testeo sistemas de event sourcing?

Testea agregados reproduciendo eventos y asertando sobre el estado resultante. Testea proyecciones alimentando una secuencia de eventos conocida y asertando sobre el output del read model. Usa event fixtures: una lista de eventos que producen un estado de agregado conocido. Para tests de integración, usa un event store in-memory y verifica el ciclo completo: command → events → projection. Testea versionado de eventos reproduciendo eventos de versión vieja a través de upcasters y asertando que el payload upcasted coincide con el nuevo schema.

### ¿Cómo manejo writes concurrentes al mismo agregado?

Usa optimistic concurrency control. Incluye el número de versión esperado en el write request. El event store rechaza el write si la versión actual no coincide con la versión esperada. En DynamoDB, usa una conditional expression: `attribute_not_exists(version) OR version = :expected_version`. En conflicto, reintenta cargando los últimos eventos, reaplicando el command, y escribiendo de nuevo. Para agregados de alta contención, considera usar un saga o process manager para serializar writes. No uses pessimistic locking en serverless — las Lambda functions son stateless y no pueden mantener locks.

### ¿Cómo implemento snapshots para agregados con historias de eventos largas?

Periódicamente guarda el estado completo del agregado como snapshot. Almacena snapshots en una tabla separada con el aggregate ID y número de versión. Al cargar, fetchea el último snapshot y reproduce solo los eventos después de la versión del snapshot. Toma snapshots cada N eventos (ej., cada 100) o después de un intervalo de tiempo. En DynamoDB, almacena snapshots en una partición separada: `PK = AGGREGATE#123, SK = SNAPSHOT#42`. La creación de snapshots debería ser async — no bloquees el write path. Si un snapshot falla, el sistema continúa funcionando reproduciendo desde el principio.

### ¿Cómo manejo el ordenamiento de eventos en serverless?

Usa sequence numbers del event store (DynamoDB stream ARN + sequence number, Kinesis sequence number). Procesa eventos en orden por agregado keyeando en aggregate ID. En Lambda, usa el partition key para asegurar que todos los eventos del mismo agregado vayan al mismo shard. No dependas de timestamps de eventos para ordenamiento — clock skew entre productores puede causar misordering. Para ordenamiento cross-aggregate, usa una secuencia global (DynamoDB atomic counter o Snowflake ID) y procesa eventos en orden de secuencia en la proyección.

### ¿Cómo manejo el crecimiento del event store en producción?

Setea una política de retención: guarda todos los eventos para agregados recientes (ej., 90 días), luego archiva eventos viejos a cold storage (S3 Glacier). Para requerimientos de auditoría que mandaten guardar todos los eventos, comprime eventos viejos y muévelos a S3 con lifecycle policies. Implementa una estrategia de compaction: para agregados sin necesidades de replay futuro, crea un snapshot final y elimina los eventos individuales. En DynamoDB, usa TTL en records de eventos viejos o archiva a S3 via DynamoDB export. Monitorea el tamaño del event store y alerta cuando el crecimiento exceda proyecciones. Particiona el event store por tiempo (tablas mensuales) para hacer archival y deletion manejable.

### ¿Cómo implemento sagas con event sourcing en serverless?

Un saga es una secuencia de transacciones locales coordinadas por eventos. Cada paso publica un evento que triggerea el siguiente paso. En serverless, implementa cada paso del saga como una Lambda function separada triggered por eventos. Usa una saga state table (DynamoDB) para trackear el paso actual y compensar en fallo. Para compensating actions, publica un compensation event que revierte el efecto de un paso anterior. No implementes sagas como una sola Lambda long-running — Lambda tiene un timeout de 15 minutos. Usa Step Functions para orquestación si necesitas visual workflow management, o usa pure event-driven choreography para sagas más simples.

### ¿Cómo migro de CRUD a event sourcing incrementalmente?

Empieza con un solo agregado. Wrappea las operaciones CRUD existentes en un event-sourcing adapter: en write, publica un evento adicional a actualizar la base de datos. En read, continúa usando la base de datos existente. Una vez que el event store es confiable, switcha reads a proyecciones construidas desde eventos. Corre ambos sistemas en paralelo (dual write) y compara resultados. Una vez confiado, remueve el CRUD write path y confía solo en eventos. No intentes una big-bang migration — el riesgo de data loss es muy alto. Migra un agregado a la vez, con full rollback capability en cada paso.

### ¿Cómo manejo la evolución del schema de eventos en producción?

Versiona eventos con un campo `version` en el payload del evento. Cuando el schema cambia, escribe una función upcaster que transforme eventos de versión vieja al nuevo schema durante el replay. Almacena upcasters en un registry keyeado por event type y version. Por ejemplo, `UserCreatedV1` con `fullName` se convierte en `UserCreatedV2` con `firstName` y `lastName` spliteando el full name. Nunca modifiques eventos existentes en el store — siempre upcast en read time. Testea upcasters con event fixtures de producción (anonimizados). Documenta breaking changes en un changelog para que los developers de proyecciones puedan actualizar sus handlers.

### ¿Cómo testeo sistemas event-sourced en serverless?

Testea agregados reproduciendo eventos y asertando sobre el estado resultante. Usa estilo given-when-then: dada una lista de eventos previos, cuando un command se ejecuta, entonces eventos específicos deberían producirse. Testea proyecciones feedeando eventos y asertando sobre la vista materializada. Para Lambda functions, usa `aws-sdk-client-mock` para mockear DynamoDB y EventBridge. Testea idempotencia reproduciendo el mismo evento dos veces y verificando que no haya side effects duplicados. Testea ordenamiento de eventos enviando eventos fuera de orden y verificando que la proyección los maneje correctamente. Usa LocalStack para tests de integración con APIs reales de AWS localmente.

### ¿Cómo manejo GDPR right-to-be-forgotten con event sourcing?

Usa crypto-shredding: encripta campos sensibles con una key por usuario, y elimina la key cuando el usuario solicita eliminación. Almacena la referencia de la key encriptada en el payload del evento, no la key misma. Cuando la key se elimina, los datos encriptados se vuelven ilegibles. Almacena keys de encriptación por usuario en un key management service separado (AWS KMS, HashiCorp Vault). Para eventos que contienen PII en plain-text, implementa una proyección de redaction que reemplace PII con placeholders hasheados. No modifiques eventos históricos — el event store es inmutable. Documenta el proceso de eliminación en tu privacy policy y verifica compliance con legal counsel.

### ¿Cómo manejo event replay y rebuilding de proyecciones?

Para rebuildear una proyección, crea una nueva Lambda function que lea eventos desde el principio del stream y los feedee al projection handler. Usa DynamoDB Scan con paginación o EventBridge replay para reprocesar eventos históricos. Para event stores grandes, paraleliza el replay particionando por aggregate ID. Trackea el progreso del replay en una DynamoDB table para soportar resumption. Durante el replay, deshabilita el write path de la proyección para evitar duplicate writes — usa una idempotency key (event ID) para manejar duplicados safeamente. Testea el replay en una staging projection primero para verificar correctitud. Monitorea el throughput del replay y estima el tiempo de completión basado en event count y processing rate.

### ¿Cómo manejo backpressure y throttling en Lambda consumers?

Lambda escala concurrentemente basado en el número de eventos en el stream. Si la proyección no puede procesar eventos tan rápido como llegan, DynamoDB Streams o EventBridge accumulan eventos. Configura `BatchSize` y `MaximumBatchingWindowInSeconds` para controlar cuántos eventos procesa Lambda por invocación. Setea `MaximumRecordAgeInSeconds` para descartar eventos viejos si el consumer no puede mantenerse al día. Usa `OnFailure` destination (SQS o SNS) para capturar eventos que fallaron después de todos los retries. Monitorea `IteratorAge` en CloudWatch — si excede 60 segundos, el consumer está cayendo detrás. Considera aumentar la concurrencia de Lambda o particionar el stream para paralelizar el procesamiento.

### ¿Cómo manejo consistencia eventual en proyecciones?

Las proyecciones son eventualmente consistentes por naturaleza — hay un lag entre el write del evento y el update de la proyección. Para reads que requieren consistencia strong, lee del aggregate directamente via replay en lugar de la proyección. Para UIs, muestra timestamps de "última actualización" basados en el último evento procesado. Usa CQRS con separate read/write models: el write model valida commands contra el aggregate, el read model sirve desde proyecciones. Si el lag es inaceptable, considera update la proyección synchronously dentro del command handler, pero esto aumenta la latencia del write.
