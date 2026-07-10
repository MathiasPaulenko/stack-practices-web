---
contentType: recipes
slug: api-documentation-openapi
title: "Crear documentación de API con OpenAPI"
description: "Genera documentación de API interactiva a partir de specs OpenAPI usando Swagger UI, Redoc y herramientas nativas en Python, JavaScript y Java."
metaDescription: "Crea documentación de API con OpenAPI y Swagger. Genera docs interactivos desde specs en Python, JavaScript y Java con ejemplos y lo que funciona."
difficulty: beginner
topics:
  - api
tags:
  - api
  - api-documentation
  - java
  - rest
  - http
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/graphql-api
  - /recipes/handle-cors
  - /recipes/handle-errors
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Crea documentación de API con OpenAPI y Swagger. Genera docs interactivos desde specs en Python, JavaScript y Java con ejemplos y lo que funciona."
  keywords:
    - openapi
    - swagger
    - api-documentation
    - redoc
    - python
    - javascript
    - java
---
## Visión General

OpenAPI (anteriormente Swagger) es el estándar de la industria para describir [APIs REST](/recipes/api/rest-api-design). Un spec OpenAPI bien mantenido funciona como única fuente de verdad para tu API — generando documentación interactiva, clientes SDK y tests automatizados desde un solo archivo YAML o JSON.

A continuacion se cubre la generación de documentación de API interactiva a partir de specs OpenAPI usando Swagger UI, Redoc y herramientas nativas de frameworks.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas documentación de API interactiva que se mantenga sincronizada con tu código
- Quieres generar automáticamente clientes SDK en múltiples lenguajes
- Tu equipo necesita un enfoque contract-first para el desarrollo de APIs
- Necesitas validar peticiones entrantes contra un schema formal

## Solución

### Python

```python
from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html

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
import org.springdoc.core.annotations.RouterOperation;
import org.springdoc.core.annotations.RouterOperations;

@RestController
@RequestMapping("/books")
public class BookController {

    @Operation(summary = "Obtener libro por ID", description = "Devuelve un único libro")
    @ApiResponse(responseCode = "200", description = "Libro encontrado")
    @GetMapping("/{id}")
    public Book getBook(@PathVariable Long id) {
        return bookService.findById(id);
    }
}
// springdoc-openapi genera automáticamente /v3/api-docs y /swagger-ui.html
```

## Explicación

Los specs OpenAPI se generan típicamente de dos formas:
- **Code-first**: Las anotaciones en tu código generan el spec automáticamente ([FastAPI](/recipes/api/go-rest-api-gin), SpringDoc, tsoa)
- **Design-first**: Escribes el spec YAML/JSON manualmente, luego generas stubs del servidor y [clientes SDK](/recipes/api/call-rest-api)

El spec generado (`openapi.json`) alimenta:
- **Swagger UI**: Explorador interactivo para probar endpoints
- **Redoc**: Documentación limpia y responsive (mejor para lectura)
- **Generadores de clientes**: `openapi-generator-cli` crea clientes TypeScript, Python, Java

## Variantes

| Herramienta | Lenguaje | Enfoque | Salida |
|-------------|----------|---------|--------|
| FastAPI | Python | Code-first | /openapi.json + /docs auto-generados |
| Flask-RESTX | Python | Code-first | Swagger UI integrado |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Servir YAML pre-escrito |
| tsoa | TypeScript | Code-first | Generar spec desde decoradores |

## Lo que funciona

- **Versiona tu spec**: Usa el campo `version` y documenta cambios breaking
- **Añade ejemplos**: Ejemplos ricos en schemas reducen la fricción de integración
- **Usa tags**: Agrupa endpoints lógicamente (usuarios, pedidos, productos)
- **Documenta errores**: Incluye respuestas 4xx y 5xx con problem details
- **Mantén el spec en CI**: Valida la sintaxis del spec en cada build con `swagger-codegen validate`

## Errores Comunes

- **Divergencia entre código y spec**: El código cambia pero el spec no se actualiza — usa code-first para evitarlo
- **Definiciones de seguridad ausentes**: Documenta requisitos de auth ([Bearer](/recipes/security/oauth2-pkce-spa), OAuth2, API key)
- **Compartir modelos internos**: Expón DTOs, no [entidades de base de datos](/guides/databases/database-design-guide), en el spec
- **Ignorar campos nullable**: OpenAPI 3.0 requiere `nullable: true` explícitamente
- **URLs de servidor hardcodeadas**: Usa variables (`{serverUrl}`) para diferentes entornos

## Preguntas Frecuentes

### ¿Debería usar code-first o design-first?

Code-first es más rápido para APIs existentes. Design-first es mejor para contratos entre equipos donde frontend y backend desarrollan en paralelo. En code-first, las anotaciones generan el spec automáticamente: `@app.get("/books/{id}")` en FastAPI o `@Operation(summary="Get book")` en SpringDoc. En design-first, escribes el OpenAPI YAML primero: `openapi: 3.0.3\npaths:\n  /books/{id}:\n    get:\n      summary: Get book` y generas stubs del servidor con `openapi-generator-cli generate -i openapi.yaml -g python-fastapi`. Design-first enforcea un contrato antes de la implementación, previniendo scope creep. Code-first reduce drift ya que el spec siempre coincide con el código. Para microservicios con múltiples equipos, design-first con un registry de specs compartido (SwaggerHub, Stoplight) funciona mejor. Para APIs internas con un solo equipo, code-first es más práctico.

### ¿Cómo mantengo la documentación sincronizada con el código desplegado?

