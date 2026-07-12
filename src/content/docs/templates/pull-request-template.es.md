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
  - /recipes/git-workflow
  - /guides/code-review-best-practices-guide
  - /guides/git-branching-strategies-guide
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

## Lifecycle

### Fase draft

Crea el PR como draft. Completa la descripción y el tipo de cambio. Usa la variante de plantilla draft para especificar qué está hecho y qué falta. Solicita feedback temprano sobre el enfoque.

### Listo para review

Marca el PR como listo para review. Completa todas las secciones de la plantilla: cambios realizados, evidencia de testing y checklist. Asigna reviewers. Asegura que CI pase antes de solicitar review.

### Iteraciones de review

Addressa los comentarios de los reviewers. Actualiza la descripción del PR si el scope cambia. Re-corre tests después de cada push. Mantén el checklist actualizado — si agregas cambios, verifica que el checklist siga aplicando.

### Merge

Una vez aprobado y CI verde, mergea. Elimina la feature branch. Enlaza el PR en las release notes si el cambio es user-facing. Archiva cualquier discusión de diseño para referencia futura.

## Ejemplo Completo

```markdown
## Descripción

Agregar middleware de rate limiting a la API pública usando algoritmo de token bucket.
Previene abuso limitando cada IP a 100 requests por minuto.

Fixes #142

## Tipo de Cambio

- [x] Nueva funcionalidad (cambio no breaking que agrega funcionalidad)

## Cambios Realizados

- Agregado `rateLimiter.ts` middleware con algoritmo token bucket
- Aplicado middleware a todas las rutas `/api/v1/` en `router.ts`
- Agregado env var `RATE_LIMIT_PER_MINUTE` (default: 100)
- Actualizado `.env.example` con nueva variable

## Testing

- [x] Tests unitarios agregados para lógica de token bucket (8 casos)
- [x] Tests de integración pasan (existentes + 3 nuevos)
- [x] Testing manual realizado (curl con requests rápidos)
- [x] Casos edge cubiertos (burst traffic, rotación de IP, estado deshabilitado)

### Evidencia de Testing

```bash
# Rate limit activo
$ curl -I http://localhost:3000/api/v1/users
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99

# Después de 100 requests
$ curl -I http://localhost:3000/api/v1/users
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## Checklist

- [x] El código sigue las guías de estilo del proyecto
- [x] Autoreview completado
- [x] Comentarios agregados para lógica compleja (math de token bucket)
- [x] Documentación actualizada (sección README de API)
- [x] Sin nuevas warnings o errores introducidos
- [x] Pipeline CI/CD pasa
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
- **Requiere evidencia de testing**: Screenshots, logs o comandos prueban que el cambio funciona
- **Agrega sección de breaking changes**: Destaca cualquier cosa que requiera migración

## Errores Comunes

- **Plantillas vacías**: Enviar sin completar las secciones requeridas
- **Tests faltantes**: Olvidar actualizar o agregar tests. Consulta la [Guía de Estrategia de Testing](/guides/testing/testing-strategy-guide) para estándares de cobertura.
- **Sin enlaces a issues**: Hace más difícil rastrear el contexto
- **PRs grandes**: Cambios de más de 500 líneas son difíciles de revisar; divide en PRs más pequeños
- **Sin descripción del porqué**: Los reviewers necesitan la motivación, no solo el qué
- **Ignorar fallos de CI**: Mergear con CI rojo es una receta para main roto

## Variantes

### Plantilla de PR hotfix

Para fixes urgentes de producción, usa una plantilla mínima: descripción, root cause, resumen del fix y plan de rollback. Omite el checklist extenso de testing — los hotfixes necesitan velocidad. Requiere follow-up post-merge para agregar tests y documentación.

### Plantilla de PR para contribución open-source

Para contribuyentes externos, agrega: checkbox de contributor license agreement, disclosure de breaking changes y un checkbox "he leído las guías de contribución". Mantenlo acogedor pero exhaustivo. Consulta la [Guía de Contribución](/docs/templates/contributing-guide) para estándares.

### Plantilla de PR draft

Para PRs work-in-progress, usa una plantilla mínima: qué estoy construyendo, qué está hecho, qué falta y feedback específico solicitado. Marca como draft para prevenir review prematura.

## Automatización

### Integración con GitHub Actions

```yaml
name: PR Validation
on:
  pull_request:
    types: [opened, edited, reopened, synchronize]

jobs:
  validate-pr:
    runs-on: ubuntu-latest
    steps:
      - name: Check PR title
        uses: amannn/action-semantic-pull-request@v5
        with:
          types: |
            fix
            feat
            docs
            refactor
            chore
      - name: Verify checklist
        uses: actions/github-script@v6
        with:
          script: |
            const body = context.payload.pull_request.body || '';
            const required = ['## Descripción', '## Tipo de Cambio', '## Checklist'];
            for (const section of required) {
              if (!body.includes(section)) {
                core.setFailed(`Sección faltante: ${section}`);
              }
            }
```

