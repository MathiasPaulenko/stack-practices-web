---
contentType: recipes
slug: api-documentation-openapi
title: "Create API Documentation with OpenAPI"
description: "Generate interactive API docs from OpenAPI specs using Swagger UI, Redoc, and native tools in Python, JavaScript, and Java."
metaDescription: "Create API documentation with OpenAPI and Swagger. Generate interactive docs from specs in Python, JavaScript, and Java with examples and what works."
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
  metaDescription: "Create API documentation with OpenAPI and Swagger. Generate interactive docs from specs in Python, JavaScript, and Java with examples and what works."
  keywords:
    - openapi
    - swagger
    - api-documentation
    - redoc
    - python
    - javascript
    - java
---
# Create API Documentation with OpenAPI

## Overview

OpenAPI (formerly Swagger) is the industry standard for describing [REST APIs](/recipes/api/rest-api-design). A well-maintained OpenAPI spec works as the single source of truth for your API — generating interactive documentation, client SDKs, and automated tests from one YAML or JSON file.

Below is a practical approach to generating interactive API docs from OpenAPI specs using Swagger UI, Redoc, and native framework tools.

## When to Use

Use this resource when:
- You need interactive API documentation that stays in sync with your code
- You want to auto-generate client SDKs in multiple languages
- Your team needs a contract-first approach for API development
- You need to validate incoming requests against a formal schema

## Solution

### Python

```python
from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html

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
import org.springdoc.core.annotations.RouterOperation;
import org.springdoc.core.annotations.RouterOperations;

@RestController
@RequestMapping("/books")
public class BookController {

    @Operation(summary = "Get book by ID", description = "Returns a single book")
    @ApiResponse(responseCode = "200", description = "Found the book")
    @GetMapping("/{id}")
    public Book getBook(@PathVariable Long id) {
        return bookService.findById(id);
    }
}
// springdoc-openapi auto-generates /v3/api-docs and /swagger-ui.html
```

## Explanation

OpenAPI specs are typically generated in two ways:
- **Code-first**: Annotations in your code generate the spec automatically ([FastAPI](/recipes/api/go-rest-api-gin), SpringDoc, tsoa)
- **Design-first**: You write the YAML/JSON spec manually, then generate server stubs and [client SDKs](/recipes/api/call-rest-api)

The generated spec (`openapi.json`) drives:
- **Swagger UI**: Interactive explorer for testing endpoints
- **Redoc**: Clean, responsive documentation (better for reading)
- **Client generators**: `openapi-generator-cli` creates TypeScript, Python, Java clients

## Variants

| Tool | Language | Approach | Output |
|------|----------|----------|--------|
| FastAPI | Python | Code-first | Auto-generated /openapi.json + /docs |
| Flask-RESTX | Python | Code-first | Built-in Swagger UI |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Serve pre-written YAML |
| tsoa | TypeScript | Code-first | Generate spec from decorators |

## What Works

- **Version your spec**: Use `version` field and document breaking changes
- **Add examples**: Rich examples in schemas reduce integration friction
- **Use tags**: Group endpoints logically (users, orders, products)
- **Document errors**: Include 4xx and 5xx responses with problem details
- **Keep spec in CI**: Validate spec syntax on every build with `swagger-codegen validate`

## Common Mistakes

- **Drift between code and spec**: Code changes but spec is not updated — use code-first to avoid this
- **Missing security definitions**: Document auth requirements ([Bearer](/recipes/security/oauth2-pkce-spa), OAuth2, API key)
- **Over-sharing internal models**: Expose DTOs, not [database entities](/guides/databases/database-design-guide), in the spec
- **Ignoring nullable fields**: OpenAPI 3.0 requires `nullable: true` explicitly
- **Hardcoding server URLs**: Use variables (`{serverUrl}`) for different environments

## Frequently Asked Questions

### Should I use code-first or design-first?

Code-first is faster for existing APIs. Design-first is better for cross-team contracts where frontend and backend develop in parallel. In code-first, annotations generate the spec automatically: `@app.get("/books/{id}")` in FastAPI or `@Operation(summary="Get book")` in SpringDoc. In design-first, you write the OpenAPI YAML first: `openapi: 3.0.3\npaths:\n  /books/{id}:\n    get:\n      summary: Get book` and generate server stubs with `openapi-generator-cli generate -i openapi.yaml -g python-fastapi`. Design-first enforces a contract before implementation, preventing scope creep. Code-first reduces drift since the spec always matches the code. For microservices with multiple teams, design-first with a shared spec registry (SwaggerHub, Stoplight) works best. For internal APIs with a single team, code-first is more practical.

### How do I keep documentation in sync with deployed code?

Generate the spec in CI from your code, publish it to a registry (SwaggerHub, Stoplight), and link the deployed docs to the latest spec version. In GitHub Actions: `name: Generate OpenAPI Spec\non: push\njobs:\n  spec:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: python -m app.main --export-openapi > openapi.json\n      - run: npx @redocly/cli lint openapi.json\n      - run: npx @redocly/cli build-docs openapi.json -o docs/`. Validate the spec on every PR: `npx @redocly/cli lint openapi.yaml` catches schema violations, missing responses, and invalid references. Publish the spec as a build artifact and deploy docs alongside the API. Use contract testing with Pact or Schemathesis to verify the API matches the spec: `schemathesis run openapi.json --base-url http://localhost:8000`.

