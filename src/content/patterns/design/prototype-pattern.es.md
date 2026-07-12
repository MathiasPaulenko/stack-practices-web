---



contentType: patterns
slug: prototype-pattern
title: "Patrón Prototype"
description: "Crea nuevos objetos copiando los existentes. Un patrón de diseño creacional para clonación y duplicación de objetos."
metaDescription: "Aprende el Patrón Prototype con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para clonación y duplicación de objetos."
difficulty: intermediate
topics:
  - design
tags:
  - prototype
  - patron
  - patron-de-diseno
  - creacional
  - clone
  - duplicacion
  - python
  - javascript
  - java
relatedResources:
  - /patterns/factory-pattern
  - /patterns/builder-pattern
  - /patterns/singleton-pattern
  - /patterns/memento-pattern
  - /patterns/type-object-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Prototype con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para clonación y duplicación de objetos."
  keywords:
    - patron prototype
    - patron de diseno
    - patron creacional
    - clonacion de objetos
    - python prototype
    - java prototype
    - javascript prototype



---

# Patrón Prototype

## Visión General

El [Patrón Prototype](/patterns/design/prototype-pattern-cloning) es un patrón de diseño creacional que crea nuevos objetos copiando los existentes. En lugar de construir objetos desde cero usando constructores, clonas una instancia prototipo y opcionalmente la personalizas. Esto es especialmente útil cuando la creación de objetos es costosa, involucra configuraciones complejas, o cuando necesitas objetos similares pero no idénticos.

## Cuándo Usarlo

Usa el Patrón Prototype cuando:
- La creación de objetos es costosa o involucra inicialización compleja
- Necesitas muchos objetos que difieren ligeramente entre sí
- Quieres evitar subclasificar solo para variar configuraciones
- Los objetos tienen numerosos estados y combinaciones posibles
- Quieres preservar el estado de un objeto existente como punto de partida

## Solución

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
        # Deep copy asegura que los objetos anidados sean independientes
        return copy.deepcopy(self)

    def __str__(self):
        return f"Report(content={self.content}, sections={self.sections})"

# Crear un report prototipo con secciones estándar
prototype = Report(
    content="Plantilla de Informe Anual",
    formatting={"font": "Arial", "size": 12},
    sections=["Introducción", "Finanzas", "Conclusión"]
)

# Clonar y personalizar
report_a = prototype.clone()
report_a.content = "Informe Anual 2024"
report_a.sections.append("Apéndice")

report_b = prototype.clone()
report_b.content = "Informe Anual 2023"
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
    // Deep clone usando structuredClone (navegadores modernos/Node 17+)
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

// Crear un prototipo
const prototype = new Report(
  "Plantilla de Informe Anual",
  { font: "Arial", size: 12 },
  ["Introducción", "Finanzas", "Conclusión"]
);

// Clonar y personalizar
const reportA = prototype.clone();
reportA.content = "Informe Anual 2024";
reportA.sections.push("Apéndice");

const reportB = prototype.clone();
reportB.content = "Informe Anual 2023";
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

// Uso
Report prototype = new Report(
    "Plantilla de Informe Anual",
    java.util.Map.of("font", "Arial", "size", 12),
    java.util.List.of("Introducción", "Finanzas", "Conclusión")
);

Report reportA = prototype.clone();
reportA.setContent("Informe Anual 2024");

