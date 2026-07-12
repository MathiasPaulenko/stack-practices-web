---





contentType: docs
slug: incident-response-plan-template
title: "Plantilla de Plan de Respuesta a Incidentes"
description: "Una plantilla para respuesta a incidentes cubriendo clasificación de severidad, roles, detección, contención, erradicación, recuperación y revisión post-incidente."
metaDescription: "Usá esta plantilla de plan de respuesta a incidentes para definir severidad, roles, detección, contención, erradicación, recuperación y revisión post-incidente."
difficulty: intermediate
topics:
  - testing
tags:
  - security
  - incident-response
  - template
  - operations
  - recovery
  - plan
  - infrastructure
relatedResources:
  - /docs/access-control-policy-template
  - /docs/security-audit-checklist
  - /docs/vulnerability-management-process-template
  - /docs/incident-postmortem-template
  - /docs/encryption-key-rotation-runbook
  - /docs/penetration-test-report-template
  - /docs/security-incident-response-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de plan de respuesta a incidentes para definir severidad, roles, detección, contención, erradicación, recuperación y revisión post-incidente."
  keywords:
    - incident response
    - incident management
    - security incident
    - plan template
    - recovery
    - containment
    - post-incident review





---

## Overview

Un incident response plan define cómo un organization detecta, responde a y recupera de security incidents. Establece severity levels, roles y responsibilities, communication procedures y post-incident review processes. Sin un plan, incidents se handle chaoticamente, leading a longer downtime, greater data loss y regulatory penalties.

## When to Use


- For alternatives, see [Security Incident Response Template](/es/docs/security-incident-response-template/).

- Estableciendo incident response para un new organization
- Preparándote para compliance audits (SOC 2, ISO 27001, HIPAA)
- Respondiendo a un security incident
- Entrenando new incident response team members
- Conductiendo tabletop exercises
- Reviewéando y updateando existing incident response procedures

## Solution

