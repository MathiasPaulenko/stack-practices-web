---





contentType: patterns
slug: adapter-pattern
title: "Adapter Pattern"
description: "Convert the interface of a class into another interface clients expect. A structural design pattern for interface compatibility."
metaDescription: "Learn the Adapter Pattern with practical examples in Python, Java, and JavaScript. Structural design pattern for making incompatible interfaces work together."
difficulty: beginner
topics:
  - design
tags:
  - adapter
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - structural
relatedResources:
  - /patterns/decorator-pattern
  - /patterns/command-pattern
  - /recipes/call-rest-api
  - /patterns/bridge-pattern
  - /patterns/decorator-pattern-pipeline
  - /patterns/facade-pattern
  - /patterns/proxy-pattern-caching
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Adapter Pattern with practical examples in Python, Java, and JavaScript. Structural design pattern for making incompatible interfaces work together."
  keywords:
    - adapter pattern
    - design pattern
    - structural pattern
    - interface compatibility
    - wrapper
    - python adapter
    - java adapter
    - javascript adapter





---

# Adapter Pattern

## Overview

The Adapter Pattern is a structural design pattern that allows objects with incompatible interfaces to collaborate. It wraps an existing class with a new interface so that it becomes compatible with the client's expectations.

It is the software equivalent of a physical power adapter: it converts one interface into another without modifying the original device.

## When to Use

Use the Adapter Pattern when:
- You want to use an existing class whose interface is incompatible with the rest of your code. See [Strategy Pattern](/patterns/design/strategy-pattern) for runtime behavior selection.
- You need to reuse legacy or third-party code that does not match your interfaces. See [Facade Pattern](/patterns/design/adapter-pattern) for simplifying complex APIs.
- You want to create a unified interface across several classes with different APIs
- You cannot or should not modify the source code of the incompatible class. See [Decorator Pattern](/patterns/design/decorator-pattern) for extending behavior without subclassing.
- You need to translate data formats or calling conventions between systems

## Solution

### Python

```python
class OldPrinter:
    def old_print(self, text: str):
        print(f"OldPrinter: {text}")

class PrinterAdapter:
    def __init__(self, old_printer: OldPrinter):
        self._old = old_printer

    def print(self, text: str):
        self._old.old_print(text)

# Usage
adapter = PrinterAdapter(OldPrinter())
adapter.print("Hello World")  # OldPrinter: Hello World
```

### JavaScript

```javascript
class OldPrinter {
  oldPrint(text) {
    console.log(`OldPrinter: ${text}`);
  }
}

class PrinterAdapter {
  constructor(oldPrinter) {
    this.old = oldPrinter;
  }

  print(text) {
    this.old.oldPrint(text);
  }
}

// Usage
const adapter = new PrinterAdapter(new OldPrinter());
adapter.print("Hello World"); // OldPrinter: Hello World
```

### Java

```java
class OldPrinter {
    void oldPrint(String text) {
        System.out.println("OldPrinter: " + text);
    }
}

interface ModernPrinter {
    void print(String text);
}

class PrinterAdapter implements ModernPrinter {
    private final OldPrinter oldPrinter;

    PrinterAdapter(OldPrinter oldPrinter) {
        this.oldPrinter = oldPrinter;
    }

    public void print(String text) {
        oldPrinter.oldPrint(text);
    }
}

// Usage
ModernPrinter printer = new PrinterAdapter(new OldPrinter());
printer.print("Hello World"); // OldPrinter: Hello World
```

## Explanation

The Adapter Pattern consists of:

- **Target Interface** (`ModernPrinter`): The interface the client expects
- **Adaptee** (`OldPrinter`): The existing class with the incompatible interface
- **Adapter** (`PrinterAdapter`): Wraps the adaptee and exposes the target interface

The adapter translates calls from the target interface into calls the adaptee understands. Neither the client nor the adaptee needs to change.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Object Adapter** | Wraps an instance (composition) | Flexible, can adapt subclasses |
| **Class Adapter** | Inherits from adaptee (multiple inheritance) | Less flexible, not possible in all languages |
| **Two-way Adapter** | Both interfaces are usable | More complex, but bidirectional |

## What Works

- **Favor composition over inheritance** for adapters (object adapter pattern)
- **Keep the adapter thin**: It should translate calls, not add business logic
- **Document the mapping**: Explain how target methods map to adaptee methods
- **Handle nulls and exceptions** gracefully during translation
- **Consider [caching](/recipes/performance/caching-strategies)**: If translation involves heavy computation, cache results

