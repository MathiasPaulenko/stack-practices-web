---
name: stackp-content-creator
description: Guide for creating new content in the StackPractices static site with bilingual (EN/ES) support, SEO optimization, and Astro SSG compliance.
version: 1.0.0
license: MIT
author: "@stackpractices-agent"
tags:
  - content-creation
  - developer-resources
  - bilingual
  - seo
  - markdown
  - astro
---

# Content Creator — Agent Skill

## Overview

This skill guides the creation of new content for the StackPractices static site. Every new
piece of content must be bilingual (English + Spanish), SEO-optimized, and follow the
established architecture (Astro, Content Collections, Tailwind).

## When to Use

- Adding a new code recipe (e.g. "Parse JSON", "Call REST API")
- Adding a new design pattern (e.g. "Factory Pattern", "Strategy Pattern")
- Adding new documentation or guide content
- Updating existing content or adding missing translations
- Adding new pages that need routing, components, and SEO

## When NOT to Use (STOP)

- **Restyling existing pages** → Use the `tailwind` or `frontend-design` skill instead
- **Fixing bugs** → Debug first, then patch; do not create new content
- **Refactoring components** → Not a content task
- **Adding backend features** → Violates static-first constraint; reject immediately
- **Creating single-language content** → Always bilingual; if Spanish translation is blocked, pause and ask the user

## Workflow

```text
1. Plan → 2. Define Topic → 3. Resource Wizard → 4. Translate ES →
   5. Fill Body Content → 6. Validate → 7. Commit
```

**CRITICAL**: NEVER create content manually. ALWAYS use the Resource Wizard
(`.devin/skills/stackp-content-creator/scripts/resource-wizard.cjs`). The wizard prevents
90% of common errors before they happen.

---

## Step 1: Plan

### Decision: Should I Create a New Topic?

```text
Does the topic slug exist in src/content.config.ts (topics enum)?
├── YES → Use existing slug in frontmatter. Skip Step 2.
└── NO  → Add topic to the topics enum in config.ts. Continue to Step 2.
```

### Prerequisites (check before writing)

- [ ] Check `ref/roadmap.md` for current phase and priorities
- [ ] Confirm the content fills a gap (not duplicate)
- [ ] Identify target keywords (use common developer searches)
- [ ] Plan the URL slug (kebab-case, no underscores, English only)

**URL pattern**: `/{content-type}/{topic-slug}/{content-slug}`

**Examples**:

- `/recipes/data/parse-json`
- `/patterns/design/factory-pattern`
- `/docs/templates/readme-template`
- `/guides/architecture/clean-code-guide`

### Decision: What Content Type?

| Type | Use When | Collection |
| ------ | ---------- | ------------ |
| **Recipes** | Practical solutions to real problems | `recipes` |
| **Patterns** | Design and architecture patterns | `patterns` |
| **Documentation** | Reusable document templates | `docs` |
| **Guides** | Long-form educational content | `guides` |

---

## Step 2: Define the Topic (if new)

If the topic does not exist in `src/content.config.ts`:

1. Add the topic to the Zod schema enum for `topics` field in `src/content.config.ts`:

```typescript
const topicsEnum = z.enum([
  // existing topics...
  'data',
  'api',
  'authentication',
  'file-handling',
  'performance',
]);
```

1. Add the same topic for Spanish (no separate file needed; topic slugs are language-agnostic keys).

**Rules**:

- Slug is the key (e.g. `data`, `api`, `authentication`)
- Keep topics generic enough to group multiple resources
- Technology tags (python, java, javascript) go in the `tags` array, not topics

---

## Step 3: Create Content with the Resource Wizard

**NEVER create files manually.** The wizard validates everything automatically.

### Why Use the Wizard?

The wizard prevents these common fatal errors:

- Slug already exists (build failure)
- Topic does not exist (validation error)
- Broken relatedResources links (404 on detail page)
- Missing required frontmatter fields
- Invalid difficulty value
- Meta description too short/long

### Wizard Usage

```bash
node .devin/skills/stackp-content-creator/scripts/resource-wizard.cjs \
  --type recipes \
  --slug parse-json \
  --title "Parse JSON" \
  --description "How to parse JSON strings into objects in different languages." \
  --metaDescription "Learn how to parse JSON in Python, JavaScript, and Java with practical code examples." \
  --difficulty beginner \
  --topics "data" \
  --tags "json,parsing,python,javascript,java" \
  --author "StackPractices"
```

