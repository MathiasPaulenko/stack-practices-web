---






contentType: recipes
slug: git-rebase-interactive-tutorial
title: "Limpia el Historial de Commits con Git Rebase Interactivo"
description: "Haz squash, reordena, edita y divide commits con git rebase interactivo. Cubre pick, squash, fixup, reword, drop y resolución de conflictos."
metaDescription: "Limpia el historial de git con rebase interactivo. Squash, reordenar, editar, dividir commits. Cubre pick, squash, fixup, reword, drop y resolución de conflictos."
difficulty: intermediate
topics:
  - devops
tags:
  - git
  - rebase
  - commit-history
  - version-control
  - squash
  - interactive-rebase
relatedResources:
  - /recipes/docker-compose-dev-prod-split
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/git-workflow
  - /docs/code-review-checklist-template
  - /docs/git-branching-strategy-document
  - /guides/git-branching-strategies-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Limpia el historial de git con rebase interactivo. Squash, reordenar, editar, dividir commits. Cubre pick, squash, fixup, reword, drop y resolución de conflictos."
  keywords:
    - git rebase interactive
    - git squash commits
    - git rebase tutorial
    - git clean commit history
    - git fixup reword drop
    - git rebase conflict resolution






---

## Visión General

El rebase interactivo permite reescribir el historial de commits antes de mergear. Puedes hacer squash de commits relacionados, reordenarlos, editar mensajes de commit, dividir commits y eliminar los no deseados. Esto mantiene el historial de tu branch limpio y legible. Esta recipe cubre todas las acciones de rebase interactivo con ejemplos prácticos.

## Cuándo Usar


- For alternatives, see [Git Branching Strategy Document](/es/docs/git-branching-strategy-document/).

- Quieres limpiar commits antes de mergear una feature branch
- Tienes commits WIP que deberían hacer squash en uno
- Necesitas reword o corregir typos en mensajes de commit
- Quieres reordenar o dividir commits para mayor claridad
- Necesitas remover un commit que no debería estar en la branch

## Solución

### Iniciar un rebase interactivo

```bash
# Rebase últimos 5 commits
git rebase -i HEAD~5

# Rebase hasta un commit específico
git rebase -i <commit-hash>

# Rebase sobre una branch (común antes de merge)
git rebase -i main
```

Esto abre tu editor con una lista de commits y acciones disponibles:

```text
pick 1a2b3c4 Add user model
pick 5d6e7f8 WIP: fix validation
pick 9a0b1c2 WIP: tests
pick 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint

# Rebase commands:
# pick   = usar commit tal cual
# reword = usar commit, editar mensaje
# edit   = usar commit, pausar para amend
# squash = combinar con commit anterior
# fixup  = como squash, descartar mensaje
# drop   = remover commit
```

### Squash commits

```text
pick 1a2b3c4 Add user model
squash 5d6e7f8 WIP: fix validation
squash 9a0b1c2 WIP: tests
pick 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint
```

Al guardar, Git abre un editor para combinar mensajes de commit:

```text
# This is a combination of 3 commits.
# This is the 1st commit message:
Add user model

# The commit messages of commits being squashed:
WIP: fix validation

WIP: tests
```

Editar a un solo mensaje limpio:

```text
Add user model with validation and tests
```

### Fixup — squash y descartar mensaje

```text
pick 1a2b3c4 Add user model
fixup 5d6e7f8 WIP: fix validation
fixup 9a0b1c2 WIP: tests
pick 3d4e5f6 Add user API endpoints
```

Fixup combina el commit con el anterior y descarta su mensaje. Sin segundo prompt del editor.

### Reword un mensaje de commit

```text
pick 1a2b3c4 Add user model
reword 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint
```

Git pausa y abre un editor para el commit reworded. Escribe el nuevo mensaje y guarda.

### Editar un commit (pausar para modificar)

```text
pick 1a2b3c4 Add user model
edit 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint
```

Git pausa en el commit edit. Puedes modificar archivos, stagar cambios y amend:

```bash
# Hacer cambios
vim src/api/users.py
git add src/api/users.py

# Amend el commit
git commit --amend

# Continuar rebase
git rebase --continue
```

### Eliminar un commit

```text
pick 1a2b3c4 Add user model
drop 5d6e7f8 Add debug logging
pick 3d4e5f6 Add user API endpoints
```

O simplemente elimina la línea para drop el commit.

### Reordenar commits

