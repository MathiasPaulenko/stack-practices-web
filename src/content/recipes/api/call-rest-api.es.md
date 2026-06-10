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
  - rest
  - http
  - api
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-json
  - /recipes/read-write-file
lastUpdated: "2026-06-09"
author: "StackPractices"
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

Esta receta muestra la forma idiomática y moderna de hacer una petición HTTP y leer la respuesta JSON en Python, JavaScript y Java, incluyendo un manejo básico de errores.

## Cuándo Usar

Usa esta receta cuando:

- Obtienes datos de una API interna o de terceros
- Envías datos de formularios o eventos a un servicio backend
- Te integras con plataformas SaaS (pagos, email, analítica)
- Construyes un SDK cliente o una CLI que habla con un servicio HTTP

## Solución

### Python

```python
import requests

response = requests.get("https://api.example.com/users/1", timeout=10)
response.raise_for_status()  # lanza en 4xx/5xx

data = response.json()
print(data["name"])
```

### JavaScript

```javascript
const response = await fetch("https://api.example.com/users/1");
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data.name);
```

### Java

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

- **Python** usa la popular librería `requests`. `raise_for_status()` convierte las respuestas de error en excepciones; `.json()` parsea el cuerpo. Pasa siempre un `timeout`.
- **JavaScript** usa la API `fetch` incorporada (Node 18+ y todos los navegadores modernos). Ojo: `fetch` solo falla ante errores de red; debes comprobar `response.ok` tú mismo.
- **Java** usa el `java.net.http.HttpClient` incorporado (Java 11+). Soporta llamadas síncronas (`send`) y asíncronas (`sendAsync`).

Una vez recibas el cuerpo, consulta [Parsear JSON](/es/recipes/parse-json) para convertirlo en datos tipados.

## Variantes

| Lenguaje | Cliente | Soporte async | Notas |
|----------|---------|---------------|-------|
| Python | `requests` / `httpx` | `httpx` para async | `requests` es solo síncrono |
| JavaScript | `fetch` (nativo) | promesas nativas | comprueba `response.ok` |
| Java | `HttpClient` (Java 11+) | `sendAsync` | sin dependencias extra |

## Mejores Prácticas

- **Define siempre un timeout**: una petición colgada puede bloquear un hilo o worker indefinidamente.
- **Comprueba el código de estado**: no asumas `2xx`; maneja `4xx`/`5xx` explícitamente.
- **Reutiliza el cliente**: crea un único `HttpClient`/sesión y reúsalo para agrupar conexiones.
- **Nunca registres secretos**: mantén las claves y tokens fuera de los logs y mensajes de error.
- **Reintenta fallos transitorios**: usa backoff exponencial para respuestas `429` y `5xx`.

## Errores Comunes

- **Olvidar `response.ok` en `fetch`**: un `404` igual resuelve la promesa; debes comprobarlo manualmente.
- **Sin timeout**: el valor por defecto en muchos clientes es infinito, lo que agota recursos.
- **Bloquear el event loop**: en JS, usa siempre `await` en las llamadas de red; nunca hagas espera activa.
- **Credenciales hardcodeadas**: lee las claves desde variables de entorno, no del código fuente.
- **Ignorar los límites de tasa**: respeta la cabecera `Retry-After` para evitar bloqueos o baneos.

## Preguntas Frecuentes

**Q: ¿`fetch` lanza un error ante una respuesta 404?**
A: No. `fetch` solo falla ante errores de red. Un `404` resuelve con normalidad; comprueba `response.ok` o `response.status`.

**Q: ¿Necesito una librería externa para llamar a APIs HTTP en Java?**
A: No. Desde Java 11, `java.net.http.HttpClient` está incorporado y soporta peticiones síncronas y asíncronas.

**Q: ¿Cómo envío JSON en una petición POST?**
A: Define la cabecera `Content-Type: application/json` y pasa la cadena JSON serializada como cuerpo de la petición.
