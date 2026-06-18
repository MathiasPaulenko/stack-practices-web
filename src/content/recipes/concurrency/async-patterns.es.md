---
contentType: recipes
slug: async-patterns
title: "Dominar Patrones Async con Promises, Futures y Coroutines"
description: "Cómo escribir código concurrente eficiente usando async/await, promises, futures y coroutines en JavaScript, Python y Java para I/O no bloqueante y procesamiento paralelo."
metaDescription: "Aprende patrones async para programación concurrente. Domina async/await, promises, futures y coroutines en JavaScript, Python y Java para I/O no bloqueante."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - coroutines
  - event-loop
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/serverless-functions
  - /recipes/event-driven-functions
  - /recipes/load-testing
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende patrones async para programación concurrente. Domina async/await, promises, futures y coroutines en JavaScript, Python y Java para I/O no bloqueante."
  keywords:
    - patrones async await
    - concurrencia promises
    - corutinas python
    - io no bloqueante
    - procesamiento paralelo
---

## Visión general

El código síncrono bloquea el thread de ejecución hasta que una operación completa. Cuando esa operación es I/O — consultar una base de datos, obtener datos de una API, leer un archivo — el thread permanece inactivo, desperdiciando ciclos de CPU que podrían procesar otros requests. La programación async resuelve esto suspendiendo la tarea actual cuando encuentra I/O, permitiendo que el runtime ejecute otras tareas, y reanudando la tarea original cuando el I/O completa. Esto habilita a un solo thread para manejar miles de conexiones concurrentes.

El desafío no es escribir las keywords `async` y `await` — es entender el event loop subyacente, evitar el callback hell, manejar errores a través de puntos de suspensión, y prevenir contención de recursos cuando múltiples tareas acceden a estado compartido. Diferentes runtimes implementan async de forma distinta: JavaScript usa un event loop con promises, Python usa `asyncio` con coroutines, y Java usa `CompletableFuture` con pools de threads. Esta receta cubre patrones, anti-patrones e implementaciones prácticas en los tres.

## Cuándo usarlo

Usa esta receta cuando:

- Construyendo APIs que manejan cientos de requests concurrentes por proceso
- Obteniendo datos de múltiples servicios que pueden llamarse en paralelo
- Procesando cargas de trabajo I/O-bound como web scraping, uploads de archivos o colas de mensajes
- Implementando features en tiempo real como WebSockets, chat o dashboards en vivo
- Reemplazando modelos de thread-por-request con arquitecturas event-driven para eficiencia

## Solución

### Async/Await con Requests Concurrentes (JavaScript / Node.js)

```javascript
async function fetchUserDashboard(userId) {
  const [profile, orders, recommendations] = await Promise.all([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);
  return { profile, orders, recommendations };
}

async function fetchDashboardResilient(userId) {
  const [profile, orders, recommendations] = await Promise.allSettled([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);

  return {
    profile: profile.status === 'fulfilled' ? profile.value : null,
    orders: orders.status === 'fulfilled' ? orders.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  };
}
```

### Python asyncio con Task Groups

```python
import asyncio
import aiohttp

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_all_urls(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_url(session, url)) for url in urls]
        return [task.result() for task in tasks]

async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(
            *[bounded_fetch(session, url) for url in urls]
        )

urls = ["https://api.example.com/users/1", "https://api.example.com/users/2"]
results = asyncio.run(fetch_all_urls(urls))
```

### Java CompletableFuture Pipeline

```java
import java.util.concurrent.CompletableFuture;

public class AsyncOrderService {
    public CompletableFuture<Order> processOrder(String orderId) {
        return validateOrder(orderId)
            .thenCompose(this::checkInventory)
            .thenCompose(this::processPayment)
            .thenCompose(this::createShipment)
            .exceptionally(ex -> {
                log.error("Order processing failed", ex);
                return Order.failed(orderId, ex.getMessage());
            });
    }

    private CompletableFuture<ValidatedOrder> validateOrder(String orderId) {
        return CompletableFuture.supplyAsync(() -> new ValidatedOrder(orderId));
    }

    public CompletableFuture<Dashboard> loadDashboard(String userId) {
        CompletableFuture<Profile> profileFuture = fetchProfile(userId);
        CompletableFuture<List<Order>> ordersFuture = fetchOrders(userId);
        return profileFuture.thenCombine(ordersFuture, Dashboard::new);
    }
}
```

## Explicación

- **Event loop**: el mecanismo core en JavaScript y Python asyncio. Mantiene una cola de tareas y las ejecuta una a la vez. Cuando una tarea encuentra un `await`, cede control y el loop toma la siguiente tarea. Cuando la operación esperada completa, la tarea se re-programa. Esta concurrencia de single-thread evita el overhead de cambio de threads.
- **Concurrencia estructurada**: en Python 3.11+, `asyncio.TaskGroup` asegura que si alguna tarea hija falla, todas las otras tareas del grupo son canceladas. Esto previene tareas huérfanas en segundo plano que filtran memoria o retienen recursos después de un fallo del padre.
- **Composición de promises**: las promises de JavaScript se encadenan vía `.then()` y `.catch()`. `Promise.all()` espera todas las promises, fallando rápido si alguna rechaza. `Promise.allSettled()` espera todas, retornando tanto éxitos como fallos. `Promise.race()` retorna la primera en completarse.
- **Backpressure con semáforos**: la concurrencia ilimitada agota memoria, file descriptors y cuotas upstream. Un semáforo limita el número de operaciones simultáneas. Con un límite de 10, solo 10 requests HTTP están en vuelo a la vez; el 11° espera hasta que se libere un slot.

