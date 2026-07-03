---
contentType: recipes
slug: rabbitmq-python-pika-consumer
title: "Construir un Consumer de RabbitMQ con Python y Pika"
description: "Crear un consumer y producer de RabbitMQ en Python usando pika con colas durables, dispatching de trabajo, acknowledgments, dead-letter exchanges y ajuste de prefetch."
metaDescription: "Construye un consumer y producer de RabbitMQ en Python con pika. Usa colas durables, acknowledgments, dead-letter exchanges, prefetch y dispatching de trabajo."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - rabbitmq
  - python
  - pika
  - consumer
  - message-queue
relatedResources:
  - /recipes/messaging/rabbitmq-dead-letter-queue
  - /recipes/messaging/python-celery-task-queue
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un consumer y producer de RabbitMQ en Python con pika. Usa colas durables, acknowledgments, dead-letter exchanges, prefetch y dispatching de trabajo."
  keywords:
    - rabbitmq python pika
    - rabbitmq consumer python
    - pika rabbitmq tutorial
    - rabbitmq dead letter queue
    - rabbitmq prefetch qos
---

## Descripcion general

RabbitMQ es un message broker que enruta mensajes entre productores y consumidores. Pika es el cliente Python estandar. A continuacion: construir un productor y consumer con colas durables, acknowledgments manuales, dead-letter exchanges para mensajes fallidos, ajuste de prefetch para fair dispatch y recuperacion de conexion.

## Cuando Usar Esto

- Distribuir trabajo en background entre multiples workers (procesamiento de imagenes, envio de emails)
- Desacoplar productores de consumidores en una arquitectura de microservicios
- Work queues donde cada mensaje debe procesarse exactamente una vez
- Sistemas que necesitan persistencia de mensajes y entrega garantizada

## Prerrequisitos

- Python 3.10+
- Servidor RabbitMQ (local o cloud, ej., CloudAMQP)
- Paquete `pika`

## Solucion

### 1. Productor

```python
import pika
import json
import uuid

def get_connection():
    credentials = pika.PlainCredentials('guest', 'guest')
    params = pika.ConnectionParameters(
        host='localhost',
        port=5672,
        credentials=credentials,
        heartbeat=30,
        blocked_connection_timeout=7200,
    )
    return pika.BlockingConnection(params)

def publish_message(queue_name: str, message: dict):
    connection = get_connection()
    channel = connection.channel()

    # Declarar una cola durable — sobrevive reinicios de RabbitMQ
    channel.queue_declare(queue=queue_name, durable=True)

    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Mensaje persistente
            message_id=str(uuid.uuid4()),
            content_type='application/json',
            timestamp=int(__import__('time').time()),
        ),
    )
    print(f"Published to {queue_name}: {message['id']}")
    connection.close()

# Uso
publish_message('task_queue', {
    'id': 'task-001',
    'type': 'email',
    'payload': {'to': 'user@example.com', 'subject': 'Welcome'},
})
```

### 2. Consumer con Acknowledgments Manuales

```python
import pika
import json
import time

def get_connection():
    credentials = pika.PlainCredentials('guest', 'guest')
    params = pika.ConnectionParameters(
        host='localhost',
        port=5672,
        credentials=credentials,
        heartbeat=30,
    )
    return pika.BlockingConnection(params)

def process_message(channel, method, properties, body):
    message = json.loads(body)
    print(f"Received: {message['id']} — {message['type']}")

    try:
        # Simular trabajo
        time.sleep(1)
        process_task(message)
        print(f"Done: {message['id']}")

        # Acknowledge solo despues de procesamiento exitoso
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Failed: {message['id']} — {e}")
        # Reject y requeue — el mensaje vuelve a la cola
        channel.basic_nack(
            delivery_tag=method.delivery_tag,
            requeue=True,
        )

def process_task(message: dict):
    if message['type'] == 'email':
        send_email(message['payload'])
    elif message['type'] == 'report':
        generate_report(message['payload'])
    else:
        raise ValueError(f"Unknown task type: {message['type']}")

def start_consumer(queue_name: str):
    connection = get_connection()
    channel = connection.channel()

    # Declarar cola como durable (debe coincidir con el productor)
    channel.queue_declare(queue=queue_name, durable=True)

    # Fair dispatch — no despachar un nuevo mensaje a un worker
    # hasta que haya procesado y acknowledged el anterior
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(
        queue=queue_name,
        on_message_callback=process_message,
    )

    print(f"Waiting for messages on {queue_name}. To exit press CTRL+C")
    channel.start_consuming()

start_consumer('task_queue')
```

