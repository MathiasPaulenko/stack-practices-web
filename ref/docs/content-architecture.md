# Arquitectura de Contenido — StackPractices

> Como esta estructurado el contenido, los schemas, las colecciones, y el flujo de creacion bilingue.

---

## 1. Content Collections (Astro)

StackPractices usa Astro Content Collections con Zod schemas para type safety.

### 1.1 Configuracion

Archivo: `src/content.config.ts`

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
```

### 1.2 Colecciones

| Coleccion | Ruta | Tipo de contenido |
|-----------|------|-------------------|
| `recipes` | `src/content/recipes/**/*.md` | Recetas de codigo |
| `patterns` | `src/content/patterns/**/*.md` | Patrones de diseno |
| `docs` | `src/content/docs/**/*.md` | Templates de documentacion |
| `guides` | `src/content/guides/**/*.md` | Guias largas |

### 1.3 Loader

```ts
loader: glob({
  pattern: '**/*.md',
  base: './src/content/recipes',
  generateId: ({ entry }) => entry.replace(/\.md$/, '')
})
```

El `id` de cada entrada es su path relativo sin extension. Las versiones ES terminan en `.es`, por ejemplo `data/parse-json.es`.

---

## 2. Schema Base

```ts
const baseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  metaDescription: z.string().min(50).max(170),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  topics: z.array(topicsEnum).min(1),
  tags: z.array(z.string()).min(1),
  relatedResources: z.array(z.string()).default([]),
  lastUpdated: z.coerce.date(),
  author: z.string().default('StackPractices'),
  draft: z.boolean().default(false),
  seo: z.object({
    metaDescription: z.string(),
    keywords: z.array(z.string()).default([]),
  }),
});
```

### 2.1 Campos Explicados

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `slug` | string | Si | URL amigable (`parse-json`) |
| `title` | string | Si | Titulo del articulo (H1) |
| `description` | string | Si | Descripcion corta para listados |
| `metaDescription` | string | Si | Meta tag description (50-170 chars) |
| `difficulty` | enum | Si | `beginner`, `intermediate`, `advanced` |
| `topics` | array | Si | Minimo 1 topic valido |
| `tags` | array | Si | Minimo 1 tag |
| `relatedResources` | array | No | Paths a recursos relacionados |
| `lastUpdated` | date | Si | Fecha de ultima actualizacion |
| `author` | string | No | Default: "StackPractices" |
| `draft` | boolean | No | Default: false |
| `seo.keywords` | array | No | Keywords adicionales |

### 2.2 Topics Validos

```ts
['data', 'api', 'authentication', 'file-handling', 'performance',
 'testing', 'architecture', 'design', 'devops', 'databases',
 'concurrency', 'security', 'ai', 'frontend', 'infrastructure',
 'messaging', 'observability', 'graphql', 'serverless', 'caching']
```

Para anadir un nuevo topic, editar `topicsEnum` en `src/content.config.ts`.

### 2.3 Schemas Especificos

**Patterns:**
```ts
schema: baseSchema.extend({
  contentType: z.literal('patterns'),
  category: z.enum(['creational', 'structural', 'behavioral', 'architectural']).optional(),
})
```

**Docs:**
```ts
schema: baseSchema.extend({
  contentType: z.literal('docs'),
  templateType: z.enum(['readme', 'adr', 'api-doc', 'runbook', ...]).optional(),
})
```

**Guides:**
```ts
schema: baseSchema.extend({
  contentType: z.literal('guides'),
  estimatedReadTime: z.number().optional(),
})
```

---

## 3. Internacionalizacion (EN + ES)

### 3.1 Convencion de Archivos

```
src/content/recipes/data/
  parse-json.md       <- Version EN (id: data/parse-json)
  parse-json.es.md    <- Version ES (id: data/parse-json.es)
```

### 3.2 Filtrado en Queries

```ts
import { isSpanish } from '../lib/content';

// Solo EN
const recipes = await getCollection('recipes', ({ id }) => !isSpanish(id));

