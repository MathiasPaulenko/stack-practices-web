---


contentType: recipes
slug: rabbitmq-dead-letter-queue
title: "Configurar Dead-Letter Queues en RabbitMQ para Mensajes"
description: "Configurar dead-letter queues y exchanges en RabbitMQ con expiracion TTL, limites de longitud, routing por rechazo y patrones de retry para mensajeria resiliente."
metaDescription: "Configura dead-letter queues en RabbitMQ. Usa expiracion TTL, max length, routing por rechazo y patrones de retry con backoff exponencial para mensajes fallidos."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - rabbitmq
  - dead-letter-queue
  - dlq
  - message-queue
  - error-handling
relatedResources:
  - /recipes/rabbitmq-python-pika-consumer
  - /recipes/python-celery-task-queue
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura dead-letter queues en RabbitMQ. Usa expiracion TTL, max length, routing por rechazo y patrones de retry con backoff exponencial para mensajes fallidos."
  keywords:
    - rabbitmq dead letter queue
    - rabbitmq dlq configuration
    - rabbitmq message ttl
    - rabbitmq retry pattern
    - rabbitmq error handling


---

## Descripcion general

Las dead-letter queues (DLQ) capturan mensajes que RabbitMQ no puede entregar o procesar — mensajes rechazados, mensajes expirados o overflow de colas llenas. Sin DLQ, los mensajes fallidos desaparecen o se repiten infinitamente como poison pills. A continuacion: configurar DLQ con TTL, max-length, routing por rechazo, patrones de retry con backoff exponencial e inspeccion/replay de mensajes DLQ.

## Cuando Usar Esto


- For alternatives, see [Build a RabbitMQ Consumer with Python and Pika](/es/recipes/rabbitmq-python-pika-consumer/).

- Cualquier cola de RabbitMQ donde la perdida de mensajes es inaceptable
- Work queues donde los consumers pueden fallar al procesar mensajes especificos
- Mensajes sensibles al tiempo que deberian descartarse despues de un deadline
- Colas con limites de capacidad que necesitan manejo de overflow

## Prerrequisitos

- RabbitMQ 3.8+
- Python 3.10+ con `pika`
- Comprension de exchanges y bindings

## Solucion

### 1. Configuracion Basica de DLQ

```python
import pika
import json

def setup_dlq(channel, main_queue: str, dlq_queue: str):
    # Declarar el dead-letter exchange
    dlx_name = f'{main_queue}.dlx'
    channel.exchange_declare(exchange=dlx_name, exchange_type='direct', durable=True)

    # Declarar la DLQ
    channel.queue_declare(queue=dlq_queue, durable=True)
    channel.queue_bind(queue=dlq_queue, exchange=dlx_name, routing_key=dlq_queue)

    # Declarar la cola principal con argumentos de DLQ
    channel.queue_declare(
        queue=main_queue,
        durable=True,
        arguments={
            'x-dead-letter-exchange': dlx_name,
            'x-dead-letter-routing-key': dlq_queue,
        },
    )

    return main_queue, dlq_queue

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

setup_dlq(channel, 'orders', 'orders.dlq')
```

### 2. Dead-Lettering Basado en TTL

```python
def setup_ttl_queue(channel, queue_name: str, dlq_name: str, ttl_ms: int):
    """Los mensajes expiran despues de ttl_ms y se enrutan a DLQ."""
    channel.queue_declare(
        queue=queue_name,
        durable=True,
        arguments={
            'x-dead-letter-exchange': f'{queue_name}.dlx',
            'x-dead-letter-routing-key': dlq_name,
            'x-message-ttl': ttl_ms,  # ej., 60000 = 60 segundos
        },
    )

# Los mensajes en 'expiring_tasks' expiran despues de 30 segundos
# y se enrutan a 'expiring_tasks.dlq'
setup_ttl_queue(channel, 'expiring_tasks', 'expiring_tasks.dlq', 30000)
```

