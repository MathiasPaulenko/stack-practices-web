---
contentType: patterns
slug: bridge-pattern
title: "Patrón Bridge"
description: "Desacopla una abstracción de su implementación para que ambas puedan variar independientemente. Un patrón estructural para independencia de plataforma."
metaDescription: "Aprende el Patrón Bridge en Python, Java y JavaScript. Patrón estructural para desacoplar abstracción de implementación."
difficulty: intermediate
topics:
  - design
tags:
  - bridge
  - patron
  - patron-de-diseno
  - estructural
  - desacoplamiento
  - abstraccion
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Bridge en Python, Java y JavaScript. Patrón estructural para desacoplar abstracción de implementación."
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

# Patrón Bridge

## Visión General

El Patrón Bridge es un patrón de diseño estructural que desacopla una abstracción de su implementación para que ambas puedan variar independientemente. En lugar de tener una jerarquía de clases que combina ambas, divides en dos jerarquías separadas — una para la abstracción y otra para la implementación. Esto es especialmente útil cuando necesitas soportar múltiples plataformas o backends de renderizado.

## Cuándo Usarlo

Usa el Patrón Bridge cuando:
- Quieres evitar un enlace permanente entre una abstracción y su implementación
- Tanto la abstracción como su implementación deben ser extensibles por subclasificación
- Quieres compartir una implementación entre múltiples objetos
- Los cambios en la implementación no deberían afectar a los clientes
- Tienes una jerarquía de clases proliferante al combinar dimensiones (ej. formas × renderizadores)

## Solución

### Python

```python
from abc import ABC, abstractmethod

# Jerarquía de implementación
class Renderer(ABC):
    @abstractmethod
    def render_circle(self, radius: float):
        pass

class VectorRenderer(Renderer):
    def render_circle(self, radius: float):
        print(f"Dibujando un círculo de radio {radius} con gráficos vectoriales")

class RasterRenderer(Renderer):
    def render_circle(self, radius: float):
        print(f"Dibujando píxeles para un círculo de radio {radius}")

# Jerarquía de abstracción
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

# Uso: combinar cualquier forma con cualquier renderizador
circle_vector = Circle(VectorRenderer(), 5.0)
circle_vector.draw()

circle_raster = Circle(RasterRenderer(), 10.0)
circle_raster.draw()
```

### JavaScript

```javascript
class VectorRenderer {
  renderCircle(radius) {
    console.log(`Dibujando un círculo de radio ${radius} con gráficos vectoriales`);
  }
}

class RasterRenderer {
  renderCircle(radius) {
    console.log(`Dibujando píxeles para un círculo de radio ${radius}`);
  }
}

class Shape {
  constructor(renderer) {
    this.renderer = renderer;
  }
  draw() {
    throw new Error("Las subclases deben implementar draw()");
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

// Uso
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
        System.out.println("Dibujando un círculo de radio " + radius + " con gráficos vectoriales");
    }
}

public class RasterRenderer implements Renderer {
    public void renderCircle(double radius) {
        System.out.println("Dibujando píxeles para un círculo de radio " + radius);
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

// Uso
Shape cv = new Circle(new VectorRenderer(), 5.0);
cv.draw();
```

## Explicación

El Patrón Bridge separa dos dimensiones en dos jerarquías de clases:

- **Abstracción** (`Shape`): Define la interfaz de alto nivel con la que interactúan los clientes
- **Implementación** (`Renderer`): Define las operaciones de bajo nivel que realizan el trabajo

La abstracción mantiene una referencia a la implementación y delega el trabajo a ella. Puedes agregar nuevas formas (ej. `Square`) o nuevos renderizadores (ej. `SVGRenderer`) sin modificar el código existente.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Bridge Clásico** | Dos jerarquías paralelas | Formas y renderizadores, dispositivos y drivers |
| **Bridge de Drivers** | Abstracción sobre APIs de hardware/OS | Frameworks UI multiplataforma |
| **Bridge Remoto** | Abstracción local sobre implementación remota | Stubs RPC y proxies |

## Lo que funciona

- **Identifica dimensiones independientes** antes de aplicar el patrón — no todo problema de múltiples jerarquías necesita un bridge
- **Mantén la interfaz de implementación minimalista** — solo expón lo que la abstracción necesita
- **Prefiere composición sobre herencia** — el bridge es fundamentalmente sobre composición
- **Usa inyección de dependencias** para conectar implementaciones en abstracciones
- **Documenta qué clase juega qué rol** (abstracción vs. implementación) para los mantenedores

## Errores Comunes

- Aplicar el bridge cuando un simple [strategy](/patterns/design/strategy-pattern) o [adapter](/patterns/design/adapter-pattern) sería suficiente
- Hacer la interfaz de implementación demasiado amplia, acoplandola innecesariamente a la abstracción
- Permitir que la abstracción filtre detalles de implementación a los clientes
- Crear jerarquías profundas en ambos lados, reintroduciendo la complejidad que el bridge intentaba resolver

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre Bridge y Adapter?**
R: [Adapter](/patterns/design/adapter-pattern) hace que interfaces incompatibles trabajen juntas. Bridge separa una abstracción de su implementación para que ambas puedan evolucionar independientemente. La intención y estructura difieren.

**P: ¿Cuándo debería usar Bridge en lugar de Strategy?**
R: [Strategy](/patterns/design/strategy-pattern) varía un solo algoritmo. Bridge separa dos jerarquías de clases completas. Usa Bridge cuando tengas dos dimensiones independientes de variación.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
