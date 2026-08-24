---
contentType: recipes
slug: call-rest-api
title: "Llamar a una API REST"
description: "Cómo hacer peticiones HTTP a una API REST y manejar la respuesta JSON en Python, JavaScript, Java y Go."
metaDescription: "Aprende a llamar a una API REST en Python, JavaScript, Java y Go. Ejemplos prácticos de HTTP, manejo de errores, timeouts y parseo de JSON."
difficulty: beginner
topics:
  - api
tags:
  - api
  - rest
  - http
  - backend
  - web-services
relatedResources:
  - /recipes/parse-json
  - /recipes/handle-errors
  - /recipes/handle-cors
  - /recipes/middleware
  - /recipes/rest-api-design
  - /patterns/adapter-pattern-api
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende a llamar a una API REST en Python, JavaScript, Java y Go. Ejemplos prácticos de HTTP, manejo de errores, timeouts y parseo de JSON."
  keywords:
    - llamar api rest
    - peticiones http
    - api python
    - fetch javascript
    - httpclient java
    - golang http
---

## Resumen

La mayoría de las aplicaciones se comunican con el exterior a través de APIs REST
sobre HTTP. Llamar a una API REST significa enviar una petición — normalmente `GET` o
`POST` — a una URL y manejar la respuesta, que suele ser JSON. El desafío es hacerlo
de forma segura: verificar códigos de estado, setear timeouts y parsear el body sin
que falle.

Esta receta muestra cómo llamar a una API REST en Python, JavaScript, Java y Go. Recursos relacionados: [Cómo documentar una API con OpenAPI, Swagger UI y Redoc](/recipes/api-documentation-openapi).

## Cuándo Usar

- Para traer datos de una API interna o de terceros.
- Para enviar datos de formularios o eventos a un backend.
- Para integrar plataformas SaaS (pagos, email, analytics).
- Para construir un SDK o CLI que consuma un servicio HTTP.
- Para subir archivos o consultar el estado de un job.

## Cuándo NO Usar

- Comunicación bidireccional en tiempo real: usá
  [WebSockets](/es/recipes/websocket-server/) o
  [Server-Sent Events](/es/recipes/server-sent-events/) en su lugar.
- Streaming de payloads enormes: considerá un protocolo dedicado o URLs
  prefirmadas.

## Solución

### Python con `requests`

`requests` es el cliente HTTP más popular de Python. Pasá un `timeout` para que no se
congele, y usá `raise_for_status()` para convertir respuestas `4xx`/`5xx` en
excepciones.

```python
import requests

response = requests.get("https://api.example.com/users/1", timeout=10)
response.raise_for_status()

data = response.json()
print(data["name"])
```

### JavaScript con `fetch`

`fetch` viene incluido en navegadores modernos y Node.js 18+. Solo rechaza por errores
de red; las respuestas HTTP erróneas igual resuelven, así que hay que revisar
`response.ok` a mano.

```javascript
const response = await fetch("https://api.example.com/users/1");
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data.name);
```

### Java con `HttpClient`

Java 11 trae `java.net.http.HttpClient`. Soporta requests síncronos y asíncronos, y
maneja HTTP/2 de forma transparente.

```java
import java.net.URI;
import java.net.http.*;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/1"))
    .GET()
    .build();

HttpResponse<String> response =
    client.send(request, HttpResponse.BodyHandlers.ofString());

if (response.statusCode() >= 400) {
    throw new RuntimeException("HTTP " + response.statusCode());
}

System.out.println(response.body());
```

### Go con `net/http`

La librería estándar de Go tiene un cliente HTTP listo para producción. Cerrá el body
para evitar fugas, y usá `context` para timeouts.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/users/1", nil)
    if err != nil {
        panic(err)
    }
    req.Header.Set("Accept", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        panic(fmt.Sprintf("HTTP %d", resp.StatusCode))
    }

    body, _ := io.ReadAll(resp.Body)
    var data map[string]interface{}
    json.Unmarshal(body, &data)
    fmt.Println(data["name"])
}
```

### POST con JSON y autenticación

```python
import requests

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

payload = {"name": "Alice", "email": "alice@example.com"}

response = requests.post(
    "https://api.example.com/users",
    json=payload,
    headers=headers,
    timeout=10,
)
response.raise_for_status()
created = response.json()
print(f"Created user with ID: {created['id']}")
```

### JavaScript con timeout

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch("https://api.example.com/users/1", {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  console.log(data.name);
} catch (err) {
  if (err.name === "AbortError") {
    console.error("Request timed out");
  } else {
    throw err;
  }
} finally {
  clearTimeout(timeout);
}
```