### What the Wizard Does

1. **Validates slug uniqueness** — rejects if already exists
2. **Validates topics** — rejects if not in config.ts topics enum
3. **Validates contentType** — must be one of 4 allowed types
4. **Auto-suggests relatedResources** — based on topic/tag overlap with existing content
5. **Generates complete frontmatter** — all required fields pre-filled
6. **Creates both `.md` and `.es.md`** — with placeholder Spanish translations
7. **Validates after creation** — confirms no broken links

### Wizard Output

After running, you get:

```text
src/content/recipes/data/
  ├── parse-json.md       (EN, ready to fill)
  └── parse-json.es.md    (ES, ready to translate)
```

**Then proceed to Step 4 (translate ES) and Step 5 (fill body content).**

### Manual Frontmatter Reference (for edge cases only)

If you MUST create content without the wizard (not recommended), use this exact template:

```yaml
---
contentType: recipes
slug: your-unique-slug
title: "Your Title"
description: "One or two sentences."
metaDescription: "150-160 chars for Google."
difficulty: beginner
topics:
  - existing-topic
tags:
  - tag-one
  - tag-two
relatedResources:
  - /patterns/design/existing-pattern
  - /docs/templates/existing-template
lastUpdated: "2025-06-09"
author: "StackPractices"
seo:
  metaDescription: "Same as top-level metaDescription."
  keywords:
    - keyword-one
    - keyword-two
---
```

### Content Body Requirements

Every resource must include these sections (when applicable):

1. **Overview** — What this resource covers and why it matters
2. **When to Use** — Context and scenarios
3. **Solution / Example** — The actual code or pattern implementation
4. **Explanation** — How it works, edge cases, trade-offs
5. **Variants** — Multi-language implementations or variations
6. **Best Practices** — 3-5 actionable tips
7. **Common Mistakes** — Pitfalls to avoid
8. **FAQ** (optional but strongly recommended) — Q&A pairs for GEO optimization and FAQPage structured data

### NO Manual "Related Resources" Section in Markdown

**CRITICAL**: Do NOT write a `## Related Resources` or `## Recursos Relacionados` section
in the markdown body. The detail page component already renders a dynamic "Related
Resources" section from the `relatedResources` frontmatter array. Adding it manually creates
duplicate content on the page.

Use `relatedResources` in frontmatter instead (see below).

### Markdown Rules

- Use ATX headings (`#` not underline)
- Use tables for structured data (comparisons, variants)
- Use code blocks with language tags for examples
- Use bold for emphasis, not all-caps
- Keep paragraphs short (3-5 lines max)
- Include alt text for images (if any)

### Full Example: Recipe Resource

Below is a complete, realistic example. Use it as a template. **Note**: No
`## Related Resources` section in body — only frontmatter.

**File**: `src/content/recipes/data/parse-json.md`

```markdown
---
contentType: recipes
slug: parse-json
title: "Parse JSON"
description: "How to parse JSON strings into native data structures in different programming languages."
metaDescription: "Practical JSON parsing examples in Python, JavaScript, and Java with code snippets and best practices."
difficulty: beginner
topics:
  - data
tags:
  - json
  - parsing
  - python
  - javascript
  - java
relatedResources:
  - /recipes/api/call-rest-api
  - /patterns/design/repository-pattern
  - /guides/architecture/clean-code-guide
lastUpdated: "2025-06-09"
author: "StackPractices"
seo:
  metaDescription: "Practical JSON parsing examples in Python, JavaScript, and Java with code snippets and best practices."
  keywords:
    - json parsing
    - parse json python
    - parse json javascript
    - parse json java
    - json deserialization
---

# Parse JSON

## Overview

JSON is the de-facto data interchange format for modern APIs. Knowing how to parse JSON efficiently in your language of choice is essential for backend and frontend development.

## When to Use

Use this resource when:
- Consuming REST APIs that return JSON
- Reading configuration files stored as JSON
- Interfacing with third-party services (webhooks, SDKs)
- Deserializing JSON into strongly typed objects

## Solutions

### Python

```python
import json

