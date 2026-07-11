---
contentType: docs
slug: contributing-guide
templateType: guideline
title: "Contributing Guide Template"
description: "A ready-to-use template for open-source and internal project contribution guidelines."
metaDescription: "Use this contributing guide template to set up pull request workflows, coding standards, and contributor onboarding for your project."
difficulty: beginner
topics:
  - devops
tags:
  - community
  - devops
  - onboarding
  - open-source
  - template
relatedResources:
  - /docs/templates/readme-template
  - /recipes/devops/git-workflow
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this contributing guide template to set up pull request workflows, coding standards, and contributor onboarding for your project."
  keywords:
    - contributing guide
    - contribution template
    - open source guidelines
    - pull request template
    - developer onboarding
---

## Template Structure

Use this template to create a `CONTRIBUTING.md` file for your repository.

---

# Contributing to [Project Name]

Thank you for your interest in contributing! This document will guide you through the process.

## Table of Contents

- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- [Tool/Runtime] version X or higher
- [Package manager] installed
- A GitHub account

### Finding Issues to Work On

- Check [good first issue](link) labels
- Browse [open issues](link) and comment to claim
- Open a new issue if you find a bug or have a capability request

## How to Contribute

### Reporting Bugs

1. Search existing issues first
2. Open a new issue with the [bug report template](/docs/templates/bug-report-template)
3. Include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (OS, version, etc.)
   - Screenshots or logs if applicable

### Suggesting Capabilities

1. Open a new issue with the [capability request template](/docs/templates/feature-request-template)
2. Describe the problem and proposed solution
3. Discuss with maintainers before investing major effort

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/[org]/[repo].git
cd [repo]

# 2. Install dependencies
[install command]

# 3. Create a branch
git checkout -b feature/your-feature-name

# 4. Verify setup
[test command]
```

## Coding Standards

### Style Guide

- Follow [language/framework conventions]
- Run the linter before committing: `[lint command]`
- Format code with: `[format command]`

### Commit Messages

Use conventional commits:

```
feat: add new feature
fix: resolve bug in module
docs: update documentation
refactor: restructure code
test: add missing tests
chore: update dependencies
```

### Testing

- Add tests for new capabilities
- Ensure all tests pass: `[test command]`
- Aim for [coverage target]% code coverage

## Pull Request Process

1. **Branch naming**: `feature/description`, `fix/description`, `docs/description`
2. **Commit**: Follow conventional commit format
3. **Push**: Push to your fork
4. **Open PR**: Use the pull request template
5. **Review**: Address reviewer feedback
6. **Merge**: Maintainers will merge once approved

### PR Checklist

- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] Linter passes
- [ ] Commit messages follow convention
- [ ] PR description is clear and complete

## Community Guidelines

### [Code of Conduct](/docs/templates/code-of-conduct-template)

- Be respectful and inclusive
- Focus on constructive feedback
- Assume good intent
- Report harassment to [contact email]

### Recognition

Contributors will be:
- Listed in the [README](/docs/templates/readme-template) or CONTRIBUTORS file
- Mentioned in release notes
- Given appropriate credit in the project history

## Questions?

- Open a [Discussion](link) for general questions
- Join our [Discord/Slack](link) for real-time chat
- Email [contact email] for private inquiries

## Frequently Asked Questions

### Do I need to sign a CLA before contributing?

Many projects use a Contributor License Agreement (CLA) or Developer Certificate of Origin (DCO). Check the repository for a `CONTRIBUTING.md` or `CLA.md` file. Some projects accept contributions without any formal agreement.

### How do I find issues to work on?

Look for labels like `good first issue`, `help wanted`, or `beginner-friendly` in the issue tracker. These are curated by maintainers for new contributors.

### What if my contribution is rejected?

Do not take it personally. Maintainers may reject contributions that do not align with project goals or need major rework. Ask for specific feedback and iterate. Every project has different standards and priorities.


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Open source | Public guide with CLA | Include code of conduct and CLA process |
| Internal project | Guide with CI/CD workflow | Focus on internal standards |
| Monorepo | Guide with scope rules | Include what goes in each package |
| Library | Guide with semver versioning | Include breaking change policy |

## Contribution Flow Example

```text
=== Flow: From idea to merge ===

1. Proposal
   - Create issue describing the problem or feature
   - For large features: create RFC (Request for Comments)
   - Wait for maintainer feedback before starting

2. Setup
   - Fork the repo (or branch if internal)
   - Clone locally
   - Install dependencies: npm install
   - Run tests: npm test
   - Run linter: npm run lint

3. Implementation
   - Create branch from main: git checkout -b feature/short-description
   - Write code following project standards
   - Write or update tests
   - Update documentation if needed
   - Commit with conventional message: feat: add email validation

4. Local Verification
   - npm test (all tests pass)
   - npm run lint (no errors)
   - npm run build (compiles without errors)
   - Verify no unrelated changes

5. Pull Request
   - Push to fork/branch
   - Create PR using the project template
   - Clear description of the change and why
   - Link related issue: "Closes #123"
   - Attach screenshots if UI changes
   - Wait for CI: all checks must pass

6. Code Review
   - Respond to review comments
   - Make requested changes
   - Mark conversations as resolved
   - Do not force merge if maintainers object
   - Squash commits if needed

7. Merge
   - Maintainer approves and merges
   - Branch deleted after merge
   - Issue auto-closed
```

### How do we handle community contributions?

For external contributions: have a clear, public CONTRIBUTING.md. Use a CLA (Contributor License Agreement) if needed for legal protection. Respond to issues and PRs within 7 days — lack of response discourages contributors. Use labels: "good first issue", "help wanted", "needs review" to guide contributors. Maintain a code of conduct (Contributor Covenant) and enforce it. Create a code style guide. Use issue and PR templates. Recognize contributors in the README or a CONTRIBUTORS file. For large contributions: request an RFC first. The community is your biggest asset — treat it well.

### How do we handle breaking changes in contributions?

For breaking changes: label the PR as "breaking change". Require approval from at least 2 maintainers. Document the change in CHANGELOG with migration instructions. If the project uses semver: the merge must go in a major release (v2.x -> v3.0). Provide a codemod or migration script if possible. Communicate the breaking change in advance: deprecation warning in the previous version, note in README, and post in blog/chat. For libraries: publish a beta version first so users can test. Never merge a breaking change without a communication plan — users will find out when their tests fail.

### How do we maintain contribution quality?

Use CI/CD to enforce quality: linter, tests, build, and coverage on every PR. Require all checks to pass before merge. Use GitHub branch protection: require review from N maintainers, require status checks, require up-to-date branches. Maintain a code review standard: review logic, tests, documentation, and style. Give constructive feedback — not "this is wrong" but "consider using X because Y." Close PRs with no activity for 30 days. For new contributors: be more patient and offer more guidance. Quality is a balance — do not be so strict that you scare away contributors nor so lax that the code degrades.















































End of document. Review and update quarterly.