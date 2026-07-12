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
  - /patterns/queue-based-load-leveling-pattern
  - /patterns/idempotent-consumer-pattern
  - /patterns/distributed-lock-pattern
  - /patterns/claim-check-pattern
lastUpdated: "2026-07-09"
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


- For alternatives, see [Idempotent Consumer Pattern](/es/patterns/idempotent-consumer-pattern/).

- Mensajes para la misma entidad deben procesarse en orden de produccion
- Event sourcing donde eventos para un agregado deben aplicarse secuencialmente
- Pipelines de procesamiento de pedidos donde transiciones dependen de estados previos
- Sistemas de inventario donde movimientos de stock deben aplicarse cronologicamente
- Workflows multi-paso donde el paso N no puede comenzar hasta que el paso N-1 termine

## Cuando Evitar

- Mensajes sin relacion causal — el procesamiento paralelo es mas simple y rapido
- El orden estricto no es necesario (ej. eventos de analytics independientes)
- El sistema tolera consistencia eventual sin garantias de orden
- Volumenes por convoy son tan altos que un solo consumidor crea cuello de botella

## Solucion

### Python (Kafka con Partition Key)

```python
from kafka import KafkaProducer, KafkaConsumer
import json
import time

class OrderedMessageProducer:
    """Produce mensajes que mantienen ordenamiento por entidad"""

    def __init__(self, bootstrap_servers):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            partitioner=lambda key, partitions, topic: (
                hash(key) % len(partitions) if key else 0
            )
        )

    def send_event(self, entity_id: str, event_type: str, payload: dict):
        message = {
            'entity_id': entity_id,
            'event_type': event_type,
            'payload': payload,
            'timestamp': time.time(),
            'sequence_number': self._get_next_sequence(entity_id)
        }
        self.producer.send(
            'entity-events',
            key=entity_id.encode('utf-8'),
            value=message
        )
        self.producer.flush()

    def _get_next_sequence(self, entity_id: str) -> int:
        return int(time.time() * 1000)

class SequentialConvoyConsumer:
    """Procesa mensajes en orden por entidad"""

    def __init__(self, bootstrap_servers, topic, group_id):
        self.consumer = KafkaConsumer(
            topic, bootstrap_servers=bootstrap_servers,
            group_id=group_id, auto_offset_reset='earliest',
            max_poll_records=1, enable_auto_commit=False
        )
        self.pending_sequences: dict = {}
        self.last_processed: dict = {}

    def process_messages(self):
        for message in self.consumer:
            event = json.loads(message.value)
            entity_id = event['entity_id']
            seq_num = event['sequence_number']
            expected_seq = self.last_processed.get(entity_id, 0) + 1

            if seq_num == expected_seq:
                self._process_event(event)
                self.last_processed[entity_id] = seq_num
                self._check_pending(entity_id)
            elif seq_num > expected_seq:
                self.pending_sequences.setdefault(entity_id, {})[seq_num] = event
                print(f"Buffering mensaje fuera de orden {seq_num} para {entity_id}")
            else:
                print(f"Saltando duplicado {seq_num} para {entity_id}")

            self.consumer.commit()

    def _process_event(self, event):
        print(f"Procesando {event['event_type']} para {event['entity_id']}")

    def _check_pending(self, entity_id):
        pending = self.pending_sequences.get(entity_id, {})
        expected = self.last_processed.get(entity_id, 0) + 1
        while expected in pending:
            event = pending.pop(expected)
            self._process_event(event)
            self.last_processed[entity_id] = expected
            expected += 1

# Uso
producer = OrderedMessageProducer(['localhost:9092'])
producer.send_event('user-123', 'created', {'name': 'Alice'})
producer.send_event('user-123', 'updated', {'name': 'Alice Smith'})
producer.send_event('user-123', 'deleted', {})

consumer = SequentialConvoyConsumer(['localhost:9092'], 'entity-events', 'convoy-group')
consumer.process_messages()
```

