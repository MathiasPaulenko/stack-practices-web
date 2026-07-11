---
contentType: patterns
slug: composite-pattern-ui
title: "Composite Pattern para Arboles de Componentes UI en React"
description: "Usa el Composite pattern para componer objetos en estructuras de arbol, permitiendo que clientes traten objetos individuales y composiciones uniformemente en jerarquias de componentes"
metaDescription: "Composite pattern para arboles UI en React. Compone objetos en arboles para tratar elementos y composiciones uniformemente en jerarquias de componentes."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - composite
  - structural-patterns
  - react
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/decorator-pattern-pipeline
  - /patterns/design/adapter-pattern-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Composite pattern para arboles UI en React. Compone objetos en arboles para tratar elementos y composiciones uniformemente en jerarquias de componentes."
  keywords:
    - composite pattern
    - tree structure
    - react components
    - structural patterns
    - ui hierarchy
---

# Composite Pattern para Arboles de Componentes UI en React

El Composite pattern compone objetos en estructuras de arbol para representar jerarquias parte-todo. Permite que clientes traten objetos individuales y composiciones de objetos uniformemente. En React, este pattern aparece naturalmente al renderizar arboles de componentes anidados donde un contenedor tiene tanto elementos hoja como otros contenedores. Consulta el [Patron Composite](/patterns/design/composite-pattern) general para ejemplos independientes del lenguaje.

## Cuando Usar Esto

- Tienes una estructura de arbol de objetos con relaciones padre-hijo
- Los clientes deberian ignorar la diferencia entre composiciones y objetos individuales
- Necesitas realizar operaciones recursivamente a traves de una jerarquia

## Problema

Un constructor de formularios necesita renderizar grupos anidados, campos y secciones. La logica de renderizado se ramifica para cada tipo en lugar de tratar todo como un nodo renderizable.

## Solucion

```typescript
// components/Composite.tsx
interface ComponentNode {
  id: string;
  type: string;
  render(): React.ReactNode;
}

// Leaf
class FieldNode implements ComponentNode {
  constructor(
    public id: string,
    public label: string,
    public value: string
  ) {}

  render(): React.ReactNode {
    return (
      <div key={this.id} className="field">
        <label>{this.label}</label>
        <input type="text" defaultValue={this.value} />
      </div>
    );
  }
}

// Composite
class GroupNode implements ComponentNode {
  public children: ComponentNode[] = [];

  constructor(
    public id: string,
    public title: string
  ) {}

  add(child: ComponentNode): void {
    this.children.push(child);
  }

  remove(childId: string): void {
    this.children = this.children.filter(c => c.id !== childId);
  }

  render(): React.ReactNode {
    return (
      <fieldset key={this.id} className="group">
        <legend>{this.title}</legend>
        {this.children.map(child => child.render())}
      </fieldset>
    );
  }

  getTotalFields(): number {
    return this.children.reduce((count, child) => {
      if (child instanceof GroupNode) {
        return count + child.getTotalFields();
      }
      return count + 1;
    }, 0);
  }
}

// Uso
const formRoot = new GroupNode('root', 'User Profile');

const personalInfo = new GroupNode('personal', 'Personal Information');
personalInfo.add(new FieldNode('firstName', 'First Name', 'John'));
personalInfo.add(new FieldNode('lastName', 'Last Name', 'Doe'));

const address = new GroupNode('address', 'Address');
address.add(new FieldNode('street', 'Street', '123 Main St'));
address.add(new FieldNode('city', 'City', 'Springfield'));

formRoot.add(personalInfo);
formRoot.add(address);

// En un componente React
function FormBuilder({ root }: { root: GroupNode }) {
  return (
    <form>
      {root.render()}
      <p>Total fields: {root.getTotalFields()}</p>
    </form>
  );
}
```

## Como Funciona

1. **Component** define la interfaz comun para todos los objetos en el arbol
2. **Leaf** representa objetos individuales sin hijos
3. **Composite** almacena componentes hijos e implementa operaciones relacionadas con hijos
4. **Client** trabaja con cualquier Component uniformemente via la interfaz comun

## Ejemplo Real: Sistema de Archivos

