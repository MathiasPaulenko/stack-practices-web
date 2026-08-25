---
contentType: recipes
slug: api-documentation-openapi
title: "OpenAPI con Swagger UI y Redoc: guía práctica"
description: Guía práctica para documentar APIs REST con OpenAPI. Genera docs interactivas con Swagger UI y Redoc en Python, JavaScript y Java con linting en CI.
metaDescription: Guía práctica de documentación REST con OpenAPI. Genera docs interactivas con Swagger UI y Redoc en Python, JavaScript y Java, más linting en CI.
difficulty: beginner
topics:
  - api
tags:
  - api
  - documentation
  - java
  - rest
  - http
relatedResources:
  - /recipes/rest-api-design
  - /recipes/api-versioning
  - /recipes/handle-errors
  - /recipes/handle-cors
  - /recipes/input-validation
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-08-25"
publishedAt: "2026-02-18"
author: Mathias Paulenko
seo:
  metaDescription: Guía práctica de documentación REST con OpenAPI. Genera docs interactivas con Swagger UI y Redoc en Python, JavaScript y Java, más linting en CI.
  keywords:
    - openapi docs
    - documentacion swagger
    - redoc
    - ejemplo documentacion api
---

## Visión General

La mayoría de las documentaciones de API se pudren en READMEs, páginas de Confluence o hilos de Slack. Cada vez que publicas un cambio, esas páginas ya están desactualizadas. OpenAPI, la especificación que surgió de Swagger, te permite describir endpoints, esquemas y errores en un solo archivo YAML o JSON. Ese mismo archivo puede impulsar documentación interactiva, SDKs de cliente y tests de contrato.

Esta guía usa ejemplos en Python con FastAPI, JavaScript con Express y Java con SpringDoc, y repasa los trade-offs de cada uno. También compara Swagger UI y Redoc, y explica cómo evitar que el spec se pudra una vez está en producción. Recursos relacionados: [Implementar logging y audit trails de API](/recipes/api-logging-audit/), [Implementar Rate Limiting de APIs con Redis](/recipes/api-rate-limiting-redis/), [Paginacion por Cursor con PostgreSQL](/recipes/cursor-pagination-postgresql/) y [Construir notificaciones en tiempo real con WebSockets](/recipes/real-time-notifications/). Ver también [Server-Sent Events con Node.js y Express](/recipes/server-sent-events-node/).

## Cuándo Usar

Usa esta receta cuando necesites documentación interactiva que se mantenga sincronizada con el código, cuando quieras generar SDKs de cliente en varios lenguajes, cuando tu equipo construya contract-first, o cuando necesites validar solicitudes entrantes contra un esquema formal.

Omitela si la API es solo para uso interno y tú eres el único consumidor: un README corto probablemente basta. En cuanto un segundo equipo dependa de ella, un contrato escrito empieza a dar frutos.

## Solución

### Python

```python
from fastapi import FastAPI

app = FastAPI(title="Book API", version="1.0.0")

@app.get("/books/{book_id}", tags=["books"])
def get_book(book_id: int):
    """Retrieve a book by its ID."""
    return {"id": book_id, "title": "Clean Code"}

# FastAPI auto-generates /openapi.json and /docs (Swagger UI)
```

### JavaScript

```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.listen(3000);
```

### Java

```java
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@RequestMapping("/books")
public class BookController {

    @Operation(summary = "Get book by ID", description = "Returns a single book")
    @ApiResponse(responseCode = "200", description = "Found the book")
    @GetMapping("/{id}")
    public Book getBook(@PathVariable Long id) {
        return new Book(id, "Clean Code");
    }

    record Book(Long id, String title) {}
}
// springdoc-openapi auto-generates /v3/api-docs and /swagger-ui/index.html
```

## Explicación

Los equipos generan specs OpenAPI de dos maneras, y la elección correcta depende de quién sea el dueño del contrato.

Con **code-first**, un único equipo construye la API y deja que FastAPI, SpringDoc o tsoa generen `openapi.json` a partir de anotaciones o decoradores. El spec se mantiene cerca del código, pero puede filtrar modelos internos si no usas DTOs.

Suelo elegir design-first cuando los equipos de frontend, backend y móvil necesitan ponerse de acuerdo en un contrato antes de escribir código. Entonces escribimos el YAML o JSON a mano, lo publicamos en SwaggerHub o Stoplight y generamos stubs y clientes a partir de ese contrato. Ese contrato obliga a decidir de forma explícita campos, errores y versionado. El riesgo es que, sin tests, el spec puede convertirse en una lista de deseos mientras el código hace otra cosa.

Una vez que existe el spec, impulsa documentación interactiva, un sitio de documentación limpio y generadores de clientes. **Swagger UI** permite a los desarrolladores llamar endpoints desde el navegador, **Redoc** renderiza un sitio de tres paneles y herramientas como `openapi-generator-cli` producen clientes tipados en TypeScript, Python, Java y otros lenguajes.

## Variantes

| Herramienta | Lenguaje | Enfoque | Salida |
| --- | --- | --- | --- |
| FastAPI | Python | Code-first | /openapi.json + /docs auto-generados |
| Flask-RESTX | Python | Code-first | Swagger UI integrado |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Servir YAML pre-escrito |
| tsoa | TypeScript | Code-first | Generar spec desde decoradores |

