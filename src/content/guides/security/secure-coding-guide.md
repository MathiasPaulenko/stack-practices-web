---



contentType: guides
slug: secure-coding-guide
title: "Secure Coding Practices — By Language and Pattern"
description: "A practical guide to secure coding practices across languages: input validation, memory safety, authentication, and defensive patterns for Python, Java, JavaScript, and Go."
metaDescription: "Learn secure coding practices by language. Input validation, memory safety, auth patterns, and defensive coding for Python, Java, JavaScript, and Go."
difficulty: intermediate
topics:
  - security
  - testing
tags:
  - secure-coding
  - input-validation
  - memory-safety
  - authentication
  - defensive-programming
  - guide
relatedResources:
  - /guides/owasp-top-10-guide
  - /guides/secrets-management-guide
  - /guides/cryptography-basics-guide
  - /guides/compliance-gdpr-guide
  - /guides/threat-modeling-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn secure coding practices by language. Input validation, memory safety, auth patterns, and defensive coding for Python, Java, JavaScript, and Go."
  keywords:
    - secure-coding
    - input-validation
    - memory-safety
    - authentication
    - defensive-programming
    - guide



---

## Overview

Secure coding is the practice of writing software that is resistant to vulnerabilities and attacks. It is not a single technique but a mindset: validate every assumption, distrust all input, and design for failure. Below is a practical guide to language-specific patterns and universal defensive techniques that apply regardless of your stack.

## When to Use


- For alternatives, see [Penetration Test Scope Template](/docs/pen-test-scope-template/).

- You are writing code that processes user input or sensitive data
- You need to prevent the most common vulnerability classes
- You are onboarding developers to a security-conscious codebase
- You want to establish secure coding standards for your team

## Input Validation

The most fundamental security control: never trust input from users, files, APIs, or databases without validation.

### Whitelist Validation

Reject what you do not explicitly allow.

```python
import re
from pydantic import BaseModel, validator

class UserRegistration(BaseModel):
    email: str
    username: str

    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]{3,30}$', v):
            raise ValueError('Invalid username')
        return v
```

### Type Safety

Use strong typing to prevent type confusion attacks.

```typescript
// Validate API payloads with Zod
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});

const user = UserSchema.parse(req.body);
```

### File Upload Validation

```python
import magic

ALLOWED_TYPES = {'image/png', 'image/jpeg', 'application/pdf'}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_upload(file):
    if file.size > MAX_SIZE:
        raise ValueError('File too large')
    detected = magic.from_buffer(file.read(1024), mime=True)
    if detected not in ALLOWED_TYPES:
        raise ValueError('Unsupported file type')
```

## Memory Safety

### Rust — Ownership and Borrowing

Rust prevents memory errors at compile time.

```rust
// Safe: ownership prevents use-after-free
fn process(data: Vec<u8>) {
    let slice = &data[0..10];
    println!("{:?}", slice);
} // data dropped here; no dangling references

// Unsafe: requires explicit unsafe block
unsafe {
    let raw = some_ptr.as_mut().unwrap();
}
```

### Go — Bounds Checking

```go
// Safe slice access with bounds check
func safeAccess(data []byte, index int) byte {
    if index < 0 || index >= len(data) {
        panic("index out of bounds")
    }
    return data[index]
}
```

### Java — Avoid Deserialization of Untrusted Data

```java
// Dangerous: ObjectInputStream with untrusted data
ObjectInputStream ois = new ObjectInputStream(untrustedInput);
Object obj = ois.readObject(); // Can execute arbitrary code

// Safer: use JSON with strict schema validation
MyClass obj = objectMapper.readValue(json, MyClass.class);
```

## Authentication Patterns

### Password Handling

```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

### JWT What Works

```python
import jwt
from datetime import datetime, timedelta

def create_token(user_id: str, secret: str) -> str:
    payload = {
        'sub': user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=1),
        'jti': generate_unique_id()  # Prevent replay
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def verify_token(token: str, secret: str) -> dict:
    return jwt.decode(token, secret, algorithms=['HS256'])
```

### Session Management

```java
// HttpOnly, Secure, SameSite cookies
Cookie sessionCookie = new Cookie("session", sessionId);
sessionCookie.setHttpOnly(true);
sessionCookie.setSecure(true);
sessionCookie.setAttribute("SameSite", "Strict");
sessionCookie.setMaxAge(3600); // 1 hour
response.addCookie(sessionCookie);
```

## Defensive Patterns

### Fail Securely

```python
def withdraw(account, amount):
    if amount <= 0:
        raise ValueError("Invalid amount")
    if account.balance < amount:
        raise InsufficientFunds("Not enough balance")
    
    # Atomic operation: deduct first, then transfer
    account.balance -= amount
    transaction.record(account, amount)
