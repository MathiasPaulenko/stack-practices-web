---
contentType: patterns
slug: eager-loading-pattern
title: "Eager Loading Pattern"
description: "Load related data in a single query rather than multiple round-trips, preventing the N+1 problem and improving read performance."
metaDescription: "Learn the Eager Loading Pattern to avoid N+1 queries. Examples in Python, Java, and JavaScript with JOINs, batch loading, and prefetch strategies."
difficulty: intermediate
topics:
  - design
  - databases
  - performance
tags:
  - eager-loading
  - pattern
  - design-pattern
  - structural
  - performance
  - databases
  - n-plus-one
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/identity-map-pattern
  - /patterns/design/specification-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Eager Loading Pattern to avoid N+1 queries. Examples in Python, Java, and JavaScript with JOINs, batch loading, and prefetch strategies."
  keywords:
    - eager loading
    - design pattern
    - n plus one
    - performance
    - databases
---

# Eager Loading Pattern

## Overview

The Eager Loading Pattern loads related data along with the primary entity in a single query, rather than issuing separate queries for each relationship. This prevents the N+1 problem: where loading N entities triggers N additional queries for their related data, resulting in N+1 total database round-trips.

Most ORMs and data access layers provide eager loading through SQL JOINs, batch queries, or subselects. The key is knowing when to load relationships upfront and when to leave them for lazy loading.

## When to Use

Use the Eager Loading Pattern when:
- You know in advance which relationships will be accessed
- The N+1 problem is causing performance degradation
- You are rendering a list where each item needs related data
- Network latency between application and database is high

## When to Avoid

- You only need related data for a small subset of entities (use lazy loading)
- The relationship data is large and rarely accessed
- Memory usage is a concern and loading everything at once is prohibitive
- Complex JOINs degrade database performance more than multiple simple queries

## Solution

### Python

```python
from dataclasses import dataclass
from typing import List, Optional
import sqlite3

@dataclass
class Author:
    id: int
    name: str

@dataclass
class Book:
    id: int
    title: str
    author_id: int
    author: Optional[Author] = None

class BookRepository:
    def __init__(self, conn):
        self._conn = conn

    # N+1 Problem (BAD)
    def find_all_with_authors_naive(self) -> List[Book]:
        books = []
        for row in self._conn.execute("SELECT id, title, author_id FROM books"):
            book = Book(id=row["id"], title=row["title"], author_id=row["author_id"])
            # Additional query per book!
            author_row = self._conn.execute(
                "SELECT id, name FROM authors WHERE id = ?", (book.author_id,)
            ).fetchone()
            if author_row:
                book.author = Author(id=author_row["id"], name=author_row["name"])
            books.append(book)
        return books

    # Eager Loading (GOOD) — single JOIN query
    def find_all_with_authors_eager(self) -> List[Book]:
        query = """
            SELECT b.id AS book_id, b.title, b.author_id,
                   a.id AS author_id, a.name AS author_name
            FROM books b
            JOIN authors a ON b.author_id = a.id
        """
        books = []
        for row in self._conn.execute(query):
            author = Author(id=row["author_id"], name=row["author_name"])
            book = Book(
                id=row["book_id"],
                title=row["title"],
                author_id=row["author_id"],
                author=author
            )
            books.append(book)
        return books

    # Batch Loading — two queries, no JOIN
    def find_all_with_authors_batch(self) -> List[Book]:
        books = []
        rows = self._conn.execute("SELECT id, title, author_id FROM books").fetchall()
        author_ids = [r["author_id"] for r in rows]

        # Single query for all authors
        placeholders = ",".join("?" * len(author_ids))
        authors = {
            r["id"]: Author(id=r["id"], name=r["name"])
            for r in self._conn.execute(
                f"SELECT id, name FROM authors WHERE id IN ({placeholders})", author_ids
            )
        }

        for row in rows:
            book = Book(
                id=row["id"],
                title=row["title"],
                author_id=row["author_id"],
                author=authors.get(row["author_id"])
            )
            books.append(book)
        return books


# Setup
conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
conn.execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)")
conn.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER)")
conn.execute("INSERT INTO authors (name) VALUES ('Alice'), ('Bob')")
conn.execute("INSERT INTO books (title, author_id) VALUES ('Book A', 1), ('Book B', 1), ('Book C', 2)")

repo = BookRepository(conn)
books = repo.find_all_with_authors_eager()
for book in books:
    print(f"{book.title} by {book.author.name}")
```

### Java

