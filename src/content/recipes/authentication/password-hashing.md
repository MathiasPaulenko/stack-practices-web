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
  - password
  - hashing
  - bcrypt
  - security
  - python
  - javascript
  - java
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/handle-errors
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-10"
author: "StackPractices"
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

## When to Use

Use this recipe when:

- Storing user credentials in a database
- Implementing authentication systems
- Migrating legacy systems to modern password storage
- Validating passwords during login

## Solution

### Python

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

- **Salt**: A random value added to the password before hashing. Prevents rainbow-table attacks.
- **Work factor (rounds)**: Controls hashing speed. Higher = slower = more secure. 12 is a modern default.
- **bcrypt**: Adaptive hash function based on Blowfish cipher. Built-in salt handling.
- **Argon2**: Winner of the Password Hashing Competition. Best choice for new systems.
- **PBKDF2**: NIST-approved. Slower than bcrypt but widely supported.

## Variants

| Algorithm | Strength | Speed | Best For |
|-----------|----------|-------|----------|
| bcrypt | Good | Moderate | General purpose, widely supported |
| Argon2 | Excellent | Tunable | New applications, maximum security |
| PBKDF2 | Good | Slow | Compliance with NIST/FIPS requirements |
| scrypt | Good | Memory-hard | Resists GPU/ASIC attacks |

## Best Practices

- **Never roll your own crypto**: Use established libraries (bcrypt, argon2, passlib)
- **Always use a salt**: Unique per password, automatically handled by bcrypt
- **Use a sufficient work factor**: 12+ rounds for bcrypt, adjust as hardware improves
- **Re-hash on login**: Gradually upgrade work factors when users authenticate
- **Never compare plaintext**: Always use library-provided verify functions

## Common Mistakes

- Storing passwords in plaintext or reversible encryption
- Using fast hashes like MD5, SHA-1, or SHA-256 for passwords
- Reusing salts across multiple users
- Hard-coding salts in source code
- Using insufficient work factors (e.g., bcrypt with <10 rounds)

## Frequently Asked Questions

**Q: Should I use SHA-256 for password hashing?**
A: No. SHA-256 is designed to be fast. Password hashing must be slow to resist brute force. Use bcrypt, Argon2, or PBKDF2.

**Q: How do I migrate users from old MD5 hashes?**
A: Re-hash existing MD5 hashes with bcrypt on next login, then replace the old hash. Mark migrated accounts.

**Q: What work factor should I use for bcrypt?**
A: Start with 12. Benchmark so hashing takes ~250ms on your production hardware. Increase over time.
