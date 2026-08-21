---
contentType: recipes
slug: feature-flags
title: "Feature Flags: Rollout, Targeting, and Safe Rollback"
description: "Implement feature toggles to roll out, test, and revert functionality safely without redeploying code."
metaDescription: "Implement feature flags in Python, JavaScript, and Java. Covers boolean toggles, percentage rollouts, user targeting, and safe rollbacks."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - feature-flags
  - toggles
  - ci-cd
  - deployment
  - ab-testing
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /recipes/parse-config-files
  - /recipes/retry-logic-exponential-backoff
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Implement feature flags in Python, JavaScript, and Java. Covers boolean toggles, percentage rollouts, user targeting, and safe rollbacks."
  keywords:
    - feature-flags
    - toggles
    - rollout
    - ab-testing
    - devops
    - python
    - javascript
    - java
---

## Overview

Feature flags decouple deployment from release. You can merge unfinished code to `main`,
keep it hidden, then enable it for a subset of users, measure the impact, and turn it off
instantly without a new deployment. This recipe shows how to build a lightweight flag
service in Python, JavaScript, and Java with boolean, percentage, user, and group
rollouts.

## When to Use

- Rolling out a high-risk feature gradually and monitoring for errors.
- Running A/B tests to compare two implementations.
- Deploying unfinished code to `main` without exposing it to users.
- Adding a kill-switch for a feature causing production issues.

## When NOT to Use

- To enforce security boundaries or authorization rules.
- When a simple config setting would do the job and never changes per user.
- For long-lived branching logic that should just be a normal code path.

## Solution

### Python

```python
import hashlib
from typing import Any

class FeatureFlags:
    def __init__(self, config: dict[str, Any]):
        self.config = config

    def is_enabled(self, flag: str, user_id: str | None = None) -> bool:
        rule = self.config.get(flag, False)

        if isinstance(rule, bool):
            return rule

        if isinstance(rule, dict):
            if "percentage" in rule and user_id:
                return self._hash_bucket(user_id, flag) < rule["percentage"]
            if "users" in rule and user_id:
                return user_id in rule["users"]
            if "groups" in rule:
                return self._check_groups(rule["groups"])

        return False

    def _hash_bucket(self, user_id: str, flag: str) -> int:
        digest = hashlib.md5(f"{flag}:{user_id}".encode()).hexdigest()
        return int(digest, 16) % 100

    def _check_groups(self, groups: list[str]) -> bool:
        # Hook for group membership lookup
        return False

flags = FeatureFlags({
    "new_dashboard": True,
    "beta_search": {"percentage": 10},
    "vip_feature": {"users": ["user_123"]},
    "admin_tools": {"groups": ["admins"]},
})

if flags.is_enabled("new_dashboard"):
    render_new_dashboard()

if flags.is_enabled("beta_search", user_id="user_456"):
    show_beta_search()
```

### JavaScript

```javascript
import { createHash } from "crypto";

class FeatureFlags {
  constructor(config) {
    this.config = config;
  }

  isEnabled(flag, userId = null) {
    const rule = this.config[flag] ?? false;

    if (typeof rule === "boolean") return rule;
    if (typeof rule !== "object") return false;

    if (rule.percentage != null && userId) {
      return this.#hashBucket(userId, flag) < rule.percentage;
    }
    if (rule.users && userId) {
      return rule.users.includes(userId);
    }
    if (rule.groups) {
      return this.#checkGroups(rule.groups);
    }
    return false;
  }

  #hashBucket(userId, flag) {
    const hash = createHash("md5").update(`${flag}:${userId}`).digest("hex");
    return parseInt(hash.slice(0, 8), 16) % 100;
  }

  #checkGroups(groups) {
    return false;
  }
}

const flags = new FeatureFlags({
  newDashboard: true,
  betaSearch: { percentage: 10 },
  vipFeature: { users: ["user_123"] },
  adminTools: { groups: ["admins"] },
});

if (flags.isEnabled("newDashboard")) {
  renderNewDashboard();
}

if (flags.isEnabled("betaSearch", "user_456")) {
  showBetaSearch();
}
```

### Java

