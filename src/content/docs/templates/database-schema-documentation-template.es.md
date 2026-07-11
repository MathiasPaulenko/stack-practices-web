---
contentType: docs
slug: database-schema-documentation-template
templateType: database-schema-doc
title: "Plantilla de Documentación de Esquema de Base de Datos"
description: "Una plantilla para documentar esquemas de base de datos con relaciones entre entidades, definiciones de campos e historial de migraciones."
metaDescription: "Plantilla de documentación de esquema de base de datos con definiciones de entidades, relaciones, indexación y seguimiento de migraciones."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - database
  - schema
  - documentation
  - template
  - sql
  - data-modeling
  - architecture
relatedResources:
  - /docs/templates/database-migration-runbook-template
  - /guides/databases/database-design-guide
  - /guides/databases/sql-performance-tuning-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de documentación de esquema de base de datos con definiciones de entidades, relaciones, indexación y seguimiento de migraciones."
  keywords:
    - template
    - database
    - schema
    - documentation
    - sql

---

## Resumen

Los esquemas de base de datos evolucionan constantemente. Sin documentación, cada nuevo desarrollador pierde horas descifrando relaciones entre tablas, adivinando por qué existe una columna y preguntándose si un índice sigue en uso. Esta plantilla te da una estructura para documentar esquemas que se mantiene útil a medida que la base de datos crece.

La plantilla cubre cuatro áreas:

1. **Documentación de entidades** — propósito de tablas, definiciones de columnas, significado de negocio
2. **Mapeo de relaciones** — foreign keys, diagramas ER, reglas de cascade
3. **Estrategia de indexación** — qué sirve cada índice, cuándo se agregó, qué query optimiza
4. **Seguimiento de migraciones** — versiones de esquema, historial de cambios, notas de rollback

Combina esta plantilla con el [Runbook de Migración de BD](/docs/templates/database-migration-runbook-template) para tracking operacional de cambios.

## Plantilla

```markdown
# Documentación de Esquema: [Nombre de Base de Datos]

## Resumen
- **Engine:** PostgreSQL 16 / MySQL 8 / etc.
- **Propósito:** Un párrafo describiendo qué almacena esta base de datos y qué servicios leen/escriben.
- **Equipo responsable:** [nombre del equipo]
- **Replicación:** [ninguna / streaming / lógica]
- **Backup:** [diario / horario / continuo]

## Entidades

### Tabla: users

**Propósito:** Almacena cuentas de usuario autenticadas para la aplicación.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key, generada server-side |
| email | varchar(255) | NO | — | Único, minúsculas en insert via trigger |
| password_hash | varchar(255) | NO | — | Hash Argon2id, nunca loguear ni exponer |
| display_name | varchar(100) | YES | NULL | Nombre elegido por usuario, mostrado en UI |
| status | smallint | NO | 1 | 0=borrado, 1=activo, 2=suspendido, 3=pendiente_verificacion |
| metadata | jsonb | YES | '{}' | Key-value flexible para feature flags, preferencias |
| created_at | timestamptz | NO | now() | Timestamp de creación del registro |
| updated_at | timestamptz | NO | now() | Actualizado via trigger en cada UPDATE |
| deleted_at | timestamptz | YES | NULL | Marcador de soft delete; filtrado por queries de aplicación |

**Constraints:**
- `users_email_key` — UNIQUE en `email`
- `users_status_check` — CHECK (status >= 0 AND status <= 3)

**Índices:**
| Nombre | Columnas | Tipo | Propósito | Migración |
|--------|----------|------|-----------|-----------|
| users_pkey | id | btree | Primary key | 001_initial |
| users_email_key | email | btree | Login lookup, unicidad | 001_initial |
| users_status_idx | status | btree | Filtrar usuarios activos en panel admin | 014_admin_dashboard |
| users_created_at_idx | created_at | btree | Paginación por fecha de creación | 022_pagination |

**Reglas de negocio:**
- Email se convierte a minúsculas en insert y update via trigger
- `status = 0` (borrado) lo setea la aplicación, nunca un UPDATE directo
- `metadata` no debe contener PII — validado por aplicación, no por constraint de BD
- `deleted_at` se setea cuando status cambia a 0; ambos campos deben coincidir

### Tabla: orders

**Propósito:** Almacena pedidos de clientes, vinculados al usuario que los realizó.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | — | FK a users.id, CASCADE DELETE |
| total_cents | integer | NO | 0 | Total en centavos, nunca float |
| currency | char(3) | NO | 'USD' | Código de moneda ISO 4217 |
| status | smallint | NO | 0 | 0=pendiente, 1=pagado, 2=enviado, 3=entregado, 4=cancelado, 5=reembolsado |
| placed_at | timestamptz | NO | now() | Cuándo se realizó el pedido |
| shipped_at | timestamptz | YES | NULL | Cuándo se envió el pedido |

**Constraints:**
- `orders_user_id_fkey` — FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- `orders_total_check` — CHECK (total_cents >= 0)
- `orders_currency_check` — CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY'))

**Índices:**
| Nombre | Columnas | Tipo | Propósito | Migración |
|--------|----------|------|-----------|-----------|
| orders_pkey | id | btree | Primary key | 001_initial |
| orders_user_id_idx | user_id | btree | Listar pedidos por usuario | 001_initial |
| orders_status_placed_at_idx | status, placed_at | btree | Dashboard admin: filtrar por status, ordenar por fecha | 014_admin_dashboard |

**Reglas de negocio:**
- `total_cents` se almacena como integer para evitar errores de punto flotante
- Pedidos con `status >= 2` no pueden cancelarse (aplicación lo enforce)
- `shipped_at` debe ser null cuando `status < 2` (aplicación lo enforce)

## Relaciones

```
users 1───∞ orders
  │              │
  │              └── order_items (items por pedido)
  │
  └── user_preferences (1:1, opcional)
