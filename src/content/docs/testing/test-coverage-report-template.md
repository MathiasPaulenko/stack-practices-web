---
contentType: docs
slug: test-coverage-report-template
title: "Test Coverage Report Template"
description: "A template for reporting test coverage by module, feature, and critical path with trend analysis and gap identification."
metaDescription: "Use this test coverage report template to track coverage by module, feature, and critical path with trend analysis, gap identification, and action items."
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
  metaDescription: "Use this test coverage report template to track coverage by module, feature, and critical path with trend analysis, gap identification, and action items."
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

A test coverage report communicates how much of the codebase is exercised by tests. Raw coverage numbers are insufficient: a report must break down coverage by module, feature, and critical path, show trends over time, and identify gaps where coverage is below target. This template provides a structure for reporting coverage to engineering teams and stakeholders.

## When to Use

- Sprint reviews and retrospectives
- Quarterly quality reporting to stakeholders
- Compliance audits requiring coverage evidence
- Prioritizing test debt paydown
- Onboarding new team members to coverage standards

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

**Summary**: Overall coverage improved this sprint. Critical path coverage dropped slightly due to new payment endpoint lacking tests. One action item: add integration tests for payment refund flow.

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
| payments | 89.4% | 95% | 5.6% | Backend team | Add integration tests for refund flow (3 days) |
| orders | 87.2% | 90% | 2.8% | Backend team | Add edge case tests for bulk orders (1 day) |
| notifications | 78.3% | 80% | 1.7% | Platform team | Add tests for email template rendering (0.5 days) |

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
| Payment refund | Only 3 of 8 test cases automated | Automate 5 remaining test cases | High |
| Admin dashboard | 75% manual, low automation | Add Playwright E2E for top 5 journeys | Medium |
| Order creation | 96% pass rate, 1 flaky test | Fix flaky test in bulk order scenario | High |

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
| Checkout flow | Error handling for failed payment, retry logic | High | Backend | 2026-07-15 |
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

- **Line coverage**: Steady improvement of +1-2% per month. On track to reach 85% by Q4.
- **Branch coverage**: Improving but lagging line coverage by ~10%. Focus on conditional logic tests.
- **Critical path coverage**: Dipped this month due to new payment endpoints. Needs immediate attention.
- **New code coverage**: Consistently above 90% target. PR-level enforcement working.
- **Flaky test rate**: Down from 2.1% to 0.8%. Quarantine policy is effective.

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
| 1 | Add integration tests for payment refund flow | Backend team | High | 2026-07-10 | In Progress |
| 2 | Automate 5 manual test cases for payment refund | QA team | High | 2026-07-12 | Not Started |
| 3 | Fix flaky test in bulk order scenario | Backend team | High | 2026-07-08 | In Progress |
| 4 | Add E2E tests for admin refund approval workflow | QA team | Critical | 2026-07-10 | Not Started |
| 5 | Add tests for email template rendering | Platform team | Medium | 2026-07-15 | Not Started |
| 6 | Add branch coverage tests for notification module | Platform team | Medium | 2026-07-20 | Not Started |
| 7 | Add Playwright E2E for top 5 admin dashboard journeys | QA team | Medium | 2026-07-25 | Not Started |

## 8. Tools and Configuration

| Tool | Purpose | Config File | Threshold |
|------|---------|-------------|-----------|
| Vitest | Unit + integration test runner | vitest.config.ts | 80% lines, 70% branches |
| Playwright | E2E test runner | playwright.config.ts | N/A |
| c8 | Coverage instrumentation | .c8rc.json | — |
| Codecov | Coverage tracking and trends | codecov.yml | 80% minimum |
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

Coverage reports should answer three questions: where are we, where do we need to be, and what's changing. The module breakdown shows where coverage is concentrated. The feature breakdown shows what user-facing functionality is tested. The critical path section shows whether the most important user journeys are covered.

Trend analysis is the most valuable section for stakeholders. A single month's coverage number is meaningless without context. Six months of trend data shows whether the team is improving, stagnating, or regressing. Share this section with engineering managers and product owners.

Action items close the loop. A coverage report without action items is just data. Each gap should have an owner, priority, and due date. Review action items from the previous report before creating new ones.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Monorepo | Report per package + aggregate | Use Turborepo or Nx for per-package coverage |
| Microservices | Report per service | Each team owns their service's coverage |
| Open source | Public coverage badge | Codecov or Coveralls badge in README |
| Compliance | Add requirement traceability | Map coverage to regulatory requirements |
| Legacy codebase | Track coverage delta only | Don't set absolute targets for untested legacy code |

## What Works

1. Report monthly — frequent enough to spot trends, not so frequent it's noise
2. Break down by module and feature — overall numbers hide problem areas
3. Track critical paths separately — 90% overall coverage can hide 60% critical path coverage
4. Include action items with owners — reports without actions don't improve coverage
5. Show trends over 6 months — single data points don't tell a story
6. Track flaky tests alongside coverage — high coverage with high flakiness is false confidence
7. Enforce coverage gates in CI — don't rely on reports to catch regressions

## Common Mistakes

1. Chasing 100% coverage — diminishing returns above 85%. Focus on meaningful tests, not line counts.
2. Ignoring branch coverage — line coverage can be high while branch coverage is low, hiding untested conditionals.
3. Not tracking critical paths separately — overall coverage can mask critical gaps.
4. No trend data — a single coverage number is useless without historical context.
5. No action items — reports that just present data don't drive improvement.
6. Including test files in coverage measurement — inflates numbers. Exclude test files from coverage.
7. Not reviewing previous action items — creates a backlog of ignored commitments.

## Frequently Asked Questions

### What is the difference between line and branch coverage?

Line coverage measures the percentage of code lines executed by tests. Branch coverage measures the percentage of conditional branches (if/else, switch, ternary) taken. Branch coverage is stricter: a line with an if statement can be covered while one branch is never tested.

### Should I aim for 100% coverage?

No. 100% coverage is expensive and often means writing low-value tests just to hit a number. Aim for 80-85% overall, 95% for critical paths. Focus on meaningful assertions rather than covering every line.

### How do I measure critical path coverage?

Map each critical user journey to specific code paths. Tag tests that cover those paths. Calculate coverage as: (covered critical path steps / total critical path steps). This is more meaningful than overall coverage for risk assessment.

### What tools should I use for coverage tracking?

Use your test runner's built-in coverage (Vitest, Jest) for collection. Use Codecov or Coveralls for trend tracking and PR integration. Use SonarQube for combining coverage with static analysis. For monorepos, use per-package coverage with aggregation.

### How often should I generate coverage reports?

Generate coverage on every PR (via CI) for immediate feedback. Generate a full report monthly for trend analysis and stakeholder communication. Quarterly reports are sufficient for executive summaries.
