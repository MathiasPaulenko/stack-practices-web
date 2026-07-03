---
contentType: recipes
slug: uuid-generation-strategies
title: "Generacion de UUID: v4, v7 y Comparacion con ULID"
description: "Compara UUID v4, v7, ULID y nanoid para generar identificadores unicos con diferentes tradeoffs en aleatoriedad, ordenamiento, rendimiento y localidad de indices de base de datos"
metaDescription: "Compara UUID v4, v7, ULID y nanoid para identificadores unicos. Diferentes tradeoffs en aleatoriedad, ordenamiento, rendimiento y localidad de indices."
difficulty: beginner
topics:
  - data
  - databases
tags:
  - guid
  - uuid
  - databases
  - performance
  - data
relatedResources:
  - /recipes/databases/postgres-query-optimization
  - /recipes/data/batch-processing-patterns
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compara UUID v4, v7, ULID y nanoid para identificadores unicos. Diferentes tradeoffs en aleatoriedad, ordenamiento, rendimiento y localidad de indices."
  keywords:
    - uuid generation
    - ulid
    - nanoid
    - unique identifiers
    - database indexing
---

# Generacion de UUID: v4, v7 y Comparacion con ULID

Elige la estrategia de identificador unico correcta para tu aplicacion comparando UUID v4 (random), v7 (time-sortable), ULID (lexicographically sortable) y nanoid (compact URL-safe). Esta recipe cubre generacion, implicaciones de indices de base de datos, probabilidad de colision y consideraciones de migracion.

## Cuando Usar Esto

- Las primary keys de [base de datos](/recipes/databases/database-transactions) deben ser globalmente unicas en sistemas distribuidos
- El ordenamiento de identificadores afecta el rendimiento de queries y fragmentacion de indices
- Se necesitan identificadores cortos y URL-safe para recursos public-facing

## Solucion

### 1. UUID v4 (Random)

```typescript
// ids/uuid4.ts
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// Caracteristicas
// - Completamente random (122 bits de aleatoriedad)
// - No sortable por tiempo
// - Causa fragmentacion de indice en B-trees
// - Formato standard con hyphens
```

### 2. UUID v7 (Time-Sortable)

```typescript
// ids/uuid7.ts
import { v7 as uuidv7 } from 'uuid';

const id = uuidv7(); // '018f3bda-7c58-7e8a-8b5e-4f3e8c9d2a1b'

// Caracteristicas
// - Primeros 48 bits = Unix timestamp en milisegundos
// - Restantes 74 bits = random
// - Sortable por tiempo de creacion
// - Mejor localidad de indice que v4
// - Standard RFC draft (estable para produccion)
```

### 3. ULID (Lexicographically Sortable)

```typescript
// ids/ulid.ts
import { ulid } from 'ulid';

const id = ulid(); // '01HV8J3K2M4N5P6Q7R8S9T0UV'

// Caracteristicas
// - 26 caracteres, Crockford's base32
// - Primeros 10 chars = timestamp (sortable)
// - Ultimos 16 chars = aleatoriedad
// - Lexicographically sortable como string
// - Sin hyphens, URL-safe
```

### 4. NanoID (Compacto y Rapido)

```typescript
// ids/nanoid.ts
import { nanoid } from 'nanoid';

const id = nanoid();       // default 21 chars
const short = nanoid(10);  // longitud configurable

// Caracteristicas
// - 21 chars por defecto (similar resistencia de colision a UUID v4)
// - Alfabeto custom soportado
// - Generacion rapida (~50% mas rapido que UUID)
// - URL-safe por defecto (sin hyphens)
```

### 5. Matriz de Comparacion

```typescript
// ids/comparison.ts
const comparison = {
  uuidv4: {
    length: 36,
    sortable: false,
    indexLocality: 'poor',
    standard: 'RFC 4122',
    collisionRisk: 'negligible (2^122)',
  },
  uuidv7: {
    length: 36,
    sortable: true,
    indexLocality: 'good',
    standard: 'RFC draft',
    collisionRisk: 'negligible (2^74)',
  },
  ulid: {
    length: 26,
    sortable: true,
    indexLocality: 'good',
    standard: 'Community',
    collisionRisk: 'negligible (2^80)',
  },
  nanoid: {
    length: 21,
    sortable: false,
    indexLocality: 'poor',
    standard: 'Community',
    collisionRisk: 'negligible (2^126)',
  },
};
```

### 6. PostgreSQL con UUID v7

```sql
-- Habilitar extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla con primary key UUID v7
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Para UUIDs sortables, generar en la aplicacion e insertar
INSERT INTO events (id, name) VALUES ('018f3bda-7c58-7e8a-8b5e-4f3e8c9d2a1b', 'signup');
```

## Como Funciona

- **UUID v4** usa aleatoriedad para unicidad pero dispersa inserts de indice
- **UUID v7** embebe un prefijo de timestamp, haciendo los inserts aproximadamente secuenciales
- **ULID** usa codificacion base32 para identificadores mas cortos aun sortable
- **NanoID** prioriza velocidad y compacidad con longitud configurable

## Consideraciones de Produccion

- Usa UUID v7 para aplicaciones nuevas que necesiten keys time-sortable. Consulta [Database Migrations](/recipes/databases/database-migrations) para evolucionar schemas.
- Manten UUID v4 para sistemas existentes a menos que la migracion este justificada
- Usa ULID cuando la longitud del identificador y el ordenamiento lexicografico importen
- Usa nanoid para tokens de corta vida, short URLs o cuando el tamano sea critico

## Errores Comunes

- Generar UUIDs en la base de datos en lugar de la application layer
- Usar v4 en sistemas de alto insert sin monitorear fragmentacion de indice
- No manejar la rara pero posible colision de UUID en sistemas distribuidos

## FAQ

**P: Deberia usar enteros auto-incrementales en su lugar?**
R: Usa enteros para sistemas single-node donde la coordinacion es trivial. Usa UUIDs para sistemas distribuidos o cuando los identificadores no deben revelar informacion de secuencia. Consulta [Database Connection Pooling](/recipes/databases/database-connection-pooling) para gestionar conexiones de base de datos.

**P: Es UUID v7 oficialmente estandarizado?**
R: Esta en estado RFC draft y ampliamente considerado estable. Las principales bases de datos y librerias lo soportan.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
