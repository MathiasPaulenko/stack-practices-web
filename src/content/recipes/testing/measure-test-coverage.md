---
contentType: recipes
slug: measure-test-coverage
title: "Measure Test Coverage"
description: "How to measure, report, and enforce code coverage with branch and condition coverage using pytest-cov, nyc, and JaCoCo for meaningful quality gates."
metaDescription: "Measure, report, and enforce code coverage with branch and condition coverage using pytest-cov, nyc, and JaCoCo in CI/CD pipelines."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - coverage
  - pytest-cov
  - nyc
  - jacoco
  - ci-cd
  - recipe
relatedResources:
  - /recipes/testing/setup-test-fixtures
  - /recipes/testing/generate-test-data
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Measure, report, and enforce code coverage with branch and condition coverage using pytest-cov, nyc, and JaCoCo in CI/CD pipelines."
  keywords:
    - testing
    - coverage
    - pytest-cov
    - nyc
    - jacoco
    - ci-cd
    - recipe
---

## Overview

Code coverage measures which lines, branches, and conditions were executed during tests. It is a useful proxy for untested code, but not a measure of test quality — 100% coverage with no assertions is meaningless. This recipe shows how to collect, report, and set meaningful coverage thresholds without creating perverse incentives.

## When to Use

- You need visibility into which code paths lack any test execution
- CI pipelines need a gate to prevent untested code from being merged
- You are refactoring legacy code and want to ensure new changes are tested
- Teams need a shared metric to track testing progress over time
- You want to identify dead code that is never executed in production or tests

## When NOT to Use

- Coverage is treated as a target (e.g., "must be 90%") rather than a guide — this leads to tests without assertions
- The codebase is a prototype or spike that will be discarded — coverage adds no value
- You are testing generated code, framework boilerplate, or configuration files
- The team optimizes for coverage percentage over finding real bugs

## Step-by-Step Implementation

### Python (pytest-cov)

```bash
# Install
pip install pytest-cov

# Run with terminal report
pytest --cov=myproject --cov-report=term-missing tests/

# Generate HTML report
pytest --cov=myproject --cov-report=html --cov-report=xml tests/

# Fail below threshold (enforced in CI)
pytest --cov=myproject --cov-fail-under=80 tests/

# Branch coverage (tracks if/else both taken)
pytest --cov=myproject --cov-branch tests/
```

```ini
# pyproject.toml configuration
[tool.coverage.run]
source = ["myproject"]
branch = true
omit = [
    "*/tests/*",
    "*/migrations/*",
    "*/venv/*",
]

[tool.coverage.report]
precision = 2
fail_under = 80
skip_covered = true
show_missing = true

[tool.coverage.html]
directory = "htmlcov"

[tool.coverage.xml]
output = "coverage.xml"
```

```python
# Running in CI with multiple markers
pytest -m "not slow" --cov=myproject --cov-report=xml --cov-fail-under=80
```

### JavaScript (nyc / c8)

```bash
# c8 is the modern, fast native V8 coverage tool
npm install --save-dev c8

# Run tests with coverage
npx c8 npm test

# HTML report
npx c8 --reporter=html --reporter=text npm test

# Fail below threshold
npx c8 --check-coverage --lines 80 --functions 80 --branches 75 npm test

# Exclude files from coverage
npx c8 --exclude="src/**/*.test.js" --exclude="src/vendor/**" npm test
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "vitest": "^1.0.0"
  }
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      exclude: [
        '**/*.test.ts',
        '**/tests/**',
        '**/node_modules/**',
        '**/vendor/**'
      ]
    }
  }
});
```

### Java (JaCoCo)

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.11</version>
  <executions>
    <execution>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
    <execution>
      <id>check</id>
      <goals>
        <goal>check</goal>
      </goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
              <limit>
                <counter>BRANCH</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.75</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

```bash
# Generate report
mvn jacoco:report

# Check thresholds
mvn jacoco:check

# Generate badge for README
mvn jacoco:report && cat target/site/jacoco/index.html | grep -oP 'Total[^%]+%'
```

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install pytest pytest-cov
      - run: pytest --cov=myproject --cov-report=xml --cov-fail-under=80
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

## Best Practices

- **Measure branch coverage, not just line coverage.** A single line with `if x:` reports as covered if the true branch is taken, even if the false branch is never tested. Branch coverage catches this.
- **Set thresholds per module, not globally.** Core business logic should have higher thresholds (85-90%) than UI glue code or auto-generated files (50-60%).
- **Exclude infrastructure code from targets.** Database migrations, generated gRPC clients, and config files should not count against your coverage metric.
- **Track coverage trends, not absolute numbers.** A drop of 5% on a PR is more actionable than "we are at 82% today."
- **Review uncovered lines in PRs, not just the percentage.** A comment bot that lists the 3 uncovered lines is more useful than a red checkmark at 79%.

## Common Mistakes

- **Enforcing 100% coverage.** It encourages tests that execute code without asserting behavior, or `@exclude` annotations to game the metric.
- **Only measuring line coverage.** A function with 10 branches can show 100% line coverage while only 2 branches are tested.
- **Including test files in coverage.** Test utilities and mock classes inflate the number and hide missing production coverage.
- **Comparing coverage across languages.** Python branch coverage and Java line coverage are not comparable metrics — track trends within each codebase.
- **Ignoring coverage on integration tests.** Slow integration tests often cover the most important paths; excluding them from coverage hides real gaps.

## Frequently Asked Questions

**Q: Is 100% coverage a good goal?**
A: 100% line coverage is achievable but can be misleading. A high coverage number with weak assertions does not mean the code is well tested. Aim for meaningful coverage of critical paths.

**Q: What is the difference between line and branch coverage?**
A: Line coverage counts executed lines. Branch coverage counts whether each decision branch (if/else, switch) was taken. Branch coverage usually reveals more untested paths.

**Q: How should I use coverage in CI?**
A: Set minimum thresholds for critical modules, track trends over time, and reject pull requests that significantly lower coverage without justification. Avoid gaming the metric.
