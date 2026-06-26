---
contentType: docs
slug: git-branching-strategy-document
title: "Documento de Estrategia de Branching en Git"
description: "Una plantilla de documento para definir flujo de trabajo Git, convenciones de ramas, requisitos de merge y procedimientos de release para equipos de ingenieria."
metaDescription: "Define el flujo de trabajo Git de tu equipo. Cubre nomenclatura de ramas, requisitos de merge, release y rollback."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - git
  - branching
  - workflow
  - version-control
  - ci-cd
  - standards
relatedResources:
  - /docs/devops/engineering-handbook-template
  - /docs/devops/code-review-checklist-template
  - /docs/devops/deployment-checklist-template
  - /docs/devops/onboarding-checklist-backend-engineer
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define el flujo de trabajo Git de tu equipo. Cubre nomenclatura de ramas, requisitos de merge, release y rollback."
  keywords:
    - estrategia de branching git
    - flujo de trabajo git
    - convencion de nomenclatura de ramas
    - estrategia de merge
    - proceso de release
---

## Overview

Cada equipo que usa Git sin una estrategia de branching documentada eventualmente crea caos. Los desarrolladores crean ramas desde el lugar equivocado, los hotfixes evaden revision, los tags de release son inconsistentes, y revertir se convierte en un juego de adivinanzas. Un documento de estrategia de branching define como tu equipo usa Git: de donde vienen las ramas, como se mergean, quien puede aprobar, y como ocurren los releases.

## When to Use

Usa este documento cuando:
- Tu equipo tiene mas de dos desarrolladores commiteando al mismo repositorio
- Necesitas soportar multiples releases concurrentes o entornos
- Los hotfixes frecuentemente entran en conflicto con desarrollo en curso
- Los nuevos miembros del equipo luchan por entender como contribuir
- Tu pipeline de CI/CD requiere patrones de branch especificos para disparar despliegues

## Prerequisites

Antes de definir la estrategia:
- [ ] Entender tu cadencia de release (continuo, diario, semanal, por milestone)
- [ ] Conocer tus entornos de despliegue y como el codigo llega a ellos
- [ ] Decidir si necesitas soportar multiples versiones de produccion simultaneamente
- [ ] Confirmar que tu sistema de CI/CD puede disparar en patrones de branch o tags
- [ ] Alinear con producto sobre expectativas de rollback y tiempo de respuesta para hotfixes

## Solution

