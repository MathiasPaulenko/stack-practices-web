---
contentType: docs
slug: graphql-deprecation-policy-template
templateType: api-deprecation
title: "GraphQL Deprecation Policy Template"
description: "Policy template for deprecating GraphQL fields, types, arguments, and enum values safely. Includes deprecation timeline, communication plan, usage tracking, removal criteria, and migration examples."
metaDescription: "Policy template for GraphQL deprecation: fields, types, arguments, enum values. Timeline, communication plan, usage tracking, removal criteria, migration examples."
difficulty: intermediate
topics:
  - graphql
tags:
  - graphql
  - deprecation
  - policy
  - api-management
  - versioning
  - migration
relatedResources:
  - /docs/ai/graphql-schema-review-checklist
  - /docs/ai/graphql-api-design-guideline
  - /guides/architecture/complete-guide-graphql-federation
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Policy template for GraphQL deprecation: fields, types, arguments, enum values. Timeline, communication plan, usage tracking, removal criteria, migration examples."
  keywords:
    - graphql deprecation
    - graphql deprecation policy
    - graphql versioning
    - api deprecation
    - graphql migration
    - "@deprecated directive"
    - schema evolution
---

## Overview

This template defines the policy for deprecating and eventually removing GraphQL schema elements. Follow this process for every breaking change to ensure clients have time to migrate without disruption.

---

## 1. Deprecation Scope

### 1.1 What Can Be Deprecated

```text
Element          | Deprecation method                    | Breaking?
─────────────────┼───────────────────────────────────────┼──────────
Field            | @deprecated directive on field        | Yes (removal)
Type             | @deprecated directive on type         | Yes (removal)
Argument         | @deprecated directive on argument     | Yes (removal)
Enum value       | @deprecated directive on enum value   | Yes (removal)
Input field      | @deprecated directive on input field  | Yes (removal)
Custom scalar    | Documentation + migration guide       | Yes (removal)
Directive        | Documentation + migration guide       | Yes (removal)
Non-null → null  | Schema change (no directive needed)   | No
Null → non-null  | Not allowed — create new field        | N/A
```

### 1.2 What Cannot Be Deprecated

- Changing a field's type (String → Int) — create a new field instead
- Making a nullable field non-null — create a new field instead
- Removing an interface implementation — create a new type instead
- Changing an argument's type — create a new argument or mutation instead

---

## 2. Deprecation Timeline

### 2.1 Standard Timeline

```text
Phase 1: Announce (Day 0)
  - Add @deprecated directive with reason and replacement
  - Publish deprecation notice in changelog
  - Notify all known API consumers via email/Slack
  - Add deprecation to schema documentation

Phase 2: Monitor (Day 0 - Day 90)
  - Track usage of deprecated element
  - Weekly usage reports to API team
  - Remind high-usage clients every 30 days
  - Provide migration support

Phase 3: Warn (Day 90 - Day 180)
  - Add deprecation warning to response extensions
  - Rate limit deprecated element (reduce by 50%)
  - Escalate to management if usage > 10% of original

Phase 4: Final Notice (Day 180 - Day 210)
  - Final notice to all remaining consumers
  - Hard rate limit (reduce by 90%)
  - Set removal date in deprecation reason

Phase 5: Remove (Day 210+)
  - Remove from schema only if usage = 0 for 30 consecutive days
  - Publish removal in changelog
  - Keep migration guide available for 90 days after removal
```

### 2.2 Expedited Timeline

For security vulnerabilities or data leaks:

```text
Phase 1: Announce + Warn (Day 0)
  - Deprecate immediately
  - Notify all consumers
  - Add response warnings

Phase 2: Rate Limit (Day 0 - Day 30)
  - Hard rate limit from day 1
  - Daily usage reports

Phase 3: Remove (Day 30+)
  - Remove if usage < 1% of original
  - Document security issue in changelog
```

---

## 3. Deprecation Directive Format

### 3.1 Standard Format

```graphql
type User {
  id: ID!
  
  # Deprecated fields
  name: String! @deprecated(
    reason: "Use firstName and lastName. Will be removed in 2026-10-01. See migration guide: /docs/migrations/user-name-split"
  )
  
  email: String! @deprecated(
    reason: "Use contactEmail for display and primaryEmail for system. Will be removed in 2026-12-01."
  )
  
  # Replacement fields
  firstName: String!
  lastName: String!
  contactEmail: String!
  primaryEmail: String!
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  RETURNED @deprecated(
    reason: "Use CANCELLED with reason RETURNED. Will be removed in 2026-09-01."
  )
}
```

### 3.2 Deprecation Reason Format

```text
Required format:
  "{replacement instructions}. Will be removed in {YYYY-MM-DD}. {optional: link to migration guide}"

Examples:
  "Use firstName and lastName. Will be removed in 2026-10-01."
  "Use orders connection with pagination. Will be removed in 2026-11-15. See: /docs/migrations/orders-pagination"
  "Use ProductV2 type. Will be removed in 2026-08-01. See: /docs/migrations/product-v2"
```

---

## 4. Usage Tracking

### 4.1 Tracking Implementation

```javascript
// Apollo Server plugin to track deprecated field usage
const deprecationTracker = {
  async requestDidStart() {
    return {
      async willSendResponse({ response, operationName, query }) {
        const deprecatedFields = extractDeprecatedFields(query);
        
        if (deprecatedFields.length > 0) {
          for (const field of deprecatedFields) {
            await analytics.track('deprecated_field_used', {
              field: field.name,
              type: field.parentType,
              operationName,
              client: response.http?.headers?.get('x-client-id'),
              timestamp: new Date().toISOString(),
            });
          }
          
          // Add deprecation warning to response
          response.extensions = {
            ...response.extensions,
            deprecations: deprecatedFields.map(f => ({
              field: f.name,
              reason: f.reason,
              removalDate: f.removalDate,
            })),
          };
        }
      },
    };
  },
};
```

