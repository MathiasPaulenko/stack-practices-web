---
contentType: recipes
slug: message-idempotency
title: "Idempotencia en Procesamiento de Mensajes"
description: "Diseña procesadores de mensajes idempotentes que manejan entregas duplicadas de forma segura sin side effects en sistemas async y event-driven."
metaDescription: "Procesamiento de mensajes idempotente: estrategias de deduplicación, idempotency keys, semántica exactly-once y manejo seguro de entregas duplicadas."
difficulty: advanced
topics:
  - messaging
tags:
  - message-idempotency
  - messaging
  - distributed-systems
  - architecture
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/dead-letter-queue
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Procesamiento de mensajes idempotente: estrategias de deduplicación, idempotency keys, semántica exactly-once y manejo seguro de entregas duplicadas."
  keywords:
    - message-idempotency
    - messaging
    - distributed-systems
    - architecture
---
## Visión General

La idempotencia asegura que procesar el mismo mensaje múltiples veces produce el mismo resultado que procesarlo una vez. En sistemas async donde at-least-once delivery es el default, los mensajes duplicados son inevitables — retries de red, rebalances de consumers y retries de producers todos crean duplicados. Sin idempotencia, los clientes se cobran dos veces, el inventario se decrementa dos veces y los emails se envían dos veces.

## Cuándo Usar

Usa este recurso cuando:
- Usas message brokers que garantizan at-least-once delivery (Kafka, RabbitMQ, SQS)
- Los producers reintentan publishes fallidos, creando mensajes duplicados
- Los consumer groups se rebalancean y reprocesan mensajes desde offsets anteriores
- Se requieren exactamente-once semantics pero el broker no las soporta nativamente

## Solución

### Idempotency Key con Redis (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function processPayment(message) {
  const idempotencyKey = message.idempotencyKey || message.orderId;
  const lockKey = `idempotency:${idempotencyKey}`;
  
  // SET NX EX: set solo si no existe, con expiración de 24h
  const locked = await client.set(lockKey, 'processing', {
    NX: true,
    EX: 86400
  });
  
  if (!locked) {
    console.log('Mensaje duplicado ignorado:', idempotencyKey);
    return { status: 'already_processed' };
  }
  
  try {
    const result = await chargeCustomer(message);
    await client.set(lockKey, JSON.stringify(result), { EX: 86400 });
    return result;
  } catch (err) {
    // Remover lock en fallo para que retry pueda intentar de nuevo
    await client.del(lockKey);
    throw err;
  }
}
```

### Database Deduplication con Unique Index (PostgreSQL)

```sql
-- Tabla almacena IDs de mensajes procesados
CREATE TABLE processed_messages (
    message_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    result JSONB
);

-- Consumer usa INSERT ... ON CONFLICT DO NOTHING
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
    END as status;
```

### Kafka Exactly-Once Producer (Java)

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

// Habilitar idempotent producer (exactly-once por partición)
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

Producer<String, String> producer = new KafkaProducer<>(props);

producer.send(new ProducerRecord<>("orders", orderId, payload));
```

## Explicación

**Tres estrategias de deduplicación**:

| Estrategia | Storage | Latencia | Durabilidad |
|------------|---------|----------|-------------|
| Cache externo (Redis) | Memoria | <1ms | Media (basada en TTL) |
| Database unique index | Disco | 5-20ms | Alta (transactional) |
| Natural idempotency | Ninguno | 0ms | Infinita (a nivel de diseño) |

**Ejemplos de natural idempotency**:
- `UPDATE accounts SET balance = 100 WHERE id = 1` (setea valor, no incrementa)
- `INSERT ... ON CONFLICT DO NOTHING` (ignora duplicados)
- `DELETE FROM carts WHERE user_id = 5` (idempotente incluso si se ejecuta dos veces)

**Fuentes de message ID**:
- UUID generado por producer en tiempo de publish
- Business key (orderId, paymentId) ya presente en payload
- Hash de contenido del mensaje (determinístico pero posibles colisiones)

## Variantes

| Enfoque | Ideal Para | Trade-off |
|---------|------------|-----------|
| Redis SET NX | Alto throughput | Pérdida de datos si Redis falla |
| DB unique constraint | Datos financieros | Más lento; requiere round-trip a DB |
| Bloom filter | Check memory-efficient | Falsos positivos posibles |
| Kafka transactional | Stream processing | Mayor latencia; exactly-once por partición |

## Mejores Prácticas

- **TTL a tu store de dedup**: Mantén keys por 24-72 horas; los brokers no re-entregan indefinidamente
- **Incluye resultado del procesamiento**: Almacenar el resultado permite retornar la misma respuesta para duplicados
- **Usa business keys cuando sea posible**: `orderId` es más significativo que un UUID random
- **Maneja el estado "processing"**: Una key seteada pero no completada indica un mensaje in-flight
- **Limpia keys expiradas**: Cron jobs o TTL de Redis previenen crecimiento ilimitado de storage

## Errores Comunes

1. **Sin ventana de deduplicación**: Chequear duplicados solo en memoria significa que reinicios de proceso pierden estado
2. **Colisiones de keys**: Usar timestamps o campos no únicos crea falsos duplicados
3. **Ignorar el contrato "at-least-once"**: Asumir que el broker entrega exactly-once sin verificación
4. **Side effects no idempotentes**: Enviar email dentro de la transacción significa que duplicados envían múltiples emails
5. **Olvidar limpiar**: Tablas de deduplicación que crecen para siempre se convierten en cuellos de botella de performance

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre idempotencia y deduplicación?**
R: La deduplicación previene procesar el mismo mensaje dos veces. La idempotencia significa que procesar dos veces produce el mismo resultado. A menudo se usan juntas.

**P: ¿Puedo lograr exactly-once delivery?**
R: En práctica, exactly-once es actualmente exactly-once processing con idempotency. El verdadero exactly-once delivery es imposible en sistemas distribuidos.

**P: ¿Cuánto tiempo debería mantener keys de deduplicación?**
R: Más que tu ventana máxima de redelivery. Para Kafka: `offsets.retention.minutes`. Para SQS: visibility timeout × max retries + buffer.
