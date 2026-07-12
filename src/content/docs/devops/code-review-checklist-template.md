---




contentType: docs
slug: code-review-checklist-template
title: "Code Review Checklist Template"
description: "A structured checklist template for conducting consistent, thorough code reviews that catch bugs, improve readability, and share knowledge across the team."
metaDescription: "Standardize code reviews with this checklist. Covers logic, security, performance, tests, and style for consistent, high-quality feedback."
difficulty: beginner
topics:
  - devops
  - testing
tags:
  - code-review
  - checklist
  - quality-assurance
  - team-process
  - pull-request
relatedResources:
  - /docs/engineering-handbook-template
  - /docs/git-branching-strategy-document
  - /docs/onboarding-checklist-backend-engineer
  - /recipes/git-rebase-interactive-tutorial
  - /docs/feature-specification-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Standardize code reviews with this checklist. Covers logic, security, performance, tests, and style for consistent, high-quality feedback."
  keywords:
    - code review checklist
    - pull request review
    - code quality template
    - review standards
    - developer checklist




---

## Overview

Code reviews are the most useful quality gate in software delivery, but only when they are consistent. Without a checklist, reviewers focus on what they personally care about: one engineer checks for SQL injection, another obsesses over variable names, and a third only looks at test coverage. A shared checklist ensures every review covers the dimensions that matter to the team, while leaving room for human judgment on design and architecture.

## When to Use

Use this checklist when:
- You want to standardize what "done" means for code review across the team
- New reviewers are unsure what to look for in a pull request
- Reviews are taking too long because reviewers are unsure of scope
- You are onboarding a new team and need to establish shared standards quickly
- You want to reduce post-merge defects and production incidents

## Prerequisites

Before adopting this checklist:
- [ ] The team agrees on which items are mandatory vs. optional
- [ ] CI is configured to catch automated issues (linting, formatting, type checks)
- [ ] Reviewers understand that checklists augment judgment; they do not replace it
- [ ] There is a documented escalation path for disagreements between author and reviewer
- [ ] The checklist is stored where reviewers can reference it easily (PR template, wiki, or pinned message)

## Solution

```markdown
# Code Review Checklist

> Reviewer: ______ | Author: ______ | PR: ______ | Date: ______

## 1. Logic and Correctness
- [ ] The code does what the PR description claims it does
- [ ] Edge cases are handled (empty inputs, nulls, timeouts, failures)
- [ ] No off-by-one errors, race conditions, or infinite loops
- [ ] Error paths are explicit and do not swallow exceptions silently
- [ ] Business logic matches the spec or ticket requirements

## 2. Security
- [ ] No secrets, tokens, or credentials in code
- [ ] User inputs are validated and sanitized
- [ ] Authorization checks exist for protected operations
- [ ] No SQL injection, XSS, or command injection vulnerabilities
- [ ] Dependencies added are vetted and from trusted sources

## 3. Performance
- [ ] No N+1 queries or obvious algorithmic inefficiencies
- [ ] Large data sets are paginated or streamed
- [ ] No unnecessary network calls or blocking I/O in hot paths
- [ ] Caching is used appropriately where applicable
- [ ] Resource leaks (connections, file handles, memory) are prevented

## 4. Testing
- [ ] Unit tests cover the new or changed logic
- [ ] Integration tests cover external dependencies and boundaries
- [ ] Edge cases and failure paths are tested, not just happy paths
- [ ] Tests are deterministic and do not rely on timing or order
- [ ] Test names describe behavior, not implementation

## 5. Maintainability and Style
- [ ] Code is readable without needing to ask the author
- [ ] Variable and function names are descriptive and consistent
- [ ] No duplicated logic that could be extracted or reused
- [ ] Comments explain "why," not "what" (the code shows what)
- [ ] Complexity is appropriate; over-engineering is flagged

## 6. Documentation
- [ ] Public APIs have updated documentation or OpenAPI specs
- [ ] README or runbooks are updated if behavior changed
- [ ] Breaking changes are called out explicitly in the PR description
- [ ] Migration steps are documented if schema or config changed

## 7. Deployment and Operations
- [ ] Feature flags are used for risky or irreversible changes
- [ ] Monitoring and alerts are added or updated for new paths
- [ ] Rollback procedure is understood and tested
- [ ] Database migrations are backward-compatible or have a plan

---

## Review Notes

| Line / File | Issue | Severity | Action |
|-------------|-------|----------|--------|
| ______ | ______ | Nit / Suggestion / Blocker | ______ |

**Overall verdict:** Approve / Request changes / Comment
**Merge readiness:** Ready / Needs work / Blocked
```

