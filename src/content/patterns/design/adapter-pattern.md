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
  - /patterns/design/decorator-pattern
  - /patterns/design/command-pattern
  - /recipes/api/call-rest-api
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

## Common Mistakes

- **Fat adapters**: Adding business logic instead of just interface translation
- **Leaky adapters**: Exposing adaptee methods through the adapter interface
- **Cascading adapters**: Chaining multiple adapters creates indirection hell
- **Ignoring exceptions**: Not translating or handling adaptee errors properly
- **Modifying the adaptee**: The whole point is to leave the original class untouched

## Frequently Asked Questions

**Q: What is the difference between Adapter and Facade?**
A: Adapter makes one incompatible interface compatible. [Facade](/patterns/design/adapter-pattern) simplifies a complex subsystem by providing a single unified interface.

**Q: Can I adapt multiple classes at once?**
A: Yes. A single adapter can wrap multiple adaptees and coordinate them to provide a unified interface.

**Q: Is Adapter a workaround for bad design?**
A: Sometimes, but often it is a pragmatic bridge when integrating external or legacy code that you cannot modify.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
