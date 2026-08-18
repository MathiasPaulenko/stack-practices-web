# Content Improvement Pipeline Summary — generate-pdf-report-python

**Date:** 2026-08-18T07:16:16.509Z
**All passed:** Yes

## Steps
### content:quality — OK
- Command: `npm run content:quality`
- Exit code: 0

```text

> stack-practices-web@0.1.0 content:quality
> node scripts/content-quality-validator.cjs


╔══════════════════════════════════════════════════════════════════╗
║       StackPractices Content Quality Validator                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Files checked:  2042                                            ║
║  Errors:           0   ✅                                        ║
║  Warnings:         0   ✅                                        ║
╚══════════════════════════════════════════════════════════════════╝

✅ All content passes quality validation!

```

### content:links — OK
- Command: `npm run content:links`
- Exit code: 0

```text

> stack-practices-web@0.1.0 content:links
> node .agents/skills/stackp-content-creator/scripts/check-broken-links.cjs

Total indexed resources: 1021
Files checked: 1022
Broken relatedResources: 0

✅ All relatedResources links are valid.

```

### content:validate — OK
- Command: `npm run content:validate`
- Exit code: 0

```text
nt errors.
   [docs\templates\dependency-audit-template.md] Duplicate H2 heading: "decision". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "prerequisites". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "quick start". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "1. clone repository". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "2. install dependencies". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "3. copy environment file". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "5. run database migrations". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "6. seed test data". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "environment variables". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "verification". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "health check". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "expected response". Make unique to prevent MD024 lint errors.
   [docs\templates\environment-setup-guide-template.md] Duplicate H2 heading: "troubleshooting". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "summary". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "problem statement". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "proposed solution". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "acceptance criteria". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "user value". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "priority". Make unique to prevent MD024 lint errors.
   [docs\templates\feature-request-template.md] Duplicate H2 heading: "additional context". Make unique to prevent MD024 lint errors.
   [docs\templates\post-deployment-checklist-template.md] Duplicate H2 heading: "deployment info". Make unique to prevent MD024 lint errors.
   [docs\templates\post-deployment-checklist-template.md] Duplicate H2 heading: "health checks". Make unique to prevent MD024 lint errors.
   [docs\templates\post-deployment-checklist-template.md] Duplicate H2 heading: "smoke tests". Make unique to prevent MD024 lint errors.
   [docs\templates\post-deployment-checklist-template.md] Duplicate H2 heading: "metrics validation". Make unique to prevent MD024 lint errors.
   [docs\templates\post-deployment-checklist-template.md] Duplicate H2 heading: "rollback readiness". Make unique to prevent MD024 lint errors.
   [docs\templates\post-deployment-checklist-template.md] Duplicate H2 heading: "sign-off". Make unique to prevent MD024 lint errors.
   [docs\templates\pull-request-template.md] Duplicate H2 heading: "description". Make unique to prevent MD024 lint errors.
   [docs\templates\pull-request-template.md] Duplicate H2 heading: "type of change". Make unique to prevent MD024 lint errors.
   [docs\templates\pull-request-template.md] Duplicate H2 heading: "changes made". Make unique to prevent MD024 lint errors.
   [docs\templates\pull-request-template.md] Duplicate H2 heading: "testing". Make unique to prevent MD024 lint errors.
   [docs\templates\pull-request-template.md] Duplicate H2 heading: "checklist". Make unique to prevent MD024 lint errors.
   [docs\templates\readme-template.md] Duplicate H2 heading: "contributing". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "highlights". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "breaking changes". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "new capabilities". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "improvements". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "bug fixes". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "security". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "deprecations". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "upgrade instructions". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "known issues". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "full changelog". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "improvements". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "bug fixes". Make unique to prevent MD024 lint errors.
   [docs\templates\release-notes-template.md] Duplicate H2 heading: "breaking changes". Make unique to prevent MD024 lint errors.

✅ All content passes validation!

```

### check — OK
- Command: `npm run check`
- Exit code: 0

