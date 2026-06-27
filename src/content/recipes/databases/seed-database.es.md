---
contentType: recipes
slug: seed-database
title: "Sembrar Base de Datos"
description: "Cómo sembrar bases de datos con datos realistas para desarrollo, testing y staging usando scripts de seed, migraciones y factories en PostgreSQL, MongoDB y Prisma."
metaDescription: " Siembra bases de datos con datos realistas para desarrollo, testing y staging usando scripts de seed, migraciones y factories en PostgreSQL, MongoDB y Prisma."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - seeding
  - testing
  - postgresql
  - mongodb
  - prisma
  - development
  - recipe
relatedResources:
  - /recipes/testing/generate-test-data
  - /recipes/testing/setup-test-fixtures
  - /guides/database-sharding-implementation-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Siembra bases de datos con datos realistas para desarrollo, testing y staging usando scripts de seed, migraciones y factories en PostgreSQL, MongoDB y Prisma."
  keywords:
    - databases
    - seeding
    - testing
    - postgresql
    - mongodb
    - prisma
    - development
    - recipe
---

## Descripción General

Una base de datos sembrada es la forma más rápida de incorporar nuevos desarrolladores, reproducir bugs y ejecutar tests de integración que dependen de distribuciones de datos realistas. Sin seeding, cada entorno comienza vacío, obligando a los desarrolladores a crear manualmente cuentas, órdenes y relaciones antes de poder testear cualquier característica. Esta receta muestra estrategias de seeding seguras y repetibles que no polucionan producción.

## Cuándo Usar

- Incorporar nuevos desarrolladores que necesitan una base de datos local funcional en minutos
- Tests de integración y E2E que requieren que usuarios, productos o transacciones existan
- Entornos de staging que deberían reflejar distribuciones de datos de producción
- Testing de carga con volúmenes y relaciones de datos realistas
- Demostrar características a stakeholders sin crear datos demo manualmente

## Cuándo NO Usar

- Siembra de bases de datos de producción — usa migraciones controladas y scripts de importación en su lugar
- Entornos con PII o datos sensibles — nunca siembres datos reales de clientes desde exports
- Sistemas donde el script de seed toma más que el timeout de CI (típicamente 10 minutos)
- Microservicios con arquitecturas event-sourced donde el seeding debe emitir eventos de dominio

## Implementación Paso a Paso

### PostgreSQL (SQL + pg)

```bash
# Directorio: db/seeds/
# 01_users.sql
INSERT INTO users (email, name, role, created_at)
VALUES
  ('admin@example.com', 'Admin User', 'admin', NOW()),
  ('user1@example.com', 'Alice', 'user', NOW()),
  ('user2@example.com', 'Bob', 'user', NOW())
ON CONFLICT (email) DO NOTHING;

# 02_products.sql
INSERT INTO products (sku, name, price, stock)
VALUES
  ('SKU-001', 'Wireless Mouse', 29.99, 150),
  ('SKU-002', 'Mechanical Keyboard', 89.99, 75),
  ('SKU-003', 'USB-C Hub', 49.99, 200)
ON CONFLICT (sku) DO NOTHING;

# 03_orders.sql (con referencias)
INSERT INTO orders (user_id, total, status, created_at)
SELECT id, 119.98, 'completed', NOW() - INTERVAL '2 days'
FROM users WHERE email = 'user1@example.com';
```

```javascript
// seed.js — runner Node.js usando pg
import { Client } from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const seedsDir = './db/seeds';
  const files = readdirSync(seedsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(seedsDir, file), 'utf8');
    console.log(`Ejecutando: ${file}`);
    await client.query(sql);
  }

  await client.end();
  console.log('Seeding completo');
}

seed().catch(console.error);
```

```bash
# Ejecutar con protección de entorno
if [ "$NODE_ENV" != "production" ]; then
  node db/seed.js
else
  echo "Rehusando sembrar base de datos de producción"
  exit 1
fi
```

### MongoDB (mongosh / Node.js)

```javascript
// seeds/users.js
const { MongoClient } = require('mongodb');

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('myapp');

  // Idempotente: eliminar y recrear, o usar inserts ordenados con upsert
  const users = db.collection('users');
  await users.deleteMany({ email: { $regex: '@example\\.com$' } });

  await users.insertMany([
    { email: 'admin@example.com', name: 'Admin', role: 'admin', createdAt: new Date() },
    { email: 'user1@example.com', name: 'Alice', role: 'user', createdAt: new Date() }
  ]);

  // Productos con reviews embebidas
  const products = db.collection('products');
  await products.deleteMany({ sku: /^SKU-/ });

  await products.insertMany([
    {
      sku: 'SKU-001',
      name: 'Wireless Mouse',
      price: 29.99,
      reviews: [
        { userId: 'user1@example.com', rating: 5, comment: 'Great mouse' }
      ]
    }
  ]);

  // Crear índices que la aplicación espera
  await users.createIndex({ email: 1 }, { unique: true });
  await products.createIndex({ sku: 1 }, { unique: true });

  await client.close();
}

seed().catch(console.error);
```

