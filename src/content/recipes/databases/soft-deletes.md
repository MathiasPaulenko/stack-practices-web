---
contentType: recipes
slug: soft-deletes
title: "Implement Soft Deletes in Databases with Python, JS and Java"
description: "Learn to implement soft deletes in databases. Practical examples in Python, JavaScript, and Java with flag columns, filtered queries, and hard deletes."
metaDescription: "Implement soft deletes in databases with Python, JavaScript and Java. Use flag columns, filtered queries, unique indexes, purge jobs and recovery."
difficulty: beginner
topics:
  - databases
tags:
  - database
  - audit
  - sql
  - postgresql
  - soft-delete
  - python
  - javascript
  - java
relatedResources:
  - /recipes/database-transactions
  - /recipes/database-migrations-safely
  - /recipes/database-indexing
  - /recipes/database-query-result-caching
  - /patterns/repository-pattern
  - /patterns/unit-of-work-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Implement soft deletes in databases with Python, JavaScript and Java. Use flag columns, filtered queries, unique indexes, purge jobs and recovery."
  keywords:
    - soft deletes
    - logical delete pattern
    - database soft delete
    - postgresql
    - sql
---

## Overview

Soft deletes mark records as deleted without actually removing them. This
preserves data for auditing, recovery, and referential integrity while keeping
deleted records invisible to normal application queries. The following shows
soft deletes with timestamp flags, filtered queries, unique indexes, purge jobs,
and restore flows in Python, JavaScript, and Java.

## When to Use

- Users need to recover accidentally deleted data. See
  [Database Transactions](/recipes/database-transactions/) for rollback patterns.
- You must maintain audit trails for compliance (GDPR, HIPAA, SOC2).
- Foreign key constraints make hard deletes difficult or risky.
- You want to show a "trash" or "recycle bin" UI.

### When to avoid

- Hard deletion is required by law or user request. Soft delete alone isn't
  enough for GDPR erasure; you still need a purge or anonymization step.
- Tables with extremely high write volume where deleted rows would bloat storage
  and backups. Use a short retention window and aggressive purging.
- Data without any recovery or audit requirement. A real `DELETE` is simpler and
  cheaper.

## Solution

### Python (SQLAlchemy)

```python
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, Session
import datetime

Base = declarative_base()

class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)

    @classmethod
    def query_visible(cls, session: Session):
        return session.query(cls).filter(cls.deleted_at.is_(None))

    def soft_delete(self):
        self.deleted_at = datetime.datetime.utcnow()

class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)

engine = create_engine("sqlite:///app.db")
Base.metadata.create_all(engine)

with Session(engine) as session:
    user = User(email="alice@example.com")
    session.add(user)
    session.commit()

    # Soft delete
    user.soft_delete()
    session.commit()

    # Only visible users
    visible = User.query_visible(session).all()
    print(visible)  # []
```

### JavaScript (Sequelize)

```javascript
const { Sequelize, DataTypes, Model, Op } = require("sequelize");
const sequelize = new Sequelize({ dialect: "sqlite", storage: "app.db" });

class User extends Model {}

User.init(
  {
    email: { type: DataTypes.STRING, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "User",
    paranoid: true,
    deletedAt: "deletedAt",
  }
);

await sequelize.sync();

const user = await User.create({ email: "alice@example.com" });
await user.destroy(); // Soft delete because paranoid: true

const visible = await User.findAll(); // Excludes soft-deleted by default
const deleted = await User.findAll({
  paranoid: false,
  where: { deletedAt: { [Op.ne]: null } },
});
```

### Java (JPA / Hibernate)

```java
import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "users")
@FilterDef(name = "softDeleteFilter", parameters = @ParamDef(name = "deleted", type = Boolean.class))
@Filter(name = "softDeleteFilter", condition = "deleted_at is null")
public class User {
    @Id @GeneratedValue
    private Long id;
    private String email;
    private Instant deletedAt;

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    // getters/setters omitted
}

public List<User> findActiveUsers(EntityManager em) {
    em.unwrap(Session.class).enableFilter("softDeleteFilter").setParameter("deleted", false);
    return em.createQuery("SELECT u FROM User u", User.class).getResultList();
}
```

### PostgreSQL partial unique index

```sql
-- Allow re-creating a record with the same email after soft delete
CREATE UNIQUE INDEX idx_users_email_active
ON users (email)
WHERE deleted_at IS NULL;

-- Only one active user per email; multiple soft-deleted rows are allowed.
```

### Cascade soft delete with recursive CTE

```sql
WITH RECURSIVE user_posts AS (
    SELECT id FROM posts WHERE user_id = 42 AND deleted_at IS NULL
)
UPDATE posts SET deleted_at = NOW()
WHERE id IN (SELECT id FROM user_posts);

UPDATE users SET deleted_at = NOW() WHERE id = 42;
```

