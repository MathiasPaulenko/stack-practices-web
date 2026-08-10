# Master Audit Checklist — qapractices.com

# Executive Summary

| Metric | Value |
|--------|-------|
| Overall Website Health | Poor |
| Overall SEO Health | Critical |
| Overall Technical Health | Critical |
| Overall Content Health | Poor |
| Overall Google Confidence | 15/100 |
| Critical Issues | 7 |
| High Priority Issues | 12 |
| Medium Priority Issues | 7 |
| Low Priority Issues | 2 |
| Total Issues in Master Checklist | 28 |

## Core problem statement

qapractices.com is a technically broken, JavaScript-only, templated content library with no authority. Googlebot can discover the URLs but is forced to follow a redirect on every URL, download and execute a large Angular bundle, and render templated content on a one-month-old domain with zero backlinks. The economically rational decision for Google is to not index or rank the site.

## What must be true before content can rank

1. Every URL, canonical, hreflang and sitemap loc must use the trailing slash that GitHub Pages serves.
2. Content must be present in the static HTML without requiring JavaScript.
3. Structured data must be present in the static HTML.
4. Low-value / duplicate / noIndex pages must be removed or consolidated.
5. Content must be de-templated, humanized, and enriched with examples, images, and citations.
6. Authority must be earned through backlinks and original contributions.

## Critical Issues (P0)

### ISSUE-001 — Sitemap URLs redirect from non-slash to slash

- [ ] **Sitemap URLs redirect from non-slash to slash**

**Category:** Technical > Indexability

**Description:** 2,349 of 2,352 URLs in the live sitemap perform a 301 redirect because the sitemap lists non-trailing-slash URLs while GitHub Pages serves directory pages with a trailing slash. Google treats a sitemap full of 301s as a low-quality sitemap.

**Affected URLs:** 2,349 of 2,352 sitemap URLs (all non-root pages)

**Evidence:** ref/sitemap-validation.json: 2,349 redirects, average HEAD response time 3,705 ms, max 5,157 ms.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Critical · **Priority:** P0 · **Confidence:** High (100%)

**Impact:** Business High / SEO Critical / Technical High / Content Low

**Effort:** 2–3 days

**Dependencies:** Must fix before resubmitting sitemap to Google. Blocks ISSUE-002 and ISSUE-003.

---

### ISSUE-002 — Canonical tags omit trailing slash

- [ ] **Canonical tags omit trailing slash**

**Category:** Technical > Canonical

**Description:** Every canonical link and Open Graph URL uses the non-trailing-slash version, which immediately redirects. This creates a canonical/URL mismatch and prevents Google from consolidating signals to the served URL.

**Affected URLs:** 2,349 non-root pages

**Evidence:** ref/googlebot-render-results.json: canonical for /checklists/ab-testing-qa-checklist is /checklists/ab-testing-qa-checklist while final URL is /checklists/ab-testing-qa-checklist/. ref/hreflang-validation.json confirms the same pattern.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Critical · **Priority:** P0 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO Critical / Technical High / Content Low

**Effort:** 1–2 days

**Dependencies:** Depends on ISSUE-001 fix (same root cause).

---

### ISSUE-003 — Hreflang alternate URLs omit trailing slash

- [ ] **Hreflang alternate URLs omit trailing slash**

**Category:** Technical > hreflang

**Description:** All 4,700 en + es alternate URLs in hreflang and sitemap omit the trailing slash and therefore redirect. The x-default also points to the redirecting URL.

**Affected URLs:** 4,700 alternate URLs (2,350 en + 2,350 es)

**Evidence:** ref/hreflang-validation.json: trailingSlashMissing = 4,700, xDefaultIssues = 2,350.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Critical · **Priority:** P0 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO Critical / Technical High / Content Low

**Effort:** 1–2 days

**Dependencies:** Depends on ISSUE-001 fix.

---

### ISSUE-004 — Content is not present in static HTML

- [ ] **Content is not present in static HTML**

**Category:** Technical > Rendering