```typescript
// Nodos de sistema de archivos
interface FileSystemNode {
  name: string;
  getSize(): number;
  print(indent?: string): void;
}

class File implements FileSystemNode {
  constructor(
    public name: string,
    private size: number
  ) {}

  getSize(): number {
    return this.size;
  }

  print(indent = ''): void {
    console.log(`${indent}📄 ${this.name} (${this.size} bytes)`);
  }
}

class Directory implements FileSystemNode {
  public children: FileSystemNode[] = [];

  constructor(public name: string) {}

  add(node: FileSystemNode): void {
    this.children.push(node);
  }

  getSize(): number {
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }

  print(indent = ''): void {
    console.log(`${indent}📁 ${this.name}/`);
    this.children.forEach(child => child.print(indent + '  '));
  }
}

const root = new Directory('src');
const components = new Directory('components');
components.add(new File('Button.tsx', 1200));
components.add(new File('Card.tsx', 800));
root.add(components);
root.add(new File('index.ts', 150));

root.print();
console.log(`Total size: ${root.getSize()} bytes`);
```

## Consideraciones de Produccion

- Usa uniones discriminadas de TypeScript en lugar de clases para props de React mas simples
- Considera actualizaciones inmutables de arbol con comparticion estructural para jerarquias grandes
- Agrega referencias `parent` para traversal ascendente, pero evita serializacion JSON circular

## Errores Comunes

- Poner metodos de gestion de hijos en la interfaz base Component, forzando Leaf a implementarlos
- No manejar recursion profundamente anidada que podria exceder limites de stack
- Mutar la estructura de arbol durante iteracion

## FAQ

**P: En que se diferencia de Decorator?**
R: Composite construye estructuras de arbol con semantica de contenedor. [Decorator](/patterns/design/decorator-pattern) agrega responsabilidades a un unico objeto sin semantica de arbol.

**P: Cuando deberia evitar Composite?**
R: Cuando la jerarquia es plana (solo un nivel) o cuando operaciones de hijo no tienen sentido para nodos hoja. Para estructuras planas, considera [Decorator](/patterns/design/decorator-pattern) en su lugar.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Composite para UI Component Tree

```typescript
// Composite pattern: tratar individuales y compuestos uniformemente
interface UIComponent {
  render(): string;
  getChildren(): UIComponent[];
  add(child: UIComponent): void;
  remove(child: UIComponent): void;
}

// Leaf: componente sin hijos
class Button implements UIComponent {
  constructor(private label: string, private style: string = "") {}
  render(): string {
    return `<button class="${this.style}">${this.label}</button>`;
  }
  getChildren(): UIComponent[] { return []; }
  add(child: UIComponent): void { throw new Error("Cannot add to leaf"); }
  remove(child: UIComponent): void { throw new Error("Cannot remove from leaf"); }
}

class Input implements UIComponent {
  constructor(private type: string, private placeholder: string) {}
  render(): string {
    return `<input type="${this.type}" placeholder="${this.placeholder}" />`;
  }
  getChildren(): UIComponent[] { return []; }
  add(): void { throw new Error("Cannot add to leaf"); }
  remove(): void { throw new Error("Cannot remove from leaf"); }
}

// Composite: componente con hijos
class Container implements UIComponent {
  private children: UIComponent[] = [];
  constructor(private tag: string = "div", private className: string = "") {}
  add(child: UIComponent): void { this.children.push(child); }
  remove(child: UIComponent): void {
    this.children = this.children.filter(c => c !== child);
  }
  getChildren(): UIComponent[] { return [...this.children]; }
  render(): string {
    const childrenHTML = this.children.map(c => c.render()).join("");
    return `<${this.tag} class="${this.className}">${childrenHTML}</${this.tag}>`;
  }
}

// Uso: construir arbol de UI
const form = new Container("form", "login-form");
const header = new Container("div", "form-header");
header.add(new Button("Close", "btn-close"));
const body = new Container("div", "form-body");
body.add(new Input("email", "Email"));
body.add(new Input("password", "Password"));
const footer = new Container("div", "form-footer");
footer.add(new Button("Submit", "btn-primary"));
form.add(header);
form.add(body);
form.add(footer);

console.log(form.render());
// <form class="login-form"><div class="form-header"><button class="btn-close">Close</button></div>...
```

Lecciones:
  - Composite trata hojas y compuestos con la misma interfaz
  - El cliente no distingue entre un boton y un contenedor
  - Arboles de UI: cada nodo es un UIComponent
  - add/remove en hojas lanza error: no pueden tener hijos
  - React usa este patron: elementos son composables uniformemente
```

### Composite vs Decorator: cual uso?

Composite es estructural: arboles de objetos con la misma interfaz. Decorator es estructural: envuelve un objeto para anadir comportamiento. Composite tiene 0..N hijos; Decorator tiene exactamente 1. Composite construye arboles; Decorator construye cadenas. Usa Composite para jerarquias de UI. Usa Decorator para anadir logging, cache, o validacion a un servicio.
