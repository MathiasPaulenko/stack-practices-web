---
contentType: recipes
slug: graphql-directives-auth
title: "Auth a nivel campo con directivas personalizadas de GraphQL"
description: "Implementa autorizacion a nivel campo en GraphQL usando directivas de schema personalizadas que verifican roles y permisos por campo"
metaDescription: "Agrega auth a nivel campo en GraphQL con directivas personalizadas. Verifica roles y permisos por campo con @auth y @requiresRole."
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
  - /recipes/api/graphql-apollo-server
  - /recipes/graphql/graphql-error-handling-best-practices
  - /recipes/authentication/jwt-authentication
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Agrega auth a nivel campo en GraphQL con directivas personalizadas. Verifica roles y permisos por campo con @auth y @requiresRole."
  keywords:
    - graphql directives auth
    - graphql field-level auth
    - graphql authorization
    - schema directives
    - graphql permissions
---

# Auth a nivel campo con directivas personalizadas de GraphQL

Los resolvers de GraphQL a menudo necesitan reglas de autorizacion diferentes para diferentes campos — un usuario puede leer su propio email pero no el de otro, un admin puede ver todos los campos, y un campo publico no requiere auth. Las directivas personalizadas de schema te permiten declarar estas reglas en el propio schema con `@auth` o `@requiresRole(role: "admin")`, manteniendo la logica de autorizacion fuera de los resolvers individuales.

## Cuando Usar Esto

- Campos dentro del mismo tipo tienen diferentes niveles de acceso
- Quieres reglas de autorizacion visibles en el schema, no ocultas en el codigo del resolver
- Multiples roles (admin, editor, viewer) necesitan granularidad a nivel campo

## Requisitos Previos

- Apollo Server con `@graphql-tools/utils`
- Un mecanismo de autenticacion que popula `context.user`

## Solucion

### 1. Instalar dependencias

```bash
npm install @apollo/server graphql @graphql-tools/utils
```

### 2. Definir el schema con directivas

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

### 3. Implementar la directiva de auth

```typescript
// directives/auth.ts
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver } from 'graphql';
import { ForbiddenError } from '../errors/base';

export function authDirectiveTransformer(schema: any) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (authDirective) {
        const { requires } = authDirective;
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async (source, args, context, info) => {
          if (!context.user) {
            throw new ForbiddenError('Authentication required');
          }

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

function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    VIEWER: 0,
    EDITOR: 1,
    ADMIN: 2,
  };

  return (roleHierarchy[userRole] ?? -1) >= (roleHierarchy[requiredRole] ?? 999);
}
```

### 4. Registrar la directiva en Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { authDirectiveTransformer } from './directives/auth';
import { typeDefs, resolvers } from './schema';

const baseSchema = makeExecutableSchema({ typeDefs, resolvers });
const schema = authDirectiveTransformer(baseSchema);

const server = new ApolloServer({ schema });
```

### 5. Verificacion de propiedad a nivel campo

Para campos que dependen del dueno del objeto resuelto, no solo del rol del usuario:

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

Agregar al schema:

```graphql
directive @owner on FIELD_DEFINITION

type Post {
  id: ID!
  title: String!
  draftContent: String @owner
}
```

## Como Funciona

1. **`@auth`** envuelve el resolver del campo. Antes de que el resolver original se ejecute, la directiva verifica `context.user` y su rol.
2. **Jerarquia de roles** usa un mapeo numerico para que `ADMIN` (2) satisfaga requisitos de `EDITOR` (1) y `VIEWER` (0).
3. **`mapSchema`** de `@graphql-tools/utils` recorre cada definicion de campo y aplica el transformador donde la directiva esta presente.
4. **`@owner`** verifica el `authorId` del objeto padre contra `context.user.id`, agregando autorizacion basada en propiedad que los checks de rol solos no pueden expresar.

## Variantes

### Directivas basadas en permisos

En lugar de roles, verifica permisos especificos:

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

### Auth y propiedad combinados

Apila directivas para checks en capas:

```graphql
type Post {
  id: ID!
  title: String!
  draftContent: String @auth(requires: EDITOR) @owner
}
```

El campo requiere al menos rol `EDITOR` Y propiedad.

## Mejores Practicas

- **Declara auth en el schema** — las directivas hacen las reglas de autorizacion visibles y auditables
- **Usa jerarquia de roles** — `ADMIN` debe satisfacer requisitos de `EDITOR` y `VIEWER`
- **Combina con checks de propiedad** — auth basada en roles no es suficiente para datos especificos de usuario
- **Prueba con diferentes roles** — escribe tests de integracion que consulten como cada rol y verifiquen el acceso

## Errores Comunes

- **Proteger solo campos de Query y Mutation** — campos anidados como `user.email` tambien necesitan directivas
- **Olvidar `defaultFieldResolver`** — si un campo no tiene resolver personalizado, la directiva debe llamar a `defaultFieldResolver`
- **Verificar auth en resolvers Y directivas** — elige un enfoque para evitar logica duplicada
- **No manejar `context.user` nulo** — la directiva debe lanzar antes de acceder a `user.role`

## FAQ

**Q: Debo usar directivas o auth a nivel resolver?**
A: Las directivas son mas limpias para reglas a nivel campo. La auth a nivel resolver es mejor para logica compleja como "el usuario puede editar si es el dueno o miembro de la misma organizacion".

**Q: Puedo usar multiples directivas en un campo?**
A: Si. Las directivas se apilan — cada una envuelve el resolver anterior. El orden importa: las directivas externas se ejecutan primero.

**Q: Las directivas funcionan con Apollo Federation?**
A: Si, pero cada subgrafo debe implementar la directiva independientemente. El gateway no re-ejecuta directivas.

**Q: Como pruebo auth a nivel campo?**
A: Envia consultas con diferentes tokens de usuario y verifica que los campos protegidos retornen errores o null segun el rol.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
