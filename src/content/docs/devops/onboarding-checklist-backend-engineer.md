---


contentType: docs
slug: onboarding-checklist-backend-engineer
title: "Backend Engineer Onboarding Checklist"
description: "A thorough checklist for onboarding new backend engineers covering environment setup, codebase orientation, security training, and first-week goals."
metaDescription: "Onboard backend engineers with this checklist. Covers environment, codebase, security, deployment, and first-week deliverables."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - onboarding
  - checklist
  - backend
  - new-hire
  - team-process
  - engineering
relatedResources:
  - /docs/engineering-handbook-template
  - /docs/git-branching-strategy-document
  - /docs/code-review-checklist-template
  - /docs/service-ownership-document-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Onboard backend engineers with this checklist. Covers environment, codebase, security, deployment, and first-week deliverables."
  keywords:
    - backend engineer onboarding
    - developer onboarding checklist
    - new hire engineering
    - onboarding template
    - engineer first week


---

## Overview

Unstructured onboarding wastes the first month of a new engineer's contribution. Without a checklist, new hires waste days figuring out which repositories to clone, which Slack channels matter, and how to deploy their first change. This checklist structures the first two weeks so new backend engineers become productive contributors quickly while absorbing team culture and technical standards.

## When to Use


- For alternatives, see [Event-Driven Architecture — Queues, Topics, and Streams](/guides/event-driven-architecture-guide/).

Use this checklist when:
- A new backend engineer joins your team
- An engineer transfers from frontend or another specialization
- You are standardizing onboarding across multiple teams
- You need to measure and improve your onboarding process

## Prerequisites

Before the new hire starts:
- [ ] Hardware ordered and configured (laptop, monitors, peripherals)
- [ ] Accounts created (email, Slack, GitHub, cloud provider, VPN)
- [ ] Manager assigned and calendar blocked for first-week 1:1s
- [ ] Onboarding buddy assigned from the engineering team
- [ ] Access requests submitted for production read-only access

## Solution

```markdown
# Backend Engineer Onboarding Checklist

## New Hire: ______ | Start Date: ______ | Manager: ______ | Buddy: ______

---

## Day 1: Welcome and Setup

### Administrative
- [ ] Complete HR paperwork and benefits enrollment
- [ ] Receive laptop and hardware setup
- [ ] Obtain building access badge / parking pass
- [ ] Set up email and calendar
- [ ] Join essential Slack/Teams channels
  - #general, #engineering, #backend, #incidents, #deployments
- [ ] Add profile photo and status to Slack
- [ ] Schedule 1:1s with manager, buddy, and team lead

### Development Environment
- [ ] Install required software (see engineering handbook for versions)
  - [ ] Git
  - [ ] Docker and Docker Compose
  - [ ] Node.js / Python / Java / Go (stack-specific)
  - [ ] IDE (VS Code / IntelliJ / GoLand) with team settings
  - [ ] kubectl and cloud CLI tools
  - [ ] Postman or API client
- [ ] Configure Git with company email and signing key
- [ ] Clone primary repositories
  - [ ] Main application repository
  - [ ] Infrastructure / deployment repository
  - [ ] Shared libraries / SDK repository
- [ ] Run the project locally following README instructions
- [ ] Verify local tests pass
- [ ] Make a trivial documentation fix and open first PR

### Access and Security
- [ ] Complete security awareness training
- [ ] Set up password manager with team vault access
- [ ] Enable MFA on all accounts (GitHub, cloud provider, VPN)
- [ ] Request and receive staging environment access
- [ ] Read and acknowledge data handling policies

---

## Week 1: Codebase Orientation

### Architecture and Systems
- [ ] Attend architecture overview session (recorded if unavailable live)
- [ ] Review system architecture diagram and data flow documentation
- [ ] Identify the 5 most critical services your team owns
- [ ] Understand the request lifecycle: client → load balancer → service → database
- [ ] Review API documentation (OpenAPI / Swagger)
- [ ] Run through the debugging guide for common local issues

### Code Standards
- [ ] Read team's coding standards document
- [ ] Review 5 recently merged PRs to understand review patterns
- [ ] Understand linting and formatting rules (run linters locally)
- [ ] Learn the team's testing philosophy (unit vs integration vs e2e)
- [ ] Review error handling patterns in the codebase

### Processes
- [ ] Understand the sprint/iteration rhythm (planning, standups, retros)
- [ ] Learn how to pick up work (ticket system, Kanban board)
- [ ] Attend sprint planning and retrospective as observer
- [ ] Understand on-call rotation and escalation procedures
- [ ] Review incident response runbooks

### First Contribution
- [ ] Pick up a "good first issue" (labeled in issue tracker)
- [ ] Open a PR following the team's PR template
- [ ] Receive and address code review feedback
- [ ] Merge first PR with buddy's guidance
- [ ] Verify change deploys to staging successfully

---

## Week 2: Deeper Integration

### Production Awareness
- [ ] Shadow an on-call engineer for one shift (non-interruptible)
- [ ] Review production monitoring dashboards
- [ ] Understand alerting thresholds and paging procedures
- [ ] Learn how to query logs in the team's log aggregation tool
- [ ] Review recent postmortems (last 3 months)

### Domain Knowledge
- [ ] Meet with product manager to understand current roadmap
- [ ] Review user-facing features and business logic with domain expert
- [ ] Understand data model and entity relationships
- [ ] Review integration points with external services
- [ ] Learn about compliance and regulatory requirements (if applicable)

### Ownership
- [ ] Identify the service or component you will own
- [ ] Review service ownership documentation
- [ ] Understand deployment pipeline for your service
- [ ] Learn rollback procedures for your service
- [ ] Add yourself to service on-call rotation (with supervision)

---

## Completion Verification

| Area | Verified By | Date | Notes |
|------|-------------|------|-------|
| Environment Setup | ______ | ______ | |
| Local Build Working | ______ | ______ | |
| First PR Merged | ______ | ______ | |
| Security Training | ______ | ______ | |
| Architecture Overview | ______ | ______ | |
| On-call Shadow Complete | ______ | ______ | |

## Feedback

**What was most helpful?**

**What was missing or confusing?**

**How long until you felt productive?**

**Recommendations for improving this checklist:**
```

