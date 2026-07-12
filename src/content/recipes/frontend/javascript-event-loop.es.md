---


contentType: recipes
slug: javascript-event-loop
title: "Event Loop de JavaScript"
description: "Comprende cómo funciona el event loop de JavaScript y cómo escribir código no bloqueante."
metaDescription: "Cómo funciona el event loop de JavaScript: call stack, cola de tareas, microtareas y código async eficiente para mejorar el rendimiento de aplicaciones web."
difficulty: intermediate
topics:
  - frontend
tags:
  - event-loop
  - async
  - javascript
  - performance
  - frontend
relatedResources:
  - /recipes/race-condition-prevention
  - /recipes/deep-clone-structured
  - /recipes/url-encoding-decoding
  - /recipes/brotli-nginx-compression
  - /recipes/spa-code-splitting-lazy
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-react-performance-optimization
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Cómo funciona el event loop de JavaScript: call stack, cola de tareas, microtareas y código async eficiente para mejorar el rendimiento de aplicaciones web."
  keywords:
    - event-loop
    - async
    - javascript
    - performance


---
## Visión General

El event loop de JavaScript es el corazón de la programación asíncrona en navegadores y Node.js. Orquesta la ejecución del código, recopila y procesa eventos, y ejecuta subtareas en cola. Comprender cómo interactúan el call stack, la cola de tareas y la cola de microtareas es esencial para escribir aplicaciones performantes y no bloqueantes.

## Cuándo Usar

Usa este recurso cuando:

- Depuras errores asíncronos misteriosos o condiciones de carrera. Consulta [Unit Testing](/recipes/testing/unit-testing) para testear código async.
- Optimizas la responsividad de la UI en aplicaciones frontend. Consulta [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) para rendimiento frontend.
- Eliges entre setTimeout, Promise y queueMicrotask. Consulta [WebSockets Real-Time](/recipes/frontend/websockets-realtime) para patrones frontend event-driven.
- Entiendes por qué el orden del código no siempre coincide con el orden de ejecución. Consulta [Parse JSON](/recipes/data/parse-json) para manejar parsing de datos async.

## Cuándo Evitar

- **Trabajo CPU-bound**: El event loop es single-threaded. Usa Web Workers para computación pesada (procesamiento de imágenes, crypto, parsing).
- **Procesamiento de audio/video en tiempo real**: Usa Web Audio API o WebRTC, que corren en threads separados.
- **Paralelismo server-side**: Los worker threads de Node.js o child processes son mejores para tareas CPU-bound en el servidor.

## Solución

### Visualizando el Event Loop

```javascript
console.log('1. Inicio del script');

setTimeout(() => {
  console.log('2. setTimeout (macrotarea)');
}, 0);

Promise.resolve().then(() => {
  console.log('3. Promise (microtarea)');
});

queueMicrotask(() => {
  console.log('4. queueMicrotask');
});

console.log('5. Fin del script');

// Orden de salida:
// 1. Inicio del script
// 5. Fin del script
// 3. Promise (microtarea)
// 4. queueMicrotask
// 2. setTimeout (macrotarea)
```

### Manejando Tareas de Larga Duración

```javascript
function procesarArrayGrande(arr, chunkSize = 1000) {
  let index = 0;

  function procesarChunk() {
    const chunk = arr.slice(index, index + chunkSize);
    chunk.forEach(item => computacionPesada(item));
    index += chunkSize;

    if (index < arr.length) {
      setTimeout(procesarChunk, 0); // Ceder control al event loop
    }
  }

  procesarChunk();
}
```

### Async/Await y el Event Loop

```javascript
async function fetchUserData(userId) {
  // Await cede control al event loop
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;
}

// Múltiples awaits corren secuencialmente
async function fetchSequential() {
  const a = await fetch('/api/a'); // espera a
  const b = await fetch('/api/b'); // espera b
  // Tiempo total: time(a) + time(b)
}

// Promise.all corre concurrentemente
async function fetchParallel() {
  const [a, b] = await Promise.all([
    fetch('/api/a'),
    fetch('/api/b'),
  ]);
  // Tiempo total: max(time(a), time(b))
}
```

### Web Workers para Tareas CPU-Intensivas

