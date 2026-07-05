---
contentType: docs
slug: graphql-api-design-guideline
templateType: guideline
title: "Guia de Diseño de GraphQL API"
description: "Guias internas para diseñar GraphQL APIs: schema structure, naming, mutation patterns, error handling, pagination, authentication, rate limiting, versioning y federation rules con ejemplos de codigo."
metaDescription: "Internal guidelines for GraphQL API design: schema structure, naming, mutations, errors, pagination, auth, rate limiting, versioning, federation rules."
difficulty: intermediate
topics:
  - graphql
tags:
  - graphql
  - api-design
  - guideline
  - schema
  - best-practices
  - federation
relatedResources:
  - /docs/ai/graphql-schema-review-checklist
  - /docs/ai/graphql-deprecation-policy-template
  - /guides/architecture/complete-guide-graphql-federation
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Internal guidelines for GraphQL API design: schema structure, naming, mutations, errors, pagination, auth, rate limiting, versioning, federation rules."
  keywords:
    - graphql api design
    - graphql guidelines
    - graphql best practices
    - schema design
    - graphql mutations
    - graphql pagination
    - graphql federation
---

## Overview

Este documento define internal guidelines para diseñar GraphQL APIs en nuestra organization. All teams building GraphQL services deben seguir estas rules para asegurar consistency, security y performance across our API surface.

---

## 1. Schema Structure

### 1.1 Root Types

```graphql
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

type Query {
  # Single resource por ID
  user(id: ID!): User
  node(id: ID!): Node
  
  # List con pagination
  users(first: Int, after: String, filter: UserFilter): UserConnection!
}

type Mutation {
  # CRUD operations
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(input: DeleteUserInput!): DeleteUserPayload!
}

type Subscription {
  userUpdated(id: ID!): UserUpdatePayload!
}
```

### 1.2 Schema Organization Rules

- Un schema file por domain (e.g., `users.graphql`, `orders.graphql`)
- Shared types en `shared.graphql`
- Custom scalars en `scalars.graphql`
- No type definido en multiple files
- Schema stitched o federated — nunca duplicated

---

## 2. Naming Rules

### 2.1 Naming Convention Table

```text
Element          | Convention        | Example
─────────────────┼───────────────────┼──────────────────
Type             | PascalCase        | ProductOrder
Interface        | PascalCase        | Node, Ownable
Union            | PascalCase        | SearchResult
Enum             | PascalCase        | OrderStatus
Enum value       | UPPER_SNAKE_CASE | PENDING, SHIPPED
Field            | camelCase         | createdAt
Argument         | camelCase         | pageSize
Input type       | {Type}Input       | CreateUserInput
Payload type     | {Verb}{Type}Payload | CreateUserPayload
Connection       | {Type}Connection  | UserConnection
Edge             | {Type}Edge        | UserEdge
Filter input     | {Type}Filter      | UserFilter
Sort input       | {Type}Sort        | UserSort
Directive        | camelCase         | @deprecated
Custom scalar    | PascalCase        | DateTime, URL
```

### 2.2 Forbidden Names

- No generic names: `Status`, `Type`, `Data`, `Result`, `Info`
- No abbreviations: `Usr` instead of `User`, `Ord` instead of `Order`
- No Hungarian notation: `strName`, `intCount`
- No REST-style names: `getUserById`, `POST /users`

---

## 3. Query Design

### 3.1 Query Rules

- Queries deben ser read-only — no side effects
- Single resource queries acceptan `id: ID!` argument
- List queries usan Connection pattern con `first`, `after`, `last`, `before`
- List queries acceptan un `filter` argument para filtering
- List queries acceptan un `sort` argument para ordering
- No query returnea mas de 100 items per page
- No nested queries mas deep que 10 levels

```graphql
type Query {
  # Single resource
  product(id: ID!): Product
  productBySlug(slug: String!): Product
  
  # List con full pagination
  products(
    first: Int = 20
    after: String
    filter: ProductFilter
    sort: ProductSort
  ): ProductConnection!
}

input ProductFilter {
  category: ProductCategory
  priceMin: Float
  priceMax: Float
  inStock: Boolean
  search: String
}

input ProductSort {
  field: ProductSortField!
  direction: SortDirection!
}

enum ProductSortField {
  NAME
  PRICE
  CREATED_AT
  POPULARITY
}

enum SortDirection {
  ASC
  DESC
}
```

