---
contentType: guides
slug: complete-guide-graphql-federation-production
title: "GraphQL Federation in Production"
description: "Run federated GraphQL in production with confidence. Covers subgraph composition, gateway deployment, entity resolution, schema coordination, observability, and failure handling."
metaDescription: "Run federated GraphQL in production. Learn subgraph composition, gateway deployment, entity resolution, schema coordination, observability, and failure handling."
difficulty: advanced
topics:
  - graphql
  - api
  - architecture
tags:
  - graphql
  - federation
  - apollo
  - production
  - guide
  - supergraph
  - subgraph
  - gateway
relatedResources:
  - /guides/api/complete-guide-graphql-schema-design
  - /guides/api/complete-guide-graphql-federation
  - /guides/architecture/microservices-architecture-guide
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run federated GraphQL in production. Learn subgraph composition, gateway deployment, entity resolution, schema coordination, observability, and failure handling."
  keywords:
    - graphql federation production
    - apollo federation
    - supergraph gateway
    - subgraph composition
    - entity resolution
    - graphql observability
---

## Introduction

GraphQL Federation splits a monolithic GraphQL API into multiple subgraphs owned by different teams. A gateway composes them into a single supergraph API. Running federation in production introduces challenges that the basic tutorials do not cover: schema coordination across teams, gateway reliability, entity resolution performance, observability, and handling subgraph failures. This guide addresses each one.

## Federation Architecture Review

```
Client → Gateway (Supergraph Schema)
            ↓
    ┌───────┼───────┐
    ↓       ↓       ↓
  Users   Orders   Products
  (subgraph A) (B)  (C)
```

- **Subgraph**: A GraphQL service owned by a team, defining part of the schema
- **Supergraph**: The composed schema from all subgraphs
- **Gateway**: The entry point that routes queries to subgraphs and joins results
- **Entity**: A shared type with a `@key` field that multiple subgraphs can reference and extend

## Subgraph Design

### Entity Ownership

Each entity has one owning subgraph that defines its `@key` and base fields. Other subgraphs extend the entity with additional fields. This prevents conflicts and keeps ownership clear.

```graphql
# Users subgraph (owns User entity)
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# Orders subgraph (extends User)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  total: Float!
  user: User!
}
```

### Reference Resolver

When the gateway needs to resolve a User entity from the Orders subgraph, it calls the `__resolveReference` resolver. This resolver receives the key fields and returns the full object.

```javascript
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql, ApolloServer } = require("@apollo/server");

const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
  }
`;

const resolvers = {
  User: {
    __resolveReference: (reference, context) => {
      // Gateway sends { id: "123", __typename: "User" }
      return context.dataSources.users.getById(reference.id);
    },
  },
  Query: {
    user: (_root, { id }, context) => context.dataSources.users.getById(id),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});
```

### Extending Entities

When a subgraph extends an entity, it must mark the key field as `@external` and can use `@requires` to declare dependencies on fields owned by other subgraphs.

```graphql
# Products subgraph extends Order
extend type Order @key(fields: "id") {
  id: ID! @external
  total: Float! @external
  items: [OrderItem!]!
  taxAmount: Float! @requires(fields: "total")
}
```

```javascript
const resolvers = {
  Order: {
    __resolveReference: (reference, context) => {
      return context.dataSources.orders.getById(reference.id);
    },
    taxAmount: (order) => order.total * 0.21,
  },
};
```

## Gateway Deployment

### Managed Federation (Apollo Studio)

Apollo Studio hosts the supergraph schema. Subgraphs publish their schemas to Studio. The gateway polls Studio for the latest supergraph schema. This decouples composition from deployment.

```yaml
# gateway docker-compose.yml
services:
  gateway:
    image: ghcr.io/apollographql/router:v1.40.0
    environment:
      - APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT=https://uplink.api.apollographql.com/
      - APOLLO_KEY=service:my-graph:YOUR_KEY
      - APOLLO_GRAPH_REF=my-graph@production
    ports:
      - "4000:4000"