**Description:** Angular prerender is disabled and postbuild.js only injects head tags. The static HTML body is <app-root></app-root> plus scripts. Googlebot must execute JavaScript to see title, headings, paragraphs, lists, tables, and links.

**Affected URLs:** All 2,350 pages

**Evidence:** ref/googlebot-render-results.json: raw detail page has 11 visible words vs 1,764 after JS. Raw HTML size ~8 KB vs rendered HTML ~75 KB. angular.json: prerender false.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md, 10_final_report.md

**Severity:** Critical · **Priority:** P0 · **Confidence:** High (100%)

**Impact:** Business High / SEO Critical / Technical Critical / Content High

**Effort:** 2–4 weeks

**Dependencies:** Blocks ISSUE-005 and ISSUE-006. Prerequisite for any content to be indexed reliably.

---

### ISSUE-005 — Structured data is rendered only by JavaScript

- [ ] **Structured data is rendered only by JavaScript**

**Category:** Technical > Schema

**Description:** TechArticle, BreadcrumbList, FAQPage and Person JSON-LD are injected by Angular at runtime. The static HTML only contains Organization and WebPage schema.

**Affected URLs:** All resource detail and topic pages

**Evidence:** ref/googlebot-render-results.json: static HTML has 2 JSON-LD objects; rendered page has 5+ including TechArticle and BreadcrumbList.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** High · **Priority:** P0 · **Confidence:** High (95%)

**Impact:** Business Medium / SEO High / Technical High / Content Low

**Effort:** 1 week

**Dependencies:** Depends on ISSUE-004 (prerendering or static build).

---

### ISSUE-008 — Internal relatedResources links point to redirecting URLs

- [ ] **Internal relatedResources links point to redirecting URLs**

**Category:** Internal Linking > Architecture

**Description:** All 14,264 internal relatedResources links use non-trailing-slash URLs that 301 redirect. This doubles crawl cost and dilutes PageRank.

**Affected URLs:** 14,264 internal links across 2,350 pages

**Evidence:** ref/internal-link-graph.json and ref/audit-data.json: 100% of relatedResources links omit trailing slash.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** High · **Priority:** P0 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical High / Content Low

**Effort:** 3–5 days

**Dependencies:** Depends on ISSUE-001.

---

### ISSUE-015 — Massive template repetition in body content

- [ ] **Massive template repetition in body content**

**Category:** Content > Helpful Content

**Description:** 922 entries contain the exact phrase "For related guidance, see". 100% of checklists, documentation, prompts, templates and test-cases share the same four sections.

**Affected URLs:** 2,347 content pages

**Evidence:** ref/audit-data.json: 922 template phrase occurrences. ref/body-phrase-counts.js. content-quality-scores-v2.json: 100% allFourSections for all resource types.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** Critical · **Priority:** P0 · **Confidence:** High (100%)

**Impact:** Business High / SEO Critical / Technical Low / Content Critical

**Effort:** 1–2 months

**Dependencies:** Must be addressed after technical fixes; humanizing while pages are not crawlable is wasted effort.

---

## High Priority Issues

### ISSUE-006 — Main JS bundle is 833 KB and must execute before content appears

- [ ] **Main JS bundle is 833 KB and must execute before content appears**

**Category:** Technical > Performance

**Description:** The main bundle is 833 KB raw / ~247 KB transferred, plus a ~246 KB content index JSON. First render takes 4.3–5.8 seconds in Playwright. This is a heavy render cost for Googlebot and users.

**Affected URLs:** All pages

**Evidence:** ref/googlebot-render-results.json: network log shows main-WVWP3FKM.js 246,830 bytes and index-en.json 246,073 bytes. Render time 4,332–5,799 ms.

**Source reports:** GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical High / Content Low

**Effort:** 2–3 weeks

**Dependencies:** Reduced once ISSUE-004 is fixed. Can be parallelized with content pruning.

---

### ISSUE-009 — 177 broken internal links return 404

- [ ] **177 broken internal links return 404**

**Category:** Internal Linking > Crawl Budget

**Description:** 177 internal links point to pages that no longer exist, wasting crawl budget and signaling low maintenance quality.