### 3. Dead-Letter Exchange

```python
import pika

def declare_queues_with_dlq(channel):
    # Dead-letter exchange
    channel.exchange_declare(exchange='dlx', exchange_type='direct', durable=True)

    # Dead-letter queue
    channel.queue_declare(queue='task_queue.dlq', durable=True)
    channel.queue_bind(queue='task_queue.dlq', exchange='dlx', routing_key='task_queue.dlq')

    # Cola principal con argumentos de dead-letter
    args = {
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'task_queue.dlq',
        'x-max-retries': 3,  # Limite de reintentos basado en header custom
    }
    channel.queue_declare(queue='task_queue', durable=True, arguments=args)

# Consumer con tracking de reintentos
def process_message_with_retry(channel, method, properties, body):
    message = json.loads(body)
    headers = properties.headers or {}
    retry_count = headers.get('x-retry-count', 0)

    try:
        process_task(message)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        if retry_count < 3:
            print(f"Retry {retry_count + 1}/3 for {message['id']}")
            # Re-publicar con contador de retry incrementado
            channel.basic_publish(
                exchange='',
                routing_key=method.routing_key,
                body=body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    headers={'x-retry-count': retry_count + 1},
                    content_type='application/json',
                ),
            )
            channel.basic_ack(delivery_tag=method.delivery_tag)
        else:
            print(f"Max retries exceeded for {message['id']}, sending to DLQ")
            # Dejar que RabbitMQ lo dead-letter
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
```

### 4. Work Queue con Multiples Workers

```python
# Ejecutar multiples instancias del consumer — RabbitMQ distribuye mensajes
# en round-robin con prefetch_count=1 para fair dispatch

# worker.py
import pika
import json
import sys

def start_worker(worker_id: str, queue_name: str):
    connection = get_connection()
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        message = json.loads(body)
        print(f"[Worker {worker_id}] Processing: {message['id']}")
        time.sleep(1)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    print(f"[Worker {worker_id}] Waiting for tasks...")
    channel.start_consuming()

worker_id = sys.argv[1] if len(sys.argv) > 1 else '1'
start_worker(worker_id, 'task_queue')
```

### 5. Topic Exchange para Routing

```python
import pika
import json

def setup_topic_exchange():
    connection = get_connection()
    channel = connection.channel()

    # Topic exchange — enruta por patron (ej., 'orders.*', 'logs.error')
    channel.exchange_declare(exchange='topic_logs', exchange_type='topic', durable=True)

    # Colas para diferentes routing keys
    channel.queue_declare(queue='all_orders', durable=True)
    channel.queue_declare(queue='error_logs', durable=True)
    channel.queue_declare(queue='all_logs', durable=True)

    channel.queue_bind(queue='all_orders', exchange='topic_logs', routing_key='order.#')
    channel.queue_bind(queue='error_logs', exchange='topic_logs', routing_key='log.error')
    channel.queue_bind(queue='all_logs', exchange='topic_logs', routing_key='log.#')

    return channel

def publish_topic(routing_key: str, message: dict):
    channel = setup_topic_exchange()
    channel.basic_publish(
        exchange='topic_logs',
        routing_key=routing_key,
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2, content_type='application/json'),
    )

# Enruta a cola 'all_orders'
publish_topic('order.created', {'orderId': '123'})
publish_topic('order.cancelled', {'orderId': '456'})

# Enruta a colas 'error_logs' Y 'all_logs'
publish_topic('log.error', {'service': 'api', 'msg': 'timeout'})
```

