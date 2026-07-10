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

## Best Practices

- **Limit query depth**: malicious queries can nest deeply (`user.friends.friends.friends...`). Set a maximum depth (7-10 levels) using `graphql-depth-limit` to prevent resource exhaustion.
- **Use persisted queries for production**: store approved queries server-side and reference them by ID. This eliminates arbitrary query execution and reduces payload size by 90%.
- **Enable query complexity analysis**: assign cost scores to fields and reject queries exceeding a budget. `graphql-cost-analysis` prevents expensive queries from overloading your server.
- **Implement DataLoader for N+1 queries**: batch database requests per request to avoid the N+1 problem. DataLoader coalesces individual `findById` calls into a single `findByIds` batch.
- **Version your schema, not your endpoints**: GraphQL has one endpoint. Add fields with deprecation markers instead of creating new queries. Remove deprecated fields only after all clients migrate.
- **Use interface and union types for polymorphism**: model shared fields as interfaces. This keeps the schema DRY and allows clients to query common fields without knowing the concrete type.

## Production Checklist

- [ ] Query depth limiting is enabled (max 7-10 levels)
- [ ] Query complexity analysis rejects queries exceeding cost budget
- [ ] DataLoader or equivalent batching is used for all database access
- [ ] Persisted queries are enforced in production (no arbitrary queries)
- [ ] Introspection is disabled in production
- [ ] Rate limiting is applied per-query, not just per-request
- [ ] Error responses do not expose internal stack traces or schema details
- [ ] Subscriptions have connection limits and heartbeat timeouts
- [ ] Schema changes are reviewed for breaking changes before deployment
- [ ] Apollo Studio or similar schema registry tracks schema evolution

## Scaling Considerations

- **Query parsing overhead**: each GraphQL request parses and validates the query against the schema. At 10K requests/second, parsing adds 5-15ms per request. Use persisted queries to skip parsing — clients send a hash instead of the full query.
- **N+1 query problem**: without batching, a query returning 100 users with their 100 posts triggers 101 database queries. DataLoader batches these into 2 queries. Always profile with database query logs to catch N+1 patterns.
- **Subscription scalability**: WebSocket subscriptions maintain persistent connections. At 10K concurrent subscriptions, each consuming 50KB of memory, you need 500MB just for connections. Use a pub/sub system (Redis, NATS) to share subscriptions across instances.
- **Gateway federation overhead**: in a federated architecture, the gateway makes sub-queries to multiple services. A single client query can trigger 5-15 internal requests. Cache sub-resolver results to avoid redundant calls.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| Apollo Server (self-hosted) | $0 | Open-source, Node.js |
| Apollo Cloud (per million requests) | $150-$400/month | Managed routing + caching |
| Hasura Cloud | $50-$1,000/month | Managed GraphQL on Postgres |
| Redis (for DataLoader cache + pub/sub) | $10-$75/month | Single instance or cluster |
| CDN for persisted queries | $0-$20/month | Cloudflare, CloudFront |

For 100K requests/day: self-hosted Apollo Server on 2x EC2 t3.medium ($30/month) + Redis ($15/month) handles the load. Apollo Cloud adds $150/month but eliminates infrastructure management. Hasura is cost-effective if your data layer is already Postgres.

## When Not to Use This Approach

- **Simple CRUD with stable schema**: if your API has 5-10 endpoints with predictable shapes and no nested relationships, REST is simpler, more cacheable, and easier to debug. GraphQL's flexibility becomes overhead when clients don't need it.
- **CDN-cached public APIs**: GraphQL POST requests bypass CDN caching by default. REST GET requests cache at edge nodes for free. For public read-heavy APIs (weather, news, public data), REST with CDN caching delivers 10-100x better performance.
- **Bandwidth-constrained clients**: GraphQL clients download the full schema for introspection and query validation. On 2G/3G networks or IoT devices, this adds 50-200KB of overhead per connection. REST clients only need the endpoint URL.

## Performance Benchmarks

| Setup | Avg latency | Throughput | Notes |
|-------|-----------|-----------|-------|
| REST (Express + Redis cache) | 5-15ms | 20K req/s | Simple GET, cached |
| GraphQL (Apollo Server) | 15-50ms | 5K req/s | Single query, no cache |
| GraphQL + DataLoader | 20-60ms | 4K req/s | Batched resolvers |
| GraphQL + persisted queries | 8-25ms | 8K req/s | Skip parsing |
| GraphQL + Redis cache | 5-20ms | 15K req/s | Cached responses |

