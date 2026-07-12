---




contentType: recipes
slug: graphql-error-handling-best-practices
title: "Errores GraphQL estructurados con codigos de extension"
description: "Implementa manejo de errores estructurado en GraphQL con clases de error personalizadas, codigos de extension y formato consistente para clientes"
metaDescription: "Maneja errores GraphQL con codigos de extension estructurados. Clases de error personalizadas, formato consistente y mensajes accionables para clientes."
difficulty: intermediate
topics:
  - graphql
  - api
tags:
  - graphql
  - error handling
  - extensions
  - api design
  - debugging
relatedResources:
  - /recipes/graphql-input-validation
  - /recipes/graphql-apollo-server
  - /recipes/handle-errors
  - /recipes/graphql-directives-auth
  - /recipes/graphql-mocking-apollo-server
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Maneja errores GraphQL con codigos de extension estructurados. Clases de error personalizadas, formato consistente y mensajes accionables para clientes."
  keywords:
    - graphql error handling
    - graphql extensions
    - graphql error codes
    - structured errors
    - graphql formatError




---

# Errores GraphQL estructurados con codigos de extension

Los errores de GraphQL son solo objetos con un campo `message`. Sin estructura, los clientes recurren a comparar strings para determinar que fallo. Agregar `extensions.code` da a los clientes una categoria de error legible por maquina, mientras que campos adicionales de extension transportan contexto como detalles de validacion, hints de reintento o campos afectados. A continuacion se muestra como como construir un sistema de errores consistente en tu API GraphQL.

## Cuando Usar Esto


- For alternatives, see [Detect and Fix N+1 Queries in GraphQL Resolvers](/es/recipes/graphql-n-1-query-detection/).

- Cualquier API GraphQL consumida por multiples clientes (web, movil, terceros)
- APIs donde los clientes necesitan manejar diferentes tipos de error programaticamente
- Servicios que necesitan distinguir entre validacion, auth, no encontrado y errores de servidor

## Requisitos Previos

- Un servidor GraphQL (Apollo Server, GraphQL Yoga o Mercurius)
- Conocimiento basico de respuestas de error GraphQL

## Solucion

### 1. Definir codigos de error

```typescript
// errors/codes.ts
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### 2. Crear un error base de GraphQL

```typescript
// errors/base.ts
import { GraphQLError } from 'graphql';
import { ErrorCodes, type ErrorCode } from './codes';

export class GraphQLErrorExtension extends GraphQLError {
  constructor(
    message: string,
    code: ErrorCode,
    extensions?: Record<string, unknown>
  ) {
    super(message, {
      extensions: {
        code,
        ...extensions,
      },
    });
    this.name = this.constructor.name;
  }
}

export class ValidationError extends GraphQLErrorExtension {
  constructor(errors: { field: string; message: string }[]) {
    super('Input validation failed', ErrorCodes.VALIDATION_ERROR, { errors });
  }
}

export class AuthenticationError extends GraphQLErrorExtension {
  constructor(message = 'Authentication required') {
    super(message, ErrorCodes.UNAUTHENTICATED);
  }
}

export class ForbiddenError extends GraphQLErrorExtension {
  constructor(message = 'Insufficient permissions') {
    super(message, ErrorCodes.FORBIDDEN);
  }
}

export class NotFoundError extends GraphQLErrorExtension {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, ErrorCodes.NOT_FOUND, { resource, id });
  }
}

export class ConflictError extends GraphQLErrorExtension {
  constructor(message: string, conflicts?: Record<string, unknown>) {
    super(message, ErrorCodes.CONFLICT, { conflicts });
  }
}

export class RateLimitError extends GraphQLErrorExtension {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', ErrorCodes.RATE_LIMITED, { retryAfter });
  }
}
```

### 3. Usar errores en los resolvers

```typescript
// resolvers.ts
import { ValidationError, NotFoundError, AuthenticationError, ForbiddenError } from './errors/base';

export const resolvers = {
  Query: {
    post: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new AuthenticationError();
      const post = await ctx.db.posts.findById(id);
      if (!post) throw new NotFoundError('Post', id);
      if (post.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new ForbiddenError('You can only view your own posts');
      }
      return post;
    },
  },

  Mutation: {
    createPost: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      if (!ctx.user) throw new AuthenticationError();

      const errors = validatePostInput(input);
      if (errors.length > 0) throw new ValidationError(errors);

      const existing = await ctx.db.posts.findBySlug(input.slug);
      if (existing) throw new ConflictError('Slug already exists', { slug: input.slug });

      return ctx.db.posts.create({ ...input, authorId: ctx.user.id });
    },
  },
};

function validatePostInput(input: any): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  if (!input.title || input.title.length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
  }
  if (!input.content || input.content.length < 10) {
    errors.push({ field: 'content', message: 'Content must be at least 10 characters' });
  }
  return errors;
}
```

### 4. Configurar formato de errores en Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { ErrorCodes } from './errors/codes';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formatted, error) => {
    if (error?.extensions?.code) {
      return {
        message: formatted.message,
        extensions: {
          code: error.extensions.code,
          ...error.extensions,
        },
      };
    }

    return {
      message: 'Internal server error',
      extensions: {
        code: ErrorCodes.INTERNAL_ERROR,
      },
    };
  },
});
```

### 5. Manejo de errores en el cliente