## Explanation

The checklist separates onboarding into three phases: Day 1 (administrative and technical setup), Week 1 (codebase orientation and first contribution), and Week 2 (production awareness and domain knowledge). The structure recognizes that new engineers need different things at different times: first they need working environments, then they need context, then they need ownership. The buddy system ensures no one gets stuck, and the completion verification creates accountability for both the new hire and the team.

## 30-60-90 Day Onboarding Plan

```text
=== Day 30: Contributing ===

Goals:
  - Environment fully configured and working
  - First 3-5 PRs merged (bug fixes, small features, tests)
  - Participating in code reviews (reviewing others)
  - Understands team workflow (standups, planning, retros)
  - Has met all team members 1:1
  - Completed security and compliance training

Check-in: Manager + buddy review progress, identify blockers

=== Day 60: Owning ===

Goals:
  - Owns a service or component (primary reviewer for changes)
  - Has been on-call shadow for 2+ shifts
  - Participating in design discussions
  - Can deploy to staging independently
  - Can debug production issues with guidance
  - Has written or updated documentation

Check-in: Manager reviews ownership readiness, adjust scope

=== Day 90: Independent ===

Goals:
  - Fully independent on-call (with backup available)
  - Can deploy to production independently
  - Leading a small feature or improvement
  - Mentoring the next new hire (if applicable)
  - Has completed a postmortem or contributed to one
  - Performance review: on track for expectations

Check-in: Manager + skip-level, confirm successful onboarding
```


## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Senior engineer onboarding | Add architecture review, mentoring responsibilities, cross-team introductions | Expect faster completion (5-7 days instead of 10) |
| Contractor / consultant | Focus on project-specific repos, skip culture/team processes | Tighter timeline, specific deliverable focus |
| Intern / junior engineer | Add programming fundamentals review, pair programming schedule | Longer timeline, more structured guidance |
| Remote-first team | Add async communication norms, timezone coordination, virtual coffee chats | No physical setup; stronger emphasis on documentation |
| Team merge / acquisition | Add legacy system orientation, political sensitivity, new process adoption | Focus on integration rather than fresh start |

