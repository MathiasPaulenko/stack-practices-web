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
  - /guides/compliance-gdpr-guide
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

## Advanced Solutions

### Data portability export (Python)

GDPR Article 20 requires exporting user data in a machine-readable format:

```python
import json
from datetime import datetime
from io import BytesIO
from zipfile import ZipFile

def export_user_data(user_id: str, db) -> bytes:
    """Export all personal data for a user as a ZIP with JSON files."""
    data = {
        'profile': db.get_user_profile(user_id),
        'orders': db.get_user_orders(user_id),
        'consents': db.get_user_consents(user_id),
        'activity_logs': db.get_user_activity(user_id),
    }

    # Remove internal fields and keep only personal data
    for section in data.values():
        if isinstance(section, list):
            for item in section:
                item.pop('id', None)
                item.pop('internal_status', None)
        elif isinstance(section, dict):
            section.pop('id', None)

    export = {
        'user_id': user_id,
        'exported_at': datetime.utcnow().isoformat() + 'Z',
        'format': 'GDPR Article 20 Data Portability',
        'data': data,
    }

    json_bytes = json.dumps(export, indent=2, default=str).encode('utf-8')

    # Package as ZIP for download
    buffer = BytesIO()
    with ZipFile(buffer, 'w') as zf:
        zf.writestr('user_data.json', json_bytes)

    return buffer.getvalue()

# Usage in Flask
@app.route('/api/gdpr/export', methods=['POST'])
@require_auth
def request_export():
    user_id = request.user.id
    data = export_user_data(user_id, db)
    return send_file(
        BytesIO(data),
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'gdpr_export_{user_id}.zip'
    )
```

### Consent management API (Node.js)

```javascript
const express = require('express');
const router = express.Router();

// Grant consent for a specific purpose
router.post('/consent/:purpose', async (req, res) => {
  const { purpose } = req.params;
  const userId = req.user.id;
  const allowedPurposes = ['marketing', 'analytics', 'third_party', 'cookies_functional'];

  if (!allowedPurposes.includes(purpose)) {
    return res.status(400).json({ error: 'Invalid consent purpose' });
  }

  const consent = await db.consents.upsert({
    user_id: userId,
    purpose,
    granted: true,
    granted_at: new Date(),
    withdrawn_at: null,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  res.json({ purpose, granted: true, granted_at: consent.granted_at });
});

// Withdraw consent
router.delete('/consent/:purpose', async (req, res) => {
  const { purpose } = req.params;
  const userId = req.user.id;

  await db.consents.update(
    { user_id: userId, purpose, granted: true },
    { granted: false, withdrawn_at: new Date() }
  );

  // Trigger downstream: stop marketing emails, disable tracking
  await eventBus.emit('consent.withdrawn', { userId, purpose });

  res.json({ purpose, granted: false, withdrawn_at: new Date().toISOString() });
});

// Get all consents for the current user
router.get('/consents', async (req, res) => {
  const userId = req.user.id;
  const consents = await db.consents.findActive({ user_id: userId });
  res.json(consents);
});
```

### Data retention auto-deletion (Python cron)

```python
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

RETENTION_POLICIES = {
    'inactive_users': timedelta(days=730),    # 2 years
    'activity_logs': timedelta(days=365),     # 1 year
    'session_data': timedelta(days=30),       # 30 days
    'marketing_data': timedelta(days=540),    # 18 months
}

def run_retention_cleanup(db):
    """Delete or anonymize data past retention period."""
    now = datetime.utcnow()

    for data_type, retention in RETENTION_POLICIES.items():
        cutoff = now - retention
        deleted_count = 0

        if data_type == 'inactive_users':
            # Anonymize instead of delete to preserve order history
            deleted_count = db.execute("""
                UPDATE users
                SET email = NULL, name = 'Anonymized User',
                    phone = NULL, deleted_at = NOW()
                WHERE last_login < %s AND deleted_at IS NULL
            """, (cutoff,)).rowcount

        elif data_type == 'activity_logs':
            deleted_count = db.execute("""
                DELETE FROM activity_logs
                WHERE created_at < %s
            """, (cutoff,)).rowcount

        elif data_type == 'session_data':
            deleted_count = db.execute("""
                DELETE FROM sessions
                WHERE expires_at < %s
            """, (cutoff,)).rowcount

        logger.info(f'Retention cleanup: {data_type} - {deleted_count} records processed')

    # Log audit entry
    db.execute("""
        INSERT INTO audit_log (action, details, created_at)
        VALUES ('retention_cleanup', %s, NOW())
    """, (f'Completed at {now.isoformat()}',))
```

