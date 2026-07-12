---





contentType: patterns
slug: graphql-mutation-validation-pattern
title: "Patron GraphQL Mutation Validation"
description: "Centraliza la validacion de inputs para mutaciones GraphQL usando validadores personalizados, directivas de esquema y respuestas de error estructuradas."
metaDescription: "Patron GraphQL mutation validation: centraliza validacion de inputs con validadores y codigos de error. Validacion a nivel de campo en Apollo Server."
difficulty: intermediate
topics:
  - graphql
  - design
tags:
  - graphql
  - mutation
  - validation
  - patron
  - input-validation
  - error-handling
  - typescript
  - apollo-server
relatedResources:
  - /patterns/graphql-error-extension-pattern
  - /patterns/graphql-dataloader-pattern
  - /recipes/graphql-input-validation
  - /patterns/graphql-federated-entity-pattern
  - /patterns/backend-for-frontend-pattern
  - /patterns/graphql-connection-pagination-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron GraphQL mutation validation: centraliza validacion de inputs con validadores y codigos de error. Validacion a nivel de campo en Apollo Server."
  keywords:
    - graphql mutation validation
    - graphql input validation
    - apollo server validation
    - graphql error handling
    - centralized validation graphql
    - graphql custom scalars





---

# Patron GraphQL Mutation Validation

## Descripcion general

Las mutaciones GraphQL aceptan input types que necesitan validacion antes de procesarse. Sin un enfoque centralizado, cada resolver repite logica de validacion: comprobar campos requeridos, validar formatos de email, exigir longitudes de string, verificar rangos numericos. Esto lleva a reglas y formatos de error inconsistentes entre mutaciones.

El patron mutation validation centraliza la validacion en validadores reutilizables. Cada mutacion pasa su input por un pipeline de validacion que devuelve errores estructurados con rutas de campo y codigos legibles por maquina. Los resolvers se enfocan en logica de negocio, no en checking de input.

## Cuando usarlo


- For alternatives, see [GraphQL Connection Pagination Pattern](/es/patterns/graphql-connection-pagination-pattern/).

- Tienes multiples mutaciones que aceptan input de usuario
- Las reglas de validacion se repiten entre resolvers
- Necesitas detalles de error a nivel de campo para renderizar formularios
- Quieres separar la validacion de la logica de negocio
- Necesitas codigos de error consistentes entre todas las mutaciones

## Solucion

### Framework de validacion

```typescript
import { GraphQLError } from 'graphql';

type ValidationRule = {
  field: string;
  rule: (value: any, input: Record<string, any>) => boolean;
  message: string;
  code: string;
};

function validateInput(input: Record<string, any>, rules: ValidationRule[]): void {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  for (const rule of rules) {
    const value = input[rule.field];
    if (!rule.rule(value, input)) {
      errors.push({
        field: rule.field,
        message: rule.message,
        code: rule.code,
      });
    }
  }

  if (errors.length > 0) {
    throw new GraphQLError('Validation failed', {
      extensions: {
        code: 'VALIDATION_ERROR',
        fields: errors.map(e => e.field),
        errors,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

### Reglas de validacion reutilizables

```typescript
const rules = {
  required: (field: string): ValidationRule => ({
    field,
    rule: (value) => value !== undefined && value !== null && value !== '',
    message: `${field} is required`,
    code: 'REQUIRED',
  }),

  minLength: (field: string, min: number): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'string' && value.length >= min,
    message: `${field} must be at least ${min} characters`,
    code: 'MIN_LENGTH',
  }),

  maxLength: (field: string, max: number): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'string' && value.length <= max,
    message: `${field} must be at most ${max} characters`,
    code: 'MAX_LENGTH',
  }),

  email: (field: string): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: `${field} must be a valid email address`,
    code: 'INVALID_EMAIL',
  }),

  range: (field: string, min: number, max: number): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'number' && value >= min && value <= max,
    message: `${field} must be between ${min} and ${max}`,
    code: 'OUT_OF_RANGE',
  }),

  url: (field: string): ValidationRule => ({
    field,
    rule: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: `${field} must be a valid URL`,
    code: 'INVALID_URL',
  }),
};
```

### Uso de validadores en resolvers

```typescript
const resolvers = {
  Mutation: {
    createUser: async (_, { input }, context) => {
      validateInput(input, [
        rules.required('name'),
        rules.minLength('name', 2),
        rules.maxLength('name', 100),
        rules.required('email'),
        rules.email('email'),
        rules.maxLength('bio', 500),
        rules.url('website'),
      ]);

      const existing = await context.db.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );
      if (existing.length > 0) {
        throw new GraphQLError('Email already registered', {
          extensions: {
            code: 'DUPLICATE_EMAIL',
            field: 'email',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const user = await context.db.query(
        'INSERT INTO users (name, email, bio, website) VALUES ($1, $2, $3, $4) RETURNING *',
        [input.name, input.email, input.bio || null, input.website || null]
      );
      return user[0];
    },

    updatePost: async (_, { input }, context) => {
      validateInput(input, [
        rules.required('id'),
        rules.required('title'),
        rules.minLength('title', 5),
        rules.maxLength('title', 200),
        rules.required('body'),
        rules.minLength('body', 50),
        rules.range('status', 0, 3),
      ]);

      const post = await context.db.query(
        'UPDATE posts SET title = $1, body = $2, status = $3 WHERE id = $4 RETURNING *',
        [input.title, input.body, input.status, input.id]
      );
      if (post.length === 0) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND', timestamp: new Date().toISOString() },
        });
      }
      return post[0];
    },
  },
};
```

### Validacion a nivel de esquema con custom scalars

```typescript
import { GraphQLScalarType, GraphQLError } from 'graphql';

