---
contentType: recipes
slug: password-hashing
title: "Password Hashing"
description: "How to securely hash and verify passwords using modern algorithms across Python, JavaScript, and Java."
metaDescription: "Practical password hashing examples in Python, JavaScript, and Java. Use bcrypt, argon2, and PBKDF2 with salt to store passwords securely."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - bcrypt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/handle-errors
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical password hashing examples in Python, JavaScript, and Java. Use bcrypt, argon2, and PBKDF2 with salt to store passwords securely."
  keywords:
    - password hashing
    - bcrypt
    - argon2
    - pbkdf2
    - salt
    - secure passwords
    - python bcrypt
    - node bcrypt
    - java password hashing
---

## Overview

Password hashing is the process of converting a plaintext password into a fixed-length, irreversible string using a one-way cryptographic function. Never store plaintext passwords. Always hash with a unique salt and a slow algorithm designed for passwords.

Modern algorithms like bcrypt, Argon2, and PBKDF2 are intentionally slow to resist brute-force and rainbow-table attacks.

The consequences of getting this wrong are severe. Data breaches involving plaintext or weakly hashed passwords expose millions of user accounts to credential stuffing attacks, where attackers try leaked passwords across other services. High-profile breaches have demonstrated that even large organizations fall victim to improper password storage. Hashing is not optional decoration — it is a fundamental security control that protects your users even when your database is compromised.

This recipe covers the three most common language ecosystems and explains how to choose the right algorithm for your threat model.

## When to Use

Use this recipe when:

- Storing user credentials in a database or user directory
- Implementing [authentication systems](/recipes/authentication/session-management) with username and password flows
- Migrating legacy systems from fast hashes (MD5, SHA-1) to modern password storage
- Validating passwords during login and password-reset flows
- Complying with security standards (PCI-DSS, SOC 2, GDPR) that mandate proper credential protection. See [API Security Checklist](/guides/security/api-security-checklist-guide) for compliance best practices.
- Building admin panels or CLI tools that create service accounts with passwords

## Solution

### Python

Python's `bcrypt` library handles salt generation, hashing, and verification in a single call. The `gensalt` function creates a random salt and embeds the work factor so future verifications can use the same parameters.

```python
import bcrypt

# Hash a password
password = b"supersecret"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password, salt)

# Verify a password
if bcrypt.checkpw(password, hashed):
    print("Password matches")
else:
    print("Invalid password")
```

### JavaScript (Node.js)

The `bcrypt` npm package provides an async API that should always be used in production. The synchronous variants block the event loop and negate the performance benefits of Node's non-blocking architecture.

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  const match = await bcrypt.compare(password, hash);
  return match;
}

// Usage
hashPassword('supersecret').then(hash => {
  verifyPassword('supersecret', hash).then(ok => console.log(ok));
});
```

### Java

Spring Security's `BCryptPasswordEncoder` wraps the underlying bcrypt implementation and handles salt generation transparently. The strength parameter (12) controls the logarithmic work factor.

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

// Hash
String hashed = encoder.encode("supersecret");

// Verify
boolean matches = encoder.matches("supersecret", hashed);
System.out.println(matches);
```

## Explanation

- **Salt**: A random value added to the password before hashing. Even identical passwords produce different hashes when salted, rendering precomputed rainbow-table attacks useless. bcrypt embeds the salt in the output string so no separate storage is needed.
- **Work factor (rounds)**: Controls hashing speed logarithmically. Higher = slower = more secure. 12 is a modern default that produces a hash in roughly 250ms on contemporary hardware. As computers get faster, you should increase this value.
- **bcrypt**: Adaptive hash function based on the Blowfish cipher. Built-in salt handling and a tunable work factor make it the most widely supported modern choice.
- **Argon2**: Winner of the 2015 Password Hashing Competition. It provides resistance against GPU and ASIC attacks by being memory-hard, making it the best choice for new systems with no legacy constraints.
- **PBKDF2**: NIST-approved and FIPS-compliant. Slower than bcrypt but widely supported in enterprise and government environments where compliance mandates its use.
- **scrypt**: Memory-hard function similar to Argon2. It was the predecessor to Argon2 and remains a solid choice if Argon2 libraries are unavailable in your stack.

