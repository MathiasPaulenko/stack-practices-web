---
contentType: patterns
slug: abstract-factory-cross-platform
title: "Abstract Factory para Familias de Componentes UI Cross-Platform"
description: "Crea familias de objetos relacionados sin especificar clases concretas, habilitando implementaciones especificas de plataforma que comparten una interfaz comun"
metaDescription: "Abstract Factory pattern para familias UI. Crea objetos relacionados sin especificar clases concretas para familias de componentes cross-platform y theme-specific."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - abstract-factory
  - creational-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/bridge-pattern-ui-themes
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Abstract Factory pattern para familias UI. Crea objetos relacionados sin especificar clases concretas para familias de componentes cross-platform y theme-specific."
  keywords:
    - abstract factory
    - family of objects
    - cross platform ui
    - creational patterns
    - platform abstraction
---

# Abstract Factory para Familias de Componentes UI Cross-Platform

El Abstract Factory pattern provee una interfaz para crear familias de objetos relacionados sin especificar sus clases concretas. Cuando un sistema debe ser independiente de como sus productos son creados, compuestos y representados — especialmente a traves de plataformas o temas — Abstract Factory asegura consistencia dentro de cada familia mientras permite implementaciones intercambiables.

## Cuando Usar Esto

- Un sistema debe soportar multiples plataformas o temas con familias de componentes cohesionadas
- Necesitas garantizar que productos de la misma factory sean compatibles
- El proceso de creacion deberia estar oculto del codigo cliente

## Problema

Un toolkit de UI necesita renderizar botones nativos, checkboxes y dialogs en Web, iOS y Android. Usar Factory Method para cada widget independientemente riesga mezclar componentes nativos y web en la misma vista.

## Solucion

```typescript
// factory/UIFactory.ts
interface Button {
  render(): string;
  onClick(handler: () => void): void;
}

interface Checkbox {
  render(): string;
  toggle(): void;
  isChecked(): boolean;
}

interface Dialog {
  show(): void;
  hide(): void;
  setTitle(title: string): void;
}

interface UIFactory {
  createButton(label: string): Button;
  createCheckbox(label: string): Checkbox;
  createDialog(): Dialog;
}

// Familia Web
class WebButton implements Button {
  constructor(private label: string) {}
  render(): string { return `<button>${this.label}</button>`; }
  onClick(handler: () => void): void { /* attach DOM listener */ }
}

class WebCheckbox implements Checkbox {
  private checked = false;
  constructor(private label: string) {}
  render(): string { return `<label><input type="checkbox"> ${this.label}</label>`; }
  toggle(): void { this.checked = !this.checked; }
  isChecked(): boolean { return this.checked; }
}

class WebDialog implements Dialog {
  private title = '';
  show(): void { console.log('Show web dialog:', this.title); }
  hide(): void { console.log('Hide web dialog'); }
  setTitle(title: string): void { this.title = title; }
}

class WebFactory implements UIFactory {
  createButton(label: string): Button { return new WebButton(label); }
  createCheckbox(label: string): Checkbox { return new WebCheckbox(label); }
  createDialog(): Dialog { return new WebDialog(); }
}

// Familia Mobile
class MobileButton implements Button {
  constructor(private label: string) {}
  render(): string { return `[Mobile Button: ${this.label}]`; }
  onClick(): void { /* native tap handler */ }
}

class MobileCheckbox implements Checkbox {
  private checked = false;
  constructor(private label: string) {}
  render(): string { return `[Mobile Switch: ${this.label}]`; }
  toggle(): void { this.checked = !this.checked; }
  isChecked(): boolean { return this.checked; }
}

class MobileDialog implements Dialog {
  private title = '';
  show(): void { console.log('Show mobile modal:', this.title); }
  hide(): void { console.log('Dismiss mobile modal'); }
  setTitle(title: string): void { this.title = title; }
}

class MobileFactory implements UIFactory {
  createButton(label: string): Button { return new MobileButton(label); }
  createCheckbox(label: string): Checkbox { return new MobileCheckbox(label); }
  createDialog(): Dialog { return new MobileDialog(); }
}

// Cliente usa cualquier factory uniformemente
class SettingsScreen {
  private button: Button;
  private checkbox: Checkbox;
  private dialog: Dialog;

  constructor(factory: UIFactory) {
    this.button = factory.createButton('Save');
    this.checkbox = factory.createCheckbox('Dark Mode');
    this.dialog = factory.createDialog();
    this.dialog.setTitle('Confirm');
  }

  render(): string {
    return `${this.button.render()} ${this.checkbox.render()}`;
  }
}

// Uso
const webScreen = new SettingsScreen(new WebFactory());
const mobileScreen = new SettingsScreen(new MobileFactory());
```

## Como Funciona

1. **Abstract Factory** declara metodos de creacion para cada tipo de producto
2. **Concrete Factory** implementa creacion para una familia especifica
3. **Abstract Products** declaran interfaces para tipos de producto
4. **Concrete Products** implementan una variante para una familia
5. **Client** usa solo interfaces abstractas; la factory concreta determina la familia

## Consideraciones de Produccion

- Usa frameworks de inyeccion de dependencias para seleccionar la factory en runtime
- Abstract Factory funciona bien con [Bridge](/patterns/design/bridge-pattern) cuando las familias tambien necesitan renderizado especifico de plataforma
- Considera [registros de factory](/patterns/design/factory-pattern) para arquitecturas basadas en plugins

## Errores Comunes

- Agregar nuevos tipos de producto requiere cambiar todas las factories concretas
- Usar Abstract Factory cuando un simple Factory Method bastaria
- Crear familias demasiado amplias que comparten poco en comun

## FAQ

**P: En que se diferencia de Factory Method?**
R: [Factory Method](/patterns/design/factory-pattern) crea un producto a traves de herencia. Abstract Factory crea familias de productos relacionados a traves de composicion.

**P: Cuando deberia evitar Abstract Factory?**
R: Cuando la familia de productos es pequena (2-3 productos) o cuando los productos no necesitan ser compatibles entre si.
