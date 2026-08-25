# StackPractices Web - Development Roadmap

> Última actualización: 2026-08-25
> Strategy: **Content → Traffic → Authority → Monetization**

---

## Phase 0: Foundation (Done)

- [x] Project scaffolding with Astro
- [x] Tailwind CSS setup
- [x] Pagefind search integration
- [x] GitHub Pages deployment pipeline
- [x] Base layout and design system
- [x] Navigation structure (by Type, Technology, Concept, Use Case)

## Phase 1: Recipes Launch (Done)

- [x] Recipe content collection schema
- [x] Recipe listing pages (EN + ES)
- [x] Recipe detail pages (EN + ES, full SEO + JSON-LD)
- [x] Code syntax highlighting (Shiki)
- [x] Multi-language variant switching (accessible CodeTabs)
- [x] SEO meta tags and sitemap (multilingual hreflang)
- [x] Initial recipe content (10 recipes)
- [x] Google indexing setup (Search Console + sitemap submit)

## Phase 2: Patterns & Scale (Done)

- [x] Pattern content collection schema
- [x] Pattern listing and detail pages
- [x] Expand patterns catalog (203 patterns across 10 categories)
- [x] Expand recipe catalog (431 recipes across 19 categories)
- [x] Cross-linking between recipes and patterns (3+ relatedResources on every item)
- [x] Tag system (tag index page + tag filtering)
- [x] Clickable tags on detail pages
- [x] Full-text search refinement (contentType filters, showFilters UI, type badges)

## Phase 3: Documentation & Guides (Content Complete)

- [x] Documentation template system (177 docs: ADRs, Runbooks, Checklists, Templates, Policies)
- [x] Guide content type (210 guides across 19 categories)
- [x] Printable/exportable docs (CSS print styles + print button)
- [x] Batch 2 content: 200 new items (60 recipes, 50 patterns, 50 guides, 40 docs)
- [x] Batch 3 content: 273 new items (82 recipes, 63 patterns, 63 guides, 65 docs)
- [x] Total content: 1.021 unique items (2.042 bilingual files)
- [x] Bilingual parity maintained (EN + ES) across all 1.021 items

### Phase 3 — SEO & Technical Audit (Done)

- [x] P0.1 — Fix 16 broken circuit-breaker body links (EN + ES)
- [x] P0.4 — Optimize snippet of `/recipes/api-documentation-openapi/` (title, meta, em-dashes)
- [x] P0.5 — Fix em-dash overuse in 5 top-priority resources (34 em-dashes eliminados)
- [x] P0.6 — Update roadmap with current counts; remove obsolete files
- [x] P0.7 — Measure Core Web Vitals (PageSpeed Insights, Lighthouse 13.4.1)
- [x] P1.2 — Translate 19 Spanish titles identical to English
- [x] P1.3 — Differentiate 2 cross-type title collisions (Recipe/Guide suffixes)
- [x] P1.6 — Connect GSC with GA4 (verified by user)
- [x] P1.10 — Verify Consent Mode v2 + fix race condition in consent restore
- [x] P1.11 — Clean 38 TypeScript/Astro hints (zod direct dep, unused vars)
- [x] P1.12 — Fix validator code-block parsing (74 false-positive H2 warnings → 0)
- [x] P2.2 — Add WebSite + Organization JSON-LD on both home pages
- [x] P2.3 — Add image sitemap entries (6.598 image entries across 3.254 URLs)

### Phase 3 — Pending

- [ ] P1.4 — Add custom dimension `contentType` in GA4
- [ ] P1.9 — Outbound / linkable asset outreach
- [ ] P2.1 — Investigate build size reduction / Pagefind split
- [ ] P2.7 — Activate GA4 AI Assistant channel tracking
- [ ] Monetization setup (AdSense activation, affiliate links)
- [ ] Donation integration (Ko-fi button already in footer)

## Phase 4: Polish & Growth

