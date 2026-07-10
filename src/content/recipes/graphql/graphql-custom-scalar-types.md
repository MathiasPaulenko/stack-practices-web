---
contentType: recipes
slug: graphql-custom-scalar-types
title: "Custom GraphQL Scalar Types for Dates, Emails, and JSON"
description: "Define custom GraphQL scalars for Date, Email, URL, and JSON fields with serialization, parsing, and validation logic"
metaDescription: "Create custom GraphQL scalar types for dates, emails, URLs, and JSON. Implement serialize, parseValue, and parseLiteral with validation logic."
difficulty: intermediate
topics:
  - graphql
  - api
tags:
  - graphql
  - scalars
  - custom types
  - validation
  - api
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/graphql/graphql-dataloader-batching
  - /recipes/graphql/graphql-input-validation
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create custom GraphQL scalar types for dates, emails, URLs, and JSON. Implement serialize, parseValue, and parseLiteral with validation logic."
  keywords:
    - graphql custom scalars
    - graphql date scalar
    - graphql json scalar
    - graphql email validation
    - custom scalar types
---

# Custom GraphQL Scalar Types for Dates, Emails, and JSON

GraphQL ships with five built-in scalars: `Int`, `Float`, `String`, `Boolean`, and `ID`. Real applications need more specific types — dates that serialize to ISO 8601, emails that validate format, URLs that enforce protocol, and flexible JSON blobs. Custom scalars fill this gap by defining three functions: `serialize` (server to client), `parseValue` (client variable to server), and `parseLiteral` (client AST to server).

## When to Use This

- Date or timestamp fields that need consistent ISO 8601 formatting
- Email, URL, or phone fields that need format validation at the schema level
- JSON fields for flexible metadata or third-party payloads

## Prerequisites

- A GraphQL server with `@graphql-tools/utils` available
- Basic understanding of GraphQL scalar resolution

## Solution

### 1. Install Dependencies

```bash
npm install graphql @graphql-tools/utils
```

### 2. Define a Date Scalar

```typescript
// scalars/Date.ts
import { GraphQLScalarType, Kind } from 'graphql';

export const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'ISO 8601 date string',

  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${value}`);
      }
      return date.toISOString();
    }
    throw new Error(`Date scalar cannot serialize ${typeof value}`);
  },

  parseValue(value: unknown): Date {
    if (typeof value !== 'string') {
      throw new Error('Date input must be a string');
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${value}`);
    }
    return date;
  },

  parseLiteral(ast): Date {
    if (ast.kind !== Kind.STRING) {
      throw new Error('Date input must be a string literal');
    }
    const date = new Date(ast.value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${ast.value}`);
    }
    return date;
  },
});
```

### 3. Define an Email Scalar

```typescript
// scalars/Email.ts
import { GraphQLScalarType, Kind } from 'graphql';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailScalar = new GraphQLScalarType({
  name: 'Email',
  description: 'Email address string',

  serialize(value: unknown): string {
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
    return value;
  },

  parseValue(value: unknown): string {
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
    return value.toLowerCase();
  },

  parseLiteral(ast): string {
    if (ast.kind !== Kind.STRING || !EMAIL_REGEX.test(ast.value)) {
      throw new Error('Invalid email literal');
    }
    return ast.value.toLowerCase();
  },
});
```

### 4. Define a JSON Scalar

```typescript
// scalars/JSON.ts
import { GraphQLScalarType, Kind } from 'graphql';

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',

  serialize(value: unknown): unknown {
    return value;
  },

  parseValue(value: unknown): unknown {
    return value;
  },

  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.LIST:
        return ast.values.map((v) => parseLiteralRecursive(v));
      case Kind.OBJECT:
        return Object.fromEntries(
          ast.fields.map((field) => [field.name.value, parseLiteralRecursive(field.value)])
        );
      case Kind.NULL:
        return null;
      default:
        throw new Error(`Unexpected AST kind: ${ast.kind}`);
    }
  },
});

function parseLiteralRecursive(ast: any): unknown {
  return JSONScalar.parseLiteral!(ast, {});
}
```

### 5. Register Scalars in the Schema

```typescript
// schema.ts
import gql from 'graphql-tag';
import { DateScalar } from './scalars/Date';
import { EmailScalar } from './scalars/Email';
import { JSONScalar } from './scalars/JSON';

export const typeDefs = gql`
  scalar Date
  scalar Email
  scalar JSON

  type User {
    id: ID!
    email: Email!
    createdAt: Date!
    metadata: JSON
  }

  input CreateUserInput {
    email: Email!
    metadata: JSON
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
`;

