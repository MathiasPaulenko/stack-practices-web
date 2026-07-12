---




contentType: recipes
slug: python-bandit-static-analysis
title: "Find Security Issues in Python Code with Bandit"
description: "How to use Bandit to scan Python code for common security vulnerabilities, configure ignore lists, integrate with CI/CD, and interpret results."
metaDescription: "Scan Python code for security vulnerabilities with Bandit. Configure ignore lists, integrate with CI/CD, interpret results, and fix common findings."
difficulty: beginner
topics:
  - security
tags:
  - security
  - python
  - bandit
  - static-analysis
  - code-quality
  - recipe
relatedResources:
  - /recipes/python-pip-audit-vulnerability-scan
  - /recipes/python-mypy-strict-type-checking
  - /recipes/github-actions-reusable-workflows
  - /recipes/java-spotbugs-static-analysis
  - /recipes/nodejs-eslint-security-plugin
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Scan Python code for security vulnerabilities with Bandit. Configure ignore lists, integrate with CI/CD, interpret results, and fix common findings."
  keywords:
    - security
    - python
    - bandit
    - static-analysis
    - code-quality
    - recipe




---

## Overview

Bandit is a static analysis tool that scans Python code for common security vulnerabilities. It parses the AST (Abstract Syntax Tree) and checks for known insecure patterns — hardcoded passwords, shell injection, weak crypto, assert statements in production, and more. Bandit produces a report with severity levels (LOW, MEDIUM, HIGH) and confidence levels (LOW, MEDIUM, HIGH) for each finding.

## When to Use

- Scanning Python projects for common security issues before release
- Integrating security checks into CI/CD pipelines
- Auditing third-party Python code or dependencies
- Enforcing security standards across a team
- Pre-commit hooks to catch issues before they reach the repository

## When NOT to Use

- Non-Python codebases — Bandit only supports Python
- Runtime vulnerability detection — Bandit is static analysis only
- Dependency vulnerability scanning — use `pip-audit` or `safety` instead
- When you need deep taint analysis — Bandit checks patterns, not data flow

## Solution

### Install Bandit

```bash
pip install bandit

# Or as a dev dependency
pip install bandit[toml]

# Using poetry
poetry add --group dev bandit

# Using pipenv
pipenv install --dev bandit
```

### Basic scan

```bash
# Scan a single file
bandit myapp.py

# Scan a directory recursively
bandit -r src/

# Scan with verbose output
bandit -r src/ -v

# Output to a file
bandit -r src/ -o bandit-report.txt

# JSON output for CI/CD
bandit -r src/ -f json -o bandit-report.json

# HTML report
bandit -r src/ -f html -o bandit-report.html
```

### Configuration file

```ini
# .bandit — Bandit configuration
[bandit]
# Tests to skip (by ID)
skips: B101,B104,B105,B601,B602

# Tests to run (overrides skips if specified)
# tests: B201,B301,B501

# Paths to exclude
exclude_dirs: tests,venv,.venv,__pycache__,migrations,build,dist

# Target files/globs
targets: src

# Recursive scan
recursive: true

# Exit on first failure
# stop_on_failure: true
```

### YAML configuration (pyproject.toml)

```toml
# pyproject.toml
[tool.bandit]
targets = ["src"]
exclude_dirs = ["tests", "venv", "migrations"]
skips = ["B101", "B104", "B105"]

[tool.bandit.tests]
# Run only specific tests
# tests = ["B201", "B301", "B501"]
```

### Common Bandit findings and fixes

#### B101: Assert statements in production

```python
# BAD — Bandit B101
assert user.is_authenticated, "User not authenticated"

# GOOD — raise explicit exception
if not user.is_authenticated:
    raise PermissionError("User not authenticated")
```

#### B105: Hardcoded password string

```python
# BAD — Bandit B105
PASSWORD = "admin123"
API_KEY = "sk-abc123"

# GOOD — use environment variables
import os
PASSWORD = os.environ["APP_PASSWORD"]
API_KEY = os.environ["API_KEY"]
```

#### B602/B603: Subprocess shell injection

```python
# BAD — Bandit B602 (shell=True)
import subprocess
subprocess.call(f"ls {user_input}", shell=True)

# GOOD — pass args as list, no shell
import subprocess
subprocess.call(["ls", user_input])

# GOOD — use shlex for complex commands
import shlex
import subprocess
cmd = f"grep {pattern} {filename}"
subprocess.call(shlex.split(cmd))
```

#### B301/B302: Pickle deserialization

```python
# BAD — Bandit B301
import pickle
data = pickle.loads(user_supplied_bytes)

# GOOD — use JSON
import json
data = json.loads(user_supplied_string)
```

#### B501: Request with verify=False

```python
# BAD — Bandit B501 (SSL verification disabled)
import requests
response = requests.get(url, verify=False)

# GOOD — always verify SSL
import requests
response = requests.get(url, verify=True)
```

#### B311: Random for crypto

```python
# BAD — Bandit B311 (random is not cryptographically secure)
import random
token = ''.join(random.choices(string.ascii_letters, k=32))

# GOOD — use secrets module
import secrets
token = ''.join(secrets.choice(string.ascii_letters) for _ in range(32))
# Or simpler:
token = secrets.token_urlsafe(32)
```

#### B404: Importing subprocess

