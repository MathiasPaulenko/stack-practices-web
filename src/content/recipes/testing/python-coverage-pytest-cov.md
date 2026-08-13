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
relatedResources:
  - /recipes/python-pytest-fixtures-parametrize
  - /recipes/measure-test-coverage
  - /recipes/python-mock-external-apis-responses
  - /recipes/python-hypothesis-property-testing
  - /recipes/implement-mutation-testing
  - /recipes/setup-test-fixtures
lastUpdated: "2026-08-13"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Measure and enforce Python test coverage with pytest-cov. Generate HTML reports, branch coverage, exclude lines, and fail CI on low coverage thresholds."
  keywords:
    - testing
    - python
    - pytest
    - coverage
    - pytest-cov
    - branch-coverage
    - ci-cd



---
## Overview

`pytest-cov` is a pytest plugin that wraps `coverage.py`. During the test run it records which lines and branches of your Python code are reached, prints a coverage summary, and can fail CI if the percentage falls below a threshold. It can also generate HTML reports and ignore files or lines that don't need to be counted.

## When to Use

Use this resource when:

- You want a measurable coverage number before merging PRs
- CI must fail when new code isn't tested enough
- You need an HTML report to find untested code paths
- You want branch coverage, not just line coverage
- You're adding coverage to a Flask, Django, or plain Python project

## When NOT to Use

Don't use coverage as the only quality signal. It measures what ran, not what was asserted.

- Don't chase 100% coverage with trivial tests just to hit the number
- Don't include one-off scripts or auto-generated code in the measurement
- Don't rely on coverage alone when correctness really matters; pair it with mutation or property tests

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

With the `exclude_lines` config above, any line matching `if TYPE_CHECKING:` and everything under it's excluded.

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

## Explanation

`coverage.py` runs alongside your tests and records each executable line that's reached. It then counts how many of those lines were hit and converts that into a percentage. Line coverage tells you whether a statement ran; branch coverage goes further and checks whether each `if/else`, `and`, `or`, and ternary took both paths.

High line coverage is easy to fake: a test that just calls a function with one argument can cover many lines without checking edge cases. Branch coverage makes that harder because it forces the test suite to exercise both sides of conditionals.

A threshold of 80-90% is usually a good starting point. The exact number matters less than the trend and the locations of the gaps. Aim to keep critical modules (payment logic, auth, data validation) well covered, and allow lower numbers in thin glue code or generated files.

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

- Start with a threshold of 80-90% for mature modules. Lower is fine for prototypes, as long as the number actually means something.
- Add `--cov-branch` in CI so untested `else` paths show up as missing.
- Exclude migration files, `__init__.py`, and the test suite from the measurement.
- Only use `# pragma: no cover` for debug helpers and abstract stubs; never for error paths.
- Review the HTML report before raising the threshold; the aggregate number hides local gaps.
- Publish an XML report with `--cov-report=xml` so SonarQube, Codecov, or Coveralls can consume it.

## Common Mistakes

- **Chasing 100% coverage**: writing trivial tests (`assert True`) to cover lines without verifying behavior.
- **Not using branch coverage**: line coverage of 100% can still miss `else` branches.
- **Including test files in coverage**: `tests/` should be excluded — you're measuring production code.
- **Not combining parallel coverage files**: with `pytest-xdist`, each worker writes a separate file.  Run `coverage combine` before reporting.
- **Excluding too much**: if you exclude every hard-to-test line, the number becomes meaningless.

## Production Notes

- **Coverage report is empty**: make sure `--cov` points to a package, not a top-level script, and that `source` is set in the config.
- **Branch coverage is lower than expected**: add `--cov-branch` and check the HTML report for conditionals that always take the same path.
- **Coverage drops after adding `pytest-xdist`**: each worker writes its own `.coverage.*` file. Run `coverage combine` before `coverage report` or `coverage html`.
- **diff-cover reports 0% changed lines**: generate `coverage.xml` with `coverage xml` and fetch the comparison branch first.
- **Badge in README is stale**: regenerate the SVG in CI as an artifact or push it to a `badges` branch; don't commit the generated file to `main`.

## FAQ

### What is the difference between line coverage and branch coverage?

Line coverage checks whether a statement ran. Branch coverage checks whether both paths of an `if/else` were taken.

### How do I exclude a whole file from coverage?