```

- **users → orders**: Un usuario puede tener muchos pedidos. CASCADE DELETE elimina pedidos cuando se hard-deletea un usuario (raro; soft delete es preferido).
- **orders → order_items**: Un pedido tiene muchos items. CASCADE DELETE.
- **users → user_preferences**: Uno-a-uno, LEFT JOIN. Preferencias son opcionales.

## Referencia de Enums

| Tabla | Columna | Valor | Significado |
|-------|---------|-------|-------------|
| users | status | 0 | Borrado (soft) |
| users | status | 1 | Activo |
| users | status | 2 | Suspendido (acción admin) |
| users | status | 3 | Pendiente verificación de email |
| orders | status | 0 | Pendiente de pago |
| orders | status | 1 | Pagado, esperando envío |
| orders | status | 2 | Enviado |
| orders | status | 3 | Entregado |
| orders | status | 4 | Cancelado |
| orders | status | 5 | Reembolsado |

## Historial de Migraciones

| Versión | Fecha | Descripción | Autor | Notas de rollback |
|---------|-------|-------------|-------|-------------------|
| 001 | 2026-01-15 | Esquema inicial (users, orders, order_items) | Mathias | DROP todas las tablas |
| 014 | 2026-03-02 | Agregar índices para dashboard admin | Mathias | DROP INDEX orders_status_placed_at_idx; DROP INDEX users_status_idx; |
| 022 | 2026-05-10 | Agregar índice de paginación en users.created_at | Mathias | DROP INDEX users_created_at_idx; |

## Columnas Deprecadas

| Tabla | Columna | Deprecada el | Remoción planeada | Reemplazo |
|-------|---------|---------------|-------------------|-----------|
| users | legacy_id | 2026-04-01 | 2026-07-01 | Migrado a `id` (uuid) en migración 018 |

## Notas

- Todos los timestamps se almacenan como `timestamptz` en UTC. La aplicación convierte a timezone del usuario en display.
- Valores monetarios se almacenan como integer centavos, nunca como float o numeric.
- Soft deletes usan `deleted_at` + `status = 0`. Hard deletes requieren razón documentada y una migración.
- La columna `metadata` jsonb es solo para datos no estructurados. Si una key se consulta regularmente, promoverla a columna real.
```

## Lo que funciona

