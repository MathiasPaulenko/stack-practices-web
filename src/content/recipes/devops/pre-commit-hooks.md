---
contentType: recipes
slug: pre-commit-hooks
title: "Set Up Pre-Commit Hooks with husky and lint-staged"
description: "Set up pre-commit hooks with husky, lint-staged and the pre-commit framework to enforce linting, formatting and tests before every commit."
metaDescription: "Set up pre-commit hooks with husky, lint-staged and pre-commit. Practical examples for Python, JavaScript and Java to catch issues before every commit."
difficulty: beginner
topics:
  - devops
  - testing
tags:
  - devops
  - git
  - pre-commit
  - husky
  - lint-staged
  - ci-cd
relatedResources:
  - /recipes/github-actions
  - /recipes/bash-scripting-automation
  - /recipes/unit-testing
  - /recipes/container-security-scanning
  - /recipes/python-coverage-pytest-cov
  - /docs/contributing-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Set up pre-commit hooks with husky, lint-staged and pre-commit. Practical examples for Python, JavaScript and Java to catch issues before every commit."
  keywords:
    - pre-commit
    - husky
    - lint-staged
    - git-hooks
    - code-quality
    - linting
---

## Overview

A pre-commit hook is a script that runs between `git commit` and the moment the
commit is created. It gives fast, local feedback on linting, formatting, tests
and security before anything reaches CI. This recipe shows how to set up hooks
for Python, JavaScript and Java using three common approaches.

## When to Use

- Your team keeps committing code that fails CI lint or format checks.
- You want to keep style consistent without waiting for every PR review.
- You need to catch secrets or vulnerabilities before they enter history.
- You want to catch small issues locally before CI fails.

### When to avoid

- The project has no shared formatter or linter; a hook just adds friction
  without a clear rule to enforce.
- Your checks take more than a few seconds; slow hooks teach people to skip them.
- You're replacing CI gates with local hooks. Hooks are a convenience, not the
  final gate.

## Solution

### Python — pre-commit framework

```python
# Install the pre-commit framework
# pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/PyCQA/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--max-line-length=100']

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
```

Run `pre-commit install` to copy the hook into `.git/hooks/` and
`pre-commit run --all-files` to test it manually.

### JavaScript — husky + lint-staged

```javascript
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  },
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

```bash
# .husky/pre-commit (husky v9+ syntax)
echo "npx lint-staged" > .husky/pre-commit
```

```javascript
// .lintstagedrc.js
module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yaml}': ['prettier --write'],
};
```

### Java — Gradle Spotless + native hook

```java
// build.gradle
plugins {
    id 'com.diffplug.spotless' version '6.23.0'
}

spotless {
    java {
        googleJavaFormat()
    }
}
```

```bash
# git-hooks/pre-commit (chmod +x)
#!/bin/sh
./gradlew spotlessCheck
if [ $? -ne 0 ]; then
    echo "Spotless check failed. Run './gradlew spotlessApply' to fix."
    exit 1
fi
```

For Maven, the `git-build-hook-maven-plugin` can install tracked hooks from a
`git-hooks/` directory during the build.

## Explanation

A hook in `.git/hooks/pre-commit` is an executable script. Git runs it after you
type `git commit` and before it writes the commit. If the script exits with a
non-zero status, Git aborts the commit.

- The **pre-commit** framework (Python) installs and runs hooks from a single
  YAML file. It handles many languages and installs the tools it needs.
- **husky** installs the Git hook and **lint-staged** narrows the check to files
  in the staging area, so the commit stays fast.
- **Native hooks** allow any project to run a custom shell script. Gradle and
  Maven plugins can distribute that script with the repo.

There's a real trade-off: hooks add seconds to every commit, developers can
bypass them with `--no-verify`, and they must be installed in every fresh clone.
That's the reason the same checks should still run in CI.

## Variants

| Stack | Tooling | Notes |
| --- | --- | --- |
| Python | `pre-commit` framework | Mature; 200+ community hooks available |
| JavaScript / TypeScript | `husky` + `lint-staged` | Only staged files are checked |
| Java | Gradle `spotless` or Maven plugin | Formatting is part of the build |
| Go | `pre-commit` + `golangci-lint` | Reuse the Python framework with Go hooks |
| Secrets | `gitleaks` or `trufflehog` | Add to the same config to block API keys |

## Best Practices

- Keep hooks fast by checking only staged files. Use `lint-staged` or the
  `files` filter in `.pre-commit-config.yaml`.
- Prefer tools that auto-fix and re-stage files, so the commit keeps the
  corrected version.
- Add a `prepare` or `postinstall` script so hooks install on `npm install` or
  `pip install`.
- Run the same checks in CI as well. Local hooks catch mistakes early; CI is the
  final gate.
- Document `--no-verify` for emergencies, but require review when someone uses
  it.
- Pin tool versions and cache installations. Reproducible hooks mean fewer
  "works on my machine" problems.

## Common Mistakes

- Checking the whole repo on every commit. It turns a quick commit into a long
  wait.
- Not auto-installing hooks. New clones will skip them without warning.
- Letting formatters fight each other. Align ESLint and Prettier with
  `eslint-config-prettier`.
- Running slow tests or heavy integration checks in a pre-commit hook.
- Treating hooks as a replacement for CI. They're the first line of defense
  rather than the last.

## FAQ

### Can I skip pre-commit hooks once?

Yes: use `git commit --no-verify` (or `-n`) when you really need to. Follow up
with a cleanup commit.

### Should I run tests in pre-commit hooks?

Unit tests under 10 seconds are fine. Anything slower belongs in CI.

### How do I share hooks across the team?

Store hook configuration in the repo. The `pre-commit` framework, `husky` and
Maven/Gradle plugins all read from tracked files. Never commit directly into
`.git/hooks/`, which isn't tracked.

### How do I add secrets scanning?

Add a `gitleaks` or `trufflehog` hook to the same `.pre-commit-config.yaml` or
`lint-staged` pipeline:

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
```

### How do I block bad commit messages?

Use a `commit-msg` hook with `commitlint`:

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci', 'perf']],
    'subject-max-length': [2, 'always', 72],
  },
};
```

### Why did my hook reformat a file but the commit still failed?

The hook changed the working copy but didn't re-add the file to the index.
Either make the tool re-stage automatically or run `git add` again.