### Auto-asignación

Configura GitHub para auto-asignar reviewers basado en el archivo CODEOWNERS. Esto asegura que las personas correctas revisen cada PR sin asignación manual.

### Merge queue

Usa GitHub merge queues para serializar merges y prevenir conflictos. Cada PR se rebasa sobre el último main antes de mergear, detectando issues de integración temprano.

## Preguntas Frecuentes

### Cada pull request debería usar una plantilla?

Sí. Las plantillas aseguran que los reviewers obtengan contexto consistente y que los autores verifiquen su trabajo. Consulta [Lo que Funciona en Code Review](/guides/design/code-review-best-practices-guide) para cultura. Incluso fixes pequeños se benefician de una breve descripción y confirmación de testing.

### Qué tan detallada debería ser la sección de testing?

Incluye suficiente detalle para que un reviewer pueda reproducir tus tests. Para cambios UI, adjunta screenshots o GIFs. Para cambios de API, incluye requests y responses de ejemplo. Para bug fixes, describe los pasos para reproducir el issue original y confirmar el fix.

### Qué pasa si una plantilla de PR se siente muy pesada para mi equipo?

Empieza con una plantilla mínima: descripción, tipo de cambio y un checklist de 3 items. Expande usando estándares de la [Guía de Contribución](/docs/templates/contributing-guide). Expande secciones solo cuando notes brechas de información en las reviews.

### Cómo hago cumplir la plantilla en GitHub?

Coloca el archivo de plantilla en `.github/pull_request_template.md` en tu repositorio. GitHub automáticamente popula la descripción del PR con el contenido de la plantilla. Para múltiples plantillas, usa el directorio `.github/PULL_REQUEST_TEMPLATE/` con plantillas condicionales.

### Debería requerir approvals antes de mergear?

Para código de producción: sí, al menos un approval de un non-author. Para cambios de alto riesgo (seguridad, pagos, infraestructura): requiere dos approvals. Para devs solos: self-review con checklist es el mínimo. Consulta [Lo que Funciona en Code Review](/guides/design/code-review-best-practices-guide) para estrategias de approval.

### Qué tan grande debería ser un PR?

Apunta a menos de 400 líneas de cambios. PRs de más de 500 líneas reciben reviews menos exhaustivos. Si un cambio es naturalmente grande, divídelo en una serie de PRs más pequeños: refactor primero, luego agrega la feature. Los reviewers pueden evaluar cada pieza más efectivamente.

### Qué debería hacer si CI falla en mi PR?

Lee los logs de CI. Fix el fallo localmente, pusha el fix, y deja que CI re-corra. Nunca mergees un PR con CI fallido — un pipeline rojo significa que algo está roto. Si el fallo es flaky (test intermitente), re-corre el job una vez. Si falla de nuevo, investiga el root cause.

### Cómo manejo feedback conflictivo de reviewers?

Cuando dos reviewers dan feedback conflictivo, pídeles que discutan en los comentarios del PR. Si no pueden acordar, el tech lead o maintainer toma la decisión final. Documenta la decisión en la descripción del PR para que futuros lectores entiendan el razonamiento.

### Debería squash commits antes de mergear?

Para feature branches: sí, squash y merge para mantener el history limpio. Para branches long-lived con commit history significativo: usa un merge commit para preservar contexto. Configura GitHub branch protection para hacer cumplir la estrategia de merge preferida.

### Cómo hago self-review de mi PR antes de solicitar review?

Lee cada línea del diff. Verifica: imports sin usar, código de debug, comentarios TODO, valores hardcodeados y tests faltantes. Corre el linter y formatter. Verifica que CI pase. Self-review detecta 50% de los issues antes de que un reviewer los vea.

### Cómo manejo un PR que toca múltiples servicios?

Divídelo en un PR por servicio si es posible. Si los cambios deben shippear juntos (e.g., un cambio de contrato), coordina el orden de deployment. Documenta la secuencia de deployment en la descripción del PR. Taguea a todos los service owners como reviewers.

### Qué pasa si mi PR incluye código generado?

No incluyas archivos generados en el diff. Agrégalos a `.gitattributes` con `linguist-generated=true` para que GitHub los oculte por defecto. Documenta el paso de generación en la descripción del PR. Los reviewers deberían enfocarse en los cambios del source, no en el output.

### Cómo manejo feature branches de larga duración?

Rebasea frecuentemente contra main para evitar grandes conflictos de merge. Considera dividir la feature en PRs más pequeños que se puedan mergear incrementalmente. Usa feature flags para mergear trabajo incompleto detrás de un flag deshabilitado. Las branches long-lived acumulan conflictos y son más difíciles de revisar.
