---
contentType: docs
slug: test-strategy-document-template
title: "Plantilla de Documento de Estrategia de Pruebas"
description: "Una plantilla para documentar la estrategia de pruebas por proyecto: pirámide, alcance, entornos, herramientas, gates de CI/CD y métricas de calidad."
metaDescription: "Usá esta plantilla de estrategia de pruebas para definir pirámide, alcance, entornos, herramientas, gates de CI/CD, métricas y cobertura basada en riesgo."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - test-strategy
  - template
  - ci-cd
  - quality-metrics
  - test-pyramid
relatedResources:
  - /docs/testing/api-testing-strategy-template
  - /docs/testing/test-case-template
  - /docs/testing/test-coverage-report-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de estrategia de pruebas para definir pirámide, alcance, entornos, herramientas, gates de CI/CD, métricas y cobertura basada en riesgo."
  keywords:
    - test strategy
    - test pyramid
    - test plan
    - ci-cd gates
    - quality metrics
    - test coverage
    - template
---

## Overview

Un documento de estrategia de pruebas define cómo un equipo abarca el quality assurance a lo largo de un proyecto o producto. Alinea a los stakeholders en qué se testea, en qué nivel, con qué herramientas y qué gates deben pasar antes del deployment. Sin una estrategia, los equipos defaultan a testing ad-hoc: algunas áreas se over-testean, critical paths se missean y nadie sabe el coverage picture overall.

## When to Use

- Iniciando un new project o major feature area
- Onboardéando un new team member a testing practices
- Auditéando por qué bugs llegan a production a pesar de existing tests
- Alineéando multiple teams en shared quality standards
- Preparándote para compliance audits (SOC 2, ISO 27001, FDA)

## Solution

```markdown
# Test Strategy: `<Project Name>`

## 1. Objectives

- Verificar que el producto meets functional requirements
- Prevenir regressions en critical user journeys
- Validar performance bajo expected y peak load
- Asegurar security y data integrity
- Proveer fast feedback a developers (under 10 minutes para PR pipeline)

## 2. Test Pyramid

| Layer | Proportion | Scope | Speed | Owner |
|-------|-----------|-------|-------|-------|
| Unit | 70% | Functions, classes, modules | < 30s | Developer |
| Integration | 20% | API + database + external services | < 5min | Developer |
| E2E | 7% | Full user journeys | < 15min | QA |
| Manual/Exploratory | 3% | Edge cases, usability, security | As needed | QA |

### Rationale

Unit tests son fast y isolan failures. Integration tests verifican contracts entre components. E2E tests validan real user flows pero son slow y flaky. Manual testing covereá lo que automation no puede: visual bugs, usability y novel edge cases.

## 3. Test Scope

### In Scope

| Area | Coverage Target | Priority |
|------|----------------|----------|
| Authentication & authorization | 95% | Critical |
| Payment processing | 95% | Critical |
| Order management | 90% | High |
| User profile | 80% | Medium |
| Admin dashboard | 70% | Low |
| Marketing pages | 50% | Low |

### Out of Scope

- Third-party services (testeado por sus providers)
- Infrastructure provisioning (validado por Terraform tests)
- Visual regression (handleado por design review)

## 4. Test Environments

| Environment | Purpose | Data | Refresh Cycle |
|-------------|---------|------|---------------|
| Local | Developer testing | Synthetic seed data | On demand |
| CI | Automated pipelines | Fresh per run | Per build |
| Staging | Pre-production validation | Anonymized prod snapshot | Weekly |
| Production | Smoke tests, synthetic monitoring | Real | N/A |

### Environment Parity Requirements

- Same database version y configuration
- Same OS y runtime versions
- Same environment variables (except secrets)
- Same third-party API versions (o mocks con matching behavior)

## 5. Tools and Frameworks

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| Unit | Vitest / Jest | Latest | Coverage via v8 |
| Integration | Testcontainers + supertest | Latest | Real DB in Docker |
| E2E | Playwright | Latest | Cross-browser |
| Load | k6 | Latest | Scenario-based |
| Contract | Pact | Latest | Consumer-driven |
| Security | OWASP ZAP | Latest | DAST in CI |
| Coverage | c8 / istanbul | Latest | v8 instrumentation |

## 6. CI/CD Pipeline Gates

| Stage | Tests | Gate Condition | Timeout |
|-------|-------|----------------|---------|
| Pre-commit | Lint, type check | 0 errors | 30s |
| PR build | Unit + integration | 100% pass, coverage >= 80% | 10min |
| Merge to main | Full suite + contract | 100% pass, no new flaky tests | 20min |
| Nightly | E2E + load baseline | 95% pass, latency within 10% | 60min |
| Pre-release | Full load + soak + security | 100% pass, SLOs met | 120min |
| Post-release | Smoke tests + synthetic | 100% pass for 30min | 5min |

### Coverage Gates

| Metric | Threshold | Enforced By |
|--------|-----------|-------------|
| Line coverage | >= 80% | CI check |
| Branch coverage | >= 70% | CI check |
| Critical path coverage | >= 95% | Manual review |
| New code coverage | >= 90% | CI check (diff-based) |

## 7. Test Data Management

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| Factory functions | Most tests | `createUser()`, `createOrder()` helpers |
| Seed data | Integration tests | SQL scripts run before test suite |
| Fixtures | Stable reference data | JSON files in version control |
| Anonymized prod data | Staging only | ETL pipeline strips PII |
| Synthetic data | Load tests | Generated at scale, no PII |

### Data Cleanup

- Cada test crea su own data y clean up (teardown)
- Integration tests usan transactions rolled back después de cada test
- Staging data refreshed weekly desde anonymized production snapshot
- No test data en production — enforced por environment isolation

## 8. Flaky Test Policy

### Definition

Un test es flaky si pasa y falla con el same code en > 5% de runs over 7 days.

### Process

1. Flaky test detectado → taggeado con `@flaky` en code
2. Notification enviada al test owner en Slack
3. Owner tiene 3 business days para fix o quarantine
4. Quarantined tests movidos a separate suite, no blocking CI
5. Quarantined tests deben ser fixed dentro de 1 sprint o deleted
6. Flaky test rate trackeado como quality metric (target: < 1%)

## 9. Quality Metrics

| Metric | Target | Frequency | Owner |
|--------|--------|-----------|-------|
| Unit test coverage | >= 80% | Per build | Dev team |
| Integration test coverage | >= 70% | Per build | Dev team |
| Critical path coverage | >= 95% | Weekly | QA |
| Flaky test rate | < 1% | Daily | Dev team |
| Defect escape rate | < 5 per sprint | Per sprint | QA |
| Mean time to detect (MTTD) | < 1 hour | Per incident | SRE |
| Mean time to repair (MTTR) | < 4 hours | Per incident | Dev team |
| E2E pass rate | >= 95% | Daily | QA |

## 10. Risk-Based Testing

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Payment integration breaks | Low | Critical | Contract tests + integration tests + staging validation |
| Auth token expiry edge case | Medium | High | Unit tests para token refresh logic |
| Database migration failure | Medium | High | Migration tests in CI + dry run on staging |
| Third-party API downtime | Medium | Medium | Circuit breaker + fallback tests |
| Load spike on launch | High | Medium | Load tests + autoscaling validation |

## 11. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| Developer | Escribir y mantener unit + integration tests |
| QA Engineer | Escribir y mantener E2E tests, exploratory testing |
| SRE | Mantener test environments, load test infrastructure |
| Tech Lead | Reviewear test strategy, approvear coverage exceptions |
| Product Manager | Definir acceptance criteria para test coverage |

## 12. Review Cycle

- Test strategy reviewed quarterly
- Coverage targets adjusted basado en defect data
- Tools evaluated annually o cuando pain points emergen
- Postmortem findings feedean back en test strategy updates
```

