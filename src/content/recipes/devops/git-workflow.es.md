---




contentType: recipes
slug: git-workflow
title: "Flujo de Trabajo Git"
description: "Una estrategia de branching práctica para equipos: ramas de feature, pull requests e historial limpio de commits."
metaDescription: "Aprende un flujo de trabajo Git práctico para equipos. Ramas de feature, pull requests, rebase y mantener un historial de commits limpio."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - git
  - workflow
  - ci-cd
  - automation
relatedResources:
  - /recipes/docker-basics
  - /recipes/unit-testing
  - /recipes/github-actions
  - /recipes/git-rebase-interactive-tutorial
  - /docs/pull-request-template
  - /recipes/cron-jobs
  - /docs/contributing-guide
  - /docs/readme-template
lastUpdated: "2026-06-10"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende un flujo de trabajo Git práctico para equipos. Ramas de feature, pull requests, rebase y mantener un historial de commits limpio."
  keywords:
    - flujo de trabajo git
    - estrategia de branching
    - rama de feature
    - pull request
    - colaboración en equipo




---

## Overview

Un flujo de trabajo Git define cómo tu equipo usa ramas para gestionar trabajo paralelo, revisar cambios y mantener la rama principal estable. El flujo descrito aquí — a menudo llamado "GitHub Flow" — es ligero, escala desde desarrolladores solitarios hasta equipos grandes, e integra naturalmente con pipelines de CI/CD.

## When to Use

Usa este flujo cuando:

- Trabajes en un equipo donde múltiples desarrolladores tocan la misma base de código. Consulta [GitHub Actions](/recipes/github-actions/) para automatización CI/CD.
- Quieras que cada cambio sea revisado antes de llegar a producción. Consulta [Unit Testing](/recipes/unit-testing/) para validación pre-merge.
- Tu proyecto haga deployment continuo desde la rama principal. Consulta [Docker Basics](/recipes/docker-basics/) para despliegues containerizados.
- Necesites un camino claro de rollback cuando algo salga mal. Consulta [Feature Flags](/recipes/feature-flags/) para toggles instantáneos.

## Solution

### Modelo de Branching

```
main  ───────────────────────────────────────────►
       \
feature/login   ──────────►  (PR → review → merge)
       \
feature/payments  ────────►  (PR → review → merge)
```

### Comandos Diarios

```bash
# Iniciar una nueva feature
$ git checkout main
$ git pull origin main
$ git checkout -b feature/descripcion

# Hacer commits
$ git add .
$ git commit -m "feat: add password reset endpoint"

# Push y abrir pull request
$ git push -u origin feature/descripcion
# Abrir PR en GitHub, solicitar review, esperar que CI pase

# Después del merge, limpiar
$ git checkout main
$ git pull origin main
$ git branch -d feature/descripcion
```

### Mantener un Historial Limpio (opcional)

```bash
# Antes de mergear, rebase sobre main más reciente
$ git fetch origin
$ git rebase origin/main

# Si tienes commits locales desordenados, haz squash
$ git rebase -i HEAD~3
# Cambia "pick" a "squash" para los commits que quieras combinar
```

### Convención de Mensajes de Commit (Conventional Commits)

```
feat: add user authentication
fix: resolve race condition in checkout
docs: update API reference for v2
refactor: extract payment service
```

## Explanation

- **`main` siempre es deployable**: solo mergea código que pase tests y review.
- **Las ramas de feature aíslan el trabajo**: cada feature, bugfix o experimento vive en su propia rama.
- **Los pull requests enforce calidad**: la revisión de código atrapa bugs, comparte conocimiento y mantiene estándares consistentes.
- **Rebase vs. merge**: rebase reescribe tu rama sobre `main` para un historial lineal; merge preserva la secuencia exacta de eventos. Usa rebase para limpieza personal, merge para historial de equipo.

## Variants

| Modelo | Ideal Para | Complejidad |
|--------|------------|-------------|
| GitHub Flow | Deployment continuo, equipos pequeños | Baja |
| Git Flow | Releases programados, ciclos de QA | Media |
| Trunk-based | Monorepos, CI muy rápido | Baja |
| Release branches | Versiones con soporte a largo plazo | Media |

## Lo que funciona

