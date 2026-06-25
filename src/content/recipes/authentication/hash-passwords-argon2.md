---
contentType: recipes
slug: hash-passwords-argon2
title: "Hash Passwords with Argon2"
description: "How to hash and verify passwords securely with Argon2id, the winner of the Password Hashing Competition, with correct parameter tuning and migration strategies from bcrypt."
metaDescription: "Hash and verify passwords securely with Argon2id, the Password Hashing Competition winner, with correct parameter tuning and bcrypt migration strategies."
difficulty: beginner
topics:
  - authentication
tags:
  - authentication
  - argon2
  - password-hashing
  - bcrypt
  - security
  - cryptography
  - recipe
relatedResources:
  - /recipes/authentication/implement-rbac
  - /recipes/authentication/implement-sso-saml
  - /guides/security/secrets-management-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Hash and verify passwords securely with Argon2id, the Password Hashing Competition winner, with correct parameter tuning and bcrypt migration strategies."
  keywords:
    - authentication
    - argon2
    - password-hashing
    - bcrypt
    - security
    - cryptography
    - recipe
---

## Overview

Argon2 won the 2015 Password Hashing Competition and is the recommended algorithm by OWASP, NIST, and the IETF. It resists GPU-based cracking through memory-hard computation, making brute-force attacks thousands of times more expensive than with SHA-256 or even bcrypt. Argon2id combines the strengths of Argon2d (GPU resistance) and Argon2i (side-channel resistance), making it the default recommendation for all new systems.

## When to Use

- Storing passwords for any system where brute-force resistance matters
- Replacing bcrypt, PBKDF2, or scrypt in existing systems
- Building a new authentication system from scratch
- Complying with modern security standards (OWASP ASVS, NIST 800-63B)
- Migrating from legacy algorithms (MD5, SHA-1) that are no longer secure

## When NOT to Use

- You are already using bcrypt with cost factor ≥ 12 and have no compliance mandate to migrate — bcrypt is still secure
- You need to hash passwords in a memory-constrained embedded device — Argon2 is memory-intensive
- You are implementing a proof-of-concept where password security is not the focus — but fix this before production

## Step-by-Step Implementation

### Python (argon2-cffi)

```bash
pip install argon2-cffi
```

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Recommended parameters (OWASP 2023)
ph = PasswordHasher(
    time_cost=3,        # iterations (higher = slower)
    memory_cost=65536, # 64 MiB (higher = more memory)
    parallelism=4,      # threads (match CPU cores)
    hash_len=32,        # output length
    salt_len=16         # salt length
)

def hash_password(password: str) -> str:
    """Hash a password for storing."""
    return ph.hash(password)

def verify_password(password: str, hash_str: str) -> bool:
    """Verify a password against a stored hash."""
    try:
        ph.verify(hash_str, password)
        return True
    except VerifyMismatchError:
        return False

# Rehash on parameter upgrade
def verify_and_rehash(password: str, hash_str: str) -> tuple[bool, str | None]:
    try:
        ph.verify(hash_str, password)
        if ph.check_needs_rehash(hash_str):
            return True, ph.hash(password)
        return True, None
    except VerifyMismatchError:
        return False, None

# Usage
hashed = hash_password("user_password_123")
print(hashed)
# $argon2id$v=19$m=65536,t=3,p=4$...$...

valid, new_hash = verify_and_rehash("user_password_123", hashed)
if valid and new_hash:
    update_stored_hash_in_db(new_hash)
```

### Node.js (argon2)

```bash
npm install argon2
```

```javascript
import argon2 from 'argon2';

// Hash with OWASP-recommended parameters
async function hashPassword(password) {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,    // 64 MiB
        timeCost: 3,          // iterations
        parallelism: 4,       // threads
        hashLength: 32,
        saltLength: 16
    });
}

async function verifyPassword(password, hash) {
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
}

// Rehash on upgrade
async function verifyAndRehash(password, hash) {
    const valid = await verifyPassword(password, hash);
    if (!valid) return { valid: false, newHash: null };

    // Check if hash needs rehashing (parameters changed)
    const needsRehash = argon2.needsRehash(hash, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });

    const newHash = needsRehash ? await hashPassword(password) : null;
    return { valid: true, newHash };
}