## Explanation

El test strategy document es un living artifact. Debería ser reviewed quarterly y updated cuando el team's context cambia: new tools, new product areas, changed risk profile. Las pyramid proportions (70/20/7/3) son un starting point — ajustá basado en tu domain. Un payment system necesita más integration tests; una UI-heavy app necesita más E2E.

La CI/CD gates section es la most important: define qué debe pasar antes de que code move forward. Sin explicit gates, testing se vuelve optional y quality degrada. Coverage thresholds deberían ser enforced por CI, no por manual review.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Startup / MVP | Focus en unit + integration, skip E2E | Speed over coverage |
| Regulated industry (FDA, SOC 2) | Addeá traceability matrix | Cada requirement mapea a tests |
| Microservices | Contract tests entre services | Pact o Spring Cloud Contract |
| Legacy codebase | Characterization tests antes de refactor | Lock current behavior |
| Mobile app | Device farm testing | BrowserStack o AWS Device Farm |

## What Works

1. Tratá el test strategy como un living document — reviewealo quarterly
2. Enforcé coverage gates en CI, no por manual review
3. Trackeá flaky test rate como first-class quality metric
4. Usá risk-based testing para priorizar dónde coverage matters most
5. Mantené environments tan close a production como sea possible
6. Hacé test data creation easy con factory functions
7. Separá flaky tests del main suite para mantener CI green

## Common Mistakes

1. Escribir un test strategy once y nunca updatearlo
2. Setear coverage thresholds sin enforcarlas en CI
3. Ignorar flaky tests hasta que hacen CI unreliable
4. Testear everything en el E2E level porque "testea el real thing"
5. Usar production data en test environments sin anonymization
6. No allocatear tiempo para test maintenance junto con feature work
7. No tener documented test environments, llevando a "works on my machine"

## Frequently Asked Questions

### ¿Cuánto test coverage es enough?

Depende del risk. Critical paths (payments, auth) necesitan 95%+. Most code debería estar en 80%+. Low-risk areas (marketing pages) pueden ser lower. Focus en meaningful assertions, no line coverage numbers. 100% line coverage con weak assertions es worse que 80% con strong ones.

### ¿Debería every team tener su own test strategy?

Si los teams sharean un codebase, sharean un strategy. Si los teams own separate services, cada uno puede tener su own strategy con shared standards (coverage thresholds, CI gates). Un central strategy document con per-team addenda funciona well para larger organizations.

### ¿Cómo convenzo al team de escribir tests?

Empezá con CI gates: requerí unit tests para PRs. Hacé testing easy: proveé factory functions, test templates y examples. Mostrá el data: correlacioná test coverage con defect rates. No mandates 100% coverage en day one — ramp up de 40% a 60% a 80% over several sprints.

### ¿Qué si E2E tests son too slow?

Reducí el number de E2E tests. Mantené solo los top 3-5 user journeys. Mové detailed verification a integration tests. Corré E2E nightly en vez de per-PR. Usá parallel execution y sharding. Si E2E toma más de 15 minutes, tenés too many.
