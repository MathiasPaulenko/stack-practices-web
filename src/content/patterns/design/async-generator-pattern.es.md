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
lastUpdated: "2026-07-04"
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

## Preguntas Frecuentes

### ¿En qué se diferencia un async generator de un generador regular?

Un generador regular (`yield`) produce valores sincronamente. Un async generator (`async yield`) puede hacer await dentro del cuerpo, hacienlo adecuado para fuentes de datos I/O-bound como APIs, bases de datos y archivos.

### ¿Puedo usar async generators con threading?

Los async generators se ejecutan en un solo event loop. Para procesamiento CPU-bound de valores producidos, usa `run_in_executor` (Python) o worker threads (Node.js) para descargar computacion mientras mantienes I/O async.

### ¿Cuál es la diferencia entre async generators y reactive streams?

Los async generators son pull-based: el consumidor pide el siguiente valor. Los reactive streams (RxJS, Project Reactor) son push-based: el productor empuja valores y el consumidor aplica backpressure. Los async generators son mas simples; los reactive streams ofrecen operadores de composicion mas ricos.

### ¿Cómo manejo errores en un async generator?

Las excepciones lanzadas dentro del generador se propagan al consumidor. Envuelve el loop `async for` en `try/except` (Python) o `try/catch` (JavaScript). El generador se cierra automaticamente cuando una excepcion se propaga.

### ¿Los async generators pueden ser infinitos?

Si. Un generador que nunca retorna y sigue produciendo valores es valido. El consumidor controla cuando dejar de iterar. Esto es util para streams continuos como mensajes WebSocket o datos de sensores.
