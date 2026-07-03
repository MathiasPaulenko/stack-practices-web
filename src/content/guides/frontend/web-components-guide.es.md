---
contentType: guides
slug: web-components-guide
title: "Web Components — Custom Elements, Shadow DOM y Templates"
description: "Guía práctica de Web Components: crear elementos personalizables reutilizables, encapsular estilos con Shadow DOM y componer con templates HTML."
metaDescription: "Aprende Web Components: custom elements, Shadow DOM, templates HTML. Guía práctica para construir componentes web reutilizables e independientes del framework."
difficulty: intermediate
topics:
  - frontend
tags:
  - web-components
  - custom-elements
  - shadow-dom
  - html-templates
  - framework-agnostic
  - reusable-components
  - guide
relatedResources:
  - /guides/accessibility-wcag-guide
  - /guides/progressive-web-apps-guide
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende Web Components: custom elements, Shadow DOM, templates HTML. Guía práctica para construir componentes web reutilizables e independientes del framework."
  keywords:
    - web-components
    - custom-elements
    - shadow-dom
    - html-templates
    - independiente-framework
    - componentes-reutilizables
    - guia
---

## Visión General

Web Components son un conjunto de APIs nativas del navegador para crear elementos HTML reutilizables y encapsulados. Funcionan en cualquier framework — o sin ninguno — y proporcionan verdadera encapsulación de estilos y DOM mediante Shadow DOM. Esta guía cubre las tres tecnologías principales: Custom Elements, Shadow DOM y HTML Templates, con ejemplos prácticos que puedes usar hoy.

## Cuándo Usar

- Necesitas elementos UI reutilizables compartidos entre diferentes proyectos o frameworks
- Quieres encapsulación de estilos sin CSS-in-JS o convenciones de nomenclatura BEM
- Estás construyendo un sistema de diseño que debe funcionar en React, Vue, Angular o JS vanilla
- Necesitas extender elementos HTML nativos con comportamiento personalizado
- Quieres componentes independientes del framework para mantenibilidad a largo plazo

## Las Tres Tecnologías

| Tecnología | Propósito | Estándar |
|------------|-----------|----------|
| **Custom Elements** | Definir nuevas etiquetas HTML con JavaScript | Custom Elements v1 |
| **Shadow DOM** | Encapsular DOM y estilos dentro de un componente | Shadow DOM v1 |
| **HTML Templates** | Declarar fragmentos de marcado reutilizables | HTML Template Element |

## Custom Elements

### Custom Elements Autónomos

Crea etiquetas HTML completamente nuevas.

```javascript
class UserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const name = this.getAttribute('name') || 'Anónimo';
    const role = this.getAttribute('role') || 'Usuario';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        .name { font-weight: 600; color: #111827; }
        .role { color: #6b7280; font-size: 0.875rem; }
      </style>
      <div class="name">${name}</div>
      <div class="role">${role}</div>
    `;
  }

  static get observedAttributes() {
    return ['name', 'role'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this.render();
  }
}

customElements.define('user-card', UserCard);
```

```html
<!-- Uso -->
<user-card name="Alice Chen" role="Senior Engineer"></user-card>
<user-card name="Bob Smith" role="Product Manager"></user-card>
```

### Customized Built-in Elements

Extiende elementos HTML existentes con nuevo comportamiento.

```javascript
class ConfirmButton extends HTMLButtonElement {
  constructor() {
    super();
    this.addEventListener('click', (e) => {
      if (!confirm(this.getAttribute('confirm-message') || 'Estás seguro?')) {
        e.preventDefault();
      }
    });
  }
}

customElements.define('confirm-button', ConfirmButton, { extends: 'button' });
```

```html
<!-- Uso mediante atributo is="" -->
<button is="confirm-button" confirm-message="Eliminar este archivo permanentemente?">
  Eliminar
</button>
```

## Shadow DOM

### Encapsulación

Shadow DOM aísla el DOM y CSS de un componente del resto de la página.

```javascript
class StyledCounter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    
    shadow.innerHTML = `
      <style>
        /* Enfocado solo a este componente */
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        button:hover { background: #2563eb; }
        span { margin-left: 0.5rem; font-weight: 600; }
      </style>
      <button id="inc">+</button>
      <span id="count">0</span>
    `;
    
    this.count = 0;
    shadow.getElementById('inc').addEventListener('click', () => {
      this.count++;
      shadow.getElementById('count').textContent = this.count;
    });
  }
}