## Variants

| Algorithm | Strength | Speed | Best For |
|-----------|----------|-------|----------|
| bcrypt | Good | Moderate | General purpose, widely supported |
| Argon2 | Excellent | Tunable | New applications, maximum security |
| PBKDF2 | Good | Slow | Compliance with NIST/FIPS requirements |
| scrypt | Good | Memory-hard | Resists GPU/ASIC attacks |

## Best Practices

- **Never roll your own crypto**: Use established libraries (bcrypt, argon2, passlib). Cryptography is notoriously easy to get wrong in subtle ways that only become apparent under attack.
- **Always use a salt**: Unique per password, automatically handled by bcrypt. Without salt, two users with the same password will have identical hashes, leaking that relationship to anyone with database access.
- **Use a sufficient work factor**: 12+ rounds for bcrypt, adjust as hardware improves. Benchmark your target duration (~250ms) and increase the factor every 2-3 years as CPUs get faster.
- **Re-hash on login**: Gradually upgrade work factors when users authenticate. Store the new hash and mark the account as upgraded so you do not re-hash again on the next login.
- **Never compare plaintext**: Always use library-provided verify functions. These perform constant-time comparison to prevent timing attacks that could leak information about the password.
- **Hash before any other transformation**: Do not apply lowercase, trim, or other normalization before hashing. Some users intentionally include mixed-case and spaces in passphrases.
- **Store hashes in a dedicated column**: Never store the salt separately from the hash. bcrypt and Argon2 encode the salt inside the hash string for this reason.

## Common Mistakes

- **Storing passwords in plaintext or reversible encryption**: If your database is breached, attackers gain immediate access to every account. Hashing is irreversible by design.
- **Using fast hashes like MD5, SHA-1, or SHA-256 for passwords**: These are designed for speed, which benefits attackers running brute-force attacks. A modern GPU can test billions of SHA-256 hashes per second.
- **Reusing salts across multiple users**: Defeats the primary purpose of salting. If two users share the same password and the same salt, their hashes will be identical.
- **Hard-coding salts in source code**: Source code is often stored in version control. A hard-coded salt is as bad as no salt at all, since attackers will find it in the repository.
- **Using insufficient work factors (e.g., bcrypt with <10 rounds)**: Faster hashing means attackers can test more passwords per second. A work factor of 10 completes in ~100ms; 12 completes in ~250ms. That extra delay adds massive protection at negligible user cost.
- **Storing the hash without the algorithm identifier**: Always store the full bcrypt/Argon2 output string which includes the algorithm, cost, salt, and hash. This ensures you can re-verify correctly even if you later change algorithms.
- **Sending passwords over unencrypted connections**: Hashing protects stored passwords, but the password must travel securely to your server first. Always use [TLS](/recipes/api/nginx-reverse-proxy) for login forms and API endpoints.

## Frequently Asked Questions

**Q: Should I use SHA-256 for password hashing?**
A: No. SHA-256 is designed to be fast. Password hashing must be intentionally slow to resist brute force. Use bcrypt, Argon2, or PBKDF2 instead.

**Q: How do I migrate users from old MD5 hashes?**
A: Re-hash existing MD5 hashes with bcrypt on next login, then replace the old hash in your database. See [Logging](/recipes/api/logging) for monitoring migration progress. Mark migrated accounts so you do not attempt to re-hash them again. Until a user logs in, their legacy hash remains in place as a stopgap.

**Q: What work factor should I use for bcrypt?**
A: Start with 12. Benchmark so hashing takes ~250ms on your production hardware. Increase the factor every 2-3 years as CPUs get faster. The extra quarter-second is imperceptible to users but dramatically increases attack cost.

**Q: Is Argon2 better than bcrypt?**
A: Yes, for new systems. Argon2 is memory-hard, making GPU and ASIC attacks far more expensive. However, bcrypt is still perfectly secure for most applications and has wider library support. If you have no legacy data, prefer Argon2.

**Q: Can I use the same hash for both authentication and API tokens?**
A: No. Authentication hashes are slow by design. API tokens should use fast, deterministic hashes (like HMAC-SHA-256) because they are verified on every request and must not add latency to every API call.
