---




contentType: patterns
slug: idempotent-consumer-pattern
title: "Patron de Consumidor Idempotente"
description: "Procesa mensajes de una cola exactamente una vez sin importar los duplicados, usando operaciones idempotentes, identificadores unicos y estrategias de deduplicacion."
metaDescription: "Aprende el Patron de Consumidor Idempotente para procesamiento exactamente una vez. Ejemplos en Python, Java y JavaScript con deduplicacion y claves de idempotencia."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - consumidor-idempotente
  - patron
  - patron-de-diseno
  - mensajeria
  - kafka
  - deduplicacion
  - idempotencia
  - event-driven
relatedResources:
  - /patterns/event-sourcing-pattern
  - /patterns/saga-pattern
  - /patterns/distributed-lock-pattern
  - /patterns/compensating-transaction-pattern
  - /patterns/sequential-convoy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Consumidor Idempotente para procesamiento exactamente una vez. Ejemplos en Python, Java y JavaScript con deduplicacion y claves de idempotencia."
  keywords:
    - consumidor idempotente
    - patron de diseno
    - exactamente una vez
    - mensajeria
    - kafka
    - deduplicacion
    - idempotencia
    - event driven




---

# Patron de Consumidor Idempotente

## Resumen

El Patron de Consumidor Idempotente garantiza que los mensajes de una cola o flujo de eventos se procesen exactamente una vez, incluso si se entregan multiples veces debido a reintentos de red, fallas del consumidor o garantias de entrega al-menos-una-vez. En lugar de depender del sistema de mensajeria para una semantica exactamente-una-vez, el consumidor se disena para ser idempotente: procesar el mismo mensaje multiples veces produce el mismo resultado que procesarlo una sola vez.

La idempotencia se logra rastreando mensajes procesados mediante identificadores unicos, realizando upserts en lugar de inserts, o usando actualizaciones condicionales seguras para repetir. Este patron es esencial en sistemas distribuidos donde brokers como Kafka, RabbitMQ, SQS o Azure Service Bus solo garantizan entrega al-menos-una-vez.

## Cuando Usar


- For alternatives, see [Inbox Pattern](/es/patterns/inbox-pattern/).

- Consumir mensajes de una cola o flujo de eventos donde los duplicados son posibles
- Procesamiento de pagos, cumplimiento de pedidos o actualizaciones de inventario donde duplicados causarian cobros extra, envios dobles o inconsistencias de stock
- Integracion con sistemas de terceros mediante webhooks o callbacks donde los reintentos son estandar
- Usar Kafka, SQS o sistemas similares que solo proporcionan entrega al-menos-una-vez
- Implementar microservicios basados en eventos donde cada evento debe manejarse exactamente una vez

## Cuando Evitar

- Cuando el sistema de mensajeria soporta nativamente semantica exactamente-una-vez (transacciones Kafka + EOS, sesiones de Service Bus con deduplicacion)
- Para operaciones de solo lectura donde los duplicados no causan dano
- Cuando el overhead de rastreo de deduplicacion excede el costo de manejar duplicados ocasionales
- Notificaciones simples fire-and-forget donde la entrega duplicada es aceptable

## Solucion

### Python (Consumidor Kafka con Deduplicacion)

```python
import json
import sqlite3
from datetime import datetime
from kafka import KafkaConsumer
from kafka.errors import KafkaError

class IdempotentConsumer:
    """Procesa mensajes de Kafka exactamente una vez usando operaciones idempotentes"""

    def __init__(self, bootstrap_servers, topic, db_path="processed.db"):
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            group_id='idempotent-group'
        )
        self.db = sqlite3.connect(db_path)
        self._init_table()

    def _init_table(self):
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS processed (
                message_id TEXT PRIMARY KEY,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.db.commit()

    def is_processed(self, message_id: str) -> bool:
        cursor = self.db.execute(
            "SELECT 1 FROM processed WHERE message_id = ?",
            (message_id,)
        )
        return cursor.fetchone() is not None

    def mark_processed(self, message_id: str):
        self.db.execute(
            "INSERT INTO processed (message_id) VALUES (?)",
            (message_id,)
        )
        self.db.commit()

    def process_message(self, message):
        """Procesamiento idempotente: seguro para reintentar"""
        event = json.loads(message.value)
        message_id = event['id']

        # Verificacion de deduplicacion
        if self.is_processed(message_id):
            print(f"Omitiendo duplicado: {message_id}")
            return

        # Operacion idempotente: upsert en la base de datos destino
        self._upsert_order(
            order_id=event['order_id'],
            amount=event['amount'],
            status=event['status']
        )

        # Marcar como procesado (despues de operacion exitosa)
        self.mark_processed(message_id)

    def _upsert_order(self, order_id: str, amount: float, status: str):
        """El upsert garantiza idempotencia — seguro para reintentar"""
        print(f"Actualizando orden {order_id}: ${amount} ({status})")

    def run(self):
        for message in self.consumer:
            try:
                self.process_message(message)
                self.consumer.commit()
            except Exception as e:
                print(f"Error procesando {message.offset}: {e}")
                continue

if __name__ == "__main__":
    consumer = IdempotentConsumer(
        bootstrap_servers=['localhost:9092'],
        topic='orders'
    )
    consumer.run()
```