```javascript
// main.js
const worker = new Worker('compute.js');

worker.postMessage({ data: largeArray });
worker.onmessage = (e) => {
  console.log('Resultado:', e.data);
};

// compute.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

Los Web Workers corren en un thread separado. No bloquean el event loop ni la UI.

### Scheduler API (Navegadores Modernos)

```javascript
// Cede el main thread con scheduler.yield()
async function processChunks(items) {
  for (const item of items) {
    process(item);
    await scheduler.yield(); // Deja que el navegador pinte
  }
}

// Agenda tareas con prioridades
scheduler.postTask(() => {
  // tarea visible para el usuario
}, { priority: 'user-visible' });

scheduler.postTask(() => {
  // tarea en background
}, { priority: 'background' });
```

### Node.js: setImmediate vs process.nextTick

```javascript
// process.nextTick corre antes que cualquier I/O o timer
process.nextTick(() => console.log('1. nextTick'));

// setImmediate corre después de eventos I/O
setImmediate(() => console.log('3. setImmediate'));

// setTimeout corre después de un delay mínimo
setTimeout(() => console.log('2. setTimeout'), 0);

// Orden: 1. nextTick, 2. setTimeout, 3. setImmediate
// (el orden setTimeout vs setImmediate no está garantizado en la práctica)
```

## Explicación

El event loop opera en fases:

1. **Call Stack**: Ejecuta código síncrono. Cuando está vacío, el event loop revisa las colas.
2. **Cola de Microtareas**: Procesa callbacks de Promise, queueMicrotask y MutationObserver. Se vacía completamente antes de la siguiente macrotarea.
3. **Cola de Macrotareas**: Procesa setTimeout, setInterval, setImmediate (Node.js) y eventos de I/O.
4. **Fase de Renderizado**: Los navegadores pueden actualizar el DOM y repintar si hay tiempo.

**Regla crítica**: Todas las microtareas se ejecutan antes de la siguiente macrotarea. Esto puede bloquear la cola de macrotareas si las microtareas encolan más microtareas recursivamente.

## Variantes

| Runtime | API Macrotarea | API Microtarea | Notas |
|---------|---------------|----------------|-------|
| Navegador | setTimeout, requestAnimationFrame | Promise, queueMicrotask | rAF corre antes del paint |
| Node.js | setTimeout, setImmediate | Promise, process.nextTick | nextTick corre antes que Promises |
| Deno | setTimeout | Promise, queueMicrotask | Se alinea con comportamiento de navegador |
| Bun | setTimeout, setImmediate | Promise, queueMicrotask | nextTick no soportado |

## Avanzado: Medir Event Loop Lag

```javascript
// Node.js: medir delay del event loop
let lastCheck = performance.now();

setInterval(() => {
  const now = performance.now();
  const lag = now - lastCheck - 1000; // intervalo esperado 1000ms
  if (lag > 10) {
    console.warn(`Event loop lag: ${lag.toFixed(1)}ms`);
  }
  lastCheck = now;
}, 1000);
```

```javascript
// Navegador: medir long tasks con PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(`Long task: ${entry.duration.toFixed(0)}ms`);
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

Las tareas más largas que 50ms se reportan como long tasks. Estas causan jank visible.

## Avanzado: AbortController para Cancelación

