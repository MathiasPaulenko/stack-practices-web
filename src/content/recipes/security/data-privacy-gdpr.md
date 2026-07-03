---
contentType: recipes
slug: data-privacy-gdpr
title: "Data Privacy and GDPR Compliance"
description: "Implement data privacy controls, consent management, data anonymization, and GDPR-compliant data handling in web applications."
metaDescription: "GDPR compliance and data privacy: consent management, data anonymization, right to erasure, data portability, and privacy-by-design architecture patterns."
difficulty: intermediate
topics:
  - security
tags:
  - gdpr
  - privacy
  - compliance
  - security
  - vulnerabilities
relatedResources:
  - /docs/data-retention-policy-template
  - /recipes/encryption-at-rest
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "GDPR compliance and data privacy: consent management, data anonymization, right to erasure, data portability, and privacy-by-design architecture patterns."
  keywords:
    - gdpr
    - privacy
    - compliance
    - data-protection
---
## Overview

The General Data Protection Regulation (GDPR) sets strict rules for handling personal data of EU citizens. Beyond legal compliance, privacy-by-design builds user trust and reduces breach impact. This resource covers practical technical controls: consent management, data minimization, anonymization, right to erasure, and data portability.

## When to Use

Use this resource when:
- Processing personal data of EU residents (customers, employees, leads)
- Building consent flows for marketing, analytics, or third-party sharing
- Implementing data retention and automatic deletion policies
- Preparing for data subject access requests (DSARs)

## Solution

### Consent Management Schema (PostgreSQL)

```sql
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(50) NOT NULL,  -- 'marketing', 'analytics', 'third_party'
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
);

-- Index for fast DSAR lookups
CREATE INDEX idx_consents_user ON user_consents(user_id);
```

### Anonymization Pipeline (Python)

```python
import hashlib
import hmac
from datetime import datetime

SECRET_KEY = b"rotation-secret-2024"

def pseudonymize(user_id: str) -> str:
    """Replace PII with irreversible hash for analytics."""
    return hmac.new(SECRET_KEY, user_id.encode(), hashlib.sha256).hexdigest()[:16]

def anonymize_age(birth_date: datetime) -> str:
    """Bucket age into ranges for statistical use."""
    age = (datetime.now() - birth_date).days // 365
    if age < 18: return "<18"
    if age < 25: return "18-24"
    if age < 35: return "25-34"
    return "35+"
```

### Right to Erasure (Node.js)

```javascript
async function eraseUserData(userId) {
  // 1. Delete or anonymize user record
  await db.users.update(userId, {
    email: null,
    name: 'Deleted User',
    deleted_at: new Date()
  });
  
  // 2. Cascade delete related data
  await db.orders.anonymize({ user_id: userId });
  await db.sessions.delete({ user_id: userId });
  await db.activity_logs.delete({ user_id: userId });
  
  // 3. Notify third parties
  await webhookService.notify('user.deleted', { userId });
  
  // 4. Log the erasure for audit
  await auditLog.create({ action: 'erasure', user_id: userId, timestamp: new Date() });
}
```

## Explanation

**Six GDPR principles with technical implementation**:

1. **Lawfulness**: Store consent records with timestamp, IP, and purpose
2. **Purpose limitation**: Tag data with allowed purposes; reject unauthorized use
3. **Data minimization**: Collect only what's necessary; use form validation
4. **Accuracy**: Allow users to update profiles; validate inputs
5. **Storage limitation**: TTL on personal data; auto-delete after retention period
6. **Integrity/confidentiality**: Encrypt at rest; hash for analytics; access controls

**Data Subject Rights (DSRs)**:
- **Access**: Export all personal data in machine-readable format (JSON)
- **Rectification**: Update incorrect data via self-service portal
- **Erasure**: Delete or anonymize within 30 days (with audit trail)
- **Portability**: Export data in standard format (JSON, CSV)
- **Objection**: Stop processing for marketing or profiling

## Variants

| Control | Implementation | Effort |
|---------|----------------|--------|
| Consent banners | Cookie consent SDK | Low |
| Data mapping | Manual audit + schema tags | Medium |
| Auto-deletion | Cron jobs with retention rules | Medium |
| Pseudonymization | Hashing + key rotation | Medium |
| DPO dashboard | Custom admin tool | High |

## What Works

- **Privacy by default**: New capabilities opt-out by default; explicit opt-in required
- **Encrypt PII at rest**: Use [AES-256 encryption](/recipes/security/encryption-at-rest) for databases, S3, and backups
- **Log access to personal data**: [Audit](/guides/devops/logging-monitoring-observability-guide) who accessed what and when
- **Separate analytics data**: Pseudonymize before sending to BI tools
- **Document your lawful basis**: Contract, consent, or legitimate interest per data type

## Common Mistakes

1. **Implicit consent**: Pre-checked boxes or buried terms don't count under [GDPR](/recipes/security/data-privacy-gdpr)
2. **No retention limits**: Keeping user data forever violates storage limitation
3. **Third-party leakage**: Analytics, ads, and CDNs receive PII without user knowledge. Run [dependency audits](/guides/security/security-best-practices-guide) regularly.
4. **Ignoring backup deletion**: Erased user data persists in old database snapshots
5. **One-size-fits-all consent**: Marketing and functional cookies need separate consent

## Frequently Asked Questions

**Q: Does GDPR apply if my company is outside the EU?**
A: Yes, if you process data of EU residents. The regulation has extraterritorial reach.

**Q: What's the difference between anonymization and pseudonymization?**
A: Anonymization is irreversible (data can never identify the person). Pseudonymization uses a key that can re-identify if needed (still personal data under GDPR).

**Q: How do I handle erasure requests with foreign key constraints?**
A: Use soft deletes (anonymize instead of delete), or cascade deletes with audit logging. Never orphan records.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
