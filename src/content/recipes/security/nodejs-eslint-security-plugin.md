---



contentType: recipes
slug: nodejs-eslint-security-plugin
title: "Enforce Security Rules in Node.js with"
description: "How to configure eslint-plugin-security to detect insecure patterns in Node.js code, handle false positives, and integrate with CI/CD pipelines."
metaDescription: "Detect insecure patterns in Node.js code with eslint-plugin-security. Configure rules, handle false positives, and integrate with CI/CD pipelines."
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
  metaDescription: "Detect insecure patterns in Node.js code with eslint-plugin-security. Configure rules, handle false positives, and integrate with CI/CD pipelines."
  keywords:
    - security
    - nodejs
    - eslint
    - static-analysis
    - code-quality
    - recipe



---

## Overview

`eslint-plugin-security` is an ESLint plugin that detects insecure patterns in Node.js code. It checks for things like hardcoded credentials, child_process execution with shell injection risks, regex denial-of-service (ReDoS), prototype pollution, and unsafe eval usage. While not exhaustive, it catches the most common security mistakes in Node.js applications.

## When to Use

- Node.js applications handling user input or external data
- Express/Fastify APIs that process requests
- CLI tools that execute shell commands
- Any Node.js codebase where security is a priority
- CI/CD pipelines to catch security issues before deployment

## When NOT to Use

- Browser-only code — use browser-specific security tools instead
- TypeScript projects — use `@typescript-eslint` with strict rules (covers some of the same ground)
- When you need runtime protection — this is static analysis only
- For dependency vulnerability scanning — use `npm audit` or `snyk`

## Solution

### Install

```bash
npm install --save-dev eslint eslint-plugin-security

# Using yarn
yarn add --dev eslint eslint-plugin-security

# Using pnpm
pnpm add --save-dev eslint eslint-plugin-security
```

### Basic configuration (flat config)

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  {
    plugins: {
      security,
    },
    rules: {
      'security/detect-object-injection': 'off',  // High false positive rate
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

### Legacy configuration (.eslintrc)

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

### Use recommended preset

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  security.configs.recommended,
  {
    // Override specific rules from the recommended preset
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-child-process': 'error',
    },
  },
];
```

### Common findings and fixes

#### detect-non-literal-regexp — ReDoS risk

```javascript
// BAD — user input in regex, ReDoS risk
const userInput = req.body.pattern;
const regex = new RegExp(userInput);
const match = regex.test(someString);

// GOOD — escape user input or use safe regex
const userInput = req.body.pattern;
const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(escaped);

// GOOD — use safe-regex to validate
const safeRegex = require('safe-regex');
if (safeRegex(userInput)) {
  const regex = new RegExp(userInput);
}
```

#### detect-child-process — Shell injection

```javascript
// BAD — shell injection risk
const { exec } = require('child_process');
exec(`ls ${req.body.directory}`, (err, stdout) => {
  console.log(stdout);
});

// GOOD — use execFile with argument array
const { execFile } = require('child_process');
execFile('ls', ['-la', req.body.directory], (err, stdout) => {
  console.log(stdout);
});

// GOOD — use spawn with args array
const { spawn } = require('child_process');
const child = spawn('ls', ['-la', req.body.directory]);
child.stdout.on('data', (data) => console.log(data.toString()));
```

#### detect-eval-with-expression — Code injection

```javascript
// BAD — eval with user input
const result = eval(req.body.expression);

// GOOD — use Function constructor with limited scope
const result = new Function('return ' + sanitizedExpression)();

// BEST — avoid eval entirely, use a parser or JSON
const result = JSON.parse(req.body.jsonData);
```

#### detect-new-buffer — Deprecated Buffer constructor

```javascript
// BAD — new Buffer() is deprecated and insecure
const buf = new Buffer(userInput);

// GOOD — use Buffer.from or Buffer.alloc
const buf = Buffer.from(userInput);
const buf2 = Buffer.alloc(1024);  // Safe, zero-filled
```

#### detect-pseudoRandomBytes — Weak randomness

```javascript
// BAD — pseudoRandomBytes for security-sensitive operations
const token = crypto.pseudoRandomBytes(32).toString('hex');

