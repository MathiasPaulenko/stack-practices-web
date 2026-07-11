---
contentType: patterns
slug: mediator-pattern-components
title: "Mediator Pattern para Desacoplamiento de Componentes en"
description: "Reduce dependencias caoticas entre componentes UI introduciendo un mediador que centraliza comunicacion, previniendo referencias explicitas entre pares"
metaDescription: "Mediator pattern para desacoplamiento de componentes. Centraliza comunicacion entre componentes UI para eliminar referencias explicitas y simplificar dependencias."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - mediator
  - behavioral-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/observer-pattern
  - /patterns/design/facade-pattern
  - /patterns/design/backend-for-frontend-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mediator pattern para desacoplamiento de componentes. Centraliza comunicacion entre componentes UI para eliminar referencias explicitas y simplificar dependencias."
  keywords:
    - mediator pattern
    - component communication
    - loose coupling
    - behavioral patterns
    - frontend architecture
---

# Mediator Pattern para Desacoplamiento de Componentes en Apps Frontend

El [Mediator](/patterns/design/mediator-pattern) pattern define un objeto que encapsula como un conjunto de objetos interactuan. En lugar de que componentes se referencien entre si directamente, se refieren a un mediador, reduciendo el numero de conexiones explicitas de many-to-many a many-to-one. Esto es esencial para UIs complejas donde docenas de componentes necesitan mantenerse sincronizados.

## Cuando Usar Esto

- Los componentes tienen relaciones many-to-many que de otro modo crearian acoplamiento fuerte
- Reusar componentes independientemente es dificil porque dependen de pares especificos
- La logica de comunicacion esta dispersa y dificil de testear

## Problema

Un dashboard con filtros, graficos, tablas y mapas requiere que cada widget notifique a todos los otros cuando los datos cambian. Cada widget mantiene referencias a 5-6 otros, creando una pesadilla de dependencias.

## Solucion

```typescript
// mediator/DashboardMediator.ts
interface Mediator {
  notify(sender: Component, event: string, data?: unknown): void;
}

abstract class Component {
  constructor(protected mediator: Mediator) {}

  send(event: string, data?: unknown): void {
    this.mediator.notify(this, event, data);
  }
}

class FilterPanel extends Component {
  private selectedRegion = 'all';

  selectRegion(region: string): void {
    this.selectedRegion = region;
    this.send('region-changed', region);
  }
}

class ChartWidget extends Component {
  private data: unknown[] = [];

  updateData(data: unknown[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    console.log('Chart rendered with', this.data.length, 'points');
  }
}

class TableWidget extends Component {
  private rows: unknown[] = [];

  updateRows(rows: unknown[]): void {
    this.rows = rows;
    console.log('Table updated with', rows.length, 'rows');
  }
}

class MapWidget extends Component {
  private center = { lat: 0, lng: 0 };

  panTo(center: { lat: number; lng: number }): void {
    this.center = center;
    console.log('Map centered at', center);
  }
}

// Mediator orquesta toda la comunicacion
class DashboardMediator implements Mediator {
  private filters: FilterPanel;
  private chart: ChartWidget;
  private table: TableWidget;
  private map: MapWidget;

  setComponents(
    filters: FilterPanel,
    chart: ChartWidget,
    table: TableWidget,
    map: MapWidget
  ): void {
    this.filters = filters;
    this.chart = chart;
    this.table = table;
    this.map = map;
  }

  notify(sender: Component, event: string, data?: unknown): void {
    switch (event) {
      case 'region-changed': {
        const filteredData = this.fetchDataForRegion(data as string);
        this.chart.updateData(filteredData);
        this.table.updateRows(filteredData);
        this.map.panTo(this.getRegionCenter(data as string));
        break;
      }
      case 'chart-point-clicked': {
        const point = data as { lat: number; lng: number };
        this.map.panTo(point);
        break;
      }
    }
  }

  private fetchDataForRegion(region: string): unknown[] {
    return [{ id: 1, region }];
  }

  private getRegionCenter(region: string): { lat: number; lng: number } {
    const centers: Record<string, { lat: number; lng: number }> = {
      'north': { lat: 45, lng: 0 },
      'south': { lat: -45, lng: 0 },
    };
    return centers[region] || { lat: 0, lng: 0 };
  }
}

// Uso
const mediator = new DashboardMediator();
const filters = new FilterPanel(mediator);
const chart = new ChartWidget(mediator);
const table = new TableWidget(mediator);
const map = new MapWidget(mediator);

mediator.setComponents(filters, chart, table, map);
filters.selectRegion('north');
```