```text
pick 3d4e5f6 Add user API endpoints
pick 1a2b3c4 Add user model
pick 7a8b9c0 Fix typo in endpoint
```

Git replaya los commits en el nuevo orden. Pueden ocurrir conflictos si los commits dependen entre sí.

### Dividir un commit

```text
pick 1a2b3c4 Add user model and API endpoints
edit 3d4e5f6 Add tests
pick 7a8b9c0 Fix typo
```

Cuando Git pausa en el commit edit:

```bash
# Unstage todos los cambios del commit
git reset HEAD^

# Stagear y commitear la primera parte
git add src/models/user.py
git commit -m "Add user model"

# Stagear y commitear la segunda parte
git add src/api/users.py
git commit -m "Add user API endpoints"

# Continuar rebase
git rebase --continue
```

### Resolver conflictos durante rebase

```bash
git rebase -i main
# CONFLICT (content): Merge conflict in src/models/user.py
```

Resolver el conflicto:

```bash
# 1. Editar el archivo para resolver conflictos
vim src/models/user.py

# 2. Stagear el archivo resuelto
git add src/models/user.py

# 3. Continuar el rebase
git rebase --continue
```

Si quieres abortar:

```bash
git rebase --abort
```

Si quieres skip el commit conflictivo:

```bash
git rebase --skip
```

### Autosquash con fixup commits

```bash
# Crear un fixup commit dirigido a un commit específico
git commit --fixup 1a2b3c4

# Rebase con autosquash — automáticamente reordena fixups
git rebase -i --autosquash HEAD~5
```

Git automáticamente coloca fixup commits después de su target y los marca como fixup:

```text
pick 1a2b3c4 Add user model
fixup 9a0b1c2 fixup! Add user model
pick 3d4e5f6 Add user API endpoints
```

### Force push después de rebase

```bash
# Force push seguro — verifica que nadie más hizo push
git push --force-with-lease origin feature-branch

# Nunca usar force push plain en branches compartidas
# git push --force  # PELIGROSO
```

## Explicación

El rebase interactivo replaya commits uno por uno, aplicando tu acción elegida a cada uno:

- **pick**: Mantener el commit tal cual. Acción por defecto.
- **reword**: Mantener el commit, pero abrir un editor para cambiar el mensaje.
- **edit**: Pausar en el commit. Modificar archivos, stagar, y `git commit --amend`. Continuar con `git rebase --continue`.
- **squash**: Combinar el commit con el anterior. Abre un editor para fusionar mensajes.
- **fixup**: Combinar con el commit anterior y descartar el mensaje. Sin prompt del editor.
- **drop**: Remover el commit completamente. Igual que eliminar la línea.
- **exec**: Ejecutar un comando de shell en ese punto del rebase.
- **break**: Detener el rebase en ese punto. Reanudar con `git rebase --continue`.

Conceptos clave:

- **Rebase reescribe historial**. Los commits viejos se reemplazan con nuevos. Esto cambia los hashes de commit.
- **Nunca hacer rebase de commits que ya se pushearon a branches compartidas**. El historial de otros developers se romperá.
- **`--force-with-lease`** es más seguro que `--force`. Verifica que nadie más hizo push antes de sobrescribir.
- **`--autosquash`** automáticamente reordena fixup y squash commits junto a sus targets.
- **Conflictos** ocurren cuando los commits dependen entre sí. Resolver, stagar y continuar.

## Variantes

| Acción | Efecto | Usar Cuando |
|--------|--------|----------|
| squash | Combinar + editar mensaje | Commits relacionados, quieres un mensaje |
| fixup | Combinar + descartar mensaje | Commits WIP, mensaje no necesario |
| reword | Editar mensaje solo | Corregir typo, mejorar claridad |
| edit | Pausar y modificar | Dividir commit, añadir archivo olvidado |
| drop | Remover commit | Revertir cambio no deseado |
| exec | Ejecutar comando shell | Correr tests en commit específico |

## Pautas

