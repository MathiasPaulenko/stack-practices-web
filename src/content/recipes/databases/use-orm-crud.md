---
contentType: recipes
slug: use-orm-crud
title: "Use ORM for CRUD"
description: "How to perform CRUD operations using ORMs in Python, JavaScript, and Java."
metaDescription: "Learn ORM CRUD operations using SQLAlchemy, Prisma, and Hibernate with practical code examples in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - databases
tags:
  - databases
  - orm
  - crud
  - python
  - javascript
  - java
relatedResources:
  - /recipes/connect-to-mysql
  - /recipes/connect-to-postgresql
  - /recipes/connect-to-redis
  - /recipes/execute-raw-sql
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Learn ORM CRUD operations using SQLAlchemy, Prisma, and Hibernate with practical code examples in Python, JavaScript, and Java."
  keywords:
    - databases
    - orm
    - crud
    - python
    - javascript
    - java
---
## Overview

ORMs (Object-Relational Mappers) abstract database interactions into native code objects, reducing boilerplate SQL and improving maintainability. This recipe demonstrates CRUD operations using SQLAlchemy (Python), Prisma (JavaScript), and Hibernate (Java).

## When to Use

Use this resource when:
- Building applications with many entity types and relationships
- Reducing SQL boilerplate and migration overhead
- Ensuring type safety and autocomplete for database operations

## Solution

### Python

```python
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    role = Column(String, default='user')

engine = create_engine('postgresql://user:pass@localhost/mydb')
Session = sessionmaker(bind=engine)

# Create
session = Session()
user = User(email='alice@example.com', role='admin')
session.add(user)
session.commit()

# Read
user = session.query(User).filter_by(email='alice@example.com').first()

# Update
user.role = 'superadmin'
session.commit()

# Delete
session.delete(user)
session.commit()
session.close()
```

### JavaScript

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crud() {
    // Create
    const user = await prisma.user.create({
        data: { email: 'alice@example.com', role: 'admin' }
    });

    // Read
    const found = await prisma.user.findUnique({
        where: { email: 'alice@example.com' }
    });

    // Update
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'superadmin' }
    });

    // Delete
    await prisma.user.delete({ where: { id: user.id } });
}
```

### Java

```java
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false, unique = true)
    private String email;
    private String role = "user";

    // getters and setters omitted
}

public class UserRepository {
    private final EntityManager em;

    public UserRepository(EntityManager em) { this.em = em; }

    public void create(User user) {
        em.getTransaction().begin();
        em.persist(user);
        em.getTransaction().commit();
    }

    public User findByEmail(String email) {
        return em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)
                 .setParameter("email", email)
                 .getSingleResult();
    }

    public void updateRole(Integer id, String role) {
        em.getTransaction().begin();
        User user = em.find(User.class, id);
        user.setRole(role);
        em.getTransaction().commit();
    }

    public void delete(Integer id) {
        em.getTransaction().begin();
        em.remove(em.find(User.class, id));
        em.getTransaction().commit();
    }
}
```

## Explanation

**SQLAlchemy** uses a declarative base class where Python classes map to tables. Sessions manage transactions and object lifecycles. **Prisma** generates a type-safe client from a schema file, offering compile-time validation and excellent IDE support. **Hibernate** uses JPA annotations (`@Entity`, `@Id`, `@Column`) to map Java objects to tables, with `EntityManager` handling persistence contexts and transactions.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `Django ORM` | Batteries-included, tightly coupled to Django |
| JavaScript | `TypeORM` | Decorator-based ORM with strong TypeScript support |
| Java | `Spring Data JPA` | Repository abstraction on top of Hibernate |

## Best Practices

1. Define explicit schemas and constraints in the ORM, not just the database
2. Use transactions for multi-step operations to ensure atomicity
3. Add database-level indexes on frequently queried columns
4. Use eager loading (`joinedload`, `include`, `fetch`) carefully to avoid N+1 queries
5. Keep ORM entities thin; move business logic to service layers

## Common Mistakes

1. Using ORMs for complex analytical queries, causing poor performance
2. Ignoring the N+1 query problem by loading related data in loops
3. Storing business logic inside ORM entity classes
4. Not handling `LazyInitializationException` in Hibernate outside sessions
5. Forgetting to close sessions or Prisma clients, causing connection leaks

## Frequently Asked Questions

### Should I use an ORM or raw SQL?

Use an ORM for CRUD, relationships, and migrations. Use raw SQL for complex aggregations, reports, and performance-critical paths. Many projects use both.

### How do I prevent N+1 queries with an ORM?

Use eager loading: `selectinload` in SQLAlchemy, `include` in Prisma, `FetchType.EAGER` or `JOIN FETCH` in Hibernate. Monitor query counts in development.

### Can ORMs handle database migrations?

Yes. SQLAlchemy uses Alembic, Prisma has built-in migrations, and Hibernate can auto-generate schemas with `hbm2ddl`. However, production migrations should be reviewed and tested.