### Can I convert Swagger 2.0 to OpenAPI 3.0?

Yes. Use the `swagger2openapi` CLI tool or Swagger Editor's built-in converter. Most modern tools support 3.0 natively. Run: `npx swagger2openapi swagger.json -o openapi.json`. The tool converts `host`, `basePath`, and `schemes` into a single `servers` array. It transforms `definitions` into `components/schemas` and `responses` into `components/responses`. Security definitions move from `securityDefinitions` to `components/securitySchemes`. The `produces` and `consumes` fields are replaced by content negotiation in each operation. After conversion, validate: `npx @redocly/cli lint openapi.json` to catch any conversion issues. Some edge cases require manual fixes: file uploads with `type: file` become `format: binary`, and `collectionFormat` is replaced by `style` and `explode` parameters.

### How do I document authentication and authorization in OpenAPI?

Use `securitySchemes` in the `components` section. For Bearer JWT: `components:\n  securitySchemes:\n    BearerAuth:\n      type: http\n      scheme: bearer\n      bearerFormat: JWT`. For API keys: `components:\n  securitySchemes:\n    ApiKeyAuth:\n      type: apiKey\n      in: header\n      name: X-API-Key`. For OAuth2 with flows: `components:\n  securitySchemes:\n    OAuth2:\n      type: oauth2\n      flows:\n        authorizationCode:\n          authorizationUrl: https://api.example.com/oauth/authorize\n          tokenUrl: https://api.example.com/oauth/token\n          scopes:\n            read: Read access\n            write: Write access`. Apply security at the operation level: `paths:\n  /books:\n    get:\n      security:\n        - BearerAuth: []\n    post:\n      security:\n        - OAuth2: [write]`. For OpenAPI 3.1, use `type: http` with `scheme: bearer` instead of the deprecated `type: apiKey` for JWT tokens.

### How do I handle versioning in OpenAPI specs?

Version the spec using the `info.version` field and URL-based API versioning. In the spec: `info:\n  title: Book API\n  version: 2.1.0`. Use semantic versioning: major for breaking changes, minor for new endpoints, patch for fixes. For URL-based versioning, include the version in the path: `servers:\n  - url: https://api.example.com/v2`. For header-based versioning: `parameters:\n  - name: X-API-Version\n    in: header\n    required: true\n    schema:\n      type: string\n      default: "2"`. Document deprecations with `deprecated: true` on operations: `paths:\n  /books/{id}:\n    get:\n      deprecated: true\n      description: Use /v2/books/{id} instead`. Maintain multiple spec versions during migration periods and use `Accept` header content negotiation: `Accept: application/vnd.api+json;version=2`.

### How do I generate client SDKs from OpenAPI specs?

Use `openapi-generator-cli` to generate typed clients in multiple languages. Install: `npm install @openapitools/openapi-generator-cli -g`. Generate a TypeScript client: `openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts`. Generate a Python client: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py`. Generate a Java client: `openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson`. For Python with httpx: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client --library httpx`. Configure generation options in a `.openapi-generator-config.json`: `{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}`. Publish generated clients to package registries: npm for TypeScript, PyPI for Python, Maven Central for Java. Automate in CI: generate, test, and publish on spec changes.

### How do I document pagination in OpenAPI?

Use `cursor` or `offset/limit` parameters with a pagination envelope schema. For offset-based: `parameters:\n  - name: offset\n    in: query\n    schema:\n      type: integer\n      default: 0\n      minimum: 0\n  - name: limit\n    in: query\n    schema:\n      type: integer\n      default: 20\n      maximum: 100`. Define the response envelope: `components:\n  schemas:\n    PaginatedBooks:\n      type: object\n      properties:\n        data:\n          type: array\n          items: $ref: '#/components/schemas/Book'\n        total:\n          type: integer\n        offset:\n          type: integer\n        limit:\n          type: integer`. For cursor-based pagination: `parameters:\n  - name: cursor\n    in: query\n    schema:\n      type: string\n  - name: page_size\n    in: query\n    schema:\n      type: integer\n      default: 20`. Include `Link` headers in responses: `Link: <https://api.example.com/books?cursor=abc>; rel="next"`. Document rate limiting headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### How do I handle file uploads and downloads in OpenAPI?

For file uploads in OpenAPI 3.0: `paths:\n  /upload:\n    post:\n      requestBody:\n        content:\n          multipart/form-data:\n            schema:\n              type: object\n              properties:\n                file:\n                  type: string\n                  format: binary`. For multiple files: `properties:\n  files:\n    type: array\n    items:\n      type: string\n      format: binary`. In OpenAPI 3.1, use `contentEncoding: binary` instead of `format: binary`. For file downloads: `responses:\n  '200':\n    content:\n      application/octet-stream:\n        schema:\n          type: string\n          format: binary`. For image responses with content type: `content:\n  image/png:\n    schema:\n      type: string\n      format: binary`. Document file size limits: `schema:\n  type: string\n  format: binary\n  maxLength: 10485760` with a description noting the 10MB limit.

### How do I document webhooks in OpenAPI?

