---
contentType: recipes
slug: redis-pubsub-messaging
title: "Redis Pub/Sub para mensajeria entre procesos"
description: "Usa canales pub/sub de Redis para difundir eventos entre procesos, manejar suscripciones e implementar notificaciones en tiempo real"
metaDescription: "Implementa Redis pub/sub para mensajeria entre procesos. Difunde eventos, maneja suscripciones y construye sistemas de notificaciones en tiempo real."
difficulty: intermediate
topics:
  - caching
  - messaging
tags:
  - redis
  - pubsub
  - messaging
  - realtime
  - events
relatedResources:
  - /recipes/caching/redis-cache-aside-pattern
  - /recipes/caching/python-redis-cache-decorator
  - /patterns/messaging/voucher-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa Redis pub/sub para mensajeria entre procesos. Difunde eventos, maneja suscripciones y construye sistemas de notificaciones en tiempo real."
  keywords:
    - redis pubsub
    - redis messaging
    - pub sub pattern
    - redis events
    - cross process communication
---

# Redis Pub/Sub para mensajeria entre procesos

Redis pub/sub permite que procesos se comuniquen a traves de canales sin acoplamiento directo. Un publicador envia un mensaje a un canal; todos los procesos suscritos lo reciben. Esto es util para invalidacion de cache entre instancias, notificaciones en tiempo real y arquitecturas event-driven donde los servicios necesitan reaccionar a cambios sin polling.

## Cuando Usar Esto

- Invalidacion de cache entre multiples instancias de servidor
- Notificaciones en tiempo real (usuario conectado, nuevo mensaje, cambio de estado)
- Microservicios event-driven que reaccionan a eventos de dominio
- Desacoplar productores de consumidores sin una cola de mensajes

## Requisitos Previos

- Python 3.10+
- Paquete `redis` (`pip install redis`)
- Una instancia de Redis corriendo

## Solucion

### 1. Instalar dependencias

```bash
pip install redis
```

### 2. Publicador — difundir eventos

```python
import json
import logging
import time
from redis import Redis

logger = logging.getLogger(__name__)

class EventPublisher:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def publish(self, channel: str, event: dict) -> int:
        """Publish an event to a channel.

        Args:
            channel: Channel name (e.g., 'user.events').
            event: Event payload as a dict.

        Returns:
            Number of subscribers that received the message.
        """
        message = json.dumps(event, default=str)
        receivers = self.redis.publish(channel, message)
        logger.info("Published to %s: %d receivers", channel, receivers)
        return receivers

    def publish_user_event(self, event_type: str, user_id: str, data: dict) -> int:
        return self.publish("user.events", {
            "type": event_type,
            "userId": user_id,
            "data": data,
            "timestamp": int(time.time()),
        })
```

### 3. Suscriptor — escuchar eventos

```python
import json
import threading
from redis import Redis

class EventSubscriber:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self._threads: list[threading.Thread] = []

    def subscribe(
        self,
        channels: list[str],
        handler: callable,
    ) -> None:
        """Subscribe to channels and process messages with a handler.

        Args:
            channels: List of channel names to subscribe to.
            handler: Function called with (channel, event_dict) for each message.
        """
        pubsub = self.redis.pubsub()
        pubsub.subscribe(*channels)

        thread = threading.Thread(
            target=self._listen,
            args=(pubsub, handler),
            daemon=True,
        )
        thread.start()
        self._threads.append(thread)

    def _listen(self, pubsub, handler: callable) -> None:
        for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    event = json.loads(message["data"])
                    handler(message["channel"], event)
                except json.JSONDecodeError as e:
                    logging.warning("Invalid message on %s: %s", message["channel"], e)
                except Exception as e:
                    logging.error("Handler error on %s: %s", message["channel"], e)

    def stop_all(self) -> None:
        for thread in self._threads:
            thread.join(timeout=5)
```

### 4. Suscripcion por patron

Suscribirse a canales que coinciden con un patron glob:

```python
def subscribe_pattern(
    self,
    pattern: str,
    handler: callable,
) -> None:
    """Subscribe to channels matching a glob pattern."""
    pubsub = self.redis.pubsub()
    pubsub.psubscribe(pattern)

    thread = threading.Thread(
        target=self._listen_pattern,
        args=(pubsub, handler),
        daemon=True,
    )
    thread.start()
    self._threads.append(thread)

def _listen_pattern(self, pubsub, handler: callable) -> None:
    for message in pubsub.listen():
        if message["type"] == "pmessage":
            try:
                event = json.loads(message["data"])
                handler(message["channel"], event)
            except Exception as e:
                logging.error("Pattern handler error: %s", e)
```

### 5. Caso de uso — invalidacion de cache entre instancias

```python
# Instancia 1 — publica invalidacion al actualizar
publisher = EventPublisher(redis_client)

def update_product(product_id: str, data: dict) -> dict:
    product = db.products.update(product_id, data)
    cache.delete(f"product:{product_id}")
    publisher.publish("cache.invalidate", {
        "action": "delete",
        "key": f"product:{product_id}",
    })
    return product

# Instancia 2 — se suscribe e invalida su cache local
subscriber = EventSubscriber(redis_client)

def handle_invalidation(channel: str, event: dict):
    if event["action"] == "delete":
        local_cache.delete(event["key"])
    elif event["action"] == "clear_pattern":
        local_cache.clear_pattern(event["pattern"])

subscriber.subscribe(["cache.invalidate"], handle_invalidation)
```

### 6. Caso de uso — notificaciones en tiempo real

