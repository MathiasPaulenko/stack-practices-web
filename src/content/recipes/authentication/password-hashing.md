---
contentType: recipes
slug: password-hashing
title: "How to Hash Passwords Securely (Python, JavaScript, Java)"
description: "Learn how to hash and verify passwords with bcrypt, Argon2, and PBKDF2. Practical examples in Python, JavaScript, and Java."
metaDescription: "Secure password hashing examples in Python, JavaScript, and Java. Compare bcrypt, Argon2, and PBKDF2 with salt and learn how to verify passwords safely."
difficulty: intermediate
topics:
  - authentication
  - security
tags:
  - authentication
  - bcrypt
  - argon2
  - pbkdf2
  - security
  - password-hashing
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/session-management
  - /recipes/two-factor-authentication
  - /recipes/encryption-at-rest
  - /recipes/oauth2-login
  - /guides/security-best-practices-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Secure password hashing examples in Python, JavaScript, and Java. Compare bcrypt, Argon2, and PBKDF2 with salt and learn how to verify passwords safely."
  keywords:
    - password hashing
    - bcrypt
    - argon2
    - pbkdf2
    - salt
    - password verification
    - secure passwords
---

## Overview

Passwords are a liability from the moment you store them. If your database is
exposed, plaintext or fast hashes like SHA-256 let attackers try millions of
guesses per second. Password hashing turns a password into a slow, irreversible
string with a unique salt, so a leaked database still costs too much to crack.

Below you will find hash-and-verify examples in Python, JavaScript, and Java,
using bcrypt, Argon2, and PBKDF2.

## When to Use

- Your users sign in with a username and password, and you need to store that
  password. The
  surrounding flow is covered in [Session Management](/recipes/session-management/)
  and [JWT Authentication](/recipes/jwt-authentication/).
- You're migrating away from MD5, SHA-1, or plain SHA-256 password storage.
- You need login or password-reset verification in a web app, API, or CLI tool.
- Your compliance framework (PCI-DSS, SOC 2, GDPR, NIST) requires protected
  credentials. See [API Security Checklist](/guides/api-security-checklist-guide/)
  for related controls.

### When to avoid

- The system has no human users (machine-to-machine traffic). API keys or OAuth2
  fit better there.
- What you actually need is a one-time token, not a stored password hash.
- You want to roll your own hash function. Do not do it. Use a library instead.

## Solution

### Python with bcrypt

```python
import bcrypt

password = b"supersecret"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password, salt)

if bcrypt.checkpw(password, hashed):
    print("ok")
```

### JavaScript (Node.js) with bcrypt

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

hashPassword('supersecret')
  .then(hash => verifyPassword('supersecret', hash))
  .then(ok => console.log(ok));
```

### Java with BCryptPasswordEncoder

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
String hashed = encoder.encode("supersecret");
boolean ok = encoder.matches("supersecret", hashed);
```

### Argon2 (Python)

```python
from argon2 import PasswordHasher

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=1)
hash = ph.hash("supersecret")
ph.verify(hash, "supersecret")
```

### PBKDF2 (Python)

```python
import hashlib, secrets

password = b"supersecret"
salt = secrets.token_bytes(16)
iterations = 600_000
key = hashlib.pbkdf2_hmac("sha256", password, salt, iterations, dklen=32)
```

## Explanation

- **bcrypt** adapts the Blowfish cipher to hash passwords. It embeds the salt
  and work factor in the output, so storage is a single string. It's the safest
  default for most applications, and every major language has a library.
- **Argon2** has been the recommended choice since winning the 2015 Password
  Hashing Competition. It's memory-hard, which makes GPU and ASIC attacks more
  expensive than bcrypt. If the system is new and you can pull in a newer library,
  Argon2 is the stronger choice.
- **PBKDF2** carries NIST approval and FIPS-140 validation, so auditors usually
  accept it. It's CPU-bound and tunable through the iteration count. Use it when
  a standard or auditor mandates it.