OpenAPI 3.1 supports webhooks natively with the `webhooks` field. Define webhook events: `webhooks:\n  bookCreated:\n    post:\n      requestBody:\n        content:\n          application/json:\n            schema:\n              $ref: '#/components/schemas/BookEvent'\n      responses:\n        '200':\n          description: Event received`. Document the webhook payload schema: `components:\n  schemas:\n    BookEvent:\n      type: object\n      properties:\n        event_type:\n          type: string\n          enum: [created, updated, deleted]\n        book:\n          $ref: '#/components/schemas/Book'\n        timestamp:\n          type: string\n          format: date-time`. Include webhook registration endpoints: `paths:\n  /webhooks:\n    post:\n      summary: Register webhook\n      requestBody:\n        content:\n          application/json:\n            schema:\n              type: object\n              properties:\n                url:\n                  type: string\n                  format: uri\n                events:\n                  type: array\n                  items:\n                    type: string`. Document webhook retry policies and expected response codes.

### How do I validate OpenAPI specs in CI?

Use `@redocly/cli` or `spectral` to lint specs in CI. Install Redocly: `npm install @redocly/cli -g`. Lint: `redocly lint openapi.yaml`. Create a custom ruleset: `rules:\n  operation-operationId-unique:\n    severity: error\n  operation-summary:\n    severity: warn\n    max_length: 50`. For Spectral: `npm install @stoplight/spectral-cli -g`. Create `.spectral.yaml`: `extends: spectral:oas\nrules:\n  oas3-operation-security-defined: error\n  oas3-parameter-description: warn`. In GitHub Actions: `- name: Lint OpenAPI\n  run: npx @redocly/cli lint openapi.yaml`. Validate spec structure: check for missing `operationId`, undefined `$ref` targets, missing response schemas, and duplicate path parameters. Auto-fix common issues: `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'`.

### How do I document error responses with RFC 7807 Problem Details?

Use the `application/problem+json` media type with a standard error schema. Define the problem details schema: `components:\n  schemas:\n    Problem:\n      type: object\n      properties:\n        type:\n          type: string\n          format: uri\n          default: about:blank\n        title:\n          type: string\n        status:\n          type: integer\n        detail:\n          type: string\n        instance:\n          type: string\n          format: uri`. Reference it in error responses: `responses:\n  '404':\n    description: Book not found\n    content:\n      application/problem+json:\n        schema:\n          $ref: '#/components/schemas/Problem'\n        examples:\n          not_found:\n            value:\n              type: https://api.example.com/errors/not-found\n              title: Book not found\n              status: 404\n              detail: Book with ID 42 does not exist\n              instance: /books/42`. Document common error codes: 400 for validation errors, 401 for missing auth, 403 for insufficient permissions, 409 for conflicts, 422 for semantic validation failures, 429 for rate limiting.

### How do I use OpenAPI with GraphQL?

OpenAPI and GraphQL serve different purposes but can coexist. Use OpenAPI for REST endpoints and GraphQL schema for queries/mutations. Convert GraphQL schema to OpenAPI: use `graphql-to-openapi` to generate an OpenAPI spec from GraphQL operations: `npx graphql-to-openapi --schema schema.graphql --query 'query { books { id title } }' --output openapi.yaml`. For supergraph federation, document each subgraph as an OpenAPI spec and use a gateway spec that aggregates them. For REST-to-GraphQL wrappers, use Apollo Server's RESTDataSource: `class BookAPI extends RESTDataSource { async getBook(id) { return this.get(`books/${id}`); } }`. Document both APIs in a unified developer portal: Redoc for REST, GraphQL Playground for GraphQL. Use `@rest` directive in GraphQL to map REST endpoints: `type Query { book(id: ID!): Book @rest(url: "/books/:id") }`.

### How do I document API rate limiting in OpenAPI?

Document rate limits using response headers and `x-` extensions. Add rate limit headers to responses: `responses:\n  '200':\n    headers:\n      X-RateLimit-Limit:\n        schema:\n          type: integer\n          description: Maximum requests per window\n      X-RateLimit-Remaining:\n        schema:\n          type: integer\n          description: Remaining requests in current window\n      X-RateLimit-Reset:\n        schema:\n          type: integer\n          description: Unix timestamp when the window resets`. Use custom extensions for plan-level limits: `x-rate-limit:\n  free: 100/hour\n  pro: 10000/hour\n  enterprise: 100000/hour`. Document throttling behavior in the description: `description: Rate limited to 100 requests per hour for free tier. Returns 429 with Retry-After header when exceeded.`. Include the 429 response: `'429':\n  description: Too many requests\n  headers:\n    Retry-After:\n      schema:\n        type: integer\n        description: Seconds to wait before retrying`. Use `x-codegen` extensions to generate rate limit handling in client SDKs.

### How do I handle polymorphic schemas in OpenAPI?