- **Mantén ramas de corta vida**: una rama abierta por semanas acumula conflictos de merge y código obsoleto. Apunta a días, no semanas.
- **Escribe mensajes de commit significativos**: explica *por qué*, no solo *qué*. Tu yo futuro (y tus compañeros) te lo agradecerán.
- **Revisa tu propio PR primero**: lee el diff antes de solicitar reviewers. Atraparás problemas obvios.
- **Automatiza con CI**: ejecuta lint, tests y scans de seguridad en cada pull request antes de que alguien revise.
- **Protege main**: requiere reviews de PR, CI exitoso y ramas actualizadas antes de mergear a `main`.

## Common Mistakes

- **Ramas de larga duración**: cuanto más vive una rama, más difícil es mergearla. Haz rebase frecuentemente.
- **Commit directo a main**: incluso en proyectos solitarios, usar ramas mantiene tu historial limpio y el rollback fácil.
- **Pull requests gigantes**: PRs con cientos de archivos son imposibles de revisar bien. Divide capacidades grandes en PRs apiladas.
- **Ignorar conflictos de merge**: resolver conflictos apresuradamente sin entender ambos lados introduce bugs.
- **Historial de commits desordenado**: "fix", "fix again", "actually fix" hacen que `git blame` sea inútil. Haz squash o amend antes de pushear.

## FAQ

**Q: ¿Debería usar merge o rebase?**
A: Usa rebase para mantener tu rama de feature actualizada con `main` localmente. Usa merge (o squash-merge) cuando integres la feature a `main` vía pull request. Nunca hagas rebase de ramas en las que otras personas estén trabajando.

**Q: ¿Con qué frecuencia debería hacer commit?**
A: Haz commit cada vez que alcances un checkpoint lógico — un test que pasa, una función completada, un bug arreglado. Commits frecuentes hacen más fácil revertir y revisar.

**Q: ¿Qué pasa si commiteo un secreto (contraseña, API key) a Git?**
A: Rota el secreto inmediatamente — ahora está en el historial de Git. Usa herramientas como `git-filter-repo` o BFG Repo-Cleaner para eliminarlo del historial, luego force-push. La prevención vence a la limpieza: usa pre-commit hooks con escaneo de secretos.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Git Flow (Modelo de Branching Extendido)

Git Flow añade ramas `develop` y `release` para equipos con ciclos de release programados:

```bash
# Crear rama develop
$ git checkout -b develop
$ git push -u origin develop

# Las ramas de feature salen de develop, no de main
$ git checkout develop
$ git checkout -b feature/payment-gateway

# Cuando la feature está lista, mergear de vuelta a develop
$ git checkout develop
$ git merge --no-ff feature/payment-gateway
$ git branch -d feature/payment-gateway

# Crear una rama de release cuando estés listo para publicar
$ git checkout -b release/1.2.0
# Corregir bugs solo en la rama de release, no features

# Mergear release a main y taggear
$ git checkout main
$ git merge --no-ff release/1.2.0
$ git tag -a v1.2.0 -m "Release 1.2.0"
$ git push origin v1.2.0

# También mergear release de vuelta a develop
$ git checkout develop
$ git merge release/1.2.0
$ git branch -d release/1.2.0
```

### Trunk-Based Development

Para equipos con CI rápido y deployment continuo, trunk-based development elimina las ramas de larga duración:

```bash
# Todos commitean a main (o ramas de corta vida <1 día)
$ git checkout main
$ git pull origin main

# Haz un cambio pequeño, commitea, pushea
$ git add .
$ git commit -m "feat: add validation to checkout form"
$ git push origin main

# Usa feature flags para ocultar trabajo incompleto
# En lugar de branching, envuelve código en flags:
#   if (featureFlag.isEnabled('new-checkout')) { ... }
```

### Pull Requests Apiladas (Stacked PRs)

Para features grandes que no caben en un PR, usa PRs apiladas:

```bash
# PR 1: refactor base
$ git checkout -b feature/payment-base
$ git push -u origin feature/payment-base
# Abrir PR #1 con target main

# PR 2: construye sobre PR 1
$ git checkout -b feature/payment-ui
$ git rebase feature/payment-base
$ git push -u origin feature/payment-ui
# Abrir PR #2 con target feature/payment-base (no main)

# Después de que PR #1 se mergee, rebasear PR #2 sobre main
$ git checkout feature/payment-ui
$ git rebase origin/main
$ git push --force-with-lease
# Ahora PR #2 tiene target main automáticamente
```

