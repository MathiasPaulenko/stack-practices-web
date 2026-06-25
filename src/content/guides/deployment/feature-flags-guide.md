---
contentType: guides
slug: feature-flags-guide
title: "Feature Flags — Progressive Release and Safe Experimentation"
description: "A practical guide to feature flags: implementation patterns, progressive rollouts, kill switches, A/B testing integration, and managing feature flag lifecycle at scale."
metaDescription: "Learn feature flags: implementation patterns, progressive rollouts, kill switches, A/B testing, and lifecycle management at scale."
difficulty: intermediate
topics:
  - devops
  - frontend
  - performance
tags:
  - feature-flags
  - progressive-release
  - kill-switch
  - experimentation
  - toggles
  - rollout
  - guide
relatedResources:
  - /guides/deployment/canary-deployment-guide
  - /guides/deployment/a-b-testing-guide
  - /guides/devops/sre-practices-guide
  - /guides/observability/observability-guide
  - /guides/frontend/frontend-performance-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn feature flags: implementation patterns, progressive rollouts, kill switches, A/B testing, and lifecycle management at scale."
  keywords:
    - feature-flags
    - progressive-release
    - kill-switch
    - experimentation
    - toggles
    - rollout
    - guide
---

## Overview

Feature flags (also called feature toggles) decouple deployment from release. They allow you to deploy code to production while keeping features hidden, then gradually enable them for specific users, regions, or percentages. They also serve as kill switches to instantly disable problematic features without redeploying.

This guide covers flag types, implementation patterns, rollout strategies, and operational best practices.

## When to Use

- You want to deploy incomplete features without exposing them to users
- You need to roll out features gradually to monitor impact
- You want to A/B test features with real users
- You need emergency kill switches for critical features
- You manage long-lived branches and want to merge code earlier

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Feature Flag** | A conditional check that enables or disables a code path |
| **Kill Switch** | A flag that instantly disables a feature in production |
| **Progressive Rollout** | Gradually increasing the percentage of users who see a feature |
| **Targeted Flag** | A flag enabled for specific users, groups, or regions |
| **Flag Lifetime** | The period from creation to permanent removal from code |
| **Technical Debt** | Accumulated old flags that clutter code and configuration |

## Feature Flag Types

| Type | Use Case | Lifetime |
|------|----------|----------|
| **Release flag** | Hide incomplete features during development | Short (days to weeks) |
| **Experiment flag** | A/B testing and data-driven decisions | Medium (weeks to months) |
| **Operational flag** | Circuit breakers, rate limits, debug modes | Long (months to permanent) |
| **Permission flag** | Feature access control by user tier | Permanent |
| **Kill switch** | Emergency disable for risky features | Short (removed after stabilization) |

## Step-by-Step Feature Flag Implementation

### 1. Choose a Feature Flag System

Build vs buy decision:

| Option | Best For | Examples |
|--------|----------|----------|
| **Open-source** | Self-hosted, full control | Unleash, Flagsmith, Flipt |
| **SaaS** | Quick setup, enterprise features | LaunchDarkly, Split, Optimizely |
| **Custom build** | Simple use cases, tight integration | In-app config + database |
| **Config files** | Static flags, no runtime changes | YAML/JSON configs |

```python
# Example: Simple custom feature flag system
from dataclasses import dataclass
from typing import Optional
import hashlib

@dataclass
class FeatureFlag:
    name: str
    enabled: bool
    rollout_percentage: float = 100.0
    target_users: Optional[list[str]] = None

class FeatureFlagManager:
    def __init__(self):
        self.flags = {}
    
    def register(self, flag: FeatureFlag):
        self.flags[flag.name] = flag
    
    def is_enabled(self, flag_name: str, user_id: str = None) -> bool:
        flag = self.flags.get(flag_name)
        if not flag:
            return False
        
        if not flag.enabled:
            return False
        
        # Check targeted users
        if flag.target_users and user_id:
            return user_id in flag.target_users
        
        # Percentage-based rollout
        if flag.rollout_percentage < 100 and user_id:
            hash_value = int(hashlib.md5(f"{flag.name}:{user_id}".encode()).hexdigest(), 16)
            user_bucket = hash_value % 100
            return user_bucket < flag.rollout_percentage
        
        return True

# Usage
ffm = FeatureFlagManager()
ffm.register(FeatureFlag("new-dashboard", enabled=True, rollout_percentage=10))

if ffm.is_enabled("new-dashboard", user_id="user-123"):
    show_new_dashboard()
else:
    show_legacy_dashboard()
```

### 2. Implement Progressive Rollout

Gradually increase exposure while monitoring:

```python
# Example: Progressive rollout stages
ROLLOUT_STAGES = [
    {"name": "dev-team", "percentage": 0, "target_users": ["dev1", "dev2", "qa1"]},
    {"name": "1-percent", "percentage": 1, "target_users": None},
    {"name": "10-percent", "percentage": 10, "target_users": None},
    {"name": "50-percent", "percentage": 50, "target_users": None},
    {"name": "full-release", "percentage": 100, "target_users": None},
]

def advance_rollout(flag_name: str, current_stage: int):
    if current_stage < len(ROLLOUT_STAGES) - 1:
        next_stage = ROLLOUT_STAGES[current_stage + 1]
        update_flag(flag_name, 
            rollout_percentage=next_stage["percentage"],
            target_users=next_stage["target_users"]
        )
        print(f"Advanced {flag_name} to stage: {next_stage['name']}")
    else:
        print(f"{flag_name} is already at 100%")
```

