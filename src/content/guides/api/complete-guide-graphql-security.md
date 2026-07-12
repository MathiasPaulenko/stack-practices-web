---





contentType: guides
slug: complete-guide-graphql-security
title: "Complete Guide to GraphQL Security"
description: "Secure GraphQL APIs against introspection leaks, query depth attacks, cost-based DoS, batching abuse, and injection. Covers auth patterns, rate limiting, and production hardening."
metaDescription: "Secure GraphQL APIs against introspection, depth attacks, cost DoS, batching abuse, and injection. Covers auth patterns, rate limiting, and production hardening."
difficulty: advanced
topics:
  - graphql
  - security
  - api
tags:
  - graphql
  - security
  - guide
  - introspection
  - depth-limiting
  - cost-analysis
  - rate-limiting
  - authentication
relatedResources:
  - /guides/complete-guide-graphql-schema-design
  - /guides/graphql-vs-rest-guide
  - /patterns/graphql-interface-polymorphism-pattern
  - /recipes/graphql-directives-auth
  - /guides/complete-guide-graphql-caching
  - /guides/complete-guide-graphql-testing
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Secure GraphQL APIs against introspection, depth attacks, cost DoS, batching abuse, and injection. Covers auth patterns, rate limiting, and production hardening."
  keywords:
    - graphql security
    - graphql introspection
    - graphql depth limiting
    - graphql cost analysis
    - graphql rate limiting
    - graphql authentication
    - graphql dos protection





---

## Introduction

GraphQL APIs are capable for clients and dangerous for attackers. A single endpoint accepts arbitrary queries, which means the server must defend against queries that are deeply nested, excessively complex, or designed to extract sensitive data. REST APIs limit exposure through fixed endpoints; GraphQL exposes the full schema and lets clients construct any query. The following walks through the attack surface and the defenses you need in production.

## Attack Surface

GraphQL APIs face these primary threats:

- **Introspection leaks**: The schema reveals all types, fields, and relationships
- **Query depth attacks**: Deeply nested queries cause recursive resolver calls
- **Cost-based DoS**: Expensive queries (many fields, large lists) consume server resources
- **Batching abuse**: Clients send many queries in one request to bypass rate limits
- **Injection**: User input passed to resolvers reaches databases or external services
- **Information disclosure**: Error messages reveal internal structure or data

## Introspection Control

### Disable in Production

Introspection lets anyone discover your entire schema. In production, disable it.

```javascript
import { ApolloServer } from "@apollo/server";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false, // Disable in production
});
```

### Enable for Authorized Users Only

If you need introspection for internal tools, gate it behind authentication.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
  plugins: [
    {
      async requestDidForOperation(requestContext) {
        if (requestContext.operation?.operation === "query") {
          const query = requestContext.request.query || "";
          if (query.includes("__schema") || query.includes("__type") ) {
            const user = requestContext.contextValue.user;
            if (!user || user.role !== "ADMIN") {
              throw new Error("Introspection is disabled");
            }
          }
        }
      },
    },
  ],
});
```

### Persisted Queries as Alternative

Instead of exposing introspection, use persisted queries. Clients send a query hash instead of the full query. The server maps the hash to a pre-registered query. Clients never see the full schema.

```javascript
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginCacheControl } from "@apollo/server/plugin/cacheControl";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false,
  // Only allow persisted queries
  allowBatchedHttpRequests: false,
});
```

## Query Depth Limiting

A query like `user { posts { author { posts { author { ... } } } } }` can recurse indefinitely. Each level triggers resolver calls and database queries. Limit the maximum depth.

```javascript
import depthLimit from "graphql-depth-limit";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)], // Max 10 levels deep
});
```

### Choosing a Depth Limit

Analyze your schema to determine the maximum legitimate depth. A typical e-commerce schema might need:

- `query { users { orders { items { product { category { name } } } } } }` = depth 6

Set the limit to the maximum legitimate depth plus a small margin (e.g., 10 for a max legitimate depth of 7).

## Query Cost Analysis

Depth limiting alone is not enough. A shallow query with 100 fields or a list with 1000 items can be expensive. Cost analysis assigns a cost to each field and rejects queries that exceed a budget.

### Static Cost Calculation

```javascript
import costAnalysis from "graphql-cost-analysis";

