---
contentType: recipes
slug: python-async-gather-concurrent-requests
title: "Peticiones HTTP concurrentes con asyncio.gather y aiohttp"
description: "Obten multiples endpoints HTTP concurrentemente usando asyncio.gather y aiohttp con manejo de errores, rate limiting, timeouts y connection pooling para 10x throughput"
metaDescription: "Haz peticiones HTTP concurrentes con asyncio.gather y aiohttp. Maneja errores, establece timeouts, limita concurrencia con semaforos y reutiliza conexiones."
difficulty: intermediate
topics:
  - performance
  - concurrency
tags:
  - python
  - asyncio
  - aiohttp
  - concurrent requests
  - performance
relatedResources:
  - /recipes/security/python-rate-limiting-fastapi-redis
  - /recipes/ai/python-llm-streaming-responses
  - /recipes/caching/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Haz peticiones HTTP concurrentes con asyncio.gather y aiohttp. Maneja errores, establece timeouts, limita concurrencia con semaforos y reutiliza conexiones."
  keywords:
    - asyncio gather
    - aiohttp concurrent
    - python async http
    - concurrent requests python
    - async performance
---

# Peticiones HTTP concurrentes con asyncio.gather y aiohttp

Las peticiones HTTP secuenciales son lentas — obtener 100 endpoints uno por uno toma 100x la latencia de una sola peticion. `asyncio.gather` ejecuta peticiones concurrentemente, reduciendo el tiempo total a la peticion mas lenta. A continuacion: fetching concurrente con `aiohttp`, manejo de errores, rate limiting con semaforos, timeouts y connection pooling.

## Cuando Usar Esto

- Obtener datos de multiples APIs simultaneamente
- Web scraping con descargas concurrentes de paginas
- Procesamiento batch de tareas basadas en HTTP (ej. llamar 100 endpoints LLM)
- Cualquier workload I/O-bound donde las peticiones son independientes

## Requisitos Previos

- Python 3.10+
- Paquete `aiohttp` (`pip install aiohttp`)

## Solucion

### 1. Instalar dependencias

```bash
pip install aiohttp
```

### 2. Fetch concurrente basico

```python
import asyncio
import aiohttp
import time

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    """Fetch a single URL and return status + content.

    Args:
        session: aiohttp client session.
        url: URL to fetch.

    Returns:
        Dict with url, status, and text.
    """
    async with session.get(url) as response:
        return {
            "url": url,
            "status": response.status,
            "text": await response.text(),
        }

async def fetch_all(urls: list[str]) -> list[dict]:
    """Fetch all URLs concurrently.

    Args:
        urls: List of URLs to fetch.

    Returns:
        List of result dicts in the same order as input URLs.
    """
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# Uso
urls = [
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
]

start = time.time()
results = asyncio.run(fetch_all(urls))
elapsed = time.time() - start

print(f"Fetched {len(urls)} URLs in {elapsed:.2f}s (concurrent)")
# ~1.2s en lugar de ~5s secuencial
```

### 3. Manejo de errores con return_exceptions

```python
async def fetch_all_safe(urls: list[str]) -> list[dict | Exception]:
    """Fetch all URLs, capturing exceptions instead of failing.

    Args:
        urls: List of URLs.

    Returns:
        List of results or Exception objects.
    """
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        # return_exceptions=True previene que un fallo cancele todos
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Procesar resultados — manejar excepciones
results = asyncio.run(fetch_all_safe(urls))
for i, result in enumerate(results):
    if isinstance(result, Exception):
        print(f"URL {i} failed: {result}")
    else:
        print(f"URL {i}: status {result['status']}")
```

### 4. Limitacion de concurrencia con semaforo

