# Flujo de mejora de contenido

> Referencia para auditar y mejorar recursos del checklist
> `ref/checklist-top-recursos-mejoras.md`.

## Resumen del flujo

```text
ref/checklist-top-recursos-mejoras.md
         │
         ▼
   ┌─────────────┐
   │  1. AUDITAR │  ref/audit-a-resource.md
   │  (7 sub)    │  → ref/audit/reports/{tipo}-{slug}-audit.md
   └──────┬──────┘
          │  score inicial
          ▼
   ┌─────────────┐
   │  2. ARREGLAR│  ref/improve-a-resource.md
   │  (5 fases)  │  → content-improvement skill
   └──────┬──────┘
          │  edits EN/ES + validación
          ▼
   ┌─────────────┐
   │  3. RE-AUDIT│  ref/audit-a-resource.md (de nuevo)
   │  (7 sub)    │  → checklist actualizado
   └──────┬──────┘
          │  score comparativo
          ▼
   ┌─────────────┐
   │  4. RESUMEN │  git commit (sin push sin aprobación)
   │             │  → pendientes MEDIUM/LOW
   └─────────────┘
```

## Paso 1 — Auditar

**Prompt:** `ref/audit-a-resource.md` con el número del recurso del checklist.

**Qué hace:**

- Lee el recurso EN+ES, los AGENTS.md aplicables y el roadmap.
- Lanza 7 sub-auditorías en paralelo:
  1. `01-technical-audit.md`
  2. `02-seo-audit.md`
  3. `03-content-quality-audit.md`
  4. `04-humanization-audit.md`
  5. `05-bilingual-parity-audit.md`
  6. `06-geo-audit.md`
  7. `08-gsc-ga4-traffic-audit.md`
- Sintetiza con `07-final-synthesis.md`.
- Escribe un checklist en `ref/audit/reports/{tipo}-{slug}-audit.md`.
- **No edita archivos del recurso.**

**Output:** `ref/audit/reports/{tipo}-{slug}-audit.md` con scorecard,
checklist de arreglos por severidad (CRITICAL/HIGH/MEDIUM/LOW),
Definition of Done y Top 5 acciones.

**Reglas clave:**

- Usa los AGENTS.md como fuente de verdad. No inventes reglas.
- El layout renderiza el H1 desde el frontmatter. No es violación que el body empiece con `## Overview`.
- Secciones `What Works`, `Troubleshooting`, `See Also`, `Further Reading` son válidas.
- No hay máximo de FAQ. Mínimo 3-5.
- `metaDescription`: 50-160 recomendado, 170 hard max.
- Distingue FACT / OBSERVATION / RECOMMENDATION / NOT VERIFIED.
- Marca como NOT VERIFIED lo no verificable desde el código local (GSC, GA4, CWV).
- Verifica si el recurso tiene imágenes/diagramas (bloques `mermaid`, `![alt](...)`, `public/assets/`).
- Verifica si existe `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`.

## Paso 2 — Arreglar

**Prompt:** `ref/improve-a-resource.md` con el mismo número.

**Qué hace:** Invoca el skill `content-improvement` en modo full con 5 fases:

| Fase | Qué hace | Scope |
|---|---|---|
| 0 — Diagnóstico | Estado base, thin content check, imágenes/diagramas, companion repo | Solo lectura |
| 1 — Quick wins SEO | Máximo 5 cambios de frontmatter y primer encabezado | Frontmatter |
| 2 — Calidad + IA | Máximo 4 rondas con Desklib. Corregir tokens, primera persona, patrones | Body |
| 3 — Paridad EN/ES | Verificar equivalencia de secciones, código, frontmatter, enlaces | Ambos |
| 4 — Validación técnica | 6 comandos en orden, parar en primer fallo | Build |
| 5 — Resumen | git status, diff, tabla de cambios, aprobación para commit | Reporte |

**Validación (parar en el primer fallo):**

```bash
npm run content:quality
npm run content:links
npm run content:validate
npm run check
npm run build
npm run sitemap
```

**Reglas clave:**

- No inventes reglas que no están en los AGENTS.md.
- No agregues H1 al body (lo renderiza el layout).
- No elimines secciones válidas (`What Works`, `Troubleshooting`, etc.).
- No reduzcas FAQ a menos que el checklist lo indique con justificación.
- No elimines contenido técnico para bajar IA.
- No inventes herramientas, versiones, normas o datos.
- No hagas commit/push sin aprobación explícita.
- Items que requieren trabajo manual fuera del skill
  (speakable schema, diagramas Mermaid, companion repo)
  se marcan como OUT OF SCOPE.

## Paso 3 — Re-auditar

**Prompt:** Misma auditoría (`ref/audit-a-resource.md`) sobre el recurso ya mejorado.

**Qué hace:** Lanza las mismas 7 sub-auditorías en paralelo sobre los archivos modificados.

**Output:** Checklist actualizado en `ref/audit/reports/{tipo}-{slug}-audit.md` con:

- Score comparativo (antes vs después).
- Issues resueltos marcados como ✅.
- Issues pendientes con estado (PENDIENTE / OUT OF SCOPE / Opcional).
- Definition of Done actualizada.
- Top 5 acciones pendientes.

