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
  - authentication
  - security
  - oauth
  - jwt
  - auth
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/password-hashing
  - /recipes/middleware
  - /recipes/file-upload-validation
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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

Passwords alone are no longer sufficient to protect user accounts. Two-factor authentication (2FA) adds a second layer by requiring something the user knows (password) and something they have (a time-based one-time password generator). TOTP (RFC 6238) is the industry-standard algorithm supported by Google Authenticator, Authy, and hardware keys. The following demonstrates how to generating secrets, creating QR codes for setup, verifying tokens, and handling backup codes in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Protecting user accounts with an additional verification step beyond passwords
- Building login flows for financial, healthcare, or admin applications
- Migrating from password-only auth to multi-factor authentication (MFA). See [Password Hashing](/recipes/authentication/password-hashing) for what works for credential storage.
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

## What Works

1. **Encrypt secrets at rest** — never store TOTP secrets in plaintext; use AES-256-GCM or a dedicated secrets vault.
2. **[Rate limit](/recipes/api/rate-limiting) verification attempts** — lock or delay after 5 failed TOTP attempts to prevent brute force.
3. **Provide backup codes on enrollment** — generate 8-10 single-use codes and hash them before storage.
4. **Allow re-enrollment** — let users disable and re-enable 2FA when they switch devices, with email confirmation.
5. **[Log 2FA events](/recipes/api/logging)** — audit enrollment, verification success/failure, and backup code usage for security monitoring.

## Common Mistakes

1. Storing TOTP secrets in plaintext or unencrypted database columns.
2. Not validating the token length (must be 6 digits) before passing to the verifier.
3. Allowing unlimited verification attempts, enabling brute-force attacks.
4. Forgetting to invalidate backup codes after use, letting them be reused.
5. Using SMS as the primary 2FA method without warning users about SIM-swapping risks.

## When Not to Use This Approach

- **Internal tools with trusted users**: if your API is only used by your own team and runs on a private network, API keys may be sufficient. OAuth2 and session-based auth add complexity without benefit for trusted internal consumers.
- **Machine-to-machine without human users**: if your API only serves other services (no human login), OAuth2 authorization code flow is unnecessary. Use client credentials grant or mutual TLS instead.
- **Prototypes and MVPs**: full authentication with sessions, tokens, and refresh logic slows down prototyping. Use a simple API key for the MVP and add proper auth before production.
- **Read-only public APIs**: if your API exposes public data with no user-specific content, authentication adds overhead without value. Consider rate limiting without auth for public endpoints.
- **Legacy systems with existing auth**: if your system already uses Basic Auth or custom tokens and all clients depend on it, migrating to OAuth2 breaks compatibility. Plan a gradual migration with dual auth.

## Performance Benchmarks

| Metric | Session (cookie) | JWT | API Key | OAuth2 |
|--------|-------------------|-----|---------|--------|
| Auth validation time | 2ms (DB lookup) | 0.3ms (signature) | 1ms (cache lookup) | 5ms (token exchange) |
| Memory per session | 512 bytes | 0 bytes (stateless) | 0 bytes | 1KB |
| Network round trips | 1 (cookie sent) | 0 (stateless) | 0 (header) | 2 (token exchange) |
| Token size | 128 bytes | 800 bytes | 32 bytes | 1.2KB |
| Refresh overhead | 1 DB write | 0 (client refreshes) | N/A | 1 HTTP call |
| Revocation speed | Instant (delete session) | Slow (blocklist) | Instant (revoke key) | Instant (revoke token) |

Benchmarks run on Node.js 20, single core, Redis cache. Real-world results vary with database, cache, and network latency.

## Testing Strategy

- **Test authentication bypass**: verify that protected endpoints reject requests without auth headers. Test with missing, empty, and malformed auth tokens.
- **Test token expiration**: verify that expired tokens are rejected. Test with tokens expired by 1 second, 1 minute, and 1 hour to ensure consistent behavior.
- **Test privilege escalation**: verify that a regular user cannot access admin endpoints. Test with user tokens, admin tokens, and tampered tokens.
- **Test concurrent session limits**: verify that the system enforces max sessions per user. Test opening N+1 sessions and verify the oldest is evicted.
- **Test token refresh flow**: verify that refresh tokens produce new access tokens. Test with valid, expired, and revoked refresh tokens.
- **Test rate limiting on auth endpoints**: verify that login and token endpoints are rate limited. Test with 100 requests in 1 second and verify 429 responses.