### Restore soft-deleted records

```python
def restore_user(session, user_id):
    user = session.query(User).filter_by(id=user_id).first()
    if user and user.deleted_at is not None:
        user.deleted_at = None
        session.commit()
        # Restore related posts
        session.query(Post).filter_by(user_id=user_id).update({"deleted_at": None})
        session.commit()
    return user
```

### Scheduled purge job for GDPR compliance

```python
import datetime
from sqlalchemy import text

def purge_old_soft_deletes(session, days=30):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    result = session.execute(text(
        "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff"
    ), {"cutoff": cutoff})

    session.execute(text(
        "DELETE FROM posts WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff"
    ), {"cutoff": cutoff})

    session.commit()
    print(f"Purged {result.rowcount} users")
```

## Explanation

Soft deletes add a `deleted_at` (or `is_deleted`) column. Instead of `DELETE
FROM`, you run `UPDATE ... SET deleted_at = NOW()`. Standard queries add `WHERE
deleted_at IS NULL` to exclude soft-deleted rows.

This gives you recoverable data, preserved foreign keys, and an automatic audit
trail. The cost is bigger tables, special unique indexes, and a purge strategy
for true removal.

For real deletion, schedule a purge job that runs `DELETE FROM` on records
soft-deleted longer than your retention period. This is required for GDPR and
keeps storage and backups from growing forever.

## Variants

| Approach | Column | Best for | Notes |
| --- | --- | --- | --- |
| Timestamp (`deleted_at`) | `DATETIME NULL` | Audit trails, recovery windows | Supports "deleted before X date" queries |
| Boolean (`is_deleted`) | `BOOLEAN DEFAULT FALSE` | Simple logic | Add a separate `deleted_at` for audits |
| Archive table | Full copy | Compliance, large tables | More complex; triggers or app-level |
| Partition by deletion status | Native PG/MySQL | Very large tables | Separate partitions for active vs deleted |

## Best Practices

- Filter deleted rows by default in your ORM, repository, or query builder.
- Include `deleted_at` in unique indexes so a record can be re-created after
  soft delete.
- Schedule periodic hard deletes after your retention period. GDPR erasure
  requires actual deletion or anonymization.
- Log hard deletes to an audit table or event stream when you finally purge.
- Test the restore flow. A soft delete is only useful if users can recover from a
  trash UI.
- Use partial indexes on active records to keep indexes small and fast:

```sql
CREATE INDEX idx_orders_active_user ON orders (user_id) WHERE deleted_at IS NULL;
```

- Run purge jobs during low-traffic windows and `VACUUM` (PostgreSQL) afterward.
- Use `EXPLAIN` to confirm active queries use the partial index.

## Common Mistakes

- Forgetting `WHERE deleted_at IS NULL` in raw queries and exposing deleted data.
- Unique constraint violations when recreating a record that was soft-deleted.
- No purge strategy, letting soft-deleted data accumulate forever.
- Cascading soft deletes inconsistently. If `posts` belong to `users`, decide
  whether deleting a user also soft-deletes their posts, and implement it
  uniformly in the service layer.
- Querying deleted records by default because the ORM isn't configured to filter
  them.
- Running a soft delete on data that should be hard-deleted immediately, such as
  user data under a GDPR erasure request.

## FAQ

### How do I handle unique constraints with soft deletes?

Make the unique index partial: `UNIQUE (email) WHERE deleted_at IS NULL` in
PostgreSQL, or `UNIQUE (email, deleted_at)` in MySQL/SQLite. This blocks
duplicate active values but allows several soft-deleted rows.

### Does soft delete violate GDPR?

GDPR Article 17 grants the right to erasure. Soft delete alone isn't sufficient.
You must hard delete or anonymize after a documented retention period.

### How do I cascade soft deletes to related records?

Implement it in the service or repository layer. When soft-deleting a `User`,
loop through or batch-update related `Posts`. For large trees, use a recursive
CTE or an ORM package that supports soft-delete cascades.

### When should I hard delete instead of soft delete?

When the data has no recovery or audit value, or when a user or regulator
requests erasure. Also use hard delete for high-churn, non-sensitive data that
would bloat tables.

### How do I restore a soft-deleted record?

Set `deleted_at` to `NULL` and commit. Also restore related records if your
business logic requires it. Wrap the operation in a transaction.

### How do I keep queries fast with soft deletes?

Add partial indexes on `deleted_at IS NULL` for the columns you query most. Keep
soft-deleted rows in a separate archive table or partition when they become old,
and purge aggressively.