data = json.loads('{"key": "value", "count": 42}')
print(data["key"])  # "value"
```

### JavaScript

```javascript
const data = JSON.parse('{"key": "value", "count": 42}');
console.log(data.key); // "value"
```

### Java

```java
import com.fasterxml.jackson.databind.ObjectMapper;

ObjectMapper mapper = new ObjectMapper();
MyClass obj = mapper.readValue(jsonString, MyClass.class);
```

## Explanation

Each language handles JSON parsing differently:

- **Python**: Built-in `json` module; returns native dict/list structures
- **JavaScript**: Built-in `JSON.parse()`; returns native objects/arrays
- **Java**: Requires a library (Jackson, Gson); maps to POJOs via reflection

## Variants

| Language | Library | Returns | Notes |
| ---------- | --------- | --------- | ------- |
| Python | `json` (stdlib) | `dict` / `list` | Use `json.load()` for files |
| JavaScript | `JSON.parse()` (builtin) | `Object` / `Array` | No dependencies |
| Java | Jackson / Gson | `POJO` | Add dependency to `pom.xml` or `build.gradle` |

## Best Practices

- **Validate input**: Always handle malformed JSON gracefully
- **Use typed models in Java**: Prefer `ObjectMapper` over raw `JsonNode`
- **Avoid `eval()` in JS**: Never parse JSON with `eval`; use `JSON.parse()`
- **Use streaming for large files**: In Java, use `JsonParser`; in Python, use `ijson`
- **Set date formats explicitly**: Jackson defaults may not match your API

## Common Mistakes

- **Ignoring encoding**: JSON is UTF-8; opening files in wrong encoding causes errors
- **Missing dependency in Java**: Forgetting Jackson/Gson in `pom.xml`
- **Circular references**: Jackson throws `InvalidDefinitionException` on cycles
- **Case sensitivity**: JSON keys are case-sensitive; map carefully to object fields
- **Silent truncation**: Very large integers may lose precision in JavaScript

## Frequently Asked Questions

**Q: Should I use a schema validator before parsing?**
A: For APIs you control, yes — use JSON Schema or OpenAPI. For external APIs, defensive parsing (try/catch) is usually enough.

**Q: How do I parse JSON from a file in Python?**
A: Use `json.load(f)` (note `load`, not `loads`) which reads from a file-like object.

**Q: What is the Java equivalent of Python's `json.loads`?**
A: `ObjectMapper.readValue(String, Class<T>)` or `readValue(String, TypeReference<T>)`.

---

## Step 4: Translate Spanish Content

The wizard already created the `.es.md` file with placeholder translations. You MUST replace them with real translations.

### Translation Rules

- **Complete translation**, not a summary — every paragraph, every bullet
- Frontmatter fields must ALL be translated:
  - `title` → Spanish title (not "[ES] Original Title")
  - `description` → Spanish description
  - `metaDescription` → Spanish meta (150-160 chars)
  - `topics` → same slugs (topic slugs are language-agnostic keys)
  - `tags` → translated keywords
  - `author` → keep as "StackPractices" (brand name)
- Body content must be fully translated
- Code examples and technical terms: keep English if no standard Spanish equivalent exists
  (e.g. "endpoint", "payload", "token", "streaming")
- **FAQ headings**: Translate "## Frequently Asked Questions" → "## Preguntas Frecuentes"
- **Do NOT add `## Recursos Relacionados`** — the component renders this dynamically

### Quick Translation Checklist

After translating, verify:

- [ ] All `[ES]` placeholders replaced with real Spanish
- [ ] metaDescription is 150-160 chars in Spanish
- [ ] Tags translated (except technical terms)
- [ ] Body content fully translated
- [ ] FAQ questions and answers translated
- [ ] No English text remains in Spanish file (except code/terms)

---

## Step 5: Fill Body Content

The wizard generated a template body with placeholder sections. Replace `[...]` with real content.

### Required Sections (in order)

1. **Overview** — 2-3 paragraphs. What this resource covers and why developers need it.
2. **When to Use** — 3-5 bullet points with scenarios.
3. **Solution / Example** — The actual code or pattern:
   - Recipes → code blocks per language
   - Patterns → class diagrams (text) + implementation code
   - Docs → template structure with placeholders
   - Guides → detailed walkthrough with examples
