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


- For alternatives, see [Complete Guide to GraphQL Security](/es/guides/complete-guide-graphql-security/).

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

### Guard de complejidad de query

Usa una directiva para limitar la profundidad o costo de query:

```graphql
directive @cost(complexity: Int!) on FIELD_DEFINITION

type Query {
  users: [User!]! @cost(complexity: 10)
  allPosts: [Post!]! @cost(complexity: 50)
}
```

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

### ¿Cómo testeo auth a nivel campo?

Envia consultas con diferentes tokens de usuario y verifica que los campos protegidos retornen errores o null segun el rol. Crea un helper de test que construya contexto con diferentes roles y permisos para ejecutar queries contra el schema.

### ¿Las directivas afectan el rendimiento?

Las directivas añaden una capa de wrapper al resolver, pero el overhead es mínimo (una llamada de función adicional). El impacto real está en la lógica de auth — si verificas permisos contra una base de datos en cada campo, usa caching (Redis, en memoria) para evitar queries repetidas.

### ¿Puedo usar directivas con Apollo Federation?

Sí, pero cada subgrafo debe implementar la directiva independientemente. El gateway no re-ejecuta directivas de los subgrafos. Define las directivas en el schema de cada subgrafo y aplica las reglas de auth ahí mismo.

### ¿Cómo combino auth basada en roles con ownership?

Usa directivas apiladas: `@auth(requires: EDITOR) @owner`. La directiva `@auth` verifica el rol primero. Si pasa, `@owner` verifica que el usuario sea el dueño del recurso. Si falla cualquiera de las dos, el campo retorna error o null según la configuración.

## Errores Comunes Adicionales

