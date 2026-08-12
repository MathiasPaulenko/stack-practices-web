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
  - /recipes/api-logging-audit
  - /recipes/api-rate-limiting-redis
  - /recipes/call-rest-api
  - /recipes/cursor-pagination-postgresql
  - /recipes/graphql-api
  - /recipes/real-time-notifications
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

La mayoría de las documentaciones de API se pudren en READMEs, páginas de Confluence o hilos de Slack. En cuanto publicas un cambio, esas páginas ya están desactualizadas. OpenAPI, la especificación que surgió de Swagger, te permite describir endpoints, esquemas y errores en un solo archivo YAML o JSON. Ese mismo archivo puede impulsar documentación interactiva, SDKs de cliente y tests de contrato.

Esta guía cubre tres stacks comunes: Python + FastAPI, JavaScript + Express y Java + SpringDoc. También muestra cuándo gana Swagger UI, cuándo Redoc es una mejor opción y cómo evitar que el spec se pudra una vez está en producción.

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

El **design-first** tiene más sentido cuando los equipos de frontend, backend y móvil necesitan acordar un contrato antes de escribir código. Escribes el YAML o JSON a mano, lo publicas en SwaggerHub o Stoplight, y luego generas stubs y clientes. Ese contrato obliga a decidir explícitamente campos, errores y versionado. El problema es que, sin tests, el spec puede convertirse en una ilusión mientras el código hace otra cosa.

Una vez que existe el spec, impulsa tres cosas: **Swagger UI** como explorador interactivo donde los desarrolladores llaman endpoints desde el navegador, **Redoc** como un sitio de documentación limpio de tres paneles, y **generadores de clientes** como `openapi-generator-cli` para clientes tipados en TypeScript, Python, Java y otros lenguajes.

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
- **Documenta respuestas de error reales**, no solo `200`. Incluye `400`, `401`, `404`, `409` y `5xx` con cuerpos problem-detail.
- **Valida el spec en CI** con `npx @redocly/cli lint` o `spectral`; un `$ref` roto o un `operationId` ausente romperá clientes generados sin avisar.

## Errores Comunes

Las herramientas code-first son útiles, pero solo ayudan si expones DTOs, no entidades de base de datos, en el spec. De lo contrario, el spec se desvía del código de formas difíciles de detectar.

Toda operación que requiera auth necesita una entrada `security` y un componente `securitySchemes` correspondiente. Olvidar cualquiera de los dos es una forma rápida de publicar un muro de autenticación sin documentar.

Los modelos internos deben mantenerse fuera de `components/schemas`. Usa DTOs dedicados para solicitud y respuesta.

Los campos nullable también sorprenden: OpenAPI 3.0 usa `nullable: true`, mientras que 3.1 usa `type: [string, null]`. Elige uno y valida con un linter.

Por último, evita escribir URLs de servidor directamente en el spec. Coloca variables en el array `servers`, como `{serverUrl}`, para que staging y producción puedan compartir el mismo spec.

## Solución de Problemas

Si Redoc o Swagger UI muestra una página en blanco, probablemente el spec esté malformado. Ejecuta el linter de Redocly para encontrar la línea y la regla exactas.

Si los clientes generados no compilan, busca valores `operationId` duplicados, palabras reservadas en nombres de esquema y valores `enum` que no sean identificadores válidos en el lenguaje destino.

Si el spec no coincide con el comportamiento desplegado, añade tests de contrato con Schemathesis o Pact en CI para que el desfase del spec rompa el build antes de llegar a los usuarios.

Si los ejemplos en Swagger UI se ven mal, asegúrate de que el campo `example` esté al nivel correcto del `schema` y de que los ejemplos de arrays usen `items.example`.

**Los specs grandes ralentizan la página de documentación**: divide el spec con punteros `$ref` y empaquétalo con `redocly bundle` antes de mostrarlo.

## Lectura Adicional

