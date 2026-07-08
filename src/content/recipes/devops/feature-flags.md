---
contentType: recipes
slug: feature-flags
title: "Feature Flags"
description: "How to implement feature toggles to safely roll out, test, and rollback functionality without deploying code."
metaDescription: "Learn to implement feature flags in Python, JavaScript, and Java. Covers toggle services, A/B testing, rollout strategies, and safe rollbacks."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - feature-flags
  - ci-cd
  - automation
  - deployment
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /recipes/parse-config-files
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement feature flags in Python, JavaScript, and Java. Covers toggle services, A/B testing, rollout strategies, and safe rollbacks."
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

Feature flags (or feature toggles) decouple deployment from release. They let you merge incomplete features to `main`, enable them for a subset of users, measure impact, and instantly roll back without a new deployment. This approach handles building a lightweight flag service, rollout strategies (boolean, percentage, user targeting), and safe cleanup patterns in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Rolling out a high-risk feature gradually to monitor for errors. See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for monitoring application health.
- Running A/B tests to compare two implementations of a feature. See [Load Testing](/recipes/testing/load-testing) for measuring performance under load.
- Deploying incomplete code to `main` without exposing it to users. See [Git Workflow](/recipes/devops/git-workflow) for branch management.
- Needing an instant kill-switch for a feature causing production issues. See [Retry Logic](/recipes/architecture/retry-backoff) for handling transient failures gracefully.

## Solution

### Python

```python
import hashlib
import random
from typing import Callable

class FeatureFlags:
    def __init__(self, config: dict[str, any]):
        self.config = config

    def is_enabled(self, flag: str, user_id: str = None) -> bool:
        rule = self.config.get(flag, False)

        if isinstance(rule, bool):
            return rule

        if isinstance(rule, dict):
            # Percentage rollout
            if "percentage" in rule and user_id:
                bucket = self._hash_bucket(user_id, flag)
                return bucket < rule["percentage"]
            # Targeted users
            if "users" in rule and user_id:
                return user_id in rule["users"]
            # Targeted groups
            if "groups" in rule:
                return self._check_groups(rule["groups"])

        return False

    def _hash_bucket(self, user_id: str, flag: str) -> int:
        digest = hashlib.md5(f"{flag}:{user_id}".encode()).hexdigest()
        return int(digest, 16) % 100

    def _check_groups(self, groups: list[str]) -> bool:
        # Hook for group membership lookup
        return False

# Usage
flags = FeatureFlags({
    "new_dashboard": True,
    "beta_search": {"percentage": 10},          # 10% rollout
    "vip_feature": {"users": ["user_123"]},     # targeted
    "admin_tools": {"groups": ["admins"]},       # group-based
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
    return false; // hook for group membership
  }
}

// Usage
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
    return false; // hook for group membership lookup
  }

  // Usage
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

## Explanation

- **Boolean flags** are on/off switches for the entire application. Use them for kill-switches and dark launches.
- **Percentage rollouts** assign users to buckets via a deterministic hash of `(flag_name + user_id) % 100`. The same user always sees the same bucket, ensuring consistent experiences.
- **User targeting** explicitly whitelists users (beta testers, internal team) for early access.
- **Group targeting** checks membership in roles or segments (admin, premium, geographic region).
- **Deterministic hashing** is critical: random assignment would cause a single user to flip between variants on every request, breaking UX and analytics.

## Variants

| Strategy | Rule Type | Best For |
|----------|-----------|----------|
| Boolean | `true` / `false` | Kill-switches, emergency rollbacks |
| Percentage | `{"percentage": 10}` | Gradual rollout, canary releases |
| User Target | `{"users": ["id1"]}` | Beta programs, internal dogfooding |
| Group Target | `{"groups": ["premium"]}` | Feature tiers, role-based access |
| A/B Test | `{"percentage": 50, "variant": "B"}` | Comparing two implementations |

## What works

1. **Keep flags short-lived** — permanent flags become technical debt. Remove them and the dead code paths once a feature is fully rolled out.
2. **Use deterministic bucketing** — hash `(flag + user_id)` so the same user always gets the same experience, avoiding flip-flopping.
3. **Log flag evaluations** — record which users saw which variant for debugging and analytics correlation.
4. **Default to off** — if the flag service is unreachable, the feature should be disabled to prevent unexpected exposure.
5. **Audit flag changes** — treat flag configuration changes like production deploys; require code review and track in version control.

## Common Mistakes

1. Leaving flags in the codebase permanently, creating a maze of dead code paths.
2. Using random bucketing instead of deterministic hashing, causing inconsistent user experiences.
3. Not handling the case where the flag config service is down, causing cascading failures.
4. Over-targeting flags to individual users instead of groups, making management unscalable.
5. Releasing a feature under a flag without monitoring or alerting, missing production issues.

## Frequently Asked Questions

### When should I remove a feature flag?

Remove the flag and its conditional branches once the feature is stable for 100% of users and has been running in production without issues for 1-2 release cycles. Flags that live longer than a month after full rollout become technical debt.

### How do feature flags differ from configuration settings?

Configuration settings are typically static and apply globally (timeout values, feature limits). Feature flags are live, user-scoped, and designed for rapid toggling without redeployment. Flags evaluate per-request; config is loaded at startup.

### Can I use feature flags for authorization?

No. Feature flags control feature visibility and rollout; authorization controls access rights. Do not use flags to enforce security boundaries. A user bypassing a flag check should not gain unauthorized access to sensitive data or operations.

### Managed Service Integration (LaunchDarkly)

```python
from ldclient import LDClient
from ldclient.config import Config

