# StackPractices - Agent Guidelines

## Project Overview

StackPractices is a static, SEO-first developer knowledge base for software engineers. It provides practical code recipes, design patterns, reusable documentation templates, and long-form guides. The project follows the roadmap defined in `ref/docs/roadmap.md` and evolves through the strategy: **Content → Traffic → Authority → Monetization**.

## Core Principles

### Technical Architecture

- **Static-first**: No backend, no database, no user accounts
- **Fast**: Astro SSG, GitHub Pages hosting
- **SEO-optimized**: Meta tags, structured data, sitemap, hreflang
- **GEO-friendly**: Optimized for AI answer engines (FAQ sections, speakable data)
- **Maintainable**: Simple, scalable, focused architecture

### Business Model

- **Monetization**: Advertising → Affiliate Marketing → Donations
- **No complexity**: No subscriptions, no memberships, no premium accounts
- **User value**: Always prioritize user experience over revenue

## Development Rules

### 1. Technology Stack (Fixed)

- **Framework**: Astro 5+ (Static Site Generation)
- **Styling**: Tailwind CSS v4+ (CSS-first configuration)
- **Content**: Astro Content Collections with Zod schemas
- **Search**: Pagefind (static, zero runtime cost)
- **Hosting**: GitHub Pages (custom domain: stackpractices.com)
- **Analytics**: Google Analytics 4 (G-RBE12WJ5KZ) — active in `src/layouts/BaseLayout.astro`
- **Ads**: Google AdSense (future, Phase 4+)
- **Icons**: Lucide (consistent iconography)

### 2. Project Structure

```text
src/
├── components/            # Reusable Astro components
│   ├── ui/               # UI primitives (buttons, cards, badges)
│   ├── content/          # Content-specific components
│   └── layout/           # Layout components
├── layouts/              # Page layouts
│   └── BaseLayout.astro  # Base layout with SEO, nav, footer
├── pages/                # File-based routing
│   ├── index.astro       # Home page
│   ├── recipes/          # Recipe listing pages
│   ├── patterns/         # Pattern listing pages
│   ├── docs/             # Documentation listing pages
│   ├── guides/           # Guide listing pages
│   ├── topics/           # Topic pages
│   ├── about.astro       # About page
│   ├── privacy.astro     # Privacy Policy
│   ├── terms.astro       # Terms of Service
│   └── cookies.astro     # Cookie Policy
├── content/              # Astro Content Collections
│   ├── recipes/          # Code recipes (multi-language variants)
│   ├── patterns/         # Design patterns
│   ├── docs/             # Documentation templates
│   └── guides/           # Long-form guides
├── content.config.ts     # Content collection schemas (Zod)
├── styles/               # Global CSS and Tailwind theme
└── assets/               # Static assets (images, fonts)
public/
├── sitemap.xml           # Auto-generated multilingual sitemap
├── robots.txt            # Crawler directives
├── ads.txt               # AdSense verification (pub-9762280383707953)
└── assets/content/       # Auto-generated content indices (JSON)
```

### Reference Documentation (`ref/docs/`)

The `ref/docs/` folder contains detailed project reference documents. **Do not read all of them by default** — consult only the files relevant to the task at hand:

| File | Purpose | When to Consult |
| --- | --- | --- |
| `ref/docs/roadmap.md` | Development roadmap with phases and milestones | Planning features, prioritizing work |
| `ref/docs/tech-stack.md` | Full technology stack, dependencies, and build configuration | Adding dependencies, changing build config |
| `ref/docs/design-system.md` | Visual design system, color tokens, typography, and UI patterns | Creating or styling UI components |
| `ref/docs/seo.md` | SEO strategy, technical implementation, and on-page guidelines | Creating pages, optimizing meta tags, structured data |
| `ref/docs/structured-data.md` | Schema.org JSON-LD types and implementation rules | Adding JSON-LD to new page types |
| `ref/docs/content-architecture.md` | Content model, collections, and frontmatter specifications | Creating new content collections, changing schemas |
| `ref/docs/components.md` | Component catalog and usage guidelines | Building or modifying Astro components |
| `ref/docs/deployment.md` | GitHub Pages deployment pipeline and CI/CD setup | Changing deployment, fixing CI/CD issues |
| `ref/docs/performance.md` | Performance targets, Core Web Vitals, and optimization rules | Debugging build speed, optimizing bundles |
| `ref/docs/accessibility.md` | WCAG 2.2 compliance requirements and a11y patterns | Building interactive components, auditing a11y |
| `ref/docs/geo.md` | GEO (Generative Engine Optimization) strategy for AI answer engines | Writing long-form content for AI answer engines |
| `ref/docs/adsense.md` | Google AdSense integration plan (Phase 4+) | Phase 4+ monetization work |
| `ref/docs/ai-context.md` | AI/LLM context and prompt engineering guidelines | Building AI-assisted features or content tools |

### 3. Content Architecture

- **Markdown files** in `src/content/` with YAML frontmatter
- **Type-safe schemas** defined in `src/content.config.ts` using Zod
- **File-based routing** via Astro's `src/pages/` with `getStaticPaths()`
- **SEO-friendly URLs**: `/{type}/{slug}/` (e.g., `/recipes/parse-json/`, `/patterns/factory-pattern/`). Source files may live under topic directories (`src/content/recipes/data/parse-json.md`) but the published URL omits the topic.
- **Hierarchical organization**: Content type → Topic → Individual resource
- **Bilingual by default**: Every `.md` has a matching `.es.md`

### 4. Component Development Rules

#### Always Use Skills

When working on this project, always use the available Skills:

- **astro**: For Astro components, layouts, and pages
- **tailwind**: For Tailwind CSS styling (v4+ CSS-first)
- **seo**: For SEO optimization and structured data
- **clean-code**: For code quality and maintainability
- **typescript-advanced-types**: For TypeScript type safety

#### Component Guidelines

- **Astro Components**: Use `.astro` files for static UI; islands only when interactivity needed
- **TypeScript**: Use strict configuration; type all props and data
- **Content Collections**: Use `getCollection()` for loading content; validate with Zod
- **SEO Integration**: Every page must set unique `<title>`, `<meta name="description">`, canonical URL, and OG tags
- **Static Output**: Build must produce static HTML; no server runtime

### 5. SEO Requirements

**Every page MUST include:**

- **Unique `<title>`** (60 chars max)
- **Unique `<meta name="description">`** (150-160 chars)
- **Canonical URL** reflecting current language route
- **Hreflang tags**: `<link rel="alternate" hreflang="en">`, `<link rel="alternate" hreflang="es">`, `<link rel="alternate" hreflang="x-default">`
- **Open Graph tags**: `og:title`, `og:description`, `og:type`, `og:url`, `og:locale`
- **JSON-LD structured data** with appropriate Schema.org types:
  - **Recipe/Pattern detail**: `TechArticle` + `WebPage` + `FAQPage` (if Q&A) + `BreadcrumbList`
  - **Listing pages**: `CollectionPage` + `ItemList` + `WebPage` + `BreadcrumbList`
  - **Static pages**: `WebPage` + `BreadcrumbList`
  - **Home**: `WebPage`
  - All pages: `inLanguage`, `educationalLevel` mapped from difficulty
- **Sitemap**: Multilingual with `<xhtml:link rel="alternate">` for EN/ES pairs

### 6. Content Creation Rules

- **Frontmatter Required**: Every content file must have complete frontmatter
- **SEO-Optimized**: Include metaDescription (150-160 chars), keywords, descriptive title
- **GEO-Friendly**: Include FAQ sections for AI answer engine optimization
- **Bilingual Content**: Every new content file MUST be created in both English (`.md`) and Spanish (`.es.md`). The Spanish version must be a complete, accurate translation including all frontmatter fields (title, description, keywords, metaDescription). Never create a resource in only one language.
- **Practical Value**: Focus on reusable, actionable content (code that works, patterns that solve real problems)
- **Multi-Language**: Show implementations across languages (Python, Java, JavaScript, SQL, Bash, Docker, Git) where applicable
- **Template Format**: Follow consistent content structure (Overview → When to Use → Solution → Explanation → Variants → Best Practices → Common Mistakes → FAQ)
- **Internal Linking**: Use `relatedResources` frontmatter to link to 3–6 related resources