Genera el spec en CI desde tu código, publícalo en un registry (SwaggerHub, Stoplight), y vincula la documentación desplegada a la última versión del spec. En GitHub Actions: `name: Generate OpenAPI Spec\non: push\njobs:\n  spec:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: python -m app.main --export-openapi > openapi.json\n      - run: npx @redocly/cli lint openapi.json\n      - run: npx @redocly/cli build-docs openapi.json -o docs/`. Valida el spec en cada PR: `npx @redocly/cli lint openapi.yaml` detecta violaciones de schema, responses faltantes, y referencias inválidas. Publica el spec como artifact del build y despliega docs junto con la API. Usa contract testing con Pact o Schemathesis para verificar que la API coincide con el spec: `schemathesis run openapi.json --base-url http://localhost:8000`.

### ¿Puedo convertir Swagger 2.0 a OpenAPI 3.0?

Sí. Usa la herramienta CLI `swagger2openapi` o el conversor integrado de Swagger Editor. La mayoría de herramientas modernas soportan 3.0 nativamente. Ejecuta: `npx swagger2openapi swagger.json -o openapi.json`. La herramienta convierte `host`, `basePath`, y `schemes` en un único array `servers`. Transforma `definitions` en `components/schemas` y `responses` en `components/responses`. Las security definitions se mueven de `securityDefinitions` a `components/securitySchemes`. Los campos `produces` y `consumes` se reemplazan por content negotiation en cada operación. Después de convertir, valida: `npx @redocly/cli lint openapi.json` para detectar problemas de conversión. Algunos edge cases requieren fixes manuales: file uploads con `type: file` se convierten en `format: binary`, y `collectionFormat` se reemplaza por parámetros `style` y `explode`.

### ¿Cómo documento autenticación y autorización en OpenAPI?

Usa `securitySchemes` en la sección `components`. Para Bearer JWT: `components:\n  securitySchemes:\n    BearerAuth:\n      type: http\n      scheme: bearer\n      bearerFormat: JWT`. Para API keys: `components:\n  securitySchemes:\n    ApiKeyAuth:\n      type: apiKey\n      in: header\n      name: X-API-Key`. Para OAuth2 con flows: `components:\n  securitySchemes:\n    OAuth2:\n      type: oauth2\n      flows:\n        authorizationCode:\n          authorizationUrl: https://api.example.com/oauth/authorize\n          tokenUrl: https://api.example.com/oauth/token\n          scopes:\n            read: Read access\n            write: Write access`. Aplica security a nivel de operación: `paths:\n  /books:\n    get:\n      security:\n        - BearerAuth: []\n    post:\n      security:\n        - OAuth2: [write]`. Para OpenAPI 3.1, usa `type: http` con `scheme: bearer` en lugar del `type: apiKey` deprecado para JWT tokens.

### ¿Cómo manejo versioning en specs OpenAPI?

Versiona el spec usando el campo `info.version` y versioning de API basado en URL. En el spec: `info:\n  title: Book API\n  version: 2.1.0`. Usa semantic versioning: major para breaking changes, minor para nuevos endpoints, patch para fixes. Para versioning por URL, incluye la versión en el path: `servers:\n  - url: https://api.example.com/v2`. Para versioning por header: `parameters:\n  - name: X-API-Version\n    in: header\n    required: true\n    schema:\n      type: string\n      default: "2"`. Documenta deprecaciones con `deprecated: true` en operaciones: `paths:\n  /books/{id}:\n    get:\n      deprecated: true\n      description: Usa /v2/books/{id} en su lugar`. Mantén múltiples versiones del spec durante períodos de migración y usa content negotiation con header `Accept`: `Accept: application/vnd.api+json;version=2`.

### ¿Cómo genero client SDKs desde specs OpenAPI?

Usa `openapi-generator-cli` para generar clientes tipados en múltiples lenguajes. Instala: `npm install @openapitools/openapi-generator-cli -g`. Genera un cliente TypeScript: `openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts`. Genera un cliente Python: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py`. Genera un cliente Java: `openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson`. Para Python con httpx: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client --library httpx`. Configura opciones de generación en `.openapi-generator-config.json`: `{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}`. Publica clientes generados a package registries: npm para TypeScript, PyPI para Python, Maven Central para Java. Automatiza en CI: genera, testea, y publica en cambios del spec.

### ¿Cómo documento paginación en OpenAPI?

Usa parámetros `cursor` u `offset/limit` con un schema de envelope de paginación. Para offset-based: `parameters:\n  - name: offset\n    in: query\n    schema:\n      type: integer\n      default: 0\n      minimum: 0\n  - name: limit\n    in: query\n    schema:\n      type: integer\n      default: 20\n      maximum: 100`. Define el envelope de respuesta: `components:\n  schemas:\n    PaginatedBooks:\n      type: object\n      properties:\n        data:\n          type: array\n          items: $ref: '#/components/schemas/Book'\n        total:\n          type: integer\n        offset:\n          type: integer\n        limit:\n          type: integer`. Para paginación cursor-based: `parameters:\n  - name: cursor\n    in: query\n    schema:\n      type: string\n  - name: page_size\n    in: query\n    schema:\n      type: integer\n      default: 20`. Incluye headers `Link` en responses: `Link: <https://api.example.com/books?cursor=abc>; rel="next"`. Documenta headers de rate limiting: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### ¿Cómo manejo file uploads y downloads en OpenAPI?

