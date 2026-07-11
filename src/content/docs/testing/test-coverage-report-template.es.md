---
contentType: docs
slug: test-coverage-report-template
title: "Plantilla de Reporte de Cobertura de Pruebas"
description: "Una plantilla para reportar cobertura de pruebas por módulo, feature y critical path con análisis de tendencias e identificación de gaps."
metaDescription: "Usá esta plantilla de reporte de cobertura para trackear cobertura por módulo, feature y critical path con análisis de tendencias, gaps y action items."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - coverage
  - report
  - template
  - quality-metrics
  - trend-analysis
relatedResources:
  - /docs/testing/test-strategy-document-template
  - /docs/testing/test-case-template
  - /docs/testing/regression-test-checklist
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de reporte de cobertura para trackear cobertura por módulo, feature y critical path con análisis de tendencias, gaps y action items."
  keywords:
    - test coverage
    - coverage report
    - code coverage
    - trend analysis
    - gap identification
    - quality metrics
    - template
---

## Overview

Un test coverage report comunica cuánto del codebase es exercised por tests. Raw coverage numbers son insufficient: un report debe break down coverage por module, feature y critical path, mostrar trends over time y identify gaps dónde coverage está below target. Esta plantilla provee un structure para reportar coverage a engineering teams y stakeholders.

## When to Use

- Sprint reviews y retrospectives
- Quarterly quality reporting a stakeholders
- Compliance audits requiriendo coverage evidence
- Prioritizar test debt paydown
- Onboardéando new team members a coverage standards

## Solution

