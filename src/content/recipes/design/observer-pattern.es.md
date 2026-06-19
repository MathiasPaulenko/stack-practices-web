---
contentType: recipes
slug: observer-pattern
title: "Implementar Sistemas Reactivos con el Observer Pattern"
description: "Cómo construir sistemas event-driven y reactivos usando el observer pattern con pub/sub, event emitters y reactive streams en JavaScript, Java y Python."
metaDescription: "Aprende observer pattern para sistemas reactivos. Construye sistemas event-driven con pub/sub, event emitters y reactive streams en JavaScript, Java y Python."
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

El observer pattern invierte esta relación. El componente A (el subject) mantiene una lista de observers interesados. Cuando ocurre un evento, A notifica a todos los observers sin saber quiénes son o qué hacen. B y C se suscriben a los eventos de A independientemente. Agregar un nuevo observer no requiere cambios en el subject. Esta receta cubre el observer pattern, sistemas pub/sub, event emitters y programación reactiva con ejemplos prácticos.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples componentes necesitan reaccionar al mismo evento independientemente
- El conjunto de listeners cambia en runtime (plugins, widgets, módulos)
- Desacoplar la fuente de eventos de sus handlers es arquitectónicamente deseable
- Construyendo UIs en tiempo real, dashboards de monitoreo o backends event-driven
- Implementando reactive streams donde flujos de datos empujan updates a consumidores

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

## Mejores prácticas

- **Siempre provee un mecanismo de unsubscribe**: suscripciones colgantes son la causa principal de memory leaks en sistemas basados en observers. Retorna una función de cleanup desde `subscribe()` y asegura que los componentes la llamen al desmontar.
- **No mutues la lista de observers durante notificación**: si un observer desuscribe a otro observer mientras maneja un evento, la lista de iteración cambia en medio del vuelo. Copia la lista antes de iterar, o usa una estructura copy-on-write.
- **Maneja excepciones en observers independientemente**: si un observer lanza una excepción, no debería prevenir que otros reciban el evento. Envuelve cada llamada a observer en try/catch (o Promise.catch) y loguea el error sin detener el broadcast.
- **Usa eventos tipados**: en TypeScript, define interfaces de eventos (`OrderCreated`, `PaymentProcessed`) en lugar de eventos genéricos `string`. Esto habilita verificación en tiempo de compilación de las formas de payload y previene bugs de typos en nombres de eventos.
- **Prefiere reactive streams para flujos complejos**: RxJS y RxPY proveen operadores (map, filter, merge, debounce) que componen elegantemente. Para notificación simple uno-a-muchos, un event emitter básico es suficiente. Para pipelines de datos y coordinación async, reactive streams valen la curva de aprendizaje.

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

