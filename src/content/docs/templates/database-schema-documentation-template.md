---
contentType: docs
slug: database-schema-documentation-template
templateType: database-schema-doc
title: "Database Schema Documentation Template"
description: "A template for documenting database schemas with entity relationships, field definitions, and migration history."
metaDescription: "Database schema documentation template with entity definitions, relationship diagrams, field constraints, indexing strategy, and migration tracking for engineering teams."
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
  metaDescription: "Database schema documentation template with entity definitions, relationship diagrams, field constraints, indexing strategy, and migration tracking for engineering teams."
  keywords:
    - template
    - database
    - schema
    - documentation
    - sql

---

## Overview

Database schemas evolve constantly. Without documentation, every new developer spends hours reverse-engineering table relationships, guessing why a column exists, and wondering whether an index is still used. This template gives you a structure for documenting schemas that stays useful as the database grows.

The template covers four areas:

1. **Entity documentation** — table purpose, column definitions, business meaning
2. **Relationship mapping** — foreign keys, ER diagrams, cascade rules
3. **Indexing strategy** — what each index serves, when it was added, what query it optimizes
4. **Migration tracking** — schema versions, change history, rollback notes

Pair this template with the [Database Migration Runbook](/docs/templates/database-migration-runbook-template) for operational change tracking.

## Template

```markdown
# Schema Documentation: [Database Name]

## Overview
- **Engine:** PostgreSQL 16 / MySQL 8 / etc.
- **Purpose:** One paragraph describing what this database stores and which services read/write to it.
- **Owner team:** [team name]
- **Replication:** [none / streaming / logical]
- **Backup schedule:** [daily / hourly / continuous]

## Entities

### Table: users

**Purpose:** Stores authenticated user accounts for the application.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key, generated server-side |
| email | varchar(255) | NO | — | Unique, lowercase on insert via trigger |
| password_hash | varchar(255) | NO | — | Argon2id hash, never log or expose |
| display_name | varchar(100) | YES | NULL | User-chosen name, shown in UI |
| status | smallint | NO | 1 | 0=deleted, 1=active, 2=suspended, 3=pending_verification |
| metadata | jsonb | YES | '{}' | Flexible key-value store for feature flags, preferences |
| created_at | timestamptz | NO | now() | Row creation timestamp |
| updated_at | timestamptz | NO | now() | Updated via trigger on every UPDATE |
| deleted_at | timestamptz | YES | NULL | Soft delete marker; filtered by application queries |

**Constraints:**
- `users_email_key` — UNIQUE on `email`
- `users_status_check` — CHECK (status >= 0 AND status <= 3)

**Indexes:**
| Name | Columns | Type | Purpose | Added in migration |
|------|---------|------|---------|-------------------|
| users_pkey | id | btree | Primary key | 001_initial |
| users_email_key | email | btree | Login lookup, uniqueness | 001_initial |
| users_status_idx | status | btree | Filter active users in admin panel | 014_admin_dashboard |
| users_created_at_idx | created_at | btree | Pagination by creation date | 022_pagination |

**Business rules:**
- Email is lowercased on insert and update via a trigger
- `status = 0` (deleted) is set by the application, never by a direct SQL update
- `metadata` must not contain PII — enforced by application validation, not DB constraint
- `deleted_at` is set when status changes to 0; both fields must agree

### Table: orders

**Purpose:** Stores customer orders, linked to the user who placed them.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | — | FK to users.id, CASCADE DELETE |
| total_cents | integer | NO | 0 | Total in cents, never float |
| currency | char(3) | NO | 'USD' | ISO 4217 currency code |
| status | smallint | NO | 0 | 0=pending, 1=paid, 2=shipped, 3=delivered, 4=cancelled, 5=refunded |
| placed_at | timestamptz | NO | now() | When the order was placed |
| shipped_at | timestamptz | YES | NULL | When the order was shipped |

**Constraints:**
- `orders_user_id_fkey` — FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- `orders_total_check` — CHECK (total_cents >= 0)
- `orders_currency_check` — CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY'))

**Indexes:**
| Name | Columns | Type | Purpose | Added in migration |
|------|---------|------|---------|-------------------|
| orders_pkey | id | btree | Primary key | 001_initial |
| orders_user_id_idx | user_id | btree | List orders by user | 001_initial |
| orders_status_placed_at_idx | status, placed_at | btree | Admin dashboard: filter by status, sort by date | 014_admin_dashboard |

**Business rules:**
- `total_cents` is stored as integer to avoid floating-point errors
- Orders with `status >= 2` cannot be cancelled (application enforces)
- `shipped_at` must be null when `status < 2` (application enforces)

## Relationships

```
users 1───∞ orders
  │              │
  │              └── order_items (line items per order)
  │
  └── user_preferences (1:1, optional)
