---
contentType: patterns
slug: async-generator-pattern
title: "Patrón Async Generator"
description: "Transmitir datos de forma perezosa con async generators. Producir valores uno a la vez conforme estan disponibles, habilitando procesamiento eficiente en memoria de secuencias grandes o infinitas."
metaDescription: "Transmitir datos perezosamente con async generators. Producir valores conforme llegan, habilitando procesamiento eficiente en memoria de secuencias grandes o infinitas."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - async-generator
  - patron
  - patron-diseno
  - streaming
  - lazy-evaluation
  - async-iteration
  - backpressure
relatedResources:
  - /patterns/design/reactive-streams-pattern
  - /patterns/design/producer-consumer-pattern
  - /patterns/design/thread-pool-pattern
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Transmitir datos perezosamente con async generators. Producir valores conforme llegan, habilitando procesamiento eficiente en memoria de secuencias grandes o infinitas."
  keywords:
    - patron async generator
    - iteracion async perezosa
    - streaming datos python
    - patron diseno
---

## Descripción General

Procesar datasets grandes o streams continuos cargando todo en memoria causa errores de OOM y alta latencia. El patron Async Generator produce valores de forma perezosa: el consumidor pide el siguiente valor y el generador lo produce solo cuando esta listo. Esto habilita el procesamiento de secuencias infinitas, archivos grandes o fuentes I/O lentas con uso constante de memoria.

## Cuándo Usar

- Procesamiento de archivos o datasets grandes que no caben en memoria
- Consumo de streams continuos (mensajes WebSocket, eventos SSE, tail de logs)
- Fetch de APIs paginadas donde quieres una interfaz de iteracion limpia
- Necesitas backpressure: el consumidor controla el ritmo de produccion
- Streaming de resultados de consulta de base de datos sin cargar todo el result set
- Procesar streams de eventos en tiempo real de dispositivos IoT o sensores
- Quieres una alternativa mas simple a reactive streams para iteracion async basica

## Cuándo Evitar

- **Procesamiento de datos CPU-bound.** Los async generators se ejecutan en un solo event loop. Trabajo CPU-heavy bloquea el loop. Usa threads o procesos.
- **Necesitas composicion compleja de streams.** Filtrar, mapear, mergear y splitear streams es mas facil con reactive streams (RxJS, Project Reactor).
- **La fuente de datos ya esta en memoria.** Si tienes un array, un generador regular o loop `for` es mas simple y rapido.
- **Necesitas entrega push-based.** Si el productor debe empujar datos al consumidor inmediatamente (ej., alertas en tiempo real), usa callbacks o reactive streams.
- **El consumidor necesita acceso aleatorio.** Los generadores son secuenciales — no puedes saltar adelante o atras. Usa un array o estructura de datos indexada.

## Solución

### Python (async generators)

```python
import asyncio
import aiohttp

async def fetch_pages(base_url, total_pages, page_size=100):
    """Async generator que produce paginas perezosamente."""
    async with aiohttp.ClientSession() as session:
        for offset in range(0, total_pages, page_size):
            url = f"{base_url}?offset={offset}&limit={page_size}"
            async with session.get(url) as response:
                data = await response.json()
                if not data:
                    break
                yield data

async def process_all():
    total = 0
    # El consumidor controla el ritmo: cada pagina se fetch solo al iterar
    async for page in fetch_pages("https://api.example.com/items", 10000):
        for item in page:
            total += item["price"]
        print(f"Processed page, running total: {total}")

    print(f"Final total: {total}")

asyncio.run(process_all())
```

### JavaScript (async generators)

```javascript
async function* fetchPages(baseUrl, totalPages, pageSize = 100) {
  for (let offset = 0; offset < totalPages; offset += pageSize) {
    const url = `${baseUrl}?offset=${offset}&limit=${pageSize}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.length === 0) break;
    yield data;
  }
}

async function processAll() {
  let total = 0;
  // El consumidor controla el ritmo: cada pagina se fetch solo al iterar
  for await (const page of fetchPages("https://api.example.com/items", 10000)) {
    for (const item of page) {
      total += item.price;
    }
    console.log(`Processed page, running total: ${total}`);
  }
  console.log(`Final total: ${total}`);
}

processAll();
```

### Java (Stream + reactive)

```java
import java.util.stream.Stream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.URI;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