4. **Explanation** — How it works under the hood.
5. **Variants** — Multi-language or alternative implementations.
6. **Best Practices** — 5 actionable tips with bold keywords.
7. **Common Mistakes** — 5 pitfalls to avoid.
8. **FAQ** — Minimum 3 Q&A pairs. Critical for GEO optimization (Google Answer Boxes).

### Content Quality Rules

- **Minimum 500 words** in body (excluding tables/code)
- **Maximum 160 chars** for metaDescription
- **Use tables** for structured data (comparisons, variants)
- **Use code blocks** with language tags for examples
- **Bold keywords** for emphasis (not ALL-CAPS)
- **Short paragraphs** (3-5 lines max)
- **NO `## Related Resources`** section in body

---

## Step 6: Validate (Infallible Check)

After creating BOTH `.md` and `.es.md`, run the comprehensive validator:

```bash
# Validate all content (catches errors + warnings)
node .devin/skills/stackp-content-creator/scripts/validate-content.cjs

# Strict mode: warnings become errors (recommended for production)
node .devin/skills/stackp-content-creator/scripts/validate-content.cjs --strict

# Auto-fix where possible (removes manual Related Resources sections)
node .devin/skills/stackp-content-creator/scripts/validate-content.cjs --fix
```

### What validate-content.cjs Checks

| Check | Severity | Auto-fix? |
| ------- | ---------- | ----------- |
| Missing required frontmatter fields | Error | No |
| Duplicate slug | Error | No |
| Slug not found in index | Error | No |
| Invalid topic (not in config.ts) | Error | No |
| Invalid difficulty value | Error | No |
| Broken relatedResources link | Error | No |
| Manual `## Related Resources` in body | Error | **Yes (with --fix)** |
| Meta description < 120 or > 170 chars | Warning | No |
| Missing SEO block | Warning | No |
| Missing FAQ section | Warning | No |
| Body < 500 words | Warning | No |
| Duplicate H2/H3 headings | Warning | No |
| Missing Spanish translation | Error | No |
| Orphan Spanish translation | Error | No |

### Validation MUST Pass Before Commit

**If `validate-content.cjs` returns exit code 1, DO NOT COMMIT.** Fix all errors first.

---

## Step 7: Add Routing & SEO

### If the resource is a new content type landing page

Content type listing pages (e.g. `/recipes`, `/patterns`) are handled by Astro file-based
routing in `src/pages/`. Create or update the listing page component:

```astro
---
// src/pages/recipes/index.astro
import { getCollection } from 'astro:content';
const allRecipes = await getCollection('recipes');
---
```

### If the resource is a new detail page

Detail pages use Astro's dynamic routes with `getStaticPaths()`:

```astro
---
// src/pages/[contentType]/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const recipes = await getCollection('recipes');
  const patterns = await getCollection('patterns');
  // ... etc
  return [...recipes, ...patterns].map(entry => ({
    params: { contentType: entry.data.contentType, slug: entry.slug },
    props: { entry }
  }));
}
---
```

### SEO Checklist for New Pages

- [ ] Unique `<title>` (60 chars max)
- [ ] Unique `<meta name="description">` (150-160 chars)
- [ ] `<meta name="keywords">` present
- [ ] Canonical URL set (reflects `/es/` prefix when on Spanish route)
- [ ] Open Graph tags (og:title, og:description, og:type, og:url, og:locale)
- [ ] Hreflang link tags: `<link rel="alternate" hreflang="en">`,
  `<link rel="alternate" hreflang="es">`, `<link rel="alternate" hreflang="x-default">`
- [ ] Schema.org JSON-LD:
  - Recipe / Pattern detail → `TechArticle` + `WebPage` + `FAQPage` (if Q&A) + `BreadcrumbList`
  - Listing page → `CollectionPage` + `ItemList` + `WebPage` + `BreadcrumbList`
  - Static page → `WebPage` + `BreadcrumbList`
- [ ] `inLanguage` set dynamically from `document.documentElement.lang` (`en` or `es`)
- [ ] `educationalLevel` mapped from difficulty (`beginner` → Beginner, etc.)
- [ ] `articleSection` in `TechArticle` schema mapped from `topics[0]`
- [ ] `og:locale` set to `es_ES` (Spanish) or `en_US` (English) dynamically