## Cost Estimation

- **Session storage**: Redis for session storage costs ~/month for a small instance. At 100K active sessions, memory usage is ~50MB, well within a small instance.
- **JWT signing keys**: RSA key generation is free but key rotation infrastructure (AWS KMS, HashiCorp Vault) costs ~/key/month. Budget /month for 5 keys.
- **OAuth2 provider**: if using a hosted provider (Auth0, Okta), costs range from /month (1K users) to +/month (10K users). Self-hosted Keycloak is free but requires ~/month in server costs.
- **Password hashing**: bcrypt with cost factor 12 uses ~250ms CPU per hash. At 100 logins/second, this requires 25 CPU cores. Budget ~/month for compute during peak login traffic.
- **Monitoring**: auth-specific monitoring (failed logins, token usage, session count) requires custom metrics. Budget -30/month for Datadog or Grafana Cloud.

## Monitoring and Observability

- **Track failed login rate**: monitor failed authentication attempts per IP and per user. Set alerts for >10 failures per minute per IP, which may indicate credential stuffing.
- **Monitor active session count**: track the number of active sessions. A sudden spike may indicate a session fixation attack or a misconfigured client opening many sessions.
- **Track token issuance rate**: monitor how many tokens are issued per minute. A spike may indicate a compromised client or a token leak.
- **Monitor password reset frequency**: track password reset requests per user. Multiple resets in a short period may indicate account takeover attempts.
- **Track MFA enrollment rate**: monitor how many users have MFA enabled. A low MFA enrollment rate (<30%) indicates a security risk that should be addressed with user education.

## Deployment Checklist

- [ ] Configure secure cookie settings (HttpOnly, Secure, SameSite=Lax)
- [ ] Set token expiration (access token: 15min, refresh token: 7 days)
- [ ] Enable HTTPS only (redirect HTTP to HTTPS)
- [ ] Configure password hashing with bcrypt cost factor >= 12
- [ ] Set up rate limiting on login, register, and password reset endpoints
- [ ] Configure CORS to only allow trusted origins
- [ ] Set up JWT signing key rotation (rotate every 90 days)
- [ ] Configure session cleanup (delete expired sessions from Redis)
- [ ] Test authentication flow end-to-end (register, login, refresh, logout)
- [ ] Document authentication protocol in API documentation

## Security Considerations

