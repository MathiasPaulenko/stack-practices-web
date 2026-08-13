# Technical SEO Audit — /recipes/optimistic-locking/

**Audit target:** `https://stackpractices.com/recipes/optimistic-locking/` (EN) and `https://stackpractices.com/es/recipes/optimistic-locking/` (ES)  
**Target type:** Recipe / Code reference  
**Auditor:** Senior Technical SEO Consultant (prompt 17 driven)

---

## 1. Executive Summary

`/recipes/optimistic-locking/` is a technically solid, bilingual recipe in the databases/concurrency cluster. After this audit, both language versions have clean hreflang/canonical tags, a correct sitemap entry, expanded keyword targeting, accurate descriptions, stronger internal linking, and a restructured FAQ that no longer pollutes the `FAQPage` schema with raw code blocks.

The highest-impact fix was **moving all code examples out of the FAQ and into a dedicated `Implementation Examples` / `Ejemplos de Implementación` section**. The previous `FAQPage` structured data was rendering multi-language code snippets (Python, JavaScript, MongoDB, DynamoDB, ETag, batch, merge) as plain-text answers, which is invalid for FAQ rich results and degrades GEO/AI-answer signals.

Other material fixes:

- Corrected the description so it no longer promises a MySQL example that did not exist.
- Expanded `seo.keywords` from 3 to 7 terms (`concurrency control`, `lost updates`, `sql`, `hibernate`).
- Reduced `relatedResources` to 6 and swapped a weak `database-migrations` link for the more relevant `concurrent-data-structures`.
- Added a contextual internal link to `concurrent-data-structures` in the `Explanation` trade-offs.
- Added `When not to use` guidance, `Production Notes`, `Key Takeaways` and `Further Reading` sections.

**Overall assessment:** the page is now prepared for sustainable organic growth. The remaining opportunities are site-level (custom OG images, per-page diagrams, author bios) and therefore out of scope for a single-resource audit.

---

## 2. Overall Score

| Dimension | Weight | Score | Notes |
| --- | ---: | ---: | --- |
| Technical SEO | 30% | 86 / 100 | Strong crawlability, canonicals, hreflang, sitemap, schema; generic OG image is the only page-level gap. |
| Content SEO | 30% | 84 / 100 | Accurate description, full keyword coverage, clean FAQ schema, dedicated implementation examples. |
| Information Architecture | 15% | 80 / 100 | Good database/concurrency cluster placement; 6 related resources now aligned. |
| User Experience | 10% | 78 / 100 | Copy-paste code, clear structure, bilingual parity; no table of contents or hero visual. |
| EEAT | 10% | 65 / 100 | Author and publisher present; no bio/credentials/review signals on the page. |
| Search Opportunity | 5% | 74 / 100 | Strong long-tail coverage; could benefit from a dedicated pessimistic-locking comparison page. |
| **Overall** | **100%** | **81 / 100** | **Ready for indexing and ranking** after the FAQ and metadata fixes. |

---

## 3. Critical Issues Found and Fixed

| ID | Category | Finding | Impact | Fix Applied |
| --- | --- | --- | --- | --- |
| C1 | Structured Data | `FAQPage` `acceptedAnswer.text` contained raw code blocks for 6 of 9 questions (retry, MongoDB, DynamoDB, ETag, batch, merge). Schema answers were 300–1,000+ chars of code, breaking FAQ rich-result eligibility and GEO signals. | Critical | Moved code to a new `Implementation Examples` / `Ejemplos de Implementación` H2. FAQ answers now contain 1–2 sentences of plain prose with a contextual link. |
| C2 | Content / SERP | `description` and `metaDescription` claimed "Practical examples in PostgreSQL, MySQL, and JPA/Hibernate" but no MySQL-specific example existed. | High | Rewrote descriptions to "Examples in SQL, Node.js, Java/JPA, MongoDB, DynamoDB and HTTP ETags" (accurate and ≤170 chars). |
| C3 | On-page SEO | `seo.keywords` only had 3 terms, under-utilising the query space for `concurrency control`, `lost updates`, `sql` and `hibernate`. | Medium | Expanded to 7 keywords in both EN and ES frontmatter. |
| C4 | Internal Linking | `relatedResources` had 8 entries and included `database-migrations` (weak relevance). | Medium | Reduced to 6 and replaced `database-migrations` with `concurrent-data-structures`. |
| C5 | Internal Linking | `Explanation` trade-offs discussed pessimistic locking but did not link to the concurrency cluster. | Low | Added contextual link to `concurrent-data-structures`. |
| C6 | Content / UX | No explicit `When not to use` guidance, no `Key Takeaways`, no `Further Reading`. | Low | Added all three sections in EN and ES. |

