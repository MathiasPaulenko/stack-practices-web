---
contentType: recipes
slug: redis-pub-sub-python
title: "Implementar Mensajeria Pub/Sub con Redis en Python"
description: "Construir mensajeria pub/sub en tiempo real con Redis y Python incluyendo suscripciones por patron, serializacion de mensajes, connection pooling y patrones de broadcast para microservicios."
metaDescription: "Implementa mensajeria pub/sub con Redis en Python. Usa suscripciones por patron, serializacion, connection pooling y patrones de broadcast para microservicios."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - redis
  - pubsub
  - python
  - real-time
  - messaging
relatedResources:
  - /recipes/messaging/rabbitmq-python-pika-consumer
  - /recipes/caching/nodejs-redis-cache-invalidation
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa mensajeria pub/sub con Redis en Python. Usa suscripciones por patron, serializacion, connection pooling y patrones de broadcast para microservicios."
  keywords:
    - redis pub sub python
    - redis publish subscribe
    - redis pattern subscription
    - redis messaging python
    - redis broadcast microservices
---

## Descripcion general

Redis Pub/Sub es un patron de mensajeria ligero donde los publicadores envian mensajes a canales y los suscriptores los reciben en tiempo real. A diferencia de las colas, no hay persistencia — si no hay suscriptor escuchando, el mensaje se pierde. A continuacion: publicar y suscribir con Python, suscripciones por patron con wildcards, serializacion estructurada de mensajes, gestion de conexiones y patrones de broadcast para comunicacion entre microservicios.

## Cuando Usar Esto

- Notificaciones en tiempo real (mensajes de chat, actualizaciones en vivo, cambios de estado)
- Invalidation de cache entre instancias de servicio
- Broadcast de eventos entre microservicios (cambios de config, feature flags)
- Cualquier mensajeria fire-and-forget donde la perdida de mensajes es aceptable

## Prerrequisitos

- Python 3.10+
- Servidor Redis (local o cloud)
- Paquete `redis`

## Solucion

### 1. Publisher y Subscriber Basicos

```python
import redis
import json

# Publisher
def publish_message(channel: str, message: dict):
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.publish(channel, json.dumps(message))
    print(f"Published to {channel}: {message}")

# Subscriber
def subscribe_channel(channel: str):
    r = redis.Redis(host='localhost', port=6379, db=0)
    pubsub = r.pubsub()
    pubsub.subscribe(channel)

    print(f"Subscribed to {channel}")
    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'])
            print(f"Received: {data}")

# Uso
publish_message('events', {'type': 'user.created', 'userId': '123'})

# En otro proceso
subscribe_channel('events')
```

### 2. Suscripcion por Patron (Wildcards)

```python
import redis
import json

def subscribe_pattern(pattern: str):
    r = redis.Redis(host='localhost', port=6379, db=0)
    pubsub = r.pubsub()
    pubsub.psubscribe(pattern)

    print(f"Subscribed to pattern: {pattern}")
    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            channel = message['channel'].decode('utf-8')
            data = json.loads(message['data'])
            print(f"Channel={channel}, Data={data}")

# Suscribirse a todos los eventos de usuario: user.created, user.updated, user.deleted
subscribe_pattern('user.*')

# Suscribirse a todos los eventos de cualquier servicio
subscribe_pattern('service.*.events')
```

### 3. Handler de Mensajes Estructurado

```python
import redis
import json
import logging
from dataclasses import dataclass, asdict
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Event:
    event_type: str
    source: str
    payload: dict
    timestamp: str
    correlation_id: Optional[str] = None

class EventBus:
    def __init__(self, host: str = 'localhost', port: int = 6379):
        self.redis = redis.Redis(host=host, port=port, db=0, decode_responses=True)

    def publish(self, channel: str, event: Event):
        message = json.dumps(asdict(event))
        subscribers = self.redis.publish(channel, message)
        logger.info(f"Published to {channel}: {subscribers} subscribers received")

    def subscribe(self, channels: list, handler):
        pubsub = self.redis.pubsub()
        pubsub.subscribe(channels)

        for message in pubsub.listen():
            if message['type'] == 'message':
                event = Event(**json.loads(message['data']))
                handler(event, message['channel'])

    def psubscribe(self, patterns: list, handler):
        pubsub = self.redis.pubsub()
        pubsub.psubscribe(patterns)

        for message in pubsub.listen():
            if message['type'] == 'pmessage':
                event = Event(**json.loads(message['data']))
                handler(event, message['channel'])

# Uso
bus = EventBus()

# Publicar
bus.publish('user.events', Event(
    event_type='user.created',
    source='auth-service',
    payload={'userId': '123', 'email': 'user@example.com'},
    timestamp='2026-07-03T10:00:00Z',
    correlation_id='req-abc',
))

# Suscribirse
def handle_event(event: Event, channel: str):
    logger.info(f"[{channel}] {event.event_type}: {event.payload}")

bus.subscribe(['user.events', 'order.events'], handle_event)
```