## What works

1. Assign a buddy, not just a manager. Buddies answer the "how do I..." questions managers cannot.
2. Have the first PR ready on day 1. A documentation fix or test addition builds confidence immediately.
3. Record architecture overviews. Live sessions are valuable but not repeatable; record for future hires.
4. Measure time-to-first-PR. Track this metric to improve your onboarding process.
5. Update the checklist after each new hire. Fresh eyes spot gaps immediately.

## Common Mistakes

1. Focusing only on technical setup. Culture, relationships, and process knowledge matter as much as code.
2. Throwing new hires at complex tasks too early. First contributions should be achievable in 1-2 days.
3. Skipping production access explanations. New engineers need to understand what they can and cannot touch.
4. Not explaining "why" behind processes. Following rules without understanding creates cargo cult behavior.
5. Forgetting to check in after week 2. Onboarding continues for 3-6 months; the checklist is just the beginning.

## Frequently Asked Questions

### How long should onboarding take?

For experienced backend engineers: 1-2 weeks to first meaningful contribution, 1 month to full productivity. For junior engineers: 2-4 weeks to first contribution, 2-3 months to full productivity. These are guidelines; adjust based on codebase complexity and domain knowledge requirements.

### Should new engineers go on-call immediately?

No. Shadow on-call first (observe without responsibility), then join rotation with an experienced buddy available. Most teams wait 1-2 months before independent on-call duty. The exact timeline depends on system complexity and documentation quality.

### What if the new hire finishes everything early?

That is a sign of a well-run process, not a problem. Use extra time for deeper domain exploration, contributing to tooling improvements, or shadowing other teams. Early completion also indicates your documentation and tooling are in good shape.


### How do we measure onboarding success?

Track these metrics: time to first PR (target: < 3 days), time to first production deploy (target: < 2 weeks), time to independent on-call (target: < 2 months), new hire satisfaction score (survey at day 30, 60, 90), buddy satisfaction score, and 6-month retention rate. Review metrics quarterly and adjust the onboarding process. Compare metrics across teams to identify best practices. Share successful onboarding patterns with other teams. A good onboarding process improves retention and reduces time-to-productivity.

### What should the buddy role include?

The buddy is the new hire's go-to person for day-to-day questions. Responsibilities: help with environment setup, answer "how do I..." questions, review first PRs, explain unwritten team norms, introduce to other team members, and check in daily during week 1. The buddy is not a mentor (career growth) or a manager (performance) — they are a peer guide. Assign the buddy before day 1. The buddy should have been on the team for at least 6 months. Rotate buddy assignments to prevent burnout. Recognize buddy contributions in performance reviews.

### How do we handle remote onboarding?

For remote onboarding: ship hardware to arrive before day 1. Schedule a video call for the first morning (not just a Slack message). Use screen sharing for environment setup. Record all architecture overviews and team introductions. Create a virtual "water cooler" channel for informal chat. Schedule daily 15-minute check-ins with the buddy for week 1. Use pair programming sessions for the first PR. Be explicit about communication norms (which channels for what, response time expectations). Send a welcome package (company swag, notebook) to the new hire's home. Consider time zone differences when scheduling meetings.

### What if the new hire is struggling?

If a new hire is struggling: identify the specific area (technical, domain knowledge, process, social). Adjust the onboarding plan: add more 1:1 time with the buddy, break tasks into smaller pieces, provide additional training resources, or pair program more frequently. Schedule a check-in with the manager to discuss concerns openly and constructively. Document specific examples and actionable feedback. Set clear expectations and a timeline for improvement. If the struggle is systemic (not the hire's fault), review the onboarding process for gaps. Most struggles are fixable with targeted support — do not wait to act.

### How do we keep the checklist updated?

After each new hire completes onboarding: ask them to review the checklist and note what was missing, outdated, or confusing. Update the checklist within 1 week while feedback is fresh. Review the checklist quarterly with the team — services change, tools change, processes change. Assign a checklist owner (usually the engineering manager or a senior engineer). Version the checklist so changes are tracked. Share updates with the team so everyone knows what changed. A stale checklist is worse than no checklist — it misleads new hires and erodes trust in the process.













End of document. Review and update quarterly.