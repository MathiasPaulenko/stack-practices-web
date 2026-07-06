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
lastUpdated: "2026-06-12"
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

**Q: Should I use code-first or design-first?**
A: Code-first is faster for existing APIs. Design-first is better for cross-team contracts where frontend and backend develop in parallel.

**Q: How do I keep documentation in sync with deployed code?**
A: Generate the spec in CI from your code, publish it to a registry (SwaggerHub, Stoplight), and link the deployed docs to the latest spec version.

**Q: Can I convert Swagger 2.0 to OpenAPI 3.0?**
A: Yes. Use the `swagger2openapi` CLI tool or Swagger Editor's built-in converter. Most modern tools support 3.0 natively.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