## Explanation

The checklist is organized by concern rather than by file type. This prevents reviewers from getting lost in line-by-line diff reading and instead evaluating the change against the dimensions that matter to the team: correctness, security, performance, testing, maintainability, documentation, and operations. Separating automated concerns (linting, formatting) from human concerns (design, readability) keeps reviews focused on what humans do best.

## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Frontend / UI code | Add accessibility, responsive design, and browser compatibility sections | Visual changes need manual verification |
| Data pipelines | Add data quality checks, schema compatibility, and backfill considerations | Data changes are harder to undo than code changes |
| Infrastructure / Terraform | Add state safety, plan review, and blast radius assessment | One misconfiguration can take down production |
| Security-critical code | Make security section mandatory and require security team sign-off | Finance, healthcare, and auth systems |
| Hotfix / incident response | Shorten checklist to security, correctness, and rollback only | Speed matters; document what was skipped and why |

## What works

1. Keep the checklist visible. Embed it in the PR template so reviewers see it automatically
2. Distinguish nits from blockers. Not every issue prevents merge; use severity labels to keep reviews moving
3. Rotate reviewers. Checklists reduce the expertise gap, making it easier to spread review load
4. Review the checklist quarterly. Remove items that are now automated; add items that keep slipping through
5. Time-box reviews. If a review takes more than 30 minutes, the PR is probably too large

## Common Mistakes

1. Treating the checklist as a substitute for thinking. The checklist catches common omissions, not design flaws
2. Making every item mandatory. This slows reviews without improving quality; only block on correctness, security, and tests
3. Not updating the checklist. As tools improve, manual checks should be automated
4. Reviewing alone. Pair reviews on critical changes catch issues solo reviewers miss
5. Focusing only on the diff. Reviewers should also check that the PR description, tests, and documentation are consistent

## Frequently Asked Questions

### How long should a code review take?

Small PRs (under 200 lines) should be reviewed within a few hours. Large PRs should be split or reviewed in stages. If a review consistently takes longer than 30 minutes, the team should investigate whether PRs are too large or the checklist is too broad.

### Should junior engineers review senior engineers' code?

Yes. Code review is a learning opportunity as much as a quality gate. Junior reviewers catch clarity issues seniors overlook because they do not yet share the author's assumptions. The checklist levels the playing field by telling everyone what to check.

### What if the author disagrees with a review comment?

Discuss it. If the conversation stalls, escalate to a tech lead or the team's documented tiebreaker. The checklist exists to reduce subjective debates by making expectations explicit, but it cannot eliminate all disagreement.

## Advanced Solutions

### Automated code review with GitHub Actions and CodeQL

Combine the manual checklist with automated analysis to catch issues humans miss:

```yaml
# .github/workflows/code-review-automation.yml
name: Automated Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  codeql-analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: python, javascript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3

  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - name: Comment PR with lint results
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: "Linting or type checking failed. Please fix before requesting review."
            })

  pr-size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check PR size
        uses: actions/github-script@v7
        with:
          script: |
            const diff = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.payload.pull_request.number,
            });
            const totalChanges = diff.data.reduce(
              (sum, file) => sum + file.changes, 0
            );
            if (totalChanges > 500) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body: `This PR has ${totalChanges} changes. Consider splitting into smaller PRs for easier review.`
              });
            }
```

