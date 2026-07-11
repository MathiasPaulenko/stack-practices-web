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

## What Works

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

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Bridge for Cross-Platform Rendering

```typescript
// Bridge pattern: separate abstraction from implementation
interface Renderer {
  renderCircle(x: number, y: number, r: number): string;
  renderRect(x: number, y: number, w: number, h: number): string;
  renderText(x: number, y: number, text: string): string;
}

// Implementations: SVG and Canvas
class SVGRenderer implements Renderer {
  renderCircle(x, y, r) { return `<circle cx="${x}" cy="${y}" r="${r}" />`; }
  renderRect(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" />`; }
  renderText(x, y, text) { return `<text x="${x}" y="${y}">${text}</text>`; }
}

class CanvasRenderer implements Renderer {
  renderCircle(x, y, r) { return `ctx.arc(${x}, ${y}, ${r}, 0, Math.PI * 2); ctx.stroke();`; }
  renderRect(x, y, w, h) { return `ctx.strokeRect(${x}, ${y}, ${w}, ${h});`; }
  renderText(x, y, text) { return `ctx.fillText("${text}", ${x}, ${y});`; }
}

// Abstraction: Shape
abstract class Shape {
  constructor(protected renderer: Renderer) {}
  abstract draw(): string;
}

class Circle extends Shape {
  constructor(renderer: Renderer, private x: number, private y: number, private r: number) { super(renderer); }
  draw() { return this.renderer.renderCircle(this.x, this.y, this.r); }
}

class Rectangle extends Shape {
  constructor(renderer: Renderer, private x: number, private y: number, private w: number, private h: number) { super(renderer); }
  draw() { return this.renderer.renderRect(this.x, this.y, this.w, this.h); }
}

// Usage: same shapes, different renderers
const svgCircle = new Circle(new SVGRenderer(), 50, 50, 20);
const canvasCircle = new Circle(new CanvasRenderer(), 50, 50, 20);
console.log(svgCircle.draw());   // <circle cx="50" cy="50" r="20" />
console.log(canvasCircle.draw()); // ctx.arc(50, 50, 20, 0, Math.PI * 2); ctx.stroke();

// Switch renderer at runtime
const shape = new Rectangle(new SVGRenderer(), 10, 10, 100, 50);
console.log(shape.draw()); // SVG rect
// Re-create with Canvas
const canvasShape = new Rectangle(new CanvasRenderer(), 10, 10, 100, 50);
console.log(canvasShape.draw()); // Canvas rect
```

Lessons:
  - Bridge separates abstraction (Shape) from implementation (Renderer)
  - Adding new renderer does not require changing shapes
  - Adding new shape does not require changing renderers
  - Reduces class explosion: M shapes + N renderers vs M*N classes
  - Runtime flexibility: swap renderer without changing shape logic
```

### Bridge vs Adapter: which do I use?

Bridge is structural: designed from the start to separate abstraction from implementation. Adapter is structural: makes incompatible interfaces work together after the fact. Bridge is proactive: you design both sides. Adapter is reactive: you wrap an existing class. Use Bridge when you control both sides and want independent evolution. Use Adapter when you need to integrate a third-party API with an incompatible interface.