---

## 4. Crawlability

- **[OBSERVED]** `robots.txt` allows all user-agents and points to `https://stackpractices.com/sitemap.xml`.
- **[OBSERVED]** `public/sitemap.xml` contains both language variants:
  - EN: `https://stackpractices.com/recipes/optimistic-locking/`, `lastmod 2026-08-13`, `priority 0.8`.
  - ES: `https://stackpractices.com/es/recipes/optimistic-locking/`, correct `<xhtml:link rel="alternate" hreflang="..."/>` entries.
- **[OBSERVED]** The recipe is reachable from the `/recipes/` listing, the `/topics/databases/` hub, and the related-resource blocks of linked cluster pages.
- **[INFERRED]** No `noindex`, `nofollow`, redirect chains or canonical conflicts observed in the rendered HTML.
- **[REQUIRES DATA]** Live HTTP status, `X-Robots-Tag` headers, and Search Console indexation status cannot be verified from the build output alone.

**Crawlability score:** 9 / 10

---

## 5. Indexability

- **[OBSERVED]** Canonical URL is self-referencing and language-specific:
  - EN: `https://stackpractices.com/recipes/optimistic-locking/`
  - ES: `https://stackpractices.com/es/recipes/optimistic-locking/`
- **[OBSERVED]** Hreflang tags in `<head>` include `en`, `es` and `x-default`; x-default points to the English URL, matching the sitemap.
- **[OBSERVED]** No `noindex`/`nofollow` meta robots tags. The page is included in `sitemap.xml`.
- **[INFERRED]** No canonical-to-noindex, pagination or faceted-navigation conflicts.
- **[REQUIRES DATA]** Actual Google indexation and SERP presence require Search Console or live query data.

**Indexability score:** 9 / 10

---

## 6. URL Structure

- **[OBSERVED]** URL is `/recipes/optimistic-locking/` (EN) and `/es/recipes/optimistic-locking/` (ES). Short, keyword-rich, kebab-case, consistent trailing slash.
- **[OBSERVED]** The source file is `src/content/recipes/databases/optimistic-locking.md`; the URL drops the topic subfolder, matching the project-wide `/recipes/[slug]/` routing.
- **[INFERRED]** The URL is future-proof; the slug is stable and unlikely to change.

**URL Structure score:** 9 / 10

---

## 7. Site Architecture

- **[OBSERVED]** The recipe lives under `topics: databases` and `tags: database, concurrency, sql, postgresql`.
- **[OBSERVED]** It is linked from `/topics/databases/`, `/tags/concurrency/`, `/tags/sql/`, and `/tags/postgresql/` hubs.
- **[FIXED]** `relatedResources` now forms a coherent database/concurrency cluster: `database-deadlocks-retries`, `database-read-replicas`, `sql-joins`, `sql-performance-tuning-guide`, `deadlock-prevention-sql`, `concurrent-data-structures`.
- **[INFERRED]** A dedicated `/recipes/pessimistic-locking/` or `/recipes/optimistic-vs-pessimistic-locking/` comparison page would strengthen the cluster and capture comparison intent.

