---
contentType: recipes
slug: race-condition-prevention
title: "Prevencion de Race Conditions en Codigo Async de JavaScript"
description: "Identifica y corrige race conditions en JavaScript asincrono usando secuenciacion apropiada, operaciones atomicas y patrones de Promise para ejecucion concurrente predecible"
metaDescription: "Previene race conditions en JavaScript async. Usa secuenciacion apropiada, operaciones atomicas y patrones Promise para ejecucion concurrente predecible."
difficulty: intermediate
topics:
  - concurrency
  - frontend
tags:
  - race-condition
  - concurrency
  - javascript
  - async
relatedResources:
  - /recipes/concurrency/python-thread-pool-executor
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /patterns/messaging/idempotent-consumer-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Previene race conditions en JavaScript async. Usa secuenciacion apropiada, operaciones atomicas y patrones Promise para ejecucion concurrente predecible."
  keywords:
    - race condition
    - async javascript
    - concurrent execution
    - atomic operations
    - promise patterns
---

# Prevencion de Race Conditions en Codigo Async de JavaScript

Las race conditions ocurren cuando multiples operaciones async acceden a estado compartido sin coordinacion apropiada, llevando a comportamiento no deterministico. Esta recipe cubre identificar, prevenir y corregir race conditions en JavaScript usando actualizaciones atomicas, secuenciacion apropiada de Promise y patrones de locks.

## Cuando Usar Esto

- Multiples [llamadas a API](/recipes/api/call-rest-api) actualizan el mismo estado o elementos DOM. Consulta [Async Patterns](/recipes/concurrency/async-patterns) para coordinación.
- [Datos cacheados](/recipes/data/caching) se vuelven stale o inconsistentes bajo acceso concurrente
- Inputs debounced disparan requests de red superpuestas con orden impredecible

## Problema

Un componente de busqueda dispara un nuevo request en cada keystroke. Si los resultados llegan fuera de orden, la UI muestra datos stale de una query anterior.

## Solucion

### 1. Cancelacion de Requests con AbortController

```typescript
// search/SearchService.ts
class SearchService {
  private abortController: AbortController | null = null;

  async search(query: string): Promise<unknown[]> {
    // Cancela request anterior
    this.abortController?.abort();
    this.abortController = new AbortController();

    const response = await fetch(`/api/search?q=${query}`, {
      signal: this.abortController.signal,
    });

    return response.json();
  }
}
```

### 2. Actualizaciones de Estado Atomicas

```typescript
// counter/AtomicCounter.ts
class AtomicCounter {
  private value = 0;
  private queue = Promise.resolve();

  increment(): Promise<number> {
    this.queue = this.queue.then(async () => {
      const current = this.value;
      await delay(10);
      if (this.value === current) {
        this.value = current + 1;
      }
      return this.value;
    });

    return this.queue;
  }

  getValue(): number {
    return this.value;
  }
}
```

### 3. Debounce con Ejecucion Solo-Ultima

```typescript
// hooks/useLatestQuery.ts
import { useCallback, useRef } from 'react';

function useLatestQuery<T>() {
  const latestRequest = useRef(0);

  return useCallback(async (query: string, fetcher: (q: string) => Promise<T>): Promise<T> => {
    const requestId = ++latestRequest.current;
    const result = await fetcher(query);

    if (requestId !== latestRequest.current) {
      throw new Error('Stale request');
    }

    return result;
  }, []);
}
```

### 4. [Mutex Lock](/recipes/concurrency/locks-and-mutexes) para Secciones Criticas

```typescript
// locks/Mutex.ts
class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => resolve(() => this.release()));
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

const balanceMutex = new Mutex();

async function transfer(from: Account, to: Account, amount: number): Promise<void> {
  const release = await balanceMutex.acquire();
  try {
    if (from.balance >= amount) {
      from.balance -= amount;
      to.balance += amount;
    }
  } finally {
    release();
  }
}
```

### 5. Patron Compare-and-Swap

```typescript
// storage/CASStore.ts
class CASStore<T> {
  private value: T;

  constructor(initial: T) {
    this.value = initial;
  }

  compareAndSwap(expected: T, newValue: T): boolean {
    if (this.value === expected) {
      this.value = newValue;
      return true;
    }
    return false;
  }

  getValue(): T {
    return this.value;
  }
}
```

## Como Funciona

- **AbortController** cancela requests en vuelo cuando son superados
- **Colas atomicas** serializan operaciones sobre estado compartido
- **Request IDs** ignoran responses de llamadas desactualizadas
- **Mutex locks** enforcean exclusion mutua en secciones criticas
- **Operaciones CAS** reintentan actualizaciones cuando se detectan modificaciones concurrentes

## Consideraciones de Produccion

- Usa `startTransition` de React para actualizaciones de estado no-urgentes para evitar bloqueo de UI
- Implementa optimistic updates con rollback en fallo para mejor rendimiento percibido
- Monitorea sintomas de race conditions con Sentry o similar error tracking

## Errores Comunes

- Leer estado antes de una operacion async y usar el valor stale despues
- No limpiar event listeners o timers que modifican estado compartido
- Asumir que `await` bloquea toda la ejecucion de codigo concurrente

## FAQ

**P: En que se diferencia de un deadlock?**
R: Las race conditions producen resultados incorrectos por acceso concurrente. Los [deadlocks](/recipes/concurrency/locks-and-mutexes) ocurren cuando threads se bloquean indefinidamente esperando recursos.

**P: Necesito locks en JavaScript single-threaded?**
R: JavaScript es single-threaded pero las operaciones async se intercalan. El estado aun puede corromperse entre puntos de await.
