---
contentType: recipes
slug: api-documentation-openapi
title: "How to Document an API with OpenAPI, Swagger UI and Redoc"
description: A step-by-step guide to documenting REST APIs with OpenAPI. Generate interactive docs with Swagger UI and Redoc using Python, JavaScript and Java.
metaDescription: Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.
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
  metaDescription: Step-by-step guide to documenting REST APIs with OpenAPI. Learn how to generate interactive docs with Swagger UI and Redoc in Python, JavaScript and Java.
  keywords:
    - openapi docs
    - swagger documentation
    - redoc
    - api documentation example
---
## Overview

API docs die in READMEs, Confluence pages and Slack threads. The moment you ship a change, those pages are already lying. OpenAPI, the spec that grew out of Swagger, lets you describe your endpoints, schemas and errors in one YAML or JSON file. That same file can power interactive documentation, client SDKs and test scaffolding.

This guide walks through three common stacks: Python + FastAPI, JavaScript + Express, and Java + SpringDoc. It also covers when Swagger UI wins, when Redoc is the better fit, and how to stop the spec from rotting once it's in production.

## When to Use

This resource fits when:
- You need interactive API documentation that stays in sync with your code
- You want to auto-generate client SDKs in several languages
- Your team needs a contract-first approach for API development
- You need to validate incoming requests against a formal schema

When not to use:
- If the API is only for internal use and you are the only consumer, a short README may be enough. As soon as a second team depends on it, a written contract pays off.

## Solution

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

## Explanation

Teams produce OpenAPI specs in two ways, and the right choice depends on who owns the contract.

**Code-first** works well when a single team builds and consumes the API. Frameworks like FastAPI, SpringDoc and tsoa read annotations or decorators and emit `openapi.json` as a build artifact. The upside: the spec can't drift from the implementation. The downside: the spec tends to leak internal models unless you're careful with DTOs.

**Design-first** works better when frontend, backend and mobile teams agree on a contract before anyone writes code. You write the YAML or JSON spec by hand, publish it to a registry like SwaggerHub or Stoplight, then generate server stubs and client SDKs. The upside: the contract forces explicit decisions about fields, errors and versioning. The downside: if the spec isn't enforced by tests, it can become aspirational while the code does something else.

Once the spec exists, it powers three things:
- **Swagger UI** — an interactive explorer where developers can call endpoints directly from the browser.
- **Redoc** — a clean, three-pane documentation site that's easier to read and navigate.
- **Client generators** — `openapi-generator-cli` can turn the same spec into typed clients for TypeScript, Python, Java and many other languages.

## Variants

| Tool | Language | Approach | Output |
|------|----------|----------|--------|
| FastAPI | Python | Code-first | Auto-generated /openapi.json + /docs |
| Flask-RESTX | Python | Code-first | Built-in Swagger UI |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Serve pre-written YAML |
| tsoa | TypeScript | Code-first | Generate spec from decorators |

## What Works

- **Pin the spec version to the API version** in the `info.version` field, and document deprecations with `deprecated: true` plus a replacement path.
- **Add examples** to request and response schemas; they're the fastest way to stop integration questions before they start.
- **Group operations with tags** such as `users`, `orders`, or `products` so Swagger UI and Redoc render collapsible sections.
- **Document real error responses**, not just `200`. Include `400`, `401`, `404`, `409` and `5xx` with problem-detail bodies.
- **Validate the spec in CI** with `npx @redocly/cli lint` or `spectral`; a broken `$ref` or missing `operationId` will silently break client generators.

## Common Mistakes

- **Letting the spec drift from the code**: Code-first tooling helps, but only if you actually expose DTOs, not database entities, in the spec.
- **Forgetting security definitions**: Every operation that requires auth needs a `security` entry and a matching `securitySchemes` component.
- **Exposing internal models**: Keep database entities out of `components/schemas`; use dedicated request and response DTOs.
- **Ignoring nullable fields**: OpenAPI 3.0 uses `nullable: true`; OpenAPI 3.1 uses `type: [string, null]`. Pick one and lint for it.
- **Hardcoding server URLs**: Use the `servers` array with variables (`{serverUrl}`) so staging and production don't require separate spec files.


## Troubleshooting

