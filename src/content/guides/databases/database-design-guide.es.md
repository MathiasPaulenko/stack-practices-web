---
contentType: guides
slug: database-design-guide
title: "Guía de Diseño de Bases de Datos"
description: "Guía práctica para diseñar bases de datos relacionales con normalización, indexación y modelado de relaciones."
metaDescription: "Aprende principios de diseño de bases de datos: formas normales, claves primarias y foráneas, estrategias de indexación y modelado de relaciones."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - architecture
  - bases-de-datos
  - database
  - database-design
  - indexacion
  - normalizacion
  - sql
relatedResources:
  - /recipes/sql-joins
  - /recipes/database-transactions
  - /patterns/repository-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende principios de diseño de bases de datos: formas normales, claves primarias y foráneas, estrategias de indexación y modelado de relaciones."
  keywords:
    - database design
    - database normalization
    - indexing
    - relational databases
    - schema design
    - ER diagrams
---

## Resumen

Una base de datos bien diseñada es la fundación de aplicaciones confiables. Un mal diseño conduce a inconsistencias de datos, consultas lentas y migraciones costosas. Esta guía cubre los principios esenciales para diseñar bases de datos relacionales escalables.

## Modelado Entidad-Relación

Comienza cada diseño identificando entidades y relaciones.

### Pasos

1. **Identificar entidades**: Usuarios, Órdenes, Productos, Categorías
2. **Definir atributos**: ¿Qué datos tiene cada entidad?
3. **Mapear relaciones**: Uno-a-uno, uno-a-muchos, muchos-a-muchos
4. **Asignar claves**: Claves primarias, candidatas, compuestas

### Tipos de Relaciones

| Tipo | Ejemplo | Implementación |
|------|---------|---------------|
| **Uno-a-Uno** | Usuario → Perfil | Clave foránea con constraint único |
| **Uno-a-Muchos** | Categoría → Productos | Clave foránea en el lado "muchos" |
| **Muchos-a-Muchos** | Estudiantes ↔ Cursos | Tabla intermedia con dos claves foráneas |

## Normalización

La normalización reduce la redundancia y previene anomalías.

### Primera Forma Normal (1NF)

- Valores atómicos: sin atributos multivaluados
- Cada fila es única (tiene clave primaria)

### Segunda Forma Normal (2NF)

- Debe estar en 1NF
- Sin dependencia parcial: atributos no clave dependen de la clave primaria completa

### Tercera Forma Normal (3NF)

- Debe estar en 2NF
- Sin dependencia transitiva: atributos no clave dependen solo de la clave primaria

### Ejemplo de Esquema Normalizado

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total       DECIMAL(10,2) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status != 'archived';
```

## Estrategias de Indexación

Los índices aceleran lecturas pero ralentizan escrituras.

### Cuándo Indexar

| Escenario | Tipo de Índice |
|-----------|---------------|
| Búsquedas primarias | B-Tree en clave primaria |
| Columnas de clave foránea | B-Tree en columnas FK |
| Búsqueda full-text | Índice full-text |
| Consultas por rango | B-Tree en la columna |
| Datos geoespaciales | GiST / SP-GiST |

### Errores Comunes

- Indexación excesiva: cada índice ralentiza INSERT/UPDATE/DELETE
- Indexar columnas de baja cardinalidad solas
- Ignorar índices de cobertura para consultas frecuentes

## Constraints e Integridad de Datos

| Constraint | Propósito |
|-----------|----------|
| `PRIMARY KEY` | Identificador único para cada fila |
| `UNIQUE` | Asegura valores sin duplicados |
| `NOT NULL` | Previene valores faltantes |
| `CHECK` | Valida datos con expresiones |
| `FOREIGN KEY` | Mantiene integridad referencial |

## Lo que funciona

- **Usar claves sustitutas** (auto-increment o UUIDs) en vez de claves naturales
- **Evitar claves foráneas nulas**: usa tablas de intersección para relaciones opcionales
- **Elegir tipos de datos cuidadosamente**: `VARCHAR(255)` vs `TEXT`, `DECIMAL` vs `FLOAT`
- **Documentar el schema**: con comentarios y diagramas ER
- **Planificar el crecimiento**: [particionar tablas grandes](/guides/databases/database-sharding-partitioning-guide) antes de que se conviertan en un problema

## Errores Comunes

- Saltarse la normalización por "performance" sin evidencia. Consulta [tuning SQL](/guides/databases/sql-performance-tuning-guide).
- Usar `ENUM` para valores que cambian frecuentemente
- Faltar reglas `ON DELETE` / `ON UPDATE` en claves foráneas. Consulta [validación de datos](/recipes/security/data-validation-zod).
- Almacenar datos derivados/calculados en vez de computar en lectura

## Preguntas Frecuentes

### Qué forma de normalización de base de datos debería usar?

La mayoría de aplicaciones deberían normalizar al menos a Tercera Forma Normal (3NF). Esto elimina dependencias transitivas y mantiene datos consistentes. Desnormaliza solo cuando tengas problemas de performance comprobados.

### Cuándo debería usar un índice compuesto?

Usa índices compuestos cuando las queries filtren por múltiples columnas juntas. Ordena las columnas por selectividad (la más selectiva primero). Evita indexar columnas que rara vez se usan en WHERE clauses.

### Debería usar UUID o auto-increment para claves primarias?

Usa enteros auto-increment para la mayoría de aplicaciones OLTP — son más pequeños, más rápidos de indexar y legibles. Usa UUIDs cuando necesites generación distribuida o merge replication entre bases de datos.