```markdown
# Incident Response Plan — `<Organization Name>`

## Plan Overview

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Plan Version | 3.0 |
| Last Updated | 2026-07-05 |
| Plan Owner | CISO |
| Approved By | Executive Committee |
| Review Cycle | Quarterly |
| Next Review | 2026-10-05 |
| Compliance Frameworks | SOC 2, ISO 27001, GDPR, HIPAA |
| IR Team Size | 7 members |
| On-Call Rotation | 24/7, weekly rotation |

## 1. Incident Severity Classification

### Severity Levels

| Severity | Definition | Examples | Response Time | Escalation |
|----------|------------|----------|---------------|------------|
| SEV-0 (Critical) | Total service outage o active data breach | Production down, PII leaked, ransomware | 15 min | CEO, CISO, Legal, PR |
| SEV-1 (High) | Major service degradation o confirmed security breach | Partial outage, unauthorized access detected | 30 min | CISO, VP Engineering |
| SEV-2 (Medium) | Minor service degradation o suspected security issue | Slow response, suspicious activity flagged | 2 hours | Security Lead, On-call Eng |
| SEV-3 (Low) | Minor issue con no user impact | Single pod crash, config error | 4 hours | On-call Engineer |
| SEV-4 (Informational) | No impact, informational only | Security advisory, maintenance notification | Next business day | N/A |

### Severity Decision Matrix

| Impact \ Scope | Single User | Team | Department | Organization |
|----------------|-------------|------|------------|--------------|
| Data breach | SEV-1 | SEV-0 | SEV-0 | SEV-0 |
| Service outage | SEV-3 | SEV-2 | SEV-1 | SEV-0 |
| Performance degradation | SEV-4 | SEV-3 | SEV-2 | SEV-1 |
| Security alert (unconfirmed) | SEV-3 | SEV-2 | SEV-2 | SEV-1 |

## 2. Roles and Responsibilities

### Incident Response Team

| Role | Primary | Secondary | Responsibilities |
|------|---------|-----------|------------------|
| Incident Commander | CISO | VP Engineering | Coordinate response, make decisions, authorize actions |
| Technical Lead | Security Lead | Senior DevOps | Investigate, contain, eradicate threat |
| Communications Lead | PR Director | Marketing Director | Internal y external communications |
| Legal Counsel | General Counsel | External Legal | Legal obligations, regulatory notifications |
| HR Liaison | HR Director | HR Manager | Personnel issues, internal investigations |
| Scribe | Security Analyst | DevOps Engineer | Document timeline, decisions, actions |
| Executive Sponsor | CEO | COO | Business decisions, resource authorization |

### On-Call Schedule

| Rotation | Primary On-Call | Secondary On-Call | Escalation |
|----------|----------------|-------------------|------------|
| Week 1 | Security Lead A | DevOps Engineer A | CISO |
| Week 2 | Security Lead B | DevOps Engineer B | CISO |
| Week 3 | Security Lead A | DevOps Engineer A | VP Eng |
| Week 4 | Security Lead B | DevOps Engineer B | VP Eng |
| Holiday | Security Lead C | DevOps Engineer C | CISO + VP Eng |

### Contact Information

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| Incident Commander | Jane Doe | +1-555-0101 | jane@example.com | @jane |
| Technical Lead | John Smith | +1-555-0102 | john@example.com | @john |
| Communications Lead | Mary Johnson | +1-555-0103 | mary@example.com | @mary |
| Legal Counsel | Robert Chen | +1-555-0104 | robert@example.com | @robert |
| HR Liaison | Sarah Williams | +1-555-0105 | sarah@example.com | @sarah |
| Executive Sponsor | CEO | +1-555-0100 | ceo@example.com | @ceo |

## 3. Incident Lifecycle

### Phase 1: Detection and Reporting

| Detection Source | Method | Alert Target | Response |
|------------------|--------|--------------|----------|
| SIEM alerts | Correlation rules | On-call Security | Page on-call |
| Monitoring alerts | Datadog/Prometheus | On-call DevOps | Page on-call |
| User reports | Help desk ticket | Security Team | Triage within 1 hour |
| External reports | Security researcher | Security Lead | Acknowledge within 24 hours |
| Threat intel | Feed correlation | SIEM auto-alert | Auto-page on SEV-0/1 |
| Compliance | Audit finding | Security Lead | Triage within 1 business day |

### Incident Report Template

```
Incident ID: INC-2026-001
Reported by: <name>
Date/Time detected: <YYYY-MM-DD HH:MM TZ>
Severity: <SEV-0/1/2/3/4>
Description: <brief description>
Affected systems: <list>
Affected users: <count or "unknown">
Data involved: <type, classification>
Current status: <investigating/contained/resolved>
Assigned to: <name>
```

### Phase 2: Triage and Assessment

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | Acknowledgeá incident | On-call | 5 min |
| 2 | Assigná incident ID | On-call | 5 min |
| 3 | Assessá severity | On-call + IC | 15 min |
| 4 | Assigná roles | IC | 10 min |
| 5 | Creá incident channel | Scribe | 5 min |
| 6 | Notifyá stakeholders | Communications Lead | 30 min |
| 7 | Empezá incident log | Scribe | Ongoing |
| 8 | Empezá investigation | Technical Lead | Ongoing |

### Phase 3: Containment

#### Immediate Containment (SEV-0/SEV-1)

| Action | Command/Procedure | Duration | Approval |
|--------|-------------------|----------|----------|
| Isolateá affected host | `kubectl cordon <node>; kubectl drain <node>` | 5 min | Tech Lead |
| Blockeá malicious IP | Updateá WAF rules / firewall | 5 min | Tech Lead |
| Disableá compromised account | `aws iam update-access-key --status Inactive` | 5 min | Tech Lead |
| Revokeá active sessions | Force logout via IdP | 5 min | Tech Lead |
| Disableá affected service | `kubectl scale deployment <name> --replicas=0` | 5 min | IC |
| Snapshotéa affected systems | Creá disk snapshots para forensics | 15 min | Tech Lead |
| Preserveá evidence | Captureá logs, memory dumps | 30 min | Tech Lead |

#### Short-term Containment

| Action | Purpose | Duration |
|--------|---------|----------|
| Aplicá temporary firewall rules | Blockeá attack vector | 30 min |
| Rotateá compromised credentials | Prevení re-entry | 1 hour |
| Patcheá vulnerable software | Closeá attack vector | 2-4 hours |
| Deployeá hotfix | Fixeá exploited bug | 2-6 hours |

#### Long-term Containment

| Action | Purpose | Duration |
|--------|---------|----------|
| Rebuildeá affected systems | Clean state | 4-24 hours |
| Updateá security rules | Prevení recurrence | 1-2 hours |
| Enhanceá monitoring | Detectá similar attacks | 2-4 hours |
| Updateá detection rules | SIEM correlation | 1-2 hours |

### Phase 4: Eradication

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Identificá root cause | Forensic analysis |
| 2 | Removeá malware/artifacts | Anti-malware scan, manual review |
| 3 | Closeá attack vector | Patch, config change, rule update |
| 4 | Validateá eradication | Full system scan, penetration test |
| 5 | Documentá eradication steps | Incident log updated |

### Phase 5: Recovery

| Step | Action | Verification | Duration |
|------|--------|--------------|----------|
| 1 | Restoreá desde clean backup | Backup integrity check | 1-4 hours |
| 2 | Rebuildeá affected systems | Configuration validation | 2-12 hours |
| 3 | Deployeá patched version | Smoke tests pass | 1-2 hours |
| 4 | Gradual traffic restore | Health checks, monitoring | 30 min - 2 hours |
| 5 | Monitoreá por recurrence | Enhanced monitoring 72 hours | 72 hours |
| 6 | Validateá con users | User acceptance testing | 1-4 hours |

### Phase 6: Post-Incident Review

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | Scheduleá review meeting | IC | Within 5 days |
| 2 | Collecteá all evidence | Scribe | Before meeting |
| 3 | Escribí incident timeline | Scribe | Before meeting |
| 4 | Conductí blameless review | All stakeholders | 1-2 hours |
| 5 | Identificá root cause | Technical Lead | During review |
| 6 | Definí corrective actions | Team | During review |
| 7 | Assigná action items | IC | During review |
| 8 | Publishá post-mortem | Scribe | Within 2 weeks |
| 9 | Trackeá action items | IC | Until completion |

## 4. Communication Plan

### Internal Communications

| Audience | Channel | Timing | Content |
|----------|---------|--------|---------|
| IR Team | Slack incident channel | Real-time | Technical updates |
| Engineering | Slack #incidents | Every 30 min | Status updates |
| All employees | Email | Every 2 hours | High-level status |
| Executive team | Phone/Slack | Every 1 hour | Business impact |
| Board | Email via CEO | Within 24 hours | Summary para board |

### External Communications

| Audience | Channel | Timing | Content | Approval |
|----------|---------|--------|---------|----------|
| Customers | Status page | Within 30 min | Service impact | IC + Comms |
| Customers | Email | Within 24 hours | Detailed notification | IC + Legal |
| Regulatory bodies | Official notification | Per regulation | Required disclosure | Legal |
| Media | Press release | If publicly visible | Approved statement | CEO + Comms |
| Security researchers | Email | Within 48 hours | Acknowledgment | Security Lead |

### Communication Templates

#### Status Page Update (Initial)

```
[INVESTIGATING] We are investigating an issue affecting <service>.
Impact: <description of impact>.
Started: <timestamp>.
We will update within 30 minutes.
```

#### Status Page Update (Resolved)

```
[RESOLVED] The issue affecting <service> has been resolved.
Duration: <start> to <end>.
Root cause: <brief description>.
We will publish a post-incident review within 2 weeks.
```

#### Customer Notification Email

```
Subject: Security Incident Notification — <Date>

