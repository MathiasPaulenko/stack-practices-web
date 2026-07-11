---
contentType: docs
slug: contributing-guide
templateType: guideline
title: "Plantilla de Guía de Contribución"
description: "Una plantilla lista para usar con directrices de contribución para proyectos open-source e internos."
metaDescription: "Usa esta plantilla de guía de contribución para configurar flujos de pull request, estándares de código y onboarding de contribuidores."
difficulty: beginner
topics:
  - devops
tags:
  - comunidad
  - devops
  - onboarding
  - open-source
  - template
relatedResources:
  - /docs/templates/readme-template
  - /recipes/devops/git-workflow
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa esta plantilla de guía de contribución para configurar flujos de pull request, estándares de código y onboarding de contribuidores."
  keywords:
    - guia de contribucion
    - plantilla de contribucion
    - directrices open source
    - plantilla pull request
    - onboarding desarrolladores
---

## Estructura de la plantilla

Usa esta plantilla para crear un archivo `CONTRIBUTING.md` en tu repositorio.

---

# Contribuyendo a [Nombre del Proyecto]

¡Gracias por tu interés en contribuir! Este documento te guiará a través del proceso.

## Tabla de contenidos

- [Primeros pasos](#primeros-pasos)
- [Cómo contribuir](#cómo-contribuir)
- [Configuración de desarrollo](#configuración-de-desarrollo)
- [Estándares de código](#estándares-de-código)
- [Proceso de pull request](#proceso-de-pull-request)
- [Reportar bugs](#reportar-bugs)
- [Directrices de la comunidad](#directrices-de-la-comunidad)

## Primeros pasos

### Prerrequisitos

- [Tool/Runtime] versión X o superior
- [Package manager] instalado
- Una cuenta de GitHub

### Encontrar issues para trabajar

- Revisa las etiquetas [good first issue](link)
- Navega [issues abiertos](link) y comenta para reclamar
- Abre un issue nuevo si encuentras un bug o tienes una solicitud de capacidad

## Cómo contribuir

### Reportar bugs

1. Busca issues existentes primero
2. Abre un issue nuevo con la [plantilla de reporte de bug](/docs/templates/bug-report-template)
3. Incluye:
   - Pasos para reproducir
   - Comportamiento esperado
   - Comportamiento actual
   - Detalles del entorno (OS, versión, etc.)
   - Capturas de pantalla o logs si aplica

### Sugerir capacidades

1. Abre un issue nuevo con la [plantilla de solicitud de capacidad](/docs/templates/feature-request-template)
2. Describe el problema y la solución propuesta
3. Discute con los mantenedores antes de invertir esfuerzo mayor

## Configuración de desarrollo

```bash
# 1. Hacer fork y clonar
git clone https://github.com/[org]/[repo].git
cd [repo]

# 2. Instalar dependencias
[install command]

# 3. Crear una rama
git checkout -b feature/nombre-de-tu-feature

# 4. Verificar configuración
[test command]
```

## Estándares de código

### Guía de estilo

- Sigue [convenciones de lenguaje/framework]
- Ejecuta el linter antes de hacer commit: `[lint command]`
- Formatea el código con: `[format command]`

### Mensajes de commit

Usa conventional commits:

```
feat: add new feature
fix: resolve bug in module
docs: update documentation
refactor: restructure code
test: add missing tests
chore: update dependencies
```

### Testing

- Agrega tests para nuevas capacidades
- Asegúrate de que todos los tests pasen: `[test command]`
- Apunta a [coverage target]% de cobertura de código

## Proceso de pull request

1. **Nombrado de ramas**: `feature/descripcion`, `fix/descripcion`, `docs/descripcion`
2. **Commit**: Sigue el formato de conventional commits
3. **Push**: Sube a tu fork
4. **Abrir PR**: Usa la plantilla de pull request
5. **Revisión**: Responde al feedback de los revisores
6. **Merge**: Los mantenedores harán merge una vez aprobado

### Checklist de PR

- [ ] Tests agregados o actualizados
- [ ] Documentación actualizada
- [ ] Linter pasa
- [ ] Mensajes de commit siguen la convención
- [ ] Descripción del PR es clara y completa

## Directrices de la comunidad

### [Código de Conducta](/docs/templates/code-of-conduct-template)

- Sé respetuoso e inclusivo
- Enfócate en feedback constructivo
- Asume buena intención
- Reporta acoso a [contact email]

### Reconocimiento

Los contribuidores serán:
- Listados en el [README](/docs/templates/readme-template) o archivo CONTRIBUTORS
- Mencionados en las release notes
- Acreditados apropiadamente en la historia del proyecto

## ¿Preguntas?

- Abre una [Discussion](link) para preguntas generales
- Únete a nuestro [Discord/Slack](link) para chat en tiempo real
- Email [contact email] para consultas privadas

## Preguntas Frecuentes

### Necesito firmar un CLA antes de contribuir?

Muchos proyectos usan un Contributor License Agreement (CLA) o Developer Certificate of Origin (DCO). Revisa el repositorio por un archivo `CONTRIBUTING.md` o `CLA.md`. Algunos proyectos aceptan contribuciones sin acuerdo formal.

### Cómo encuentro issues para trabajar?

Busca labels como `good first issue`, `help wanted` o `beginner-friendly` en el issue tracker. Estos son curados por mantenedores para nuevos contribuidores.

### Qué pasa si mi contribución es rechazada?

No lo tomes personalmente. Los mantenedores pueden rechazar contribuciones que no se alinean con los objetivos del proyecto o necesitan rework mayor. Pide feedback específico e itera. Cada proyecto tiene diferentes estándares y prioridades.


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Open source | Guia publica con CLA | Incluir codigo de conducta y proceso de CLA |
| Proyecto interno | Guia con workflow de CI/CD | Enfocarse en estandares internos |
| Monorepo | Guia con reglas de scope | Incluir que va en cada paquete |
| Libreria | Guia con versionado semver | Incluir politica de breaking changes |

## Ejemplo de Flujo de Contribucion

```text
=== Flujo: De idea a merge ===

1. Propuesta
   - Crear issue describiendo el problema o feature
   - Para features grandes: crear RFC (Request for Comments)
   - Esperar feedback de maintainers antes de empezar

2. Setup
   - Hacer fork del repo (o branch si es interno)
   - Clonar localmente
   - Instalar dependencias: npm install
   - Correr tests: npm test
   - Correr linter: npm run lint

3. Implementacion
   - Crear branch desde main: git checkout -b feature/descripcion-corta
   - Escribir codigo siguiendo los estandares del proyecto
   - Escribir o actualizar tests
   - Actualizar documentacion si es necesario
   - Commit con mensaje convencional: feat: agrega validacion de email

4. Verificacion Local
   - npm test (todos los tests pasan)
   - npm run lint (sin errores)
   - npm run build (compila sin errores)
   - Verificar que no hay cambios no relacionados

5. Pull Request
   - Push al fork/branch
   - Crear PR con la plantilla del proyecto
   - Descripcion clara del cambio y el por que
   - Linkear el issue relacionado: "Closes #123"
   - Adjuntar screenshots si hay cambios de UI
   - Esperar CI: todos los checks deben pasar

6. Code Review
   - Responder a comentarios de review
   - Hacer cambios solicitados
   - Marcar conversaciones como resueltas
   - No forzar merge si hay objections de maintainers
   - Squash commits si es necesario

7. Merge
   - Maintainer aprueba y mergea
   - Branch eliminada despues del merge
   - Issue cerrado automaticamente
```

### Como manejamos contribuciones de la comunidad?

Para contribuciones externas: ten un archivo CONTRIBUTING.md claro y publico. Usa un CLA (Contributor License Agreement) si es necesario para proteccion legal. Responde a issues y PRs dentro de 7 dias — la falta de respuesta desanima a contribuidores. Usa etiquetas: "good first issue", "help wanted", "needs review" para guiar a contribuidores. Manten un codigo de conducta (Contributor Covenant) y enforce lo. Crea una guia de estilo de codigo. Usa plantillas de issue y PR. Reconoce a contribuidores en el README o en un archivo CONTRIBUTORS. Para contribuciones grandes: pide un RFC primero. La comunidad es tu mayor activo — tratala bien.

### Como manejamos breaking changes en contribuciones?

Para breaking changes: etiqueta el PR como "breaking change". Requiere aprobacion de al menos 2 maintainers. Documenta el cambio en CHANGELOG con instrucciones de migracion. Si el proyecto usa semver: el merge debe ir en un release major (v2.x -> v3.0). Proporciona un codemod o script de migracion si es posible. Comunica el breaking change con anticipacion: deprecation warning en la version anterior, nota en el README, y post en el blog/chat. Para librerias: publica una version beta primero para que los usuarios puedan probar. Nunca merges un breaking change sin un plan de comunicacion — los usuarios se enteraran cuando sus tests fallen.

### Como mantenemos la calidad de las contribuciones?

Usa CI/CD para enforce calidad: linter, tests, build, y coverage en cada PR. Requiere que todos los checks pasen antes del merge. Usa protection rules en GitHub: require review de N maintainers, require status checks, require branches actualizadas. Manten un estandar de code review: revisa logica, tests, documentacion, y estilo. Da feedback constructivo — no "esto esta mal" sino "considera usar X porque Y". Cierra PRs que no han tenido actividad en 30 dias. Para contribuidores nuevos: se mas paciente y ofrece mas guia. La calidad es un balance — no seas tan estricto que ahuyentes contribuidores ni tan laxo que el codigo se degrade.















































End of document. Review and update quarterly.