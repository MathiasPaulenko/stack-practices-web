---
contentType: recipes
slug: graphql-directives-auth
title: "Field-Level Auth with Custom GraphQL Directives"
description: "Add field-level authorization to GraphQL with custom schema directives. Check roles, permissions, and ownership per field in Apollo Server."
metaDescription: "Add field-level authorization to GraphQL with custom schema directives. Check roles, permissions, and ownership per field in Apollo Server."
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
lastUpdated: "2026-08-23"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Add field-level authorization to GraphQL with custom schema directives. Check roles, permissions, and ownership per field in Apollo Server."
  keywords:
    - graphql directives auth
    - graphql field-level auth
    - graphql authorization
    - schema directives
    - graphql permissions
---

## Overview

Every GraphQL field can have its own authorization rule. For example, a user reads their own email but not
someone else's, an admin sees every field, and a public field needs no auth. Custom schema directives let
you declare these rules in the schema itself with `@auth` or `@auth(requires: ADMIN)`,
keeping authorization logic out of individual resolvers.

## When to Use

Use custom auth directives when fields inside the same type need different access levels. They also help
when you want rules visible in the schema instead of buried in resolver code. If your app has roles like
admin, editor, and viewer, and you need field-level granularity, directives handle that cleanly. They're
also useful when a field should be visible only to the object owner, regardless of the viewer's role.

## When to Avoid

Skip custom directives when your auth is coarse-grained and already lives at the API gateway or route level.
They also aren't the best choice if your rules are too complex to express declaratively, like multi-tenant
org membership. Older Apollo Server versions may not support `mapSchema`; in that case, use a custom Apollo
plugin or resolver middleware.

## Solution

### 1. Install Dependencies

```bash
npm install @apollo/server graphql @graphql-tools/schema @graphql-tools/utils
```

### 2. Define the Schema with Directives

```typescript
// schema.ts
import { gql } from 'graphql-tag';

export const typeDefs = gql`
  directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION
  directive @owner on FIELD_DEFINITION

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
    draftContent: String @auth(requires: EDITOR) @owner
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
import { defaultFieldResolver, GraphQLError } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

const roleHierarchy: Record<string, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

function hasRole(userRole: string, requiredRole: string): boolean {
  return (roleHierarchy[userRole] ?? -1) >= (roleHierarchy[requiredRole] ?? 999);
}

