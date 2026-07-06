---
contentType: recipes
slug: pre-commit-hooks
title: "Configurar pre-commit hooks"
description: "Cómo configurar pre-commit hooks con husky, lint-staged y pre-commit para forzar calidad de código antes de commits"
metaDescription: "Configura pre-commit hooks con husky, lint-staged y pre-commit. Enforce linting, formatting y tests antes de cada commit con ejemplos."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - ci-cd
  - automation
  - deployment
  - infrastructure
relatedResources:
  - /docs/bug-report-template
  - /docs/changelog-template
  - /docs/code-of-conduct-template
  - /docs/contributing-guide
  - /docs/disaster-recovery-plan-template
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura pre-commit hooks con husky, lint-staged y pre-commit. Enforce linting, formatting y tests antes de cada commit con ejemplos."
  keywords:
    - pre-commit
    - husky
    - lint-staged
    - git-hooks
    - calidad-codigo
    - linting
---

## Visión General

Los pre-commit hooks ejecutan verificaciones automáticamente sobre tu código antes de cada commit. Detectan errores de linting, problemas de formato, tests fallidos y vulnerabilidades de seguridad en el momento más temprano posible—antes de que lleguen a CI o producción. A continuacion se cubre configurar hooks con el framework `pre-commit` (Python), `husky` + `lint-staged` (JavaScript) y hooks Git nativos para proyectos Java.

## Cuándo Usar

Usa este recurso cuando:
- Tu equipo comete repetidamente código que falla checks de lint o formato en CI. Consulta [GitHub Actions](/recipes/devops/github-actions) para configuración de pipeline CI.
- Quieres enforcear estilo de código sin depender únicamente de revisiones de PR. Consulta [Unit Testing](/recipes/testing/unit-testing) para calidad automatizada.
- Necesitas ejecutar escaneo de secretos o vulnerabilidades en cada commit. Consulta [Container Security Scanning](/recipes/devops/container-security-scanning) para escaneo de seguridad.
- Quieres feedback rápido: arregla problemas localmente en lugar de esperar a que CI falle. Consulta [Bash Scripting Automation](/recipes/devops/bash-scripting-automation) para scripts de automatización local.

## Solución

### Python

```python
# Instalar framework pre-commit
# pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/PyCQA/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--max-line-length=100']

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy

# Instalar hooks en .git/hooks/
# pre-commit install

# Ejecutar manualmente en todos los archivos
# pre-commit run --all-files
```

### JavaScript

```javascript
// package.json scripts + husky + lint-staged
// npm install --save-dev husky lint-staged prettier eslint

// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  },
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}

// .husky/pre-commit (generado por npx husky add .husky/pre-commit)
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
npx lint-staged

// O con la sintaxis más nueva de husky v9+:
// echo "npx lint-staged" > .husky/pre-commit

// .lintstagedrc.js
module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yaml}': ['prettier --write'],
};
```

### Java

```java
// Los proyectos Java típicamente usan hooks de Maven o Gradle, no husky.
// Opción 1: Maven git hook plugin (com.rudikershaw.gitbuildhook)
// pom.xml:
/*
<plugin>
    <groupId>com.rudikershaw.gitbuildhook</groupId>
    <artifactId>git-build-hook-maven-plugin</artifactId>
    <version>3.5.0</version>
    <configuration>
        <installHooks>${project.basedir}/git-hooks</installHooks>
    </configuration>
</plugin>
*/

// Opción 2: Gradle + Spotless + hook Git personalizado
// build.gradle:
plugins {
    id 'com.diffplug.spotless' version '6.23.0'
}
spotless {
    java {
        googleJavaFormat()
    }
}

// git-hooks/pre-commit (chmod +x)
#!/bin/sh
./gradlew spotlessCheck
if [ $? -ne 0 ]; then
    echo "Spotless check failed. Run './gradlew spotlessApply' to fix."
    exit 1
fi
```

## Explicación

Los hooks de Git son scripts ejecutables en `.git/hooks/` que corren en eventos específicos del ciclo de vida. El hook `pre-commit` corre después de invocar `git commit` pero antes de que el commit se cree. Si el hook sale con un status distinto de cero, el commit se aborta.

**Cómo funcionan las herramientas:**
- **pre-commit (framework Python)**: Maneja instalación y ejecución de hooks cross-language. Definido en `.pre-commit-config.yaml`.
- **husky + lint-staged**: Husky instala el hook Git; lint-staged filtra rutas de archivo para que solo archivos en stage sean verificados, haciendo commits rápidos.
- **Hooks Git nativos**: Cualquier script ejecutable funciona. Usa plugins de Maven/Gradle para distribuir hooks entre el equipo.

