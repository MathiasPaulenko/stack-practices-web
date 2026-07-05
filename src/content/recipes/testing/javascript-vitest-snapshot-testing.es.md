---
contentType: recipes
slug: javascript-vitest-snapshot-testing
title: "Vitest Snapshot Testing para React"
description: "Cómo usar Vitest snapshot testing para detectar cambios no intencionados en la UI de componentes React, incluyendo inline snapshots y flujos de actualización."
metaDescription: "Usa Vitest snapshot testing para detectar cambios no intencionados en React UI, con inline snapshots, flujos de actualización e integración con CI."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - vitest
  - javascript
  - react
  - snapshot
  - frontend
  - recipe
relatedResources:
  - /recipes/testing/jest-snapshot-testing
  - /recipes/testing/nodejs-supertest-express-api
  - /recipes/frontend/react-usememo-usecallback-performance
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa Vitest snapshot testing para detectar cambios no intencionados en React UI, con inline snapshots, flujos de actualización e integración con CI."
  keywords:
    - testing
    - vitest
    - javascript
    - react
    - snapshot
    - frontend
    - recipe
---

## Overview

Snapshot testing captura el output renderizado de un componente en un punto en el tiempo. En ejecuciones posteriores de test, Vitest compara el output actual contra el snapshot almacenado. Si difieren, el test falla — alertándote de cambios no intencionados en la UI. Vitest es un test runner compatible con Jest para proyectos Vite con soporte de snapshot integrado.

## When to Use

- Detectar regresiones accidentales de CSS o markup en componentes presentacionales
- Verificar que un componente renderiza la misma estructura a través de refactors
- Testear componentes con output estable y determinista (sin IDs random ni timestamps)
- Documentar el output esperado de funciones utilitarias que retornan objetos complejos

## When NOT to Use

- Componentes con contenido dinámico (fechas, valores random, UUIDs) — los snapshots siempre fallarán
- Testear lógica de negocio — usa unit tests con aserciones explícitas
- Componentes que cambian frecuentemente durante desarrollo activo — el churn de snapshots es ruido
- Testear accesibilidad o interacción — los snapshots solo verifican HTML renderizado, no comportamiento

## Solution

### Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
```

```typescript
// test/setup.ts
import "@testing-library/jest-dom";
```

### Snapshot test básico

```typescript
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("matches snapshot for default variant", () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for primary variant", () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for disabled state", () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Inline snapshot

```typescript
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders inline snapshot", () => {
    const { container } = render(<Badge count={5} />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="badge badge-primary"
      >
        5
      </span>
    `);
  });
});
```

### Snapshot con serializadores

```typescript
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
  it("matches snapshot with custom serializer", () => {
    const user = { id: 1, name: "Alice", email: "alice@example.com" };
    const { container } = render(<UserCard user={user} />);

    expect(container).toMatchInlineSnapshot(
      {
        serialization: "html",
      },
      `
      <div>
        <div
          class="user-card"
        >
          <h3>
            Alice
          </h3>
          <p>
            alice@example.com
          </p>
        </div>
      </div>
    `,
    );
  });
});
```

### Snapshot del output de una función

```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("matches snapshot for USD", () => {
    expect(formatCurrency(1234.56, "USD")).toMatchInlineSnapshot(
      `"$1,234.56"`,
    );
  });

  it("matches snapshot for EUR", () => {
    expect(formatCurrency(1234.56, "EUR")).toMatchInlineSnapshot(
      `"€1,234.56"`,
    );
  });
});
```

### Snapshot con `toHaveProperty` para objetos

```typescript
import { describe, it, expect } from "vitest";
import { buildApiResponse } from "./api";

describe("buildApiResponse", () => {
  it("matches snapshot for success response", () => {
    const response = buildApiResponse({ data: [1, 2, 3], status: 200 });
    expect(response).toMatchSnapshot({
      timestamp: expect.any(String),
    });
  });
});
```

## Variants

### Snapshot con `toMatchSnapshot` con property matchers

```typescript
it("matches snapshot ignoring dynamic date", () => {
  const result = generateReport({ userId: 42 });
  expect(result).toMatchSnapshot({
    generatedAt: expect.any(String),
    reportId: expect.any(String),
  });
});
```

### Usando `vi.fn()` mock snapshots

```typescript
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SubmitForm } from "./SubmitForm";

describe("SubmitForm", () => {
  it("calls onSubmit with form data", () => {
    const onSubmit = vi.fn();
    const { getByRole } = render(<SubmitForm onSubmit={onSubmit} />);

    fireEvent.click(getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "",
      password: "",
    });
    expect(onSubmit.mock.calls).toMatchSnapshot();
  });
});
```

## Best Practices

- Mantén los snapshots pequeños — snapshot de un solo componente, no un árbol de página entera
- Usa inline snapshots para outputs pequeños y estables — viven en el archivo de test y son revisables en PRs
- Revisa los diffs de snapshots en PRs — un test verde con un snapshot cambiado significa que alguien aprobó el cambio
- Usa `toMatchSnapshot` con property matchers para campos dinámicos (`expect.any(Date)`, `expect.any(String)`)
- Corre `vitest -u` para actualizar snapshots solo después de verificar que el cambio es intencional
- No hagas snapshot test de componentes con IDs random, timestamps o clases generadas

## Common Mistakes

- **Actualizar snapshots a ciegas**: correr `vitest -u` sin revisar el diff oculta regresiones reales.
- **Snapshottear demasiado**: un snapshot de 200 líneas es ilegible y falla en cualquier cambio menor de CSS. Divídelo en snapshots de componentes más pequeños.
- **No usar property matchers para datos dinámicos**: si tu output incluye un timestamp, el snapshot fallará en cada ejecución.
- **Guardar snapshots en un directorio diferente a los tests**: mantén los archivos `.snap` junto a los archivos de test para discoverability.
- **Usar snapshots como único test**: los snapshots verifican estructura, no comportamiento. Agrega tests de interacción con `@testing-library/react`.

## FAQ

### ¿Cómo actualizo snapshots después de un cambio intencional?

Corre `npx vitest -u` (o `--update`). Esto regenera todos los archivos `.snap`. Revisa el diff en git antes de commitear.

### ¿Cuál es la diferencia entre `toMatchSnapshot` y `toMatchInlineSnapshot`?

`toMatchSnapshot` escribe a un archivo `.snap` separado. `toMatchInlineSnapshot` escribe el snapshot directamente en el archivo de test como un string literal. Los inline snapshots son más revisables en PRs pero pueden inflar el archivo de test para outputs grandes.

### ¿Cómo ignoro valores dinámicos en snapshots?

Usa property matchers:

```typescript
expect(result).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(String),
});
```

Vitest comparará la estructura pero ignorará los valores reales de esos campos.

### ¿Debería commitear los archivos `.snap` a git?

Sí. Los archivos de snapshot deberían commitearse y revisarse en PRs. Sirven como contrato para el output esperado.

### ¿Puedo usar snapshot testing con React Server Components?

Snapshot testing funciona para componentes que renderizan a string. Para RSC, usa `renderToString` de `react-dom/server` y haz snapshot del output HTML. Los tests de client-side rendering usan `@testing-library/react` como siempre.