Para file uploads en OpenAPI 3.0: `paths:\n  /upload:\n    post:\n      requestBody:\n        content:\n          multipart/form-data:\n            schema:\n              type: object\n              properties:\n                file:\n                  type: string\n                  format: binary`. Para múltiples archivos: `properties:\n  files:\n    type: array\n    items:\n      type: string\n      format: binary`. En OpenAPI 3.1, usa `contentEncoding: binary` en lugar de `format: binary`. Para file downloads: `responses:\n  '200':\n    content:\n      application/octet-stream:\n        schema:\n          type: string\n          format: binary`. Para responses de imágenes con content type: `content:\n  image/png:\n    schema:\n      type: string\n      format: binary`. Documenta límites de tamaño de archivo: `schema:\n  type: string\n  format: binary\n  maxLength: 10485760` con una descripción indicando el límite de 10MB.

### ¿Cómo documento webhooks en OpenAPI?

OpenAPI 3.1 soporta webhooks nativamente con el campo `webhooks`. Define eventos webhook: `webhooks:\n  bookCreated:\n    post:\n      requestBody:\n        content:\n          application/json:\n            schema:\n              $ref: '#/components/schemas/BookEvent'\n      responses:\n        '200':\n          description: Event received`. Documenta el schema del payload webhook: `components:\n  schemas:\n    BookEvent:\n      type: object\n      properties:\n        event_type:\n          type: string\n          enum: [created, updated, deleted]\n        book:\n          $ref: '#/components/schemas/Book'\n        timestamp:\n          type: string\n          format: date-time`. Incluye endpoints de registro de webhooks: `paths:\n  /webhooks:\n    post:\n      summary: Register webhook\n      requestBody:\n        content:\n          application/json:\n            schema:\n              type: object\n              properties:\n                url:\n                  type: string\n                  format: uri\n                events:\n                  type: array\n                  items:\n                    type: string`. Documenta políticas de retry de webhooks y códigos de response esperados.

### ¿Cómo valido specs OpenAPI en CI?

Usa `@redocly/cli` o `spectral` para lintear specs en CI. Instala Redocly: `npm install @redocly/cli -g`. Lintea: `redocly lint openapi.yaml`. Crea un ruleset custom: `rules:\n  operation-operationId-unique:\n    severity: error\n  operation-summary:\n    severity: warn\n    max_length: 50`. Para Spectral: `npm install @stoplight/spectral-cli -g`. Crea `.spectral.yaml`: `extends: spectral:oas\nrules:\n  oas3-operation-security-defined: error\n  oas3-parameter-description: warn`. En GitHub Actions: `- name: Lint OpenAPI\n  run: npx @redocly/cli lint openapi.yaml`. Valida estructura del spec: checkea `operationId` faltante, targets `$ref` no definidos, response schemas faltantes, y parámetros de path duplicados. Auto-fix issues comunes: `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'`.

### ¿Cómo documento error responses con RFC 7807 Problem Details?

Usa el media type `application/problem+json` con un schema de error estándar. Define el schema problem details: `components:\n  schemas:\n    Problem:\n      type: object\n      properties:\n        type:\n          type: string\n          format: uri\n          default: about:blank\n        title:\n          type: string\n        status:\n          type: integer\n        detail:\n          type: string\n        instance:\n          type: string\n          format: uri`. Referéncialo en error responses: `responses:\n  '404':\n    description: Book not found\n    content:\n      application/problem+json:\n        schema:\n          $ref: '#/components/schemas/Problem'\n        examples:\n          not_found:\n            value:\n              type: https://api.example.com/errors/not-found\n              title: Book not found\n              status: 404\n              detail: Book with ID 42 does not exist\n              instance: /books/42`. Documenta códigos de error comunes: 400 para validation errors, 401 para auth faltante, 403 para permisos insuficientes, 409 para conflictos, 422 para validation failures semánticas, 429 para rate limiting.

### ¿Cómo uso OpenAPI con GraphQL?

OpenAPI y GraphQL sirven propósitos diferentes pero pueden coexistir. Usa OpenAPI para endpoints REST y GraphQL schema para queries/mutations. Convierte GraphQL schema a OpenAPI: usa `graphql-to-openapi` para generar un spec OpenAPI desde operaciones GraphQL: `npx graphql-to-openapi --schema schema.graphql --query 'query { books { id title } }' --output openapi.yaml`. Para supergraph federation, documenta cada subgraph como un spec OpenAPI y usa un gateway spec que los agregue. Para wrappers REST-to-GraphQL, usa Apollo Server RESTDataSource: `class BookAPI extends RESTDataSource { async getBook(id) { return this.get(`books/${id}`); } }`. Documenta ambas APIs en un portal de desarrollador unificado: Redoc para REST, GraphQL Playground para GraphQL. Usa directiva `@rest` en GraphQL para mapear endpoints REST: `type Query { book(id: ID!): Book @rest(url: "/books/:id") }`.

### ¿Cómo documento rate limiting de API en OpenAPI?

Documenta rate limits usando response headers y extensiones `x-`. Añade headers de rate limit a responses: `responses:\n  '200':\n    headers:\n      X-RateLimit-Limit:\n        schema:\n          type: integer\n          description: Maximum requests per window\n      X-RateLimit-Remaining:\n        schema:\n          type: integer\n          description: Remaining requests in current window\n      X-RateLimit-Reset:\n        schema:\n          type: integer\n          description: Unix timestamp when the window resets`. Usa extensiones custom para límites por plan: `x-rate-limit:\n  free: 100/hour\n  pro: 10000/hour\n  enterprise: 100000/hour`. Documenta comportamiento de throttling en la descripción: `description: Rate limited a 100 requests per hour para free tier. Retorna 429 con header Retry-After cuando se excede.`. Incluye la response 429: `'429':\n  description: Too many requests\n  headers:\n    Retry-After:\n      schema:\n        type: integer\n        description: Seconds to wait before retrying`. Usa extensiones `x-codegen` para generar handling de rate limit en client SDKs.

