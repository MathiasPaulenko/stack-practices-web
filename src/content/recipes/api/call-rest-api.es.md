---
contentType: recipes
slug: call-rest-api
title: "Llamar a una API REST"
description: "Cómo hacer peticiones HTTP a una API REST y manejar la respuesta JSON en varios lenguajes."
metaDescription: "Aprende a llamar a una API REST en Python, JavaScript y Java con ejemplos prácticos de peticiones HTTP, manejo de errores y lo que funciona."
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
  - /recipes/read-write-file
  - /recipes/api/middleware
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a llamar a una API REST en Python, JavaScript y Java con ejemplos prácticos de peticiones HTTP, manejo de errores y lo que funciona."
  keywords:
    - llamar api rest
    - peticiones http
    - api python
    - fetch javascript
    - httpclient java
---
## Visión General

La mayoría de las aplicaciones se comunican con el exterior mediante APIs REST sobre HTTP. Llamar a una API REST consiste en enviar una petición HTTP (normalmente `GET` o `POST`) a una URL y manejar la respuesta, que suele ser JSON.

REST (Representational State Transfer) ha sido el estilo arquitectónico dominante para servicios web desde principios de los 2000s. Usa métodos HTTP estándar — GET para recuperación, POST para creación, PUT para actualizaciones, DELETE para eliminación — y devuelve formatos de datos estructurados como JSON o XML. Entender cómo construir peticiones apropiadamente, manejar errores y parsear respuestas es una habilidad fundamental para cualquier desarrollador que construya aplicaciones conectadas.

Lo siguiente demuestra la forma idiomática y moderna de hacer una petición HTTP y leer la respuesta JSON en Python, JavaScript y Java, incluyendo manejo básico de errores y configuración de timeouts.

## Cuándo Usar

Usa esta receta cuando:

- Obtienes datos de una API interna o de terceros. Consulta [Input Validation](/recipes/api/input-validation) para validar datos de requests y responses.
- Envías datos de formularios o eventos a un servicio backend. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para manejar fallos transitorios.
- Te integras con plataformas SaaS (pagos, email, analítica)
- Construyes un SDK cliente o una CLI que habla con un servicio HTTP
- Subes archivos a una API de almacenamiento o CDN
- Haces polling de estado de jobs o confirmación de entrega de webhooks
- Construyes funciones serverless que orquestan múltiples llamadas de API

## Solución

### Python

La librería `requests` de Python es el cliente HTTP más popular. Pasa siempre un `timeout` para prevenir que la petición se cuelgue indefinidamente, y usa `raise_for_status()` para convertir códigos de error HTTP en excepciones que detienen la ejecución.

```python
import requests

response = requests.get("https://api.example.com/users/1", timeout=10)
response.raise_for_status()  # lanza en 4xx/5xx

data = response.json()
print(data["name"])
```

### JavaScript

La API `fetch` incorporada está disponible en todos los navegadores modernos y Node.js 18+. Ojo: `fetch` solo falla ante errores de red; las respuestas de error HTTP como 404 o 500 igual resuelven la promesa, por lo que debes comprobar `response.ok` manualmente.

```javascript
const response = await fetch("https://api.example.com/users/1");
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data.name);
```

### Java