## Lo que funciona

- **Fija la versión del spec a la versión de la API** en el campo `info.version`, y documenta deprecaciones con `deprecated: true` más un path de reemplazo.
- **Añade ejemplos** a los esquemas de solicitud y respuesta; son la forma más rápida de frenar preguntas de integración antes de que empiecen.
- **Agrupa operaciones con tags** como `users`, `orders` o `products` para que Swagger UI y Redoc muestren secciones colapsables.
- **Incluye respuestas de error reales**, no solo una respuesta `200` exitosa. Añade `400`, `401`, `404`, `409` y `5xx` con cuerpos problem-detail.
- **Valida el spec en CI** con `npx @redocly/cli lint` o `spectral`; un `$ref` roto o un `operationId` ausente romperá clientes generados sin avisar.

## Errores Comunes

Las herramientas code-first son útiles, pero solo ayudan si expones DTOs, no entidades de base de datos, en el spec. De lo contrario, el spec se desvía del código de formas difíciles de detectar.

Toda operación que requiera auth necesita una entrada `security` y un componente `securitySchemes` correspondiente. Olvidar cualquiera de los dos es una forma rápida de publicar un muro de autenticación sin documentar.

Los modelos internos deben mantenerse fuera de `components/schemas`. Usa DTOs dedicados para solicitud y respuesta.

Los campos nullable también sorprenden: OpenAPI 3.0 usa `nullable: true`, mientras que 3.1 usa `type: [string, null]`. Una vez elegido, valida contra un linter.

Por último, evita escribir URLs de servidor directamente en el spec; coloca variables en el array `servers`, como `{serverUrl}`, para que staging y producción puedan compartir el mismo spec.

## Solución de Problemas

Si Redoc o Swagger UI muestra una página en blanco, probablemente el spec esté malformado. Ejecuta el linter de Redocly para encontrar la línea y la regla exactas.

Si los clientes generados no compilan, busca valores `operationId` duplicados, palabras reservadas en nombres de esquema y valores `enum` que no sean identificadores válidos en el lenguaje destino.

Si el spec no coincide con el comportamiento desplegado, añade tests de contrato con Schemathesis o Pact en CI para que el desfase del spec rompa el build antes de llegar a los usuarios.

Si los ejemplos en Swagger UI se ven mal, asegúrate de que el campo `example` esté al nivel correcto del `schema`, y de que los ejemplos de arrays usen `items.example` en su lugar.

**Los specs grandes ralentizan la página de documentación**: divídelo con punteros `$ref` y empaquétalo con `redocly bundle` antes de mostrarlo.

## Lectura Adicional

