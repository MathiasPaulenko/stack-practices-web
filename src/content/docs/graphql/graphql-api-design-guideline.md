---



contentType: docs
slug: graphql-api-design-guideline
templateType: guideline
title: "GraphQL API Design Guideline"
description: "Internal guidelines for designing GraphQL APIs: schema structure, naming, mutation patterns, error handling, pagination, authentication, rate limiting, versioning, and federation rules with code examples."
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
  - /docs/graphql-schema-review-checklist
  - /docs/graphql-deprecation-policy-template
  - /guides/complete-guide-graphql-federation
  - /docs/graphql-federation-onboarding-template
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

This document defines internal guidelines for designing GraphQL APIs at our organization. All teams building GraphQL services must follow these rules to ensure consistency, security, and performance across our API surface.

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
  # Single resource by ID
  user(id: ID!): User
  node(id: ID!): Node
  
  # List with pagination
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

- One schema file per domain (e.g., `users.graphql`, `orders.graphql`)
- Shared types in `shared.graphql`
- Custom scalars in `scalars.graphql`
- No type defined in multiple files
- Schema stitched or federated — never duplicated

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

- Queries must be read-only — no side effects
- Single resource queries accept `id: ID!` argument
- List queries use Connection pattern with `first`, `after`, `last`, `before`
- List queries accept a `filter` argument for filtering
- List queries accept a `sort` argument for ordering
- No query returns more than 100 items per page
- No nested queries deeper than 10 levels

```graphql
type Query {
  # Single resource
  product(id: ID!): Product
  productBySlug(slug: String!): Product
  
  # List with full pagination
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

- All mutations take a single `input` argument
- All mutations return a payload type (not the entity directly)
- Payload types include the mutated entity and error array
- Mutation names start with a verb: `create`, `update`, `delete`, `archive`, `restore`
- Bulk mutations use plural: `createUsers`, `deleteProducts`
- No partial success — mutations are all-or-nothing

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
- Payload includes the mutated entity (nullable — null on error)
- Payload includes `userErrors: [UserError!]!` (empty array on success)
- Payload may include related fields (e.g., `orderCount` after `createOrder`)
- No generic `success: Boolean` field — presence of entity indicates success

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

- Never expose stack traces or internal paths
- Field-level errors include the `field` path
- Error messages are user-friendly, not developer-facing
- Error codes are stable and documented
- Rate limit errors include `retryAfter` in the error extension
- Internal errors are logged with correlation IDs
- No error message contains PII or secrets

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

## 6. Authentication and Authorization

### 6.1 Authentication

```javascript
// Authentication via JWT in Authorization header
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

- Every field resolver checks authorization
- Use `@auth` directive or middleware for field-level auth
- Public fields explicitly marked as public
- Admin-only fields check role before resolving
- No field returns data the user is not authorized to see
- Authorization failures return `FORBIDDEN`, not empty results

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

## 7. Rate Limiting and Cost Control

### 7.1 Rate Limiting

```javascript
// Per-user rate limiting
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100,        // 100 requests
  duration: 60,       // per 60 seconds
});

// In context middleware
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

## 8. Versioning and Evolution

### 8.1 Versioning Rules

- No URL-based versioning (no `/v2/graphql`)
- Schema evolution is additive only
- Breaking changes go through deprecation process (min 6 months)
- New fields can be added without versioning
- Field removal requires zero usage for 30 days
- Type changes require new type creation + deprecation

### 8.2 Allowed Changes (Non-Breaking)

```text
Adding:
  - New fields to existing types
  - New types
  - New enum values (with documentation)
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
  - Non-null to nullable (acceptable but discouraged)
  - Nullable to non-null (breaking)
  - Argument defaults
  - Argument types
```

---

## 9. Federation Rules

### 9.1 Entity Design

- Each subgraph owns its domain types
- Entity types use `@key(fields: "id")` for cross-subgraph references
- `__resolveReference` implemented for all entities
- No subgraph extends more than 3 types from other subgraphs
- Shared scalars and enums defined in a shared package

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

- [ ] Entity keys are globally unique
- [ ] No circular subgraph dependencies
- [ ] Custom scalars shared via npm package
- [ ] Composed schema validated with `rover`
- [ ] Subgraph health monitored independently
- [ ] Gateway can route queries when one subgraph is down

## FAQ

### Should I use subscriptions or webhooks for real-time updates?

Use subscriptions for user-facing real-time features (chat, notifications, live dashboards). Use webhooks for server-to-server integrations. Subscriptions maintain a persistent connection and scale differently than queries/mutations. If you have more than 1000 concurrent subscriptions per server, consider a dedicated subscription endpoint or external pub/sub system (Redis, NATS). Webhooks are more reliable for integrations because they retry on failure.

### How do I handle file uploads in GraphQL?

Use the `graphql-upload` package with the multipart request specification. Define a custom `Upload` scalar. Enforce file size limits (10MB default). Validate file types server-side. Store files in object storage (S3, GCS) and return the URL in the mutation payload. Do not base64-encode files in mutations — it bloats the request and breaks proxies.

### What is the right page size for list queries?

Default to 20 items per page. Maximum 100. For expensive queries (joins, aggregations), reduce the maximum to 50. Expose the default and maximum in your schema documentation. Let clients request smaller pages but not larger ones. For admin dashboards that need bulk data, provide a separate export endpoint rather than allowing large pages.

### How do I test GraphQL resolvers?

Unit test resolvers in isolation by mocking the data layer. Test the parent argument, args, context, and info. Integration test the full schema with a test database. Test edge cases: null returns, error codes, authorization failures, rate limiting. Use snapshot testing for complex query responses. Test subscriptions by connecting a test client and verifying event delivery.

### When should I split a monolithic schema into federation?

Split when teams need independent deployment cycles, when the schema exceeds 200 types, when different domains have different scaling requirements, or when team boundaries map to domain boundaries. Do not split prematurely — federation adds operational complexity (gateway, composition, cross-subgraph debugging). Start with a modular monolith and split when the pain of coupling exceeds the pain of federation.

## See Also

- [GraphQL Federation in Production](/guides/complete-guide-graphql-federation-production/)
- [Complete Guide to GraphQL Federation](/guides/complete-guide-graphql-federation/)
- [Complete Guide to GraphQL Schema Design](/guides/complete-guide-graphql-schema-design/)
- [GraphQL Federated Entity Pattern](/patterns/graphql-federated-entity-pattern/)
- [Set Up a GraphQL Federation Gateway with Apollo](/recipes/graphql-federation-gateway-setup/)