// GOOD — use randomBytes for cryptographic operations
const token = crypto.randomBytes(32).toString('hex');
```

#### detect-non-literal-fs-filename — Path traversal

```javascript
// BAD — user input as filename, path traversal risk
const fs = require('fs');
const content = fs.readFileSync(req.body.filename, 'utf8');

// GOOD — validate and sanitize path
const path = require('path');
const allowedDir = path.resolve('./data');
const requestedPath = path.resolve('./data', req.body.filename);
if (!requestedPath.startsWith(allowedDir)) {
  throw new Error('Path traversal detected');
}
const content = fs.readFileSync(requestedPath, 'utf8');
```

### Inline suppression

```javascript
// eslint-disable-next-line security/detect-child-process
const { exec } = require('child_process');

// eslint-disable-next-line security/detect-non-literal-regexp
const regex = new RegExp(userInput);
```

### CI/CD integration

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

### Package.json script

```json
{
  "scripts": {
    "lint:security": "eslint . --ext .js,.mjs --rule 'security/detect-eval-with-expression: error, security/detect-child-process: error, security/detect-unsafe-regex: error'",
    "lint:security:fix": "eslint . --ext .js,.mjs --fix"
  }
}
```

## Variants

### Combined with @typescript-eslint

```javascript
// eslint.config.js
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default [
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      // TypeScript covers some of these, disable duplicates
      'security/detect-object-injection': 'off',
      'security/detect-new-buffer': 'off',  // TS catches this
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'error',
    },
  },
];
```

### Custom rule configuration per environment

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  {
    plugins: { security },
  },
  {
    // Stricter rules for API/server code
    files: ['src/api/**/*.js', 'src/server/**/*.js'],
    rules: {
      'security/detect-child-process': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
    },
  },
  {
    // Relaxed rules for tests
    files: ['tests/**/*.js'],
    rules: {
      'security/detect-child-process': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-eval-with-expression': 'off',
    },
  },
];
```

### Using with Husky

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


- For a deeper guide, see [Detect Bugs in Java with SpotBugs Static Analysis](/recipes/java-spotbugs-static-analysis/).

- Start with the recommended preset — then customize based on your codebase
- Disable `detect-object-injection` — it has a very high false positive rate in most codebases
- Use `error` for high-risk rules — eval, child_process, unsafe regex
- Use `warn` for medium-risk rules — non-literal fs filenames
- Combine with `npm audit` — eslint-plugin-security checks code, npm audit checks dependencies
- Run in CI/CD — don't rely on developers running lint locally
- Review suppressed rules periodically — new patterns may emerge
- Combine with TypeScript — `@typescript-eslint` catches many issues that overlap

## Common Mistakes

- **Enabling all rules at `error`**: some rules like `detect-object-injection` produce too many false positives. Start with recommended and adjust.
- **Suppressing without comments**: `// eslint-disable-next-line` without explanation hides the reason. Always document why.
- **Only running locally**: developers may skip linting. Enforce in CI/CD.
- **Ignoring test files**: test code can have security issues too, though some rules should be relaxed.
- **Not combining with dependency scanning**: eslint-plugin-security only checks your code, not your dependencies. Use `npm audit` or `snyk` alongside it.

## FAQ

### What is eslint-plugin-security?

An ESLint plugin that detects insecure patterns in Node.js code — shell injection, eval, weak crypto, ReDoS, deprecated Buffer, and more.

### Should I enable detect-object-injection?

Usually no. It flags any bracket notation property access (`obj[key]`), which is extremely common in JavaScript. The false positive rate is very high for most codebases.

### Does eslint-plugin-security work with TypeScript?

Yes, but some rules overlap with `@typescript-eslint`. Use both, but disable duplicate rules to avoid noise.

### How is this different from npm audit?

`eslint-plugin-security` scans your source code for insecure patterns. `npm audit` scans your dependencies for known vulnerabilities. Use both for detailed coverage.

### Can I use this for browser code?

It's designed for Node.js. Some rules (like `detect-child-process`) are Node-specific. For browser code, use ESLint with appropriate browser rulesets.
