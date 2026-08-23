---
contentType: patterns
slug: graphql-mutation-validation-pattern
title: "Patrón GraphQL Mutation Validation: Validación de Inputs Centralizada"
description: "Centralizá la validación de mutaciones GraphQL con reglas reutilizables, scalars y errores estructurados. Ejemplos en TypeScript y mejores prácticas."
metaDescription: "Centralizá la validación de mutaciones GraphQL con reglas reutilizables, scalars y errores estructurados. Ejemplos en TypeScript y mejores prácticas."
difficulty: intermediate
topics:
  - graphql
  - design
tags:
  - graphql
  - mutation
  - validation
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
lastUpdated: "2026-08-23"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Centralizá la validación de mutaciones GraphQL con reglas reutilizables, scalars y errores estructurados. Ejemplos en TypeScript y mejores prácticas."
  keywords:
    - graphql mutation validation
    - graphql input validation
    - apollo server validation
    - graphql error handling
    - centralized validation graphql
    - graphql custom scalars
---

## Descripción General

Las mutaciones GraphQL te pasan inputs que tenés que validar antes de la lógica de negocio. Sin un enfoque
centralizado, cada resolver termina rehaciendo las mismas comprobaciones: campos requeridos, formato de email,
longitud de strings, rangos numéricos. Esa duplicación produce reglas y formatos de error inconsistentes en
toda la API.

El patrón GraphQL Mutation Validation canaliza la validación de inputs a través de un pipeline reutilizable. Cada
mutación pasa
su input por un conjunto de reglas y recibe una lista estructurada de errores a nivel de campo con códigos legibles
por máquina. Así los resolvers pueden enfocarse en la lógica de negocio y dejar de preocuparse por los inputs.

## Cuándo Usarlo

Usalo cuando tengas varias mutaciones que acepten input de usuario y las mismas reglas de validación aparezcan una
y otra vez en distintos resolvers. También sirve cuando el cliente necesita detalles de error a nivel de campo para
renderizar formularios, cuando querés códigos de error consistentes en toda la API y cuando querés separar la
validación de la lógica de negocio.

## Cuándo Evitarlo

Evitalo para una sola mutación con uno o dos campos simples. Un pipeline de validación agrega overhead que puede
no valer la pena. También evitalo si la base de datos o el esquema ya manejan toda la validación. Y no lo
introduzcas
a menos que el cliente pueda consumir errores estructurados a nivel de campo; para herramientas internas suele
bastar con un `BAD_REQUEST` genérico.

## Solución

### Framework de Validación

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

### Reglas de Validación Reutilizables

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

### Uso de Validadores en Resolvers

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

### Validación a Nivel de Esquema con Scalars Personalizados

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

### Manejo de Errores en el Cliente

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

## Explicación

El patrón organiza la validación en tres capas.

La validación a nivel de esquema usa scalars personalizados como `Email` para rechazar valores inválidos durante
el parseo, antes de que el resolver se ejecute. Esta es la primera barrera que frena inputs inválidos.

La validación basada en reglas invoca a `validateInput` sobre el objeto de input. Cada regla revisa un campo; si
falla, agrega un error. Se ejecutan todas las reglas, así el cliente recibe todos los errores en un solo
mensaje.

La validación de negocio cubre comprobaciones que necesitan la base de datos, como emails duplicados o la
existencia de foreign keys. Estas corren en el resolver después de que pase la validación por reglas y suelen
devolver un error de un solo campo ligado a una regla de negocio específica.

Todos los errores de validación comparten el mismo formato de extensiones con un `code`, un array `fields` y un
array detallado `errors`. Los clientes pueden mirar el código y decidir qué mensaje mostrar a nivel de campo.

## Variantes

Los scalars personalizados actúan en el parseo del esquema. Funcionan bien para controles estrictos de formato,
como email, URL o fecha. Los validadores basados en reglas entran en juego cuando arranca el resolver y se encargan
de reglas a nivel de campo como requerido, longitud y rango. Las directivas de esquema sirven para autorización y
rate limiting. Zod encaja en proyectos TypeScript que quieren inferencia de tipos, mientras que Joi o Yup sirven
para objetos anidados complejos.

Un pipeline basado en reglas cubre la mayoría de los casos.

## Mejores Prácticas

Validá temprano con scalars personalizados para que los valores inválidos no lleguen al resolver. Devolvé todos los
errores de validación juntos, así el cliente puede mostrar todos los problemas de campo a la vez. Usá
códigos de error consistentes como `REQUIRED`, `MIN_LENGTH` e `INVALID_EMAIL` en todas las mutaciones. Dejá los
cheques de formato en los validadores y los de negocio en los resolvers. Después de que la validación pase,
sanitizá los inputs — trim, minúsculas en emails, normalizar URLs — pero antes de escribir a la base de datos.

## Errores Comunes

Lanzar un error en el primero obliga al cliente a un bucle de enviar-corregir-reenviar, así que recolectá todas las
fallas primero. Mezclar validación con lógica de negocio en el resolver hace ambas más difíciles de testear;
ejecutá la validación primero y la lógica de negocio después. Validar el formato de email en cada resolver es
repetitivo, así que creá un scalar `Email` una vez. Cuando los resolvers devuelven distintas formas de error, el
cliente no sabe a qué campo aplicar el error. Estandarizá en una sola forma para que no se pierda. Y no te saltes
la validación en
mutaciones de actualización; validá también los campos opcionales cuando están presentes.

## Preguntas Frecuentes

### ¿Debería usar scalars personalizados o validadores basados en reglas?

Usá ambos. Los scalars personalizados se encargan de la validación de formato a nivel de esquema; los validadores
basados en reglas se encargan de las reglas de negocio como longitud, campos requeridos y rangos a nivel de
resolver. Se complementan.

### ¿Puedo usar Zod para validación GraphQL?

Sí. Definí un esquema Zod para cada input type y llamá `schema.parse(input)` al inicio de cada resolver. Zod te da
inferencia de tipos y rutas de error detalladas. El costo es duplicar la definición del esquema, una en los tipos
GraphQL y otra en Zod.

### ¿Cómo manejo validación de inputs anidados?

Reportá los campos anidados como paths planos en el error. Por ejemplo, devolvé `address.street` y `address.city`
para mantener el path legible. La propiedad `field` entiende notación de punto, así los clientes pueden mapear esos
valores a campos de formulario anidados.

### ¿Qué pasa con file uploads?

Los file uploads de GraphQL usan el paquete `graphql-upload` o peticiones multipart. Revisá tamaño de archivo,
tipo MIME y extensión en el resolver antes de procesar. Los scalars personalizados no manejan bien los inputs de
archivo.
