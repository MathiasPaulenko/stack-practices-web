---





contentType: recipes
slug: javascript-debounce-throttle-implementation
title: "Funciones Debounce y Throttle en JavaScript"
description: "Controla la tasa de ejecución de funciones con debounce y throttle. Cubre leading/trailing edge, timers cancelables y casos de uso reales."
metaDescription: "Implementa debounce y throttle en JavaScript. Leading y trailing edge, timers cancelables, search input, scroll handlers y resize listeners."
difficulty: intermediate
topics:
  - frontend
  - performance
tags:
  - javascript
  - debounce
  - throttle
  - performance
  - rate-limiting
  - events
relatedResources:
  - /recipes/javascript-infinite-scroll-pagination
  - /recipes/javascript-localstorage-expiration
  - /guides/performance-optimization-guide
  - /patterns/circuit-breaker-pattern
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-react-performance-optimization
  - /guides/complete-guide-web-performance-core-web-vitals
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implementa debounce y throttle en JavaScript. Leading y trailing edge, timers cancelables, search input, scroll handlers y resize listeners."
  keywords:
    - javascript debounce
    - javascript throttle
    - debounce throttle implementation
    - rate limiting javascript
    - search input debounce
    - scroll throttle javascript





---

## Visión General

Debounce y throttle son técnicas para controlar la frecuencia con la que se ejecuta una función. Debounce retrasa la ejecución hasta que la actividad se detiene. Throttle limita la ejecución a máximo una vez por intervalo. Ambas previenen problemas de rendimiento por eventos que se disparan muchas veces por segundo como scroll, resize, typing y clicks.

## Cuándo Usar


- For alternatives, see [Complete Guide to Bundle Size Optimization](/es/guides/complete-guide-bundle-size-optimization/).

- **Debounce**: Search input, autosave, window resize — esperar hasta que el usuario se detenga
- **Throttle**: Scroll position, mouse move, button spam — limitar a una tasa fija
- Tienes un evento que se dispara muchas veces por segundo y triggera trabajo costoso

## Solución

### Debounce básico

```javascript
function debounce(fn, delay) {
    let timeoutId;

    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

// Uso — search input
const handleSearch = debounce((query) => {
    console.log("Searching for:", query);
    fetchResults(query);
}, 300);

input.addEventListener("input", (e) => handleSearch(e.target.value));
```

### Throttle básico

```javascript
function throttle(fn, interval) {
    let lastTime = 0;

    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            fn.apply(this, args);
            lastTime = now;
        }
    };
}

// Uso — scroll handler
const handleScroll = throttle(() => {
    console.log("Scroll position:", window.scrollY);
}, 100);

window.addEventListener("scroll", handleScroll);
```

### Debounce con leading edge

```javascript
function debounceLeading(fn, delay) {
    let timeoutId;
    let called = false;

    return function (...args) {
        if (!called) {
            fn.apply(this, args);
            called = true;
        }
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            called = false;
        }, delay);
    };
}

// Se dispara inmediatamente en la primera llamada, luego ignora hasta que haya silencio por delay ms
const handleDoubleClick = debounceLeading(() => {
    console.log("Action triggered");
}, 500);
```

### Debounce con opciones leading y trailing

```javascript
function debounceAdvanced(fn, delay, { leading = false, trailing = true } = {}) {
    let timeoutId;
    let lastArgs;
    let invoked = false;

    return function (...args) {
        lastArgs = args;

        const shouldInvokeLeading = leading && !invoked;
        if (shouldInvokeLeading) {
            fn.apply(this, args);
            invoked = true;
        }

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (trailing && (!leading || invoked)) {
                fn.apply(this, lastArgs);
            }
            invoked = false;
        }, delay);
    };
}

// Leading only — disparar inmediatamente, luego ignorar
const onClick = debounceAdvanced(saveData, 1000, { leading: true, trailing: false });

// Trailing only — disparar después del periodo de silencio (default)
const onInput = debounceAdvanced(searchApi, 300, { leading: false, trailing: true });

// Both — disparar inmediatamente y otra vez después del silencio
const onResize = debounceAdvanced(layoutCalc, 200, { leading: true, trailing: true });
```

### Throttle con trailing edge

```javascript
function throttleTrailing(fn, interval) {
    let lastTime = 0;
    let timeoutId;
    let lastArgs;

    return function (...args) {
        const now = Date.now();
        const remaining = interval - (now - lastTime);
        lastArgs = args;

        if (remaining <= 0) {
            clearTimeout(timeoutId);
            timeoutId = null;
            lastTime = now;
            fn.apply(this, args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastTime = Date.now();
                timeoutId = null;
                fn.apply(this, lastArgs);
            }, remaining);
        }
    };
}

// Se dispara máximo una vez por intervalo, con una llamada final después de que la actividad se detiene
const onMouseMove = throttleTrailing(updatePosition, 50);
```

### Debounce y throttle cancelables

```javascript
function debounceCancelable(fn, delay) {
    let timeoutId;

    const debounced = function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };

    debounced.cancel = () => {
        clearTimeout(timeoutId);
        timeoutId = null;
    };

    debounced.flush = (...args) => {
        clearTimeout(timeoutId);
        fn.apply(this, args);
    };

    return debounced;
}

// Uso
const save = debounceCancelable(autosave, 1000);
input.addEventListener("input", () => save());
button.addEventListener("click", () => save.cancel());  // Cancelar save pendiente
```

### Práctico: autosave con debounce