ldclient = LDClient(Config(sdk_key="sdk-xxx"))

def is_enabled(flag: str, user: dict) -> bool:
    return ldclient.variation(flag, user, default=False)

# Usage
user = {"key": "user_123", "email": "user@example.com", "country": "US"}
if is_enabled("new_checkout", user):
    render_new_checkout()
```

### Staged Rollout Strategy

```python
# Progressive rollout schedule
rollout_plan = [
    {"percentage": 1,  "duration_hours": 24,  "monitor": True},
    {"percentage": 5,  "duration_hours": 48,  "monitor": True},
    {"percentage": 25, "duration_hours": 72,  "monitor": True},
    {"percentage": 50, "duration_hours": 96,  "monitor": True},
    {"percentage": 100,"duration_hours": 0,   "monitor": True},
]

def advance_rollout(flag: str, current_pct: int) -> int:
    for stage in rollout_plan:
        if stage["percentage"] > current_pct:
            update_flag(flag, {"percentage": stage["percentage"]})
            return stage["percentage"]
    return 100
```

### A/B Testing with Feature Flags

```javascript
// Assign users to variant A or B deterministically
function getVariant(flag, userId) {
  const bucket = hashBucket(userId, flag);
  if (bucket < 50) return "A";  // control
  return "B";                    // treatment
}

// Track conversion events per variant
function trackExperiment(flag, userId, variant, event) {
  analytics.track({
    experiment: flag,
    userId,
    variant,
    event,
    timestamp: Date.now(),
  });
}

// Usage
const variant = getVariant("checkout_redesign", userId);
if (variant === "B") {
  renderNewCheckout();
} else {
  renderOldCheckout();
}
trackExperiment("checkout_redesign", userId, variant, "checkout_view");
```

## Additional Best Practices

1. **Name flags with a convention.** Use `team_feature_state` format for discoverability:

```yaml
# Good: clear team, feature, and state
checkout_new_payment_flow_beta
auth_oauth_migration_canary
analytics_v2_enabled

# Bad: ambiguous, no team prefix
new_feature
flag_1
temp_toggle
```

2. **Add expiry dates to flags.** Prevent zombie flags by setting a cleanup date:

```python
flag_config = {
    "new_dashboard": {
        "enabled": True,
        "expires": "2026-09-01",  # remove after this date
        "owner": "frontend-team",
    }
}
```

3. **Use flag metadata for observability.** Tag flags with team, ticket, and risk level:

```yaml
new_checkout:
  enabled: true
  percentage: 25
  owner: payments-team
  ticket: PROJ-1234
  risk: high
  rollback_plan: "Set percentage to 0"
```

## Additional Common Mistakes

1. **Nesting flags inside flags.** Complex conditional logic becomes untestable:

```python
# Bad: flag spaghetti
if flags.is_enabled("feature_a"):
    if flags.is_enabled("feature_b"):
        if flags.is_enabled("feature_c"):
            do_thing()

# Good: one flag per concern
if flags.is_enabled("feature_abc"):
    do_thing()
```

2. **Not testing the off state.** Always verify the feature-off path works:

```python
# Test both states in CI
@pytest.mark.parametrize("flag_state", [True, False])
def test_checkout(flag_state, monkeypatch):
    monkeypatch.setattr(flags, "is_enabled", lambda f, u=None: flag_state)
    response = client.get("/checkout")
    assert response.status_code == 200
```

3. **Toggling flags during active requests.** Use snapshot evaluation to avoid mid-request changes:

```python
# Evaluate once per request, not per check
flag_snapshot = {
    flag: flags.is_enabled(flag, user_id)
    for flag in required_flags
}
# Use flag_snapshot throughout the request lifecycle
```

## Additional FAQ

### How do I manage flags across environments?

Use separate flag configs per environment (dev, staging, prod). In dev, flags can be on by default for testing. In prod, default to off. Managed services like LaunchDarkly or Unleash handle this with environment-scoped projects.

### What is a dark launch?

A dark launch deploys new code to production but keeps it invisible to users via a flag. You can test infrastructure, performance, and integration with real traffic by routing a copy of requests to the new code path while serving users the old response.

### How many flags should I have?

Keep active flags under 20-30 per service. More than that indicates insufficient cleanup. Run a monthly flag audit to identify and remove stale flags.

## Performance Tips

1. **Cache flag evaluations per request.** Avoid repeated lookups for the same flag:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def cached_is_enabled(flag: str, user_id: str) -> bool:
    return flags.is_enabled(flag, user_id)
```

2. **Use local evaluation.** Avoid network calls per flag check by downloading the flag config:

```python
# Download flag config once, evaluate locally
flag_config = fetch_flag_config()  # periodic refresh
local_flags = FeatureFlags(flag_config)

# Evaluate without network calls
if local_flags.is_enabled("new_feature", user_id):
    ...
```

3. **Batch flag evaluations.** Reduce SDK calls by evaluating multiple flags at once:

```python
# LaunchDarkly: evaluate all flags in one call
all_flags = ldclient.all_flags_state(user)
if all_flags.get_flag_value("new_checkout"):
    render_new_checkout()
if all_flags.get_flag_value("new_search"):
    render_new_search()
```
