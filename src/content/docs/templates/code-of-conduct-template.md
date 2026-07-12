---
contentType: docs
templateType: code-of-conduct
slug: code-of-conduct-template
title: "Code of Conduct Template"
description: "A community code of conduct template to establish inclusive, respectful collaboration standards."
metaDescription: "Open-source code of conduct template with inclusive collaboration standards, expected behavior rules, enforcement guidelines, and reporting procedures."
difficulty: beginner
topics:
  - devops
tags:
  - community
  - devops
  - open-source
  - ci-cd
  - automation
relatedResources:
  - /docs/contributing-guide
  - /docs/readme-template
  - /guides/software-architecture-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Open-source code of conduct template with inclusive collaboration standards, expected behavior rules, enforcement guidelines, and reporting procedures."
  keywords:
    - code of conduct
    - community guidelines
    - open source governance
    - contributor covenant
    - harassment policy
---

## Overview

A code of conduct sets expectations for participant behavior within a project community. It creates a welcoming environment and provides procedures for addressing violations. Without one, maintainers have no framework for handling unacceptable behavior, and contributors do not know what to expect.

## When to Use

- You manage an open-source project with external contributors
- You want to build an inclusive community
- Your organization requires explicit behavioral standards

## Template

```markdown
# Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity and orientation.

## Our Standards

### Positive Behavior
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Unacceptable Behavior
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior deemed inappropriate, threatening, offensive, or harmful.

## Scope

This Code of Conduct applies within all community spaces and also applies when
an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at [email].
All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org),
version 2.1.
```

## Key Sections

| Section | Purpose |
|---------|---------|
| **Pledge** | Community commitment to inclusivity |
| **Standards** | Explicit positive and negative behaviors |
| **Enforcement** | Who handles violations and how |
| **Scope** | Where the code applies |
| **Reporting** | How to report violations |

## Enforcement Levels

| Level | Behavior | Action |
|-------|----------|--------|
| **1. Warning** | First minor violation | Private message from maintainers |
| **2. Temporary ban** | Repeated violations or serious incident | Removal from community spaces for 1-30 days |
| **3. Permanent ban** | Severe violation or repeated temporary bans | Permanent removal from all community spaces |
| **4. Legal referral** | Threats, doxxing, or illegal conduct | Report to authorities, preserve evidence |

## Filled Example

```markdown
# Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming,
diverse, inclusive, and healthy community.

## Our Standards

### Positive Behavior
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Unacceptable Behavior
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior deemed inappropriate, threatening, offensive, or harmful.

Community leaders have the right and responsibility to remove, edit, or reject
comments, commits, code, wiki edits, issues, and other contributions that are
not aligned to this Code of Conduct.

## Scope

This Code of Conduct applies within all community spaces, including GitHub
repositories, Discord server, mailing lists, and conference booths. It also
applies when an individual is officially representing the community in public
spaces, such as speaking at events or posting on official social media accounts.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
conduct@example.com. All complaints will be reviewed and investigated promptly
and fairly.

All community leaders are obligated to respect the privacy and security of the
reporter of any incident.

## Enforcement Guidelines

1. **Correction**: Private written warning from maintainers clarifying the violation
2. **Warning**: Warning with consequences for continued behavior, no public interaction for 3 days
3. **Temporary Ban**: Banned from community interaction for 1-30 days
4. **Permanent Ban**: Permanent ban from all community spaces

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org),
version 2.1, available at https://www.contributor-covenant.org/version/2/1/code_of_conduct.html.
```

## What Works

- **Adapt, don't copy**: Customize the template to your community's needs
- **Make it visible**: Link prominently in [README](/docs/templates/readme-template) and repository
- **Enforce consistently**: A code without enforcement is meaningless
- **Review annually**: Update as your community evolves
- **Provide a private reporting channel**: email or DM, not public issues
- **Document enforcement actions**: keep a private log for consistency
- **Train moderators**: ensure they understand the escalation ladder

## Common Mistakes

- Copying the Contributor Covenant without reading it — understand what you are adopting
- No reporting mechanism — a code without a reporting channel is unenforceable
- Inconsistent enforcement — applying rules to some but not others destroys trust
- No scope definition — contributors do not know where the code applies
- Public enforcement discussions — violations should be handled privately


## Variant Comparison

| Variant | Context | Approach | Notes |
|---------|---------|----------|-------|
| Contributor Covenant 2.1 | Open-source project, general community | Standard pledge + standards + enforcement | Most common; widely recognized |
| Corporate code | Company-internal project | Add HR referral, IP assignment, NDA references | Aligns with employee handbook |
| Event code | Conference or meetup | Add photography, alcohol, accessibility policies | Include on-site phone number |
| Simplified code | Small project (1-2 maintainers) | Pledge + 5 positive + 5 negative + email | Skip enforcement levels |