- **Documenta cada tabla y columna** — Los desarrolladores futuros (incluyéndote) te lo agradecerán. Combina los docs de esquema con un [Runbook de Migración](/docs/templates/database-migration-runbook-template) para tracking de cambios.
- **Explica el significado de negocio, no solo los tipos** — `status` es obvio; por qué existe `metadata` no lo es
- **Incluye el "por qué" de los índices** — Los índices tienen costo; documenta qué query sirven. Consulta la [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) para estrategias de indexación.
- **Versiona tus docs de esquema** — Rastrea qué cambió y cuándo, como con el código
- **Mantén el diagrama ER actualizado** — La referencia visual es más rápida que leer SQL para entender relaciones
- **Marca columnas deprecadas** — No borres docs de columnas eliminadas inmediatamente; márquenlas como deprecated con fecha de remoción
- **Documenta valores de enum en una tabla de referencia** — Números mágicos como `status = 3` son meaningless sin contexto
- **Registra notas de rollback de migraciones** — Cuando un deploy falla, necesitas rollback rápido

## Errores Comunes

- Documentar el esquema una vez y nunca actualizarlo — la documentación obsoleta es peor que ninguna
- Documentar solo tablas, ignorando índices y restricciones — los índices revelan patrones de query
- Usar nombres de columnas vagos sin explicación — `data` o `value` no dicen nada
- No documentar patrones de soft delete — los nuevos desarrolladores a menudo omiten filtros de `deleted_at`
- Olvidar documentar valores de enum — ¿qué significa `status = 3`?
- Almacenar dinero como float — usa integer centavos o un tipo decimal dedicado
- No documentar reglas de cascade — `ON DELETE CASCADE` puede eliminar datos silenciosamente
- Mezclar timestamps UTC y locales — elige uno (UTC) y enlóralo con `timestamptz`
- Omitir la sección de "reglas de negocio" — los constraints SQL no capturan todas las reglas a nivel aplicación


## Comparacion de Variantes

| Variante | Contexto | Enfoque | Notas |
|----------|----------|---------|-------|
| Docs auto-generadas | Esquema grande, cambios frecuentes | tbls/dbdocs extraen DDL | Agregar narrativa encima |
| Markdown en-repo | Equipo pequeno, cambios en PR | Docs junto al codigo | Revision en PR garantiza sync |
| Wiki/Confluence | Org con wiki existente | Adaptar secciones a paginas | Linkea migraciones y postmortems |
| DBML/ERD visual | Onboarding rapido, stakeholders | Diagrama visual + docs minimas | Actualizar en cada migracion |

## Escenario Detallado: Documentar una Migracion de Esquema

```text
Sistema: Base de datos de pedidos (PostgreSQL 16)
Cambio: Agregar columna shipping_address_id a orders
Migracion: 023_add_shipping_address

Paso 1 - Escribir la migracion:
  -- 023_add_shipping_address.sql
  ALTER TABLE orders ADD COLUMN shipping_address_id uuid;
  ALTER TABLE orders ADD CONSTRAINT orders_shipping_address_id_fkey
    FOREIGN KEY (shipping_address_id) REFERENCES addresses(id)
    ON DELETE SET NULL;

  CREATE INDEX orders_shipping_address_id_idx
    ON orders(shipping_address_id)
    WHERE shipping_address_id IS NOT NULL;

Paso 2 - Actualizar la documentacion del esquema:
  Tabla: orders
  | Columna | Tipo | Nullable | Default | Descripcion |
  |---------|------|----------|---------|-------------|
  | shipping_address_id | uuid | YES | NULL | FK a addresses.id, SET NULL on delete |

  Indices:
  | orders_shipping_address_id_idx | shipping_address_id | btree | Lookup de pedidos por direccion | 023_add_shipping_address |

  Constraints:
  | orders_shipping_address_id_fkey | FK (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL |

Paso 3 - Actualizar historial de migraciones:
  | 023 | 2026-07-11 | Agregar shipping_address_id a orders | Mathias | ALTER TABLE orders DROP COLUMN shipping_address_id; |

Paso 4 - Actualizar diagrama ER:
  orders --- addresses (N:1, SET NULL on delete)

Paso 5 - Notas de rollback:
  - La columna es nullable, no rompe queries existentes
  - Rollback: DROP COLUMN (indice y FK se eliminan en cascada)
  - Datos: la columna se pierde, pero es derivable de order_items

Paso 6 - Comunicar al equipo:
  - PR con migracion + docs actualizadas
  - Nota en Slack: "Nueva columna shipping_address_id en orders"
  - Actualizar ORM models (Prisma, TypeORM, SQLAlchemy)
```

