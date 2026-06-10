# StackPractices - Agent Guidelines

## Project Overview

StackPractices is a static, SEO-first developer knowledge base for software engineers. It provides practical code recipes, design patterns, reusable documentation templates, and long-form guides. The project follows the roadmap defined in `ref/roadmap.md` and evolves through the strategy: **Content → Traffic → Authority → Monetization**.

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
- **Analytics**: Google Analytics (future)
- **Ads**: Google AdSense (future, Phase 4+)
- **Icons**: Lucide (consistent iconography)

### 2. Project Structure

```
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
├── content/config.ts     # Content collection schemas (Zod)
├── styles/               # Global CSS and Tailwind theme
└── assets/               # Static assets (images, fonts)
public/
├── sitemap.xml           # Auto-generated multilingual sitemap
├── robots.txt            # Crawler directives
├── ads.txt               # AdSense verification (future)
└── assets/content/       # Auto-generated content indices (JSON)
```

### 3. Content Architecture

- **Markdown files** in `src/content/` with YAML frontmatter
- **Type-safe schemas** defined in `src/content/config.ts` using Zod
- **File-based routing** via Astro's `src/pages/` with `getStaticPaths()`
- **SEO-friendly URLs**: `/recipes/data/parse-json`, `/patterns/design/factory-pattern`
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
- **Internal Linking**: Use `relatedResources` frontmatter to link to at least 2-3 related resources

## Phase-Based Development

### Current Phase: Phase 0 — Foundation
**Objective**: Scaffold Astro project, set up build pipeline, create base layouts and design system

**Targets**:

- Astro project initialized with Tailwind CSS
- GitHub Pages deployment pipeline via GitHub Actions
- Base layout with navigation, footer, and SEO integration
- Content collection schemas (Zod) for recipes, patterns, docs, guides
- First recipe content (3-5 recipes) with Spanish translations
- Pagefind search integration
- Sitemap generation

### Phase 1 — Recipes Launch

- Launch Recipes section
- Focus on SEO long-tail queries ("how to parse json python", "how to call rest api javascript")
- Publish first indexed pages
- 20+ recipes covering Python, Java, JavaScript, SQL, Bash, Docker, Git

### Phase 2 — Patterns & Scale

- Add Patterns section
- Expand multi-language content (50+ total resources)
- Improve internal linking and cross-references
- Tag system and filtering

### Phase 3 — Documentation & Guides

- Add Documentation templates section
- Add Guides section
- Start monetization setup (AdSense, affiliate)

### Phase 4 — Polish & Growth

- AI-assisted search enhancement
- Performance optimization
- Analytics and tracking refinement
- Premium product exploration (templates packs, ebooks)

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
1. Check `ref/roadmap.md` for current phase
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

## Common Pitfalls to Avoid

### Technical Pitfalls

- **Adding backend features** - Stay static-first
- **Over-engineering** - Keep it simple and maintainable
- **Ignoring SEO** - SEO is critical for traffic; every page needs unique meta
- **Performance issues** - Always optimize for speed; Astro helps by shipping zero JS
- **Hydrating unnecessarily** - Only hydrate interactive islands; keep the rest static

### Content Pitfalls

- **Generic content** - Focus on practical, runnable code and real examples
- **Poor structure** - Use clear headings and logical flow
- **No SEO optimization** - Include keywords, meta tags, FAQ sections
- **Inconsistent formatting** - Follow content templates from the skill
- **No internal linking** - Build logical connections with `relatedResources`
- **Single-language content** - Never create content without Spanish translation

### Business Pitfalls

- **Early monetization** - Wait for Phase 4
- **Complex features** - Avoid unnecessary complexity
- **Ignoring user value** - Always prioritize users
- **Poor UX for revenue** - Never compromise experience
- **No content focus** - Content drives everything

## Success Metrics

### Technical Metrics

- **Build time**: Under 30 seconds
- **JavaScript shipped**: Minimal (Astro ships zero JS by default)
- **Lighthouse score**: 95+ across all metrics
- **SEO score**: 95+ on SEO tools
- **Accessibility**: WCAG 2.2 AA compliance

### Content Metrics

- **Page count**: Follow roadmap targets
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