### Review bot for checklist enforcement

Automatically verify that PRs meet checklist requirements before review:

```python
import subprocess
import json
import re
from typing import List, Dict

class PRChecklistValidator:
    def __init__(self, pr_diff: str, pr_description: str):
        self.diff = pr_diff
        self.description = pr_description

    def check_tests_added(self) -> bool:
        """Verify that new code includes tests."""
        has_source = bool(re.search(r'\+\+\+ b/src/.*\.py', self.diff))
        has_tests = bool(re.search(r'\+\+\+ b/tests/.*\.py', self.diff))
        if has_source and not has_tests:
            return False
        return True

    def check_no_secrets(self) -> bool:
        """Check for common secret patterns in the diff."""
        secret_patterns = [
            r'(?i)api[_-]?key\s*=\s*["\'][^"\']+["\']',
            r'(?i)password\s*=\s*["\'][^"\']+["\']',
            r'(?i)secret\s*=\s*["\'][^"\']+["\']',
            r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',
            r'(?i)aws_secret_access_key\s*=\s*["\'][^"\']+["\']',
        ]
        added_lines = [line for line in self.diff.split('\n') if line.startswith('+')]
        for line in added_lines:
            for pattern in secret_patterns:
                if re.search(pattern, line):
                    return False
        return True

    def check_pr_description(self) -> bool:
        """Verify PR description has required sections."""
        required_sections = ["## Summary", "## Testing", "## Breaking Changes"]
        return all(section in self.description for section in required_sections)

    def run_all_checks(self) -> List[Dict]:
        """Run all checklist validations and return results."""
        checks = [
            ("Tests added for new code", self.check_tests_added),
            ("No secrets in diff", self.check_no_secrets),
            ("PR description complete", self.check_pr_description),
        ]
        results = []
        for name, check_fn in checks:
            passed = check_fn()
            results.append({
                "check": name,
                "passed": passed,
                "status": "PASS" if passed else "FAIL",
            })
        return results

# Example usage
diff = subprocess.run(
    ["git", "diff", "main...HEAD"],
    capture_output=True, text=True
).stdout

validator = PRChecklistValidator(diff, pr_description)
results = validator.run_all_checks()
for r in results:
    print(f"{r['status']}: {r['check']}")
```

### Review metrics dashboard

Track review cycle time, comment quality, and defect escape rate:

```python
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List
from collections import defaultdict

@dataclass
class ReviewMetric:
    pr_number: int
    author: str
    reviewer: str
    created_at: datetime
    merged_at: datetime
    comments_count: int
    blockers_count: int
    post_merge_defects: int

def calculate_review_metrics(metrics: List[ReviewMetric]) -> Dict:
    """Calculate aggregate review metrics for the team."""
    if not metrics:
        return {}

    cycle_times = [(m.merged_at - m.created_at).total_seconds() / 3600 for m in metrics]
    comment_counts = [m.comments_count for m in metrics]
    defect_rate = sum(1 for m in metrics if m.post_merge_defects > 0) / len(metrics)

    by_reviewer = defaultdict(list)
    for m in metrics:
        by_reviewer[m.reviewer].append(m)

    reviewer_stats = {}
    for reviewer, reviews in by_reviewer.items():
        reviewer_stats[reviewer] = {
            "total_reviews": len(reviews),
            "avg_comments": sum(r.comments_count for r in reviews) / len(reviews),
            "avg_blockers": sum(r.blockers_count for r in reviews) / len(reviews),
            "defects_missed": sum(r.post_merge_defects for r in reviews),
        }

    return {
        "avg_cycle_time_hours": sum(cycle_times) / len(cycle_times),
        "avg_comments_per_pr": sum(comment_counts) / len(comment_counts),
        "defect_escape_rate": defect_rate,
        "by_reviewer": reviewer_stats,
    }

# Example usage
metrics = [
    ReviewMetric(101, "alice", "bob", datetime.now() - timedelta(hours=5), datetime.now(), 3, 1, 0),
    ReviewMetric(102, "charlie", "bob", datetime.now() - timedelta(hours=2), datetime.now(), 5, 2, 1),
    ReviewMetric(103, "alice", "dave", datetime.now() - timedelta(hours=8), datetime.now(), 1, 0, 0),
]

results = calculate_review_metrics(metrics)
print(f"Average cycle time: {results['avg_cycle_time_hours']:.1f}h")
print(f"Defect escape rate: {results['defect_escape_rate']:.0%}")
```