**Affected URLs:** 177 links from ref/audit-data.json

**Evidence:** ref/audit-data.json brokenLinks and AUDIT_REPORT.md Phase 4.4.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (95%)

**Impact:** Business Medium / SEO High / Technical Medium / Content Low

**Effort:** 2–3 days

**Dependencies:** Should be fixed after ISSUE-008 because relatedResources are being rewritten.

---

### ISSUE-010 — 813 pages receive zero incoming related links

- [ ] **813 pages receive zero incoming related links**

**Category:** Internal Linking > Topical Authority

**Description:** 34.6% of the corpus has no semantic inbound links. These pages are weak hubs and do not receive cluster authority.

**Affected URLs:** 813 pages (ref/internal-link-graph.json zero count)

**Evidence:** ref/internal-link-graph.json: 813 zero, 1,420 weak, 328 strong.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md, 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical Low / Content Medium

**Effort:** 2–4 weeks

**Dependencies:** Should follow ISSUE-008 and ISSUE-009. ref/09_internal_link_priorities.csv identifies candidates.

---

### ISSUE-011 — /editorial-policy route returns 404

- [ ] **/editorial-policy route returns 404**

**Category:** Technical > Architecture

**Description:** The editorial policy page is referenced in structured data and navigation but is not in app.routes.ts, so it returns 404.

**Affected URLs:** <https://qapractices.com/editorial-policy>

**Evidence:** GOOGLEBOT_FORENSIC_REPORT.md live URL behavior and ref/googlebot-render-results.json.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical Low / Content Medium

**Effort:** 1–2 days

**Dependencies:** None. Required for EEAT.

---

### ISSUE-012 — Legal and static pages have empty static bodies

- [ ] **Legal and static pages have empty static bodies**

**Category:** Technical > Rendering

**Description:** Privacy, Terms, Cookies, Disclaimer, Affiliate Disclosure and legal-notice pages exist but their static HTML bodies are empty, requiring JavaScript to display any content.

**Affected URLs:** /privacy, /terms, /cookies, /disclaimer, /affiliate-disclosure, /legal-notice and ES mirrors

**Evidence:** AUDIT_REPORT.md Phase 9.9 and GOOGLEBOT_FORENSIC_REPORT.md no-JS fetch samples.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical Medium / Content Medium

**Effort:** 3–5 days

**Dependencies:** Depends on ISSUE-004 (pre-rendering).

---

### ISSUE-016 — 147 English meta descriptions use the same formula

- [ ] **147 English meta descriptions use the same formula**

**Category:** Metadata > Helpful Content

**Description:** Checklist descriptions follow the pattern "X: validate key areas, prevent common issues, and release with confidence." This is a strong AI/template signal.

**Affected URLs:** 147 English checklist pages

**Evidence:** ref/description-patterns.js and ref/duplicate-analysis.json.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical Low / Content High

**Effort:** 3–5 days

**Dependencies:** Part of ISSUE-015 content cleanup.

---

### ISSUE-017 — Near-duplicate titles and slugs cause keyword cannibalization

- [ ] **Near-duplicate titles and slugs cause keyword cannibalization**

**Category:** Content > Helpful Content

**Description:** 795 English title pairs share >=70% word overlap and 556 URL slug pairs share >=60% token overlap. Many pages target the same query with minimal differentiation.

**Affected URLs:** 795 title pairs, 556 slug pairs

**Evidence:** ref/duplicate-analysis.json and ref/similar-urls.js output. ref/title-similarity.js.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (95%)

**Impact:** Business High / SEO High / Technical Low / Content High

**Effort:** 2–4 weeks

**Dependencies:** Use ref/05_merge_pages.csv and ref/06_redirect_pages.csv. Depends on content audit completion.

---

### ISSUE-018 — 99.97% of content pages have zero images or screenshots

- [ ] **99.97% of content pages have zero images or screenshots**

**Category:** Content > Practical Value

**Description:** Almost no content includes images, diagrams or screenshots. For a practical QA resource hub this seriously limits helpfulness and shareability.

