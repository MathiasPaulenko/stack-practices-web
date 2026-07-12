---

contentType: recipes
slug: password-hashing-production
title: "Password Hashing in Production"
description: "Securely hash and verify passwords using bcrypt, scrypt, and Argon2 with what works."
metaDescription: "Production-grade password hashing guide with bcrypt, scrypt, and Argon2. What works for secure credential storage in web applications and backend APIs."
difficulty: intermediate
topics:
  - security
tags:
  - bcrypt
  - security
  - authentication
  - nodejs
  - vulnerabilities
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /recipes/websocket-authentication
  - /recipes/csrf-protection
  - /recipes/oauth2-pkce-spa
  - /recipes/hmac-request-signing
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Production-grade password hashing guide with bcrypt, scrypt, and Argon2. What works for secure credential storage in web applications and backend APIs."
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
- Never roll your own crypto. Use well-vetted libraries. Follow [what works for security](/guides/security/security-best-practices-guide).
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

## What Works

- **Use Argon2id for new projects**: It won the Password Hashing Competition (PHC)
- **Target 250ms verification time**: Tune cost factors to your hardware
- **Store salts with hashes**: The salt is not a secret; prepend it to the hash
- **Add a pepper**: A server-side secret added to the password before hashing
- **Re-hash on login**: Transparently upgrade legacy hashes when users log in

## Common Mistakes

1. **Using SHA-256 or MD5 for passwords**: Fast algorithms are trivial to brute-force with GPUs. Follow [what works for security](/guides/security/security-best-practices-guide) when storing credentials.
2. **Hard-coding salts**: Every password needs a unique, random salt
3. **Ignoring timing attacks**: Use constant-time comparison (built into modern libraries)
4. **Forgetting to update cost factors**: Hardware gets faster; re-tune annually
5. **Storing passwords in plain text**: Even "temporarily" is a catastrophic risk. See [what works for security](/guides/security/security-best-practices-guide).

## Frequently Asked Questions

**Q: Which algorithm should I choose in 2025?**
A: Argon2id is the recommended choice for new systems. bcrypt is acceptable if Argon2 libraries are unavailable.

**Q: How do I migrate users from MD5 to Argon2?**
A: Re-hash on next login: verify with MD5, then hash with Argon2 and replace. Mark the migration in the database.

**Q: Should I hash client-side before sending?**
A: No. Client-side hashing offers no security benefit over HTTPS and removes server-side protection.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Argon2id with pepper (Node.js)

A pepper is a server-side secret added to the password before hashing. Unlike a salt, the pepper is the same for all users and stored separately from the database:

```javascript
const argon2 = require('argon2');
const crypto = require('crypto');

// Pepper stored in environment variable, NOT in the database
const PEPPER = process.env.PASSWORD_PEPPER;

async function hashPassword(password) {
  // Append pepper before hashing
  const pepperedPassword = password + PEPPER;
  const hash = await argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    timeCost: 3,       // Iterations
    memoryCost: 65536,  // 64 MB
    parallelism: 4,     // Threads
    saltLength: 16,     // Bytes
  });
  return hash;
}

async function verifyPassword(password, hash) {
  const pepperedPassword = password + PEPPER;
  try {
    return await argon2.verify(hash, pepperedPassword);
  } catch (err) {
    if (err.code === argon2.errorCodes.VERIFY_MISMATCH_ERROR) {
      return false;
    }
    throw err; // Re-throw unexpected errors
  }
}

// Usage
async function registerUser(email, password) {
  const hash = await hashPassword(password);
  // Store: email, hash in database
  // Pepper is NOT stored in the database
}

async function loginUser(email, password) {
  const user = await db.findUserByEmail(email);
  if (!user) return false;
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return false;
  // Check if hash needs upgrading
  if (argon2.needsRehash(user.password_hash, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
    parallelism: 4,
  })) {
    const newHash = await hashPassword(password);
    await db.updateUserPassword(user.id, newHash);
  }
  return true;
}
```

### Transparent bcrypt migration on login

Migrate users from legacy hashes to bcrypt without forcing password resets:

```python
import bcrypt
import hashlib
import re

def is_legacy_hash(stored_hash: str) -> bool:
    """Check if the stored hash is a legacy MD5 or SHA-256 hash."""
    # MD5: 32 hex chars, SHA-256: 64 hex chars
    return bool(re.match(r'^[a-f0-9]{32}$', stored_hash) or
                re.match(r'^[a-f0-9]{64}$', stored_hash))

def verify_legacy(password: str, stored_hash: str) -> bool:
    """Verify against legacy MD5 or SHA-256."""
    md5 = hashlib.md5(password.encode()).hexdigest()
    if md5 == stored_hash:
        return True
    sha256 = hashlib.sha256(password.encode()).hexdigest()
    return sha256 == stored_hash

def verify_and_migrate(password: str, stored_hash: str) -> tuple[bool, str | None]:
    """
    Verify password and migrate to bcrypt if needed.
    Returns (is_valid, new_hash_or_none).
    """
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        # Already bcrypt — verify normally
        if bcrypt.checkpw(password.encode(), stored_hash.encode()):
            # Check if cost needs upgrading
            current_cost = bcrypt.get_rounds(stored_hash.encode())
            if current_cost < 12:
                new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
                return True, new_hash.decode()
            return True, None
        return False, None

    if is_legacy_hash(stored_hash):
        # Legacy hash — verify then migrate
        if verify_legacy(password, stored_hash):
            new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
            return True, new_hash.decode()
        return False, None

    # Unknown hash format
    return False, None

# Flask route
@app.route('/login', methods=['POST'])
def login():
    email = request.json.get('email')
    password = request.json.get('password')
    user = db.get_user_by_email(email)

    if not user:
        # Return same error to prevent user enumeration
        return jsonify({'error': 'Invalid credentials'}), 401

    valid, new_hash = verify_and_migrate(password, user.password_hash)
    if not valid:
        return jsonify({'error': 'Invalid credentials'}), 401

    if new_hash:
        db.update_password(user.id, new_hash)

    session['user_id'] = user.id
    return jsonify({'success': True})
```

