---
contentType: recipes
slug: soft-deletes
title: "Soft Deletes"
description: "How to implement soft deletes to preserve data while hiding records from normal queries."
metaDescription: "Learn to implement soft deletes in Python, JavaScript, and Java. Covers flag columns, filtered queries, and hard delete strategies."
difficulty: beginner
topics:
  - databases
tags:
  - audit
  - data-recovery
  - database
  - deletion
  - java
  - javascript
  - python
  - soft-deletes
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement soft deletes in Python, JavaScript, and Java. Covers flag columns, filtered queries, and hard delete strategies."
  keywords:
    - soft-deletes
    - deletion
    - data-recovery
    - audit
    - python
    - javascript
    - java
---
## Overview

Soft deletes mark records as deleted without actually removing them from the database. This preserves data for auditing, recovery, and referential integrity while keeping deleted records invisible to normal application queries. This recipe implements soft deletes with timestamp flags and filtered queries in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Users need to recover accidentally deleted data
- You must maintain audit trails for compliance (GDPR, HIPAA, SOC2)
- Foreign key constraints prevent hard deletes
- You want to show "recently deleted" trash/recycle bin features

## Solution

### Python (SQLAlchemy)

```python
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import declarative_base, Session, Query
from sqlalchemy.sql import func
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

class User extends Model {
  async softDelete() {
    this.deletedAt = new Date();
    await this.save();
  }
}

User.init(
  {
    email: { type: DataTypes.STRING, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "User",
    paranoid: true, // Sequelize handles soft deletes automatically
    deletedAt: "deletedAt",
  }
);

await sequelize.sync();

const user = await User.create({ email: "alice@example.com" });
await user.destroy(); // Soft delete because paranoid: true

const visible = await User.findAll(); // Excludes soft-deleted by default
const deleted = await User.findAll({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } });
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

// Repository with filter enabled
public List<User> findActiveUsers(EntityManager em) {
    em.unwrap(Session.class).enableFilter("softDeleteFilter").setParameter("deleted", false);
    return em.createQuery("SELECT u FROM User u", User.class).getResultList();
}
```

## Explanation

Soft deletes work by adding a `deleted_at` (or `is_deleted`) column to your table. Instead of `DELETE FROM`, you execute `UPDATE ... SET deleted_at = NOW()`. All standard queries add `WHERE deleted_at IS NULL` to exclude soft-deleted rows.

**Trade-offs**:

- **Pros**: Recoverable data, referential integrity preserved, audit trail built-in
- **Cons**: Tables grow indefinitely, unique constraints must include `deleted_at`, indexes need filtering

For true removal, implement a "hard delete" or "purge" operation that runs `DELETE FROM` on records soft-deleted longer than a retention period (e.g., 30 days).

## Variants

| Approach | Column | Best For | Notes |
|----------|--------|----------|-------|
| Timestamp (`deleted_at`) | `DATETIME NULL` | Audit trails, recovery windows | Supports "deleted before X date" queries |
| Boolean (`is_deleted`) | `BOOLEAN DEFAULT FALSE` | Simple logic, no recovery timeline | Requires separate `deleted_at` for audits |
| Separate archive table | Full copy | Compliance, performance | Most complex, triggers or app-level |
| Partition by deletion status | Native PG/MySQL | Very large tables | Use table partitioning for active vs deleted |

## Best Practices

- **Always filter by default**: Your ORM or query builder should exclude deleted records unless explicitly asked.
- **Include `deleted_at` in unique indexes**: Otherwise you can't recreate a record with the same unique key after soft delete.
- **Schedule periodic hard deletes**: GDPR's "right to erasure" requires actual deletion after a retention period.
- **Log hard deletes separately**: When you finally purge, log it to an audit table or event stream.
- **Test your recovery flow**: A soft delete is useless if users can't actually restore from a trash UI.

## Common Mistakes

- **Forgetting to filter**: A missing `WHERE deleted_at IS NULL` exposes deleted data to users.
- **Unique constraint violations**: Creating a new user with the same email as a soft-deleted user fails if the unique index doesn't include `deleted_at`.
- **No purge strategy**: Soft-deleted data accumulates forever, bloating backups and slowing queries.
- **Cascading soft deletes**: If `posts` belong to `users`, deleting a user should probably soft-delete their posts too. Implement this in your service layer.
- **Querying deleted records by default**: Some ORMs (Django, Sequelize) handle this automatically, but raw SQL and some ORMs don't.

## Frequently Asked Questions

### How do I handle unique constraints with soft deletes?

Make your unique index partial or conditional: `UNIQUE (email, deleted_at) WHERE deleted_at IS NULL` (PostgreSQL) or `UNIQUE (email, deleted_at)` (MySQL/SQLite). Alternatively, use a composite index on `(email, is_deleted)` and ensure `is_deleted` is part of the constraint.

### Does soft delete violate GDPR?

GDPR Article 17 grants the right to erasure. Soft delete alone is not sufficient if the user requests deletion. You must either (a) hard delete after a retention period, or (b) anonymize the record so it can no longer be linked to the individual. Document your retention policy in your privacy policy.

### How do I cascade soft deletes to related records?

Implement this in your service or repository layer, not the database (foreign keys won't cascade updates). When soft-deleting a `User`, loop through their `Posts` and soft-delete each one. For large trees, use a recursive CTE or batch update. Some ORMs (Django, Eloquent) provide built-in soft-delete cascade packages.