**Site Architecture score:** 8 / 10

---

## 8. Internal Linking

- **[OBSERVED]** Contextual body links exist to:
  - `/recipes/database-transactions/` in `When to Use`.
  - `/recipes/call-rest-api/` in `When to Use`.
  - `/recipes/retry-backoff/` in `What Works`.
  - `/recipes/locks-and-mutexes/` in `Common Mistakes` and `When not to use`.
  - `/patterns/circuit-breaker-pattern/` in FAQ microservices answer.
- **[FIXED]** Added link to `/recipes/concurrent-data-structures/` in `Explanation` trade-offs.
- **[FIXED]** Related resources reduced to 6, removing a weak `database-migrations` link.

**Internal Linking score:** 8 / 10

---

## 9. Content

- **[FIXED]** FAQ answers are now concise (1–2 sentences) and free of code.
- **[FIXED]** Code examples moved to `Implementation Examples` with clear, statement-style H3s.
- **[FIXED]** Spanish title changed from `Bloqueo Optimista: Versionado` to `Bloqueo optimista en bases de datos` to match the English title and improve topical clarity.
- **[FIXED]** `When not to use` section added with concrete alternatives.
- **[FIXED]** `Production Notes`, `Key Takeaways` and `Further Reading` added.
- **[INFERRED]** The content now covers the major optimistic-locking implementation patterns across SQL, JPA, MongoDB, DynamoDB and HTTP ETags. It satisfies informational + practical search intent.

**Content score:** 85 / 100

---

## 10. Structured Data

- **[OBSERVED]** `TechArticle` schema includes `headline`, `description`, `inLanguage`, `educationalLevel`, `articleSection`, `keywords`, `dateModified`, `datePublished`, `author` and `publisher`.
- **[OBSERVED]** `BreadcrumbList` schema with Home → Recipes → Recipe.
- **[FIXED]** `FAQPage` schema now has 9 questions with plain-text `acceptedAnswer.text` values between ~50 and ~220 characters. No code, no markdown fences, no broken formatting.
- **[INFERRED]** The FAQ is now eligible for FAQ rich results and suitable for AI-citation/GEO.

**Structured Data score:** 90 / 100

---

## 11. International SEO

- **[OBSERVED]** Bilingual EN/ES versions are complete and aligned in structure, code, FAQ count and related resources.
- **[OBSERVED]** Hreflang tags and sitemap alternates are correct.
- **[FIXED]** Spanish `title`, `description`, `metaDescription` and `seo.keywords` translated and expanded in parity with English.

**International SEO score:** 90 / 100

---

## 12. Production / Trust

- **[OBSERVED]** `author` is `Mathias Paulenko`; `publisher` is `StackPractices`.
- **[INFERRED]** No author bio, credentials or review signals on the page itself; consistent with the rest of the site.
- **[REQUIRES DATA]** Core Web Vitals, actual page speed and mobile rendering cannot be measured from the build output alone.

**Production / Trust score:** 70 / 100

---

## 13. Priority Roadmap

- **P0 — Done** — Restructure FAQ to remove code from `FAQPage` schema.
- **P0 — Done** — Correct description and expand keywords.
- **P1 — Done** — Align related resources and add contextual internal link.
- **P2 — Optional** — Generate a per-recipe OG image or a small architecture/flow diagram for `og:image` and social sharing.
- **P2 — Optional** — Create a dedicated comparison recipe (`optimistic-vs-pessimistic-locking`) to own comparison SERPs and strengthen the cluster.
- **P2 — Optional** — Add a `TechArticle.image` or `ImageObject` to the schema if a custom hero image is produced.

---

## 14. Final Verdict

**Status: ready for indexing and sustainable organic growth.**

The page is technically sound, intent-aligned, and now presents clean structured data. The biggest SEO risk — broken `FAQPage` answers containing code — has been eliminated. The remaining opportunities are site-level or cluster-expansion work that should be handled separately.