Use `oneOf`, `anyOf`, and `allOf` for polymorphic types. For discriminated unions: `components:\n  schemas:\n    Pet:\n      oneOf:\n        - $ref: '#/components/schemas/Dog'\n        - $ref: '#/components/schemas/Cat'\n      discriminator:\n        propertyName: type\n        mapping:\n          dog: '#/components/schemas/Dog'\n          cat: '#/components/schemas/Cat'`. Define subtypes with the discriminator field: `Dog:\n  type: object\n  properties:\n    type:\n      type: string\n      enum: [dog]\n    breed:\n      type: string\n  required: [type, breed]`. For mixed types, use `anyOf`: `PropertyValue:\n  anyOf:\n    - type: string\n    - type: number\n    - type: boolean\n    - type: array\n      items: $ref: '#/components/schemas/PropertyValue'`. For composition without discrimination, use `allOf` to inherit properties: `Animal:\n  allOf:\n    - $ref: '#/components/schemas/BaseEntity'\n    - type: object\n      properties:\n        species:\n          type: string`.

### How do I document server-sent events in OpenAPI?

Server-sent events (SSE) use `text/event-stream` content type. Document the response: `responses:\n  '200':\n    description: Server-sent events stream\n    content:\n      text/event-stream:\n        schema:\n          type: object\n          properties:\n            event:\n              type: string\n            data:\n              type: string\n            id:\n              type: string\n            retry:\n              type: integer`. Document the event payload schema in the `data` field: `data:\n  type: string\n  description: JSON-encoded event payload\n  example: '{"type": "book.created", "book": {"id": 1}}'`. Include connection headers: `headers:\n  Cache-Control:\n    schema:\n      type: string\n      default: no-cache\n  Connection:\n    schema:\n      type: string\n      default: keep-alive`. Document reconnection behavior: `description: Client should reconnect on connection close. Last-Event-ID header can be sent to resume from a specific event.`

### How do I generate mock servers from OpenAPI specs?

Use Prism or OpenAPI Generator to create mock servers for testing. With Prism: `npx @stoplight/prism-cli mock openapi.yaml --port 4010`. Prism generates responses based on examples in the spec. Add examples to your schema: `Book:\n  type: object\n  properties:\n    id:\n      type: integer\n      example: 42\n    title:\n      type: string\n      example: Clean Code`. With OpenAPI Generator: `openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server`. Configure dynamic mocking with Prism: `npx @stoplight/prism-cli mock openapi.yaml --dynamic --port 4010` generates random data matching the schema. Use mock servers in integration tests: `const response = await fetch('http://localhost:4010/books/42'); expect(response.status).toBe(200)`. Document mock server usage in the spec with `x-mock` extensions for custom mock values.

### How do I document API deprecation and sunset headers?

Use the `deprecated: true` flag on operations and the `Sunset` header for removal dates. Mark deprecated endpoints: `paths:\n  /v1/books:\n    get:\n      deprecated: true\n      description: Deprecated in favor of /v2/books. Will be removed on 2025-12-31.`. Include the `Deprecation` header: `responses:\n  '200':\n    headers:\n      Deprecation:\n        schema:\n          type: string\n          example: true\n      Sunset:\n        schema:\n          type: string\n          example: Wed, 31 Dec 2025 23:59:59 GMT\n          description: Date when the endpoint will be removed`. Document migration paths in the description: `description: Migrate to /v2/books which supports cursor-based pagination and additional filters.`. Track deprecation usage with analytics: log requests to deprecated endpoints and notify consumers via email or webhook. Use `Link` header to point to the replacement: `Link: </v2/books>; rel="successor-version"`.

### How do I use OpenAPI extensions for custom metadata?

OpenAPI allows custom extensions with the `x-` prefix. Add vendor-specific metadata: `paths:\n  /books:\n    get:\n      x-codegen-request-body-name: bookRequest\n      x-aws-api-gateway-integration:\n        type: aws_proxy\n        uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123:function:books/invocations\n        httpMethod: POST`. Document internal metadata: `x-internal: true\nx-owner: data-team\nx-sla:\n  response_time_p99: 200ms\n  availability: 99.9`. Use extensions for documentation portals: `x-display-name: Books API\nx-sidebar-order: 1\nx-badge: Beta`. For code generation hints: `x-enum-descriptions:\n  - Active user\n  - Inactive user\n  - Suspended user`. Validate extensions in CI with custom Spectral rules: `rules:\n  x-internal-must-have-owner:\n    given: $.paths.*[?(@.x-internal == true)]\n    then:\n      field: x-owner\n      function: truthy`.

### How do I document API testing and contract testing in OpenAPI?

Use the spec to drive automated tests. With Schemathesis: `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. It generates and sends requests based on the spec and validates responses against the schema. With Dredd: `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. Write test hooks: `hooks.before('/books > GET', (transaction) => { transaction.expected.headers['Content-Type'] = 'application/json' })`. With Postman: import the spec and generate test collections: `newman run collection.json --env-var base_url=http://localhost:8000`. For contract testing with Pact: generate pacts from the spec: `pact-broker publish pacts/ --consumer-app-version 1.0.0`. Use `openapi-generator-cli` to generate test clients: `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client --library pytest`. Document test coverage: `x-test-coverage:\n  /books: 95%\n  /books/{id}: 88%`.

### How do I handle circular references in OpenAPI schemas?