### Como documento columnas calculadas o virtuales?

Documenta la formula o logica de calculo en la seccion de reglas de negocio de la tabla. Indica si la columna es almacenada (stored) o calculada en runtime (virtual). Para columnas generadas en PostgreSQL (`GENERATED ALWAYS AS`), documenta la expresion SQL y nota que no se puede escribir directamente.

### Que hago cuando una tabla tiene mas de 50 columnas?

Considera dividir la documentacion por grupos logicos de columnas. Por ejemplo, en una tabla `users`: grupo de autenticacion (email, password_hash, status), grupo de perfil (display_name, avatar_url), grupo de metadata (metadata jsonb, created_at, updated_at). Esto hace la documentacion mas legible sin perder completitud.

## Variantes

### Docs auto-generadas (tbls / dbdocs)

Herramientas como [tbls](https://github.com/k1LoW/tbls) y [dbdocs](https://dbdocs.io) generan documentación de esquema desde la base de datos viva. Producen diagramas de relaciones, listados de columnas y resúmenes de constraints automáticamente. Úsalas para la línea base estructural, luego agrega documentación narrativa (reglas de negocio, significados de enum, racional de indexación) encima.

### Docs Markdown en-repo

Mantén los docs de esquema como archivos Markdown en el mismo repositorio que el código de aplicación. Esto permite revisar docs en PRs junto con cambios de esquema. Usa la plantilla de arriba como punto de partida.

### Wiki / Confluence

Para organizaciones con infraestructura wiki existente, adapta las secciones de la plantilla en páginas wiki. Linkea cada tabla a su historial de migraciones y entradas de postmortem correspondientes.

## Preguntas Frecuentes

### ¿Debería auto-generar docs de esquema desde la base de datos?

Sí, para la línea base estructural. Herramientas como tbls, dbdocs, o comentarios de pg_dump son excelentes puntos de partida. Traquea cambios estructurales con el [Runbook de Migración de BD](/docs/templates/database-migration-runbook-template). Pero siempre agrega documentación narrativa — el "por qué" detrás de decisiones de diseño no puede extraerse del DDL.

### ¿Cómo mantengo los docs de esquema sincronizados con la base de datos?

Genera las partes estructurales automáticamente en CI. Reserva secciones manuales (significado de negocio, racional de indexación) para curación humana. Revisa los docs en el mismo PR que cambia el esquema. Agrega un check de CI que falle si existe un archivo de migración sin update de docs.

### ¿Qué nivel de detalle es demasiado?

Documenta cualquier cosa que confundiría a un nuevo miembro del equipo o que ya has explicado más de dos veces en Slack. Omite nombres auto-documentables obvios como `id` en una primary key a menos que haya un default o regla de generación no obvia.

### ¿Debería documentar cada índice?

Sí. Cada índice tiene un costo (storage, latencia de escritura). Si no puedes explicar por qué existe un índice, es candidato para eliminación. Documenta la migración que lo agregó y el patrón de query que sirve.

### ¿Cómo documento views y materialized views?

Trata las views como tablas en la plantilla. Para cada view documenta: las tablas subyacentes, la lógica de query, si es materializada, y el schedule de refresh. Las materialized views también deben documentar su estrategia de refresh (manual, programada, trigger-based).

### ¿Qué pasa con stored procedures y functions?

Documentalos por separado en una sección de API de los docs de esquema. Para cada función: nombre, parámetros, tipo de retorno, propósito, y efectos secundarios (escrituras, envía notificaciones, etc.). Si una función es llamada por código de aplicación, linkea al servicio que la llama.

### ¿Cómo manejo schema branching para feature development?

Documenta el esquema base normalmente. Para feature branches que agregan tablas o columnas, añade una sección "Cambios de schema branch" listando los objetos temporales y su plan de cleanup. Cuando el feature mergea, mueve los cambios a la documentación principal del esquema y elimina la sección de branch.
