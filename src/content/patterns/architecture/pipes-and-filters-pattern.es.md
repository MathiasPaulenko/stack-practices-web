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
  - pipes-and-filters
  - pattern
  - design-pattern
  - pipeline
  - data-transformation
  - composable
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/observer-pattern
  - /patterns/design/back-pressure-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
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

# Patrón Pipes and Filters

## Visión General

El patrón [Pipes and Filters](/patterns/architecture/pipes-and-filters-pattern) descompone una tarea de procesamiento compleja en una secuencia de pasos más pequeños e independientes (filtros) conectados por canales (pipes). Cada filtro recibe input, realiza una transformación y pasa el output al siguiente pipe. Los filtros son reutilizables, componibles y testeables en aislamiento. Este patrón es ideal para pipelines de procesamiento de datos, workflows ETL y cadenas de transformación de peticiones.

## Cuándo Usar

Usar el patrón Pipes and Filters cuando:
- Una tarea compleja puede descomponerse en pasos secuenciales e independientes
- Necesitas reordenar, añadir o remover pasos de procesamiento sin reescribir código
- Los pasos son reutilizables across diferentes pipelines
- Quieres testear cada transformación en aislamiento
- Estás construyendo ETL, procesamiento de datos o pipelines de transformación request/response

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

# Filtros — cada uno es una función pura
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

# Componer un pipeline
process_users = pipe(
    parse_csv,
    filter_active,
    normalize_emails,
    deduplicate,
    to_json,
)

# Uso
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

// Filtros — cada uno es una función pura
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

// Componer un pipeline
const processUsers = pipe(
    parseCsv,
    filterActive,
    normalizeEmails,
    deduplicate,
    toJson
);

// Uso
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

    // Filtros
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

### Pipeline Async (Python)

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
    await asyncio.sleep(0.1)  # simular HTTP
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

- **Filter**: Un paso de procesamiento que recibe input, lo transforma y produce output. Los filtros son funciones puras — sin side effects, sin estado compartido.
- **Pipe**: El conector entre filtros. En su forma más simple, es composición de funciones. En sistemas más complejos, puede ser una queue, channel o stream.
- **Pipeline**: Una secuencia de filtros conectados por pipes. El pipeline es en sí mismo un filtro — puede componerse en pipelines más grandes.
- **Composabilidad**: Los filtros pueden reordenarse, añadirse o removerse. Nuevos pipelines pueden construirse combinando filtros existentes en diferentes órdenes.

## Variantes

| Variante | Ejecución | Caso de Uso |
|---------|-----------|----------|
| **Pipeline Síncrono** | Secuencial, bloqueante | Transformación de datos simple |
| **Pipeline Async** | Non-blocking, concurrente | Procesamiento I/O-bound (HTTP, DB) |
| **Pipeline Paralelo** | Filtros corren en paralelo | Transformaciones CPU-bound |
| **Pipeline Streaming** | Event-driven, continuo | Streams de datos en tiempo real |
| **Pipeline Batch** | Procesar en chunks | ETL, procesamiento de datos programado |

## Pautas

- **Mantener filtros puros** — sin side effects, sin estado mutable compartido. Esto los hace testeables y componibles.
- **Hacer filtros single-responsibility** — cada filtro hace una transformación. Filtros pequeños son más fáciles de reutilizar.
- **Usar type signatures** — los tipos de input y output documentan el contrato. Los mismatches se detectan al componer.
- **Manejar errores a nivel pipeline** — envolver el pipeline en error handling, no cada filtro.
- **Añadir filtros condicionalmente** — usar un builder pattern para construir pipelines dinámicamente basado en configuración.
- **Testear filtros en aislamiento** — cada filtro es una función pura, así que unit testing es trivial.
- **Loguear entre filtros** — insertar filtros de logging para debugging sin modificar filtros de procesamiento.

## Errores Comunes

- Hacer filtros stateful — rompe composabilidad y hace testing más difícil
- Filtros con side effects (escribir a DB, llamar APIs) — viola pureza, hace el pipeline non-deterministic
- No manejar errores — el fallo de un filtro crashea todo el pipeline sin recovery
- Hardcodear el orden de filtros — usar un builder o configuración para permitir reordenamiento
- Filtros que hacen demasiado — un filtro debería hacer una transformación, no cinco
- No tipar inputs/outputs de filtros — errores runtime por type mismatches son difíciles de debuggear
- Ignorar backpressure en pipelines streaming — filtros lentos causan memory buildup en pipes

## Preguntas Frecuentes

**P: ¿En qué se diferencia de Chain of Responsibility?**
R: En Chain of Responsibility, cada handler decide si pasar la petición o detenerla. En Pipes and Filters, cada filtro procesa los datos y los pasa al siguiente. Pipes and Filters trata sobre transformación; Chain of Responsibility trata sobre handling.

**P: ¿Debo usar esto o una función simple?**
R: Usar Pipes and Filters cuando necesitas reordenar pasos, reutilizar filtros across pipelines, o testear pasos en aislamiento. Para una secuencia fija de 2-3 pasos que nunca cambia, una función simple es más simple y suficiente.

**P: ¿Cómo manejo branching en un pipeline?**
R: Usar un router filter que envía datos a diferentes sub-pipelines basado en una condición. El router es en sí mismo un filtro — recibe input, evalúa una condición y rutear al sub-pipeline apropiado.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