## Phase-Based Development

### Current Phase: Phase 3 — Guides Expansion & Content Scale

**Objective**: Expand guides coverage, scale content depth, and prepare for monetization

#### Completed

- Phase 0 — Foundation: Astro + Tailwind + CI/CD + SEO + Pagefind + Schemas
- Phase 1 — Recipes Launch: 432 recipes live across all major categories
- Phase 2 — Patterns & Scale: 203 patterns + tag system + filtering live
- Phase 3 in progress: Guides section launched; **210 guides** live (Architecture, Databases, DevOps, Security, Frontend, Code Quality, Testing). 177 docs templates live.

**Targets**:

- Complete all roadmap guides (currently at 210 guides live)
- Expand documentation templates section (currently 177 docs)
- Begin monetization setup (AdSense, affiliate) — Phase 4+
- Continue SEO long-tail coverage for guides
- Maintain bilingual parity (EN + ES) for every resource

### Phase 4 — Polish & Growth

- AI-assisted search enhancement
- Performance optimization (build time, bundle size)
- Analytics and tracking refinement
- Premium product exploration (templates packs, ebooks)
- Advertising integration (AdSense, affiliate links)

## Quality Standards

### Code Quality

- **TypeScript Strict**: Use strict TypeScript configuration
- **Clean Code**: Follow Robert C. Martin's Clean Code principles
- **Component Testing**: Add tests for critical components where applicable
- **Build Optimization**: Ensure fast build (under 30 seconds) and minimal output
- **Error Handling**: Implement proper error boundaries and fallbacks

### Content Quality

- **Practical Value**: Content must be immediately useful and runnable
- **SEO Optimized**: Include relevant keywords, structured data, meta tags
- **Well-Structured**: Use clear headings, tables for comparisons, code blocks with language tags
- **Regular Updates**: Keep content current and relevant
- **Internal Linking**: Link to related resources via `relatedResources` frontmatter and body links

### Performance Standards

- **Fast Loading**: Optimize for Core Web Vitals (LCP, INP, CLS)
- **Mobile-First**: Ensure mobile responsiveness
- **Accessibility**: Follow WCAG 2.2 guidelines
- **SEO Score**: Maintain high SEO scores
- **Bundle Size**: Keep JavaScript minimal; Astro ships zero JS by default

## Skills Usage Guidelines

### Mandatory Skills for Different Tasks

#### Astro Development

- **astro**: For building with the Astro framework
- **clean-code**: For code quality and maintainability

#### SEO Implementation

- **seo**: For all SEO-related tasks
- **structured-data**: For Schema.org markup

#### Styling

- **tailwind**: For Tailwind CSS v4+ work
- **responsive-design**: For responsive layouts
- **web-animation-design**: For animations and interactions

#### Content Management

- **stackp-content-creator**: For creating bilingual content with proper frontmatter
- **obsidian-markdown**: For content structure
- **seo**: For content optimization

#### Testing

- **playwright-best-practices**: For E2E tests
- **vitest**: For unit tests where applicable

#### Deployment

- **github-pages-deployment**: For deployment
- **github-actions-docs**: For CI/CD questions

## Workflow Rules

### 1. Always Check Roadmap First

Before implementing any feature:
1. Check `ref/docs/roadmap.md` for current phase
2. Verify feature aligns with current objectives
3. Ensure feature doesn't add unnecessary complexity
4. Confirm feature supports traffic, revenue, or user value

### 2. Use Skills Systematically

- **Identify the task type** (component, SEO, content, etc.)
- **Select appropriate skill(s)** from the available skills
- **Follow skill guidelines** for implementation
- **Apply skill best practices** consistently

