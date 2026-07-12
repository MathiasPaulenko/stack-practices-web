---






contentType: recipes
slug: graphql-directives-auth
title: "Field-Level Auth with Custom GraphQL Schema Directives"
description: "Implement field-level authorization in GraphQL using custom schema directives that check user roles and permissions per field"
metaDescription: "Add field-level auth to GraphQL with custom schema directives. Check roles and permissions per field using @auth and @requiresRole directives."
difficulty: advanced
topics:
  - graphql
  - api
  - authentication
tags:
  - graphql
  - directives
  - authorization
  - authentication
  - security
relatedResources:
  - /recipes/graphql-apollo-server
  - /recipes/graphql-error-handling-best-practices
  - /recipes/jwt-authentication
  - /recipes/serverless-api-gateway-lambda-authorizer
  - /recipes/graphql-input-validation
  - /guides/complete-guide-graphql-security
  - /guides/complete-guide-authentication-patterns
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Add field-level auth to GraphQL with custom schema directives. Check roles and permissions per field using @auth and @requiresRole directives."
  keywords:
    - graphql directives auth
    - graphql field-level auth
    - graphql authorization
    - schema directives
    - graphql permissions






---

# Field-Level Auth with Custom GraphQL Schema Directives

GraphQL resolvers often need different authorization rules for different fields — a user can read their own email but not someone else's, an admin can see all fields, and a public field requires no auth. Custom schema directives let you declare these rules in the schema itself with `@auth` or `@requiresRole(role: "admin")`, keeping authorization logic out of individual resolvers.

## When to Use This

- Fields within the same type have different access levels
- You want authorization rules visible in the schema, not hidden in resolver code
- Multiple roles (admin, editor, viewer) need field-level granularity

## Prquisites

- Apollo Server with `@graphql-tools/utils`
- An authentication mechanism that populates `context.user`

## Solution

### 1. Install Dependencies

```bash
npm install @apollo/server graphql @graphql-tools/utils
```

### 2. Define the Schema with Directives

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION

  enum Role {
    ADMIN
    EDITOR
    VIEWER
  }

  type User {
    id: ID!
    name: String!
    email: String @auth(requires: ADMIN)
    role: Role @auth(requires: ADMIN)
    bio: String
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    views: Int @auth(requires: EDITOR)
  }

  type Query {
    me: User @auth
    user(id: ID!): User @auth
    posts: [Post!]!
  }

  type Mutation {
    deletePost(id: ID!): Boolean @auth(requires: ADMIN)
  }
`;
```

### 3. Implement the Auth Directive

```typescript
// directives/auth.ts
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLField } from 'graphql';
import { ForbiddenError } from '../errors/base';

export class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const requiredRole = this.args.requires;
    const originalResolve = field.resolve ?? defaultFieldResolver;

    field.resolve = async (source, args, context, info) => {
      if (!context.user) {
        throw new ForbiddenError('Authentication required');
      }

      if (requiredRole && !hasRole(context.user.role, requiredRole)) {
        throw new ForbiddenError(`Requires role: ${requiredRole}`);
      }

      return originalResolve(source, args, context, info);
    };
  }
}

function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    VIEWER: 0,
    EDITOR: 1,
    ADMIN: 2,
  };

  return (roleHierarchy[userRole] ?? -1) >= (roleHierarchy[requiredRole] ?? 999);
}
```

### 4. Register the Directive in Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { AuthDirective } from './directives/auth';
import { typeDefs, resolvers } from './schema';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  directiveResolvers: {
    auth: AuthDirective,
  },
});

const server = new ApolloServer({ schema });

// For newer @graphql-tools/utils, use schema transforms:
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

