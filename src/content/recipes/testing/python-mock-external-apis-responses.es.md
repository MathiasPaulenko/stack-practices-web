---




contentType: recipes
slug: python-mock-external-apis-responses
title: "Mockear APIs Externas con responses"
description: "Cómo mockear llamadas HTTP en tests de Python usando la librería responses, incluyendo códigos de estado, headers, bodies JSON y simulación de errores."
metaDescription: "Mockea APIs HTTP externas en tests de Python con la librería responses. Simula códigos de estado, bodies JSON, timeouts y errores de conexión fácilmente."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - python
  - mocking
  - http
  - responses
  - requests
  - recipe
relatedResources:
  - /recipes/python-pytest-fixtures-parametrize
  - /recipes/setup-test-fixtures
  - /recipes/unit-testing-mocking
  - /recipes/python-coverage-pytest-cov
  - /recipes/python-hypothesis-property-testing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mockea APIs HTTP externas en tests de Python con la librería responses. Simula códigos de estado, bodies JSON, timeouts y errores de conexión fácilmente."
  keywords:
    - testing
    - python
    - mocking
    - http
    - responses
    - requests
    - recipe




---

## Overview

La librería `responses` intercepta las peticiones HTTP hechas por la librería `requests` en tests de Python. En lugar de hitting servicios externos reales, `responses` devuelve respuestas mock predefinidas. Esto hace que los tests sean rápidos, deterministas e independientes de condiciones de red.

## When to Use

- Testear código que llama APIs REST de terceros (payment gateways, email services, SMS providers)
- Simular respuestas de error de API (500s, timeouts, rate limits) sin un servicio real
- Verificar que tu código envía el body, headers y query parameters correctos
- Correr tests en CI sin acceso a red ni API keys

## When NOT to Use

- Testear tus propios endpoints — usa un test client (e.g., FastAPI `TestClient`, Django `TestCase`)
- Tests de integración que necesitan una base de datos real o message queue — usa Testcontainers
- Load testing — los mocks no reflejan latencia ni throughput del mundo real
- Testear webhook receivers — usa un servidor local con utilidades de test de `httpx` o `aiohttp`

## Solution

### Setup

```bash
pip install responses pytest
```

### Mock response básico

```python
import responses
import pytest
import requests

@responses.activate
def test_get_user():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/users/1",
        json={"id": 1, "name": "Alice", "email": "alice@example.com"},
        status=200,
    )

    resp = requests.get("https://api.example.com/users/1")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Alice"
```

### Mock con headers y query params

```python
@responses.activate
def test_search_with_params():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/search",
        json={"results": [{"title": "Python Guide"}]},
        status=200,
        headers={"X-RateLimit-Remaining": "99"},
    )

    resp = requests.get(
        "https://api.example.com/search",
        params={"q": "python", "page": 1},
        headers={"Authorization": "Bearer test-token"},
    )

    assert resp.headers["X-RateLimit-Remaining"] == "99"
    assert resp.json()["results"][0]["title"] == "Python Guide"

    # Verificar que la petición se hizo correctamente
    assert len(responses.calls) == 1
    assert "q=python" in responses.calls[0].request.url
```

### Mock de respuestas de error

```python
@responses.activate
def test_handle_server_error():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/users/1",
        status=500,
        json={"error": "Internal Server Error"},
    )

    with pytest.raises(requests.HTTPError):
        resp = requests.get("https://api.example.com/users/1")
        resp.raise_for_status()


@responses.activate
def test_handle_timeout():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/slow-endpoint",
        body=requests.exceptions.Timeout("Connection timed out"),
    )

    with pytest.raises(requests.exceptions.Timeout):
        requests.get("https://api.example.com/slow-endpoint")
```

### Múltiples respuestas para la misma URL

```python
@responses.activate
def test_retry_logic():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/data",
        status=503,
    )
    responses.add(
        method=responses.GET,
        url="https://api.example.com/data",
        status=200,
        json={"data": "success"},
    )

    # Primera llamada falla
    resp1 = requests.get("https://api.example.com/data")
    assert resp1.status_code == 503

    # Segunda llamada exitosa
    resp2 = requests.get("https://api.example.com/data")
    assert resp2.status_code == 200
    assert resp2.json()["data"] == "success"
```

### Callback para respuestas dinámicas

```python
@responses.activate
def test_callback_response():
    def request_callback(request):
        payload = request.body
        if b"premium" in payload:
            return (200, {}, json.dumps({"tier": "premium", "quota": 10000}))
        return (200, {}, json.dumps({"tier": "free", "quota": 100}))

    responses.add_callback(
        method=responses.POST,
        url="https://api.example.com/subscribe",
        callback=request_callback,
        content_type="application/json",
    )

    resp = requests.post(
        "https://api.example.com/subscribe",
        json={"plan": "premium"},
    )
    assert resp.json()["quota"] == 10000
```

### Verificar el body de la petición