Circular references occur when a schema references itself. Define them with `$ref` pointing to the component: `components:\n  schemas:\n    Category:\n      type: object\n      properties:\n        name:\n          type: string\n        subcategories:\n          type: array\n          items:\n            $ref: '#/components/schemas/Category'`. Most OpenAPI tools handle circular refs correctly. In code generation, circular refs produce recursive types: `class Category:\n    name: str\n    subcategories: List[Category]`. For deeply nested structures, limit recursion depth: `x-max-depth: 5`. In JSON serialization, handle circular refs with `default=str` or custom encoders. For Swagger UI rendering, circular refs may cause infinite expansion — use `x-stoplight:readonly` to prevent editing. When validating, use `jsonschema` with `RefResolver` that handles circular refs: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.

### How do I document API observability and tracing in OpenAPI?

Document tracing headers and metrics using extensions and standard headers. Add correlation ID headers: `parameters:\n  - name: X-Correlation-ID\n    in: header\n    schema:\n      type: string\n      format: uuid\n    description: Unique identifier for tracing requests across services`. Document OpenTelemetry headers: `x-opentelemetry:\n  enabled: true\n  service_name: book-api\n  trace_parent_header: traceparent`. Include metrics endpoints in the spec: `paths:\n  /metrics:\n    get:\n      summary: Prometheus metrics\n      responses:\n        '200':\n          content:\n            text/plain:\n              schema:\n                type: string`. Document health checks: `paths:\n  /health:\n    get:\n      summary: Health check\n      responses:\n        '200':\n          description: Service healthy\n        '503':\n          description: Service unavailable`. Use `x-observability` extension for tracing config: `x-observability:\n  tracing:\n    type: opentelemetry\n    sampling_rate: 0.1\n  metrics:\n    type: prometheus\n    endpoint: /metrics`.

### How do I handle content negotiation in OpenAPI?

Document multiple response formats using `content` with multiple media types. Support JSON and XML: `responses:\n  '200':\n    content:\n      application/json:\n        schema:\n          $ref: '#/components/schemas/Book'\n      application/xml:\n        schema:\n          $ref: '#/components/schemas/Book'\n      text/csv:\n        schema:\n          type: string\n          description: CSV export of book data`. Document the `Accept` request header: `parameters:\n  - name: Accept\n    in: header\n    schema:\n      type: string\n      default: application/json\n      enum: [application/json, application/xml, text/csv]`. For versioned content types: `content:\n  application/vnd.api+json;version=1:\n    schema: $ref: '#/components/schemas/BookV1'\n  application/vnd.api+json;version=2:\n    schema: $ref: '#/components/schemas/BookV2'`. Document content negotiation behavior: `description: Returns JSON by default. Send Accept: application/xml for XML response. Send Accept: text/csv for CSV export.`

### How do I document API caching headers in OpenAPI?

Document caching behavior using standard HTTP headers in responses. Add `Cache-Control`, `ETag`, and `Last-Modified` headers: `responses:\n  '200':\n    headers:\n      Cache-Control:\n        schema:\n          type: string\n          default: public, max-age=3600\n          description: Cache response for 1 hour\n      ETag:\n        schema:\n          type: string\n          description: Entity tag for conditional requests\n      Last-Modified:\n        schema:\n          type: string\n          format: date-time\n          description: Last modification timestamp`. Document conditional request headers: `parameters:\n  - name: If-None-Match\n    in: header\n    schema:\n      type: string\n    description: Returns 304 if ETag matches\n  - name: If-Modified-Since\n    in: header\n    schema:\n      type: string\n      format: date-time`. Include the 304 response: `'304':\n  description: Not modified\n  headers:\n    ETag:\n      schema:\n        type: string`. Use `x-cache` extension for CDN config: `x-cache:\n  strategy: cache-on-edge\n  ttl: 3600\n  vary_by: [Accept-Language, Authorization]`.

### How do I use OpenAPI with API gateways?

Configure API gateways using OpenAPI specs. For AWS API Gateway: import the spec: `aws apigateway put-rest-api --rest-api-id abc123 --body file://openapi.yaml --mode overwrite`. Add Lambda integration via extensions: `x-amazon-apigateway-integration:\n  type: aws_proxy\n  httpMethod: POST\n  uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123:function:books/invocations`. For Kong: use `kong openapi2kong openapi.yaml --output kong.yaml`. For NGINX: use `openapi2nginx openapi.yaml --output nginx.conf`. For Apigee: import the spec as an API proxy: `apigeecli apis import -f openapi.yaml -n book-api`. Document gateway-specific features: rate limiting, request transformation, API keys, and CORS. Use the spec to generate gateway configs automatically in CI: `aws apigateway put-rest-api ... && aws apigateway create-deployment ...`.

### How do I document long-running operations in OpenAPI?

For async operations, use the 202 Accepted response with a Location header for polling. Document the pattern: `paths:\n  /imports:\n    post:\n      responses:\n        '202':\n          description: Import accepted\n          headers:\n            Location:\n              schema:\n                type: string\n                format: uri\n                example: /imports/123`. Document the status endpoint: `paths:\n  /imports/{id}:\n    get:\n      responses:\n        '200':\n          content:\n            application/json:\n              schema:\n                type: object\n                properties:\n                  status:\n                    type: string\n                    enum: [pending, processing, completed, failed]\n                  progress:\n                    type: integer\n                    minimum: 0\n                    maximum: 100\n                  result_url:\n                    type: string\n                    format: uri`. For webhook callbacks: `callbacks:\n  onComplete:\n    '{$request.body.callbackUrl}':\n      post:\n        requestBody:\n          content:\n            application/json:\n            schema:\n              $ref: '#/components/schemas/ImportResult'`. Document timeout behavior and retry policies.