## Variacion: Event Bus Mediator

```typescript
// mediator/EventBus.ts
class EventBus implements Mediator {
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  subscribe(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.listeners.get(event)?.delete(callback);
  }

  notify(_sender: Component, event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  emit(event: string, data?: unknown): void {
    this.notify(null as unknown as Component, event, data);
  }
}

const bus = new EventBus();
bus.subscribe('user-login', user => console.log('Logged in:', user));
bus.emit('user-login', { id: 1 });
```

## Como Funciona

1. **Mediator** declara la interfaz de comunicacion
2. **Concrete Mediator** implementa logica de coordinacion entre colegas
3. **Colleague** componentes envian eventos al mediador en lugar de entre si
4. **Client** crea y conecta el mediador con todos los colegas

## Consideraciones de Produccion

- Manten mediadores enfocados en un dominio; no crees un god object
- Usa eventos tipados para prevenir bugs de comunicacion stringly-typed
- Considera librerias de state management (Redux, Zustand) como mediadores evolucionados. Consulta [Singleton](/patterns/design/singleton-pattern) para gestion de instancias de servicios.

## Errores Comunes

- Crear un mediador tan grande que se vuelve inmantenible
- Saltearse el mediador para comunicacion directa entre componentes
- No desuscribir listeners de eventos, causando memory leaks

## FAQ

**P: En que se diferencia de Observer?**
R: [Observer](/patterns/design/observer-pattern) es broadcast one-to-many. Mediator es many-to-many enrutado a traves de un coordinador central.

**P: Cuando deberia usar un state manager en su lugar?**
R: Cuando la necesidad primaria es estado compartido, no solo comunicacion. Mediator maneja mensajes; state managers manejan datos.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Mediator para Chat Room

```typescript
// Mediator pattern: centralizar comunicacion entre componentes
interface ChatMediator {
  sendMessage(msg: string, user: User): void;
  registerUser(user: User): void;
}

abstract class User {
  constructor(protected mediator: ChatMediator, public name: string) {}
  abstract send(msg: string): void;
  abstract receive(msg: string): void;
}

class ChatUser extends User {
  send(msg: string) { this.mediator.sendMessage(msg, this); }
  receive(msg: string) { console.log(`[${this.name}] received: ${msg}`); }
}

// Mediator concreto
class ChatRoom implements ChatMediator {
  private users: User[] = [];

  registerUser(user: User) { this.users.push(user); }

  sendMessage(msg: string, sender: User) {
    // Broadcast a todos excepto el emisor
    this.users.filter(u => u !== sender).forEach(u => u.receive(msg));
  }
}

// Uso: usuarios no se conocen entre si
const chat = new ChatRoom();
const alice = new ChatUser(chat, "Alice");
const bob = new ChatUser(chat, "Bob");
const charlie = new ChatUser(chat, "Charlie");
chat.registerUser(alice);
chat.registerUser(bob);
chat.registerUser(charlie);

alice.send("Hola a todos");
// [Bob] received: Hola a todos
// [Charlie] received: Hola a todos

// Sin Mediator: cada usuario necesita referencia a los demas
// Con Mediator: solo conocen al mediator
```

Lecciones:
  - Mediator centraliza comunicacion: componentes no se conocen
  - Anadir nuevo usuario no requiere cambiar los existentes
  - El mediator puede filtrar, transformar o logear mensajes
  - Reduce acoplamiento de N*(N-1) a N*1 (cada uno solo conoce al mediator)
  - CQRS usa mediator: commands y queries van a traves de un bus
  - Event bus es una forma de mediator con pub/sub
```

### Mediator vs Observer: cual uso?

Mediator centraliza: los componentes hablan al mediator y este redirige. Observer descentraliza: el sujeto notifica a observadores directamente. Usa Mediator cuando la logica de interaccion es compleja y quieres centralizarla (chat room, wizard form). Usa Observer cuando solo necesitas notificar cambios (data binding, event handling). Mediator conoce a los componentes; Observer no.






End of document. Review and update quarterly.