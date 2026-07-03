---
contentType: recipes
slug: redis-pub-sub-python
title: "Implement Redis Pub/Sub Messaging in Python"
description: "Build real-time pub/sub messaging with Redis and Python including pattern subscriptions, message serialization, connection pooling, and broadcast patterns for microservices."
metaDescription: "Implement Redis pub/sub messaging in Python. Use pattern subscriptions, message serialization, connection pooling, and broadcast patterns for microservices."
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
  metaDescription: "Implement Redis pub/sub messaging in Python. Use pattern subscriptions, message serialization, connection pooling, and broadcast patterns for microservices."
  keywords:
    - redis pub sub python
    - redis publish subscribe
    - redis pattern subscription
    - redis messaging python
    - redis broadcast microservices
---

## Overview

Redis Pub/Sub is a lightweight messaging pattern where publishers send messages to channels and subscribers receive them in real-time. Unlike queues, there's no persistence — if no subscriber is listening, the message is lost. Below: publishing and subscribing with Python, pattern subscriptions with wildcards, structured message serialization, connection management, and broadcast patterns for microservice communication.

## When to Use This

- Real-time notifications (chat messages, live updates, status changes)
- Cache invalidation across service instances
- Microservice event broadcasting (config changes, feature flags)
- Any fire-and-forget messaging where message loss is acceptable

## Prerequisites

- Python 3.10+
- Redis server (local or cloud)
- `redis` package

## Solution

### 1. Basic Publisher and Subscriber

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

# Usage
publish_message('events', {'type': 'user.created', 'userId': '123'})

# In another process
subscribe_channel('events')
```

### 2. Pattern Subscription (Wildcards)

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

# Subscribe to all user events: user.created, user.updated, user.deleted
subscribe_pattern('user.*')

# Subscribe to all events from any service
subscribe_pattern('service.*.events')
```

### 3. Structured Message Handler

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

# Usage
bus = EventBus()

# Publish
bus.publish('user.events', Event(
    event_type='user.created',
    source='auth-service',
    payload={'userId': '123', 'email': 'user@example.com'},
    timestamp='2026-07-03T10:00:00Z',
    correlation_id='req-abc',
))

# Subscribe
def handle_event(event: Event, channel: str):
    logger.info(f"[{channel}] {event.event_type}: {event.payload}")

bus.subscribe(['user.events', 'order.events'], handle_event)
```

### 4. Multi-Service Broadcast

```python
import redis
import json

class ServiceBroadcaster:
    """Broadcast events to all instances of a service via pub/sub."""

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
                # Skip own messages
                if event['source'] != self.instance_id:
                    handler(event)

# Usage: cache invalidation across instances
broadcaster = ServiceBroadcaster('api-service', 'instance-1')

# Broadcast cache invalidation
broadcaster.broadcast('cache.invalidate', {'keys': ['user:123', 'user:456']})

# Listen for invalidation events
def on_invalidate(event):
    if event['event_type'] == 'cache.invalidate':
        for key in event['data']['keys']:
            local_cache.delete(key)
            print(f"Invalidated: {key}")

broadcaster.listen(on_invalidate)
```

### 5. Pub/Sub with Redis Streams Fallback

```python
import redis
import json

class ReliableEventBus:
    """Pub/Sub with Redis Streams for persistence — subscribers that
    reconnect can read missed events from the stream."""

    def __init__(self, host: str = 'localhost'):
        self.redis = redis.Redis(host=host, port=6379, db=0, decode_responses=True)

    def publish(self, channel: str, message: dict):
        # Publish to pub/sub for real-time subscribers
        self.redis.publish(channel, json.dumps(message))
        # Also append to a stream for persistence
        stream_key = f'stream:{channel}'
        self.redis.xadd(stream_key, {'data': json.dumps(message)})

    def subscribe_realtime(self, channel: str, handler):
        pubsub = self.redis.pubsub()
        pubsub.subscribe(channel)
        for message in pubsub.listen():
            if message['type'] == 'message':
                handler(json.loads(message['data']))

    def subscribe_replay(self, channel: str, handler, last_id: str = '0'):
        """Read missed events from the stream after reconnection."""
        stream_key = f'stream:{channel}'
        events = self.redis.xread({stream_key: last_id}, block=0)
        for _stream, messages in events:
            for msg_id, fields in messages:
                handler(json.loads(fields['data']))
                # Update last read ID for next call