## Variantes

| Patrón | Lenguaje | Modelo de concurrencia | Manejo de errores | Mejor para |
|--------|----------|----------------------|-------------------|------------|
| async/await | JS/Python | Event loop | try/catch | APIs I/O-bound |
| CompletableFuture | Java | Thread pool | exceptionally() | Mix CPU + I/O |
| Goroutines | Go | M:N threads | Channels | Servicios de alto throughput |
| RxJS/RxPY | JS/Python | Observables | onError | Streams de eventos |
| Threads | Todos | OS threads | try/catch | Tareas CPU-bound |

## Mejores prácticas

- **Siempre await las promises**: una promise no awaited es una operación fire-and-forget que silenciosamente traga errores. Si una promise rechaza y nada la espera, Node.js emite un warning `unhandledRejection`. En funciones async, siempre `await` o `.catch()` cada promise.
- **Usa Promise.all para independencia, secuencial para dependencias**: si la tarea B necesita el resultado de la tarea A, deben ejecutarse secuencialmente. Si son independientes, usa `Promise.all` o `asyncio.gather` para ejecutarlas concurrentemente. Ejecutar tareas independientes secuencialmente desperdicia tiempo.
- **Establece timeouts en todas las llamadas externas**: una API no responiva puede colgar una operación async indefinidamente. Envuelve cada llamada externa en un timeout (ej. `Promise.race([fetch(), sleep(5000)])`). Esto previene filtración de recursos y asegura latencias predecibles.
- **Prefiere concurrencia estructurada sobre fire-and-forget**: lanzar una tarea en segundo plano que sobrevive a su padre es una fuente común de filtraciones de memoria y condiciones de carrera. Usa task groups, `asyncio.gather` o tokens de cancelación explícitos para asegurar que los lifetimes sean gestionados.
- **Profilea el event loop**: en Node.js, usa `clinic.js` o `0x` para detectar lag del event loop. En Python, usa `asyncio.run` con modo debug. Si el event loop está bloqueado por trabajo CPU, muévelo a un worker thread o process pool.

## Errores comunes

- **Bloquear el event loop**: llamar una lectura de archivo síncrona (`fs.readFileSync`) o una computación pesada dentro de una función async bloquea todo el event loop. Todos los otros requests se detienen. Usa equivalentes async (`fs.promises.readFile`) o descarga trabajo CPU a worker threads.
- **Callback hell sin async/await**: cadenas profundamente anidadas `.then()` son difíciles de leer y debuggear. El JavaScript moderno debería usar `async/await` para todos excepto los casos más simples. Produce código plano y legible que luce síncrono pero se ejecuta asíncronamente.
- **Condiciones de carrera en estado mutable compartido**: dos tareas concurrentes incrementando un contador sin sincronización producen resultados incorrectos. En ambientes async, usa operaciones atómicas, locks o paso de mensajes en lugar de estado mutable compartido.
- **Ignorar backpressure**: aceptar requests más rápido de lo que pueden procesarse lleva a agotamiento de memoria y kills por OOM. Implementa rate limiting, colas acotadas y load shedding. Una respuesta 503 es mejor que un servidor caído.

## Preguntas frecuentes

**P: ¿Es async siempre más rápido que síncrono?**
R: Solo para cargas de trabajo I/O-bound. Para tareas CPU-bound (procesamiento de imágenes, machine learning), async no provee beneficio porque la CPU ya está saturada. Usa threads, procesos o workers dedicados para paralelismo CPU.

**P: ¿Cuántos requests concurrentes puede manejar un proceso Node.js?**
R: Miles, limitados por memoria y file descriptors. El event loop maneja una operación a la vez, pero la mayoría son esperas de I/O. Un servidor Node.js típico maneja 5,000-10,000 conexiones concurrentes.

**P: ¿Cuál es la diferencia entre concurrencia y paralelismo?**
R: La concurrencia es entrelazar tareas en un solo core (async/await). El paralelismo es ejecutar tareas simultáneamente en múltiples cores (threads/procesos). Async provee concurrencia; multiprocessing provee paralelismo. Usa ambos para máximo throughput.

**P: ¿Debería usar threads o async en Python?**
R: Usa `asyncio` para cargas de trabajo I/O-bound con muchas conexiones. Usa `threading` para I/O con bibliotecas bloqueantes que no soportan async. Usa `multiprocessing` para trabajo CPU-bound que debe evadir el GIL. `asyncio` es usualmente la mejor opción para servidores web y clientes de API.