```markdown
# Test Coverage Report — `<Project Name>` — `<Month Year>`

## 1. Executive Summary

| Metric | Current | Target | Trend |
|--------|---------|--------|-------|
| Overall line coverage | 82.3% | 80% | ↑ +2.1% |
| Overall branch coverage | 71.5% | 70% | ↑ +1.8% |
| Critical path coverage | 94.2% | 95% | ↓ -0.3% |
| New code coverage | 91.0% | 90% | → 0% |
| Flaky test rate | 0.8% | < 1% | ↓ -0.4% |

**Summary**: Overall coverage improved este sprint. Critical path coverage bajó slightly debido a new payment endpoint sin tests. One action item: addear integration tests para payment refund flow.

## 2. Coverage by Module

| Module | Line Coverage | Branch Coverage | Target | Status | Delta |
|--------|--------------|-----------------|--------|--------|-------|
| auth | 95.1% | 88.3% | 95% | ✅ | +0.2% |
| payments | 89.4% | 76.1% | 95% | ⚠️ | -0.3% |
| orders | 87.2% | 78.5% | 90% | ⚠️ | +1.5% |
| users | 84.6% | 72.0% | 80% | ✅ | +3.1% |
| notifications | 78.3% | 65.2% | 80% | ⚠️ | +0.8% |
| admin | 71.0% | 58.4% | 70% | ✅ | +2.0% |
| marketing | 62.5% | 50.1% | 60% | ✅ | +5.2% |
| **Total** | **82.3%** | **71.5%** | **80%** | **✅** | **+2.1%** |

### Modules Below Target

| Module | Current | Target | Gap | Owner | Action |
|--------|---------|--------|-----|-------|--------|
| payments | 89.4% | 95% | 5.6% | Backend team | Addear integration tests para refund flow (3 days) |
| orders | 87.2% | 90% | 2.8% | Backend team | Addear edge case tests para bulk orders (1 day) |
| notifications | 78.3% | 80% | 1.7% | Platform team | Addear tests para email template rendering (0.5 days) |

## 3. Coverage by Feature

| Feature | Test Cases | Automated | Manual | Pass Rate | Last Tested |
|---------|-----------|-----------|--------|-----------|-------------|
| User login | 18 | 15 | 3 | 100% | 2026-07-03 |
| Password reset | 12 | 10 | 2 | 100% | 2026-07-03 |
| Order creation | 24 | 20 | 4 | 96% | 2026-07-04 |
| Payment processing | 32 | 25 | 7 | 94% | 2026-07-04 |
| Payment refund | 8 | 3 | 5 | 75% | 2026-07-01 |
| Order tracking | 15 | 12 | 3 | 100% | 2026-07-02 |
| User profile | 10 | 8 | 2 | 100% | 2026-07-03 |
| Admin dashboard | 20 | 5 | 15 | 90% | 2026-06-28 |

### Features Needing Attention

| Feature | Issue | Action | Priority |
|---------|-------|--------|----------|
| Payment refund | Solo 3 de 8 test cases automated | Automatizá 5 remaining test cases | High |
| Admin dashboard | 75% manual, low automation | Addeá Playwright E2E para top 5 journeys | Medium |
| Order creation | 96% pass rate, 1 flaky test | Fixeá flaky test en bulk order scenario | High |

## 4. Critical Path Coverage

| Critical Path | Steps Covered | Steps Total | Coverage | Status |
|---------------|--------------|-------------|----------|--------|
| User registers → verifies email → logs in | 12 | 12 | 100% | ✅ |
| User browses → adds to cart → checks out → pays | 18 | 20 | 90% | ⚠️ |
| User places order → receives confirmation → tracks delivery | 15 | 15 | 100% | ✅ |
| Admin logs in → views orders → processes refund | 8 | 12 | 67% | ❌ |
| User requests refund → admin approves → payment refunded | 6 | 10 | 60% | ❌ |

### Critical Path Gaps

| Critical Path | Missing Steps | Risk | Owner | Due Date |
|---------------|--------------|------|-------|----------|
| Checkout flow | Error handling para failed payment, retry logic | High | Backend | 2026-07-15 |
| Admin refund flow | Approval workflow, partial refund, audit log | Critical | Backend | 2026-07-10 |
| User refund request | Request form, validation, notification | High | Full-stack | 2026-07-12 |

## 5. Coverage Trend (6 Months)

| Month | Line | Branch | Critical | New Code | Flaky Rate |
|-------|------|--------|----------|----------|------------|
| 2026-02 | 76.0% | 64.2% | 92.1% | 85.0% | 2.1% |
| 2026-03 | 77.5% | 66.0% | 93.0% | 87.0% | 1.8% |
| 2026-04 | 78.8% | 67.5% | 93.5% | 88.5% | 1.5% |
| 2026-05 | 79.5% | 68.8% | 94.0% | 89.0% | 1.2% |
| 2026-06 | 80.2% | 69.7% | 94.5% | 90.0% | 1.2% |
| 2026-07 | 82.3% | 71.5% | 94.2% | 91.0% | 0.8% |

### Trend Analysis

- **Line coverage**: Steady improvement de +1-2% per month. On track para reach 85% by Q4.
- **Branch coverage**: Improving pero lagging line coverage por ~10%. Focus en conditional logic tests.
- **Critical path coverage**: Bajó este month debido a new payment endpoints. Necesita immediate attention.
- **New code coverage**: Consistentemente above 90% target. PR-level enforcement funcionando.
- **Flaky test rate**: Down de 2.1% a 0.8%. Quarantine policy es effective.

## 6. Test Suite Health

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total test count | 1,847 | — | — |
| Unit tests | 1,293 (70%) | 70% | ✅ |
| Integration tests | 369 (20%) | 20% | ✅ |
| E2E tests | 130 (7%) | 7% | ✅ |
| Manual test cases | 55 (3%) | 3% | ✅ |
| Avg unit test runtime | 18s | < 30s | ✅ |
| Avg integration test runtime | 3.2min | < 5min | ✅ |
| Avg E2E test runtime | 12min | < 15min | ✅ |
| Flaky tests | 15 | < 20 | ✅ |
| Skipped tests | 8 | < 10 | ✅ |
| Test suite total runtime | 22min | < 30min | ✅ |

## 7. Action Items

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | Addear integration tests para payment refund flow | Backend team | High | 2026-07-10 | In Progress |
| 2 | Automatizá 5 manual test cases para payment refund | QA team | High | 2026-07-12 | Not Started |
| 3 | Fixeá flaky test en bulk order scenario | Backend team | High | 2026-07-08 | In Progress |
| 4 | Addeá E2E tests para admin refund approval workflow | QA team | Critical | 2026-07-10 | Not Started |
| 5 | Addeá tests para email template rendering | Platform team | Medium | 2026-07-15 | Not Started |
| 6 | Addeá branch coverage tests para notification module | Platform team | Medium | 2026-07-20 | Not Started |
| 7 | Addeá Playwright E2E para top 5 admin dashboard journeys | QA team | Medium | 2026-07-25 | Not Started |

## 8. Tools and Configuration

| Tool | Purpose | Config File | Threshold |
|------|---------|-------------|-----------|
| Vitest | Unit + integration test runner | vitest.config.ts | 80% lines, 70% branches |
| Playwright | E2E test runner | playwright.config.ts | N/A |
| c8 | Coverage instrumentation | .c8rc.json | — |
| Codecov | Coverage tracking y trends | codecov.yml | 80% minimum |
| SonarQube | Static analysis + coverage | sonar-project.properties | 80% minimum |

### CI Coverage Gate

```yaml
# .github/workflows/coverage.yml
- name: Check coverage
  run: |
    npx vitest run --coverage --reporter=json
    LINE_COV=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct)")
    BRANCH_COV=$(node -e "console.log(require('./coverage/coverage-summary.json').total.branches.pct)")
    if (( $(echo "$LINE_COV < 80" | bc -l) )); then
      echo "::error::Line coverage $LINE_COV% is below 80% threshold"
      exit 1
    fi
    if (( $(echo "$BRANCH_COV < 70" | bc -l) )); then
      echo "::error::Branch coverage $BRANCH_COV% is below 70% threshold"
      exit 1
    fi
