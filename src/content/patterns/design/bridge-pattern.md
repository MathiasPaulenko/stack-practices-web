---
contentType: patterns
slug: bridge-pattern
title: "Bridge Pattern"
description: "Decouple an abstraction from its implementation so both can vary independently. A structural design pattern for platform independence."
metaDescription: "Learn the Bridge Pattern in Python, Java, and JavaScript. Structural design pattern for decoupling abstraction from implementation."
difficulty: intermediate
topics:
  - design
tags:
  - bridge
  - decoupling
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - structural
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Bridge Pattern in Python, Java, and JavaScript. Structural design pattern for decoupling abstraction from implementation."
  keywords:
    - bridge pattern
    - design pattern
    - structural pattern
    - decoupling
    - abstraction
    - python bridge
    - java bridge
    - javascript bridge
---

# Bridge Pattern

## Overview

The Bridge Pattern is a structural design pattern that decouples an abstraction from its implementation so that the two can vary independently. Instead of having one class hierarchy that combines both, you split it into two separate hierarchies — one for the abstraction and one for the implementation. This is especially useful when you need to support multiple platforms or rendering backends.

## When to Use

Use the Bridge Pattern when:
- You want to avoid a permanent binding between an abstraction and its implementation
- Both the abstraction and its implementation should be extensible by subclassing
- You want to share an implementation among multiple objects
- Changes in the implementation should not affect clients
- You have a proliferating class hierarchy from combining dimensions (e.g., shapes × renderers)

## Solution

### Python

```python
from abc import ABC, abstractmethod

# Implementation hierarchy
class Renderer(ABC):
    @abstractmethod
    def render_circle(self, radius: float):
        pass

class VectorRenderer(Renderer):
    def render_circle(self, radius: float):
        print(f"Drawing a circle of radius {radius} with vector graphics")

class RasterRenderer(Renderer):
    def render_circle(self, radius: float):
        print(f"Drawing pixels for a circle of radius {radius}")

# Abstraction hierarchy
class Shape(ABC):
    def __init__(self, renderer: Renderer):
        self.renderer = renderer

    @abstractmethod
    def draw(self):
        pass

class Circle(Shape):
    def __init__(self, renderer: Renderer, radius: float):
        super().__init__(renderer)
        self.radius = radius

    def draw(self):
        self.renderer.render_circle(self.radius)

# Usage: combine any shape with any renderer
circle_vector = Circle(VectorRenderer(), 5.0)
circle_vector.draw()

circle_raster = Circle(RasterRenderer(), 10.0)
circle_raster.draw()
```

### JavaScript

```javascript
class VectorRenderer {
  renderCircle(radius) {
    console.log(`Drawing a circle of radius ${radius} with vector graphics`);
  }
}

class RasterRenderer {
  renderCircle(radius) {
    console.log(`Drawing pixels for a circle of radius ${radius}`);
  }
}

class Shape {
  constructor(renderer) {
    this.renderer = renderer;
  }
  draw() {
    throw new Error("Subclasses must implement draw()");
  }
}

class Circle extends Shape {
  constructor(renderer, radius) {
    super(renderer);
    this.radius = radius;
  }

  draw() {
    this.renderer.renderCircle(this.radius);
  }
}

// Usage
const cv = new Circle(new VectorRenderer(), 5);
cv.draw();

const cr = new Circle(new RasterRenderer(), 10);
cr.draw();
```

### Java

```java
public interface Renderer {
    void renderCircle(double radius);
}

public class VectorRenderer implements Renderer {
    public void renderCircle(double radius) {
        System.out.println("Drawing a circle of radius " + radius + " with vector graphics");
    }
}

public class RasterRenderer implements Renderer {
    public void renderCircle(double radius) {
        System.out.println("Drawing pixels for a circle of radius " + radius);
    }
}

public abstract class Shape {
    protected final Renderer renderer;

    public Shape(Renderer renderer) {
        this.renderer = renderer;
    }

    public abstract void draw();
}

public class Circle extends Shape {
    private final double radius;

    public Circle(Renderer renderer, double radius) {
        super(renderer);
        this.radius = radius;
    }

    public void draw() {
        renderer.renderCircle(radius);
    }
}

// Usage
Shape cv = new Circle(new VectorRenderer(), 5.0);
cv.draw();
```

## Explanation

The Bridge Pattern separates two dimensions into two class hierarchies:

- **Abstraction** (`Shape`): Defines the high-level interface clients interact with
- **Implementation** (`Renderer`): Defines the low-level operations that carry out the work

The abstraction holds a reference to the implementation and delegates work to it. You can add new shapes (e.g., `Square`) or new renderers (e.g., `SVGRenderer`) without modifying existing code.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Classic Bridge** | Two parallel hierarchies | Shapes and renderers, devices and drivers |
| **Driver Bridge** | Abstraction over hardware/OS APIs | Cross-platform UI frameworks |
| **Remote Bridge** | Local abstraction over remote implementation | RPC stubs and proxies |

## Best Practices

- **Identify independent dimensions** before applying the pattern — not every multi-hierarchy problem needs a bridge
- **Keep the implementation interface minimal** — only expose what the abstraction needs
- **Favor composition over inheritance** — the bridge is fundamentally about composition
- **Use dependency injection** to wire implementations into abstractions
- **Document which class plays which role** (abstraction vs. implementation) for maintainers

## Common Mistakes

- Applying the bridge when a simple [strategy](/patterns/design/strategy-pattern) or [adapter](/patterns/design/adapter-pattern) would suffice
- Making the implementation interface too broad, coupling it unnecessarily to the abstraction
- Allowing the abstraction to leak implementation details to clients
- Creating deep hierarchies on both sides, reintroducing the complexity the bridge was meant to solve

## Frequently Asked Questions

**Q: What is the difference between Bridge and Adapter?**
A: [Adapter](/patterns/design/adapter-pattern) makes incompatible interfaces work together. Bridge separates an abstraction from its implementation so both can evolve independently. The intent and structure differ.

**Q: When should I use Bridge instead of Strategy?**
A: [Strategy](/patterns/design/strategy-pattern) varies a single algorithm. Bridge separates two entire class hierarchies. Use Bridge when you have two independent dimensions of variation.