## Explicación

Cada ejemplo hace las mismas cuatro cosas:

1. Armar la petición (URL, método, headers, body).
2. Setear un timeout para que un servidor lento no bloquee el cliente para siempre.
3. Enviar la petición y verificar el código de estado HTTP.
4. Parsear el body como JSON y manejar errores de parseo.

`raise_for_status()` en Python y `response.ok` en JavaScript convierten errores HTTP
en excepciones. En Java y Go revisás el código de estado manualmente. Para más sobre
parseo, consultá [Parse JSON](/es/recipes/parse-json/).

## Variantes

|Lenguaje|Cliente|Soporte async|Notas|
|--------|-------|-------------|-----|
|Python|`requests` / `httpx`|`httpx` para async|`requests` es solo síncrono|
|JavaScript|`fetch` (nativo)|promesas nativas|revisar `response.ok`|
|Java|`HttpClient` (Java 11+)|`sendAsync`|sin dependencia extra|
|Go|`net/http` (nativo)|goroutines|cerrar el body|
|Rust|`reqwest`|runtime `tokio`|popular y ergonómico|
|C#|`HttpClient` (nativo)|`async/await`|reutilizar una instancia|

## Buenas Prácticas

- Siempre seteá un timeout para que una petición colgada no bloquee el worker.
- Verificá los códigos de estado explícitamente; no asumas un `2xx`.
- Reutilizá clientes o sesiones para aprovechar connection pooling y keep-alive.
- Mandá `Accept: application/json` cuando esperés JSON y
  `Content-Type: application/json` cuando mandés JSON.
- Leé las API keys de variables de entorno; nunca las commitees.
- Reintentá respuestas `429` y `5xx` con backoff exponencial; respetá los headers
  `Retry-After`.
- Envolveé el parseo con `.json()` en try/catch; el servidor puede devolver HTML
  durante una caída.

## Errores Comunes

- **Olvidar `response.ok` en `fetch`**: un `404` resuelve la promesa, así que hay que
  revisar el estado a mano.
- **No setear timeout**: el default de muchos clientes es infinito, lo que puede
  agotar los workers.
- **Hardcodear credenciales**: mantené tokens fuera del código y de los logs.
- **Ignorar rate limits**: respetá `Retry-After` para no ser baneado.
- **No cerrar los response bodies** en Go y Java: eso fuga conexiones y puede agotar
  file descriptors.
- **Mandar datos sensibles en query parameters**: las URLs quedan en logs, así que
  usá headers o POST bodies.

## Preguntas Frecuentes

### ¿`fetch` lanza error con un 404?

No. `fetch` solo rechaza por errores de red. Un `404` resuelve normalmente, así que
revisá `response.ok` o `response.status` antes de leer el body.

### ¿Necesito una librería externa para llamar APIs HTTP en Java?

No. Java 11 incluye `java.net.http.HttpClient`, que soporta requests síncronos y
asíncronos. Para versiones más viejas, usá Apache HttpClient u OkHttp.

### ¿Cómo envío JSON en un POST?

Seteá `Content-Type: application/json` y pasá el JSON serializado como body. En
Python usá el parámetro `json=` de `requests.post`; en JavaScript pasá el objeto con
`JSON.stringify()`.

### ¿Cómo cancelo una petición que tarda mucho?

Usá `AbortController` en JavaScript, el parámetro `timeout` en Python `requests` o
`HttpRequest.timeout()` en Java.

### ¿Uso GET o POST para búsquedas?

Usá GET para consultas idempotentes y cacheables cuando los parámetros entren en la
URL. Usá POST para payloads grandes, datos sensibles u operaciones no idempotentes.

### ¿Cómo manejo la paginación de una API?

Las APIs REST suelen usar offset/limit (`?page=2&limit=20`), cursor
(`?cursor=abc123`) o headers `Link`. Leé la documentación de la API, encontrá el
patrón e iterá hasta que no haya más páginas.

### ¿Qué códigos de estado debería reintentar?

Reintentá `429`, `500`, `502`, `503` y `504` con backoff exponencial. No reintentés
`400`, `401`, `403`, `404` o `422` — son errores del cliente que no se van a arreglar
solo repetir.