```python
@responses.activate
def test_post_request_body():
    responses.add(
        method=responses.POST,
        url="https://api.example.com/orders",
        status=201,
        json={"id": 42, "status": "created"},
    )

    requests.post(
        "https://api.example.com/orders",
        json={"product_id": 10, "quantity": 3},
    )

    sent_body = json.loads(responses.calls[0].request.body)
    assert sent_body["product_id"] == 10
    assert sent_body["quantity"] == 3
```

### Usar `responses` como fixture de pytest

```python
import responses
import pytest

@pytest.fixture
def mock_api():
    with responses.RequestsMock() as rsps:
        yield rsps

def test_with_fixture(mock_api):
    mock_api.add(
        method=responses.GET,
        url="https://api.example.com/health",
        status=200,
        json={"status": "healthy"},
    )

    resp = requests.get("https://api.example.com/health")
    assert resp.json()["status"] == "healthy"
```

## Variants

### Usar `httpx` con `respx`

Si usas `httpx` en lugar de `requests`, usa la librería `respx`:

```python
import respx
import httpx

@respx.mock
def test_httpx_mock():
    respx.get("https://api.example.com/users/1").respond(
        200, json={"id": 1, "name": "Alice"}
    )

    resp = httpx.get("https://api.example.com/users/1")
    assert resp.json()["name"] == "Alice"
```

### Usar `aioresponses` para `aiohttp`

```python
from aioresponses import aioresponses
import aiohttp
import pytest

@pytest.mark.asyncio
async def test_async_mock():
    with aioresponses() as m:
        m.get("https://api.example.com/data", payload={"key": "value"})

        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.example.com/data") as resp:
                data = await resp.json()
                assert data["key"] == "value"
```

## Best Practices


- For a deeper guide, see [Stub External HTTP Services with WireMock](/es/recipes/java-wiremock-stub-external/).

- Siempre usa `@responses.activate` o el context manager — sin eso, las llamadas HTTP reales pasan
- Verifica `responses.calls` para comprobar que tu código envió la petición correcta
- Usa `add_callback` para lógica compleja que no se puede expresar con respuestas estáticas
- Resetea `responses.calls` entre tests si estás verificando call counts
- Mockea a nivel HTTP, no a nivel función — esto testea el path de integración real

## Common Mistakes

- **Olvidar `@responses.activate`**: sin eso, `responses.add` lanza un error o las peticiones reales pasan.
- **No matchear la URL exacta**: `responses` matchea URLs exactamente por defecto. Usa `match_querystring=True` o URLs con regex para flexibilidad.
- **Mockear demasiados endpoints**: si cada test mockea 10 endpoints, el setup del test se vuelve el test. Extrae mocks compartidos en fixtures.
- **No testear paths de error**: mockea 500s, timeouts y rate limits — estos son los paths que fallan en producción.
- **Usar mocks para tests de integración**: los mocks verifican la lógica de tu código, no que la API real funcione. Usa contract tests para eso.

## FAQ

### ¿Cómo hago match de URLs con regex?

```python
import re

responses.add(
    method=responses.GET,
    url=re.compile(r"https://api\.example\.com/users/\d+"),
    json={"id": 1},
)
```

### ¿Cómo simulo un connection error?

```python
responses.add(
    method=responses.GET,
    url="https://api.example.com/down",
    body=requests.exceptions.ConnectionError("Connection refused"),
)
```

### ¿Puedo mockear streaming responses?

Sí, pasa un generador a `body`:

```python
def stream_generator():
    yield b"chunk1\n"
    yield b"chunk2\n"

responses.add(
    method=responses.GET,
    url="https://api.example.com/stream",
    body=stream_generator(),
    content_type="text/event-stream",
)
```

### ¿Cómo verifico cuántas veces se llamó un endpoint?

```python
assert len(responses.calls) == 3
# O filtra por URL
api_calls = [c for c in responses.calls if "api.example.com" in c.request.url]
assert len(api_calls) == 3
```

### ¿Debería usar `responses` o `unittest.mock.patch`?

Usa `responses` cuando tu código usa la librería `requests`. Usa `unittest.mock.patch` cuando quieres mockear a nivel función o método. `responses` es más realista porque testea el path real de la llamada HTTP.

### ¿Cómo mockeo respuestas streaming?

```python
import responses

@responses.activate
def test_streaming():
    def stream_callback(request):
        body = iter([b"chunk1\n", b"chunk2\n", b"chunk3\n"])
        return (200, {"Content-Type": "text/plain"}, body)

    responses.add_callback(
        responses.GET,
        "https://api.example.com/stream",
        callback=stream_callback,
    )
```

### ¿Puedo mockear respuestas condicionalmente según el body del request?

Sí. Usa `add_callback` para inspeccionar el request y retornar diferentes respuestas:

```python
@responses.activate
def test_conditional():
    def callback(request):
        if b"premium" in request.body:
            return (200, {}, json.dumps({"plan": "premium"}))
        return (200, {}, json.dumps({"plan": "free"}))

    responses.add_callback(responses.POST, "https://api.example.com/subscribe", callback=callback)
```
