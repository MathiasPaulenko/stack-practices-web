---
contentType: recipes
slug: javascript-vitest-snapshot-testing
title: "Vitest Snapshot Testing para React"
description: "Cómo usar Vitest snapshot testing para detectar cambios no intencionados en la UI de componentes React, incluyendo inline snapshots y flujos de actualización."
metaDescription: "Usa Vitest snapshot testing para detectar cambios no intencionados en React UI, con inline snapshots, flujos de actualización e integración con CI."
difficulty: intermediate
topics:
  - testing
  - frontend
tags:
  - testing
  - vitest
  - javascript
  - react
  - snapshot
  - frontend
relatedResources:
  - /recipes/jest-snapshot-testing
  - /recipes/nodejs-supertest-express-api
  - /recipes/react-usememo-usecallback-performance
  - /guides/complete-guide-vitest-react-testing
  - /recipes/javascript-msw-mock-service-worker
  - /recipes/generate-test-data
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Usa Vitest snapshot testing para detectar cambios no intencionados en React UI, con inline snapshots, flujos de actualización e integración con CI."
  keywords:
    - testing
    - vitest
    - javascript
    - react
    - snapshot
    - frontend
    - receta
---

## Resumen

El snapshot testing captura la salida renderizada de un componente en un momento dado. En
ejecuciones posteriores, Vitest compara la salida actual contra el snapshot almacenado y
falla si difieren — alertándote sobre cambios no intencionados en la UI. Vitest es un
corredor de tests compatible con Jest para proyectos Vite, con soporte nativo de
snapshots.

## Cuándo Usar

- Para detectar regresiones accidentales de CSS o markup en componentes presentacionales.
- Para verificar que un componente renderice la misma estructura luego de un refactor.
- Para testear componentes con salida estable y determinística (sin IDs aleatorios ni
  timestamps).
- Para documentar la salida esperada de funciones utilitarias que retornan objetos
  complejos.

## Cuándo NO Usar

- Componentes con contenido dinámico (fechas, valores aleatorios, UUIDs) — los snapshots
  fallarán siempre.
- Para testear lógica de negocio — usá unit tests con aserciones explícitas.
- Componentes que cambian frecuentemente durante desarrollo activo — el churn de snapshots
  genera ruido.
- Para testear accesibilidad o interacción — los snapshots solo chequean HTML renderizado,
  no comportamiento.

## Solución

### Configuración

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

### Test de snapshot básico

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

### Snapshot con property matchers

```typescript
import { describe, it, expect } from "vitest";
import { buildApiResponse } from "./api";

describe("buildApiResponse", () => {
  it("matches snapshot ignoring dynamic date", () => {
    const response = buildApiResponse({ data: [1, 2, 3], status: 200 });
    expect(response).toMatchSnapshot({
      timestamp: expect.any(String),
      reportId: expect.any(String),
    });
  });
});
```

### Snapshot de salida de función

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

### Snapshot de componente async

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
  it("matches snapshot after data loads", async () => {
    render(<UserProfile userId={42} />);
    await screen.findByRole("heading", { name: /alice/i });
    expect(document.body).toMatchSnapshot();
  });
});
```

## Explicación

`toMatchSnapshot()` serializa el valor la primera vez que se ejecuta y lo escribe en un
archivo `.snap`. En ejecuciones posteriores, Vitest compara el valor serializado con la
copia almacenada. Usá `toMatchInlineSnapshot()` para mantener el valor esperado en el
archivo de test, lo que facilita las revisiones. Los property matchers permiten ignorar
campos dinámicos chequeando el tipo en lugar del valor exacto.

## Variantes

### Snapshot con mock calls

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

### Snapshot de RSC

Para React Server Components, renderizá la salida a string antes de hacer snapshot:

```typescript
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { StaticPage } from "./StaticPage";

describe("StaticPage", () => {
  it("matches server snapshot", () => {
    const html = renderToString(<StaticPage />);
    expect(html).toMatchSnapshot();
  });
});
```

## Buenas Prácticas

- Mantené los snapshots pequeños — hacé snapshot de un componente, no de todo el árbol de
  una página.
- Usá inline snapshots para salidas pequeñas y estables, así son revisables en PRs.
- Revisá los diffs de snapshots en PRs — un test verde con un snapshot modificado significa
  que alguien aprobó el cambio.
- Usá property matchers para campos dinámicos como `expect.any(String)` o `expect.any(Date)`.
- Ejecutá `vitest -u` para actualizar snapshots solo después de verificar que el cambio es
  intencional.
- No hagas snapshot de componentes con IDs aleatorios, timestamps o clases generadas.

## Errores Comunes

- **Actualizar snapshots a ciegas** — ejecutar `vitest -u` sin revisar el diff oculta
  regresiones reales.
- **Hacer snapshot de todo** — un snapshot de 200 líneas es ilegible y falla ante cualquier
  cambio menor de CSS. Dividilo en snapshots de componentes más pequeños.
- **No usar property matchers para datos dinámicos** — si la salida incluye un timestamp,
  el snapshot fallará en cada ejecución.
- **Guardar snapshots lejos de los tests** — mantené los archivos `.snap` junto a los tests
  para facilitar su descubrimiento.
- **Usar snapshots como único test** — los snapshots verifican estructura, no comportamiento.
  Agregá tests de interacción con `@testing-library/react`.

## Preguntas Frecuentes

### ¿Cómo actualizo los snapshots después de un cambio intencional?

Ejecutá `npx vitest -u` (o `--update`). Esto regenera todos los archivos `.snap`. Revisá el
diff en Git antes de commitear.

### ¿Qué diferencia hay entre `toMatchSnapshot` y `toMatchInlineSnapshot`?

`toMatchSnapshot` escribe en un archivo `.snap` separado. `toMatchInlineSnapshot` escribe el
snapshot directamente en el archivo de test como un string literal. Los inline snapshots son
más revisables en PRs, pero pueden hinchar el archivo de test para salidas grandes.

### ¿Cómo ignoro valores dinámicos en los snapshots?

Usá property matchers:

```typescript
expect(result).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(String),
});
```

Vitest va a matchear la estructura pero ignorar los valores reales de esos campos.

### ¿Debería commitear archivos `.snap` en Git?

Sí. Los archivos de snapshot deben commitearse y revisarse en PRs. Sirven como contrato de
la salida esperada.

### ¿Puedo usar snapshot testing con React Server Components?

Sí. Usá `renderToString` de `react-dom/server` y hacé snapshot de la salida HTML. Los tests
de renderizado del lado del cliente usan `@testing-library/react` como siempre.

### ¿Cómo evito el drift de snapshots en suites grandes?

Usá `toMatchInlineSnapshot` para salidas pequeñas así el valor esperado se ve en la
revisión de código. Para archivos `.snap`, habilitá `--ci` en CI para fallar ante snapshots
desactualizados en lugar de escribir nuevos silenciosamente. Ejecutá `vitest -u` solo de
forma local después de verificar que el cambio es intencional.