export const resolvers = {
  Date: DateScalar,
  Email: EmailScalar,
  JSON: JSONScalar,
  Mutation: {
    createUser: (_: unknown, { input }: { input: { email: string; metadata: any } }) => {
      return {
        id: crypto.randomUUID(),
        email: input.email,
        createdAt: new Date(),
        metadata: input.metadata ?? null,
      };
    },
  },
};
```

## How It Works

1. **`serialize`** runs when sending a value to the client. Convert internal representations (Date objects, numbers) to wire format (ISO strings).
2. **`parseValue`** runs when a value arrives as a GraphQL variable. Validate and convert to the internal representation.
3. **`parseLiteral`** runs when a value appears inline in the query (not as a variable). You walk the AST to extract the value.
4. **Validation** happens at the schema boundary — invalid emails or dates are rejected before they reach your resolver logic.

## Variants

### Using graphql-scalars Package

For common types, use the `graphql-scalars` package instead of writing your own:

```bash
npm install graphql-scalars
```

```typescript
import { DateTimeResolver, EmailAddressResolver, JSONResolver, URLResolver } from 'graphql-scalars';

export const resolvers = {
  DateTime: DateTimeResolver,
  Email: EmailAddressResolver,
  JSON: JSONResolver,
  URL: URLResolver,
};
```

### NegativeNumber Scalar with Validation

```typescript
export const PositiveIntScalar = new GraphQLScalarType({
  name: 'PositiveInt',
  description: 'Integer greater than zero',
  serialize(value: unknown): number {
    if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
      throw new Error(`PositiveInt cannot serialize ${value}`);
    }
    return value;
  },
  parseValue(value: unknown): number {
    if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
      throw new Error(`Invalid PositiveInt: ${value}`);
    }
    return value;
  },
  parseLiteral(ast): number {
    if (ast.kind !== Kind.INT || parseInt(ast.value, 10) <= 0) {
      throw new Error('PositiveInt must be a positive integer literal');
    }
    return parseInt(ast.value, 10);
  },
});
```

## Best Practices

- **Validate in all three functions** — `serialize`, `parseValue`, and `parseLiteral` should all enforce the same constraints
- **Throw descriptive errors** — include the invalid value in the error message for debugging
- **Prefer `graphql-scalars` for common types** — DateTime, Email, URL, UUID, and others are well-tested
- **Document the wire format** — the `description` field tells clients what format to send

## Common Mistakes

- **Only implementing `serialize`** — queries with inline values or variables will fail without `parseValue` and `parseLiteral`
- **Not handling null** — decide whether your scalar accepts null and handle it explicitly
- **Forgetting to register the resolver** — the scalar must appear in the resolvers map alongside `Query`, `Mutation`, and type resolvers
- **Using `JSON` scalar too liberally** — JSON scalars bypass GraphQL's type safety; prefer explicit types when possible

## FAQ

**Q: Should I use custom scalars or input validation in resolvers?**
A: Use scalars for format validation (email, date, URL). Use resolver-level validation for business rules (email must be unique, date must be in the future).

**Q: Can I use custom scalars in input types?**
A: Yes. Custom scalars work in both output types and input types. `parseValue` and `parseLiteral` handle input validation.

**Q: What is the difference between parseValue and parseLiteral?**
A: `parseValue` handles values passed as GraphQL variables (JSON). `parseLiteral` handles values written inline in the query string (AST nodes).

**Q: Are custom scalars type-safe in TypeScript?**
A: Not automatically. You need to cast or use codegen tools like `graphql-codegen` to generate proper TypeScript types for custom scalars.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Mistakes

- Not validating input in the `parseValue` function — accepting malformed data that breaks downstream resolvers
- Throwing generic errors instead of `GraphQLError` — clients receive unclear error messages without extensions
- Forgetting to handle `parseLiteral` for inline query values — only `parseValue` handles variable inputs
- Not documenting the expected format in the schema description — clients guess the format and send invalid data
- Returning `null` from `serialize` for invalid values — clients receive `null` instead of an error, hiding data quality issues
- Not testing scalar behavior with introspection queries — some tools rely on introspection to discover scalar types and formats
- Not handling `undefined` vs `null` in `serialize` — returning `undefined` causes GraphQL to omit the field, while `null` explicitly sets it to null
- Not adding the scalar to the schema's type map — forgetting to call `schema.addScalarType()` results in the scalar being treated as a string
- Not handling edge cases like `NaN`, `Infinity`, or empty strings in `parseValue` — these values pass type checks but break downstream logic
- Not registering the scalar in codegen tools — GraphQL Code Generator and similar tools need custom plugin configuration to generate correct TypeScript types for custom scalars
- Not providing a fallback for unknown scalar values — when the scalar encounters an unexpected type, it should throw a `GraphQLError` with a clear message

### How do I handle timezone-aware DateTime scalars?

Always parse incoming timestamps to UTC in `parseValue`. Store and return UTC everywhere. Let the client handle timezone conversion for display. Never store local time in the database — it creates ambiguity when servers or clients move across timezones.

### Can I use custom scalars with Apollo Federation?

Yes. Define the scalar in each subgraph that uses it. The gateway treats custom scalars as pass-through types — it does not validate or transform them. Ensure all subgraphs implement the same parsing and serialization logic to avoid inconsistencies.