**Rollout progression:**
1. **Internal only:** Enable for development team (0% + target users)
2. **Beta users:** Enable for friendly early adopters (0% + beta list)
3. **1% rollout:** Expose to 1% of traffic
4. **10% rollout:** Monitor metrics at small scale
5. **50% rollout:** Validate at significant volume
6. **100% rollout:** Full release
7. **Remove flag:** Clean up conditional code

### 3. Add Kill Switches

Instantly disable features without deploying:

```python
# Example: Kill switch pattern
def process_payment(order):
    # Kill switch for payment processing
    if not feature_flags.is_enabled("payment-processing-v2"):
        return process_payment_v1(order)
    
    try:
        result = process_payment_v2(order)
        return result
    except Exception as e:
        # Auto-fallback if new version fails
        if feature_flags.is_enabled("payment-auto-fallback"):
            return process_payment_v1(order)
        raise
```

**Kill switch best practices:**
- Every new feature gets a kill switch by default
- Document which features have kill switches in your runbook
- Practice kill switch drills quarterly
- Set up alerts when a kill switch is activated
- Ensure kill switches have minimal latency (cache flag values)

### 4. Monitor Flag Performance

Track metrics for flagged features:

| Metric | Why It Matters |
|--------|----------------|
| **Flag evaluation latency** | Slow flag checks add request overhead |
| **Error rate by flag state** | Detect if enabled features cause errors |
| **User engagement** | Compare feature usage between on/off groups |
| **Conversion impact** | Measure business effect of the feature |
| **Flag staleness** | Identify flags that have been on for too long |

```yaml
# Example: Flag monitoring dashboard
panels:
  - title: "Feature Flag Evaluation Rate"
    query: 'rate(feature_flag_evaluations_total[5m])'
  - title: "Active Kill Switches"
    query: 'feature_flag_enabled{name=~".*-kill-switch"}'
  - title: "Flag Staleness"
    query: 'time() - feature_flag_last_modified > 7776000'  # 90 days
```

### 5. Manage Flag Lifecycle

Flags should not live forever:

```bash
# Example: Flag cleanup workflow
# 1. Identify stale flags (enabled for >30 days without changes)
# 2. Verify feature is stable and fully adopted
# 3. Create ticket to remove flag from code
# 4. In code: remove conditional, keep only true branch
# 5. Remove flag from configuration
# 6. Deploy cleanup
# 7. Verify no regressions
```

**Lifecycle rules:**
- Set expiration dates on release and experiment flags (30-60 days)
- Review all flags monthly in engineering standup
- Archive removed flags in a changelog for audit purposes
- Never remove a flag before confirming the feature is stable

## Best Practices

- **Keep flags simple.** One flag per feature, not nested conditionals.
- **Default to safe.** If the flag system is down, default to the proven behavior.
- **Evaluate flags once per request.** Cache the result to avoid repeated lookups.
- **Test both paths.** Unit tests must cover flag enabled and disabled states.
- **Document flag purpose.** Every flag needs an owner, description, and expiration date.
- **Avoid flag interdependencies.** Combining flags creates combinatorial complexity.

## Common Mistakes

- **Leaving flags in code indefinitely.** Stale flags create technical debt and dead code.
- **Using flags for permanent access control.** Use proper RBAC for long-lived permissions.
- **Evaluating flags in hot loops.** Flag checks in tight loops hurt performance.
- **Inconsistent flag state across services.** Ensure flags are synchronized in distributed systems.
- **Forgetting to test the disabled path.** The default path is what most users see.

## Variants

- **Dynamic configuration:** Broader than flags — includes thresholds, limits, and feature parameters
- **Contextual flags:** Flags that vary by time of day, geography, or device type
- **Multi-variate flags:** Flags with multiple states (A/B/C/D testing)
- **Client-side flags:** Evaluated in browser/mobile for UI variations

## FAQ

**Q: What is the difference between a feature flag and a configuration toggle?**
Feature flags are short-lived and tied to code paths. Configuration toggles are long-lived operational settings.

**Q: How do I handle feature flags in a distributed system?**
Use a centralized flag service with caching. Evaluate flags at request start and propagate through context.

**Q: Can feature flags slow down my application?**
Yes, if evaluated frequently. Use in-memory caching, batch evaluations, and avoid flag checks in tight loops.

**Q: When should I remove a feature flag?**
As soon as the feature is stable and fully rolled out. Target removal within 30 days of full release.

## Conclusion

Feature flags are essential for modern continuous delivery. They let you deploy confidently, release gradually, and react instantly to problems. Treat flags as temporary scaffolding, not permanent architecture, and clean them up aggressively to keep your codebase healthy.

## Related Resources

- [Canary Deployment](/guides/deployment/canary-deployment-guide)
- [A/B Testing](/guides/deployment/a-b-testing-guide)
- [SRE Practices](/guides/devops/sre-practices-guide)
- [Observability](/guides/observability/observability-guide)
- [Frontend Performance](/guides/frontend/frontend-performance-guide)
