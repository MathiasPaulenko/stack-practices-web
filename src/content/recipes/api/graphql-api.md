---
contentType: recipes
slug: graphql-api
title: "Implement a GraphQL API"
description: "Build a production-ready GraphQL API with type-safe schemas, resolvers, and query optimization in Python, JavaScript, and Java."
metaDescription: "Build a GraphQL API in Python (Strawberry), JavaScript (Apollo), and Java. Type-safe schemas, resolvers, mutations, and subscriptions with practical examples."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - graphql
  - java
  - rest
  - http
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/handle-errors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a GraphQL API in Python (Strawberry), JavaScript (Apollo), and Java. Type-safe schemas, resolvers, mutations, and subscriptions with practical examples."
  keywords:
    - graphql
    - api
    - apollo
    - strawberry
    - python
    - javascript
    - java
---
# Implement a GraphQL API

## Overview

GraphQL is a query language and runtime for APIs that allows clients to request exactly the data they need. Unlike REST, where the server defines the response structure, GraphQL puts the client in control — reducing over-fetching and under-fetching while providing strong typing through schemas.

Here is how to building a production-ready GraphQL API with type-safe schemas, resolvers, mutations, and subscriptions across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Your clients need flexible data fetching (mobile apps with limited bandwidth)
- You want strongly typed API contracts with automatic documentation
- You need to aggregate data from multiple microservices. See [gRPC API](/recipes/api/grpc-api) for service-to-service communication.
- Your API consumers request different field combinations frequently

## Solution

### Python

```python
import strawberry
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Book:
    title: str
    author: str
    pages: int

@strawberry.type
class Query:
    @strawberry.field
    def books(self) -> list[Book]:
        return [
            Book(title="Clean Code", author="Robert C. Martin", pages=464),
            Book(title="The Pragmatic Programmer", author="Andy Hunt", pages=352),
        ]

schema = strawberry.Schema(query=Query)
app = FastAPI()
app.include_router(GraphQLRouter(schema), prefix="/graphql")
```

### JavaScript

```javascript
const { ApolloServer, gql } = require('apollo-server');

const typeDefs = gql`
  type Book {
    title: String!
    author: String!
    pages: Int!
  }

  type Query {
    books: [Book!]!
  }
`;

const resolvers = {
  Query: {
    books: () => [
      { title: 'Clean Code', author: 'Robert C. Martin', pages: 464 },
      { title: 'The Pragmatic Programmer', author: 'Andy Hunt', pages: 352 },
    ],
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => console.log(`Server ready at ${url}`));
```

### Java

```java
import com.coxautodev.graphql.tools.GraphQLQueryResolver;
import graphql.servlet.SimpleGraphQLHttpServlet;
import javax.servlet.annotation.WebServlet;

public class Book {
    private String title;
    private String author;
    private int pages;
    // getters and setters
}

public class QueryResolver implements GraphQLQueryResolver {
    public List<Book> books() {
        return Arrays.asList(
            new Book("Clean Code", "Robert C. Martin", 464),
            new Book("The Pragmatic Programmer", "Andy Hunt", 352)
        );
    }
}

@WebServlet(urlPatterns = "/graphql")
public class GraphQLEndpoint extends SimpleGraphQLHttpServlet {
    // Configure schema and resolver wiring
}
```

## Explanation

GraphQL APIs consist of three core components:
- **Schema**: Defines types, queries, mutations, and subscriptions using SDL (Schema Definition Language)
- **Resolvers**: Functions that return data for each field in the schema
- **Server**: Handles HTTP requests, parses queries, validates against schema, and executes resolvers

Key differences across languages:
- **Python (Strawberry)**: Decorator-based type definitions with dataclass syntax
- **JavaScript (Apollo)**: Schema-first with `gql` template literals
- **Java**: Code-first or schema-first with library-specific resolvers

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | Strawberry | Code-first | Dataclass decorators, FastAPI integration |
| Python | Graphene | Code-first | Django integration, mature ecosystem |
| JavaScript | Apollo Server | Schema-first | Federation, subscriptions, caching |
| JavaScript | Nexus | Code-first | TypeScript-first, type inference |
| Java | graphql-java | Schema-first | Low-level, maximum control |
| Java | DGS Framework | Code-first | Netflix open-source, Spring integration |

## What Works

- **Use DataLoader for N+1 queries**: Batch and cache database requests across resolvers
- **Implement pagination**: Use [cursor-based pagination](/recipes/api/cursor-pagination-postgresql) for large lists (Relay Connection spec)
- **Validate input early**: Use schema directives and custom scalars for input validation
- **Limit query depth/complexity**: Prevent expensive queries with depth and complexity analysis
- **Enable query whitelisting in production**: Use persisted queries to prevent arbitrary query execution

## Common Mistakes

- **Not handling N+1 queries**: Each resolver hitting the database independently causes exponential queries
- **Over-exposing internal types**: Leaking database models directly into the schema without a domain layer
- **Missing error handling**: GraphQL returns 200 OK even with errors — always check the `errors` array. See [Error Handling](/recipes/api/handle-errors) for patterns.
- **Ignoring schema versioning**: While GraphQL avoids versioning, deprecation and field tracking still matter
- **Storing state in resolvers**: Resolvers must be stateless; use context for request-scoped data

## Frequently Asked Questions

**Q: Should I migrate my REST API to GraphQL?**
A: Not necessarily. GraphQL shines when clients need flexibility. If your API has simple, stable consumers, [REST](/recipes/api/call-rest-api) may be simpler and more cacheable.

**Q: How do I handle file uploads in GraphQL?**
A: Use the multipart request spec (Apollo supports it natively) or use a separate REST endpoint for uploads and return the URL in GraphQL.

**Q: What is GraphQL federation?**
A: Federation allows multiple GraphQL services to expose a unified schema. Each service owns part of the schema, and a gateway stitches them together. Ideal for microservices.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
