---
contentType: recipes
slug: observer-pattern-recipe
title: "Implementar Sistemas Reactivos con el Observer Pattern"
description: "Cómo construir sistemas event-driven y reactivos usando el observer pattern con pub/sub, event emitters y reactive streams en JavaScript, Java y Python."
metaDescription: "Aprende observer pattern para sistemas reactivos. Construye sistemas event-driven con pub/sub, event emitters y reactive streams en JavaScript, Java y Python."
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
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende observer pattern para sistemas reactivos. Construye sistemas event-driven con pub/sub, event emitters y reactive streams en JavaScript, Java y Python."
  keywords:
    - patron observer
    - pub sub
    - event emitter
    - programacion reactiva
    - event driven
---

## Visión general

En un sistema tradicional, el componente A llama al componente B directamente cuando algo sucede. A debe saber que B existe, cómo alcanzarlo y qué método invocar. Si luego agregas el componente C que también necesita reaccionar, debes modificar el código de A para llamar a C también. Esto crea acoplamiento fuerte y hace el sistema frágil ante cambios.

El observer pattern invierte esta relación. El componente A (el subject) mantiene una lista de observers interesados. Cuando ocurre un evento, A notifica a todos los observers sin saber quiénes son o qué hacen. B y C se suscriben a los eventos de A independientemente. Agregar un nuevo observer no requiere cambios en el subject. Aqui se explica como el observer pattern, sistemas pub/sub, event emitters y programación reactiva con ejemplos prácticos.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples componentes necesitan reaccionar al mismo evento independientemente. Consulta [CQRS Pattern](/patterns/design/cqrs-pattern) para arquitecturas event-driven.
- El conjunto de listeners cambia en runtime (plugins, widgets, módulos)
- Desacoplar la fuente de eventos de sus handlers es arquitectónicamente deseable
- Construyendo UIs en tiempo real, dashboards de monitoreo o backends event-driven. Consulta [Logging](/recipes/api/logging) para patrones de observabilidad.
- Implementando reactive streams donde flujos de datos empujan updates a consumidores. Consulta [Batch Processing](/recipes/data/batch-processing-patterns) para procesamiento de streams.

## Solución

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

unsubscribe();
```

### Java Observer con PropertyChangeSupport

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

class OrderLogger implements PropertyChangeListener {
    public void propertyChange(java.beans.PropertyChangeEvent evt) {
        System.out.printf("Order %s changed from %s to %s%n",
            evt.getSource(), evt.getOldValue(), evt.getNewValue());
    }
}

Order order = new Order();
order.addPropertyChangeListener(new OrderLogger());
order.setStatus("shipped");
```

### Python Reactive con RxPY

```python
from rx.subject import Subject
from rx import operators

order_subject = Subject()

order_subject.subscribe(
    on_next=lambda event: print(f"Email service: Order {event['id']} created"),
    on_error=lambda e: print(f"Error: {e}")
)

order_subject.subscribe(
    on_next=lambda event: print(f"Analytics: Tracking order {event['id']}"),
)

order_subject.pipe(
    operators.filter(lambda e: e['total'] > 100),
    operators.map(lambda e: {**e, 'vip': True})
).subscribe(
    on_next=lambda event: print(f"VIP handler: {event}")
)

order_subject.on_next({'id': '123', 'total': 50})
order_subject.on_next({'id': '124', 'total': 250})
```

## Explicación

- **Subject y observer**: el subject mantiene estado y notifica a observers cuando cambia. Los observers registran interés y reciben callbacks. El subject no sabe qué hacen los observers — simplemente broadcastea el evento.
- **Push vs pull**: en el observer pattern, los datos se empujan a los observers. Esto es más eficiente que polling, donde los observers chequean repetidamente al subject. Los sistemas basados en push reaccionan inmediatamente a los cambios.
- **Hot vs cold observables**: un hot observable (como un stock ticker en vivo) emite eventos independientemente de si alguien está suscrito. Un cold observable (como una lectura de archivo) comienza a emitir solo cuando se suscribe, y reproduce la secuencia a cada suscriptor. Los event emitters son típicamente hot.
- **Memory leaks**: si los observers no se desuscriben, el subject mantiene referencias para siempre. En aplicaciones de larga vida (browsers, servidores), siempre retorna una función de unsubscribe y llámala cuando el componente se destruye.

## Variantes

