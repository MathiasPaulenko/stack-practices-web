---
contentType: recipes
slug: message-idempotency
title: "Idempotencia en Procesamiento de Mensajes"
description: "Hacé que el procesamiento de mensajes sea idempotente para que entregas duplicadas no generen side effects en sistemas event-driven."
metaDescription: "Procesamiento de mensajes idempotente con Redis, PostgreSQL y Kafka. Claves de deduplicación, semántica exactly-once y manejo seguro de entregas duplicadas."
difficulty: advanced
topics:
  - messaging
  - architecture
tags:
  - messaging
  - distributed-systems
  - kafka
  - rabbitmq
  - idempotency
  - event-driven
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/dead-letter-queue
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/microservices-architecture-guide
  - /guides/message-queue-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Procesamiento de mensajes idempotente con Redis, PostgreSQL y Kafka. Claves de deduplicación, semántica exactly-once y manejo seguro de entregas duplicadas."
  keywords:
    - message-idempotency
    - deduplicacion
    - idempotency-key
    - kafka
    - rabbitmq
    - distributed-systems
---

## Visión General

La mayoría de los message brokers prometen **at-least-once delivery**. Los
retries, los rebalances de consumers y los fallos del producer generan mensajes
duplicados. La idempotencia significa que procesar el mismo mensaje dos veces
deja al sistema en el mismo estado que procesarlo una vez. Esta receta muestra
cómo hacerlo con Redis, PostgreSQL y Kafka.

## Cuándo Usar

- Tu broker solo garantiza at-least-once delivery.
- Los producers reintentan publishes fallidos y pueden crear duplicados.
- Los consumer groups se rebalancean y reprocesan offsets anteriores.
- Un cobro, envío o email duplicado causaría un daño real.

### Cuándo evitarlo

- El consumer solo fija un valor, como `status = shipped`. Eso ya es idempotente
  por sí solo.
- Procesar duplicados es inofensivo, como actualizar una cache.
- Tu broker ya provee exactly-once semantics para tu caso de uso.

## Solución

### Clave de idempotencia con Redis (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function processPayment(message) {
  const key = `idempotency:${message.idempotencyKey || message.orderId}`;

  // SET NX EX: set solo si no existe, con expiración de 24h
  const locked = await client.set(key, 'processing', { NX: true, EX: 86400 });

  if (!locked) {
    console.log('Mensaje duplicado ignorado:', key);
    return { status: 'already_processed' };
  }

  try {
    const result = await chargeCustomer(message);
    await client.set(key, JSON.stringify(result), { EX: 86400 });
    return result;
  } catch (err) {
    // Borrar el lock para que el siguiente retry pueda intentar de nuevo
    await client.del(key);
    throw err;
  }
}
```

### Tabla de deduplicación en PostgreSQL

```sql
-- Tabla que almacena IDs de mensajes procesados y resultados
CREATE TABLE processed_messages (
    message_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    result JSONB
);

-- El consumer usa INSERT ... ON CONFLICT DO NOTHING
WITH inserted AS (
    INSERT INTO processed_messages (message_id, result)
    VALUES (
        'msg_abc123'::UUID,
        '{"status": "shipped"}'::JSONB
    )
    ON CONFLICT (message_id) DO NOTHING
    RETURNING message_id
)
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM inserted) THEN 'processed'
        ELSE 'duplicate'
    END AS status;
```

### Kafka idempotent producer (Java)

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

// Habilita exactly-once semantics por partición
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

Producer<String, String> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("orders", orderId, payload));
```

## Explicación

Un mensaje es idempotente cuando procesarlo N veces tiene el mismo efecto que
procesarlo una vez. Hay tres caminos para lograrlo.

1. **Deduplicación con un store externo.** Verificá una clave en Redis o base de
   datos antes de hacer el trabajo. Guardá el resultado para que los duplicados
   devuelvan la misma respuesta.