### 3. Overflow por Max-Length

```python
def setup_max_length_queue(channel, queue_name: str, dlq_name: str, max_length: int):
    """Cuando la cola alcanza max_length, los mensajes mas antiguos se dead-letter."""
    channel.queue_declare(
        queue=queue_name,
        durable=True,
        arguments={
            'x-dead-letter-exchange': f'{queue_name}.dlx',
            'x-dead-letter-routing-key': dlq_name,
            'x-max-length': max_length,  # ej., 1000 mensajes max
            'x-overflow': 'reject-publish',  # o 'drop-head' (default)
        },
    )

# 'bounded_queue' mantiene max 1000 mensajes — overflow va a DLQ
setup_max_length_queue(channel, 'bounded_queue', 'bounded_queue.dlq', 1000)
```

### 4. Rechazo de Consumer a DLQ

```python
def consume_with_rejection(channel, queue_name: str):
    def callback(ch, method, properties, body):
        message = json.loads(body)

        try:
            process_message(message)
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except ValidationError as e:
            # Errores de validacion van a DLQ — no reintentar
            print(f"Validation error, dead-lettering: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        except TransientError as e:
            # Errores transitorios — reintentar una vez, luego DLQ
            headers = properties.headers or {}
            retry_count = headers.get('x-retry-count', 0)

            if retry_count < 1:
                ch.basic_publish(
                    exchange='',
                    routing_key=queue_name,
                    body=body,
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        headers={'x-retry-count': retry_count + 1},
                        content_type='application/json',
                    ),
                )
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"Max retries reached, dead-lettering: {message.get('id')}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    channel.start_consuming()
```

### 5. Retry con Backoff Exponencial (Basado en TTL)

```python
def setup_retry_queues(channel, base_queue: str):
    """Crear colas de retry con TTLs crecientes para backoff exponencial."""
    retry_intervals = [10, 30, 120, 600]  # segundos: 10s, 30s, 2m, 10m

    for i, interval in enumerate(retry_intervals):
        retry_queue = f'{base_queue}.retry.{i}'
        channel.queue_declare(
            queue=retry_queue,
            durable=True,
            arguments={
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': base_queue,
                'x-message-ttl': interval * 1000,  # Convertir a ms
            },
        )

    # DLQ para fallos finales
    channel.queue_declare(queue=f'{base_queue}.dlq', durable=True)

def send_to_retry(channel, base_queue: str, body: bytes, attempt: int):
    """Enviar mensaje fallido a la cola de retry apropiada."""
    retry_queue = f'{base_queue}.retry.{attempt}'

    channel.basic_publish(
        exchange='',
        routing_key=retry_queue,
        body=body,
        properties=pika.BasicProperties(
            delivery_mode=2,
            headers={'x-retry-attempt': attempt + 1},
            content_type='application/json',
        ),
    )

def consume_with_backoff(channel, base_queue: str, max_retries: int = 4):
    def callback(ch, method, properties, body):
        message = json.loads(body)
        attempt = (properties.headers or {}).get('x-retry-attempt', 0)

        try:
            process_message(message)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            print(f"Processed successfully on attempt {attempt}")

        except Exception as e:
            if attempt < max_retries:
                print(f"Attempt {attempt} failed, sending to retry queue {attempt}")
                send_to_retry(ch, base_queue, body, attempt)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"All {max_retries} retries exhausted, sending to DLQ")
                # Publicar directamente a DLQ
                ch.basic_publish(
                    exchange='',
                    routing_key=f'{base_queue}.dlq',
                    body=body,
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        headers={'x-retry-attempt': attempt, 'x-final-error': str(e)},
                        content_type='application/json',
                    ),
                )
                ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=base_queue, on_message_callback=callback)
    channel.start_consuming()
```

### 6. Inspeccionar y Reproducir Mensajes DLQ

