---



contentType: recipes
slug: typescript-eslint-strict-config
title: "Configuración Estricta de TypeScript ESLint para Producción"
description: "Cómo configurar typescript-eslint con reglas estrictas para proyectos TypeScript de producción, manejar type-aware linting e integrar con CI/CD."
metaDescription: "Configura typescript-eslint estricto para producción. Habilita type-aware linting, maneja reglas comunes, overrides custom e integra con pipelines CI/CD."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - typescript
  - eslint
  - type-checking
  - code-quality
  - recipe
relatedResources:
  - /recipes/nodejs-eslint-security-plugin
  - /recipes/python-mypy-strict-type-checking
  - /recipes/github-actions-reusable-workflows
  - /recipes/java-spotbugs-static-analysis
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura typescript-eslint estricto para producción. Habilita type-aware linting, maneja reglas comunes, overrides custom e integra con pipelines CI/CD."
  keywords:
    - security
    - typescript
    - eslint
    - type-checking
    - code-quality
    - recipe



---

## Overview

`typescript-eslint` es la herramienta de linting de facto para proyectos TypeScript. Con configuración estricta, enforza type safety, atrapa uso inseguro de `any`, previene errores de runtime `null`/`undefined`, y enforza patterns consistentes. Las reglas type-aware usan el TypeScript type checker para atrapar issues que los linters solo de syntax se pierden — assignments inseguros, promises no manejadas, exhaustive switch checks.

## When to Use

- Proyectos TypeScript de producción (Node.js APIs, React apps, CLI tools)
- Codebases donde type safety es prioridad
- Equipos que quieren atrapar bugs en lint time, no en runtime
- Pipelines CI/CD para enforzar code quality antes del merge
- Librerías publicadas a npm — las reglas strict atrapan edge cases

## When NOT to Use

- Prototipos rápidos o scripts — el overhead de config no vale la pena
- Proyectos JavaScript — usá ESLint sin el TypeScript parser
- Cuando el build time es crítico — type-aware linting es más lento que syntax-only
- Migraciones JS-to-TS en progreso — empezá con recommended, no strict

## Solution

### Instalar

```bash
npm install --save-dev eslint typescript-eslint @eslint/js typescript

# Usando yarn
yarn add --dev eslint typescript-eslint @eslint/js typescript

# Usando pnpm
pnpm add --save-dev eslint typescript-eslint @eslint/js typescript
```

### Flat config — strict con type-aware rules

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Type safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // Null safety
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Code quality
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': 'error',

      // Consistency
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    // Relajar reglas para archivos de test
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    // Relajar reglas para config files
    files: ['*.config.ts', '*.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
```

### Strict sin type-aware rules (más rápido)

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
);
```

### Reglas comunes y su impacto

#### no-explicit-any — Banear el tipo `any`

```typescript
// BAD — eslint: no-explicit-any
function processData(data: any): any {
  return data.value;
}

// GOOD — usar types apropiados
interface Data {
  value: string;
}
function processData(data: Data): string {
  return data.value;
}

// GOOD — usar unknown para data realmente desconocida
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String(data.value);
  }
  throw new Error('Invalid data');
}
```

#### no-floating-promises — Atrapar promises no manejadas

```typescript
// BAD — eslint: no-floating-promises
async function main() {
  fetchData();  // Promise no awaited ni manejado
  doSomethingElse();
}

// GOOD — await el promise
async function main() {
  await fetchData();
  doSomethingElse();
}

// GOOD — manejar explícitamente con .catch
function main() {
  fetchData().catch(console.error);
  doSomethingElse();
}
```

#### no-misused-promises — Prevenir promise en boolean context

```typescript
// BAD — eslint: no-misused-promises
async function checkPermission(user: User): Promise<boolean> {
  return user.hasPermission('admin');
}

if (checkPermission(currentUser)) {  // Siempre truthy — es un Promise
  // ...
}

// GOOD — await el promise
if (await checkPermission(currentUser)) {
  // ...
}
```

#### no-unnecessary-condition — Remover condiciones muertas

```typescript
// BAD — eslint: no-unnecessary-condition
function process(value: string) {
  if (value) {  // string siempre truthy (salvo vacío, pero TS no narrow)
    return value.toUpperCase();
  }
  return value;
}

// GOOD — chequear empty string explícitamente
function process(value: string) {
  if (value.length > 0) {
    return value.toUpperCase();
  }
  return '';
}
```

#### switch-exhaustiveness-check — Asegurar todos los cases manejados

```typescript
// BAD — cases faltantes fallan silenciosamente
type Status = 'pending' | 'active' | 'inactive';

function getLabel(status: Status): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'active': return 'Active';
    // Falta 'inactive'
  }
}

// GOOD — switch exhaustivo
function getLabel(status: Status): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${_exhaustive}`);
    }
  }
}
```

#### consistent-type-imports — Enforzar `import type`

```typescript
// BAD — mezclar type y value imports
import { Component, Props } from './types';

