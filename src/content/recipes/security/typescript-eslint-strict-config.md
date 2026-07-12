---



contentType: recipes
slug: typescript-eslint-strict-config
title: "Strict TypeScript ESLint Configuration for Production"
description: "How to configure typescript-eslint with strict rules for production TypeScript projects, handle type-aware linting, and integrate with CI/CD."
metaDescription: "Configure strict typescript-eslint for production. Enable type-aware linting, handle common rules, custom overrides, and integrate with CI/CD pipelines."
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
  metaDescription: "Configure strict typescript-eslint for production. Enable type-aware linting, handle common rules, custom overrides, and integrate with CI/CD pipelines."
  keywords:
    - security
    - typescript
    - eslint
    - type-checking
    - code-quality
    - recipe



---

## Overview

`typescript-eslint` is the de facto linting tool for TypeScript projects. With strict configuration, it enforces type safety, catches unsafe `any` usage, prevents runtime `null`/`undefined` errors, and enforces consistent patterns. Type-aware rules use the TypeScript type checker to catch issues that syntax-only linters miss — unsafe assignments, unhandled promises, exhaustive switch checks.

## When to Use

- Production TypeScript projects (Node.js APIs, React apps, CLI tools)
- Codebases where type safety is a priority
- Teams that want to catch bugs at lint time, not runtime
- CI/CD pipelines to enforce code quality before merge
- Libraries published to npm — strict rules catch edge cases

## When NOT to Use

- Quick prototypes or scripts — the config overhead isn't worth it
- JavaScript projects — use ESLint without the TypeScript parser
- When build time is critical — type-aware linting is slower than syntax-only
- Legacy JS-to-TS migrations in progress — start with recommended, not strict

## Solution

### Install

```bash
npm install --save-dev eslint typescript-eslint @eslint/js typescript

# Using yarn
yarn add --dev eslint typescript-eslint @eslint/js typescript

# Using pnpm
pnpm add --save-dev eslint typescript-eslint @eslint/js typescript
```

### Flat config — strict with type-aware rules

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
    // Relax rules for test files
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    // Relax rules for config files
    files: ['*.config.ts', '*.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
```

### Strict without type-aware rules (faster)

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

### Common rules and their impact

#### no-explicit-any — Ban `any` type

```typescript
// BAD — eslint: no-explicit-any
function processData(data: any): any {
  return data.value;
}

// GOOD — use proper types
interface Data {
  value: string;
}
function processData(data: Data): string {
  return data.value;
}

// GOOD — use unknown for truly unknown data
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String(data.value);
  }
  throw new Error('Invalid data');
}
```

#### no-floating-promises — Catch unhandled promises

```typescript
// BAD — eslint: no-floating-promises
async function main() {
  fetchData();  // Promise not awaited or handled
  doSomethingElse();
}

// GOOD — await the promise
async function main() {
  await fetchData();
  doSomethingElse();
}

// GOOD — handle explicitly with .catch
function main() {
  fetchData().catch(console.error);
  doSomethingElse();
}
```

#### no-misused-promises — Prevent promise in boolean context

```typescript
// BAD — eslint: no-misused-promises
async function checkPermission(user: User): Promise<boolean> {
  return user.hasPermission('admin');
}

if (checkPermission(currentUser)) {  // Always truthy — it's a Promise
  // ...
}

// GOOD — await the promise
if (await checkPermission(currentUser)) {
  // ...
}
```

#### no-unnecessary-condition — Remove dead conditions

```typescript
// BAD — eslint: no-unnecessary-condition
function process(value: string) {
  if (value) {  // string is always truthy (unless empty, but TS doesn't narrow)
    return value.toUpperCase();
  }
  return value;
}

// GOOD — check for empty string explicitly
function process(value: string) {
  if (value.length > 0) {
    return value.toUpperCase();
  }
  return '';
}
```

#### switch-exhaustiveness-check — Ensure all cases handled

```typescript
// BAD — missing cases silently fall through
type Status = 'pending' | 'active' | 'inactive';

function getLabel(status: Status): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'active': return 'Active';
    // Missing 'inactive'
  }
}

// GOOD — exhaustive switch
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

#### consistent-type-imports — Enforce `import type`

```typescript
// BAD — mixing type and value imports
import { Component, Props } from './types';

// GOOD — separate type imports
import { Component } from './types';
import type { Props } from './types';

// GOOD — inline type imports
import { Component, type Props } from './types';
```

### Inline suppression

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyHandler(data: any): void {
  console.log(data);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const element = document.getElementById('app')!;
```

### CI/CD integration

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

### Package.json scripts

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

### Monorepo configuration

```javascript
// packages/shared/eslint.config.js
import rootConfig from '../../eslint.config.js';

export default tseslint.config(
  ...rootConfig,
  {
    rules: {
      // Stricter for shared library
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
      // API-specific rules
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
);
```

## Best Practices


- For a deeper guide, see [Enforce Security Rules in Node.js with](/recipes/nodejs-eslint-security-plugin/).

- Use `strictTypeChecked` for new projects — catches the most bugs
- Use `strict` (without type-aware) for faster CI — when build time matters
- Set `projectService: true` — automatically uses per-file tsconfig
- Always run `tsc --noEmit` alongside ESLint — ESLint checks patterns, tsc checks types
- Use `--max-warnings 0` in CI — treat warnings as errors in production
- Per-file overrides for tests — test code needs relaxed rules
- Use `import type` consistently — improves tree-shaking and build speed
- Combine with `eslint-plugin-security` — catches Node.js-specific security patterns

## Common Mistakes

- **Enabling type-aware rules without `projectService`**: type-aware rules need the TypeScript program. Without `projectService` or `project` config, they won't work.
- **Using `any` and suppressing with `// eslint-disable`**: `any` defeats the purpose of TypeScript. Use `unknown` and narrow, or define proper types.
- **Not running `tsc --noEmit`**: ESLint catches patterns, but `tsc` catches type errors. Run both.
- **Ignoring `no-floating-promises`**: unhandled promises cause silent failures. Always await or `.catch`.
- **Over-suppressing in tests**: test files need some relaxed rules, but `no-explicit-any` should still be on — use proper test fixtures.

## FAQ

### What is the difference between `strict` and `strictTypeChecked`?

`strict` includes all recommended rules plus additional strict rules that don't require type information. `strictTypeChecked` adds type-aware rules that use the TypeScript type checker — slower but catches more issues.

### Do I need both ESLint and `tsc`?

Yes. ESLint checks code patterns and style. `tsc --noEmit` checks type correctness. They catch different categories of issues. Run both in CI/CD.

### How do I speed up type-aware linting?

Use `projectService: true` (faster than `project` config). Cache the TypeScript program between runs. Only run type-aware rules on changed files in pre-commit.

### Can I use typescript-eslint with JavaScript files?

Yes, but type-aware rules won't work on `.js` files. Use `tseslint.configs.disableTypeChecked` for `.js` files in your config.

### What is `import type` and why does it matter?

`import type` imports only types, not values. This helps tree-shaking (type imports are erased at compile time) and prevents circular dependency issues with types.
