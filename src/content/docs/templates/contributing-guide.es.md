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
  - contributing
  - template
  - open-source
  - guidelines
  - onboarding
  - comunidad
relatedResources:
  - /docs/templates/readme-template
  - /recipes/devops/git-workflow
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-10"
author: "StackPractices"
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
- Abre un issue nuevo si encuentras un bug o tienes una solicitud de feature

## Cómo contribuir

### Reportar bugs

1. Busca issues existentes primero
2. Abre un issue nuevo con la plantilla de reporte de bug
3. Incluye:
   - Pasos para reproducir
   - Comportamiento esperado
   - Comportamiento actual
   - Detalles del entorno (OS, versión, etc.)
   - Capturas de pantalla o logs si aplica

### Sugerir features

1. Abre un issue nuevo con la plantilla de solicitud de feature
2. Describe el problema y la solución propuesta
3. Discute con los mantenedores antes de invertir esfuerzo significativo

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

- Agrega tests para nuevas features
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

### Código de conducta

- Sé respetuoso e inclusivo
- Enfócate en feedback constructivo
- Asume buena intención
- Reporta acoso a [contact email]

### Reconocimiento

Los contribuidores serán:
- Listados en el README o archivo CONTRIBUTORS
- Mencionados en las release notes
- Acreditados apropiadamente en la historia del proyecto

## ¿Preguntas?

- Abre una [Discussion](link) para preguntas generales
- Únete a nuestro [Discord/Slack](link) para chat en tiempo real
- Email [contact email] para consultas privadas