```

### 6. Threaded Subscriber

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

# Usage
subscriber = ThreadedSubscriber()

def on_user_event(data):
    print(f"User event: {data}")

def on_order_event(data):
    print(f"Order event: {data}")

subscriber.subscribe('user.events', on_user_event)
subscriber.subscribe('order.events', on_order_event)

# Main thread continues doing other work
# subscriber.stop() when shutting down
```

## How It Works

1. **Channels**: Publishers send messages to named channels. Subscribers listen on channels. Redis routes messages from publishers to all active subscribers on that channel.
2. **Pattern subscriptions**: `psubscribe` uses glob-style patterns (`*` matches any, `?` matches one character). `user.*` matches `user.created`, `user.updated`, etc.
3. **No persistence**: Pub/Sub doesn't store messages. If no subscriber is listening, the message is lost. For durability, use Redis Streams alongside Pub/Sub.
4. **Fire-and-forget**: The publisher doesn't know if any subscribers received the message. `publish()` returns the number of subscribers that received it, but doesn't wait for acknowledgment.
5. **Connection isolation**: Each subscriber needs its own Redis connection. The `redis-py` pubsub object blocks on `listen()`, so it can't share a connection with other operations.

## Variants

### Sharded Pub/Sub (Redis 7.0+)

```python
# Sharded pub/sub uses cluster shard slots for message routing
# This ensures messages stay within the shard, reducing network overhead
r = redis.RedisCluster(host='localhost', port=7000)
r.spublish('user.events', json.dumps({'type': 'created', 'id': '123'}))
```

### Pub/Sub with Sentinel for HA

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

### Rate-Limited Publisher

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

## Best Practices

- **Use Pub/Sub for fire-and-forget**: Pub/Sub is ideal for notifications, cache invalidation, and real-time updates. For guaranteed delivery, use Redis Streams or RabbitMQ.
- **Serialize as JSON**: Use JSON for message serialization. It's human-readable, language-agnostic, and supported everywhere. For high throughput, consider MessagePack.
- **Use separate connections for pub and sub**: The subscriber blocks on `listen()`. Use a separate Redis connection for publishing to avoid blocking.
- **Handle reconnection**: If the subscriber disconnects, it misses messages. Use Redis Streams as a fallback to replay missed events on reconnection.
- **Use pattern subscriptions wisely**: `psubscribe('*')` subscribes to everything — it can overwhelm the subscriber. Use specific patterns like `user.*` or `service.*.events`.
- **Clean up on shutdown**: Always `unsubscribe` and close the pubsub connection when shutting down. Leaked connections consume Redis resources.

## Common Mistakes

- **Expecting message persistence**: Pub/Sub doesn't store messages. If the subscriber is down, messages are lost. Use Streams for durability.
- **Sharing one connection for pub and sub**: The subscriber blocks the connection. Publish calls from the same connection will block or fail.
- **Not handling deserialization errors**: If a message isn't valid JSON, `json.loads` raises an exception. Wrap in try/except to prevent the subscriber from crashing.
- **Subscribing to too many channels**: Each subscription consumes memory and CPU. Subscribe only to channels you need.
- **Not testing message loss**: Test what happens when the subscriber is down. If message loss is unacceptable, don't use Pub/Sub — use Streams.

## FAQ

**What is the difference between Redis Pub/Sub and Redis Streams?**

Pub/Sub is fire-and-forget — no persistence, no consumer groups. Streams are append-only logs with persistence, consumer groups, and replay capability. Use Pub/Sub for real-time notifications, Streams for durable event streaming.

**Can I have multiple subscribers on the same channel?**

Yes. All subscribers on a channel receive every message. This is the broadcast pattern — useful for cache invalidation across multiple service instances.

**What happens if a subscriber is slow?**

Redis sends messages to subscribers as fast as they're published. If a subscriber can't keep up, Redis buffers messages in the output buffer. If the buffer exceeds `client-output-buffer-limit`, Redis disconnects the subscriber.

**Is Redis Pub/Sub suitable for high-throughput messaging?**

Redis Pub/Sub can handle 100,000+ messages per second on a single instance. For higher throughput, use sharded Pub/Sub (Redis 7.0+) or Kafka. For durability, use Redis Streams.

**Can I use Pub/Sub with Redis Cluster?**

Yes, but messages are broadcast across all nodes in the cluster, which adds overhead. In Redis 7.0+, use sharded Pub/Sub (`SPUBLISH`/`SSUBSCRIBE`) to keep messages within a shard.
