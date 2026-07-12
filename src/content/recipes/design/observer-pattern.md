---



contentType: recipes
slug: observer-pattern-recipe
title: "Implement Reactive Systems with the Observer Pattern"
description: "How to build event-driven, reactive systems using the observer pattern with pub/sub, event emitters, and reactive streams in JavaScript, Java, and Python."
metaDescription: "Learn observer pattern for reactive systems. Build event-driven systems with pub/sub, event emitters, and reactive streams in JavaScript, Java, and Python."
difficulty: beginner
topics:
  - design
tags:
  - design
  - observer-pattern
  - design-patterns
  - patterns
  - oop
relatedResources:
  - /recipes/event-driven-architecture
  - /recipes/async-patterns
  - /recipes/factory-pattern-recipe
  - /recipes/microservices-patterns
  - /recipes/cqrs-pattern-recipe
  - /recipes/domain-driven-design
  - /recipes/hexagonal-architecture
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

The observer pattern inverts this relationship. Component A (the subject) maintains a list of interested observers. When an event occurs, A notifies all observers without knowing who they are or what they do. Component B and C subscribe to A's events independently. Adding a new observer requires zero changes to the subject. Below is a practical approach to the observer pattern, pub/sub systems, event emitters, and reactive programming with practical examples.

## When to use it

Use this recipe when:

- Multiple components need to react to the same event independently. See [CQRS Pattern](/patterns/design/cqrs-pattern) for event-driven architectures.
- The set of listeners changes at runtime (plugins, widgets, modules)
- Decoupling the event source from its handlers is architecturally desirable
- Building real-time UIs, monitoring dashboards, or event-driven backends. See [Logging](/recipes/api/logging) for observability patterns.
- Implementing reactive streams where data flows push updates to consumers. See [Batch Processing](/recipes/data/batch-processing-patterns) for stream processing.

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

## What Works

- **Always provide an unsubscribe mechanism**: dangling subscriptions are the primary cause of memory leaks in observer-based systems. Return a cleanup function from `subscribe()` and ensure components call it on unmount.
- **Do not mutate the observer list during notification**: if an observer unsubscribes another observer while handling an event, the iteration list changes mid-flight. Copy the list before iterating, or use a copy-on-write data structure.
- **Handle exceptions in observers independently**: if one observer throws, it should not prevent others from receiving the event. Wrap each observer call in a try/catch (or Promise.catch) and log the error without stopping the broadcast.
- **Use typed events**: in TypeScript, define event interfaces (`OrderCreated`, `PaymentProcessed`) rather than generic `string` events. This enables compile-time checking of payload shapes and prevents typo-bugs in event names.
- **Prefer reactive streams for complex flows**: RxJS and RxPY provide operators (map, filter, merge, debounce) that compose elegantly. See [Redis Cache Patterns](/recipes/databases/redis-cache-patterns) for pub/sub backends. For simple one-to-many notification, a basic event emitter suffices. For data pipelines and async coordination, reactive streams are worth the learning curve.

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


### Typed Event Emitter with Error Isolation

```typescript
interface EventMap {
  orderCreated: { orderId: string; items: string[] };
  orderShipped: { orderId: string; trackingNumber: string };
  orderCancelled: { orderId: string; reason: string };
}

class TypedEventEmitter<T extends Record<string, Record<string, unknown>>> {
  private listeners: Map<keyof T, Array<(payload: T[keyof T]) => void>> = new Map();

  on<K extends keyof T>(event: K, listener: (payload: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener as (payload: T[keyof T]) => void);
    return () => this.off(event, listener);
  }

  off<K extends keyof T>(event: K, listener: (payload: T[K]) => void): void {
    const list = this.listeners.get(event);
    if (list) {
      const index = list.indexOf(listener as (payload: T[keyof T]) => void);
      if (index > -1) list.splice(index, 1);
    }
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    const list = [...(this.listeners.get(event) || [])];
    for (const listener of list) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`Observer error for event "${String(event)}":`, err);
      }
    }
  }
}

// Usage — compile-time type safety on event names and payloads
const emitter = new TypedEventEmitter<EventMap>();

emitter.on('orderCreated', (payload) => {
  // payload is typed as { orderId: string; items: string[] }
  console.log(`Order ${payload.orderId} with ${payload.items.length} items`);
});

emitter.on('orderShipped', (payload) => {
  console.log(`Shipped ${payload.orderId}: ${payload.trackingNumber}`);
});

// Type error: wrong event name
// emitter.on('orderRefunded', ...); // Error: not in EventMap

emitter.emit('orderCreated', { orderId: '123', items: ['sku-1'] });
```

### Debounced Event Emitter

```typescript
class DebouncedEventEmitter {
  private listeners: Map<string, Array<(payload: unknown) => void>> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingPayloads: Map<string, unknown> = new Map();

  on(event: string, listener: (payload: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: (payload: unknown) => void): void {
    const list = this.listeners.get(event);
    if (list) {
      const index = list.indexOf(listener);
      if (index > -1) list.splice(index, 1);
    }
  }

  emitDebounced(event: string, payload: unknown, delayMs: number = 100): void {
    this.pendingPayloads.set(event, payload);
    const existing = this.timers.get(event);
    if (existing) clearTimeout(existing);
    this.timers.set(event, setTimeout(() => {
      const finalPayload = this.pendingPayloads.get(event);
      this.timers.delete(event);
      this.pendingPayloads.delete(event);
      const list = [...(this.listeners.get(event) || [])];
      for (const listener of list) {
        try {
          listener(finalPayload);
        } catch (err) {
          console.error(`Observer error:`, err);
        }
      }
    }, delayMs));
  }
}

// Usage — batch rapid updates into a single notification
const searchEmitter = new DebouncedEventEmitter();
searchEmitter.on('search', (payload) => {
  console.log('Searching for:', payload);
});

// Rapid keystrokes — only the last one triggers the handler
for (let i = 0; i < 10; i++) {
  searchEmitter.emitDebounced('search', `query-${i}`, 200);
}
```

