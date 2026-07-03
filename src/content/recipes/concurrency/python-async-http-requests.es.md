---
contentType: recipes
slug: python-async-http-requests
title: "Haz Peticiones HTTP Concurrentes con Python y aiohttp"
description: "Obtén datos de múltiples APIs concurrentemente usando asyncio y aiohttp. Cubre connection pooling, rate limiting, reintentos y procesamiento por lotes."
metaDescription: "Haz peticiones HTTP concurrentes en Python con asyncio y aiohttp. Connection pooling, rate limiting, reintentos, procesamiento por lotes y manejo de errores."
difficulty: intermediate
topics:
  - concurrency
  - api
tags:
  - python
  - asyncio
  - aiohttp
  - async
  - http
  - concurrency
relatedResources:
  - /recipes/api/javascript-fetch-retry-logic
  - /recipes/api/nodejs-websocket-realtime
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Haz peticiones HTTP concurrentes en Python con asyncio y aiohttp. Connection pooling, rate limiting, reintentos, procesamiento por lotes y manejo de errores."
  keywords:
    - python async http requests
    - aiohttp concurrent requests
    - asyncio http client
    - python async api calls
    - aiohttp session pooling
    - python async batch requests
---

## Visión General

Hacer peticiones HTTP una a la vez es lento cuando necesitas obtener datos de múltiples APIs o endpoints. `asyncio` con `aiohttp` permite ejecutar muchas peticiones concurrentemente, reduciendo el tiempo total de la suma de todos los tiempos de petición al de la petición más larga. Esta recipe cubre fetching concurrente, connection pooling, rate limiting, reintentos y procesamiento por lotes.

## Cuándo Usar

- Necesitas obtener datos de múltiples APIs o endpoints simultáneamente
- Estás construyendo un web scraper que obtiene muchas páginas
- Necesitas llamar múltiples microservicios y agregar resultados
- Las peticiones HTTP secuenciales son demasiado lentas para tu caso de uso

## Solución

### Instalar aiohttp

```bash
pip install aiohttp
```

### Peticiones concurrentes básicas

```python
import asyncio
import aiohttp

async def fetch(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        response.raise_for_status()
        return await response.json()

async def fetch_all(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# Uso
urls = [
    "https://api.github.com/users/octocat",
    "https://api.github.com/users/torvalds",
    "https://api.github.com/users/gvanrossum",
]

results = asyncio.run(fetch_all(urls))
for r in results:
    print(r["login"])
```

### Connection pooling con ClientSession

```python
import asyncio
import aiohttp

async def fetch_with_pool(urls: list[str]) -> list[dict]:
    # Reusar una sola sesión para todas las peticiones — connection pooling
    connector = aiohttp.TCPConnector(
        limit=100,          # Máx conexiones totales
        limit_per_host=10,  # Máx conexiones por host
        ttl_dns_cache=300,  # TTL de caché DNS en segundos
    )
    timeout = aiohttp.ClientTimeout(total=30, connect=10)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

### Rate limiting con semáforo

```python
import asyncio
import aiohttp

async def rate_limited_fetch(urls: list[str], max_concurrent: int = 10) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_limited(session: aiohttp.ClientSession, url: str) -> dict:
        async with semaphore:
            async with session.get(url) as response:
                response.raise_for_status()
                return await response.json()

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_limited(session, url) for url in urls]
        return await asyncio.gather(*tasks)

# Limitar a 5 peticiones concurrentes
results = asyncio.run(rate_limited_fetch(urls, max_concurrent=5))
```

### Reintentos con backoff exponencial

```python
import asyncio
import aiohttp
import logging

logger = logging.getLogger(__name__)

async def fetch_with_retry(
    session: aiohttp.ClientSession,
    url: str,
    max_retries: int = 3,
    backoff_factor: float = 0.5
) -> dict:
    for attempt in range(max_retries):
        try:
            async with session.get(url) as response:
                if response.status == 429:
                    retry_after = int(response.headers.get("Retry-After", backoff_factor * (2 ** attempt)))
                    logger.warning(f"Rate limited, reintentando en {retry_after}s")
                    await asyncio.sleep(retry_after)
                    continue
                response.raise_for_status()
                return await response.json()
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            if attempt == max_retries - 1:
                raise
            wait = backoff_factor * (2 ** attempt)
            logger.warning(f"Intento {attempt + 1} falló: {e}, reintentando en {wait}s")
            await asyncio.sleep(wait)