```javascript
class AutoSave {
    constructor(saveFn, delay = 2000) {
        this.save = debounceCancelable(saveFn, delay);
    }

    onChange(data) {
        this.save(data);
    }

    forceSave(data) {
        this.save.flush(data);
    }

    cancel() {
        this.save.cancel();
    }
}

const autosave = new AutoSave(async (data) => {
    const response = await fetch("/api/save", {
        method: "POST",
        body: JSON.stringify(data),
    });
    console.log("Saved:", await response.json());
});

editor.addEventListener("input", () => autosave.onChange(editor.value));
window.addEventListener("beforeunload", () => autosave.forceSave(editor.value));
```

### Práctico: scroll progress con throttle

```javascript
const updateScrollProgress = throttle(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    document.querySelector(".progress-bar").style.width = `${progress}%`;
}, 16);  // ~60fps

window.addEventListener("scroll", updateScrollProgress, { passive: true });
```

## Explicación

**Debounce**: Resetea un timer en cada llamada. La función solo se ejecuta después de que el caller se detiene por `delay` milisegundos. Piensa en ello como "esperar hasta que el usuario termine."

**Throttle**: Ejecuta la función inmediatamente, luego ignora llamadas por `interval` milisegundos. Piensa en ello como "ejecutar máximo una vez por intervalo."

**Leading edge**: La función se ejecuta en la primera llamada, luego las llamadas subsecuentes se debounced/throttled.

**Trailing edge**: Después del periodo de silencio o intervalo, una llamada final se ejecuta con los últimos argumentos.

| Técnica | Se Dispara Cuando | Caso de Uso |
|-----------|-----------|----------|
| Debounce (trailing) | Después de que la actividad se detiene | Search, autosave |
| Debounce (leading) | Inmediatamente, luego espera | Protección de button click |
| Throttle | Máximo una vez por intervalo | Scroll, mousemove |
| Throttle (trailing) | Una vez por intervalo + final | Scroll con última posición |

## Variantes

| Patrón | Comportamiento | Ejemplo |
|---------|----------|---------|
| Debounce | Retrasar hasta silencio | Search input |
| Throttle | Rate limit a intervalo | Scroll handler |
| RequestAnimationFrame | Sync con repaint | Animaciones |
| IntersectionObserver | Callback en visibilidad | Lazy loading |

## Pautas

- Usar debounce para eventos donde quieres el valor final (search, autosave, resize).
- Usar throttle para eventos donde quieres actualizaciones periódicas (scroll, mousemove).
- Usar `requestAnimationFrame` en lugar de throttle para actualizaciones visuales (animaciones, transforms).
- Siempre limpiar timers en unmount (cleanup de React `useEffect`, Vue `onUnmounted`).
- Usar `{ passive: true }` en listeners de scroll y touch para mejorar performance de scroll.
- Usar leading edge para button clicks para dar feedback inmediato.
- Usar trailing edge para search inputs para capturar el query final.
- Testear con input rápido para verificar que la función no se dispara demasiado a menudo.

## Errores Comunes

- Usar debounce para eventos de scroll. El handler nunca se dispara mientras se hace scroll continuo. Usar throttle en su lugar.
- Usar throttle para search inputs. La API se llama mientras el usuario sigue escribiendo. Usar debounce en su lugar.
- No limpiar timers. Timeouts pendientes se disparan después del unmount del componente, causando errores.
- Usar `Date.now()` en throttle sin verificar `remaining`. La función se dispara tarde si el intervalo ya pasó.
- No usar `passive: true` en listeners de scroll. Esto bloquea el main thread durante el scroll.
- Olvidar pasar `this` y `args`. La función debounced pierde contexto y argumentos.
- Hacer debounce con un delay muy largo. El usuario piensa que la app está rota. Mantener delays bajo 1 segundo para feedback de UI.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre debounce y throttle?

Debounce espera hasta que el usuario deja de disparar el evento, luego se ejecuta una vez. Throttle se ejecuta máximo una vez por intervalo sin importar cuántas veces se dispare el evento. Usar debounce para escenarios de "esperar hasta terminar". Usar throttle para escenarios de "limitar la tasa".

### ¿Debo usar debounce o throttle para window resize?

Debounce. Quieres recalcular layout después de que el usuario termina de resize, no en cada cambio de pixel. Un debounce de 150-200ms funciona bien.

### ¿Cómo implemento debounce en React?

Usar un custom hook con `useRef` para almacenar el timeout:

```javascript
function useDebounce(fn, delay) {
    const timeoutRef = useRef(null);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    const debounced = useCallback((...args) => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => fnRef.current(...args), delay);
    }, [delay]);

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    return debounced;
}
```

### ¿Puedo usar requestAnimationFrame en lugar de throttle?

Sí, para actualizaciones visuales. `requestAnimationFrame` se sincroniza con el ciclo de repaint del navegador (~60fps). Es más suave que throttle para animaciones y actualizaciones visuales basadas en scroll. Usar throttle para trabajo no visual como API calls.

### ¿Cuál es la diferencia entre debounce con leading y trailing edge?

Leading-edge debounce dispara la función inmediatamente en la primera llamada, luego ignora llamadas subsiguientes hasta que expire el periodo de espera. Trailing-edge debounce (el default) dispara después del periodo de espera sin nuevas llamadas. Usa leading para eventos de click donde quieres feedback inmediato, trailing para search-as-you-type donde quieres el último valor. Lodash soporta ambos via `{ leading: true, trailing: false }`.

### ¿Debo cancelar llamadas debounce pendientes en unmount?

Sí. Siempre limpia el timeout en una función de cleanup (return de `useEffect`) para prevenir actualizaciones de estado después de que el componente se desmonte. Esto evita memory leaks y warnings de React sobre setear estado en un componente desmontado.