### Java (Azure Service Bus Sessions)

```java
import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.azure.messaging.servicebus.ServiceBusProcessorClient;
import com.azure.messaging.servicebus.models.ServiceBusReceiveMode;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class SequentialConvoyServiceBus {

    private static final String CONNECTION_STRING = "<connection-string>";
    private static final String QUEUE_NAME = "ordered-queue";

    public static class OrderedProducer {
        private final ServiceBusSenderClient sender;

        public OrderedProducer() {
            this.sender = new ServiceBusClientBuilder()
                .connectionString(CONNECTION_STRING)
                .sender()
                .queueName(QUEUE_NAME)
                .buildClient();
        }

        public void sendOrderedEvents(String entityId, List<DomainEvent> events) {
            for (int i = 0; i < events.size(); i++) {
                ServiceBusMessage message = new ServiceBusMessage(
                    serializeEvent(events.get(i))
                );
                message.setSessionId(entityId);
                message.setApplicationProperty("sequenceNumber", i);
                sender.sendMessage(message);
            }
        }
    }

    public static class OrderedConsumer {

        public void startProcessing() {
            ServiceBusProcessorClient processor = new ServiceBusClientBuilder()
                .connectionString(CONNECTION_STRING)
                .processor()
                .queueName(QUEUE_NAME)
                .receiveMode(ServiceBusReceiveMode.PEEK_LOCK)
                .processMessage(this::processMessage)
                .processError(this::handleError)
                .prefetchCount(1)
                .buildProcessorClient();

            processor.start();
        }

        private void processMessage(ServiceBusReceivedMessageContext context) {
            ServiceBusReceivedMessage message = context.getMessage();
            String sessionId = message.getSessionId();
            int sequenceNumber = (int) message.getApplicationProperties()
                .get("sequenceNumber");

            DomainEvent event = deserializeEvent(message.getBody().toString());
            applyEvent(sessionId, event);
            context.complete();
        }

        private void handleError(ServiceBusErrorContext context) {
            System.err.println("Error: " + context.getException().getMessage());
        }
    }
}
```

### JavaScript (Redis Streams con Consumer Groups)

```javascript
const Redis = require('ioredis');

class SequentialConvoyProcessor {
    constructor(redis, streamKey) {
        this.redis = redis;
        this.streamKey = streamKey;
        this.groupName = 'convoy-processors';
    }

    async initialize() {
        try {
            await this.redis.xgroup('CREATE', this.streamKey,
                this.groupName, '0', 'MKSTREAM');
        } catch (err) {
            if (!err.message.includes('already exists')) throw err;
        }
    }

    async produceEvent(entityId, eventType, payload) {
        const sequence = await this.redis.incr(`seq:${entityId}`);
        await this.redis.xadd(this.streamKey, '*',
            'entityId', entityId,
            'sequence', sequence.toString(),
            'eventType', eventType,
            'payload', JSON.stringify(payload)
        );
    }

    async consumeOrdered(consumerId) {
        const results = await this.redis.xreadgroup(
            'GROUP', this.groupName, consumerId,
            'COUNT', 1,
            'BLOCK', 5000,
            'STREAMS', this.streamKey, '>'
        );

        if (!results || results.length === 0) return null;

        const [[, messages]] = results;
        const [id, fields] = messages[0];
        const event = this.parseFields(fields);
        const entityId = event.entityId;
        const sequence = parseInt(event.sequence);

        const lastProcessed = await this.redis.get(`last:${entityId}`);
        const expected = lastProcessed ? parseInt(lastProcessed) + 1 : 1;

        if (sequence === expected) {
            await this.processEvent(event);
            await this.redis.set(`last:${entityId}`, sequence);
            await this.redis.xack(this.streamKey, this.groupName, id);
            return event;
        } else if (sequence > expected) {
            console.log(`Fuera de orden: esperado ${expected}, recibido ${sequence}`);
            return null;
        } else {
            await this.redis.xack(this.streamKey, this.groupName, id);
            return null;
        }
    }

    parseFields(fields) {
        const obj = {};
        for (let i = 0; i < fields.length; i += 2) {
            obj[fields[i]] = fields[i + 1];
        }
        return obj;
    }

    async processEvent(event) {
        console.log(`Procesando ${event.eventType} para ${event.entityId}`);
    }
}
```

