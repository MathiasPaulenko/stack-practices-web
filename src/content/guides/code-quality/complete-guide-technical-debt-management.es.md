---


contentType: guides
slug: complete-guide-technical-debt-management
title: "Referencia Detallada de Technical Debt: Track, Prioritize, Pay Down"
description: "Dominá technical debt management: identificá debt types, trackeá con debt registers, priorizá usando impact vs effort, agendá paydown sprints y medí debt reduction."
metaDescription: "Dominá technical debt management: identificá debt types, trackeá con registers, priorizá con impact vs effort, agendá paydown sprints y medí debt reduction."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - technical-debt
  - code-quality
  - refactoring
  - prioritization
  - maintainability
  - best-practices
  - project-management
relatedResources:
  - /guides/complete-guide-clean-code-principles
  - /guides/complete-guide-refactoring-techniques
  - /guides/complete-guide-code-review-best-practices
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Dominá technical debt management: identificá debt types, trackeá con registers, priorizá con impact vs effort, agendá paydown sprints y medí debt reduction."
  keywords:
    - technical debt
    - debt management
    - code quality
    - refactoring
    - prioritization
    - maintainability
    - debt register


---

## Introducción

Technical debt es el cost de shortcuts tomados durante development. Como financial debt, accruea interest: cuanto más esperás para pay down, más expensive se vuelve. A continuación: identificar debt types, trackear con un debt register, priorizar usando impact vs effort, agendar paydown sprints y medir debt reduction over time.

## Types of Technical Debt

```
┌─────────────────────────────────────────────────────┐
│              Technical Debt Types                    │
├──────────────────┬──────────────────────────────────┤
│ Deliberate       │ Conscious shortcut para meet un   │
│                  │ deadline. Documentado.            │
├──────────────────┼──────────────────────────────────┤
│ Accidental       │ Poor design decisions hechos en   │
│                  │ ignorance. Discovered later.      │
├──────────────────┼──────────────────────────────────┤
│ Bit Rot          │ Code que estaba fine cuando se    │
│                  │ escribió pero el environment cambió│
├──────────────────┼──────────────────────────────────┤
│ Dependency       │ Outdated libraries, frameworks,   │
│                  │ o language versions.              │
├──────────────────┼──────────────────────────────────┤
│ Test Debt        │ Missing o inadequate test         │
│                  │ coverage para critical paths.     │
├──────────────────┼──────────────────────────────────┤
│ Documentation    │ Missing o outdated docs,          │
│                  │ architecture diagrams, runbooks.  │
├──────────────────┼──────────────────────────────────┤
│ Infrastructure   │ Manual deployments, no CI/CD,     │
│                  │ missing monitoring.               │
└──────────────────┴──────────────────────────────────┘
```

## Debt Register

Trackeá all technical debt en un structured register. Esto hace el debt visible y measurable.

```markdown
# Technical Debt Register

## TD-001: Monolithic auth module
- **Type**: Deliberate
- **Date Added**: 2026-01-15
- **Impact**: High — blockea multi-tenant support
- **Effort**: 5 days
- **Interest**: Cada new feature toca auth, addeando 2-3 days por feature
- **Status**: Open
- **Owner**: Backend team
- **Resolution**: Spliteá en per-tenant auth service

## TD-002: No integration tests para payment flow
- **Type**: Test debt
- **Date Added**: 2026-02-01
- **Impact**: Critical — payment bugs llegan a production
- **Effort**: 3 days
- **Interest**: Cada manual regression test toma 4 hours
- **Status**: Open
- **Owner**: QA team
- **Resolution**: Addeá Playwright integration tests para payment flow

## TD-003: jQuery en legacy admin panel
- **Type**: Bit rot
- **Date Added**: 2026-03-10
- **Impact**: Low — admin panel funciona, few users
- **Effort**: 10 days
- **Interest**: New developers struggle con jQuery patterns
- **Status**: Open
- **Owner**: Frontend team
- **Resolution**: Migrá a React en Q3
```

## Prioritization Matrix

```
         High Impact
            │
    Pay Now │ Pay Next
    (Q1)    │ (Q2)
  ──────────┼──────────
    Monitor │ Ignore
    (Q3)    │ (N/A)
            │
         Low Impact
    Low Effort    High Effort
```