// GOOD — separar type imports
import { Component } from './types';
import type { Props } from './types';

// GOOD — inline type imports
import { Component, type Props } from './types';
```

### Supresión inline

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyHandler(data: any): void {
  console.log(data);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const element = document.getElementById('app')!;
```

### Integración con CI/CD

```yaml
# .github/workflows/lint.yml
name: ESLint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Run ESLint
        run: npx eslint . --max-warnings 0
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: eslint
        name: ESLint
        entry: npx eslint --fix
        language: system
        files: \.(ts|tsx|js|jsx)$
        pass_filenames: true
```

### Scripts en package.json

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "lint:types": "tsc --noEmit",
    "lint:all": "npm run lint && npm run lint:types"
  }
}
```

## Variants

### React + TypeScript strict config

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: { attributes: false },
      }],
    },
  },
);
```

### Node.js + TypeScript strict config

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-process-exit': 'error',
    },
  },
);
```

### Configuración monorepo

```javascript
// packages/shared/eslint.config.js
import rootConfig from '../../eslint.config.js';

export default tseslint.config(
  ...rootConfig,
  {
    rules: {
      // Más estricto para librería shared
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);

// packages/api/eslint.config.js
import rootConfig from '../../eslint.config.js';

export default tseslint.config(
  ...rootConfig,
  {
    rules: {
      // Reglas API-specific
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
);
```

## Best Practices


- For a deeper guide, see [Enforce Security Rules in Node.js with](/es/recipes/nodejs-eslint-security-plugin/).

- Usá `strictTypeChecked` para proyectos nuevos — atrapa la mayoría de los bugs
- Usá `strict` (sin type-aware) para CI más rápido — cuando el build time importa
- Seteá `projectService: true` — usa automáticamente el tsconfig por archivo
- Siempre corré `tsc --noEmit` junto con ESLint — ESLint chequea patterns, tsc chequea types
- Usá `--max-warnings 0` en CI — tratá los warnings como errors en producción
- Overrides por archivo para tests — el código de test necesita reglas relajadas
- Usá `import type` consistentemente — mejora tree-shaking y build speed
- Combiná con `eslint-plugin-security` — atrapa patterns de seguridad Node.js-specific

## Common Mistakes

- **Habilitar type-aware rules sin `projectService`**: las reglas type-aware necesitan el TypeScript program. Sin `projectService` o `project` config, no funcionan.
- **Usar `any` y suprimir con `// eslint-disable`**: `any` derrota el propósito de TypeScript. Usá `unknown` y narrow, o definí types apropiados.
- **No correr `tsc --noEmit`**: ESLint chequea patterns, pero `tsc` chequea type errors. Corré ambos.
- **Ignorar `no-floating-promises`**: las promises no manejadas causan silent failures. Siempre await o `.catch`.
- **Sobre-suprimir en tests**: los archivos de test necesitan algunas reglas relajadas, pero `no-explicit-any` debería seguir on — usá test fixtures apropiados.

## FAQ

### ¿Cuál es la diferencia entre `strict` y `strictTypeChecked`?

`strict` incluye todas las reglas recommended más reglas strict adicionales que no requieren type information. `strictTypeChecked` agrega reglas type-aware que usan el TypeScript type checker — más lento pero atrapa más issues.

### ¿Necesito tanto ESLint como `tsc`?

Sí. ESLint chequea code patterns y style. `tsc --noEmit` chequea type correctness. Atrapan categorías diferentes de issues. Corré ambos en CI/CD.

### ¿Cómo acelero type-aware linting?

Usá `projectService: true` (más rápido que `project` config). Cacheá el TypeScript program entre runs. Solo corré type-aware rules en archivos cambiados en pre-commit.

### ¿Puedo usar typescript-eslint con archivos JavaScript?

Sí, pero las reglas type-aware no funcionan en archivos `.js`. Usá `tseslint.configs.disableTypeChecked` para archivos `.js` en tu config.

### ¿Qué es `import type` y por qué importa?

`import type` importa solo types, no values. Esto ayuda al tree-shaking (los type imports se borran en compile time) y previene issues de circular dependency con types.