### Prisma (TypeScript)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Upsert asegura idempotencia
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN'
    }
  });

  const categories = await prisma.$transaction(
    ['Electronics', 'Books', 'Home'].map(name =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const product = await prisma.product.create({
    data: {
      sku: 'SKU-001',
      name: 'Wireless Mouse',
      price: 29.99,
      categoryId: categories[0].id,
      stock: { create: { quantity: 150 } }
    }
  });

  console.log(`Creado ${admin.name}, ${product.name}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "scripts": {
    "db:seed": "ts-node prisma/seed.ts"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

```bash
# Comando nativo de seed de Prisma
npx prisma db seed

# Resetear base de datos y re-sembrar (solo desarrollo)
npx prisma migrate reset --force
```

### Python (SQLAlchemy + Alembic)

```python
# scripts/seed_database.py
import os
import sys
from sqlalchemy.orm import Session
from app.models import User, Product, Order
from app.database import SessionLocal
from app.core.security import get_password_hash

def seed():
    if os.getenv("ENV") == "production":
        raise RuntimeError("No se puede sembrar base de datos de producción")

    db: Session = SessionLocal()
    try:
        # Seeding idempotente
        if db.query(User).filter(User.email == "admin@example.com").first():
            print("Base de datos ya sembrada")
            return

        admin = User(
            email="admin@example.com",
            name="Admin User",
            role="admin",
            hashed_password=get_password_hash("changeme")
        )
        db.add(admin)

        products = [
            Product(sku="SKU-001", name="Wireless Mouse", price=29.99, stock=150),
            Product(sku="SKU-002", name="Keyboard", price=89.99, stock=75),
        ]
        db.add_all(products)
        db.flush()

        order = Order(
            user_id=admin.id,
            total=119.98,
            status="completed"
        )
        db.add(order)

        db.commit()
        print("Seeding completo")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
```

## Mejores Prácticas

- **Haz los seeds idempotentes.** Usa `ON CONFLICT DO NOTHING`, `upsert` o verificaciones de existencia para que ejecutar el script de seed dos veces no cree duplicados ni falle.
- **Nunca siembres producción.** Protege los scripts de seed con una verificación de entorno. Los datos de producción deberían entrar a través de migraciones controladas, herramientas de admin o pipelines ETL.
- **Mantén los datos de seed realistas pero pequeños.** 10-50 filas representativas por tabla son suficientes para desarrollo. Usa factories (no scripts de seed) para testing de carga que necesita millones de filas.
- **Versiona los archivos de seed como migraciones.** Nombrarlos `01_users.sql`, `02_products.sql` asegura que corren en orden determinístico y pueden ser trackeados en git.
- **Siembra en CI para tests de integración.** Un paso `db:seed` antes del suite de test asegura que cada ejecución de CI comienza desde un estado conocido.

## Errores Comunes

- **Hardcodear IDs auto-incrementales.** Insertar `id = 1` en una columna auto-incremental puede causar conflictos cuando la aplicación posteriormente crea registros. Deja que la base de datos asigne IDs o usa UUIDs.
- **Sembrar sin orden de foreign keys.** Insertar una orden antes de que el usuario exista causa una violación de foreign key. Ordena archivos de seed por grafo de dependencias.
- **Olvidar crear índices.** El seeding evade la aplicación, por lo que los índices que la app espera pueden no existir si el script de seed omite declaraciones `CREATE INDEX`.
- **Usar dumps de producción como seeds.** Un dump SQL de producción puede contener PII, datos sensibles GDPR o IDs internos que no deberían estar en git o máquinas de desarrollo.
- **Seeds no determinísticos.** Datos de seed generados aleatoriamente hacen imposible reproducir bugs entre entornos. Usa una seed fija para generadores aleatorios en scripts de seed.

## Preguntas Frecuentes

**Q: ¿Cuál es la diferencia entre seeding y migrar una base de datos?**
A: Las migraciones cambian la estructura del esquema (tablas, índices). El seeding popula la base de datos con datos de referencia o registros de prueba después de que el esquema está listo.

**Q: ¿Debo hacer seeding en bases de datos de producción?**
A: Solo con datos de referencia necesarios para que la aplicación funcione, como roles, monedas o configuración. Nunca hagas seeding de usuarios reales o datos de prueba en producción.

**Q: ¿Cómo mantengo los datos de seed deterministas?**
A: Usa IDs fijos, scripts de inserción ordenados y factories que produzcan la misma salida para la misma entrada. Esto hace que los tests sean reproducibles en cualquier entorno.
