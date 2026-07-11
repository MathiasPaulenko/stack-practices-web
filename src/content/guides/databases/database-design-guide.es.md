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


## Temas Avanzados

### Escenario Detallado: Diseno de Base de Datos para E-commerce

```text
Sistema: Plataforma e-commerce (PostgreSQL 16)
Volumen: 500K productos, 2M usuarios, 10M ordenes
Requisitos: Busqueda full-text, inventario multi-almacen, auditoria

Esquema principal:

  -- Tabla de usuarios con particion por region
  CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      region VARCHAR(10) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ) PARTITION BY LIST (region);

  CREATE TABLE users_us PARTITION OF users FOR VALUES IN ("US");
  CREATE TABLE users_eu PARTITION OF users FOR VALUES IN ("EU");
  CREATE TABLE users_latam PARTITION OF users FOR VALUES IN ("LATAM");

  -- Productos con busqueda full-text
  CREATE TABLE products (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category_id INT NOT NULL REFERENCES categories(id),
      sku VARCHAR(50) NOT NULL UNIQUE,
      search_vector TSVECTOR GENERATED ALWAYS AS
          (to_tsvector("english", name || " " || coalesce(description, ""))) STORED
  );

  CREATE INDEX idx_products_search ON products USING GIN(search_vector);
  CREATE INDEX idx_products_category ON products(category_id);
  CREATE INDEX idx_products_price ON products(price);

  -- Inventario multi-almacen
  CREATE TABLE inventory (
      product_id BIGINT NOT NULL REFERENCES products(id),
      warehouse_id INT NOT NULL REFERENCES warehouses(id),
      quantity INT NOT NULL DEFAULT 0,
      reserved INT NOT NULL DEFAULT 0,
      CHECK (quantity >= 0),
      CHECK (reserved >= 0),
      CHECK (reserved <= quantity),
      PRIMARY KEY (product_id, warehouse_id)
  );

  CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id, quantity);

  -- Ordenes con auditoria
  CREATE TABLE orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id),
      status VARCHAR(20) NOT NULL DEFAULT "pending",
      total DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ) PARTITION BY RANGE (created_at);

  CREATE TABLE orders_2026_q1 PARTITION OF orders
      FOR VALUES FROM ("2026-01-01") TO ("2026-04-01");
  CREATE TABLE orders_2026_q2 PARTITION OF orders
      FOR VALUES FROM ("2026-04-01") TO ("2026-07-01");

  CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
  CREATE INDEX idx_orders_status ON orders(status) WHERE status != "completed";

  -- Tabla de auditoria con triggers
  CREATE TABLE audit_log (
      id BIGSERIAL PRIMARY KEY,
      table_name VARCHAR(50) NOT NULL,
      record_id BIGINT NOT NULL,
      action VARCHAR(10) NOT NULL,
      old_data JSONB,
      new_data JSONB,
      changed_by VARCHAR(100),
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE OR REPLACE FUNCTION audit_order_changes()
  RETURNS TRIGGER AS $$
  BEGIN
      INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
      VALUES ("orders", COALESCE(NEW.id, OLD.id), TG_OP,
              CASE WHEN TG_OP = "DELETE" THEN to_jsonb(OLD) END,
              CASE WHEN TG_OP != "DELETE" THEN to_jsonb(NEW) END,
              current_user);
      RETURN COALESCE(NEW, OLD);
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_order_changes();

Decisiones de diseno:
  - Particion por region para usuarios (queries regionales frecuentes)
  - Particion por fecha para ordenes (archivar ordenes viejas)
  - TSVector para busqueda full-text sin Elasticsearch
  - Inventario separado de productos (multi-almacen)
  - Audit log con triggers para cumplimiento
  - CHECK constraints para invariantes de negocio

Lecciones aprendidas:
  - Particionar temprano en tablas que creceran mucho
  - Los indices parciales (WHERE status != "completed") ahorran espacio
  - TSVector elimina la necesidad de Elasticsearch para busqueda simple
  - Los triggers de auditoria son mas confiables que auditoria a nivel aplicacion
```

### Como manejo migraciones de esquema en produccion?

Usa migraciones online compatibles hacia atras. Agrega columnas nullable primero, popula datos, luego agrega constraints. Nunca bloques la tabla durante migraciones. Usa `CREATE INDEX CONCURRENTLY` en PostgreSQL. Para renombrar columnas, agrega la nueva, sincroniza con triggers, migra el codigo, luego elimina la vieja. Herramientas como Flyway o Liquibase automatizan el versionado de migraciones.
























End of document. Review and update quarterly.