Java 11 introdujo `java.net.http.HttpClient`, reemplazando al antiguo `HttpURLConnection`. Soporta peticiones síncronas (`send`) y asíncronas (`sendAsync`), y maneja upgrades a HTTP/2 y WebSocket de forma transparente.

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
System.out.println(response.body());
```

### Go (usando net/http)

La librería estándar de Go incluye un cliente HTTP listo para producción. Siempre cierra el body de la respuesta para evitar leaks de recursos, y usa `context` para timeouts.

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

    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/users/1", nil)
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

### Python con Autenticación y POST

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

### JavaScript con AbortController (Timeout)

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

- **Python** usa la popular librería `requests`. `raise_for_status()` convierte las respuestas de error en excepciones; `.json()` parsea el cuerpo. Pasa siempre un `timeout` para prevenir bloqueo indefinido en servidores lentos o irresponsivos.
- **JavaScript** usa la API `fetch` incorporada (Node 18+ y todos los navegadores modernos). Ojo: `fetch` solo falla ante errores de red — los errores HTTP como 404 o 500 igual resuelven la promesa, por lo que debes comprobar `response.ok` tú mismo.
- **Java** usa el `java.net.http.HttpClient` incorporado (Java 11+). Soporta llamadas síncronas (`send`) y asíncronas (`sendAsync`), y puede configurarse con connection pooling y timeouts de petición.

Una vez recibas el cuerpo, consulta [Parsear JSON](/recipes/data/parse-json) para convertirlo en datos tipados.

## Variantes

| Lenguaje | Cliente | Soporte async | Notas |
|----------|---------|---------------|-------|
| Python | `requests` / `httpx` | `httpx` para async | `requests` es solo síncrono |
| JavaScript | `fetch` (nativo) | promesas nativas | comprueba `response.ok` |
| Java | `HttpClient` (Java 11+) | `sendAsync` | sin dependencias extra |
| Go | `net/http` (nativo) | goroutines | cierra el body de la respuesta |
| Rust | `reqwest` | runtime `tokio` | abstracciones de costo cero |
| C# | `HttpClient` (nativo) | `async/await` | reutiliza una sola instancia |

## Lo que funciona

- **Define siempre un timeout**: una petición colgada puede bloquear un hilo o worker indefinidamente. En Python, pasa `timeout=10` a `requests.get`; en Node, usa `AbortController` con `fetch`; en Java, setea un timeout en el builder de `HttpClient`.
- **Comprueba el código de estado**: no asumas `2xx`; maneja `4xx`/`5xx` explícitamente. Un `401` significa que la autenticación falló; un `429` significa que estás rate-limited; un `503` significa que el servicio está temporalmente no disponible.
- **Reutiliza el cliente**: crea un único `HttpClient`/sesión y reúsalo para agrupar conexiones. Crear un nuevo cliente por petición desperdicia recursos y previene la reutilización de conexiones TCP.
- **Nunca registres secretos**: mantén las claves y tokens fuera de los logs y mensajes de error. Si debes loggear una URL de petición, redacta los query parameters que contienen credenciales.
- **Reintenta fallos transitorios**: usa backoff exponencial para respuestas `429` y `5xx`. Un `503` con una cabecera `Retry-After` te dice exactamente cuándo reintentar; respétala.
- **Setea cabeceras apropiadas**: incluye siempre `Accept: application/json` cuando esperes JSON, y `Content-Type: application/json` cuando envíes un body JSON. Algunas APIs rechazan peticiones sin estas cabeceras.
- **Maneja redirects con cuidado**: algunos clientes HTTP siguen redirects automáticamente, lo que puede filtrar cabeceras sensibles como `Authorization` a hosts no deseados. Desactiva redirects automáticos o haz whitelist de dominios permitidos.
- **Parsea defensivamente**: un servidor devolviendo HTML (páginas de error, challenges de Cloudflare) en lugar de JSON hará que `.json()` lance una excepción. Comprueba `Content-Type` antes de parsear, y envuelve en try/catch.
- **Usa connection pooling**: crear una nueva conexión TCP por petición añade 50-100ms de latencia. Reutiliza instancias de `HttpClient` (Java, C#), objetos `Session` (Python `requests`), o `http.Transport` (Go) para beneficiarte de keep-alive y reutilización de conexiones.

## Errores Comunes

- **Olvidar `response.ok` en `fetch`**: un `404` igual resuelve la promesa; debes comprobarlo manualmente. Esta es la fuente más común de fallos silenciosos en código HTTP de JavaScript.
- **Sin timeout**: el valor por defecto en muchos clientes es infinito, lo que agota recursos. Una sola API no responsiva puede eventualmente consumir todos los threads o workers disponibles.
- **Bloquear el event loop**: en JS, usa siempre `await` en las llamadas de red; nunca hagas espera activa. Las llamadas HTTP síncronas congelan todo tu servidor por la duración de la petición.
- **Credenciales hardcodeadas**: lee las claves desde variables de entorno, no del código fuente. Las credenciales commiteadas son un liability permanente incluso si las rotas después.
- **Ignorar los límites de tasa**: respeta la cabecera `Retry-After` para evitar bloqueos o baneos. Algunas APIs ponen en lista negra permanentemente IPs que exceden los límites repetidamente.
- **No manejar errores de parseo JSON**: un servidor devolviendo HTML (como una página de error de Cloudflare) en lugar de JSON hará que `.json()` lance una excepción. Envuelve el parseo en try/catch e inspecciona el body raw en caso de fallo.
- **Enviar datos sensibles en query parameters**: las URLs son loggeadas por proxies, navegadores y access logs del servidor. Usa cabeceras de petición o bodies POST para tokens y credenciales.
- **No cerrar bodies de respuesta**: en Go y Java, no cerrar el body de la respuesta filtra conexiones TCP y puede agotar file descriptors bajo carga.
- **Ignorar cabeceras Content-Type**: si el servidor devuelve `text/html` en lugar de `application/json`, llamar a `.json()` lanza una excepción. Siempre comprueba el content type antes de parsear.
- **No manejar paginación**: muchas APIs devuelven resultados paginados con cabeceras `Link` o tokens cursor. No seguir los links de paginación significa que solo obtienes la primera página de datos.

## Mejores Prácticas

- **Siempre setea timeouts**: connection timeout (5-10s) y read timeout (30-60s) separadamente. Sin timeouts, una sola petición hung puede bloquear un worker indefinidamente.
- **Usa connection pooling**: reutilizar conexiones TCP via keep-alive reduce latencia en 30-50% para llamadas repetidas al mismo host. Configura el pool size basándote en tus necesidades de concurrencia.
- **Implementa exponential backoff con jitter**: reintenta peticiones fallidas con delays crecientes (1s, 2s, 4s, 8s) más jitter random para evitar thundering herd. Capa retries a 3-5 intentos.
- **Cachea respuestas GET idempotentes**: usa headers ETag o Last-Modified para cachear respuestas. Peticiones condicionales (If-None-Match) retornan 304 sin body, ahorrando bandwidth y parse time.
- **Valida el response schema antes de usar data**: no confíes que las respuestas de API matcheen tus expectativas. Usa Zod, Pydantic o JSON Schema validation para detectar cambios de shape early.

## Checklist de Producción

- [ ] Timeouts están seteados para ambas fases connection y read
- [ ] Connection pooling está configurado con pool size apropiado
- [ ] Lógica de retry usa exponential backoff con jitter
- [ ] Respuestas 429 y 503 respetan headers `Retry-After`
- [ ] Respuestas de error se loguean con request URL, status y response body
- [ ] Headers sensibles (Authorization) nunca se loguean
- [ ] Validación de response schema detecta cambios inesperados de API
- [ ] Circuit breaker previene cascading failures cuando la API downstream está down
- [ ] HTTP/2 está habilitado para multiplexar múltiples peticiones sobre una conexión
- [ ] Fallos de resolución DNS se manejan gracefully con caching

## Cuándo No Usar Este Enfoque

- **Comunicación bidireccional real-time**: REST es solo request-response. Para chat, dashboards live o edición colaborativa, usa [WebSockets](/recipes/api/websocket-server) o [Server-Sent Events](/recipes/api/server-sent-events) en su lugar.
- **Llamadas micro-batch de alta frecuencia**: si haces 100+ llamadas/segundo a la misma API, considera gRPC con multiplexed connections o un endpoint bulk/batch para reducir per-request overhead.
- **Transferencias de archivos grandes**: las APIs REST tienen límites prácticos de payload (típicamente 10-100MB). Para transferencias multi-GB, usa presigned S3 URLs o un protocolo dedicado de transferencia de archivos.

## Estrategia de Testing

- **Unit test HTTP clients con mocked responses**: usa `nock` (Node.js), `responses` (Python), o `WireMock` (Java) para mockear respuestas de API. Testea success, error, timeout y edge-case payloads sin hitting real servers.
- **Integration test con un local server**: levanta un test server que retorne canned responses. Verifica el ciclo completo request/response incluyendo headers, auth y error handling.
- **Contract test contra API real**: corre un subset de tests contra la API real en staging. Usa recorded responses (VCR cassettes) para replay en CI y evitar rate limits y flakiness.
- **Load test con payloads realistas**: usa `k6` o `Artillery` para simular usuarios concurrentes. Mide p95 latency, error rate y throughput bajo carga.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Librería HTTP client | $0 | Built-in (fetch, HttpClient, requests) |
| Infraestructura de connection pool | $0 | In-process, sin servicio externo |
| Overhead de retry/backoff | $0 | Code-level, sin costo de infra |
| API gateway (por millón de llamadas) | $3.50 | AWS API Gateway, GCP API Gateway |
| CDN para respuestas de API | $0-$20/mes | Cloudflare free tier, CloudFront |

Para 1M API calls/día: el costo del lado del cliente es efectivamente $0 (librería + connection pool). El API Gateway del lado del servidor agrega ~$105/mes. El costo principal es tiempo de desarrollador para implementar retry logic, circuit breakers y monitoring.

## Preguntas Frecuentes

**Q: ¿`fetch` lanza un error ante una respuesta 404?**
A: No. `fetch` solo falla ante errores de red. Un `404` resuelve con normalidad; comprueba `response.ok` o `response.status` antes de procesar el body.

**Q: ¿Necesito una librería externa para llamar a APIs HTTP en Java?**
A: No. Desde Java 11, `java.net.http.HttpClient` está incorporado y soporta peticiones síncronas y asíncronas. Para versiones antiguas de Java, puedes usar Apache HttpClient o OkHttp.

**Q: ¿Cómo envío JSON en una petición POST?**
A: Define la cabecera `Content-Type: application/json` y pasa la cadena JSON serializada como cuerpo de la petición. En Python, usa el parámetro `json=` de `requests.post`; en JS, usa `JSON.stringify()` con la opción `body`.

**Q: ¿Cómo cancelo una petición de larga duración?**
A: Usa `AbortController` en JavaScript (opción `signal`), el parámetro `timeout` en Python `requests`, o `HttpRequest.timeout()` en Java. Todos los clientes HTTP modernos soportan cancelación de peticiones.

**Q: ¿Debería usar GET o POST para queries de búsqueda?**
A: Usa GET para recuperación idempotente y cacheable donde los parámetros quepan en una URL. Usa POST para payloads grandes, datos sensibles, o operaciones no idempotentes. Las peticiones GET no deberían tener side effects.

**Q: ¿Cómo manejo la paginación de APIs?**
A: La mayoría de las APIs REST usan uno de tres patrones: offset/limit (`?page=2&limit=20`), basado en cursor (`?cursor=abc123`), o cabeceras `Link`. Lee la documentación de la API para determinar qué patrón se usa. Para paginación basada en cursor, almacena el cursor de cada respuesta y pásalo en la siguiente petición hasta que no se devuelva cursor.

**Q: ¿Qué códigos de estado HTTP debería reintentar?**
A: Reintenta `429` (rate limited), `500`, `502`, `503`, y `504` con backoff exponencial. No reintentes `400`, `401`, `403`, `404`, ni `422` — son errores de cliente que no tendrán éxito al reintentar. Respeta la cabecera `Retry-After` en respuestas `429` y `503`.

**Q: ¿Cómo hago stream de respuestas grandes de APIs?**
A: En Python, usa `response.iter_content(chunk_size=8192)` para hacer stream del body. En JavaScript, usa `response.body.getReader()` para streaming. En Go, lee de `resp.Body` en chunks. El streaming evita cargar toda la respuesta en memoria.

**Q: ¿Debería usar connection timeout o read timeout?**
A: Ambos. Un connection timeout (típicamente 5-10s) cubre fallos de handshake TCP. Un read timeout (típicamente 30-60s) cubre respuestas lentas. Setéalos independientemente para distinguir entre "no puedo conectar" y "conecté pero el servidor está lento."

**Q: ¿Cómo testeo llamadas de API sin hitting el servidor real?**
A: Usa mock servers como WireMock (Java), nock (JavaScript), o `responses` (Python). Para tests de integración, usa herramientas como [Pact](/recipes/testing/api-contract-testing) para contract testing. Graba y reproduce interacciones HTTP con herramientas como VCR (Ruby) o Polly.js (JavaScript).