### WeakRef Observer for Automatic Cleanup (TypeScript)

```typescript
class WeakObserver<T> {
  private listeners: Map<string, WeakRef<{ notify: (payload: T) => void }[]>> = new Map();

  subscribe(event: string, target: { notify: (payload: T) => void }): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const list = this.listeners.get(event)!;
    const ref = new WeakRef(target);
    list.push(ref);

    return () => {
      const refs = this.listeners.get(event);
      if (refs) {
        const index = refs.indexOf(ref);
        if (index > -1) refs.splice(index, 1);
      }
    };
  }

  emit(event: string, payload: T): void {
    const refs = this.listeners.get(event) || [];
    for (const ref of [...refs]) {
      const target = ref.deref();
      if (target) {
        try {
          target.notify(payload);
        } catch (err) {
          console.error('Weak observer error:', err);
        }
      } else {
        // Target was garbage collected — remove the dead ref
        refs.splice(refs.indexOf(ref), 1);
      }
    }
  }
}
```

## Additional Best Practices

1. **Use a single event bus for application-wide events.** Centralize event routing instead of passing emitters through every layer:

```typescript
class EventBus {
  private emitter = new TypedEventEmitter<EventMap>();

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void) {
    return this.emitter.on(event, listener);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    this.emitter.emit(event, payload);
  }
}

// Singleton instance — inject via DI for testability
const eventBus = new EventBus();
export { eventBus };
```

2. **Log all events in development.** Wrap the emit method to trace event flow:

```typescript
class TracingEventEmitter extends TypedEventEmitter<EventMap> {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event] ${String(event)}:`, payload);
    }
    super.emit(event, payload);
  }
}
```

3. **Use once() for one-time subscriptions.** Prevent memory leaks from listeners that should only fire once:

```typescript
once<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): () => void {
  const unsubscribe = this.on(event, (payload) => {
    unsubscribe();
    listener(payload);
  });
  return unsubscribe;
}
```

## Additional Common Mistakes

1. **Not copying the listener list before iterating.** If a listener unsubscribes during notification, the array shrinks mid-iteration, skipping subsequent listeners:

```typescript
// Bad: iterates over the live array
emit(event: string, payload: unknown): void {
  const list = this.listeners.get(event) || [];
  for (const listener of list) {
    listener(payload); // if listener calls off(), list shrinks
  }
}

// Good: iterate over a copy
emit(event: string, payload: unknown): void {
  const list = [...(this.listeners.get(event) || [])];
  for (const listener of list) {
    listener(payload);
  }
}
```

2. **Mixing event names and command names.** Events describe what happened; commands describe what to do:

```typescript
// Bad: command disguised as event
emitter.emit('saveOrder', { orderId: '123' });

// Good: event describes a fact that already happened
emitter.emit('orderCreated', { orderId: '123', items: [...] });
```

3. **Ignoring backpressure.** If an observer processes events slowly, it can accumulate a backlog. Use buffering or drop strategies:

```typescript
class BufferedObserver {
  private buffer: OrderEvent[] = [];
  private processing = false;

  async handle(event: OrderEvent): Promise<void> {
    this.buffer.push(event);
    if (!this.processing) {
      this.processing = true;
      while (this.buffer.length > 0) {
        const next = this.buffer.shift()!;
        await this.processEvent(next);
      }
      this.processing = false;
    }
  }

  private async processEvent(event: OrderEvent): Promise<void> {
    // Process one event at a time
  }
}
```

## Additional FAQ

### How do I order observers by priority?

Use a priority field in the subscription. Sort the listener list by priority before emitting:

```typescript
interface Subscription {
  listener: (payload: unknown) => void;
  priority: number;
}

class PriorityEmitter {
  private listeners: Map<string, Subscription[]> = new Map();

  on(event: string, listener: (payload: unknown) => void, priority: number = 0): () => void {
    const subs = this.listeners.get(event) || [];
    subs.push({ listener, priority });
    subs.sort((a, b) => b.priority - a.priority);
    this.listeners.set(event, subs);
    return () => {
      const list = this.listeners.get(event);
      if (list) {
        const index = list.findIndex(s => s.listener === listener);
        if (index > -1) list.splice(index, 1);
      }
    };
  }
}
```

### Is this solution production-ready?

Yes. The event emitter, typed event emitter, and debounced emitter patterns are used in production Node.js and browser applications. The Java `PropertyChangeSupport` example is standard for JavaBeans. The RxPY example mirrors production reactive pipelines. The `WeakRef` observer pattern is useful in browser environments where DOM elements are short-lived.

### What are the performance characteristics?

In-memory event emitters have O(n) emit cost where n is the number of listeners. For most applications with fewer than 100 listeners, this is negligible. Debounced emitters add timer overhead (one `setTimeout` per event type). The `WeakRef` pattern adds a small deref cost per listener per emit. For thousands of listeners, switch to a pub/sub broker.

### How do I debug issues with this approach?

Enable event tracing in development to see the event flow. Use the typed event emitter to catch event name typos at compile time. For circular update bugs, add a depth counter to the emit method and log when depth exceeds a threshold. For memory leak diagnosis, log the listener count per event on an interval and watch for unbounded growth.
