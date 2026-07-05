---
contentType: recipes
slug: python-coverage-pytest-cov
title: "Measure Test Coverage with pytest-cov"
description: "How to measure and enforce Python test coverage thresholds with pytest-cov, including branch coverage, HTML reports, exclusions, and CI integration."
metaDescription: "Measure and enforce Python test coverage with pytest-cov. Generate HTML reports, branch coverage, exclude lines, and fail CI on low coverage thresholds."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - python
  - pytest
  - coverage
  - pytest-cov
  - ci
  - recipe
relatedResources:
  - /recipes/testing/python-pytest-fixtures-parametrize
  - /recipes/testing/measure-test-coverage
  - /recipes/testing/python-mock-external-apis-responses
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Measure and enforce Python test coverage with pytest-cov. Generate HTML reports, branch coverage, exclude lines, and fail CI on low coverage thresholds."
  keywords:
    - testing
    - python
    - pytest
    - coverage
    - pytest-cov
    - ci
    - recipe
---

## Overview

`pytest-cov` is a pytest plugin that integrates the `coverage.py` library. It measures which lines of your Python code are executed during tests and reports the percentage. You can enforce minimum thresholds, generate HTML reports, and track branch coverage (if/else paths) — not just line coverage.

## When to Use

- Measuring how much of your codebase is covered by tests
- Enforcing a minimum coverage threshold in CI (e.g., fail builds below 80%)
- Identifying dead code that is never executed by any test
- Generating HTML coverage reports for visual inspection of gaps
- Tracking branch coverage to ensure both sides of if/else are tested

## When NOT to Use

- Chasing 100% coverage as a goal — 80-90% with good test quality is better than 100% with trivial tests
- Measuring coverage for scripts or one-off utilities — focus on tested production code
- Using coverage as the only quality metric — high coverage with bad assertions gives false confidence

## Solution

### Setup

```bash
pip install pytest pytest-cov
```

### Basic coverage run

```bash
pytest --cov=myapp tests/
```

This prints a summary to the terminal:

```
---------- coverage: platform linux, python 3.12 ----------
Name                    Stmts   Miss  Cover
-------------------------------------------
myapp/__init__.py           2      0   100%
myapp/models.py            45      5    89%
myapp/services.py          80     12    85%
myapp/api.py               60      8    87%
-------------------------------------------
TOTAL                     187     25    87%
```

### Enforce minimum coverage

```bash
pytest --cov=myapp --cov-fail-under=80 tests/
```

If coverage falls below 80%, pytest exits with a non-zero code, failing CI.

### HTML report

```bash
pytest --cov=myapp --cov-report=html tests/
```

Opens `htmlcov/index.html` in a browser. Green lines are covered, red lines are missed, with line-by-line highlighting.

### Branch coverage

```bash
pytest --cov=myapp --cov-branch --cov-report=term-missing tests/
```

Branch coverage checks that both the `if` and `else` paths of each conditional are executed. Line coverage alone can miss branches where the condition is always true or always false in tests.

### Configuration in `pyproject.toml`

```toml
[tool.pytest.ini_options]
addopts = "--cov=myapp --cov-report=term-missing --cov-report=html --cov-branch"

[tool.coverage.run]
source = ["myapp"]
branch = true
omit = [
    "myapp/__init__.py",
    "myapp/migrations/*",
    "*/tests/*",
]

[tool.coverage.report]
show_missing = true
skip_covered = false
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

### Excluding specific lines

```python
def get_config(key: str, default=None):
    if key in os.environ:
        return os.environ[key]
    return default  # pragma: no cover
```

The `# pragma: no cover` comment tells coverage to ignore that line.

### Excluding entire blocks

```python
if TYPE_CHECKING:
    from myapp.models import User  # pragma: no cover
```

With the `exclude_lines` config above, any line matching `if TYPE_CHECKING:` and everything under it is excluded.

### Coverage for multiprocessing

```python
# pyproject.toml
[tool.coverage.run]
concurrency = ["multiprocessing", "thread"]
```

### Coverage with parallel test runs

```bash
pytest -n auto --cov=myapp --cov-report=term-missing
```

With `pytest-xdist`, each worker writes its own `.coverage` file. Use `coverage combine` before generating the report:

```bash
coverage combine
coverage report
coverage html
```

## Variants

### Using `coverage.py` directly (without pytest)

```bash
coverage run -m pytest tests/
coverage report -m
coverage html
```

### Coverage diff with `diff-cover`

```bash
pip install diff-cover
coverage xml
diff-cover coverage.xml --compare-branch=origin/main --html-report=coverage-diff.html
```

This shows coverage only for lines changed in the current branch — useful for PR reviews.

### Coverage trends with `coverage-badge`

```bash
pip install coverage-badge
coverage-badge -o coverage-badge.svg
```

Generates an SVG badge with the current coverage percentage for your README.

## Best Practices

- Set a realistic threshold (80-85%) — too high encourages trivial tests just to hit the number
- Use branch coverage alongside line coverage — it catches untested else paths
- Exclude migration files, `__init__.py`, and test files from coverage measurement
- Use `# pragma: no cover` for debug-only code, `__repr__`, and `if __name__` blocks
- Review coverage reports regularly — find gaps in critical paths, not just overall percentage
- Generate XML coverage for CI tools (SonarQube, Codecov, Coveralls)

## Common Mistakes

- **Chasing 100% coverage**: writing trivial tests (`assert True`) to cover lines without verifying behavior.
- **Not using branch coverage**: line coverage of 100% can still miss `else` branches.
- **Including test files in coverage**: `tests/` should be excluded — you're measuring production code.
- **Not combining parallel coverage files**: with `pytest-xdist`, each worker writes a separate file. Run `coverage combine` before reporting.
- **Excluding too much**: if you exclude every hard-to-test line, the number becomes meaningless.

## FAQ

### What is the difference between line coverage and branch coverage?

Line coverage measures whether a line was executed. Branch coverage measures whether both paths of a conditional (if/else) were taken. A line with `if x:` can be 100% line-covered but only 50% branch-covered if `x` is always `True` in tests.

### How do I exclude a whole file from coverage?

In `pyproject.toml`:

```toml
[tool.coverage.run]
omit = ["myapp/legacy/*", "myapp/migrations/*"]
```

### How do I get coverage for a single test file?

```bash
pytest tests/test_models.py --cov=myapp.models --cov-report=term-missing
```

### Can I use pytest-cov with Django or Flask?

Yes. Point `--cov` to your project package:

```bash
pytest --cov=myproject --cov-report=html
```

For Django, ensure `DJANGO_SETTINGS_MODULE` is set in your test configuration.

### How do I fail CI only on decreased coverage?

Use `diff-cover` with `--fail-under=100` to require 100% coverage on changed lines:

```bash
coverage xml
diff-cover coverage.xml --compare-branch=origin/main --fail-under=100
```
