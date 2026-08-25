---
contentType: recipes
slug: api-documentation-openapi
title: "OpenAPI Docs with Swagger UI and Redoc: A Practical Guide"
description: A practical guide to documenting REST APIs with OpenAPI. Generate interactive Swagger UI and Redoc docs in Python, JavaScript and Java with CI linting.
metaDescription: Practical guide to REST API docs with OpenAPI. Generate interactive Swagger UI and Redoc docs in Python, JavaScript and Java, plus CI linting.
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
  metaDescription: Practical guide to REST API docs with OpenAPI. Generate interactive Swagger UI and Redoc docs in Python, JavaScript and Java, plus CI linting.
  keywords:
    - openapi docs
    - swagger documentation
    - redoc
    - api documentation example
---
## Overview

Most API docs rot in READMEs, Confluence pages or Slack threads. The moment you ship a change, those pages are already out of date. OpenAPI, the spec that grew out of Swagger, lets you describe your endpoints, schemas and errors in a single YAML or JSON file. That same file can drive interactive docs, client SDKs and test scaffolding.

This guide shows examples in Python with FastAPI, JavaScript with Express and Java with SpringDoc, and it walks through the trade-offs of each. It also compares Swagger UI and Redoc, and explains how to keep the spec from rotting once it's in production. Related recipes: [Implement API Logging and Audit Trails](/recipes/api-logging-audit/), [Implement API Rate Limiting with Redis](/recipes/api-rate-limiting-redis/), [Cursor-Based Pagination with PostgreSQL](/recipes/cursor-pagination-postgresql/), and [Build Real-Time Notifications with WebSockets](/recipes/real-time-notifications/). See also [Server-Sent Events with Node.js and Express](/recipes/server-sent-events-node/).

## When to Use

Use this recipe when the docs need to stay in sync with the code, when you want client SDKs in several languages, when the team is building contract-first, or when you want to validate incoming requests against a formal schema.

Skip it if the API is only for internal use and you're the only consumer; a short README probably covers it. Once a second team depends on it, a written contract starts paying off.

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

With code-first, a single team builds the API and lets FastAPI, SpringDoc or tsoa generate `openapi.json` from annotations or decorators. The spec stays close to the code, but it can leak internal models if you don't use DTOs.

I tend to choose design-first when the frontend, backend and mobile teams all need to agree on a contract before anyone writes code. We then write the YAML or JSON by hand, publish it to SwaggerHub or Stoplight, and generate server stubs and clients from that contract. It forces explicit decisions about fields, errors and versioning. The downside is that, without tests, the spec can become a wishlist while the code does something else.

Once the spec exists, it can drive interactive docs, a clean doc site and client generators. **Swagger UI** lets developers call endpoints from the browser, **Redoc** renders a three-pane doc site, and tools like `openapi-generator-cli` produce typed clients in TypeScript, Python, Java and other languages.

## Variants

| Tool | Language | Approach | Output |
| --- | --- | --- | --- |
| FastAPI | Python | Code-first | Auto-generated /openapi.json + /docs |
| Flask-RESTX | Python | Code-first | Built-in Swagger UI |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Serve pre-written YAML |
| tsoa | TypeScript | Code-first | Generate spec from decorators |

## What Works

- **Pin the spec version to the API version** in the `info.version` field, and document deprecations with `deprecated: true` plus a replacement path.
- **Add examples** to request and response schemas; they're the fastest way to stop integration questions before they start.
- **Group operations with tags** such as `users`, `orders`, or `products` so Swagger UI and Redoc render collapsible sections.
- **Document real error responses**, not just a successful 200. Include `400`, `401`, `404`, `409` and `5xx` with problem-detail bodies.
- **Validate the spec in CI** with `npx @redocly/cli lint` or `spectral`; a broken `$ref` or missing `operationId` will silently break client generators.

## Common Mistakes

Code-first tooling is great, but it only helps if you expose DTOs, not database entities, in the spec. Otherwise the spec drifts from the code in subtle ways.

