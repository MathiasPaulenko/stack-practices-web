# Recipes — Agent Guidelines

## Scope

This `AGENTS.md` applies to all files under `src/content/recipes/`. It works together with the root `AGENTS.md` and overrides its general rules when there is a conflict.

## Mandatory Skills

Always invoke the appropriate skills before creating or editing a recipe:

- **`stackp-content-creator`** — For creating, translating, or major updates to bilingual content. Always use the Resource Wizard:  
  `node .agents/skills/stackp-content-creator/scripts/resource-wizard.cjs`. Never create recipe files manually.
- **`humanizer`** — After generating or updating the body of a recipe, review and remove AI-writing patterns (inflated language, filler, rule of three, vague attributions, passive voice, em dash overuse, etc.).
- **`content-quality-auditor`** — Before promoting a recipe, run a publish-readiness and E-E-A-T audit.
- **`ai-seo`** or **`seo-geo`** — For GEO/AI-citation optimization (FAQ, structured data, speakable content) and traditional on-page SEO.
- **`technical-seo-checker`** — For canonical, hreflang, sitemap, and indexing issues.

## Recipe-Specific Rules

### Frontmatter

- `contentType: recipes`
- `slug`: unique, kebab-case, English only, no underscores.
- `title`: 60 chars max, unique; translate in the `.es.md` version.
- `description`: 1–2 sentences summarizing the recipe.
- `metaDescription`: 50–170 chars; must appear at top level and inside `seo.metaDescription`.
- `difficulty`: one of `beginner`, `intermediate`, `advanced`.
- `topics`: one or more values from the topics enum in `src/content.config.ts` (e.g., `api`, `data`, `security`).
- `tags`: relevant technology and concept tags (e.g., `python`, `rest`, `authentication`).
- `relatedResources`: 3–6 coherent resources from the same topic cluster when possible. Keep EN and ES lists identical in number, order, and target slugs. The detail page renders only the first 6 entries, so any extras are ignored.
- `lastUpdated`, `publishedAt`: ISO-8601 dates. Stagger `publishedAt` values across recipes so the entire collection does not look like it was bulk-created on a single day. Update `lastUpdated` whenever you edit the recipe.
- `author`: `Mathias Paulenko` or `StackPractices`.
- `seo.keywords`: 3–8 relevant keywords.

### Content Structure

Every recipe should include these sections when applicable:

1. **Overview** — what the recipe covers and why it matters.
2. **When to Use** — context and concrete scenarios.
3. **Solution / Examples** — the actual code, copy-paste ready, in multiple languages when possible.
4. **Explanation** — how it works, edge cases, trade-offs.
5. **Variants** — multi-language or alternate implementations.
6. **Best Practices** — 3–5 actionable tips.
7. **Common Mistakes** — pitfalls to avoid.
8. **FAQ** — Q&A pairs for GEO/AI-citation optimization and `FAQPage` structured data.

### Body Rules

- **No manual `## Related Resources`** or `## Recursos Relacionados` section in the body. The detail page renders a dynamic "Related Resources" block from `relatedResources` frontmatter. Manual sections create duplicate content.
- Include 2–3 contextual internal body links where relevant.
- Keep paragraphs short (3–5 lines max).
- Use code blocks with explicit language tags.
- Use tables for structured comparisons and variants.
- Avoid duplicate H2/H3 headings; watch FAQ sections especially.
- Keep code runnable and practical. Avoid theoretical or filler examples.

### Bilingual Parity

- Every EN recipe must have a matching `.es.md`.
- Translate title, description, `metaDescription`, `seo.keywords`, and body.
- Keep `relatedResources` slugs identical in both files. The page component localizes the URL.
- Preserve code examples across languages; translate comments and variable names only when idiomatic.

### Humanization & Quality

1. After drafting, run the `humanizer` skill on both EN and ES versions.
2. If AI-detection is a concern, run `python scripts/ai-detect-content.py <file>` and keep the AI score below 40%.
3. Run `content-quality-auditor` before treating a recipe as publication-ready.
4. Remove generic AI-like phrases, inflated language, and passive voice.

### Validation

Before commit and push:

```bash
npm run content:quality    # 0 errors, 0 warnings
npm run content:links      # 0 broken relatedResources
npm run content:validate   # review warnings
npm run check              # 0 errors, 0 warnings
npm run build              # 3242 pages expected
npm run sitemap            # regenerate public/sitemap.xml
```

## What to Avoid

- Creating a recipe in only one language.
- Adding backend dependencies or dynamic features (the site is static).
- Leaving `lastUpdated` stale; update it when editing the recipe.
- Using the same `publishedAt` date for large batches of recipes; stagger them.
- Exceeding the 6 `relatedResources` limit; extra slugs are not rendered.
- Broken or unrelated `relatedResources`.
- Manual `## Related Resources` sections in the body.
- Generic AI filler, promotional language, or inflated claims.
- Duplicate H2/H3 headings within the same page.