```

- **users → orders**: One user can have many orders. CASCADE DELETE removes orders when a user is hard-deleted (rare; soft delete is preferred).
- **orders → order_items**: One order has many line items. CASCADE DELETE.
- **users → user_preferences**: One-to-one, LEFT JOIN. Preferences are optional.

## Enum Reference

| Table | Column | Value | Meaning |
|-------|--------|-------|---------|
| users | status | 0 | Deleted (soft) |
| users | status | 1 | Active |
| users | status | 2 | Suspended (admin action) |
| users | status | 3 | Pending email verification |
| orders | status | 0 | Pending payment |
| orders | status | 1 | Paid, awaiting shipment |
| orders | status | 2 | Shipped |
| orders | status | 3 | Delivered |
| orders | status | 4 | Cancelled |
| orders | status | 5 | Refunded |

## Migration History

| Version | Date | Description | Author | Rollback notes |
|---------|------|-------------|--------|----------------|
| 001 | 2026-01-15 | Initial schema (users, orders, order_items) | Mathias | Drop all tables |
| 014 | 2026-03-02 | Add admin dashboard indexes | Mathias | DROP INDEX orders_status_placed_at_idx; DROP INDEX users_status_idx; |
| 022 | 2026-05-10 | Add pagination index on users.created_at | Mathias | DROP INDEX users_created_at_idx; |

## Deprecated Columns

| Table | Column | Deprecated on | Removal target | Replacement |
|-------|--------|---------------|----------------|-------------|
| users | legacy_id | 2026-04-01 | 2026-07-01 | Migrated to `id` (uuid) in migration 018 |

## Notes

- All timestamps are stored as `timestamptz` in UTC. Application converts to user timezone on display.
- Monetary values are stored as integer cents, never as float or numeric.
- Soft deletes use `deleted_at` + `status = 0`. Hard deletes require a documented reason and a migration.
- The `metadata` jsonb column is for non-structured data only. If a key becomes queried regularly, promote it to a real column.
```

## What Works

- **Document every table and column** — Future developers (including yourself) will thank you. Pair schema docs with a [Migration Runbook](/docs/templates/database-migration-runbook-template) for change tracking.
- **Explain business meaning, not just types** — `status` is obvious; why `metadata` exists is not
- **Include the "why" for indexes** — Indexes have cost; document what query they serve. See [SQL Performance Tuning Guide](/guides/databases/sql-performance-tuning-guide) for indexing strategy.
- **Version your schema docs** — Track what changed and when, just like code
- **Keep the ER diagram updated** — Visual reference is faster than reading SQL for understanding relationships
- **Mark deprecated columns** — Do not delete docs for dropped columns immediately; mark them deprecated with a removal date
- **Document enum values in a reference table** — Magic numbers like `status = 3` are meaningless without context
- **Record migration rollback notes** — When a deployment fails, you need to roll back fast

## Common Mistakes

- Documenting the schema once and never updating it — stale documentation is worse than none
- Only documenting tables, ignoring indexes and constraints — indexes reveal query patterns
- Using vague column names without explanation — `data` or `value` tells you nothing
- Not documenting soft delete patterns — new developers often miss `deleted_at` filters
- Forgetting to document enum values — what does `status = 3` mean?
- Storing money as float — use integer cents or a dedicated decimal type
- Not documenting cascade rules — `ON DELETE CASCADE` can silently remove data
- Mixing UTC and local timestamps — pick one (UTC) and enforce it with `timestamptz`
- Skipping the "business rules" section — constraints in SQL do not capture all application-level rules

## Variants

### Auto-generated docs (tbls / dbdocs)

Tools like [tbls](https://github.com/k1LoW/tbls) and [dbdocs](https://dbdocs.io) generate schema documentation from the live database. They produce entity relationship diagrams, column listings, and constraint summaries automatically. Use them for the structural baseline, then layer narrative documentation (business rules, enum meanings, indexing rationale) on top.

### Markdown in-repo docs

Keep schema docs as Markdown files in the same repository as the application code. This allows docs to be reviewed in PRs alongside schema changes. Use the template above as a starting point.

### Wiki / Confluence

For organizations with existing wiki infrastructure, adapt the template sections into wiki pages. Link each table to its corresponding migration history and postmortem entries.

## Frequently Asked Questions

### Should I auto-generate schema docs from the database?

Yes, for the structural baseline. Tools like tbls, dbdocs, or pg_dump comments are great starting points. Track structural changes with the [Database Migration Runbook](/docs/templates/database-migration-runbook-template). But always add narrative documentation — the "why" behind design decisions cannot be extracted from DDL.

### How do I keep schema docs in sync with the database?

Generate the structural parts automatically in CI. Reserve manual sections (business meaning, indexing rationale) for human curation. Review docs in the same PR that changes the schema. Add a CI check that fails if a migration file exists without a corresponding doc update.

### What level of detail is too much?

Document anything that would confuse a new team member or that you have explained more than twice in Slack. Skip obvious self-documenting names like `id` on a primary key unless there is a non-obvious default or generation rule.

### Should I document every index?

Yes. Every index has a cost (storage, write latency). If you cannot explain why an index exists, it is a candidate for removal. Document the migration that added it and the query pattern it serves.

### How do I document views and materialized views?

Treat views like tables in the template. For each view, document: the underlying tables, the query logic, whether it is materialized, and the refresh schedule. Materialized views should also document their refresh strategy (manual, scheduled, trigger-based).

### What about stored procedures and functions?

Document them separately in an API section of the schema docs. For each function: name, parameters, return type, purpose, and side effects (writes, sends notifications, etc.). If a function is called by application code, link to the calling service.

### How do I handle schema branching for feature development?

Document the base schema normally. For feature branches that add tables or columns, add a "Branch schema changes" section listing the temporary objects and their cleanup plan. When the feature merges, move the changes into the main schema documentation and remove the branch section.
