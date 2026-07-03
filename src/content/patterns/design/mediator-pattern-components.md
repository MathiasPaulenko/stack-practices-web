---
contentType: patterns
slug: mediator-pattern-components
title: "Mediator Pattern for Loose Component Coupling in Frontend Apps"
description: "Reduce chaotic dependencies between UI components by introducing a mediator that centralizes communication, preventing explicit references between peers"
metaDescription: "Mediator pattern for loose component coupling. Centralize communication between UI components to eliminate explicit peer references and simplify dependencies."
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
  metaDescription: "Mediator pattern for loose component coupling. Centralize communication between UI components to eliminate explicit peer references and simplify dependencies."
  keywords:
    - mediator pattern
    - component communication
    - loose coupling
    - behavioral patterns
    - frontend architecture
---

# Mediator Pattern for Loose Component Coupling in Frontend Apps

The [Mediator](/patterns/design/mediator-pattern) pattern defines an object that encapsulates how a set of objects interact. Instead of components referring to each other directly, they refer to a mediator, reducing the number of explicit connections from many-to-many to many-to-one. This is essential for complex UIs where dozens of components need to stay synchronized.

## When to Use This

- Components have many-to-many relationships that would otherwise create tight coupling
- Reusing components independently is difficult because they depend on specific peers
- Communication logic is scattered and hard to test

## Problem

A dashboard with filters, charts, tables, and maps requires each widget to notify every other widget when data changes. Each widget holds references to 5-6 others, creating a dependency nightmare.

## Solution

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

// Mediator orchestrates all communication
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

// Usage
const mediator = new DashboardMediator();
const filters = new FilterPanel(mediator);
const chart = new ChartWidget(mediator);
const table = new TableWidget(mediator);
const map = new MapWidget(mediator);

mediator.setComponents(filters, chart, table, map);
filters.selectRegion('north');
```

## Variation: Event Bus Mediator

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

## How It Works

1. **Mediator** declares the communication interface
2. **Concrete Mediator** implements coordination logic between colleagues
3. **Colleague** components send events to the mediator instead of each other
4. **Client** creates and wires the mediator with all colleagues

## Production Considerations

- Keep mediators focused on one domain; do not create a god object
- Use typed events to prevent stringly-typed communication bugs
- Consider state management libraries (Redux, Zustand) as evolved mediators. See [Singleton](/patterns/design/singleton-pattern) for service instance management.

## Common Mistakes

- Creating a mediator so large it becomes unmaintainable
- Bypassing the mediator for direct component communication
- Not unsubscribing event listeners, causing memory leaks

## FAQ

**Q: How is this different from Observer?**
A: [Observer](/patterns/design/observer-pattern) is one-to-many broadcast. Mediator is many-to-many routing through a central coordinator.

**Q: When should I use a state manager instead?**
A: When the primary need is shared state, not just communication. Mediator handles messages; state managers handle data.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