```text
 [0m [93m                 ~[0m
[96msrc/content.config.ts[0m:[93m59[0m:[93m18[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m59[0m     contentType: z.literal('recipes'),
[7m  [0m [93m                 ~[0m
[96msrc/content.config.ts[0m:[93m52[0m:[93m23[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m52[0m     keywords: z.array(z.string()).default([]),
[7m  [0m [93m                      ~[0m
[96msrc/content.config.ts[0m:[93m52[0m:[93m15[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m52[0m     keywords: z.array(z.string()).default([]),
[7m  [0m [93m              ~[0m
[96msrc/content.config.ts[0m:[93m51[0m:[93m22[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m51[0m     metaDescription: z.string(),
[7m  [0m [93m                     ~[0m
[96msrc/content.config.ts[0m:[93m50[0m:[93m8[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m50[0m   seo: z.object({
[7m  [0m [93m       ~[0m
[96msrc/content.config.ts[0m:[93m49[0m:[93m10[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m49[0m   draft: z.boolean().default(false),
[7m  [0m [93m         ~[0m
[96msrc/content.config.ts[0m:[93m48[0m:[93m11[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m48[0m   author: z.string().default('StackPractices'),
[7m  [0m [93m          ~[0m
[96msrc/content.config.ts[0m:[93m47[0m:[93m16[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m47[0m   publishedAt: z.coerce.date().optional(),
[7m  [0m [93m               ~[0m
[96msrc/content.config.ts[0m:[93m46[0m:[93m16[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m46[0m   lastUpdated: z.coerce.date(),
[7m  [0m [93m               ~[0m
[96msrc/content.config.ts[0m:[93m45[0m:[93m29[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m45[0m   relatedResources: z.array(z.string()).default([]),
[7m  [0m [93m                            ~[0m
[96msrc/content.config.ts[0m:[93m45[0m:[93m21[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m45[0m   relatedResources: z.array(z.string()).default([]),
[7m  [0m [93m                    ~[0m
[96msrc/content.config.ts[0m:[93m44[0m:[93m17[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m44[0m   tags: z.array(z.string()).min(1),
[7m  [0m [93m                ~[0m
[96msrc/content.config.ts[0m:[93m44[0m:[93m9[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m44[0m   tags: z.array(z.string()).min(1),
[7m  [0m [93m        ~[0m
[96msrc/content.config.ts[0m:[93m43[0m:[93m11[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m43[0m   topics: z.array(topicsEnum).min(1),
[7m  [0m [93m          ~[0m
[96msrc/content.config.ts[0m:[93m41[0m:[93m20[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m41[0m   metaDescription: z.string().min(50).max(170),
[7m  [0m [93m                   ~[0m
[96msrc/content.config.ts[0m:[93m40[0m:[93m16[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m40[0m   description: z.string(),
[7m  [0m [93m               ~[0m
[96msrc/content.config.ts[0m:[93m39[0m:[93m10[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m39[0m   title: z.string(),
[7m  [0m [93m         ~[0m
[96msrc/content.config.ts[0m:[93m38[0m:[93m9[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m38[0m   slug: z.string(),
[7m  [0m [93m        ~[0m
[96msrc/content.config.ts[0m:[93m37[0m:[93m20[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m37[0m const baseSchema = z.object({
[7m  [0m [93m                   ~[0m
[96msrc/content.config.ts[0m:[93m31[0m:[93m24[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m31[0m const difficultyEnum = z.enum(['beginner', 'intermediate', 'advanced']);
[7m  [0m [93m                       ~[0m
[96msrc/content.config.ts[0m:[93m8[0m:[93m27[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m8[0m export const topicsEnum = z.enum([
[7m [0m [93m                          ~[0m
[96msrc/content.config.ts[0m:[93m1[0m:[93m28[0m - [93mwarning[0m[90m ts(6385): [0m'z' is deprecated.

[7m1[0m import { defineCollection, z } from 'astro:content';
[7m [0m [93m                           ~[0m

[96msrc/components/Seo.astro[0m:[93m213[0m:[93m38[0m - [93mwarning[0m[90m ts(6133): [0m'addBrand' is declared but its value is never read.

[7m213[0m function makeTitle(rawTitle: string, addBrand: boolean): string {
[7m   [0m [93m                                     ~~~~~~~~[0m
[96msrc/components/Seo.astro[0m:[93m103[0m:[93m7[0m - [93mwarning[0m[90m ts(6133): [0m'brandSuffix' is declared but its value is never read.

[7m103[0m const brandSuffix = effectiveType
[7m   [0m [93m      ~~~~~~~~~~~[0m

[96msrc/components/layout/Header.astro[0m:[93m11[0m:[93m7[0m - [93mwarning[0m[90m ts(6133): [0m'navPrefix' is declared but its value is never read.

[7m11[0m const navPrefix = locale === 'es' ? '/es/' : '/';
[7m  [0m [93m      ~~~~~~~~~[0m

[96msrc/layouts/BaseLayout.astro[0m:[93m42[0m:[93m13[0m - [93mwarning[0m[90m astro(4000): [0mThis script will be treated as if it has the `is:inline` directive because it contains an attribute. Therefore, features that require processing (e.g. using TypeScript or npm packages in the script) are unavailable.

See docs for more details: https://docs.astro.build/en/guides/client-side-scripts/#script-processing.

Add the `is:inline` directive explicitly to silence this hint.

[7m42[0m     <script async src="/analytics.js"></script>
[7m  [0m [93m            ~~~~~[0m

Result (211 files): 
- 0 errors
- 0 warnings
- 84 hints


```

