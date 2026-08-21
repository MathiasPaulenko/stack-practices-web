---
contentType: patterns
slug: pipes-and-filters-pattern
title: "Patrón Pipes and Filters"
description: "Encadena pasos de procesamiento con filtros independientes conectados por pipes. Un patrón para pipelines de transformación de datos donde cada paso es reutilizable y componible."
metaDescription: "Aprende el patrón Pipes and Filters en Python, Java y JavaScript. Encadena pasos de procesamiento independientes con pipelines de transformación de datos."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - design-pattern
  - pipeline
  - data-processing
  - composability
  - python
  - javascript
  - java
relatedResources:
  - /patterns/chain-of-responsibility-pattern
  - /patterns/observer-pattern
  - /patterns/back-pressure-pattern
  - /patterns/marker-interface-pattern
  - /guides/complete-guide-kafka-stream-processing
  - /patterns/static-content-hosting-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende el patrón Pipes and Filters en Python, Java y JavaScript. Encadena pasos de procesamiento independientes con pipelines de transformación de datos."
  keywords:
    - pipes and filters pattern
    - design pattern
    - pipeline pattern
    - data transformation
    - composable filters
    - python pipeline
    - java pipeline
    - javascript pipeline
---

## Resumen

El [patrón Pipes and Filters](/es/patterns/pipes-and-filters-pattern/) divide una tarea de
procesamiento compleja en una secuencia de pasos pequeños e independientes (filtros) conectados
por canales (pipes). Cada filtro recibe input, realiza una transformación y pasa output al
siguiente pipe. Los filtros son reutilizables, componibles y testeables en aislamiento. Este patrón
es ideal para pipelines de procesamiento de datos, flujos ETL y cadenas de transformación de
requests/responses.

## Cuándo Usarlo

- Una tarea compleja se puede dividir en pasos secuenciales e independientes.
- Necesitás reordenar, agregar o remover pasos de procesamiento sin reescribir código.
- Los pasos son reutilizables en distintos pipelines.
- Querés testear cada transformación en aislamiento.
- Estás construyendo pipelines ETL, procesamiento de datos o transformación de requests/responses.

## Cuándo NO Usarlo

- Una secuencia fija de 2-3 pasos simples que nunca cambia — una función simple alcanza.
- Los pasos están fuertemente acoplados y no se pueden separar en inputs y outputs limpios.
- Necesitás que un handler decida si detener el procesamiento — [Chain of
  Responsibility](/es/patterns/chain-of-responsibility-pattern/) se ajusta mejor.

## Solución

### Python

```python
from typing import Callable, Any
from dataclasses import dataclass

Filter = Callable[[Any], Any]

def pipe(*filters: Filter) -> Filter:
    def pipeline(data: Any) -> Any:
        result = data
        for f in filters:
            result = f(result)
        return result
    return pipeline

# Filters — each is a pure function
def parse_csv(raw: str) -> list[dict]:
    lines = raw.strip().split("\n")
    headers = lines[0].split(",")
    return [
        dict(zip(headers, line.split(",")))
        for line in lines[1:]
    ]

def filter_active(records: list[dict]) -> list[dict]:
    return [r for r in records if r.get("status") == "active"]

def normalize_emails(records: list[dict]) -> list[dict]:
    for r in records:
        r["email"] = r.get("email", "").lower().strip()
    return records

def deduplicate(records: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for r in records:
        key = r.get("email")
        if key not in seen:
            seen.add(key)
            result.append(r)
    return result

def to_json(records: list[dict]) -> str:
    import json
    return json.dumps(records, indent=2)

# Compose a pipeline
process_users = pipe(
    parse_csv,
    filter_active,
    normalize_emails,
    deduplicate,
    to_json,
)

# Usage
raw_data = """name,email,status
Alice,ALICE@Example.COM,active
Bob,bob@example.com,inactive
Charlie,CHARLIE@example.com,active
Alice,alice@example.com,active"""

result = process_users(raw_data)
print(result)
```

### JavaScript