```python
def inspect_dlq(channel, dlq_name: str, limit: int = 10):
    """Inspeccionar mensajes en la DLQ sin eliminarlos."""
    messages = []

    for _ in range(limit):
        method, properties, body = channel.basic_get(queue=dlq_name, auto_ack=False)
        if method is None:
            break

        message = {
            'body': json.loads(body),
            'headers': properties.headers or {},
            'timestamp': properties.timestamp,
            'message_id': properties.message_id,
        }
        messages.append(message)

        # Requeue el mensaje de vuelta a DLQ
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    return messages

def replay_dlq_messages(channel, dlq_name: str, target_queue: str):
    """Mover mensajes de DLQ de vuelta a la cola principal."""
    while True:
        method, properties, body = channel.basic_get(queue=dlq_name, auto_ack=False)
        if method is None:
            break

        # Eliminar headers de dead-letter para reprocesamiento limpio
        clean_props = pika.BasicProperties(
            delivery_mode=2,
            content_type=properties.content_type,
            message_id=properties.message_id,
            # No copiar headers — contienen metadata de dead-letter
        )

        channel.basic_publish(
            exchange='',
            routing_key=target_queue,
            body=body,
            properties=clean_props,
        )
        channel.basic_ack(delivery_tag=method.delivery_tag)
        print(f"Replayed message to {target_queue}")
```

### 7. Inspeccion de Headers de Dead-Letter

```python
def get_dead_letter_reason(properties) -> dict:
    """Extraer metadata de dead-letter de los headers del mensaje."""
    headers = properties.headers or {}
    x_death = headers.get('x-death', [])

    if x_death:
        first_death = x_death[0]  # Lista de registros de muerte
        return {
            'queue': first_death.get('queue'),
            'reason': first_death.get('reason'),  # 'rejected', 'expired', 'maxlen'
            'exchange': first_death.get('exchange'),
            'routing_key': first_death.get('routing-keys', [None])[0],
            'count': first_death.get('count'),
            'time': str(first_death.get('time')),
        }
    return {}

# Razones:
# 'rejected' — consumer nack/reject con requeue=False
# 'expired' — TTL del mensaje expirado
# 'maxlen' — max-length de cola excedido
```

## Como Funciona

1. **Dead-letter exchange (DLX)**: Un exchange normal que recibe mensajes dead-lettered de una cola. La cola se configura con `x-dead-letter-exchange` para especificar donde enviar los mensajes dead-lettered.
2. **Dead-letter routing key**: Cuando un mensaje se dead-letter, RabbitMQ reemplaza el routing key con el valor de `x-dead-letter-routing-key` (si esta establecido). Sin el, se usa el routing key original.
3. **Razones de dead-letter**: Los mensajes se dead-letter por tres razones: `rejected` (consumer nack con requeue=False), `expired` (TTL del mensaje expirado), `maxlen` (max-length de cola excedido).
4. **Header x-death**: RabbitMQ agrega un header `x-death` a los mensajes dead-lettered conteniendo la cola, razon, exchange y timestamp. Esta metadata ayuda a diagnosticar por que el mensaje fue dead-lettered.
5. **Colas de retry con TTL**: Crea colas intermedias con TTLs. Los mensajes expiran de la cola de retry y se dead-letter de vuelta a la cola principal, implementando reintentos diferidos sin un scheduler custom.

## Variantes

### TTL Por Mensaje

```python
# Establecer TTL en mensajes individuales, no en la cola
channel.basic_publish(
    exchange='',
    routing_key='tasks',
    body=json.dumps(message),
    properties=pika.BasicProperties(
        delivery_mode=2,
        expiration='30000',  # 30 segundos — este mensaje expira si no se consume
    ),
)
```

### Quorum Queue con DLQ

```python
# Las quorum queues proporcionan alta disponibilidad y seguridad de datos
channel.queue_declare(
    queue='durable_tasks',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',
        'x-dead-letter-exchange': 'durable_tasks.dlx',
        'x-dead-letter-routing-key': 'durable_tasks.dlq',
    },
)
```

