# Google Search Console Redirect Fixes

## Problem

Google Search Console reported "Page with redirect" errors for many URLs across `stackpractices.com`. The root cause was inconsistent trailing slash usage: GitHub Pages serves directory-based output with trailing slashes, but many internal links omitted them, causing 301 redirects.

## Solution

Enforced consistent trailing slashes across all internal URLs to match GitHub Pages directory structure.

### Changes

1. **`astro.config.mjs`**: Changed `trailingSlash` from `'ignore'` to `'always'`
2. **`src/lib/content.ts`**: Added trailing slashes to `entryHref`, `buildTagIndex`, and `resolveRelated` functions
3. **`src/components/RecipeArticle.astro`**: Trailing slashes on home, authors, tags, topics, and breadcrumb hrefs
4. **`src/components/ContentCard.astro`**: Trailing slashes on tag links
5. **All `[slug].astro` pages (EN+ES)**: Trailing slashes on `path` and `listingHref` props (recipes, patterns, docs, guides)
6. **All listing index pages (EN+ES)**: Trailing slashes on entry `href` and `path` (recipes, patterns, docs, guides)
7. **`src/components/ListingPage.astro`**: Trailing slash on ES `homeHref`
8. **Tag pages (EN+ES)**: Trailing slashes on `path` prop in `[tag].astro` and `index.astro`
9. **Topic pages (EN+ES)**: Trailing slashes on entry `href`, `path`, and breadcrumb URLs in `[topic].astro` and `index.astro`
10. **Home pages (EN+ES)**: Trailing slashes on all internal hrefs (search, content types, tags, topics, recipes)
11. **`Header.astro`**: Trailing slash on search link; language switcher ensures trailing slash on target path
12. **Static pages (EN+ES)**: Trailing slashes on all internal links across about, privacy, terms, cookies, legal-notice, affiliate-disclosure, editorial-policy, contact, authors, 404
13. **Author detail pages (EN+ES)**: Trailing slashes on work `href` and `webPage` URL

### Pre-existing fix

- **`src/content/guides/concurrency/complete-guide-python-asyncio.es.md`**: Shortened `metaDescription` (both top-level and `seo` block) to fit within 170 char schema limit

## Verification

- `npm run build` passes with 0 errors
- 5742 pages built successfully
- Pagefind index generated for 5742 pages across 2 languages
