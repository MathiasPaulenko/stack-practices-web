---
contentType: docs
slug: incident-communication-template
title: "Incident Communication Template"
description: "A template for notifying stakeholders during production outages with pre-drafted messages for each incident severity level and audience type."
metaDescription: "Communicate clearly during outages with this template. Pre-drafted messages for customers, executives, support teams, and internal stakeholders by severity."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - incident-management
  - communication
  - template
  - outage
  - stakeholder-management
  - sre
relatedResources:
  - /docs/devops/incident-timeline-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/downtime-communication-template
  - /docs/devops/on-call-handoff-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Communicate clearly during outages with this template. Pre-drafted messages for customers, executives, support teams, and internal stakeholders by severity."
  keywords:
    - incident communication
    - outage notification template
    - stakeholder communication
    - incident update template
    - customer outage message
---

## Overview

Poor incident communication turns a technical problem into a trust problem. When customers do not know what is happening, they assume the worst. When executives are surprised, they demand explanations instead of offering support. This template provides pre-drafted messages for every audience and severity level, so your team communicates clearly, consistently, and quickly during outages.

## When to Use

Use this template when:
- A production outage impacts customers or internal users
- An incident crosses severity thresholds requiring stakeholder notification
- You need to provide status updates during a prolonged incident
- Post-incident, you need to draft the final communication to affected parties

## Prerequisites

Before sending communications:
- [ ] Confirm the scope of impact (which services, regions, user segments)
- [ ] Verify the severity level with the incident commander
- [ ] Identify the correct communication channels for each audience
- [ ] Review any regulatory or contractual notification requirements

## Solution

```markdown
# Incident Communication: `<Incident Title>`

## Metadata

| Field | Value |
|-------|-------|
| Incident ID | ______ |
| Severity | P1 / P2 / P3 / P4 |
| Start Time (UTC) | ______ |
| Status | Investigating / Identified / Monitoring / Resolved |
| Incident Commander | ______ |
| Communication Lead | ______ |

---

## Message 1: Initial Notification

### For Customers (Status Page / Email)

**Severity: P1 (Critical)**

> We are investigating reports of [service] being unavailable. We will provide an update within 30 minutes or as soon as we have more information.
>
> **Impacted services:** [List services]
> **Started at:** [Time UTC]
> **Next update by:** [Time UTC + 30 min]

**Severity: P2 (High)**

> We are investigating degraded performance on [service]. Some users may experience [specific symptom]. We will provide an update within 60 minutes.
>
> **Impacted services:** [List services]
> **Started at:** [Time UTC]
> **Next update by:** [Time UTC + 60 min]

**Severity: P3/P4 (Medium/Low)**

> We are aware of an issue affecting [service description]. Impact is limited to [scope]. A fix is in progress and we expect resolution within [timeframe].

---

### For Internal Stakeholders (Slack / Email)

**Severity: P1/P2**

> **INCIDENT ALERT** — [Service] — [Severity]
>
> An incident has been declared for [service]. Impact: [brief description]. Incident commander: [name]. Channel: [link].
>
> No action required from your team at this time. Updates will be posted in [channel].

**Severity: P3/P4**

> **Incident Notification** — [Service] — [Severity]
>
> An incident has been opened for [service]. Impact is limited to [scope]. No customer-facing impact expected. Tracking in [channel].

---

### For Executives (Email / Slack DM)

> **Incident Summary** — [Service] — [Severity]
>
> **Impact:** [number] customers / [percentage]% of traffic / [region]
> **Revenue Risk:** [High / Medium / Low / None]
> **Root Cause (preliminary):** [one sentence if known]
> **ETA to Resolution:** [time if known]
> **Actions Taken:** [what has been done so far]
>
> I will send an update within [timeframe].

---

## Message 2: Status Update

### For Customers

> **Update** — [Service] — [Time UTC]
>
> We have [identified the cause / implemented a mitigation / deployed a fix] for the [service] issue. [Brief description of what happened and what was done].
>
> **Status:** Monitoring / In Progress
> **Next update by:** [Time UTC]

---

### For Internal Stakeholders

> **Incident Update** — [INC-xxx] — [Time UTC]
>
> **Status:** [Investigating / Identified / Mitigated / Monitoring]
> **What we know:** [2-3 sentence summary]
> **What we are doing:** [current actions]
> **What we need:** [any help required from other teams]
> **Next update:** [Time UTC]

---

### For Executives

> **Incident Update** — [INC-xxx] — [Time UTC]
>
> **Current Status:** [Investigating / Mitigated / Monitoring]
> **Customer Impact:** [updated numbers if changed]
> **Root Cause:** [updated understanding]
> **ETA to Full Resolution:** [updated estimate]
> **Risk of Recurrence:** [High / Medium / Low]
> **Postmortem Scheduled:** [Date / TBD]

---

## Message 3: Resolution

### For Customers

> **Resolved** — [Service] — [Time UTC]
>
> The issue affecting [service] has been resolved. All systems are operating normally.
>
> **Duration:** [start time] to [end time] ([duration])
> **Impact:** [summary of what users experienced]
> **Root Cause:** [brief, non-technical description]
> **Preventive Actions:** [what we are doing to prevent recurrence]
>
> We apologize for any inconvenience. If you continue to experience issues, please contact [support channel].

---

### For Internal Stakeholders

> **INCIDENT RESOLVED** — [INC-xxx] — [Time UTC]
>
> The incident affecting [service] has been resolved.
>
> **Duration:** [duration]
> **Root Cause:** [technical description]
> **Resolution:** [what fixed it]
> **Postmortem:** [Date / TBD] — [Link when available]
> **Action Items:** [Link to tracking]

---

### For Executives

> **Incident Closed** — [INC-xxx] — [Time UTC]
>
> **Final Status:** Resolved
> **Total Duration:** [duration]
> **Customer Impact:** [final numbers]
> **Revenue Impact:** [if any]
> **Root Cause:** [one paragraph]
> **Preventive Actions:** [list]
> **Postmortem:** [Date] — [Link]
> **Follow-up Required:** [Yes / No — details if yes]

---

## Communication Rules

1. Be honest about what you know. Do not guess at root causes
2. Provide ETAs only if confident. Missed ETAs destroy trust faster than no ETA
3. Update on schedule even if no progress. Silence breeds anxiety
4. Use the same channel for updates. Do not make stakeholders hunt for information
5. Match technical depth to audience. Executives need impact, engineers need details

## Communication Frequency by Severity

| Severity | Initial Notification | Updates | Resolution |
|----------|---------------------|---------|------------|
| P1 | Immediate | Every 15-30 min | Within 15 min of resolution |
| P2 | Within 15 min | Every 30-60 min | Within 30 min of resolution |
| P3 | Within 30 min | Every 2-4 hours | Within 1 hour of resolution |
| P4 | Within 1 hour | Daily or on change | Within 1 hour of resolution |
```

