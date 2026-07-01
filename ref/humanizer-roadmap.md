# Humanizer Roadmap

> Generated: 2026-07-01T07:40:09.060Z
> Scope: 1232 markdown files in src/content (EN + ES)

## Goal

Humanize all English content in `src/content` by replacing AI-isms with natural language, then mirror the changes in the Spanish translations. Structural patterns (em-dashes, bold, lists) are secondary and only addressed when they clearly hurt readability.

## Progress

- **Total files audited:** 1232 (EN + ES)
- **High AI-ism density (>50):** 0 files (0.0%)
- **Medium AI-ism density (20-50):** 0 files (0.0%)
- **Low AI-ism density (≤20):** 1232 files (100.0%)
- **Tier 1 (always flag):** 35 occurrences (all legitimate technical terms)
- **Tier 2 (cluster flag):** 0 occurrences
- **Tier 3 (density flag):** 75 occurrences
- **Vocab cleanup:** COMPLETE — all remaining occurrences are legitimate technical terms (dynamic, features, cost-effective, statistically significant, scalable, CompletableFuture.exceptionally, navigator.sendBeacon)
- **Structural cleanup completed:** 34 files (postmortem-guide, incident-response-guide, data-migration-guide, database-sharding-implementation-guide, incident-communication-template, alert-management-guide, read-replica-guide, stream-processing-guide, disaster-recovery-guide, production-readiness-review-template, real-time-analytics-guide, connection-pooling-deep-dive-guide, a-b-testing-guide, distributed-tracing-guide, canary-deployment-guide, etl-pipeline-guide, system-design-interview-guide, engineering-handbook-template, onboarding-checklist-backend-engineer, feature-flags-guide, software-architecture-guide, blob-storage-guide, endpoint-security-checklist-template, data-breach-response-playbook, system-decommissioning-checklist-template, zero-downtime-deployment-checklist, owasp-top-10-guide, code-review-checklist-template, gcp-basics-guide, ci-cd-security-guide, api-rate-limiting-guide, cold-start-optimization, service-level-objective-template, grpc-microservices-guide)

## Top site-wide vocab issues

| Pattern | Total occurrences |
|---------|-------------------|
| long-bullet-list | 19946 |
| em-dash | 5420 |
| bold-overuse | 280 |
| possible-passive | 120 |
| dynamic | 36 |
| features | 31 |
| effective | 14 |
| significant | 7 |
| scalable | 7 |
| scalability | 6 |
| exceptionally | 4 |
| beacon | 2 |
| underscores | 1 |
| best practices | 1 |
| exceptional | 1 |

## Vocab cleanup — COMPLETE

All vocabulary AI-isms have been reviewed. Remaining occurrences are legitimate technical terms:

- **dynamic** (36): dynamic modules, dynamic imports, dynamic inventory
- **features** (31): feature slices, feature spec, SLO feature freeze
- **effective** (14): "cost-effective", "Effective Date", recipe title
- **significant** (7): "statistically significant" in A/B testing
- **scalable/scalability** (13): architecture, SVG, API gateway
- **exceptionally** (4): `CompletableFuture.exceptionally()` Java API
- **beacon** (2): `navigator.sendBeacon` Web API
- **best practices** (1): keyword in frontmatter
- **exceptional** (1): "truly exceptional" in null-object-pattern
- **underscores** (1): naming convention guidance

## Structural cleanup — COMPLETE

All 4 medium-density files reduced to low-density. Remaining structural patterns (long-bullet-list, em-dash, bold-overuse) are inherent to technical documentation format: checklists, templates, code block examples, and table cell labels.

| File | Before | After | Changes |
|------|--------|-------|---------|
| postmortem-guide.md | 24.4 | 16.0 | Unbolded Variants, FAQ to h3 |
| postmortem-guide.es.md | 24.4 | 16.0 | Unbolded Variantes, FAQ to h3 |
| incident-response-guide.md | 20.2 | 18.6 | Unbolded Variants, FAQ to h3 |
| incident-response-guide.es.md | 20.2 | 18.6 | Unbolded Variantes, FAQ to h3 |

## Method (archived)

1. Run `node ref/audit-ai-isms.cjs` after each batch to refresh `ref/ai-ism-audit-report.md`.
2. Apply the `avoid-ai-writing` skill in edit mode to keep changes minimal and targeted.
3. For every English file, update the matching `.es.md` file with equivalent terminology.
4. Run validation scripts: `validate-content.cjs`, `check-meta-descriptions.cjs`, `check-broken-links.cjs`, `check-missing-translations.cjs`, `check-orphan-translations.cjs`.
5. Run `npm run check` and `npm run build`.
6. Commit with `style(content): humanize batch X` if everything passes.

---

This roadmap is a heuristic guide. Review each suggestion in context; do not blindly replace technical terms.

## Status: COMPLETE

The humanizer pass is complete. All 1232 files are in the low-density tier (≤20). No medium or high-density files remain. Further structural reductions (long-bullet-list, em-dash, bold-overuse in code blocks/tables) would require format changes that harm the technical documentation style.
