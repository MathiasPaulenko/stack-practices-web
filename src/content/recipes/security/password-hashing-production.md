---
contentType: recipes
slug: password-hashing-production
title: "Password Hashing in Production"
description: "Securely hash and verify passwords using bcrypt, scrypt, and Argon2 with best practices."
metaDescription: "Production-grade password hashing guide with bcrypt, scrypt, and Argon2. Best practices for secure credential storage in web applications and backend APIs."
difficulty: intermediate
topics:
  - security
tags:
  - bcrypt
  - security
  - authentication
  - nodejs
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /recipes/websocket-authentication
  - /recipes/csrf-protection
  - /recipes/oauth2-pkce-spa
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Production-grade password hashing guide with bcrypt, scrypt, and Argon2. Best practices for secure credential storage in web applications and backend APIs."
  keywords:
    - bcrypt
    - security
    - authentication
    - nodejs
---
## Overview

Storing passwords securely is one of the most critical responsibilities of any application. Modern password hashing algorithms like bcrypt, scrypt, and Argon2 are designed to be slow and memory-hard, making brute-force attacks computationally infeasible even if the database is compromised.

## When to Use

Use this resource when:
- Implementing user authentication from scratch
- Migrating from legacy hashing (MD5, SHA-1) to modern algorithms
- Choosing parameters for bcrypt, scrypt, or Argon2
- Auditing an existing authentication system

## Solution

### bcrypt (Node.js)

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12; // Adjust based on hardware (10-14 typical)
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### Argon2 (Python)

```python
import argon2

ph = argon2.PasswordHasher(
    time_cost=3,      # Iterations
    memory_cost=65536, # 64 MB in KiB
    parallelism=4     # Threads
)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hash: str) -> bool:
    try:
        ph.verify(hash, password)
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False
```

### scrypt (Go)

```go
package main

import (
    "golang.org/x/crypto/scrypt"
    "crypto/rand"
    "encoding/base64"
)

func hashPassword(password string) (string, error) {
    salt := make([]byte, 16)
    rand.Read(salt)
    hash, err := scrypt.Key([]byte(password), salt, 32768, 8, 1, 32)
    if err != nil { return "", err }
    return base64.StdEncoding.EncodeToString(salt) + "$" + base64.StdEncoding.EncodeToString(hash), nil
}
```

## Explanation

| Algorithm | Memory-Hard | Configurable | Recommended For |
|-----------|-------------|--------------|-----------------|
| bcrypt | No | Cost factor only | General use, wide library support |
| scrypt | Yes | Cost + memory + parallelism | Embedded, Go projects |
| Argon2 | Yes (winner of PHC) | Time + memory + parallelism | New projects, highest security |

**Critical rules**:
- Never roll your own crypto. Use well-vetted libraries. Follow [security best practices](/guides/security/security-best-practices-guide).
- Salt must be unique per password and stored alongside the hash.
- Pepper (server-side secret) adds defense-in-depth but is not a substitute for hashing. Store peppers in a [secret manager](/recipes/security/vault-dynamic-credentials).
- Re-hash on login if cost parameters increase.

## Variants

| Language | Library | Algorithm | Notes |
|----------|---------|-----------|-------|
| Node.js | bcrypt | bcrypt | Most popular; native bindings |
| Python | argon2-cffi | Argon2 | Winner of Password Hashing Competition |
| Go | golang.org/x/crypto | scrypt, bcrypt, Argon2 | Standard library extensions |
| Java | spring-security-crypto | bcrypt, Argon2 | Spring abstraction |
| Rust | argon2 | Argon2 | zeroize support for memory clearing |

## Best Practices

- **Use Argon2id for new projects**: It won the Password Hashing Competition (PHC)
- **Target 250ms verification time**: Tune cost factors to your hardware
- **Store salts with hashes**: The salt is not a secret; prepend it to the hash
- **Add a pepper**: A server-side secret added to the password before hashing
- **Re-hash on login**: Transparently upgrade legacy hashes when users log in

## Common Mistakes

1. **Using SHA-256 or MD5 for passwords**: Fast algorithms are trivial to brute-force with GPUs. Follow [security best practices](/guides/security/security-best-practices-guide) for credential storage.
2. **Hard-coding salts**: Every password needs a unique, random salt
3. **Ignoring timing attacks**: Use constant-time comparison (built into modern libraries)
4. **Forgetting to update cost factors**: Hardware gets faster; re-tune annually
5. **Storing passwords in plain text**: Even "temporarily" is a catastrophic risk. See [security best practices](/guides/security/security-best-practices-guide).

## Frequently Asked Questions

**Q: Which algorithm should I choose in 2025?**
A: Argon2id is the recommended choice for new systems. bcrypt is acceptable if Argon2 libraries are unavailable.

**Q: How do I migrate users from MD5 to Argon2?**
A: Re-hash on next login: verify with MD5, then hash with Argon2 and replace. Mark the migration in the database.

**Q: Should I hash client-side before sending?**
A: No. Client-side hashing offers no security benefit over HTTPS and removes server-side protection.