### 3. Content-First Approach

- **Create content first**, then build features around it
- **SEO optimize from the start**
- **Structure for both humans and AI**
- **Focus on practical, reusable resources**

### 4. Static-First Constraint

- **No backend features** (no user accounts, no databases)
- **No dynamic content generation** (static only)
- **No real-time features** (no chat, no comments)
- **No authentication** (no login systems)

### 5. Monetization Rules

- **Phase 4+ only**: Don't implement monetization until Phase 4
- **User experience first**: Never compromise UX for revenue
- **Relevant only**: Only add relevant affiliate links (developer tools, courses, SaaS)
- **Non-intrusive**: Keep ads clean and minimal

## Implementation Checklist

### Before Starting Any Feature

- [ ] Check current phase in roadmap
- [ ] Verify feature supports current objectives
- [ ] Identify required skills
- [ ] Plan SEO integration (title, description, structured data, hreflang)
- [ ] Ensure static-first approach

### During Development

- [ ] Use appropriate skills
- [ ] Follow Astro component guidelines
- [ ] Implement SEO requirements on every page
- [ ] Maintain code quality
- [ ] Test responsive design

### Before Deployment

- [ ] Verify SEO meta tags in `<head>`
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Check Core Web Vitals metrics
- [ ] Validate structured data (Google Rich Results Test)
- [ ] Ensure hreflang tags present
- [ ] Run `astro build` successfully
- [ ] Run validation scripts (check translations, meta descriptions, broken links)
- [ ] Regenerate sitemap

## Content Validation Rules (MANDATORY)

Before creating any content file, verify ALL of the following. Build errors from invalid content are unacceptable.

### Topics Enum (Exact Values Only)

The ONLY valid `topics` values are: `data`, `api`, `authentication`, `file-handling`, `performance`, `testing`, `architecture`, `design`, `devops`, `databases`, `concurrency`, `security`, `ai`, `frontend`, `infrastructure`, `messaging`, `observability`, `graphql`, `serverless`, `caching`.

**Common replacements:**

- `web` → `frontend`
- `cloud` → `data` or `infrastructure`
- `sql` → `data` or `databases`
- `kubernetes` → `devops` or `infrastructure`
- `cryptography` → `security`
- `compliance` → `security`
- `operations` → `devops`
- `code-quality` → `testing`

### metaDescription Length

- **Minimum:** 50 characters
- **Maximum:** 170 characters
- Must appear in BOTH top-level frontmatter AND inside `seo:` block
- Spanish translations must also fit within 170 characters

### YAML Syntax

- Every list item MUST start with `-` (hyphen + space)
- Missing hyphens break the entire build
- Always verify the frontmatter renders correctly before committing

### Pre-Commit Checklist (Content)

1. Verify all `topics` against the enum list
2. Count `metaDescription` characters in both locations
3. Verify `relatedResources` point to existing slugs
4. Run `npm run content:quality` (0 errors, 0 warnings)
5. Run `npm run content:links` (0 broken related resources)
6. Run `npm run content:validate` and review warnings
7. Run `npm run check` (0 errors, 0 warnings; hints are informational)
8. Run `npm run build` locally and confirm no schema errors
9. Run `npm run sitemap` to regenerate `public/sitemap.xml`
10. Only then commit and push

## Common Pitfalls to Avoid

### Technical Pitfalls

- **Adding backend features** — Stay static-first
- **Over-engineering** — Keep it simple and maintainable
- **Ignoring SEO** — SEO is critical for traffic; every page needs unique meta
- **Performance issues** — Always optimize for speed; Astro helps by shipping zero JS
- **Hydrating unnecessarily** — Only hydrate interactive islands; keep the rest static
- **Invalid content topics** — Always check `src/content.config.ts` topics enum before adding new content
- **Meta descriptions too long** — Max 170 chars; build fails if exceeded

### Content Pitfalls