### ¿Cómo manejo schemas polimórficos en OpenAPI?

Usa `oneOf`, `anyOf`, y `allOf` para tipos polimórficos. Para discriminated unions: `components:\n  schemas:\n    Pet:\n      oneOf:\n        - $ref: '#/components/schemas/Dog'\n        - $ref: '#/components/schemas/Cat'\n      discriminator:\n        propertyName: type\n        mapping:\n          dog: '#/components/schemas/Dog'\n          cat: '#/components/schemas/Cat'`. Define subtipos con el campo discriminator: `Dog:\n  type: object\n  properties:\n    type:\n      type: string\n      enum: [dog]\n    breed:\n      type: string\n  required: [type, breed]`. Para tipos mixtos, usa `anyOf`: `PropertyValue:\n  anyOf:\n    - type: string\n    - type: number\n    - type: boolean\n    - type: array\n      items: $ref: '#/components/schemas/PropertyValue'`. Para composición sin discriminación, usa `allOf` para heredar propiedades: `Animal:\n  allOf:\n    - $ref: '#/components/schemas/BaseEntity'\n    - type: object\n      properties:\n        species:\n          type: string`.

### ¿Cómo documento server-sent events en OpenAPI?

Server-sent events (SSE) usan content type `text/event-stream`. Documenta la response: `responses:\n  '200':\n    description: Server-sent events stream\n    content:\n      text/event-stream:\n        schema:\n          type: object\n          properties:\n            event:\n              type: string\n            data:\n              type: string\n            id:\n              type: string\n            retry:\n              type: integer`. Documenta el schema del payload del evento en el campo `data`: `data:\n  type: string\n  description: JSON-encoded event payload\n  example: '{"type": "book.created", "book": {"id": 1}}'`. Incluye headers de conexión: `headers:\n  Cache-Control:\n    schema:\n      type: string\n      default: no-cache\n  Connection:\n    schema:\n      type: string\n      default: keep-alive`. Documenta comportamiento de reconexión: `description: Client should reconnect on connection close. Last-Event-ID header can be sent to resume from a specific event.`

### ¿Cómo genero mock servers desde specs OpenAPI?

Usa Prism u OpenAPI Generator para crear mock servers para testing. Con Prism: `npx @stoplight/prism-cli mock openapi.yaml --port 4010`. Prism genera responses basadas en examples en el spec. Añade examples a tu schema: `Book:\n  type: object\n  properties:\n    id:\n      type: integer\n      example: 42\n    title:\n      type: string\n      example: Clean Code`. Con OpenAPI Generator: `openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server`. Configura mocking dinámico con Prism: `npx @stoplight/prism-cli mock openapi.yaml --dynamic --port 4010` genera data random que coincide con el schema. Usa mock servers en integration tests: `const response = await fetch('http://localhost:4010/books/42'); expect(response.status).toBe(200)`. Documenta uso de mock server en el spec con extensiones `x-mock` para valores mock custom.

### ¿Cómo documento deprecation y sunset headers de API?

Usa el flag `deprecated: true` en operaciones y el header `Sunset` para fechas de remoción. Marca endpoints deprecados: `paths:\n  /v1/books:\n    get:\n      deprecated: true\n      description: Deprecated en favor de /v2/books. Será removido el 2025-12-31.`. Incluye el header `Deprecation`: `responses:\n  '200':\n    headers:\n      Deprecation:\n        schema:\n          type: string\n          example: true\n      Sunset:\n        schema:\n          type: string\n          example: Wed, 31 Dec 2025 23:59:59 GMT\n          description: Date when the endpoint will be removed`. Documenta paths de migración en la descripción: `description: Migra a /v2/books que soporta paginación cursor-based y filtros adicionales.`. Trackea uso de deprecation con analytics: loggea requests a endpoints deprecados y notifica a consumers vía email o webhook. Usa header `Link` para apuntar al reemplazo: `Link: </v2/books>; rel="successor-version"`.

### ¿Cómo uso extensiones OpenAPI para metadata custom?

OpenAPI permite extensiones custom con el prefijo `x-`. Añade metadata vendor-specific: `paths:\n  /books:\n    get:\n      x-codegen-request-body-name: bookRequest\n      x-aws-api-gateway-integration:\n        type: aws_proxy\n        uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123:function:books/invocations\n        httpMethod: POST`. Documenta metadata interno: `x-internal: true\nx-owner: data-team\nx-sla:\n  response_time_p99: 200ms\n  availability: 99.9`. Usa extensiones para portals de documentación: `x-display-name: Books API\nx-sidebar-order: 1\nx-badge: Beta`. Para hints de code generation: `x-enum-descriptions:\n  - Active user\n  - Inactive user\n  - Suspended user`. Valida extensiones en CI con rules custom de Spectral: `rules:\n  x-internal-must-have-owner:\n    given: $.paths.*[?(@.x-internal == true)]\n    then:\n      field: x-owner\n      function: truthy`.

### ¿Cómo documento API testing y contract testing en OpenAPI?

Usa el spec para drivear tests automatizados. Con Schemathesis: `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. Genera y envía requests basados en el spec y valida responses contra el schema. Con Dredd: `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. Escribe test hooks: `hooks.before('/books > GET', (transaction) => { transaction.expected.headers['Content-Type'] = 'application/json' })`. Con Postman: importa el spec y genera collections de test: `newman run collection.json --env-var base_url=http://localhost:8000`. Para contract testing con Pact: genera pacts desde el spec: `pact-broker publish pacts/ --consumer-app-version 1.0.0`. Usa `openapi-generator-cli` para generar test clients: `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client --library pytest`. Documenta coverage de tests: `x-test-coverage:\n  /books: 95%\n  /books/{id}: 88%`.

