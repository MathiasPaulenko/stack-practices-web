---
contentType: patterns
slug: template-method-pattern
title: "Template Method Pattern"
description: "Define the skeleton of an algorithm in a base class, letting subclasses override specific steps without changing the algorithm's structure. A behavioral design pattern."
metaDescription: "Learn the Template Method Pattern in Python, Java, and JavaScript. Behavioral design pattern for algorithm skeletons with customizable steps."
difficulty: beginner
topics:
  - design
tags:
  - template-method
  - pattern
  - design-pattern
  - behavioral
  - algorithm
  - inheritance
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/strategy-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Template Method Pattern in Python, Java, and JavaScript. Behavioral design pattern for algorithm skeletons with customizable steps."
  keywords:
    - template method pattern
    - design pattern
    - behavioral pattern
    - algorithm skeleton
    - python template method
    - java template method
    - javascript template method
---

# Template Method Pattern

## Overview

The Template Method Pattern is a behavioral design pattern that defines the skeleton of an algorithm in a base class, letting subclasses override specific steps without changing the algorithm's overall structure. It promotes code reuse by extracting common behavior into a template while allowing customization of individual steps.

## When to Use

Use the Template Method Pattern when:
- Multiple classes share a similar algorithm with minor variations in specific steps
- You want to avoid code duplication by extracting the common algorithm skeleton
- Subclasses should be able to customize certain steps without changing the overall flow
- You need to enforce a specific sequence of operations
- Examples: data parsers, report generators, game loops, ETL pipelines

## Solution

### Python

```python
from abc import ABC, abstractmethod

class DataImporter(ABC):
    def import_data(self, source: str):
        """The template method defining the algorithm skeleton."""
        raw = self._fetch(source)
        parsed = self._parse(raw)
        validated = self._validate(parsed)
        self._save(validated)
        self._notify()

    @abstractmethod
    def _fetch(self, source: str) -> str:
        pass

    @abstractmethod
    def _parse(self, raw: str) -> dict:
        pass

    def _validate(self, data: dict) -> dict:
        """Default step; can be overridden."""
        if "id" not in data:
            raise ValueError("Missing required field: id")
        return data

    def _save(self, data: dict):
        """Default step; can be overridden."""
        print(f"Saving: {data}")

    def _notify(self):
        """Hook method — subclasses may override or ignore."""
        pass

class CSVImporter(DataImporter):
    def _fetch(self, source: str) -> str:
        return f"CSV content from {source}"

    def _parse(self, raw: str) -> dict:
        return {"id": 1, "format": "csv", "content": raw}

class JSONImporter(DataImporter):
    def _fetch(self, source: str) -> str:
        return f"JSON content from {source}"

    def _parse(self, raw: str) -> dict:
        return {"id": 2, "format": "json", "content": raw}

    def _notify(self):
        print("JSON import completed!")

# Usage
CSVImporter().import_data("users.csv")
JSONImporter().import_data("users.json")
```

### JavaScript

```javascript
class DataImporter {
  importData(source) {
    const raw = this.fetch(source);
    const parsed = this.parse(raw);
    const validated = this.validate(parsed);
    this.save(validated);
    this.notify();
  }

  fetch(source) {
    throw new Error("Subclasses must implement fetch()");
  }

  parse(raw) {
    throw new Error("Subclasses must implement parse()");
  }

  validate(data) {
    if (!data.id) throw new Error("Missing required field: id");
    return data;
  }

  save(data) {
    console.log("Saving:", data);
  }

  notify() {
    // Hook — subclasses may override
  }
}

class CSVImporter extends DataImporter {
  fetch(source) {
    return `CSV content from ${source}`;
  }

  parse(raw) {
    return { id: 1, format: "csv", content: raw };
  }
}

class JSONImporter extends DataImporter {
  fetch(source) {
    return `JSON content from ${source}`;
  }

  parse(raw) {
    return { id: 2, format: "json", content: raw };
  }

  notify() {
    console.log("JSON import completed!");
  }
}

// Usage
new CSVImporter().importData("users.csv");
new JSONImporter().importData("users.json");
```

### Java

```java
public abstract class DataImporter {
    public final void importData(String source) {
        String raw = fetch(source);
        Map<String, Object> parsed = parse(raw);
        Map<String, Object> validated = validate(parsed);
        save(validated);
        notify();
    }

    protected abstract String fetch(String source);
    protected abstract Map<String, Object> parse(String raw);

    protected Map<String, Object> validate(Map<String, Object> data) {
        if (!data.containsKey("id")) {
            throw new IllegalArgumentException("Missing required field: id");
        }
        return data;
    }

    protected void save(Map<String, Object> data) {
        System.out.println("Saving: " + data);
    }

    protected void notify() {
        // Hook — subclasses may override
    }
}

public class CSVImporter extends DataImporter {
    protected String fetch(String source) {
        return "CSV content from " + source;
    }

    protected Map<String, Object> parse(String raw) {
        return Map.of("id", 1, "format", "csv", "content", raw);
    }
}

public class JSONImporter extends DataImporter {
    protected String fetch(String source) {
        return "JSON content from " + source;
    }

    protected Map<String, Object> parse(String raw) {
        return Map.of("id", 2, "format", "json", "content", raw);
    }

    protected void notify() {
        System.out.println("JSON import completed!");
    }
}

// Usage
new CSVImporter().importData("users.csv");
new JSONImporter().importData("users.json");
```

## Explanation

The Template Method Pattern has two types of methods in the base class:

- **Template Method** (`import_data`): The public method that defines the algorithm's skeleton. It should be `final` when possible to prevent accidental override.
- **Abstract/Primitive Methods** (`fetch`, `parse`): Steps that must be implemented by subclasses
- **Concrete Methods** (`validate`, `save`): Steps with default implementations that subclasses can inherit
- **Hook Methods** (`notify`): Optional steps that subclasses can override but aren't required to

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Classic** | Inheritance-based with abstract methods | Frameworks, parsers |
| **Strategy-based** | Composition with strategy objects injected | When you need runtime flexibility |
| **Callback-based** | Functions passed as arguments | JavaScript/Node.js streams |

## What Works

- **Make the template method `final`** to prevent subclasses from breaking the algorithm flow
- **Keep hooks optional** — document clearly which methods are required vs. optional
- **Minimize the number of abstract methods** — too many make subclasses complex
- **Document the algorithm's steps** and their invariants
- **Consider composition ([Strategy](/patterns/design/strategy-pattern))** when subclasses would need to override many methods

## Common Mistakes

- Forgetting to mark the template method as `final`, allowing subclasses to break the algorithm
- Making every step abstract, forcing subclasses to implement methods they don't need
- Using Template Method when composition (Strategy) would be more flexible
- Introducing deep inheritance hierarchies just to vary a single step
- Overriding concrete methods in subclasses when hooks would suffice

## Frequently Asked Questions

**Q: What is the difference between Template Method and Strategy?**
A: Template Method uses inheritance to vary parts of an algorithm. [Strategy](/patterns/design/strategy-pattern) uses composition to swap entire algorithms. Prefer Strategy when you need runtime flexibility or many variations.

**Q: Can I combine Template Method with Factory Method?**
A: Yes — very common. The template method can call a [Factory](/patterns/design/factory-pattern) Method to create objects at specific steps, letting subclasses customize which classes are instantiated.