## Explicacion

El patron se basa en dos mecanismos clave:

1. **Particionamiento por ID de entidad:** Los mensajes para la misma entidad se enrutan a la misma particion/cola/sesion. Esto se hace usando partition key (Kafka), session ID (Service Bus), o un campo entity (Redis).

2. **Unico consumidor por particion:** Solo un consumidor procesa mensajes de una particion dada a la vez. Esto previene que dos consumidores manejen diferentes mensajes para la misma entidad simultaneamente, lo que violaria el orden.

El compromiso es paralelismo reducido por entidad — todos los mensajes para `user-123` deben procesarse secuencialmente. Sin embargo, mensajes para `user-456` pueden procesarse en paralelo en otra particion.

## Variantes

| Variante | Mecanismo | Ideal Para |
|----------|-----------|------------|
| **Partition key de Kafka** | Asignacion por hash | Alto throughput, orden simple |
| **Sesiones de Service Bus** | Balanceo por sesion | Nativo en la nube, exactly-once por sesion |
| **Single active consumer de RabbitMQ** | Consumidor exclusivo por cola | Ordenamiento basado en colas simple |
| **Tabla de secuencia en base de datos** | Bloqueo optimista en sequence numbers | Sistemas sin ordering del broker |
| **Sagas con orquestacion** | Orden explicito de pasos en workflow engine | Procesos de negocio multi-paso complejos |

## Lo que Funciona

- **Usar una clave de particion determinista.** El ID de entidad debe mapear consistentemente a la misma particion. Cambiar la clave invalida el orden.
- **Monitorear skew de particiones.** Si una entidad genera 90% de los mensajes, su particion se vuelve un cuello de botella. Considera dividir entidades hot.
- **Manejar mensajes faltantes con gracia.** Si la secuencia N nunca llega, el convoy se detiene. Implementa timeouts y alertas.
- **Mantener convoys pequenos.** Convoys largos retienen mensajes nuevos. Disena para secuencias cortas y acotadas.
- **Procesamiento idempotente dentro de convoys.** Incluso con orden, los reintentos pueden causar duplicados. Haz las operaciones individuales idempotentes.

## Errores Comunes

- **Cambiar claves de particion.** Rebalancear particiones de Kafka cambia que consumidor maneja que entidad, violando supuestos de orden.
- **Multiples consumidores por particion.** Dos consumidores leyendo la misma particion procesaran mensajes en paralelo para la misma entidad.
- **No manejar gaps de secuencia.** Un mensaje perdido en una secuencia bloquea todos los mensajes subsiguientes para siempre.
- **Convoys demasiado grandes.** Un convoy que procesa miles de mensajes para una entidad crea un hotspot.
- **Ignorar reintentos del productor.** Un mensaje reintentado puede reordenarse relativo a un mensaje mas nuevo si no usa la misma partition key.

## Ejemplos del Mundo Real

### Particionamiento de Kafka

Kafka garantiza orden dentro de una particion. Usando el ID de usuario como partition key, todos los eventos para un usuario estan ordenados. Uber usa esto para eventos de viaje: `trip-created`, `driver-assigned`, `trip-started`, `trip-completed` deben procesarse en orden para calculo de tarifa.

### Sesiones de Azure Service Bus

Las sesiones de Service Bus proporcionan orden FIFO dentro de una sesion. Una plataforma de e-commerce usa sesiones por carrito de compras: `item-added`, `quantity-changed`, `checkout-initiated`, `payment-received` deben procesarse secuencialmente para mantener consistencia del carrito.

### Event Store DB

