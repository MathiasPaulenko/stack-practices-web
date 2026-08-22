---
contentType: patterns
slug: bridge-pattern
title: "Bridge Pattern: Decouple Abstraction from Implementation"
description: "Split a class into two hierarchies — abstraction and implementation — so both can evolve independently. Includes Python, Java, and JavaScript examples."
metaDescription: "Learn the Bridge pattern with Python, Java, and JavaScript examples. Decouple abstraction from implementation using two independent class hierarchies."
difficulty: intermediate
topics:
  - design
tags:
  - bridge
  - pattern
  - design-pattern
  - structural
  - decoupling
  - abstraction
  - python
  - javascript
  - java
relatedResources:
  - /patterns/adapter-pattern
  - /patterns/decorator-pattern
  - /patterns/strategy-pattern
  - /patterns/twin-pattern
  - /patterns/factory-pattern
  - /patterns/singleton-pattern
lastUpdated: "2026-08-22"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Learn the Bridge pattern with Python, Java, and JavaScript examples. Decouple abstraction from implementation using two independent class hierarchies."
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

The Bridge pattern is a structural design pattern that splits an abstraction from its
implementation. Instead of one class hierarchy that mixes both, you get two — one for the
abstraction and one for the implementation. That lets each side evolve without breaking the other.

A common example is a UI where you've got different widget shapes and different rendering backends.
Without Bridge, every shape class would need to know about every renderer. With Bridge, a `Circle`
holds a reference to a `Renderer` and delegates the actual drawing. You can add shapes or renderers
later without touching the existing ones.

## When to Use

- You want to avoid a permanent binding between the abstraction and its implementation.
- Both sides of the design should be extensible through subclassing.
- Several objects need to share the same underlying implementation.
- Changes to the implementation shouldn't ripple out to clients.
- You're facing a class explosion because two dimensions, such as shapes and renderers, are
    combined into one hierarchy.

## When NOT to Use

- A simple [Strategy](/patterns/strategy-pattern/) or [Adapter](/patterns/adapter-pattern/) already
    covers a single dimension of variation.
- The project is small and the extra hierarchy adds more complexity than value.
- You control neither side of the abstraction/implementation split.

## Solution

### Python

```python
from abc import ABC, abstractmethod

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

Shape cv = new Circle(new VectorRenderer(), 5.0);
cv.draw();
```

## Explanation

The pattern separates two dimensions into two class hierarchies:

- **Abstraction** (`Shape`): the high-level interface clients use.
- **Implementation** (`Renderer`): the low-level operations that carry out the work.

The abstraction holds a reference to the implementation and delegates work to it. That separation
means you can add new shapes or new renderers without modifying existing code.

## Variants

| Variant | Description | Use Case |
| --- | --- | --- |
| Classic Bridge | Two parallel hierarchies | Shapes and renderers, devices and drivers |
| Driver Bridge | Abstraction over hardware or OS APIs | Cross-platform UI frameworks |
| Remote Bridge | Local abstraction over remote implementation | RPC stubs and proxies |

### Cross-platform rendering in TypeScript

```typescript
interface Renderer {
  renderCircle(x: number, y: number, r: number): string;
  renderRect(x: number, y: number, w: number, h: number): string;
}

class SVGRenderer implements Renderer {
  renderCircle(x, y, r) { return `<circle cx="${x}" cy="${y}" r="${r}" />`; }
  renderRect(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" />`; }
}

class CanvasRenderer implements Renderer {
  renderCircle(x, y, r) { return `ctx.arc(${x}, ${y}, ${r}, 0, Math.PI * 2); ctx.stroke();`; }
  renderRect(x, y, w, h) { return `ctx.strokeRect(${x}, ${y}, ${w}, ${h});`; }
}

abstract class Shape {
  constructor(protected renderer: Renderer) {}
  abstract draw(): string;
}

class Circle extends Shape {
  constructor(renderer: Renderer, private x: number, private y: number, private r: number) {
    super(renderer);
  }
  draw() { return this.renderer.renderCircle(this.x, this.y, this.r); }
}

const svgCircle = new Circle(new SVGRenderer(), 50, 50, 20);
const canvasCircle = new Circle(new CanvasRenderer(), 50, 50, 20);

console.log(svgCircle.draw());    // SVG circle
console.log(canvasCircle.draw()); // Canvas circle
```

## Best Practices

- Identify the independent dimensions before applying the pattern. Not every multi-hierarchy problem
    needs a Bridge.
- Keep the implementation interface minimal. Expose only what the abstraction actually needs.
- Prefer composition over inheritance. The Bridge pattern is about composition.
- Use dependency injection to wire implementations into abstractions.
- Document which side is the abstraction and which side is the implementation.

## Common Mistakes

- Applying Bridge when a simple [Strategy](/patterns/strategy-pattern/) or
    [Adapter](/patterns/adapter-pattern/) would suffice.
- Making the implementation interface too broad and coupling it to the abstraction.
- Letting the abstraction leak implementation details to clients.
- Creating deep hierarchies on both sides and reintroducing the complexity the pattern was meant to
    solve.

## FAQ

### What is the difference between Bridge and Adapter?

[Adapter](/patterns/adapter-pattern/) makes incompatible interfaces work together. Bridge separates
an abstraction from its implementation so both can evolve independently.

### When should I use Bridge instead of Strategy?

[Strategy](/patterns/strategy-pattern/) varies a single algorithm. Bridge separates two entire class
hierarchies. Use Bridge when you've got two independent dimensions of variation.

### Is this pattern suitable for small projects?

For small projects with few components, Bridge may add more complexity than it saves. Start simple
and introduce it when the problem it solves becomes painful.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication only
where it's needed. The pattern is a guide, not a strict blueprint.