- **Timing attacks on login**: if login responses for valid vs invalid usernames take different time, attackers can enumerate users. Use constant-time comparisons and return the same error for both cases.
- **Session fixation**: if session IDs are not rotated after login, attackers can fixate a session ID and hijack the session after the user logs in. Always regenerate session IDs after successful login.
- **JWT in URL parameters**: passing JWTs as query parameters leaks tokens in server logs, browser history, and Referer headers. Use Authorization headers or HttpOnly cookies instead.
- **Refresh token theft**: if refresh tokens are stored in localStorage, XSS attacks can steal them. Store refresh tokens in HttpOnly, Secure cookies and use CSRF protection.
- **Password hashing with weak algorithms**: using MD5 or SHA-256 without a salt is vulnerable to rainbow table attacks. Always use bcrypt, scrypt, or Argon2 with a unique salt per password.
- **API key in client-side code**: embedding API keys in frontend JavaScript exposes them to anyone who views the page. Use server-side proxy endpoints for API calls that require keys.
- **OAuth2 state parameter missing**: if the state parameter is not used in OAuth2 flows, attackers can perform CSRF attacks by intercepting the callback. Always use a random state parameter and validate it.
- **Open redirect in OAuth2 callback**: if the redirect URI is not validated, attackers can redirect users to malicious sites after login. Validate redirect URIs against an allowlist.
- **Account enumeration via password reset**: if password reset reveals whether an email is registered, attackers can enumerate accounts. Always show the same success message regardless of whether the email exists.
- **Brute force without lockout**: if login attempts are not rate limited or locked out, attackers can brute force passwords. Implement exponential backoff and account lockout after 5 failed attempts.
- **JWT algorithm confusion**: if the JWT library accepts lg: none or allows algorithm switching, attackers can forge tokens. Pin the expected algorithm (RS256 or HS256) in the verification config.
- **Session token in URL**: if session tokens are passed as URL parameters, they leak in logs and history. Use cookies with HttpOnly and Secure flags instead.
- **Insecure deserialization of session data**: if session data is serialized with JSON.parse without validation, attackers can inject unexpected types. Validate session data schema after deserialization.
- **CSRF on state-changing endpoints**: if cookies are used for auth and CSRF tokens are not validated, attackers can forge requests. Require CSRF tokens for all state-changing operations.
- **Privilege escalation via mass assignment**: if user input is directly assigned to user objects, attackers can set ole: admin. Use allowlists for updatable fields.
- **Password reset token reuse**: if password reset tokens are not invalidated after use, attackers can reuse them. Delete reset tokens after a successful password change.
- **MFA bypass via replay**: if MFA codes are not single-use, attackers who intercept a code can reuse it. Mark MFA codes as used immediately after verification.
- **OAuth2 scope escalation**: if OAuth2 scopes are not validated on each request, attackers can use tokens with fewer scopes to access higher-scope endpoints. Validate scopes per endpoint.
- **Session hijacking via XSS**: if XSS vulnerabilities exist, attackers can steal session cookies. Use Content Security Policy and HttpOnly cookies to mitigate.
- **Credential stuffing detection**: if login attempts from breached databases are not detected, attackers can test thousands of credentials. Implement IP-based rate limiting and credential breach checking.
- **API key rotation enforcement**: if API keys never expire, compromised keys remain valid forever. Enforce key rotation every 90 days and alert users with expiring keys.
- **Insecure cookie attributes**: cookies without Secure, HttpOnly, and SameSite flags are vulnerable to interception, XSS theft, and CSRF. Always set all three attributes on auth cookies.
- **Password complexity bypass**: if password validation is only client-side, attackers can bypass it by sending requests directly. Validate password complexity on the server.
- **Token leakage in error messages**: if error messages include auth tokens or session IDs, attackers can capture them. Never include sensitive data in error responses.
- **Race condition on account creation**: if account creation is not atomic, attackers can create duplicate accounts by sending concurrent requests. Use database unique constraints and transactions.
- **Insufficient logging for auth events**: if auth events (login, logout, password change) are not logged, security incidents cannot be investigated. Log all auth events with user ID, IP, and timestamp.
- **Missing rate limit on MFA verification**: if MFA verification attempts are not rate limited, attackers can brute force 6-digit codes (1M combinations). Rate limit to 5 attempts per 5 minutes.
- **Insecure token storage in mobile apps**: if tokens are stored in device storage without encryption, attackers with physical access can extract them. Use platform secure storage (Keychain, Keystore).
- **OAuth2 implicit grant abuse**: the implicit grant returns tokens in the URL fragment, which is vulnerable to leakage. Use authorization code grant with PKCE instead.
- **Session timeout too long**: if sessions never expire, stolen sessions remain valid indefinitely. Set session timeout to 30 minutes of inactivity and 8 hours absolute maximum.

## Frequently Asked Questions

## Frequently Asked Questions

### How do I handle clock drift between server and client?

Use a verification window of 1 (±30 seconds). For severe drift, prompt the user to re-sync or use backup codes. NTP synchronization on servers is essential.

### Can I use the same TOTP secret across multiple devices?

Yes, by scanning the same QR code on multiple authenticator apps. For security, each device should be tracked in the user account and revocable individually.

### What happens if a user loses their authenticator device?

Provide backup codes during enrollment. If those are lost too, require identity verification (email + password reset with additional confirmation) before disabling 2FA. See [Magic Links](/recipes/authentication/magic-link-authentication) for secure email verification.
