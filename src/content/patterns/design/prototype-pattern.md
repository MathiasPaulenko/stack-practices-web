---
contentType: patterns
slug: prototype-pattern
title: "Prototype Pattern"
description: "Create new objects by copying existing ones. A creational design pattern for cloning and object duplication."
metaDescription: "Learn the Prototype Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for object cloning and duplication."
difficulty: intermediate
topics:
  - design
tags:
  - prototype
  - pattern
  - design-pattern
  - creational
  - clone
  - duplication
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/factory-pattern
  - /patterns/design/builder-pattern
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Prototype Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for object cloning and duplication."
  keywords:
    - prototype pattern
    - design pattern
    - creational pattern
    - object cloning
    - python prototype
    - java prototype
    - javascript prototype
---

# Prototype Pattern

## Overview

The [Prototype](/patterns/design/prototype-pattern-cloning) Pattern is a creational design pattern that creates new objects by copying existing ones. Instead of building objects from scratch using constructors, you clone a prototype instance and optionally customize it. This is especially useful when object creation is expensive, involves complex configurations, or when you need objects that are similar but not identical.

## When to Use

Use the Prototype Pattern when:
- Object creation is costly or involves complex initialization
- You need many objects that differ only slightly from each other
- You want to avoid subclassing just to vary object configurations
- Objects have numerous possible states and combinations
- You want to preserve the state of an existing object as a starting point

## Solution

### Python

```python
import copy
from abc import ABC, abstractmethod

class Document(ABC):
    def __init__(self, content="", formatting=None):
        self.content = content
        self.formatting = formatting or {}

    @abstractmethod
    def clone(self):
        pass

    def __str__(self):
        return f"Document(content={self.content}, formatting={self.formatting})"

class Report(Document):
    def __init__(self, content="", formatting=None, sections=None):
        super().__init__(content, formatting)
        self.sections = sections or []

    def clone(self):
        # Deep copy ensures nested objects are independent
        return copy.deepcopy(self)

    def __str__(self):
        return f"Report(content={self.content}, sections={self.sections})"

# Create a prototype report with standard sections
prototype = Report(
    content="Annual Report Template",
    formatting={"font": "Arial", "size": 12},
    sections=["Introduction", "Financials", "Conclusion"]
)

# Clone and customize
report_a = prototype.clone()
report_a.content = "2024 Annual Report"
report_a.sections.append("Appendix")

report_b = prototype.clone()
report_b.content = "2023 Annual Report"
report_b.formatting["size"] = 14

print(report_a)
print(report_b)
print(report_a.formatting is report_b.formatting)  # False (deep copy)
```

### JavaScript

```javascript
class Document {
  constructor(content = "", formatting = {}) {
    this.content = content;
    this.formatting = formatting;
  }

  clone() {
    // Deep clone using structuredClone (modern browsers/Node 17+)
    return structuredClone(this);
  }
}

class Report extends Document {
  constructor(content = "", formatting = {}, sections = []) {
    super(content, formatting);
    this.sections = sections;
  }

  clone() {
    return structuredClone(this);
  }
}

// Create a prototype
const prototype = new Report(
  "Annual Report Template",
  { font: "Arial", size: 12 },
  ["Introduction", "Financials", "Conclusion"]
);

// Clone and customize
const reportA = prototype.clone();
reportA.content = "2024 Annual Report";
reportA.sections.push("Appendix");

const reportB = prototype.clone();
reportB.content = "2023 Annual Report";
reportB.formatting.size = 14;

console.log(reportA.formatting === reportB.formatting); // false
```

### Java

```java
public interface Prototype {
    Prototype clone();
}

public class Report implements Prototype {
    private String content;
    private java.util.Map<String, Object> formatting;
    private java.util.List<String> sections;

    public Report(String content, java.util.Map<String, Object> formatting,
                  java.util.List<String> sections) {
        this.content = content;
        this.formatting = new java.util.HashMap<>(formatting);
        this.sections = new java.util.ArrayList<>(sections);
    }

    @Override
    public Report clone() {
        return new Report(
            this.content,
            new java.util.HashMap<>(this.formatting),
            new java.util.ArrayList<>(this.sections)
        );
    }

    public void setContent(String content) { this.content = content; }

    @Override
    public String toString() {
        return "Report{content='" + content + "', sections=" + sections + "}";
    }
}

// Usage
Report prototype = new Report(
    "Annual Report Template",
    java.util.Map.of("font", "Arial", "size", 12),
    java.util.List.of("Introduction", "Financials", "Conclusion")
);

Report reportA = prototype.clone();
reportA.setContent("2024 Annual Report");

Report reportB = prototype.clone();
reportB.setContent("2023 Annual Report");
```

## Explanation

The Prototype Pattern has two key roles:

- **Prototype Interface** — declares a `clone()` method that all cloneable objects implement
- **Concrete Prototypes** — implement the clone method, producing exact copies of themselves

The key challenge is deciding between **shallow copy** (copies references) and **deep copy** (copies referenced objects). Use shallow copy for simple objects, deep copy when nested objects must remain independent.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Shallow Clone** | Simple objects with no nested mutables | Fast, but shared references can cause side effects |
| **Deep Clone** | Complex objects with nested state | Slower, but fully independent copies |
| **Registry-based** | Multiple prototypes identified by key | Flexible lookup, adds registry management |
| **Serialization Clone** | Deep copy via serialize/deserialize | Handles complex graphs, but slower and language-specific |

## Best Practices

- **Use deep copy for mutable nested objects** to prevent unintended shared state between clones
- **Implement `clone()` explicitly** rather than relying on default language behavior for predictable results
- **Document whether clone is shallow or deep** so callers know what to expect
- **Consider immutability** — immutable objects don't need cloning at all
- **Add a prototype registry** when you have multiple prototype instances and need to retrieve them by name or type

## Common Mistakes

- Using shallow copy on objects with mutable nested state, causing clones to inadvertently affect each other
- Relying on default `Object.clone()` in Java without handling deep copy of mutable fields
- Forgetting that JavaScript's `Object.assign` and spread operator perform shallow copies only
- Cloning objects that contain external resources (file handles, sockets) without re-initializing those resources
- Not handling circular references during deep cloning, leading to infinite recursion or stack overflow

## Frequently Asked Questions

**Q: What is the difference between Prototype and Factory?**
A: [Factory](/patterns/design/factory-pattern) creates objects using a separate creation method/class. Prototype creates objects by copying an existing instance. Use Factory when creation logic is complex; use Prototype when objects are expensive to construct from scratch.

**Q: Should I always use deep copy?**
A: No. Use shallow copy when nested objects are immutable or when you intentionally want shared references. Use deep copy when nested objects are mutable and must be independent.

**Q: How does Prototype compare to the Builder pattern?**
A: [Builder](/patterns/design/builder-pattern) constructs an object step by step. Prototype copies a fully constructed object. They solve different problems — Builder is for complex construction, Prototype is for duplication.