const costAnalyzer = costAnalysis({
  maximumCost: 1000,
  variables: {},
  createCost: 1,      // Cost of a create mutation
  readCost: 1,        // Cost of reading a field
  updateCost: 1,      // Cost of an update mutation
  deleteCost: 1,      // Cost of a delete mutation
  complexityCost: 2,  // Cost of a field with arguments
  listMultiplier: 10, // Multiplier for list fields
  onSuccess: (cost) => console.log(`Query cost: ${cost}`),
  onError: (cost, maximumCost) => {
    throw new Error(`Query cost ${cost} exceeds maximum ${maximumCost}`);
  },
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [costAnalyzer],
});
```

### Cost-Based Field Directives

Annotate expensive fields with cost directives so the analyzer can calculate accurately.

```graphql
type Query {
  users(first: Int = 10): [User!]! @cost(complexity: 2, multipliers: ["first"])
  search(term: String!, limit: Int = 20): [SearchResult!]! @cost(complexity: 5, multipliers: ["limit"])
  report(startDate: DateTime!, endDate: DateTime!): Report @cost(complexity: 50)
}
```

### Dynamic Cost with @listSize

For relay connections, use `@listSize` to estimate the number of items returned.

```graphql
type UserConnection {
  edges: [UserEdge!]! @cost(complexity: 1, multipliers: ["first"], useMultipliers: true)
}
```

## Rate Limiting

### Per-Operation Rate Limiting

Rate limit by operation name or query hash, not just by IP. This prevents one client from flooding the server with different queries.

```javascript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute per IP
  message: "Too many requests",
});

app.use("/graphql", limiter);
```

### Cost-Aware Rate Limiting

Combine cost analysis with rate limiting. Track the total cost of queries per client, not just the count. A client that sends 10 cheap queries should not hit the same limit as one that sends 10 expensive ones.

```javascript
const clientCosts = new Map(); // clientId -> { cost, resetAt }

function checkCostBudget(clientId, queryCost) {
  const now = Date.now();
  let entry = clientCosts.get(clientId);
  
  if (!entry || entry.resetAt < now) {
    entry = { cost: 0, resetAt: now + 60000 }; // 1 minute window
    clientCosts.set(clientId, entry);
  }
  
  if (entry.cost + queryCost > 5000) {
    throw new Error(`Cost budget exceeded: ${entry.cost + queryCost} > 5000`);
  }
  
  entry.cost += queryCost;
}
```

## Authentication and Authorization

### Authentication in Context

Authenticate at the HTTP layer, not in the schema. Extract the user from the request and put it in the context.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return { user: null };
    
    const user = await verifyToken(token);
    return { user };
  },
});
```

### Field-Level Authorization

Check permissions in resolvers. Do not rely on the client to avoid querying sensitive fields.

```javascript
const resolvers = {
  User: {
    email: (user, _args, ctx) => {
      if (!ctx.user) throw new ForbiddenError("Not authenticated");
      if (ctx.user.id !== user.id && ctx.user.role !== "ADMIN") {
        throw new ForbiddenError("Not authorized to view email");
      }
      return user.email;
    },
    ssn: (user, _args, ctx) => {
      if (ctx.user?.role !== "ADMIN") {
        throw new ForbiddenError("SSN requires admin access");
      }
      return user.ssn;
    },
  },
};
```

### Schema Directives for Authorization

Use custom directives to declare required roles on fields. This makes permissions visible in the schema.

```graphql
type Query {
  adminDashboard: AdminDashboard @auth(requires: ADMIN)
  userSettings: UserSettings @auth(requires: USER)
}

directive @auth(requires: Role!) on FIELD_DEFINITION

enum Role {
  ADMIN
  USER
  GUEST
}
```

```javascript
const { SchemaDirectiveVisitor } = require("@graphql-tools/utils");
const { defaultFieldResolver } = require("graphql");

class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const requiredRole = this.args.requires;
    const originalResolve = field.resolve || defaultFieldResolver;
    
    field.resolve = async (root, args, ctx, info) => {
      if (!ctx.user) throw new ForbiddenError("Not authenticated");
      if (ctx.user.role !== requiredRole && ctx.user.role !== "ADMIN") {
        throw new ForbiddenError(`Requires ${requiredRole} role`);
      }
      return originalResolve(root, args, ctx, info);
    };
  }
}
```

## Batching Abuse Prevention

GraphQL clients like Apollo Client batch multiple queries into one request. Attackers can abuse this to send hundreds of queries in a single HTTP request, bypassing rate limits that count HTTP requests.

### Limit Batch Size

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: true,
  // Limit to 10 operations per batch
  plugins: [{
    async requestDidForOperation() {
      // Check batch size in context
    },
  }],
});

// Express middleware to limit batch size
app.use("/graphql", (req, res, next) => {
  if (Array.isArray(req.body) && req.body.length > 10) {
    return res.status(400).json({ error: "Batch size limit: 10 operations" });
  }
  next();
});
```

## Injection Prevention

### SQL Injection via Resolvers

GraphQL does not prevent SQL injection. If a resolver passes user input directly to a database query, it is vulnerable.

```javascript
// VULNERABLE: string concatenation
const resolvers = {
  Query: {
    userByName: (_root, { name }, ctx) => {
      return ctx.db.query(`SELECT * FROM users WHERE name = '${name}'`);
    },
  },
};