**Affected URLs:** 2,347 content pages

**Evidence:** ref/content-quality-scores-v2.json: avgImages = 0 for every resource type.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business Medium / SEO High / Technical Low / Content Critical

**Effort:** 1–2 months

**Dependencies:** Best done while humanizing ISSUE-015.

---

### ISSUE-019 — Templates are Markdown tables, not downloadable files

- [ ] **Templates are Markdown tables, not downloadable files**

**Category:** Content > Practical Value

**Description:** Resource pages labeled as templates present tables instead of downloadable files (PDF, DOCX, XLSX). The search intent for "template" implies a file to download and use.

**Affected URLs:** 314 template pages (EN + ES)

**Evidence:** ref/content-quality-scores-v2.json: templates avgTables = 153.7. AUDIT_REPORT.md Phase 5.4.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** Medium (90%)

**Impact:** Business High / SEO Medium / Technical Medium / Content High

**Effort:** 2–4 weeks

**Dependencies:** Requires static asset hosting and template component update.

---

### ISSUE-020 — Test-case pages lack real examples

- [ ] **Test-case pages lack real examples**

**Category:** Content > Practical Value

**Description:** 91% of test-case pages do not have concrete examples. Test cases without example inputs and expected results are less useful.

**Affected URLs:** ~91% of 330 test-case pages

**Evidence:** ref/content-quality-scores-v2.json: test-cases pctExamples = 9%.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (95%)

**Impact:** Business Medium / SEO High / Technical Low / Content High

**Effort:** 2–3 weeks

**Dependencies:** Part of ISSUE-015 humanization.

---

### ISSUE-021 — Single author credited with 2,350 bilingual resources in ~1 month

- [ ] **Single author credited with 2,350 bilingual resources in ~1 month**

**Category:** EEAT > Authority

**Description:** One author is listed for the entire corpus. Combined with identical lastmod dates and templated content, this is a strong low-EEAT signal.

**Affected URLs:** All pages

**Evidence:** ref/audit-data.json: all entries author = Mathias Paulenko. lastUpdated = 2026-07-22 for 2,322 of 2,350 files.

**Source reports:** AUDIT_REPORT.md, 10_final_report.md

**Severity:** Critical · **Priority:** P1 · **Confidence:** High (100%)

**Impact:** Business High / SEO Critical / Technical Low / Content Medium

**Effort:** 2–4 weeks

**Dependencies:** Requires real bylines, editorial policy, and content refresh timestamps.

---

### ISSUE-027 — Average originality score is 41/100

- [ ] **Average originality score is 41/100**

**Category:** Content > Helpful Content

**Description:** Across 2,350 pages the average originality is 41. The strongest signal is template repetition and AI-typical phrasing.

**Affected URLs:** Whole corpus

**Evidence:** ref/index-worthiness-summary.json and ref/02_page_scores.csv.

**Source reports:** 10_final_report.md

**Severity:** High · **Priority:** P1 · **Confidence:** High (95%)

**Impact:** Business High / SEO High / Technical Low / Content Critical

**Effort:** 1–2 months

**Dependencies:** Driven by ISSUE-015.

---

## Medium Priority Issues

### ISSUE-007 — Hashed JS assets have Cache-Control max-age=600

- [ ] **Hashed JS assets have Cache-Control max-age=600**

**Category:** Technical > Performance

**Description:** Cache-Control for hashed JS is only 10 minutes, forcing Googlebot to re-download the bundle on every crawl.

**Affected URLs:** Hashed JS/CSS files

**Evidence:** AUDIT_REPORT.md Phase 3.5 and GOOGLEBOT_FORENSIC_REPORT.md network summary.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Medium · **Priority:** P2 · **Confidence:** Medium (90%)

**Impact:** Business Low / SEO Medium / Technical Medium / Content Low

**Effort:** 1 day

**Dependencies:** Requires GitHub Pages or CDN cache header configuration.

---

### ISSUE-013 — noIndex pages do not emit a static noindex meta tag

- [ ] **noIndex pages do not emit a static noindex meta tag**

**Category:** Technical > Indexability

