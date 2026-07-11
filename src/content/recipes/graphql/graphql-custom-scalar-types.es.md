---
contentType: recipes
slug: graphql-custom-scalar-types
title: "Tipos escalares personalizados en GraphQL para fechas,"
description: "Define escalares GraphQL personalizados para Date, Email, URL y JSON con logica de serializacion, parseo y validacion"
metaDescription: "Crea escalares GraphQL personalizados para fechas, emails, URLs y JSON. Implementa serialize, parseValue y parseLiteral con validacion."
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
  metaDescription: "Crea escalares GraphQL personalizados para fechas, emails, URLs y JSON. Implementa serialize, parseValue y parseLiteral con validacion."
  keywords:
    - graphql custom scalars
    - graphql date scalar
    - graphql json scalar
    - graphql email validation
    - custom scalar types
---

# Tipos escalares personalizados en GraphQL para fechas, emails y JSON

GraphQL incluye cinco escalares nativos: `Int`, `Float`, `String`, `Boolean` e `ID`. Las aplicaciones reales necesitan tipos mas especificos — fechas que serializan a ISO 8601, emails que validan formato, URLs que exigen protocolo y blobs JSON flexibles. Los escalares personalizados llenan este vacio definiendo tres funciones: `serialize` (servidor a cliente), `parseValue` (variable del cliente al servidor) y `parseLiteral` (AST del cliente al servidor).

## Cuando Usar Esto

- Campos de fecha o timestamp que necesitan formato ISO 8601 consistente
- Campos de email, URL o telefono que necesitan validacion de formato a nivel schema
- Campos JSON para metadata flexible o payloads de terceros

## Requisitos Previos

- Un servidor GraphQL con `@graphql-tools/utils` disponible
- Conocimiento basico de resolucion de escalares GraphQL

## Solucion

### 1. Instalar dependencias

```bash
npm install graphql @graphql-tools/utils
```

### 2. Definir un escalar Date

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

### 3. Definir un escalar Email

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

### 4. Definir un escalar JSON

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

### 5. Registrar escalares en el schema

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

## Como Funciona

1. **`serialize`** se ejecuta al enviar un valor al cliente. Convierte representaciones internas (objetos Date, numeros) a formato de red (strings ISO).
2. **`parseValue`** se ejecuta cuando un valor llega como variable GraphQL. Valida y convierte a la representacion interna.
3. **`parseLiteral`** se ejecuta cuando un valor aparece inline en la consulta (no como variable). Recorres el AST para extraer el valor.
4. **La validacion** ocurre en la frontera del schema — emails o fechas invalidos se rechazan antes de llegar a la logica del resolver.

## Variantes

### Usar el paquete graphql-scalars

Para tipos comunes, usa el paquete `graphql-scalars` en lugar de escribir los tuyos:

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

### Escalar PositiveInt con validacion

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

## Mejores Practicas

- **Valida en las tres funciones** — `serialize`, `parseValue` y `parseLiteral` deben aplicar las mismas restricciones
- **Lanza errores descriptivos** — incluye el valor invalido en el mensaje de error para debugging
- **Prefiere `graphql-scalars` para tipos comunes** — DateTime, Email, URL, UUID y otros estan bien probados
- **Documenta el formato de red** — el campo `description` indica a los clientes que formato enviar

## Errores Comunes

- **Solo implementar `serialize`** — las consultas con valores inline o variables fallaran sin `parseValue` y `parseLiteral`
- **No manejar null** — decide si tu escalar acepta null y manejalo explicitamente
- **Olvidar registrar el resolver** — el escalar debe aparecer en el mapa de resolvers junto con `Query`, `Mutation` y los resolvers de tipos
- **Usar el escalar `JSON` en exceso** — los escalares JSON eluden la seguridad de tipos de GraphQL; prefiere tipos explicitos cuando sea posible

## FAQ

**Q: Debo usar escalares personalizados o validacion en resolvers?**
A: Usa escalares para validacion de formato (email, fecha, URL). Usa validacion a nivel resolver para reglas de negocio (email debe ser unico, fecha debe ser futura).

**Q: Puedo usar escalares personalizados en input types?**
A: Si. Los escalares personalizados funcionan tanto en output types como en input types. `parseValue` y `parseLiteral` manejan la validacion de entrada.

**Q: Cual es la diferencia entre parseValue y parseLiteral?**
A: `parseValue` maneja valores pasados como variables GraphQL (JSON). `parseLiteral` maneja valores escritos inline en la consulta (nodos AST).

**Q: Los escalares personalizados son type-safe en TypeScript?**
A: No automaticamente. Necesitas usar herramientas de codegen como `graphql-codegen` para generar tipos TypeScript apropiados para escalares personalizados.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes

- No validar el input en la función `parseValue` — aceptar datos malformados que rompen los resolvers downstream
- Lanzar errores genéricos en lugar de `GraphQLError` — los clientes reciben mensajes de error poco claros sin extensions
- Olvidar manejar `parseLiteral` para valores inline en queries — solo `parseValue` maneja inputs de variables
- No documentar el formato esperado en la descripción del schema — los clientes adivinan el formato y envían datos inválidos
- Retornar `null` desde `serialize` para valores inválidos — los clientes reciben `null` en lugar de un error, ocultando problemas de calidad de datos
- No testear el comportamiento del escalar con queries de introspection — algunas herramientas dependen de introspection para descubrir tipos escalares y formatos
- No manejar `undefined` vs `null` en `serialize` — retornar `undefined` causa que GraphQL omita el campo, mientras que `null` lo setea explícitamente a null
- No añadir el escalar al type map del schema — olvidar llamar `schema.addScalarType()` resulta en que el escalar sea tratado como string
- No manejar edge cases como `NaN`, `Infinity`, o strings vacíos en `parseValue` — estos valores pasan los checks de tipo pero rompen la lógica downstream
- No registrar el escalar en herramientas de codegen — GraphQL Code Generator y herramientas similares necesitan configuración de plugin custom para generar tipos TypeScript correctos para escalares personalizados
- No proporcionar un fallback para valores escalares desconocidos — cuando el escalar encuentra un tipo inesperado, debería lanzar un `GraphQLError` con un mensaje claro

### ¿Cómo manejo escalares DateTime con timezone?

Siempre parsea los timestamps entrantes a UTC en `parseValue`. Almacena y retorna UTC en todas partes. Deja que el cliente maneje la conversión de timezone para display. Nunca almacenes hora local en la base de datos — crea ambigüedad cuando servidores o clientes se mueven entre timezones.

### ¿Puedo usar escalares personalizados con Apollo Federation?

Sí. Define el escalar en cada subgrafo que lo usa. El gateway trata los escalares personalizados como tipos pass-through — no los valida ni transforma. Asegúrate de que todos los subgrafos implementen la misma lógica de parsing y serialización para evitar inconsistencias.