- A **salt** is a random value mixed with the password before hashing. It makes
  rainbow tables useless and stops identical passwords from producing the same
  hash.
- The **work factor** decides how long hashing takes. For bcrypt, 12 is a
  reasonable starting point and takes about 250ms on modern hardware. Raise the
  cost factor every few years as CPUs get faster. For PBKDF2, OWASP's current
  guidance is 600,000 iterations with SHA-256.

Think of the work factor as a dial: turn it up until hashing takes a quarter of a
second on your production hardware. That delay is imperceptible to a user logging
in, but it makes an offline brute-force attack hundreds of thousands of times
slower than a fast hash like SHA-256.

## Variants

The three algorithms differ on a few practical criteria, which the table
summarizes.

| Algorithm | When to choose | Trade-off |
| --- | ---------------- | ----------- |
| bcrypt | Default, broad library support | Moderate memory usage, not memory-hard |
| Argon2 | New applications, maximum resistance to hardware attacks | Needs a dedicated library, memory-hard |
| PBKDF2 | NIST/FIPS compliance requirements | CPU-bound, slower than bcrypt |

## Best Practices

- Hash server-side; never trust a client-sent hash. Client-side hashing can be
  bypassed by sending a pre-computed value.
- Every password should get its own random salt. Libraries generate this
  automatically, but verify that you aren't reusing one or hard-coding it.
- Set the work factor so hashing takes 100-250ms on your production hardware, and
  re-benchmark it once a year. Slow is the point.
- Keep the full hash string in one column. It already includes the algorithm,
  cost, salt, and hash, so there's no reason to split it.
- Re-hash on login when the work factor or algorithm is outdated. Mark the
  account as migrated so you don't double-hash.
- Return generic errors for invalid username or password. Different response times
  or messages leak whether the account exists.

## Common Mistakes

- Putting SHA-256, MD5, or SHA-1 in charge of password hashes. They're built for
  speed; a modern GPU can test billions of them per second.
- Storing passwords in plaintext or reversible encryption. A key leak exposes
  every password.
- Hard-coding a salt in source code. It's as bad as no salt once the repository
  is public.
- Reusing the same salt across users. Identical passwords then have identical
  hashes.
- Using work factors below 10 for bcrypt or below 600,000 iterations for PBKDF2.
  Attackers can keep up.
- Comparing hashes with `==` instead of the library's constant-time verify
  function. Timing attacks can leak hash prefixes.
- Hashing after normalization such as `lower()` or `trim()`. Mixed case and spaces
  matter for some passphrases.
- Truncating bcrypt at 72 bytes. bcrypt ignores bytes after 72, so two long
  passwords with the same prefix would match. Pre-hash with SHA-256 only if you
  must allow longer passwords.

## FAQ

### Should I use SHA-256 for passwords?

No. SHA-256 is built for speed, so brute-force attacks tear through it. Use
bcrypt, Argon2, or PBKDF2 instead.

### How do I migrate users from old MD5 or SHA-1 hashes?

Re-hash the existing hash with bcrypt on the next successful login, then replace
the stored value. Mark the account as migrated so you don't re-hash it later. If
a user never logs in, force a password reset.

### What bcrypt cost factor should I use?

Start with 12. Benchmark on your production hardware so hashing takes about
250ms. You will need to raise the cost factor again as CPUs get faster.

### Is Argon2 better than bcrypt?

For new systems, yes. Argon2 is memory-hard, which raises the cost of GPU and
ASIC attacks. bcrypt is still secure and has wider library support. Prefer
Argon2 if you can use a modern library.

### Can I use a password hash as an API token?

No. Password hashes are slow. API tokens need fast verification, such as
HMAC-SHA-256.

### Should I add a pepper to the password?

A pepper is a server-side secret added before hashing. It helps if the database
is leaked without the application secret, but it complicates rotation and key
management. Treat it as an optional extra, not a replacement for a strong
algorithm.