- Aplicar directivas de auth solo a nivel de query — las mutations y subscriptions también necesitan protección
- Retornar mensajes de error detallados que filtran información del schema — usa mensajes genéricos `FORBIDDEN` en producción
- No cachear las verificaciones de permisos — los lookups repetidos a la base de datos por campo crean cuellos de botella de rendimiento
- Olvidar testear directivas con requests no autenticados — asegúrate de que los campos públicos funcionen sin token
- No aplicar `@auth` a campos de interfaz — las implementaciones pueden exponer campos sin checks de auth, evadiendo la directiva
- Usar `@auth` solo en campos de lista — los items individuales pueden seguir exponiendo datos sensibles si la lista no se filtra server-side
- No versionar las implementaciones de directivas — cambiar la lógica de auth sin versionar rompe clientes existentes que dependen de shapes de error específicos
- Asumir que las directivas se ejecutan en un orden predecible — el orden de ejecución depende del servidor GraphQL, no asumas left-to-right
- Confiar solo en checks de auth del lado del cliente — el servidor debe enforcear las directivas, nunca confíes en el cliente para filtrar campos sensibles
- No loggear decisiones de auth — sin logs de allow/deny por directiva, no puedes auditar violaciones de acceso ni detectar patrones sospechosos
- No testear la composición de directivas — directivas apiladas como `@auth @owner` pueden short-circuit en órdenes inesperadas dependiendo de la implementación del servidor GraphQL
- Olvidar que las directivas no se heredan en tipos de unión — cada tipo miembro de un `union` debe tener sus propias directivas de auth
- No documentar el comportamiento de auth en el schema — los desarrolladores de clientes no saben qué campos requieren auth sin documentación explícita
- No proporcionar mensajes de error localizados — los clientes internacionales reciben errores en inglés sin contexto cultural
- Olvidar que las directivas se aplican después de los resolvers de campo — si el resolver ejecuta lógica costosa antes de que la directiva la rechace, desperdicias recursos del servidor
- No considerar el impacto en el rendimiento de las directivas anidadas — cada directiva añade overhead al resolver, mide el impacto con herramientas de profiling antes de usar muchas directivas apiladas
- No proporcionar un mecanismo de override para administradores — los superusuarios necesitan bypass de auth para debugging y soporte, implementa una directiva `@adminOverride` separada
- Usar directivas de auth en campos computados — los campos computados derivan de otros campos, protegerlos sin proteger la fuente crea inconsistencias
- No sincronizar las directivas con la documentación del API — cuando cambias las reglas de auth, actualiza la documentación del API simultaneamente para evitar confusión en los consumidores
- No usar directivas con argumentos dinámicos — hardcodear roles en el schema reduce flexibilidad, usa argumentos como `@auth(requires: $requiredRole)` para permitir configuración por entorno
- No manejar la degradación de directivas en versiones anteriores del schema — clientes que usan versiones antiguas del schema pueden no enviar los campos que la directiva necesita para evaluar permisos
- No testear directivas con diferentes combinaciones de roles — un usuario con múltiples roles puede tener acceso no intencionado si las directivas usan OR en lugar de AND para combinar permisos
- Olvidar que las directivas de auth no se aplican a campos de error — los campos en los objetos de error pueden filtrar información sensible, sanitiza los errores antes de retornarlos al cliente
- No usar directivas de auth en campos de metadata — campos como `createdAt`, `updatedAt` pueden parecer inofensivos pero pueden filtrar información sobre patrones de uso del sistema
- No usar directivas de auth en campos de subscription — las subscriptions de GraphQL mantienen conexiones persistentes, las directivas de auth se evalúan solo al inicio y no en cada mensaje
- No considerar el impacto de las directivas en el caching — los campos protegidos por directivas no pueden ser cacheados a nivel de gateway sin invalidar el cache cuando los permisos cambian
- No documentar el orden de evaluación de las directivas — los desarrolladores de clientes no saben en qué orden se aplican las directivas apiladas, lo que puede causar comportamientos inesperados
- No usar directivas de auth en campos de input — los argumentos de input pueden contener datos sensibles que necesitan validación de auth antes de ser procesados por el resolver
- No manejar el caso de directivas faltantes — si una directiva de auth no está registrada en el servidor, el campo se expone sin protección, siempre verifica que todas las directivas estén cargadas
- No usar directivas de auth en campos de fragment — los fragments pueden expandir campos que el cliente no tiene permiso para ver, aplica auth a nivel de campo individual
- No testear directivas con diferentes versiones del schema — cambios en el schema pueden romper la lógica de las directivas existentes, usa tests de regresión para cada versión del schema
- No usar directivas de auth en campos de enum — los valores de enum pueden filtrar información sobre estados internos del sistema, protege los campos que los exponen
- No considerar el impacto de las directivas en el tamaño del bundle del cliente — los clientes que generan tipos a partir del schema incluyen las directivas en el bundle, lo que puede aumentar el tamaño innecesariamente
- No usar directivas de auth en campos de paginación — los campos como `totalCount` pueden filtrar información sobre el número total de registros accesibles para el usuario
- No documentar las directivas con ejemplos de uso — los desarrolladores de clientes necesitan ejemplos claros de cómo las directivas afectan las queries y mutations
- No usar directivas de auth en campos de agregación — los campos como `sum`, `avg`, `count` pueden filtrar información financiera o de negocio si no están protegidos
- No usar directivas de auth en campos de relación — los campos de relación pueden exponer datos de entidades relacionadas que el usuario no tiene permiso para ver
- No usar directivas de auth en campos de debugging — los campos de debugging como `__typename` pueden filtrar información sobre la estructura interna del schema
- No usar directivas de auth en campos de introspection — los campos de introspection pueden exponer información sensible sobre el schema a usuarios no autorizados

### ¿Debo usar directivas de schema o middleware para auth?

Las directivas de schema son declarativas y visibles en el schema, lo que facilita auditar permisos. El middleware es imperativo y más difícil de auditar pero ofrece más flexibilidad. Usa directivas para verificaciones simples de rol/permiso. Usa middleware para lógica compleja dependiente del contexto que no puede expresarse declarativamente.