- [ ] AI-assisted search
- [ ] User contributions workflow
- [x] RSS feed (auto-generated EN + ES feeds with all content types)
- [x] Performance optimization (compressHTML, CSS code split, minify, dns-prefetch, deferred Pagefind)
- [x] Google Analytics 4 (G-RBE12WJ5KZ) + GTM (GTM-M66C9FWN)
- [x] Google Tag Manager integration (GTM-M66C9FWN)
- [x] Google Consent Mode v2 (advanced mode, cookieless pings, race condition fixed)
- [x] Cookie banner (EN + ES, Accept/Reject/Manage, localStorage persistence)
- [x] AdSense preparation (ads.txt, CSP, conditional loader tied to consent)
- [x] WebSite + Organization structured data on home pages
- [x] Image sitemap (inline entries, 6.598 images across 3.254 URLs)
- [x] SRI hashes on all 3.258 HTML files
- [ ] Analytics refinement (custom dimensions, AI Assistant channel)
- [ ] Content quality work (per-resource via `content-improvement` skill)

---

## Current Status Summary

### Content Count

- **Recipes**: 431 (862 bilingual files) — 19 categories
- **Patterns**: 203 (406 bilingual files) — 10 categories
- **Guides**: 210 (420 bilingual files) — 19 categories
- **Docs**: 177 (354 bilingual files) — ADRs, Runbooks, Checklists, Templates, Policies
- **Total**: 1.021 unique items (2.042 bilingual files)
- **Built pages**: 3.258
- **Sitemap URLs**: 3.254 (with 6.598 image entries)
- **Pagefind index**: 174.310 words across EN + ES

### Analytics & Measurement

- **GA4**: G-RBE12WJ5KZ (active, cookieless pings via Consent Mode v2 advanced)
- **GTM**: GTM-M66C9FWN (active)
- **GSC**: Linked to GA4 (verified)
- **Consent Mode v2**: ad_storage, analytics_storage, ad_user_data, ad_personalization (all default denied)
- **AdSense**: pub-9762280383707953 (ads.txt + CSP + conditional loader ready, not yet activated)
- **Cookie banner**: EN + ES, Accept/Reject/Manage, localStorage persistence

### Technical Health

- `npm run check` → 0 errors, 0 warnings, 0 hints
- `npm run content:quality` → 0 errors, 0 warnings
- `npm run content:validate` → 0 errors, 0 warnings
- `npm run build` → 3.258 pages OK
- `npm run sitemap` → 3.254 URLs, 6.598 image entries
- Core Web Vitals (Lighthouse lab data, mobile):
  - Home: Perf 82, LCP 4.2s (needs improvement), CLS 0, TBT 40ms
  - Guide page: Perf 100, LCP 1.1s, CLS 0.034, TBT 20ms
  - Desktop home: Perf 100, LCP 0.8s

### Recently Completed (2026-08-24/25)

- [x] P0.1 — Fix 16 broken circuit-breaker body links (EN + ES)
- [x] P0.4 — Optimize `/recipes/api-documentation-openapi/` snippet
- [x] P0.5 — Fix em-dash overuse in 5 top-priority resources (34 em-dashes)
- [x] P0.6 — Update roadmap counts; remove obsolete files
- [x] P0.7 — Measure Core Web Vitals via PageSpeed Insights
- [x] P1.2 — Translate 19 Spanish titles identical to English
- [x] P1.3 — Differentiate 2 cross-type title collisions (Recipe/Guide suffixes)
- [x] P1.6 — Connect GSC with GA4
- [x] P1.10 — Verify + fix Consent Mode v2 race condition
- [x] P1.11 — Clean 38 TypeScript/Astro hints
- [x] P1.12 — Fix validator code-block parsing (74 false positives → 0)
- [x] P2.2 — WebSite + Organization JSON-LD on both home pages
- [x] P2.3 — Image sitemap (6.598 entries across 3.254 URLs)

### Next Priorities

1. **P2.7** — Activate GA4 AI Assistant channel tracking (S)
2. **P1.4** — Add custom dimension `contentType` in GA4 (M)
3. **P2.1** — Investigate build size reduction / Pagefind split (M)
4. **P1.9** — Outbound / linkable asset outreach (L)
5. **Monetization** — AdSense activation, affiliate links
6. **Content quality** — Per-resource work via `content-improvement` skill (deferred)

---

## Content Quality (Deferred)

Content quality work (thin content expansion, body links, placeholders, CTAs, cluster diversification, AEO/GEO per resource) is tracked separately and will be done resource-by-resource using the `content-improvement` skill. See `ref/audit/reports/master-checklist.md` for the full content quality backlog.
