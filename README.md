# StackPractices

> Practical software engineering knowledge base with code recipes, design patterns, architecture guides, and reusable technical documentation.

**Live site:** [stackpractices.com](https://stackpractices.com)

---

## What is StackPractices?

StackPractices is a **static, SEO-first developer knowledge base** designed for software engineers. It provides practical, multilingual code recipes, design patterns, documentation templates, and long-form guides.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Astro 5](https://astro.build/) (Static Site Generation) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first via `@tailwindcss/vite`) |
| Search | [Pagefind](https://pagefind.app/) (static, zero runtime cost) |
| Content | Astro Content Collections with Zod schemas |
| Hosting | [GitHub Pages](https://pages.github.com/) |
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
└── public/                 # Static assets (sitemap, robots.txt, pagefind index)
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

All content is **bilingual (EN/ES)**. Every `.md` file must have a matching `.es.md` counterpart.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build static site + Pagefind index |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript type checking |
| `npm run content:quality` | Validate all content |

## Content Types

- **Recipes** (`src/content/recipes/`) — Actionable code snippets and solutions
- **Patterns** (`src/content/patterns/`) — Software design patterns
- **Docs** (`src/content/docs/`) — Reusable documentation templates
- **Guides** (`src/content/guides/`) — Long-form technical guides

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
