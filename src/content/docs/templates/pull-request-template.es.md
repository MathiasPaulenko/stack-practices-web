---
contentType: docs
templateType: pr-template
slug: pull-request-template
title: "Plantilla de Pull Request"
description: "Plantilla de pull request completa para estandarizar code reviews y mejorar la calidad de merges."
metaDescription: "Plantilla de pull request para code reviews consistentes. Incluye cambios, testing, checklists e issues relacionados."
difficulty: beginner
topics:
  - devops
tags:
  - pull-request
  - code-review
  - git
  - workflow
relatedResources:
  - /es/docs/contributing-guide
  - /es/docs/adr-template
  - /es/guides/cicd-pipeline-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Plantilla de pull request para code reviews consistentes. Incluye cambios, testing, checklists e issues relacionados."
---

## Resumen

Una plantilla de pull request estandariza la información provista al enviar cambios de código. Asegura que los revisores tengan contexto y que los autores verifiquen su trabajo antes de solicitar revisión.

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

## Buenas Prácticas

- **Manténlo conciso**: Plantillas largas desaniman completarlas
- **Usa checkboxes**: Fáciles de escanear, difíciles de olvidar
- **Enlaza issues**: Siempre referencia tickets relacionados
- **Incluye screenshots**: Para cambios UI, la prueba visual es esencial
- **Automatiza donde sea posible**: Deja que CI verifique lo que los bots pueden

## Errores Comunes

- **Plantillas vacías**: Enviar sin completar las secciones requeridas
- **Tests faltantes**: Olvidar actualizar o agregar tests
- **Sin enlaces a issues**: Hace más difícil rastrear el contexto
