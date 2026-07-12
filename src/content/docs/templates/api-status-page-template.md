---





contentType: docs
slug: api-status-page-template
templateType: api-status-page
title: "API Status Page Template"
description: "A template for a public API status page that communicates uptime, incidents, and maintenance windows to consumers."
metaDescription: "API status page template with incident communication, maintenance windows, SLA definitions, and what works for transparent uptime reporting."
difficulty: beginner
topics:
  - api
  - devops
tags:
  - api
  - status-page
  - template
  - uptime
  - incident-communication
  - sla
  - transparency
  - devops
relatedResources:
  - /docs/incident-communication-template
  - /docs/api-deprecation-notice-template
  - /guides/rest-api-design-guide
  - /docs/sla-definition-template
  - /recipes/chaos-engineering
  - /recipes/cicd-pipeline-setup
  - /recipes/immutable-infrastructure
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "API status page template with incident communication, maintenance windows, SLA definitions, and what works for transparent uptime reporting."
  keywords:
    - template
    - api
    - status-page
    - uptime
    - incident-communication






---

## Overview

A public status page tells your API consumers what is happening before they open a support ticket. It reduces inbound requests during outages and builds trust through transparency. This template covers the structure, content, and operational practices for running a status page that actually helps.

The template covers:

1. **Page structure** — what sections to include and how to organize them
2. **Incident communication** — templates for active incidents and post-incident updates
3. **Severity definitions** — standardized levels so consumers understand impact
4. **SLA reporting** — how to present uptime and response time metrics
5. **Maintenance windows** — how to schedule and communicate planned downtime

## Page Structure Template

```html
<!-- Status Page Layout -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Product] Status</title>
    <!-- Must be hosted on a separate domain/infrastructure -->
</head>
<body>
    <header>
        <h1>[Product] Status</h1>
        <p>Real-time status of [Product] services and APIs.</p>
        <!-- Subscribe buttons: Email, RSS, Slack, Webhook -->
        <nav>
            <a href="#current">Current Status</a>
            <a href="#history">Incident History</a>
            <a href="#uptime">Uptime Metrics</a>
            <a href="#maintenance">Scheduled Maintenance</a>
        </nav>
    </header>

    <main>
        <!-- Current Status Section -->
        <section id="current">
            <h2>Current Status</h2>
            <!-- Overall status banner -->
            <div class="status-banner operational">
                All systems operational
            </div>
            <!-- Per-service status -->
            <div class="service-list">
                <div class="service">
                    <span class="name">API Gateway</span>
                    <span class="status operational">Operational</span>
                </div>
                <div class="service">
                    <span class="name">Authentication Service</span>
                    <span class="status operational">Operational</span>
                </div>
                <div class="service">
                    <span class="name">Database (Primary)</span>
                    <span class="status operational">Operational</span>
                </div>
                <div class="service">
                    <span class="name">Web Dashboard</span>
                    <span class="status operational">Operational</span>
                </div>
            </div>
        </section>

        <!-- Uptime Metrics Section -->
        <section id="uptime">
            <h2>Uptime (90 days)</h2>
            <div class="uptime-grid">
                <!-- 90 daily bars, colored by status -->
                <div class="uptime-bar operational" title="2026-07-04: 100% uptime"></div>
                <div class="uptime-bar operational" title="2026-07-03: 100% uptime"></div>
                <div class="uptime-bar degraded" title="2026-07-02: 99.2% uptime"></div>
                <!-- ... 87 more bars ... -->
            </div>
            <table class="uptime-table">
                <tr><th>Service</th><th>90-day uptime</th><th>SLA target</th></tr>
                <tr><td>API Gateway</td><td>99.98%</td><td>99.9%</td></tr>
                <tr><td>Authentication</td><td>99.99%</td><td>99.95%</td></tr>
                <tr><td>Database</td><td>99.97%</td><td>99.9%</td></tr>
            </table>
        </section>

        <!-- Incident History Section -->
        <section id="history">
            <h2>Incident History</h2>
            <article class="incident resolved">
                <h3>Database latency spike</h3>
                <p class="date">July 2, 2026 — Resolved</p>
                <p class="severity">Severity: Medium</p>
                <div class="updates">
                    <div class="update">
                        <time>14:32 UTC</time>
                        <p>Investigating elevated database latency on primary cluster.</p>
                    </div>
                    <div class="update">
                        <time>14:45 UTC</time>
                        <p>Identified cause: long-running analytical query blocking writes.</p>
                    </div>
                    <div class="update">
                        <time>15:10 UTC</time>
                        <p>Terminated the blocking query. Latency returning to normal.</p>
                    </div>
                    <div class="update">
                        <time>15:30 UTC</time>
                        <p>Resolved. Latency back to baseline. Adding query timeout to prevent recurrence.</p>
                    </div>
                </div>
            </article>
        </section>

        <!-- Scheduled Maintenance Section -->
        <section id="maintenance">
            <h2>Scheduled Maintenance</h2>
            <article class="maintenance upcoming">
                <h3>Database migration to v16</h3>
                <p class="date">July 15, 2026, 02:00–04:00 UTC</p>
                <p>Impact: Brief API errors during failover (expected < 2 minutes).</p>
                <p>We will fail over to the replica, upgrade the primary, then fail back.</p>
            </article>
        </section>
    </main>
</body>
</html>
```

## Incident Update Templates

### Active incident — initial post

```markdown
## [Incident Title]

**Severity:** [Critical / High / Medium / Low]
**Started:** [timestamp UTC]
**Affected services:** [list]

We are investigating [brief description of the issue]. [What users are experiencing].

Next update: [time, typically 15-30 minutes from now].
```

### Active incident — investigation update

