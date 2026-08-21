---
contentType: patterns
slug: bridge-pattern
title: "Patrón Bridge: Desacopla la Abstracción de la Implementación"
description: "Dividí una clase en dos jerarquías — abstracción e implementación — para que ambas evolucionen independientemente. Con ejemplos en Python, Java y JavaScript."
metaDescription: "Aprendé el patrón Bridge con ejemplos en Python, Java y JavaScript. Desacoplá abstracción e implementación usando dos jerarquías de clases independientes."
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
lastUpdated: "2026-08-19"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Aprendé el patrón Bridge con ejemplos en Python, Java y JavaScript. Desacoplá abstracción e implementación usando dos jerarquías de clases independientes."
  keywords:
    - patron bridge
    - patron de diseno
    - patron estructural
    - desacoplamiento
    - abstraccion
    - python bridge
    - java bridge
    - javascript bridge
---

## Resumen

El patrón Bridge es un patrón de diseño estructural que desacopla una abstracción de su
implementación para que ambas puedan variar independientemente. En lugar de una jerarquía de
clases que combina ambas, la dividís en dos: una para la abstracción y otra para la
implementación. Es útil cuando necesitás soportar múltiples plataformas o backends de
renderizado.

## Cuándo Usarlo

- Querés evitar un enlace permanente entre una abstracción y su implementación.
- Tanto la abstracción como la implementación deben ser extensibles por subclasificación.
- Querés compartir una implementación entre varios objetos.
- Los cambios en la implementación no deberían afectar a los clientes.
- Tenés una explosión de clases por combinar dos dimensiones, como formas y renderizadores.

## Cuándo NO Usarlo

- Un simple [Strategy](/patterns/strategy-pattern/) o [Adapter](/patterns/adapter-pattern/) es
  suficiente para una sola dimensión de variación.
- El proyecto es pequeño y la jerarquía extra agrega más complejidad que valor.
- No controlás ninguno de los dos lados de la abstracción/Implementación.

## Solución

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

## Explicación

El patrón Bridge separa dos dimensiones en dos jerarquías de clases:

- **Abstracción** (`Shape`): la interfaz de alto nivel que usan los clientes.
- **Implementación** (`Renderer`): las operaciones de bajo nivel que hacen el trabajo.

La abstracción mantiene una referencia a la implementación y le delega el trabajo. Podés
agregar nuevas formas o nuevos renderizadores sin modificar código existente.

## Variantes

|Variante|Descripción|Caso de uso|
|--------|-----------|-----------|
|Bridge clásico|Dos jerarquías paralelas|Formas y renderizadores, dispositivos y drivers|
|Driver Bridge|Abstracción sobre APIs de hardware o SO|Frameworks de UI cross-platform|
|Remote Bridge|Abstracción local sobre implementación remota|Stubs y proxies RPC|

### Renderizado cross-platform en TypeScript

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

## Buenas Prácticas

- Identificá las dimensiones independientes antes de aplicar el patrón — no todo problema de
  jerarquías necesita un bridge.
- Mantené la interfaz de implementación mínima. Exponé solo lo que la abstracción necesita.
- Preferí composición sobre herencia; el bridge se basa en composición.
- Usá inyección de dependencias para conectar implementaciones con abstracciones.
- Documentá qué clase es la abstracción y cuál la implementación.

## Errores Comunes

- Aplicar el patrón Bridge cuando un simple [Strategy](/patterns/strategy-pattern/) o
  [Adapter](/patterns/adapter-pattern/) alcanza.
- Hacer la interfaz de implementación demasiado amplia y acoplarla a la abstracción.
- Dejar que la abstracción filtre detalles de implementación a los clientes.
- Crear jerarquías profundas en ambos lados y reintroducir la complejidad que el bridge evitaba.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre Bridge y Adapter?

[Adapter](/patterns/adapter-pattern/) hace que interfaces incompatibles trabajen juntas. Bridge
separa una abstracción de su implementación para que ambas evolucionen independientemente.

### ¿Cuándo uso Bridge en vez de Strategy?

[Strategy](/patterns/strategy-pattern/) varía un solo algoritmo. Bridge separa dos jerarquías
completas de clases. Usá Bridge cuando tengas dos dimensiones de variación independientes.

### ¿Es adecuado para proyectos pequeños?

En proyectos pequeños con pocos componentes, Bridge puede agregar complejidad innecesaria.
Empezá simple e introducilo cuando sientas el problema que resuelve.

### ¿Puedo aplicar el patrón parcialmente?

Sí. Muchos equipos adoptan patrones de a poco. Empezá con la idea central y agregá
sofisticación según necesidad. El patrón es una guía, no un plano rígido.