- La [OpenAPI Specification (latest)](https://spec.openapis.org/oas/latest.html) es la referencia oficial para nombres de campos, tipos y diferencias de versión.
- La documentación de [Redocly CLI](https://redocly.com/docs/cli) cubre la validación, empaquetado y publicación de specs OpenAPI.
- La documentación de [FastAPI sobre OpenAPI](https://fastapi.tiangolo.com/reference/openapi/) explica cómo FastAPI genera `/openapi.json` y `/docs`.
- En Spring Boot, [Springdoc OpenAPI](https://springdoc.org/) cubre las anotaciones y las personalizaciones comunes.

## Notas de Producción

- **Versiona el spec en el control de código fuente** y etiqueta los releases con la misma versión que la API (`info.version` debe coincidir con la versión desplegada de la API).
- **Sirve la documentación desde un artefacto de build separado** o una ruta de CDN, de modo que actualizar el spec no requiera desplegar toda la aplicación de nuevo.
- **Valida el spec en CI** antes de publicar; un `$ref` roto o un `operationId` ausente romperá generadores de clientes y la salida de Redoc.
- **Monitorea los endpoints de documentación** (`/docs`, `/redoc`, `/openapi.json`) para detectar 4xx/5xx y latencia p99, especialmente después de actualizar el spec.

## Puntos Clave

- OpenAPI convierte un único archivo de spec en documentación interactiva, SDKs de cliente y tests de contrato, así que tu documentación se mantiene sincronizada con el código.
- Swagger UI es la mejor opción cuando los desarrolladores necesitan llamar endpoints desde el navegador; Redoc es mejor para una experiencia de lectura limpia y centrada en la documentación.
- FastAPI, Express y SpringDoc pueden generar el spec automáticamente desde el código, pero los equipos con varios consumidores deberían considerar design-first con un registry compartido.
- Valida el spec en CI con `redocly lint` o `spectral` para detectar referencias rotas, `operationId`s ausentes y desfase de versiones antes de que lleguen a producción.

## Preguntas Frecuentes

### ¿Debería usar code-first o design-first?

Si la API es interna y solo la consume tu equipo, empieza con code-first. FastAPI, SpringDoc y tsoa pueden derivar el spec de tus anotaciones, así que el contrato se mantiene cerca del código.

```python
@app.get("/books/{book_id}")
def get_book(book_id: int):
    ...
```

Si los equipos de frontend, móvil, backend o socios externos necesitan acordar el contrato primero, escribe el YAML de OpenAPI y publícalo en SwaggerHub o Stoplight antes de generar stubs.

```bash
openapi-generator-cli generate -i openapi.yaml -g python-fastapi
```

El riesgo de design-first es el desfase: el spec se convierte en una ilusión mientras el código hace otra cosa. Evítalo con tests de contrato (Schemathesis, Pact) en CI. El riesgo de code-first es filtrar modelos internos; evítalo retornando DTOs, no entidades de base de datos.

### ¿Cómo mantengo la documentación sincronizada con el código desplegado?

Genera el spec en CI desde el código, publícalo en un registry como SwaggerHub o Stoplight, y apunta la documentación desplegada a la última versión. En GitHub Actions.

```yaml
name: Generate OpenAPI Spec
on: push
jobs:
  spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python -m app.main --export-openapi > openapi.json
      - run: npx @redocly/cli lint openapi.json
      - run: npx @redocly/cli build-docs openapi.json -o docs/
```

Ejecuta `npx @redocly/cli lint openapi.yaml` en cada PR para detectar violaciones de esquema, respuestas faltantes y referencias rotas. Publícalo como artefacto del build, despliega la documentación junto con la API y luego verifica la API contra el spec ejecutando el siguiente comando:

```bash
schemathesis run openapi.json --base-url http://localhost:8000
```

### ¿Puedo convertir Swagger 2.0 a OpenAPI 3.0?

Sí. Puedes usar la CLI `swagger2openapi` o el conversor integrado de Swagger Editor. La mayoría de herramientas modernas maneja 3.0 de forma nativa. Ejecuta `npx swagger2openapi swagger.json -o openapi.json` y espera algunos cambios mecánicos. `host`, `basePath` y `schemes` se combinan en un array `servers`; `definitions` y `responses` se mueven a `components/schemas` y `components/responses`; y `securityDefinitions` pasa a ser `components/securitySchemes`. Los campos globales `produces` y `consumes` desaparecen; ahora cada operación declara su negociación de contenido en su propio bloque `content`. Después, valida el resultado con `npx @redocly/cli lint openapi.json`. Algunos casos extremos, como `type: file` pasando a `format: binary` y `collectionFormat` convirtiéndose en parámetros `style` y `explode`, aún requieren ajustes manuales.

### ¿Cómo documento autenticación y autorización en OpenAPI?

La autenticación se describe en `components/securitySchemes` y luego se aplica a cada operación. El ejemplo siguiente muestra un esquema Bearer JWT.

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Para las API keys, usa `type: apiKey` e indica en qué header o query las esperas, como en el ejemplo siguiente.

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

OAuth2 requiere declarar el flujo y los scopes permitidos.

```yaml
components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://api.example.com/oauth/authorize
          tokenUrl: https://api.example.com/oauth/token
          scopes:
            read: Read access
            write: Write access
```

Una vez definidos los esquemas, añade la entrada `security` a nivel de operación.

```yaml
paths:
  /books:
    get:
      security:
        - BearerAuth: []
    post:
      security:
        - OAuth2: [write]
```

Para tokens JWT en OpenAPI 3.1, sigue usando `type: http` y `scheme: bearer`. El tipo `apiKey` todavía es válido, pero no encaja con bearer tokens, porque describe una clave de API personalizada en lugar de un esquema HTTP bearer.

### ¿Cómo manejo el versionado en specs OpenAPI?

La versión del spec va en `info.version`; elige una estrategia de versionado que los clientes puedan descubrir fácilmente.

```yaml
info:
  title: Book API
  version: 2.1.0
```

Usa versionado semántico: major para cambios incompatibles, minor para endpoints nuevos y patch para correcciones. Si prefieres versionar por URL, incluye la versión en la URL del servidor.

```yaml
servers:
  - url: https://api.example.com/v2
```

El versionado por header se resuelve con un parámetro adicional.

```yaml
parameters:
  - name: X-API-Version
    in: header
    required: true
    schema:
      type: string
      default: "2"
```

Para marcar una operación como deprecada, añade `deprecated: true` y explica la alternativa en la descripción.

```yaml
paths:
  /books/{id}:
    get:
      deprecated: true
      description: Use /v2/books/{id} instead
```

Durante los períodos de migración, mantén ambas versiones del spec y deja que el cliente negocie la versión con el header `Accept`, por ejemplo enviando `Accept: application/vnd.api+json;version=2`.

### ¿Cómo genero SDKs de cliente desde specs OpenAPI?

Puedes generar clientes tipados en varios lenguajes con `openapi-generator-cli`. Instálalo primero con `npm install @openapitools/openapi-generator-cli -g`. Para cada lenguaje, ejecuta el comando correspondiente:

```bash
# TypeScript
openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts

# Python
openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py
# añade --library httpx si tu generador lo soporta

# Java
openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson
```

Guarda las opciones de generación en un archivo `.openapi-generator-config.json` como este:

```json
{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}
```

Luego publica los clientes generados en el registry de paquetes correcto: npm para TypeScript, PyPI para Python y Maven Central para Java. Por último, automatiza los pasos de generar, probar y publicar en CI cada vez que cambie el spec.


### ¿Cómo documento paginación en OpenAPI?

OpenAPI no obliga a un estilo de paginación. Elige entre `cursor` u `offset/limit` y envuelve el resultado en un schema de contenedor. El ejemplo siguiente muestra paginación por offset.

```yaml
parameters:
  - name: offset
    in: query
    schema:
      type: integer
      default: 0
      minimum: 0
  - name: limit
    in: query
    schema:
      type: integer
      default: 20
      maximum: 100
```

A continuación se define el contenedor de la respuesta paginada.

```yaml
components:
  schemas:
    PaginatedBooks:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Book'
        total:
          type: integer
        offset:
          type: integer
        limit:
          type: integer
```

La paginación por cursor funciona con un parámetro opaco.

```yaml
parameters:
  - name: cursor
    in: query
    schema:
      type: string
  - name: page_size
    in: query
    schema:
      type: integer
      default: 20
```

También puedes incluir headers `Link` en las respuestas, como `Link: <https://api.example.com/books?cursor=abc>; rel="next"`, y documentar los headers de límite de frecuencia `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset` en tus respuestas.

### ¿Cómo manejo subidas y descargas de archivos en OpenAPI?

Para subidas de archivos en OpenAPI 3.0, usa `format: binary` en una propiedad de tipo string dentro del cuerpo de una petición `multipart/form-data`. Si necesitas varios archivos, cambia la propiedad a un array de cadenas binarias.

En OpenAPI 3.1, `format: binary` se convierte en `contentEncoding: binary`. Para descargas, la respuesta debería usar el content type `application/octet-stream`, lo que significa que también debes declarar un esquema de cadena binaria para el cuerpo de la respuesta. Las imágenes funcionan de la misma forma: declara el tipo de contenido, como `image/png`, y un esquema binario.

Para limitar el tamaño de subida, añade `maxLength` al campo binario e indica el límite en la descripción, por ejemplo `10485760` bytes para 10 MB.

### ¿Cómo documento webhooks en OpenAPI?

En OpenAPI 3.1, los webhooks pasan a un campo `webhooks` de nivel superior. Declara cada evento como una clave con una operación `post`, y apunta el cuerpo de la petición a un esquema reutilizable como `BookEvent` en tus componentes.

```yaml
webhooks:
  bookCreated:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookEvent'
      responses:
        '200':
          description: Event received
```

Define el esquema del payload una vez en `components/schemas` y reutilízalo en los webhooks. También puedes exponer un endpoint de suscripción; en su descripción incluye las reglas de reintentos y los códigos HTTP que tu lógica de entrega espera recibir.

### ¿Cómo valido specs OpenAPI en CI?

Redocly y Spectral son los linters que más uso. Con Redocly puedes instalar el CLI globalmente (`npm install -g @redocly/cli`) y ejecutar `redocly lint openapi.yaml`. A continuación añade un archivo de reglas sencillo para reforzar tus convenciones.

```yaml
rules:
  operation-operationId-unique:
    severity: error
  operation-summary:
    severity: warn
    max_length: 50
```

Spectral funciona de forma similar: instálalo con `npm install -g @stoplight/spectral-cli`, extiende el ruleset OAS incorporado y personaliza las reglas que te importen. Luego añádelo a GitHub Actions.

```yaml
- name: Lint OpenAPI
  run: npx @redocly/cli lint openapi.yaml
```

Valida la estructura del spec: busca `operationId` faltante, destinos `$ref` no definidos, esquemas de respuesta faltantes y parámetros de path duplicados. Para corregir problemas comunes ejecuta `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'` para filtrar reglas específicas.

### ¿Cómo documento respuestas de error con RFC 7807 Problem Details?

Para los errores RFC 7807, usa el media type `application/problem+json` y un schema `Problem` reutilizable.

```yaml
components:
  schemas:
    Problem:
      type: object
      properties:
        type:
          type: string
          format: uri
          default: about:blank
        title:
          type: string
        status:
          type: integer
        detail:
          type: string
        instance:
          type: string
          format: uri
```

Después referencia ese schema en las respuestas de error mediante `$ref` en cada endpoint.

```yaml
responses:
  '404':
    description: Book not found
    content:
      application/problem+json:
        schema:
          $ref: '#/components/schemas/Problem'
        examples:
          not_found:
            value:
              type: https://api.example.com/errors/not-found
              title: Book not found
              status: 404
              detail: Book with ID 42 not found
              instance: /books/42
```

Documenta los códigos de error comunes, como 400 para errores de validación, 401 para autenticación faltante, 403 para permisos insuficientes, 409 para conflictos, 422 para fallos semánticos y 429 para limitación de frecuencia.


### ¿Cómo documento rate limiting de API en OpenAPI?

Los límites de frecuencia se pueden expresar con headers de respuesta y extensiones `x-`. Añade esos headers a las respuestas para que los clientes sepan cuántas peticiones les quedan.

```yaml
responses:
  '200':
    headers:
      X-RateLimit-Limit:
        schema:
          type: integer
          description: Maximum requests per window
      X-RateLimit-Remaining:
        schema:
          type: integer
          description: Remaining requests in current window
      X-RateLimit-Reset:
        schema:
          type: integer
          description: Unix timestamp when the window resets
```

Para límites por plan, usa extensiones personalizadas.

```yaml
x-rate-limit:
  free: 100/hour
  pro: 10000/hour
  enterprise: 100000/hour
```

Describe el comportamiento de throttling en la descripción. Por ejemplo: `description: Rate limited to 100 requests per hour for free tier. Returns 429 with Retry-After header when exceeded.`. No olvides incluir la respuesta 429.

```yaml
'429':
  description: Too many requests
  headers:
    Retry-After:
      schema:
        type: integer
        description: Seconds to wait before retrying
```

También puedes añadir extensiones `x-codegen` para que los SDKs de cliente generados sepan cómo manejar los límites de frecuencia.

### ¿Cómo manejo esquemas polimórficos en OpenAPI?

Los tipos polimórficos se modelan con las keywords `oneOf`, `anyOf` y `allOf`. El ejemplo siguiente es una unión discriminada.

```yaml
components:
  schemas:
    Pet:
      oneOf:
        - $ref: '#/components/schemas/Dog'
        - $ref: '#/components/schemas/Cat'
      discriminator:
        propertyName: type
        mapping:
          dog: '#/components/schemas/Dog'
          cat: '#/components/schemas/Cat'
```

Cada subtipo incluye el campo discriminador.

```yaml
Dog:
  type: object
  properties:
    type:
      type: string
      enum: [dog]
    breed:
      type: string
  required: [type, breed]
```

Para aceptar tipos mixtos, usa `anyOf` en lugar de herencia.

```yaml
PropertyValue:
  anyOf:
    - type: string
    - type: number
    - type: boolean
    - type: array
      items:
        $ref: '#/components/schemas/PropertyValue'
```

Cuando necesites heredar propiedades sin un discriminador, usa `allOf` para combinar los esquemas.

```yaml
Animal:
  allOf:
    - $ref: '#/components/schemas/BaseEntity'
    - type: object
      properties:
        species:
          type: string
```

### ¿Cómo genero servidores simulados desde specs OpenAPI?

Prism y OpenAPI Generator pueden servir un servidor simulado a partir del spec. Para arrancar el mock con Prism, usa el comando del ejemplo; el servicio devolverá respuestas basadas en los ejemplos del schema.

```yaml
Book:
  type: object
  properties:
    id:
      type: integer
      example: 42
    title:
      type: string
      example: Clean Code
```

Si prefieres datos aleatorios, añade el flag `--dynamic`. También puedes generar un servidor simulado estático con el siguiente comando:

```bash
openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server
```

Luego úsalo en tests de integración apuntando los clientes a `http://localhost:4010` como base URL.

### ¿Cómo documento la deprecación y los headers Sunset de una API?

Marca las operaciones deprecadas con `deprecated: true` y añade el header `Sunset` con la fecha de eliminación.

```yaml
paths:
  /v1/books:
    get:
      deprecated: true
      description: Deprecated in favor of /v2/books. Will be removed on 2025-12-31.
```

También incluye el header `Deprecation` para advertir al cliente.

```yaml
responses:
  '200':
    headers:
      Deprecation:
        schema:
          type: string
          example: true
      Sunset:
        schema:
          type: string
          example: Wed, 31 Dec 2025 23:59:59 GMT
          description: Date when the endpoint will be removed
```

En la descripción de la operación añade el path de migración, por ejemplo: `description: Migrate to /v2/books which supports cursor-based pagination and additional filters.`. Para rastrear el uso de endpoints deprecados, registra las peticiones y notifica a los consumidores por email o webhook. También puedes usar el header `Link` para apuntar al reemplazo: `Link: </v2/books>; rel="successor-version"`.

### ¿Cómo uso extensiones de OpenAPI para metadatos personalizados?

Los campos propietarios en OpenAPI empiezan con `x-`. Úsalos para pistas de generación de código, propiedad interna o metadatos del portal.

```yaml
paths:
  /books:
    get:
      x-codegen-request-body-name: bookRequest
      x-aws-api-gateway-integration:
        type: aws_proxy
        uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123:function:books/invocations
        httpMethod: POST
```

Para metadatos internos, puedes añadir campos como `x-internal`, `x-owner` o `x-sla`; en portales de documentación, campos como `x-display-name`, `x-sidebar-order` o `x-badge` para personalizar la barra lateral; y para los generadores de código, pistas como `x-codegen-request-body-name`.

```yaml
x-enum-descriptions:
  - Active user
  - Inactive user
  - Suspended user
```

Valida las extensiones en CI con reglas personalizadas de Spectral.

```yaml
rules:
  x-internal-must-have-owner:
    given: $.paths.*[?(@.x-internal == true)]
    then:
      field: x-owner
      function: truthy
```

### ¿Cómo documento tests de API y tests de contrato en OpenAPI?

El spec es una buena fuente de tests automatizados. Schemathesis puede leer el spec, generar peticiones y comprobar que las respuestas encajan con el esquema ejecutando `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. Dredd puede validar el spec contra hooks en vivo con `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. También puedes importar una colección de Postman y ejecutarla con `newman run collection.json --env-var base_url=http://localhost:8000`, publicar pacts directamente desde el spec para tests de contrato con `pact-broker publish pacts/ --consumer-app-version 1.0.0`, o generar un cliente de prueba rápido con `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client`. Incluso puedes registrar la cobertura en una extensión.

```yaml
x-test-coverage:
  /books: 95%
  /books/{id}: 88%
```

### ¿Cómo manejo referencias circulares en esquemas OpenAPI?

Una referencia circular ocurre cuando un esquema apunta de vuelta a sí mismo. Basta con añadir una referencia al componente.

```yaml
components:
  schemas:
    Category:
      type: object
      properties:
        name:
          type: string
        subcategories:
          type: array
          items:
            $ref: '#/components/schemas/Category'
```

La mayoría de herramientas OpenAPI maneja referencias circulares correctamente. En generación de código, las referencias circulares producen tipos recursivos.

```yaml
class Category:
    name: str
    subcategories: List[Category]
```

Para estructuras profundamente anidadas, limita la profundidad de recursión con `x-max-depth: 5`. En serialización JSON, maneja las referencias circulares con `default=str` o codificadores personalizados. En Swagger UI, las referencias circulares pueden causar expansión infinita; usa `x-stoplight:readonly` para evitar la edición. Para validar, usa `jsonschema` con un `RefResolver` que maneje referencias circulares, como se muestra aquí: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.

### ¿Cómo documento observabilidad y trazabilidad de API en OpenAPI?

Puedes documentar los headers de trazabilidad y métricas con extensiones y headers estándar. Un ejemplo común es añadir un header de correlation ID.

```yaml
parameters:
  - name: X-Correlation-ID
    in: header
    schema:
      type: string
      format: uuid
    description: Unique identifier for tracing requests across services
```

También documenta los headers de OpenTelemetry si tu stack los usa.

```yaml
x-opentelemetry:
  enabled: true
  service_name: book-api
  trace_parent_header: traceparent
```

Incluye los endpoints de métricas en el spec.

```yaml
paths:
  /metrics:
    get:
      summary: Prometheus metrics
      responses:
        '200':
          content:
            text/plain:
              schema:
                type: string
```

No olvides añadir un endpoint de health check.

```yaml
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service healthy
        '503':
          description: Service unavailable
```

La extensión `x-observability` permite agrupar la configuración de trazabilidad.

```yaml
x-observability:
  tracing:
    type: opentelemetry
    sampling_rate: 0.1
  metrics:
    type: prometheus
    endpoint: /metrics
```


### ¿Cómo manejo la negociación de contenido en OpenAPI?

Los clientes pueden pedir distintos formatos, así que declara cada variante dentro del bloque `content` de la respuesta; por ejemplo, junto a JSON añade XML si tu API también lo entrega.

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Book'
      application/xml:
        schema:
          $ref: '#/components/schemas/Book'
      text/csv:
        schema:
          type: string
          description: CSV export of book data
```

También documenta el header `Accept` para que el cliente pueda elegir.

```yaml
parameters:
  - name: Accept
    in: header
    schema:
      type: string
      default: application/json
      enum: [application/json, application/xml, text/csv]
```

Para negociar por media type versionado, declina la versión en el content type.

```yaml
content:
  application/vnd.api+json;version=1:
    schema:
      $ref: '#/components/schemas/BookV1'
  application/vnd.api+json;version=2:
    schema:
      $ref: '#/components/schemas/BookV2'
```

Documenta el comportamiento de la negociación de contenido, por ejemplo: `description: Returns JSON by default. Send Accept: application/xml for XML response. Send Accept: text/csv for CSV export.`

### ¿Cómo documento headers de caché de una API en OpenAPI?

El comportamiento de caché se documenta con headers HTTP estándar en las respuestas, como `Cache-Control`, `ETag` y `Last-Modified` según el caso.

```yaml
responses:
  '200':
    headers:
      Cache-Control:
        schema:
          type: string
          default: public, max-age=3600
          description: Cache response for 1 hour
      ETag:
        schema:
          type: string
          description: Entity tag for conditional requests
      Last-Modified:
        schema:
          type: string
          format: date-time
          description: Last modification timestamp
```

También documenta los headers de peticiones condicionales.

```yaml
parameters:
  - name: If-None-Match
    in: header
    schema:
      type: string
    description: Returns 304 if ETag matches
  - name: If-Modified-Since
    in: header
    schema:
      type: string
      format: date-time
```

No olvides la respuesta `304` para contenido no modificado.

```yaml
'304':
  description: Not modified
  headers:
    ETag:
      schema:
        type: string
```

La extensión `x-cache` permite guardar la configuración del CDN.

```yaml
x-cache:
  strategy: cache-on-edge
  ttl: 3600
  vary_by: [Accept-Language, Authorization]
```

### ¿Cómo documento operaciones de larga duración en OpenAPI?

Para operaciones asíncronas, usa una respuesta 202 Accepted con un header `Location` que los clientes puedan sondear. Documenta ese patrón.

```yaml
paths:
  /imports:
    post:
      responses:
        '202':
          description: Import accepted
          headers:
            Location:
              schema:
                type: string
                format: uri
                example: /imports/123
```

También documenta el endpoint de estado del proceso.

```yaml
paths:
  /imports/{id}:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [pending, processing, completed, failed]
                  progress:
                    type: integer
                    minimum: 0
                    maximum: 100
                  result_url:
                    type: string
                    format: uri
```

Para los callbacks de webhook.

```yaml
callbacks:
  onComplete:
    '{$request.body.callbackUrl}':
      post:
        requestBody:
          content:
            application/json:
            schema:
              $ref: '#/components/schemas/ImportResult'
```

Explica el comportamiento de timeout y las políticas de reintentos en la descripción de la operación.

### ¿Cómo documento buenas prácticas de seguridad de API en OpenAPI?

La seguridad cubre varios niveles: transporte, autenticación y autorización. Empieza con TLS en la URL del servidor, luego documenta CORS, validación de entradas, limitación de frecuencia y rotación de claves.

```yaml
servers:
  - url: https://api.example.com
    description: Production (TLS required)

x-cors:
  allowed_origins: [https://app.example.com]
  allowed_methods: [GET, POST, PUT, DELETE]
  allowed_headers: [Content-Type, Authorization]
  max_age: 3600

parameters:
  - name: email
    in: query
    schema:
      type: string
      format: email
      maxLength: 255
    required: true
```

Usa la descripción de la operación para notas sobre inyección SQL, añade `x-rate-limit-per-user` y `x-api-key-rotation` para limitación de frecuencia y rotación de claves, e incluye un contacto de seguridad en `info.contact`. Puedes rastrear el cumplimiento OWASP con `x-owasp-compliance`.

### ¿Cómo manejo la división de specs OpenAPI para APIs grandes?

Para APIs grandes, divide el spec en archivos externos y usa `$ref` para reunirlos. Mantén esquemas, paths, respuestas y ejemplos en sus propias carpetas, y comparte un esquema `Error` común desde una librería.

```yaml
components:
  schemas:
    Book:
      $ref: './schemas/Book.yaml'
    Author:
      $ref: './schemas/Author.yaml'
  responses:
    NotFound:
      $ref: './responses/NotFound.yaml'
```

```yaml
paths:
  /books:
    $ref: './paths/books.yaml'
  /books/{id}:
    $ref: './paths/book-by-id.yaml'
```

En CI, empaqueta con `redocly bundle openapi.yaml --output dist/openapi.json` y luego valida el resultado. Eso resuelve todas las referencias externas y te da un solo artefacto para publicar.


### ¿Cómo documento métricas y monitoreo de API en OpenAPI?

Documenta el endpoint de métricas y cualquier contador o histograma personalizado que expongas, por ejemplo en formato Prometheus.

```yaml
paths:
  /metrics:
    get:
      summary: Prometheus metrics
      responses:
        '200':
          content:
            text/plain:
              schema:
                type: string
                description: Prometheus format metrics
```

Las métricas personalizadas puedes guardarlas en una extensión como `x-metrics` para integrarlas con tu sistema de observabilidad.

```yaml
x-metrics:
  - name: http_requests_total
    type: counter
    labels: [method, path, status]
  - name: http_request_duration_seconds
    type: histogram
    labels: [method, path]
    buckets: [0.01, 0.05, 0.1, 0.5, 1.0]
```

Añade un endpoint de health check para que los clientes puedan detectar caídas.

```yaml
paths:
  /health:
    get:
      responses:
        '200':
          description: Healthy
        '503':
          description: Unhealthy
  /ready:
    get:
      responses:
        '200':
          description: Ready to accept traffic
        '503':
          description: Not ready
```

También puedes documentar objetivos de SLA con una extensión `x-sla` para que los consumidores conozcan los límites esperados.

```yaml
x-sla:
  availability: 99.9%
  response_time_p99: 200ms
  throughput: 10000 rps
```

### ¿Cómo documento la idempotencia de una API en OpenAPI?

Para operaciones POST que no deben ejecutarse dos veces, requiere un header `Idempotency-Key` y devuelve `409` cuando se reutiliza la misma clave.

```yaml
paths:
  /payments:
    post:
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
          description: Prevents duplicate payment processing
      responses:
        '201':
          description: Payment created
        '409':
          description: Duplicate idempotency key
```

Aprovecha la descripción de la operación para aclarar el comportamiento. `PUT` es naturalmente idempotente, así que menciónalo también. Algunos equipos añaden extensiones `x-idempotent: true` o `x-idempotency-key-ttl: 24h` para ayudar a generadores y middleware.

### ¿Cómo documento validación de peticiones de API en OpenAPI?

OpenAPI usa constraints estándar de JSON Schema, así que puedes validar a nivel del spec. Para strings, establece límites de longitud y patrón.

```yaml
schema:
  type: string
  minLength: 3
  maxLength: 100
  pattern: '^[a-zA-Z0-9_-]+$'
```

También puedes restringir números con rangos y marcar si los límites son exclusivos.

```yaml
schema:
  type: number
  minimum: 0
  maximum: 1000
  exclusiveMinimum: true
```

Los enums, arrays y objetos funcionan igual: lista valores permitidos, limita el número de elementos o marca campos como requeridos.

```yaml
schema:
  type: object
  required: [name, email]
  properties:
    name:
      type: string
      minLength: 1
    email:
      type: string
      format: email
```

Documenta el formato de las respuestas de error de validación para que los clientes puedan mapear campos a mensajes.

```yaml
'400':
  description: Validation error
  content:
    application/problem+json:
      schema:
        type: object
        properties:
          errors:
            type: array
            items:
              type: object
              properties:
                field: {type: string}
                message: {type: string}
                code: {type: string}
```

Para validadores personalizados, usa la extensión `x-validate` con una referencia a tu función de validación.

```yaml
x-validate:
  - rule: no-sql-injection
  - rule: max-nested-depth
    params: {max: 5}
```

### ¿Cómo documento contenedores de respuesta de API en OpenAPI?

Para un diseño consistente, documenta el contenedor de respuesta estándar. Empieza definiendo su esquema.

```yaml
components:
  schemas:
    ApiResponse:
      type: object
      properties:
        data:
          oneOf:
            - type: object
            - type: array
        meta:
          type: object
          properties:
            request_id:
              type: string
            timestamp:
              type: string
              format: date-time
            version:
              type: string
        errors:
          type: array
          items:
            $ref: '#/components/schemas/Error'
```

Después úsalo en las respuestas.

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          allOf:
            - $ref: '#/components/schemas/ApiResponse'
            - properties:
                data:
                  $ref: '#/components/schemas/Book'
```

Haz lo mismo con el contenedor de error.

```yaml
'400':
  content:
    application/json:
      schema:
        type: object
        properties:
          errors:
            type: array
            items:
              type: object
              properties:
                code: {type: string}
                detail: {type: string}
                source: {type: string}
```

Si sigues JSON:API, usa las claves top-level `data`, `included`, `meta` y `errors` en tu estructura de respuesta.

### ¿Cómo manejo diferencias entre OpenAPI 3.0 y 3.1?

OpenAPI 3.1 elimina el antiguo flag `nullable: true` y en su lugar usa `type: [string, null]`. Además, `exclusiveMinimum` y `exclusiveMaximum` pasan de ser booleanos a números que indican el límite excluido.

```yaml
minimum: 0
exclusiveMinimum: true
```

En 3.1, eso pasa a ser `exclusiveMinimum: 0`. Las subidas binarias cambian de `format: binary` a `contentEncoding: binary`, los webhooks obtienen un campo `webhooks` de nivel superior, y los identificadores de licencia usan SPDX. El campo `summary` dentro de `$ref` es opcional, y `paths` puede estar vacío para APIs que solo usen webhooks.

Antes de migrar, valida el spec con `redocly lint` y convierte con `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. La mayoría de herramientas soportan 3.1, pero verifica tu generador y parser primero.

### ¿Cómo documento portales de documentación de API y experiencia del desarrollador?

Crea un portal de desarrolladores usando Redoc, Stoplight o Backstage. Con Redoc, `npx @redocly/cli build-docs openapi.yaml -o ./docs` genera un sitio HTML estático. Configura la marca.

```bash
redocly.yaml:
theme:
  colors:
    primary: '#2563eb'
  logo:
    url: ./logo.svg
  typography:
    fontSize: 14px
    fontFamily: 'Inter, sans-serif'
```

Añade funcionalidad try-it-out con Swagger UI: `swagger-ui-express` para Express, o `swagger-ui` standalone. Incluye ejemplos de código interactivos.

```yaml
x-code-samples:
  - lang: curl
    source: curl -X GET https://api.example.com/books
  - lang: Python
    source: import requests; requests.get('https://api.example.com/books')
  - lang: JavaScript
    source: fetch('https://api.example.com/books')
```

Añade también un registro de cambios o changelog.

```yaml
x-changelog:
  - version: 2.0.0
    date: 2025-01-15
    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]
```

También puedes incluir guías de incorporación para nuevos consumidores.

```yaml
x-onboarding:
  steps: [Create API key, Make first request, Handle errors, Implement pagination]
```

### ¿Cómo documento gestión de API keys en OpenAPI?

Para documentar la autenticación con API keys, incluye rotación y scopes. Declara `type: apiKey` e indica el header que debe enviar el cliente.

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key required for all requests
```

Los scopes de las claves puedes declararlos en una extensión.

```yaml
x-api-key-scopes:
  - read:books
  - write:books
  - read:authors
  - admin
```

También incluye endpoints para crear, listar y revocar claves.

```yaml
paths:
  /api-keys:
    post:
      summary: Create API key
      security:
        - BearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name: {type: string}
                scopes: {type: array, items: {type: string}}
                expires_at: {type: string, format: date-time}
    get:
      summary: List API keys
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: {type: string}
                    name: {type: string}
                    scopes: {type: array, items: {type: string}}
                    created_at: {type: string, format: date-time}
                    last_used: {type: string, format: date-time}
  /api-keys/{id}:
    delete:
      summary: Revoke API key
      responses:
        '204': {description: Key revoked}
```

Documenta la política de rotación con `x-api-key-rotation: 90 days`. También conviene documentar el prefijo de clave para identificar entornos, por ejemplo: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.


## Ver También

- [API Versioning](/recipes/api-versioning/): estrategias para versionar APIs REST.
- [Call REST API](/recipes/call-rest-api/): consumir APIs REST desde código cliente.
- [GraphQL API](/recipes/graphql-api/): enfoque alternativo de API.
- [Handle CORS](/recipes/handle-cors/): configuración de cross-origin resource sharing.
- [Handle Errors](/recipes/handle-errors/): patrones estructurados de manejo de errores.

## Errores Comunes en Producción

- Dejar que el spec OpenAPI se desfase del API desplegado, de forma que la documentación, los clientes y los tests dejen de coincidir con la realidad.
- Exponer esquemas internos de base de datos en `components/schemas` en lugar de DTOs estables.
- Saltar el lint del spec en CI y publicar referencias `$ref` rotas o inválidas.
- Usar seguridad `apiKey` para tokens JWT tipo bearer en lugar de `http` con `scheme: bearer`.
- Olvidar versionar el spec junto con la API, o eliminar paths deprecados demasiado pronto.
- Exponer los endpoints `/docs` y `/redoc` generados en APIs internas sin control de acceso.
- Dar por sentado que un cliente generado funcionará sin verificar compatibilidad con tu versión de OpenAPI y extensiones.