### ¿Cómo manejo referencias circulares en schemas OpenAPI?

Las referencias circulares ocurren cuando un schema se referencia a sí mismo. Defínelas con `$ref` apuntando al componente: `components:\n  schemas:\n    Category:\n      type: object\n      properties:\n        name:\n          type: string\n        subcategories:\n          type: array\n          items:\n            $ref: '#/components/schemas/Category'`. La mayoría de herramientas OpenAPI manejan refs circulares correctamente. En code generation, los refs circulares producen tipos recursivos: `class Category:\n    name: str\n    subcategories: List[Category]`. Para estructuras profundamente anidadas, limita la recursión: `x-max-depth: 5`. En serialización JSON, maneja refs circulares con `default=str` o encoders custom. Para rendering en Swagger UI, los refs circulares pueden causar expansión infinita — usa `x-stoplight:readonly` para prevenir edición. Al validar, usa `jsonschema` con `RefResolver` que maneja refs circulares: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.

### ¿Cómo documento observabilidad y tracing de API en OpenAPI?

Documenta headers de tracing y metrics usando extensiones y headers estándar. Añade headers de correlation ID: `parameters:\n  - name: X-Correlation-ID\n    in: header\n    schema:\n      type: string\n      format: uuid\n    description: Unique identifier for tracing requests across services`. Documenta headers de OpenTelemetry: `x-opentelemetry:\n  enabled: true\n  service_name: book-api\n  trace_parent_header: traceparent`. Incluye endpoints de metrics en el spec: `paths:\n  /metrics:\n    get:\n      summary: Prometheus metrics\n      responses:\n        '200':\n          content:\n            text/plain:\n              schema:\n                type: string`. Documenta health checks: `paths:\n  /health:\n    get:\n      summary: Health check\n      responses:\n        '200':\n          description: Service healthy\n        '503':\n          description: Service unavailable`. Usa extensión `x-observability` para config de tracing: `x-observability:\n  tracing:\n    type: opentelemetry\n    sampling_rate: 0.1\n  metrics:\n    type: prometheus\n    endpoint: /metrics`.

### ¿Cómo manejo content negotiation en OpenAPI?

Documenta múltiples formatos de response usando `content` con múltiples media types. Soporta JSON y XML: `responses:\n  '200':\n    content:\n      application/json:\n        schema:\n          $ref: '#/components/schemas/Book'\n      application/xml:\n        schema:\n          $ref: '#/components/schemas/Book'\n      text/csv:\n        schema:\n          type: string\n          description: CSV export of book data`. Documenta el header `Accept`: `parameters:\n  - name: Accept\n    in: header\n    schema:\n      type: string\n      default: application/json\n      enum: [application/json, application/xml, text/csv]`. Para content types versionados: `content:\n  application/vnd.api+json;version=1:\n    schema: $ref: '#/components/schemas/BookV1'\n  application/vnd.api+json;version=2:\n    schema: $ref: '#/components/schemas/BookV2'`. Documenta comportamiento de content negotiation: `description: Returns JSON by default. Send Accept: application/xml for XML response. Send Accept: text/csv for CSV export.`

### ¿Cómo documento caching headers de API en OpenAPI?

Documenta comportamiento de caching usando headers HTTP estándar en responses. Añade headers `Cache-Control`, `ETag`, y `Last-Modified`: `responses:\n  '200':\n    headers:\n      Cache-Control:\n        schema:\n          type: string\n          default: public, max-age=3600\n          description: Cache response for 1 hour\n      ETag:\n        schema:\n          type: string\n          description: Entity tag for conditional requests\n      Last-Modified:\n        schema:\n          type: string\n          format: date-time\n          description: Last modification timestamp`. Documenta headers de conditional requests: `parameters:\n  - name: If-None-Match\n    in: header\n    schema:\n      type: string\n    description: Returns 304 if ETag matches\n  - name: If-Modified-Since\n    in: header\n    schema:\n      type: string\n      format: date-time`. Incluye la response 304: `'304':\n  description: Not modified\n  headers:\n    ETag:\n      schema:\n        type: string`. Usa extensión `x-cache` para config de CDN: `x-cache:\n  strategy: cache-on-edge\n  ttl: 3600\n  vary_by: [Accept-Language, Authorization]`.

### ¿Cómo uso OpenAPI con API gateways?

Configura API gateways usando specs OpenAPI. Para AWS API Gateway: importa el spec: `aws apigateway put-rest-api --rest-api-id abc123 --body file://openapi.yaml --mode overwrite`. Añade Lambda integration vía extensiones: `x-amazon-apigateway-integration:\n  type: aws_proxy\n  httpMethod: POST\n  uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123:function:books/invocations`. Para Kong: usa `kong openapi2kong openapi.yaml --output kong.yaml`. Para NGINX: usa `openapi2nginx openapi.yaml --output nginx.conf`. Para Apigee: importa el spec como API proxy: `apigeecli apis import -f openapi.yaml -n book-api`. Documenta features específicos del gateway: rate limiting, request transformation, API keys, y CORS. Usa el spec para generar configs de gateway automáticamente en CI: `aws apigateway put-rest-api ... && aws apigateway create-deployment ...`.

### ¿Cómo documento operaciones long-running en OpenAPI?