**Por qué re-auditar:**

- Verificar que los arreglos aplicados resolvieron los issues.
- Detectar nuevos issues introducidos por las ediciones.
- Confirmar que no se rompió paridad EN/ES.
- Obtener un score comparativo objetivo.

## Paso 4 — Resumen de mejoras

**Qué hace:**

- Muestra `git status` y `git diff --stat`.
- Resume en tabla: cambios de frontmatter, hallazgos corregidos,
  IA antes/después, paridad, validación, imágenes/diagramas,
  companion repo.
- Lista items OUT OF SCOPE.
- Pide aprobación para commit.
- Hace commit (sin push sin aprobación explícita).

**Formato de commits:**

Separar por naturaleza de cambios:

1. `fix(seo): ...` — cambios de metadata y humanización del recurso.
2. `feat(content-improvement): ...` — cambios al skill, prompts y reportes.
3. `docs(agents): ...` — cambios a AGENTS.md.

**Sin push sin aprobación explícita del usuario.**

## Ejemplo práctico: api-documentation-openapi

### Auditar (resultado inicial)

- Score inicial: **89.2/100**
- 2 CRITICAL (metaDescription ES 172 chars, metaDescription EN 162 chars)
- 3 HIGH (ES title 63 chars, sentence-ending code tokens, primera persona faltante en ES)
- 4 MEDIUM (FAQ excesivo, FAQ sin variedad, rule-of-three, speakable schema)
- 3 LOW (Key Takeaways redundante, Common Production Pitfalls solapado, comentarios en inglés en ES)

### Arreglar (cambios aplicados)

| Cambio | Archivo | Severidad |
|---|---|---|
| ES metaDescription 172→150 chars | `.es.md` | CRITICAL → ✅ |
| ES title 63→48 chars | `.es.md` | HIGH → ✅ |
| EN metaDescription 162→143 chars | `.md` | CRITICAL → ✅ |
| lastUpdated → 2026-08-25 | ambos | — |
| 7 sentence-ending tokens corregidos (EN) | `.md` | HIGH → ✅ |
| 14 sentence-ending tokens corregidos (ES) | `.es.md` | HIGH → ✅ |
| Primera persona en ES ("Suelo elegir...") | `.es.md` | HIGH → ✅ |

IA Detection (Desklib): EN 40.6%, ES 38.0%, patterns vacío en ambos.

Validación: los 6 comandos pasaron. Build: 3,258 páginas. Sitemap: 3,256 URLs.

### Re-auditar (score comparativo)

| Dimensión | Antes | Después | Cambio |
|---|---|---|---|
| Technical SEO | 7.5/10 | 9.5/10 | +2.0 |
| On-Page SEO | 13/15 | 14/15 | +1.0 |
| Content Quality | 23/25 | 24.5/25 | +1.5 |
| Humanization | 11/15 | 12/15 | +1.0 |
| Bilingual Parity | 7/10 | 9/10 | +2.0 |
| GEO | 4.5/5 | 4.3/5 | -0.2 |
| Traffic | 11/15 | 12/15 | +1.0 |
| **OVERALL** | **89.2** | **92.2** | **+3.0** |

Issues resueltos: 2 CRITICAL + 3 HIGH.
Issues pendientes: 5 MEDIUM + 5 LOW.

### Resumen (commits)

3 commits, sin push:

| Commit | Contenido |
|---|---|
| `17748af9` | `fix(seo)`: metadata + humanización del recurso |
| `13571ffb` | `feat(content-improvement)`: checks de Mermaid y companion repo en skill y prompts |
| `de6f3f49` | `docs(agents)`: AGENTS.md type-specific + reglas nuevas |

## Archivos del flujo

| Archivo | Propósito |
|---|---|
| `ref/checklist-top-recursos-mejoras.md` | Lista de recursos priorizados para mejorar |
| `ref/audit-a-resource.md` | Prompt reutilizable para auditar |
| `ref/improve-a-resource.md` | Prompt reutilizable para mejorar |
| `ref/audit/00-master-audit.md` | Prompt maestro que orquesta las 7 sub-auditorías |
| `ref/audit/01-technical-audit.md` | Sub-auditoría technical SEO |
| `ref/audit/02-seo-audit.md` | Sub-auditoría SEO on-page |
| `ref/audit/03-content-quality-audit.md` | Sub-auditoría calidad de contenido |
| `ref/audit/04-humanization-audit.md` | Sub-auditoría humanización y IA |
| `ref/audit/05-bilingual-parity-audit.md` | Sub-auditoría paridad EN/ES |
| `ref/audit/06-geo-audit.md` | Sub-auditoría GEO |
| `ref/audit/07-final-synthesis.md` | Síntesis final de las 7 sub-auditorías |
| `ref/audit/08-gsc-ga4-traffic-audit.md` | Sub-auditoría tráfico y growth |
| `ref/audit/reports/{tipo}-{slug}-audit.md` | Reporte de auditoría por recurso |
| `.devin/skills/content-improvement/SKILL.md` | Skill con las 5 fases de mejora |
| `src/content/{tipo}/AGENTS.md` | Reglas específicas por tipo de contenido |
| `AGENTS.md` | Reglas generales del proyecto |
