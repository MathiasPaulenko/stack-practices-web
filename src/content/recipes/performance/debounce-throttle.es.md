---
contentType: recipes
slug: debounce-throttle
title: "Debounce y Throttle"
description: "Cómo implementar patrones de debounce y throttle para controlar la frecuencia de ejecución de funciones en búsquedas, scroll y llamadas a APIs."
metaDescription: "Aprende debounce y throttle en Python, JavaScript y Java. Cubre leading/trailing edge, rate limiting y optimización de event handlers."
difficulty: intermediate
topics:
  - performance
tags:
  - debounce
  - throttle
  - rate-limiting
  - events
  - performance
  - python
  - javascript
  - java
relatedResources:
  - /recipes/rate-limiting
  - /recipes/webhooks
  - /recipes/caching
  - /recipes/caching-redis
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Aprende debounce y throttle en Python, JavaScript y Java. Cubre leading/trailing edge, rate limiting y optimización de event handlers."
  keywords:
    - debounce
    - throttle
    - rate-limiting
    - eventos
    - performance
    - python
    - javascript
    - java
---
## Visión General

El debounce y throttle son técnicas de rate-limiting que controlan con qué frecuencia se ejecuta una función en respuesta a disparos rápidos y repetidos. El debounce espera a que una ráfaga de eventos se calme antes de disparar una vez. El throttle garantiza ejecución como máximo una vez por ventana de tiempo. Usa debounce para búsquedas (disparar tras el usuario deja de escribir); usa throttle para scroll o resize (disparar cada N milisegundos). Esta receta cubre implementaciones con bordes leading/trailing configurables, cancelación, y variantes síncronas y asíncronas en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Implementes búsqueda en tiempo real que debería consultar solo tras la pausa del usuario
- Manejes eventos de alta frecuencia como scroll, resize o mousemove sin congelar la UI
- Apliques rate-limiting a llamadas a APIs disparadas por acciones de usuario (spam de botón, autocomplete)
- Proceses datos en streaming donde quieras snapshots periódicos en vez de cada evento individual

## Solución

### Python

```python
import threading
import time
from functools import wraps

def debounce(wait_secs: float, leading: bool = False, trailing: bool = True):
    def decorator(fn):
        timer = None
        lock = threading.Lock()

        @wraps(fn)
        def wrapper(*args, **kwargs):
            nonlocal timer

            def call_it():
                with lock:
                    if trailing:
                        fn(*args, **kwargs)

            with lock:
                if timer:
                    timer.cancel()
                if leading and timer is None:
                    fn(*args, **kwargs)
                timer = threading.Timer(wait_secs, call_it)
                timer.start()

        def cancel():
            with lock:
                if timer:
                    timer.cancel()
                    timer = None

        wrapper.cancel = cancel
        return wrapper
    return decorator

def throttle(limit_secs: float, leading: bool = True, trailing: bool = False):
    def decorator(fn):
        last_call = 0
        pending = False
        lock = threading.Lock()

        @wraps(fn)
        def wrapper(*args, **kwargs):
            nonlocal last_call, pending

            def call_it():
                nonlocal last_call, pending
                with lock:
                    last_call = time.time()
                    pending = False
                fn(*args, **kwargs)

            with lock:
                now = time.time()
                remaining = limit_secs - (now - last_call)

                if remaining <= 0:
                    last_call = now
                    if leading:
                        fn(*args, **kwargs)
                elif trailing and not pending:
                    pending = True
                    threading.Timer(remaining, call_it).start()

        return wrapper
    return decorator

# Uso
@debounce(0.3)
def search_api(query: str):
    print(f"Buscando: {query}")

@throttle(0.1)
def on_scroll():
    print("Evento de scroll manejado")
```

### JavaScript

```javascript
function debounce(fn, wait, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeout = null;

  const debounced = (...args) => {
    const callNow = leading && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (trailing) fn(...args);
    }, wait);

    if (callNow) fn(...args);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}

function throttle(fn, limit, options = {}) {
  const { leading = true, trailing = false } = options;
  let lastCall = 0;
  let timeout = null;

  return (...args) => {
    const now = Date.now();

    if (!lastCall && !leading) {
      lastCall = now;
    }

    const remaining = limit - (now - lastCall);

    if (remaining <= 0 || remaining > limit) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      if (leading) fn(...args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        fn(...args);
      }, remaining);
    }
  };
}

// Uso
const search = debounce((query) => {
  fetch(`/api/search?q=${encodeURIComponent(query)}`);
}, 300);

const handleScroll = throttle(() => {
  console.log("posición de scroll:", window.scrollY);
}, 100);
```

### Java

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

public class RateLimiters {

  public static <T> Consumer<T> debounce(
      Consumer<T> fn, long waitMillis, boolean leading, boolean trailing) {
    ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    ScheduledFuture<?> future = null;
    final Object lock = new Object();

    return (T arg) -> {
      synchronized (lock) {
        if (future != null) {
          future.cancel(false);
        }
        boolean isFirst = future == null;
        if (leading && isFirst) {
          fn.accept(arg);
        }
        future = scheduler.schedule(() -> {
          synchronized (lock) {
            if (trailing) fn.accept(arg);
            future = null;
          }
        }, waitMillis, TimeUnit.MILLISECONDS);
      }
    };
  }

