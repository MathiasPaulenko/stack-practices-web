---
contentType: recipes
slug: redis-pubsub-messaging
title: "Redis Pub/Sub for Cross-Process Messaging"
description: "Use Redis pub/sub channels to broadcast events between processes, handle subscriptions, and implement real-time notifications"
metaDescription: "Implement Redis pub/sub for cross-process messaging. Broadcast events, handle subscriptions, and build real-time notification systems."
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
  - /patterns/messaging/pubsub-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement Redis pub/sub for cross-process messaging. Broadcast events, handle subscriptions, and build real-time notification systems."
  keywords:
    - redis pubsub
    - redis messaging
    - pub sub pattern
    - redis events
    - cross process communication
---

# Redis Pub/Sub for Cross-Process Messaging

Redis pub/sub lets processes communicate through channels without direct coupling. A publisher sends a message to a channel; all subscribed processes receive it. This is useful for cache invalidation across instances, real-time notifications, and event-driven architectures where services need to react to changes without polling.

## When to Use This

- Cache invalidation across multiple server instances
- Real-time notifications (user came online, new message, status change)
- Event-driven microservices that react to domain events
- Decoupling producers from consumers without a message queue

## Prerequisites

- Python 3.10+
- `redis` package (`pip install redis`)
- A running Redis instance

## Solution

### 1. Install Dependencies

```bash
pip install redis
```

### 2. Publisher — Broadcast Events

```python
import json
import logging
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

### 3. Subscriber — Listen for Events

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

### 4. Pattern Subscription

Subscribe to channels matching a glob pattern:

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

### 5. Use Case — Cross-Instance Cache Invalidation

```python
# Instance 1 — publishes invalidation on update
publisher = EventPublisher(redis_client)

def update_product(product_id: str, data: dict) -> dict:
    product = db.products.update(product_id, data)
    cache.delete(f"product:{product_id}")
    publisher.publish("cache.invalidate", {
        "action": "delete",
        "key": f"product:{product_id}",
    })
    return product

# Instance 2 — subscribes and invalidates its local cache
subscriber = EventSubscriber(redis_client)

def handle_invalidation(channel: str, event: dict):
    if event["action"] == "delete":
        local_cache.delete(event["key"])
    elif event["action"] == "clear_pattern":
        local_cache.clear_pattern(event["pattern"])

subscriber.subscribe(["cache.invalidate"], handle_invalidation)
```

### 6. Use Case — Real-Time Notifications

```python
# WebSocket server — subscribes to user notification channels
subscriber = EventSubscriber(redis_client)

def handle_notification(channel: str, event: dict):
    user_id = event["userId"]
    websocket_manager.send_to_user(user_id, event)

# Subscribe to all notification channels
subscriber.subscribe_pattern("notifications:*", handle_notification)

# API server — publishes notifications
publisher = EventPublisher(redis_client)

def notify_user(user_id: str, message: str):
    publisher.publish(f"notifications:{user_id}", {
        "type": "notification",
        "userId": user_id,
        "message": message,
    })
```

## How It Works

1. **`PUBLISH`** sends a message to all subscribers of a channel. Redis returns the number of receivers — if zero, no one is listening.
2. **`SUBSCRIBE`** blocks and listens for messages on the specified channels. Each message includes the channel name and data.
3. **`PSUBSCRIBE`** subscribes to channels matching a glob pattern (e.g., `notifications:*`), useful for routing to dynamic channels.
4. **Threads** are used because `pubsub.listen()` is a blocking iterator. Each subscription runs in a daemon thread so it does not prevent process exit.
5. **Messages are ephemeral** — if no subscriber is listening, the message is lost. Use Redis Streams for persistent messaging.

## Variants

### Redis Streams for Persistent Messaging

When messages must not be lost, use Streams instead of pub/sub:

```python
# Producer
redis_client.xadd("events:users", {
    "type": "created",
    "userId": "123",
    "data": json.dumps(user_data),
})

# Consumer with consumer group
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

For large-scale deployments, use sharded pub/sub to distribute channel traffic across cluster shards:

```python
# Publisher
redis_client.spublish("user.events", message)

# Subscriber
pubsub = redis_client.ssubscribe("user.events")
for message in pubsub.listen():
    if message["type"] == "smessage":
        handler(message["channel"], json.loads(message["data"]))
```

### Graceful Shutdown

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

## Best Practices

- **Use pub/sub for fire-and-forget events** — messages are not persisted; if delivery matters, use Streams
- **Serialize with JSON** — keep messages small and human-readable; use MessagePack for high throughput
- **Handle errors in the listener** — an unhandled exception in the handler kills the listener thread
- **Use daemon threads** — prevents the subscriber from keeping the process alive on shutdown

## Common Mistakes

- **Expecting message delivery guarantees** — pub/sub does not persist messages; offline subscribers miss them
- **Subscribing with the same Redis connection used for commands** — Redis requires a dedicated connection for subscriptions
- **Not handling reconnection** — if the Redis connection drops, the subscriber stops receiving messages silently
- **Publishing large payloads** — Redis processes messages in the main thread; large payloads block all operations

## FAQ

**Q: What happens if no one is subscribed to a channel?**
A: The message is discarded. `PUBLISH` returns 0. This is by design — pub/sub is fire-and-forget.

**Q: Can I use pub/sub with Redis Cluster?**
A: Yes, but messages are broadcast to all nodes. Use sharded pub/sub (`SPUBLISH`/`SSUBSCRIBE`) in Redis 7.0+ for better scalability.

**Q: Should I use pub/sub or Redis Streams?**
A: Use pub/sub for real-time notifications where message loss is acceptable. Use Streams when you need persistence, consumer groups, and at-least-once delivery.

**Q: How many subscribers can one channel have?**
A: Thousands. Redis handles fan-out efficiently, but each subscriber adds memory for the output buffer.
