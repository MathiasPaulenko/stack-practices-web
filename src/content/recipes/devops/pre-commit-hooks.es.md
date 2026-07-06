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
