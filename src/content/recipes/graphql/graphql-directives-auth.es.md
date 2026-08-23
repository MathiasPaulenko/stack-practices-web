---
contentType: recipes
slug: graphql-directives-auth
title: "Auth a nivel campo con directivas GraphQL personalizadas"
description: "Agrega autorización a nivel campo en GraphQL con directivas de schema personalizadas. Verifica roles, permisos y propiedad por campo en Apollo Server."
metaDescription: "Agrega autorización a nivel campo en GraphQL con directivas de schema personalizadas. Verifica roles, permisos y propiedad por campo en Apollo Server."
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
  metaDescription: "Agrega autorización a nivel campo en GraphQL con directivas de schema personalizadas. Verifica roles, permisos y propiedad por campo en Apollo Server."
  keywords:
    - graphql directives auth
    - graphql field-level auth
    - graphql authorization
    - schema directives
    - graphql permissions
---

## Visión General

Cada campo de GraphQL puede tener su propia regla de autorización. Por ejemplo, un usuario lee su propio
email pero no el de otro, un admin ve todos los campos, y un campo público no requiere auth. Las directivas
personalizadas de schema te permiten declarar estas reglas en el propio schema con `@auth` o
`@auth(requires: ADMIN)`, manteniendo la lógica de autorización fuera de los
resolvers individuales.

## Cuándo Usar

Las directivas de auth personalizadas son una buena opción cuando los campos dentro del mismo tipo
necesiten diferentes niveles de acceso. También sirven cuando querés que las reglas se vean en el schema
y no estén escondidas en el código del resolver. Si tu app tiene roles como admin, editor y viewer y
necesitás granularidad a nivel campo, las directivas lo manejan limpio. También sirven cuando un campo
debiera ser visible solo para el dueño del objeto, sin importar el rol del que consulta.

## Cuándo Evitar

Evitá las directivas personalizadas cuando tu auth sea gruesa y ya viva en el API gateway o a nivel de
ruta. Tampoco son la mejor opción si tus reglas son demasiado complejas para expresarlas declarativamente,
como membresía multi-tenant. Las versiones viejas de Apollo Server pueden no soportar `mapSchema`; en ese
caso, usá un plugin de Apollo o middleware de resolvers.

## Solución

### 1. Instalar dependencias

```bash
npm install @apollo/server graphql @graphql-tools/schema @graphql-tools/utils
```

### 2. Definir el schema con directivas

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

### 3. Implementar la directiva de auth

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

### 4. Implementar la directiva de propiedad

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

### 5. Registrar las directivas en Apollo Server

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

## Explicación

`@auth` envuelve el resolver del campo. Antes de que el resolver original se ejecute, verifica
`context.user` y el rol requerido. La jerarquía de roles usa un mapeo numérico para que `ADMIN` (2)
satisfaga requisitos de `EDITOR` (1) y `VIEWER` (0).

`mapSchema` de `@graphql-tools/utils` recorre cada definición de campo y aplica el transformador donde
aparezca la directiva. Se preserva el resolver original, o se usa `defaultFieldResolver` cuando el campo no
tiene un resolver personalizado.

`@owner` verifica el `authorId` del objeto padre contra `context.user.id`. Eso agrega autorización basada
en propiedad que los checks de rol solos no pueden expresar. Los admins todavía pasan; eso es intencional
para que el soporte técnico acceda a datos de usuario.

## Variantes

La auth basada en roles con `@auth` es el punto de partida más común. Si necesitás control más fino, usá
`@hasPermission` para verificar acciones específicas como `post:delete` en lugar de roles anchos. La
directiva `@owner` agrega verificación de propiedad, y las directivas apiladas como
`@auth(requires: EDITOR) @owner` requieren ambas. También podés usar directivas para rate limiting o
límites de profundidad con `@cost`.

### Directivas basadas en permisos

En lugar de roles, verificá permisos específicos:

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

### Auth y propiedad combinados

Apilá directivas para checks en capas:

```graphql
type Post {
  id: ID!
  title: String!
  draftContent: String @auth(requires: EDITOR) @owner
}
```

El campo requiere al menos `EDITOR` y propiedad.

### Guard de complejidad de query

También podés usar una directiva para limitar el costo de la query:

```graphql
directive @cost(complexity: Int!) on FIELD_DEFINITION

type Query {
  users: [User!]! @cost(complexity: 10)
  allPosts: [Post!]! @cost(complexity: 50)
}
```

Eso te da un guard de costo básico sin tocar resolvers.

## Mejores Prácticas

Declará auth en el schema para que las reglas sean visibles y fáciles de auditar. Para profundizar, consultá
la [guía completa de seguridad GraphQL](/es/guides/complete-guide-graphql-security/). Usá jerarquía de
roles para que `ADMIN` satisfaga requisitos de `EDITOR` y `VIEWER`. Combiná checks de rol con verificaciones
de propiedad, porque la auth basada en roles no es suficiente para datos específicos de usuario.

Probá distintos roles enviando queries con diferentes valores de `context.user` y verificando quién accede a
qué. Cacheá las búsquedas de permisos para evitar consultar la base de datos en cada resolver. En
producción, retorná mensajes genéricos `FORBIDDEN`; mensajes detallados pueden filtrar información del
schema.

## Errores Comunes

Proteger solo campos de `Query` y `Mutation` es un error común. Campos anidados como `user.email` también
necesitan directivas. No te olvides de `defaultFieldResolver`; si un campo no tiene resolver personalizado,
la directiva debe llamarlo.

Verificar auth en resolvers y directivas al mismo tiempo genera lógica duplicada, así que elegí un enfoque.
Siempre manejá `context.user` nulo y lanzá antes de tocar `user.role`. Aplicar directivas solo en campos de
lista es riesgoso; los items individuales pueden seguir exponiendo datos sensibles si la lista no se filtra
server-side.

No te saltees los requests no autenticados. Los campos públicos deberían funcionar sin token, o tu landing
page y queries públicas se romperán. Cuando apiles directivas, documentá el orden de evaluación para que tu
equipo no se lleve una sorpresa con un short-circuit.

## Preguntas Frecuentes

### ¿Debería usar directivas o auth a nivel resolver?

Las directivas andan bien para reglas simples a nivel campo. La auth a nivel resolver es la mejor opción
cuando la lógica se pone compleja, como permitir una edición solo para el dueño o miembros de la misma
organización.

### ¿Puedo usar múltiples directivas en un campo?

Sí. Las directivas se apilan y cada una envuelve el resolver anterior. El orden importa, porque las
directivas externas se ejecutan primero.

### ¿Funcionan las directivas con Apollo Federation?

Funcionan, pero cada subgrafo tiene que implementar la directiva por su cuenta. El gateway no re-ejecuta
las directivas de los subgrafos.

### ¿Cómo pruebo auth a nivel campo?

Enviá queries con diferentes tokens de usuario y verificá que los campos protegidos retornen errores o null
según el rol. Un helper chico que cambie `context.user` por cada rol y permiso hace esto mucho más rápido.

### ¿Cómo combino auth basada en roles con ownership?

Apilá las directivas: `@auth(requires: EDITOR) @owner`. La directiva `@auth` verifica el rol primero. Si
pasa, `@owner` verifica que el usuario sea el dueño del recurso. Si falla cualquiera de las dos, el campo
retorna error o null, según tu configuración.
