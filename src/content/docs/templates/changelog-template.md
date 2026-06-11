---
contentType: docs
templateType: changelog
slug: changelog-template
title: "Changelog Template"
description: "A structured changelog template following Keep a Changelog conventions for tracking project releases."
metaDescription: "Standardized changelog template following Keep a Changelog. Track releases, features, fixes, and breaking changes consistently."
difficulty: beginner
topics:
  - devops
tags:
  - changelog
  - versioning
  - release-notes
  - semver
relatedResources:
  - /docs/contributing-guide
  - /docs/readme-template
  - /guides/cicd-pipeline-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Standardized changelog template following Keep a Changelog. Track releases, features, fixes, and breaking changes consistently."
---

## Overview

A changelog is a curated, chronologically ordered list of notable changes for each version of a project. It helps users and contributors understand what has changed between releases.

## When to Use

- You maintain a library, framework, or application with versioned releases
- You need to communicate breaking changes to consumers
- You want to automate release note generation

## Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release with core functionality
```

## Categories Explained

| Category | Use For |
|----------|---------|
| **Added** | New features |
| **Changed** | Changes to existing functionality |
| **Deprecated** | Features marked for removal |
| **Removed** | Features removed in this release |
| **Fixed** | Bug fixes |
| **Security** | Security vulnerability fixes |

## Best Practices

- **Date every release** using ISO 8601 format (`YYYY-MM-DD`)
- **Group changes** by category within each release
- **Link to issues/PRs** when applicable
- **Mention breaking changes** prominently
- **Keep an Unreleased section** at the top for upcoming changes

## Common Mistakes

- **Commit log dumps**: A changelog is curated, not a raw git log
- **Missing dates**: Every release should have a date
- **Forgetting the Unreleased section**: Helps users see what's coming
