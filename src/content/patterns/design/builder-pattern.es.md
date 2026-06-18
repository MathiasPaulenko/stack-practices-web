---
contentType: patterns
slug: builder-pattern
title: "Patrón Builder"
description: "Construye objetos complejos paso a paso. Patrón de diseño creacional para construcción de objetos legible y configurable."
metaDescription: "Aprende el Patrón Builder con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para construcción de objetos paso a paso."
difficulty: intermediate
topics:
  - design
tags:
  - builder
  - creational
  - design-pattern
  - java
  - javascript
  - pattern
  - python
relatedResources:
  - /patterns/design/factory-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/decorator-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Builder con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para construcción de objetos paso a paso."
  keywords:
    - builder pattern
    - patrón de diseño
    - patrón creacional
    - fluent interface
    - construcción de objetos
    - python builder
    - java builder
    - javascript builder
---

# Patrón Builder

## Visión general

El Patrón Builder es un patrón de diseño creacional que te permite construir objetos complejos paso a paso. Separa la construcción de un objeto de su representación, permitiendo que el mismo proceso de construcción cree diferentes representaciones.

Brilla cuando un objeto tiene muchos parámetros opcionales, componentes anidados, o cuando quieres una API fluida y legible para la creación de objetos.

## Cuándo usarlo

Usa el Patrón Builder cuando:
- Un objeto tiene muchos parámetros de configuración opcionales o anidados
- Quieres forzar una secuencia específica de construcción
- El constructor tendría demasiados parámetros (problema del constructor telescópico)
- Necesitas diferentes configuraciones del mismo tipo de objeto
- Quieres un objeto inmutable construido desde un builder mutable

## Solución

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

# Uso
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

// Uso
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

// Uso
Pizza pizza = new Pizza.Builder("large").cheese().pepperoni().build();
System.out.println(pizza);
```

## Explicación

El Patrón Builder separa el ensamblaje del objeto en dos partes:

- **Builder**: Acumula estado de configuración y sabe cómo construir el objeto final
- **Producto** (`Pizza`): El objeto inmutable o completamente configurado retornado por `build()`

Retornando `self` (o `this`) de cada método de configuración, creas una interfaz fluida que se lee como una oración. Esto elimina constructores con docenas de parámetros.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Fluent Builder** | Construcción legible paso a paso | Requiere estado mutable del builder |
| **Director + Builder** | Múltiples secuencias de construcción | Más clases, pero recetas reutilizables |
| **Static Factory Builder** | Patrón `Class.Builder()` de Java | API limpia, pero acoplado al producto |

## Mejores prácticas

- **Retorna `self` de cada método de paso** para habilitar encadenamiento de métodos
- **Haz el producto inmutable** después de que se llama `build()`
- **Valida en `build()`**, no en pasos individuales, para contexto completo de errores
- **Usa un Director** cuando tienes configuraciones preestablecidas comunes (ej. `pizzaDirector.makeMargherita()`)
- **Documenta pasos requeridos vs opcionales** para que los llamadores sepan la configuración mínima válida

## Errores comunes

- **Productos mutables**: Permitir modificaciones después de `build()` anula el propósito
- **Validación faltante**: Construir un objeto inválido porque se saltó la validación
- **Builders excesivamente complejos**: Un builder para un objeto simple con 2 campos es excesivo
- **Fuga de estado**: Reusar una instancia de builder después de `build()` sin resetear estado
- **Olvidar retornar `self`**: Romper la cadena fluida retornando `None`/`void`

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Builder y Factory?**
R: Factory decide qué clase instanciar. Builder ensambla un único objeto complejo paso a paso. Resuelven problemas diferentes y pueden usarse juntos.

**P: ¿Debería usar Builder para cada clase?**
R: No. Úsalo cuando los constructores se vuelven incómodos (más de 3-4 parámetros opcionales) o cuando la construcción tiene una secuencia significativa.

**P: ¿Puede un Builder producir diferentes tipos de producto?**
R: Típicamente no. Un Builder está acoplado a una clase de producto. Usa Abstract Factory si necesitas diferentes familias de productos.
