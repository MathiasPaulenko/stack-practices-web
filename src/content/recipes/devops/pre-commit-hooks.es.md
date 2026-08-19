---
contentType: recipes
slug: pre-commit-hooks
title: "Configura pre-commit hooks con husky y lint-staged"
description: "Configura pre-commit hooks con husky, lint-staged y el framework pre-commit para forzar linting, formato y tests antes de cada commit."
metaDescription: "Configura pre-commit hooks con husky, lint-staged y pre-commit. Ejemplos prácticos para Python, JavaScript y Java para detectar problemas antes de cada commit."
difficulty: beginner
topics:
  - devops
  - testing
tags:
  - devops
  - git
  - pre-commit
  - husky
  - lint-staged
  - ci-cd
relatedResources:
  - /recipes/github-actions
  - /recipes/bash-scripting-automation
  - /recipes/unit-testing
  - /recipes/container-security-scanning
  - /recipes/python-coverage-pytest-cov
  - /docs/contributing-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Configura pre-commit hooks con husky, lint-staged y pre-commit. Ejemplos prácticos para Python, JavaScript y Java para detectar problemas antes de cada commit."
  keywords:
    - pre-commit
    - husky
    - lint-staged
    - git-hooks
    - calidad-de-codigo
    - linting
---

## Overview

Un pre-commit hook es un script que corre entre `git commit` y el momento en que
el commit se crea. Te da feedback rápido y local sobre linting, formato, tests y
seguridad antes de que algo llegue a CI. Esta receta muestra cómo configurar
hooks para Python, JavaScript y Java con tres enfoques comunes.

## Cuándo Usar

- Tu equipo sigue commiteando código que falla los checks de lint o formato en
  CI.
- Querés forzar estilo sin depender únicamente de revisiones de pull request.
- Necesitás escanear secretos o vulnerabilidades en cada commit.
- Querés detectar problemas pequeños localmente en lugar de esperar a que falle
  CI.

### Cuándo evitarlo

- El proyecto no tiene un formatter o linter compartido; el hook solo agrega
  fricción sin una regla clara.
- Tus checks tardan más de unos segundos; hooks lentos enseñan a la gente a
  saltearlos.
- Estás reemplazando las puertas de CI con hooks locales. Los hooks son una
  conveniencia, no la puerta final.

## Solución

### Python — framework pre-commit

```python
# Instalar el framework pre-commit
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
```

Ejecutá `pre-commit install` para copiar el hook a `.git/hooks/` y
`pre-commit run --all-files` para probarlo manualmente.

### JavaScript — husky + lint-staged

```javascript
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  },
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

```bash
# .husky/pre-commit (sintaxis husky v9+)
echo "npx lint-staged" > .husky/pre-commit
```

```javascript
// .lintstagedrc.js
module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yaml}': ['prettier --write'],
};
```

### Java — Gradle Spotless + hook nativo

```java
// build.gradle
plugins {
    id 'com.diffplug.spotless' version '6.23.0'
}

spotless {
    java {
        googleJavaFormat()
    }
}
```

```bash
# git-hooks/pre-commit (chmod +x)
#!/bin/sh
./gradlew spotlessCheck
if [ $? -ne 0 ]; then
    echo "Spotless check failed. Run './gradlew spotlessApply' to fix."
    exit 1
fi
```

Para Maven, el plugin `git-build-hook-maven-plugin` puede instalar hooks
rastreados desde un directorio `git-hooks/` durante el build.

## Explicación

Un hook en `.git/hooks/pre-commit` es un script ejecutable. Git lo ejecuta
después de que escribís `git commit` y antes de escribir el commit. Si el script
termina con un status distinto de cero, el commit se aborta.

- El framework **pre-commit** (Python) instala y ejecuta hooks desde un solo
  archivo YAML. Funciona cross-language y se encarga de instalar las
  herramientas.
- **husky** instala el hook de Git y **lint-staged** limita el chequeo a los
  archivos en stage, así el commit sigue rápido.
- Los **hooks nativos** permiten que cualquier proyecto ejecute un script shell
  personalizado. Los plugins de Gradle y Maven pueden distribuir ese script con
  el repo.

El compromiso es real: los hooks agregan segundos a cada commit, los
 desarrolladores pueden saltearlos con `--no-verify` y hay que instalarlos en
cada clon nuevo. Por eso los mismos checks deberían correr en CI.

## Variantes

| Stack | Herramienta | Notas |
| --- | --- | --- |
| Python | Framework `pre-commit` | Maduro; más de 200 hooks comunitarios |
| JavaScript / TypeScript | `husky` + `lint-staged` | Solo verifica archivos en stage |
| Java | Gradle `spotless` o plugin Maven | El formateo es parte del build |
| Go | `pre-commit` + `golangci-lint` | Reusá el framework Python con hooks de Go |
| Secretos | `gitleaks` o `trufflehog` | Agregalo a la misma config para bloquear API keys |

## Mejores Prácticas

- Mantené los hooks rápidos verificando solo archivos en stage. Usá
  `lint-staged` o el filtro `files` en `.pre-commit-config.yaml`.
- Preferí herramientas que auto-arreglen y re-stagen archivos, así el commit
  guarda la versión corregida.
- Agregá un script `prepare` o `postinstall` para que los hooks se instalen con
  `npm install` o `pip install`.
- Corré los mismos checks en CI. Los hooks locales atrapan errores temprano; CI
  es la puerta final.
- Documentá el escape de `--no-verify`, pero pedí revisión cuando alguien lo
  use.
- Fijá versiones de herramientas y cacheá instalaciones. Hooks reproducibles
  significan menos "a mí me funciona".

## Errores Comunes

- Verificar todo el repo en cada commit. Convierte un commit de 2 segundos en
  una espera de 2 minutos.
- No auto-instalar los hooks. Clones nuevos los saltearán silenciosamente.
- Dejar que formateadores peleen. Alineá ESLint y Prettier con
  `eslint-config-prettier`.
- Correr tests lentos o de integración en un pre-commit hook.
- Tratar los hooks como reemplazo de CI. Son la primera línea de defensa, no la
  última.

## FAQ

### ¿Puedo saltear los pre-commit hooks una vez?

Sí: `git commit --no-verify` (o `-n`). Usalo solo para emergencias y hacé un
commit de limpieza después.

### ¿Debería ejecutar tests en pre-commit hooks?

Tests unitarios que terminen en menos de 10 segundos están bien. Cualquier cosa
más lenta pertenece a CI.

### ¿Cómo comparto hooks con el equipo?

Guardá la configuración de hooks en el repo. El framework `pre-commit`, `husky`
y los plugins de Maven/Gradle leen desde archivos rastreados. Nunca hagas commit
directamente en `.git/hooks/`, que no es rastreado.

### ¿Cómo agrego escaneo de secretos?

Agregá un hook de `gitleaks` o `trufflehog` a la misma `.pre-commit-config.yaml`
o a `lint-staged`. Para `gitleaks`:

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
```

### ¿Cómo bloqueo mensajes de commit mal escritos?

Usá un hook `commit-msg` con `commitlint`:

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci', 'perf']],
    'subject-max-length': [2, 'always', 72],
  },
};
```

### ¿Por qué mi hook reformateó un archivo pero el commit igual falló?

El hook cambió la copia de trabajo pero no re-stagenó el archivo. Configurá la
herramienta para re-stagenar automáticamente o volvé a ejecutar `git add`.