- Hacer rebase de feature branches antes de mergear para mantener historial limpio.
- Usar `squash` para commits relacionados donde los mensajes individuales aportan valor. Usar `fixup` para commits WIP donde el mensaje es ruido.
- Usar `--force-with-lease` en lugar de `--force` para evitar sobrescribir el trabajo de otros.
- Usar `--autosquash` con `git commit --fixup` para un workflow simplificado.
- Mantener commits pequeños y enfocados. Commits más pequeños son más fáciles de reordenar y dividir.
- Escribir mensajes de commit claros. El mensaje squashed debería describir el cambio completo.
- Testear después de rebase. Replayar commits puede introducir issues sutiles.
- Nunca hacer rebase de commits en branches compartidas (main, develop). Solo rebase tu propia feature branch.
- Usar `git reflog` para recuperar si un rebase sale mal. Reflog trackea todos los movimientos de head.

## Errores Comunes

- Hacer rebase de commits que ya se pushearon a branches compartidas. Esto rompe el historial de otros developers.
- Usar `git push --force` en lugar de `--force-with-lease`. El último es más seguro y previene pérdida de datos.
- Hacer squash de demasiados commits en uno. Los commits squashed grandes son difíciles de revisar y revertir.
- No testear después de rebase. Replayar commits puede introducir conflictos o bugs sutiles.
- Drop un commit del que dependen otros commits. Esto causa conflictos en commits subsecuentes.
- Olvidar `git rebase --continue` después de resolver un conflicto. El rebase se queda pausado.
- Entrar en pánico durante un rebase que sale mal. Usar `git rebase --abort` para cancelar y volver al estado original.
- No usar `git reflog` para recuperación. Reflog tiene todos los movimientos de head, incluso después de un mal rebase.

## Preguntas Frecuentes

### ¿Es seguro el rebase interactivo?

Sí, en tu propia feature branch que nadie más ha pulleado. Nunca hacer rebase de commits en branches compartidas como main o develop. Si un rebase sale mal, `git rebase --abort` lo cancela y `git reflog` recupera estados anteriores.

### ¿Cuál es la diferencia entre squash y fixup?

Squash combina el commit con el anterior y abre un editor para fusionar mensajes de commit. Fixup hace lo mismo pero descarta el mensaje del commit completamente. Usar squash cuando el mensaje tiene información útil. Usar fixup para commits WIP o typo-fix.

### ¿Cómo me recupero de un mal rebase?

Usar `git reflog` para encontrar el hash del commit antes del rebase, luego `git reset --hard <hash>` para restaurar. Reflog trackea cada movimiento de head, así que nada se pierde realmente.

### ¿Debo hacer rebase antes de mergear un PR?

Sí. Hacer rebase de tu feature branch sobre el último main antes de mergear mantiene el historial lineal y limpio. Hacer squash de commits WIP, reword mensajes poco claros, y drop commits innecesarios antes del merge final.

### ¿Cuál es la diferencia entre `git rebase` y `git merge`?

`git merge` crea un commit de merge que preserva el historial completo de la rama con ambos commits padre. `git rebase` re-reproduce tus commits sobre la rama target, produciendo un historial lineal sin commit de merge. Usa merge para ramas compartidas (main, develop) para preservar contexto. Usa rebase para feature branches privadas para mantener el historial limpio.

### ¿Cómo resuelvo conflictos durante un rebase interactivo?

Cuando ocurre un conflicto, Git pausa el rebase. Corrige los archivos en conflicto, haz `git add`, luego `git rebase --continue` para resumir. Usa `git rebase --abort` para cancelar y volver al estado pre-rebase. Usa `git rebase --skip` para descartar el commit actual si ya está aplicado. Siempre resuelve conflictos en lotes pequeños — rebasea un commit a la vez en lugar de todos a la vez.

## Errores Comunes

- Rebasear ramas compartidas que otros ya hicieron pull — reescribe el historial público y rompe los repos de los teammates
- No usar `git stash` antes de iniciar un rebase con cambios sin commitear
- Hacer squash de demasiados commits en uno solo — hace el commit resultante difícil de revisar y revertir
- Olvidar que los comandos `exec` se ejecutan en el repo root, no en el directorio de trabajo original
- Usar `drop` en commits de los que dependen otros commits — puede causar conflictos inesperados durante el replay
- No comunicarse con el equipo antes de reescribir el historial de ramas compartidas — siempre coordina operaciones de rebase en ramas colaborativas
- Rebasear más de ~20 commits a la vez — incrementa la superficie de conflicto y hace la recuperación más difícil si algo sale mal
- No testear el build después de un rebase — rebasear puede romper código silenciosamente si un commit dependía de un cambio previo que fue reordenado
- Olvidar force-push con `--force-with-lease` en lugar de `--force` — la variante lease es más segura porque verifica cambios remotos
