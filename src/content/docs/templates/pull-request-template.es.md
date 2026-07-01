---
contentType: docs
templateType: pr-template
slug: pull-request-template
title: "Plantilla de Pull Request"
description: "Plantilla de pull request completa para estandarizar code reviews y mejorar la calidad de merges."
metaDescription: "Plantilla de pull request para code reviews estandarizados con descripción, tipo de cambio, checklist de testing e issues relacionados."
difficulty: beginner
topics:
  - devops
tags:
  - code-review
  - devops
  - git
  - pull-request
  - workflow
relatedResources:
  - /docs/contributing-guide
  - /docs/adr-template
  - /guides/cicd-pipeline-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Plantilla de pull request para code reviews estandarizados con descripción, tipo de cambio, checklist de testing e issues relacionados."
  keywords:
    - plantilla pull request
    - checklist code review
    - pr template
    - github pull request
    - estándares code review
---

## Resumen

Una plantilla de pull request estandariza la información provista al enviar cambios de código. Consulta la [Guía de Contribución](/docs/templates/contributing-guide) para estándares de equipo y [Lo que Funciona en Code Review](/guides/design/code-review-best-practices-guide) para cultura de revisión. Asegura que los revisores tengan contexto y que los autores verifiquen su trabajo antes de solicitar revisión.

## Cuándo Usar

- Tu equipo hace code reviews en cada cambio
- Quieres reducir ida y vuelta en las reviews
- Necesitas hacer cumplir estándares de testing o documentación
- Manejas un proyecto open-source con colaboradores externos

## Plantilla

```markdown
## Descripción

[Descripción corta del cambio y su propósito]

Fixes # (issue)

## Tipo de Cambio

- [ ] Bug fix (cambio no breaking que corrige un issue)
- [ ] Nueva funcionalidad (cambio no breaking que agrega funcionalidad)
- [ ] Breaking change (fix o feature que rompe funcionalidad existente)
- [ ] Actualización de documentación
- [ ] Refactorización (sin cambios funcionales)
- [ ] Mejora de performance
- [ ] Actualización de dependencias

## Cambios Realizados

- [Cambio 1]
- [Cambio 2]
- [Cambio 3]

## Testing

- [ ] Tests unitarios agregados/actualizados
- [ ] Tests de integración pasan
- [ ] Testing manual realizado
- [ ] Casos edge cubiertos

### Evidencia de Testing

[Incluye screenshots, logs o comandos usados para testing]

## Checklist

- [ ] El código sigue las guías de estilo del proyecto
- [ ] Autoreview completado
- [ ] Comentarios agregados para lógica compleja
- [ ] Documentación actualizada (si aplica)
- [ ] Sin nuevas warnings o errores introducidos
- [ ] Pipeline CI/CD pasa
```

## Secciones de la Plantilla

| Sección | Propósito |
|---------|-----------|
| **Descripción** | Contexto para los revisores |
| **Tipo de Cambio** | Categoriza el PR |
| **Cambios Realizados** | Lista de modificaciones |
| **Testing** | Evidencia de que los cambios funcionan |
| **Checklist** | Autoverificación antes de review |

## Lo que funciona

- **Manténlo conciso**: Plantillas largas desaniman completarlas
- **Usa checkboxes**: Fáciles de escanear, difíciles de olvidar
- **Enlaza issues**: Siempre referencia tickets relacionados. Usa la [Plantilla de Reporte de Bug](/docs/templates/bug-report-template) o la [Plantilla de Solicitud de Feature](/docs/templates/feature-request-template) para estructura de issues.
- **Incluye screenshots**: Para cambios UI, la prueba visual es esencial
- **Automatiza donde sea posible**: Deja que CI verifique lo que los bots pueden. Consulta la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para automatización.

## Errores Comunes

- **Plantillas vacías**: Enviar sin completar las secciones requeridas
- **Tests faltantes**: Olvidar actualizar o agregar tests. Consulta la [Guía de Estrategia de Testing](/guides/testing/testing-strategy-guide) para estándares de cobertura.
- **Sin enlaces a issues**: Hace más difícil rastrear el contexto

## Preguntas Frecuentes

### Cada pull request debería usar una plantilla?

Sí. Las plantillas aseguran que los reviewers obtengan contexto consistente y que los autores verifiquen su trabajo. Consulta [Lo que Funciona en Code Review](/guides/design/code-review-best-practices-guide) para cultura. Incluso fixes pequeños se benefician de una breve descripción y confirmación de testing.

### Qué tan detallada debería ser la sección de testing?

Incluye suficiente detalle para que un reviewer pueda reproducir tus tests. Para cambios UI, adjunta screenshots o GIFs. Para cambios de API, incluye requests y responses de ejemplo.

### Qué pasa si una plantilla de PR se siente muy pesada para mi equipo?

Empieza con una plantilla mínima: descripción, tipo de cambio y un checklist de 3 items. Expande usando estándares de la [Guía de Contribución](/docs/templates/contributing-guide). Expande secciones solo cuando notes brechas de información en las reviews.