Report reportB = prototype.clone();
reportB.setContent("Informe Anual 2023");
```

## Explicación

El Patrón Prototype tiene dos roles clave:

- **Interfaz Prototype** — declara un método `clone()` que todos los objetos clonables implementan
- **Prototipos Concretos** — implementan el método clone, produciendo copias exactas de sí mismos

El desafío clave es decidir entre **copia superficial** (copia referencias) y **copia profunda** (copia objetos referenciados). Usa copia superficial para objetos simples, copia profunda cuando los objetos anidados deben permanecer independientes.

## Variantes

| Variante | Caso de Uso | Compromiso |
|----------|-------------|------------|
| **Clon Superficial** | Objetos simples sin mutables anidados | Rápido, pero referencias compartidas pueden causar efectos secundarios |
| **Clon Profundo** | Objetos complejos con estado anidado | Más lento, pero copias completamente independientes |
| **Basado en Registro** | Múltiples prototipos identificados por clave | Búsqueda flexible, agrega gestión de registro |
| **Clon por Serialización** | Copia profunda vía serializar/deserializar | Maneja grafos complejos, pero más lento |

## Lo que funciona

- **Usa copia profunda para objetos mutables anidados** para prevenir estado compartido no deseado entre clones
- **Implementa `clone()` explícitamente** en lugar de confiar en el comportamiento por defecto del lenguaje
- **Documenta si el clone es superficial o profundo** para que los llamadores sepan qué esperar
- **Considera la inmutabilidad** — los objetos inmutables no necesitan clonación
- **Agrega un registro de prototipos** cuando tengas múltiples instancias prototipo y necesites recuperarlas por nombre o tipo

## Errores Comunes

- Usar copia superficial en objetos con estado mutable anidado, causando que los clones se afecten mutuamente
- Confiar en `Object.clone()` por defecto en Java sin manejar la copia profunda de campos mutables
- Olvidar que `Object.assign` y el spread operator de JavaScript realizan copias superficiales
- Clonar objetos que contienen recursos externos (manejadores de archivos, sockets) sin reinicializar esos recursos
- No manejar referencias circulares durante la clonación profunda, llevando a recursión infinita

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre Prototype y Factory?**
R: [Factory](/patterns/design/factory-pattern) crea objetos usando un método/clase separado. Prototype crea objetos copiando una instancia existente. Usa Factory cuando la lógica de creación es compleja; usa Prototype cuando los objetos son costosos de construir desde cero.

**P: ¿Debo usar siempre copia profunda?**
R: No. Usa copia superficial cuando los objetos anidados son inmutables o cuando quieres referencias compartidas intencionalmente. Usa copia profunda cuando los objetos anidados son mutables y deben ser independientes.

**P: ¿Cómo se compara Prototype con el patrón Builder?**
R: [Builder](/patterns/design/builder-pattern) construye un objeto paso a paso. Prototype copia un objeto completamente construido. Resuelven problemas diferentes: Builder es para construcción compleja, Prototype es para duplicación.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Prototype para Configuraciones de Producto

```typescript
// Prototype: clonar objetos existentes en lugar de crear desde cero
interface Prototype {
  clone(): this;
}

class ProductConfig implements Prototype {
  constructor(
    public name: string,
    public price: number,
    public category: string,
    public attributes: Record<string, string> = {},
    public tags: string[] = []
  ) {}

  clone(): this {
    // Deep clone: copiar objetos anidados
    const cloned = Object.create(this);
    cloned.attributes = { ...this.attributes };
    cloned.tags = [...this.tags];
    return cloned;
  }

  setAttribute(key: string, value: string): this {
    this.attributes[key] = value;
    return this;
  }

  addTag(tag: string): this {
    this.tags.push(tag);
    return this;
  }
}

// Prototipos base (registry)
class ConfigRegistry {
  private prototypes = new Map<string, ProductConfig>();
  register(key: string, config: ProductConfig) { this.prototypes.set(key, config); }
  get(key: string): ProductConfig | undefined { return this.prototypes.get(key)?.clone(); }
}

// Uso: registrar prototipos base
const registry = new ConfigRegistry();
registry.register("basic", new ProductConfig("Basic", 9.99, "software", { tier: "basic" }, ["starter"]));
registry.register("pro", new ProductConfig("Pro", 29.99, "software", { tier: "pro", support: "24h" }, ["pro", "priority"]));
registry.register("enterprise", new ProductConfig("Enterprise", 99.99, "software", { tier: "enterprise", support: "1h", sla: "99.99%" }, ["enterprise", "priority", "sla"]));

// Clonar y personalizar
const customPro = registry.get("pro")!;
customPro.name = "Pro Custom";
customPro.setAttribute("discount", "20%");
customPro.addTag("custom");

console.log(customPro.name); // "Pro Custom"
console.log(customPro.attributes.discount); // "20%"
console.log(customPro.tags); // ["pro", "priority", "custom"]

// El prototipo original no se modifica
const originalPro = registry.get("pro")!;
console.log(originalPro.name); // "Pro" (sin cambios)
```

Lecciones:
  - Prototype clona objetos existentes en lugar de construir desde cero
  - Deep clone: copiar atributos y tags (objetos anidados)
  - Registry de prototipos: registrar configs base y clonar bajo demanda
  - El prototipo original no se modifica: cada clone es independiente
  - Ideal para configs con muchos defaults y pocas variaciones
```

### Prototype vs Factory: cual uso?

Usa Prototype cuando tienes objetos pre-configurados y necesitas variaciones: clonar es mas eficiente que construir desde cero. Usa Factory cuando necesitas crear objetos nuevos con parametros variables: el factory decide que clase instanciar. Prototype clona existentes; Factory crea nuevos. Para configs con defaults, Prototype. Para crear objetos de diferentes tipos segun input, Factory.