```
```

## Explanation

Coverage reports deberían answer three questions: dónde estamos, dónde necesitamos estar y qué está cambiando. El module breakdown muestra dónde coverage está concentrated. El feature breakdown muestra qué user-facing functionality está tested. El critical path section muestra si los most important user journeys están covered.

Trend analysis es la most valuable section para stakeholders. Un single month's coverage number es meaningless sin context. Six months de trend data muestra si el team está improving, stagnating o regressing. Shareá esta section con engineering managers y product owners.

Action items cierran el loop. Un coverage report sin action items es solo data. Cada gap debería tener un owner, priority y due date. Revieweá action items del previous report antes de crear new ones.


### Escenario Detallado: Reporte de Cobertura para Modulo de Pagos

```text
Proyecto: E-commerce API
Periodo: Julio 2026
Herramienta: Vitest + c8 + Codecov

Situacion: Cobertura de payments bajo del target (89.4% vs 95%)

Paso 1 - Recopilar datos:
  $ npx vitest run --coverage --reporter=json
  $ cat coverage/coverage-summary.json | node -e "
      const d = JSON.parse(require("fs").readFileSync(0,"utf8"));
      console.log("payments lines:", d["src/modules/payments/"].lines.pct);
      console.log("payments branches:", d["src/modules/payments/"].branches.pct);
    "
  Resultado: lines=89.4%, branches=76.1%

Paso 2 - Identificar gaps:
  Archivos con cobertura < 80%:
    src/modules/payments/refund.ts        - 62.1% lines, 45.0% branches
    src/modules/payments/webhook.ts       - 71.8% lines, 55.2% branches
    src/modules/payments/currency.ts      - 78.5% lines, 60.0% branches

Paso 3 - Analizar gaps:
  refund.ts: 4 ramas no cubiertas (partial refund, refund after partial shipment,
    refund rejected by gateway, refund with currency conversion)
  webhook.ts: 3 ramas no cubiertas (signature invalid, event duplicate,
    event for unknown order)
  currency.ts: 2 ramas no cubiertas (rate lookup fallback, rate cache miss)

Paso 4 - Crear action items:
  | # | Accion | Responsable | Prioridad | Fecha |
  |---|--------|-------------|-----------|-------|
  | 1 | Tests para refund.ts (4 ramas) | @backend | Alta | 2026-07-10 |
  | 2 | Tests para webhook.ts (3 ramas) | @backend | Alta | 2026-07-12 |
  | 3 | Tests para currency.ts (2 ramas) | @backend | Media | 2026-07-15 |

Paso 5 - Verificar despues de implementar:
  $ npx vitest run --coverage
  payments lines: 89.4% -> 96.2% (target 95%) APROBADO
  payments branches: 76.1% -> 88.5% (target 85%) APROBADO

Paso 6 - Actualizar reporte:
  - Modulo payments: 96.2% lines, 88.5% branches
  - Trend: +6.8% lines, +12.4% branches
  - Cerrar action items 1, 2, 3
  - Documentar leccion: webhook signature validation requiere test con HMAC real
```