```markdown
# Estrategia de Branching Git: `<Proyecto/Equipo>`

> Version: ______ | Ultima actualizacion: ______ | Responsable: ______

## 1. Tipos de Ramas

### Ramas Principales

| Rama | Proposito | Proteccion | Duracion |
|------|-----------|------------|----------|
| `main` | Codigo listo para produccion | Requiere PR + 2 aprobaciones + CI verde | Permanente |
| `staging` | Validacion pre-produccion | Requiere PR + 1 aprobacion + CI verde | Permanente |
| `develop` | Rama de integracion para features | Requiere PR + 1 aprobacion + CI verde | Permanente |

### Ramas de Soporte

| Prefijo | Proposito | Fuente | Merge Target | Nomenclatura |
|---------|---------|--------|--------------|--------------|
| `feature/` | Nueva funcionalidad | `develop` | `develop` | `feature/TICKET-descripcion-corta` |
| `bugfix/` | Fixes no urgentes | `develop` | `develop` | `bugfix/TICKET-descripcion-corta` |
| `hotfix/` | Fixes criticos de produccion | `main` | `main` + `develop` | `hotfix/TICKET-descripcion-corta` |
| `release/` | Preparacion de release | `develop` | `main` + `staging` | `release/v1.2.3` |
| `chore/` | Mantenimiento, dependencias | `develop` | `develop` | `chore/TICKET-descripcion-corta` |
| `docs/` | Solo documentacion | `develop` | `develop` | `docs/TICKET-descripcion-corta` |

## 2. Flujo de Trabajo

### Desarrollo de Features

```bash
git checkout develop && git pull origin develop
git checkout -b feature/PROJ-123-add-user-auth
# trabajo y commits locales
git push origin feature/PROJ-123-add-user-auth
# abrir PR a develop
```

### Flujo de Hotfix

```bash
git checkout main && git pull origin main
git checkout -b hotfix/PROJ-456-fix-payment-webhook
# fix, test, commit
git push origin hotfix/PROJ-456-fix-payment-webhook
# PR a main (revision expeditada)
# despues del merge, backport a develop
git checkout develop && git cherry-pick <hotfix-commit>
```

### Flujo de Release

```bash
git checkout develop && git pull origin develop
git checkout -b release/v1.2.3
# version bump, changelog, QA final
git checkout staging && git merge --no-ff release/v1.2.3
git checkout main && git merge --no-ff release/v1.2.3
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
git checkout develop && git merge --no-ff main
```

## 3. Convenciones de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Tipos

| Tipo | Uso Para | Dispara Release |
|------|---------|----------------|
| `feat` | Nueva funcionalidad | Minor |
| `fix` | Bug fix | Patch |
| `docs` | Solo documentacion | Ninguno |
| `style` | Formateo | Ninguno |
| `refactor` | Cambio sin cambio de comportamiento | Ninguno |
| `perf` | Mejora de rendimiento | Patch |
| `test` | Tests | Ninguno |
| `chore` | Proceso, dependencias | Ninguno |
| `ci` | CI/CD | Ninguno |
| `revert` | Revertir commit previo | Patch |

### Ejemplos

```
feat(auth): add Google OAuth2 login

Implements OAuth2 flow with PKCE for web clients.
Closes PROJ-123

fix(payments): validate webhook signature

Prevents replay attacks by verifying Stripe signature
header before processing events.
Closes PROJ-456
```

## 4. Requisitos de Merge

### Requisitos de Pull Request

| Requisito | Feature/Bugfix | Hotfix | Release |
|-----------|---------------|--------|---------|
| CI pasa | Requerido | Requerido | Requerido |
| Aprobaciones de review | 2 | 1 (expeditado) | 2 |
| Ticket enlazado | Requerido | Requerido | Requerido |
| Tests agregados | Requerido | Requerido | N/A |
| Documentacion actualizada | Si cambia funcionalidad | Si cambia comportamiento | Changelog actualizado |
| Revision de seguridad | Si auth/datos | Requerido | N/A |

### Estrategias de Merge

| Rama Target | Estrategia | Razonamiento |
|-------------|------------|--------------|
| `develop` | Squash and merge | Historial limpio; un commit por feature |
| `main` | Merge commit | Preserva historial de release |
| `hotfix` a `main` | Merge commit | Preserva identificacion del hotfix |

## 5. Tagging y Versionado

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR**: Cambios breaking en API
- **MINOR**: Nuevas features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Formato de Tag

```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git tag -a v1.2.3-rc.1 -m "Release candidate 1"
git tag -a v1.2.4 -m "Hotfix: fix payment webhook validation"
```

### Reglas de Bump de Version

| Tipo de Commit | Bump de Version |
|----------------|----------------|
| `feat` | Minor (x.Y.z) |
| `fix`, `perf`, `revert` | Patch (x.y.Z) |
| `feat` con `BREAKING CHANGE` | Major (X.y.z) |
| `docs`, `style`, `refactor`, `test`, `chore`, `ci` | Ninguno |

## 6. Procedimientos de Rollback

### Revertir un Despliegue

```bash
git log --oneline --decorate --tags
git checkout v1.2.2
git checkout -b hotfix/rollback-v1.2.3
git push origin hotfix/rollback-v1.2.3
# abrir PR de emergencia a main
```

### Revertir un Merge

```bash
git log --oneline --merges
git revert -m 1 <merge-commit-hash>
# abrir PR con commit de revert
```

## 7. Reglas de Proteccion

### Branch Protection (GitHub/GitLab)

| Regla | main | staging | develop |
|-------|--------|---------|---------|
| Requerir PR | Si | Si | Si |
| Aprobaciones requeridas | 2 | 1 | 1 |
| Desechar aprobaciones stale | Si | Si | No |
| Requerir status checks | Si | Si | Si |
| Incluir administradores | Si | Si | No |
| Requerir historial lineal | No | No | Si |
| Permitir force push | No | No | No |
| Permitir borrados | No | No | No |
```