async def fetch_all_with_retry(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_retry(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

### Procesamiento por lotes con return_exceptions

```python
import asyncio
import aiohttp

async def fetch_all_safe(urls: list[str]) -> list:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        # return_exceptions=True previene que un fallo cancele todos
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Uso — manejar fallos parciales
results = asyncio.run(fetch_all_safe(urls))
for i, result in enumerate(results):
    if isinstance(result, Exception):
        print(f"URL {i} falló: {result}")
    else:
        print(f"URL {i}: {result.get('login', 'unknown')}")
```

### Procesar resultados a medida que completan

```python
import asyncio
import aiohttp

async def fetch_progressive(urls: list[str]) -> None:
    async with aiohttp.ClientSession() as session:
        tasks = {asyncio.create_task(fetch(session, url)): url for url in urls}

        for completed in asyncio.as_completed(tasks):
            url = tasks[completed]
            try:
                result = await completed
                print(f"Done: {url} -> {result.get('login', 'unknown')}")
            except Exception as e:
                print(f"Failed: {url} -> {e}")

asyncio.run(fetch_progressive(urls))
```

### Peticiones POST con cuerpo JSON

```python
import asyncio
import aiohttp

async def post_data(session: aiohttp.ClientSession, url: str, data: dict) -> dict:
    async with session.post(url, json=data) as response:
        response.raise_for_status()
        return await response.json()

async def create_users(users: list[dict]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [post_data(session, "https://httpbin.org/post", user) for user in users]
        return await asyncio.gather(*tasks)

users = [{"name": "Alice"}, {"name": "Bob"}, {"name": "Charlie"}]
results = asyncio.run(create_users(users))
```

### Headers personalizados y autenticación

```python
import asyncio
import aiohttp

async def fetch_authenticated(urls: list[str], token: str) -> list[dict]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "MyApp/1.0",
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

## Explicación

`asyncio` es el framework de async I/O de Python. Ejecuta tareas concurrentemente en un solo hilo usando un event loop. `aiohttp` es un cliente/servidor HTTP async que se integra con `asyncio`.

Conceptos clave:

- **ClientSession**: El equivalente a `requests.Session`. Reusa conexiones TCP entre peticiones. Siempre usar una sola sesión para todas las peticiones en un workflow.
- **asyncio.gather**: Ejecuta múltiples coroutines concurrentemente y retorna resultados en orden. Si una falla, todas fallan a menos que se use `return_exceptions=True`.
- **Semaphore**: Limita operaciones concurrentes. Usar para evitar sobrecargar el servidor o hitting rate limits.
- **as_completed**: Retorna resultados a medida que terminan, no en orden de envío. Útil para reporte de progreso.
- **TCPConnector**: Controla connection pooling. `limit` establece el máximo de conexiones totales, `limit_per_host` establece el máximo por host.

## Variantes

| Enfoque | Concurrencia | Librería | Usar Cuando |
|----------|-------------|---------|----------|
| asyncio + aiohttp | Async | aiohttp | Alta concurrencia, I/O bound |
| httpx async | Async | httpx | Necesitas sync + async en una librería |
| ThreadPoolExecutor | Hilos | requests | Simple, librería bloqueante |
| httpx sync | Ninguna | httpx | Simple, secuencial |

## Pautas

- Siempre reusar una sola `ClientSession` para todas las peticiones. Crear una sesión por petición anula el connection pooling.
- Usar un `Semaphore` para limitar concurrencia. Demasiadas peticiones paralelas pueden sobrecargar el servidor o trigger rate limits.
- Establecer timeouts con `ClientTimeout`. El por defecto no tiene timeout total — una petición colgada bloquea para siempre.
- Usar `return_exceptions=True` con `gather` cuando fallos parciales son aceptables.
- Implementar reintentos con backoff exponencial para fallos transitorios (429, 500, timeouts).
- Usar `as_completed` cuando necesitas resultados tan pronto estén disponibles.
- Cerrar sesiones correctamente con el context manager `async with`.
- Establecer un `limit_per_host` razonable para evitar sobrecargar un solo servidor.

## Errores Comunes

- Crear una nueva `ClientSession` por petición. Esto es lento y desperdicia conexiones.
- No establecer un timeout. Una petición colgada bloquea el event loop indefinidamente.
- Usar `requests` dentro de código async. `requests` es bloqueante y congela el event loop.
- No limitar concurrencia. Miles de peticiones paralelas pueden agotar file descriptors o trigger bans.
- Olvidar `await` en `response.json()` o `response.text()`. Retorna una coroutine en lugar de datos.
- No manejar resultados de `return_exceptions=True`. Las excepciones se retornan como valores, no se lanzan.
- Usar `asyncio.run()` múltiples veces en el mismo script. Crear un solo event loop.

## Preguntas Frecuentes

### ¿Puedo usar requests con asyncio?

No. `requests` es una librería síncrona. Usarla dentro de código async bloquea el event loop. Usar `aiohttp` o `httpx` con soporte async en su lugar.

### ¿Cuál es la diferencia entre gather y as_completed?

`gather` ejecuta todas las tareas y retorna resultados en orden de envío. `as_completed` produce resultados a medida que terminan, no en orden. Usar `gather` cuando necesitas todos los resultados juntos. Usar `as_completed` para reporte de progreso o streaming de resultados.

### ¿Cuántas peticiones concurrentes debo hacer?

Depende del servidor. Empezar con 10-50 peticiones concurrentes. Revisar la documentación de rate limits de la API. Usar un `Semaphore` para controlar el número. Monitorear respuestas 429 (Too Many Requests).

### ¿Cómo testeo código HTTP async?

Usar `aioresponses` para mockear peticiones aiohttp en tests. Escribir tests como `async def` y ejecutar con `pytest-asyncio`.