### How do I document API security best practices in OpenAPI?

Document security at multiple levels: transport, authentication, and authorization. For TLS: `servers:\\n  - url: https://api.example.com\\n    description: Production (TLS required)`. Document CORS: `x-cors:\\n  allowed_origins: [https://app.example.com]\\n  allowed_methods: [GET, POST, PUT, DELETE]\\n  allowed_headers: [Content-Type, Authorization]\\n  max_age: 3600`. For input validation: `parameters:\\n  - name: email\\n    in: query\\n    schema:\\n      type: string\\n      format: email\\n      maxLength: 255\\n    required: true`. Document SQL injection prevention: `description: All query parameters are parameterized. No string concatenation used in SQL queries.`. For rate limiting per user: `x-rate-limit-per-user: 1000/hour`. Document API key rotation: `x-api-key-rotation: 90 days`. Include security contact: `info:\\n  contact:\\n    email: security@example.com\\n  x-security-report-url: https://example.com/security`. Document OWASP compliance: `x-owasp-compliance: [API1-BOLA, API2-BA, API3-EDP]`.

### How do I handle OpenAPI spec splitting for large APIs?

Split large specs using `$ref` to external files. Main file references components: `components:\\n  schemas:\\n    Book:\\n      $ref: './schemas/Book.yaml'\\n    Author:\\n      $ref: './schemas/Author.yaml'\\n  responses:\\n    NotFound:\\n      $ref: './responses/NotFound.yaml'`. Split paths: `paths:\\n  /books:\\n    $ref: './paths/books.yaml'\\n  /books/{id}:\\n    $ref: './paths/book-by-id.yaml'`. Use `redocly bundle` to merge: `redocly bundle openapi.yaml --output bundled.json`. Validate split specs: `redocly lint openapi.yaml` resolves all external refs. Organize by domain for microservices: `schemas/`, `paths/`, `responses/`, `parameters/`, `examples/`. Use a shared components library: `components:\\n  schemas:\\n    Error:\\n      $ref: '../shared/schemas/Error.yaml'`. In CI, bundle before publishing: `redocly bundle openapi.yaml --output dist/openapi.json && redocly lint dist/openapi.json`.

### How do I document API metrics and monitoring in OpenAPI?

Document monitoring endpoints and metrics metadata. Include Prometheus metrics endpoint: `paths:\\n  /metrics:\\n    get:\\n      summary: Prometheus metrics\\n      responses:\\n        '200':\\n          content:\\n            text/plain:\\n              schema:\\n                type: string\\n                description: Prometheus format metrics`. Document custom metrics: `x-metrics:\\n  - name: http_requests_total\\n    type: counter\\n    labels: [method, path, status]\\n  - name: http_request_duration_seconds\\n    type: histogram\\n    labels: [method, path]\\n    buckets: [0.01, 0.05, 0.1, 0.5, 1.0]`. Include health check endpoints: `paths:\\n  /health:\\n    get:\\n      responses:\\n        '200':\\n          description: Healthy\\n        '503':\\n          description: Unhealthy\\n  /ready:\\n    get:\\n      responses:\\n        '200':\\n          description: Ready to accept traffic\\n        '503':\\n          description: Not ready`. Document SLA targets: `x-sla:\\n  availability: 99.9%\\n  response_time_p99: 200ms\\n  throughput: 10000 rps`.

### How do I document API idempotency in OpenAPI?

Document idempotency using the `Idempotency-Key` header and response patterns. For idempotent POST operations: `paths:\\n  /payments:\\n    post:\\n      parameters:\\n        - name: Idempotency-Key\\n          in: header\\n          required: true\\n          schema:\\n            type: string\\n            format: uuid\\n          description: Prevents duplicate payment processing\\n      responses:\\n        '201':\\n          description: Payment created\\n        '409':\\n          description: Duplicate idempotency key`. Document idempotent methods: `description: This endpoint is idempotent. Sending the same request with the same Idempotency-Key returns the original response.`. For natural idempotency: `PUT /books/{id}` is naturally idempotent — document this: `description: PUT is idempotent. Multiple calls with the same body produce the same result.`. Use `x-idempotent: true` extension for code generators. Store idempotency keys: `x-idempotency-key-ttl: 24h`. Document key expiration: `description: Idempotency keys are stored for 24 hours. After expiration, the same key can be reused.`.

### How do I document API pagination with HATEOAS links?