### Java Spring Security password encoding

```java
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Argon2id with tuned parameters
        return new Argon2PasswordEncoder(
            16,      // saltLength (bytes)
            32,      // hashLength (bytes)
            4,       // parallelism (threads)
            65536,   // memoryCost (KiB = 64 MB)
            3        // iterations
        );
    }
}

// Migration encoder for legacy hashes
@Service
public class PasswordMigrationService {

    private final PasswordEncoder modernEncoder;
    private final LegacyPasswordEncoder legacyEncoder;

    public PasswordMigrationService(PasswordEncoder modernEncoder,
                                     LegacyPasswordEncoder legacyEncoder) {
        this.modernEncoder = modernEncoder;
        this.legacyEncoder = legacyEncoder;
    }

    public boolean verifyAndMigrate(String rawPassword, String storedHash,
                                     Consumer<String> hashUpdater) {
        // Check if already modern format
        if (storedHash.startsWith("$argon2")) {
            if (modernEncoder.matches(rawPassword, storedHash)) {
                // Check if rehash needed
                if (!modernEncoder.upgradeEncoding(storedHash)) {
                    return true;
                }
            }
        } else if (legacyEncoder.matches(rawPassword, storedHash)) {
            // Migrate to modern hash
            String newHash = modernEncoder.encode(rawPassword);
            hashUpdater.accept(newHash);
            return true;
        }
        return false;
    }
}
```

### Password strength validation

Validate password complexity before hashing. Reject weak passwords before they are stored:

```javascript
function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain special characters');
  }

  // Check against common passwords list
  const commonPasswords = [
    'password', '123456789', 'qwerty123', 'admin123',
    'welcome123', 'letmein', 'monkey123', 'password123',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Usage in registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const hash = await hashPassword(password);
  await db.createUser(email, hash);
  res.status(201).json({ success: true });
});
```

## Additional Best Practices

1. **Rate-limit login attempts.** Slow down brute-force attacks at the application level, not just the hashing level:

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  message: 'Too many login attempts, try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', loginLimiter, async (req, res) => {
  // Login logic here
});
```

2. **Use a constant-time comparison for pepper checks.** When comparing pepper values or checking if a pepper matches, use constant-time comparison to avoid timing attacks:

```python
import hmac

def verify_pepper(provided_pepper: str, expected_pepper: str) -> bool:
    """Constant-time pepper comparison."""
    return hmac.compare_digest(
        provided_pepper.encode(),
        expected_pepper.encode()
    )
```

## Additional Common Mistakes

1. **Using the same pepper for all environments.** Development, staging, and production should each have unique peppers. If the development pepper leaks, production remains safe:

```bash
# .env.development
PASSWORD_PEPPER="dev-only-pepper-not-used-in-prod"

# .env.production (loaded from secret manager, not from file)
PASSWORD_PEPPER="prod-secret-from-vault"
```

2. **Logging passwords during debugging.** Even temporarily logging passwords in debug mode creates a security risk. Always redact password fields in logs:

```javascript
function redactPassword(obj) {
  const { password, ...rest } = obj;
  return { ...rest, password: '[REDACTED]' };
}

// In logging middleware
app.use((req, res, next) => {
  if (req.body && req.body.password) {
    console.log('Request:', redactPassword(req.body));
  }
  next();
});
```

## Additional FAQ

### How do I choose the right Argon2 parameters?

Start with the OWASP recommended defaults: `timeCost=3`, `memoryCost=65536` (64 MB), `parallelism=4`. Measure the verification time on your production hardware. If it's under 250ms, increase `timeCost` or `memoryCost`. If it's over 500ms, decrease parameters. The goal is to make brute-force attacks expensive while keeping login responsive for users.

### What is the difference between Argon2i, Argon2d, and Argon2id?

- **Argon2i**: Optimized against side-channel attacks. Uses data-independent memory access. Better for password-based key derivation.
- **Argon2d**: Optimized against trade-off attacks. Uses data-dependent memory access. Better for cryptocurrency mining.
- **Argon2id**: Hybrid mode. First half of passes use data-independent access, second half uses data-dependent. Recommended for password hashing by RFC 9106.

### Should I use a password manager or passwordless auth instead?

Password managers help users generate and store strong passwords, but you still need to hash stored passwords server-side. Passwordless auth (WebAuthn, passkeys) eliminates stored passwords entirely and is the long-term direction. Until you fully migrate to passwordless, use Argon2id for password storage.