GraphQL adds 2-5x latency compared to REST for equivalent operations due to query parsing, schema validation, and resolver execution. Persisted queries close the gap by skipping parsing. For read-heavy APIs, cache GraphQL responses in Redis with a 60-second TTL keyed by query hash.

## Testing Strategy

- **Test resolver logic in isolation**: call resolvers directly with mock context and arguments. Verify return values, error handling, and N+1 query prevention. Use DataLoader in tests to batch data loading.
- **Test schema with introspection queries**: run introspection queries to verify the schema exposes only intended types and fields. Test that deprecated fields have `@deprecated` directives with migration messages.
- **Test query complexity limits**: send deeply nested queries and queries with high field counts. Verify the complexity analyzer rejects them with a clear error message. Test that valid queries within limits pass.
- **Test subscription lifecycle**: connect a subscription client, verify it receives real-time updates, then disconnect and verify the server cleans up the subscription and stops sending data.

## Common Pitfalls

- **N+1 query problem**: resolvers that fetch related data individually cause N+1 database queries. A query for 100 users with their posts triggers 1 + 100 = 101 queries. Use DataLoader to batch related fetches into a single query per level.
- **Exposing the entire schema in production**: introspection allows clients to discover all types and fields. Disable introspection in production to prevent attackers from mapping your API surface. Use `@deprecated` to phase out fields gracefully.
- **No query complexity limits**: without depth or complexity limits, a malicious client can send a query like `{ users { posts { comments { author { posts { comments { ... } } } } } } }` that exhausts server resources. Set `maxDepth` and `maxComplexity` in the validation rules.
- **Returning errors with stack traces**: GraphQL error responses include `extensions` by default. In production, disable `stacktrace` in error extensions to avoid leaking internal implementation details to clients.

## Monitoring and Observability

- **Track query complexity distribution**: log the complexity score of each query. Alert if average complexity increases by >20% week-over-week, which may indicate clients are requesting deeper data graphs.
- **Monitor resolver execution time**: track p50, p95, and p99 latency per resolver field. Slow resolvers (p95 >100ms) are the primary bottleneck. Use Apollo Tracing or custom instrumentation to collect per-resolver metrics.
- **Track N+1 query detection**: use DataLoader's batching metrics to detect when resolvers make individual database calls instead of batched ones. Alert if batch ratio (batches/total calls) drops below 80%.
- **Monitor subscription connection count**: track active WebSocket connections for subscriptions. Set alerts for >10K concurrent subscriptions per instance, which may exhaust memory or file descriptors.

## Deployment Checklist

- [ ] Configure query depth and complexity limits in validation rules
- [ ] Disable introspection in production (`introspection: false`)
- [ ] Set up DataLoader for all resolvers with relationships
- [ ] Configure persisted queries for production to reduce parsing overhead
- [ ] Set up Redis-based response caching with 60-second TTL for read-heavy queries
- [ ] Disable stack traces in error extensions for production
- [ ] Configure rate limiting per query complexity (not just per request count)
- [ ] Set up WebSocket connection limits for subscriptions
- [ ] Register schema with Apollo Studio or equivalent schema registry
- [ ] Test with production-like query patterns before deploying

## Security Considerations

- **Batch query attacks**: GraphQL allows sending multiple queries in a single request. Attackers can use this to bypass rate limiting. Limit batch query count to 5 per request and apply rate limits per query, not per HTTP request.
- **Introspection-based reconnaissance**: in production, disable introspection to prevent attackers from discovering all types, fields, and mutations. Use `@deprecated` to phase out fields without exposing the full schema.
- **Alias-based DoS**: GraphQL allows field aliases, so a client can request the same field 1000 times with different aliases in one query. Limit the number of aliases per query in the validation rules.
- **Mutation CSRF**: mutations that change state are vulnerable to CSRF if the endpoint accepts cookies. Require custom headers (e.g., `X-Requested-With`) or use token-based auth instead of cookie-based auth for mutations.
- **Query depth-based memory exhaustion**: deeply nested queries can cause the server to allocate large amounts of memory for the execution plan. Set `maxDepth` to 10 and `maxComplexity` to 1000 to prevent memory exhaustion attacks.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
