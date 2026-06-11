---
contentType: recipes
slug: two-factor-authentication
title: "Two-Factor Authentication (2FA / TOTP)"
description: "How to implement time-based one-time password (TOTP) two-factor authentication for secure user login."
metaDescription: "Learn to implement TOTP-based 2FA in Python, JavaScript, and Java. Covers QR code generation, secret storage, verification, and backup codes."
difficulty: intermediate
topics:
  - authentication
tags:
  - 2fa
  - totp
  - authentication
  - security
  - mfa
  - python
  - javascript
  - java
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/password-hashing
  - /recipes/middleware
  - /recipes/file-upload-validation
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Learn to implement TOTP-based 2FA in Python, JavaScript, and Java. Covers QR code generation, secret storage, verification, and backup codes."
  keywords:
    - 2fa
    - totp
    - authentication
    - security
    - mfa
    - python
    - javascript
    - java
---
## Overview

Passwords alone are no longer sufficient to protect user accounts. Two-factor authentication (2FA) adds a second layer by requiring something the user knows (password) and something they have (a time-based one-time password generator). TOTP (RFC 6238) is the industry-standard algorithm supported by Google Authenticator, Authy, and hardware keys. This recipe covers generating secrets, creating QR codes for setup, verifying tokens, and handling backup codes in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Protecting user accounts with an additional verification step beyond passwords
- Building login flows for financial, healthcare, or admin applications
- Migrating from password-only auth to multi-factor authentication (MFA)
- Supporting authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)

## Solution

### Python

```python
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime

class TOTPService:
    def generate_secret(self) -> str:
        return pyotp.random_base32()

    def get_provisioning_uri(self, secret: str, user_email: str, issuer: str) -> str:
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=issuer
        )

    def generate_qr_code(self, provisioning_uri: str) -> str:
        img = qrcode.make(provisioning_uri)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()

    def verify_token(self, secret: str, token: str, window: int = 1) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=window)

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        return [secrets.token_hex(4).upper() for _ in range(count)]

# Usage
service = TOTPService()
secret = service.generate_secret()
uri = service.get_provisioning_uri(secret, "user@example.com", "MyApp")
qr_b64 = service.generate_qr_code(uri)
is_valid = service.verify_token(secret, "123456")
backup_codes = service.generate_backup_codes()
```

### JavaScript

```javascript
import { authenticator, totp } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

class TOTPService {
  generateSecret() {
    return authenticator.generateSecret();
  }

  getProvisioningUri(secret, userEmail, issuer) {
    return authenticator.keyuri(userEmail, issuer, secret);
  }

  async generateQRCode(provisioningUri) {
    return QRCode.toDataURL(provisioningUri);
  }

  verifyToken(secret, token, window = 1) {
    return authenticator.verify({ token, secret, window });
  }

  generateBackupCodes(count = 10) {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );
  }
}

// Usage
const service = new TOTPService();
const secret = service.generateSecret();
const uri = service.getProvisioningUri(secret, "user@example.com", "MyApp");
const qrDataUrl = await service.generateQRCode(uri);
const isValid = service.verifyToken(secret, "123456");
const backupCodes = service.generateBackupCodes();
```

### Java

```java
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.*;
import dev.samstevens.totp.qr.*;
import dev.samstevens.totp.secret.*;
import dev.samstevens.totp.time.*;
import java.security.SecureRandom;
import java.util.*;
import java.util.stream.*;

public class TOTPService {
  private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
  private final TimeProvider timeProvider = new SystemTimeProvider();
  private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
  private final CodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);

  public String generateSecret() {
    return secretGenerator.generate();
  }

  public String getProvisioningUri(String secret, String userEmail, String issuer) {
    return "otpauth://totp/" + issuer + ":" + userEmail +
           "?secret=" + secret + "&issuer=" + issuer;
  }

  public byte[] generateQRCode(String provisioningUri) throws Exception {
    QRCodeWriter writer = new QRCodeWriter();
    BitMatrix matrix = writer.encode(provisioningUri, BarcodeFormat.QR_CODE, 200, 200);
    return MatrixToImageWriter.toBufferedImage(matrix);
  }

  public boolean verifyToken(String secret, String token) {
    return verifier.isValidCode(secret, token);
  }

  public List<String> generateBackupCodes(int count) {
    SecureRandom random = new SecureRandom();
    return IntStream.range(0, count)
      .mapToObj(i -> String.format("%08X", random.nextInt()))
      .toList();
  }
}
```

## Explanation

- **TOTP** generates a 6-digit code from a shared secret and the current timestamp (30-second windows). Both client (authenticator app) and server must have the same secret and synchronized clocks.
- **QR Code provisioning** encodes an `otpauth://` URI that authenticator apps scan to register the account. Never transmit the raw secret over insecure channels.
- **Verification window** allows slight clock drift by accepting codes from adjacent time windows (typically ±1 window). Tighten this for high-security contexts.
- **Backup codes** are single-use recovery codes hashed and stored like passwords. Users consume them when they lose access to their authenticator device.
- **Secret storage** must treat TOTP secrets like passwords: encrypt at rest (AES-256-GCM) and never log them.

## Variants

| Method | Library / Standard | Best For |
|--------|-------------------|----------|
| SMS OTP | Twilio, AWS SNS | Users without smartphones (less secure) |
| WebAuthn / FIDO2 | `py_webauthn`, `fido2-lib` | Phishing-resistant hardware key authentication |
| Push Notification | Firebase, OneSignal | Frictionless approval on trusted devices |
| Email OTP | Custom implementation | Fallback when TOTP is unavailable |

## Best Practices

1. **Encrypt secrets at rest** — never store TOTP secrets in plaintext; use AES-256-GCM or a dedicated secrets vault.
2. **Rate limit verification attempts** — lock or delay after 5 failed TOTP attempts to prevent brute force.
3. **Provide backup codes on enrollment** — generate 8-10 single-use codes and hash them before storage.
4. **Allow re-enrollment** — let users disable and re-enable 2FA when they switch devices, with email confirmation.
5. **Log 2FA events** — audit enrollment, verification success/failure, and backup code usage for security monitoring.

## Common Mistakes

1. Storing TOTP secrets in plaintext or unencrypted database columns.
2. Not validating the token length (must be 6 digits) before passing to the verifier.
3. Allowing unlimited verification attempts, enabling brute-force attacks.
4. Forgetting to invalidate backup codes after use, letting them be reused.
5. Using SMS as the primary 2FA method without warning users about SIM-swapping risks.

## Frequently Asked Questions

### How do I handle clock drift between server and client?

Use a verification window of 1 (±30 seconds). For severe drift, prompt the user to re-sync or use backup codes. NTP synchronization on servers is essential.

### Can I use the same TOTP secret across multiple devices?

Yes, by scanning the same QR code on multiple authenticator apps. For security, each device should be tracked in the user account and revocable individually.

### What happens if a user loses their authenticator device?

Provide backup codes during enrollment. If those are lost too, require identity verification (email + password reset with additional confirmation) before disabling 2FA.