```python
async def fetch_with_limit(
    urls: list[str],
    max_concurrent: int = 10,
) -> list[dict | Exception]:
    """Fetch URLs with a concurrency limit to avoid overwhelming servers.

    Args:
        urls: List of URLs.
        max_concurrent: Maximum simultaneous requests.

    Returns:
        List of results or exceptions.
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session: aiohttp.ClientSession, url: str) -> dict:
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession() as session:
        tasks = [bounded_fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)

# Limitar a 10 peticiones concurrentes
results = asyncio.run(fetch_with_limit(urls, max_concurrent=10))
```

### 5. Timeouts

```python
import aiohttp

async def fetch_with_timeout(
    session: aiohttp.ClientSession,
    url: str,
    timeout_seconds: float = 10.0,
) -> dict:
    """Fetch with a per-request timeout.

    Args:
        session: aiohttp session.
        url: URL to fetch.
        timeout_seconds: Timeout in seconds.

    Returns:
        Result dict or timeout error.
    """
    timeout = aiohttp.ClientTimeout(total=timeout_seconds)
    try:
        async with session.get(url, timeout=timeout) as response:
            return {
                "url": url,
                "status": response.status,
                "text": await response.text(),
            }
    except asyncio.TimeoutError:
        return {"url": url, "status": 0, "error": "timeout"}
    except aiohttp.ClientError as e:
        return {"url": url, "status": 0, "error": str(e)}

async def fetch_all_with_timeouts(urls: list[str], timeout: float = 10.0) -> list[dict]:
    """Fetch all URLs with timeouts."""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_timeout(session, url, timeout) for url in urls]
        return await asyncio.gather(*tasks)
```

### 6. Connection pooling con configuracion de sesion

```python
async def fetch_with_pool(
    urls: list[str],
    max_concurrent: int = 20,
) -> list[dict | Exception]:
    """Fetch with optimized connection pool settings.

    Args:
        urls: List of URLs.
        max_concurrent: Max concurrent requests.

    Returns:
        List of results.
    """
    # Configurar pool de conexiones
    connector = aiohttp.TCPConnector(
        limit=max_concurrent,       # Limite total de conexiones
        limit_per_host=5,           # Limite por host
        ttl_dns_cache=300,          # TTL de cache DNS en segundos
        enable_cleanup_closed=True,
    )

    timeout = aiohttp.ClientTimeout(
        total=30,      # Timeout total
        connect=10,    # Timeout de conexion
        sock_read=10,  # Timeout de lectura de socket
    )

    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [bounded_fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

### 7. Seguimiento de progreso

```python
async def fetch_with_progress(urls: list[str]) -> list[dict | Exception]:
    """Fetch URLs with real-time progress tracking."""
    results = [None] * len(urls)
    completed = 0

    async def fetch_and_track(session: aiohttp.ClientSession, index: int, url: str):
        nonlocal completed
        try:
            result = await fetch_url(session, url)
            results[index] = result
        except Exception as e:
            results[index] = e
        finally:
            completed += 1
            print(f"\rProgress: {completed}/{len(urls)}", end="", flush=True)

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_and_track(session, i, url) for i, url in enumerate(urls)]
        await asyncio.gather(*tasks)

    print()  # Nueva linea despues del progreso
    return results
```

## Como Funciona

1. **`asyncio.gather(*tasks)`** programa todas las corrutinas concurrentemente. El event loop las ejecuta en paralelo, cambiando entre tareas en los puntos `await` (operaciones I/O).
2. **`aiohttp.ClientSession`** gestiona un pool de conexiones. Reutilizar una sesion entre peticiones evita crear nuevas conexiones TCP para cada peticion, reduciendo overhead.
3. **`asyncio.Semaphore`** limita el numero de operaciones concurrentes. Cuando `max_concurrent` tareas estan ejecutandose, las tareas adicionales esperan hasta que se libere un slot.
4. **`return_exceptions=True`** hace que `gather` retorne excepciones como valores en lugar de lanzarlas. Esto previene que una peticion fallida cancele todas las demas peticiones en vuelo.
5. **`ClientTimeout`** establece deadlines por peticion. `total` es el timeout general; `connect` es el timeout de conexion TCP; `sock_read` es el timeout para leer datos de respuesta.

## Variantes

### Procesamiento batch con chunks

```python
async def fetch_in_batches(
    urls: list[str],
    batch_size: int = 50,
) -> list[dict | Exception]:
    """Fetch URLs in batches to control memory and rate."""
    results = []

    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        batch_results = await fetch_all_safe(batch)
        results.extend(batch_results)
        print(f"Completed batch {i // batch_size + 1}")

    return results