Every operation that requires auth needs a security entry and a matching securitySchemes component. Forgetting either is a fast way to ship an undocumented auth wall.

Internal models should stay out of `components/schemas`. Use dedicated request and response DTOs instead.

Nullable fields also catch people out: OpenAPI 3.0 uses `nullable: true`, while 3.1 uses `type: [string, null]`. Once you've picked one, lint against it.

Finally, avoid hardcoding server URLs; put variables in the `servers` array using `{serverUrl}` so staging and production can share the same spec.


## Troubleshooting

If Redoc or Swagger UI shows a blank page, the spec is probably malformed. Run Redocly's linter to find the exact line and rule.

If generated clients don't compile, look for duplicate `operationId` values, reserved words in schema names and `enum` values that aren't valid identifiers in the target language.

If the spec doesn't match deployed behavior, add contract tests with Schemathesis or Pact in CI so spec drift breaks the build before it reaches users.

If examples in Swagger UI look wrong, make sure the `example` field sits next to the right `schema` level, and that array examples use `items.example` instead.

**Large specs slow down the docs page**: split it with `$ref` pointers and bundle it with `redocly bundle` before rendering.




## Further Reading

- The [OpenAPI Specification (latest)](https://spec.openapis.org/oas/latest.html) is the official reference for field names, types and version differences.
- The [Redocly CLI documentation](https://redocly.com/docs/cli) covers linting, bundling and publishing OpenAPI specs.
- The [FastAPI docs on OpenAPI](https://fastapi.tiangolo.com/reference/openapi/) explain how FastAPI generates `/openapi.json` and `/docs`.
- For Spring Boot, [Springdoc OpenAPI](https://springdoc.org/) covers the annotations and common customizations.

## Production Notes

- **Version the spec in source control** and tag releases with the same version as the API (`info.version` should match the deployed API version).
- **Serve docs from a separate build artifact** or a CDN path, so updating the spec doesn't require a full application deploy.
- **Lint the spec in CI** before publishing; a broken `$ref` or missing `operationId` will break client generators and Redoc rendering.
- **Monitor doc endpoints** (`/docs`, `/redoc`, `/openapi.json`) for 4xx/5xx and p99 latency, especially after spec updates.

## Key Takeaways

- OpenAPI turns a single spec file into interactive docs, client SDKs and contract tests, so your documentation stays in sync with your code.
- Swagger UI is best when developers need to call endpoints from the browser; Redoc is better for a clean, documentation-first reading experience.
- FastAPI, Express and SpringDoc can generate the spec automatically from code, but teams with several consumers should consider design-first with a shared registry.
- Validate the spec in CI with `redocly lint` or `spectral` to catch broken references, missing `operationId`s and version drift before they reach production.

## FAQ

### Should I use code-first or design-first?

If the API is internal and only your team consumes it, start code-first. FastAPI, SpringDoc and tsoa can derive the spec from your annotations, so the contract stays close to the code:

```python
@app.get("/books/{book_id}")
def get_book(book_id: int):
    ...
```

If frontend, mobile, backend or external partners need to agree on the contract first, write the OpenAPI YAML and publish it to SwaggerHub or Stoplight before generating stubs:

```bash
openapi-generator-cli generate -i openapi.yaml -g python-fastapi
```

Design-first risks drift: the spec turns into a wishlist while the code does something else. Stop that with contract tests (Schemathesis, Pact) in CI. Code-first risks leaking internal models; stop that by returning DTOs, not database entities.

### How do I keep documentation in sync with deployed code?

Generate the spec in CI from your code, publish it to a registry like SwaggerHub or Stoplight, and point the deployed docs at the latest version. In GitHub Actions:

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
Lint the spec on every PR with `npx @redocly/cli lint openapi.yaml` to catch schema violations, missing responses and broken references. Publish it as a build artifact, deploy docs alongside the API, and then verify the API against the spec by running the command below.

```bash
schemathesis run openapi.json --base-url http://localhost:8000
```

### Can I convert Swagger 2.0 to OpenAPI 3.0?

Yes. Use the `swagger2openapi` CLI or Swagger Editor's built-in converter. Most modern tooling handles 3.0 natively now. Run the conversion and expect a few mechanical changes:

```bash
npx swagger2openapi swagger.json -o openapi.json
```

The `host`, `basePath` and `schemes` fields collapse into a `servers` array; `definitions` and `responses` move to `components/schemas` and `components/responses`; and `securityDefinitions` becomes `components/securitySchemes`. The global `produces` and `consumes` fields go away; each operation now declares its own content negotiation. After that, lint the result with `npx @redocly/cli lint openapi.json`. For a couple of edge cases, the file type becomes format binary and collectionFormat becomes style and explode parameters, so you may need to adjust them manually.

### How do I document authentication and authorization in OpenAPI?

Authentication is described under `components/securitySchemes` and then applied to each operation. The first block shows a Bearer JWT scheme.

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

For API keys, use `type: apiKey` and tell clients which header to send.

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

OAuth2 needs the flow and scopes declared.

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

Once the schemes are defined, apply them at the operation level.

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

For JWT tokens in OpenAPI 3.1, stick with the HTTP bearer scheme. The `apiKey` type still works, but it doesn't fit bearer tokens, because it describes a custom API key rather than a bearer scheme.

### How do I handle versioning in OpenAPI specs?

Set the spec version in `info.version` and pick a versioning strategy that your clients can discover:

```yaml
info:
  title: Book API
  version: 2.1.0
```

Use semantic versioning: major for breaking changes, minor for new endpoints, patch for fixes. For URL-based versioning, put the version in the `servers` URL:

```yaml
servers:
  - url: https://api.example.com/v2
```

For header-based versioning, add an optional header parameter:

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
Maintain both spec versions during migration periods and use `Accept` header content negotiation, for example `Accept: application/vnd.api+json;version=2`.

### How do I generate client SDKs from OpenAPI specs?

You can generate typed clients in several languages with `openapi-generator-cli`. Install it first with `npm install @openapitools/openapi-generator-cli -g`, then run the generator command for each language.

```bash
# TypeScript
openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client-ts

# Python
openapi-generator-cli generate -i openapi.yaml -g python -o ./client-py
# add --library httpx if your generator supports it

# Java
openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java --library okhttp-gson
```

Keep generation options in a `.openapi-generator-config.json` file like this:

```json
{"packageName": "book_api_client", "projectName": "book-api-client", "hideGenerationTimestamp": true}
```

Then publish the generated clients to the right package registry: npm for TypeScript, PyPI for Python and Maven Central for Java. Finally, automate the generate, test and publish steps in CI on every spec change.

### How do I document pagination in OpenAPI?

OpenAPI doesn't enforce a pagination style. Pick `cursor` or `offset`/`limit` and wrap the result in an envelope schema. The example below shows an offset-based approach.

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

The response envelope can be declared with a wrapper schema.

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

For cursor-based pagination, declare an opaque cursor and a page size.

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

You can also include `Link` headers in responses, for example `Link: <https://api.example.com/books?cursor=abc>; rel=next`, and document rate limiting headers such as `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` in your responses.

### How do I handle file uploads and downloads in OpenAPI?

For file uploads in OpenAPI 3.0, use the format binary on a string property inside a multipart/form-data request body. If you need several files, switch the property to an array of binary strings.

In OpenAPI 3.1, `format: binary` becomes `contentEncoding: binary`. For downloads, the response should use the application/octet-stream content type, which means you should also declare a binary string schema for the response body. Images work the same way: declare the content type, such as image/png, and a binary schema.

To cap upload size, add `maxLength` to the binary field and note the limit in the description, for example 10485760 bytes for 10MB.

### How do I document webhooks in OpenAPI?

In OpenAPI 3.1, webhooks get a top-level `webhooks` field. Declare each event as a key with a `post` operation, then point the request body to a reusable schema such as `BookEvent` in your components.

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

Define the payload schema once in `components/schemas` and reuse it across webhooks. A registration endpoint lets clients subscribe; document the retry rules and the HTTP codes your delivery logic expects.

### How do I validate OpenAPI specs in CI?

Redocly and Spectral are the two linters I reach for. With Redocly, install the CLI globally (`npm install -g @redocly/cli`), then run `redocly lint openapi.yaml`. Add a small ruleset file to enforce your own conventions:

```yaml
rules:
  operation-operationId-unique:
    severity: error
  operation-summary:
    severity: warn
    max_length: 50
```

Spectral works the same way: `npm install -g @stoplight/spectral-cli`, then extend the built-in OAS ruleset and override the ones that matter to you.
In GitHub Actions:

```yaml
- name: Lint OpenAPI
  run: npx @redocly/cli lint openapi.yaml
```
Validate spec structure: check for missing `operationId`, undefined `$ref` targets, missing response schemas, and duplicate path parameters. Auto-fix common issues by running `redocly lint --format=json openapi.yaml | jq '.problems[] | select(.ruleId == "operation-summary")'` to filter specific rules.

### How do I document error responses with RFC 7807 Problem Details?

For RFC 7807 errors, use the `application/problem+json` media type and a reusable `Problem` schema:

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
For plan-level limits, use custom extensions:

```yaml
x-rate-limit:
  free: 100/hour
  pro: 10000/hour
  enterprise: 100000/hour
```
Describe the throttling behavior in the description, for example: `description: Rate limited to 100 requests per hour for free tier. Returns 429 with Retry-After header when exceeded.`. Remember to include the `429` response.

```yaml
'429':
  description: Too many requests
  headers:
    Retry-After:
      schema:
        type: integer
        description: Seconds to wait before retrying
```
You can also add `x-codegen` extensions so generated client SDKs know how to handle rate limits.

### How do I handle polymorphic schemas in OpenAPI?

Polymorphic types can be modeled with the `oneOf`, `anyOf` and `allOf` keywords. For discriminated unions, use `oneOf` with a discriminator:

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

Prism and OpenAPI Generator can both serve mock servers from a spec. With Prism, run `npx @stoplight/prism-cli mock openapi.yaml --port 4010` and it will generate responses from the examples in your schema:

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

For random data, add the `--dynamic` flag. OpenAPI Generator can also produce a static mock server from the same tool.

```bash
openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./mock-server
```

Then use it in integration tests by pointing clients at the local URL.

### How do I document API deprecation and sunset headers?

Mark operations with `deprecated: true` and use the `Sunset` header for the removal date:

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
Document migration paths in the description, for example:
`description: Migrate to /v2/books which supports cursor-based pagination and additional filters.`

To track deprecation usage, log requests to deprecated endpoints and notify consumers via email or webhook. Use the Link header to point to the replacement:
`Link: </v2/books>; rel="successor-version"`

### How do I use OpenAPI extensions for custom metadata?

Vendor-specific fields in OpenAPI start with `x-`. Use them for generator hints, internal ownership or portal metadata:

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

For internal metadata, add fields like `x-internal`, `x-owner` or `x-sla`. For documentation portals, use fields like `x-display-name`, `x-sidebar-order` or `x-badge` to customize the sidebar.
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

The spec itself is a good source of automated tests. Schemathesis can read it, fire off requests and check the responses against the schema by running `schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all`. Dredd can validate the spec against live hooks with `dredd openapi.yaml http://localhost:8000 --hookfiles=./hooks.js`. You can also import a Postman collection and run it with `newman run collection.json --env-var base_url=http://localhost:8000`, publish pacts straight from the spec for contract testing with `pact-broker publish pacts/ --consumer-app-version 1.0.0`, generate a quick test client with `openapi-generator-cli generate -i openapi.yaml -g python -o ./test-client`, or track coverage in an extension.

```yaml
x-test-coverage:
  /books: 95%
  /books/{id}: 88%
```

### How do I handle circular references in OpenAPI schemas?

A circular reference happens when a schema points back to itself. Just add a `$ref` to the component, as the example shows.

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
For deeply nested structures, limit recursion depth with `x-max-depth: 5`. In JSON serialization, handle circular refs with `default=str` or custom encoders. In Swagger UI, circular refs may cause infinite expansion, so use `x-stoplight:readonly` to prevent editing. For validation, use `jsonschema` with a `RefResolver` that handles circular refs, as shown here: `resolver = jsonschema.RefResolver.from_schema(schema); jsonschema.validate(instance, schema, resolver=resolver)`.

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

Document the different response formats in the `content` block for each media type, so clients can see which formats are available, such as JSON, XML or CSV:

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
To let clients request a specific format, document the `Accept` request header:

```yaml
parameters:
  - name: Accept
    in: header
    schema:
      type: string
      default: application/json
      enum: [application/json, application/xml, text/csv]
```
For versioned content types, add a media type entry for each version:

```yaml
content:
  application/vnd.api+json;version=1:
    schema:
      $ref: '#/components/schemas/BookV1'
  application/vnd.api+json;version=2:
    schema:
      $ref: '#/components/schemas/BookV2'
```
Describe content negotiation behavior in the operation description, for example:
`description: Returns JSON by default. Send Accept: application/xml for XML response. Send Accept: text/csv for CSV export.`

### How do I document API caching headers in OpenAPI?

Document caching behavior with standard HTTP headers in responses. Use `Cache-Control`, `ETag` and `Last-Modified` headers for that:

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
For conditional requests, document the matching request headers as well:

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
Include a 304 response too:

```yaml
'304':
  description: Not modified
  headers:
    ETag:
      schema:
        type: string
```
For CDN configuration, use the `x-cache` extension:

```yaml
x-cache:
  strategy: cache-on-edge
  ttl: 3600
  vary_by: [Accept-Language, Authorization]
```

### How do I document long-running operations in OpenAPI?

For async operations, go with a 202 Accepted response and a `Location` header that clients can poll, then document the pattern with a status endpoint:

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

Security belongs at every level: transport, authentication and authorization. Start with TLS in the server URL, then document CORS, input validation, rate limiting and key rotation:

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

Use the operation description for SQL-injection notes, add `x-rate-limit-per-user` and `x-api-key-rotation` for rate limiting and key rotation, and include a security contact in `info.contact`. You can track OWASP compliance with the `x-owasp-compliance` extension.

### How do I handle OpenAPI spec splitting for large APIs?

For large APIs, split the spec into external files and use `$ref` to pull them together. Keep schemas, paths, responses and examples in their own folders, and share a common `Error` schema from a library:

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

In CI, bundle with `redocly bundle openapi.yaml --output dist/openapi.json`, then lint the result. That resolves all external references and gives you a single artifact to publish.

### How do I document API metrics and monitoring in OpenAPI?

Document the metrics endpoint and any custom counters or histograms you expose. For Prometheus:

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

Custom metrics can live in an `x-metrics` extension:

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

Add a health endpoint so clients can detect outages:

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

For POST operations that must not run twice, require an `Idempotency-Key` header and return `409` when the same key is reused:

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

Explain the behavior in the operation description. `PUT` is naturally idempotent, so mention that too. Some teams add `x-idempotent: true` or `x-idempotency-key-ttl: 24h` extensions to help generators and middleware.

### How do I document API request validation in OpenAPI?

OpenAPI uses standard JSON Schema constraints, so you can validate at the spec level. For strings, set length and pattern limits:

```yaml
schema:
  type: string
  minLength: 3
  maxLength: 100
  pattern: '^[a-zA-Z0-9_-]+$'
```

Numbers accept ranges and exclusivity:

```yaml
schema:
  type: number
  minimum: 0
  maximum: 1000
  exclusiveMinimum: true
```

Enums, arrays and objects work the same way: list allowed values, bound the number of items, or mark fields as required:

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

Document the format of validation error responses so clients can map fields to messages:

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
For custom validators, use the `x-validate` extension:

```yaml
x-validate:
  - rule: no-sql-injection
  - rule: max-nested-depth
    params: {max: 5}
```

### How do I document API response envelopes in OpenAPI?

For a consistent API, document the standard response envelope. Start by defining the envelope schema:

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
Then use it in responses:

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
Do the same for the error envelope:

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
If you're following JSON:API, use the top-level keys `data`, `included`, `meta` and `errors` in your response structure.

### How do I handle OpenAPI 3.0 vs 3.1 differences?

OpenAPI 3.1 drops the old `nullable: true` flag and instead uses `type: [string, null]`. It also rewrites `exclusiveMinimum` and `exclusiveMaximum` as numbers rather than booleans:

```yaml
minimum: 0
exclusiveMinimum: true
```

With 3.1, that turns into `exclusiveMinimum: 0`. Binary uploads switch from `format: binary` to `contentEncoding: binary`, webhooks get a top-level `webhooks` field, and license identifiers use SPDX. `summary` inside `$ref` is optional, and `paths` can even be empty for webhooks-only APIs.

Before migrating, lint the spec with `redocly lint` and convert with `npx @redocly/cli@latest convert openapi.yaml --to 3.1`. Most tools support 3.1 now, but double-check your generator and parser first.

### How do I document API documentation portals and developer experience?

Create a developer portal using Redoc, Stoplight, or Backstage. With Redoc, the build-docs command generates a static HTML site:

```bash
npx @redocly/cli build-docs openapi.yaml -o ./docs
```

Configure branding with a `redocly.yaml` theme:

```yaml
theme:
  colors:
    primary: '#2563eb'
  logo:
    url: ./logo.svg
  typography:
    fontSize: 14px
    fontFamily: 'Inter, sans-serif'
```

Add try-it-out functionality with Swagger UI. In Express, use `swagger-ui-express`, or use the standalone `swagger-ui` package. Include interactive code samples:

```yaml
x-code-samples:
  - lang: curl
    source: curl -X GET https://api.example.com/books
  - lang: Python
    source: import requests; requests.get('https://api.example.com/books')
  - lang: JavaScript
    source: fetch('https://api.example.com/books')
```

Add a changelog and onboarding guides as extensions:

```yaml
x-changelog:
  - version: 2.0.0
    date: 2025-01-15
    changes: [Breaking: renamed /books to /v2/books, Added cursor pagination]
```

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
Document the key rotation policy with `x-api-key-rotation: 90 days`. Also document the key prefix for identification: `description: API keys start with 'sk_live_' for production and 'sk_test_' for sandbox.`.

## See Also

- [API Versioning](/recipes/api-versioning/): strategies for versioning REST APIs
- [Call REST API](/recipes/call-rest-api/): consuming REST APIs from client code
- [GraphQL API](/recipes/graphql-api/): alternative API approach
- [Handle CORS](/recipes/handle-cors/): cross-origin resource sharing configuration
- [Handle Errors](/recipes/handle-errors/): structured error handling patterns

## Common Production Pitfalls

- Letting the OpenAPI spec drift from the deployed API so that docs, clients, and tests stop matching reality.
- Exposing internal database schemas directly in `components/schemas` instead of stable DTOs.
- Skipping spec linting in CI and publishing invalid or broken `$ref` references.
- Using `apiKey` security for bearer JWT tokens instead of `http` with `scheme: bearer`.
- Forgetting to version the spec alongside the API, or removing deprecated paths too aggressively.
- Exposing generated `/docs` and `/redoc` endpoints on internal APIs without access control.
- Assuming a generated client will work without checking compatibility with your OpenAPI version and extensions.
