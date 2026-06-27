---
contentType: recipes
slug: implement-abac
title: "Implement ABAC"
description: "How to implement attribute-based access control with policy engines, dynamic context evaluation, and fine-grained authorization decisions across Python, Node.js, and Java."
metaDescription: "Implement attribute-based access control with policy engines, dynamic context evaluation, and fine-grained authorization decisions."
difficulty: advanced
topics:
  - authentication
tags:
  - authentication
  - abac
  - authorization
  - policy-engine
  - security
  - fine-grained
  - recipe
relatedResources:
  - /recipes/authentication/implement-rbac
  - /recipes/authentication/implement-sso-saml
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Implement attribute-based access control with policy engines, dynamic context evaluation, and fine-grained authorization decisions."
  keywords:
    - authentication
    - abac
    - authorization
    - policy-engine
    - security
    - fine-grained
    - recipe
---

## Overview

Attribute-Based Access Control (ABAC) evaluates access decisions using attributes of the user, the resource, the action, and the environment. Unlike RBAC, which asks "is Alice an admin?", ABAC asks "does Alice, working from the office IP, during business hours, on an unclassified document, have read access?" ABAC is the right choice when access depends on dynamic, contextual factors that cannot be captured in static role assignments.

## When to Use

- Access must vary by time of day, location, device trust level, or network zone
- The same user needs different access levels for different projects, clients, or data classifications
- You are implementing a zero-trust architecture where every request is re-evaluated
- Resource-level permissions are needed (e.g., Alice can edit Document A but only view Document B)
- Compliance requires contextual access decisions (HIPAA, ITAR, GDPR data residency)

## When NOT to Use

- Your application has fewer than 5 roles and simple access rules — RBAC is simpler and more auditable
- The authorization logic rarely changes — ABAC adds complexity that is not justified
- Performance is critical and millisecond-level policy evaluation is unacceptable
- The team lacks experience with policy engines or formal rule systems

## Step-by-Step Implementation

### Python (Casbin + context attributes)

```python
import casbin
from datetime import datetime
from functools import wraps
from flask import Flask, request, g, jsonify

# Policy definition (model.conf)
# [request_definition]
# r = sub, dom, obj, act, env
#
# [policy_definition]
# p = sub, dom, obj, act, rule
#
# [role_definition]
# g = _, _, _
#
# [policy_effect]
# e = some(where (p.eft == allow))
#
# [matchers]
# m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act && eval(p.rule)

enforcer = casbin.Enforcer('model.conf', 'policy.csv')

# Request context builder
def build_context(user, request):
    return {
        "time": datetime.now().hour,
        "ip": request.remote_addr,
        "device_trusted": user.device_trusted,
        "location": geoip_lookup(request.remote_addr),
        "data_classification": request.view_args.get('classification', 'public')
    }

# ABAC decorator
def require_abac(resource, action):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ctx = build_context(g.user, request)

            # Enforce with context
            allowed = enforcer.enforce(
                g.user.role,          # subject
                g.user.tenant_id,     # domain
                resource,             # object
                action,               # action
                ctx                   # environment context
            )

            if not allowed:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

# Custom function for policy evaluation
@enforcer.add_function('business_hours')
def business_hours(hour):
    return 9 <= hour <= 17

@enforcer.add_function('office_network')
def office_network(ip):
    return ip.startswith('10.0.0.') or ip.startswith('192.168.1.')
```

```csv
# policy.csv
# Role, Tenant, Resource, Action, Rule
p, analyst, acme, reports, read, "business_hours(r_env.time) && office_network(r_env.ip)"
p, manager, acme, reports, read, "true"
p, manager, acme, reports, write, "business_hours(r_env.time)"
p, admin, acme, *, *, "true"

# Role hierarchy
g, alice, analyst, acme
g, bob, manager, acme
g, carol, admin, acme
```

### Node.js (Open Policy Agent / Cedar)

```javascript
// OPA (Open Policy Agent) with Rego policies
// policies/document.rego
/*
package document

import future.keywords.if
import future.keywords.in

default allow := false

# Users can read public documents
allow if {
    input.action == "read"
    input.resource.classification == "public"
}

# Managers can read confidential documents during business hours
allow if {
    input.user.role == "manager"
    input.action == "read"
    input.resource.classification == "confidential"
    input.context.time.hour >= 9
    input.context.time.hour <= 17
}

# Document owners can always edit their own documents
allow if {
    input.action == "write"
    input.resource.owner == input.user.id
}

# Admins can do anything
allow if {
    input.user.role == "admin"
}
*/

// Node.js client
import { OPAClient } from '@styra/opa';

const opa = new OPAClient('http://localhost:8181');

async function authorize(user, resource, action, context) {
    const input = {
        user,
        resource,
        action,
        context: {
            time: new Date(),
            ip: context.ip,
            deviceTrustScore: context.deviceTrustScore
        }
    };

    const result = await opa.evaluate('document/allow', input);
    return result === true;
}

// Cedar (AWS-style ABAC)
// policies.cedar
/*
permit (
    principal,
    action == Action::"view",
    resource
)
when {
    resource.classification == "public"
};

permit (
    principal in Role::"manager",
    action in [Action::"view", Action::"edit"],
    resource
)
when {
    resource.classification == "confidential",
    context.time.hour >= 9,
    context.time.hour <= 17
};
*/

import { Authorizer, PolicySet } from '@cedar-policy/cedar-wasm';

const authorizer = new Authorizer();
authorizer.setPolicies(new PolicySet(/* policies.cedar content */));

function checkAccess(principal, action, resource, context) {
    return authorizer.isAuthorized({ principal, action, resource, context });
}
```

