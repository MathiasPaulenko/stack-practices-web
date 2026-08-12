---
contentType: recipes
slug: api-documentation-openapi
title: Cómo documentar una API con OpenAPI, Swagger UI y Redoc
description: Guía paso a paso para documentar APIs REST con OpenAPI. Genera documentación interactiva con Swagger UI y Redoc en Python, JavaScript y Java.
metaDescription: Guía paso a paso para documentar APIs REST con OpenAPI. Aprende a generar documentación interactiva con Swagger UI y Redoc en Python, JavaScript y Java.
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
lastUpdated: "2026-08-12"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: Guía paso a paso para documentar APIs REST con OpenAPI. Aprende a generar documentación interactiva con Swagger UI y Redoc en Python, JavaScript y Java.
  keywords:
    - openapi docs
    - documentacion swagger
    - redoc
    - ejemplo documentacion api
---

## Visión General

Si la documentación de tu API vive en READMEs, Confluence o hilos de Slack, se queda obsoleta en cuanto haces un despliegue. OpenAPI, la especificación que salió de Swagger, te permite describir endpoints, schemas y errores en un solo archivo YAML o JSON. A partir de ese mismo archivo puedes generar documentación interactiva, SDKs de cliente y tests de contrato.

En mi experiencia, OpenAPI deja de ser un lujo cuando varios equipos consumen tu API. Esta guía recorre tres stacks comunes: Python + FastAPI, JavaScript + Express y Java + SpringDoc. También cubre cuándo gana Swagger UI, cuándo conviene más Redoc y cómo evitar que el spec se pudra en producción.

## Cuándo Usar

Este recurso sirve cuando la documentación se desfasa antes de que termine la semana. Es útil si quieres:

- documentación interactiva que se mantenga sincronizada con el código;
- generar clientes SDK en varios lenguajes sin reescribirlos a mano;
- un contrato compartido entre frontend, móvil y backend;
- validar peticiones entrantes contra un schema formal.

Si tu API es solo tuya y la escribes y consumes tú solo, quizá un README corto te baste. Pero en cuanto entra un segundo equipo, el contrato escrito empieza a pagar.

## Solución

### Python

```python
from fastapi import FastAPI

app = FastAPI(title="Book API", version="1.0.0")

@app.get("/books/{book_id}", tags=["books"])
def get_book(book_id: int):
    """Recupera un libro por su ID."""
    return {"id": book_id, "title": "Clean Code"}

# FastAPI genera automáticamente /openapi.json y /docs (Swagger UI)
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

    @Operation(summary = "Obtener libro por ID", description = "Devuelve un único libro")
    @ApiResponse(responseCode = "200", description = "Libro encontrado")
    @GetMapping("/{id}")
    public Book getBook(@PathVariable Long id) {
        return new Book(id, "Clean Code");
    }

    record Book(Long id, String title) {}
}
// springdoc-openapi genera automáticamente /v3/api-docs y /swagger-ui/index.html
```

## Explicación

Los equipos generan specs OpenAPI de dos maneras; la elección depende de quién sea el dueño del contrato.

Yo uso **code-first** cuando un único equipo construye y consume la API. FastAPI, SpringDoc y tsoa leen anotaciones o decoradores y emiten `openapi.json` como artefacto de build. La ventaja: el spec no puede desviarse de la implementación. La desventaja: el spec tiende a filtrar modelos internos a menos que uses DTOs con cuidado. Yo siempre reviso que los modelos expuestos sean DTOs, no entidades.

El **design-first** me funciona cuando frontend, móvil y backend deben acordar un contrato antes de escribir código. Escribes el YAML o JSON a mano, lo publicas en un registry como SwaggerHub o Stoplight y luego generas stubs y clientes. La ventaja: el contrato obliga a decidir explícitamente campos, errores y versionado. La desventaja: si el spec no se valida con tests, se convierte en una lista de deseos mientras el código hace otra cosa. Yo prevengo esto con tests de contrato en CI.

Una vez tienes el spec, alimenta tres cosas:

- **Swagger UI** — un explorador interactivo donde los desarrolladores pueden llamar endpoints directamente desde el navegador.
- **Redoc** — un sitio de documentación limpio de tres paneles, más fácil de leer y navegar.
- **Generadores de clientes** — `openapi-generator-cli` puede convertir el mismo spec en clientes tipados para TypeScript, Python, Java y otros lenguajes.

## Variantes

| Herramienta | Lenguaje | Enfoque | Salida |
|-------------|----------|---------|--------|
| FastAPI | Python | Code-first | /openapi.json + /docs auto-generados |
| Flask-RESTX | Python | Code-first | Swagger UI integrado |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Servir YAML pre-escrito |
| tsoa | TypeScript | Code-first | Generar spec desde decoradores |