// SAFE: parameterized query
const resolvers = {
  Query: {
    userByName: (_root, { name }, ctx) => {
      return ctx.db.query("SELECT * FROM users WHERE name = $1", [name]);
    },
  },
};
```

### NoSQL Injection

Be careful with objects passed to NoSQL databases. A query input like `{ "email": { "$ne": null } }` can match all documents.

```javascript
// VULNERABLE: passing raw input to MongoDB
const resolvers = {
  Query: {
    search: (_root, { filter }, ctx) => {
      return ctx.db.users.find(filter).toArray(); // filter could be { $where: "true" }
    },
  },
};

// SAFE: whitelist fields and sanitize
const resolvers = {
  Query: {
    search: (_root, { filter }, ctx) => {
      const safeFilter = {
        name: filter.name,
        email: filter.email,
      };
      // Remove undefined fields
      Object.keys(safeFilter).forEach(k => safeFilter[k] === undefined && delete safeFilter[k]);
      return ctx.db.users.find(safeFilter).toArray();
    },
  },
};
```

## Error Handling for Security

### Hide Internal Errors

Do not expose stack traces, database error messages, or internal paths to clients. Return generic errors with structured codes.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Log full error server-side
    console.error(error);
    
    // Return sanitized error to client
    if (formattedError.extensions?.code === "INTERNAL_SERVER_ERROR") {
      return {
        message: "Internal server error",
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      };
    }
    return formattedError;
  },
});
```

### Avoid Data Leakage in Errors

Do not include sensitive data in error messages. Instead of "User with email alice@example.com not found", return "User not found".

## Production Hardening Checklist

- [ ] Introspection disabled in production
- [ ] Query depth limit set (e.g., 10)
- [ ] Query cost analysis with maximum cost budget
- [ ] Rate limiting per IP and per operation
- [ ] Authentication required for all non-public queries
- [ ] Field-level authorization on sensitive fields
- [ ] Batch size limited (e.g., 10 operations)
- [ ] SQL/NoSQL injection prevention (parameterized queries, input sanitization)
- [ ] Error messages sanitized (no stack traces, no internal data)
- [ ] HTTPS enforced
- [ ] CORS configured to allow only trusted origins
- [ ] Logging for suspicious queries (high cost, deep nesting, introspection attempts)
- [ ] Persisted queries for public-facing APIs
- [ ] Query allowlist for known client operations

## FAQ

### Should I disable introspection in production?

Yes. Introspection reveals your entire schema to anyone who can send a query. Attackers use this to find sensitive fields and craft targeted queries. Disable it in production and use persisted queries or a schema registry for internal tools.

### Is GraphQL less secure than REST?

GraphQL has a wider attack surface because it accepts arbitrary queries. REST limits exposure through fixed endpoints. However, GraphQL with proper depth limiting, cost analysis, and auth is as secure as REST. The key is to apply the same security principles (auth, rate limiting, input validation) to GraphQL.

### How do I prevent N+1 queries from being exploited?

Use DataLoader for batch loading. Cost analysis catches queries that request many list fields. Depth limiting prevents recursive nesting. Combined, these defenses prevent most N+1-based DoS attacks.

### What is a persisted query?

A persisted query is a query that is pre-registered with the server. The client sends a hash instead of the full query text. The server looks up the query by hash. This prevents clients from sending arbitrary queries, reducing the attack surface to only pre-approved operations.

### How do I handle CORS for GraphQL?

Set CORS to allow only your known client origins. Do not use `Access-Control-Allow-Origin: *` with credentials. Configure specific origins in your server middleware.

```javascript
import cors from "cors";

app.use("/graphql", cors({
  origin: ["https://app.example.com", "https://admin.example.com"],
  credentials: true,
}));
```

### Should I use a WAF for GraphQL?

Yes. A Web Application Firewall with GraphQL awareness (like Cloudflare GraphQL Protection or AWS WAF) can block malicious queries before they reach your server. Look for WAFs that understand GraphQL operation types, depth, and complexity.

## See Also

- [Validate and Sanitize GraphQL Input Types Server-Side](/recipes/graphql-input-validation/)
- [API Security Checklist — Authentication to Encryption](/guides/api-security-checklist-guide/)
- [Complete Guide to API Security](/guides/complete-guide-api-security/)
- [Complete Guide to Authentication Patterns](/guides/complete-guide-authentication-patterns/)
- [Field-Level Auth with Custom GraphQL Schema Directives](/recipes/graphql-directives-auth/)