function authDirectiveTransformer(schema: any) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (authDirective) {
        const { requires } = authDirective;
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async (source, args, context, info) => {
          if (!context.user) throw new ForbiddenError('Authentication required');
          if (requires && !hasRole(context.user.role, requires)) {
            throw new ForbiddenError(`Requires role: ${requires}`);
          }
          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}

const schemaWithAuth = authDirectiveTransformer(
  makeExecutableSchema({ typeDefs, resolvers })
);

const server = new ApolloServer({ schema: schemaWithAuth });
```

### 5. Field-Level Ownership Check

For fields that depend on the resolved object's owner, not just the user's role:

```typescript
// directives/owner.ts
import { defaultFieldResolver } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { ForbiddenError } from '../errors/base';

export function ownerDirectiveTransformer(schema: any) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const ownerDirective = getDirective(schema, fieldConfig, 'owner')?.[0];
      if (ownerDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async (source, args, context, info) => {
          if (!context.user) throw new ForbiddenError('Authentication required');

          // source is the parent object — check if user owns it
          if (source.authorId && source.authorId !== context.user.id) {
            if (context.user.role !== 'ADMIN') {
              throw new ForbiddenError('You can only access your own data');
            }
          }

          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}
```

Add to schema:

```graphql
directive @owner on FIELD_DEFINITION

type Post {
  id: ID!
  title: String!
  draftContent: String @owner
}
```

## How It Works

1. **`@auth`** wraps the field's resolver. Before the original resolver runs, the directive checks `context.user` and their role.
2. **Role hierarchy** uses a numeric mapping so `ADMIN` (2) satisfies requirements for `EDITOR` (1) and `VIEWER` (0).
3. **`mapSchema`** from `@graphql-tools/utils` walks every field definition and applies the transformer where the directive is present.
4. **`@owner`** checks the parent object's `authorId` against `context.user.id`, adding ownership-based authorization that role checks alone cannot express.

## Variants

### Permission-Based Directives

Instead of roles, check specific permissions:

```graphql
directive @hasPermission(permission: String!) on FIELD_DEFINITION

type Mutation {
  deletePost(id: ID!): Boolean @hasPermission(permission: "post:delete")
}
```

```typescript
fieldConfig.resolve = async (source, args, context, info) => {
  if (!context.user?.permissions?.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return resolve(source, args, context, info);
};
```

### Combined Auth and Owner

Stack directives for layered checks:

```graphql
type Post {
  id: ID!
  title: String!
  draftContent: String @auth(requires: EDITOR) @owner
}
```

The field requires at least `EDITOR` role AND ownership.

### Query Complexity Guard

Use a directive to limit query depth or cost:

```graphql
directive @cost(complexity: Int!) on FIELD_DEFINITION

type Query {
  users: [User!]! @cost(complexity: 10)
  allPosts: [Post!]! @cost(complexity: 50)
}
```

## Best Practices


- For a deeper guide, see [Complete Guide to GraphQL Security](/guides/complete-guide-graphql-security/).

- **Declare auth in the schema** — directives make authorization rules visible and auditable
- **Use role hierarchy** — `ADMIN` should satisfy `EDITOR` and `VIEWER` requirements
- **Combine with ownership checks** — role-based auth is not enough for user-specific data
- **Test with different roles** — write integration tests that query as each role and assert access

## Common Mistakes

- **Only protecting Query and Mutation fields** — nested fields like `user.email` also need directives
- **Forgetting `defaultFieldResolver`** — if a field has no custom resolver, the directive must call `defaultFieldResolver`
- **Checking auth in resolvers AND directives** — pick one approach to avoid duplicated logic
- **Not handling null context.user** — the directive should throw before accessing `user.role`

## FAQ

**Q: Should I use directives or resolver-level auth?**
A: Directives are cleaner for field-level rules. Resolver-level auth is better for complex logic like "user can edit if they are the owner or a member of the same org."

**Q: Can I use multiple directives on one field?**
A: Yes. Directives stack — each wraps the previous resolver. Order matters: outer directives run first.

**Q: Do directives work with Apollo Federation?**
A: Yes, but each subgraph must implement the directive independently. The gateway does not re-run directives.

**Q: How do I test field-level auth?**
A: Send queries with different user tokens and assert that protected fields return errors or null based on the role.

### How do I test field-level auth?

Send queries with different user tokens and assert that protected fields return errors or null based on the role. Create a test helper that builds context with different roles and permissions to run queries against the schema.

### Do directives affect performance?

Directives add a wrapper layer to the resolver, but the overhead is minimal (one extra function call). The real impact is in the auth logic — if you check permissions against a database on every field, use caching (Redis, in-memory) to avoid repeated queries.

### Can I use directives with Apollo Federation?

Yes, but each subgraph must implement the directive independently. The gateway does not re-run subgraph directives. Define directives in each subgraph's schema and apply auth rules there.

## Additional Common Mistakes

- Applying auth directives only at the query level — mutations and subscriptions need protection too
- Returning detailed error messages that leak schema information — use generic `FORBIDDEN` messages in production
- Not caching permission checks — repeated database lookups per field create performance bottlenecks
- Forgetting to test directives with unauthenticated requests — ensure public fields work without a token
- Not applying `@auth` to interface fields — implementations can expose fields without auth checks, bypassing the directive
- Using `@auth` on list fields only — individual items may still expose sensitive data if the list itself is not filtered server-side
- Not versioning directive implementations — changing auth logic without versioning breaks existing clients that depend on specific error shapes
- Relying on client-side auth checks only — the server must enforce directives, never trust the client to filter sensitive fields
- Not testing directive composition — stacked directives like `@auth @owner` may short-circuit in unexpected orders depending on the GraphQL server implementation

### How do I combine role-based auth with ownership checks?

Use stacked directives: `@auth(requires: EDITOR) @owner`. The `@auth` directive checks the role first. If it passes, `@owner` verifies that the user owns the resource. If either fails, the field returns an error or null based on configuration.

### Should I use schema directives or middleware for auth?

Schema directives are declarative and visible in the schema, making it easier to audit permissions. Middleware is imperative and harder to audit but offers more flexibility. Use directives for simple role/permission checks. Use middleware for complex, context-dependent logic that cannot be expressed declaratively.
