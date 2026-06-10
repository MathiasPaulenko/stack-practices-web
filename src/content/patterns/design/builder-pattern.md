---
contentType: patterns
slug: builder-pattern
title: "Builder Pattern"
description: "Construct complex objects step by step. A creational design pattern for readable, configurable object construction."
metaDescription: "Learn the Builder Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for step-by-step object construction."
difficulty: intermediate
topics:
  - design
tags:
  - builder
  - pattern
  - design-pattern
  - creational
  - fluent-interface
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/factory-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/decorator-pattern
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Learn the Builder Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for step-by-step object construction."
  keywords:
    - builder pattern
    - design pattern
    - creational pattern
    - fluent interface
    - object construction
    - python builder
    - java builder
    - javascript builder
---

# Builder Pattern

## Overview

The Builder Pattern is a creational design pattern that lets you construct complex objects step by step. It separates the construction of an object from its representation, allowing the same construction process to create different representations.

It shines when an object has many optional parameters, nested components, or when you want a fluent, readable API for object creation.

## When to Use

Use the Builder Pattern when:
- An object has many optional or nested configuration parameters
- You want to enforce a specific construction sequence
- The constructor would have too many parameters (telescoping constructor problem)
- You need different configurations of the same object type
- You want an immutable object built from a mutable builder

## Solution

### Python

```python
class Pizza:
    def __init__(self, size, cheese=False, pepperoni=False, mushrooms=False):
        self.size = size
        self.cheese = cheese
        self.pepperoni = pepperoni
        self.mushrooms = mushrooms

    def __str__(self):
        toppings = []
        if self.cheese: toppings.append("cheese")
        if self.pepperoni: toppings.append("pepperoni")
        if self.mushrooms: toppings.append("mushrooms")
        return f"Pizza({self.size}, {', '.join(toppings) or 'plain'})"

class PizzaBuilder:
    def __init__(self, size):
        self.size = size
        self.cheese = False
        self.pepperoni = False
        self.mushrooms = False

    def add_cheese(self):
        self.cheese = True
        return self

    def add_pepperoni(self):
        self.pepperoni = True
        return self

    def build(self):
        return Pizza(self.size, self.cheese, self.pepperoni, self.mushrooms)

# Usage
pizza = PizzaBuilder("large").add_cheese().add_pepperoni().build()
print(pizza)  # Pizza(large, cheese, pepperoni)
```

### JavaScript

```javascript
class Pizza {
  constructor(size, cheese, pepperoni, mushrooms) {
    this.size = size;
    this.cheese = cheese;
    this.pepperoni = pepperoni;
    this.mushrooms = mushrooms;
  }

  toString() {
    const toppings = [
      this.cheese && "cheese",
      this.pepperoni && "pepperoni",
      this.mushrooms && "mushrooms",
    ].filter(Boolean);
    return `Pizza(${this.size}, ${toppings.join(", ") || "plain"})`;
  }
}

class PizzaBuilder {
  constructor(size) {
    this.size = size;
    this.cheese = false;
    this.pepperoni = false;
    this.mushrooms = false;
  }

  addCheese() { this.cheese = true; return this; }
  addPepperoni() { this.pepperoni = true; return this; }
  addMushrooms() { this.mushrooms = true; return this; }
  build() { return new Pizza(this.size, this.cheese, this.pepperoni, this.mushrooms); }
}

// Usage
const pizza = new PizzaBuilder("large").addCheese().addPepperoni().build();
console.log(pizza.toString()); // Pizza(large, cheese, pepperoni)
```

### Java

```java
public class Pizza {
    private final String size;
    private final boolean cheese;
    private final boolean pepperoni;
    private final boolean mushrooms;

    private Pizza(Builder builder) {
        this.size = builder.size;
        this.cheese = builder.cheese;
        this.pepperoni = builder.pepperoni;
        this.mushrooms = builder.mushrooms;
    }

    public static class Builder {
        private final String size;
        private boolean cheese = false;
        private boolean pepperoni = false;
        private boolean mushrooms = false;

        public Builder(String size) { this.size = size; }
        public Builder cheese() { this.cheese = true; return this; }
        public Builder pepperoni() { this.pepperoni = true; return this; }
        public Builder mushrooms() { this.mushrooms = true; return this; }
        public Pizza build() { return new Pizza(this); }
    }

    @Override
    public String toString() {
        return "Pizza(" + size + ", cheese=" + cheese + ", pepperoni=" + pepperoni + ")";
    }
}

// Usage
Pizza pizza = new Pizza.Builder("large").cheese().pepperoni().build();
System.out.println(pizza);
```

## Explanation

The Builder Pattern separates object assembly into two parts:

- **Builder**: Accumulates configuration state and knows how to construct the final object
- **Product** (`Pizza`): The immutable or fully-configured object returned by `build()`

By returning `self` (or `this`) from each configuration method, you create a fluent interface that reads like a sentence. This eliminates constructors with dozens of parameters.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Fluent Builder** | Readable step-by-step construction | Requires mutable builder state |
| **Director + Builder** | Multiple construction sequences | More classes, but reusable recipes |
| **Static Factory Builder** | Java's `Class.Builder()` pattern | Clean API, but tightly coupled to the product |

## Best Practices

- **Return `self` from each step method** to enable method chaining
- **Make the product immutable** after `build()` is called
- **Validate in `build()`**, not in individual steps, for complete error context
- **Use a Director** when you have common preset configurations (e.g., `pizzaDirector.makeMargherita()`)
- **Document required vs. optional steps** so callers know the minimum valid configuration

## Common Mistakes

- **Mutable products**: Allowing modifications after `build()` defeats the purpose
- **Missing validation**: Building an invalid object because validation was skipped
- **Overly complex builders**: A builder for a simple object with 2 fields is overkill
- **State leakage**: Reusing a builder instance after `build()` without resetting state
- **Forgetting `return self`**: Breaking the fluent chain by returning `None`/`void`

## Frequently Asked Questions

**Q: What is the difference between Builder and Factory?**
A: Factory decides which class to instantiate. Builder assembles a single complex object step by step. They solve different problems and can be used together.

**Q: Should I use a Builder for every class?**
A: No. Use it when constructors become unwieldy (more than 3-4 optional parameters) or when construction has a meaningful sequence.

**Q: Can a Builder produce different product types?**
A: Typically no. A Builder is tightly coupled to one product class. Use Abstract Factory if you need different product families.