const EmailScalar = new GraphQLScalarType({
  name: 'Email',
  description: 'A validated email address',

  parseValue: (value: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new GraphQLError('Invalid email format', {
        extensions: { code: 'INVALID_EMAIL', field: 'email' },
      });
    }
    return value.toLowerCase().trim();
  },

  parseLiteral: (ast: any) => {
    if (ast.kind !== 'StringValue') {
      throw new GraphQLError('Email must be a string', {
        extensions: { code: 'INVALID_TYPE' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ast.value)) {
      throw new GraphQLError('Invalid email format', {
        extensions: { code: 'INVALID_EMAIL' },
      });
    }
    return ast.value.toLowerCase().trim();
  },

  serialize: (value: string) => value,
});

const typeDefs = `
  scalar Email

  input CreateUserInput {
    name: String!
    email: Email!
    bio: String
    website: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
`;
```

### Manejo de errores en el cliente

```typescript
async function createUser(input: CreateUserInput) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) { id name email }
      }`,
      variables: { input },
    }),
  });
  const { data, errors } = await response.json();

  if (errors) {
    const validationError = errors.find(e => e.extensions?.code === 'VALIDATION_ERROR');
    if (validationError) {
      const fieldErrors = validationError.extensions.errors;
      for (const err of fieldErrors) {
        setFieldError(err.field, err.message);
      }
      return null;
    }
    throw new Error(errors[0].message);
  }
  return data.createUser;
}
```

## Explicacion

El patron separa la validacion en tres capas:

1. **Validacion a nivel de esquema** — custom scalars (como `Email`) validan en la fase de parse. Los valores invalidos se rechazan antes de que el resolver se ejecute. Este es el punto de validacion mas temprano.

2. **Validacion basada en reglas** — la funcion `validateInput` ejecuta una lista de reglas contra el objeto de input. Cada regla comprueba un campo y devuelve un error estructurado si la comprobacion falla. Todas las reglas se ejecutan, por lo que el cliente obtiene todos los errores a la vez.

3. **Validacion de negocio** — las comprobaciones que requieren acceso a base de datos (email duplicado, existencia de foreign key) se ejecutan en el resolver despues de que la validacion de reglas pase. Estas lanzan errores de un solo campo ya que son especificas a la logica de negocio.

El patron error extension se integra naturalmente: todos los errores de validacion llevan `code: 'VALIDATION_ERROR'` con un array `fields` y un array detallado `errors`. Los clientes hacen switch sobre el codigo y renderizan errores a nivel de campo.

## Variantes

| Enfoque | Capa | Ideal para |
|---------|------|------------|
| Custom scalars | Parse de esquema | Validacion de formato (email, URL, fecha) |
| Validadores basados en reglas | Entrada del resolver | Reglas a nivel de campo (requerido, longitud, rango) |
| Directivas de esquema | Validacion de esquema | Autorizacion y rate limiting |
| Esquemas Zod | Entrada del resolver | Proyectos TypeScript con inferencia de tipos |
| Esquemas Joi/Yup | Entrada del resolver | Validacion de objetos anidados complejos |

## Buenas practicas

- **Valida temprano, valida una vez** — usa custom scalars para checks de formato para que los valores invalidos nunca lleguen al resolver
- **Devuelve todos los errores a la vez** — recolecta todos los fallos de validacion antes de lanzar. Los clientes pueden mostrar todos los errores de campo en un ciclo de render.
- **Usa codigos de error consistentes** — `REQUIRED`, `MIN_LENGTH`, `INVALID_EMAIL` en todas las mutaciones para que los clientes los manejen genericamente
- **Separa formato de validacion de negocio** — checks de formato (patron email) en validadores, checks de negocio (email duplicado) en resolvers
- **Sanitiza despues de validar** — trimea strings, pasa a minusculas emails, normaliza URLs despues de que la validacion pase pero antes de la insercion en base de datos

## Errores comunes

- **Lanzar en el primer error** — devolver un error por peticion fuerza a los clientes a enviar, corregir, reenviar repetidamente. Recolecta todos los errores primero.
- **Validar en el cuerpo del resolver** — mezclar validacion con logica de negocio hace ambos mas dificiles de testear y mantener. Ejecuta validacion primero, luego logica de negocio.
- **No usar custom scalars** — validar formato de email en cada resolver que acepta un email es repetitivo. Crea un scalar `Email` una vez.
- **Formatos de error inconsistentes** — algunos resolvers devuelven `field: "email"`, otros `path: ["input", "email"]`. Estandariza el formato.
- **Saltar validacion en updates** — las mutaciones `updatePost` necesitan validacion tambien, aunque algunos campos sean opcionales. Valida los campos presentes.

## Preguntas frecuentes

### Debo usar custom scalars o validadores basados en reglas?

Ambos. Custom scalars manejan validacion de formato (patron email, formato URL) a nivel de esquema. Validadores basados en reglas manejan reglas de negocio (longitud minima, campos requeridos, rangos) a nivel de resolver. Se complementan.

### Puedo usar Zod para validacion GraphQL?

Si. Define un esquema Zod para cada input type y llama `schema.parse(input)` al inicio de cada resolver. Zod proporciona inferencia de tipos y rutas de error detalladas. El inconveniente es duplicar la definicion del esquema (una en tipos GraphQL, otra en Zod).

### Como manejo validacion de inputs anidados?

Aplana los campos anidados en la respuesta de error: `address.street`, `address.city`. La propiedad `field` en el objeto de error soporta notacion de punto. Los clientes pueden mapear esto a estructuras de formulario anidadas.

### Que pasa con file uploads?

Los file uploads de GraphQL usan el paquete `graphql-upload` o peticiones multipart. Valida tamano de archivo, tipo MIME y extension en el resolver antes de procesar. Los custom scalars no funcionan bien para inputs de archivo.
