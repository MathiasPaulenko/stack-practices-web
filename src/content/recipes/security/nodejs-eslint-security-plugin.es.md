---



contentType: recipes
slug: nodejs-eslint-security-plugin
title: "Enforzar Reglas de Seguridad en Node.js con"
description: "Cómo configurar eslint-plugin-security para detectar patrones inseguros en código Node.js, manejar false positives e integrar con pipelines CI/CD."
metaDescription: "Detecta patrones inseguros en código Node.js con eslint-plugin-security. Configura reglas, maneja false positives e integra con pipelines CI/CD."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - nodejs
  - eslint
  - static-analysis
  - code-quality
  - recipe
relatedResources:
  - /recipes/python-bandit-static-analysis
  - /recipes/typescript-eslint-strict-config
  - /recipes/github-actions-reusable-workflows
  - /recipes/java-spotbugs-static-analysis
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detecta patrones inseguros en código Node.js con eslint-plugin-security. Configura reglas, maneja false positives e integra con pipelines CI/CD."
  keywords:
    - security
    - nodejs
    - eslint
    - static-analysis
    - code-quality
    - recipe



---

## Overview

`eslint-plugin-security` es un plugin de ESLint que detecta patrones inseguros en código Node.js. Chequea cosas como credentials hardcodeadas, ejecución de child_process con riesgos de shell injection, regex denial-of-service (ReDoS), prototype pollution, y uso inseguro de eval. Aunque no es exhaustivo, atrapa los mistakes de seguridad más comunes en aplicaciones Node.js.

## When to Use

- Aplicaciones Node.js que manejan user input o data externa
- APIs Express/Fastify que procesan requests
- CLI tools que ejecutan shell commands
- Cualquier codebase Node.js donde la seguridad es prioridad
- Pipelines CI/CD para atrapar issues de seguridad antes del deployment

## When NOT to Use

- Código solo de browser — usá herramientas de seguridad browser-specific en su lugar
- Proyectos TypeScript — usá `@typescript-eslint` con reglas strict (cubre parte del mismo ground)
- Cuando necesitás protección en runtime — esto es static analysis únicamente
- Para scanning de vulnerabilidades de dependencias — usá `npm audit` o `snyk`

## Solution

### Instalar

```bash
npm install --save-dev eslint eslint-plugin-security

# Usando yarn
yarn add --dev eslint eslint-plugin-security

# Usando pnpm
pnpm add --save-dev eslint eslint-plugin-security
```

### Configuración básica (flat config)

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  {
    plugins: {
      security,
    },
    rules: {
      'security/detect-object-injection': 'off',  // Alta tasa de false positives
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-buffer-noassert': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-callsites': 'off',
    },
  },
];
```

### Configuración legacy (.eslintrc)

```json
// .eslintrc.json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-child-process": "warn",
    "security/detect-buffer-noassert": "error",
    "security/detect-pseudoRandomBytes": "error",
    "security/detect-new-buffer": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-object-injection": "off"
  }
}
```

### Usar preset recommended

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  security.configs.recommended,
  {
    // Overridear reglas específicas del preset recommended
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-child-process': 'error',
    },
  },
];
```

### Findings comunes y fixes

#### detect-non-literal-regexp — Riesgo de ReDoS

```javascript
// BAD — user input en regex, riesgo de ReDoS
const userInput = req.body.pattern;
const regex = new RegExp(userInput);
const match = regex.test(someString);

// GOOD — escapar user input o usar safe regex
const userInput = req.body.pattern;
const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(escaped);

// GOOD — usar safe-regex para validar
const safeRegex = require('safe-regex');
if (safeRegex(userInput)) {
  const regex = new RegExp(userInput);
}
```

#### detect-child-process — Shell injection

```javascript
// BAD — riesgo de shell injection
const { exec } = require('child_process');
exec(`ls ${req.body.directory}`, (err, stdout) => {
  console.log(stdout);
});

// GOOD — usar execFile con array de argumentos
const { execFile } = require('child_process');
execFile('ls', ['-la', req.body.directory], (err, stdout) => {
  console.log(stdout);
});

// GOOD — usar spawn con array de args
const { spawn } = require('child_process');
const child = spawn('ls', ['-la', req.body.directory]);
child.stdout.on('data', (data) => console.log(data.toString()));
```

#### detect-eval-with-expression — Code injection

```javascript
// BAD — eval con user input
const result = eval(req.body.expression);

// GOOD — usar Function constructor con scope limitado
const result = new Function('return ' + sanitizedExpression)();

// BEST — evitar eval enteramente, usar parser o JSON
const result = JSON.parse(req.body.jsonData);
```

#### detect-new-buffer — Constructor de Buffer deprecado

```javascript
// BAD — new Buffer() está deprecado e inseguro
const buf = new Buffer(userInput);

// GOOD — usar Buffer.from o Buffer.alloc
const buf = Buffer.from(userInput);
const buf2 = Buffer.alloc(1024);  // Safe, zero-filled
```

#### detect-pseudoRandomBytes — Weak randomness

```javascript
// BAD — pseudoRandomBytes para operaciones security-sensitive
const token = crypto.pseudoRandomBytes(32).toString('hex');

// GOOD — usar randomBytes para operaciones criptográficas
const token = crypto.randomBytes(32).toString('hex');
```

#### detect-non-literal-fs-filename — Path traversal

