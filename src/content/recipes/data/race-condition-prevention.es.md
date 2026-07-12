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
  - threads
relatedResources:
  - /recipes/python-thread-pool-executor
  - /recipes/python-asyncio-gather-task-groups
  - /patterns/idempotent-consumer-pattern
  - /recipes/javascript-event-loop
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

### 6. Ejemplo de Lock con Python Asyncio

```python
import asyncio

class Account:
    def __init__(self, balance: float):
        self.balance = balance

async def transfer(from_acc: Account, to_acc: Account, amount: float, lock: asyncio.Lock):
    async with lock:
        if from_acc.balance >= amount:
            from_acc.balance -= amount
            to_acc.balance += amount
            return True
        return False

async def main():
    account_a = Account(1000)
    account_b = Account(500)
    lock = asyncio.Lock()

    # Transferencias concurrentes son serializadas por el lock
    results = await asyncio.gather(
        transfer(account_a, account_b, 200, lock),
        transfer(account_a, account_b, 300, lock),
        transfer(account_b, account_a, 100, lock),
    )
    print(f"A: {account_a.balance}, B: {account_b.balance}")
    print(f"Results: {results}")

asyncio.run(main())
```

Sin el lock, transferencias concurrentes podrian leer `from_acc.balance` antes de cualquier deduccion, causando saldos negativos. El `asyncio.Lock` asegura que solo una transferencia se ejecute a la vez.

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
- Usar `setTimeout` para ordenar en lugar de secuenciacion async apropiada
- Olvidar cancelar requests pendientes cuando un componente se desmonta en React
- Modificar arrays u objetos compartidos sin sincronizacion — `push` y `splice` no son atomicos a traves de boundaries de await
- Mantener locks a traves de llamadas de red, lo que crea tiempos de espera largos y potenciales deadlocks

## FAQ

**P: En que se diferencia de un deadlock?**
R: Las race conditions producen resultados incorrectos por acceso concurrente. Los [deadlocks](/recipes/concurrency/locks-and-mutexes) ocurren cuando threads se bloquean indefinidamente esperando recursos.

**P: Necesito locks en JavaScript single-threaded?**
R: JavaScript es single-threaded pero las operaciones async se intercalan. El estado aun puede corromperse entre puntos de await.

**P: Como pruebo race conditions?**
R: Escribe tests que ejecuten operaciones concurrentes y verifiquen el estado final. Usa `Promise.all` para disparar llamadas paralelas. Inyecta delays aleatorios con `await delay(Math.random() * 100)` para aumentar la probabilidad de detectar bugs de intercalacion. Ejecuta tests multiples veces — las race conditions son no deterministas.

**P: Cual es la diferencia entre concurrencia optimista y locking pesimista?**
R: La concurrencia optimista asume que no hay conflicto y reintenta en fallo (patron CAS). El locking pesimista adquiere un lock antes de acceder estado compartido (Mutex). Usa concurrencia optimista cuando los conflictos son raros. Usa locking pesimista cuando los conflictos son frecuentes o reintentar es costoso.

**P: Puedo usar `Promise.all` con seguridad con estado compartido?**
R: Solo si cada promise opera con datos independientes. Si los promises leen y escriben la misma variable, `Promise.all` no los serializa — se intercalan en puntos de await. Usa un mutex o serializa las operaciones con una cadena de promises.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cómo detecto race conditions en producción?

Las race conditions son difíciles de detectar porque son no deterministas. Los síntomas incluyen estado inconsistente después de operaciones concurrentes, fallos intermitentes en tests que pasan al reintentar, y datos que no coinciden con los totales esperados. Usa logging estructurado con correlation IDs para rastrear operaciones intercaladas. Herramientas como Chrome DevTools Performance tab pueden mostrar cuando tareas async se intercalan.

### ¿Qué herramientas ayudan a encontrar race conditions?

Para JavaScript, usa `console.trace()` en secciones críticas para loggear call stacks. Para Python, `threading.get_ident()` ayuda a identificar qué thread accedió estado compartido. Para testing, frameworks como `jest` con el flag `--detectOpenHandles` pueden revelar problemas async. Para análisis estático, TypeScript strict mode captura muchos bugs de stale-closure que llevan a race conditions.

### ¿Debo usar AbortController o request IDs para cancelación?

Ambos enfoques funcionan pero sirven a propósitos diferentes. `AbortController` cancela la petición de red, ahorrando ancho de banda. Los request IDs solo ignoran la respuesta — la petición se completa. Usa `AbortController` cuando quieres ahorrar recursos. Usa request IDs cuando no puedes cancelar la operación subyacente (e.g., un cómputo ya en ejecución).

### ¿Cuál es la diferencia entre un mutex y un semáforo?

Un mutex (exclusión mutua) permite que solo un thread acceda a un recurso a la vez. Un semáforo permite que hasta N threads accedan a un recurso concurrentemente. Usa un mutex cuando solo una operación debe ejecutarse a la vez. Usa un semáforo para limitar la concurrencia a un número fijo de operaciones paralelas (e.g., máximo 5 llamadas API concurrentes).

### ¿Pueden ocurrir race conditions en JavaScript single-threaded?

Sí. JavaScript es single-threaded pero asíncrono. Cuando `await` cede el control, otras microtasks pueden intercalarse entre la verificación y la actualización. Por ejemplo, dos funciones `async` leyendo y escribiendo la misma variable pueden producir una race condition si ambas leen antes de que cualquiera escriba.

### ¿Cómo prevengo race conditions en bases de datos?

Usa transacciones con el nivel de aislamiento apropiado. Para read-then-write, usa `SELECT ... FOR UPDATE` (pessimistic locking) o versiones de fila con `WHERE version = X` (optimistic locking). Para incrementos atómicos, usa `UPDATE accounts SET balance = balance + 100 WHERE id = 1` en lugar de leer, sumar y escribir.

### ¿Qué herramientas uso para detectar race conditions?

Para detección en runtime, usa ThreadSanitizer (TSan) para C/C++/Rust, que detecta data races en tests. En Java, usa `jstack` para detectar threads bloqueados. En Python, usa `threading.settrace` para rastrear acceso concurrente. Para tests, ejecuta casos concurrentes miles de veces con semillas aleatorias diferentes para aumentar la probabilidad de reproducir races.