```typescript
// utils/debtPrioritizer.ts — Priorizá debt items
interface DebtItem {
  id: string;
  title: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  effort: number; // en days
  interestRate: number; // days added per feature
  ageInDays: number;
}

function prioritizeDebt(items: DebtItem[]): DebtItem[] {
  return items
    .map(item => ({
      ...item,
      // Score: impact weight + accumulated interest - effort cost
      score: impactWeight(item.impact) +
             (item.interestRate * item.ageInDays / 30) -
             (item.effort * 0.5),
    }))
    .sort((a, b) => b.score - a.score);
}

function impactWeight(impact: string): number {
  const weights = { critical: 100, high: 60, medium: 30, low: 10 };
  return weights[impact] ?? 0;
}

// Usage
const prioritized = prioritizeDebt([
  { id: 'TD-001', title: 'Monolithic auth', impact: 'high', effort: 5, interestRate: 2.5, ageInDays: 180 },
  { id: 'TD-002', title: 'No payment tests', impact: 'critical', effort: 3, interestRate: 4, ageInDays: 120 },
  { id: 'TD-003', title: 'jQuery admin', impact: 'low', effort: 10, interestRate: 0.5, ageInDays: 90 },
]);

// Result: TD-002 (critical, high interest) > TD-001 (high impact) > TD-003 (low priority)
```

## Paydown Strategies

### Fixed Percentage Per Sprint

Dedicá un fixed percentage de cada sprint a debt paydown. 15-20% es common.

```typescript
// Sprint planning con debt allocation
const SPRINT_CAPACITY = 80; // story points
const DEBT_ALLOCATION = 0.20; // 20%

const debtPoints = Math.floor(SPRINT_CAPACITY * DEBT_ALLOCATION); // 16 points
const featurePoints = SPRINT_CAPACITY - debtPoints; // 64 points

// Seleccioná debt items que fiteen en debtPoints
const sprintDebtItems = prioritizedDebt
  .filter(item => item.effort * 3 <= debtPoints) // rough points = effort * 3
  .slice(0, 2); // top 2 items
```

### Debt Sprint

Dedicá un entire sprint a debt paydown every quarter.

```
Sprint 1: Features
Sprint 2: Features
Sprint 3: Features
Sprint 4: Debt Paydown (all capacity)
Sprint 5: Features
...
```

### Boy Scout Rule

"Always leave el code better de lo que lo encontraste." Fixeá small debt items cuando tocas el surrounding code.

```typescript
// Cuando fixeás un bug en el payment module:
// 1. Fixeá el bug
// 2. Extractéa la long function en smaller ones
// 3. Addeá un missing test para el edge case
// 4. Renombrá un unclear variable
// 5. Updateá el outdated comment
//
// Cada change es small, pero over time el module mejora
```

### Stop the Bleeding

Antes de pay down old debt, pará de accumulatear new debt.

```
1. Addeá linting rules para prevenir known anti-patterns
2. Addeá pre-commit hooks para code quality checks
3. Requerí code review para all PRs
4. Addeá CI checks para test coverage thresholds
5. Documentá architecture decisions (ADRs)
6. Pair program en complex changes
```

## Measuring Debt

### Code metrics

```typescript
// scripts/measureDebt.ts — Medí technical debt metrics
import { execSync } from 'child_process';

interface DebtMetrics {
  cyclomaticComplexity: number;
  duplicationPercentage: number;
  testCoverage: number;
  todoCount: number;
  outdatedDependencies: number;
  averageFunctionLength: number;
  maxNestingDepth: number;
}

function measureDebt(): DebtMetrics {
  return {
    cyclomaticComplexity: measureComplexity(),
    duplicationPercentage: measureDuplication(),
    testCoverage: measureCoverage(),
    todoCount: countTodos(),
    outdatedDependencies: countOutdatedDeps(),
    averageFunctionLength: measureAvgFunctionLength(),
    maxNestingDepth: measureMaxNesting(),
  };
}

function countTodos(): number {
  const output = execSync('grep -rn "TODO\\|FIXME\\|HACK\\|XXX" src/ --include="*.ts" | wc -l', { encoding: 'utf-8' });
  return parseInt(output.trim(), 10);
}

function countOutdatedDeps(): number {
  const output = execSync('npm outdated --json', { encoding: 'utf-8' });
  const outdated = JSON.parse(output);
  return Object.keys(outdated).length;
}

// Trackeá metrics over time
const metrics = measureDebt();
console.log('Debt Metrics:', metrics);
// Loggeá al tracking system (Datadog, Grafana, spreadsheet)
```

### Trend tracking

```markdown
# Debt Metrics Trend

| Month    | Complexity | Duplication | Coverage | TODOs | Outdated Deps |
|----------|------------|-------------|----------|-------|---------------|
| 2026-01  | 8.2        | 12.5%       | 65%      | 47    | 8             |
| 2026-02  | 7.8        | 11.2%       | 68%      | 42    | 6             |
| 2026-03  | 7.5        | 10.8%       | 72%      | 38    | 5             |
| 2026-04  | 7.1        | 9.5%        | 75%      | 35    | 4             |
| 2026-05  | 6.8        | 8.2%        | 78%      | 30    | 3             |
| 2026-06  | 6.5        | 7.5%        | 82%      | 25    | 2             |

Trend: All metrics improving. Duplication down 40%, coverage up 17 points.
```

