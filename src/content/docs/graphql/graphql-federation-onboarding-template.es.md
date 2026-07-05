---
contentType: docs
slug: graphql-federation-onboarding-template
templateType: onboarding
title: "Plantilla de Onboarding a GraphQL Federation"
description: "Plantilla para onboardear un servicio a un federated GraphQL graph: subgraph setup, entity definitions, resolver configuration, gateway integration, testing, deployment y monitoring con ejemplos de codigo."
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

Esta plantilla guia a un team a traves de onboardear un new service a un existing federated GraphQL graph. Segui cada section en order. No skipees nada — missing steps causan runtime errors en el gateway que son hard de debuggear.

---

## 1. Prerequisites

### 1.1 Before You Start

- [ ] Service tiene un GraphQL schema (SDL o code-first)
- [ ] Service expone un HTTP POST endpoint para GraphQL queries
- [ ] Service deployeado a staging environment
- [ ] Team tiene access al Apollo Studio / gateway repo
- [ ] Team ha reviewado el API design guidelines
- [ ] Domain boundaries identificados (que ownea este subgraph)

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
# Usando Apollo Server
npm install @apollo/server @apollo/subgraph graphql

# Usando Mercurius (Fastify)
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
  // Entity resolver — llamado cuando gateway resolvee un Product por key
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

- Every type con `@key` debe tener `__resolveReference`
- El resolver recibe el key fields y returna el full entity
- Si el entity no es found, returna null (no un error)
- Cachea entity lookups con DataLoader per request
- Entity resolvers deben ser fast (< 50ms p95)

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
    // Resolve extended fields cuando Product es accessed via gateway
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
  // Pollea para schema changes cada 10 seconds en staging
  debug: process.env.NODE_ENV !== 'production',
});

const server = new ApolloServer({
  gateway,
  // Disablea subscriptions (no supported en federation)
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
# Compone el supergraph schema
rover supergraph compose --config supergraph.yaml > supergraph-schema.graphql

# Valida composition
rover subgraph check products@production \
  --schema ./subgraphs/products/products.graphqls \
  --routing-url https://products-service.internal/graphql
```

---

## 5. Testing

### 5.1 Subgraph Tests

```javascript
// Testea entity resolution
describe('Product entity resolver', () => {
  it('resolvee un product por ID', async () => {
    const result = await executeOperation({
      query: `{ product(id: "1") { id name price } }`,
    });
    expect(result.data.product).toEqual({
      id: '1',
      name: 'Widget',
      price: 9.99,
    });
  });

  it('returna null para non-existent product', async () => {
    const result = await executeOperation({
      query: `{ product(id: "999") { id name } }`,
    });
    expect(result.data.product).toBeNull();
  });
});

// Testea __resolveReference directly
describe('Product __resolveReference', () => {
  it('resolvee entity reference', async () => {
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
// Testea cross-subgraph queries
describe('Federated queries', () => {
  it('resolvee product con reviews across subgraphs', async () => {
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

- [ ] Subgraph resolvee all own types correctamente
- [ ] `__resolveReference` works para all entities
- [ ] Extended fields resolveen correctamente
- [ ] Cross-subgraph queries returnean correct data
- [ ] Null handling: missing entity returnea null, no error
- [ ] Error handling: subgraph errors propagatean al gateway
- [ ] Authentication context pasa a traves del gateway
- [ ] DataLoader batching works dentro del subgraph

---

## 6. Deployment

### 6.1 Deployment Checklist

- [ ] Subgraph deployeado a staging
- [ ] Schema composed con `rover supergraph compose`
- [ ] Composition validada (no conflicts, no circular dependencies)
- [ ] Gateway updated con new service URL
- [ ] Integration tests pasan en staging
- [ ] Performance benchmarks corren (p95 < 200ms para cross-subgraph queries)
- [ ] Monitoring dashboards configurados
- [ ] Alerting rules set up
- [ ] Rollback plan documentado

### 6.2 Deployment Steps

```text
1. Deployea subgraph service a staging
   - Verifica health check pasa
   - Verifica GraphQL endpoint responde
   - Corre subgraph test suite

2. Compone supergraph con new subgraph
   - rover supergraph compose --config supergraph.yaml
   - Verifica no composition errors
   - Checkea por schema conflicts

3. Updatea gateway configuration
   - Addea new service al serviceList
   - Deployea gateway a staging
   - Corre integration tests

4. Verifica en staging
   - Testea cross-subgraph queries
   - Checkea gateway logs por errors
   - Monitora subgraph health

5. Deployea a production
   - Deployea subgraph service
   - Updatea gateway serviceList
   - Monitora error rates por 1 hour
   - Verifica query success rate > 99.9%
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

// Apollo Studio integration para schema tracking
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  plugins: [
    process.env.NODE_ENV === 'production' && ApolloServerPluginInlineTrace(),
  ],
});
```

## Preguntas Frecuentes

### ¿Cómo comparto custom scalars across subgraphs?

Define custom scalars (DateTime, JSON, URL) en un shared npm package. Cada subgraph importa el scalar definition y resolver. El gateway automaticamente mergea scalar definitions durante composition. Si scalars estan definidos differently en dos subgraphs, composition failea. Usa un shared package como `@company/graphql-scalars` para asegurar consistency.

### ¿Qué pasa si un subgraph esta down?

El gateway returna partial results para queries que pueden ser resolvedos por available subgraphs. Si una query requiere data del down subgraph, el gateway returna un error para ese field mientras still resolvee other fields. Usa `@requires` directives cuidadosamente — si un required field no puede ser resolvedo, el entire entity resolution failea. Configura circuit breakers en el gateway para fail fast en vez de waitear por timeouts.

### ¿Cómo handleo authentication en un federated graph?

Autentica en el gateway level. Extrae el JWT del Authorization header en el gateway context. Pasa el decoded user object a subgraphs via el `x-user` header o un custom context extension. Cada subgraph recibe el user en su context y performa field-level authorization. No autentiques en cada subgraph independently — eso causa redundant work y inconsistent behavior.

### ¿Puedo usar subscriptions con federation?

Standard Apollo Federation no supportea subscriptions a traves del gateway. Si necesitas real-time updates, corre un separate subscription endpoint outside del gateway. Clients connectan al subscription endpoint directly y al gateway para queries y mutations. Usa un pub/sub system (Redis, NATS) para sharear events entre subgraphs y el subscription endpoint. Apollo esta trabajando en native subscription support en future federation versions.

### ¿Cómo debuggeo un failing entity resolution?

Checkea tres cosas: (1) Esta `__resolveReference` implemented para el entity type? (2) Returna el resolver null cuando el entity no es found? (3) Esta el key field en el reference object spelled correctamente? Enablea query tracing en Apollo Studio para ver que subgraph resolveo que field. Checkea gateway logs por `ENTITY_RESOLUTION_FAILED` errors. Testea el entity resolver en isolation con un direct subgraph query antes de testear a traves del gateway.