```java
import java.sql.*;
import java.util.*;

public class Author {
    private final int id;
    private final String name;
    public Author(int id, String name) { this.id = id; this.name = name; }
    public int getId() { return id; }
    public String getName() { return name; }
}

public class Book {
    private final int id;
    private final String title;
    private final int authorId;
    private Author author;

    public Book(int id, String title, int authorId) {
        this.id = id; this.title = title; this.authorId = authorId;
    }
    public int getId() { return id; }
    public String getTitle() { return title; }
    public Author getAuthor() { return author; }
    public void setAuthor(Author author) { this.author = author; }
}

class BookRepository {
    private final Connection conn;
    public BookRepository(Connection conn) { this.conn = conn; }

    public List<Book> findAllWithAuthors() throws SQLException {
        String query = """
            SELECT b.id AS book_id, b.title, b.author_id,
                   a.id AS author_id, a.name AS author_name
            FROM books b
            JOIN authors a ON b.author_id = a.id
            """;
        List<Book> books = new ArrayList<>();
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            while (rs.next()) {
                Author author = new Author(rs.getInt("author_id"), rs.getString("author_name"));
                Book book = new Book(rs.getInt("book_id"), rs.getString("title"), rs.getInt("author_id"));
                book.setAuthor(author);
                books.add(book);
            }
        }
        return books;
    }
}

// Usage
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)");
conn.createStatement().execute("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER)");
conn.createStatement().execute("INSERT INTO authors (name) VALUES ('Alice'), ('Bob')");
conn.createStatement().execute("INSERT INTO books (title, author_id) VALUES ('Book A', 1), ('Book B', 1), ('Book C', 2)");

BookRepository repo = new BookRepository(conn);
for (Book book : repo.findAllWithAuthors()) {
    System.out.println(book.getTitle() + " by " + book.getAuthor().getName());
}
```

### JavaScript

```javascript
class Author {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class Book {
  constructor(id, title, authorId) {
    this.id = id;
    this.title = title;
    this.authorId = authorId;
    this.author = null;
  }
}

class BookRepository {
  constructor(db) {
    this.db = db;
  }

  // N+1 Problem (BAD)
  async findAllWithAuthorsNaive() {
    const books = await this.db.all('SELECT id, title, author_id FROM books');
    for (const book of books) {
      const author = await this.db.get('SELECT id, name FROM authors WHERE id = ?', book.author_id);
      book.author = author ? new Author(author.id, author.name) : null;
    }
    return books;
  }

  // Eager Loading (GOOD)
  async findAllWithAuthorsEager() {
    const rows = await this.db.all(`
      SELECT b.id AS book_id, b.title, b.author_id,
             a.id AS author_id, a.name AS author_name
      FROM books b
      JOIN authors a ON b.author_id = a.id
    `);
    return rows.map(r => {
      const book = new Book(r.book_id, r.title, r.author_id);
      book.author = new Author(r.author_id, r.author_name);
      return book;
    });
  }

  // Batch Loading
  async findAllWithAuthorsBatch() {
    const books = await this.db.all('SELECT id, title, author_id FROM books');
    const authorIds = [...new Set(books.map(b => b.author_id))];
    const authors = await this.db.all(
      `SELECT id, name FROM authors WHERE id IN (${authorIds.join(',')})`
    );
    const authorMap = new Map(authors.map(a => [a.id, new Author(a.id, a.name)]));

    for (const book of books) {
      book.author = authorMap.get(book.author_id) || null;
    }
    return books;
  }
}

// Usage
// const repo = new BookRepository(db);
// const books = await repo.findAllWithAuthorsEager();
```

## Explanation

The N+1 problem arises when:

1. Query 1: `SELECT * FROM books` — returns 100 books
2. Queries 2-101: `SELECT * FROM authors WHERE id = ?` — one per book

**Total: 101 queries.**

Eager loading solves this by combining into a single query:

```sql
SELECT books.*, authors.*
FROM books
JOIN authors ON books.author_id = authors.id
```

**Total: 1 query.**

## Variants

| Variant | Mechanism | Use Case |
|---------|-----------|----------|
| **JOIN** | Single SQL JOIN query | Small to medium datasets, simple relationships |
| **Batch / IN clause** | Two queries with IN list | Complex relationships, avoiding JOIN cartesian products |
| **Subselect** | Subquery for related data | Databases with poor JOIN optimization |
| **GraphQL DataLoader** | Batches and deduplicates per-request | APIs with dynamic query shapes |

## What Works

- **Profile before optimizing.** Measure query counts before adding eager loading.
- **Use batch loading for large lists.** JOINs with many-to-many can explode result sets.
- **Select only needed columns.** `SELECT *` on JOINs brings unnecessary data.
- **Configure default fetch strategies.** Mark frequently accessed relationships as eager.
- **Monitor memory usage.** Eager loading large graphs can exhaust heap space.

## Common Mistakes

- **Eager loading everything by default.** This loads massive object graphs unnecessarily.
- **Using lazy loading in loops.** This is exactly what causes the N+1 problem.
- **Forgetting about cartesian products.** JOINing two one-to-many relationships multiplies rows.
- **Not using batch loading for to-many.** JOIN with collections creates duplicate parent rows.
- **Assuming JOIN is always faster.** For very large datasets, separate queries can be faster.

## Real-World Examples

### Django ORM

`Book.objects.select_related('author')` uses JOIN for foreign keys. `prefetch_related('tags')` uses batch loading for many-to-many.

### Entity Framework Core

`.Include(b => b.Author)` eagerly loads with JOIN. `.ThenInclude(a => a.Profile)` chains further relationships.

### GraphQL DataLoader

Batches requests for the same field across multiple parent objects, solving N+1 at the API layer.

## Frequently Asked Questions

**Q: What is the N+1 problem?**
A: Loading N entities, then making one additional query per entity for related data, resulting in N+1 total queries instead of 1-2.

**Q: Is eager loading always better than lazy loading?**
A: No. Eager loading is better when you know you need the data. Lazy loading is better when you might not need it.

**Q: What is the difference between JOIN and batch loading?**
A: JOIN returns everything in one query. Batch loading uses two queries: one for parents, one for children with an IN clause.