## Advanced Techniques

### Two-way adapter for bidirectional compatibility

Support both target and adaptee interfaces for maximum flexibility:

```python
# Python: Two-way adapter
class OldPrinter:
    def old_print(self, text: str):
        print(f"OldPrinter: {text}")

class ModernPrinter:
    def print(self, text: str):
        print(f"ModernPrinter: {text}")

class BiDirectionalPrinterAdapter:
    def __init__(self, old_printer: OldPrinter, new_printer: ModernPrinter):
        self._old = old_printer
        self._new = new_printer

    def print(self, text: str):
        # Target interface (ModernPrinter)
        self._old.old_print(text)

    def old_print(self, text: str):
        # Adaptee interface (OldPrinter)
        self._new.print(text)

# Usage with both interfaces
adapter = BiDirectionalPrinterAdapter(OldPrinter(), ModernPrinter())
adapter.print("Hello")  # Uses ModernPrinter interface, calls OldPrinter
adapter.old_print("World")  # Uses OldPrinter interface, calls ModernPrinter
```

### Adapter with data transformation

Transform data formats between incompatible representations:

```java
// Java: Data transformation adapter
class LegacyData {
    String[] names;
    int[] ages;
}

class ModernPerson {
    String name;
    int age;
}

interface PersonRepository {
    List<ModernPerson> getAllPeople();
}

class LegacyDataAdapter implements PersonRepository {
    private final LegacyData legacyData;

    LegacyDataAdapter(LegacyData legacyData) {
        this.legacyData = legacyData;
    }

    public List<ModernPerson> getAllPeople() {
        List<ModernPerson> people = new ArrayList<>();
        for (int i = 0; i < legacyData.names.length; i++) {
            ModernPerson person = new ModernPerson();
            person.name = legacyData.names[i];
            person.age = legacyData.ages[i];
            people.add(person);
        }
        return people;
    }
}
```

### Adapter with caching for performance

Add caching to expensive translation operations:

```javascript
// JavaScript: Cached adapter
class CachedAdapter {
  constructor(adaptee) {
    this.adaptee = adaptee;
    this.cache = new Map();
  }

  async getData(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const data = await this.adaptee.fetchLegacyData(key);
    const transformed = this.transform(data);
    this.cache.set(key, transformed);
    return transformed;
  }

  transform(data) {
    // Expensive transformation logic
    return data.map(item => ({
      id: item.legacyId,
      name: item.legacyName,
      value: item.legacyValue * 2
    }));
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}
```

### Adapter composition for multiple adaptees

Wrap multiple adaptees to provide a unified interface:

```python
# Python: Multi-adaptee adapter
class DatabaseReader:
    def read_user(self, user_id: int) -> dict:
        return {"id": user_id, "name": "DB User"}

class CacheReader:
    def get_user(self, user_id: int) -> dict:
        return {"id": user_id, "name": "Cached User"}

class UnifiedUserAdapter:
    def __init__(self, db_reader: DatabaseReader, cache_reader: CacheReader):
        self.db = db_reader
        self.cache = cache_reader

    def get_user(self, user_id: int) -> dict:
        # Try cache first, fall back to database
        try:
            return self.cache.get_user(user_id)
        except KeyError:
            return self.db.read_user(user_id)

# Usage
adapter = UnifiedUserAdapter(DatabaseReader(), CacheReader())
user = adapter.get_user(123)
```

### Adapter with retry logic

Add retry logic for unreliable adaptees:

```java
// Java: Adapter with retry
class RetryAdapter implements ModernPrinter {
    private final OldPrinter adaptee;
    private final int maxRetries;
    private final long retryDelayMs;

    RetryAdapter(OldPrinter adaptee, int maxRetries, long retryDelayMs) {
        this.adaptee = adaptee;
        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
    }

    public void print(String text) {
        int attempts = 0;
        while (attempts <= maxRetries) {
            try {
                adaptee.oldPrint(text);
                return;
            } catch (Exception e) {
                attempts++;
                if (attempts <= maxRetries) {
                    try {
                        Thread.sleep(retryDelayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during retry", ie);
                    }
                }
            }
        }
        throw new RuntimeException("Failed after " + maxRetries + " retries");
    }
}
```

### Adapter with logging and monitoring

Add observability to adapter operations:

```javascript
// JavaScript: Adapter with logging
class LoggingAdapter {
  constructor(adaptee, logger) {
    this.adaptee = adaptee;
    this.logger = logger;
  }

  print(text) {
    const startTime = Date.now();
    this.logger.info('Adapter: Calling adaptee with text', { text });

    try {
      this.adaptee.oldPrint(text);
      const duration = Date.now() - startTime;
      this.logger.info('Adapter: Call succeeded', { duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Adapter: Call failed', { error: error.message, duration });
      throw error;
    }
  }
}
```

## Best Practices

1. **Favor composition over inheritance.** Use object adapters (composition) rather than class adapters (inheritance) for greater flexibility.
2. **Keep adapters thin.** Adapters should only translate interfaces, not add business logic or complex behavior.
3. **Document the mapping.** Clearly document how target methods map to adaptee methods to aid future maintenance.
4. **Handle exceptions gracefully.** Translate adaptee exceptions into appropriate target exceptions or handle them appropriately.
5. **Consider caching.** If translation involves expensive computation, cache results to improve performance.
6. **Use interfaces for targets.** Define clear target interfaces to make adapters interchangeable and testable.
7. **Avoid cascading adapters.** Chaining multiple adapters creates indirection and makes debugging difficult.
4. **Test adapters thoroughly.** Write unit tests for the translation logic and integration tests with real adaptees.
5. **Monitor adapter performance.** Track metrics on adapter call latency, error rates, and cache hit rates.
6. **Version adapters when needed.** If the adaptee interface changes, version your adapters to support multiple versions simultaneously.

## Common Mistakes

1. **Fat adapters.** Adding business logic instead of just interface translation. Keep adapters focused on translation only.
2. **Leaky adapters.** Exposing adaptee methods through the adapter interface, breaking the abstraction.
3. **Cascading adapters.** Chaining multiple adapters creates indirection hell and makes maintenance difficult.
4. **Ignoring exceptions.** Not translating or handling adaptee errors properly, leading to inconsistent error handling.
5. **Modifying the adaptee.** The whole point of the adapter pattern is to leave the original class untouched.
6. **Over-engineering simple cases.** Using adapters when a simple wrapper function would suffice.
7. **Tight coupling to adaptee.** Making the adapter too dependent on specific implementation details of the adaptee.
8. **Forgetting null checks.** Not handling null or undefined values from the adaptee, causing runtime errors.
9. **Skipping documentation.** Failing to document the translation logic makes future maintenance difficult.
10. **Mixing concerns.** Combining adapter logic with other concerns like logging, caching, or retry logic in a single class.

## Frequently Asked Questions

**Q: What is the difference between Adapter and Facade?**
A: Adapter makes one incompatible interface compatible. [Facade](/patterns/design/facade-pattern) simplifies a complex subsystem by providing a single unified interface to multiple classes.

**Q: Can I adapt multiple classes at once?**
A: Yes. A single adapter can wrap multiple adaptees and coordinate them to provide a unified interface.

**Q: Is Adapter a workaround for bad design?**
A: Sometimes, but often it is a pragmatic bridge when integrating external or legacy code that you cannot modify.

**Q: How does Adapter differ from Decorator?**
A: Adapter changes the interface of an object. [Decorator](/patterns/design/decorator-pattern) adds behavior without changing the interface.

**Q: Should I use Adapter or Strategy for runtime behavior selection?**
A: Use [Strategy](/patterns/design/strategy-pattern) when you need to swap algorithms at runtime. Use Adapter when you need to make incompatible interfaces work together.

**Q: Can adapters be nested?**
A: While technically possible, nesting adapters (cascading) is generally discouraged as it creates indirection and makes code difficult to understand and debug.

**Q: How do I test an adapter?**
A: Write unit tests with mock adaptees to test the translation logic. Write integration tests with real adaptees to verify end-to-end behavior.

**Q: Should adapters handle authentication?**
A: No. Authentication should be handled separately, typically by an HTTP client or interceptor. Adapters should focus only on interface translation.

**Q: Can I use Adapter for data format conversion?**
A: Yes. Adapters are commonly used to transform data formats between different representations (e.g., XML to JSON, legacy formats to modern formats).

**Q: Is this pattern suitable for small projects?**
A: For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

**Q: How does this pattern compare to alternatives?**
A: Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

**Q: Can I partially apply this pattern?**
A: Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
