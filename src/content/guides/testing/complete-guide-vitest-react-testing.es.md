---
contentType: guides
slug: complete-guide-vitest-react-testing
title: "Guía Completa de Vitest para React: Component, Hook, e Integration Testing"
description: "Dominá Vitest para testing en React: component tests con Testing Library, hook tests con renderHook, integration tests, mocking, snapshot testing y ejecución paralela."
metaDescription: "Dominá Vitest para testing en React: component tests con Testing Library, hook tests con renderHook, integration tests, mocking, snapshot testing y ejecución paralela."
difficulty: intermediate
topics:
  - testing
  - frontend
tags:
  - guide
  - vitest
  - react
  - testing
  - component-testing
  - hooks
  - integration
  - mocking
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/testing/testing-strategy-guide
  - /guides/frontend/complete-guide-react-performance-optimization
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá Vitest para testing en React: component tests con Testing Library, hook tests con renderHook, integration tests, mocking, snapshot testing y ejecución paralela."
  keywords:
    - vitest react
    - vitest tutorial
    - react testing library
    - component testing react
    - hook testing vitest
    - vitest mocking
---

## Introducción

Vitest es un framework de testing rápido, nativo de Vite que se integra directamente con proyectos de React. Provee APIs compatibles con Jest, soporte nativo de ESM y hot module reloading instantáneo para tests. Combinado con React Testing Library, habilita testing a nivel de componente que se enfoca en el comportamiento del usuario en vez de detalles de implementación. Esta guía cubre component tests, hook tests, integration tests, estrategias de mocking y configuración de CI para proyectos de React usando Vitest.

## Setup

### Instalación

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Configuración

```typescript
// vitest.config.ts — Configuración de Vitest para React
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/main.tsx"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

### Setup file

```typescript
// tests/setup.ts — Global test setup
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Clean up DOM después de cada test
afterEach(() => {
  cleanup();
});

// Mock matchMedia (no disponible en jsdom)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
```

## Component Testing

### Component test básico

```typescript
// tests/components/Button.test.tsx — Basic component test
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("renders with correct text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick} disabled>Click me</Button>);

    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-primary");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-danger");
  });
});
```

### Testing forms

```typescript
// tests/components/LoginForm.test.tsx — Form testing
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("submits with valid credentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
  });
});
```

### Testing async components

```typescript
// tests/components/UserProfile.test.tsx — Async component testing
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UserProfile } from "@/components/UserProfile";

vi.mock("@/api/users", () => ({
  fetchUser: vi.fn(),
}));

import { fetchUser } from "@/api/users";

describe("UserProfile", () => {
  it("shows loading state then user data", async () => {
    vi.mocked(fetchUser).mockResolvedValue({
      id: 1,
      name: "Alice",
      email: "alice@example.com",
    });

    render(<UserProfile userId={1} />);

    // Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Data loaded
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });
  });

  it("shows error message on fetch failure", async () => {
    vi.mocked(fetchUser).mockRejectedValue(new Error("Network error"));

    render(<UserProfile userId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
```

## Hook Testing

### Testing custom hooks con renderHook

```typescript
// tests/hooks/useCounter.test.ts — Hook testing
import { describe, it, expect, act } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCounter } from "@/hooks/useCounter";

describe("useCounter", () => {
  it("initializes with default value", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("initializes with custom value", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it("increments count", () => {
    const { result } = renderHook(() => useCounter());

    act(() => result.current.increment());
    expect(result.current.count).toBe(1);

    act(() => result.current.increment());
    expect(result.current.count).toBe(2);
  });

  it("decrements count", () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => result.current.decrement());
    expect(result.current.count).toBe(4);
  });

  it("resets count", () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => result.current.increment());
    expect(result.current.count).toBe(11);

    act(() => result.current.reset());
    expect(result.current.count).toBe(10);
  });
});
```

### Testing hooks con dependencies

```typescript
// tests/hooks/useDebounce.test.ts — Debounce hook testing
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    rerender({ value: "world", delay: 500 });
    expect(result.current).toBe("hello"); // Still old value

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("world"); // Now updated
  });
});
```

## Mocking

### Mockeando modules

```typescript
// tests/mocks/api.test.ts — Module mocking
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "@/api/client";
import { UserService } from "@/services/UserService";

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches users", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: 1, name: "Alice" }],
    });

    const users = await UserService.getAll();
    expect(users).toHaveLength(1);
    expect(apiClient.get).toHaveBeenCalledWith("/users");
  });

  it("creates user", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 2, name: "Bob" },
    });

    const user = await UserService.create({ name: "Bob" });
    expect(user.id).toBe(2);
    expect(apiClient.post).toHaveBeenCalledWith("/users", { name: "Bob" });
  });
});
```

### Mockeando context providers

```typescript
// tests/components/ThemeAwareComponent.test.tsx — Context mocking
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeContext, Theme } from "@/contexts/ThemeContext";
import { ThemeAwareComponent } from "@/components/ThemeAwareComponent";

function renderWithTheme(ui: React.ReactNode, theme: Theme = "light") {
  return render(
    <ThemeContext.Provider value={{ theme, toggleTheme: vi.fn() }}>
      {ui}
    </ThemeContext.Provider>
  );
}

describe("ThemeAwareComponent", () => {
  it("renders light theme styles", () => {
    renderWithTheme(<ThemeAwareComponent />, "light");
    expect(screen.getByTestId("themed")).toHaveClass("light");
  });

  it("renders dark theme styles", () => {
    renderWithTheme(<ThemeAwareComponent />, "dark");
    expect(screen.getByTestId("themed")).toHaveClass("dark");
  });
});
```

### Partial mocking

```typescript
// tests/mocks/partial.test.ts — Partial module mocking
import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/format", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/format")>();
  return {
    ...actual,
    formatDate: vi.fn(() => "2026-01-01"),
  };
});