### Como manejo cobertura en un monorepo con multiples paquetes?

Genera cobertura por paquete y agrega con un script. Usa Turborepo o Nx para ejecutar tests por paquete. Reporta cobertura agregada en el reporte principal y cobertura por paquete en una seccion separada. Establece targets por paquete: paquetes core (auth, payments) al 95%, paquetes perifericos al 80%. Codecov soporta monorepos con flag-based coverage.

### Que hago cuando la cobertura baja despues de un refactor?

Investiga antes de actuar. Si el refactor elimino codigo muerto, la baja de cobertura es positiva (menos codigo sin testear). Si el refactor cambio la estructura pero los tests no se actualizaron, los tests estan rotos. Compara el numero absoluto de lineas cubiertas, no el porcentaje. Si las lineas cubiertas suben pero el porcentaje baja, el equipo anadio codigo nuevo sin tests.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Monorepo | Report per package + aggregate | Usá Turborepo o Nx para per-package coverage |
| Microservices | Report per service | Cada team owns su service's coverage |
| Open source | Public coverage badge | Codecov o Coveralls badge en README |
| Compliance | Addeá requirement traceability | Mapeá coverage a regulatory requirements |
| Legacy codebase | Trackeá coverage delta only | No setees absolute targets para untested legacy code |

## What Works

1. Reporteá monthly — frequent enough para spot trends, no tan frequent que sea noise
2. Break down por module y feature — overall numbers hidden problem areas
3. Trackeá critical paths separadamente — 90% overall coverage puede hidear 60% critical path coverage
4. Incluí action items con owners — reports sin actions no improvean coverage
5. Mostrá trends over 6 months — single data points no tell a story
6. Trackeá flaky tests junto con coverage — high coverage con high flakiness es false confidence
7. Enforcé coverage gates en CI — no relies en reports para catchear regressions

## Common Mistakes

1. Perseguir 100% coverage — diminishing returns above 85%. Focus en meaningful tests, no line counts.
2. Ignorar branch coverage — line coverage puede ser high mientras branch coverage es low, hideando untested conditionals.
3. No trackear critical paths separadamente — overall coverage puede maskar critical gaps.
4. No trend data — un single coverage number es useless sin historical context.
5. No action items — reports que solo presentan data no drivean improvement.
6. Incluir test files en coverage measurement — infla numbers. Excluí test files de coverage.
7. No reviewear previous action items — crea un backlog de ignored commitments.

## Frequently Asked Questions

### ¿Cuál es la difference entre line y branch coverage?

Line coverage mide el percentage de code lines executed por tests. Branch coverage mide el percentage de conditional branches (if/else, switch, ternary) taken. Branch coverage es stricter: una line con un if statement puede ser covered mientras un branch nunca se testea.

### ¿Debería apuntar a 100% coverage?

No. 100% coverage es expensive y often significa escribir low-value tests solo para hit un number. Apuntá a 80-85% overall, 95% para critical paths. Focus en meaningful assertions en vez de coverear every line.

### ¿Cómo mido critical path coverage?

Mapeá cada critical user journey a specific code paths. Taggeá tests que coveren esos paths. Calculá coverage como: (covered critical path steps / total critical path steps). Esto es más meaningful que overall coverage para risk assessment.

### ¿Qué tools debería usar para coverage tracking?

Usá tu test runner's built-in coverage (Vitest, Jest) para collection. Usá Codecov o Coveralls para trend tracking y PR integration. Usá SonarQube para combinar coverage con static analysis. Para monorepos, usá per-package coverage con aggregation.

### ¿Qué tan seguido debería generar coverage reports?

Generá coverage en every PR (via CI) para immediate feedback. Generá un full report monthly para trend analysis y stakeholder communication. Quarterly reports son sufficient para executive summaries.
