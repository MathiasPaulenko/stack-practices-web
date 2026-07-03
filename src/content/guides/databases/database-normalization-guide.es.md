---
contentType: guides
slug: database-normalization-guide
title: "Normalización de Bases de Datos — 1NF a 5NF Explicado"
description: "Guía visual de normalización de bases de datos: aprende 1NF a 5NF con ejemplos prácticos, cuándo aplicar cada forma y cómo balancear normalización con rendimiento."
metaDescription: "Aprende normalización de bases de datos desde 1NF hasta 5NF con ejemplos. Entiende dependencias funcionales, anomalías y cuándo desnormalizar para rendimiento."
difficulty: intermediate
topics:
  - databases
  - design
tags:
  - normalizacion-base-datos
  - 1nf
  - 2nf
  - 3nf
  - bcnf
  - 4nf
  - 5nf
  - bases-datos-relacionales
  - diseno-base-datos
  - guia
relatedResources:
  - /guides/database-denormalization-guide
  - /guides/sql-joins-guide
  - /guides/indexing-strategies-guide
  - /recipes/databases/database-migrations-safely
  - /recipes/databases/use-orm-crud
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende normalización de bases de datos desde 1NF hasta 5NF con ejemplos. Entiende dependencias funcionales, anomalías y cuándo desnormalizar para rendimiento."
  keywords:
    - normalizacion-base-datos
    - 1nf
    - 2nf
    - 3nf
    - bcnf
    - bases-datos-relacionales
    - diseno-base-datos
    - guia
---

## Overview

La normalización de bases de datos es el proceso de organizar datos para minimizar la redundancia y eliminar anomalías durante operaciones de inserción, actualización y eliminación. Las formas normales — desde 1NF hasta 5NF — proporcionan reglas progresivas para estructurar bases de datos relacionales. Entender cuándo aplicar cada forma, y cuándo romperlas intencionalmente por rendimiento, separa a diseñadores competentes de expertos.

## When to Use

- Diseñar esquemas relacionales desde cero
- Refactorizar bases de datos legacy con datos duplicados
- Preparar esquemas para cargas transaccionales (OLTP)
- Antes de decidir qué desnormalizar para reportes (OLAP)

## 1NF — Valores Atómicos

**Regla:** Cada columna contiene solo valores atómicos (indivisibles). Sin grupos repetidos.

**Antes (viola 1NF):**

| order_id | customer | products |
|----------|----------|----------|
| 1 | Alice | Apple, Banana, Cherry |

**Después (cumple 1NF):**

| order_id | customer | product |
|----------|----------|---------|
| 1 | Alice | Apple |
| 1 | Alice | Banana |
| 1 | Alice | Cherry |

## 2NF — Sin Dependencias Parciales

**Regla:** Todos los atributos no-clave dependen de la clave primaria completa (relevante para claves compuestas).

**Antes (viola 2NF):**

| course_id | student_id | course_name | student_name | grade |
|-----------|------------|-------------|--------------|-------|
| CS101 | S1 | Intro to CS | Alice | A |

`course_name` depende solo de `course_id`; `student_name` solo de `student_id`.

**Después (cumple 2NF):**

**Enrollments:**
| course_id | student_id | grade |
|-----------|------------|-------|
| CS101 | S1 | A |

**Courses:**
| course_id | course_name |
|-----------|-------------|
| CS101 | Intro to CS |

**Students:**
| student_id | student_name |
|------------|--------------|
| S1 | Alice |

## 3NF — Sin Dependencias Transitivas

**Regla:** Los atributos no-clave dependen solo de la clave primaria, no de otros atributos no-clave.

**Antes (viola 3NF):**

| employee_id | name | department_id | department_name | department_head |
|-------------|------|---------------|-----------------|-----------------|
| E1 | Bob | D1 | Engineering | Carol |

`department_name` y `department_head` dependen de `department_id`, no de `employee_id`.

**Después (cumple 3NF):**

**Employees:**
| employee_id | name | department_id |
|-------------|------|---------------|
| E1 | Bob | D1 |

**Departments:**
| department_id | department_name | department_head |
|---------------|-----------------|-----------------|
| D1 | Engineering | Carol |

## BCNF — Forma Normal de Boyce-Codd

**Regla:** Para toda dependencia funcional X → Y, X debe ser superclave.

**Antes (viola BCNF):**

| student | course | professor |
|---------|--------|-----------|
| Alice | CS101 | Prof. Smith |
| Bob | CS101 | Prof. Smith |

`course → professor`, pero course no es superclave.

