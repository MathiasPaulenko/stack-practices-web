---
contentType: patterns
slug: event-bus-pattern
title: "Event Bus Pattern"
description: "Decouple components by routing events through a central bus. A behavioral pattern for loosely coupled communication between modules."
metaDescription: "Learn the Event Bus Pattern for decoupled component communication. Examples in Python, Java, and JavaScript with sync and async variants."
difficulty: intermediate
topics:
  - design
tags:
  - event-bus
  - pattern
  - design-pattern
  - behavioral
  - decoupling
  - messaging
  - pub-sub
relatedResources:
  - /patterns/design/observer-pattern
  - /patterns/design/mediator-pattern
  - /patterns/design/outbox-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Event Bus Pattern for decoupled component communication. Examples in Python, Java, and JavaScript with sync and async variants."
  keywords:
    - event bus
    - design pattern
    - behavioral pattern
    - pub-sub
    - decoupling
    - messaging
---

# Event Bus Pattern

## Overview

The Event Bus Pattern enables communication between components without direct dependencies. Instead of calling each other directly, components publish events to a central bus and subscribe to events they care about. The bus routes events to all interested subscribers, decoupling publishers from consumers.

This is the foundation of event-driven architecture. A user registration module publishes `UserRegistered`; email, analytics, and CRM modules subscribe independently. The registration module never knows these consumers exist.

## When to Use

Use the Event Bus Pattern when:
- Multiple components need to react to the same event independently
- You want to add new reactions without modifying the publisher
- Cross-cutting concerns (logging, metrics, auditing) must observe operations
- Components must not have compile-time or runtime dependencies on each other
- You need async processing without blocking the main flow

## When to Avoid

- Simple one-to-one communication (direct method call is clearer)
- You need guaranteed delivery and ordering (use a message queue instead)
- Debugging requires tracing exact call chains (event buses obscure the flow)
- Events become a hidden control flow that is hard to reason about

## Solution

### Python

```python
from typing import Callable, List, Dict, Any
from dataclasses import dataclass
import threading

@dataclass
class Event:
    type: str
    payload: Dict[str, Any]


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    def subscribe(self, event_type: str, handler: Callable):
        with self._lock:
            self._subscribers.setdefault(event_type, []).append(handler)

    def publish(self, event: Event):
        handlers = []
        with self._lock:
            handlers = list(self._subscribers.get(event.type, []))
        for handler in handlers:
            handler(event)

    def unsubscribe(self, event_type: str, handler: Callable):
        with self._lock:
            if handler in self._subscribers.get(event_type, []):
                self._subscribers[event_type].remove(handler)


# Usage
bus = EventBus()

def on_user_registered(event: Event):
    print(f"Send welcome email to {event.payload['email']}")

def on_user_registered_analytics(event: Event):
    print(f"Track signup: {event.payload['user_id']}")

bus.subscribe("UserRegistered", on_user_registered)
bus.subscribe("UserRegistered", on_user_registered_analytics)

bus.publish(Event("UserRegistered", {"user_id": 42, "email": "alice@example.com"}))
```

### Java

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

class Event {
    private final String type;
    private final Map<String, Object> payload;

    public Event(String type, Map<String, Object> payload) {
        this.type = type;
        this.payload = payload;
    }
    public String getType() { return type; }
    public Map<String, Object> getPayload() { return payload; }
}

class EventBus {
    private final Map<String, List<Consumer<Event>>> subscribers = new ConcurrentHashMap<>();

    public void subscribe(String eventType, Consumer<Event> handler) {
        subscribers.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>()).add(handler);
    }

    public void publish(Event event) {
        List<Consumer<Event>> handlers = subscribers.getOrDefault(event.getType(), List.of());
        for (Consumer<Event> handler : handlers) {
            handler.accept(event);
        }
    }

    public void unsubscribe(String eventType, Consumer<Event> handler) {
        subscribers.getOrDefault(eventType, List.of()).remove(handler);
    }
}