Para operaciones async, usa la response 202 Accepted con un header Location para polling. Documenta el pattern: `paths:\n  /imports:\n    post:\n      responses:\n        '202':\n          description: Import accepted\n          headers:\n            Location:\n              schema:\n                type: string\n                format: uri\n                example: /imports/123`. Documenta el endpoint de status: `paths:\n  /imports/{id}:\n    get:\n      responses:\n        '200':\n          content:\n            application/json:\n              schema:\n                type: object\n                properties:\n                  status:\n                    type: string\n                    enum: [pending, processing, completed, failed]\n                  progress:\n                    type: integer\n                    minimum: 0\n                    maximum: 100\n                  result_url:\n                    type: string\n                    format: uri`. Para webhook callbacks: `callbacks:\n  onComplete:\n    '{$request.body.callbackUrl}':\n      post:\n        requestBody:\n          content:\n            application/json:\n            schema:\n              $ref: '#/components/schemas/ImportResult'`. Documenta comportamiento de timeout y políticas de retry.

### ¿Cómo documento security best practices de API en OpenAPI?

Documenta security a múltiples niveles: transport, authentication, y authorization. Para TLS: `servers:\n  - url: https://api.example.com\n    description: Production (TLS required)`. Documenta CORS: `x-cors:\n  allowed_origins: [https://app.example.com]\n  allowed_methods: [GET, POST, PUT, DELETE]\n  allowed_headers: [Content-Type, Authorization]\n  max_age: 3600`. Para input validation: `parameters:\n  - name: email\n    in: query\n    schema:\n      type: string\n      format: email\n      maxLength: 255\n    required: true`. Documenta prevención de SQL injection: `description: All query parameters are parameterized. No string concatenation used in SQL queries.`. Para rate limiting por usuario: `x-rate-limit-per-user: 1000/hour`. Documenta rotación de API keys: `x-api-key-rotation: 90 days`. Incluye contacto de security: `info:\n  contact:\n    email: security@example.com\n  x-security-report-url: https://example.com/security`. Documenta compliance OWASP: `x-owasp-compliance: [API1-BOLA, API2-BA, API3-EDP]`.

### ¿Cómo manejo splitting de specs OpenAPI para APIs grandes?

Divide specs grandes usando `$ref` a archivos externos. El archivo principal referencia componentes: `components:\n  schemas:\n    Book:\n      $ref: './schemas/Book.yaml'\n    Author:\n      $ref: './schemas/Author.yaml'\n  responses:\n    NotFound:\n      $ref: './responses/NotFound.yaml'`. Divide paths: `paths:\n  /books:\n    $ref: './paths/books.yaml'\n  /books/{id}:\n    $ref: './paths/book-by-id.yaml'`. Usa `redocly bundle` para mergear: `redocly bundle openapi.yaml --output bundled.json`. Valida specs divididos: `redocly lint openapi.yaml` resuelve todos los refs externos. Organiza por dominio para microservicios: `schemas/`, `paths/`, `responses/`, `parameters/`, `examples/`. Usa una librería de components compartida: `components:\n  schemas:\n    Error:\n      $ref: '../shared/schemas/Error.yaml'`. En CI, bundlear antes de publicar: `redocly bundle openapi.yaml --output dist/openapi.json && redocly lint dist/openapi.json`.

### ¿Cómo documento metrics y monitoring de API en OpenAPI?

Documenta endpoints de monitoring y metadata de metrics. Incluye endpoint de Prometheus metrics: `paths:\n  /metrics:\n    get:\n      summary: Prometheus metrics\n      responses:\n        '200':\n          content:\n            text/plain:\n              schema:\n                type: string\n                description: Prometheus format metrics`. Documenta metrics custom: `x-metrics:\n  - name: http_requests_total\n    type: counter\n    labels: [method, path, status]\n  - name: http_request_duration_seconds\n    type: histogram\n    labels: [method, path]\n    buckets: [0.01, 0.05, 0.1, 0.5, 1.0]`. Incluye endpoints de health check: `paths:\n  /health:\n    get:\n      responses:\n        '200':\n          description: Healthy\n        '503':\n          description: Unhealthy\n  /ready:\n    get:\n      responses:\n        '200':\n          description: Ready to accept traffic\n        '503':\n          description: Not ready`. Documenta targets de SLA: `x-sla:\n  availability: 99.9%\n  response_time_p99: 200ms\n  throughput: 10000 rps`.

### ¿Cómo documento idempotency de API en OpenAPI?

Documenta idempotency usando el header `Idempotency-Key` y patterns de response. Para operaciones POST idempotentes: `paths:\n  /payments:\n    post:\n      parameters:\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema:\n            type: string\n            format: uuid\n          description: Prevents duplicate payment processing\n      responses:\n        '201':\n          description: Payment created\n        '409':\n          description: Duplicate idempotency key`. Documenta métodos idempotentes: `description: This endpoint is idempotent. Sending the same request with the same Idempotency-Key returns the original response.`. Para idempotency natural: `PUT /books/{id}` es naturalmente idempotente — documenta esto: `description: PUT is idempotent. Multiple calls with the same body produce the same result.`. Usa extensión `x-idempotent: true` para code generators. Almacena idempotency keys: `x-idempotency-key-ttl: 24h`. Documenta expiración de keys: `description: Idempotency keys are stored for 24 hours. After expiration, the same key can be reused.`.

### ¿Cómo documento paginación de API con HATEOAS links?

