---
contentType: recipes
slug: observer-pattern
title: "Implement Reactive Systems with the Observer Pattern"
description: "How to build event-driven, reactive systems using the observer pattern with pub/sub, event emitters, and reactive streams in JavaScript, Java, and Python."
metaDescription: "Learn observer pattern for reactive systems. Build event-driven systems with pub/sub, event emitters, and reactive streams in JavaScript, Java, and Python."
difficulty: beginner
topics:
  - design
tags:
  - design
  - observer-pattern
relatedResources:
  - /recipes/event-driven-architecture
  - /recipes/async-patterns
  - /recipes/factory-pattern
  - /recipes/microservices-patterns
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn observer pattern for reactive systems. Build event-driven systems with pub/sub, event emitters, and reactive streams in JavaScript, Java, and Python."
  keywords:
    - observer pattern
    - pub sub
    - event emitter
    - reactive programming
    - event driven
---

## Overview

In a traditional system, component A calls component B directly when something happens. A must know B exists, how to reach it, and what method to invoke. If you later add component C that also needs to react, you must modify A's code to call C as well. This creates tight coupling and makes the system brittle to change.

The observer pattern inverts this relationship. Component A (the subject) maintains a list of interested observers. When an event occurs, A notifies all observers without knowing who they are or what they do. Component B and C subscribe to A's events independently. Adding a new observer requires zero changes to the subject. This recipe covers the observer pattern, pub/sub systems, event emitters, and reactive programming with practical examples.

## When to use it

Use this recipe when:

- Multiple components need to react to the same event independently
- The set of listeners changes at runtime (plugins, widgets, modules)
- Decoupling the event source from its handlers is architecturally desirable
- Building real-time UIs, monitoring dashboards, or event-driven backends
- Implementing reactive streams where data flows push updates to consumers

## Solution

### Event Emitter (Node.js / TypeScript)

```typescript
interface OrderEvent {
  type: 'created' | 'updated' | 'shipped';
  orderId: string;
  payload: Record<string, unknown>;
}

type OrderListener = (event: OrderEvent) => void | Promise<void>;

class OrderEventEmitter {
  private listeners: Map<string, OrderListener[]> = new Map();

  on(eventType: OrderEvent['type'], listener: OrderListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);

    // Return unsubscribe function
    return () => this.off(eventType, listener);
  }

  off(eventType: OrderEvent['type'], listener: OrderListener): void {
    const list = this.listeners.get(eventType);
    if (list) {
      const index = list.indexOf(listener);
      if (index > -1) list.splice(index, 1);
    }
  }

  async emit(event: OrderEvent): Promise<void> {
    const list = this.listeners.get(event.type) || [];
    await Promise.all(list.map(listener => listener(event)));
  }
}

// Usage
const emitter = new OrderEventEmitter();

const unsubscribe = emitter.on('created', async (event) => {
  await sendConfirmationEmail(event.orderId);
});

emitter.on('created', async (event) => {
  await updateInventory(event.payload.items as string[]);
});

await emitter.emit({
  type: 'created',
  orderId: 'order-123',
  payload: { items: ['sku-1', 'sku-2'], customer: 'user@example.com' }
});

// Later: remove listener
unsubscribe();
```

### Java Observer with PropertyChangeSupport

```java
import java.beans.PropertyChangeListener;
import java.beans.PropertyChangeSupport;

class Order {
    private String status;
    private final PropertyChangeSupport support;

    Order() {
        this.support = new PropertyChangeSupport(this);
    }

    void addPropertyChangeListener(PropertyChangeListener listener) {
        support.addPropertyChangeListener(listener);
    }

    void removePropertyChangeListener(PropertyChangeListener listener) {
        support.removePropertyChangeListener(listener);
    }

    void setStatus(String newStatus) {
        String oldStatus = this.status;
        this.status = newStatus;
        support.firePropertyChange("status", oldStatus, newStatus);
    }
}

// Observer
class OrderLogger implements PropertyChangeListener {
    public void propertyChange(java.beans.PropertyChangeEvent evt) {
        System.out.printf("Order %s changed from %s to %s%n",
            evt.getSource(), evt.getOldValue(), evt.getNewValue());
    }
}

// Usage
Order order = new Order();
order.addPropertyChangeListener(new OrderLogger());
order.setStatus("shipped");
```

### Python Reactive with RxPY

