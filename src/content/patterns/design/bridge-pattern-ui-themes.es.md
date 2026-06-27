---
contentType: patterns
slug: bridge-pattern-ui-themes
title: "Bridge Pattern para Desacoplar Componentes UI de Temas"
description: "Separa una abstraccion de su implementacion para que ambas puedan variar independientemente usando el Bridge pattern para temas UI y motores de renderizado intercambiables"
metaDescription: "Bridge pattern para temas UI. Desacopla componentes del renderizado para que abstracciones e implementaciones varien independientemente en sistemas de theming."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - bridge
  - structural-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/adapter-pattern-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bridge pattern para temas UI. Desacopla componentes del renderizado para que abstracciones e implementaciones varien independientemente en sistemas de theming."
  keywords:
    - bridge pattern
    - decoupling
    - ui themes
    - structural patterns
    - platform independence
---

# Bridge Pattern para Desacoplar Componentes UI de Temas

El Bridge pattern desacopla una abstraccion de su implementacion para que ambas puedan variar independientemente. En lugar de una jerarquia de clases que combina tipos de componentes con plataformas de renderizado, Bridge crea dos jerarquias separadas: una para abstracciones (componentes) y otra para implementaciones (renderizadores o temas).

## Cuando Usar Esto

- Necesitas soportar multiples plataformas o temas sin explosion de subclases
- Cambios en la implementacion no deberian requerir recompilar la capa de abstraccion
- Ambas dimensiones (que y como) necesitan evolucionar independientemente

## Problema

Soportar Button, Checkbox y Slider en Web, iOS y Android conduce a 9 subclases: WebButton, iOSButton, AndroidButton, WebCheckbox, iOSCheckbox, y asi sucesivamente.

## Solucion

```typescript
// bridge/Renderer.ts
interface UIRenderer {
  renderButton(label: string, onClick: () => void): string;
  renderCheckbox(label: string, checked: boolean): string;
  renderSlider(min: number, max: number, value: number): string;
}

// Implementaciones
class WebRenderer implements UIRenderer {
  renderButton(label: string, onClick: () => void): string {
    return `<button onclick="${onClick.name}">${label}</button>`;
  }

  renderCheckbox(label: string, checked: boolean): string {
    const checkedAttr = checked ? 'checked' : '';
    return `<label><input type="checkbox" ${checkedAttr}> ${label}</label>`;
  }

  renderSlider(min: number, max: number, value: number): string {
    return `<input type="range" min="${min}" max="${max}" value="${value}">`;
  }
}

class NativeRenderer implements UIRenderer {
  renderButton(label: string): string {
    return `[Native Button: ${label}]`;
  }

  renderCheckbox(label: string, checked: boolean): string {
    return `[Native Checkbox: ${label} ${checked ? '✓' : ' '}]`;
  }

  renderSlider(min: number, max: number, value: number): string {
    return `[Native Slider: ${value}/${max}]`;
  }
}

// Abstracciones
abstract class UIComponent {
  constructor(protected renderer: UIRenderer) {}
  abstract render(): string;
}

class Button extends UIComponent {
  constructor(
    renderer: UIRenderer,
    private label: string,
    private onClick: () => void
  ) {
    super(renderer);
  }

  render(): string {
    return this.renderer.renderButton(this.label, this.onClick);
  }
}

class Checkbox extends UIComponent {
  constructor(
    renderer: UIRenderer,
    private label: string,
    private checked: boolean
  ) {
    super(renderer);
  }

  render(): string {
    return this.renderer.renderCheckbox(this.label, this.checked);
  }
}

// Uso
const webRenderer = new WebRenderer();
const nativeRenderer = new NativeRenderer();

const webButton = new Button(webRenderer, 'Submit', () => {});
const nativeButton = new Button(nativeRenderer, 'Submit', () => {});

console.log(webButton.render());     // <button>Submit</button>
console.log(nativeButton.render());  // [Native Button: Submit]
```

## Variacion: Theme Bridge

```typescript
// bridge/Theme.ts
interface Theme {
  getColors(): { primary: string; background: string; text: string };
  getBorderRadius(): number;
  getSpacing(): number;
}

class LightTheme implements Theme {
  getColors() { return { primary: '#007bff', background: '#ffffff', text: '#333333' }; }
  getBorderRadius() { return 4; }
  getSpacing() { return 8; }
}

class DarkTheme implements Theme {
  getColors() { return { primary: '#4dabf7', background: '#1a1a1a', text: '#e0e0e0' }; }
  getBorderRadius() { return 8; }
  getSpacing() { return 12; }
}

abstract class ThemedComponent {
  constructor(protected theme: Theme) {}
}

class ThemedButton extends ThemedComponent {
  render(label: string): string {
    const colors = this.theme.getColors();
    return `
      <button style="
        background: ${colors.primary};
        color: ${colors.text};
        border-radius: ${this.theme.getBorderRadius()}px;
        padding: ${this.theme.getSpacing()}px;
      ">${label}</button>
    `;
  }
}

const light = new ThemedButton(new LightTheme());
const dark = new ThemedButton(new DarkTheme());
```

## Como Funciona

1. **Abstraction** define la interfaz de alto nivel que usan los clientes
2. **Refined Abstraction** extiende la abstraccion con comportamiento variante
3. **Implementation** define la interfaz de plataforma o tema
4. **Concrete Implementation** provee renderizado especifico de plataforma

## Consideraciones de Produccion

- Usa inyeccion de dependencias para intercambiar implementaciones en runtime
- Bridge funciona bien con [Abstract Factory](/patterns/design/abstract-factory-pattern) para crear familias de componentes emparejados
- Manten la abstraccion delgada; delega todos los detalles de renderizado a la implementacion

## Errores Comunes

- Confundir Bridge con [Adapter](/patterns/design/adapter-pattern): Adapter hace compatibles interfaces no relacionadas; Bridge separa una interfaz de su implementacion
- Crear un Bridge cuando un simple [Strategy](/patterns/design/strategy-pattern) bastaria para variacion de un solo metodo

## FAQ

**P: En que se diferencia de Strategy?**
R: [Strategy](/patterns/design/strategy-pattern) cambia el comportamiento de un solo objeto. Bridge separa dos jerarquias de clases enteras para que cada una pueda evolucionar independientemente.

**P: Puedo usar esto para backends de base de datos?**
R: Si. La abstraccion es tu interfaz de repositorio; las implementaciones son adaptadores SQL, MongoDB o DynamoDB.