```markdown
**Update [N]** — [timestamp UTC]

[What we know so far]. [What we are doing about it]. [Expected resolution time if known, or "no ETA yet"].

Next update: [time].
```

### Active incident — resolution

```markdown
**Resolved** — [timestamp UTC]

[What happened]. [What we did to fix it]. [What we are doing to prevent recurrence].

A full postmortem will be published within [3-5 business days] at [link].
```

## Severity Definitions

| Severity | Meaning | Impact on users | Response time | Update frequency |
|----------|---------|-----------------|---------------|------------------|
| Critical | Major outage | Service unavailable or data loss for all users | Immediate | Every 15 minutes |
| High | Significant degradation | Core feature broken or very slow for many users | < 15 minutes | Every 30 minutes |
| Medium | Partial degradation | Non-critical feature slow or unavailable, workaround exists | < 1 hour | Every 1 hour |
| Low | Minor issue | Cosmetic or edge-case problem, minimal user impact | < 4 hours | At resolution |

## SLA Definitions

```markdown
## Service Level Agreements

### API Gateway
- **Uptime target:** 99.9% per month (~43 minutes downtime allowed)
- **Response time target:** p95 < 200ms, p99 < 500ms
- **Measurement:** Synthetic checks every 60 seconds from 3 regions

### Authentication Service
- **Uptime target:** 99.95% per month (~22 minutes downtime allowed)
- **Response time target:** p95 < 150ms
- **Measurement:** Synthetic login checks every 30 seconds

### Database
- **Uptime target:** 99.9% per month
- **Replication lag target:** < 1 second sustained, < 5 seconds burst
- **Measurement:** Continuous monitoring via pg_stat_replication

### Excluded from SLA
- Planned maintenance windows announced 7+ days in advance
- Force majeure events (cloud provider region outage)
- Issues caused by customer-side configuration errors
```

## What Works

- **Update every 15-30 minutes during active incidents** — Silence makes consumers assume the worst
- **Post scheduled maintenance 7 days in advance** — Gives consumers time to prepare workarounds
- **Use a separate domain** — `status.example.com` must not depend on the API it monitors. See [Circuit Breaker](/patterns/design/circuit-breaker-pattern) for resilience patterns.
- **Offer RSS / email / Slack subscriptions** — Let consumers choose how they receive updates
- **Show historical uptime** — A 30-day or 90-day chart builds confidence
- **Be honest about degraded performance** — Do not mark a service "operational" when latency is 10x normal. See [Performance Optimization](/guides/performance/performance-optimization-guide) for monitoring metrics.
- **Link to [incident postmortems](/docs/templates/incident-postmortem-template)** — Transparency after resolution builds long-term trust
- **Define severity levels publicly** — Consumers need to understand what "High severity" means for their integration
- **Include per-service status, not just overall** — A single "all operational" banner hides partial degradations
- **Timestamp every update in UTC** — Consumers across timezones need a consistent reference

## Common Mistakes

- Using the same infrastructure as the API for the status page — if the API is down, the status page is down too
- Marking incidents resolved too early — wait until metrics confirm recovery for at least 10 minutes
- Deleting or editing resolved incident history — consumers need to reference past incidents
- Vague updates like "we are looking into it" — share what you know and what you do not know
- Not defining severity levels — consumers cannot gauge impact without clear severity definitions
- Hoping nobody notices — consumers monitor your API with their own checks; they will know
- Forgetting to post the postmortem link after resolution — follow-through matters
- Not testing the status page during drills — if you have never used it under pressure, it will fail when you need it

## Variants

### Hosted status pages (Statuspage.io, BetterStack, Instatus)

Hosted services handle the infrastructure, uptime monitoring, and subscriber management. They cost money but eliminate the risk of your status page going down with your API. Use them if you do not want to build and maintain a separate infrastructure.

### Self-hosted (Cachet, Upptime)

Self-hosted options like [Cachet](https://cachethq.io) or [Upptime](https://upptime.js.org) run on GitHub Pages or a simple static host. They are free but require setup and maintenance. Upptime uses GitHub Actions for monitoring and stores history in the repository.

### Internal-only status pages

For internal services, use a simpler page without subscriptions or public incident history. A Slack channel with automated alerts often suffices. See [Alert Management Guide](/guides/observability/alert-management-guide) for alerting strategies.

## Frequently Asked Questions

### Should the status page be public or internal-only?

Public for customer-facing APIs. Internal-only for purely internal services. Public status pages reduce support tickets and demonstrate operational maturity.

### How often should I update during an incident?

Every 15-30 minutes, even if there is no new information. A message like "Still investigating root cause, next update at 15:00 UTC" is better than silence.

### What should I do if an incident exceeds the SLA?

Communicate proactively. Do not wait for customers to complain. See [Incident Communication Template](/docs/templates/incident-postmortem-template) for structured incident updates. Issue a summary explaining what happened, why it breached SLA, and what measures are being taken to prevent recurrence. Some companies offer service credits for SLA breaches.

### Should I show response time metrics on the status page?

Yes, if your API has latency SLAs. Show p95 and p99 response times alongside uptime. Latency degradation affects consumers even when the API is technically "up."

### How do I handle multi-region status?

List each region separately (us-east, eu-west, ap-southeast) with its own status indicator. An incident in one region should not show the entire service as down. Consumers using a specific region need to know if their region is affected.

### What if the status page itself goes down?

Use a secondary status channel (e.g., a dedicated Twitter/X account or a Slack channel) as a fallback. Document the fallback URL on the main status page and in your API documentation. The fallback must be on entirely separate infrastructure.

### Should I post maintenance windows even for zero-downtime deployments?

Yes. Even zero-downtime deployments can cause brief latency spikes or minor errors. Posting a maintenance window with "expected impact: none" sets expectations and gives consumers a window to avoid deploying their own changes simultaneously.
