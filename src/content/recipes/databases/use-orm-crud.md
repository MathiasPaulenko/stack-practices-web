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
  - /guides/database-normalization-guide
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

ORMs (Object-Relational Mappers) abstract database interactions into native code objects, reducing boilerplate SQL and improving maintainability. CRUD operations using SQLAlchemy (Python), Prisma (JavaScript), and Hibernate (Java).

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

## What Works

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

### SQLAlchemy with Relationships and Eager Loading

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, selectinload

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    role = Column(String, default='user')
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = 'posts'
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'))
    author = relationship("User", back_populates="posts")

engine = create_engine('postgresql://user:pass@localhost/mydb')
Session = sessionmaker(bind=engine)
session = Session()

# Eager loading with selectinload (avoids N+1)
from sqlalchemy import select
stmt = (
    select(User)
    .options(selectinload(User.posts))
    .where(User.role == 'admin')
)
admins_with_posts = session.execute(stmt).scalars().all()

# Bulk insert
session.add_all([
    User(email=f'user{i}@example.com', role='user')
    for i in range(100)
])
session.commit()

# Bulk update with Core
from sqlalchemy import update
session.execute(
    update(User)
    .where(User.role == 'user')
    .values(role='member')
)
session.commit()
```

### Prisma Schema with Relations

```prisma
// schema.prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  role  String  @default("user")
  posts Post[]

  @@index([role])
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])

  @@index([authorId])
}
```

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create with nested records
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    role: 'admin',
    posts: {
      create: [
        { title: 'First Post' },
        { title: 'Second Post' },
      ],
    },
  },
  include: { posts: true }, // Eager load
});

// Transaction with multiple operations
const [newUser, updatedPost] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'bob@example.com' } }),
  prisma.post.update({ where: { id: 1 }, data: { title: 'Updated' } }),
]);

// Upsert (create or update)
const result = await prisma.user.upsert({
  where: { email: 'carol@example.com' },
  update: { role: 'admin' },
  create: { email: 'carol@example.com', role: 'admin' },
});

// Raw SQL for complex queries
const topUsers = await prisma.$queryRaw`
  SELECT u.email, COUNT(p.id) AS post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  GROUP BY u.email
  ORDER BY post_count DESC
  LIMIT 10
`;
```

### Django ORM

```python
# models.py
from django.db import models

class User(models.Model):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, default='user')

    class Meta:
        indexes = [models.Index(fields=['role'])]

class Post(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')

# CRUD operations
user = User.objects.create(email='alice@example.com', role='admin')
users = User.objects.filter(role='admin').select_related('posts')  # Eager load
user.role = 'superadmin'
user.save()
user.delete()

# Bulk create
User.objects.bulk_create([
    User(email=f'user{i}@example.com') for i in range(100)
])

# Bulk update
User.objects.filter(role='user').update(role='member')

# Aggregation
from django.db.models import Count, Avg
User.objects.annotate(post_count=Count('posts')).filter(post_count__gt=5)
```

### Spring Data JPA Repository

```java
public interface UserRepository extends JpaRepository<User, Integer> {

    // Derived query methods
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);

    // Custom queries with @Query
    @Query("SELECT u FROM User u WHERE u.role = :role ORDER BY u.email")
    List<User> findByRoleOrdered(@Param("role") String role);

    // Native query
    @Query(value = "SELECT * FROM users WHERE email LIKE :pattern",
           nativeQuery = true)
    List<User> findByEmailPattern(@Param("pattern") String pattern);

    // Modifying queries
    @Modifying
    @Query("UPDATE User u SET u.role = :role WHERE u.id = :id")
    int updateRole(@Param("id") Integer id, @Param("role") String role);

    // Pagination and sorting
    Page<User> findByRole(String role, Pageable pageable);
}

// Usage with pagination
Pageable pageable = PageRequest.of(0, 20, Sort.by("email").ascending());
Page<User> adminPage = userRepository.findByRole("admin", pageable);
```

### TypeORM (TypeScript)

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ default: 'user' })
  role: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

@Entity()
class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}

// Repository pattern
const userRepo = dataSource.getRepository(User);

// Create
const user = userRepo.create({ email: 'alice@example.com', role: 'admin' });
await userRepo.save(user);

// Read with relations
const users = await userRepo.find({
  where: { role: 'admin' },
  relations: ['posts'],
  order: { email: 'ASC' },
  take: 20,
  skip: 0,
});

// Bulk operations
await userRepo
  .createQueryBuilder()
  .update()
  .set({ role: 'member' })
  .where('role = :role', { role: 'user' })
  .execute();
```

## Additional Best Practices


- For a deeper guide, see [Connect to MySQL](/recipes/connect-to-mysql/).

6. **Use `selectinload` or `joinedload` for relationships.** The default lazy loading causes N+1 queries. SQLAlchemy 1.4+ provides `selectinload` as the preferred strategy:

```python
# Bad: N+1 queries (1 for users + N for each user's posts)
users = session.query(User).all()
for user in users:
    print(len(user.posts))  # Triggers a query per user

