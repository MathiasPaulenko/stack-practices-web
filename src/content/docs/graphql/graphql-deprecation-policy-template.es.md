---



contentType: docs
slug: graphql-deprecation-policy-template
templateType: api-deprecation
title: "Plantilla de Politica de Deprecacion de GraphQL"
description: "Plantilla de politica para deprecar GraphQL fields, types, arguments y enum values de forma segura. Incluye timeline, communication plan, usage tracking, removal criteria y migration examples."
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
  - /docs/graphql-schema-review-checklist
  - /docs/graphql-api-design-guideline
  - /guides/complete-guide-graphql-federation
  - /docs/graphql-federation-onboarding-template
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

Esta plantilla define la politica para deprecar y eventualmente remover GraphQL schema elements. Segui este process para every breaking change para asegurar que clients tengan tiempo para migrar sin disruption.

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

- Changing el type de un field (String → Int) — crea un new field en vez
- Making un nullable field non-null — crea un new field en vez
- Removing una interface implementation — crea un new type en vez
- Changing el type de un argument — crea un new argument o mutation en vez

---

## 2. Deprecation Timeline

### 2.1 Standard Timeline

```text
Phase 1: Announce (Day 0)
  - Addea @deprecated directive con reason y replacement
  - Publica deprecation notice en changelog
  - Notifica a all known API consumers via email/Slack
  - Addea deprecation a schema documentation

Phase 2: Monitor (Day 0 - Day 90)
  - Trackea usage del deprecated element
  - Weekly usage reports al API team
  - Recuerda a high-usage clients cada 30 days
  - Provee migration support

Phase 3: Warn (Day 90 - Day 180)
  - Addea deprecation warning a response extensions
  - Rate limita deprecated element (reduce por 50%)
  - Escalatea a management si usage > 10% del original

Phase 4: Final Notice (Day 180 - Day 210)
  - Final notice a all remaining consumers
  - Hard rate limit (reduce por 90%)
  - Setea removal date en deprecation reason

Phase 5: Remove (Day 210+)
  - Removee del schema solo si usage = 0 por 30 consecutive days
  - Publica removal en changelog
  - Keepa migration guide available por 90 days despues de removal
```

### 2.2 Expedited Timeline

Para security vulnerabilities o data leaks:

```text
Phase 1: Announce + Warn (Day 0)
  - Depretea immediately
  - Notifica a all consumers
  - Addea response warnings

Phase 2: Rate Limit (Day 0 - Day 30)
  - Hard rate limit desde day 1
  - Daily usage reports

Phase 3: Remove (Day 30+)
  - Removee si usage < 1% del original
  - Documenta security issue en changelog
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
// Apollo Server plugin para trackear deprecated field usage
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
          
          // Addea deprecation warning a response
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

- [ ] Deprecation period completed (minimum 210 days para standard, 30 para expedited)
- [ ] Usage en zero por 30 consecutive days
- [ ] All known clients migrados
- [ ] Migration guide published
- [ ] Final notice enviado 30 days antes de removal
- [ ] Changelog entry prepared
- [ ] Schema change reviewed y approved
- [ ] Rollback plan documented

### 7.2 Removal Process

```text
1. Verifica usage = 0 por 30 days
2. Crea PR removeiendo el deprecated element
3. Incluye changelog entry en PR
4. Schema review por API team
5. Deployea a staging
6. Verifica no errors en staging por 48 hours
7. Deployea a production
8. Monitora error rates por 24 hours
9. Keepa migration guide available por 90 days
10. Archivea deprecation tracking data
```

## Preguntas Frecuentes

### ¿Qué pasa si un client no puede migrar antes del removal date?

Granta extensions on a case-by-case basis. Requiere un migration plan con un concrete date. Extended el rate limit en vez del removal date. Si el client es internal, escalatea a su engineering manager. Si el client es external y critical, extended el timeline pero setea un hard deadline. Documenta all extensions en el deprecation tracker.

### ¿Cómo depreteo un field que es part de una interface?

Depretea el field en el interface definition con `@deprecated`. All implementing types inherit el deprecation. Si solo some implementations deberian depretear el field, depretealo en cada type individually. Documenta que types son affected en el changelog. Interface field deprecation affecta all types que implementan el interface.

### ¿Puedo un-depretear un field?

Si, pero solo durante Phase 1 (primeros 30 days). Removee el `@deprecated` directive y notifica a clients que el deprecation fue withdrawn. Despues de 30 days, un-deprecation crea confusion — en vez, crea un new field con el same name y type. Documenta el withdrawal en el changelog con una explanation de por que el deprecation fue reversed.

### ¿Cómo trackeo usage de deprecated enum values?

Enum value usage es harder de trackear que field usage porque el value aparece en query arguments, no en el selection set. Parsea incoming query variables para detect deprecated enum values. Trackealos en el same analytics system que deprecated fields. Reportea usage separately ya que enum deprecation tipicamente tiene lower volume pero higher impact (el value puede estar stored en databases).

### ¿Qué pasa si necesito remover un field antes del standard timeline?

Usa el expedited timeline (30 days) solo para security vulnerabilities o data leaks. Documenta el security justification en el deprecation reason. Notifica al security team y management. Aplica hard rate limiting desde day 1. Para non-security urgent removals, shortenea el timeline a 90 days con management approval y documented client communication.

## See Also

- [Complete Guide to GraphQL Schema Design](/es/guides/complete-guide-graphql-schema-design/)
- [Complete Guide to GraphQL Caching](/es/guides/complete-guide-graphql-caching/)
- [GraphQL Federation in Production](/es/guides/complete-guide-graphql-federation-production/)
- [Complete Guide to GraphQL Federation](/es/guides/complete-guide-graphql-federation/)
- [Complete Guide to GraphQL Security](/es/guides/complete-guide-graphql-security/)