Add the file or directory patterns to the `omit` list under `[tool.coverage.run]` in `pyproject.toml`. See the [implementation example](#exclude-a-whole-file-from-coverage).

### How do I get coverage for a single test file?

Point `--cov` at the module the test exercises instead of the whole package.
See the [implementation example](#get-coverage-for-a-single-test-file).

### Can I use pytest-cov with Django or Flask?

Yes. For Django or Flask, point `--cov` at the package and keep `DJANGO_SETTINGS_MODULE` set while the tests run.
See the [implementation example](#can-i-use-pytest-cov-with-django-or-flask).

### How do I fail CI only on decreased coverage?

For PRs, run `diff-cover --fail-under=100` against the changed lines.
See the [implementation example](#fail-ci-only-on-decreased-coverage).

### How do I exclude lines from coverage?

For a one-off line, add `# pragma: no cover`. For repeatable patterns, add them to `exclude_lines` in the config.
See the [implementation example](#exclude-lines-from-coverage).

### How do I measure branch coverage instead of line coverage?

Add the `--cov-branch` flag to pytest, or set `branch = true` in your coverage config.
See the [implementation example](#measure-branch-coverage-instead-of-line-coverage).

### How do I generate coverage badges for my README?

Generate the SVG from the report with `coverage-badge`.
See the [implementation example](#generate-coverage-badges-for-my-readme).

### How do I handle coverage with multiprocessing?

When tests spawn processes, set `concurrency = multiprocessing` in the coverage config, then run `coverage combine` before the report.
See the [implementation example](#handle-coverage-with-multiprocessing).

### How do I integrate coverage with GitHub Actions?

Run pytest with `--cov-report=xml`, then upload the generated `coverage.xml` with the Codecov action.
See the [implementation example](#integrate-coverage-with-github-actions).

## Implementation Examples

### Exclude a whole file from coverage

```toml
[tool.coverage.run]
omit = ["myapp/legacy/*", "myapp/migrations/*"]
```


### Get coverage for a single test file

```bash
pytest tests/test_models.py --cov=myapp.models --cov-report=term-missing
```


### Can I use pytest-cov with Django or Flask

```bash
pytest --cov=myproject --cov-report=html
```

For Django, ensure `DJANGO_SETTINGS_MODULE` is set in your test configuration.


### Fail CI only on decreased coverage

```bash
coverage xml
diff-cover coverage.xml --compare-branch=origin/main --fail-under=100
```


### Exclude lines from coverage

```ini
[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
```

Exclude debug-only code, repr methods, and abstract method stubs. Don't exclude error handling paths — those are critical to test.


### Measure branch coverage instead of line coverage

```bash
pytest --cov=myapp --cov-branch --cov-report=term-missing
```

Branch coverage reports whether both the true and false paths of each conditional were executed. It catches missing else branches and short-circuit evaluation paths that line coverage misses.


### Generate coverage badges for my README

```bash
pip install coverage-badge
coverage-badge -o coverage.svg
```

Add the badge to your README: `![coverage](coverage.svg)`. In CI, generate the badge as an artifact and commit it to a `badges` branch or upload to a badge service like shields.io.


### Handle coverage with multiprocessing

```ini
[run]
concurrency = multiprocessing
parallel = True
```

This spawns separate coverage data files per process. Run `coverage combine` after the test suite to merge them. Without this, coverage from child processes is lost.


### Integrate coverage with GitHub Actions

```yaml
- run: pytest --cov=myapp --cov-report=xml
- uses: codecov/codecov-action@v4
  with:
    file: ./coverage.xml
```

Codecov posts a comment on PRs with coverage diff and visualizes uncovered lines. Use `fail_under` in `.coveragerc` to fail the CI job if coverage drops below a threshold.

## Key Takeaways

- `pytest-cov` wraps `coverage.py` and gives you line, branch, and missing-line reports in a single pytest run.
- Pick a realistic threshold in `pyproject.toml` or CI and raise it only after the gaps are real, not excluded.
- Use branch coverage to catch untested `else` paths that line coverage hides.
- Exclude `migrations/`, test files, and `__init__.py`; use `pragma: no cover` only for debug helpers or abstract stubs.
- Combine parallel coverage files and upload an XML report for CI dashboards.

## Further Reading

If you want to go deeper, these resources cover the tools and practices mentioned here:

- [coverage.py documentation](https://coverage.readthedocs.io/)
- [pytest-cov documentation](https://pytest-cov.readthedocs.io/)
- [Complete pytest production guide](/guides/complete-guide-pytest-production/)
- [pytest fixtures and parametrization](/recipes/python-pytest-fixtures-parametrize/)
- [Mutation testing in Python](/recipes/implement-mutation-testing/)
- [Mocking external APIs with Python](/recipes/python-mock-external-apis-responses/)