## Explanation

El documento separa la estrategia de branching en **tipos de ramas** (como se llaman y para que sirven), **flujo de trabajo** (como crearlas y mergearlas), **convenciones de commits** (como describir cambios), y **reglas de proteccion** (como prevenir accidentes). El principio clave es que cada rama tiene exactamente un proposito y exactamente un target de merge. La ambiguedad sobre de donde vienen las ramas y a donde van crea los conflictos de merge y errores de despliegue que ralentizan a los equipos.

## Variants

| Estrategia | Mejor Para | Trade-off |
|------------|------------|-----------|
| GitFlow (como arriba) | Releases programados, multiples versiones | Mas ramas, mas proceso |
| GitHub Flow (main + feature) | Despliegue continuo, version unica | Mas simple, pero sin staging de release |
| Trunk-based (solo main) | CD de alta velocidad, feature flags | Requiere CI/CD maduro y feature flags |
| Release branching (por version) | Productos con versiones LTS | Mas overhead de backporting |

## Best Practices

1. **Automatiza la proteccion** — reglas de branch protection y CI checks atrapan errores antes del merge
2. **Mantene ramas de corta vida** — ramas de feature mayores a una semana crean riesgo de integracion
3. **Tag cada release** — los tags son la unica forma confiable de identificar lo que esta en produccion
4. **Requiere links a tickets** — commits sin contexto son inutiles para postmortems
5. **Documenta excepciones** — si alguien evade el proceso, documenta por que y si fue la decision correcta

## Common Mistakes

1. **Permitir push directo a main** — incluso ingenieros senior cometen errores; branch protection es innegociable
2. **No hacer backport de hotfixes a develop** — el mismo bug se despliega en el siguiente release
3. **Nomenclatura inconsistente de ramas** — dificulta la automatizacion y el escaneo humano
4. **Squash-merging hotfixes** — pierde la habilidad de cherry-pickar o identificar el commit del fix
5. **No borrar ramas mergeadas** — el desorden dificulta encontrar trabajo activo

## Frequently Asked Questions

### Debemos usar GitFlow, GitHub Flow, o trunk-based development?

GitFlow funciona bien para equipos con releases programados y necesidad de estabilizacion de release. GitHub Flow (solo main + ramas de feature) es mas simple y funciona para despliegue continuo. Trunk-based requiere la mayor madurez — feature flags, testing automatizado comprehensivo, y CI/CD rapido. La mayoria de los equipos deberian empezar con GitHub Flow y adoptar GitFlow solo cuando la complejidad de gestion de releases lo demande.

### Como manejamos ramas de feature de larga duracion?

Evitalas. Si una feature toma mas de una semana, dividela en entregables mas pequenos detras de feature flags. Si es inevitable, rebasea la rama de feature sobre develop diariamente para prevenir pesadillas de integracion. El costo de resolver un merge conflict de una semana de antiguedad es exponencialmente mayor que un rebase diario.

### Que pasa si un hotfix entra en conflicto con trabajo ya en develop?

Resuelve el conflicto al hacer backport. La rama de hotfix mergea limpiamente a main (salio de main), pero cherry-pick o merge a develop pueden tener conflictos. Testea la resolucion del conflicto en una rama de feature antes de mergear a develop.