### Internal Linking & Topic-Resource Connections

Every resource must connect to the site's information architecture through multiple linking mechanisms:

#### 1. Topic Array (frontmatter)

The `topics` array in frontmatter is the **primary connection** between resources and topics:

```yaml
topics:
  - data
  - api
```

It automatically:

- Appears on the `/topics/data` page
- Appears on the `/topics/api` page
- Is filterable by topic in search and listing pages

**Rule**: Always assign 1-3 relevant topics. Do not leave empty.

#### 2. Related Resources (frontmatter)

The `relatedResources` array creates **explicit cross-links** between resources:

```yaml
relatedResources:
  - /patterns/design/repository-pattern
  - /docs/templates/readme-template
  - /guides/architecture/clean-code-guide
```

These links:

- Appear in the "Related Resources" section of the detail page
- Drive internal PageRank distribution
- Reduce bounce rate by offering next steps

**Rule**: Link to at least 2-3 resources. Prefer different content types (e.g. a recipe should
link to a pattern and a doc, not only other recipes).

#### 3. Body Content Links

Within the Markdown body, link to other resources using standard Markdown:

```markdown
See the [Repository Pattern](/patterns/design/repository-pattern) for a structured data approach.
Use the [README Template](/docs/templates/readme-template) to document your project.
```

**Rule**: Include at least 1-2 contextual links in the body.

#### 4. Sitemap Auto-Generation (Multilingual)

The sitemap is **auto-generated** from content. No manual edits needed. Run:

```bash
node .devin/skills/stackp-content-creator/scripts/generate-sitemap.cjs
```

This script:

- Scans all `.md` files in `src/content`
- Generates **both EN and ES URLs** for every resource
- Outputs `public/sitemap.xml` with `xmlns:xhtml` namespace
- Includes `<xhtml:link rel="alternate" hreflang="en|es|x-default" />` on
  every URL
- Uses `lastmod` from frontmatter `lastUpdated`
- Includes `changefreq` and `priority` for each URL

**Rule**: After adding new content, always regenerate the sitemap before deployment. Ensure
`lastUpdated` in frontmatter is current.

---

## Step 8: Verify

### Automated Checks

Run from project root in this exact order:

```bash
# 1. Validate all content (catches errors + warnings)
node .devin/skills/stackp-content-creator/scripts/validate-content.cjs

# 2. Check for missing Spanish translations
node .devin/skills/stackp-content-creator/scripts/check-missing-translations.cjs

# 3. Check for orphan Spanish translations (no English source)
node .devin/skills/stackp-content-creator/scripts/check-orphan-translations.cjs

# 4. Check meta descriptions completeness
node .devin/skills/stackp-content-creator/scripts/check-meta-descriptions.cjs

# 5. Check for broken relatedResources links
node .devin/skills/stackp-content-creator/scripts/check-broken-links.cjs

# 6. Regenerate sitemap (includes new content)
node .devin/skills/stackp-content-creator/scripts/generate-sitemap.cjs

# 7. Build and test
astro build
```

**Rule**: If ANY script fails with exit code 1, STOP. Fix the issues before proceeding. Do not commit broken content.

### If Verification Scripts Fail

| Script Failure | Action |
| ---------------- | -------- |
| Missing translations found | Create the `.es.md` files before proceeding. Never commit without Spanish. |
| Orphan translations found | Verify if English source was deleted accidentally; restore or delete orphan. |
| Meta description issues | Fix length (150-160 chars) or missing fields in affected files. |
| Broken links found | Fix `relatedResources` paths. Every link must point to an existing resource slug. |
| Build fails | Fix errors first. Do not add new content until build is green. |

### Manual Checks

- [ ] Resource appears in correct listing page (recipes, patterns, etc.)
- [ ] Resource is filterable by topic and difficulty
- [ ] Resource card shows correct title, description, tags, difficulty badge
- [ ] Clicking resource navigates to correct URL
- [ ] Language toggle works (EN ↔ ES)
- [ ] `/es/` routes load Spanish content correctly
- [ ] Hreflang tags visible in `<head>` (en, es, x-default)
- [ ] Canonical URL matches current language route
- [ ] Structured data validates in Google's Rich Results Test
- [ ] No console errors
- [ ] `validate-content.cjs` passes (no errors)
- [ ] `check-broken-links.cjs` passes (no broken links)
- [ ] Sitemap regenerated and includes new resource (EN + ES URLs)