### Java (Spring Kafka con Idempotencia)

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IdempotentOrderConsumer {

    private final ProcessedMessageRepository repository;
    private final OrderService orderService;
    private final Set<String> processedIds = ConcurrentHashMap.newKeySet();

    public IdempotentOrderConsumer(ProcessedMessageRepository repository,
                                   OrderService orderService) {
        this.repository = repository;
        this.orderService = orderService;
        processedIds.addAll(repository.findRecentIds());
    }

    @KafkaListener(topics = "orders", groupId = "order-group")
    @Transactional
    public void consumeOrderEvent(
            OrderEvent event,
            @Header("kafka_receivedMessageKey") String messageKey) {

        String eventId = event.getEventId();

        if (processedIds.contains(eventId)) return;
        if (repository.existsByEventId(eventId)) {
            processedIds.add(eventId);
            return;
        }

        orderService.upsertOrder(event.getOrderId(), event.getAmount(), event.getStatus());

        repository.save(new ProcessedMessage(eventId));
        processedIds.add(eventId);
    }
}

@Entity
public class ProcessedMessage {
    @Id
    private String eventId;
    private Instant processedAt = Instant.now();
}
```

### JavaScript (Node.js con Deduplicacion Redis)

```javascript
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');

class IdempotentConsumer {
    constructor() {
        this.kafka = new Kafka({ brokers: ['localhost:9092'] });
        this.consumer = this.kafka.consumer({ groupId: 'order-group' });
        this.redis = new Redis();
    }

    async start() {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'orders', fromBeginning: false });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                const event = JSON.parse(message.value.toString());
                const eventId = event.id;

                const isProcessed = await this.redis.get(`processed:${eventId}`);
                if (isProcessed) {
                    console.log(`Omitiendo duplicado: ${eventId}`);
                    return;
                }

                try {
                    await this.upsertOrder(event);
                    await this.redis.setex(`processed:${eventId}`, 604800, '1');
                } catch (error) {
                    console.error(`Fallo al procesar ${eventId}:`, error);
                    throw error;
                }
            }
        });
    }

    async upsertOrder(event) {
        await db.query(`
            INSERT INTO orders (id, amount, status, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (id) DO UPDATE SET
                amount = EXCLUDED.amount,
                status = EXCLUDED.status,
                updated_at = NOW()
        `, [event.order_id, event.amount, event.status]);
    }
}
```

## Explicacion

Los consumidores idempotentes usan una **ventana de deduplicacion** para rastrear mensajes procesados. El tamano de la ventana depende de las garantias de entrega. El mecanismo clave es:

1. Extraer un identificador unico de cada mensaje
2. Verificar la tienda de deduplicacion antes de procesar
3. Realizar una operacion idempotente (upsert, actualizacion condicional)
4. Registrar el mensaje como procesado solo despues de completar exitosamente
5. Confirmar/commit del offset despues de registrar el exito

Si el consumidor falla entre los pasos 3 y 4, el mensaje se reentregara. Como el paso 3 es idempotente, reprocesar no causa dano.

## Variantes

| Variante | Estrategia | Ideal Para |
|----------|------------|------------|
| Deduplicacion en base de datos | Tabla `processed_messages` con restriccion unique | Consistencia fuerte, throughput moderado |
| Deduplicacion en Redis | SETEX con TTL en IDs procesados | Alto throughput, ventanas cortas |
| Filtro Bloom | Verificacion probabilistica | Throughput muy alto, falsos positivos aceptables |
| Claves de idempotencia | Clave generada por el cliente para APIs | Integraciones de terceros, APIs de pago |
| Idempotencia natural | Operaciones inherentemente seguras para reintentar | Actualizar si el timestamp es mas reciente |

## Lo que funciona

- Usar IDs de mensaje deterministas
- Hacer la operacion de negocio idempotente
- Aplicar TTL a la tienda de deduplicacion
- Separar la deduplicacion de la logica de negocio
- Monitorear duplicados

## Errores Comunes

- Guardar "procesado" antes de la operacion
- IDs de mensaje no deterministicos
- Ignorar el ordenamiento
- Transacciones de base de datos sin aislamiento
- Ventanas de deduplicacion infinitas

## Ejemplos del Mundo Real

- **Stripe**: Usa claves de idempotencia para todas las solicitudes de mutacion. Almacena la solicitud/respuesta durante 24 horas.
- **Amazon SQS FIFO**: Proporciona procesamiento exactamente-una-vez mediante IDs de deduplicacion con un intervalo de 5 minutos.
- **Uber**: Usa un patron de doble escritura en consumidores Kafka, escribiendo offsets tanto en Kafka como en Cassandra.

## Preguntas Frecuentes

**P: ¿Como difiere de las semanticas exactly-once de Kafka (EOS)?**
R: EOS proporciona procesamiento exactamente-una-vez dentro de Kafka Streams entre topics de Kafka. El Patron de Consumidor Idempotente funciona para cualquier consumidor escribiendo en cualquier sistema externo.

**P: ¿Que ventana de deduplicacion deberia usar?**
R: Como minimo, mas larga que la ventana maxima de reentrega. Tipico: 7 dias para eventos de negocio, 24 horas para webhooks, 5 minutos para metricas de alta frecuencia.

**P: ¿Base de datos o Redis para deduplicacion?**
R: Redis para alto throughput y ventanas cortas. Base de datos para consistencia fuerte, trazabilidad y ventanas largas.

**P: ¿Que pasa si no puedo modificar el productor para agregar IDs de mensaje?**
R: Generar un ID deterministico del contenido del mensaje: `hash(topic + partition + offset)`.

**P: ¿Como manejar mensajes fuera de orden?**
R: Incluir un timestamp o numero de secuencia en la logica de deduplicacion. Solo procesar si el mensaje es mas reciente.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