```java
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

public class FeatureFlags {
  private final Map<String, Object> config;

  public FeatureFlags(Map<String, Object> config) {
    this.config = config;
  }

  public boolean isEnabled(String flag, String userId) {
    Object rule = config.getOrDefault(flag, false);

    if (rule instanceof Boolean b) return b;
    if (!(rule instanceof Map<?, ?> map)) return false;

    @SuppressWarnings("unchecked")
    Map<String, Object> ruleMap = (Map<String, Object>) map;

    if (ruleMap.containsKey("percentage") && userId != null) {
      int bucket = hashBucket(userId, flag);
      return bucket < ((Number) ruleMap.get("percentage")).intValue();
    }
    if (ruleMap.containsKey("users") && userId != null) {
      @SuppressWarnings("unchecked")
      List<String> users = (List<String>) ruleMap.get("users");
      return users.contains(userId);
    }
    if (ruleMap.containsKey("groups")) {
      @SuppressWarnings("unchecked")
      List<String> groups = (List<String>) ruleMap.get("groups");
      return checkGroups(groups);
    }
    return false;
  }

  private int hashBucket(String userId, String flag) {
    try {
      MessageDigest md = MessageDigest.getInstance("MD5");
      byte[] digest = md.digest((flag + ":" + userId).getBytes());
      return Math.abs(Arrays.hashCode(digest)) % 100;
    } catch (NoSuchAlgorithmException e) {
      return 0;
    }
  }

  private boolean checkGroups(List<String> groups) {
    return false;
  }

  public static void main(String[] args) {
    Map<String, Object> config = Map.of(
      "newDashboard", true,
      "betaSearch", Map.of("percentage", 10),
      "vipFeature", Map.of("users", List.of("user_123")),
      "adminTools", Map.of("groups", List.of("admins"))
    );

    FeatureFlags flags = new FeatureFlags(config);
    System.out.println(flags.isEnabled("newDashboard", null)); // true
    System.out.println(flags.isEnabled("betaSearch", "user_456")); // ~10%
  }
}
```

### Managed service with LaunchDarkly

```python
from ldclient import LDClient
from ldclient.config import Config

ldclient = LDClient(Config(sdk_key="${LAUNCHDARKLY_SDK_KEY}"))

def is_enabled(flag: str, user: dict) -> bool:
    return ldclient.variation(flag, user, default=False)

user = {"key": "user_123", "email": "user@example.com", "country": "US"}
if is_enabled("new_checkout", user):
    render_new_checkout()
```

## Explanation

- **Boolean flags** are simple on/off switches, ideal for kill-switches and dark
  launches.
- **Percentage rollouts** put users in buckets using a deterministic hash of
  `flag_name + user_id`. The same user always sees the same bucket.
- **User targeting** whitelists specific users for early access.
- **Group targeting** checks membership in roles or segments.
- **Deterministic hashing** is important because random assignment would make a user
  flip between variants on every request, breaking the experience and the analytics.

## Variants

|Strategy|Rule|Best for|
|--------|----|--------|
|Boolean|`true` / `false`|Kill-switches, emergency rollbacks|
|Percentage|`{"percentage": 10}`|Gradual rollout, canary releases|
|User target|`{"users": ["id1"]}`|Beta programs, internal dogfooding|
|Group target|`{"groups": ["premium"]}`|Feature tiers, role-based access|
|A/B test|`{"percentage": 50, "variant": "B"}`|Comparing two implementations|

## Best Practices

- Keep flags short-lived. Remove them and the dead code paths once a feature is fully
  rolled out.
- Use deterministic bucketing so the same user always gets the same experience.
- Log flag evaluations to correlate variants with behavior and errors.
- Default to off so a missing flag service doesn't accidentally turn anything on.
- Audit flag changes like production deploys: review them and track them in version
  control.

## Common Mistakes

- Leaving flags in the codebase permanently, creating a maze of dead code paths.
- Using random instead of deterministic bucketing, which gives users an inconsistent
  experience.
- Not handling a missing or unreachable flag service, causing cascading failures.
- Over-targeting individual users instead of groups, which doesn’t scale.
- Releasing a feature behind a flag without monitoring or alerting.

## FAQ

### When should I remove a feature flag?

Remove it once the feature is stable for 100% of users and has run in production
without issues for 1-2 release cycles. Flags that live longer than that become
technical debt.

### How do feature flags differ from configuration settings?

Configuration settings are usually static and global, like timeout values. Feature
flags are per-user, live, and designed for rapid toggling without redeployment.

### Can I use feature flags for authorization?

No. Feature flags control visibility and rollout. Authorization controls access
rights. A user bypassing a flag check shouldn’t gain access to sensitive data or
operations.

### How do I roll out gradually?

Use a staged plan and raise the percentage over time while you monitor errors and key
metrics:

```python
rollout_plan = [
    {"percentage": 1,  "duration_hours": 24},
    {"percentage": 5,  "duration_hours": 48},
    {"percentage": 25, "duration_hours": 72},
    {"percentage": 50, "duration_hours": 96},
    {"percentage": 100, "duration_hours": 0},
]

def advance_rollout(flag: str, current_pct: int) -> int:
    for stage in rollout_plan:
        if stage["percentage"] > current_pct:
            update_flag(flag, {"percentage": stage["percentage"]})
            return stage["percentage"]
    return 100
```

### How do I run an A/B test?

Assign variants deterministically and track events per variant:

```javascript
function getVariant(flag, userId) {
  const bucket = hashBucket(userId, flag);
  return bucket < 50 ? "A" : "B";
}

const variant = getVariant("checkout_redesign", userId);
if (variant === "B") renderNewCheckout();

analytics.track({
  experiment: "checkout_redesign",
  userId,
  variant,
  event: "checkout_view",
});
```