### 4.2 Usage Report Template

```text
Deprecated Field Usage Report — Week of {YYYY-MM-DD}

Field                    | Type     | Usage Count | Top Clients
─────────────────────────┼──────────┼─────────────┼──────────────────
User.name                | User     | 1,234       | mobile-app, admin
User.email               | User     | 567         | mobile-app
OrderStatus.RETURNED     | Enum     | 89          | reporting-service
Product.legacyPrice      | Product  | 12          | legacy-integration

Total deprecated queries: 1,902
Trend: ↓ 15% from last week
Removal eligible: Product.legacyPrice (usage < 50 for 30 days)
```

---

## 5. Communication Plan

### 5.1 Communication Channels

```text
Audience              | Channel                    | Frequency
──────────────────────┼────────────────────────────┼──────────────────
Internal teams        | #api-deprecations Slack    | On announce + monthly
External clients      | Email to registered devs   | On announce + 30/90/180 days
Public                | Changelog page             | On announce + removal
API docs              | Schema documentation       | Continuous
GraphQL response      | extensions.deprecations     | Every request
Developer portal      | Deprecation dashboard       | Continuous
```

### 5.2 Email Template

```text
Subject: [Action Required] GraphQL API Deprecation Notice — {Field/Type Name}

Body:
  The following GraphQL schema element has been deprecated:

  Element: {field/type/enum name}
  Type: {field/type/enum/argument}
  Deprecated on: {date}
  Removal date: {date}
  Replacement: {replacement instructions}

  Impact on your application:
  {description of what breaks if not migrated}

  Migration guide:
  {link to migration documentation}

  Current usage:
  Your application uses this element {N} times per day.

  Next steps:
  1. Review the migration guide
  2. Update your queries by {removal date}
  3. Test with the new schema in staging
  4. Contact api-support@company.com for help

  Timeline:
  - Day 0: Deprecation announced (today)
  - Day 90: Rate limiting begins on deprecated element
  - Day 180: Hard rate limiting (90% reduction)
  - Day 210: Element removed from schema
```

---

## 6. Migration Guide Template

### 6.1 Migration Guide Structure

```markdown
## Migrating from {deprecated} to {replacement}

### What changed

{Description of what was deprecated and why}

### Before

```graphql
query {
  user(id: "1") {
    name
    email
  }
}
```

### After

```graphql
query {
  user(id: "1") {
    firstName
    lastName
    contactEmail
  }
}
```

### Migration steps

1. Update all queries that select {deprecated field}
2. Update all response parsing logic
3. Update all tests
4. Deploy to staging and verify
5. Deploy to production

### Common issues

- **Issue**: {common problem}
  **Fix**: {solution}

### Timeline

- Deprecated: {date}
- Rate limited: {date}
- Removed: {date}
```

---

## 7. Removal Criteria

### 7.1 Removal Checklist

- [ ] Deprecation period completed (minimum 210 days for standard, 30 for expedited)
- [ ] Usage at zero for 30 consecutive days
- [ ] All known clients migrated
- [ ] Migration guide published
- [ ] Final notice sent 30 days before removal
- [ ] Changelog entry prepared
- [ ] Schema change reviewed and approved
- [ ] Rollback plan documented

### 7.2 Removal Process

```text
1. Verify usage = 0 for 30 days
2. Create PR removing the deprecated element
3. Include changelog entry in PR
4. Schema review by API team
5. Deploy to staging
6. Verify no errors in staging for 48 hours
7. Deploy to production
8. Monitor error rates for 24 hours
9. Keep migration guide available for 90 days
10. Archive deprecation tracking data
```

## FAQ

### What if a client cannot migrate before the removal date?

Grant extensions on a case-by-case basis. Require a migration plan with a concrete date. Extend the rate limit rather than the removal date. If the client is internal, escalate to their engineering manager. If the client is external and critical, extend the timeline but set a hard deadline. Document all extensions in the deprecation tracker.

### How do I deprecate a field that is part of an interface?

Deprecate the field in the interface definition with `@deprecated`. All implementing types inherit the deprecation. If only some implementations should deprecate the field, deprecate it in each type individually. Document which types are affected in the changelog. Interface field deprecation affects all types that implement the interface.

### Can I un-deprecate a field?

Yes, but only during Phase 1 (first 30 days). Remove the `@deprecated` directive and notify clients that the deprecation was withdrawn. After 30 days, un-deprecation creates confusion — instead, create a new field with the same name and type. Document the withdrawal in the changelog with an explanation of why the deprecation was reversed.

### How do I track usage of deprecated enum values?

Enum value usage is harder to track than field usage because the value appears in query arguments, not in the selection set. Parse incoming query variables to detect deprecated enum values. Track them in the same analytics system as deprecated fields. Report usage separately since enum deprecation typically has lower volume but higher impact (the value may be stored in databases).

### What happens if I need to remove a field before the standard timeline?

Use the expedited timeline (30 days) only for security vulnerabilities or data leaks. Document the security justification in the deprecation reason. Notify the security team and management. Apply hard rate limiting from day 1. For non-security urgent removals, shorten the timeline to 90 days with management approval and documented client communication.
