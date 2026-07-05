---
contentType: docs
slug: graphql-federation-onboarding-template
templateType: onboarding
title: "GraphQL Federation Onboarding Template"
description: "Template for onboarding a service to a federated GraphQL graph: subgraph setup, entity definitions, resolver configuration, gateway integration, testing, deployment, and monitoring with code examples."
metaDescription: "Template for onboarding a service to federated GraphQL: subgraph setup, entity definitions, resolvers, gateway integration, testing, deployment, monitoring."
difficulty: advanced
topics:
  - graphql
tags:
  - graphql
  - federation
  - onboarding
  - microservices
  - apollo
  - subgraph
  - gateway
relatedResources:
  - /docs/ai/graphql-schema-review-checklist
  - /docs/ai/graphql-api-design-guideline
  - /docs/ai/graphql-deprecation-policy-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Template for onboarding a service to federated GraphQL: subgraph setup, entity definitions, resolvers, gateway integration, testing, deployment, monitoring."
  keywords:
    - graphql federation
    - subgraph onboarding
    - apollo federation
    - federated graph
    - entity resolver
    - gateway integration
    - graphql microservices
---

## Overview

This template guides a team through onboarding a new service to an existing federated GraphQL graph. Follow each section in order. Skip nothing — missing steps cause runtime errors in the gateway that are hard to debug.

---

## 1. Prerequisites

### 1.1 Before You Start

- [ ] Service has a GraphQL schema (SDL or code-first)
- [ ] Service exposes HTTP POST endpoint for GraphQL queries
- [ ] Service deployed to staging environment
- [ ] Team has access to the Apollo Studio / gateway repo
- [ ] Team has reviewed the API design guidelines
- [ ] Domain boundaries identified (what this subgraph owns)

### 1.2 Domain Ownership Declaration

```text
Service name: {service-name}
Team: {team-name}
Domain: {domain description}

Types owned by this subgraph:
  - {Type1}: full ownership
  - {Type2}: full ownership

Types extended from other subgraphs:
  - {Type3}: extends {other-service} with fields {field1}, {field2}

Entities (shared across subgraphs):
  - {Entity1}: @key(fields: "id")
  - {Entity2}: @key(fields: "id")
```

---

## 2. Subgraph Setup

### 2.1 Install Dependencies

```bash
# Using Apollo Server
npm install @apollo/server @apollo/subgraph graphql

# Using Mercurius (Fastify)
npm install mercurius mercurius-federation @mercurius/federation
```

### 2.2 Subgraph Schema Definition

```graphql
# products-subgraph.graphqls

extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key", "@external", "@extends", "@shareable"])

type Product @key(fields: "id") {
  id: ID!
  name: String!
  description: String!
  price: Float!
  currency: String!
  categoryId: ID!
  inStock: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Category @key(fields: "id") {
  id: ID!
  name: String!
  productCount: Int! @shareable
}

type Query {
  product(id: ID!): Product
  products(first: Int = 20, after: String): ProductConnection!
  category(id: ID!): Category
}

type Mutation {
  createProduct(input: CreateProductInput!): CreateProductPayload!
  updateProduct(input: UpdateProductInput!): UpdateProductPayload!
}

type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ProductEdge {
  node: Product!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

scalar DateTime
```

### 2.3 Resolver Configuration

```javascript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = `#graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@extends"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
  }

  type Query {
    product(id: ID!): Product
  }
`;

const resolvers = {
  Query: {
    product: (_, { id }, context) => {
      return context.dataSources.productDb.findById(id);
    },
  },
  // Entity resolver — called when gateway resolves a Product by key
  Product: {
    __resolveReference: (reference, context) => {
      return context.dataSources.productDb.findById(reference.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({
    dataSources: createDataSources(req),
    user: authenticateUser(req),
  }),
});
```

---

## 3. Entity Resolution

### 3.1 Entity Resolver Rules

- Every type with `@key` must have `__resolveReference`
- The resolver receives the key fields and returns the full entity
- If the entity is not found, return null (not an error)
- Cache entity lookups with DataLoader per request
- Entity resolvers must be fast (< 50ms p95)

```javascript
import DataLoader from 'dataloader';

const resolvers = {
  Product: {
    __resolveReference: (reference, context) => {
      // reference = { id: "123", __typename: "Product" }
      return context.loaders.productById.load(reference.id);
    },
  },
  Category: {
    __resolveReference: (reference, context) => {
      return context.loaders.categoryById.load(reference.id);
    },
  },
};

function createLoaders(db) {
  return {
    productById: new DataLoader(async (ids) => {
      const products = await db.products.findMany({ where: { id: { in: ids } } });
      return ids.map(id => products.find(p => p.id === id) || null);
    }),
    categoryById: new DataLoader(async (ids) => {
      const categories = await db.categories.findMany({ where: { id: { in: ids } } });
      return ids.map(id => categories.find(c => c.id === id) || null);
    }),
  };
}
```