```

Advantages: No manual composition. The gateway automatically picks up schema changes. Studio provides schema history, validation, and analytics.

Disadvantages: Depends on Apollo infrastructure. Requires an Apollo organization account for production features.

### Self-Hosted Composition

You compose the supergraph schema yourself and provide it to the gateway. This works when you cannot depend on external services.

```bash
# Compose supergraph from subgraph schemas
npx rover supergraph compose --config supergraph.yaml > supergraph.graphql
```

```yaml
# supergraph.yaml
federation_version: =2.8.0
subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
    schema:
      subgraph_url: http://users-service:4001/graphql
  orders:
    routing_url: http://orders-service:4002/graphql
    schema:
      subgraph_url: http://orders-service:4002/graphql
  products:
    routing_url: http://products-service:4003/graphql
    schema:
      subgraph_url: http://products-service:4003/graphql
```

```bash
# Run gateway with composed schema
npx @apollo/gateway start --supergraph supergraph.graphql --port 4000
```

Advantages: No external dependency. Full control over composition and deployment.

Disadvantages: You manage the composition pipeline. Schema updates require redeployment or a polling mechanism.

### Gateway High Availability

Run multiple gateway instances behind a load balancer. The gateway is stateless: it routes queries to subgraphs and joins results. Any instance can serve any request.

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphql-gateway
  template:
    spec:
      containers:
        - name: gateway
          image: ghcr.io/apollographql/router:v1.40.0
          env:
            - name: APOLLO_KEY
              valueFrom:
                secretKeyRef:
                  name: apollo-secrets
                  key: key
            - name: APOLLO_GRAPH_REF
              value: my-graph@production
          ports:
            - containerPort: 4000
          livenessProbe:
            httpGet:
              path: /.well-known/apollo/server-health
              port: 4000
          readinessProbe:
            httpGet:
              path: /.well-known/apollo/server-health
              port: 4000
```

## Query Planning

The gateway builds a query plan for each incoming query. The plan specifies which subgraphs to call, in what order, and how to join results.

### Sequential Plan

For a query like `user { orders { product { name } } }`, the gateway:

1. Calls Users subgraph for the user
2. Calls Orders subgraph for the user's orders (using the user ID as entity key)
3. Calls Products subgraph for each order's product (using product ID as entity key)

### Parallel Plan

For a query like `user { name orders { total } reviews { rating } }`, the gateway can call Orders and Reviews subgraphs in parallel since they both depend only on the User entity.

### Query Plan Inspection

Apollo Router can log query plans for debugging:

```yaml
# router.yaml
telemetry:
  instrumentation:
    spans:
      mode: spec_compliant
supergraph:
  query_plans:
    log: info
```

This logs the query plan for each query, showing which subgraphs are called and in what order. Useful for debugging performance issues.

## Handling Subgraph Failures

### Partial Failures

When a subgraph fails, the gateway nullifies the fields it owns and continues resolving the rest. The `errors` array contains the failure details.

```json
{
  "data": {
    "user": {
      "id": "123",
      "name": "Alice",
      "orders": null
    }
  },
  "errors": [
    {
      "message": "Orders subgraph unavailable",
      "path": ["user", "orders"],
      "extensions": { "code": "SUBGRAPH_ERROR" }
    }
  ]
}
```

### Circuit Breaker

Configure the gateway to stop sending traffic to a failing subgraph. This prevents cascading failures.

```javascript
const { ApolloGateway } = require("@apollo/gateway");

const gateway = new ApolloGateway({
  serviceList: [
    { name: "users", url: "http://users-service:4001/graphql" },
    { name: "orders", url: "http://orders-service:4002/graphql" },
  ],
  // Timeout for subgraph requests
  debug: true,
});
```

For production, use a service mesh (Istio, Linkerd) or API gateway (Kong, Envoy) to handle circuit breaking, retries, and timeouts at the network level.

### Timeout Configuration

Set timeouts at the gateway level to prevent slow subgraphs from blocking the entire query.

```yaml
# router.yaml
traffic_shaping:
  router:
    timeout: 30s
  all:
    timeout: 10s
    deduplicate_query: false
```

## Observability

### Distributed Tracing

Use OpenTelemetry to trace queries across the gateway and subgraphs. Each subgraph call gets a span, and the gateway correlates them into a trace.