```python
# Bandit B404 flags any import of subprocess
# This is informational — review usage, don't blindly suppress

# If subprocess is needed, import it and use safely
import subprocess  # nosec B404 — reviewed, used with shell=False

# Or suppress at the function level
def run_command(cmd):
    # nosec B603 — arguments validated before calling
    return subprocess.run(cmd, shell=False, check=True)
```

### Inline suppressions

```python
# Suppress a specific finding on a line
password = "test-password"  # nosec B105 — test fixture, not production

# Suppress multiple findings
import subprocess  # nosec B404,B603 — reviewed, shell=False used

# Suppress all findings on a line
data = pickle.loads(trusted_data)  # nosec — data from internal trusted source
```

### CI/CD integration with GitHub Actions

```yaml
# .github/workflows/bandit.yml
name: Bandit Security Scan

on: [push, pull_request]

jobs:
  bandit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install Bandit
        run: pip install bandit[toml]

      - name: Run Bandit
        run: bandit -r src/ -f json -o bandit-report.json || true

      - name: Check Bandit results
        run: |
          # Fail if there are HIGH severity findings
          HIGH_COUNT=$(python -c "
          import json
          with open('bandit-report.json') as f:
              data = json.load(f)
          high = sum(1 for r in data.get('results', []) if r['issue_severity'] == 'HIGH')
          print(high)
          ")
          if [ "$HIGH_COUNT" -gt 0 ]; then
            echo "Found $HIGH_COUNT HIGH severity findings"
            exit 1
          fi

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bandit-report
          path: bandit-report.json
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.9
    hooks:
      - id: bandit
        args: ["-r", "src/", "-ll"]
        exclude: ^(tests/|migrations/)
```

### Baseline file for incremental scanning

```bash
# Generate a baseline of current findings
bandit -r src/ -f json -o .bandit-baseline.json

# Run with baseline — only shows NEW findings
bandit -r src/ -b .bandit-baseline.json
```

### Custom Bandit plugin

```python
# bandit_plugins/no_print_statements.py
from bandit.core import issue
from bandit.core import test_properties as test_properties

@test_properties.checks('Call')
def no_print_statements(context, config):
    if context.call_function_name == 'print':
        return issue.Issue(
            severity=issue.Certainty.MEDIUM,
            confidence=issue.Certainty.HIGH,
            text="Print statement found in production code",
            lineno=context.node.lineno,
        )
```

```bash
# Run with custom plugin
bandit -r src/ --plugins bandit_plugins/no_print_statements.py
```

## Variants

### Bandit with tox

```ini
# tox.ini
[tox]
envlist = bandit

[testenv:bandit]
deps = bandit
commands = bandit -r src/ -ll -ii
```

### Bandit in Makefile

```makefile
# Makefile
.PHONY: security
security:
	bandit -r src/ -ll -ii -f json -o bandit-report.json
	@echo "Bandit scan complete. Report: bandit-report.json"

.PHONY: security-verbose
security-verbose:
	bandit -r src/ -v
```

### Bandit with severity filtering

```bash
# Only show MEDIUM and HIGH severity (-ll = LOW threshold)
bandit -r src/ -ll

# Only show HIGH severity (-lll = only HIGH)
bandit -r src/ -lll

# Only show HIGH confidence findings (-ii = HIGH confidence only)
bandit -r src/ -ii

# Combine: HIGH severity + HIGH confidence
bandit -r src/ -lll -ii
```

## Best Practices


- For a deeper guide, see [Detect Bugs in Java with SpotBugs Static Analysis](/recipes/java-spotbugs-static-analysis/).

- Run Bandit in CI/CD — catch security issues before merge
- Use `-ll` or `-lll` to filter noise — LOW severity findings are often false positives
- Create a `.bandit` config file — document which tests are skipped and why
- Use baseline files for legacy codebases — don't block on pre-existing issues
- Don't blindly suppress findings — understand why a finding exists before adding `# nosec`
- Combine with `pip-audit` — Bandit checks code, pip-audit checks dependencies
- Run in pre-commit hooks — catch issues locally before pushing
- Review skips periodically — new Bandit versions add new checks

## Common Mistakes

- **Suppressing findings without understanding**: adding `# nosec` without reviewing the finding hides real vulnerabilities. Always document why.
- **Running Bandit only on src/**: tests and scripts can have security issues too. Include them or review separately.
- **Ignoring LOW severity findings**: some LOW findings indicate bad patterns that could escalate. Review them periodically.
- **Not filtering test code**: test files use hardcoded passwords, asserts, and mock objects. Exclude test directories or skip relevant tests.
- **Running Bandit once**: security scanning should be continuous, not a one-time audit.

## FAQ

### What is Bandit?

A static analysis tool for Python that scans code for common security vulnerabilities by parsing the AST and checking for known insecure patterns.

### How does Bandit differ from pip-audit?

Bandit scans your source code for insecure coding patterns. pip-audit scans your installed dependencies for known CVEs. Use both for detailed security coverage.

### What do severity and confidence mean in Bandit?

Severity (LOW/MEDIUM/HIGH) indicates the potential impact of the vulnerability. Confidence (LOW/MEDIUM/HIGH) indicates how certain Bandit is that the finding is real. Filter by both to reduce false positives.

### How do I suppress a Bandit finding?

Add `# nosec` to the end of the line. To suppress a specific test, use `# nosec B105`. Always add a comment explaining why the suppression is safe.

### Can Bandit detect all security vulnerabilities?

No. Bandit checks for known insecure patterns. It cannot detect logic flaws, business logic vulnerabilities, or issues requiring runtime analysis. Use it as one layer in a security strategy.