---

## 4. Mutation Design

### 4.1 Mutation Rules

- All mutations toman un single `input` argument
- All mutations returnean un payload type (no el entity directly)
- Payload types incluyen el mutated entity y error array
- Mutation names empiezan con un verb: `create`, `update`, `delete`, `archive`, `restore`
- Bulk mutations usan plural: `createUsers`, `deleteProducts`
- No partial success — mutations son all-or-nothing

```graphql
type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
  updateOrder(input: UpdateOrderInput!): UpdateOrderPayload!
  cancelOrder(input: CancelOrderInput!): CancelOrderPayload!
  archiveOrder(input: ArchiveOrderInput!): ArchiveOrderPayload!
}

input CreateOrderInput {
  customerId: ID!
  items: [OrderItemInput!]!
  shippingAddressId: ID!
  notes: String
}

type CreateOrderPayload {
  order: Order
  userErrors: [UserError!]!
}

type UserError {
  field: String
  message: String!
  code: UserErrorCode!
}

enum UserErrorCode {
  INVALID_INPUT
  NOT_FOUND
  UNAUTHORIZED
  FORBIDDEN
  CONFLICT
  RATE_LIMITED
}
```

### 4.2 Mutation Payload Rules

- Payload type name: `{Verb}{Type}Payload`
- Payload incluye el mutated entity (nullable — null on error)
- Payload incluye `userErrors: [UserError!]!` (empty array on success)
- Payload puede incluir related fields (e.g., `orderCount` despues de `createOrder`)
- No generic `success: Boolean` field — presence del entity indica success

---

## 5. Error Handling

### 5.1 Error Categories

```text
Category          | Code              | HTTP equivalent
──────────────────┼───────────────────┼──────────────────
Validation        | INVALID_INPUT     | 400
Authentication    | UNAUTHENTICATED   | 401
Authorization     | FORBIDDEN         | 403
Not found         | NOT_FOUND         | 404
Conflict          | CONFLICT          | 409
Rate limited      | RATE_LIMITED      | 429
Internal          | INTERNAL_ERROR    | 500
```

### 5.2 Error Rules

- Nunca expongas stack traces o internal paths
- Field-level errors incluyen el `field` path
- Error messages son user-friendly, no developer-facing
- Error codes son stable y documentados
- Rate limit errors incluyen `retryAfter` en el error extension
- Internal errors son logged con correlation IDs
- No error message contiene PII o secrets

```javascript
// Error formatting
function formatError(error) {
  return {
    message: error.message,
    extensions: {
      code: error.extensions?.code || 'INTERNAL_ERROR',
      field: error.extensions?.field,
      retryAfter: error.extensions?.retryAfter,
      correlationId: context.correlationId,
    },
  };
}
```

---

## 6. Authentication y Authorization

### 6.1 Authentication

```javascript
// Authentication via JWT en Authorization header
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return { user: null };
    
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      return { user, loaders: createLoaders() };
    } catch {
      return { user: null };
    }
  },
});
```

### 6.2 Authorization Rules

- Every field resolver checkea authorization
- Usa `@auth` directive o middleware para field-level auth
- Public fields explicitamente marked como public
- Admin-only fields checkean role antes de resolving
- No field returnea data que el user no esta authorized a ver
- Authorization failures returnean `FORBIDDEN`, no empty results

```graphql
directive @auth(requires: Role!) on FIELD_DEFINITION

enum Role {
  ADMIN
  MANAGER
  USER
  PUBLIC
}

type User {
  id: ID!
  email: String! @auth(requires: ADMIN)
  orders: [Order!]! @auth(requires: USER)
  auditLog: [AuditEntry!]! @auth(requires: ADMIN)
}
```

---

## 7. Rate Limiting y Cost Control

### 7.1 Rate Limiting

```javascript
// Per-user rate limiting
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100,        // 100 requests
  duration: 60,       // per 60 seconds
});

// En context middleware
async function checkRateLimit(user) {
  try {
    await rateLimiter.consume(user.id);
  } catch {
    throw new GraphQLError('Rate limit exceeded', {
      extensions: { code: 'RATE_LIMITED', retryAfter: 60 },
    });
  }
}
```