```python
# Servidor WebSocket — se suscribe a canales de notificacion de usuario
subscriber = EventSubscriber(redis_client)

def handle_notification(channel: str, event: dict):
    user_id = event["userId"]
    websocket_manager.send_to_user(user_id, event)

# Suscribirse a todos los canales de notificacion
subscriber.subscribe_pattern("notifications:*", handle_notification)

# Servidor API — publica notificaciones
publisher = EventPublisher(redis_client)

def notify_user(user_id: str, message: str):
    publisher.publish(f"notifications:{user_id}", {
        "type": "notification",
        "userId": user_id,
        "message": message,
    })
```

## Como Funciona

1. **`PUBLISH`** envia un mensaje a todos los suscriptores de un canal. Redis retorna el numero de receptores — si es cero, nadie esta escuchando.
2. **`SUBSCRIBE`** bloquea y escucha mensajes en los canales especificados. Cada mensaje incluye el nombre del canal y los datos.
3. **`PSUBSCRIBE`** se suscribe a canales que coinciden con un patron glob (ej. `notifications:*`), util para enrutar a canales dinamicos.
4. **Threads** se usan porque `pubsub.listen()` es un iterador bloqueante. Cada suscripcion corre en un thread daemon para que no impida la salida del proceso.
5. **Los mensajes son efimeros** — si no hay suscriptor escuchando, el mensaje se pierde. Usa Redis Streams para mensajeria persistente.

## Variantes

### Redis Streams para mensajeria persistente

Cuando los mensajes no deben perderse, usa Streams en lugar de pub/sub:

```python
# Productor
redis_client.xadd("events:users", {
    "type": "created",
    "userId": "123",
    "data": json.dumps(user_data),
})

# Consumidor con consumer group
def consume_events():
    while True:
        messages = redis_client.xreadgroup(
            "event-workers",
            "worker-1",
            {"events:users": ">"},
            count=10,
            block=5000,
        )
        for stream, msg_list in messages:
            for msg_id, fields in msg_list:
                process_event(fields)
                redis_client.xack(stream, "event-workers", msg_id)
```

### Sharded Pub/Sub (Redis 7.0+)

Para despliegues a gran escala, usa sharded pub/sub para distribuir el trafico de canales entre shards del cluster:

```python
# Publicador
redis_client.spublish("user.events", message)

# Suscriptor
pubsub = redis_client.ssubscribe("user.events")
for message in pubsub.listen():
    if message["type"] == "smessage":
        handler(message["channel"], json.loads(message["data"]))
```

### Apagado elegante

```python
import signal

def setup_graceful_shutdown(subscriber: EventSubscriber):
    def shutdown(signum, frame):
        logging.info("Shutting down subscriber...")
        subscriber.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
```

## Mejores Practicas

- **Usa pub/sub para eventos fire-and-forget** — los mensajes no se persisten; si la entrega importa, usa Streams
- **Serializa con JSON** — mantén los mensajes pequenos y legibles; usa MessagePack para alto throughput
- **Maneja errores en el listener** — una excepcion no manejada en el handler mata el thread del listener
- **Usa threads daemon** — previene que el suscriptor mantenga vivo el proceso al apagar

## Errores Comunes

- **Esperar garantias de entrega de mensajes** — pub/sub no persiste mensajes; los suscriptores offline los pierden
- **Suscribir con la misma conexion Redis usada para comandos** — Redis requiere una conexion dedicada para suscripciones
- **No manejar reconexion** — si la conexion Redis cae, el suscriptor deja de recibir mensajes silenciosamente
- **Publicar payloads grandes** — Redis procesa mensajes en el thread principal; payloads grandes bloquean todas las operaciones

## FAQ

**Q: Que pasa si nadie esta suscrito a un canal?**
A: El mensaje se descarta. `PUBLISH` retorna 0. Esto es por diseno — pub/sub es fire-and-forget.

**Q: Puedo usar pub/sub con Redis Cluster?**
A: Si, pero los mensajes se difunden a todos los nodos. Usa sharded pub/sub (`SPUBLISH`/`SSUBSCRIBE`) en Redis 7.0+ para mejor escalabilidad.

**Q: Debo usar pub/sub o Redis Streams?**
A: Usa pub/sub para notificaciones en tiempo real donde la perdida de mensajes es aceptable. Usa Streams cuando necesitas persistencia, consumer groups y entrega at-least-once.

**Q: Cuantos suscriptores puede tener un canal?**
A: Miles. Redis maneja el fan-out eficientemente, pero cada suscriptor anade memoria para el buffer de salida.

**Q: ¿Qué pasa con los mensajes cuando no hay suscriptores escuchando?**
A: Los mensajes se descartan. Redis Pub/Sub no persiste mensajes. Si la durabilidad importa, usa Redis Streams en su lugar — almacenan mensajes y permiten que los consumer groups lean a su propio ritmo.

**Q: ¿Puedo usar suscripciones por patrón con sharded Pub/Sub?**
A: No. Sharded Pub/Sub (`SPUBLISH`/`SSUBSCRIBE`) no soporta pattern matching con globs. Usa `PUBLISH`/`PSUBSCRIBE` regular para suscripciones por patrón, pero ten en cuenta que estas no se benefician del sharding del cluster.

## Errores Comunes

- Asumir que los mensajes se entregan de forma confiable — Pub/Sub descarta mensajes cuando los suscriptores están desconectados
- No manejar lógica de reconexión — los suscriptores deben resuscribirse después de una caída de conexión
- Usar Pub/Sub para colas de tareas — usa Redis Streams o Lists con `BRPOP` en su lugar
- Publicar payloads grandes (>1MB) — Redis bloquea el cliente que publica durante el fan-out
- No setear timeout en conexiones de suscriptores — los consumidores lentos pueden acumular backlog en el buffer de salida
- Usar Pub/Sub para notificaciones críticas sin una cola de fallback — si las garantías de entrega importan, combina con Redis Streams

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
