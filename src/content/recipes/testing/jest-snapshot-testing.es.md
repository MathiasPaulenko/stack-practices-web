---
contentType: recipes
slug: jest-snapshot-testing
title: "Snapshot Testing de Componentes React con Jest"
description: "Como usar snapshot testing de Jest para detectar regresiones de UI no intencionales en componentes React y prevenir bugs visuales en produccion"
metaDescription: "Snapshot testing de componentes React con Jest. Detecta regresiones de UI, actualiza snapshots intencionalmente e integra con CI."
difficulty: beginner
topics:
  - testing
tags:
  - jest
  - testing
  - react
relatedResources:
  - /recipes/unit-testing-mocking
  - /recipes/visual-regression-testing
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Snapshot testing de componentes React con Jest. Detecta regresiones de UI, actualiza snapshots intencionalmente e integra con CI."
  keywords:
    - jest
    - snapshot testing
    - react
    - ui testing
    - regression
---

# Snapshot Testing de Componentes React con Jest

El snapshot testing captura la salida renderizada de un componente y la compara contra una referencia almacenada. Cuando la salida cambia inesperadamente, el test falla, alertandote sobre potenciales regresiones de UI antes de que lleguen a los usuarios.

## Cuando Usar Esto

- Quieres detectar cambios no intencionales en el renderizado de componentes. Consulta [Visual Regression Testing](/recipes/testing/e2e-testing) para comparaciones pixel-perfect.
- Tus componentes tienen logica de renderizado condicional compleja. Consulta [Component Testing](/recipes/testing/e2e-testing) para tests interactivos en navegador.
- Estas refactorizando un componente y quieres confianza de que nada se rompio. Consulta [Unit Testing](/recipes/testing/unit-testing) para verificación de lógica aislada.

## Cuando NO Usar Esto

- Para datos en vivo que cambian en cada renderizado (timestamps, IDs aleatorios)
- Como reemplazo de tests de comportamiento o integracion
- Para componentes de terceros que no controlas

## Requisitos Previos

- Un proyecto React con Jest configurado
- `@testing-library/react` para renderizar componentes en tests

## Solucion: Snapshots de Componentes React

### 1. Test de Snapshot Basico

```jsx
// Button.test.jsx
import { render } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renderiza correctamente con props por defecto', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renderiza correctamente con prop variant', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renderiza correctamente cuando esta deshabilitado', () => {
    const { container } = render(<Button disabled>Loading</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### 2. Snapshot con Variaciones de Props

```jsx
// Card.test.jsx
import { render } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  const baseProps = {
    title: 'Test Card',
    description: 'A sample card for testing',
    imageUrl: '/test.jpg',
  };

  it('renderiza con todas las props', () => {
    const { container } = render(<Card {...baseProps} />);
    expect(container).toMatchSnapshot();
  });

  it('renderiza sin imagen', () => {
    const { container } = render(
      <Card title={baseProps.title} description={baseProps.description} />
    );
    expect(container).toMatchSnapshot();
  });

  it('renderiza estado de carga', () => {
    const { container } = render(<Card loading title="Loading" />);
    expect(container).toMatchSnapshot();
  });
});
```

### 3. Snapshots Inline para Salidas Pequenas

```jsx
// Badge.test.jsx
import { render } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renderiza badge de estado', () => {
    const { container } = render(<Badge status="active">Online</Badge>);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="badge badge--active"
      >
        Online
      </span>
    `);
  });
});
```

### 4. Snapshot Testing con React Testing Library

```jsx
// UserProfile.test.jsx
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile', () => {
  it('coincide con snapshot para usuario activo', () => {
    const user = {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'admin',
      avatar: '/avatars/alice.jpg',
    };

    const { asFragment } = render(<UserProfile user={user} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('coincide con snapshot para estado de carga', () => {
    const { asFragment } = render(<UserProfile loading />);
    expect(asFragment()).toMatchSnapshot();
  });
});
```

### 5. Actualizar Snapshots

```bash
# Actualizar snapshots para un archivo de test especifico
npx jest Button.test.jsx --updateSnapshot

# Actualizar todos los snapshots
npx jest --updateSnapshot

# Modo interactivo: revisar cada cambio
npx jest --updateSnapshot --interactive
```

## Como Funciona

1. **Primera Ejecucion**: Jest renderiza el componente y almacena el HTML serializado como un archivo `.snap`
2. **Ejecuciones Subsiguientes**: Jest renderiza el componente nuevamente y compara contra el snapshot almacenado
3. **Desajuste**: Si las salidas difieren, el test falla con un diff mostrando exactamente que cambio
4. **Actualizacion**: Actualizas explicitamente los snapshots despues de revisar que los cambios son intencionales

## Consideraciones de Produccion

- **Commitea archivos de snapshot** en control de versiones junto con tu codigo
- **Revisa diffs de snapshot** en pull requests igual que cambios de codigo
- **Usa `toMatchInlineSnapshot`** para salidas pequenas y estables para mantener tests autocontenidos
- **Combina con regresion visual** para validacion de UI pixel-perfect
- **Mockea fechas e IDs** para prevenir snapshots intermitentes de valores en vivo

## FAQ

**P: Por que fallo mi test de snapshot cuando solo cambie CSS?**
R: Los tests de snapshot capturan HTML renderizado incluyendo nombres de clases. Si los hashes de modulos CSS cambiaron, el snapshot diferira. Revisa el diff para confirmar que son solo nombres de clases.

**P: Debo hacer snapshot testing de cada componente?**
R: No. Enfocate en componentes con renderizado condicional complejo, primitivas de UI reutilizables y componentes que estas refactorizando activamente.

**P: Como manejo componentes de terceros en snapshots?**
R: Mockéalos con `jest.mock()` o usa `jest.mockComponent()` para renderizar un placeholder estable.