```

### Reintentos con exponential backoff

```python
async def fetch_with_retry(
    session: aiohttp.ClientSession,
    url: str,
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> dict:
    """Fetch with retry and exponential backoff."""
    for attempt in range(max_retries):
        try:
            async with session.get(url) as response:
                if response.status == 429:
                    raise aiohttp.ClientError("Rate limited")
                return {
                    "url": url,
                    "status": response.status,
                    "text": await response.text(),
                }
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            if attempt == max_retries - 1:
                return {"url": url, "error": str(e), "attempts": attempt + 1}
            delay = base_delay * (2 ** attempt)
            print(f"Retry {attempt + 1}/{max_retries} for {url} in {delay}s")
            await asyncio.sleep(delay)

async def fetch_all_with_retry(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_retry(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

### Peticiones POST con JSON

```python
async def post_json(
    session: aiohttp.ClientSession,
    url: str,
    data: dict,
) -> dict:
    """Send a POST request with JSON body."""
    async with session.post(url, json=data) as response:
        return {
            "url": url,
            "status": response.status,
            "json": await response.json(),
        }

async def post_all(
    url: str,
    payloads: list[dict],
) -> list[dict]:
    """Send multiple POST requests concurrently."""
    async with aiohttp.ClientSession() as session:
        tasks = [post_json(session, url, payload) for payload in payloads]
        return await asyncio.gather(*tasks)
```

### Usar httpx (alternativa a aiohttp)

```python
import httpx
import asyncio

async def fetch_httpx(urls: list[str]) -> list[dict]:
    """Concurrent fetch using httpx (syncs with requests API)."""
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [
            {"url": str(r.url), "status": r.status_code, "text": r.text}
            for r in responses
        ]
```

## Mejores Practicas

- **Reutiliza `ClientSession`** — crear una nueva sesion por peticion desperdicia conexiones TCP
- **Establece `limit_per_host`** — evita sobrecargar un solo servidor con demasiadas conexiones
- **Usa semaforos para rate limiting** — respeta los limites de API y la capacidad del servidor
- **Siempre establece timeouts** — sin timeouts, un servidor lento puede bloquear toda tu aplicacion

## Errores Comunes

- **Crear una nueva `ClientSession` por peticion** — anula el connection pooling; crea una sesion y reutilizala
- **No usar `return_exceptions=True`** — una peticion fallida cancela todas las demas en el batch
- **Sin limite de concurrencia** — obtener 10.000 URLs simultaneamente sobrecarga tanto tu maquina como el servidor
- **Usar `asyncio.run()` dentro de un event loop existente** — lanza `RuntimeError`; usa `await` en su lugar

## FAQ

**Q: Cuantas peticiones concurrentes debo hacer?**
A: Empieza con 10-50. Para APIs con rate limits, coincide con el limite (ej. 10 para una API de 10 req/s). Para tus propios servidores, 100+ esta bien.

**Q: asyncio.gather vs. asyncio.TaskGroup — cual usar?**
A: `TaskGroup` (Python 3.11+) es el enfoque moderno con mejor manejo de errores. Usa `gather` para casos mas simples y compatibilidad hacia atras.

**Q: aiohttp vs. httpx — cual debo usar?**
A: Ambos funcionan bien. `aiohttp` es mas maduro para async. `httpx` tiene una API mas limpia y soporta tanto sync como async. Elige segun tu preferencia.

**Q: Puedo usar `requests` con asyncio?**
A: No — `requests` es sincrono y bloquea el event loop. Usa `aiohttp` o `httpx` para HTTP async.