| Enfoque | Acoplamiento | Mejor para | Trade-off |
|---------|-------------|------------|-----------|
| Observer directo | Fuerte | Subject único, observers conocidos | Difícil de extender |
| Event emitter | Débil | UI frameworks, Node.js | Puede ser difícil de tracear |
| Pub/sub broker | Muy débil | Sistemas distribuidos | Overhead de red |
| Reactive streams | Débil | Pipelines de datos, flujos async | Curva de aprendizaje |
| Signals (Solid, Vue) | Débil | Reactividad UI de grano fino | Específico de framework |

## Lo que funciona

- **Siempre provee un mecanismo de unsubscribe**: suscripciones colgantes son la causa principal de memory leaks en sistemas basados en observers. Retorna una función de cleanup desde `subscribe()` y asegura que los componentes la llamen al desmontar.
- **No mutues la lista de observers durante notificación**: si un observer desuscribe a otro observer mientras maneja un evento, la lista de iteración cambia en medio del vuelo. Copia la lista antes de iterar, o usa una estructura copy-on-write.
- **Maneja excepciones en observers independientemente**: si un observer lanza una excepción, no debería prevenir que otros reciban el evento. Envuelve cada llamada a observer en try/catch (o Promise.catch) y loguea el error sin detener el broadcast.
- **Usa eventos tipados**: en TypeScript, define interfaces de eventos (`OrderCreated`, `PaymentProcessed`) en lugar de eventos genéricos `string`. Esto habilita verificación en tiempo de compilación de las formas de payload y previene bugs de typos en nombres de eventos.
- **Prefiere reactive streams para flujos complejos**: RxJS y RxPY proveen operadores (map, filter, merge, debounce) que componen elegantemente. Consulta [Redis Cache Patterns](/recipes/databases/redis-cache-patterns) para backends pub/sub. Para notificación simple uno-a-muchos, un event emitter básico es suficiente. Para pipelines de datos y coordinación async, reactive streams valen la curva de aprendizaje.

## Errores comunes

- **Updates circulares**: el observer A actualiza el subject, que notifica al observer B, que actualiza el subject, que notifica al observer A. Esto crea un loop infinito. Usa una flag para suprimir notificaciones durante updates programáticos, o usa emitters debounced.
- **Filtrar referencias de suscripción**: almacenar `emitter.on(...)` sin capturar la función de unsubscribe retornada significa que el listener vive para siempre. Siempre almacena la función de unsubscribe y llámala en los handlers de cleanup.
- **Sobre-notificar**: emitir un evento por cada cambio de estado menor (ej. cada keystroke) abruma a los observers. Batch cambios y emite una vez, o usa emitters debounced. Considera si los observers realmente necesitan estados intermedios o solo el final.
- **Usar observers para commands**: `emitter.emit('saveOrder')` es un command, no un evento. Los observers deberían reaccionar a hechos (`OrderCreated`), no ejecutar acciones. Los commands deberían ir a través de un command bus o llamadas directas de método con valores de retorno claros.

## Preguntas frecuentes

**P: ¿Es el observer pattern lo mismo que pub/sub?**
R: Observer es un patrón orientado a objetos (subject y observers en el mismo proceso). Pub/sub es un patrón arquitectónico usando un message broker, frecuentemente a través de procesos o redes. Observer es in-memory; pub/sub es distribuido.

**P: ¿Cuándo debería usar reactive streams (RxJS) vs eventos simples?**
R: Usa eventos simples para broadcast uno-a-muchos sin transformación. Usa reactive streams cuando necesites filtrar, mapear, mergear, throttle o componer streams de eventos. RxJS brilla en coordinación async compleja.

**P: ¿Cómo testeo código basado en observers?**
R: Emite eventos en tu test y asegura que los observers reaccionaron correctamente. Para observers async, usa `await Promise.resolve()` o utilidades de framework (`waitFor` en React Testing Library) para flush el event loop antes de asertar.

**P: ¿Puede el observer pattern escalar a miles de observers?**
R: Los observers in-memory no escalan bien más allá de cientos debido al costo de iteración lineal. Para miles de suscriptores, usa un broker pub/sub (Redis, Kafka, NATS) que maneja fan-out eficientemente.


### Event Emitter Tipado con Aislamiento de Errores

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

// Uso — type safety en tiempo de compilación en nombres y payloads de eventos
const emitter = new TypedEventEmitter<EventMap>();

emitter.on('orderCreated', (payload) => {
  // payload está tipado como { orderId: string; items: string[] }
  console.log(`Order ${payload.orderId} with ${payload.items.length} items`);
});

