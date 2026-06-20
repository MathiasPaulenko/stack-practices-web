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
relatedResources:
  - /recipes/docker-basics
  - /recipes/unit-testing
  - /recipes/github-actions
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
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

- Trabajes en un equipo donde múltiples desarrolladores tocan la misma base de código. Consulta [GitHub Actions](/recipes/devops/github-actions) para automatización CI/CD.
- Quieras que cada cambio sea revisado antes de llegar a producción. Consulta [Unit Testing](/recipes/testing/unit-testing) para validación pre-merge.
- Tu proyecto haga deployment continuo desde la rama principal. Consulta [Docker Basics](/recipes/devops/docker-basics) para despliegues containerizados.
- Necesites un camino claro de rollback cuando algo salga mal. Consulta [Feature Flags](/recipes/devops/feature-flags) para toggles instantáneos.

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

## Best Practices

- **Mantén ramas de corta vida**: una rama abierta por semanas acumula conflictos de merge y código obsoleto. Apunta a días, no semanas.
- **Escribe mensajes de commit significativos**: explica *por qué*, no solo *qué*. Tu yo futuro (y tus compañeros) te lo agradecerán.
- **Revisa tu propio PR primero**: lee el diff antes de solicitar reviewers. Atraparás problemas obvios.
- **Automatiza con CI**: ejecuta lint, tests y scans de seguridad en cada pull request antes de que alguien revise.
- **Protege main**: requiere reviews de PR, CI exitoso y ramas actualizadas antes de mergear a `main`.

## Common Mistakes

- **Ramas de larga duración**: cuanto más vive una rama, más difícil es mergearla. Haz rebase frecuentemente.
- **Commit directo a main**: incluso en proyectos solitarios, usar ramas mantiene tu historial limpio y el rollback fácil.
- **Pull requests gigantes**: PRs con cientos de archivos son imposibles de revisar bien. Divide features grandes en PRs apiladas.
- **Ignorar conflictos de merge**: resolver conflictos apresuradamente sin entender ambos lados introduce bugs.
- **Historial de commits desordenado**: "fix", "fix again", "actually fix" hacen que `git blame` sea inútil. Haz squash o amend antes de pushear.

## Frequently Asked Questions

**Q: ¿Debería usar merge o rebase?**
A: Usa rebase para mantener tu rama de feature actualizada con `main` localmente. Usa merge (o squash-merge) cuando integres la feature a `main` vía pull request. Nunca hagas rebase de ramas en las que otras personas estén trabajando.

**Q: ¿Con qué frecuencia debería hacer commit?**
A: Haz commit cada vez que alcances un checkpoint lógico — un test que pasa, una función completada, un bug arreglado. Commits frecuentes hacen más fácil revertir y revisar.

**Q: ¿Qué pasa si commiteo un secreto (contraseña, API key) a Git?**
A: Rota el secreto inmediatamente — ahora está en el historial de Git. Usa herramientas como `git-filter-repo` o BFG Repo-Cleaner para eliminarlo del historial, luego force-push. La prevención vence a la limpieza: usa pre-commit hooks con escaneo de secretos.