import { formatDate, formatCurrency } from "@/utils/format";

describe("partial mock", () => {
  it("uses mocked formatDate", () => {
    expect(formatDate(new Date())).toBe("2026-01-01");
  });

  it("uses real formatCurrency", () => {
    expect(formatCurrency(10.5)).toBe("$10.50");
  });
});
```

## Snapshot Testing

```typescript
// tests/components/Card.snapshot.test.tsx — Snapshot testing
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "@/components/Card";

describe("Card snapshots", () => {
  it("matches snapshot with content", () => {
    const { container } = render(
      <Card title="Test Title" description="Test Description" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot with image", () => {
    const { container } = render(
      <Card title="With Image" image="/test.jpg" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// Inline snapshots
it("matches inline snapshot", () => {
  const { container } = render(<Card title="Inline" />);
  expect(container.firstChild).toMatchInlineSnapshot(`
    <div class="card">
      <h3>Inline</h3>
    </div>
  `);
});
```

## Integration Testing

```typescript
// tests/integration/checkout.test.tsx — Integration test
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutFlow } from "@/pages/CheckoutFlow";

vi.mock("@/api/orders", () => ({
  createOrder: vi.fn(),
  calculateShipping: vi.fn(),
}));

import { createOrder, calculateShipping } from "@/api/orders";

describe("Checkout flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateShipping).mockResolvedValue({ cost: 5.99 });
    vi.mocked(createOrder).mockResolvedValue({ id: "order-123", status: "confirmed" });
  });

  it("completes full checkout flow", async () => {
    const user = userEvent.setup();
    render(<CheckoutFlow items={[{ id: 1, name: "Widget", price: 10, qty: 2 }]} />);

    // Step 1: Review cart
    expect(screen.getByText("Widget")).toBeInTheDocument();
    expect(screen.getByText("$20.00")).toBeInTheDocument();

    // Step 2: Enter shipping
    await user.click(screen.getByRole("button", { name: /continue to shipping/i }));
    await user.type(screen.getByLabelText(/address/i), "123 Main St");
    await user.type(screen.getByLabelText(/city/i), "New York");
    await user.type(screen.getByLabelText(/zip/i), "10001");

    // Wait for shipping calculation
    await waitFor(() => {
      expect(screen.getByText("$5.99")).toBeInTheDocument();
    });

    // Step 3: Place order
    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
      expect(screen.getByText("order-123")).toBeInTheDocument();
    });

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: 1, qty: 2 }),
        ]),
        shipping: expect.objectContaining({
          address: "123 Main St",
          city: "New York",
          zip: "10001",
        }),
      })
    );
  });
});
```

## Configuración de CI

### GitHub Actions

```yaml
# .github/workflows/test.yml — Vitest en CI
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/coverage-final.json
```

### Package.json scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

## Best Practices

- Testeá comportamiento, no implementación — query by role, text, o test-id, no por CSS class
- Usá `userEvent` sobre `fireEvent` — simula interacciones reales de user más accurate
- Mockeá en el boundary del module — mockeá API clients, no internal functions
- Usá `screen` queries — evita guardar `getByText` references que break on re-render
- Testeá accessibility — usá `getByRole` para verificar que elementos son accessible
- Cleanupeá después de cada test — `cleanup()` en setup previene DOM leakage
- Usá `waitFor` para async assertions — evita flaky timing issues
- Nombrá test files `*.test.tsx` — convención para easy discovery
- Mantené tests independientes — no shared state entre tests
- Corré con `--coverage` en CI — capturá coverage regressions

## Common Mistakes

- **Testear implementation details**: testear state values en vez de rendered output. Cuando refactorizás, los tests break aunque el behavior no cambió.
- **Usar `fireEvent` en vez de `userEvent`**: `fireEvent` dispatcha raw DOM events; `userEvent` simula real user behavior (focus, typing, clicking).
- **No await async operations**: tests pasan cuando no deberían porque las assertions corren antes de que async updates complete. Usá `waitFor`.
- **Over-mocking**: mockear todo hace que los tests testeen los mocks, no el code. Mockeá solo en boundaries.
- **Snapshot testing everything**: snapshots capturan cambios pero no verifican correctness. Usá sparingly para visual components.

## FAQ

### ¿Qué es Vitest?

Un framework de testing nativo de Vite con APIs compatibles con Jest. Corre tests en el mismo transform pipeline que tu app, proveyendo ejecución rápida y soporte nativo de ESM.

### ¿Cómo se diferencia Vitest de Jest?

Vitest usa el transform pipeline de Vite, así que no hay config separada para TypeScript, JSX, o ESM. Es más rápido para proyectos de Vite y soporta HMR para tests. Jest requiere más configuración y corre en Node con transform plugins.

### ¿Debería testear componentes de React con implementation details?

No. Testeá lo que el user ve y hace. Usá `getByRole`, `getByText`, y `userEvent` para interactuar con componentes como lo haría un user. Esto hace los tests resilientes a refactoring.

### ¿Cómo mockeo API calls en Vitest?

Usá `vi.mock("@/api/client", () => ({ ... }))` para mockear modules enteros. Para partial mocking, usá `importOriginal` para spread real exports y overridear functions específicas.

### ¿Cómo testeo custom hooks?

Usá `renderHook` de `@testing-library/react`. Renderiza el hook en un test component y te da acceso al return value del hook via `result.current`.