- **Redoc or Swagger UI shows a blank page**: usually a malformed spec. Run `npx @redocly/cli lint openapi.json` to find the exact line and rule.
- **Generated clients fail to compile**: check for `operationId` collisions, reserved words in schema names, and `enum` values that aren't valid identifiers in the target language.
- **Spec doesn't match deployed behavior**: add contract tests with Schemathesis or Pact to the CI pipeline, so spec drift breaks the build before it reaches users.
- **Examples in Swagger UI look wrong**: make sure `example` fields sit next to the right `schema` level and that array examples use the `items.example` form.
- **Large specs slow down the docs page**: split the spec with `$ref` pointers and enable bundling with `redocly bundle` before rendering.




## Further Reading

- [OpenAPI Specification (latest)](https://spec.openapis.org/oas/latest.html) — the authoritative reference for field names, supported types and version differences.
- [Redocly CLI documentation](https://redocly.com/docs/cli) — how to lint, bundle and publish OpenAPI specs.
- [FastAPI docs on OpenAPI](https://fastapi.tiangolo.com/reference/openapi/) — how FastAPI generates `/openapi.json` and `/docs` out of the box.
- [Springdoc OpenAPI](https://springdoc.org/) — Spring Boot annotation reference and customization options.

## Production Notes

- **Version the spec in source control** and tag releases with the same version as the API (`info.version` should match the deployed API version).
- **Serve docs from a separate build artifact** or CDN path so spec updates don't require a full application deploy.
- **Lint the spec in CI** before publishing; a broken `$ref` or missing `operationId` will break client generators and Redoc rendering.
- **Monitor doc endpoints** (`/docs`, `/redoc`, `/openapi.json`) for 4xx/5xx and p99 latency, especially after spec updates.

## Key Takeaways

- OpenAPI turns a single spec file into interactive docs, client SDKs and contract tests, so your documentation stays in sync with your code.
- Swagger UI is best when developers need to call endpoints from the browser; Redoc is better for a clean, documentation-first reading experience.
- FastAPI, Express and SpringDoc can generate the spec automatically from code, but teams with several consumers should consider design-first with a shared registry.
- Validate the spec in CI with `redocly lint` or `spectral` to catch broken references, missing `operationId`s and version drift before they reach production.

## FAQ

### Should I use code-first or design-first?

Start with code-first if you're building an internal API that only your own team consumes. FastAPI, SpringDoc and tsoa can derive the spec from your annotations, so the contract stays close to the code:

```python
@app.get("/books/{book_id}")
def get_book(book_id: int):
    ...
```

Use design-first when frontend, mobile, backend and external partner teams need to agree on the contract before anyone writes code. You write the OpenAPI YAML first, publish it to a registry such as SwaggerHub or Stoplight, and then generate stubs:

```bash
openapi-generator-cli generate -i openapi.yaml -g python-fastapi
```

The real risk with design-first is drift: the spec becomes a wishlist while the code does something else. Prevent that with contract tests (Schemathesis, Pact) in CI. The risk with code-first is leaking internal models into the spec; prevent that by returning DTOs, not database entities.

### How do I keep documentation in sync with deployed code?

Generate the spec in CI from your code, publish it to a registry (SwaggerHub, Stoplight), and link the deployed docs to the latest spec version. In GitHub Actions:

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
Validate the spec on every PR: `npx @redocly/cli lint openapi.yaml` catches schema violations, missing responses, and invalid references. Publish the spec as a build artifact and deploy docs alongside the API. Use contract testing with Pact or Schemathesis to verify the API matches the spec: `schemathesis run openapi.json --base-url http://localhost:8000`.

### Can I convert Swagger 2.0 to OpenAPI 3.0?

Yes. Use the `swagger2openapi` CLI tool or Swagger Editor's built-in converter. Most modern tools support 3.0 natively. Run: `npx swagger2openapi swagger.json -o openapi.json`. The tool converts `host`, `basePath`, and `schemes` into a single `servers` array. It transforms `definitions` into `components/schemas` and `responses` into `components/responses`. Security definitions move from `securityDefinitions` to `components/securitySchemes`. The `produces` and `consumes` fields are replaced by content negotiation in each operation. After conversion, validate: `npx @redocly/cli lint openapi.json` to catch any conversion issues. Some edge cases require manual fixes: file uploads with `type: file` become `format: binary`, and `collectionFormat` is replaced by `style` and `explode` parameters.

### How do I document authentication and authorization in OpenAPI?

Use `securitySchemes` in the `components` section. For Bearer JWT:

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```
For API keys:

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```
For OAuth2 with flows:

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
Apply security at the operation level:

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
For OpenAPI 3.1, use `type: http` with `scheme: bearer` for JWT tokens. `type: apiKey` is not deprecated, but it is the wrong choice for bearer JWT because it describes a custom API key rather than an HTTP bearer scheme.

### How do I handle versioning in OpenAPI specs?

Version the spec using the `info.version` field and URL-based API versioning. In the spec:

```yaml
info:
  title: Book API
  version: 2.1.0
```
Use semantic versioning: major for breaking changes, minor for new endpoints, patch for fixes. For URL-based versioning, include the version in the path:

```yaml
servers:
  - url: https://api.example.com/v2
```
For header-based versioning:

```yaml
parameters:
  - name: X-API-Version
    in: header
    required: true
    schema:
      type: string
      default: "2"
```
Document deprecations with `deprecated: true` on operations:

```yaml
paths:
  /books/{id}:
    get:
      deprecated: true
      description: Use /v2/books/{id} instead
```
Maintain both spec versions during migration periods and use `Accept` header content negotiation: `Accept: application/vnd.api+json;version=2`.

### How do I generate client SDKs from OpenAPI specs?

Use `openapi-generator-cli` to generate typed clients in several languages. Install: `npm install @openapitools/openapi-generator-cli -g`. Generate a TypeScript client: `openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts`. Generate a Python client: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py` (add `--library httpx` if your generator version supports it). Generate a Java client: `openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson`. Configure generation options in a `.openapi-generator-config.json`: `{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}`. Publish generated clients to package registries: npm for TypeScript, PyPI for Python, Maven Central for Java. Automate in CI: generate, test, and publish on spec changes.

### How do I document pagination in OpenAPI?

Use `cursor` or `offset/limit` parameters with a pagination envelope schema. For offset-based:

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
Define the response envelope:

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
For cursor-based pagination:

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
Include `Link` headers in responses: `Link: <https://api.example.com/books?cursor=abc>; rel="next"`. Document rate limiting headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### How do I handle file uploads and downloads in OpenAPI?

For file uploads in OpenAPI 3.0:

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
For several files:

```yaml
properties:
  files:
    type: array
    items:
      type: string
      format: binary
```
In OpenAPI 3.1, use `contentEncoding: binary` instead of `format: binary`. For file downloads:

```yaml
responses:
  '200':
    content:
      application/octet-stream:
        schema:
          type: string
          format: binary
```
For image responses with content type:

```yaml
content:
  image/png:
    schema:
      type: string
      format: binary
```
Document file size limits:

```yaml
schema:
  type: string
  format: binary
  maxLength: 10485760
```
with a description noting the 10MB limit.

### How do I document webhooks in OpenAPI?

OpenAPI 3.1 supports webhooks natively with the `webhooks` field. Define webhook events:

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
Document the webhook payload schema:

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
Include webhook registration endpoints:

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
Document webhook retry policies and expected response codes.

### How do I validate OpenAPI specs in CI?

Use `@redocly/cli` or `spectral` to lint specs in CI. Install Redocly: `npm install @redocly/cli -g`. Lint: `redocly lint openapi.yaml`. Create a custom ruleset:

```yaml
rules:
  operation-operationId-unique:
    severity: error
  operation-summary:
    severity: warn
    max_length: 50
```
For Spectral: `npm install @stoplight/spectral-cli -g`. Create `.spectral.yaml`:

```yaml
extends: spectral:oas
rules:
  oas3-operation-security-defined: error
  oas3-parameter-description: warn
```
In GitHub Actions:

```yaml
- name: Lint OpenAPI
  run: npx @redocly/cli lint openapi.yaml
```
Validate spec structure: check for missing `operationId`, undefined `$ref` targets, missing response schemas, and duplicate path parameters. Auto-fix common issues: `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'`.

### How do I document error responses with RFC 7807 Problem Details?

Use the `application/problem+json` media type with a standard error schema. Define the problem details schema:

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
Reference it in error responses:

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
Document common error codes: 400 for validation errors, 401 for missing auth, 403 for insufficient permissions, 409 for conflicts, 422 for semantic validation failures, 429 for rate limiting.

### How do I document API rate limiting in OpenAPI?

Document rate limits using response headers and `x-` extensions. Add rate limit headers to responses:

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
Use custom extensions for plan-level limits:

```yaml
x-rate-limit:
  free: 100/hour
  pro: 10000/hour
  enterprise: 100000/hour
```
Document throttling behavior in the description: `description: Rate limited to 100 requests per hour for free tier. Returns 429 with Retry-After header when exceeded.`. Include the 429 response:

```yaml
'429':
  description: Too many requests
  headers:
    Retry-After:
      schema:
        type: integer
        description: Seconds to wait before retrying
```
Use `x-codegen` extensions to generate rate limit handling in client SDKs.

### How do I handle polymorphic schemas in OpenAPI?

Use `oneOf`, `anyOf`, and `allOf` for polymorphic types. For discriminated unions:

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
Define subtypes with the discriminator field:

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
For mixed types, use `anyOf`:

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
For composition without discrimination, use `allOf` to inherit properties:

```yaml
Animal:
  allOf:
    - $ref: '#/components/schemas/BaseEntity'
    - type: object
      properties:
        species:
          type: string
```

### How do I generate mock servers from OpenAPI specs?

Use Prism or OpenAPI Generator to create mock servers for testing. With Prism: `npx @stoplight/prism-cli mock openapi.yaml --port 4010`. Prism generates responses based on examples in the spec. Add examples to your schema:

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
With OpenAPI Generator: `openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server`. Configure dynamic mocking with Prism: `npx @stoplight/prism-cli mock openapi.yaml --dynamic --port 4010` generates random data matching the schema. Use mock servers in integration tests: `const response = await fetch('http://localhost:4010/books/42'); expect(response.status).toBe(200)`. Document mock server usage in the spec with `x-mock` extensions for custom mock values.

### How do I document API deprecation and sunset headers?

Use the `deprecated: true` flag on operations and the `Sunset` header for removal dates. Mark deprecated endpoints:

```yaml
paths:
  /v1/books:
    get:
      deprecated: true
      description: Deprecated in favor of /v2/books. Will be removed on 2025-12-31.
```
Include the `Deprecation` header:

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
Document migration paths in the description: `description: Migrate to /v2/books which supports cursor-based pagination and additional filters.`. Track deprecation usage with analytics: log requests to deprecated endpoints and notify consumers via email or webhook. Use `Link` header to point to the replacement: `Link: </v2/books>; rel="successor-version"`.

### How do I use OpenAPI extensions for custom metadata?

OpenAPI allows custom extensions with the `x-` prefix. Add vendor-specific metadata:

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
Document internal metadata:

```yaml
x-internal: true
x-owner: data-team
x-sla:
  response_time_p99: 200ms
  availability: 99.9
```
Use extensions for documentation portals:

```yaml
x-display-name: Books API
x-sidebar-order: 1
x-badge: Beta
```
For code generation hints:

```yaml
x-enum-descriptions:
  - Active user
  - Inactive user
  - Suspended user
```
Validate extensions in CI with custom Spectral rules:

```yaml
rules:
  x-internal-must-have-owner:
    given: $.paths.*[?(@.x-internal == true)]
    then:
      field: x-owner
      function: truthy
```

### How do I document API testing and contract testing in OpenAPI?

Use the spec to drive automated tests. With Schemathesis: `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. It generates and sends requests based on the spec and validates responses against the schema. With Dredd: `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. Write test hooks: `hooks.before('/books > GET', (transaction) => { transaction.expected.headers['Content-Type'] = 'application/json' })`. With Postman: import the spec and generate test collections: `newman run collection.json --env-var base_url=http://localhost:8000`. For contract testing with Pact: generate pacts from the spec: `pact-broker publish pacts/ --consumer-app-version 1.0.0`. Use `openapi-generator-cli` to generate test clients: `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client --library pytest`. Document test coverage:

```yaml
x-test-coverage:
  /books: 95%
  /books/{id}: 88%
```

### How do I handle circular references in OpenAPI schemas?

Circular references occur when a schema references itself. Define them with `$ref` pointing to the component:

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
Most OpenAPI tools handle circular refs correctly. In code generation, circular refs produce recursive types:

```python
class Category:
    name: str
    subcategories: List[Category]
```
For deeply nested structures, limit recursion depth: `x-max-depth: 5`. In JSON serialization, handle circular refs with `default=str` or custom encoders. For Swagger UI rendering, circular refs may cause infinite expansion — use `x-stoplight:readonly` to prevent editing. When validating, use `jsonschema` with `RefResolver` that handles circular refs: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.

### How do I document API observability and tracing in OpenAPI?

Document tracing headers and metrics using extensions and standard headers. Add correlation ID headers:

```yaml
parameters:
  - name: X-Correlation-ID
    in: header
    schema:
      type: string
      format: uuid
    description: Unique identifier for tracing requests across services
```
Document OpenTelemetry headers:

```yaml
x-opentelemetry:
  enabled: true
  service_name: book-api
  trace_parent_header: traceparent
```
Include metrics endpoints in the spec:

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
Document health checks:

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
Use `x-observability` extension for tracing config:

```yaml
x-observability:
  tracing:
    type: opentelemetry
    sampling_rate: 0.1
  metrics:
    type: prometheus
    endpoint: /metrics
```

### How do I handle content negotiation in OpenAPI?

Document different response formats using `content` with several media types. Support JSON and XML:

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
Document the `Accept` request header:

```yaml
parameters:
  - name: Accept
    in: header
    schema:
      type: string
      default: application/json
      enum: [application/json, application/xml, text/csv]
```
For versioned content types:

```yaml
content:
  application/vnd.api+json;version=1:
    schema:
      $ref: '#/components/schemas/BookV1'
  application/vnd.api+json;version=2:
    schema:
      $ref: '#/components/schemas/BookV2'
```
Document content negotiation behavior: `description: Returns JSON by default. Send Accept: application/xml for XML response. Send Accept: text/csv for CSV export.`

### How do I document API caching headers in OpenAPI?

Document caching behavior using standard HTTP headers in responses. Add `Cache-Control`, `ETag`, and `Last-Modified` headers:

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
Document conditional request headers:

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
Include the 304 response:

```yaml
'304':
  description: Not modified
  headers:
    ETag:
      schema:
        type: string
```
Use `x-cache` extension for CDN config:

```yaml
x-cache:
  strategy: cache-on-edge
  ttl: 3600
  vary_by: [Accept-Language, Authorization]
```

### How do I document long-running operations in OpenAPI?

For async operations, use the 202 Accepted response with a Location header for polling. Document the pattern:

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
Document the status endpoint:

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
For webhook callbacks:

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
Document timeout behavior and retry policies.

### How do I document API security best practices in OpenAPI?

Document security at every level: transport, authentication, and authorization. For TLS:

```yaml
servers:
  - url: https://api.example.com
    description: Production (TLS required)
```
Document CORS:

```yaml
x-cors:
  allowed_origins: [https://app.example.com]
  allowed_methods: [GET, POST, PUT, DELETE]
  allowed_headers: [Content-Type, Authorization]
  max_age: 3600
```
For input validation:

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
Document SQL injection prevention: `description: All query parameters are parameterized. No string concatenation used in SQL queries.`. For rate limiting per user: `x-rate-limit-per-user: 1000/hour`. Document API key rotation: `x-api-key-rotation: 90 days`. Include security contact:

```yaml
info:
  contact:
    email: security@example.com
  x-security-report-url: https://example.com/security
```
Document OWASP compliance: `x-owasp-compliance: [API1-BOLA, API2-BA, API3-EDP]`.

### How do I handle OpenAPI spec splitting for large APIs?

Split large specs using `$ref` to external files. Main file references components:

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
Split paths:

```yaml
paths:
  /books:
    $ref: './paths/books.yaml'
  /books/{id}:
    $ref: './paths/book-by-id.yaml'
```
Use `redocly bundle` to merge: `redocly bundle openapi.yaml --output bundled.json`. Validate split specs: `redocly lint openapi.yaml` resolves all external refs. Organize by domain for microservices: `schemas/`, `paths/`, `responses/`, `parameters/`, `examples/`. Use a shared components library:

```yaml
components:
  schemas:
    Error:
      $ref: '../shared/schemas/Error.yaml'
```
In CI, bundle before publishing: `redocly bundle openapi.yaml --output dist/openapi.json && redocly lint dist/openapi.json`.

### How do I document API metrics and monitoring in OpenAPI?

Document monitoring endpoints and metrics metadata. Include Prometheus metrics endpoint:

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
Document custom metrics:

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
Include health check endpoints:

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
Document SLA targets:

```yaml
x-sla:
  availability: 99.9%
  response_time_p99: 200ms
  throughput: 10000 rps
```

### How do I document API idempotency in OpenAPI?

Document idempotency using the `Idempotency-Key` header and response patterns. For idempotent POST operations:

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
Document idempotent methods: `description: This endpoint is idempotent. Sending the same request with the same Idempotency-Key returns the original response.`. For natural idempotency: `PUT /books/{id}` is naturally idempotent — document this: `description: PUT is idempotent. Two calls with the same body produce the same result.`. Use `x-idempotent: true` extension for code generators. Store idempotency keys: `x-idempotency-key-ttl: 24h`. Document key expiration: `description: Idempotency keys are stored for 24 hours. After expiration, the same key can be reused.`.

### How do I document API request validation in OpenAPI?

Document validation rules using JSON Schema constraints in the spec. For string validation:

```yaml
schema:
  type: string
  minLength: 3
  maxLength: 100
  pattern: '^[a-zA-Z0-9_-]+$'
```
For numeric ranges:

```yaml
schema:
  type: number
  minimum: 0
  maximum: 1000
  exclusiveMinimum: true
```
For enum values:

```yaml
schema:
  type: string
  enum: [active, inactive, suspended]
```
For array validation:

```yaml
schema:
  type: array
  minItems: 1
  maxItems: 100
  uniqueItems: true
  items:
    type: string
```
For object validation:

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
Document validation error responses:

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
Use `x-validate` extension for custom validators:

```yaml
x-validate:
  - rule: no-sql-injection
  - rule: max-nested-depth
    params: {max: 5}
```

### How do I document API response envelopes in OpenAPI?

Document standard response envelopes for consistent API design. Define an envelope schema:

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
Use the envelope in responses:

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
Document error envelope:

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
For JSON:API compliance, use `data`, `included`, `meta`, and `errors` top-level keys.

### How do I handle OpenAPI 3.0 vs 3.1 differences?

OpenAPI 3.1 aligns with JSON Schema 2020-12 and introduces several changes. In 3.1, `nullable: true` is replaced by `type: [string, null]`. The `exclusiveMinimum` and `exclusiveMaximum` are now numbers, not booleans:

```yaml
minimum: 0
exclusiveMinimum: true
```
becomes `exclusiveMinimum: 0`. Webhooks are supported natively:

```yaml
webhooks:
  event:
    post: ...
```
The `format: binary` is replaced by `contentEncoding: binary`. License identifiers use SPDX:

```yaml
info:
  license:
    name: MIT
    identifier: MIT
```
Summary is optional in `$ref`. Paths can be empty objects for webhooks-only APIs. Use `redocly lint` to check version-specific rules. Convert between versions: `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. Most tools now support 3.1, but verify compatibility with your toolchain before migrating.

### How do I document API documentation portals and developer experience?

Create a developer portal using Redoc, Stoplight, or Backstage. With Redoc: `npx @redocly/cli build-docs openapi.yaml -o ./docs` generates a static HTML site. Configure branding:

```yaml
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
Add try-it-out functionality with Swagger UI: `swagger-ui-express` for Express, or `swagger-ui` standalone. Include interactive code samples:

```yaml
x-code-samples:
  - lang: curl
    source: curl -X GET https://api.example.com/books
  - lang: Python
    source: import requests; requests.get('https://api.example.com/books')
  - lang: JavaScript
    source: fetch('https://api.example.com/books')
```
Add changelog:

```yaml
x-changelog:
  - version: 2.0.0
    date: 2025-01-15
    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]
```
Include onboarding guides:

```yaml
x-onboarding:
  steps: [Create API key, Make first request, Handle errors, Implement pagination]
```

### How do I document API key management in OpenAPI?

Document API key authentication, rotation, and scoping. Define API key security:

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key required for all requests
```
Document key scopes:

```yaml
x-api-key-scopes:
  - read:books
  - write:books
  - read:authors
  - admin
```
Include key management endpoints:

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
Document key rotation policy: `x-api-key-rotation: 90 days`. Document key prefix for identification: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.

## See Also

- [API Versioning](/recipes/api-versioning/) — strategies for versioning REST APIs
- [Call REST API](/recipes/call-rest-api/) — consuming REST APIs from client code
- [GraphQL API](/recipes/graphql-api/) — alternative API approach
- [Handle CORS](/recipes/handle-cors/) — cross-origin resource sharing configuration
- [Handle Errors](/recipes/handle-errors/) — structured error handling patterns

## Common Production Pitfalls

- Letting the OpenAPI spec drift from the deployed API so that docs, clients, and tests stop matching reality.
- Exposing internal database schemas directly in `components/schemas` instead of stable DTOs.
- Skipping spec linting in CI and publishing invalid or broken `$ref` references.
- Using `apiKey` security for bearer JWT tokens instead of `http` with `scheme: bearer`.
- Forgetting to version the spec alongside the API, or removing deprecated paths too aggressively.
- Deploying the generated `/docs` and `/redoc` endpoints without access control on internal APIs.
- Assuming a generated client will work without checking compatibility with your OpenAPI version and extensions.