### 6. Recuperacion de Conexion

```python
import pika
import json
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResilientConsumer:
    def __init__(self, queue_name: str, host: str = 'localhost'):
        self.queue_name = queue_name
        self.host = host
        self._connection = None
        self._channel = None

    def connect(self):
        while True:
            try:
                self._connection = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        host=self.host,
                        heartbeat=30,
                        blocked_connection_timeout=7200,
                    )
                )
                self._channel = self._connection.channel()
                self._channel.queue_declare(queue=self.queue_name, durable=True)
                self._channel.basic_qos(prefetch_count=1)
                self._channel.basic_consume(
                    queue=self.queue_name,
                    on_message_callback=self.on_message,
                )
                logger.info("Connected and consuming...")
                self._channel.start_consuming()
                break
            except pika.exceptions.AMQPConnectionError:
                logger.warning("Connection lost, retrying in 5s...")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected error: {e}, retrying in 5s...")
                time.sleep(5)

    def on_message(self, channel, method, properties, body):
        try:
            message = json.loads(body)
            self.process(message)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Processing failed: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def process(self, message: dict):
        logger.info(f"Processing: {message.get('id')}")
        # Logica de negocio aqui

consumer = ResilientConsumer('task_queue')
consumer.connect()
```

## Como Funciona

1. **Colas**: Los mensajes se colocan en una cola. Los consumidores se suscriben a la cola. RabbitMQ entrega mensajes en orden FIFO. Las colas durables persisten a disco, sobreviviendo reinicios del broker.
2. **Acknowledgments**: Con ack manual, un mensaje solo se elimina de la cola despues de que el consumer lo acknowledge. Si el consumer muere (conexion perdida, crash), RabbitMQ re-entrega el mensaje a otro consumer.
3. **Prefetch (QoS)**: `basic_qos(prefetch_count=1)` le dice a RabbitMQ que no envie un nuevo mensaje a un worker hasta que haya acknowledged el anterior. Esto previene que un worker lento acapare mensajes.
4. **Dead-letter exchange**: Cuando un mensaje es rechazado con `requeue=False` o expira, RabbitMQ lo enruta al dead-letter exchange. El DLQ mantiene mensajes fallidos para inspeccion o replay.
5. **Exchanges**: Los direct exchanges enrutan por routing key exacto. Los topic exchanges enrutan por patron (`*` = una palabra, `#` = cero o mas palabras). Los fanout exchanges hacen broadcast a todas las colas vinculadas.

## Variantes

### Fanout Exchange (Broadcast)

```python
channel.exchange_declare(exchange='broadcast', exchange_type='fanout', durable=True)
# Todas las colas vinculadas a este exchange reciben cada mensaje
channel.queue_bind(queue='worker1_queue', exchange='broadcast', routing_key='')
channel.queue_bind(queue='worker2_queue', exchange='broadcast', routing_key='')
```

### Cola de Prioridad

```python
# Declarar cola con prioridad maxima
channel.queue_declare(
    queue='priority_tasks',
    durable=True,
    arguments={'x-max-priority': 10},
)

# Publicar con prioridad
channel.basic_publish(
    exchange='',
    routing_key='priority_tasks',
    body=json.dumps(message),
    properties=pika.BasicProperties(
        delivery_mode=2,
        priority=5,  # Numero mayor = mayor prioridad
    ),
)
```

### Mensajes Diferidos (TTL + DLQ)