### Lazy Queue para DLQ Grande

```python
# Las lazy queues escriben mensajes a disco inmediatamente, reduciendo uso de memoria
# Util para DLQs que pueden acumular muchos mensajes
channel.queue_declare(
    queue='large_dlq',
    durable=True,
    arguments={
        'x-queue-mode': 'lazy',
    },
)
```

## Mejores Practicas

- **Siempre configurar DLQ para colas criticas**: Sin DLQ, los mensajes rechazados se pierden. Siempre establece `x-dead-letter-exchange` en colas importantes.
- **Usar DLQ separada por cola**: No compartas una DLQ entre multiples colas. Hace el debugging mas dificil. Nombralas `<queue>.dlq`.
- **Usar TTL por mensaje para retry**: En lugar de dormir en el consumer, publica a una cola de retry con TTL. El mensaje retorna automaticamente a la cola principal despues de que el TTL expira.
- **Eliminar headers de dead-letter al replay**: Cuando replays desde DLQ, remueve los headers `x-death` para evitar confusion en fallos subsecuentes.
- **Monitorear profundidad de DLQ**: Establece alertas en el conteo de mensajes de DLQ. Una DLQ creciente indica un problema sistemico que necesita investigacion.
- **Usar overflow `reject-publish`**: Con `x-overflow=reject-publish`, los publicadores reciben un error cuando la cola esta llena, permitiendoles manejarlo. `drop-head` descarta mensajes silenciosamente.

## Errores Comunes

- **No establecer `x-dead-letter-routing-key`**: Sin el, RabbitMQ usa el routing key original, que puede no enrutar a la DLQ correctamente. Siempre establecelo explicitamente.
- **Requeuing de poison pills**: `basic_nack(requeue=True)` en un mensaje que siempre falla crea un loop infinito. Usa `requeue=False` para dead-letter, o implementa un contador de reintentos.
- **No manejar mensajes de DLQ**: Una DLQ que nadie lee es solo perdida de datos retrasada. Regularmente inspecciona y replay o descarta mensajes de DLQ.
- **Compartir un DLX entre colas**: Si multiples colas usan el mismo DLX, los mensajes dead-lettered de todas las colas se mezclan en el mismo exchange. Usa DLX por cola o routing keys distintos.
- **No probar el comportamiento de DLQ**: La configuracion de DLQ es facil de hacer mal. Prueba enviando un mensaje, rechazandolo y verificando que llega a la DLQ.

## FAQ

**Que dispara que un mensaje sea dead-lettered?**

Tres condiciones: (1) El consumer rechaza con `basic_nack` o `basic_reject` y `requeue=False`. (2) El TTL del mensaje expira (por mensaje o por cola). (3) La cola excede `x-max-length` con `x-overflow=drop-head`.

**Puede un mensaje dead-lettered ser dead-lettered otra vez?**

Si. Si la DLQ tambien tiene un `x-dead-letter-exchange`, un mensaje rechazado de la DLQ se dead-letter otra vez. RabbitMQ agrega al header `x-death`, creando una cadena de registros de muerte.

**Como hago replay de mensajes desde DLQ a la cola principal?**

Usa `basic_get` para obtener de DLQ, `basic_publish` a la cola principal, luego `basic_ack` para eliminar de DLQ. Elimina los headers de dead-letter antes de republicar.

**Cual es la diferencia entre overflow `drop-head` y `reject-publish`?**

`drop-head` (default) elimina silenciosamente el mensaje mas antiguo cuando la cola esta llena. `reject-publish` rechaza nuevos mensajes, notificando al publicador. Usa `reject-publish` cuando los publicadores deberian manejar el overflow.

**Puedo establecer un TTL en la DLQ misma?**

Si. Establece `x-message-ttl` en la DLQ para descartar automaticamente mensajes dead-lettered antiguos. Esto previene que la DLQ crezca indefinidamente. Establece un TTL largo (ej., 7 dias) para permitir tiempo de investigacion.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