**Compromisos:**
- Los hooks añaden latencia a los commits (segundos a decenas de segundos)
- Los miembros del equipo pueden evadir hooks con `git commit --no-verify`
- Los hooks deben instalarse por clon; CI sigue siendo la puerta final

## Variantes

| Tecnología | Herramienta | Notas |
|------------|-------------|-------|
| Python | Framework `pre-commit` | Ecosistema maduro; 200+ hooks comunitarios disponibles |
| JavaScript / TypeScript | `husky` + `lint-staged` | Estándar de la industria para Node.js; rápido porque solo verifica archivos en stage |
| Java | Maven `git-build-hook-plugin` o Gradle `spotless` | Ejecuta formateadores como parte del build; hooks llaman `./gradlew spotlessCheck` |
| Go | `pre-commit` + `golangci-lint` | Usa el framework `pre-commit` con hooks específicos de Go |
| Rust | `pre-commit` + `rustfmt` / `clippy` | Mismo framework; hooks comunitarios disponibles |
| Escaneo de secretos | `gitleaks`, `trufflehog` | Hooks pre-commit previenen que API keys y passwords entren al historial |

## Lo que funciona

1. Mantén los hooks rápidos: lint solo archivos en stage, no todo el codebase
2. Auto-arregla cuando sea posible: los formateadores deben reescribir archivos, no solo reportar errores
3. Incluye un script `prepare` o `postinstall` para auto-instalar hooks en `npm install` o `pip install`
4. Ejecuta los mismos checks en CI; los hooks son una conveniencia, no un reemplazo de las puertas de CI
5. Documenta procedimientos de evasión (`--no-verify`) para emergencias, pero requiere revisión de PR cuando se usen

## Errores Comunes

1. **Verificar todo el repo en cada commit** — lint-staged y el filtro `files` de pre-commit aseguran que solo archivos cambiados sean verificados
2. **No auto-instalar hooks** — los clones nuevos omiten hooks a menos que un script `prepare` los instale
3. **Formateadores en conflicto** — asegúrate de que las reglas de Prettier y ESLint coincidan; usa `eslint-config-prettier` para deshabilitar reglas de formato conflictivas de ESLint
4. **Hooks que modifican archivos pero no re-stagen** — si un hook reformatea código, debe agregar el archivo de vuelta al índice o el commit usará la versión vieja
5. **Depender solo de hooks** — los desarrolladores pueden usar `--no-verify`; CI debe enforcear las mismas reglas

## Preguntas Frecuentes

### ¿Puedo saltar hooks para un commit específico?

Sí: `git commit --no-verify` (o `-n`). Usa esto con moderación y siempre haz un commit de limpieza después. Algunos equipos requieren aprobación de manager para usar `--no-verify`.

### ¿Debería ejecutar tests en pre-commit hooks?

Tests unitarios: a veces, si completan en menos de 10 segundos. Tests de integración o E2E: nunca; pertenecen a CI. Hooks lentos entrenan a desarrolladores a evadirlos.

### ¿Cómo comparto hooks con mi equipo?

Usa `pre-commit` (cross-language) o `husky` (Node.js). Ambos almacenan configuración de hooks en el repo. Para Java, usa un plugin de Maven/Gradle que instale hooks desde un directorio trackeado `git-hooks/` durante el build. Nunca hagas commit de archivos directamente a `.git/hooks/`—ese directorio no es trackeado.

### Go con golangci-lint

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/golangci/golangci-lint
    rev: v1.55.2
    hooks:
      - id: golangci-lint
        args: [--config, .golangci.yml]
```

```yaml
# .golangci.yml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
linters-settings:
  errcheck:
    check-type-assertions: true
```

### Escaneo de Secretos con gitleaks

```yaml
# .pre-commit-config.yaml — añadir gitleaks
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
```

```bash
# Ejecutar gitleaks manualmente
$ gitleaks detect --source . --verbose

# Escanear un rango de commits específico
$ gitleaks detect --source . --log-opts="HEAD~1..HEAD"

# Reglas custom en .gitleaks.toml
[[rules]]
id = "custom-api-key"
description = "Custom API key pattern"
regex = '''sk-live-[a-zA-Z0-9]{20,}'''
tags = ["api-key", "custom"]
```

### Linting de Mensajes de Commit con commitlint

```javascript
// Instalar: npm install --save-dev @commitlint/cli @commitlint/config-conventional
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "test", "chore", "ci", "perf"],
    ],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
  },
};
```

```bash
# .husky/commit-msg
#!/bin/sh
npx --no-install commitlint --edit "$1"
```

```text
# Mensajes de commit válidos:
feat: add user registration endpoint
fix: handle null pointer in auth middleware
docs: update API documentation for v2
chore: upgrade dependencies to latest patch
```

### Integración con CI (GitHub Actions)

```yaml
# .github/workflows/lint.yml
name: Lint and Format
on: [push, pull_request]

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - uses: pre-commit/action@v3.0.0
        with:
          extra_args: --all-files

  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Historial completo para escaneo
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hook para Type Checking