## Lo que funciona

En la práctica, esto es lo que me ha funcionado. Versiona el spec junto con la API en el campo `info.version` y documenta deprecaciones con `deprecated: true` más un path de reemplazo. Añade ejemplos a los schemas de request y response; es la forma más rápida de frenar preguntas de integración antes de que empiecen. Agrupa operaciones con tags como `usuarios`, `pedidos` o `productos` para que Swagger UI y Redoc rendericen secciones colapsables. Documenta respuestas de error reales, no solo `200`; incluye `400`, `401`, `404`, `409` y `5xx` con cuerpos problem-detail. Valida el spec en CI con `npx @redocly/cli lint` o `spectral`; un `$ref` roto o un `operationId` ausente romperá clientes generados sin avisar.

## Errores Comunes

Hay fallos que he visto repetirse en casi todos los equipos. Dejar que el spec se desvíe del código es el más clásico: las herramientas code-first ayudan, pero solo si expones DTOs, no entidades de base de datos, en el spec. Olvidar definiciones de seguridad es otro; toda operación que requiera auth necesita una entrada `security` y un `securitySchemes` correspondiente. Exponer modelos internos es una mala idea; mantén entidades de base de datos fuera de `components/schemas` y usa DTOs dedicados para request y response. Ignorar campos nullable genera dolores de cabeza; en OpenAPI 3.0 usa `nullable: true`, en 3.1 usa `type: [string, null]`. Elige uno y lintagealo. Por último, evita URLs de servidor hardcodeadas; usa el array `servers` con variables como `{serverUrl}` para que staging y producción no requieran specs separados.

## Solución de Problemas

Cuando Redoc o Swagger UI muestra una página en blanco, suele ser un spec malformado. Ejecuta `npx @redocly/cli lint openapi.json` para encontrar la línea y la regla exacta. Si los clientes generados no compilan, revisa colisiones de `operationId`, palabras reservadas en nombres de schema y valores `enum` que no sean identificadores válidos en el lenguaje destino. Si el spec no coincide con el comportamiento desplegado, añade tests de contrato con Schemathesis o Pact en CI para que el drift rompa el build antes de llegar a usuarios. Si los ejemplos en Swagger UI se ven mal, asegúrate de que los campos `example` estén al nivel correcto del `schema` y que los ejemplos de arrays usen la forma `items.example`. Por último, si specs grandes ralentizan la página de docs, divide el spec con punteros `$ref` y usa `redocly bundle` antes de renderizar.

## Lectura Adicional