HATEOAS (Hypermedia as the Engine of Application State) embebe links de navegación en responses. Define un schema de links: `components:\n  schemas:\n    BookCollection:\n      type: object\n      properties:\n        data:\n          type: array\n          items: $ref: '#/components/schemas/Book'\n        _links:\n          type: object\n          properties:\n            self:\n              $ref: '#/components/schemas/Link'\n            next:\n              $ref: '#/components/schemas/Link'\n            prev:\n              $ref: '#/components/schemas/Link'\n    Link:\n      type: object\n      properties:\n        href:\n          type: string\n          format: uri\n        rel:\n          type: string\n        method:\n          type: string\n          enum: [GET, POST, PUT, DELETE]`. Documenta response de ejemplo: `example:\n  data: [{id: 1, title: Clean Code}]\n  _links:\n    self: {href: /books?page=1, rel: self, method: GET}\n    next: {href: /books?page=2, rel: next, method: GET}`. Usa OpenAPI links para static linking: `responses:\n  '201':\n    links:\n      GetBook:\n        operationId: getBook\n        parameters:\n          book_id: '$response.body#/id'`.

### ¿Cómo documento request validation de API en OpenAPI?

Documenta rules de validation usando constraints de JSON Schema en el spec. Para string validation: `schema:\n  type: string\n  minLength: 3\n  maxLength: 100\n  pattern: '^[a-zA-Z0-9_-]+$'`. Para numeric ranges: `schema:\n  type: number\n  minimum: 0\n  maximum: 1000\n  exclusiveMinimum: true`. Para enum values: `schema:\n  type: string\n  enum: [active, inactive, suspended]`. Para array validation: `schema:\n  type: array\n  minItems: 1\n  maxItems: 100\n  uniqueItems: true\n  items:\n    type: string`. Para object validation: `schema:\n  type: object\n  required: [name, email]\n  properties:\n    name:\n      type: string\n      minLength: 1\n    email:\n      type: string\n      format: email`. Documenta error responses de validation: `'400':\n  description: Validation error\n  content:\n    application/problem+json:\n      schema:\n        type: object\n        properties:\n          errors:\n            type: array\n            items:\n              type: object\n              properties:\n                field: {type: string}\n                message: {type: string}\n                code: {type: string}`. Usa extensión `x-validate` para validators custom: `x-validate:\n  - rule: no-sql-injection\n  - rule: max-nested-depth\n    params: {max: 5}`.

### ¿Cómo documento response envelopes de API en OpenAPI?

Documenta envelopes de response estándar para diseño consistente de API. Define un schema envelope: `components:\n  schemas:\n    ApiResponse:\n      type: object\n      properties:\n        data:\n          oneOf:\n            - type: object\n            - type: array\n        meta:\n          type: object\n          properties:\n            request_id:\n              type: string\n            timestamp:\n              type: string\n              format: date-time\n            version:\n              type: string\n        errors:\n          type: array\n          items:\n            $ref: '#/components/schemas/Error'`. Usa el envelope en responses: `responses:\n  '200':\n    content:\n      application/json:\n        schema:\n          allOf:\n            - $ref: '#/components/schemas/ApiResponse'\n            - properties:\n                data:\n                  $ref: '#/components/schemas/Book'`. Documenta error envelope: `'400':\n  content:\n    application/json:\n      schema:\n        type: object\n        properties:\n          errors:\n            type: array\n            items:\n              type: object\n              properties:\n                code: {type: string}\n                detail: {type: string}\n                source: {type: string}`. Para compliance con JSON:API, usa keys top-level `data`, `included`, `meta`, y `errors`.

### ¿Cómo manejo diferencias entre OpenAPI 3.0 y 3.1?

OpenAPI 3.1 se alinea con JSON Schema 2020-12 e introduce varios cambios. En 3.1, `nullable: true` se reemplaza por `type: [string, null]`. Los `exclusiveMinimum` y `exclusiveMaximum` ahora son números, no booleanos: `minimum: 0\nexclusiveMinimum: true` se convierte en `exclusiveMinimum: 0`. Webhooks se soportan nativamente: `webhooks:\n  event:\n    post: ...`. El `format: binary` se reemplaza por `contentEncoding: binary`. License identifiers usan SPDX: `info:\n  license:\n    name: MIT\n    identifier: MIT`. Summary es opcional en `$ref`. Paths pueden ser objetos vacíos para APIs solo de webhooks. Usa `redocly lint` para checkear rules específicas de versión. Convierte entre versiones: `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. La mayoría de herramientas ya soportan 3.1, pero verifica compatibilidad con tu toolchain antes de migrar.

### ¿Cómo documento portals de documentación de API y developer experience?

Crea un developer portal usando Redoc, Stoplight, o Backstage. Con Redoc: `npx @redocly/cli build-docs openapi.yaml -o ./docs` genera un sitio HTML estático. Configura branding: `redocly.yaml:\\ntheme:\\n  colors:\\n    primary: '#2563eb'\\n  logo:\\n    url: ./logo.svg\\n  typography:\\n    fontSize: 14px\\n    fontFamily: 'Inter, sans-serif'`. Añade funcionalidad try-it-out con Swagger UI: `swagger-ui-express` para Express, o `swagger-ui` standalone. Incluye code samples interactivos: `x-code-samples:\\n  - lang: curl\\n    source: curl -X GET https://api.example.com/books\\n  - lang: Python\\n    source: import requests; requests.get('https://api.example.com/books')\\n  - lang: JavaScript\\n    source: fetch('https://api.example.com/books')`. Añade changelog: `x-changelog:\\n  - version: 2.0.0\\n    date: 2025-01-15\\n    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]`. Incluye guías de onboarding: `x-onboarding:\\n  steps: [Create API key, Make first request, Handle errors, Implement pagination]`.

### ¿Cómo manejo generación de specs OpenAPI para APIs legacy?