## Explanation

The template separates communications by **audience** (customers need reassurance and timelines, executives need business impact, internal teams need technical coordination) and **timing** (initial, update, resolution). The key principle is that every message answers three questions: what happened, what we are doing about it, and when we will update next. Without those three elements, communication creates more anxiety than it resolves.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Customer-facing SaaS | Status page + email | Automate via status page tool (Statuspage, Instatus) |
| Internal tools only | Slack + email | No external communication needed |
| Security incident | Legal + PR review first | Never communicate security incidents without legal clearance |
| Data breach | Regulatory notification | May require 72-hour notification under GDPR |
| Mobile app outage | In-app banner + social media | Users may not check email during app outage |

## What Works

1. Draft templates during calm periods. Create specific versions for your services before an incident happens
2. Assign a communication lead separate from the incident commander during P1s
3. Review messages for tone. Avoid jargon, blame, or over-technical explanations
4. Include a human signature. Signed messages feel more authentic than generic status updates
5. Track communication delays. If it takes 20 minutes to draft an update, your process is too slow

## Common Mistakes

1. Saying "we are investigating" for hours. Provide meaningful updates or admit you are stuck
2. Over-promising resolution times. Give ranges ("1-2 hours") instead of exact times
3. Using different terminology across channels. "degraded" on status page and "outage" in Slack creates confusion
4. Forgetting to notify internal teams. Customer communication is visible, but internal teams need coordination too
5. Sending resolution before verification. Confirming resolution prematurely leads to reopening

## Frequently Asked Questions

### How do we handle incidents where we do not know the root cause yet?

State what you know, what you have ruled out, and what you are checking next. Example: "We have identified that the issue is isolated to the API layer. Database and cache layers are operating normally. We are investigating configuration changes deployed in the last 24 hours."

### Should we apologize in incident communications?

Yes, but proportionally. A brief "we apologize for the inconvenience" is appropriate for customer-facing outages. Avoid excessive apology language that sounds insincere. Focus on facts and remediation.

### What if an incident spans multiple time zones?

Always use UTC for all timestamps. Include local time for the primary affected region if relevant. Ensure the handoff between shifts includes communication status so updates do not stop when teams go offline.

## Advanced Solutions

### Automated status page updates with API integration

Push updates to your status page automatically from your incident management tool:

```python
import requests
from dataclasses import dataclass
from typing import Optional
from enum import Enum

class IncidentStatus(Enum):
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"

class IncidentSeverity(Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    MAINTENANCE = "maintenance"

@dataclass
class StatusPageUpdate:
    incident_id: str
    status: IncidentStatus
    message: str
    affected_components: list
    severity: IncidentSeverity

class StatusPageClient:
    def __init__(self, page_id: str, api_key: str):
        self.page_id = page_id
        self.api_key = api_key
        self.base_url = "https://api.statuspage.io/v1"
        self.headers = {"Authorization": f"OAuth {api_key}"}

    def create_incident(self, update: StatusPageUpdate) -> dict:
        """Create a new incident on the status page."""
        payload = {
            "incident": {
                "name": update.message[:100],
                "status": update.status.value,
                "impact_override": update.severity.value,
                "body": update.message,
                "components": {
                    comp: update.status.value for comp in update.affected_components
                },
            }
        }
        resp = requests.post(
            f"{self.base_url}/pages/{self.page_id}/incidents",
            json=payload,
            headers=self.headers,
        )
        resp.raise_for_status()
        return resp.json()

    def update_incident(self, incident_id: str, update: StatusPageUpdate) -> dict:
        """Post an update to an existing incident."""
        payload = {
            "incident": {
                "status": update.status.value,
                "body": update.message,
            }
        }
        resp = requests.patch(
            f"{self.base_url}/pages/{self.page_id}/incidents/{incident_id}",
            json=payload,
            headers=self.headers,
        )
        resp.raise_for_status()
        return resp.json()

# Example usage
client = StatusPageClient("page-id", "api-key")
initial = StatusPageUpdate(
    incident_id="INC-001",
    status=IncidentStatus.INVESTIGATING,
    message="We are investigating reports of API latency affecting checkout.",
    affected_components=["api-gateway", "checkout-service"],
    severity=IncidentSeverity.MAJOR,
)
client.create_incident(initial)
```

### Slack incident channel automation with bot

Automatically create incident channels, invite stakeholders, and post structured updates:

```python
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from datetime import datetime, timezone

class IncidentSlackBot:
    def __init__(self, token: str):
        self.client = WebClient(token=token)

    def create_incident_channel(self, incident_id: str, severity: str) -> str:
        """Create a dedicated Slack channel for incident coordination."""
        channel_name = f"inc-{incident_id}-{severity}".lower()
        try:
            resp = self.client.conversations_create(name=channel_name)
            channel_id = resp["channel"]["id"]
            self.client.conversations_setTopic(
                channel=channel_id,
                topic=f"Incident {incident_id} - Severity: {severity}"
            )
            return channel_id
        except SlackApiError as e:
            print(f"Error creating channel: {e.response['error']}")
            return ""

    def invite_stakeholders(self, channel_id: str, user_ids: list) -> None:
        """Invite stakeholders to the incident channel."""
        try:
            self.client.conversations_invite(
                channel=channel_id,
                users=",".join(user_ids)
            )
        except SlackApiError as e:
            print(f"Error inviting users: {e.response['error']}")

    def post_update(self, channel_id: str, status: str, summary: str,
                    next_update: str) -> None:
        """Post a structured incident update to the channel."""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", f"text": "Incident Update - {timestamp}"}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Status:*\n{status}"},
                    {"type": "mrkdwn", "text": f"*Next Update:*\n{next_update}"},
                ]
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Summary:*\n{summary}"}
            }
        ]
        self.client.chat_postMessage(
            channel=channel_id,
            text=f"Incident update: {status} - {timestamp}",
            blocks=blocks
        )

# Example usage
bot = IncidentSlackBot("xoxb-bot-token")
channel_id = bot.create_incident_channel("INC-001", "P1")
bot.invite_stakeholders(channel_id, ["U12345", "U67890"])
bot.post_update(
    channel_id,
    status="Investigating",
    summary="Checkout API returning 500s. Database connections exhausted.",
    next_update="15 minutes"
)
```

### Communication audit script

Review incident communications after resolution to identify process improvements:

```python
from dataclasses import dataclass
from typing import List
from datetime import datetime, timedelta

@dataclass
class CommunicationEvent:
    timestamp: datetime
    audience: str  # customer, internal, executive
    message_type: str  # initial, update, resolution
    delay_from_sla: timedelta  # how late vs promised

def audit_incident_communications(
    events: List[CommunicationEvent],
    incident_start: datetime,
) -> dict:
    """Audit communication timing and completeness."""
    report = {
        "total_messages": len(events),
        "by_audience": {},
        "by_type": {},
        "late_messages": 0,
        "time_to_first_message": None,
        "gaps": [],
    }

    if not events:
        return report

    first = min(events, key=lambda e: e.timestamp)
    report["time_to_first_message"] = first.timestamp - incident_start

    for event in events:
        audience = event.audience
        msg_type = event.message_type
        report["by_audience"][audience] = report["by_audience"].get(audience, 0) + 1
        report["by_type"][msg_type] = report["by_type"].get(msg_type, 0) + 1

        if event.delay_from_sla.total_seconds() > 0:
            report["late_messages"] += 1

    # Check for gaps > 30 min during P1/P2
    sorted_events = sorted(events, key=lambda e: e.timestamp)
    for i in range(1, len(sorted_events)):
        gap = sorted_events[i].timestamp - sorted_events[i-1].timestamp
        if gap > timedelta(minutes=30):
            report["gaps"].append({
                "from": sorted_events[i-1].timestamp.isoformat(),
                "to": sorted_events[i].timestamp.isoformat(),
                "duration_min": gap.total_seconds() / 60,
            })

    return report

# Example usage
start = datetime(2026, 7, 1, 10, 0, 0)
events = [
    CommunicationEvent(datetime(2026, 7, 1, 10, 5, 0), "customer", "initial", timedelta(minutes=5)),
    CommunicationEvent(datetime(2026, 7, 1, 10, 15, 0), "internal", "initial", timedelta(minutes=0)),
    CommunicationEvent(datetime(2026, 7, 1, 10, 35, 0), "customer", "update", timedelta(minutes=5)),
    CommunicationEvent(datetime(2026, 7, 1, 11, 20, 0), "customer", "resolution", timedelta(minutes=5)),
]
audit = audit_incident_communications(events, start)
print(f"Time to first message: {audit['time_to_first_message']}")
print(f"Late messages: {audit['late_messages']}")
print(f"Gaps > 30min: {len(audit['gaps'])}")
```

## Additional Best Practices

1. **Maintain a severity-to-audience mapping matrix.** Not every severity level requires notifying every audience. Document who gets notified and when:

```markdown
## Notification Matrix

| Severity | Customers | Internal Teams | Executives | Legal/PR |
|----------|-----------|----------------|------------|----------|
| P1 | Immediate | Immediate | Within 15 min | If data involved |
| P2 | Within 15 min | Immediate | Within 30 min | If data involved |
| P3 | Within 30 min | Within 15 min | No | No |
| P4 | Status page only | Within 1 hour | No | No |
```

2. **Pre-build message templates for your top 5 services.** Generic templates require filling in too many blanks during an incident. Pre-fill service names, affected components, and common impact descriptions:

```yaml
# templates/checkout-service-p1.yaml
service: checkout-service
severity: P1
affected_components:
  - api-gateway
  - checkout-api
  - payment-processor
default_impact: "Customers unable to complete checkout. Payment processing affected."
status_page_components:
  - "chk8wxy1"  # Statuspage component ID
stakeholders:
  - "#payments-oncall"
  - "#engineering-leads"
  - "exec-team@company.com"
```

## Additional Common Mistakes

1. **Sending technical details to customers.** Customers need to know impact and ETA, not that "the connection pool was exhausted due to a misconfigured HikariCP maxPoolSize setting." Translate technical findings into user-facing language:

```markdown
# Technical (internal only)
Root cause: HikariCP maxPoolSize set to 10 instead of 50 after config migration.
Database connections exhausted under load, causing 500s on checkout endpoint.

# Customer-facing
Some customers were unable to complete checkout due to a configuration issue
in our payment processing system. The issue has been resolved and all systems
are operating normally.
```

2. **Not assigning a dedicated communication lead for P1 incidents.** When the incident commander also handles communication, both suffer. The commander loses focus on mitigation, and communication gets delayed. For P1 incidents, always assign a separate communication lead whose only job is drafting and sending updates.

## Additional Frequently Asked Questions

### How do we handle communication when the incident is caused by a third-party provider?

Be transparent but do not throw partners under the bus. State that you are experiencing issues related to a dependency, what you are doing to mitigate, and that you are working with the provider. Example: "We are experiencing degraded performance due to an issue with our cloud provider. We are implementing fallback routes and working with the provider to resolve the underlying issue." Follow up with a postmortem that includes whether you need to add redundancy for that provider.

### What communication is needed after the incident is resolved?

Send a resolution message to all audiences within the SLA timeframe. Schedule a postmortem within 48 hours. Publish a public postmortem for P1/P2 incidents within 5 business days. Send a follow-up to customers who opened support tickets during the incident with a summary and any remediation actions. Update the status page to operational and remove incident banners.