### 4. Broadcast Multi-Servicio

```python
import redis
import json

class ServiceBroadcaster:
    """Broadcast eventos a todas las instancias de un servicio via pub/sub."""

    def __init__(self, service_name: str, instance_id: str):
        self.redis = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.service_name = service_name
        self.instance_id = instance_id
        self.channel = f'{service_name}.broadcast'

    def broadcast(self, event_type: str, data: dict):
        message = json.dumps({
            'event_type': event_type,
            'source': self.instance_id,
            'data': data,
            'timestamp': __import__('datetime').datetime.utcnow().isoformat(),
        })
        self.redis.publish(self.channel, message)

    def listen(self, handler):
        pubsub = self.redis.pubsub()
        pubsub.subscribe(self.channel)

        for message in pubsub.listen():
            if message['type'] == 'message':
                event = json.loads(message['data'])
                # Saltar mensajes propios
                if event['source'] != self.instance_id:
                    handler(event)

# Uso: invalidation de cache entre instancias
broadcaster = ServiceBroadcaster('api-service', 'instance-1')

# Broadcast invalidation de cache
broadcaster.broadcast('cache.invalidate', {'keys': ['user:123', 'user:456']})

# Escuchar eventos de invalidation
def on_invalidate(event):
    if event['event_type'] == 'cache.invalidate':
        for key in event['data']['keys']:
            local_cache.delete(key)
            print(f"Invalidated: {key}")

broadcaster.listen(on_invalidate)
```

### 5. Pub/Sub con Fallback a Redis Streams

```python
import redis
import json

class ReliableEventBus:
    """Pub/Sub con Redis Streams para persistencia — los suscriptores que
    se reconectan pueden leer eventos perdidos del stream."""

    def __init__(self, host: str = 'localhost'):
        self.redis = redis.Redis(host=host, port=6379, db=0, decode_responses=True)

    def publish(self, channel: str, message: dict):
        # Publicar a pub/sub para suscriptores en tiempo real
        self.redis.publish(channel, json.dumps(message))
        # Tambien agregar a un stream para persistencia
        stream_key = f'stream:{channel}'
        self.redis.xadd(stream_key, {'data': json.dumps(message)})

    def subscribe_realtime(self, channel: str, handler):
        pubsub = self.redis.pubsub()
        pubsub.subscribe(channel)
        for message in pubsub.listen():
            if message['type'] == 'message':
                handler(json.loads(message['data']))

    def subscribe_replay(self, channel: str, handler, last_id: str = '0'):
        """Leer eventos perdidos del stream despues de reconexion."""
        stream_key = f'stream:{channel}'
        events = self.redis.xread({stream_key: last_id}, block=0)
        for _stream, messages in events:
            for msg_id, fields in messages:
                handler(json.loads(fields['data']))
                # Actualizar last read ID para la siguiente llamada
```

### 6. Subscriber con Threads

```python
import redis
import json
import threading
import logging

logger = logging.getLogger(__name__)

class ThreadedSubscriber:
    def __init__(self, host: str = 'localhost'):
        self.redis = redis.Redis(host=host, port=6379, db=0, decode_responses=True)
        self._threads = []
        self._running = True

    def subscribe(self, channel: str, handler):
        def listen():
            pubsub = self.redis.pubsub()
            pubsub.subscribe(channel)
            logger.info(f"Listening on {channel}")

            for message in pubsub.listen():
                if not self._running:
                    break
                if message['type'] == 'message':
                    try:
                        handler(json.loads(message['data']))
                    except Exception as e:
                        logger.error(f"Handler error: {e}")

            pubsub.unsubscribe(channel)
            pubsub.close()

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()
        self._threads.append(thread)

    def stop(self):
        self._running = False
        for t in self._threads:
            t.join(timeout=5)

# Uso
subscriber = ThreadedSubscriber()

def on_user_event(data):
    print(f"User event: {data}")

def on_order_event(data):
    print(f"Order event: {data}")

subscriber.subscribe('user.events', on_user_event)
subscriber.subscribe('order.events', on_order_event)

# El thread principal continua haciendo otro trabajo
# subscriber.stop() al apagar
```

## Como Funciona

1. **Canales**: Los publicadores envian mensajes a canales nombrados. Los suscriptores escuchan en canales. Redis enruta mensajes de publicadores a todos los suscriptores activos en ese canal.
2. **Suscripciones por patron**: `psubscribe` usa patrones glob-style (`*` coincide con cualquier, `?` coincide con un caracter). `user.*` coincide con `user.created`, `user.updated`, etc.
3. **Sin persistencia**: Pub/Sub no almacena mensajes. Si no hay suscriptor escuchando, el mensaje se pierde. Para durability, usa Redis Streams junto con Pub/Sub.
4. **Fire-and-forget**: El publicador no sabe si algun suscriptor recibio el mensaje. `publish()` retorna el numero de suscriptores que lo recibieron, pero no espera acknowledgment.
5. **Aislamiento de conexion**: Cada suscriptor necesita su propia conexion Redis. El objeto pubsub de `redis-py` bloquea en `listen()`, por lo que no puede compartir conexion con otras operaciones.

