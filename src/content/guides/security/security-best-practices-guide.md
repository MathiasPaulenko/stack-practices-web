---




contentType: guides
slug: security-best-practices-guide
title: "Security Best Practices Guide"
description: "A thorough guide to application security: authentication, authorization, input validation, secrets management, and common vulnerability prevention."
metaDescription: "Learn essential security practices: secure authentication, input validation, secrets management, dependency scanning, and preventing OWASP Top 10 vulnerabilities."
difficulty: intermediate
topics:
  - security
  - authentication
tags:
  - security
  - authentication
  - owasp
  - secrets
  - encryption
  - authorization
  - vulnerability
  - best-practices
relatedResources:
  - /recipes/password-hashing
  - /recipes/jwt-authentication
  - /recipes/input-validation
  - /docs/secrets-rotation-template
  - /recipes/bash-ssh-key-manager
  - /recipes/data-validation-zod
  - /recipes/hmac-request-signing
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn essential security practices: secure authentication, input validation, secrets management, dependency scanning, and preventing OWASP Top 10 vulnerabilities."
  keywords:
    - application security
    - owasp top 10
    - secure authentication
    - secrets management
    - input validation
    - authorization




---

## Overview

Security is not a feature you add later—it is a foundation you build into every layer of your application. The following guide covers the essential practices for building secure software.

## When to Apply

- Building any application that handles user data
- Processing payments or sensitive information
- Exposing APIs to the internet
- Working in regulated industries (healthcare, finance, etc.)

## Authentication & Authorization

### Use Proven Authentication Libraries

Never roll your own authentication. Use battle-tested libraries:

| Language | Recommended Library |
| -------- | ------------------- |
| Node.js | Passport.js, Auth.js |
| Python | Django Auth, Flask-Login |
| Java | Spring Security, OAuth2 |
| Go | casbin, gorilla/sessions |

### Multi-Factor Authentication (MFA)

Require MFA for:
- Admin accounts
- Production access
- Financial operations

### Authorization Patterns

**Role-Based Access Control (RBAC)**

```
User -> Role -> Permission -> Resource
```

**Principle of Least Privilege**

Grant only the permissions necessary for each role. Audit permissions quarterly.

## Input Validation

### Validate at the Boundary

```python
# Python with Pydantic
from pydantic import BaseModel, EmailStr, constr

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=12)
    role: constr(pattern=r'^(user|admin)$')
```

### Sanitize Output

- Use parameterized queries (never string concatenation)
- Escape HTML before rendering in browsers
- Encode JSON safely

## Secrets Management

### Never Hardcode Secrets

```bash
# ❌ Bad
API_KEY = "sk-live-abc123"

# ✅ Good
API_KEY = os.environ.get("API_KEY")
```

### Use a Secrets Manager

| Tool | Use Case |
| ---- | -------- |
| HashiCorp Vault | Enterprise, complex policies |
| AWS Secrets Manager | AWS-native applications |
| Azure Key Vault | Azure-native applications |
| Doppler | Multi-cloud, developer-friendly |
| 1Password Secrets | Small teams, simple setup |

## Dependency Security

### Keep Dependencies Updated

```bash
# Scan for vulnerabilities
npm audit
pip-audit
snyk test
```

### Lock Files

Always commit lock files (`package-lock.json`, `poetry.lock`, `Cargo.lock`) to ensure reproducible builds.

## OWASP Top 10 Prevention

| Vulnerability | Prevention |
| ------------- | ---------- |
| Injection | [Parameterized queries](/recipes/security/sql-injection-prevention), [input validation](/recipes/api/input-validation) |
| Broken Access Control | Deny by default, enforce ownership |
| Cryptographic Failures | [HTTPS everywhere](/recipes/api/handle-cors), [encrypt at rest](/recipes/security/encryption-at-rest) |
| Insecure Design | Threat modeling, security requirements |
| Security Misconfiguration | Minimal platforms, remove defaults |
| Vulnerable Components | Dependency scanning, auto-updates |
| Auth Failures | MFA, strong passwords, [session limits](/recipes/security/oauth2-pkce-spa) |
| Software Integrity | Verify packages, signed commits |
| Logging Failures | [Log all auth events](/recipes/observability/structured-logging), [monitor anomalies](/recipes/observability/metrics-collection) |
| SSRF | Whitelist URLs, disable unnecessary protocols |

## Secure Communication

### HTTPS Everywhere

- Redirect HTTP to HTTPS
- Use HSTS headers
- Keep TLS certificates up to date

### API Security

- [Rate limiting](/recipes/api/rate-limiting) (prevent brute force)
- API versioning (graceful deprecation)
- Request signing (verify integrity)

## Logging & Monitoring

### What to Log

- Authentication attempts (success and failure)
- Authorization failures
- Input validation errors
- Unusual traffic patterns

### What NOT to Log

- Passwords
- API keys
- Personal health information
- Credit card numbers

## Security Checklist

- [ ] Authentication uses MFA where required
- [ ] Authorization checks resource ownership
- [ ] All inputs validated and sanitized
- [ ] Secrets stored in a secrets manager
- [ ] Dependencies scanned for vulnerabilities
- [ ] HTTPS enforced for all traffic
- [ ] Security headers configured (CSP, HSTS)
- [ ] Rate limiting enabled on public APIs
- [ ] Sensitive data encrypted at rest
- [ ] Security events logged and monitored

## FAQ

**Q: How often should I update dependencies?**
A: At least monthly. Enable Dependabot or Renovate for automated PRs.

**Q: Is JWT secure?**
A: JWT is secure when implemented correctly: short expiry, strong signing algorithms (RS256/ES256), secure secret storage, and HTTPS-only transmission.

**Q: Should I encrypt everything in the database?**
A: Encrypt sensitive fields (PII, credentials, tokens). At-rest encryption should be enabled at the [database](/guides/databases/database-design-guide) level.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Hardening Node.js API for Production

```javascript
// 1. Helmet: HTTP security headers
const helmet = require("helmet");
app.use(helmet());
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security: max-age=31536000
// Content-Security-Policy: default-src self

// 2. Rate limiting
const rateLimit = require("express-rate-limit");
app.use("/api", rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,              // 100 requests per minute
  message: "Too many requests"
}));

// 3. Strict CORS
const cors = require("cors");
app.use(cors({
  origin: ["https://app.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// 4. Input validation (Zod)
const { z } = require("zod");
const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9 ]+$/)
});
app.post("/api/users", (req, res) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  // ... process
});

// 5. SQL injection prevention (parameterized queries)
app.get("/api/users/:id", async (req, res) => {
  // NEVER: `SELECT * FROM users WHERE id = ${req.params.id}`
  // ALWAYS: parameterized queries
  const result = await pool.query(
    "SELECT id, email, name FROM users WHERE id = $1",
    [req.params.id]
  );
  res.json(result.rows[0]);
});

// 6. Secure JWT
const jwt = require("jsonwebtoken");
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "15m", algorithm: "RS256" }
);

// 7. Audit logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
      userId: req.user?.id,
    });
  });
  next();
});

// 8. Dependency scanning in CI
// npm audit --audit-level=high
// npx snyk test
// npx trivy fs .
```

### Which security headers are mandatory?

X-Content-Type-Options: nosniff (prevent MIME sniffing), Strict-Transport-Security: max-age=31536000 (enforce HTTPS), X-Frame-Options: DENY (prevent clickjacking), Content-Security-Policy: default-src self (prevent XSS), Referrer-Policy: no-referrer (minimize exposed info). Use helmet() in Express to configure all of them automatically.
