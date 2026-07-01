---
contentType: patterns
slug: composite-pattern
title: "Patrón Composite"
description: "Compone objetos en estructuras de árbol para representar jerarquías parte-todo. Un patrón estructural para tratar objetos individuales y composiciones uniformemente."
metaDescription: "Aprende el Patrón Composite en Python, Java y JavaScript. Patrón estructural para estructuras de árbol y jerarquías parte-todo."
difficulty: intermediate
topics:
  - design
tags:
  - composite
  - patron
  - patron-de-diseno
  - estructural
  - arbol
  - jerarquia
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Composite en Python, Java y JavaScript. Patrón estructural para estructuras de árbol y jerarquías parte-todo."
  keywords:
    - patron composite
    - patron de diseno
    - patron estructural
    - estructura de arbol
    - jerarquia parte-todo
    - python composite
    - java composite
    - javascript composite
---

# Patrón Composite

## Visión General

El Patrón Composite es un patrón de diseño estructural que te permite componer objetos en estructuras de árbol y luego trabajar con esas estructuras como si fueran objetos individuales. Es ideal cuando necesitas tratar elementos individuales y grupos de elementos uniformemente — como [componentes UI](/patterns/design/composite-pattern-ui), sistemas de archivos, o organigramas.

## Cuándo Usarlo

Usa el Patrón Composite cuando:
- Necesitas representar jerarquías parte-todo de objetos. Consulta [Visitor Pattern](/patterns/design/visitor-pattern) para operaciones sobre árboles.
- Los clientes deben ignorar la diferencia entre composiciones de objetos y objetos individuales
- Quieres realizar operaciones recursivamente sobre una estructura de árbol. Consulta [Visitor Pattern](/patterns/design/visitor-pattern) para operaciones de recorrido.
- La estructura es naturalmente jerárquica (UI, sistemas de archivos, organigramas, expresiones). Consulta [Flyweight Pattern](/patterns/design/flyweight-pattern) para optimizar nodos similares.

## Solución

### Python

```python
from abc import ABC, abstractmethod

class FileSystemComponent(ABC):
    @abstractmethod
    def get_size(self) -> int:
        pass

    @abstractmethod
    def display(self, indent: int = 0):
        pass

class File(FileSystemComponent):
    def __init__(self, name: str, size: int):
        self.name = name
        self.size = size

    def get_size(self) -> int:
        return self.size

    def display(self, indent: int = 0):
        print("  " * indent + f"📄 {self.name} ({self.size} bytes)")

class Folder(FileSystemComponent):
    def __init__(self, name: str):
        self.name = name
        self.children: list[FileSystemComponent] = []

    def add(self, component: FileSystemComponent):
        self.children.append(component)

    def get_size(self) -> int:
        return sum(child.get_size() for child in self.children)

    def display(self, indent: int = 0):
        print("  " * indent + f"📁 {self.name}")
        for child in self.children:
            child.display(indent + 1)

# Construir un árbol
root = Folder("root")
root.add(File("readme.txt", 100))

src = Folder("src")
src.add(File("main.py", 500))
src.add(File("utils.py", 300))
root.add(src)

root.display()
print(f"Tamaño total: {root.get_size()} bytes")
```

### JavaScript

```javascript
class FileSystemComponent {
  getSize() { throw new Error("Not implemented"); }
  display(indent = 0) { throw new Error("Not implemented"); }
}

class File extends FileSystemComponent {
  constructor(name, size) {
    super();
    this.name = name;
    this.size = size;
  }

  getSize() { return this.size; }

  display(indent = 0) {
    console.log("  ".repeat(indent) + `📄 ${this.name} (${this.size} bytes)`);
  }
}

class Folder extends FileSystemComponent {
  constructor(name) {
    super();
    this.name = name;
    this.children = [];
  }

  add(component) { this.children.push(component); }

  getSize() {
    return this.children.reduce((sum, c) => sum + c.getSize(), 0);
  }

  display(indent = 0) {
    console.log("  ".repeat(indent) + `📁 ${this.name}`);
    this.children.forEach(c => c.display(indent + 1));
  }
}

// Construir un árbol
const root = new Folder("root");
root.add(new File("readme.txt", 100));

const src = new Folder("src");
src.add(new File("main.js", 500));
src.add(new File("utils.js", 300));
root.add(src);

root.display();
console.log(`Tamaño total: ${root.getSize()} bytes`);
```