## Detailed Scenario: Enforcing a Code of Conduct Violation

```text
Incident: A contributor posts derogatory comments about another
contributor's code quality in a public GitHub issue.

Step 1 - Triage (within 24 hours):
  - Moderation team reviews the issue thread
  - Two moderators agree: this is a Level 1 violation
  - One moderator is assigned as case owner

Step 2 - Action (within 48 hours):
  - Case owner sends a private message to the violator:
    "Your comment in issue #142 violates our Code of Conduct.
    Specifically, the language used is derogatory and personal.
    Please review our standards at [link]. This is a formal warning.
    Repeated violations will result in a temporary ban."
  - Case owner sends a private message to the affected contributor:
    "We saw the comment in issue #142 and have addressed it.
    You should not have to deal with personal attacks here.
    Let us know if there are further incidents."
  - The violating comment is edited or hidden (not deleted)

Step 3 - Documentation:
  - Log the incident in the private moderation log:
    Date, issue number, violator, action taken, case owner
  - Set a reminder to review the violator's behavior in 30 days

Step 4 - Escalation (if repeated):
  - Second violation within 90 days -> Level 2 (temporary ban)
  - Send private notification with ban duration and conditions
  - Remove from GitHub organization, Discord, mailing lists
  - Document the escalation in the moderation log

Step 5 - Reinstatement:
  - After ban period, review the case
  - If the contributor acknowledges the violation and commits
    to the code, reinstate with a note in the log
  - Third violation -> permanent ban, no reinstatement
```

### How do I handle anonymous reports?

Accept reports via an anonymous form (e.g., Google Forms, Typeform) linked from the Code of Conduct page. Anonymous reports are harder to investigate but should still be reviewed. Acknowledge receipt if contact information is provided. Do not dismiss anonymous reports — patterns of anonymous reports about the same person indicate a real problem.

### What if the violation happens outside community spaces?

The code applies when someone represents the community (e.g., speaking at a conference, posting on the project's official Twitter). For behavior in purely personal spaces, the code does not apply directly. However, if a community member's personal behavior makes others unsafe in the community, the moderation team can still act. Use judgment and document the reasoning.

### Should I publish enforcement actions?

No. Publish aggregate statistics quarterly (e.g., "3 warnings, 1 temporary ban this quarter"). Do not publish names, details, or incident specifics. Public enforcement creates drama and discourages reporting. The moderation log is private, shared only with the moderation team.

## Variants

### Corporate project code of conduct

For corporate projects, add sections for HR referral, legal compliance, and employee-specific consequences. Reference internal policies and employee handbooks. Corporate codes may include NDAs and IP assignment in addition to behavioral standards.

### Event code of conduct

For conferences and meetups, add sections for event-specific rules: photography policies, alcohol guidelines, accessibility accommodations, and on-site contact information. Include a phone number for immediate reporting during events.

### Small project simplified code

For small projects with 1-2 maintainers, use a simplified version: pledge, 5 positive behaviors, 5 unacceptable behaviors, and a reporting email. Skip enforcement levels — the maintainer handles each case individually.

## Frequently Asked Questions

### Is a code of conduct legally binding?

A code of conduct is not a legal contract, but it sets enforceable community standards. Violations can result in removal from the community, but it does not replace legal action for illegal behavior.

### Should small projects have a code of conduct?

Yes. Even small projects benefit from clear expectations. Pair it with a [Contributing Guide](/docs/templates/contributing-guide) and [README](/docs/templates/readme-template) to set expectations from the start. It prevents misunderstandings and creates a welcoming environment for new contributors from diverse backgrounds.

### What happens when someone violates the code of conduct?

The enforcement team investigates reports promptly and fairly. Consequences range from a warning to temporary or permanent removal from the community, depending on severity and recurrence.

### Who should be on the enforcement team?

People who are trusted, impartial, and available. For small projects, the maintainer handles enforcement. For larger projects, form a committee of 3-5 people from different teams or backgrounds. Avoid having all enforcement team members from the same company or social group.

### How do I handle a report against a maintainer?

Recuse the accused maintainer from the investigation. If the entire moderation team is implicated, bring in an external mediator. Document the process and outcome. Transparency about the process (not the details) builds trust.

### Should reports be public or private?

Private. Reports should be handled confidentially to protect both the reporter and the accused. Public reports discourage reporting and can lead to mob behavior. Publish aggregate statistics (number of reports, actions taken) periodically for transparency.