### Cherry-Pick para Hotfixes

```bash
# Un bug crítico se corrigió en develop, pero lo necesitas en main ahora
$ git log --oneline develop -10  # encontrar el hash del commit
$ git checkout main
$ git cherry-pick abc1234
$ git push origin main

# Cherry-pick también funciona para backportear fixes a ramas de release
$ git checkout release/1.1.x
$ git cherry-pick abc1234
```

### Git Bisect para Encontrar Regresiones

```bash
# Algo se rompió, pero no sabes qué commit fue
$ git bisect start
$ git bisect bad          # el commit actual está roto
$ git bisect good v1.1.0  # esta versión funcionaba

# Git hace checkout de un commit en el medio
# Testealo, luego marca good o bad
$ git bisect good  # o: git bisect bad

# Repite hasta que Git identifique el commit culpable
# Cuando termines:
$ git bisect reset
```

### Git Hooks para Automatización

```bash
# .git/hooks/pre-commit (o usa husky/pre-commit framework)
#!/bin/bash
set -e

# Ejecutar linter
npm run lint

# Ejecutar type checker
npm run type-check

# Ejecutar tests solo para archivos cambiados
npm run test:staged

# Verificar secrets
git-secrets --scan
```

```bash
# .git/hooks/commit-msg
#!/bin/bash
# Enforcear formato Conventional Commits
msg=$(cat "$1")
if ! echo "$msg" | grep -qE '^(feat|fix|docs|refactor|test|chore|ci|perf|build)(\(.+\))?: .{1,80}$'; then
  echo "ERROR: El mensaje de commit debe seguir el formato Conventional Commits"
  echo "Ejemplo: feat(auth): add OAuth2 login"
  exit 1
fi
```

### Resolver Conflictos de Merge

```bash
# Cuando rebase encuentra un conflicto
$ git rebase origin/main
# CONFLICT (content): Merge conflict in src/auth.js

# Abre el archivo, resuelve los marcadores de conflicto
# <<<<<<< HEAD
# tus cambios
# =======
# sus cambios
# >>>>>>> origin/main

# Después de resolver:
$ git add src/auth.js
$ git rebase --continue

# Para abortar y empezar de nuevo:
$ git rebase --abort

# Usa una merge tool para conflictos complejos
$ git mergetool
```

### Estrategia Squash Merge

```bash
# Squashear todos los commits de una rama de feature en uno solo
$ git checkout main
$ git merge --squash feature/large-refactor
# Todos los cambios están staged pero no commiteados
$ git commit -m "refactor: restructure authentication module

- Extract OAuth2 provider into separate class
- Add token refresh logic
- Update all tests to use new interface"

$ git push origin main
```




## Tips de Rendimiento

1. **Usa shallow clones para CI.** Reduce el tiempo de clonación trayendo solo el último commit:

```bash
$ git clone --depth 1 https://github.com/org/repo.git
# Para una rama específica:
$ git clone --depth 1 --branch main https://github.com/org/repo.git
```

2. **Usa `git sparse-checkout` para monorepos.** Haz checkout solo de los directorios que necesitas:

```bash
$ git clone --no-checkout https://github.com/org/monorepo.git
$ cd monorepo
$ git sparse-checkout init --cone
$ git sparse-checkout set packages/api packages/shared
$ git checkout main
```

3. **Habilita `fsmonitor` para status checks más rápidos.** Git usa el file watcher del SO para detectar cambios:

```bash
$ git config core.fsmonitor true
$ git config core.untrackedcache true
```

4. **Usa `git gc` para optimizar el tamaño del repositorio.** Ejecuta periódicamente para comprimir objetos:

```bash
$ git gc --aggressive --prune=now
```

5. **Usa `git worktree` para trabajo paralelo.** Trabaja en múltiples ramas simultáneamente sin clonar:

```bash
$ git worktree add ../repo-hotfix main
$ cd ../repo-hotfix
# Ahora estás en main en un directorio separado
# Haz cambios de hotfix mientras tu rama de feature queda abierta en el original
```