## Additional Best Practices


- For a deeper guide, see [Chaos Engineering — Principles, Tools, and Safe Experiments](/guides/chaos-engineering-guide/).

1. **Use review slots to prevent review fatigue.** Assign a maximum of 2-3 reviews per engineer per day. Beyond that, review quality drops considerably:

```yaml
# GitHub Actions - check reviewer load before assignment
- name: Check reviewer load
  uses: actions/github-script@v7
  with:
    script: |
      const reviewer = "bob";
      const prs = await github.rest.pulls.list({
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: "open",
      });
      const assigned = prs.data.filter(pr =>
        pr.requested_reviewers.some(r => r.login === reviewer)
      );
      if (assigned.length >= 3) {
        core.warning(`${reviewer} already has ${assigned.length} open reviews. Consider assigning someone else.`);
      }
```

2. **Label reviews by type to track patterns.** Use labels like `review:security`, `review:performance`, `review:refactor` to categorize what kinds of issues are most common:

```bash
#!/bin/bash
# Aggregate review labels from last 30 days
gh pr list \
  --state all \
  --search "is:pr closed:>=2026-06-01 label:review:" \
  --json labels,number \
  --jq '[.[] | .labels[] | select(.name | startswith("review:")) | .name] | group_by(.) | map({type: .[0], count: length}) | sort_by(.count) | reverse'
```

## Additional Common Mistakes

1. **Approving with "looks good to me" without reading the code.** This defeats the purpose of review. Require at least one substantive comment or explicit confirmation that each checklist section was reviewed:

```markdown
## Reviewer Confirmation

- [ ] I read every changed line
- [ ] I ran the tests locally
- [ ] I verified the PR description matches the changes
- [ ] I checked for breaking changes beyond the author's claims
```

2. **Not reviewing tests with the same rigor as production code.** Test code that is fragile, non-deterministic, or doesn't actually assert the right things gives false confidence. Apply the same checklist to test files:

```python
# Anti-pattern: test that always passes
def test_user_creation():
    user = create_user(email="test@example.com")
    assert user is not None  # Does not verify email, id, or status

# Better: test that verifies behavior
def test_user_creation_sets_correct_fields():
    user = create_user(email="test@example.com")
    assert user.email == "test@example.com"
    assert user.id is not None
    assert user.status == "active"
    assert user.created_at is not None
```

## Additional Frequently Asked Questions

### How do we handle reviews for urgent hotfixes?

Create a shortened checklist that covers only the three critical areas: security, correctness, and rollback plan. Document what was skipped and schedule a follow-up review within 48 hours to cover the remaining items. Never skip the security and correctness checks, even under time pressure. The follow-up review catches issues while context is still fresh.

### Should we use AI-powered code review tools alongside the checklist?

AI tools (CodeQL, Semgrep, Codacy) are useful for catching known patterns like security vulnerabilities and code smells. They handle the automated portion of the checklist, freeing human reviewers to focus on design, business logic, and edge cases. However, AI tools cannot replace human judgment on architecture decisions, API design, or whether the code actually solves the user's problem. Use them as a first pass, not a final approval.