public class AsyncGeneratorExample {

    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    // Stream perezoso que fetch paginas bajo demanda
    static Stream<Item[]> fetchPages(String baseUrl, int totalPages, int pageSize) {
        return Stream.iterate(0, offset -> offset < totalPages, offset -> offset + pageSize)
            .map(offset -> {
                try {
                    String url = baseUrl + "?offset=" + offset + "&limit=" + pageSize;
                    HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .build();
                    HttpResponse<String> response = client.send(
                        request, HttpResponse.BodyHandlers.ofString()
                    );
                    return mapper.readValue(response.body(), Item[].class);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            })
            .takeWhile(items -> items.length > 0);
    }

    public static void main(String[] args) {
        double total = fetchPages("https://api.example.com/items", 10000, 100)
            .flatMap(Stream::of)
            .mapToDouble(Item::getPrice)
            .peek(item -> System.out.println("Processing item: " + item.getId()))
            .sum();

        System.out.println("Final total: " + total);
    }
}
```

## Explicación

Un async generator es una funcion que puede pausar la ejecucion y producir valores uno a la vez. Cuando el consumidor pide el siguiente valor (via `async for` en Python, `for await` en JavaScript), el generador reanuda la ejecucion, produce el siguiente valor, y se pausa de nuevo.

Esto crea un modelo basado en pull: el consumidor pide datos, y el generador los produce bajo demanda. El beneficio clave es **uso constante de memoria** independientemente del tamano total de los datos. Ya sea que proceses 100 items o 10 millones, el generador solo mantiene una pagina en memoria a la vez.

El patron tambien proporciona **backpressure** natural. Si el consumidor es lento, simplemente no pide el siguiente valor. El generador espera. Sin buffering, sin presion de memoria, sin datos perdidos.

## Variantes

| Variante | Lenguaje | Caso de Uso | Compromiso |
|----------|----------|-------------|------------|
| **Python async generator** | Python `async def` + `yield` | Iteracion async nativa | Event loop de un solo thread |
| **JS async generator** | JS `async function*` | Streams browser/Node.js | Event loop de un solo thread |
| **Java Stream (perezoso)** | Java `Stream` | Procesamiento secuencial perezoso | No es realmente async, I/O bloqueante |
| **Reactive Flux** | Project Reactor | Streams con backpressure | Curva de aprendizaje mas pronunciada |
| **Async generator por lotes** | Produce lotes | Reducir overhead por item | Mayor latencia por item |

## Qué Funciona

- Produce lotes en lugar de items individuales para reducir overhead por item
- Siempre limpia recursos (cierra sesiones, file handles) en `finally` o context managers
- Usa `asyncio.aclose()` / `return()` para cerrar generadores cuando terminas temprano
- Maneja cancelacion: verifica `CancelledError` y limpia gracefully
- Establece timeouts en operaciones I/O dentro del generador para evitar colgados
- Combina con `asyncio.gather` para procesamiento concurrente de valores producidos
- Registra progreso periodicamente para generadores de larga duracion

## Errores Comunes

- **Coleccionar todos los valores en una lista**: `list(async_generator())` carga todo en memoria, derrotando el proposito. Procesa valores al iterar.
- **No cerrar el generador**: Si sales de un async for loop temprano, el generador queda suspendido. Usa `aclose()` para limpiar.
- **I/O bloqueante dentro del generador**: Usar `requests.get()` en lugar de `aiohttp` bloquea el event loop. Usa librerias I/O async.
- **Sin timeout en operaciones producidas**: Una llamada API lenta cuelga el generador para siempre. Establece timeouts.
- **Mezclar iteracion sync y async**: Usar `for item in async_gen` en lugar de `async for item in async_gen` lanza TypeError.
- **Ignorar senales de backpressure**: Si el consumidor es lento, el generador no deberia pre-fetchear. Deja que el modelo pull funcione.

## Como Funciona

1. **El consumidor pide el siguiente valor**: El consumidor llama `__anext__()` (Python) o `.next()` (JavaScript) en el objeto async generator. Esto reanuda la ejecucion del generador.
2. **El generador corre hasta el siguiente yield**: El generador ejecuta su cuerpo, realizando operaciones I/O awaited. Cuando llega a un `yield`, se pausa y retorna el valor al consumidor.
3. **El consumidor procesa el valor**: El consumidor maneja el valor — lo transforma, lo escribe, acumula un resultado. El generador permanece pausado, manteniendo estado minimo.
4. **Repetir o detener**: El consumidor pide el siguiente valor, o detiene la iteracion (via `break`, `aclose()`, o `return()`). Cuando la funcion generadora retorna, `StopAsyncIteration` senala el final.

Este modelo pull-based significa que el generador nunca produce datos mas rapido de lo que el consumidor puede manejar. El uso de memoria se mantiene constante independientemente del volumen de datos.

## Mejores Practicas

- **Produce lotes, no items individuales.** Si obtienes 100 items por pagina de API, produce los 100 como una lista. Esto reduce el numero de context switches async y mejora el throughput.
- **Usa context managers para limpieza de recursos.** Envuelve sesiones HTTP, conexiones de base de datos y file handles en bloques `async with`. Esto garantiza limpieza incluso si el consumidor sale temprano.
- **Establece timeouts por operacion.** Cada `await` dentro del generador debe tener un timeout. Una llamada API colgada bloquea todo el generador y al consumidor.
- **Maneja `CancelledError` explicitamente.** Si el consumidor cancela el generador, captura `CancelledError`, limpia recursos, y re-lanza. No tragues la cancelacion.
- **Prefiere `async for` sobre llamadas manuales `__anext__`.** El loop `async for` maneja `StopAsyncIteration` automaticamente y es mas legible.

## Ejemplos del Mundo Real

### Consumo de API Paginada (Python)

Un pipeline de datos obtiene millones de registros de una API REST con paginacion. Un async generator produce una pagina a la vez. El consumidor escribe cada pagina a una base de datos. La memoria se mantiene plana en ~tamano de una pagina independientemente del total de registros. Sin async generators, el pipeline necesitaria cargar todas las paginas en memoria o usar patrones complejos de callbacks.

### Procesamiento de Server-Sent Events (JavaScript)

Una app de navegador se conecta a un endpoint Server-Sent Events. Un async generator envuelve el EventSource, produciendo cada evento conforme llega. La UI se actualiza incrementalmente. El generador maneja logica de reconexion internamente, transparente al consumidor.

### Procesamiento de Stream de Logs (Node.js)

Un servicio de analitica de logs tail archivos de log usando `fs.createReadStream` envuelto en un async generator. Cada chunk producido se parsea y envia a un backend de analitica. El generador aplica backpressure natural — solo lee mas datos cuando el backend de analitica esta listo para el siguiente chunk.

## Preguntas Frecuentes

**P: En que se diferencia un async generator de un generador regular?**
R: Un generador regular (`yield`) produce valores sincronamente. Un async generator (`async yield`) puede hacer await dentro del cuerpo, hacienlo adecuado para fuentes de datos I/O-bound como APIs, bases de datos y archivos.

**P: Puedo usar async generators con threading?**
R: Los async generators se ejecutan en un solo event loop. Para procesamiento CPU-bound de valores producidos, usa `run_in_executor` (Python) o worker threads (Node.js) para descargar computacion mientras mantienes I/O async.

**P: Cual es la diferencia entre async generators y reactive streams?**
R: Los async generators son pull-based: el consumidor pide el siguiente valor. Los reactive streams (RxJS, Project Reactor) son push-based: el productor empuja valores y el consumidor aplica backpressure. Los async generators son mas simples; los reactive streams ofrecen operadores de composicion mas ricos.

**P: Como manejo errores en un async generator?**
R: Las excepciones lanzadas dentro del generador se propagan al consumidor. Envuelve el loop `async for` en `try/except` (Python) o `try/catch` (JavaScript). El generador se cierra automaticamente cuando una excepcion se propaga.

**P: Los async generators pueden ser infinitos?**
R: Si. Un generador que nunca retorna y sigue produciendo valores es valido. El consumidor controla cuando dejar de iterar. Esto es util para streams continuos como mensajes WebSocket o datos de sensores.

**P: Como compongo multiples async generators?**
R: Encadenalos con `yield*` (Python) o `yield*` (JavaScript). Crea un generador que itera otro generador y transforma cada valor. Esto es el equivalente async de composicion de funciones. Para pipelines complejos, considera reactive streams.

**P: Cual es el overhead de memoria de un async generator?**
R: Minimal. El objeto generador mantiene su estado de ejecucion (variables locales, puntero de instruccion) — tipicamente unos cientos de bytes. Cada valor producido se mantiene solo hasta que el consumidor lo procesa. Sin acumulacion a menos que el consumidor coleccione valores.

**P: Como cancelo un async generator a mitad de iteracion?**
R: En Python, usa `await gen.aclose()`. En JavaScript, llama `gen.return()`. Ambos limpian recursos y cierran el generador. Si sales de un loop `for await`, llama `return()` explicitamente para evitar fugas de recursos.

**P: Puedo paralelizar el consumo de async generators?**
R: Si, pero con cuidado. Usa `asyncio.gather` para procesar multiples valores producidos concurrentemente. Sin embargo, esto rompe el modelo pull-based de backpressure — estas bufferizando valores. Para procesamiento paralelo real, usa un patron producer-consumer con una cola acotada.

**P: Como funcionan los async generators con cursores de base de datos?**
R: Envuelve el cursor en un async generator. Cada `yield` obtiene un lote del cursor. Esto streams grandes conjuntos de resultados sin cargar todo en memoria. Cierra el cursor en un bloque `finally` o context manager.

**P: Cual es la diferencia entre async generators y Node.js streams?**
R: Los streams de Node.js son push-based con backpressure via `pipe()`. Los async generators son pull-based. Los streams de Node.js tienen mas features integradas (encoding, object mode, flushing). Los async generators son mas simples y componibles. En Node.js moderno, `stream.Readable.from(asyncGenerator)` une ambos.

**P: Como testeo async generators?**
R: Itera el generador en un test y colecciona resultados. Usa `async for` (Python) o `for await` (JavaScript) para consumir todos los valores. Testea casos de error lanzando dentro del generador y verificando que la excepcion se propaga. Testea terminacion temprana saliendo del loop y verificando que los recursos se limpian.

**P: Puedo usar async generators con GraphQL subscriptions?**
R: Si. Las subscriptions de GraphQL retornan async iterables. Un async generator puede producir eventos de subscription conforme llegan. Apollo Server soporta async iterators para subscriptions nativamente.

**P: Como interactuan los async generators con concurrencia estructurada?**
R: En Python 3.11+, `asyncio.TaskGroup` maneja tareas concurrentes. Puedes spawnear una tarea que consume un async generator dentro de un task group. Si el generador lanza una excepcion, el task group cancela otras tareas. Esto proporciona manejo de errores estructurado para pipelines async.

**P: Puedo usar async generators para subida de archivos?**
R: Si. Envuelve el stream de subida en un async generator que produce chunks. El consumidor escribe chunks a almacenamiento (S3, disco local). Esto maneja subidas grandes sin bufferizar el archivo entero en memoria. Express.js y FastAPI soportan este patron para subidas multipart.

**P: Como manejo rate limiting dentro de un async generator?**
R: Rastrea el tiempo de la ultima llamada API. Antes de cada `yield`, verifica si ha pasado suficiente tiempo. Si no, `await asyncio.sleep(tiempo_restante)`. Esto implementa rate limiting del lado del cliente sin bufferizar. Para rate limiting con token bucket, usa un contador compartido.

**P: Que es `aclose()` y cuando deberia usarlo?**
R: `aclose()` es el equivalente async de `close()` para generadores regulares. Lanza `GeneratorExit` dentro del generador, disparando cualquier bloque `finally` para limpieza. Usalo cuando sales de un loop `async for` temprano, o cuando quieres cancelar un generador que esta esperando I/O.

**P: Puedo usar async generators con `asyncio.Queue` de Python?**
R: Si. Un generador puede producir valores de un `asyncio.Queue`: `while True: yield await queue.get()`. Esto combina el modelo pull-based del generador con insercion push-based de la cola. El productor empuja a la cola, el consumidor tira via el generador.

**P: Como debuggeo un async generator que se cuelga?**
R: Agrega logging antes de cada `await` y `yield`. Establece timeouts en todas las operaciones I/O. Usa `asyncio.get_event_loop().debug = True` para habilitar modo debug, que loggea callbacks lentos. Verifica I/O bloqueante — `requests.get()` en lugar de `aiohttp` es la causa mas comun.

**P: Los async generators estan soportados en todos los navegadores?**
R: La iteracion async (`for await...of`) esta soportada en todos los navegadores modernos (Chrome 63+, Firefox 57+, Safari 11+). Para navegadores antiguos, usa Babel con `@babel/plugin-proposal-async-iteration` para transpilar a ES5 con regenerator runtime.

**P: Como manejan los async generators el backpressure comparado con Node.js streams?**
R: Los async generators tienen backpressure natural: el consumidor tira valores a su propio ritmo, por lo que el generador nunca supera al consumidor. Los streams de Node.js usan un modelo push con `highWaterMark` — el productor empuja hasta que el buffer se llena, luego espera `drain`. Los async generators son mas simples pero carecen de la maquinaria de bufferizado y piping de los streams de Node.js.

**P: Puedo usar async generators con `asyncio.timeout` de Python?**
R: Si, en Python 3.11+ usa `async with asyncio.timeout(seconds)` alrededor del loop `async for`. Esto cancela el generador si tarda demasiado. Para versiones anteriores de Python, usa `asyncio.wait_for` para envolver cada iteracion. El generador recibe `CancelledError` y puede limpiar recursos en un bloque `finally`.

**P: Como compongo async generators con `yield from`?**
R: En Python, `yield from` delega a un sub-generador: `yield from otro_async_gen()`. Esto encadena generadores sin iteracion manual. En JavaScript, usa `yield*` con `async function*`: `yield* otroAsyncGen()`. Es util para envolver un generador con logging o logica de transformacion preservando el modelo pull-based.