  public static <T> Consumer<T> throttle(
      Consumer<T> fn, long limitMillis, boolean leading, boolean trailing) {
    ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    AtomicLong lastCall = new AtomicLong(0);
    ScheduledFuture<?> pending = null;
    final Object lock = new Object();

    return (T arg) -> {
      long now = System.currentTimeMillis();
      long elapsed = now - lastCall.get();

      if (elapsed >= limitMillis) {
        synchronized (lock) {
          if (pending != null) {
            pending.cancel(false);
            pending = null;
          }
          lastCall.set(now);
        }
        if (leading) fn.accept(arg);
      } else if (trailing && pending == null) {
        synchronized (lock) {
          long delay = limitMillis - elapsed;
          pending = scheduler.schedule(() -> {
            lastCall.set(System.currentTimeMillis());
            pending = null;
            fn.accept(arg);
          }, delay, TimeUnit.MILLISECONDS);
        }
      }
    };
  }

  // Uso
  public static void main(String[] args) {
    Consumer<String> search = debounce(
      System.out::println, 300, false, true
    );
    search.accept("hola");
    search.accept("hola mundo"); // solo este dispara tras 300ms

    Consumer<String> logger = throttle(
      System.out::println, 100, true, false
    );
    logger.accept("evento"); // dispara inmediatamente
    logger.accept("evento"); // ignorado hasta pasar 100ms
  }
}
```

## Explicación

- **Debounce** reinicia un timer en cada disparo. Solo tras completarse el timer sin nuevos disparos se ejecuta la función. Úsalo para escenarios de "esperar hasta que el usuario pause".
- **Throttle** rastrea el tiempo de la última ejecución. Permite ejecución solo si ha pasado suficiente tiempo desde la última llamada. Úsalo para escenarios de "como máximo una vez cada N ms".
- **Leading edge** dispara la función en el primer disparo inmediatamente, luego espera. El trailing edge dispara en el último disparo tras el período de espera. Pueden combinarse (ambos true) o usarse solos.
- **Cancelación** es crítica: si un componente se desmonta o el usuario navega, las llamadas debounce pendientes no deberían ejecutarse. Siempre expón un método `cancel()`.
- **Seguridad de hilos** importa en Python y Java donde múltiples hilos pueden disparar eventos concurrentemente. Usa locks para prevenir condiciones de carrera en el manejo de timers.

## Variantes

| Patrón | Comportamiento | Ideal Para |
|--------|---------------|------------|
| Debounce (trailing) | Dispara tras pausa | Inputs de búsqueda, validación de formularios |
| Debounce (leading) | Dispara inmediatamente, luego espera | Clicks de botón, acciones de guardado |
| Throttle (leading) | Dispara primero, luego limita | Scroll, resize, mousemove |
| Throttle (trailing) | Limita, dispara el último | Sync periódico, heartbeat |
| requestAnimationFrame | Sincroniza al refresco de display | Animaciones, actualizaciones visuales |

## Mejores Prácticas

1. **Usa debounce para inputs de texto** — consultar una API en cada pulsación desperdicia recursos; espera la pausa de escritura (típicamente 200-500ms).
2. **Usa throttle para eventos visuales** — scroll, resize y mousemove pueden disparar 60+ veces por segundo. Throttle a 100ms o usa `requestAnimationFrame`.
3. **Implementa siempre cancelación** — timers pendientes pueden ejecutarse tras destruir un componente, causando errores o llamadas a APIs desperdiciadas.
4. **Elige el edge correcto** — leading edge se siente rápido para botones; trailing edge es mejor para búsqueda para capturar el input final.
5. **Mide el impacto** — usa la pestaña Performance de DevTools para verificar que tu debounce/throttle reduce realmente el trabajo del main thread.

## Errores Comunes

1. Usar debounce donde se necesita throttle, causando que eventos intermedios importantes se pierdan completamente.
2. Olvidar limpiar timers al desmontar componentes, causando memory leaks y ejecuciones obsoletas.
3. Poner delays de debounce muy largos (ej. 2 segundos), haciendo que la UI se sienta poco responsiva.
4. Usar throttle sin trailing edge, perdiendo el evento final de una ráfaga (ej. última posición de scroll).
5. No manejar condiciones de carrera en ambientes multi-hilo donde los timers pueden superponerse.

## Preguntas Frecuentes

### ¿Cuándo debería usar debounce vs throttle?

Usa debounce cuando solo te importe el estado final tras una ráfaga de eventos (input de búsqueda, final de resize de ventana). Usa throttle cuando necesites actualizaciones periódicas durante un flujo continuo (tracking de posición de scroll, gráficos en vivo). Si dudas: input de texto → debounce; eventos visuales/mouse → throttle.

### ¿Cuál es el delay correcto para un debounce de búsqueda?

Típicamente 200-500ms. Muy corto y consultas en cada pulsación; muy largo y la UI se siente lenta. A/B testea dentro de tu app para encontrar el punto óptimo para la velocidad de escritura de tus usuarios.

### ¿Puedo combinar debounce y throttle?

Sí. Un patrón común es "throttle luego debounce": garantiza una tasa mínima de ejecución (throttle) mientras espera pausas (debounce). Por ejemplo, actualiza una vista previa en vivo como máximo cada 100ms, pero también asegura una actualización final 300ms tras el usuario dejar de escribir.