```

### Defense in Depth

```
┌─────────────────────────────────────────┐
│         WAF / CDN (Layer 7)             │
├─────────────────────────────────────────┤
│         API Gateway (Rate Limit)        │
├─────────────────────────────────────────┤
│         Application (Input Validation)  │
├─────────────────────────────────────────┤
│         Database (Parameterized Query)  │
├─────────────────────────────────────────┤
│         Audit Logs (Monitoring)           │
└─────────────────────────────────────────┘
```

### Secure Defaults

- New users have no permissions until explicitly granted
- Capabilities are disabled until enabled
- Errors reveal minimal information to attackers
- Logging is verbose for security events but never logs secrets

## Language-Specific Checklist

| Language | Key Risks | Mitigations |
|----------|-----------|-------------|
| Python | Pickle RCE, eval/exec | Use JSON, avoid `eval`, lint with Bandit |
| Java | Deserialization, XXE | Use Jackson safely, disable DTDs |
| JavaScript | Prototype pollution, XSS | Validate objects, escape output |
| Go | Race conditions, panic leaks | Use `race` detector, recover panics |
| Rust | Unsafe blocks, unwrap abuse | Minimize `unsafe`, use `?` operator |

## Common Mistakes

- **Logging sensitive data** — never log passwords, tokens, or PII
- **Ignoring compiler warnings** — warnings often indicate security issues
- **Copy-pasting code from Stack Overflow** — verify security implications
- **Using `eval` or equivalent** — almost always unnecessary and dangerous
- **Relying solely on client-side validation** — always validate server-side

## FAQ

**Should I write my own crypto?**
No. Use well-vetted libraries: libsodium, OpenSSL, Bouncy Castle, or platform-native crypto.

**How do I handle secrets in environment variables?**
Environment variables are better than hardcoding but still visible to process dumps. Use dedicated secret managers for production.

**What is the most important secure coding principle?**
Validate every input, fail securely, and minimize the attack surface. Complexity is the enemy of security.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Secure Code Review for Payment API

```text
System: Payment API Node.js, 20 endpoints
Goal: Security code review before every release

Secure code review checklist:
  | Category | Item | Tool |
  |----------|------|------|
  | Input | Schema validation | Zod safeParse |
  | Input | String sanitization | DOMPurify (HTML), escape SQL |
  | Auth | JWT verified on every request | middleware |
  | Auth | RBAC + scope per resource | OPA or middleware |
  | Auth | Rate limiting on auth endpoints | express-rate-limit |
  | Crypto | bcrypt for passwords (rounds 12+) | bcrypt |
  | Crypto | AES-256-GCM for sensitive data | crypto module |
  | Crypto | TLS 1.3 mandatory | nginx/ALB config |
  | Output | No stack traces exposed | error handler |
  | Output | No sensitive data in responses | DTO + mapping |
  | Output | Security headers | helmet() |
  | Session | JWT expiry (15min) | jwt.sign |
  | Session | Refresh token rotation | DB tracking |
  | Session | Logout invalidates token | Redis blacklist |
  | Logging | No secrets/PII in logs | winston redact |
  | Logging | Audit log of critical actions | audit table |
  | Deps | npm audit in CI | npm audit |
  | Deps | Snyk scan in CI | snyk test |
  | Deps | License check | license-checker |
  | Config | NODE_ENV=production | env var |
  | Config | Strict CORS | cors middleware |
  | Config | CSP headers | helmet contentSecurityPolicy |

```javascript
// Example: validation + auth + RBAC middleware
const { z } = require("zod");

const transferSchema = z.object({
  destinationAccountId: z.string().uuid(),
  amount: z.number().positive().max(100000),  // max 100K
  currency: z.enum(["USD", "EUR", "GBP"]),
  description: z.string().max(500).optional()
});

// Middleware chain: auth -> RBAC -> input validation -> handler
app.post("/api/transfers",
  authMiddleware,           // Verify JWT
  roleMiddleware("user"),   // Verify role
  (req, res, next) => {
    const result = transferSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    req.body = result.data;
    next();
  },
  async (req, res) => {
    // Verify ownership: user can only transfer from their accounts
    const account = await db.query(
      "SELECT owner_id FROM accounts WHERE id = $1",
      [req.body.sourceAccountId]
    );
    if (account.rows[0].owner_id !== req.user.id) {
      // Audit log of unauthorized access attempt
      await auditLog({ userId: req.user.id, action: "UNAUTHORIZED_TRANSFER", ip: req.ip });
      return res.status(403).json({ error: "Forbidden" });
    }
    // Execute transfer
    const transfer = await processTransfer(req.body);
    // Audit log
    await auditLog({ userId: req.user.id, action: "TRANSFER", amount: req.body.amount });
    res.json(transfer);
  }
);
```

Lessons:
  - Input validation on every endpoint, no exceptions
  - Verify ownership: IDOR is the most common vulnerability
  - Audit log of critical actions and unauthorized attempts
  - Never expose stack traces in responses
  - npm audit + Snyk in CI: vulnerable deps are real risk
```

### What do I look for in a secure code review?

Input validation (all fields validated), authorization (verify ownership and role), error handling (no sensitive info exposed), logging (no secrets logged), dependencies (no high CVEs), configuration (CORS, headers, TLS). Use semgrep for automated scanning in CI, but manual review is mandatory for business logic.
