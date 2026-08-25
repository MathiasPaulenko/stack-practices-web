# Docs — Agent Guidelines

## Scope

This `AGENTS.md` applies to all files under `src/content/docs/`. It works together with the root `AGENTS.md` and overrides its general rules when there is a conflict.

## Mandatory Skills

Always invoke the appropriate skills before creating or editing a doc template:

- **`stackp-content-creator`** — For creating, translating, or major updates to bilingual content. Always use the Resource Wizard:  
  `node .devin/skills/stackp-content-creator/scripts/resource-wizard.cjs`. Never create doc files manually.
- **`humanizer`** — After generating or updating the body of a doc, review and remove AI-writing patterns (inflated language, filler, rule of three, vague attributions, passive voice, em dash overuse, etc.).
- **`content-quality-auditor`** — Before promoting a doc, run a publish-readiness and E-E-A-T audit.
- **`ai-seo`** or **`seo-geo`** — For GEO/AI-citation optimization (FAQ, structured data, speakable content) and traditional on-page SEO.
- **`technical-seo-checker`** — For canonical, hreflang, sitemap, and indexing issues.

## Doc-Specific Rules

### Frontmatter

- `contentType: docs`
- `slug`: unique, kebab-case, English only, no underscores.
- `title`: 60 chars max, unique; translate in the `.es.md` version.
- `description`: 1–2 sentences summarizing the template purpose.
- `metaDescription`: 50–160 chars recommended (170 hard max); must appear at top level and inside `seo.metaDescription`. Write concisely in both languages; do not extend the limit for Spanish.
- `difficulty`: one of `beginner`, `intermediate`, `advanced`.
- `topics`: one or more values from the topics enum in `src/content.config.ts` (e.g., `architecture`, `devops`, `security`).
- `tags`: relevant technology and concept tags (e.g., `template`, `readme`, `adr`, `runbook`).
- `templateType`: one of the enum values in `src/content.config.ts` (e.g., `readme`, `adr`, `runbook`, `guideline`, `postmortem`, `technical-spec`, etc.). Optional but recommended for categorization and filtering.
- `relatedResources`: 3–6 coherent resources from the same topic cluster when possible. Keep EN and ES lists identical in number, order, and target slugs. The detail page renders only the first 6 entries, so any extras are ignored.
- `lastUpdated`, `publishedAt`: ISO-8601 dates. Stagger `publishedAt` values across docs so the entire collection does not look like it was bulk-created on a single day. Update `lastUpdated` whenever you edit the doc.
- `author`: `Mathias Paulenko` or `StackPractices`.
- `seo.keywords`: 3–8 relevant keywords.

### Content Structure

Doc templates are more flexible than recipes or patterns because they serve different purposes (readme, ADR, runbook, postmortem, etc.). Use the structure that fits the template type. The following sections are recommended when applicable:

1. **Overview** / **Introduction** — what the template is for and when to use it.
2. **Template Body** — the actual template content, organized with numbered sections (`## 1. Summary`, `## 2. Architecture`, etc.) or logical headings depending on the template type.
3. **FAQ** — Q&A pairs for GEO/AI-citation optimization and `FAQPage` structured data. Minimum 3–5 real questions. No hard maximum, but avoid excessive FAQ that looks like long-tail keyword targeting or AI-generated filler. Vary question structure (`How do I…?`, `Why…?`, `What…?`, `Can I…?`) to avoid formulaic patterns. The layout extracts up to 10 Q&A pairs for the visible FAQ component and `FAQPage` JSON-LD; the body `## FAQ` section also renders as plain HTML, so keep the total concise to avoid duplication.
4. **See Also** / **Further Reading** (optional) — additional internal or external cross-references beyond `relatedResources`. These are NOT the same as `## Related Resources`, which is forbidden in the body (see Body Rules below).

The structure of a `readme` template will differ from a `postmortem` or `runbook`. Adapt the sections to the template type while keeping the content practical and actionable.

### H1 Rule

The page layout (`RecipeArticle.astro`) renders the `<h1>` from the frontmatter `title`. Do NOT add a manual `# H1` heading in the Markdown body — that would produce duplicate H1 elements and harm SEO. The body should start with `## Overview` or `## Introduction` or equivalent.

### Body Rules

- **No manual `## Related Resources`** or `## Recursos Relacionados` section in the body. The detail page renders a dynamic "Related Resources" block from `relatedResources` frontmatter. Manual `## Related Resources` sections create duplicate content. Note: `## See Also` and `## Further Reading` are different sections (external links or supplementary cross-references) and are explicitly allowed.
- Include 2–3 contextual internal body links where relevant.
- Keep paragraphs short (3–5 lines max).
- Use code blocks with explicit language tags.
- Use tables for structured comparisons when applicable.
- Avoid duplicate H2/H3 headings; watch FAQ sections especially.
- Keep templates practical and copy-paste ready. Use placeholder text that clearly indicates what to fill in (e.g., `[Project Name]`, `<service-name>`).

### Bilingual Parity

- Every EN doc must have a matching `.es.md`.
- Translate title, description, `metaDescription`, `seo.keywords`, and body.
- Keep `relatedResources` slugs identical in both files. The page component localizes the URL.
- Preserve code examples and template structure across languages; translate comments, placeholder text, and prose.

### Humanization & Quality

1. After drafting, run the `humanizer` skill on both EN and ES versions.
2. If AI-detection is a concern, run `python scripts/ai-detect-content.py <file>` and keep the AI score below 40%.
3. Run `content-quality-auditor` before treating a doc as publication-ready.
4. Remove generic AI-like phrases, inflated language, and passive voice.

### Validation

Before commit and push:

```bash
npm run content:quality    # 0 errors, 0 warnings
npm run content:links      # 0 broken relatedResources
npm run content:validate   # review warnings
npm run check              # 0 errors, 0 warnings
npm run build              # 3258 pages expected
npm run sitemap            # regenerate public/sitemap.xml
```

## What to Avoid

- Creating a doc in only one language.
- Adding backend dependencies or dynamic features (the site is static).
- Leaving `lastUpdated` stale; update it when editing the doc.
- Using the same `publishedAt` date for large batches of docs; stagger them.
- Exceeding the 6 `relatedResources` limit; extra slugs are not rendered.
- Broken or unrelated `relatedResources`.
- Manual `## Related Resources` sections in the body.
- Generic AI filler, promotional language, or inflated claims.
- Duplicate H2/H3 headings within the same page.
