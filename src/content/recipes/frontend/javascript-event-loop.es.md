---
contentType: recipes
slug: javascript-event-loop
title: "Event Loop de JavaScript"
description: "Comprende cómo funciona el event loop de JavaScript y cómo escribir código no bloqueante."
metaDescription: "Guía profunda del event loop de JavaScript: call stack, cola de tareas, microtareas y código async eficiente para mejorar el rendimiento de aplicaciones web."
difficulty: intermediate
topics:
  - frontend
tags:
  - event-loop
  - async
  - javascript
  - performance
relatedResources:
  - /recipes/race-condition-prevention
  - /recipes/deep-clone-structured
  - /recipes/url-encoding-decoding
  - /recipes/brotli-nginx-compression
  - /recipes/spa-code-splitting-lazy
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Guía profunda del event loop de JavaScript: call stack, cola de tareas, microtareas y código async eficiente para mejorar el rendimiento de aplicaciones web."
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

## Mejores Prácticas

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

**P: ¿Por qué Promise.then() corre antes que setTimeout(0)?**
R: Los callbacks de Promise entran en la cola de microtareas, que tiene mayor prioridad que la cola de macrotareas donde viven los callbacks de setTimeout.

**P: ¿Cuál es la diferencia entre queueMicrotask y Promise.resolve().then()?**
R: Funcionalmente idénticos en la mayoría de casos, pero queueMicrotask es más explícito y ligeramente más eficiente.

**P: ¿Cómo evito que el event loop se congele?**
R: Divide el trabajo en chunks pequeños usando setTimeout, requestIdleCallback o Web Workers para tareas intensivas en CPU.