```javascript
function pipe(...filters) {
    return (data) => filters.reduce((acc, fn) => fn(acc), data);
}

// Filters — each is a pure function
function parseCsv(raw) {
    const lines = raw.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
        const values = line.split(",");
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
}

function filterActive(records) {
    return records.filter((r) => r.status === "active");
}

function normalizeEmails(records) {
    return records.map((r) => ({
        ...r,
        email: (r.email || "").toLowerCase().trim(),
    }));
}

function deduplicate(records) {
    const seen = new Set();
    return records.filter((r) => {
        if (seen.has(r.email)) return false;
        seen.add(r.email);
        return true;
    });
}

function toJson(records) {
    return JSON.stringify(records, null, 2);
}

// Compose a pipeline
const processUsers = pipe(
    parseCsv,
    filterActive,
    normalizeEmails,
    deduplicate,
    toJson
);

// Usage
const rawData = `name,email,status
Alice,ALICE@Example.COM,active
Bob,bob@example.com,inactive
Charlie,CHARLIE@example.com,active
Alice,alice@example.com,active`;

console.log(processUsers(rawData));
```

### Java

```java
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class PipesAndFilters {

    @FunctionalInterface
    interface Filter<T, R> extends Function<T, R> {}

    static <T> Filter<T, T> pipe(Filter<T, T>... filters) {
        return data -> {
            T result = data;
            for (Filter<T, T> f : filters) {
                result = f.apply(result);
            }
            return result;
        };
    }

    // Filters
    static Filter<String, List<Map<String, String>>> parseCsv = raw -> {
        String[] lines = raw.trim().split("\n");
        String[] headers = lines[0].split(",");
        return Arrays.stream(lines, 1, lines.length)
            .map(line -> {
                String[] values = line.split(",");
                Map<String, String> record = new LinkedHashMap<>();
                for (int i = 0; i < headers.length; i++) {
                    record.put(headers[i], values[i]);
                }
                return record;
            })
            .collect(Collectors.toList());
    };

    static Filter<List<Map<String, String>>, List<Map<String, String>>> filterActive =
        records -> records.stream()
            .filter(r -> "active".equals(r.get("status")))
            .collect(Collectors.toList());

    static Filter<List<Map<String, String>>, List<Map<String, String>>> normalizeEmails =
        records -> records.stream()
            .map(r -> {
                r.put("email", r.get("email").toLowerCase().trim());
                return r;
            })
            .collect(Collectors.toList());

    static Filter<List<Map<String, String>>, List<Map<String, String>>> deduplicate =
        records -> {
            Set<String> seen = new HashSet<>();
            return records.stream()
                .filter(r -> seen.add(r.get("email")))
                .collect(Collectors.toList());
        };

    public static void main(String[] args) {
        String rawData = "name,email,status\n" +
            "Alice,ALICE@Example.COM,active\n" +
            "Bob,bob@example.com,inactive\n" +
            "Charlie,CHARLIE@example.com,active";

        var pipeline = pipe(parseCsv, filterActive, normalizeEmails, deduplicate);

        List<Map<String, String>> result = pipeline.apply(rawData);
        result.forEach(System.out::println);
    }
}
```

### Pipeline async (Python)

```python
import asyncio
from typing import Any, Callable, Awaitable

AsyncFilter = Callable[[Any], Awaitable[Any]]

async def async_pipe(*filters: AsyncFilter) -> AsyncFilter:
    async def pipeline(data: Any) -> Any:
        result = data
        for f in filters:
            result = await f(result)
        return result
    return pipeline

async def fetch_data(url: str) -> dict:
    await asyncio.sleep(0.1)  # simulate HTTP
    return {"url": url, "status": 200, "body": "raw data"}

async def parse_data(raw: dict) -> dict:
    await asyncio.sleep(0.05)
    raw["parsed"] = raw["body"].upper()
    return raw

async def validate_data(data: dict) -> dict:
    await asyncio.sleep(0.05)
    if data["status"] != 200:
        raise ValueError(f"Bad status: {data['status']}")
    data["valid"] = True
    return data

async def enrich_data(data: dict) -> dict:
    await asyncio.sleep(0.05)
    data["enriched"] = f"ENRICHED:{data['parsed']}"
    return data

async def main():
    pipeline = await async_pipe(fetch_data, parse_data, validate_data, enrich_data)
    result = await pipeline("https://api.example.com/data")
    print(result)

asyncio.run(main())
```

## Explicación

El patrón Pipes and Filters descompone el procesamiento en componentes independientes:

- **Filter**: un paso de procesamiento que recibe input, lo transforma y produce output. Los
  mejores filtros son funciones puras sin side effects.
- **Pipe**: el conector entre filtros. En su forma más simple, es composición de funciones. En
  sistemas más complejos, puede ser una queue, canal o stream.
- **Pipeline**: una secuencia de filtros conectados por pipes. Un pipeline es a su vez un filtro,
  así que puede componerse en pipelines más grandes.
- **Composability**: los filtros pueden reordenarse, agregarse o removerse. Nuevos pipelines se
  construyen combinando filtros existentes en distintos ordenes.

## Variantes

| Variante | Ejecución | Caso de uso |
| --- | --- | --- |
| Pipeline sincrónico | Secuencial, bloqueante | Transformación simple de datos |
| Pipeline async | No bloqueante, concurrente | Procesamiento I/O-bound (HTTP, DB) |
| Pipeline paralelo | Filtros corren en paralelo | Transformaciones CPU-bound |
| Pipeline streaming | Event-driven, continuo | Streams de datos en tiempo real |
| Pipeline batch | Procesa en chunks | ETL, procesamiento de datos programado |

Para streaming en tiempo real, cuidado con filtros lentos. El [patrón Back
Pressure](/es/patterns/back-pressure-pattern/) muestra cómo evitar que productores rápidos
saturen consumidores lentos.

## Buenas Prácticas

- Mantené los filtros puros — sin side effects ni estado mutable compartido. Así son testeables y
  componibles.
- Hacé que cada filtro tenga una sola responsabilidad — cada uno realiza una transformación.
- Usá firmas de tipos — los tipos de input y output documentan el contrato.
- Manejá errores a nivel de pipeline — envolvé el pipeline en manejo de errores en vez de cada
  filtro.
- Agregá filtros condicionalmente — usá un builder o configuración para construir pipelines
  dinámicamente.
- Testeá los filtros en aislamiento — las funciones puras son fáciles de testear unitariamente.
- Logueá entre filtros — insertá filtros de logging para debugging sin modificar filtros de
  procesamiento.

## Errores Comunes

- Hacer filtros stateful — rompe la composabilidad y dificulta los tests.
- Filtros con side effects (escribir en DB, llamar APIs) — hace el pipeline no determinista.
- No manejar errores — un fallo en un filtro puede romper todo el pipeline.
- Hardcodear el orden de filtros — usá un builder o configuración para permitir reordenar.
- Filtros que hacen demasiado — un filtro debería hacer una transformación.
- No tipar inputs/outputs de filtros — los errores de tipo en runtime son difíciles de debuggear.
- Ignorar backpressure en pipelines streaming — filtros lentos causan acumulación de memoria en
  pipes.

## Preguntas Frecuentes

### ¿En qué se diferencia de Chain of Responsibility?

En Chain of Responsibility, cada handler decide si pasa el request o se detiene. En Pipes and
Filters, cada filtro procesa los datos y los pasa al siguiente. Pipes and Filters es sobre
transformación; Chain of Responsibility es sobre manejo. Consultá [Chain of Responsibility
Pattern](/es/patterns/chain-of-responsibility-pattern/) para la diferencia.

### ¿Uso esto o una función simple?

Usá Pipes and Filters cuando necesites reordenar pasos, reutilizar filtros en distintos pipelines
o testear pasos en aislamiento. Para una secuencia fija de dos o tres pasos que nunca cambia, una
función simple alcanza.

### ¿Cómo manejo branching en un pipeline?

Usá un router filter que envíe datos a distintos sub-pipelines según una condición. El router es
a su vez un filtro — recibe input, evalúa una condición y rutea al sub-pipeline adecuado.

### ¿Cómo manejo errores en un pipeline?

Envolvé el pipeline completo en un try/catch o usá un tipo resultado (por ejemplo, `Result<T,
E>`). Dejá que el caller decida cómo manejar un paso fallido. Evitá capturar errores dentro de
filtros individuales para no ocultar fallas.

### ¿Cuándo uso un pipeline async o paralelo?

Usá un pipeline async cuando los filtros esperan I/O. Usá uno paralelo cuando los filtros son
CPU-bound y pueden correr independientemente. Para streams en tiempo real, usá un pipeline
streaming con manejo de backpressure.