// Express middleware example
app.post('/login', async (req, res) => {
    const user = await db.users.findOne({ email: req.body.email });
    if (!user) {
        // Constant-time comparison to prevent timing attacks
        await argon2.hash('dummy');
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { valid, newHash } = await verifyAndRehash(req.body.password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (newHash) {
        await db.users.updateOne(
            { _id: user._id },
            { $set: { password_hash: newHash } }
        );
    }

    req.session.userId = user._id;
    res.json({ success: true });
});
```

### Java (Spring Security + Bouncy Castle)

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk18on</artifactId>
    <version>1.77</version>
</dependency>
```

```java
import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;
import org.bouncycastle.util.encoders.Base64;
import java.security.SecureRandom;

public class Argon2PasswordHasher {
    private static final int SALT_LENGTH = 16;
    private static final int HASH_LENGTH = 32;
    private static final int ITERATIONS = 3;
    private static final int MEMORY = 65536;  // 64 MiB
    private static final int PARALLELISM = 4;

    private final SecureRandom random = new SecureRandom();

    public String hash(String password) {
        byte[] salt = new byte[SALT_LENGTH];
        random.nextBytes(salt);

        Argon2Parameters params = new Argon2Parameters.Builder()
            .withSalt(salt)
            .withParallelism(PARALLELISM)
            .withMemoryAsKB(MEMORY)
            .withIterations(ITERATIONS)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13)
            .build();

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(params);

        byte[] result = new byte[HASH_LENGTH];
        generator.generateBytes(password.toCharArray(), result);

        // Encode: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
        String saltB64 = Base64.toBase64String(salt);
        String hashB64 = Base64.toBase64String(result);

        return String.format("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
            MEMORY, ITERATIONS, PARALLELISM, saltB64, hashB64);
    }

    public boolean verify(String password, String encodedHash) {
        // Parse the encoded hash to extract parameters and salt
        String[] parts = encodedHash.split("\\$");
        String[] params = parts[3].split(",");

        int memory = Integer.parseInt(params[0].split("=")[1]);
        int iterations = Integer.parseInt(params[1].split("=")[1]);
        int parallelism = Integer.parseInt(params[2].split("=")[1]);
        byte[] salt = Base64.decode(parts[4]);

        Argon2Parameters.Builder builder = new Argon2Parameters.Builder()
            .withSalt(salt)
            .withParallelism(parallelism)
            .withMemoryAsKB(memory)
            .withIterations(iterations)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13);

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(builder.build());

        byte[] expected = new byte[HASH_LENGTH];
        generator.generateBytes(password.toCharArray(), expected);

        byte[] actual = Base64.decode(parts[5]);
        return java.util.Arrays.equals(expected, actual);
    }
}

// Spring Security integration
@Component
public class Argon2PasswordEncoder implements PasswordEncoder {
    private final Argon2PasswordHasher hasher = new Argon2PasswordHasher();

    @Override
    public String encode(CharSequence rawPassword) {
        return hasher.hash(rawPassword.toString());
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return hasher.verify(rawPassword.toString(), encodedPassword);
    }
}
```

## Parameter Selection

| Parameter | OWASP 2023 Minimum | Rationale |
|-------------|-------------------|-----------|
| **Memory** | 64 MiB (65536 KiB) | High enough to exceed GPU cache, low enough for server capacity |
| **Iterations** | 3 | Balances CPU cost without excessive latency (> 250ms per hash is acceptable) |
| **Parallelism** | 4 (or 1 per CPU core) | Matches typical server core count; higher does not linearly improve security |
| **Salt length** | 16 bytes | Prevents rainbow tables; 128-bit entropy is sufficient |
| **Hash length** | 32 bytes | 256-bit output; longer does not improve security against brute force |

## Migrating from bcrypt

```python
# Hybrid migration: accept both bcrypt and argon2 during transition
def verify_password(password: str, hash_str: str) -> bool:
    if hash_str.startswith("$2"):  # bcrypt prefix
        import bcrypt
        return bcrypt.checkpw(password.encode(), hash_str.encode())
    elif hash_str.startswith("$argon2"):
        return verify_argon2(password, hash_str)
    return False

# On successful bcrypt login, transparently rehash to argon2
async def login(email, password):
    user = await get_user(email)
    if verify_password(password, user.hash):
        if user.hash.startswith("$2"):
            new_hash = hash_password(password)
            await update_hash(user.id, new_hash)
        return create_session(user)
    return None
```

## Best Practices

- **Never roll your own password hashing.** Use well-vetted libraries (argon2-cffi, argon2-node, Bouncy Castle). Custom implementations introduce timing attacks and memory safety bugs.
- **Always use Argon2id, not Argon2d or Argon2i.** Argon2id is the recommended variant that balances GPU resistance and side-channel protection.
- **Tune parameters to your hardware.** Hashing should take 250ms-500ms on production hardware. Profile with `time_cost` values until you hit this target.
- **Use a constant-time comparison for the entire verification path.** Even the "user not found" path should perform a dummy hash to prevent timing-based user enumeration.
- **Store hashes, not passwords, not encrypted passwords.** Hashing is one-way; encryption is reversible. If you can decrypt passwords, an attacker can too.

## Common Mistakes

- **Using SHA-256, MD5, or SHA-1 for passwords.** These are designed for speed, making them trivial to brute-force on GPUs (billions of guesses per second).
- **Salting with a global constant.** A unique salt per user is mandatory. Reusing a salt across users allows rainbow table attacks and cross-user hash comparison.
- **Forgetting to handle encoding consistently.** UTF-8, Latin-1, and ASCII produce different byte sequences for the same password. Standardize on UTF-8 everywhere.
- **Setting memory too high.** Argon2 with 1 GiB memory may crash under load or cause OOM kills. Start with 64 MiB and increase gradually based on server capacity.
- **Not upgrading parameters over time.** Hardware gets faster. Schedule annual reviews of your hashing parameters and rehash passwords on login.

## Related Resources

- [Implement RBAC](/recipes/authentication/implement-rbac)
- [Implement SSO SAML](/recipes/authentication/implement-sso-saml)
- [Secrets Management](/guides/security/secrets-management-guide)