- **Generic content** — Focus on practical, runnable code and real examples
- **Poor structure** — Use clear headings and logical flow
- **No SEO optimization** — Include keywords, meta tags, FAQ sections
- **Inconsistent formatting** — Follow content templates from the skill
- **No internal linking** — Build logical connections with `relatedResources`
- **Single-language content** — Never create content without Spanish translation
- **Creating content without running build first** — Always validate locally before pushing

### Business Pitfalls

- **Early monetization** — Wait for Phase 4
- **Complex features** — Avoid unnecessary complexity
- **Ignoring user value** — Always prioritize users
- **Poor UX for revenue** — Never compromise experience
- **No content focus** — Content drives everything

## Success Metrics

### Technical Metrics

- **Build time**: 3–4 minutes for 3258 pages (Astro build ~3m, Pagefind indexing ~75s); monitor for degradation
- **JavaScript shipped**: Minimal (Astro ships zero JS by default)
- **Lighthouse score**: 95+ across all metrics
- **SEO score**: 95+ on SEO tools
- **Accessibility**: WCAG 2.2 AA compliance

### Content Metrics

- **Page count**: 3258 pages built (2042 Markdown files, EN + ES)
- **SEO ranking**: Target first page for key long-tail terms
- **Organic traffic**: Steady growth month over month
- **User engagement**: Low bounce rate, high time on page
- **Content quality**: Regular updates and improvements

### Business Metrics

- **Traffic growth**: Consistent organic growth
- **Revenue**: Start in Phase 4, grow steadily
- **User satisfaction**: Positive feedback and engagement
- **Domain authority**: Build strong developer authority
- **Brand recognition**: Become trusted engineering reference

## Audit, Build & Validation Workflow

### Standard commands

Run this sequence after any content or component change:

```bash
npm run content:quality    # 2042 files, expects 0 errors / 0 warnings
npm run content:links      # relatedResources integrity
npm run content:validate   # structural content warnings
npm run check              # Astro check, 0 errors / 0 warnings
npm run build              # full static build; 3258 pages expected
npm run sitemap            # regenerate public/sitemap.xml from dist/
```

### SEO/Content audit commands

```bash
node scripts/internal-linking-audit.cjs   # generates ref/internal-linking-data.json (gitignored)
python scripts/find-broken-body-links.py  # audit broken body links
python scripts/audit-thin-content.py      # audit thin content vs targets
```

### Bilingual parity & SEO URL contract

- `Seo.astro` expects a **locale-neutral** `path` prop. It then builds `canonical`, `hreflang`, Open Graph, and `x-default` URLs by prefixing `/es` when `locale === 'es'`. Passing an already-prefixed path (e.g., `/es/topics/...` instead of `/topics/...`) produces malformed double `/es/es/` URLs.
- Always pass `path` without the locale prefix to `Seo.astro`, `BaseLayout.astro`, and `ListingPage.astro`; `locale` handles the rest.
- Every English content file **must** have a matching `.es.md` with equivalent frontmatter, technical scope, code examples, and related resources.

### relatedResources conventions

- Use 3–6 coherent related resources per content file.
- Prefer reciprocal links within the same topic cluster (e.g., API recipes link to other API recipes/patterns).
- Keep EN and ES `relatedResources` lists identical in number, order, and target slugs.
- Run `npm run content:links` after changing `relatedResources` to confirm targets exist.

### Content quality guardrails

- Keep `metaDescription` between 50–170 characters in both top-level frontmatter and `seo.metaDescription`.
- Avoid duplicate H2/H3 headings inside the same page; FAQ sections are common culprits.
- Avoid generic AI-like filler when adding body links or cross-references.
- Run the AI detector (`python scripts/ai-detect-content.py <file>`) for high-traffic pages if the AI percentage is a concern.

## Remember

**The site should always remain:**
- Static
- Fast
- Useful
- Searchable
- Easy to maintain
- Focused on software engineers and developers

**If a feature does not help traffic, revenue, or user value, it should not be added yet.**

---

*This document should be updated as the project evolves through the roadmap phases.*