### Java (Spring Security + SpEL)

```java
// Custom expression for method-level security
@Component("abac")
public class AbacExpression {

    public boolean canAccess(Authentication auth, Document document, String action) {
        User user = (User) auth.getPrincipal();
        LocalTime now = LocalTime.now();
        String ip = getClientIp();

        // Document owner always has write access
        if ("write".equals(action) && document.getOwnerId().equals(user.getId())) {
            return true;
        }

        // Confidential documents: business hours + office network
        if ("CONFIDENTIAL".equals(document.getClassification())) {
            boolean businessHours = now.isAfter(LocalTime.of(9, 0))
                && now.isBefore(LocalTime.of(17, 0));
            boolean officeNetwork = ip.startsWith("10.0.0.");
            return businessHours && officeNetwork && user.hasRole("MANAGER");
        }

        // Public documents: any authenticated user can read
        if ("PUBLIC".equals(document.getClassification()) && "read".equals(action)) {
            return true;
        }

        return false;
    }

    private String getClientIp() {
        // Extract from request context
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
            .getRequest().getRemoteAddr();
    }
}

// Usage
@RestController
public class DocumentController {

    @PreAuthorize("@abac.canAccess(authentication, #document, 'read')")
    @GetMapping("/documents/{id}")
    public Document getDocument(@PathVariable Long id) {
        return documentService.findById(id);
    }

    @PreAuthorize("@abac.canAccess(authentication, #document, 'write')")
    @PutMapping("/documents/{id}")
    public Document updateDocument(@PathVariable Long id, @RequestBody Document doc) {
        return documentService.update(id, doc);
    }
}
```

## Best Practices

- **Separate policy from code.** Store ABAC rules in a dedicated policy file (Rego, Cedar, or YAML) that can be updated without redeploying the application. Hardcoded rules become unmaintainable.
- **Cache context attributes, not decisions.** Device trust scores, IP geolocation, and time-of-day checks are expensive. Cache the context for the duration of the request, but re-evaluate the policy each time.
- **Log every policy evaluation.** Record the input attributes, the policy version, and the decision (allow/deny) for compliance auditing. OPA and Cedar both support decision logging.
- **Test policies independently of the application.** Write unit tests for Rego or Cedar policies in isolation. A policy bug that grants admin access to all users should be caught before deployment.
- **Use short-circuit evaluation.** Order policy rules from most specific to most general. A rule that says "deny if classification is TOP SECRET" should be checked before "allow if role is admin."

## Common Mistakes

- **Re-inventing a policy language with boolean expressions in code.** `if (user.role == 'admin' || (user.location == 'office' && time.hour > 9))` quickly becomes a nested mess. Use a policy engine.
- **Not validating context attributes.** A client that sets `device_trusted: true` in a request header bypasses your security. Context must be derived server-side from trusted sources.
- **Ignoring policy evaluation performance.** Evaluating 50 rules on every API call adds latency. Use caching, compiled policies (OPA compiles Rego to WASM), and lazy evaluation.
- **Storing policies in the database without versioning.** A policy change that accidentally opens access cannot be rolled back quickly. Version policies in git and load them from files or a policy bundle.
- **Over-engineering simple access control.** If the policy is "admins can do everything, everyone else can read", ABAC is overkill. Start with RBAC and evolve to ABAC when requirements demand it.

## Frequently Asked Questions

**Q: How is ABAC different from RBAC?**
A: RBAC grants access based on roles (e.g., admin, editor). ABAC grants access based on attributes of the user, resource, action, and environment, enabling finer-grained policies.

**Q: What are common attributes used in ABAC?**
A: User attributes (department, clearance), resource attributes (owner, classification), action attributes (read, delete), and environment attributes (time, location, device).

**Q: When should I choose ABAC over RBAC?**
A: Choose ABAC when you need contextual decisions, such as allowing access only during business hours or from a specific location, or when roles alone create role explosion.