2. **Idempotencia natural.** Diseñá la operación para que sea segura repetirla.
   `UPDATE inventory SET quantity = 10 WHERE id = 1` fija un valor en lugar de
   decrementarlo, y `INSERT ... ON CONFLICT DO NOTHING` simplemente salta
   duplicados.
3. **Idempotencia a nivel de broker.** El producer idempotente de Kafka
   deduplica reintentos por partición, reduciendo la necesidad de chequeos en la
   aplicación.

La clave tiene que ser **única y estable**. Buenos orígenes son:

- Un UUID que el producer crea al publicar.
- Una business key que ya esté en el mensaje, como `orderId` o `paymentId`.
- Un hash del contenido del mensaje, aunque las colisiones son posibles.

## Variantes

| Enfoque | Ideal para | Compromiso |
| --- | --- | --- |
| Redis `SET NX` | Alto throughput | Pérdida de datos si Redis falla antes de persistir |
| Índice único en base de datos | Datos financieros o críticos | Más lento; requiere round-trip a la base |
| Idempotencia natural | Actualizaciones de estado simples | Requiere diseñar la operación para que sea segura |
| Kafka idempotent producer | Stream processing | Exactly-once por partición, no entre particiones |
| Bloom filter | Pre-filtro eficiente en memoria | Puede dar falsos positivos |

## Mejores Prácticas

- Guardá el resultado del procesamiento, no solo un flag. Devolver el mismo
  resultado ante duplicados hace al sistema predecible.
- Aplicá TTL al store de deduplicación. Mantené las claves 24–72 horas, más que
  la ventana de redelivery del broker.
- Usá business keys cuando podás. `orderId` es más fácil de entender que un UUID
  aleatorio.
- Manejá el estado `processing`. Una clave seteada sin resultado significa que el
  mensaje se cayó a mitad de camino; borrala o reprocesala con cuidado.
- Corré los mismos chequeos en código que esperás del broker. No asumas
  exactly-once delivery.
- Limpiá registros de deduplicación expirados. Los TTLs o cron jobs evitan que
  el storage crezca sin límite.

## Errores Comunes

- Guardar las claves de deduplicación solo en memoria. Un restart del consumer
  las borra.
- Usar campos no únicos, como timestamps, de idempotency keys.
- Asumir que el broker entrega exactly-once sin verificación.
- Llamar side effects no idempotentes, como enviar un email, dentro del camino de
  procesamiento.
- Dejar crecer la tabla de deduplicación hasta convertirla en un cuello de
  botella.
- Permitir retries antes de que el lock de deduplicación se libere.

## FAQ

### ¿Cuál es la diferencia entre idempotencia y deduplicación?

La deduplicación evita que un mensaje se procese dos veces. La idempotencia
significa que procesar el mismo mensaje dos veces deja el mismo estado final que
procesarlo una vez. Funcionan mejor juntas.

### ¿Se puede lograr exactly-once delivery?

El verdadero exactly-once delivery es imposible en sistemas distribuidos. Lo que
sí podés construir es **exactly-once processing** con idempotencia. El producer
idempotente de Kafka se acerca dentro de una sola partición.

### ¿Cuánto tiempo debería conservar las claves de deduplicación?

Más que tu ventana máxima de redelivery. Para Kafka, usá
`offsets.retention.minutes`. Para SQS, usá `visibility timeout × max retries +
buffer`.

### ¿Qué hace una buena idempotency key?

Un identificador estable y único. Preferí una business key como `orderId` o
`paymentId` si ya está en el mensaje. Si no, generá un UUID al publicar.

### ¿Cómo manejo idempotencia entre varios servicios?

Usá un store de deduplicación centralizado que todos los consumers verifiquen,
como Redis o DynamoDB. Guardá el ID del mensaje y el resultado. Cada servicio
verifica la misma clave antes de actuar.

### ¿Cuál es el overhead de los chequeos de idempotencia?

Los chequeos con `SET NX` de Redis tardan menos de un milisegundo. Los de base de
datos tardan unos pocos milisegundos. El costo es pequeño comparado con cobros,
envíos o notificaciones duplicados.