```javascript
// BAD — user input como filename, riesgo de path traversal
const fs = require('fs');
const content = fs.readFileSync(req.body.filename, 'utf8');

// GOOD — validar y sanitizar path
const path = require('path');
const allowedDir = path.resolve('./data');
const requestedPath = path.resolve('./data', req.body.filename);
if (!requestedPath.startsWith(allowedDir)) {
  throw new Error('Path traversal detected');
}
const content = fs.readFileSync(requestedPath, 'utf8');
```

### Supresión inline

```javascript
// eslint-disable-next-line security/detect-child-process
const { exec } = require('child_process');

// eslint-disable-next-line security/detect-non-literal-regexp
const regex = new RegExp(userInput);
```

### Integración con CI/CD

```yaml
# .github/workflows/eslint-security.yml
name: ESLint Security

on: [push, pull_request]

jobs:
  eslint-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Run ESLint with security plugin
        run: npx eslint . --ext .js,.mjs --format json --output-file eslint-report.json || true

      - name: Check for security issues
        run: |
          SECURITY_ISSUES=$(node -e "
          const report = require('./eslint-report.json');
          const securityRules = report.filter(f =>
            f.messages.some(m => m.ruleId && m.ruleId.startsWith('security/'))
          );
          if (securityRules.length > 0) {
            console.error('Found ' + securityRules.length + ' files with security issues');
            process.exit(1);
          }
          ")
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: eslint-security
        name: ESLint Security
        entry: npx eslint --ext .js,.mjs --rule '{"security/detect-eval-with-expression": "error", "security/detect-child-process": "error"}'
        language: system
        files: \.js$
```

### Script en package.json

```json
{
  "scripts": {
    "lint:security": "eslint . --ext .js,.mjs --rule 'security/detect-eval-with-expression: error, security/detect-child-process: error, security/detect-unsafe-regex: error'",
    "lint:security:fix": "eslint . --ext .js,.mjs --fix"
  }
}
```

## Variants

### Combinado con @typescript-eslint

```javascript
// eslint.config.js
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default [
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      // TypeScript cubre algunos, deshabilitar duplicados
      'security/detect-object-injection': 'off',
      'security/detect-new-buffer': 'off',  // TS lo atrapa
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'error',
    },
  },
];
```

### Configuración de reglas custom por entorno

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  {
    plugins: { security },
  },
  {
    // Reglas más estrictas para código API/server
    files: ['src/api/**/*.js', 'src/server/**/*.js'],
    rules: {
      'security/detect-child-process': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
    },
  },
  {
    // Reglas relajadas para tests
    files: ['tests/**/*.js'],
    rules: {
      'security/detect-child-process': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-eval-with-expression': 'off',
    },
  },
];
```

### Usar con Husky

```json
{
  "scripts": {
    "lint:security": "eslint . --ext .js,.mjs --rule 'security/detect-eval-with-expression: error'"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint:security"
    }
  }
}
```

## Best Practices


- For a deeper guide, see [Detect Bugs in Java with SpotBugs Static Analysis](/es/recipes/java-spotbugs-static-analysis/).

- Empezá con el preset recommended — después customizá basado en tu codebase
- Deshabilitá `detect-object-injection` — tiene una tasa de false positives muy alta en la mayoría de codebases
- Usá `error` para reglas de high-risk — eval, child_process, unsafe regex
- Usá `warn` para reglas de medium-risk — non-literal fs filenames
- Combiná con `npm audit` — eslint-plugin-security chequea código, npm audit chequea dependencias
- Corré en CI/CD — no dependas de que los devs corran lint localmente
- Revisá las reglas suprimidas periódicamente — nuevos patterns pueden emerger
- Combiná con TypeScript — `@typescript-eslint` atrapa muchos issues que se superponen

## Common Mistakes

- **Habilitar todas las reglas como `error`**: algunas reglas como `detect-object-injection` producen demasiados false positives. Empezá con recommended y ajustá.
- **Suprimir sin comentarios**: `// eslint-disable-next-line` sin explicación esconde la razón. Siempre documentá por qué.
- **Solo correr localmente**: los devs pueden skipear linting. Enforzá en CI/CD.
- **Ignorar archivos de test**: el código de test puede tener issues de seguridad también, aunque algunas reglas deberían relajarse.
- **No combinar con dependency scanning**: eslint-plugin-security solo chequea tu código, no tus dependencias. Usá `npm audit` o `snyk` junto con él.

## FAQ

### ¿Qué es eslint-plugin-security?

Un plugin de ESLint que detecta patrones inseguros en código Node.js — shell injection, eval, crypto débil, ReDoS, Buffer deprecado, y más.

### ¿Debería habilitar detect-object-injection?

Generalmente no. Flagea cualquier acceso a propiedad con bracket notation (`obj[key]`), que es extremadamente común en JavaScript. La tasa de false positives es muy alta para la mayoría de codebases.

### ¿eslint-plugin-security funciona con TypeScript?

Sí, pero algunas reglas se superponen con `@typescript-eslint`. Usá ambos, pero deshabilitá las reglas duplicadas para evitar ruido.

### ¿En qué se diferencia de npm audit?

`eslint-plugin-security` escanea tu source code en busca de patrones inseguros. `npm audit` escanea tus dependencias en busca de vulnerabilidades conocidas. Usá ambos para coverage comprehensiva.

### ¿Puedo usar esto para código de browser?

Está diseñado para Node.js. Algunas reglas (como `detect-child-process`) son Node-specific. Para código de browser, usá ESLint con rulesets apropiados para browser.