```json
// package.json — añadir type-check a lint-staged
{
  "lint-staged": {
    "*.{ts,tsx}": ["tsc --noEmit", "eslint --fix", "prettier --write"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```yaml
# .pre-commit-config.yaml — Python type checking
repos:
  - repo: local
    hooks:
      - id: mypy
        name: mypy type check
        entry: mypy
        language: system
        types: [python]
        pass_filenames: false
        args: [--strict, src/]
```

## Mejores Prácticas Adicionales

6. **Usa `--no-verify` con moderación.** Trackea el uso de bypass en mensajes de commit:

```bash
# Documentar por qué se evitó el hook
$ git commit --no-verify -m "fix: hotfix for prod outage (bypass: time-critical)"
```

7. **Cachea entornos de pre-commit.** Acelera la ejecución de hooks cacheando:

```yaml
# .github/workflows/lint.yml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pre-commit
    key: pre-commit-${{ hashFiles('.pre-commit-config.yaml') }}
```

8. **Ejecuta hooks en Docker para consistencia.** Asegúrate de que todos los miembros del equipo usen las mismas versiones de herramientas:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: docker-lint
        name: ESLint in Docker
        entry: docker run --rm -v $(pwd):/app node:20-slim sh -c "cd /app && npx eslint --fix"
        language: system
        types: [javascript]
```

## Errores Comunes Adicionales

6. **No fijar versiones de hooks.** Usar `rev: main` flotante causa breakage cuando upstream cambia:

```yaml
# Mal: revisión flotante
repos:
  - repo: https://github.com/psf/black
    rev: main  # Se romperá sin aviso

# Bien: versión fijada
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
```

7. **Hooks que requieren acceso a red.** Los hooks deberían funcionar offline. Si un hook necesita red (e.g., descargar reglas), cachealas:

```bash
# Pre-descargar reglas durante el setup
$ pre-commit run --all-files  # Descarga y cachea en la primera ejecución
```

## FAQ Adicional

### ¿Cómo salto hooks específicos temporalmente?

Con `pre-commit`, salta hooks individuales usando `SKIP`:

```bash
$ SKIP=flake8,mypy git commit -m "wip"
```

Con `husky`, modifica el script del hook para verificar una env var:

```bash
# .husky/pre-commit
if [ "$SKIP_HOOKS" = "1" ]; then
  exit 0
fi
npx lint-staged
```

### ¿Puedo ejecutar hooks solo en branches específicas?

Sí. Añade un check de branch al inicio del script del hook:

```bash
#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ] || [ "$branch" = "release/"* ]; then
  npx lint-staged
fi
```

### ¿Cómo debuggeo un pre-commit hook que falla?

Ejecuta hooks manualmente con output verbose:

```bash
# Ejecutar hook específico con verbose
$ pre-commit run black --verbose --all-files

# Ejecutar con trace output
$ pre-commit run --all-files --verbose 2>&1 | tee pre-commit.log

# Verificar entorno del hook
$ pre-commit clean
$ pre-commit install
```

## Tips de Rendimiento

1. **Solo verifica archivos staged.** Usa `lint-staged` o el filtro `files` de `pre-commit`:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        files: ^src/.*\.py$  # Solo verificar directorio src/
```

2. **Paraleliza hooks.** `pre-commit` ejecuta hooks en paralelo por defecto. Mantenlos independientes:

```yaml
# Cada repo se ejecuta en su propio entorno — paralelo por defecto
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
  - repo: https://github.com/PyCQA/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
```

3. **Usa hooks locales para velocidad.** Evita descargar repos remotos para checks simples:

```yaml
repos:
  - repo: local
    hooks:
      - id: local-format
        name: format check
        entry: ./scripts/format.sh
        language: system
        files: \.(js|ts)$
```

4. **Cachea instalaciones de herramientas.** Usa `language_version` para fijar y cachear:

```yaml
hooks:
  - id: black
    language_version: python3.11  # Cacheado después de la primera ejecución
```

5. **Salta hooks para archivos generados.** Excluye código auto-generado de los checks:

```yaml
hooks:
  - id: flake8
    exclude: |
      (?x)^(
          src/generated/.*|
          migrations/.*
      )$
```