customElements.define('styled-counter', StyledCounter);
```

### Slots

Los slots permiten inyectar contenido en el Shadow DOM de un componente.

```javascript
class AlertBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; padding: 1rem; border-radius: 0.5rem; }
        :host([type="error"]) { background: #fef2f2; border: 1px solid #fca5a5; }
        :host([type="warning"]) { background: #fffbeb; border: 1px solid #fcd34d; }
        :host([type="success"]) { background: #f0fdf4; border: 1px solid #86efac; }
        ::slotted(h3) { margin: 0 0 0.5rem; font-size: 1rem; }
        ::slotted(p) { margin: 0; color: #4b5563; }
      </style>
      <slot name="title"></slot>
      <slot></slot>
    `;
  }
}

customElements.define('alert-box', AlertBox);
```

```html
<!-- Uso con slots nombrados -->
<alert-box type="error">
  <h3 slot="title">Conexión Fallida</h3>
  <p>No se puede alcanzar el servidor. Por favor verifica tu red e intenta de nuevo.</p>
</alert-box>
```

## HTML Templates

Los templates declaran marcado reutilizable que no se renderiza hasta clonarse.

```html
<template id="user-row-template">
  <tr>
    <td class="name"></td>
    <td class="email"></td>
    <td><button class="delete">Remover</button></td>
  </tr>
</template>
```

```javascript
function createUserRow(user) {
  const template = document.getElementById('user-row-template');
  const clone = template.content.cloneNode(true);
  
  clone.querySelector('.name').textContent = user.name;
  clone.querySelector('.email').textContent = user.email;
  clone.querySelector('.delete').addEventListener('click', () => removeUser(user.id));
  
  return clone;
}

// Agregar a la tabla
document.querySelector('#users tbody').appendChild(createUserRow({
  name: 'Alice Chen',
  email: 'alice@example.com'
}));
```

## Ciclo de Vida del Componente

| Callback | Cuándo Se Dispara | Uso Común |
|----------|------------------|-----------|
| `constructor()` | Elemento creado | Inicializar estado, adjuntar shadow root |
| `connectedCallback()` | Insertado en el DOM | Renderizar, obtener datos, agregar event listeners |
| `disconnectedCallback()` | Removido del DOM | Limpiar temporizadores, event listeners, suscripciones |
| `attributeChangedCallback()` | Cambios en atributos observados | Re-renderizar, validar, actualizar estado interno |
| `adoptedCallback()` | Movido a un nuevo documento | Raramente usado; limpiar y re-inicializar |

## Integración con Frameworks

Web Components funcionan en cualquier framework.

```jsx
// React
import 'my-ui-library';

function App() {
  return (
    <div>
      <user-card name="Alice" role="Engineer" />
      <alert-box type="success">
        <h3 slot="title">Guardado</h3>
        <p>Tus cambios han sido guardados.</p>
      </alert-box>
    </div>
  );
}
```

```vue
<!-- Vue -->
<template>
  <user-card :name="user.name" :role="user.role" />
</template>

<script>
import 'my-ui-library';
export default { props: ['user'] };
</script>
```

## Errores Comunes

- **Olvidar manejar cambios de atributos** — los atributos observados deben disparar re-renderizado
- **Usar `innerHTML` en el elemento host** — siempre usa Shadow DOM para el marcado del componente
- **No limpiar en `disconnectedCallback()`** — fugas de memoria de event listeners huérfanos
- **Asumir que `constructor` corre después de inserción en DOM** — corre en creación; el DOM puede no existir aún
- **Faltar polyfills para navegadores antiguos** — Edge 18 e IE11 necesitan el polyfill de webcomponentsjs

## FAQ

**Los Web Components reemplazan React/Vue/Angular?**
No — los complementan. Usa Web Components para elementos de sistema de diseño reutilizables que deben funcionar entre frameworks, o para widgets embebibles independientes del framework.

**Los Web Components pueden usar frameworks CSS externos?**
Sí, pero Shadow DOM bloquea CSS global. Importa estilos dentro del shadow root o usa propiedades CSS personalizadas (variables) como API de estilos.

**Cómo pruebo Web Components?**
Usa las herramientas integradas del navegador o frameworks como Playwright/Web Test Runner. Shadow DOM requiere selectores especiales: `shadowRoot.querySelector()`.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