# Good: 2 queries total
users = session.execute(
    select(User).options(selectinload(User.posts))
).scalars().all()
```

7. **Use bulk operations for batch inserts and updates.** Individual `INSERT` statements are slow for large datasets:

```python
# SQLAlchemy bulk insert (no ORM overhead)
session.bulk_insert_mappings(User, [
    {'email': f'user{i}@example.com', 'role': 'user'}
    for i in range(1000)
])
session.commit()
```

8. **Enable query logging in development.** Watch every SQL statement your ORM generates:

```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

```javascript
// Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

9. **Use connection pooling.** ORMs create connections per session by default. Configure pooling for production:

```python
engine = create_engine(
    'postgresql://user:pass@localhost/mydb',
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

10. **Map ORM entities to DTOs, not directly to API responses.** Exposing ORM entities to APIs causes serialization issues and leaks internal structure:

```python
from dataclasses import dataclass

@dataclass
class UserDTO:
    id: int
    email: str
    role: str

    @classmethod
    def from_entity(cls, user: User) -> 'UserDTO':
        return cls(id=user.id, email=user.email, role=user.role)
```

## Additional Common Mistakes

6. **Using `SELECT *` through the ORM when you need one column.** Fetching entire entities when you only need a field wastes memory and bandwidth:

```python
# Bad: loads all columns
users = session.query(User).all()
emails = [u.email for u in users]

# Good: loads only email
emails = session.execute(select(User.email)).scalars().all()
```

7. **Not using database-level constraints.** ORMs can validate in code, but database constraints are the last line of defense:

```python
# Add database-level check constraints
class User(Base):
    __tablename__ = 'users'
    email = Column(String, nullable=False, unique=True)
    age = Column(Integer)

    __table_args__ = (
        CheckConstraint('age >= 0', name='check_age_positive'),
    )
```

8. **Detached entity errors in Hibernate.** Accessing a lazy-loaded relationship outside the session throws `LazyInitializationException`. Use `JOIN FETCH` or DTO projections:

```java
// Bad: lazy loading outside transaction
User user = repo.findById(id).orElseThrow();
user.getPosts().size(); // Throws if session closed

// Good: fetch with JOIN FETCH
@Query("SELECT u FROM User u LEFT JOIN FETCH u.posts WHERE u.id = :id")
Optional<User> findByIdWithPosts(@Param("id") Integer id);
```

9. **Not handling optimistic locking conflicts.** When two users edit the same record, the last write wins silently unless you add versioning:

```python
# SQLAlchemy with version_id
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String)
    version_id = Column(Integer, default=1)

    __mapper_args__ = {'version_id_col': version_id}
```

## Additional FAQ

### How do I handle complex queries that are hard to express in ORM syntax?

Use raw SQL or query builder APIs for complex joins, window functions, and CTEs. All major ORMs provide escape hatches:

```python
# SQLAlchemy raw SQL
from sqlalchemy import text
result = session.execute(text("""
    SELECT u.email, COUNT(o.id) AS order_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.email
    HAVING COUNT(o.id) > :min_orders
"""), {"min_orders": 5})
```

```javascript
// Prisma raw SQL
const results = await prisma.$queryRaw`
  SELECT u.email, COUNT(o.id) AS order_count
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.email
  HAVING COUNT(o.id) > ${5}
`;
```

### Should I use repository pattern with ORMs?

It depends. Spring Data JPA already uses repositories. For SQLAlchemy and Prisma, a thin service layer is often enough. Use the repository pattern when you need to swap data sources or mock database access in unit tests.

### How do I handle database-specific features with an ORM?

Most ORMs support database-specific features through dialects or native queries. For PostgreSQL-specific features like `JSONB`, `tsvector`, or `array` columns:

```python
# SQLAlchemy with PostgreSQL JSONB
from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    metadata_ = Column('metadata', JSONB, default={})

# Query JSONB
session.query(User).filter(User.metadata_['theme'].astext == 'dark').all()
```

## Performance Tips

1. **Use `lean()` in Mongoose or DTO projections in Hibernate.** Skip ORM hydration for read-only queries:

```javascript
// Mongoose: returns plain objects, not Mongoose documents
const users = await User.find().lean().exec();
```

```java
// Hibernate DTO projection
@Query("SELECT new com.app.dto.UserDTO(u.id, u.email) FROM User u WHERE u.role = :role")
List<UserDTO> findDTOsByRole(@Param("role") String role);
```

2. **Use cursor-based pagination instead of offset.** Offset pagination gets slower as you go deeper:

```python
# Bad: offset pagination (slow for large offsets)
session.query(User).offset(100000).limit(20).all()

# Good: cursor pagination (constant time)
last_id = 100000
session.query(User).filter(User.id > last_id).order_by(User.id).limit(20).all()
```

3. **Enable second-level cache in Hibernate.** Cache frequently read entities:

```java
@Entity
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class User {
    // ...
}
```

4. **Use `EXPLAIN ANALYZE` on ORM-generated queries.** The SQL your ORM generates may not use indexes efficiently. Always verify with `EXPLAIN`:

```sql
EXPLAIN ANALYZE SELECT users.id, users.email, users.role
FROM users
WHERE users.role = 'admin'
ORDER BY users.email;
```

5. **Disable `auto_flush` during bulk operations.** SQLAlchemy flushes the session before every query by default. Disable it during batch inserts:

```python
session.autoflush = False
# Bulk operations
session.autoflush = True
```