emitter.on('orderShipped', (payload) => {
  console.log(`Shipped ${payload.orderId}: ${payload.trackingNumber}`);
});

// Error de tipo: nombre de evento incorrecto
// emitter.on('orderRefunded', ...); // Error: not in EventMap

emitter.emit('orderCreated', { orderId: '123', items: ['sku-1'] });
```

### Event Emitter con Debounce

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

// Uso — batchea updates rápidos en una sola notificación
const searchEmitter = new DebouncedEventEmitter();
searchEmitter.on('search', (payload) => {
  console.log('Searching for:', payload);
});

// Keystrokes rápidos — solo el último dispara el handler
for (let i = 0; i < 10; i++) {
  searchEmitter.emitDebounced('search', `query-${i}`, 200);
}
```

### WeakRef Observer para Cleanup Automático (TypeScript)

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
        // El target fue garbage collected — remover la ref muerta
        refs.splice(refs.indexOf(ref), 1);
      }
    }
  }
}
```

## Mejores Prácticas Adicionales

1. **Usa un event bus único para eventos de aplicación.** Centraliza el ruteo de eventos en lugar de pasar emitters por cada capa:

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

// Instancia singleton — inyecta vía DI para testabilidad
const eventBus = new EventBus();
export { eventBus };
```

2. **Loggea todos los eventos en desarrollo.** Envuelve el método emit para tracear el flujo de eventos:

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

3. **Usa once() para suscripciones de una sola vez.** Previene memory leaks de listeners que solo deberían dispararse una vez:

```typescript
once<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): () => void {
  const unsubscribe = this.on(event, (payload) => {
    unsubscribe();
    listener(payload);
  });
  return unsubscribe;
}
```

## Errores Comunes Adicionales

1. **No copiar la lista de listeners antes de iterar.** Si un listener se desuscribe durante la notificación, el array se encoge mid-iteration, saltándose listeners subsiguientes:

```typescript
// Mal: itera sobre el array en vivo
emit(event: string, payload: unknown): void {
  const list = this.listeners.get(event) || [];
  for (const listener of list) {
    listener(payload); // si listener llama off(), list se encoge
  }
}

// Bien: itera sobre una copia
emit(event: string, payload: unknown): void {
  const list = [...(this.listeners.get(event) || [])];
  for (const listener of list) {
    listener(payload);
  }
}
```

2. **Mezclar nombres de eventos y nombres de commands.** Los eventos describen qué pasó; los commands describen qué hacer:

```typescript
// Mal: command disfrazado de evento
emitter.emit('saveOrder', { orderId: '123' });

// Bien: el evento describe un hecho que ya pasó
emitter.emit('orderCreated', { orderId: '123', items: [...] });
```

3. **Ignorar backpressure.** Si un observer procesa eventos lentamente, puede acumular un backlog. Usa buffering o estrategias de drop:

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
    // Procesar un evento a la vez
  }
}
```

## FAQ Adicional

### ¿Cómo ordeno observers por prioridad?

Usa un campo de prioridad en la suscripción. Ordena la lista de listeners por prioridad antes de emitir:

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

### ¿Esta solución está lista para producción?

Sí. Los patrones de event emitter, typed event emitter y debounced emitter se usan en aplicaciones de producción Node.js y browser. El ejemplo de Java `PropertyChangeSupport` es estándar para JavaBeans. El ejemplo de RxPY refleja pipelines reactivos de producción. El patrón de `WeakRef` observer es útil en entornos de browser donde los elementos DOM son de corta duración.

### ¿Cuáles son las características de rendimiento?

Los event emitters in-memory tienen costo de emit O(n) donde n es el número de listeners. Para la mayoría de aplicaciones con menos de 100 listeners, esto es despreciable. Los emitters debounced añaden overhead de timer (un `setTimeout` por tipo de evento). El patrón `WeakRef` añade un pequeño costo de deref por listener por emit. Para miles de listeners, cambia a un broker pub/sub.

### ¿Cómo depuro problemas con este enfoque?

Habilita event tracing en desarrollo para ver el flujo de eventos. Usa el typed event emitter para capturar typos en nombres de eventos en tiempo de compilación. Para bugs de updates circulares, añade un contador de profundidad al método emit y loggea cuando la profundidad excede un umbral. Para diagnóstico de memory leaks, loggea el listener count por evento en un intervalo y observa crecimiento no acotado.