---

## Step 9: Commit

Commit message format (conventional commits):

```text
feat(content): add parse json recipe

- Add JSON parsing recipe (EN + ES)
- Update relatedResources links
```

Or for multiple resources:

```text
feat(content): add 3 new data handling recipes

- Add Parse JSON recipe
- Add Write JSON to File recipe
- Add Validate JSON Schema recipe
- All with Spanish translations
```

### Expected Output (Files Created/Modified)

After running this skill, the following files should exist:

```text
# If new topic:
src/content.config.ts                              (modified — add to topics enum)

# English content:
src/content/{content-type}/{topic-slug}/{slug}.md

# Spanish content (MANDATORY):
src/content/{content-type}/{topic-slug}/{slug}.es.md

# If new listing page category:
src/pages/{new-category}/index.astro               (new)
```

---

## Design & Styling Rules

When adding UI for new content:

- **Tailwind CSS v4** — use the CSS-first configuration
- **Lucide icons** for iconography (not FontAwesome or emojis)
- **Responsive first**: mobile → tablet → desktop
- **Color palette**: slate/zinc neutrals, indigo/blue accents, no random colors
- **Typography**: sans-serif system font stack, clear hierarchy
- **Accessibility**: WCAG 2.2 AA — sufficient contrast, focus states, semantic HTML

---

## Functional Rules

- **Astro components** — `.astro` files for pages and layouts
- **Content Collections** — use `getCollection()` with Zod schemas
- **Static output** — `output: 'static'` in `astro.config.mjs`
- **No backend** — static content only, no APIs, no databases
- **No user accounts** — no auth, no sessions, no cookies beyond analytics
- **Reusable components** in `src/components/`
- **Bilingual URLs** — `/es/` prefix routes for Spanish content
- **Hreflang tags** — `en`, `es`, `x-default` on every page
- **OG locale** — `og:locale` set to `es_ES` or `en_US` dynamically

---

## Related Files Reference

| File | Purpose |
| ------ | --------- |
| `src/content.config.ts` | Astro Content Collections Zod schemas |
| `src/components/` | Reusable Astro components |
| `src/pages/` | File-based routing |
| `src/layouts/` | Page layouts (BaseLayout, etc.) |
| `src/content/recipes/` | Recipe content |
| `src/content/patterns/` | Pattern content |
| `src/content/docs/` | Documentation content |
| `src/content/guides/` | Guide content |
| `.devin/skills/stackp-content-creator/scripts/resource-wizard.cjs` | Infalible content scaffolder (ALWAYS USE THIS) |
| `.devin/skills/stackp-content-creator/scripts/validate-content.cjs` | Comprehensive content validator (run before every commit) |
| `.devin/skills/stackp-content-creator/scripts/check-broken-links.cjs` | Validate relatedResources links |
| `.devin/skills/stackp-content-creator/scripts/generate-sitemap.cjs` | Multilingual sitemap generator |
| `AGENTS.md` | Project-wide development rules |
| `ref/roadmap.md` | Current phase and priorities |

---

## Common Mistakes to Avoid

1. **Creating only English content** — Always create `.es.md` simultaneously
2. **Missing frontmatter fields** — All frontmatter fields are required
3. **Wrong contentType** — Must match collection name and folder
4. **Duplicate slugs** — URLs must be unique across all content
5. **Forgetting SEO** — Every page needs unique title, description, structured data, hreflang
6. **Adding backend logic** — Stay static-first, no APIs, no databases
7. **Inconsistent topic slugs** — Topic keys must match between EN and ES content
8. **Long meta descriptions** — Keep between 150-160 characters
9. **No relatedResources** — Always link to at least 2-3 related internal pages
10. **Broken relatedResources links** — Verify all links point to existing resources
11. **Manual Related Resources section** — Do NOT add `## Related Resources` in markdown body; use frontmatter only
12. **Creating content without the wizard** — Always use `resource-wizard.cjs`. Manual creation causes 90% of errors.
13. **Skipping validation** — `validate-content.cjs` MUST pass before every commit.
14. **Committing with exit code 1** — If ANY check fails, fix it. Do not commit broken content.