**Después (cumple BCNF):**

**Enrollments:**
| student | course |
|---------|--------|
| Alice | CS101 |
| Bob | CS101 |

**CourseAssignments:**
| course | professor |
|--------|-----------|
| CS101 | Prof. Smith |

## 4NF — Sin Dependencias Multivaluadas

**Regla:** Sin dependencias multivaluadas excepto sobre superclaves.

**Antes (viola 4NF):**

| employee | skill | language |
|----------|-------|----------|
| Alice | Java | English |
| Alice | Java | Spanish |
| Alice | Python | English |
| Alice | Python | Spanish |

Skills y languages son hechos multivaluados independientes.

**Después (cumple 4NF):**

**EmployeeSkills:**
| employee | skill |
|----------|-------|
| Alice | Java |
| Alice | Python |

**EmployeeLanguages:**
| employee | language |
|----------|----------|
| Alice | English |
| Alice | Spanish |

## 5NF — Dependencia de Unión

**Regla:** Toda dependencia de unión está implicada por las claves candidatas.

**Antes (viola 5NF):**

| agent | company | product |
|-------|---------|---------|
| Smith | Ford | Truck |
| Smith | Ford | Car |
| Smith | Toyota | Car |
| Jones | Toyota | Car |

**Después (cumple 5NF):**

**AgentCompany:**
| agent | company |
|-------|---------|
| Smith | Ford |
| Smith | Toyota |
| Jones | Toyota |

**AgentProduct:**
| agent | product |
|-------|---------|
| Smith | Truck |
| Smith | Car |
| Jones | Car |

**CompanyProduct:**
| company | product |
|---------|---------|
| Ford | Truck |
| Ford | Car |
| Toyota | Car |

## Resumen de Normalización

| Forma | Regla | Elimina |
|-------|-------|---------|
| 1NF | Valores atómicos | Grupos repetidos |
| 2NF | Dependencia de clave completa | Dependencias parciales |
| 3NF | Dependencia solo de clave | Dependencias transitivas |
| BCNF | Determinante superclave | Anomalías restantes |
| 4NF | Sin dependencias multivaluadas | Valores multi-independientes |
| 5NF | Dependencias de unión | Uniones reconstruibles |

## Cuándo Detener la Normalización

- **3NF/BCNF** es el punto práctico para la mayoría de sistemas OLTP
- **4NF** importa cuando tienes atributos verdaderamente multivaluados (raro)
- **5NF** es mayormente teórico para aplicaciones productivas
- **Desnormaliza intencionalmente** cuando el rendimiento de lectura importa más que la integridad de escritura

## Errores Comunes

- **Sobrenormalizar hasta 5NF** — añade complejidad con mínimo beneficio práctico
- **Subnormalizar hasta 1NF** — lleva a anomalías de actualización e inconsistencia de datos
- **Normalizar antes de entender las queries** — el esquema debe servir la carga de trabajo
- **Ignorar BCNF** — 3NF no maneja todas las anomalías; BCNF es el estándar más estricto

## Ejemplo: Pasos de Normalizacion

```sql
-- 1NF: Eliminar grupos repetitivos
-- Desnormalizado: orders(id, customer_name, items_csv)
-- 1NF:            orders(id, customer_name, item_name, qty)

-- 2NF: Eliminar dependencias parciales (clave compuesta)
-- 1NF:  order_items(order_id, product_id, product_name, qty)
-- 2NF:  orders(order_id, customer_id)
--       products(product_id, product_name)
--       order_items(order_id, product_id, qty)

-- 3NF: Eliminar dependencias transitivas
-- 2NF:  orders(order_id, customer_id, customer_name, customer_city)
-- 3NF:  orders(order_id, customer_id)
--       customers(customer_id, customer_name, customer_city)

CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  customer_city VARCHAR(100)
);

CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE order_items (
  order_id INT REFERENCES orders(order_id),
  product_id INT REFERENCES products(product_id),
  qty INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);
```

## FAQ

**¿Las bases de datos NoSQL necesitan normalización?**
No de la misma forma. Las bases de datos documentales a menudo embeben datos relacionados (desnormalización) y usan consistencia a nivel de aplicación.

**¿Debería siempre apuntar a 3NF?**
Apunta a BCNF en sistemas transaccionales. Para analítica heavy de lectura, desnormaliza deliberadamente.

**¿Cómo afecta la normalización al indexing?**
Los esquemas normalizados necesitan más joins, que requieren indexing cuidadoso. Los esquemas desnormalizados necesitan menos joins pero más almacenamiento y lógica de actualización.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