Retrofit specs OpenAPI para APIs legacy usando herramientas de reverse engineering. Usa `akto` para spec generation basada en tráfico: `akto run --proxy http://localhost:8080 --output openapi.yaml` captura tráfico de API y genera un spec. Usa `swagger-express` para apps Express: añade middleware que auto-genera specs desde routes. Para apps Java legacy, usa anotaciones `swagger-core`: `@Api(value = \"books\", description = \"Book endpoints\")` en controllers. Para Python Flask, usa `flask-restx` con `@ns.doc(responses={200: 'Success'})`. Para SOAP APIs no documentadas, convierte WSDL a OpenAPI: `npx @redocly/cli convert wsdl.xml --to openapi`. Annota endpoints gradualmente: empieza con paths y methods, luego añade parameters, luego response schemas. Usa `redocly lint` para trackear completeness del spec: `redocly lint --format=json openapi.yaml | jq '[.problems[] | .ruleId] | group_by(.) | map({rule: .[0], count: length})'`. Prioriza documentar los endpoints más usados primero basado en análisis de tráfico.

### ¿Cómo documento throttling y quota management de API en OpenAPI?

Documenta políticas de throttling usando extensiones y response headers. Define límites de quota por tier: `x-quota:\\n  free:\\n    requests_per_day: 1000\\n    burst: 10\\n  pro:\\n    requests_per_day: 100000\\n    burst: 100\\n  enterprise:\\n    requests_per_day: 10000000\\n    burst: 1000`. Documenta headers de quota: `responses:\\n  '200':\\n    headers:\\n      X-Quota-Limit:\\n        schema: {type: integer}\\n        description: Total requests allowed per day\\n      X-Quota-Remaining:\\n        schema: {type: integer}\\n        description: Remaining requests today\\n      X-Quota-Reset:\\n        schema: {type: string, format: date-time}\\n        description: When quota resets`. Incluye la response 429 con detalles de quota: `'429':\\n  description: Quota exceeded\\n  content:\\n    application/problem+json:\\n      schema:\\n        type: object\\n        properties:\\n          type: {type: string}\\n          title: {type: string}\\n          detail: {type: string}\\n          quota_limit: {type: integer}\\n          quota_used: {type: integer}\\n          reset_at: {type: string, format: date-time}`. Documenta algoritmos de throttling: token bucket, sliding window, o fixed window. Usa extensión `x-throttling`: `x-throttling:\\n  algorithm: token-bucket\\n  capacity: 100\\n  refill_rate: 10/s`. Documenta rules de bypass: `x-throttle-bypass:\\n  - header: X-Internal-Request\\n  - ip_range: 10.0.0.0/8`.

### ¿Cómo documento API key management en OpenAPI?

Documenta autenticación de API keys, rotación, y scoping. Define API key security: `components:\n  securitySchemes:\n    ApiKeyAuth:\n      type: apiKey\n      in: header\n      name: X-API-Key\n      description: API key required for all requests`. Documenta key scopes: `x-api-key-scopes:\n  - read:books\n  - write:books\n  - read:authors\n  - admin`. Incluye endpoints de key management: `paths:\n  /api-keys:\n    post:\n      summary: Create API key\n      security:\n        - BearerAuth: []\n      requestBody:\n        content:\n          application/json:\n            schema:\n              type: object\n              properties:\n                name: {type: string}\n                scopes: {type: array, items: {type: string}}\n                expires_at: {type: string, format: date-time}\n    get:\n      summary: List API keys\n      responses:\n        '200':\n          content:\n            application/json:\n              schema:\n                type: array\n                items:\n                  type: object\n                  properties:\n                    id: {type: string}\n                    name: {type: string}\n                    scopes: {type: array, items: {type: string}}\n                    created_at: {type: string, format: date-time}\n                    last_used: {type: string, format: date-time}\n  /api-keys/{id}:\n    delete:\n      summary: Revoke API key\n      responses:\n        '204': {description: Key revoked}`. Documenta política de rotación: `x-api-key-rotation: 90 days`. Documenta prefijo de key para identificación: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.

### ¿Cómo documento event streaming de API con Kafka en OpenAPI?

Documenta APIs async basadas en Kafka usando extensiones OpenAPI. Define topics async: `x-kafka:\\n  topics:\\n    - name: book.events\\n      partitions: 6\\n      replication: 3\\n      key_format: uuid\\n      value_format: avro\\n      schema_registry: http://schema-registry:8081`. Documenta endpoints de producer: `paths:\\n  /events/publish:\\n    post:\\n      summary: Publish event to Kafka\\n      requestBody:\\n        content:\\n          application/json:\\n            schema:\\n              type: object\\n              properties:\\n                topic: {type: string}\\n                key: {type: string}\\n                value: {type: object}`. Documenta consumer group offsets: `x-kafka-consumer-groups:\\n  - name: book-indexer\\n    offset_reset: earliest\\n  - name: book-analytics\\n    offset_reset: latest`. Usa extensión `x-asyncapi` para linkear a un spec de AsyncAPI para documentación async completa: `x-asyncapi-spec: ./asyncapi.yaml`.

## Ver También

- [API Versioning](/recipes/api/api-versioning) — estrategias para versionar APIs REST
- [Call REST API](/recipes/api/call-rest-api) — consumo de APIs REST desde código cliente
- [GraphQL API](/recipes/api/graphql-api) — paradigma alternativo de API
- [Handle CORS](/recipes/api/handle-cors) — configuración de cross-origin resource sharing
- [Handle Errors](/recipes/api/handle-errors) — patterns estructurados de manejo de errores

---

*Última actualización: 2026-07-09*
