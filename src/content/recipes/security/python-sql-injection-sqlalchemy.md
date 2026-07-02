---
contentType: recipes
slug: python-sql-injection-sqlalchemy
title: "Prevent SQL Injection with SQLAlchemy Parameterized Queries"
description: "Protect Python applications from SQL injection using SQLAlchemy parameterized queries, ORM models, input validation, and query inspection to ensure safe database access"
metaDescription: "Prevent SQL injection with SQLAlchemy parameterized queries and ORM. Validate inputs, inspect generated SQL, and apply safe patterns for secure database access."
difficulty: intermediate
topics:
  - security
  - databases
tags:
  - python
  - sqlalchemy
  - sql injection
  - security
  - database
relatedResources:
  - /recipes/security/python-jwt-refresh-token-rotation
  - /recipes/security/nodejs-helmet-security-headers
  - /recipes/ai/python-openai-function-calling-structured
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prevent SQL injection with SQLAlchemy parameterized queries and ORM. Validate inputs, inspect generated SQL, and apply safe patterns for secure database access."
  keywords:
    - sql injection prevention
    - sqlalchemy parameterized
    - python sql security
    - orm injection
    - database security
---

# Prevent SQL Injection with SQLAlchemy Parameterized Queries

SQL injection is the #1 web application security risk (OWASP Top 10). It occurs when user input is concatenated into SQL strings instead of being parameterized. SQLAlchemy's ORM and Core query APIs use parameterized queries by default, making injection nearly impossible when used correctly. This recipe shows safe and unsafe patterns.

## When to Use This

- Any Python application that interacts with a SQL database
- Migrating from raw SQL strings to an ORM
- Security audits of existing database access code

## Prerequisites

- Python 3.10+
- `sqlalchemy` package (`pip install sqlalchemy`)

## Solution

### 1. Install Dependencies

```bash
pip install sqlalchemy
```

### 2. Vulnerable Code (DO NOT DO THIS)

```python
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/mydb")

# VULNERABLE — string concatenation
def get_user_vulnerable(username: str):
    with engine.connect() as conn:
        # SQL INJECTION: attacker can input: ' OR '1'='1' --
        query = f"SELECT * FROM users WHERE username = '{username}'"
        result = conn.execute(text(query))
        return result.fetchall()

# Attack: get_user_vulnerable("' OR '1'='1' --")
# Returns ALL users instead of one
```

### 3. Safe Code with Parameterized Queries

```python
def get_user_safe(username: str):
    """Safe query using parameterized binding."""
    with engine.connect() as conn:
        query = text("SELECT * FROM users WHERE username = :username")
        result = conn.execute(query, {"username": username})
        return result.fetchone()

# Attack input is treated as a literal string, not SQL
# get_user_safe("' OR '1'='1' --") returns None (no user with that name)
```

### 4. Safe Code with SQLAlchemy ORM

```python
from sqlalchemy import String, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))

def get_user_orm(session: Session, username: str) -> User | None:
    """Safe ORM query — automatically parameterized."""
    stmt = select(User).where(User.username == username)
    return session.execute(stmt).scalar_one_or_none()

def search_users_by_role(session: Session, role: str) -> list[User]:
    """Safe ORM query with filtering."""
    stmt = select(User).where(User.role == role).order_by(User.username)
    return list(session.execute(stmt).scalars())
```

### 5. Safe Dynamic Queries

```python
from sqlalchemy import or_, and_, desc

def search_users(
    session: Session,
    username: str | None = None,
    role: str | None = None,
    order_by: str = "username",
) -> list[User]:
    """Build dynamic queries safely with SQLAlchemy Core expressions."""
    conditions = []
    if username:
        conditions.append(User.username.ilike(f"%{username}%"))
    if role:
        conditions.append(User.role == role)

    stmt = select(User)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Safe column ordering — validate against allowed columns
    allowed_order = {"username", "email", "id", "role"}
    if order_by in allowed_order:
        column = getattr(User, order_by)
        stmt = stmt.order_by(column)

    return list(session.execute(stmt).scalars())
```

### 6. Safe Bulk Operations

```python
def bulk_insert_safe(session: Session, users: list[dict]) -> None:
    """Safe bulk insert with parameterized values."""
    session.execute(
        User.__table__.insert(),
        users,  # List of dicts — each value is parameterized
    )
    session.commit()

# Usage
users = [
    {"username": "alice", "email": "alice@example.com", "role": "admin"},
    {"username": "bob", "email": "bob@example.com", "role": "user"},
]
bulk_insert_safe(session, users)
```

### 7. Safe LIKE Queries

```python
def search_by_pattern(session: Session, pattern: str) -> list[User]:
    """Safe LIKE query — pattern is parameterized, wildcards are literal."""
    # Escape SQL wildcards in user input to prevent pattern injection
    safe_pattern = pattern.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    stmt = select(User).where(User.username.ilike(f"%{safe_pattern}%"))
    return list(session.execute(stmt).scalars())
```