```javascript
const controller = new AbortController();

async function fetchWithTimeout(url, ms) {
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

Cuando se aborta, `fetch` rechaza con un `AbortError`. Esta es la forma estándar de cancelar operaciones async.

## Lo que funciona

- **Divide trabajo pesado en chunks**: Usa setTimeout o requestIdleCallback para ceder control
- **Prefiere microtareas para actualizaciones DOM**: queueMicrotask asegura que las lecturas DOM se agrupen
- **Evita encolar microtareas recursivamente**: Puede congelar el event loop indefinidamente
- **Usa requestAnimationFrame para actualizaciones visuales**: Se sincroniza con el ciclo de renderizado del navegador
- **Perfila con la pestaña Performance**: Chrome DevTools visualiza el timing de microtareas y macrotareas

## Errores Comunes

1. **Asumir que setTimeout(0) es inmediato**: Siempre es más lento que las microtareas
2. **Bloquear el hilo principal**: Bucles síncronos >50ms causan jank y frames perdidos
3. **Olvidar nextTick en Node.js**: process.nextTick corre antes que Promises, no después
4. **Recursión de microtareas**: Promise.resolve().then(() => Promise.resolve().then(...)) puede bloquear
5. **Ignorar la fase de renderizado**: Colas pesadas de microtareas impiden el pintado del navegador

## Preguntas Frecuentes

### ¿Por qué Promise.then() corre antes que setTimeout(0)?

Los callbacks de Promise entran en la cola de microtareas, que tiene mayor prioridad que la cola de macrotareas donde viven los callbacks de setTimeout. El event loop drena todas las microtareas antes de procesar la siguiente macrotarea.

### ¿Cuál es la diferencia entre queueMicrotask y Promise.resolve().then()?

Funcionalmente idénticos en la mayoría de casos, pero queueMicrotask es más explícito y ligeramente más eficiente. Evita crear un objeto Promise. Usa queueMicrotask cuando no necesitas la cadena Promise.

### ¿Cómo evito que el event loop se congele?

Divide el trabajo en chunks pequeños usando setTimeout, requestIdleCallback o Web Workers para tareas CPU-intensivas. Usa `scheduler.yield()` en navegadores modernos. Monitorea con PerformanceObserver para long tasks.

### ¿Cuál es la diferencia entre microtarea y macrotarea?

Las microtareas (callbacks de Promise, queueMicrotask, MutationObserver) corren después de que la tarea actual completa y antes de la siguiente macrotarea. Las macrotareas (setTimeout, setInterval, eventos I/O) son agendadas por el event loop. Todas las microtareas se drenan antes de que la siguiente macrotarea corra.

### ¿Cómo se relaciona async/await con el event loop?

`await` suspende la función async y cede control al event loop. Cuando el Promise awaited se resuelve, la continuación se encola como microtarea. Esto significa que las funciones async no bloquean el event loop — ceden cooperativamente.

### ¿Qué es requestAnimationFrame y cuándo debería usarlo?

requestAnimationFrame agenda un callback antes del siguiente paint del navegador. Corre en la fase de renderizado, después de las microtareas pero antes del paint actual. Úsalo para actualizaciones visuales: mutaciones DOM, canvas drawing, transiciones CSS. Se sincroniza con la tasa de refresco del display (usualmente 60Hz).

### ¿Cuál es el modelo del event loop de Node.js?

Node.js usa libuv, que tiene fases: timers, pending callbacks, idle/prepare, poll, check (setImmediate) y close callbacks. Entre cada fase, las microtareas (process.nextTick y Promises) se drenan. Esto es más estructurado que el modelo del navegador.

### ¿Cómo mido el rendimiento del event loop?

En Node.js, usa `perf_hooks` para medir event loop lag. En navegadores, usa PerformanceObserver con el tipo de entrada `longtask`. La pestaña Performance de Chrome DevTools visualiza el timing de tareas. Busca tareas más largas que 50ms.

### ¿Puede el event loop correr en paralelo?

No. JavaScript es single-threaded en el event loop. Los Web Workers y los worker threads de Node.js corren event loops separados en threads separados. SharedArrayBuffer y Atomics permiten comunicación limitada de memoria compartida.

### ¿Qué pasa cuando el event loop se bloquea?

La UI se congela. No hay animaciones, no hay clicks, no hay scroll. En Node.js, no se procesa I/O, no se disparan timers. El servidor se vuelve no responsivo. Por eso bloquear el main thread con trabajo síncrono es el problema de rendimiento más común en JavaScript.

### ¿Cómo cancelo una operación async en curso?

Usa AbortController. Pasa `controller.signal` a fetch, streams y otras APIs async. Llama `controller.abort()` para cancelar. La operación rechaza con un AbortError. Este es el estándar web para cancelación.

### ¿Cuál es la diferencia entre setTimeout y setInterval?

setTimeout corre un callback una vez después de un delay. setInterval corre un callback repetidamente con un delay fijo entre cada ejecución. setInterval no espera que el callback anterior termine — si el callback toma más que el intervalo, las ejecuciones se apilan. Prefiere setTimeout recursivo para scheduling confiable.
