---
contentType: docs
slug: api-rate-limiting-policy-template
title: "API Rate Limiting Policy Template"
description: "A template for defining API rate limits per consumer tier, including burst allowances, quota periods, and escalation paths."
metaDescription: "Define API rate limits per tier with this template. Covers burst limits, quota windows, headers, and escalation for consumers."
difficulty: intermediate
topics:
  - api
  - architecture
  - performance
tags:
  - api
  - rate-limiting
  - throttling
  - policy
  - template
  - performance
relatedResources:
  - /docs/architecture/api-performance-budget-template
  - /docs/devops/escalation-policy-template
  - /docs/security/api-security-review-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define API rate limits per tier with this template. Covers burst limits, quota windows, headers, and escalation for consumers."
  keywords:
    - rate limiting
    - api throttling
    - quota policy
    - burst limits
    - api tiers
    - rate limit headers
---

## Overview

Unlimited API access is a recipe for abuse, accidental DDoS, and unpredictable costs. Rate limiting protects your infrastructure while giving consumers predictable access. Without a documented policy, consumers discover limits only when their requests start failing with `429 Too Many Requests`. This template defines rate limits per tier, communicates them transparently, and provides an escalation path for consumers who need more.

## When to Use

Use this resource when:
- Launching a public or partner API
- Defining pricing tiers for API access
- Experiencing traffic spikes that degrade service for others
- Negotiating SLAs with enterprise clients who need higher limits

## Solution

```markdown
# API Rate Limiting Policy

## Tiers & Limits

| Tier | Requests / Minute | Requests / Hour | Burst | Cost |
|------|-------------------|-------------------|-------|------|
| Free | 60 | 1,000 | 10 | $0 |
| Starter | 300 | 10,000 | 50 | $49/mo |
| Pro | 1,000 | 100,000 | 200 | $199/mo |
| Enterprise | 10,000 | 1,000,000 | 2,000 | Custom |

## Limit Scope

Limits are applied per **API key** at the following scopes:
- **Global:** All endpoints combined count toward the same limit
- **Endpoint-specific:** `POST /orders` has its own limit separate from `GET /products`
- **IP-based (Free tier only):** Fallback enforcement when API key is absent

## Quota Periods

- **Per-minute limit:** Resets at the top of each minute (UTC)
- **Per-hour limit:** Resets at the top of each hour (UTC)
- **Rolling window:** A 60-second sliding window (more precise but computationally expensive)

## Response Headers

Every API response includes the following headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1719398400
X-RateLimit-Policy: pro;w=3600
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the current window resets |
| `X-RateLimit-Policy` | Tier and window size identifier |

## Exceeded Limit Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your rate limit. Please retry after 2026-06-26T11:00:00Z.",
    "retryAfter": 3600,
    "documentationUrl": "https://docs.example.com/rate-limits"
  }
}
```

HTTP Status: `429 Too Many Requests`
Required Header: `Retry-After: 3600`

## Burst Behavior

Burst limits allow short spikes above the sustained rate:
- **Pro tier:** 200 requests in 1 second, then throttled to 1,000/hour average
- **Algorithm:** Token bucket with refill rate = sustained limit / window size
- **Penalty:** No penalty for burst usage within configured limits

## Increasing Limits

1. **Upgrade tier:** Change your plan in the developer dashboard
2. **Request exception:** Contact api-support@example.com with:
   - Current usage patterns (requests per endpoint, peak hours)
   - Business justification (product launch, integration partner)
   - Expected timeline and volume
3. **Enterprise negotiation:** Dedicated capacity, custom SLA, private endpoints

## Monitoring & Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Approaching Limit | 80% of hourly quota consumed | Email notification to admin |
| Limit Exceeded | 429 responses > 1% of traffic | PagerDuty alert to on-call |
| Abuse Pattern | 10x normal volume from single key | Auto-throttle + manual review |

## Fair Use Policy

- **No automated evasion:** Using multiple API keys to circumvent limits violates terms
- **Cache aggressively:** Responses marked `Cache-Control: public` should be cached
- **Batch operations:** Use bulk endpoints instead of individual calls
- **Webhook preference:** Subscribe to webhooks instead of polling for state changes
```

## Explanation

The policy separates **sustained limits** (average over time) from **burst limits** (short-term spikes). The token bucket algorithm is the industry standard because it allows bursts while enforcing long-term averages. Response headers give consumers real-time feedback so they can back off before hitting limits. The escalation path prevents support tickets from consumers who simply need a higher tier.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public SaaS | Tiered pricing with free tier | Conversion-oriented, limits drive upgrades |
| Internal platform | Per-team quotas with shared pool | Prevents one team from starving others |
| Partner API | Negotiated limits per contract | Limits defined in legal agreements |

## Best Practices

1. **Return headers on every response** — not just when limits are close
2. **Use a standard algorithm** (token bucket or leaky bucket) — custom logic confuses consumers
3. **Document the reset behavior** — consumers need to know when to retry
4. **Provide bulk endpoints** — one `POST /orders/bulk` is better than 100 `POST /orders`
5. **Monitor 429 rates** — high 429 rates indicate poorly configured limits or consumer abuse

## Common Mistakes

1. **Returning 403 instead of 429** — consumers cannot distinguish auth failure from rate limiting
2. **Not documenting the algorithm** — consumers cannot predict when they will be throttled
3. **Inconsistent limits across endpoints** — same key, different rules, consumer confusion
4. **No burst allowance** — legitimate traffic spikes get blocked
5. **Hard limits without escalation** — enterprise clients cannot negotiate higher capacity

## Frequently Asked Questions

### What happens if I exceed both per-minute and per-hour limits?

The most restrictive limit applies. If you exceed the per-minute limit, you receive 429 immediately even if hourly quota remains. If you exceed the hourly limit, all requests are blocked until the hour resets.

### Should rate limits be the same for read and write operations?

No. Write operations are more expensive and should have lower limits. Separate limits for `GET` (higher), `POST/PUT/PATCH` (medium), and `DELETE` (lowest) are standard practice.

### How do I test my integration without hitting limits?

Use a dedicated sandbox environment with higher or unlimited limits. Alternatively, mock the API responses in your test suite and verify that you parse the rate limit headers correctly.
