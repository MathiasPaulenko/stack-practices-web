# StackPractices

> A bilingual developer knowledge base with 1000+ practical code recipes, design patterns, architecture guides, and reusable documentation templates. Built with Astro, Tailwind CSS, and Pagefind.

**Live site:** [stackpractices.com](https://stackpractices.com)

---

## What is StackPractices?

StackPractices is a **static, SEO-first developer knowledge base** for software engineers. It provides practical, multilingual code recipes, design patterns, documentation templates, and long-form guides — all bilingual (English/Spanish), type-safe, and optimized for search engines and AI answer engines.

### Content Stats

| Type | Count | Description |
|------|-------|-------------|
| Recipes | 431 | Actionable code snippets and solutions across 20+ topics |
| Patterns | 203 | Software design patterns with multi-language examples |
| Guides | 210 | Long-form technical guides (databases, DevOps, security, frontend) |
| Docs | 177 | Reusable documentation templates (ADRs, runbooks, RFCs, specs) |
| **Total** | **1021 EN** (2042 EN+ES) | Every resource available in both English and Spanish |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Astro 5](https://astro.build/) (Static Site Generation) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first via `@tailwindcss/vite`) |
| Search | [Pagefind](https://pagefind.app/) (static, zero runtime cost) |
| Content | Astro Content Collections with Zod schemas |
| Hosting | [GitHub Pages](https://pages.github.com/) |
| Analytics | Google Analytics 4 |
| Icons | [Lucide](https://lucide.dev/) |

## Project Structure

```
├── src/
│   ├── components/          # Reusable Astro components
│   ├── content/            # Content collections (recipes, patterns, docs, guides)
│   ├── layouts/            # Page layouts (BaseLayout.astro)
│   ├── lib/                # Utilities (JSON-LD builders, helpers)
│   ├── pages/              # File-based routing
│   └── styles/             # Global CSS & Tailwind theme
├── public/                 # Static assets (sitemap, robots.txt, pagefind index)
├── docs/                   # Project reference documentation
└── ref/                    # Roadmap, scripts, and audit tools
```

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (localhost:4321)
npm run dev

# Type check
npm run check

# Build for production (includes Pagefind indexing)
npm run build

# Preview production build locally
npm run preview
```

## Content Workflow

All content is **bilingual (EN/ES)**. Every `.md` file has a matching `.es.md` counterpart with complete frontmatter and translated body.

### Content Types

- **Recipes** (`src/content/recipes/`) — Code snippets and solutions for specific problems
- **Patterns** (`src/content/patterns/`) — Software design patterns with real-world examples
- **Docs** (`src/content/docs/`) — Reusable documentation templates (ADRs, runbooks, specs)
- **Guides** (`src/content/guides/`) — In-depth technical guides for complex topics

### Topics Covered

`data` `api` `authentication` `file-handling` `performance` `testing` `architecture` `design` `devops` `databases` `concurrency` `security` `ai` `frontend` `infrastructure` `messaging` `observability` `graphql` `serverless` `caching`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build static site + Pagefind index |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript type checking |
| `npm run content:quality` | Validate all content |

## SEO & Structured Data

Every page includes:
- Unique `<title>` and `<meta name="description">`
- Canonical URL & `hreflang` tags (EN/ES/x-default)
- Open Graph & Twitter Card meta tags
- JSON-LD structured data (Schema.org: `WebPage`, `TechArticle`, `FAQPage`, `BreadcrumbList`)
- Auto-generated multilingual sitemap

## Deployment

The site auto-deploys to GitHub Pages via GitHub Actions on every push to `main`.

## License

MIT
