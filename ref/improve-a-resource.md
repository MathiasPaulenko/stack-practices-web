# Mini prompt — Mejorar recurso con content-improvement

> Copia y pega este prompt para ejecutar el skill `content-improvement` en modo full
> sobre un recurso, usando el checklist de auditoría como input.
> El agente aplicará los arreglos del checklist, validará y pedirá aprobación
> antes de commit.

---

## Prompt

```text
Mejora el recurso número 1 de ref/checklist-top-recursos-mejoras.md en modo full,
usando el checklist de auditoría como input.

Instrucciones:

1. Lee ref/checklist-top-recursos-mejoras.md y extrae el slug y tipo del recurso {N}.
2. Lee el checklist de auditoría en:
   ref/audit/reports/{tipo}-{slug}-audit.md
   Si no existe, detente y píde al usuario que ejecute primero la auditoría
   con el prompt de ref/audit-a-resource.md.
3. Lee los archivos EN y ES del recurso:
   - src/content/{tipo}/{topic}/{slug}.md
   - src/content/{tipo}/{topic}/{slug}.es.md
4. Lee los AGENTS.md que aplican:
   - AGENTS.md (raíz)
   - src/content/{tipo}/AGENTS.md
5. Invoca el skill content-improvement en modo full y sigue sus 5 fases:
   - Fase 0: Diagnóstico (estado base, thin content check, imágenes/diagramas, stack-practices-resources)
   - Fase 1: Quick wins SEO/frontmatter (máximo 5 cambios)
   - Fase 2: Calidad + IA (máximo 4 rondas con Desklib)
   - Fase 3: Paridad EN/ES
   - Fase 4: Validación técnica (parar en el primer fallo)
   - Fase 5: Resumen y aprobación
6. Usa el checklist de auditoría para priorizar los arreglos:
   - Aplica primero los items CRITICAL y HIGH del checklist.
   - Luego los MEDIUM que estén dentro del scope del skill.
   - Los items LOW y los que requieren trabajo manual fuera del skill
     (ej: speakable schema, HTTP 301, assets descargables, diagramas Mermaid,
     subir código a stack-practices-resources) márcalos como
     "OUT OF SCOPE — requiere trabajo manual" en el resumen final.
   - En la Fase 0, verifica si el recurso tiene imágenes/diagramas (bloques
     `mermaid`, etiquetas `![alt](...)`, referencias a `public/assets/`).
     Si no tiene y se beneficiaría de uno (ej: flujos de arquitectura,
     comparaciones visuales, decision trees), márcalo como recomendación
     en el resumen final. No añadas diagramas automáticamente.
   - En la Fase 0, verifica si existe
     `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`.
     Si no existe, márcalo como recomendación en el resumen final
     (OUT OF SCOPE, requiere trabajo manual en el repo hermano).
7. Antes de editar, verifica el estado del working tree con git status
   para no sobrescribir cambios manuales del usuario.

Reglas críticas:
- No inventes reglas que no están en los AGENTS.md. El checklist puede
  contener hallazgos que ya fueron corregidos en AGENTS.md — ignora los
  hallazgos que contradigan las reglas actuales.
- El layout RecipeArticle.astro renderiza el H1 desde el title. NO agregues
  H1 al body.
- Las secciones "What Works", "Troubleshooting", "See Also", "Further Reading"
  son válidas. NO las elimines ni las renombres.
- No hay límite máximo de FAQ. El mínimo es 3-5. NO reduzcas FAQ a menos
  que el checklist lo indique como item MEDIUM con justificación.
- metaDescription: 50-160 recomendado, 170 hard max.
- No elimines contenido técnico para bajar la puntuación IA.
- No inventes herramientas, versiones, normas o datos.
- No hagas commit/push sin aprobación explícita del usuario.
- Ejecuta la validación en orden y para en el primer fallo:
  npm run content:quality
  npm run content:links
  npm run content:validate
  npm run check
  npm run build
  npm run sitemap
- Al final, muestra git status, git diff --stat, un resumen tabular de
  cambios, estado de imágenes/diagramas, estado de stack-practices-resources,
  items OUT OF SCOPE, y pide aprobación para commit/push.
```

---

## Uso

Reemplaza `{N}` con el número del recurso (ej: `1`). El `{tipo}` y `{slug}`
se infieren automáticamente del checklist.

### Requisito previo

El recurso debe tener un checklist de auditoría en
`ref/audit/reports/{tipo}-{slug}-audit.md`. Si no existe, ejecuta primero el
prompt de `ref/audit-a-resource.md`.

### Ejemplo

```text
Mejora el recurso número 1 de ref/checklist-top-recursos-mejoras.md en modo full,
usando el checklist de auditoría como input.
```

El agente leerá `ref/audit/reports/recipes-api-documentation-openapi-audit.md`,
aplicará los arreglos del checklist siguiendo las 5 fases del skill
`content-improvement`, validará con la secuencia de comandos y pedirá
aprobación antes de commit.