### 8. Inspect Generated SQL

```python
from sqlalchemy import event
import logging

logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

# All executed SQL with parameters will be logged
# This helps verify that queries are parameterized

# Or inspect a statement without executing
stmt = select(User).where(User.username == "alice")
print(stmt.compile(compile_kwargs={"literal_binds": True}))
# SELECT users.id, users.username, users.email, users.role
# FROM users WHERE users.username = 'alice'
```

## How It Works

1. **Parameterized queries** separate SQL structure from data. The database compiles the SQL template first, then binds parameters as literal values. Even if the parameter contains SQL syntax, it is treated as a string, not executable SQL.
2. **ORM queries** (`select(User).where(...)`) use Python expressions that SQLAlchemy compiles into parameterized SQL. The `User.username == username` expression generates `WHERE users.username = :username_1` with `username` as a bound parameter.
3. **Dynamic conditions** built with `and_()`, `or_()`, and column comparisons are always parameterized. The risk comes from `text()` with string formatting, which bypasses parameterization.
4. **LIKE wildcards** (`%`, `_`) in user input can match unintended patterns. Escaping them before adding your own wildcards prevents pattern injection.

## Variants

### Safe Raw SQL with text()

```python
from sqlalchemy import text, bindparam

def safe_raw_query(user_id: int, min_age: int):
    """Safe raw SQL with explicit parameter binding."""
    query = text("""
        SELECT u.*, COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.id = :user_id AND u.age >= :min_age
        GROUP BY u.id
    """).bindparams(
        bindparam("user_id", type_=int),
        bindparam("min_age", type_=int),
    )

    with engine.connect() as conn:
        return conn.execute(query, {"user_id": user_id, "min_age": min_age}).fetchone()
```

### Safe IN Clause

```python
from sqlalchemy import select

def get_users_by_ids(session: Session, user_ids: list[int]) -> list[User]:
    """Safe IN clause — SQLAlchemy handles list expansion."""
    stmt = select(User).where(User.id.in_(user_ids))
    return list(session.execute(stmt).scalars())

# SQLAlchemy generates: WHERE users.id IN (?, ?, ?)
# Each value is a separate parameter
```

### Safe ORDER BY from User Input

```python
from sqlalchemy import Column, asc, desc

def get_users_sorted(session: Session, sort_field: str, sort_dir: str = "asc"):
    """Safe dynamic sorting — validate column name against model."""
    # Whitelist of sortable columns
    sortable = {
        "username": User.username,
        "email": User.email,
        "created_at": User.created_at,
    }

    column = sortable.get(sort_field, User.username)  # Default fallback
    order_func = desc if sort_dir == "desc" else asc

    stmt = select(User).order_by(order_func(column))
    return list(session.execute(stmt).scalars())
```

### Input Validation with Pydantic

```python
from pydantic import BaseModel, field_validator
import re

class UserSearchInput(BaseModel):
    username: str | None = None
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"admin", "user", "moderator"}
        if v not in allowed:
            raise ValueError(f"Invalid role. Allowed: {allowed}")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z0-9_]{1,50}$", v):
            raise ValueError("Username must be alphanumeric, max 50 chars")
        return v

# Usage with FastAPI
from fastapi import FastAPI

app = FastAPI()

@app.get("/users")
def search_users_api(params: UserSearchInput):
    return search_users(session, params.username, params.role)
```

## Best Practices

- **Never use f-strings or .format() for SQL** — always use parameterized queries or ORM
- **Use ORM queries by default** — they are parameterized automatically
- **Validate and whitelist sort columns** — never accept column names directly from user input
- **Escape LIKE wildcards** — `%` and `_` in user input can match unintended patterns
- **Enable SQL logging in development** — verify that queries are parameterized

## Common Mistakes

- **Using `text()` with f-strings** — `text(f"WHERE x = '{value}'")` is vulnerable
- **Accepting column names from user input** — `ORDER BY {user_input}` allows SQL injection
- **Not escaping LIKE wildcards** — user input with `%` can match all rows
- **Trusting ORM to be safe with `text()`** — mixing ORM with raw `text()` can reintroduce vulnerabilities

## FAQ

**Q: Is SQLAlchemy ORM completely immune to SQL injection?**
A: When used correctly (no `text()` with f-strings), yes. ORM queries are always parameterized. The risk comes from raw SQL via `text()` with string formatting.

**Q: Can SQL injection happen with integer parameters?**
A: Less likely, but possible if the integer is concatenated into a string. Always use parameterized binding even for integers.

**Q: Should I use ORM or Core for security?**
A: Both are safe when used correctly. ORM is safer by default because it's harder to accidentally introduce raw SQL.

**Q: How do I test for SQL injection in my app?**
A: Try injecting `' OR '1'='1' --` into every input field. If the query returns unexpected results, you have a vulnerability. Use tools like SQLMap for automated testing.