### Java

```java
public interface FileSystemComponent {
    int getSize();
    void display(int indent);
}

public class File implements FileSystemComponent {
    private final String name;
    private final int size;

    public File(String name, int size) {
        this.name = name;
        this.size = size;
    }

    public int getSize() { return size; }

    public void display(int indent) {
        System.out.println("  ".repeat(indent) + "📄 " + name + " (" + size + " bytes)");
    }
}

public class Folder implements FileSystemComponent {
    private final String name;
    private final java.util.List<FileSystemComponent> children = new java.util.ArrayList<>();

    public Folder(String name) {
        this.name = name;
    }

    public void add(FileSystemComponent component) {
        children.add(component);
    }

    public int getSize() {
        return children.stream().mapToInt(FileSystemComponent::getSize).sum();
    }

    public void display(int indent) {
        System.out.println("  ".repeat(indent) + "📁 " + name);
        for (FileSystemComponent child : children) {
            child.display(indent + 1);
        }
    }
}

// Uso
Folder root = new Folder("root");
root.add(new File("readme.txt", 100));

Folder src = new Folder("src");
src.add(new File("Main.java", 500));
src.add(new File("Utils.java", 300));
root.add(src);

root.display(0);
System.out.println("Tamaño total: " + root.getSize() + " bytes");
```

## Explicación

El Patrón Composite tiene tres roles:

- **Componente** (`FileSystemComponent`): La interfaz común para hojas y objetos compuestos
- **Hoja** (`File`): Representa objetos individuales sin hijos
- **Compuesto** (`Folder`): Representa contenedores que pueden contener hojas y otros compuestos

Los clientes interactúan con todos los objetos a través de la interfaz Componente, haciendo la estructura de árbol transparente.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Transparente** | La interfaz Componente expone gestión de hijos | Tratamiento uniforme, pero las hojas deben implementar métodos vacíos |
| **Seguro** | Gestión de hijos solo en Composite | Seguridad de tipos, pero los clientes deben distinguir hoja vs. compuesto |
| **Ponderado** | El compuesto calcula valores agregados de hijos | Tamaños de archivos, precios, totales |

## Lo que funciona

- **Mantén la interfaz de componente ligera** — demasiados métodos hacen las hojas complejas
- **Documenta si las operaciones nulas/vacías son válidas** para operaciones de hoja
- **Prefiere árboles inmutables** cuando la estructura no cambia frecuentemente
- **Agrega helpers de recorrido** (find, filter, map) para operaciones comunes de árbol
- **Valida la integridad del árbol** en métodos `add()` del compuesto (ej. prevenir ciclos)

## Errores Comunes

- Agregar demasiados métodos de gestión de hijos a la interfaz de componente, forzando a las hojas a implementar no-ops
- Permitir ciclos en la estructura de árbol, causando recursión infinita
- Exponer la colección interna de hijos, rompiendo encapsulación
- Olvidar manejar el caso borde de compuestos vacíos en operaciones recursivas
- Mezclar lógica de compuesto con lógica de dominio, haciendo el patrón difícil de probar

## Preguntas Frecuentes

**P: ¿Cuándo debería usar Composite en lugar de una lista plana?**
R: Usa Composite cuando tus datos sean naturalmente jerárquicos y necesites realizar operaciones recursivas. Para estructuras planas o poco profundas, una lista simple con agrupación es usualmente suficiente. Si necesitas agregar comportamiento a objetos individuales sin semántica de árbol, usa [Decorator](/patterns/design/decorator-pattern) en su lugar.

**P: ¿Cómo evito ciclos en un árbol Composite?**
R: En el método `add()` del compuesto, verifica que el componente que se agrega no sea ya un ancestro en el árbol. Mantén una referencia al padre si es necesario.
