---
contentType: recipes
slug: javascript-debounce-throttle-implementation
title: "Funciones Debounce y Throttle en JavaScript"
description: "Controla la tasa de ejecución de funciones con debounce y throttle. Cubre leading y trailing edge, timers cancelables y casos de uso reales."
metaDescription: "Implementa debounce y throttle en JavaScript. Leading y trailing edge, timers cancelables, búsquedas, scroll y redimensionado de ventana."
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
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-react-performance-optimization
  - /guides/complete-guide-web-performance-core-web-vitals
lastUpdated: "2026-08-23"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa debounce y throttle en JavaScript. Leading y trailing edge, timers cancelables, búsquedas, scroll y redimensionado de ventana."
  keywords:
    - javascript debounce
    - javascript throttle
    - debounce throttle implementation
    - rate limiting javascript
    - search input debounce
    - scroll throttle javascript
---

## Descripción General

Debounce y throttle evitan que eventos rápidos saturen tu código. Debounce espera
a que la actividad se detenga antes de ejecutar la función. Throttle ejecuta la
función a lo sumo una vez por intervalo, aunque el evento siga disparándose. Ambos
son útiles para manejadores de scroll, resize, input y mousemove.

## Cuándo Usar

- **Debounce**: campos de búsqueda, autoguardado, redimensionado de ventana —
  esperar hasta que el usuario se detenga.
- **Throttle**: posición de scroll, movimiento del mouse, clics repetidos —
  ejecutar a una tasa fija.
- Tenés un evento que se dispara muchas veces por segundo y provoca trabajo costoso.

Para alternativas, consultá la [Guía Completa de Optimización del Tamaño del
Bundle](/es/guides/complete-guide-bundle-size-optimization/).

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

// Uso — campo de búsqueda
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

// Uso — manejador de scroll
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

// Solo leading — disparar inmediatamente, luego ignorar
const onClick = debounceAdvanced(saveData, 1000, { leading: true, trailing: false });

// Solo trailing — disparar después del periodo de silencio (default)
const onInput = debounceAdvanced(searchApi, 300, { leading: false, trailing: true });

// Ambos — disparar inmediatamente y otra vez después del silencio
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

### Práctico: progreso de scroll con throttle

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

**Debounce** resetea un timer cada vez que el evento se dispara. La función
envuelta solo se ejecuta después de que el flujo de llamadas esté quieto por
`delay` milisegundos. Esa es la herramienta que buscás cuando querés esperar a que
el usuario termine de escribir, hacer scroll o redimensionar.

**Throttle** ejecuta la función en la primera llamada y luego saltea las demás
hasta que pasen `interval` milisegundos. Usalo cuando querés actualizaciones
periódicas y estables en lugar de esperar una pausa.

**Leading edge** significa que la primera llamada se ejecuta inmediatamente; las
siguientes se ignoran o reprograman. **Trailing edge** significa que una llamada
final se ejecuta después del periodo de silencio, usando los argumentos más
recientes.

| Técnica | Se Dispara Cuando | Caso de Uso |
| -------------------- | ------------------------------------ | ---------------------- |
| Debounce (trailing) | Después de que la actividad se detiene | Búsqueda, autoguardado |
| Debounce (leading) | Inmediatamente, luego espera | Proteger clics de botón |
| Throttle | A lo sumo una vez por intervalo | Scroll, mousemove |
| Throttle (trailing) | Una vez por intervalo + final | Scroll con última posición |

## Variantes

| Patrón | Comportamiento | Ejemplo |
| -------- | ---------------- | --------- |
| Debounce | Retrasar hasta silencio | Campo de búsqueda |
| Throttle | Rate limit a intervalo | Manejador de scroll |
| RequestAnimationFrame | Sync con repaint | Animaciones |
| IntersectionObserver | Callback en visibilidad | Lazy loading |

## Mejores Prácticas

Usá debounce cuando necesites el valor final, como en un campo de búsqueda, una
rutina de autoguardado o un manejador de redimensionado. Usá throttle cuando
quieras actualizaciones regulares, como una barra de progreso de scroll o un
rastreador de posición del mouse. Para actualizaciones visuales sincronizadas con
el repaint del navegador, usá `requestAnimationFrame` en lugar de throttle.
Siempre limpiá los timers cuando un componente se desmonte — el cleanup de
`useEffect` en React y `onUnmounted` en Vue son buenos lugares. Agregá
`{ passive: true }` a los listeners de scroll y touch para que el navegador no
bloquee el main thread. Usá leading edge para clics de botón, así das feedback
inmediato, y trailing edge para campos de búsqueda, así capturás el último query.
Testeá con input rápido para asegurarte de que la función no se dispare
 demasiado a menudo.

## Errores Comunes

Usar debounce para scroll es un error común: el handler no se disparará mientras
el usuario siga haciendo scroll, así que la UI se siente congelada. Throttle es
mejor ahí. Usar throttle para un campo de búsqueda también está mal porque la API
se llama mientras el usuario sigue escribiendo; debounce es el caso adecuado.
Siempre limpiá los timers, porque los timeouts pendientes pueden dispararse
 después del unmount y generar errores. En throttle, no te olvides de verificar
`remaining`, o la función puede dispararse en momentos raros. Saltearse
`{ passive: true }` en listeners de scroll puede bloquear el scroll. Y si te
olvidás de pasar `this` y `args`, la función envuelta pierde contexto y
argumentos. Por último, no elijas un delay de debounce muy largo — el usuario va
a pensar que la app se rompió. Mantené los delays de feedback de UI bajo un
segundo.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre debounce y throttle?

Debounce espera a que el usuario deje de disparar el evento, luego se ejecuta una
vez. Throttle se ejecuta a lo sumo una vez por intervalo sin importar cuántas
veces se dispare el evento. Usá debounce cuando querés esperar a que el usuario
termine, y throttle cuando querés limitar la tasa.

### ¿Debería usar debounce o throttle para window resize?

Usá debounce. Querés recalcular el layout después de que el usuario termina de
redimensionar, no en cada cambio de píxel. Un debounce de 150-200ms funciona bien.

### ¿Cómo implemento debounce en React?

Usá un custom hook con `useRef` para almacenar el timeout. Guardá la referencia de
la función en otro `useRef` y limpiá el timeout en el cleanup effect:

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

Sí, para actualizaciones visuales. `requestAnimationFrame` se sincroniza con el
ciclo de repaint del navegador (~60fps). Es más suave que throttle para
animaciones y actualizaciones visuales basadas en scroll. Dejá throttle para
trabajo no visual como llamadas a API.

### ¿Cuál es la diferencia entre debounce con leading y trailing edge?

El debounce con leading edge dispara la función inmediatamente en la primera
llamada, luego ignora llamadas subsecuentes hasta que expire el periodo de espera.
El debounce con trailing edge (el default) dispara después del periodo de espera
sin nuevas llamadas. Usá leading para eventos de click donde querés feedback
inmediato, trailing para búsquedas mientras escribís donde querés el último valor.
Lodash soporta ambos con `{ leading: true, trailing: false }`.

### ¿Debería cancelar llamadas debounce pendientes en el unmount?

Sí. Siempre limpiá el timeout en una función de cleanup (return de `useEffect`)
para prevenir actualizaciones de estado después de que el componente se desmonte.
Esto evita memory leaks y warnings de React sobre setear estado en un componente
desmontado.