- [OpenAPI Specification (latest)](https://spec.openapis.org/oas/latest.html) es la referencia que consulto cuando dudo sobre nombres de campos, tipos soportados o diferencias entre versiones.
- [Redocly CLI documentation](https://redocly.com/docs/cli) explica cómo lintear, bundle-ar y publicar specs OpenAPI.
- [FastAPI docs on OpenAPI](https://fastapi.tiangolo.com/reference/openapi/) detallan cómo FastAPI genera `/openapi.json` y `/docs` automáticamente.
- [Springdoc OpenAPI](https://springdoc.org/) es mi referencia para anotaciones y opciones de personalización en Spring Boot.

## Notas de Producción

En producción, versiona el spec en control de código fuente y etiqueta releases con la misma versión que la API (`info.version` debe coincidir con la API desplegada). Suelo servir la documentación desde un artefacto separado o una ruta de CDN para que actualizaciones del spec no requieran un despliegue completo de la aplicación. Lintea el spec en CI antes de publicar; un `$ref` roto o un `operationId` ausente romperá generadores de clientes y el renderizado de Redoc. Por último, monitorea los endpoints de documentación (`/docs`, `/redoc`, `/openapi.json`) para 4xx/5xx y latencia p99, especialmente después de actualizar el spec.

## Puntos Clave

OpenAPI convierte un único archivo de spec en documentación interactiva, SDKs de cliente y tests de contrato, así que tu documentación se mantiene sincronizada con el código. Swagger UI es ideal cuando los desarrolladores necesitan llamar endpoints desde el navegador; Redoc es mejor para una experiencia de lectura limpia y centrada en la documentación. FastAPI, Express y SpringDoc pueden generar el spec automáticamente desde el código, pero equipos con varios consumidores deberían considerar design-first con un registry compartido. Valida el spec en CI con `redocly lint` o `spectral` para detectar referencias rotas, `operationId`s ausentes y versiones inconsistentes antes de que lleguen a producción.

## Preguntas Frecuentes

### ¿Debería usar code-first o design-first?

Empiezo con code-first cuando estoy construyendo una API interna que solo consume mi propio equipo. FastAPI, SpringDoc y tsoa pueden derivar el spec de tus anotaciones, así que el contrato se mantiene cerca del código:

```python
@app.get("/books/{book_id}")
def get_book(book_id: int):
    ...
```

El design-first me funciona cuando varios equipos — frontend, móvil, backend, socios externos — necesitan acordar el contrato antes de escribir código. En ese caso, escribes el YAML de OpenAPI primero, lo publicas en un registry como SwaggerHub o Stoplight y luego generas stubs:

```bash
openapi-generator-cli generate -i openapi.yaml -g python-fastapi
```

El verdadero riesgo de design-first es el drift: el spec se convierte en una lista de deseos mientras el código hace otra cosa. Impídelo con tests de contrato (Schemathesis, Pact) en CI. El riesgo de code-first es filtrar modelos internos al spec; evítalo retornando DTOs, no entidades de base de datos.

### ¿Cómo mantengo la documentación sincronizada con el código desplegado?

Genera el spec en CI desde el código, publícalo en un registry (SwaggerHub, Stoplight) y vincula la documentación desplegada a la última versión del spec. En GitHub Actions, el workflow quedaría así:
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

Valida el spec en cada PR: `npx @redocly/cli lint openapi.yaml` detecta violaciones de schema, responses faltantes y referencias inválidas. Publica el spec como artifact del build y despliega docs junto con la API. Usa contract testing con Pact o Schemathesis para verificar que la API coincide con el spec: `schemathesis run openapi.json --base-url http://localhost:8000`.


### ¿Puedo convertir Swagger 2.0 a OpenAPI 3.0?

Sí. Usa la CLI `swagger2openapi` o el conversor integrado de Swagger Editor. La mayoría de herramientas modernas soportan 3.0 nativamente. Ejecuta: `npx swagger2openapi swagger.json -o openapi.json`. La herramienta convierte `host`, `basePath` y `schemes` en un único array `servers`. Transforma `definitions` en `components/schemas` y `responses` en `components/responses`. Las security definitions se mueven de `securityDefinitions` a `components/securitySchemes`. Los campos `produces` y `consumes` se reemplazan por content negotiation en cada operación. Después de convertir, valida: `npx @redocly/cli lint openapi.json` para detectar problemas de conversión. Algunos edge cases requieren correcciones manuales: file uploads con `type: file` se convierten en `format: binary`, y `collectionFormat` se reemplaza por parámetros `style` y `explode`.


### ¿Cómo documento autenticación y autorización en OpenAPI?

Una opción es usar `securitySchemes` en la sección `components`. Para Bearer JWT, este es el esquema:
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Para API keys, el snippet se ve así:
```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

Para OAuth2 con flows, lo muestro con este ejemplo:
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

Aplico security a nivel de operación, este es el esquema:
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

Para OpenAPI 3.1, usa `type: http` con `scheme: bearer` para tokens JWT. `type: apiKey` no está deprecado, pero es la elección incorrecta para JWT tipo bearer porque describe una clave de API personalizada en lugar de un esquema bearer HTTP.
Con esto cubres la mayoría de los casos.


### ¿Cómo manejo versioning en specs OpenAPI?

He probado varias aproximaciones; esta es la que me funciona.
Yo versiono el spec usando el campo `info.version` y versioning de API basado en URL. En el spec, el snippet se ve así:
```yaml
info:
  title: Book API
  version: 2.1.0
```

En mi flujo, uso semantic versioning: major para breaking changes, minor para nuevos endpoints, patch para fixes. Para versioning por URL, incluye la versión en el path, lo muestro con este ejemplo:
```yaml
servers:
  - url: https://api.example.com/v2
```

Para versioning por header, así lo configuro:
```yaml
parameters:
  - name: X-API-Version
    in: header
    required: true
    schema:
      type: string
      default: "2"
```

Es importante documentar deprecaciones con `deprecated: true` en operaciones, el snippet se ve así:
```yaml
paths:
  /books/{id}:
    get:
      deprecated: true
      description: Usa /v2/books/{id} en su lugar
```

Mantengo varias versiones del spec durante períodos de migración y usa content negotiation con header `Accept`: `Accept: application/vnd.api+json;version=2`.


### ¿Cómo genero client SDKs desde specs OpenAPI?

Usa `openapi-generator-cli` para generar clientes tipados en varios lenguajes. Instálalo con: `npm install @openapitools/openapi-generator-cli -g`. Para generar un cliente TypeScript: `openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts`. Para generar un cliente Python: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py` (añade `--library httpx` si la versión del generador lo soporta). Para generar un cliente Java: `openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson`. Configura las opciones de generación en `.openapi-generator-config.json`: `{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}`. Publica los clientes generados en registries de paquetes: npm para TypeScript, PyPI para Python y Maven Central para Java. Automatiza en CI: generar, probar y publicar cuando cambie el spec.


### ¿Cómo documento paginación en OpenAPI?

En mi flujo, uso parámetros `cursor` u `offset/limit` con un schema de envelope de paginación. Para offset-based, lo muestro con este ejemplo:
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

Defino el envelope de respuesta de esta forma, así lo configuro:
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

Para paginación cursor-based, el snippet se ve así:
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

Incluyo headers `Link` en responses: `Link: <https://api.example.com/books?cursor=abc>; rel="next"`. Yo documento headers de rate limiting: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
Es un detalle fácil de pasar por alto, pero ahorra problemas.


### ¿Cómo manejo file uploads y downloads en OpenAPI?

Casi siempre termino usando esta aproximación.
Para file uploads en OpenAPI 3.0, lo muestro con este ejemplo:
```yaml
paths:
  /upload:
    post:
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
```

Para varios archivos, este es el esquema:
```yaml
properties:
  files:
    type: array
    items:
      type: string
      format: binary
```

En OpenAPI 3.1, usa `contentEncoding: binary` en lugar de `format: binary`. Para file downloads, lo muestro con este ejemplo:
```yaml
responses:
  '200':
    content:
      application/octet-stream:
        schema:
          type: string
          format: binary
```

Para responses de imágenes con content type, así lo configuro:
```yaml
content:
  image/png:
    schema:
      type: string
      format: binary
```

No olvides documentar límites de tamaño de archivo, el snippet se ve así:
```yaml
schema:
  type: string
  format: binary
  maxLength: 10485760
```

con una descripción indicando el límite de 10MB.
No es lo más emocionante, pero hace la documentación mucho más usable.


### ¿Cómo documento webhooks en OpenAPI?

Me lo han preguntado varias veces.
OpenAPI 3.1 soporta webhooks nativamente con el campo `webhooks`. Defino eventos webhook, este es el esquema:
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

Es importante documentar el schema del payload webhook, el snippet se ve así:
```yaml
components:
  schemas:
    BookEvent:
      type: object
      properties:
        event_type:
          type: string
          enum: [created, updated, deleted]
        book:
          $ref: '#/components/schemas/Book'
        timestamp:
          type: string
          format: date-time
```

Incluyo endpoints de registro de webhooks, lo muestro con este ejemplo:
```yaml
paths:
  /webhooks:
    post:
      summary: Register webhook
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  format: uri
                events:
                  type: array
                  items:
                    type: string
```

Es importante documentar políticas de retry de webhooks y códigos de response esperados.


### ¿Cómo valido specs OpenAPI en CI?

Yo uso `@redocly/cli` o `spectral` para lintear specs en CI. Instala Redocly: `npm install @redocly/cli -g`. En mi caso, lintea: `redocly lint openapi.yaml`. Creo un ruleset custom, lo muestro con este ejemplo:
```yaml
rules:
  operation-operationId-unique:
    severity: error
  operation-summary:
    severity: warn
    max_length: 50
```

Para Spectral: `npm install @stoplight/spectral-cli -g`. Creo `.spectral.yaml`, lo muestro con este ejemplo:
```yaml
extends: spectral:oas
rules:
  oas3-operation-security-defined: error
  oas3-parameter-description: warn
```

En GitHub Actions, así lo configuro:
```yaml
- name: Lint OpenAPI
  run: npx @redocly/cli lint openapi.yaml
```

Revisa la estructura del spec: detecta `operationId` faltante, `$ref` no definidos, response schemas faltantes y parámetros de path duplicados. Para problemas comunes: `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'`.


### ¿Cómo documento error responses con RFC 7807 Problem Details?

En mi experiencia, hay varias formas de abordarlo.
En mi flujo, uso el media type `application/problem+json` con un schema de error estándar. Defino el schema problem details de esta forma, el código quedaría así:
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

Referéncialo en error responses, lo muestro con este ejemplo:
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

Es importante documentar códigos de error comunes: 400 para validation errors, 401 para auth faltante, 403 para permisos insuficientes, 409 para conflictos, 422 para validation failures semánticas, 429 para rate limiting.
Con esto cubres la mayoría de los casos.


### ¿Cómo documento rate limiting de API en OpenAPI?

Documento rate limits usando response headers y extensiones `x-`. Añade headers de rate limit a responses, así lo configuro:
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

Usa extensiones propias para límites por plan:
```yaml
x-rate-limit:
  free: 100/hour
  pro: 10000/hour
  enterprise: 100000/hour
```

Documenta el comportamiento de throttling en la descripción: `description: Limitado a 100 peticiones por hora para el plan free. Devuelve 429 con el header Retry-After cuando se excede.`. Incluyo la response 429, así lo configuro:
```yaml
'429':
  description: Too many requests
  headers:
    Retry-After:
      schema:
        type: integer
        description: Seconds to wait before retrying
```

En mi flujo, uso extensiones `x-codegen` para generar handling de rate limit en client SDKs.


### ¿Cómo manejo schemas polimórficos en OpenAPI?

Depende del caso, pero normalmente hago lo siguiente.
Yo uso `oneOf`, `anyOf`, y `allOf` para tipos polimórficos. Para discriminated unions, este es el esquema:
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

Defino subtipos con el campo discriminator, el snippet se ve así:
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

Para tipos mixtos, usa `anyOf`, lo muestro con este ejemplo:
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

Para composición sin discriminación, usa `allOf` para heredar propiedades, este es el esquema:
```yaml
Animal:
  allOf:
    - $ref: '#/components/schemas/BaseEntity'
    - type: object
      properties:
        species:
          type: string
```

Es un detalle fácil de pasar por alto, pero ahorra problemas.


### ¿Cómo genero mock servers desde specs OpenAPI?

Una opción es usar Prism u OpenAPI Generator para crear mock servers para testing. Con Prism: `npx @stoplight/prism-cli mock openapi.yaml --port 4010`. Prism genera responses basadas en examples en el spec. Añado examples a tu schema, así lo configuro:
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

Con OpenAPI Generator: `openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server`. Configuro mocking dinámico con Prism: `npx @stoplight/prism-cli mock openapi.yaml --dynamic --port 4010` genera data random que coincide con el schema. Una opción es usar mock servers en integration tests: `const response = await fetch('http://localhost:4010/books/42'); expect(response.status).toBe(200)`. Documento uso de mock server en el spec con extensiones `x-mock` para valores mock custom.
A mí me ha funcionado sin dramas.


### ¿Cómo documento deprecation y sunset headers de API?

Me lo han preguntado varias veces.
Uso el flag `deprecated: true` en operaciones y el header `Sunset` para fechas de remoción. Yo marco endpoints deprecados, lo muestro con este ejemplo:
```yaml
paths:
  /v1/books:
    get:
      deprecated: true
      description: Deprecated en favor de /v2/books. Será removido el 2025-12-31.
```

Incluyo el header `Deprecation`, así lo configuro:
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

Documento paths de migración en la descripción: `description: Migra a /v2/books que soporta paginación cursor-based y filtros adicionales.`. Trackea uso de deprecation con analytics: loggea requests a endpoints deprecados y notifica a consumers vía email o webhook. En mi flujo, uso header `Link` para apuntar al reemplazo: `Link: </v2/books>; rel="successor-version"`.


### ¿Cómo uso extensiones OpenAPI para metadata custom?

Esto es lo que suelo hacer en estos casos.
OpenAPI permite extensiones custom con el prefijo `x-`. Añado metadata vendor-specific, así lo configuro:
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

No olvides documentar metadata interno, este es el esquema:
```yaml
x-internal: true
x-owner: data-team
x-sla:
  response_time_p99: 200ms
  availability: 99.9
```

Yo uso extensiones para portals de documentación, el código quedaría así:
```yaml
x-display-name: Books API
x-sidebar-order: 1
x-badge: Beta
```

Para hints de code generation, así lo configuro:
```yaml
x-enum-descriptions:
  - Active user
  - Inactive user
  - Suspended user
```

Yo valido extensiones en CI con rules custom de Spectral, el snippet se ve así:
```yaml
rules:
  x-internal-must-have-owner:
    given: $.paths.*[?(@.x-internal == true)]
    then:
      field: x-owner
      function: truthy
```

### ¿Cómo documento API testing y contract testing en OpenAPI?

Usa el spec para guiar tests automatizados. Con Schemathesis: `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. Genera y envía peticiones basadas en el spec y valida las responses contra el schema. Con Dredd: `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. Escribe test hooks: `hooks.before('/books > GET', (transaction) => { transaction.expected.headers['Content-Type'] = 'application/json' })`. Con Postman: importa el spec y genera colecciones de test: `newman run collection.json --env-var base_url=http://localhost:8000`. Para contract testing con Pact: genera pacts desde el spec: `pact-broker publish pacts/ --consumer-app-version 1.0.0`. También puedes generar test clients con `openapi-generator-cli`: `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client`. Documenta la cobertura de tests:
```yaml
x-test-coverage:
  /books: 95%
  /books/{id}: 88%
```

Una vez que lo automatizas, no vuelves atrás.


### ¿Cómo manejo referencias circulares en schemas OpenAPI?

No hay una única forma, pero te cuento la mía.
Las referencias circulares ocurren cuando un schema se referencia a sí mismo. Defínelas con `$ref` apuntando al componente, el snippet se ve así:
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

La mayoría de herramientas OpenAPI manejan refs circulares correctamente. En code generation, los refs circulares producen tipos recursivos, lo muestro con este ejemplo:
```yaml
class Category:
    name: str
    subcategories: List[Category]
```

Para estructuras profundamente anidadas, limita la recursión: `x-max-depth: 5`. En serialización JSON, maneja refs circulares con `default=str` o encoders custom. Para rendering en Swagger UI, los refs circulares pueden causar expansión infinita — usa `x-stoplight:readonly` para prevenir edición. Al validar, usa `jsonschema` con `RefResolver` que maneja refs circulares: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.
Con eso basta para empezar.


### ¿Cómo documento observabilidad y tracing de API en OpenAPI?

He probado varias aproximaciones; esta es la que me funciona.
Documento headers de tracing y metrics usando extensiones y headers estándar. Añado headers de correlation ID, el código quedaría así:
```yaml
parameters:
  - name: X-Correlation-ID
    in: header
    schema:
      type: string
      format: uuid
    description: Unique identifier for tracing requests across services
```

Es importante documentar headers de OpenTelemetry, lo muestro con este ejemplo:
```yaml
x-opentelemetry:
  enabled: true
  service_name: book-api
  trace_parent_header: traceparent
```

Incluyo endpoints de metrics en el spec, este es el esquema:
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

Es importante documentar health checks, el código quedaría así:
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

Uso extensión `x-observability` para config de tracing, así lo configuro:
```yaml
x-observability:
  tracing:
    type: opentelemetry
    sampling_rate: 0.1
  metrics:
    type: prometheus
    endpoint: /metrics
```


### ¿Cómo manejo content negotiation en OpenAPI?

Yo documento distintos formatos de response usando `content` con varios media types. También soporto JSON y XML, lo muestro con este ejemplo:
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

No olvides documentar el header `Accept`, así lo configuro:
```yaml
parameters:
  - name: Accept
    in: header
    schema:
      type: string
      default: application/json
      enum: [application/json, application/xml, text/csv]
```

Para content types versionados, el snippet se ve así:
```yaml
content:
  application/vnd.api+json;version=1:
    schema:
      $ref: '#/components/schemas/BookV1'
  application/vnd.api+json;version=2:
    schema:
      $ref: '#/components/schemas/BookV2'
```

Documenta el comportamiento de content negotiation: `description: Devuelve JSON por defecto. Envía Accept: application/xml para respuesta XML. Envía Accept: text/csv para exportar a CSV.`.


### ¿Cómo documento caching headers de API en OpenAPI?

Aquí va lo que me ha funcionado en proyectos reales.
Es importante documentar comportamiento de caching usando headers HTTP estándar en responses. No olvides añadir headers `Cache-Control`, `ETag`, y `Last-Modified`, así lo configuro:
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

Documento headers de conditional requests, este es el esquema:
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

Asegúrate de incluir la response 304, el código quedaría así:
```yaml
'304':
  description: Not modified
  headers:
    ETag:
      schema:
        type: string
```

Uso extensión `x-cache` para config de CDN, así lo configuro:
```yaml
x-cache:
  strategy: cache-on-edge
  ttl: 3600
  vary_by: [Accept-Language, Authorization]
```

A mí me ha funcionado sin dramas.


### ¿Cómo documento operaciones long-running en OpenAPI?

Para operaciones async, usa la response 202 Accepted con un header Location para polling. Yo documento el pattern, el snippet se ve así:
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

Es importante documentar el endpoint de status, el código quedaría así:
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

Para webhook callbacks, así lo configuro:
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

Es importante documentar comportamiento de timeout y políticas de retry.


### ¿Cómo documento security best practices de API en OpenAPI?

Esto es lo que suelo hacer en estos casos.
Yo documento security en cada nivel: transport, authentication, y authorization. Para TLS, el código quedaría así:
```yaml
servers:
  - url: https://api.example.com
    description: Production (TLS required)
```

No olvides documentar CORS, lo muestro con este ejemplo:
```yaml
x-cors:
  allowed_origins: [https://app.example.com]
  allowed_methods: [GET, POST, PUT, DELETE]
  allowed_headers: [Content-Type, Authorization]
  max_age: 3600
```

Para input validation, este es el esquema:
```yaml
parameters:
  - name: email
    in: query
    schema:
      type: string
      format: email
      maxLength: 255
    required: true
```

No olvides documentar prevención de SQL injection: `description: All query parameters are parameterized. No string concatenation used in SQL queries.`. Para rate limiting por usuario: `x-rate-limit-per-user: 1000/hour`. Es importante documentar rotación de API keys: `x-api-key-rotation: 90 days`. Asegúrate de incluir contacto de security, el snippet se ve así:
```yaml
info:
  contact:
    email: security@example.com
  x-security-report-url: https://example.com/security
```

Yo documento compliance OWASP: `x-owasp-compliance: [API1-BOLA, API2-BA, API3-EDP]`.
Una vez que lo automatizas, no vuelves atrás.


### ¿Cómo manejo splitting de specs OpenAPI para APIs grandes?

En mi experiencia, hay varias formas de abordarlo.
Divido specs grandes usando `$ref` a archivos externos así. El archivo principal referencia componentes, lo muestro con este ejemplo:
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

Para dividir paths, sigo este criterio, así lo configuro:
```yaml
paths:
  /books:
    $ref: './paths/books.yaml'
  /books/{id}:
    $ref: './paths/book-by-id.yaml'
```

En mi flujo, uso `redocly bundle` para mergear: `redocly bundle openapi.yaml --output bundled.json`. Yo valido specs divididos: `redocly lint openapi.yaml` resuelve todos los refs externos. Organiza por dominio para microservicios: `schemas/`, `paths/`, `responses/`, `parameters/`, `examples/`. Yo uso una librería de components compartida, así lo configuro:
```yaml
components:
  schemas:
    Error:
      $ref: '../shared/schemas/Error.yaml'
```

En CI, bundlear antes de publicar: `redocly bundle openapi.yaml --output dist/openapi.json && redocly lint dist/openapi.json`.
Con eso basta para empezar.


### ¿Cómo documento metrics y monitoring de API en OpenAPI?

No olvides documentar endpoints de monitoring y metadata de metrics. No olvides incluir endpoint de Prometheus metrics, así lo configuro:
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

Yo documento metrics custom, este es el esquema:
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

No olvides incluir endpoints de health check, el código quedaría así:
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

Yo documento targets de SLA, así lo configuro:
```yaml
x-sla:
  availability: 99.9%
  response_time_p99: 200ms
  throughput: 10000 rps
```

Es un detalle fácil de pasar por alto, pero ahorra problemas.


### ¿Cómo documento idempotency de API en OpenAPI?

He probado varias aproximaciones; esta es la que me funciona.
Documento idempotency usando el header `Idempotency-Key` y patterns de response. Para operaciones POST idempotentes, este es el esquema:
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

Es importante documentar métodos idempotentes: `description: This endpoint is idempotent. Sending the same request with the same Idempotency-Key returns the original response.`. Para idempotency natural: `PUT /books/{id}` es naturalmente idempotente — documenta esto: `description: PUT is idempotent. Two calls with the same body produce the same result.`. En mi flujo, uso extensión `x-idempotent: true` para code generators. Almacena idempotency keys: `x-idempotency-key-ttl: 24h`. Documento expiración de keys: `description: Idempotency keys are stored for 24 hours. After expiration, the same key can be reused.`.


### ¿Cómo documento request validation de API en OpenAPI?

Es importante documentar rules de validation usando constraints de JSON Schema en el spec. Para string validation, el código quedaría así:
```yaml
schema:
  type: string
  minLength: 3
  maxLength: 100
  pattern: '^[a-zA-Z0-9_-]+$'
```

Para numeric ranges, lo muestro con este ejemplo:
```yaml
schema:
  type: number
  minimum: 0
  maximum: 1000
  exclusiveMinimum: true
```

Para enum values, este es el esquema:
```yaml
schema:
  type: string
  enum: [active, inactive, suspended]
```

Para array validation, el código quedaría así:
```yaml
schema:
  type: array
  minItems: 1
  maxItems: 100
  uniqueItems: true
  items:
    type: string
```

Para object validation, así lo configuro:
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

Documento error responses de validation, el snippet se ve así:
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

En mi flujo, uso extensión `x-validate` para validators custom, lo muestro con este ejemplo:
```yaml
x-validate:
  - rule: no-sql-injection
  - rule: max-nested-depth
    params: {max: 5}
```

Es cuestión de constancia, pero una vez automatizado se mantiene solo.


### ¿Cómo documento response envelopes de API en OpenAPI?

Casi siempre termino usando esta aproximación.
No olvides documentar envelopes de response estándar para diseño consistente de API. Defino un schema envelope de esta forma, lo muestro con este ejemplo:
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

Yo uso el envelope en responses, así lo configuro:
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

No olvides documentar error envelope, el snippet se ve así:
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

Para compliance con JSON:API, usa keys top-level `data`, `included`, `meta`, y `errors`.
Con esto cubres la mayoría de los casos.


### ¿Cómo manejo diferencias entre OpenAPI 3.0 y 3.1?

Me lo han preguntado varias veces.
OpenAPI 3.1 se alinea con JSON Schema 2020-12 e introduce varios cambios. En 3.1, `nullable: true` se reemplaza por `type: [string, null]`. Los `exclusiveMinimum` y `exclusiveMaximum` ahora son números, no booleanos, este es el esquema:
```yaml
minimum: 0
exclusiveMinimum: true
```

Yo se convierte en `exclusiveMinimum: 0`. Webhooks se soportan nativamente, el snippet se ve así:
```yaml
webhooks:
  event:
    post: ...
```

El `format: binary` se reemplaza por `contentEncoding: binary`. License identifiers usan SPDX, lo muestro con este ejemplo:
```yaml
info:
  license:
    name: MIT
    identifier: MIT
```

Summary es opcional en `$ref`. Paths pueden ser objetos vacíos para APIs solo de webhooks. Uso `redocly lint` para checkear rules específicas de versión. Convierte entre versiones: `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. La mayoría de herramientas ya soportan 3.1, pero verifica compatibilidad con tu toolchain antes de migrar.


### ¿Cómo documento portals de documentación de API y developer experience?

Creo un developer portal usando Redoc, Stoplight, o Backstage. Con Redoc: `npx @redocly/cli build-docs openapi.yaml -o ./docs` genera un sitio HTML estático. Configuro branding de esta forma, el snippet se ve así:
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

No olvides añadir funcionalidad try-it-out con Swagger UI: `swagger-ui-express` para Express, o `swagger-ui` standalone. Incluyo code samples interactivos, el código quedaría así:
```yaml
x-code-samples:
  - lang: curl
    source: curl -X GET https://api.example.com/books
  - lang: Python
    source: import requests; requests.get('https://api.example.com/books')
  - lang: JavaScript
    source: fetch('https://api.example.com/books')
```

Añade changelog, lo muestro con este ejemplo:
```yaml
x-changelog:
  - version: 2.0.0
    date: 2025-01-15
    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]
```

Incluyo guías de onboarding, este es el esquema:
```yaml
x-onboarding:
  steps: [Create API key, Make first request, Handle errors, Implement pagination]
```

Con eso basta para empezar.


### ¿Cómo documento API key management en OpenAPI?

Documento autenticación de API keys, rotación, y scoping. Yo defino API key security así, lo muestro con este ejemplo:
```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key required for all requests
```

Es importante documentar key scopes, así lo configuro:
```yaml
x-api-key-scopes:
  - read:books
  - write:books
  - read:authors
  - admin
```

No olvides incluir endpoints de key management, el snippet se ve así:
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

Es importante documentar política de rotación: `x-api-key-rotation: 90 days`. No olvides documentar prefijo de key para identificación: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.


## Ver También

- [API Versioning](/recipes/api-versioning/) — En mi flujo, primero versiono la API y luego el spec; esta receta explica las estrategias.
- [Call REST API](/recipes/call-rest-api/) — Si vas a consumir APIs REST desde código cliente, este recurso te ayuda.
- [GraphQL API](/recipes/graphql-api/) — Enfoque alternativo de API.
- [Handle CORS](/recipes/handle-cors/) — Configuración de cross-origin resource sharing.
- [Handle Errors](/recipes/handle-errors/) — Patterns estructurados de manejo de errores.

## Errores Comunes en Producción

- Dejar que el spec OpenAPI se desfase del API desplegado, de forma que docs, clientes y tests dejen de coincidir con la realidad.
- Exponer schemas internos de base de datos en `components/schemas` en lugar de DTOs estables.
- Saltar el linting del spec en CI y publicar referencias `$ref` rotas o inválidas.
- Usar seguridad `apiKey` para tokens JWT tipo bearer en lugar de `http` con `scheme: bearer`.
- Olvidar versionar el spec junto con la API, o eliminar paths deprecados demasiado pronto.
- Desplegar los endpoints `/docs` y `/redoc` generados sin control de acceso en APIs internas.
- Dar por sentado que un cliente generado funcionará sin verificar compatibilidad con tu versión de OpenAPI y extensiones.