```javascript
// subgraph instrumentation
const { trace } = require("@opentelemetry/api");

const resolvers = {
  Query: {
    user: (root, args, context) => {
      const span = trace.getSpan(context.tracing);
      span.setAttribute("user.id", args.id);
      return context.dataSources.users.getById(args.id);
    },
  },
};
```

```yaml
# router.yaml - OpenTelemetry export
telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: http://otel-collector:4317
        protocol: grpc
```

### Metrics to Track

- **Query latency**: p50, p95, p99 per operation
- **Subgraph latency**: p50, p95, p99 per subgraph
- **Error rate**: per subgraph and per operation
- **Cache hit rate**: gateway-level and subgraph-level
- **Query complexity**: average and maximum
- **Concurrent queries**: gauge for load monitoring

### Schema Change Alerts

Configure Apollo Studio or your CI pipeline to alert on breaking schema changes. When a subgraph publishes a schema that breaks the supergraph, block the deployment.

```bash
# CI step: check for breaking changes
npx rover subgraph check my-graph@production \
  --name users \
  --schema ./schema.graphql \
  --routing-url http://users-service:4001/graphql
```

## Schema Coordination Across Teams

### Ownership Documentation

Document which team owns each type and field. This prevents two teams from accidentally defining the same type.

```yaml
# schema-ownership.yaml
types:
  User:
    owner: team-identity
    fields:
      id: team-identity
      name: team-identity
      email: team-identity
      orders: team-commerce
  Order:
    owner: team-commerce
    fields:
      id: team-commerce
      total: team-commerce
      user: team-commerce
  Product:
    owner: team-catalog
```

### Schema Review Process

1. Subgraph team opens a PR with schema changes
2. CI runs `rover subgraph check` to detect breaking changes
3. Architecture review for new types or entity changes
4. Subgraph team publishes schema to Studio after merge
5. Gateway picks up the new supergraph schema automatically

### Versioning Subgraph Schemas

Tag subgraph schemas with versions in your CI pipeline. This lets you roll back a subgraph to a previous schema if the new one causes issues.

```bash
# Publish with version tag
npx rover subgraph publish my-graph@production \
  --name users \
  --schema ./schema.graphql \
  --routing-url http://users-service:4001/graphql
```

## Production Checklist

Before deploying federation to production:

- [ ] Gateway runs behind a load balancer with multiple replicas
- [ ] Health checks configured for gateway and all subgraphs
- [ ] Timeouts set at gateway and subgraph level
- [ ] OpenTelemetry tracing exported to a collector
- [ ] Metrics dashboard for query latency, error rate, and cache hit rate
- [ ] Schema ownership documented
- [ ] CI pipeline checks for breaking changes before publish
- [ ] Subgraph failure tested: verify partial data is returned
- [ ] Gateway can serve queries when one subgraph is down
- [ ] Schema composition time measured and within budget

## FAQ

### How many subgraphs should I have?

Start with 2-3 subgraphs aligned to team boundaries. Each subgraph should own a coherent domain (users, orders, products). Too many subgraphs increase query plan complexity and network overhead. Too few subgraphs defeat the purpose of federation.

### Can I mix federation versions (v1 and v2)?

Yes, Apollo Federation v2 is backwards compatible with v1 subgraphs. You can migrate subgraphs one at a time. Set `federation_version: =2.x.x` in your supergraph config and incrementally upgrade subgraphs.

### What happens if the gateway cannot reach a subgraph?

The gateway returns partial data. Fields owned by the unreachable subgraph are nullified. The `errors` array contains the failure. If the subgraph owns a non-null field, the error propagates up to the nearest nullable parent.

### How do I test federation locally?

Use `rover dev` to run a local gateway that composes subgraphs from your local services. This lets you test the full query plan without deploying to a shared environment.

```bash
npx rover dev --name users --url http://localhost:4001/graphql
# In another terminal
npx rover dev --name orders --url http://localhost:4002/graphql
```

Rover starts a gateway on port 4000 that composes both subgraphs.

### Should I use Apollo Router or the JS Gateway?

Apollo Router (Rust-based) is recommended for production. It is faster, uses less memory, and supports native OpenTelemetry. The JS Gateway (`@apollo/gateway`) is useful for development and Node.js-based deployments where you need custom JavaScript plugins.