### 7.2 Cost Control Rules

- Maximum query depth: 10
- Maximum query complexity: 1000
- Maximum aliases per field: 5
- Rate limit: 100 requests per minute per user
- Mutation rate limit: 30 per minute per user
- Subscription limit: 10 concurrent per user
- File upload size limit: 10MB
- Response size limit: 5MB

---

## 8. Versioning y Evolution

### 8.1 Versioning Rules

- No URL-based versioning (no `/v2/graphql`)
- Schema evolution es additive only
- Breaking changes van a traves de deprecation process (min 6 months)
- New fields pueden ser added sin versioning
- Field removal requiere zero usage por 30 days
- Type changes requieren new type creation + deprecation

### 8.2 Allowed Changes (Non-Breaking)

```text
Adding:
  - New fields a existing types
  - New types
  - New enum values (con documentation)
  - New optional arguments
  - New interfaces

Changing:
  - Field description
  - Directive arguments (additive)
```

### 8.3 Forbidden Changes (Breaking)

```text
Removing:
  - Fields
  - Types
  - Enum values
  - Arguments

Changing:
  - Field type (String → Int)
  - Non-null a nullable (acceptable pero discouraged)
  - Nullable a non-null (breaking)
  - Argument defaults
  - Argument types
```

---

## 9. Federation Rules

### 9.1 Entity Design

- Cada subgraph ownea sus domain types
- Entity types usan `@key(fields: "id")` para cross-subgraph references
- `__resolveReference` implemented para all entities
- No subgraph extends mas de 3 types de other subgraphs
- Shared scalars y enums definidos en un shared package

```graphql
# Products subgraph
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  categoryId: ID!
}

# Reviews subgraph — extends Product
type Product @key(fields: "id") @extends {
  id: ID! @external
  reviews: [Review!]!
  averageRating: Float!
}
```

### 9.2 Federation Checklist

- [ ] Entity keys son globally unique
- [ ] No circular subgraph dependencies
- [ ] Custom scalars shared via npm package
- [ ] Composed schema validado con `rover`
- [ ] Subgraph health monitoreado independently
- [ ] Gateway puede routear queries cuando un subgraph esta down

## Preguntas Frecuentes

### ¿Deberia usar subscriptions o webhooks para real-time updates?

Usa subscriptions para user-facing real-time features (chat, notifications, live dashboards). Usa webhooks para server-to-server integrations. Subscriptions maintain un persistent connection y scalean differently que queries/mutations. Si tenes mas de 1000 concurrent subscriptions per server, considera un dedicated subscription endpoint o external pub/sub system (Redis, NATS). Webhooks son mas reliable para integrations porque retrian on failure.

### ¿Cómo handleo file uploads en GraphQL?

Usa el `graphql-upload` package con el multipart request specification. Define un custom `Upload` scalar. Enforce file size limits (10MB default). Valida file types server-side. Storea files en object storage (S3, GCS) y returna el URL en el mutation payload. No base64-encodees files en mutations — bloatea el request y breakea proxies.

### ¿Cuál es el right page size para list queries?

Default a 20 items per page. Maximum 100. Para expensive queries (joins, aggregations), reduce el maximum a 50. Exposea el default y maximum en tu schema documentation. Deja a clients requestear smaller pages pero no larger. Para admin dashboards que necesitan bulk data, provee un separate export endpoint en vez de allowear large pages.

### ¿Cómo testeo GraphQL resolvers?

Unit testea resolvers en isolation mockeando el data layer. Testea el parent argument, args, context, y info. Integration testea el full schema con un test database. Testea edge cases: null returns, error codes, authorization failures, rate limiting. Usa snapshot testing para complex query responses. Testea subscriptions connecteando un test client y verificando event delivery.

### ¿Cuándo deberia split un monolithic schema en federation?

Splitea cuando teams necesitan independent deployment cycles, cuando el schema excede 200 types, cuando different domains tienen different scaling requirements, o cuando team boundaries mapean a domain boundaries. No splitees prematuramente — federation agrega operational complexity (gateway, composition, cross-subgraph debugging). Empeza con un modular monolith y splitea cuando el pain de coupling excede el pain de federation.