- [OpenAPI Specification (latest)](https://spec.openapis.org/oas/latest.html) — referencia oficial para nombres de campos, tipos y diferencias de versión.
- [Redocly CLI documentation](https://redocly.com/docs/cli) — validar, empaquetar y publicar specs OpenAPI.
- [FastAPI docs on OpenAPI](https://fastapi.tiangolo.com/reference/openapi/) — cómo FastAPI genera `/openapi.json` y `/docs`.
- [Springdoc OpenAPI](https://springdoc.org/) — anotaciones y personalización de Spring Boot.

## Notas de Producción

- **Versiona el spec en el control de código fuente** y etiqueta los releases con la misma versión que la API (`info.version` debe coincidir con la versión desplegada de la API).
- **Sirve la documentación desde un artefacto de build separado** o una ruta de CDN para que las actualizaciones del spec no requieran un despliegue completo de la aplicación.
- **Valida el spec en CI** antes de publicar; un `$ref` roto o un `operationId` ausente romperá generadores de clientes y la salida de Redoc.
- **Monitorea los endpoints de documentación** (`/docs`, `/redoc`, `/openapi.json`) para detectar 4xx/5xx y latencia p99, especialmente después de actualizar el spec.

## Puntos Clave

- OpenAPI convierte un único archivo de spec en documentación interactiva, SDKs de cliente y tests de contrato, así que tu documentación se mantiene sincronizada con el código.
- Swagger UI es la mejor opción cuando los desarrolladores necesitan llamar endpoints desde el navegador; Redoc es mejor para una experiencia de lectura limpia y centrada en la documentación.
- FastAPI, Express y SpringDoc pueden generar el spec automáticamente desde el código, pero los equipos con varios consumidores deberían considerar design-first con un registry compartido.
- Valida el spec en CI con `redocly lint` o `spectral` para detectar referencias rotas, `operationId`s ausentes y desfase de versiones antes de que lleguen a producción.

## Preguntas Frecuentes

### ¿Debería usar code-first o design-first?

Si la API es interna y solo la consume tu equipo, empieza con code-first. FastAPI, SpringDoc y tsoa pueden derivar el spec de tus anotaciones, así que el contrato se mantiene cerca del código:

```python
@app.get("/books/{book_id}")
def get_book(book_id: int):
    ...
```

Si los equipos de frontend, móvil, backend o socios externos necesitan acordar el contrato primero, escribe el YAML de OpenAPI y publícalo en SwaggerHub o Stoplight antes de generar stubs:

```bash
openapi-generator-cli generate -i openapi.yaml -g python-fastapi
```

El riesgo de design-first es el desfase: el spec se convierte en una ilusión mientras el código hace otra cosa. Evítalo con tests de contrato (Schemathesis, Pact) en CI. El riesgo de code-first es filtrar modelos internos; evítalo retornando DTOs, no entidades de base de datos.

### ¿Cómo mantengo la documentación sincronizada con el código desplegado?

Genera el spec en CI desde el código, publícalo en un registry como SwaggerHub o Stoplight, y apunta la documentación desplegada a la última versión. En GitHub Actions:

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

Ejecuta `npx @redocly/cli lint openapi.yaml` en cada PR para detectar violaciones de esquema, respuestas faltantes y referencias rotas. Publícalo como artefacto del build y despliega la documentación junto con la API. Luego verifica la API contra el spec con Pact o Schemathesis: `schemathesis run openapi.json --base-url http://localhost:8000`.

### ¿Puedo convertir Swagger 2.0 a OpenAPI 3.0?

Sí. Usa la CLI `swagger2openapi` o el conversor integrado de Swagger Editor. La mayoría de herramientas modernas maneja 3.0 de forma nativa. Ejecuta `npx swagger2openapi swagger.json -o openapi.json` y espera algunos cambios mecánicos: `host`, `basePath` y `schemes` se combinan en un array `servers`; `definitions` y `responses` se mueven a `components/schemas` y `components/responses`; y `securityDefinitions` pasa a ser `components/securitySchemes`. Los campos `produces` y `consumes` se reemplazan por negociación de contenido por operación. Siempre valida el resultado con `npx @redocly/cli lint openapi.json`. Algunos casos extremos aún requieren ajustes manuales: `type: file` pasa a ser `format: binary`, y `collectionFormat` se convierte en parámetros `style` y `explode`.

### ¿Cómo documento autenticación y autorización en OpenAPI?

Usa `securitySchemes` en la sección `components`. Para Bearer JWT:

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Para API keys, usa `type: apiKey` e indica a los clientes qué header enviar:

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

Para OAuth2, declara el flujo y los scopes:

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

Aplica el esquema a nivel de operación:

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

Para OpenAPI 3.1, usa `type: http` con `scheme: bearer` para tokens JWT. `type: apiKey` sigue siendo válido, pero no es el ajuste correcto para JWT tipo bearer: describe una clave de API personalizada, no un esquema bearer HTTP.

### ¿Cómo manejo el versionado en specs OpenAPI?

Fija la versión del spec en `info.version` y elige una estrategia de versionado que tus clientes puedan descubrir:

```yaml
info:
  title: Book API
  version: 2.1.0
```

Usa versionado semántico: major para cambios incompatibles, minor para endpoints nuevos y patch para correcciones. Para el versionado por URL, coloca la versión en la URL de `servers`:

```yaml
servers:
  - url: https://api.example.com/v2
```

Para el versionado por header, añade un parámetro de header opcional:

```yaml
parameters:
  - name: X-API-Version
    in: header
    required: true
    schema:
      type: string
      default: "2"
```

Documenta deprecaciones con `deprecated: true` en las operaciones:

```yaml
paths:
  /books/{id}:
    get:
      deprecated: true
      description: Use /v2/books/{id} instead
```

Mantén ambas versiones del spec durante los períodos de migración y usa negociación de contenido con el header `Accept`: `Accept: application/vnd.api+json;version=2`.

### ¿Cómo genero SDKs de cliente desde specs OpenAPI?

Usa `openapi-generator-cli` para generar clientes tipados en varios lenguajes. Instalación: `npm install @openapitools/openapi-generator-cli -g`. Para generar un cliente TypeScript: `openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts`. Para generar un cliente Python: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py` (añade `--library httpx` si la versión del generador lo soporta). Para generar un cliente Java: `openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson`. Configura las opciones de generación en `.openapi-generator-config.json`: `{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}`. Publica los clientes generados en registries de paquetes: npm para TypeScript, PyPI para Python, Maven Central para Java. Automatiza en CI: genera, prueba y publica cuando cambie el spec.


### ¿Cómo documento paginación en OpenAPI?

Usa parámetros de tipo `cursor` u `offset/limit` con un esquema de contenedor de paginación. Para paginación por offset:

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

Define el contenedor de respuesta:

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

Para paginación por cursor:

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

Incluye headers `Link` en las respuestas: `Link: <https://api.example.com/books?cursor=abc>; rel="next"`. Documenta los headers de límite de frecuencia: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### ¿Cómo manejo subidas y descargas de archivos en OpenAPI?

Para subidas de archivos en OpenAPI 3.0, usa `format: binary` en una propiedad de tipo string dentro del cuerpo de una petición `multipart/form-data`. Si necesitas varios archivos, cambia la propiedad a un array de cadenas binarias.

OpenAPI 3.1 reemplaza `format: binary` por `contentEncoding: binary`. Para descargas, devuelve `application/octet-stream` con un esquema de cadena binaria. Las imágenes funcionan igual: declara el tipo de contenido (por ejemplo, `image/png`) y un esquema binario.

Para limitar el tamaño de subida, añade `maxLength` al campo binario e indica el límite en la descripción: 10485760 bytes para 10 MB.

### ¿Cómo documento webhooks en OpenAPI?

En OpenAPI 3.1, los webhooks pasan a un campo `webhooks` de nivel superior. Declara cada evento como una clave con una operación `post`, y apunta el cuerpo de la petición a un esquema reutilizable como `BookEvent`:

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

Define el esquema del payload una vez en `components/schemas` y reutilízalo en los webhooks. Un endpoint de registro permite a los clientes suscribirse; documenta las reglas de reintentos y los códigos HTTP que espera tu lógica de entrega.

### ¿Cómo valido specs OpenAPI en CI?

Redocly y Spectral son los dos linters que uso. Con Redocly, instala el CLI globalmente (`npm install -g @redocly/cli`) y luego ejecuta `redocly lint openapi.yaml`. Añade un pequeño archivo de reglas para hacer cumplir tus propias convenciones:

```yaml
rules:
  operation-operationId-unique:
    severity: error
  operation-summary:
    severity: warn
    max_length: 50
```

Spectral funciona igual: `npm install -g @stoplight/spectral-cli`, extiende el ruleset OAS incorporado y personaliza las reglas que te importen. En GitHub Actions:

```yaml
- name: Lint OpenAPI
  run: npx @redocly/cli lint openapi.yaml
```

Valida la estructura del spec: busca `operationId` faltante, destinos `$ref` no definidos, esquemas de respuesta faltantes y parámetros de path duplicados. Para corregir problemas comunes: `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'`.

### ¿Cómo documento respuestas de error con RFC 7807 Problem Details?

Para errores RFC 7807, usa el media type `application/problem+json` y un esquema `Problem` reutilizable:

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

Refiérelo en las respuestas de error:

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

Documenta los códigos de error comunes: 400 para errores de validación, 401 para autenticación faltante, 403 para permisos insuficientes, 409 para conflictos, 422 para fallos de validación semántica, 429 para limitación de frecuencia.


### ¿Cómo documento rate limiting de API en OpenAPI?

Documenta los límites de frecuencia usando headers de respuesta y extensiones `x-`. Añade headers de límite de frecuencia a las respuestas:

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

Usa extensiones personalizadas para límites por plan:

```yaml
x-rate-limit:
  free: 100/hour
  pro: 10000/hour
  enterprise: 100000/hour
```

Documenta el comportamiento de throttling en la descripción: `description: Rate limited to 100 requests per hour for free tier. Returns 429 with Retry-After header when exceeded.`. Incluye la respuesta 429:

```yaml
'429':
  description: Too many requests
  headers:
    Retry-After:
      schema:
        type: integer
        description: Seconds to wait before retrying
```

Usa extensiones `x-codegen` para generar el manejo de límites de frecuencia en los SDKs de cliente.

### ¿Cómo manejo esquemas polimórficos en OpenAPI?

Usa `oneOf`, `anyOf` y `allOf` para tipos polimórficos. Para uniones discriminadas:

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

Define subtipos con el campo discriminador:

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

Para tipos mixtos, usa `anyOf`:

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

Para composición sin discriminación, usa `allOf` para heredar propiedades:

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

Prism y OpenAPI Generator pueden servir servidores simulados a partir de un spec. Con Prism, ejecuta `npx @stoplight/prism-cli mock openapi.yaml --port 4010` y generará respuestas a partir de los ejemplos de tu esquema:

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

Para datos aleatorios, añade el flag `--dynamic`. También puedes generar un servidor simulado estático con `openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server`. Úsalos en tests de integración apuntando los clientes a `http://localhost:4010`.

### ¿Cómo documento la deprecación y los headers Sunset de una API?

Marca las operaciones con `deprecated: true` y usa el header `Sunset` para la fecha de eliminación:

```yaml
paths:
  /v1/books:
    get:
      deprecated: true
      description: Deprecated in favor of /v2/books. Will be removed on 2025-12-31.
```

Incluye el header `Deprecation`:

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

Documenta los paths de migración en la descripción: `description: Migrate to /v2/books which supports cursor-based pagination and additional filters.`. Rastrea el uso de endpoints deprecados con análisis: registra las peticiones a endpoints deprecados y notifica a los consumidores por email o webhook. Usa el header `Link` para apuntar al reemplazo: `Link: </v2/books>; rel="successor-version"`.

### ¿Cómo uso extensiones de OpenAPI para metadatos personalizados?

Los campos propietarios en OpenAPI empiezan con `x-`. Úsalos para pistas de generación de código, propiedad interna o metadatos del portal:

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

Para metadatos internos, añade campos como `x-internal`, `x-owner` o `x-sla`. Para portales de documentación, usa `x-display-name`, `x-sidebar-order` o `x-badge`. Para pistas de generación de código:

```yaml
x-enum-descriptions:
  - Active user
  - Inactive user
  - Suspended user
```

Valida las extensiones en CI con reglas personalizadas de Spectral:

```yaml
rules:
  x-internal-must-have-owner:
    given: $.paths.*[?(@.x-internal == true)]
    then:
      field: x-owner
      function: truthy
```

### ¿Cómo documento tests de API y tests de contrato en OpenAPI?

El spec es una buena fuente de tests automatizados. Schemathesis genera peticiones a partir de él y valida las respuestas contra el esquema: `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. Dredd valida contra hooks en vivo: `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. Las colecciones de Postman se pueden importar y ejecutar con `newman run collection.json --env-var base_url=http://localhost:8000`. Para tests de contrato, Pact publica pacts desde el spec: `pact-broker publish pacts/ --consumer-app-version 1.0.0`. También puedes generar clientes de prueba con `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client`. Documenta la cobertura en una extensión:

```yaml
x-test-coverage:
  /books: 95%
  /books/{id}: 88%
```

### ¿Cómo manejo referencias circulares en esquemas OpenAPI?

Las referencias circulares ocurren cuando un esquema se referencia a sí mismo. Defínelas con `$ref` apuntando al componente:

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

La mayoría de herramientas OpenAPI maneja referencias circulares correctamente. En generación de código, las referencias circulares producen tipos recursivos:

```yaml
class Category:
    name: str
    subcategories: List[Category]
```

Para estructuras profundamente anidadas, limita la profundidad de recursión: `x-max-depth: 5`. En serialización JSON, maneja las referencias circulares con `default=str` o codificadores personalizados. Para la vista en Swagger UI, las referencias circulares pueden causar expansión infinita; usa `x-stoplight:readonly` para evitar la edición. Al validar, usa `jsonschema` con `RefResolver` que maneje referencias circulares: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.

### ¿Cómo documento observabilidad y trazabilidad de API en OpenAPI?

Documenta headers de trazabilidad y métricas usando extensiones y headers estándar. Añade headers de correlation ID:

```yaml
parameters:
  - name: X-Correlation-ID
    in: header
    schema:
      type: string
      format: uuid
    description: Unique identifier for tracing requests across services
```

Documenta los headers de OpenTelemetry:

```yaml
x-opentelemetry:
  enabled: true
  service_name: book-api
  trace_parent_header: traceparent
```

Incluye los endpoints de métricas en el spec:

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

Documenta los health checks:

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

Usa la extensión `x-observability` para la configuración de trazabilidad:

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

Documenta distintos formatos de respuesta usando `content` con varios media types. Soporta JSON y XML:

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

Documenta el header `Accept`:

```yaml
parameters:
  - name: Accept
    in: header
    schema:
      type: string
      default: application/json
      enum: [application/json, application/xml, text/csv]
```

Para content types versionados:

```yaml
content:
  application/vnd.api+json;version=1:
    schema:
      $ref: '#/components/schemas/BookV1'
  application/vnd.api+json;version=2:
    schema:
      $ref: '#/components/schemas/BookV2'
```

Documenta el comportamiento de la negociación de contenido: `description: Returns JSON by default. Send Accept: application/xml for XML response. Send Accept: text/csv for CSV export.`

### ¿Cómo documento headers de caché de una API en OpenAPI?

Documenta el comportamiento de caché usando headers HTTP estándar en las respuestas. Añade los headers `Cache-Control`, `ETag` y `Last-Modified`:

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

Documenta headers de peticiones condicionales:

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

Incluye la respuesta 304:

```yaml
'304':
  description: Not modified
  headers:
    ETag:
      schema:
        type: string
```

Usa la extensión `x-cache` para la configuración de CDN:

```yaml
x-cache:
  strategy: cache-on-edge
  ttl: 3600
  vary_by: [Accept-Language, Authorization]
```

### ¿Cómo documento operaciones de larga duración en OpenAPI?

Para operaciones asíncronas, usa la respuesta 202 Accepted con un header `Location` para sondeo. Documenta el patrón:

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

Documenta el endpoint de estado:

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

Para callbacks de webhook:

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

Documenta el comportamiento de timeout y las políticas de reintentos.

### ¿Cómo documento buenas prácticas de seguridad de API en OpenAPI?

La seguridad debe estar en todos los niveles: transporte, autenticación y autorización. Empieza con TLS en la URL del servidor, luego documenta CORS, validación de entradas, limitación de frecuencia y rotación de claves:

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

Usa la descripción de la operación para notas sobre inyección SQL, añade `x-rate-limit-per-user` y `x-api-key-rotation` para limitación de frecuencia y rotación de claves, e incluye un contacto de seguridad en `info.contact`. El cumplimiento OWASP se puede rastrear con `x-owasp-compliance`.

### ¿Cómo manejo la división de specs OpenAPI para APIs grandes?

Para APIs grandes, divide el spec en archivos externos y usa `$ref` para reunirlos. Mantén esquemas, paths, respuestas y ejemplos en sus propias carpetas, y comparte un esquema `Error` común desde una librería:

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

Documenta el endpoint de métricas y cualquier contador o histograma personalizado que expongas. Para Prometheus:

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

Las métricas personalizadas pueden vivir en una extensión `x-metrics`:

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

Añade un endpoint de health check para que los clientes puedan detectar caídas:

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

Documenta objetivos de SLA:

```yaml
x-sla:
  availability: 99.9%
  response_time_p99: 200ms
  throughput: 10000 rps
```

### ¿Cómo documento la idempotencia de una API en OpenAPI?

Para operaciones POST que no deben ejecutarse dos veces, requiere un header `Idempotency-Key` y devuelve `409` cuando se reutiliza la misma clave:

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

Explica el comportamiento en la descripción de la operación. `PUT` es naturalmente idempotente, así que menciónalo también. Algunos equipos añaden extensiones `x-idempotent: true` o `x-idempotency-key-ttl: 24h` para ayudar a generadores y middleware.

### ¿Cómo documento validación de peticiones de API en OpenAPI?

OpenAPI usa constraints estándar de JSON Schema, así que puedes validar a nivel del spec. Para strings, establece límites de longitud y patrón:

```yaml
schema:
  type: string
  minLength: 3
  maxLength: 100
  pattern: '^[a-zA-Z0-9_-]+$'
```

Los números aceptan rangos y exclusividad:

```yaml
schema:
  type: number
  minimum: 0
  maximum: 1000
  exclusiveMinimum: true
```

Los enums, arrays y objetos funcionan igual: lista valores permitidos, limita el número de elementos o marca campos como requeridos:

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

Usa la extensión `x-validate` para validadores personalizados:

```yaml
x-validate:
  - rule: no-sql-injection
  - rule: max-nested-depth
    params: {max: 5}
```

### ¿Cómo documento contenedores de respuesta de API en OpenAPI?

Documenta contenedores de respuesta estándar para un diseño de API consistente. Define un esquema de contenedor:

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

Usa el contenedor en las respuestas:

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

Documenta el contenedor de error:

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

Para cumplir con JSON:API, usa las claves top-level `data`, `included`, `meta` y `errors`.

### ¿Cómo manejo diferencias entre OpenAPI 3.0 y 3.1?

OpenAPI 3.1 elimina el antiguo flag `nullable: true` y en su lugar usa `type: [string, null]`. `exclusiveMinimum` y `exclusiveMaximum` ahora son números, no booleanos:

```yaml
minimum: 0
exclusiveMinimum: true
```

En 3.1, eso se convierte en `exclusiveMinimum: 0`. Las subidas binarias cambian de `format: binary` a `contentEncoding: binary`, los webhooks obtienen un campo `webhooks` de nivel superior, y los identificadores de licencia usan SPDX. `summary` dentro de `$ref` es opcional, y `paths` puede estar vacío para APIs solo de webhooks.

Antes de migrar, valida el spec con `redocly lint` y convierte con `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. La mayoría de herramientas soportan 3.1, pero verifica tu generador y parser primero.

### ¿Cómo documento portales de documentación de API y experiencia del desarrollador?

Crea un portal de desarrolladores usando Redoc, Stoplight o Backstage. Con Redoc: `npx @redocly/cli build-docs openapi.yaml -o ./docs` genera un sitio HTML estático. Configura la marca:

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

Añade funcionalidad try-it-out con Swagger UI: `swagger-ui-express` para Express, o `swagger-ui` standalone. Incluye ejemplos de código interactivos:

```yaml
x-code-samples:
  - lang: curl
    source: curl -X GET https://api.example.com/books
  - lang: Python
    source: import requests; requests.get('https://api.example.com/books')
  - lang: JavaScript
    source: fetch('https://api.example.com/books')
```

Añade un registro de cambios:

```yaml
x-changelog:
  - version: 2.0.0
    date: 2025-01-15
    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]
```

Incluye guías de incorporación:

```yaml
x-onboarding:
  steps: [Create API key, Make first request, Handle errors, Implement pagination]
```

### ¿Cómo documento gestión de API keys en OpenAPI?

Documenta autenticación con API keys, rotación y scopes. Define la seguridad de API key:

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key required for all requests
```

Documenta los scopes de las claves:

```yaml
x-api-key-scopes:
  - read:books
  - write:books
  - read:authors
  - admin
```

Incluye endpoints de gestión de claves:

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

Documenta la política de rotación: `x-api-key-rotation: 90 days`. Documenta el prefijo de clave para identificación: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.


## Ver También

- [API Versioning](/recipes/api-versioning/) — estrategias para versionar APIs REST.
- [Call REST API](/recipes/call-rest-api/) — consumir APIs REST desde código cliente.
- [GraphQL API](/recipes/graphql-api/) — enfoque alternativo de API.
- [Handle CORS](/recipes/handle-cors/) — configuración de cross-origin resource sharing.
- [Handle Errors](/recipes/handle-errors/) — patrones estructurados de manejo de errores.

## Errores Comunes en Producción

- Dejar que el spec OpenAPI se desfase del API desplegado, de forma que la documentación, los clientes y los tests dejen de coincidir con la realidad.
- Exponer esquemas internos de base de datos en `components/schemas` en lugar de DTOs estables.
- Saltar el lint del spec en CI y publicar referencias `$ref` rotas o inválidas.
- Usar seguridad `apiKey` para tokens JWT tipo bearer en lugar de `http` con `scheme: bearer`.
- Olvidar versionar el spec junto con la API, o eliminar paths deprecados demasiado pronto.
- Desplegar los endpoints `/docs` y `/redoc` generados sin control de acceso en APIs internas.
- Dar por sentado que un cliente generado funcionará sin verificar compatibilidad con tu versión de OpenAPI y extensiones.