**Description:** 32 content files have noIndex: true in frontmatter and are excluded from the sitemap, but the noindex directive is injected by JavaScript only. A non-JS crawler may not see it.

**Affected URLs:** 32 content files (16 EN + 16 ES)

**Evidence:** AUDIT_REPORT.md Phase 3.2 and grep for noIndex: true in src/assets/content.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Medium · **Priority:** P2 · **Confidence:** Medium (85%)

**Impact:** Business Low / SEO Medium / Technical Medium / Content Low

**Effort:** 2–3 days

**Dependencies:** Depends on ISSUE-004.

---

### ISSUE-014 — Sitemap in repository is stale and missing two pages

- [ ] **Sitemap in repository is stale and missing two pages**

**Category:** Technical > Indexability

**Description:** public/sitemap.xml in the repo contains 2,350 URLs and is missing /checklists/smoke-testing-checklist (EN + ES). The live sitemap has 2,352 URLs.

**Affected URLs:** 2 missing slugs

**Evidence:** AUDIT_REPORT.md Phase 2.1 and ref/live-sitemap-check.js.

**Source reports:** AUDIT_REPORT.md

**Severity:** Medium · **Priority:** P2 · **Confidence:** High (95%)

**Impact:** Business Low / SEO Medium / Technical Low / Content Low

**Effort:** 1 day

**Dependencies:** Fix together with ISSUE-001.

---

### ISSUE-022 — Zero indexed results and zero external mentions

- [ ] **Zero indexed results and zero external mentions**

**Category:** Authority > Backlinks

**Description:** site:qapractices.com returns 0 results and "qapractices.com" -site:qapractices.com returns 0 mentions. The domain has no backlink or brand signals.

**Affected URLs:** Entire domain

**Evidence:** GOOGLEBOT_FORENSIC_REPORT.md SERP evidence and AUDIT_REPORT.md authority section.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md, 10_final_report.md

**Severity:** Critical · **Priority:** P2 · **Confidence:** High (100%)

**Impact:** Business High / SEO Critical / Technical Low / Content Low

**Effort:** 3–6 months

**Dependencies:** Only meaningful after technical and content issues are resolved.

---

### ISSUE-023 — Identical lastmod dates for 99% of pages

- [ ] **Identical lastmod dates for 99% of pages**

**Category:** Technical > Metadata

**Description:** 2,322 of 2,350 content files have lastUpdated = 2026-07-22. This signals a single batch upload and reduces freshness trust.

**Affected URLs:** 2,322 content files

**Evidence:** AUDIT_REPORT.md Phase 2.5 and ref/audit-data.json.

**Source reports:** AUDIT_REPORT.md

**Severity:** Medium · **Priority:** P2 · **Confidence:** High (100%)

**Impact:** Business Low / SEO Medium / Technical Low / Content Low

**Effort:** 1–2 weeks

**Dependencies:** Fix while regenerating sitemap.

---

### ISSUE-025 — /all-resources listing may be a large DOM without pagination

- [ ] **/all-resources listing may be a large DOM without pagination**

**Category:** Technical > Performance

**Description:** The universal listing renders all resources in one DOM, which can slow rendering and crawl.

**Affected URLs:** <https://qapractices.com/all-resources>

**Evidence:** AUDIT_REPORT.md Phase 3.6 and GOOGLEBOT_FORENSIC_REPORT.md rendered internal links count = 122.

**Source reports:** AUDIT_REPORT.md, GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Medium · **Priority:** P2 · **Confidence:** Medium (80%)

**Impact:** Business Low / SEO Medium / Technical Medium / Content Low

**Effort:** 1–2 weeks

**Dependencies:** Can wait until after core technical fixes.

---

### ISSUE-028 — Average ranking potential is 29/100

- [ ] **Average ranking potential is 29/100**

**Category:** Authority > Backlinks

**Description:** Even after content scoring, average ranking potential is 29 because the domain lacks authority.

**Affected URLs:** Whole corpus

**Evidence:** ref/index-worthiness-summary.json and ref/02_page_scores.csv.