Dear <Customer>,

We are writing to inform you of a security incident that may have affected your data.
<Description of incident and impact>.
<What we have done in response>.
<What customers should do>.
We take this seriously and are taking the following steps: <action list>.
For questions, contact security@example.com.

Sincerely,
<Name>, <Title>
```

## 5. Regulatory Notification Requirements

| Regulation | Notification Deadline | Recipient | Trigger |
|------------|----------------------|-----------|---------|
| GDPR | 72 hours | Supervisory authority | Personal data breach |
| GDPR | Without undue delay | Data subjects | High risk to rights |
| CCPA | Without unreasonable delay | Affected consumers | Breach de PII |
| HIPAA | 60 days | HHS Secretary | PHI breach affecting 500+ |
| HIPAA | 60 days | Affected individuals | PHI breach |
| SOC 2 | Per agreement | Clients | Security incident |
| State laws | Varies (1-90 days) | State AG + residents | Per state law |

## 6. Incident Metrics

| Metric | Target | Measurement | Report |
|--------|--------|-------------|--------|
| Mean Time to Detect (MTTD) | < 15 min | Time desde incident start a detection | Monthly |
| Mean Time to Respond (MTTR) | < 30 min | Time desde detection a response start | Monthly |
| Mean Time to Contain (MTTC) | < 4 hours | Time desde detection a containment | Monthly |
| Mean Time to Recover (MTTR) | < 24 hours | Time desde containment a full recovery | Monthly |
| Incidents per quarter | Trending down | Count de incidents | Quarterly |
| Repeat incidents | < 5% | Incidents con same root cause | Quarterly |
| Post-incident reviews on time | 100% | Reviews within 5 days | Monthly |
| Action items completed | 100% | Corrective actions completed | Quarterly |
| Tabletop exercises | 4 per year | Exercises conducted | Annual |

## 7. Tabletop Exercise Plan

### Exercise Schedule

| Exercise | Scenario | Participants | Frequency |
|----------|----------|--------------|-----------|
| Exercise 1 | Ransomware attack | Full IR team | Quarterly |
| Exercise 2 | Data breach (PII leak) | IR team + Legal + PR | Quarterly |
| Exercise 3 | Insider threat | IR team + HR | Annually |
| Exercise 4 | DDoS attack | IR team + DevOps | Annually |
| Exercise 5 | Supply chain attack | Full IR team + Exec | Annually |

### Exercise Format

| Phase | Duration | Activity |
|-------|----------|----------|
| Setup | 15 min | Distributeá scenario, assigná roles |
| Inject 1 | 30 min | Initial incident report |
| Inject 2 | 30 min | Escalation (new information) |
| Inject 3 | 30 min | Complication (key person unavailable) |
| Hot wash | 30 min | Immediate feedback y lessons |
| Report | 1 week | Written findings y recommendations |
```

