---
contentType: patterns
slug: twin-pattern
title: "Patrón Twin"
description: "Provee una alternativa a la herencia múltiple vinculando dos clases separadas a través de referencias mutuas, permitiéndoles delegar métodos entre sí según sea necesario."
metaDescription: "Aprende el Patrón Twin como alternativa a la herencia múltiple. Ejemplos en Python, Java y JavaScript con clases vinculadas, delegación mutua y composición."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - twin
  - pattern
  - design-pattern
  - structural
  - composition
  - inheritance
  - delegation
relatedResources:
  - /patterns/design/bridge-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Twin como alternativa a la herencia múltiple. Ejemplos en Python, Java y JavaScript con clases vinculadas, delegación mutua y composición."
  keywords:
    - twin pattern
    - design pattern
    - composition
    - inheritance
    - delegation
---

# Patrón Twin

## Descripción General

El Patrón Twin provee una alternativa a la herencia múltiple dividiendo una clase conceptual en dos (o más) clases hermanas vinculadas a través de referencias mutuas. Cada twin maneja un aspecto del comportamiento de la clase original, y delegan entre sí cuando un método invocado pertenece al dominio del otro.

Este patrón es útil en lenguajes que no soportan herencia múltiple (Java, C#) o donde usarla crearía clases base frágiles. Al descomponer una clase en twins, cada parte puede evolucionar independientemente mientras presenta una interfaz unificada a los clientes.

Un ejemplo clásico es un widget de UI que necesita ser dibujable (renderizado) e interactivo (manejo de eventos). En lugar de un único `DrawableInteractiveWidget`, el Patrón Twin crea un `DrawTwin` y un `InteractTwin` que se conocen entre sí.

## Cuándo Usar

Usa el Patrón Twin cuando:
- Una clase necesita comportamiento de múltiples jerarquías ortogonales
- El lenguaje objetivo no soporta herencia múltiple
- Mixins o traits no están disponibles o son insuficientes
- Dos aspectos de una clase deberían evolucionar independientemente con mínimo acoplamiento

## Cuándo Evitar

- La clase puede simplificarse en una única jerarquía con objetos strategy
- La herencia múltiple o mixins están disponibles y son más limpios
- Los twins crean dependencias circulares difíciles de razonar
- Una simple composición con delegación unidireccional basta

## Solución

### Python

```python
from typing import Optional

class Graphic:
    """Base abstracta para comportamiento de dibujo"""
    def __init__(self):
        self.widget: Optional['Widget'] = None

    def draw(self):
        print(f"Dibujando {self.widget.name} en ({self.widget.x}, {self.widget.y})")

    def resize(self, width: int, height: int):
        self.widget.width = width
        self.widget.height = height
        print(f"Redimensionado a {width}x{height}")


class Interactive:
    """Base abstracta para comportamiento de interacción"""
    def __init__(self):
        self.widget: Optional['Widget'] = None

    def on_click(self):
        print(f"Click en {self.widget.name}")

    def on_hover(self):
        print(f"Hover sobre {self.widget.name}")


class Widget:
    """La clase twin que vincula Graphic e Interactive"""
    def __init__(self, name: str, x: int = 0, y: int = 0):
        self.name = name
        self.x = x
        self.y = y
        self.width = 100
        self.height = 50

        # Crear twins y vincularlos
        self._graphic = Graphic()
        self._graphic.widget = self
        self._interactive = Interactive()
        self._interactive.widget = self

    # Delegar dibujo a Graphic twin
    def draw(self):
        self._graphic.draw()

    def resize(self, width: int, height: int):
        self._graphic.resize(width, height)

    # Delegar interacción a Interactive twin
    def on_click(self):
        self._interactive.on_click()

    def on_hover(self):
        self._interactive.on_hover()

    # Acceso cross-twin
    def get_graphic(self) -> Graphic:
        return self._graphic

    def get_interactive(self) -> Interactive:
        return self._interactive


# Uso
button = Widget("SubmitButton", 10, 20)
button.draw()        # Delegado a Graphic twin
button.on_click()    # Delegado a Interactive twin
button.resize(200, 60)
```

### Java

```java
// Twin A: Comportamiento de dibujo
class Graphic {
    private Widget widget;

    public void setWidget(Widget widget) { this.widget = widget; }

    public void draw() {
        System.out.println("Dibujando " + widget.getName() + " en (" + widget.getX() + ", " + widget.getY() + ")");
    }

    public void resize(int width, int height) {
        widget.setWidth(width);
        widget.setHeight(height);
        System.out.println("Redimensionado a " + width + "x" + height);
    }
}

// Twin B: Comportamiento de interacción
class Interactive {
    private Widget widget;

    public void setWidget(Widget widget) { this.widget = widget; }

    public void onClick() {
        System.out.println("Click en " + widget.getName());
    }

    public void onHover() {
        System.out.println("Hover sobre " + widget.getName());
    }
}

// La clase twin compuesta
class Widget {
    private final String name;
    private int x, y, width, height;
    private final Graphic graphic = new Graphic();
    private final Interactive interactive = new Interactive();

    public Widget(String name, int x, int y) {
        this.name = name; this.x = x; this.y = y;
        this.width = 100; this.height = 50;
        graphic.setWidget(this);
        interactive.setWidget(this);
    }

    public String getName() { return name; }
    public int getX() { return x; }
    public int getY() { return y; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public void setWidth(int w) { this.width = w; }
    public void setHeight(int h) { this.height = h; }

    // Métodos de delegación
    public void draw() { graphic.draw(); }
    public void resize(int w, int h) { graphic.resize(w, h); }
    public void onClick() { interactive.onClick(); }
    public void onHover() { interactive.onHover(); }

    public Graphic getGraphic() { return graphic; }
    public Interactive getInteractive() { return interactive; }
}

// Uso
Widget button = new Widget("SubmitButton", 10, 20);
button.draw();
button.onClick();
button.resize(200, 60);
```

### JavaScript

```javascript
class Graphic {
  constructor() {
    this.widget = null;
  }

  draw() {
    console.log(`Dibujando ${this.widget.name} en (${this.widget.x}, ${this.widget.y})`);
  }

  resize(width, height) {
    this.widget.width = width;
    this.widget.height = height;
    console.log(`Redimensionado a ${width}x${height}`);
  }
}

class Interactive {
  constructor() {
    this.widget = null;
  }

  onClick() {
    console.log(`Click en ${this.widget.name}`);
  }

  onHover() {
    console.log(`Hover sobre ${this.widget.name}`);
  }
}

class Widget {
  constructor(name, x = 0, y = 0) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = 100;
    this.height = 50;

    this.graphic = new Graphic();
    this.graphic.widget = this;
    this.interactive = new Interactive();
    this.interactive.widget = this;
  }

  draw() {
    this.graphic.draw();
  }

  resize(width, height) {
    this.graphic.resize(width, height);
  }

  onClick() {
    this.interactive.onClick();
  }

  onHover() {
    this.interactive.onHover();
  }

  getGraphic() {
    return this.graphic;
  }

  getInteractive() {
    return this.interactive;
  }
}

// Uso
const button = new Widget('SubmitButton', 10, 20);
button.draw();
button.onClick();
button.resize(200, 60);
```

## Explicación

El Patrón Twin funciona por delegación mutua:

1. **Widget** es la clase pública con la que interactúan los clientes
2. **Graphic** e **Interactive** son los twins, cada uno manejando un concern
3. Cada twin mantiene una referencia back al widget para acceder al estado compartido
4. El widget delega llamadas de método al twin apropiado

Esto es efectivamente "composición sobre herencia" llevado a su conclusión lógica: en lugar de heredar de múltiples padres, la clase compone múltiples delegates y expone sus métodos a través de su propia interfaz.

## Variantes

| Variante | Estructura | Caso de Uso |
|----------|------------|-------------|
| **Simple twin** | Dos twins vinculados | Dibujo + interacción |
| **Multi-twin** | Tres o más twins vinculados | Widgets complejos con layout, estilo, eventos |
| **Twin con interface** | Ambos twins implementan la misma interface | Twins intercambiables |
| **Twin factory** | Factory crea y vincula twins | Toolkits de UI |

## Mejores Prácticas

- **Mantén la clase pública thin.** El widget solo debería delegar; la lógica vive en los twins.
- **Evita lógica circular.** Los twins no deberían llamar métodos entre sí en loops.
- **Haz los twins reemplazables.** Permite intercambiar un twin sin recrear el widget.
- **Usa interfaces para twins.** En lenguajes tipados, define `IGraphic` e `IInteractive`.
- **Considera el patrón observer para comunicación cross-twin.** En lugar de llamadas directas, usa eventos.

## Errores Comunes

- **Acoplamiento fuerte entre twins.** Los twins deberían interactuar a través del widget, no directamente.
- **Exponer twins públicamente.** Los clientes deberían interactuar con el widget, no con los twins directamente.
- **Estado duplicado.** El estado debería vivir en el widget, no duplicarse en los twins.
- **Olvidar vincular twins.** Un twin con una referencia nula al widget causa errores de null pointer.
- **Hacer el patrón más complejo que la herencia múltiple.** Si tu lenguaje soporta mixins, úsalos.

## Ejemplos del Mundo Real

### UI Frameworks

El AWT/Swing de Java separa `Component` (el widget) de `ComponentPeer` (el twin nativo). El peer maneja renderizado y eventos específicos de la plataforma.

### Game Engines

El Entity-Component-System de Unity separa datos (Components) de comportamiento (Systems). Aunque no es exactamente twin, la separación de concerns refleja el intento del patrón.

### ORM Proxies

Los proxy objects de Hibernate dividen la entidad en un twin proxy (lazy-loading) y un twin target (los datos reales). El proxy delega al target cuando está inicializado.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Twin y Bridge?**
A: Bridge separa jerarquías de abstracción e implementación. Twin divide una única clase en dos partes cooperativas. Bridge es sobre jerarquías independientes; Twin es sobre descomponer una clase.

**Q: Es Twin solo composición?**
A: Sí, pero es una forma específica de composición donde los objetos compuestos (twins) mantienen referencias mutuas y presentan una interfaz unificada a través de un wrapper.

**Q: Puedo tener más de dos twins?**
A: Sí, aunque la complejidad aumenta. Tres o más twins crean un patrón hub-and-spoke alrededor de la clase principal.