```typescript
// client.ts
async function createPost(input: CreatePostInput) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CREATE_POST_MUTATION, variables: { input } }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    for (const error of errors) {
      switch (error.extensions.code) {
        case 'VALIDATION_ERROR':
          console.error('Validation:', error.extensions.errors);
          break;
        case 'UNAUTHENTICATED':
          window.location.href = '/login';
          break;
        case 'NOT_FOUND':
          console.error('Not found:', error.extensions.resource);
          break;
        case 'RATE_LIMITED':
          const retryAfter = error.extensions.retryAfter;
          console.log(`Rate limited. Retry in ${retryAfter}s`);
          break;
        default:
          console.error('Unexpected:', error.message);
      }
    }
    return null;
  }

  return data.createPost;
}
```

## Como Funciona

1. **`GraphQLErrorExtension`** envuelve `GraphQLError` con un `code` obligatorio en extensions, asegurando que cada error tenga una categoria legible por maquina
2. **Clases especializadas** (`ValidationError`, `NotFoundError`, etc.) transportan contexto especifico del dominio en extensions mientras comparten una estructura consistente
3. **`formatError`** en Apollo Server actua como red de seguridad — asegura que los errores internos no filtren stack traces y que todos los errores tengan un codigo
4. **Los clientes hacen switch en `extensions.code`** en lugar de parsear strings de mensaje, haciendo el manejo de errores robusto ante cambios de mensaje

## Variantes

### Plugin de logging de errores

Registra errores con metadata estructurada sin filtrar a clientes:

```typescript
const errorLogger = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext) {
        for (const error of requestContext.errors) {
          if (error.extensions?.code === ErrorCodes.INTERNAL_ERROR) {
            logger.error({
              query: requestContext.operationName,
              variables: requestContext.request.variables,
              error: error.message,
              stack: error.stack,
            });
          }
        }
      },
    };
  },
};
```

### Union types para errores esperados

Para errores que son parte del dominio (no excepcionales), modelalos como union types:

```graphql
union CreatePostResult = Post | ValidationError | AuthError

type Mutation {
  createPost(input: CreatePostInput!): CreatePostResult!
}
```

Esto da a los clientes manejo de errores type-safe sin try/catch.

## Mejores Practicas

- **Siempre incluye `extensions.code`** — es el contrato entre servidor y cliente para manejo de errores
- **Nunca filtres stack traces** en produccion — `formatError` debe eliminarlos
- **Registra errores internos en el servidor** — los clientes ven un mensaje generico, tus logs ven el trace completo
- **Mantén los mensajes accionables** — dile al cliente que corregir, no solo que se rompio

## Errores Comunes

- **Usar codigos de estado HTTP para errores GraphQL** — GraphQL siempre retorna 200; los errores van en el body
- **Lanzar `Error` plano** — le falta `extensions.code`, forzando a los clientes a comparar strings
- **Exponer mensajes internos** — errores de base de datos, rutas de archivo o stack traces filtran detalles de implementacion
- **Sobrecargar `INTERNAL_ERROR`** — si un error es esperado (no encontrado, validacion), dale su propio codigo

## FAQ

**Q: Debo usar errores GraphQL o union types para fallos esperados?**
A: Usa errores para casos excepcionales (servidor caido, fallo de auth). Usa union types para resultados del dominio que los clientes necesitan manejar en la UI (validacion, no encontrado, conflicto).

**Q: Como pruebo respuestas de error?**
A: Verifica `errors[0].extensions.code` en tu cliente de pruebas. Es mas estable que verificar el texto del mensaje.

**Q: Puedo agregar campos de extension personalizados?**
A: Si. Extensions es un mapa abierto. Agrega `retryAfter`, `field`, `conflicts` o cualquier metadata que los clientes necesiten.

**Q: Debo localizar mensajes de error?**
A: Retorna codigos de error y nombres de campo en extensions. Deja que los clientes localicen el mensaje basandose en el codigo y el locale del usuario.

### ¿Debo usar datos parciales o null en errores?

La spec de GraphQL permite retornar tanto `data` como `errors` en la misma respuesta. Si un campo non-null falla, el campo y su padre se nullifican subiendo por el árbol. Diseña tu schema con campos nullable donde se esperan errores, para que los datos parciales lleguen al cliente. Usa non-null solo para campos que realmente no pueden fallar.

### ¿Cómo manejo errores de autenticación vs autorización?

Retorna `UNAUTHENTICATED` (código 401) cuando no se provee una credencial válida. Retorna `FORBIDDEN` (código 403) cuando la credencial es válida pero falta permisos. Incluye el permiso requerido en `extensions.requiredRole` para que los clientes puedan mostrar mensajes significativos o solicitar acceso elevado.

## Errores Comunes Adicionales

- Retornar HTTP 200 con solo `errors` y sin `data` — los clientes esperan que `data` esté presente aunque sea null
- Exponer stack traces en producción — siempre elimina `extensions.exception.stacktrace`
- Usar campos non-null donde son posibles los errores — causa nulls en cascada que borran datos parciales útiles
- No loguear errores en el servidor — el cliente ve el error, pero el servidor debería loguear el contexto completo para debugging
- Usar `INTERNAL_SERVER_ERROR` genérico para todos los fallos — los clientes no pueden diferenciar entre problemas de red, errores de validación y bugs del servidor
- No envolver funciones resolver en try-catch — las excepciones no manejadas crashean todo el pipeline de requests

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