```python
from rx import create, operators
from rx.subject import Subject

# Create a subject (observable + observer)
order_subject = Subject()

# Subscribe observers
order_subject.subscribe(
    on_next=lambda event: print(f"Email service: Order {event['id']} created"),
    on_error=lambda e: print(f"Error: {e}")
)

order_subject.subscribe(
    on_next=lambda event: print(f"Analytics: Tracking order {event['id']}"),
)

# Filtered subscription
order_subject.pipe(
    operators.filter(lambda e: e['total'] > 100),
    operators.map(lambda e: {**e, 'vip': True})
).subscribe(
    on_next=lambda event: print(f"VIP handler: {event}")
)

# Emit events
order_subject.on_next({'id': '123', 'total': 50})
order_subject.on_next({'id': '124', 'total': 250})
```

## Explanation

- **Subject and observer**: the subject maintains state and notifies observers when it changes. Observers register interest and receive callbacks. The subject does not know what observers do — it simply broadcasts the event.
- **Push vs pull**: in the observer pattern, data is pushed to observers. This is more efficient than polling, where observers repeatedly check the subject. Push-based systems react immediately to changes.
- **Hot vs cold observables**: a hot observable (like a live stock ticker) emits events regardless of whether anyone is subscribed. A cold observable (like a file read) begins emitting only when subscribed, and replays the sequence to each subscriber. Event emitters are typically hot.
- **Memory leaks**: if observers are not unsubscribed, the subject holds references forever. In long-lived applications (browsers, servers), always return an unsubscribe function and call it when the component is destroyed.

## Variants

| Approach | Coupling | Best for | Trade-off |
|----------|----------|----------|-----------|
| Direct observer | Tight | Single subject, known observers | Hard to extend |
| Event emitter | Loose | UI frameworks, Node.js | Can be hard to trace |
| Pub/sub broker | Very loose | Distributed systems | Network overhead |
| Reactive streams | Loose | Data pipelines, async flows | Learning curve |
| Signals (Solid, Vue) | Loose | Fine-grained UI reactivity | Framework-specific |

## Best practices

- **Always provide an unsubscribe mechanism**: dangling subscriptions are the primary cause of memory leaks in observer-based systems. Return a cleanup function from `subscribe()` and ensure components call it on unmount.
- **Do not mutate the observer list during notification**: if an observer unsubscribes another observer while handling an event, the iteration list changes mid-flight. Copy the list before iterating, or use a copy-on-write data structure.
- **Handle exceptions in observers independently**: if one observer throws, it should not prevent others from receiving the event. Wrap each observer call in a try/catch (or Promise.catch) and log the error without stopping the broadcast.
- **Use typed events**: in TypeScript, define event interfaces (`OrderCreated`, `PaymentProcessed`) rather than generic `string` events. This enables compile-time checking of payload shapes and prevents typo-bugs in event names.
- **Prefer reactive streams for complex flows**: RxJS and RxPY provide operators (map, filter, merge, debounce) that compose elegantly. For simple one-to-many notification, a basic event emitter suffices. For data pipelines and async coordination, reactive streams are worth the learning curve.

## Common mistakes

- **Circular updates**: observer A updates the subject, which notifies observer B, which updates the subject, which notifies observer A. This creates an infinite loop. Use a flag to suppress notifications during programmatic updates, or debounce emitters.
- **Leaking subscription references**: storing `emitter.on(...)` without capturing the returned unsubscribe function means the listener lives forever. Always store the unsubscribe function and call it in cleanup handlers.
- **Over-notifying**: emitting an event for every minor state change (e.g., every keystroke) overwhelms observers. Batch changes and emit once, or use debounced emitters. Consider whether observers truly need intermediate states or just the final one.
- **Using observers for commands**: `emitter.emit('saveOrder')` is a command, not an event. Observers should react to facts (`OrderCreated`), not execute actions. Commands should go through a command bus or direct method calls with clear return values.

## FAQ

**Q: Is the observer pattern the same as pub/sub?**
A: Observer is an object-oriented pattern (subject and observers in the same process). Pub/sub is an architectural pattern using a message broker, often across processes or networks. Observer is in-memory; pub/sub is distributed.

**Q: When should I use reactive streams (RxJS) vs simple events?**
A: Use simple events for one-to-many broadcast with no transformation. Use reactive streams when you need to filter, map, merge, throttle, or compose event streams. RxJS shines in complex async coordination.

**Q: How do I test observer-based code?**
A: Emit events in your test and assert that observers reacted correctly. For async observers, use `await Promise.resolve()` or framework utilities (`waitFor` in React Testing Library) to flush the event loop before asserting.

**Q: Can the observer pattern scale to thousands of observers?**
A: In-memory observers do not scale well beyond hundreds due to linear iteration cost. For thousands of subscribers, use a pub/sub broker (Redis, Kafka, NATS) that handles fan-out efficiently.