## Explanation

Un incident response plan provee un structured approach para handlear security incidents. Define six phases: detection, triage, containment, eradication, recovery y post-incident review. Cada phase tiene specific actions, responsible roles y timeframes.

Severity classification drivea el response. SEV-0 incidents (production down, active data breach) requiren un 15-minute response con full team escalation. SEV-3 incidents (minor issues) tienen un 4-hour response window. El severity level determina quién se pagea, cuán seguido updates se send y cuándo executives se notify.

Roles previenen chaos durante incidents. El Incident Commander coordinatea el response y make decisions. El Technical Lead investiga y containea el threat. El Communications Lead handlea internal y external messaging. El Scribe documentea everything. Sin defined roles, everyone intenta hacer everything y nothing se hace properly.

Containment stop el bleeding. Immediate containment aísla affected systems, blockea malicious IPs y disablea compromised accounts. Short-term containment apply patches y rotate credentials. Long-term containment rebuilde systems y enhancea monitoring. El goal es stop el attack sin destroy evidence needed para forensic analysis.

Eradication remove el threat completamente. Esto involve identificar el root cause, remove malware o attacker artifacts, close el attack vector y validate que el threat se fue. Skipear eradication lead a recurring incidents — el attacker vuelve a través del same vulnerability.

Recovery restore service a normal. Systems se rebuildden desde clean backups, patched versions se deployean, traffic se gradually restore con health checks y enhanced monitoring watchea por recurrence. Recovery no es complete hasta que el system ha estado stable por 72 hours bajo enhanced monitoring.

