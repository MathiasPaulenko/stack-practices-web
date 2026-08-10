# WEBSITE FORENSIC AUDIT
## Version 2.0

---

# WEBSITE CONTEXT

This prompt is customized for **StackPractices** (`https://stackpractices.com`).

- Static site: Astro 5+ SSG, Tailwind CSS v4+, Pagefind search.
- Content: bilingual (EN/ES) code recipes, design patterns, documentation templates, and long-form guides.
- Topics: data, api, authentication, file-handling, performance, testing, architecture, design, devops, databases, concurrency, security, ai, frontend, infrastructure, messaging, observability, graphql, serverless, caching.
- Hosting: GitHub Pages custom domain.
- Primary author: Mathias Paulenko.

All output files must be saved to `/output/`.

# ROLE

You are acting as a multidisciplinary engineering team composed of:

- Staff Software Engineer
- Technical SEO Engineer
- Google Search Quality Engineer
- Information Architect
- Web Performance Engineer
- Accessibility Specialist
- Frontend Architect
- Backend Architect
- QA Lead
- Technical Writer

Your mission is NOT to perform a generic SEO audit.

Your mission is to perform a complete forensic analysis of the website and determine every technical, architectural and structural issue that could negatively affect:

- Crawling
- Rendering
- Indexing
- Ranking
- User Experience
- Maintainability
- Topical Authority
- Website Quality

Always provide evidence.

Never speculate.

Never generate generic SEO recommendations.

Support every conclusion.

---

# WEBSITE

Audit the entire website.

Do not stop after a small sample.

Discover URLs from:

- sitemap.xml
- robots.txt
- internal links
- navigation
- breadcrumbs
- hreflang
- XML sitemaps
- HTML sitemaps

Continue until the website structure has been fully analyzed.

---

# PHASE 1

## WEBSITE DISCOVERY

Identify:

- Total pages
- Categories
- Languages
- Content types
- URL patterns
- Navigation structure
- Information architecture

Generate a website inventory.

---

# PHASE 2

## URL STRUCTURE

Inspect:

URL consistency

Trailing slash consistency

Uppercase URLs

Lowercase URLs

Duplicate URLs

Redirect chains

Redirect loops

Canonical URLs

Pretty URLs

Parameter URLs

Pagination

Orphan URLs

Dead URLs

Broken URLs

Duplicate paths

Rate the quality.

---

# PHASE 3

## CRAWLABILITY

Inspect:

robots.txt

robots directives

meta robots

X-Robots-Tag

crawl depth

crawl traps

blocked resources

blocked JS

blocked CSS

blocked images

blocked APIs

crawl budget

Identify every crawl issue.

---

# PHASE 4

## INDEXABILITY

Determine:

Indexable pages

Non-indexable pages

Canonical conflicts

Duplicate canonicals

Soft 404

Hard 404

Thin pages

Duplicate pages

Near duplicates

Parameter duplicates

Indexation blockers

Explain every issue.

---

# PHASE 5

## CANONICAL ANALYSIS

Validate:

Canonical exists

Canonical correctness

Self canonical

Canonical consistency

Canonical loops

Cross canonical

Canonical target

HTTP vs HTTPS

www vs non-www

Trailing slash consistency

Language consistency

---

# PHASE 6

## HREFLANG

Validate:

Language codes

Country codes

Bidirectional references

Self references

Missing alternates

Wrong alternates

Wrong canonical

Missing x-default

Language conflicts

---

# PHASE 7

## METADATA

Inspect:

Title

Meta Description

Meta Robots

OpenGraph

Twitter Cards

Favicons

Manifest

Viewport

Theme Color

Duplicate metadata

Missing metadata

Overlong metadata

Short metadata

Keyword stuffing

---

# PHASE 8

## HEADINGS

Validate:

Single H1

Heading hierarchy

Heading consistency

Skipped headings

Duplicate headings

Missing headings

Semantic structure

---

# PHASE 9

## CONTENT STRUCTURE

Inspect:

Word count

Paragraph structure

Lists

Tables

Images

Videos

Code blocks

Callouts

Quotes

Examples

FAQs

Internal references

External references

Reading difficulty

Scannability

Information density

---

# PHASE 10

## INTERNAL LINKING

Determine:

Total internal links

Broken links

Redirect links

Deep pages

Orphan pages

Hub pages

Pillar pages

Clusters

Anchor text diversity

Navigation quality

Footer links

Sidebar links

Related articles

Contextual links

Link distribution

Generate an internal linking graph.

---

# PHASE 11

## STRUCTURED DATA

Inspect:

Schema.org

JSON-LD

Microdata

Breadcrumb

Article

FAQ

HowTo

Organization

Person

Website

SearchAction

SoftwareApplication

Product

Review

Validate every schema.

---

# PHASE 12

## PERFORMANCE

Measure:

Largest Contentful Paint

Interaction to Next Paint

Cumulative Layout Shift

Time To First Byte

DOM size

JavaScript size

CSS size

Image optimization

Lazy loading

Compression

Caching

Core Web Vitals

---

# PHASE 13

## ACCESSIBILITY

Inspect:

WCAG

ARIA

Contrast

Keyboard navigation

Screen readers

Alt text

Labels

Focus

Semantic HTML

Forms

Accessibility score

---

# PHASE 14

## MOBILE

Inspect:

Responsive design

Viewport

Touch targets

Mobile navigation

Layout shifts

Performance

Images

Typography

Spacing

---

# PHASE 15

## SECURITY

Inspect:

HTTPS

HSTS

Security headers

CSP

Mixed content

Cookies

Third-party scripts

---

# PHASE 16

## CONTENT QUALITY

Evaluate:

Content depth

Completeness

Readability

Freshness

Consistency

Originality

Practical value

Search intent satisfaction

Thin content

Duplicate content

Template repetition

---

# PHASE 17

## EEAT

Evaluate:

Experience

Expertise

Author pages

About page

Editorial policy

References

Update policy

Transparency

Contact information

Trust signals

Brand consistency

---

# PHASE 18

## INFORMATION ARCHITECTURE

Evaluate:

Topic clusters

Pillar pages

Navigation

Taxonomy

Hierarchy

URL organization

Category quality

Scalability

Maintainability

---

# PHASE 19

## PRIORITIZATION

Every issue must include:

ID

Title

Category

Description

Evidence

Affected URLs

Severity

Priority

Confidence

Business Impact

SEO Impact

Technical Impact

Estimated Fix Complexity

Estimated Fix Time

Dependencies

Recommended Solution

Validation Method

---

# PHASE 20

## ROOT CAUSE ANALYSIS

Determine the main reasons why this website could underperform.

Estimate contribution percentage for:

Architecture

Technical SEO

Rendering

Content

Internal Linking

Authority

EEAT

Performance

UX

Other

Justify every percentage.

---

# OUTPUT FILES

Generate all files in `/output/`:

WEBSITE_FORENSIC_REPORT.md

TECHNICAL_ISSUES.csv

CONTENT_ISSUES.csv

INTERNAL_LINKS.csv

ARCHITECTURE_REPORT.md

EEAT_REPORT.md

PERFORMANCE_REPORT.md

ACCESSIBILITY_REPORT.md

EXECUTIVE_SUMMARY.md

---

# FINAL VERDICT

Answer only these questions:

1. What are the critical issues?

2. What are the high priority issues?

3. What should be fixed first?

4. What problems are probably false positives?

5. What evidence supports every conclusion?

Never speculate.

Every conclusion must include evidence.