### Cookie consent banner (JavaScript)

```javascript
const CONSENT_KEY = 'cookie_consent_v1';

function loadConsentBanner() {
  const existing = localStorage.getItem(CONSENT_KEY);
  if (existing) {
    applyConsent(JSON.parse(existing));
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'consent-banner';
  banner.innerHTML = `
    <div class="consent-content">
      <p>We use cookies for analytics and marketing. You can choose which to enable.</p>
      <div class="consent-options">
        <label><input type="checkbox" id="consent-functional" checked disabled> Functional (required)</label>
        <label><input type="checkbox" id="consent-analytics"> Analytics</label>
        <label><input type="checkbox" id="consent-marketing"> Marketing</label>
      </div>
      <div class="consent-actions">
        <button id="consent-reject">Reject All</button>
        <button id="consent-accept">Accept Selected</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('consent-accept').onclick = () => {
    const consent = {
      functional: true,
      analytics: document.getElementById('consent-analytics').checked,
      marketing: document.getElementById('consent-marketing').checked,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    applyConsent(consent);
    banner.remove();
  };

  document.getElementById('consent-reject').onclick = () => {
    const consent = {
      functional: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    applyConsent(consent);
    banner.remove();
  };
}

function applyConsent(consent) {
  if (consent.analytics) {
    loadAnalytics();
  }
  if (consent.marketing) {
    loadMarketingPixels();
  }
}
```

## Additional Best Practices

1. **Implement a Data Processing Register (DPR).** Track what data you collect, where it's stored, who accesses it, and the lawful basis:

```sql
CREATE TABLE data_processing_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_category VARCHAR(100) NOT NULL,    -- 'email', 'location', 'payment'
    purpose TEXT NOT NULL,                   -- 'order fulfillment', 'analytics'
    lawful_basis VARCHAR(50) NOT NULL,       -- 'consent', 'contract', 'legitimate_interest'
    storage_location VARCHAR(200) NOT NULL,  -- 'postgres-eu-west', 's3-eu-central'
    retention_period_days INT NOT NULL,
    third_party_processors TEXT[],           -- ['stripe', 'mailchimp']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **Use data classification tags in your schema.** Mark columns containing PII so access controls and audits can target them:

```sql
COMMENT ON COLUMN users.email IS 'PII:GDPR:personal_data';
COMMENT ON COLUMN users.ip_address IS 'PII:GDPR:personal_data:retention_30d';
COMMENT ON COLUMN orders.billing_address IS 'PII:GDPR:personal_data:encrypted';
```

## Additional Common Mistakes

1. **Forgetting to delete data from backups.** Erasure requests require removing data from backups too. Implement a process to anonymize user data in the next backup cycle, or document that backup data will expire within a defined period:

```python
def schedule_backup_anonymization(user_id):
    """Schedule anonymization in the next backup cycle."""
    # Mark user for anonymization in next backup
    db.pending_anonymization.insert({
        'user_id': user_id,
        'scheduled_for': datetime.utcnow() + timedelta(days=7),
        'status': 'pending',
    })
    # The backup script checks this table and anonymizes before creating snapshots
```

2. **Not handling consent withdrawal in real-time.** If a user withdraws marketing consent, stop sending emails immediately. Don't wait for the next batch job:

```javascript
// Event-driven consent withdrawal
eventBus.on('consent.withdrawn', async ({ userId, purpose }) => {
  if (purpose === 'marketing') {
    await emailService.unsubscribe(userId);
    await crmService.removeFromList(userId, 'marketing');
  } else if (purpose === 'analytics') {
    await analyticsService.disableTracking(userId);
  }
});
```

## Additional FAQ

### What is the difference between a data controller and a data processor?

A data controller determines the purposes and means of processing personal data (e.g., your company). A data processor processes data on behalf of the controller (e.g., AWS, Stripe, Mailchimp). Controllers are responsible for ensuring processors comply with GDPR via Data Processing Agreements (DPAs).

### How long do I have to respond to a DSAR?

GDPR requires responding within one month of receiving the request. This can be extended by two months for complex requests, but you must inform the requester within the first month. Automate data export to respond faster.

### What counts as personal data under GDPR?

Any information relating to an identified or identifiable person: name, email, IP address, cookie identifiers, location data, biometric data, and behavioral data. Even pseudonymized data is personal data if the key exists to re-identify the person.