Event Store DB usa control de concurrencia optimista en streams. Cada agregado (ej. un pedido) es un stream, y los eventos se agregan con versiones esperadas. Escritores concurrentes fallan si el stream fue modificado, preservando orden.

## Preguntas Frecuentes

**P: Como difiere de usar una sola cola?**
R: Una cola unica fuerza a TODOS los mensajes a ser secuenciales, destruyendo el throughput. El patron convoy solo secuencia mensajes para la misma entidad; diferentes entidades procesan en paralelo.

**P: Que pasa si se pierde un mensaje en la secuencia?**
R: El convoy se detiene en el gap. Soluciones: implementar timeout con alertas, usar dead letter queue para gaps, o disenar mensajes que no dependan de cada paso intermedio.

**P: Puedo tener multiples consumidores para tolerancia a fallas?**
R: Si — los grupos de consumidores de Kafka balancean particiones entre consumidores, pero cada particion es propiedad de exactamente un consumidor a la vez. Si un consumidor falla, sus particiones se reasignan a otro.

**P: Funciona este patron entre regiones?**
R: El ordenamiento entre regiones es extremadamente dificil. La mayoria de sistemas aceptan consistencia eventual entre regiones y usan el patron convoy dentro de una sola region.

**P: Como manejo un consumidor que es lento pero correcto?**
R: Los consumidores lentos retrasan todos los mensajes en sus particiones. Soluciones: dividir la entidad en sub-entidades con diferentes claves, o usar un consumidor de alta prioridad dedicado para la particion lenta.

**P: Como testeo garantias de orden?**
R: Envia mensajes con sequence numbers y verifica que el consumidor los procese en orden. Incluye mensajes retrasados, duplicados, y gaps en tu suite de tests. Usa tests de integracion con un broker real, no solo mocks.

**P: Que pasa durante rebalancing de consumidores?**
R: Kafka rebalancea particiones cuando consumidores se unen o salen. Durante rebalancing, el consumidor detiene el procesamiento. Despues de rebalancing, un consumidor diferente puede poseer la particion. El orden se preserva porque el nuevo consumidor continua desde el ultimo offset commiteado.

**P: Puedo usar este patron con SQS?**
R: AWS SQS no garantiza orden en colas estandar. Las colas FIFO de SQS proporcionan orden dentro de un grupo de mensajes, identificado por un message group ID. Este es el equivalente SQS de una partition key. Las colas FIFO tienen menor throughput (300 TPS por accion).

**P: Como manejo poison messages en un convoy?**
R: Un poison message bloquea todo el convoy. Muevelo a una dead letter queue despues de N reintentos, luego continua procesando mensajes subsiguientes. Loggea el gap en sequence numbers para que sistemas downstream sepan que un mensaje fue saltado.

**P: Deberia usar sequence numbers o timestamps para orden?**
R: Sequence numbers son deterministicos y detectables por gaps. Timestamps no son confiables porque los relojes se desincronizan entre productores y los mensajes pueden llegar fuera de orden incluso dentro de una particion. Usa sequence numbers monotonamente crecientes por entidad.

**P: Como interactua este patron con consumidores idempotentes?**
R: Orden e idempotencia se complementan. El orden asegura que los mensajes se procesen en la secuencia correcta. La idempotencia asegura que los mensajes reintentados no causen efectos secundarios duplicados. Juntos proporcionan semantica exactly-once.

**P: Puedo procesar mensajes en batch dentro de un convoy?**
R: Si, pero solo si todo el batch es para la misma entidad y procesas el batch en orden de secuencia. Batching entre entidades rompe el orden. Kafka consumer `poll()` retorna mensajes de multiples particiones; procesalos particion por particion para preservar el orden.

**P: Que monitoreo deberia tener para convoys?**
R: Rastrea: profundidad de cola por particion, lag de procesamiento (tiempo entre produccion y consumo del mensaje), conteo de gaps de secuencia (mensajes esperando predecesores faltantes), y throughput del consumidor por particion. Alerta sobre gaps crecientes y lag creciente.