Post-incident review es donde learning pasa. Un blameless review identify qué pasó, por qué pasó y cómo prevenirlo. Corrective actions se assignan con owners y deadlines. El post-mortem se publish para que el entire organization pueda learn. Sin post-incident reviews, los same incidents se repiten.

Communication es critical. Internal stakeholders necesitan regular updates. Customers necesitan timely notifications en un status page. Regulatory bodies tienen mandatory notification deadlines (GDPR: 72 hours, HIPAA: 60 days). Pre-approved templates speedeup communication durante el incident cuando time es critical.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Small team | Simplified plan, shared roles | 2-3 person IR team |
| Enterprise | Full plan con dedicated IR team | 24/7 SOC, automated response |
| Healthcare | Addeá HIPAA breach notification | 60-day notification, HHS reporting |
| Financial | Addeá regulatory notification | SEC, FINRA, state banking regulators |
| Cloud-native | Focus en cloud containment | Isolateá VPC, revokeá IAM roles |
| Air-gapped | Focus en physical containment | Network isolation, physical access |

## What Works

1. Testeá el plan con tabletop exercises — untested plans failan under pressure
2. Usá un dedicated incident channel — keep communication organized
3. Documentá everything en real-time — el scribe role es critical
4. Conductí blameless post-incident reviews — focus en systems, no people
5. Pre-approveá communication templates — save time durante el incident
6. Trackeá action items a completion — lessons sin action son wasted
7. Monitoreá por 72 hours después de recovery — detectá recurrence early

## Common Mistakes

1. No plan — incidents se handlean ad hoc, leading a chaos
2. Plan never tested — el plan looks good on paper pero faila en practice
3. No defined roles — everyone intenta help, nobody coordinatea
4. No communication plan — stakeholders learn sobre incidents desde Twitter
5. No post-incident review — el same incident se repite
6. Blame-focused reviews — people hide issues en vez de reportearlos
7. Action items no tracked — corrective actions se identify pero nunca se implementan

## Frequently Asked Questions

### ¿Cuál es la difference entre un incident y un event?

Un event es any observable occurrence en un system o network (un login, un file access, un network connection). Un incident es un event que viola security policies o threatea el organization. Un failed login es un event. 10,000 failed logins en 5 minutes es un incident. El IR plan aplica a incidents, no events.

### ¿Cómo conductimos un blameless post-incident review?

Focus en systems y processes, no individuals. Preguntá "qué falló en nuestro system que allow esto pasar?" en vez de "quién causó esto?" Trateá el incident como un learning opportunity. Asumí que everyone did su best con la information que tenían. El goal es improve systems para que el same incident no pueda pasar otra vez, no assign blame.

### ¿Cuándo deberíamos involve law enforcement?

Para SEV-0 incidents involving criminal activity (ransomware, data theft, fraud), contacteá law enforcement early. Preserveá evidence antes de contain — shuttear systems puede destroy forensic evidence. Consultá legal counsel antes de involve law enforcement, ya que hay implications para ongoing operations y customer notifications. El FBI (US), NCA (UK) o local cybercrime units handle estos cases.

### ¿Cómo handleamos un insider threat incident?

Involvé HR y Legal desde el start. Insider threats requiren different handling: preserveá evidence discreetly, restringí access sin alertar al individual y coordinateá con HR para potential termination. Legal determina obligations para reporting y notification. El IR plan debería tener un specific insider threat annex con HR y Legal roles defined.

### ¿Qué deberíamos hacer si descubrimos un vulnerability pero no ha ocurrido ningún incident?

Tratealo como un SEV-3 o SEV-4 dependiendo de severity. Seguí el vulnerability management process, no el incident response plan. El IR plan es para active incidents. Vulnerability management handlea identification, triage y remediation de vulnerabilities antes de que se exploten. Si el vulnerability está being actively exploited, escalateá a un incident.