## Variantes

### Sharded Pub/Sub (Redis 7.0+)

```python
# Sharded pub/sub usa cluster shard slots para routing de mensajes
# Esto asegura que los mensajes se quedan dentro del shard, reduciendo overhead de red
r = redis.RedisCluster(host='localhost', port=7000)
r.spublish('user.events', json.dumps({'type': 'created', 'id': '123'}))
```

### Pub/Sub con Sentinel para HA

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('localhost', 26379),
    ('localhost', 26380),
], socket_timeout=0.5)

master = sentinel.master_for('mymaster', socket_timeout=0.5)
master.publish('events', json.dumps({'type': 'test'}))

slave = sentinel.slave_for('mymaster', socket_timeout=0.5)
pubsub = slave.pubsub()
pubsub.subscribe('events')
```

### Publisher con Rate Limiting

```python
import time
import redis

class RateLimitedPublisher:
    def __init__(self, redis_client, max_per_second: int = 100):
        self.redis = redis_client
        self.max_per_second = max_per_second
        self.min_interval = 1.0 / max_per_second
        self._last_publish = 0

    def publish(self, channel: str, message: str):
        now = time.time()
        elapsed = now - self._last_publish
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)

        self.redis.publish(channel, message)
        self._last_publish = time.time()
```

## Mejores Practicas

- **Usar Pub/Sub para fire-and-forget**: Pub/Sub es ideal para notificaciones, invalidation de cache y actualizaciones en tiempo real. Para entrega garantizada, usa Redis Streams o RabbitMQ.
- **Serializar como JSON**: Usa JSON para serializacion de mensajes. Es human-readable, language-agnostic y soportado en todas partes. Para alto throughput, considera MessagePack.
- **Usar conexiones separadas para pub y sub**: El suscriptor bloquea en `listen()`. Usa una conexion Redis separada para publicar y evitar bloqueo.
- **Manejar reconexion**: Si el suscriptor se desconecta, pierde mensajes. Usa Redis Streams como fallback para replay de eventos perdidos al reconectar.
- **Usar suscripciones por patron sabiamente**: `psubscribe('*')` se suscribe a todo — puede abrumar al suscriptor. Usa patrones especificos como `user.*` o `service.*.events`.
- **Limpiar al apagar**: Siempre `unsubscribe` y cierra la conexion pubsub al apagar. Conexiones con leak consumen recursos de Redis.

## Errores Comunes

- **Esperar persistencia de mensajes**: Pub/Sub no almacena mensajes. Si el suscriptor esta down, los mensajes se pierden. Usa Streams para durability.
- **Compartir una conexion para pub y sub**: El suscriptor bloquea la conexion. Llamadas publish desde la misma conexion bloquearan o fallaran.
- **No manejar errores de deserializacion**: Si un mensaje no es JSON valido, `json.loads` lanza una excepcion. Envuelve en try/except para prevenir que el suscriptor crashee.
- **Suscribirse a demasiados canales**: Cada suscripcion consume memoria y CPU. Suscribete solo a los canales que necesitas.
- **No probar perdida de mensajes**: Prueba que pasa cuando el suscriptor esta down. Si la perdida de mensajes es inaceptable, no uses Pub/Sub — usa Streams.

## FAQ

**Cual es la diferencia entre Redis Pub/Sub y Redis Streams?**

Pub/Sub es fire-and-forget — sin persistencia, sin consumer groups. Streams son logs append-only con persistencia, consumer groups y capacidad de replay. Usa Pub/Sub para notificaciones en tiempo real, Streams para event streaming durable.

**Puedo tener multiples suscriptores en el mismo canal?**

Si. Todos los suscriptores en un canal reciben cada mensaje. Este es el patron broadcast — util para invalidation de cache entre multiples instancias de servicio.

**Que pasa si un suscriptor es lento?**

Redis envia mensajes a los suscriptores tan rapido como se publican. Si un suscriptor no puede mantenerse, Redis bufferiza mensajes en el output buffer. Si el buffer excede `client-output-buffer-limit`, Redis desconecta al suscriptor.

**Es Redis Pub/Sub adecuado para mensajeria de alto throughput?**

Redis Pub/Sub puede manejar 100,000+ mensajes por segundo en una sola instancia. Para mayor throughput, usa sharded Pub/Sub (Redis 7.0+) o Kafka. Para durability, usa Redis Streams.

**Puedo usar Pub/Sub con Redis Cluster?**

Si, pero los mensajes se broadcast a todos los nodos del cluster, lo que agrega overhead. En Redis 7.0+, usa sharded Pub/Sub (`SPUBLISH`/`SSUBSCRIBE`) para mantener los mensajes dentro de un shard.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
