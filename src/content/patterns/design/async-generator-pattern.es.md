---
contentType: patterns
slug: async-generator-pattern
title: "Patrón Async Generator para Streaming Perezoso"
description: "Transmitir datos de forma perezosa con async generators. Producir valores uno a la vez conforme estén disponibles, habilitando procesamiento eficiente en memoria de secuencias grandes o infinitas."
metaDescription: "Stream datos perezosamente con async generators en Python, JavaScript y Java. Procesá secuencias grandes o infinitas con uso constante de memoria."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - async
  - pattern
  - design-pattern
  - streaming
  - backpressure
  - python
  - javascript
  - java
relatedResources:
  - /patterns/reactive-streams-pattern
  - /patterns/producer-consumer-pattern
  - /patterns/thread-pool-pattern
  - /guides/complete-guide-python-asyncio-production
  - /guides/complete-guide-java-concurrency
  - /guides/complete-guide-go-concurrency
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Stream datos perezosamente con async generators en Python, JavaScript y Java. Procesá secuencias grandes o infinitas con uso constante de memoria."
  keywords:
    - patron async generator
    - iteracion async perezosa
    - streaming datos python
    - patron diseno
---

## Descripción General

Cargar un dataset completo en memoria causa errores de out-of-memory y alta
latencia. El patrón Async Generator produce valores de forma perezosa: el
consumidor pide el siguiente valor y el generador lo produce solo cuando está
listo. Esto permite procesar secuencias infinitas, archivos grandes o fuentes I/O
lentas con uso constante de memoria.

## Cuándo Usar

- Procesar archivos o datasets que no caben en memoria.
- Consumir streams continuos, como mensajes WebSocket, eventos SSE o tail de
  logs.
- Fetch de APIs paginadas a través de una interfaz de iteración limpia.
- Necesitás backpressure: el consumidor controla el ritmo del productor.
- Stream de resultados de base de datos sin cargar el result set completo.

### Cuándo evitarlo

- Procesamiento CPU-bound. Los async generators corren en un solo event loop, así
  que trabajo pesado lo bloquea. Usá worker threads o procesos.
- Composición compleja de streams. Filtrar, mapear, mergear y splitear es más
  fácil con reactive streams como RxJS o Project Reactor.
- La fuente de datos ya está en memoria. Usá un generador regular o un `for`.
- El consumidor necesita acceso aleatorio. Los generadores son secuenciales.

## Solución

### Python

```python
import asyncio
import aiohttp

async def fetch_pages(base_url, total_pages, page_size=100):
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
    async for page in fetch_pages("https://api.example.com/items", 10000):
        for item in page:
            total += item["price"]
        print(f"Processed page, running total: {total}")

    print(f"Final total: {total}")

asyncio.run(process_all())
```

### JavaScript

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

### Java (Stream perezoso)

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.stream.Stream;
import com.fasterxml.jackson.databind.ObjectMapper;

public class LazyStream {

    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    public static Stream<Item[]> fetchPages(String baseUrl, int totalPages, int pageSize) {
        return Stream.iterate(0, offset -> offset < totalPages, offset -> offset + pageSize)
            .map(offset -> {
                try {
                    String url = baseUrl + "?offset=" + offset + "&limit=" + pageSize;
                    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    return mapper.readValue(response.body(), Item[].class);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            })
            .takeWhile(items -> items.length > 0);
    }
}
```

Los Java Streams son perezosos pero no verdaderamente async. Para iteración no
bloqueante async, usá `Flux` de [Project Reactor](https://projectreactor.io/).

## Explicación

Un async generator pausa la ejecución en cada `yield` y se reanuda cuando el
consumidor pide el siguiente valor. El consumidor impulsa el flujo con `async
for` en Python o `for await` en JavaScript. Esto crea un **modelo pull-based**:
los datos se producen solo cuando se piden.

El beneficio principal es **uso constante de memoria**. Ya sean 100 ítems o 10
millones, el generador mantiene solo el valor o batch actual. También provee
**backpressure** natural: si el consumidor es lento, el generador espera.

## Variantes

| Variante | Lenguaje | Caso de uso | Tradeoff |
| --- | --- | --- | --- |
| Async generator | Python `async def` + `yield` | Iteración I/O async nativa | Single event loop |
| Async generator | JavaScript `async function*` | Streams en browser/Node.js | Single event loop |
| `Stream` perezoso | Java `Stream` | I/O secuencial perezosa | Bloqueante por defecto |
| `Flux` | Project Reactor | Streams async con backpressure | Extra dependency |
| Batches | Python/JS `yield` lists | Reducir overhead por ítem | Mayor latencia por batch |

## Mejores Prácticas

- Producí batches en vez de ítems individuales para reducir el overhead de
  context switch.
- Limpiá recursos en bloques `finally` o context managers para que sesiones y
  cursores se cierren aunque el consumidor salga temprano.
- Seteá timeouts en cada I/O `await` para evitar que una llamada colgada bloquee
  el generador.
- Manejá cancelación explícitamente. En Python, `await gen.aclose()`; en
  JavaScript, `gen.return()`.
- Preferí `async for` sobre llamadas manuales a `__anext__` o `.next()`.
- Logueá progreso en generadores de larga duración, pero no en cada yield.
- Usá colas acotadas o producer-consumer cuando necesités procesamiento
  paralelo, porque `asyncio.gather` sobre valores yield rompe el backpressure.

## Errores Comunes

- Juntar todos los valores en una lista con `list(async_generator())`. Carga todo
  en memoria y anula el propósito.
- No cerrar el generador al salir del loop temprano, lo que puede filtrar sesiones
  o conexiones.
- Usar I/O bloqueante dentro del generador, como `requests.get()` en vez de
  `aiohttp`.
- Mezclar iteración sync y async. Usá `async for` / `for await`, no un `for`
  común.
- Ignorar el backpressure pre-fetchando páginas adelante del consumidor.
- Ejecutar trabajo CPU-intensivo dentro del generador y bloquear el event loop.

## FAQ

### ¿En qué se diferencia un async generator de un generador regular?

Un generador regular usa `yield` de forma síncrona. Un async generator usa
`async def` y `yield` y puede hacer `await` de I/O, lo que lo hace adecuado para
APIs, bases de datos y archivos.

### ¿Los async generators pueden ser infinitos?

Sí. Un generador que nunca retorna sigue produciendo. El consumidor controla
cuándo parar con `break` o cerrando el generador. Es útil para mensajes WebSocket
o streams de sensores.

### ¿Cómo cancelo un async generator a mitad de iteración?

En Python, `await gen.aclose()`. En JavaScript, `await gen.return()`. Ambos
ejecutan código de limpieza en bloques `finally`.

### ¿Cuál es la diferencia entre async generators y reactive streams?

Los async generators son pull-based: el consumidor pide cada valor. Los reactive
streams son push-based: el productor empuja valores y el consumidor aplica
backpressure. Los generadores son más simples; los reactive streams ofrecen mayor
composición y buffering.

### ¿Cómo manejo errores dentro del generador?

Las excepciones levantadas en el generador se propagan al consumidor. Envolver el
`async for` en `try/except` o `try/catch`. El generador se cierra automáticamente
al propagarse una excepción.

### ¿Cómo compongo múltiples generadores?

En Python, `yield from another_async_gen()`. En JavaScript, `yield*
anotherAsyncGen()`. Esto encadena generadores preservando el modelo pull-based.

### ¿Cómo testeo async generators?

Consumí el generador con `async for` o `for await` y recolectá una cantidad
pequeña de resultados. Testeá la terminación temprana saliendo del loop y
verificando que los recursos se liberen.
