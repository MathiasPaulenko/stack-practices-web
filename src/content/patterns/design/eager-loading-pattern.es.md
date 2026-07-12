---


contentType: patterns
slug: eager-loading-pattern
title: "Patrón Eager Loading"
description: "Carga datos relacionados en una única query en lugar de múltiples round-trips, previniendo el problema N+1 y mejorando el performance de lectura."
metaDescription: "Aprende el Patrón Eager Loading para evitar queries N+1. Ejemplos en Python, Java y JavaScript con JOINs, batch loading y estrategias de prefetch."
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
  - /patterns/data-mapper-pattern
  - /patterns/identity-map-pattern
  - /patterns/specification-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Eager Loading para evitar queries N+1. Ejemplos en Python, Java y JavaScript con JOINs, batch loading y estrategias de prefetch."
  keywords:
    - eager loading
    - design pattern
    - n plus one
    - performance
    - databases


---

# Patrón Eager Loading

## Descripción General

El Patrón Eager Loading carga datos relacionados junto con la entidad primaria en una única query, en lugar de emitir queries separadas para cada relación. Esto previene el problema N+1: donde cargar N entidades dispara N queries adicionales por sus datos relacionados, resultando en N+1 total de round-trips a la base de datos.

La mayoría de los ORMs y capas de acceso a datos proveen eager loading a través de SQL JOINs, queries batch o subselects. La clave es saber cuándo cargar relaciones upfront y cuándo dejarlas para lazy loading.

## Cuándo Usar


- For alternatives, see [Composite Entity Pattern](/es/patterns/composite-entity-pattern/).

Usa el Patrón Eager Loading cuando:
- Sabes de antemano qué relaciones serán accedidas
- El problema N+1 está causando degradación de performance
- Estás renderizando una lista donde cada ítem necesita datos relacionados
- La latencia de red entre aplicación y base de datos es alta

## Cuándo Evitar

- Solo necesitas datos relacionados para un pequeño subconjunto de entidades (usa lazy loading)
- Los datos de relación son grandes y raramente accedidos
- El uso de memoria es una preocupación y cargar todo a la vez es prohibitivo
- JOINs complejos degradan el performance de la base de datos más que múltiples queries simples

## Solución

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

    # Problema N+1 (MALO)
    def find_all_with_authors_naive(self) -> List[Book]:
        books = []
        for row in self._conn.execute("SELECT id, title, author_id FROM books"):
            book = Book(id=row["id"], title=row["title"], author_id=row["author_id"])
            # Query adicional por libro!
            author_row = self._conn.execute(
                "SELECT id, name FROM authors WHERE id = ?", (book.author_id,)
            ).fetchone()
            if author_row:
                book.author = Author(id=author_row["id"], name=author_row["name"])
            books.append(book)
        return books

    # Eager Loading (BUENO) — single JOIN query
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

    # Batch Loading — dos queries, sin JOIN
    def find_all_with_authors_batch(self) -> List[Book]:
        books = []
        rows = self._conn.execute("SELECT id, title, author_id FROM books").fetchall()
        author_ids = [r["author_id"] for r in rows]

        # Single query para todos los autores
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

// Uso
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

  // Problema N+1 (MALO)
  async findAllWithAuthorsNaive() {
    const books = await this.db.all('SELECT id, title, author_id FROM books');
    for (const book of books) {
      const author = await this.db.get('SELECT id, name FROM authors WHERE id = ?', book.author_id);
      book.author = author ? new Author(author.id, author.name) : null;
    }
    return books;
  }

  // Eager Loading (BUENO)
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

// Uso
// const repo = new BookRepository(db);
// const books = await repo.findAllWithAuthorsEager();
```

## Explicación

El problema N+1 surge cuando:

1. Query 1: `SELECT * FROM books` — retorna 100 libros
2. Queries 2-101: `SELECT * FROM authors WHERE id = ?` — uno por libro

**Total: 101 queries.**

Eager loading resuelve esto combinando en una única query:

```sql
SELECT books.*, authors.*
FROM books
JOIN authors ON books.author_id = authors.id
```

**Total: 1 query.**

## Variantes

| Variante | Mecanismo | Caso de Uso |
|----------|-----------|-------------|
| **JOIN** | Single SQL JOIN query | Datasets pequeños a medianos, relaciones simples |
| **Batch / IN clause** | Dos queries con lista IN | Relaciones complejas, evitando productos cartesianos de JOIN |
| **Subselect** | Subquery para datos relacionados | Bases de datos con pobre optimización de JOINs |
| **GraphQL DataLoader** | Batches y deduplica por request | APIs con shapes de query dinámicas |

## Lo que Funciona

- **Profile antes de optimizar.** Mide counts de queries antes de agregar eager loading.
- **Usa batch loading para listas grandes.** JOINs con many-to-many pueden explotar result sets.
- **Selecciona solo columnas necesarias.** `SELECT *` en JOINs trae datos innecesarios.
- **Configura estrategias de fetch por default.** Marca relaciones frecuentemente accedidas como eager.
- **Monitorea uso de memoria.** Eager loading de graphs grandes puede agotar heap space.

## Errores Comunes

- **Eager loading todo por default.** Esto carga graphs de objetos masivos innecesariamente.
- **Usar lazy loading en loops.** Esto es exactamente lo que causa el problema N+1.
- **Olvidar productos cartesianos.** JOINing dos relaciones one-to-many multiplica filas.
- **No usar batch loading para to-many.** JOIN con colecciones crea filas duplicadas de parent.
- **Asumir que JOIN siempre es más rápido.** Para datasets muy grandes, queries separadas pueden ser más rápidas.

## Ejemplos del Mundo Real

### Django ORM

`Book.objects.select_related('author')` usa JOIN para foreign keys. `prefetch_related('tags')` usa batch loading para many-to-many.

### Entity Framework Core

`.Include(b => b.Author)` carga eager con JOIN. `.ThenInclude(a => a.Profile)` encadena relaciones adicionales.

### GraphQL DataLoader

Batches requests para el mismo campo a través de múltiples objetos parent, resolviendo N+1 a nivel de API.

## Preguntas Frecuentes

**Q: Qué es el problema N+1?**
A: Cargar N entidades, luego hacer una query adicional por entidad para datos relacionados, resultando en N+1 queries totales en lugar de 1-2.

**Q: Es eager loading siempre mejor que lazy loading?**
A: No. Eager loading es mejor cuando sabes que necesitas los datos. Lazy loading es mejor cuando quizás no los necesites.

**Q: Cuál es la diferencia entre JOIN y batch loading?**
A: JOIN retorna todo en una query. Batch loading usa dos queries: una para parents, una para children con una cláusula IN.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