HATEOAS (Hypermedia as the Engine of Application State) embeds navigation links in responses. Define a links schema: `components:\\n  schemas:\\n    BookCollection:\\n      type: object\\n      properties:\\n        data:\\n          type: array\\n          items: $ref: '#/components/schemas/Book'\\n        _links:\\n          type: object\\n          properties:\\n            self:\\n              $ref: '#/components/schemas/Link'\\n            next:\\n              $ref: '#/components/schemas/Link'\\n            prev:\\n              $ref: '#/components/schemas/Link'\\n    Link:\\n      type: object\\n      properties:\\n        href:\\n          type: string\\n          format: uri\\n        rel:\\n          type: string\\n        method:\\n          type: string\\n          enum: [GET, POST, PUT, DELETE]`. Document example response: `example:\\n  data: [{id: 1, title: Clean Code}]\\n  _links:\\n    self: {href: /books?page=1, rel: self, method: GET}\\n    next: {href: /books?page=2, rel: next, method: GET}`. Use OpenAPI links for static linking: `responses:\\n  '201':\\n    links:\\n      GetBook:\\n        operationId: getBook\\n        parameters:\\n          book_id: '$response.body#/id'`.

### How do I document API request validation in OpenAPI?

Document validation rules using JSON Schema constraints in the spec. For string validation: `schema:\n  type: string\n  minLength: 3\n  maxLength: 100\n  pattern: '^[a-zA-Z0-9_-]+$'`. For numeric ranges: `schema:\n  type: number\n  minimum: 0\n  maximum: 1000\n  exclusiveMinimum: true`. For enum values: `schema:\n  type: string\n  enum: [active, inactive, suspended]`. For array validation: `schema:\n  type: array\n  minItems: 1\n  maxItems: 100\n  uniqueItems: true\n  items:\n    type: string`. For object validation: `schema:\n  type: object\n  required: [name, email]\n  properties:\n    name:\n      type: string\n      minLength: 1\n    email:\n      type: string\n      format: email`. Document validation error responses: `'400':\n  description: Validation error\n  content:\n    application/problem+json:\n      schema:\n        type: object\n        properties:\n          errors:\n            type: array\n            items:\n              type: object\n              properties:\n                field: {type: string}\n                message: {type: string}\n                code: {type: string}`. Use `x-validate` extension for custom validators: `x-validate:\n  - rule: no-sql-injection\n  - rule: max-nested-depth\n    params: {max: 5}`.

### How do I document API response envelopes in OpenAPI?

Document standard response envelopes for consistent API design. Define an envelope schema: `components:\n  schemas:\n    ApiResponse:\n      type: object\n      properties:\n        data:\n          oneOf:\n            - type: object\n            - type: array\n        meta:\n          type: object\n          properties:\n            request_id:\n              type: string\n            timestamp:\n              type: string\n              format: date-time\n            version:\n              type: string\n        errors:\n          type: array\n          items:\n            $ref: '#/components/schemas/Error'`. Use the envelope in responses: `responses:\n  '200':\n    content:\n      application/json:\n        schema:\n          allOf:\n            - $ref: '#/components/schemas/ApiResponse'\n            - properties:\n                data:\n                  $ref: '#/components/schemas/Book'`. Document error envelope: `'400':\n  content:\n    application/json:\n      schema:\n        type: object\n        properties:\n          errors:\n            type: array\n            items:\n              type: object\n              properties:\n                code: {type: string}\n                detail: {type: string}\n                source: {type: string}`. For JSON:API compliance, use `data`, `included`, `meta`, and `errors` top-level keys.

### How do I handle OpenAPI 3.0 vs 3.1 differences?

OpenAPI 3.1 aligns with JSON Schema 2020-12 and introduces several changes. In 3.1, `nullable: true` is replaced by `type: [string, null]`. The `exclusiveMinimum` and `exclusiveMaximum` are now numbers, not booleans: `minimum: 0\nexclusiveMinimum: true` becomes `exclusiveMinimum: 0`. Webhooks are supported natively: `webhooks:\n  event:\n    post: ...`. The `format: binary` is replaced by `contentEncoding: binary`. License identifiers use SPDX: `info:\n  license:\n    name: MIT\n    identifier: MIT`. Summary is optional in `$ref`. Paths can be empty objects for webhooks-only APIs. Use `redocly lint` to check version-specific rules. Convert between versions: `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. Most tools now support 3.1, but verify compatibility with your toolchain before migrating.

### How do I document API documentation portals and developer experience?

Create a developer portal using Redoc, Stoplight, or Backstage. With Redoc: `npx @redocly/cli build-docs openapi.yaml -o ./docs` generates a static HTML site. Configure branding: `redocly.yaml:\\ntheme:\\n  colors:\\n    primary: '#2563eb'\\n  logo:\\n    url: ./logo.svg\\n  typography:\\n    fontSize: 14px\\n    fontFamily: 'Inter, sans-serif'`. Add try-it-out functionality with Swagger UI: `swagger-ui-express` for Express, or `swagger-ui` standalone. Include interactive code samples: `x-code-samples:\\n  - lang: curl\\n    source: curl -X GET https://api.example.com/books\\n  - lang: Python\\n    source: import requests; requests.get('https://api.example.com/books')\\n  - lang: JavaScript\\n    source: fetch('https://api.example.com/books')`. Add changelog: `x-changelog:\\n  - version: 2.0.0\\n    date: 2025-01-15\\n    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]`. Include onboarding guides: `x-onboarding:\\n  steps: [Create API key, Make first request, Handle errors, Implement pagination]`.

### How do I handle OpenAPI spec generation for legacy APIs?