**Source reports:** 10_final_report.md

**Severity:** Critical · **Priority:** P2 · **Confidence:** High (90%)

**Impact:** Business High / SEO Critical / Technical Low / Content Low

**Effort:** 3–6 months

**Dependencies:** Requires resolution of ISSUE-004, ISSUE-015 and ISSUE-022.

---

## Low Priority Issues

### ISSUE-024 — Generic Open Graph image for every URL

- [ ] **Generic Open Graph image for every URL**

**Category:** Metadata > UX

**Description:** og:image and twitter:image point to the same generic og-image.png for every URL, reducing social share differentiation.

**Affected URLs:** All 2,350 pages

**Evidence:** GOOGLEBOT_FORENSIC_REPORT.md Phase 9.6 and raw HTML head.

**Source reports:** GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Low · **Priority:** P3 · **Confidence:** High (95%)

**Impact:** Business Low / SEO Low / Technical Low / Content Low

**Effort:** 1–2 weeks

**Dependencies:** Requires image generation pipeline.

---

### ISSUE-026 — Transitory 503 errors for three sitemap URLs

- [ ] **Transitory 503 errors for three sitemap URLs**

**Category:** Technical > Indexability

**Description:** Three HEAD requests returned 503 during the audit. This may be a transient GitHub Pages rate-limit and requires manual confirmation.

**Affected URLs:** 3 URLs in ref/sitemap-validation.json

**Evidence:** ref/sitemap-validation.json: 3 entries with status 503.

**Source reports:** GOOGLEBOT_FORENSIC_REPORT.md

**Severity:** Low · **Priority:** P3 · **Confidence:** Low (60%)

**Impact:** Business Low / SEO Low / Technical Low / Content Low

**Effort:** 1 hour

**Dependencies:** Re-check after ISSUE-001 is fixed.

---

## False Positives and Non-Issues

These findings were reported but are not problems or are expected behavior:

- **Navigation depth is 2 clicks** — this is actually good; all pages are reachable within 2 hops from the home page.
- **robots.txt is permissive** — there are no crawl blocks.
- **Sitemap XML is valid** — the structure is correct; the problem is the URLs inside it redirect.
- **Hreflang alternate links exist for every page** — the mapping is complete and bidirectional; the problem is the URLs use the wrong trailing slash.
- **EN/ES pairs are valid alternates** — there is a complete Spanish mirror, which is correct.
- **No infinite pagination or calendar crawl traps** — the site has no crawl traps beyond the large all-resources listing.

---

## Manual Validation Required

- **ISSUE-026** — Re-check the 3 URLs that returned 503 during the HEAD audit to confirm whether this was a transient GitHub Pages rate limit.
- **ISSUE-013** — Decide whether the 32 noIndex pages should remain noIndex, be deleted, or be merged.
- **ISSUE-019** — Validate which templates should become real downloadable files vs. which can remain as Markdown tables.
- **ISSUE-021** — Confirm authorship strategy: single expert voice vs. contributor bylines.

---

## Suggested Order of Execution

**Phase 1 — Technical foundation (do first):** ISSUE-001: Sitemap URLs redirect from non-slash to slash; ISSUE-002: Canonical tags omit trailing slash; ISSUE-003: Hreflang alternate URLs omit trailing slash; ISSUE-004: Content is not present in static HTML; ISSUE-005: Structured data is rendered only by JavaScript; ISSUE-008: Internal relatedResources links point to redirecting URLs; ISSUE-015: Massive template repetition in body content.

**Phase 2 — Structural cleanup:** ISSUE-009, ISSUE-010, ISSUE-011, ISSUE-012, ISSUE-013, ISSUE-014.

**Phase 3 — Content humanization:** ISSUE-015, ISSUE-016, ISSUE-017, ISSUE-018, ISSUE-019, ISSUE-020, ISSUE-021, ISSUE-027.

**Phase 4 — Authority and long-tail improvements:** ISSUE-022, ISSUE-028, ISSUE-024, ISSUE-025, ISSUE-023.

**Monitor / validate:** ISSUE-026.