```python
# Declarar cola con TTL — los mensajes expiran despues de N ms y van al DLQ
channel.queue_declare(
    queue='delayed_tasks',
    durable=True,
    arguments={
        'x-message-ttl': 60000,  # 60 segundos
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'task_queue',
    },
)

# Publicar a la cola diferida — despues de 60s, el mensaje
# expira y se enruta a 'task_queue' para procesamiento
channel.basic_publish(
    exchange='',
    routing_key='delayed_tasks',
    body=json.dumps(message),
    properties=pika.BasicProperties(delivery_mode=2),
)
```

## Mejores Practicas

- **Siempre usar colas durables y mensajes persistentes**: Sin durability, los mensajes se pierden al reiniciar el broker. Establece `delivery_mode=2` en cada mensaje.
- **Usar acknowledgments manuales**: Auto-ack elimina mensajes antes de que el procesamiento complete. Si el consumer crasha, el mensaje se pierde. Siempre usa ack manual.
- **Establecer `prefetch_count=1` para fair dispatch**: Sin prefetch, RabbitMQ despacha todos los mensajes al primer consumer disponible. Prefetch=1 asegura distribucion round-robin.
- **Usar dead-letter queues**: No requeues mensajes fallidos indefinidamente — se vuelven poison pills. Usa un contador de reintentos y envia al DLQ despues del maximo.
- **Establecer heartbeat**: Sin heartbeat, las conexiones muertas no se detectan por horas. Establece `heartbeat=30` para detectar fallos de red rapidamente.
- **Manejar recuperacion de conexion**: Los fallos de red ocurren. Envuelve el consumer en un loop de reconexion que reintenta con backoff.

## Errores Comunes

- **Usar auto-ack**: `auto_ack=True` elimina el mensaje antes de procesar. Si el consumer crasha, el mensaje se pierde. Siempre usa ack manual.
- **No establecer prefetch**: Sin `basic_qos`, un consumer puede recibir todos los mensajes mientras otros estan inactivos. Establece `prefetch_count=1` para fair dispatch.
- **Requeuing de poison pills**: Un mensaje que siempre falla se requeuea y reprocesa para siempre. Usa un contador de reintentos y dead-letter despues del maximo.
- **No declarar colas en ambos lados**: Tanto productor como consumer deben declarar la cola con los mismos parametros (durable, arguments). Declaraciones mismatched causan errores.
- **Bloquear el callback**: Tareas de larga duracion en el callback bloquean el heartbeat, causando que RabbitMQ cierre la conexion. Descarga trabajo pesado a un thread pool.

## FAQ

**Cual es la diferencia entre ack, nack y reject?**

`basic_ack` confirma procesamiento exitoso — el mensaje se elimina. `basic_nack` puede rechazar multiples mensajes y opcionalmente requeue. `basic_reject` rechaza un mensaje y opcionalmente requeue. Usa `nack` con `requeue=False` para dead-letter.

**Como funciona prefetch_count?**

RabbitMQ entrega hasta `prefetch_count` mensajes no acknowledged a un consumer. Con prefetch=1, el consumer obtiene un mensaje y debe ack antes de recibir el siguiente. Valores mas altos mejoran throughput pero pueden causar distribucion desigual.

**Puedo usar RabbitMQ con asyncio?**

Si. Usa `aiormq` o `aio-pika` para clientes async de RabbitMQ. Pika es sincrono — bloquea el event loop. Para aplicaciones async, usa `aio-pika`.

**Que pasa si RabbitMQ se reinicia?**

Las colas durables y mensajes persistentes sobreviven reinicios — se escriben a disco. Las colas no durables y mensajes no persistentes se pierden. Siempre usa durable=True y delivery_mode=2 para mensajes importantes.

**Como monitoreo RabbitMQ?**

Usa el RabbitMQ Management Plugin (`rabbitmq-plugins enable rabbitmq_management`). Proporciona una UI web en el puerto 15672 con profundidad de cola, tasas de mensajes e informacion de consumers. Para produccion, monitorea con Prometheus + Grafana usando rabbitmq_exporter.