Retrofit OpenAPI specs for legacy APIs using reverse engineering tools. Use `akto` for traffic-based spec generation: `akto run --proxy http://localhost:8080 --output openapi.yaml` captures API traffic and generates a spec. Use `swagger-express` for Express apps: add middleware that auto-generates specs from routes. For Java legacy apps, use `swagger-core` annotations: `@Api(value = \"books\", description = \"Book endpoints\")` on controllers. For Python Flask, use `flask-restx` with `@ns.doc(responses={200: 'Success'})`. For undocumented SOAP APIs, convert WSDL to OpenAPI: `npx @redocly/cli convert wsdl.xml --to openapi`. Gradually annotate endpoints: start with paths and methods, then add parameters, then response schemas. Use `redocly lint` to track spec completeness: `redocly lint --format=json openapi.yaml | jq '[.problems[] | .ruleId] | group_by(.) | map({rule: .[0], count: length})'`. Prioritize documenting the most-used endpoints first based on traffic analysis.

### How do I document API throttling and quota management in OpenAPI?

Document throttling policies using extensions and response headers. Define quota limits per tier: `x-quota:\\n  free:\\n    requests_per_day: 1000\\n    burst: 10\\n  pro:\\n    requests_per_day: 100000\\n    burst: 100\\n  enterprise:\\n    requests_per_day: 10000000\\n    burst: 1000`. Document quota headers: `responses:\\n  '200':\\n    headers:\\n      X-Quota-Limit:\\n        schema: {type: integer}\\n        description: Total requests allowed per day\\n      X-Quota-Remaining:\\n        schema: {type: integer}\\n        description: Remaining requests today\\n      X-Quota-Reset:\\n        schema: {type: string, format: date-time}\\n        description: When quota resets`. Include the 429 response with quota details: `'429':\\n  description: Quota exceeded\\n  content:\\n    application/problem+json:\\n      schema:\\n        type: object\\n        properties:\\n          type: {type: string}\\n          title: {type: string}\\n          detail: {type: string}\\n          quota_limit: {type: integer}\\n          quota_used: {type: integer}\\n          reset_at: {type: string, format: date-time}`. Document throttling algorithms: token bucket, sliding window, or fixed window. Use `x-throttling` extension: `x-throttling:\\n  algorithm: token-bucket\\n  capacity: 100\\n  refill_rate: 10/s`. Document bypass rules: `x-throttle-bypass:\n  - header: X-Internal-Request\n  - ip_range: 10.0.0.0/8`.

### How do I document API key management in OpenAPI?

Document API key authentication, rotation, and scoping. Define API key security: `components:\n  securitySchemes:\n    ApiKeyAuth:\n      type: apiKey\n      in: header\n      name: X-API-Key\n      description: API key required for all requests`. Document key scopes: `x-api-key-scopes:\n  - read:books\n  - write:books\n  - read:authors\n  - admin`. Include key management endpoints: `paths:\n  /api-keys:\n    post:\n      summary: Create API key\n      security:\n        - BearerAuth: []\n      requestBody:\n        content:\n          application/json:\n            schema:\n              type: object\n              properties:\n                name: {type: string}\n                scopes: {type: array, items: {type: string}}\n                expires_at: {type: string, format: date-time}\n    get:\n      summary: List API keys\n      responses:\n        '200':\n          content:\n            application/json:\n              schema:\n                type: array\n                items:\n                  type: object\n                  properties:\n                    id: {type: string}\n                    name: {type: string}\n                    scopes: {type: array, items: {type: string}}\n                    created_at: {type: string, format: date-time}\n                    last_used: {type: string, format: date-time}\n  /api-keys/{id}:\n    delete:\n      summary: Revoke API key\n      responses:\n        '204': {description: Key revoked}`. Document key rotation policy: `x-api-key-rotation: 90 days`. Document key prefix for identification: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.

### How do I document API event streaming with Kafka in OpenAPI?

Document Kafka-based async APIs using OpenAPI extensions. Define async topics: `x-kafka:\\n  topics:\\n    - name: book.events\\n      partitions: 6\\n      replication: 3\\n      key_format: uuid\\n      value_format: avro\\n      schema_registry: http://schema-registry:8081`. Document producer endpoints: `paths:\\n  /events/publish:\\n    post:\\n      summary: Publish event to Kafka\\n      requestBody:\\n        content:\\n          application/json:\\n            schema:\\n              type: object\\n              properties:\\n                topic: {type: string}\\n                key: {type: string}\\n                value: {type: object}`. Document consumer group offsets: `x-kafka-consumer-groups:\\n  - name: book-indexer\\n    offset_reset: earliest\\n  - name: book-analytics\\n    offset_reset: latest`. Use `x-asyncapi` extension to link to an AsyncAPI spec for full async documentation: `x-asyncapi-spec: ./asyncapi.yaml`.

## See Also

- [API Versioning](/recipes/api/api-versioning) — strategies for versioning REST APIs
- [Call REST API](/recipes/api/call-rest-api) — consuming REST APIs from client code
- [GraphQL API](/recipes/api/graphql-api) — alternative API paradigm
- [Handle CORS](/recipes/api/handle-cors) — cross-origin resource sharing configuration
- [Handle Errors](/recipes/api/handle-errors) — structured error handling patterns

---

*Last updated: 2026-07-09*
