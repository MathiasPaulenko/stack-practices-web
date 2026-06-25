---
contentType: patterns
slug: sequential-convoy-pattern
title: "Patron de Convoy Secuencial"
description: "Preserva el orden de mensajes relacionados en un sistema distribuido agrupandolos en secuencias ordenadas y procesandolos uno a la vez a traves de un unico consumidor."
metaDescription: "Aprende el Patron de Convoy Secuencial para orden de mensajes. Ejemplos en Python, Java y JavaScript con IDs de secuencia, partition keys y procesamiento ordenado."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - convoy-secuencial
  - patron
  - patron-de-diseno
  - mensajeria
  - ordenamiento
  - secuencia
  - kafka
  - cola
relatedResources:
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/idempotent-consumer-pattern
  - /patterns/design/distributed-lock-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Convoy Secuencial para orden de mensajes. Ejemplos en Python, Java y JavaScript con IDs de secuencia, partition keys y procesamiento ordenado."
  keywords:
    - convoy secuencial
    - patron de diseno
    - ordenamiento de mensajes
    - secuencia
    - kafka
    - partition key
    - procesamiento ordenado
---

# Patron de Convoy Secuencial

## Resumen

El Patron de Convoy Secuencial preserva el orden de mensajes relacionados en un sistema de mensajeria distribuido. Cuando los mensajes tienen una relacion causal, procesarlos fuera de orden produce estado inconsistente.

Este patron agrupa mensajes relacionados en un **convoy** (secuencia) y asegura que sean procesados por un unico consumidor en orden. Convoys no relacionados pueden procesarse en paralelo, preservando correccion y rendimiento.

## Cuando Usar

- Mensajes para la misma entidad deben procesarse en orden de produccion
- Event sourcing donde eventos para un agregado deben aplicarse secuencialmente
- Pipelines de procesamiento de pedidos donde transiciones dependen de estados previos
- Sistemas de inventario donde movimientos de stock deben aplicarse cronologicamente

## Cuando Evitar

- Mensajes sin relacion causal
- El sistema tolera consistencia eventual sin garantias de orden
- Volumenes por convoy son tan altos que un solo consumidor crea cuello de botella

## Solucion

### Python (Kafka con Partition Key)

```python
from kafka import KafkaProducer, KafkaConsumer
import json

class OrderedMessageProducer:
    def __init__(self, bootstrap_servers):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            partitioner=lambda key, partitions, topic: hash(key) % len(partitions)
        )

    def send_event(self, entity_id, event_type, payload):
        message = {'entity_id': entity_id, 'event_type': event_type, 'payload': payload}
        self.producer.send('entity-events', key=entity_id.encode(), value=message)
        self.producer.flush()

class SequentialConvoyConsumer:
    def __init__(self, bootstrap_servers, topic, group_id):
        self.consumer = KafkaConsumer(topic, bootstrap_servers=bootstrap_servers,
            group_id=group_id, auto_offset_reset='earliest',
            max_poll_records=1, enable_auto_commit=False)
        self.last_processed = {}

    def process_messages(self):
        for message in self.consumer:
            event = json.loads(message.value)
            entity_id = event['entity_id']
            seq_num = event.get('sequence_number', 0)
            expected = self.last_processed.get(entity_id, 0) + 1
            if seq_num == expected:
                self._process_event(event)
                self.last_processed[entity_id] = seq_num
            self.consumer.commit()

    def _process_event(self, event):
        print(f"Procesando {event['event_type']} para {event['entity_id']}")
```

### Java (Azure Service Bus Sessions)

```java
// Session ID asegura orden dentro de una sesion
ServiceBusMessage message = new ServiceBusMessage(data);
message.setSessionId(entityId);
sender.sendMessage(message);

// Consumer: un procesador maneja una sesion a la vez
ServiceBusProcessorClient processor = new ServiceBusClientBuilder()
    .processor().queueName("ordered-queue")
    .processMessage(ctx -> { /* procesar en orden */ })
    .prefetchCount(1)
    .buildProcessorClient();
processor.start();
```

### JavaScript (Redis Streams)

```javascript
class SequentialConvoyProcessor {
    constructor(redis, streamKey) {
        this.redis = redis;
        this.streamKey = streamKey;
    }
    async produceEvent(entityId, eventType, payload) {
        const sequence = await this.redis.incr(`seq:${entityId}`);
        await this.redis.xadd(this.streamKey, '*', 'entityId', entityId,
            'sequence', sequence, 'eventType', eventType,
            'payload', JSON.stringify(payload));
    }
}
```

## Explicacion

El patron se basa en dos mecanismos clave:

1. **Particionamiento por ID de entidad:** Los mensajes para la misma entidad se enrutan a la misma particion/cola/sesion.
2. **Unico consumidor por particion:** Solo un consumidor procesa mensajes de una particion dada, evitando procesamiento paralelo para la misma entidad.

El compromiso es paralelismo reducido por entidad — todos los mensajes para `user-123` deben ser secuenciales. Sin embargo, mensajes para `user-456` pueden procesarse en paralelo en otra particion.

## Variantes

| Variante | Mecanismo | Ideal Para |
|----------|-----------|------------|
| Partition key de Kafka | Asignacion por hash | Alto throughput, orden simple |
| Sesiones de Service Bus | Balanceo por sesion | Nativo en la nube, exactly-once |
| Single active consumer de RabbitMQ | Consumidor exclusivo | Ordenamiento basado en colas |
| Tabla de secuencia en base de datos | Bloqueo optimista | Sin broker de mensajeria |

## Mejores Practicas

- Usar una clave de particion determinista
- Monitorear skew de particiones
- Manejar mensajes faltantes con gracia
- Mantener convoys pequenos y acotados
- Hacer el procesamiento idempotente dentro de convoys

## Errores Comunes

- Cambiar claves de particion
- Multiples consumidores por particion
- No manejar gaps de secuencia
- Convoys demasiado grandes
- Ignorar reintentos del productor

## Ejemplos del Mundo Real

- **Kafka:** Usa ID de usuario como partition key. Uber usa esto para eventos de viaje que deben ordenarse.
- **Azure Service Bus:** Sesiones proporcionan orden FIFO dentro de una sesion, usado en carritos de comercio electronico.
- **Event Store DB:** Control de concurrencia optimista en streams donde cada agregado es un stream.

## Preguntas Frecuentes

**P: ¿Como difiere de usar una sola cola?**
R: Una cola unica fuerza a TODOS los mensajes a ser secuenciales, destruyendo el throughput.

**P: ¿Que pasa si se pierde un mensaje?**
R: El convoy se detiene en el gap. Implementar timeouts y alertas.

**P: ¿Puedo tener multiples consumidores para tolerancia a fallas?**
R: Si — los grupos de consumidores de Kafka balancean particiones, pero cada particion la posee un consumidor a la vez.