// Usage
EventBus bus = new EventBus();

bus.subscribe("UserRegistered", event -> {
    System.out.println("Send welcome email to " + event.getPayload().get("email"));
});

bus.subscribe("UserRegistered", event -> {
    System.out.println("Track signup: " + event.getPayload().get("user_id"));
});

bus.publish(new Event("UserRegistered", Map.of("user_id", 42, "email", "alice@example.com")));
```

### JavaScript

```javascript
class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler);
  }

  publish(eventType, payload) {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Handler failed for ${eventType}:`, err);
      }
    });
  }

  unsubscribe(eventType, handler) {
    const handlers = this.subscribers.get(eventType) || [];
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }
}

// Usage
const bus = new EventBus();

const unsubEmail = bus.subscribe('UserRegistered', (payload) => {
  console.log(`Send welcome email to ${payload.email}`);
});

bus.subscribe('UserRegistered', (payload) => {
  console.log(`Track signup: ${payload.user_id}`);
});

bus.publish('UserRegistered', { user_id: 42, email: 'alice@example.com' });

// Later: unsubEmail(); // Remove specific handler
```

## Explanation

The Event Bus Pattern consists of:

- **Event**: A lightweight message carrying a type and payload
- **Publisher**: Code that calls `publish()` without knowing subscribers
- **Subscriber**: Code that registers a callback via `subscribe()`
- **Bus**: Routes events from publishers to all matching subscribers

## Variants

| Variant | Delivery | Use Case |
|---------|----------|----------|
| **Synchronous** | Immediate, blocking | In-process UI events |
| **Asynchronous** | Queued, non-blocking | High-throughput backends |
| **Prioritized** | Ordered by priority | UI frameworks (DOM events bubble) |
| **Filtered** | Subscribers define predicates | Large systems with many event types |

## Best Practices

- **Keep event payloads immutable.** Subscribers should not modify shared payload objects.
- **Use typed event names.** Prefer `"OrderPlaced"` over `"order_event"`. Use constants or enums.
- **Isolate subscriber failures.** One failing handler should not prevent others from running. Catch and log exceptions per handler.
- **Unsubscribe on cleanup.** Memory leaks occur when destroyed components still hold subscriptions.
- **Document the event schema.** Payload structure is an implicit contract. Document required and optional fields.

## Common Mistakes

- **Chaining events** where A triggers B, which triggers C, which triggers A again. Use event sourcing or sagas for complex workflows.
- **Over-using the bus** for simple parent-child communication makes code harder to follow than a direct callback.
- **Forgetting to unsubscribe** causes memory leaks and stale updates from destroyed UI components.
- **Synchronous handlers doing I/O** blocks the publisher. Offload slow work to background threads or queues.
- **Untyped payloads** force subscribers to cast and guess field names. Use schema validation or strong typing.

## Real-World Examples

### Android `LocalBroadcastManager`

Android's event bus allows fragments and services to communicate without direct references. Replaced by `LiveData` but the pattern remains.

### Vue.js Event Bus

Vue's `$emit` / `$on` provides component-level event buses. Global state management (Pinia) is preferred for cross-app communication.

### Guava EventBus

Google's Java library provides annotation-driven subscription (`@Subscribe`) with synchronous and async delivery options.

## Frequently Asked Questions

**Q: What is the difference between Event Bus and Observer?**
A: [Observer](/patterns/design/observer-pattern) is one-to-many between a subject and its observers. Event Bus is many-to-many through a central mediator that neither publisher nor subscriber owns.

**Q: Should I build my own event bus or use a library?**
A: For simple in-process needs, a 50-line implementation is enough. For durability, clustering, or replay, use RabbitMQ, Kafka, or Redis Pub/Sub.

**Q: How do I test event-driven code?**
A: Inject the bus as a dependency. In tests, use a synchronous test double and assert that the correct events are published with expected payloads.