## Communicating Debt to Stakeholders

```markdown
# Technical Debt Report — Q2 2026

## Executive Summary
Technical debt cuesta approximately 15 engineering days per sprint en
slower feature delivery. Recomendamos allocatear 20% de Q3 capacity
a debt paydown, targeteando los top 5 items.

## Top 5 Debt Items (by business impact)

1. **No payment integration tests** (TD-002)
   - Risk: Payment bugs llegan a production (pasó 2x este quarter)
   - Fix: 3 days de test engineering
   - ROI: Previene ~8 hours de manual testing per release

2. **Monolithic auth module** (TD-001)
   - Risk: Blockea multi-tenant revenue ($50k MRR at stake)
   - Fix: 5 days de refactoring
   - ROI: Desblockea Q3 multi-tenant launch

3. **Outdated Node.js 16** (TD-004)
   - Risk: End-of-life Sep 2026, security vulnerabilities
   - Fix: 2 days de upgrade + testing
   - ROI: Security compliance, performance improvements

4. **No CI/CD pipeline** (TD-005)
   - Risk: Manual deployments toman 3 hours, 1 production incident per month
   - Fix: 4 days de DevOps work
   - ROI: Deployments en 15 minutes, fewer incidents

5. **Missing API documentation** (TD-006)
   - Risk: Partner integrations toman 2 weeks en vez de 2 days
   - Fix: 3 days de documentation
   - ROI: Faster partner onboarding

## Recommendation
Allocateá 17 days (20% de Q3 capacity) para resolver items 1-5.
Expected ROI: 30% faster feature delivery en Q4.
```

## Best Practices


- For a deeper guide, see [Clean Code: Naming, Functions, Classes, Comments](/es/guides/complete-guide-clean-code-principles/).

- Hacé el debt visible — mantené un debt register que todos puedan ver
- Quantificá el interest — medí cuánto debt cuesta per sprint
- Priorizá por business impact — no por qué es easiest de fix
- Pará el bleeding first — prevení new debt antes de pay old debt
- Allocateá fixed capacity — 15-20% per sprint o un debt sprint per quarter
- Seguí el Boy Scout rule — dejá el code better de lo que lo encontraste
- Trackeá metrics over time — complexity, duplication, coverage, TODOs
- Communicá en business terms — hablá de cost, risk y ROI, no code quality
- Celebrá debt paydown — recognizá engineers que reducen debt
- No vayas into debt para non-urgent features — deliberate debt debería ser rare y documented

## Common Mistakes

- **Ignorar debt hasta que es too late**: debt compounds. Un 1-day shortcut se vuelve un 5-day fix en 6 months. Trackeá y pay early.
- **No debt register**: invisible debt es unmanageable. Escribilo, aunque sea en un simple markdown file.
- **Pay debt solo cuando es convenient**: si esperás free time, nunca llega. Scheduleá debt paydown explícitamente.
- **All-or-nothing refactoring**: intentar fixear everything a la vez. Small, continuous improvements son más sustainable.
- **No medir debt**: sin metrics, no podés mostrar progress. Trackeá complexity, coverage y duplication monthly.
- **Technical jargon con stakeholders**: decir "cyclomatic complexity is too high" no motiva investment. Decí "features toman 30% más de tiempo."

## FAQ

### ¿Qué es technical debt?

El cost de shortcuts tomados durante development. Como financial debt, accruea interest: cada shortcut hace future changes slower y riskier. Technical debt incluye poor design, missing tests, outdated dependencies y lack de documentation.

### ¿Cuánto tiempo deberíamos gastar en technical debt?

15-20% de cada sprint es un common allocation. Alternativamente, dedicá un sprint per quarter enteramente a debt paydown. El right amount depende de cuánto debt tenés y qué tan fast estás accumulateando new debt.

### ¿Cómo convenzo a management de investir en debt paydown?

Traducí debt en business terms: slower feature delivery, más bugs, higher turnover, missed deadlines. Mostrá el ROI: "Invirtiendo 3 days en tests se ahorran 8 hours de manual testing per release." Usá past incidents como examples de debt cost.

### ¿Qué es el Boy Scout rule?

"Always dejá el code better de lo que lo encontraste." Cuando tocás code para un bug fix o feature, hacé one small improvement: renombrá un variable, extractéa un function, addeá un test. Over time, estos small improvements compound.

### ¿Deberíamos tomar deliberate technical debt?

Sí, cuando speed es critical y el debt está documented. Examples: un demo para un key customer, un time-sensitive market opportunity. Documentá el debt en el register, notá el expected paydown date y schedulealo. Unplanned, undocumented debt es el problem.