// Solo ES
const recipesEs = await getCollection('recipes', ({ id }) => isSpanish(id));
```

### 3.3 Reglas

- **NUNCA** crear contenido en un solo idioma
- Cada `.md` debe tener su `.es.md` correspondiente
- El frontmatter ES debe ser traduccion completa (incluyendo title, description, metaDescription)
- Los `slug`, `topics`, `tags` son los mismos en ambos idiomas

---

## 4. Estructura de Carpetas

```
src/content/
├── recipes/
│   ├── data/
│   │   ├── parse-json.md
│   │   ├── parse-json.es.md
│   │   ├── validate-json.md
│   │   └── validate-json.es.md
│   ├── api/
│   │   └── ...
│   └── security/
│       └── ...
├── patterns/
│   ├── design/
│   │   ├── factory-pattern.md
│   │   └── factory-pattern.es.md
│   └── architecture/
│       └── ...
├── docs/
│   ├── readme-template.md
│   ├── readme-template.es.md
│   └── ...
└── guides/
    ├── rest-api-design-guide.md
    ├── rest-api-design-guide.es.md
    └── ...
```

---

## 5. Paginas Dinamicas

### 5.1 Slug Pages

`src/pages/recipes/[slug].astro`:
```astro
export async function getStaticPaths() {
  const recipes = await getCollection('recipes', ({ id }) => !isSpanish(id));
  return recipes.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}
```

Genera rutas como `/recipes/data/parse-json/`.

### 5.2 Index Pages

`src/pages/recipes/index.astro`:
```astro
const recipes = await getCollection('recipes', ({ id, data }) => !isSpanish(id) && !data.draft);
```

Renderiza listado con `ListingPage.astro`.

### 5.3 ES Versions

`src/pages/es/recipes/[slug].astro`:
```astro
const recipes = await getCollection('recipes', ({ id }) => isSpanish(id));
```

Genera `/es/recipes/data/parse-json/`.

---

## 6. Flujo de Creacion de Contenido

### 6.1 Checklist

1. Elegir content type (recipe, pattern, doc, guide)
2. Elegir topic y subcarpeta
3. Crear `slug.md` con frontmatter completo EN
4. Crear `slug.es.md` con frontmatter completo ES
5. Verificar `astro check` pasa
6. Verificar `npm run build` exitoso
7. Ejecutar `npm run sitemap` para actualizar

### 6.2 Template de Contenido

```markdown
---
slug: example-recipe
title: Example Recipe
description: Brief description for listings.
metaDescription: Detailed description for SEO (150-160 chars).
difficulty: beginner
topics: [data]
tags: [json, parsing]
relatedResources: []
lastUpdated: 2026-06-15
author: StackPractices
seo:
  metaDescription: Detailed description
  keywords: [json, parsing]
---

## Overview

## When to Use

## Solution

## Explanation

## Variants

## Best Practices

## Common Mistakes

## Frequently Asked Questions

**Q: Question one?**
A: Answer one.

**Q: Question two?**
A: Answer two.
```

---

## 7. Scripts de Utilidad

### 7.1 Validacion

```bash
npm run content:validate
# Valida frontmatter, schemas, y estructura
```

### 7.2 Calidad

```bash
npm run content:quality
# Verifica meta descripciones unicas, longitud, etc.
```

### 7.3 Links Rotos

```bash
npm run content:links
# Verifica que relatedResources no apunten a 404
```

### 7.4 Translations Orphans

Scripts en `.agents/skills/stackp-content-creator/scripts/` verifican:
- Contenido EN sin version ES
- Contenido ES sin version EN
- Meta descripciones duplicadas o faltantes

---

## 8. Related Resources

El campo `relatedResources` acepta paths absolutos internos:

```yaml
relatedResources:
  - /recipes/data/validate-json
  - /patterns/design/factory-pattern
  - /guides/rest-api-design-guide
```

Se renderizan automaticamente al final del articulo via `RelatedResources.astro`.

---

## 9. Drafts

```yaml
draft: true
```

Los drafts se filtran en listados:
```ts
const entries = await getCollection('recipes', ({ id, data }) => !isSpanish(id) && !data.draft);
```

Pero siguen siendo accesibles directamente si se conocen la URL.
