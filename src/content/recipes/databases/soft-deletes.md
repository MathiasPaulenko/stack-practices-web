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
  - database
  - audit
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
  - /recipes/caching-redis
  - /recipes/database-migrations-safely
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

Soft deletes mark records as deleted without actually removing them from the database. This preserves data for auditing, recovery, and referential integrity while keeping deleted records invisible to normal application queries. The following implements soft deletes with timestamp flags and filtered queries in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Users need to recover accidentally deleted data. See [Database Transactions](/recipes/databases/database-transactions) for rollback patterns.
- You must maintain audit trails for compliance (GDPR, HIPAA, SOC2). See [API Security Checklist](/guides/security/api-security-checklist-guide) for compliance.
- Foreign key constraints prevent hard deletes. See [SQL Joins](/recipes/databases/sql-joins) for relational patterns.
- You want to show "recently deleted" trash/recycle bin capabilities

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

## What Works

- **Always filter by default**: Your ORM or query builder should exclude deleted records unless explicitly asked.
- **Include `deleted_at` in unique indexes**: Otherwise you can't recreate a record with the same unique key after soft delete.
- **Schedule periodic hard deletes**: GDPR's "right to erasure" requires actual deletion after a retention period. See [Batch Processing](/recipes/data/batch-processing-patterns) for scheduled jobs.
- **Log hard deletes separately**: When you finally purge, log it to an audit table or event stream. See [Logging](/recipes/api/logging) for audit trails.
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

### Cascade Soft Delete with Recursive CTE

```sql
-- Soft delete a user and all their posts and comments
WITH RECURSIVE dependent_posts AS (
    SELECT id FROM posts WHERE user_id = 42 AND deleted_at IS NULL
)
UPDATE posts SET deleted_at = NOW()
WHERE id IN (SELECT id FROM dependent_posts);

WITH RECURSIVE dependent_comments AS (
    SELECT id FROM comments WHERE post_id IN (
        SELECT id FROM posts WHERE user_id = 42
    ) AND deleted_at IS NULL
)
UPDATE comments SET deleted_at = NOW()
WHERE id IN (SELECT id FROM dependent_comments);

UPDATE users SET deleted_at = NOW() WHERE id = 42;
```

### Restore Soft-Deleted Records

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

### Scheduled Purge Job for GDPR Compliance

```python
import datetime
from sqlalchemy import text

def purge_old_soft_deletes(session, days=30):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    # Hard delete users soft-deleted more than 30 days ago
    result = session.execute(text(
        "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff"
    ), {"cutoff": cutoff})

    session.execute(text(
        "DELETE FROM posts WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff"
    ), {"cutoff": cutoff})

    session.commit()
    print(f"Purged {result.rowcount} users")
```

### Partial Unique Index for Soft Deletes in PostgreSQL

```sql
-- Allow re-creating a record with the same email after soft delete
CREATE UNIQUE INDEX idx_users_email_active
ON users (email)
WHERE deleted_at IS NULL;

-- This allows multiple soft-deleted records with the same email,
-- but only one active record per email.
```

### Soft Delete with Table Partitioning

```sql
-- Partition users by deletion status for large tables
CREATE TABLE users (
    id BIGSERIAL,
    email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY LIST (deleted_at IS NULL);

CREATE TABLE users_active PARTITION OF users
FOR VALUES IN (true);

CREATE TABLE users_deleted PARTITION OF users
FOR VALUES IN (false);

-- Queries on active users only scan the active partition
SELECT * FROM users WHERE email = 'alice@example.com';
-- Only scans users_active partition
```

### Django Soft Delete with Signals

```python
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class BaseModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)
    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Includes deleted

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save()

    class Meta:
        abstract = True

class User(BaseModel):
    email = models.EmailField(unique=False)

class Post(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)

@receiver(pre_delete, sender=User)
def cascade_soft_delete(sender, instance, **kwargs):
    Post.objects.filter(user=instance, deleted_at__isnull=True).update(
        deleted_at=timezone.now()
    )
```

## Additional Best Practices

6. **Use database-level defaults for `deleted_at`.** Set `DEFAULT NULL` explicitly to avoid confusion:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL
);
```

7. **Index the `deleted_at` column.** Queries filtering `WHERE deleted_at IS NULL` benefit from a partial index:

```sql
CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;
```

8. **Log soft delete events.** Record who deleted and when in an audit table:

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INTEGER,
    action VARCHAR(20),
    actor_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO audit_log (table_name, record_id, action, actor_id)
VALUES ('users', 42, 'soft_delete', 1);
```

9. **Use `deleted_at` instead of `is_deleted`.** A timestamp provides both the deletion flag and the deletion time, useful for retention policies and debugging.

10. **Test cascade behavior explicitly.** Verify that soft-deleting a parent also soft-deletes children, and that restoring a parent restores children.

## Additional Common Mistakes

6. **Not updating `updated_at` on soft delete.** Some audit systems track `updated_at` changes. Make sure soft delete updates this timestamp.

7. **Soft-deleting without checking permissions.** Always verify the user has permission to delete before setting `deleted_at`.

8. **Not handling soft-deleted records in search indexes.** Elasticsearch or Meilisearch indexes must be updated when records are soft-deleted. Remove or mark them as deleted in the search index.

9. **Using `COUNT(*)` without filtering.** `COUNT(*)` includes soft-deleted records. Always use `COUNT(*) WHERE deleted_at IS NULL` for active counts.

10. **Not considering referential integrity for hard deletes.** When purging soft-deleted records, handle foreign key constraints. Delete children first or use `ON DELETE CASCADE`.

## Additional FAQ

### How do I handle soft deletes with Elasticsearch?

When soft-deleting a record, remove it from the search index or mark it as deleted:

```python
# Remove from Elasticsearch
es.delete(index="articles", id=article_id)

# Or mark as deleted
es.update(index="articles", id=article_id, body={
    "doc": {"deleted": True}
})
```

### Should I use soft deletes for all tables?

No. Use soft deletes for user-facing data where recovery is valuable (users, posts, orders). Don't use them for transient data (sessions, logs, cache entries) or high-volume tables where the overhead isn't justified.

### How do I implement a "trash" UI with restore?

Store the `deleted_at` timestamp. Query `WHERE deleted_at IS NOT NULL` for the trash view. Provide a restore button that sets `deleted_at = NULL`. Show the deletion date so users know how long until auto-purge.

### What is the performance impact of soft deletes?

Soft deletes increase table size, which slows queries and increases backup time. Partial indexes mitigate query performance. Schedule regular purges to control table growth. For very large tables, consider partitioning by deletion status.

## Performance Tips

1. **Use partial indexes for active records.** This keeps the index small and fast:

```sql
CREATE INDEX idx_orders_active_user ON orders (user_id) WHERE deleted_at IS NULL;
```

2. **Schedule purges during low-traffic periods.** Run the purge job as a cron task during off-peak hours to avoid impacting user queries.

3. **Use `VACUUM` after purges.** Hard deletes create dead tuples. Run `VACUUM` to reclaim space:

```sql
VACUUM (VERBOSE, ANALYZE) users;
```

4. **Archive soft-deleted records to a separate table.** Move old soft-deleted records to an archive table to keep the main table small:

```sql
INSERT INTO users_archive SELECT * FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
```

5. **Use `EXPLAIN` to verify index usage.** Ensure queries on active records use the partial index:

```sql
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com' AND deleted_at IS NULL;
-- Should show "Index Scan using idx_users_email_active"
```