### build — OK
- Command: `npm run build`
- Exit code: 0

```text
4m├─[39m [2m/topics/performance/6/index.html[22m [2m(+23ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/index.html[22m [2m(+27ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/2/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/3/index.html[22m [2m(+9ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/4/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/5/index.html[22m [2m(+15ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/6/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/7/index.html[22m [2m(+9ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/8/index.html[22m [2m(+10ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/9/index.html[22m [2m(+22ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/architecture/10/index.html[22m [2m(+7ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/authentication/index.html[22m [2m(+12ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/authentication/2/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/caching/index.html[22m [2m(+9ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/caching/2/index.html[22m [2m(+36ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/concurrency/index.html[22m [2m(+67ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/concurrency/2/index.html[22m [2m(+19ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/messaging/index.html[22m [2m(+115ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/messaging/2/index.html[22m [2m(+65ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/data/index.html[22m [2m(+40ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/data/2/index.html[22m [2m(+8ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/data/3/index.html[22m [2m(+8ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/data/4/index.html[22m [2m(+12ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/data/5/index.html[22m [2m(+7ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/observability/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/observability/2/index.html[22m [2m(+12ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/observability/3/index.html[22m [2m(+9ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/index.html[22m [2m(+11ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/2/index.html[22m [2m(+8ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/3/index.html[22m [2m(+34ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/4/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/5/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/6/index.html[22m [2m(+5ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/7/index.html[22m [2m(+30ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/design/8/index.html[22m [2m(+16ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/file-handling/index.html[22m [2m(+12ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/file-handling/2/index.html[22m [2m(+10ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/graphql/index.html[22m [2m(+11ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/graphql/2/index.html[22m [2m(+11ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/testing/index.html[22m [2m(+6ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/testing/2/index.html[22m [2m(+10ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/testing/3/index.html[22m [2m(+18ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/testing/4/index.html[22m [2m(+9ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/testing/5/index.html[22m [2m(+14ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/serverless/index.html[22m [2m(+16ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/serverless/2/index.html[22m [2m(+8ms)[22m 
[2m15:11:22[22m   [34m├─[39m [2m/topics/index.html[22m [2m(+188ms)[22m 
[2m15:11:23[22m   [34m├─[39m [2m/index.html[22m [2m(+179ms)[22m 
[2m15:11:23[22m [32m✓ Completed in 1m 31s.
[39m
[2m15:11:23[22m [34m[build][39m [32m✓ Completed in 1m 60s.[39m
[2m15:11:23[22m [34m[build][39m 3242 page(s) built in [1m2m 10s[22m
[2m15:11:23[22m [34m[build][39m [1mComplete![22m

> stack-practices-web@0.1.0 postbuild
> node scripts/minify-classes.mjs && node scripts/minify-json.mjs && node scripts/trim-html-attrs.mjs && node scripts/clean-dist-assets.mjs && pagefind --site dist && node scripts/add-sri.mjs


Running Pagefind v1.5.2 (Extended)
Running from: "D:\\Codigo\\stack-practices-web"
Source:       "dist"
Output:       "dist\\pagefind"

[Walking source directory]
Found 3242 files matching **/*.{html}

[Parsing files]
Found a data-pagefind-body element on the site.
↳ Ignoring pages without this tag.

[Reading languages]
Discovered 2 languages: es, en

[Building search indexes]
Total: 
  Indexed 2 languages
  Indexed 3242 pages
  Indexed 175603 words
  Indexed 4 filters
  Indexed 0 sorts

┌─────────────────────────────────────────────────────────────────────────┐
│  Pagefind found references to the Default UI (pagefind-ui.js)           │
│  on your site. The Default UI is supported and will continue            │
│  to work.                                                               │
│                                                                         │
│  As of 1.5.0, if you are setting up a new integration, use the          │
│  Component UI instead. It includes a search modal, better               │
│  accessibility and customization: https://pagefind.app/docs/search-ui/  │
└─────────────────────────────────────────────────────────────────────────┘

Finished in 69.963 seconds
Added SRI hashes to 3242 HTML files.

```

### sitemap — OK
- Command: `npm run sitemap`
- Exit code: 0

```text

> stack-practices-web@0.1.0 sitemap
> python scripts/generate-sitemap-from-dist.py

Generated sitemap.xml with 3238 URLs
  Written to: D:\Codigo\stack-practices-web\public\sitemap.xml
  Written to: D:\Codigo\stack-practices-web\dist\sitemap.xml

```