export function authDirectiveTransformer(schema: any) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (!authDirective) return fieldConfig;

      const { requires } = authDirective;
      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = async (source, args, context, info) => {
        if (!context.user) {
          throw new GraphQLError('Authentication required', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        if (requires && !hasRole(context.user.role, requires)) {
          throw new GraphQLError(`Requires role: ${requires}`, {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        return resolve(source, args, context, info);
      };

      return fieldConfig;
    },
  });
}
```

### 4. Implement the Owner Directive

```typescript
// directives/owner.ts
import { defaultFieldResolver, GraphQLError } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

export function ownerDirectiveTransformer(schema: any) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const ownerDirective = getDirective(schema, fieldConfig, 'owner')?.[0];
      if (!ownerDirective) return fieldConfig;

      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = async (source, args, context, info) => {
        if (!context.user) {
          throw new GraphQLError('Authentication required', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        if (source.authorId && source.authorId !== context.user.id) {
          if (context.user.role !== 'ADMIN') {
            throw new GraphQLError('You can only access your own data', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
        }

        return resolve(source, args, context, info);
      };

      return fieldConfig;
    },
  });
}
```

### 5. Register the Directives in Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { authDirectiveTransformer } from './directives/auth';
import { ownerDirectiveTransformer } from './directives/owner';
import { typeDefs, resolvers } from './schema';

let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = authDirectiveTransformer(schema);
schema = ownerDirectiveTransformer(schema);

const server = new ApolloServer({ schema });

startStandaloneServer(server, {
  context: async ({ req }) => ({
    user: req.headers.authorization ? { id: '1', role: 'EDITOR' } : null,
  }),
}).then(({ url }) => console.log(`Server ready at ${url}`));
```

## Explanation

`@auth` wraps the field resolver. Before the original resolver runs, it checks `context.user` and the
required role. Role hierarchy uses a numeric mapping so `ADMIN` (2) satisfies `EDITOR` (1) and `VIEWER` (0).

`mapSchema` from `@graphql-tools/utils` walks every field definition and applies the transformer wherever
the directive appears. The original `resolve` function is preserved, or `defaultFieldResolver` is used when
the field has no custom resolver.

`@owner` checks the parent object's `authorId` against `context.user.id`. That adds ownership-based
authorization that role checks alone can't handle. Admins still get through; that's intentional so support
staff can pull user data.

## Variants

Role-based auth with `@auth` is the most common starting point. If you need finer control, use
`@hasPermission` to check specific actions like `post:delete` instead of broad roles. The `@owner`
directive adds ownership checks, and stacked directives like `@auth(requires: EDITOR) @owner` require both.
You can also use directives for rate limiting or query depth guards with `@cost`.

### Permission-Based Directives

Instead of roles, check specific permissions:

```typescript
export function permissionDirectiveTransformer(schema: any) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, 'hasPermission')?.[0];
      if (!directive) return fieldConfig;

      const { permission } = directive;
      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = async (source, args, context, info) => {
        if (!context.user?.permissions?.includes(permission)) {
          throw new GraphQLError(`Missing permission: ${permission}`, {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        return resolve(source, args, context, info);
      };

      return fieldConfig;
    },
  });
}
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

The field requires at least `EDITOR` and ownership.

### Query Complexity Guard

You can also use a directive to limit query cost:

```graphql
directive @cost(complexity: Int!) on FIELD_DEFINITION

type Query {
  users: [User!]! @cost(complexity: 10)
  allPosts: [Post!]! @cost(complexity: 50)
}
```

This gives you a basic cost guard without touching resolvers.

## Best Practices

Declare auth in the schema so rules stay visible and easy to audit. See the
[complete guide to GraphQL security](/guides/complete-guide-graphql-security/) for more on GraphQL auth.
Use role hierarchy so
`ADMIN` satisfies `EDITOR` and `VIEWER` requirements. Combine role checks with ownership checks, because
role-based auth alone isn't enough for user-specific data.

Test different roles by sending queries with different `context.user` values and asserting who can see what.
Cache permission lookups so repeated field checks don't hit the database on every resolver. In
production, return generic `FORBIDDEN` messages; detailed error text can leak schema information.

## Common Mistakes

Only protecting `Query` and `Mutation` fields is a common miss. Nested fields like `user.email` need
directives too. Don't forget `defaultFieldResolver`; if a field doesn't have a custom resolver, the directive
must call it.

Checking auth in both resolvers and directives creates duplicated logic, so pick one approach. Always handle
`context.user` being null and throw before you touch `user.role`. Applying directives only on list fields is
risky; individual list items can still expose sensitive data if the list isn't filtered server-side.

Don't skip unauthenticated requests. Public fields should still work without a token, or your landing page
and public queries will break. When stacking directives, document the evaluation order so your team doesn't
get surprised by a short-circuit.

## FAQ

### Should I use directives or resolver-level auth?

Directives work well for straightforward field-level rules. Resolver-level auth is the better choice when the
logic gets complex, like allowing an edit only for the owner or org members.

### Can I use multiple directives on one field?

Yes. Directives stack, and each one wraps the previous resolver. Order matters, because the outer directives
run first.

### Do directives work with Apollo Federation?

They work, but each subgraph has to implement the directive on its own. The gateway won't re-run subgraph
directives.

### How do I test field-level auth?

Send queries with different user tokens and check that protected fields return errors or null based on the
role. A tiny helper that swaps `context.user` for each role and permission makes this much faster.

### How do I combine role-based auth with ownership checks?

Stack the directives: `@auth(requires: EDITOR) @owner`. The `@auth` directive checks the role first. If that
passes, `@owner` verifies the user owns the resource. If either check fails, the field returns an error or
null, depending on your config.