### 3.2 Extending Entities from Other Subgraphs

```graphql
# reviews-subgraph.graphqls
# Extends Product entity from Products subgraph

extend type Product @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
  averageRating: Float!
  reviewCount: Int!
}

type Review @key(fields: "id") {
  id: ID!
  productId: ID!
  userId: ID!
  rating: Int!
  comment: String!
  createdAt: DateTime!
}

type Query {
  reviews(productId: ID!, first: Int = 10, after: String): ReviewConnection!
}
```

```javascript
// Reviews subgraph resolvers
const resolvers = {
  Product: {
    // Resolve extended fields when Product is accessed via gateway
    reviews: (parent, _, context) => {
      return context.dataSources.reviewDb.findByProduct(parent.id);
    },
    averageRating: (parent, _, context) => {
      return context.dataSources.reviewDb.getAverageRating(parent.id);
    },
    reviewCount: (parent, _, context) => {
      return context.dataSources.reviewDb.getCount(parent.id);
    },
  },
};
```

---

## 4. Gateway Integration

### 4.1 Gateway Configuration

```javascript
// gateway/index.js
import { ApolloGateway } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'products', url: 'https://products-service.internal/graphql' },
    { name: 'reviews', url: 'https://reviews-service.internal/graphql' },
    { name: 'users', url: 'https://users-service.internal/graphql' },
    { name: 'orders', url: 'https://orders-service.internal/graphql' },
  ],
  // Poll for schema changes every 10 seconds in staging
  debug: process.env.NODE_ENV !== 'production',
});

const server = new ApolloServer({
  gateway,
  // Disable subscriptions (not supported in federation)
  subscriptions: false,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({
    user: authenticateUser(req),
    correlationId: req.headers['x-correlation-id'],
  }),
});
```

### 4.2 Supergraph Composition

```yaml
# supergraph.yaml
federation_version: =2.0.0
subgraphs:
  products:
    routing_url: https://products-service.internal/graphql
    schema:
      file: ./subgraphs/products/products.graphqls
  reviews:
    routing_url: https://reviews-service.internal/graphql
    schema:
      file: ./subgraphs/reviews/reviews.graphqls
  users:
    routing_url: https://users-service.internal/graphql
    schema:
      file: ./subgraphs/users/users.graphqls
  orders:
    routing_url: https://orders-service.internal/graphql
    schema:
      file: ./subgraphs/orders/orders.graphqls
```

```bash
# Compose the supergraph schema
rover supergraph compose --config supergraph.yaml > supergraph-schema.graphql

# Validate composition
rover subgraph check products@production \
  --schema ./subgraphs/products/products.graphqls \
  --routing-url https://products-service.internal/graphql
```

---

## 5. Testing

### 5.1 Subgraph Tests

```javascript
// Test entity resolution
describe('Product entity resolver', () => {
  it('resolves a product by ID', async () => {
    const result = await executeOperation({
      query: `{ product(id: "1") { id name price } }`,
    });
    expect(result.data.product).toEqual({
      id: '1',
      name: 'Widget',
      price: 9.99,
    });
  });

  it('returns null for non-existent product', async () => {
    const result = await executeOperation({
      query: `{ product(id: "999") { id name } }`,
    });
    expect(result.data.product).toBeNull();
  });
});

// Test __resolveReference directly
describe('Product __resolveReference', () => {
  it('resolves entity reference', async () => {
    const result = await resolvers.Product.__resolveReference(
      { id: '1', __typename: 'Product' },
      testContext
    );
    expect(result.id).toBe('1');
    expect(result.name).toBeDefined();
  });
});
```

### 5.2 Federation Integration Tests

```javascript
// Test cross-subgraph queries
describe('Federated queries', () => {
  it('resolves product with reviews across subgraphs', async () => {
    const result = await gatewayExecute({
      query: `
        query {
          product(id: "1") {
            id
            name
            reviews {
              rating
              comment
            }
            averageRating
          }
        }
      `,
    });
    
    expect(result.data.product.id).toBe('1');
    expect(result.data.product.name).toBeDefined();
    expect(result.data.product.reviews).toBeInstanceOf(Array);
    expect(result.data.product.averageRating).toBeGreaterThan(0);
  });
});
```

