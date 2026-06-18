---
contentType: recipes
slug: call-rest-api
title: "Llamar a una API REST"
description: "Cómo hacer peticiones HTTP a una API REST y manejar la respuesta JSON en varios lenguajes."
metaDescription: "Aprende a llamar a una API REST en Python, JavaScript y Java con ejemplos prácticos de peticiones HTTP, manejo de errores y buenas prácticas."
difficulty: beginner
topics:
  - api
tags:
  - api
  - rest
  - http
relatedResources:
  - /recipes/parse-json
  - /recipes/read-write-file
  - /recipes/api/middleware
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a llamar a una API REST en Python, JavaScript y Java con ejemplos prácticos de peticiones HTTP, manejo de errores y buenas prácticas."
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

Esta receta muestra la forma idiomática y moderna de hacer una petición HTTP y leer la respuesta JSON en Python, JavaScript y Java, incluyendo manejo básico de errores y configuración de timeouts.

## Cuándo Usar

Usa esta receta cuando:

- Obtienes datos de una API interna o de terceros
- Envías datos de formularios o eventos a un servicio backend
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

## Explicación

- **Python** usa la popular librería `requests`. `raise_for_status()` convierte las respuestas de error en excepciones; `.json()` parsea el cuerpo. Pasa siempre un `timeout` para prevenir bloqueo indefinido en servidores lentos o irresponsivos.
- **JavaScript** usa la API `fetch` incorporada (Node 18+ y todos los navegadores modernos). Ojo: `fetch` solo falla ante errores de red — los errores HTTP como 404 o 500 igual resuelven la promesa, por lo que debes comprobar `response.ok` tú mismo.
- **Java** usa el `java.net.http.HttpClient` incorporado (Java 11+). Soporta llamadas síncronas (`send`) y asíncronas (`sendAsync`), y puede configurarse con connection pooling y timeouts de petición.

Una vez recibas el cuerpo, consulta [Parsear JSON](/es/recipes/parse-json) para convertirlo en datos tipados.

## Variantes

| Lenguaje | Cliente | Soporte async | Notas |
|----------|---------|---------------|-------|
| Python | `requests` / `httpx` | `httpx` para async | `requests` es solo síncrono |
| JavaScript | `fetch` (nativo) | promesas nativas | comprueba `response.ok` |
| Java | `HttpClient` (Java 11+) | `sendAsync` | sin dependencias extra |

## Mejores Prácticas

- **Define siempre un timeout**: una petición colgada puede bloquear un hilo o worker indefinidamente. En Python, pasa `timeout=10` a `requests.get`; en Node, usa `AbortController` con `fetch`; en Java, setea un timeout en el builder de `HttpClient`.
- **Comprueba el código de estado**: no asumas `2xx`; maneja `4xx`/`5xx` explícitamente. Un `401` significa que la autenticación falló; un `429` significa que estás rate-limited; un `503` significa que el servicio está temporalmente no disponible.
- **Reutiliza el cliente**: crea un único `HttpClient`/sesión y reúsalo para agrupar conexiones. Crear un nuevo cliente por petición desperdicia recursos y previene la reutilización de conexiones TCP.
- **Nunca registres secretos**: mantén las claves y tokens fuera de los logs y mensajes de error. Si debes loggear una URL de petición, redacta los query parameters que contienen credenciales.
- **Reintenta fallos transitorios**: usa backoff exponencial para respuestas `429` y `5xx`. Un `503` con una cabecera `Retry-After` te dice exactamente cuándo reintentar; respétala.
- **Setea cabeceras apropiadas**: incluye siempre `Accept: application/json` cuando esperes JSON, y `Content-Type: application/json` cuando envíes un body JSON. Algunas APIs rechazan peticiones sin estas cabeceras.
- **Maneja redirects con cuidado**: algunos clientes HTTP siguen redirects automáticamente, lo que puede filtrar cabeceras sensibles como `Authorization` a hosts no deseados. Desactiva redirects automáticos o haz whitelist de dominios permitidos.

## Errores Comunes

- **Olvidar `response.ok` en `fetch`**: un `404` igual resuelve la promesa; debes comprobarlo manualmente. Esta es la fuente más común de fallos silenciosos en código HTTP de JavaScript.
- **Sin timeout**: el valor por defecto en muchos clientes es infinito, lo que agota recursos. Una sola API no responsiva puede eventualmente consumir todos los threads o workers disponibles.
- **Bloquear el event loop**: en JS, usa siempre `await` en las llamadas de red; nunca hagas espera activa. Las llamadas HTTP síncronas congelan todo tu servidor por la duración de la petición.
- **Credenciales hardcodeadas**: lee las claves desde variables de entorno, no del código fuente. Las credenciales commiteadas son un liability permanente incluso si las rotas después.
- **Ignorar los límites de tasa**: respeta la cabecera `Retry-After` para evitar bloqueos o baneos. Algunas APIs ponen en lista negra permanentemente IPs que exceden los límites repetidamente.
- **No manejar errores de parseo JSON**: un servidor devolviendo HTML (como una página de error de Cloudflare) en lugar de JSON hará que `.json()` lance una excepción. Envuelve el parseo en try/catch e inspecciona el body raw en caso de fallo.
- **Enviar datos sensibles en query parameters**: las URLs son loggeadas por proxies, navegadores y access logs del servidor. Usa cabeceras de petición o bodies POST para tokens y credenciales.

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