### 5.3 Testing Checklist

- [ ] Subgraph resolves all own types correctly
- [ ] `__resolveReference` works for all entities
- [ ] Extended fields resolve correctly
- [ ] Cross-subgraph queries return correct data
- [ ] Null handling: missing entity returns null, not error
- [ ] Error handling: subgraph errors propagate to gateway
- [ ] Authentication context passes through gateway
- [ ] DataLoader batching works within subgraph

---

## 6. Deployment

### 6.1 Deployment Checklist

- [ ] Subgraph deployed to staging
- [ ] Schema composed with `rover supergraph compose`
- [ ] Composition validated (no conflicts, no circular dependencies)
- [ ] Gateway updated with new service URL
- [ ] Integration tests pass in staging
- [ ] Performance benchmarks run (p95 < 200ms for cross-subgraph queries)
- [ ] Monitoring dashboards configured
- [ ] Alerting rules set up
- [ ] Rollback plan documented

### 6.2 Deployment Steps

```text
1. Deploy subgraph service to staging
   - Verify health check passes
   - Verify GraphQL endpoint responds
   - Run subgraph test suite

2. Compose supergraph with new subgraph
   - rover supergraph compose --config supergraph.yaml
   - Verify no composition errors
   - Check for schema conflicts

3. Update gateway configuration
   - Add new service to serviceList
   - Deploy gateway to staging
   - Run integration tests

4. Verify in staging
   - Test cross-subgraph queries
   - Check gateway logs for errors
   - Monitor subgraph health

5. Deploy to production
   - Deploy subgraph service
   - Update gateway serviceList
   - Monitor error rates for 1 hour
   - Verify query success rate > 99.9%
```

---

## 7. Monitoring

### 7.1 Key Metrics

```text
Metric                          | Source        | Alert Threshold
────────────────────────────────┼───────────────┼──────────────────
Subgraph request rate           | Gateway       | < 10 req/s (check)
Subgraph error rate             | Gateway       | > 1%
Subgraph latency p95            | Gateway       | > 200ms
Entity resolver latency p95     | Subgraph      | > 50ms
Gateway query latency p95       | Gateway       | > 500ms
Schema composition failures     | CI/CD         | Any
Subgraph health check failures  | Gateway       > 3 consecutive
Cross-subgraph query errors     | Gateway       | > 0.5%
```

### 7.2 Monitoring Setup

```javascript
// Subgraph health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    subgraph: 'products',
    version: process.env.APP_VERSION,
    schemaHash: currentSchemaHash,
  });
});

// Apollo Studio integration for schema tracking
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  plugins: [
    process.env.NODE_ENV === 'production' && ApolloServerPluginInlineTrace(),
  ],
});
```

## FAQ

### How do I share custom scalars across subgraphs?

Define custom scalars (DateTime, JSON, URL) in a shared npm package. Each subgraph imports the scalar definition and resolver. The gateway automatically merges scalar definitions during composition. If scalars are defined differently in two subgraphs, composition fails. Use a shared package like `@company/graphql-scalars` to ensure consistency.

### What happens if one subgraph is down?

The gateway returns partial results for queries that can be resolved by available subgraphs. If a query requires data from the down subgraph, the gateway returns an error for that field while still resolving other fields. Use `@requires` directives carefully — if a required field cannot be resolved, the entire entity resolution fails. Configure circuit breakers in the gateway to fail fast rather than waiting for timeouts.

### How do I handle authentication in a federated graph?

Authenticate at the gateway level. Extract the JWT from the Authorization header in the gateway context. Pass the decoded user object to subgraphs via the `x-user` header or a custom context extension. Each subgraph receives the user in its context and performs field-level authorization. Do not authenticate in each subgraph independently — that causes redundant work and inconsistent behavior.

### Can I use subscriptions with federation?

Standard Apollo Federation does not support subscriptions through the gateway. If you need real-time updates, run a separate subscription endpoint outside the gateway. Clients connect to the subscription endpoint directly and to the gateway for queries and mutations. Use a pub/sub system (Redis, NATS) to share events between subgraphs and the subscription endpoint. Apollo is working on native subscription support in future federation versions.

### How do I debug a failing entity resolution?

Check three things: (1) Is `__resolveReference` implemented for the entity type? (2) Does the resolver return null when the entity is not found? (3) Is the key field in the reference object spelled correctly? Enable query tracing in Apollo Studio to see which subgraph resolved which field. Check gateway logs for `ENTITY_RESOLUTION_FAILED` errors. Test the entity resolver in isolation with a direct subgraph query before testing through the gateway.
