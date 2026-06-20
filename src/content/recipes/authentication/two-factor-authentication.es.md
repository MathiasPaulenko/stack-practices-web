---
contentType: recipes
slug: two-factor-authentication
title: "Autenticación de Dos Factores (2FA / TOTP)"
description: "Cómo implementar autenticación de dos factores con contraseñas de un solo uso basadas en tiempo (TOTP) para login seguro."
metaDescription: "Aprende a implementar 2FA basado en TOTP en Python, JavaScript y Java. Cubre generación de QR codes, almacenamiento de secretos, verificación y códigos de respaldo."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/password-hashing
  - /recipes/middleware
  - /recipes/file-upload-validation
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar 2FA basado en TOTP en Python, JavaScript y Java. Cubre generación de QR codes, almacenamiento de secretos, verificación y códigos de respaldo."
  keywords:
    - 2fa
    - totp
    - autenticacion
    - seguridad
    - mfa
    - python
    - javascript
    - java
---
## Visión General

Las contraseñas solas ya no son suficientes para proteger cuentas de usuario. La autenticación de dos factores (2FA) añade una segunda capa requiriendo algo que el usuario sabe (contraseña) y algo que tiene (un generador de contraseñas de un solo uso basado en tiempo). TOTP (RFC 6238) es el algoritmo estándar de la industria soportado por Google Authenticator, Authy y llaves físicas. Esta receta cubre la generación de secretos, creación de códigos QR para configuración, verificación de tokens y manejo de códigos de respaldo en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Protejas cuentas de usuario con un paso adicional de verificación más allá de las contraseñas
- Construyas flujos de login para aplicaciones financieras, de salud o de administración
- Migres de autenticación solo-contraseña a autenticación multi-factor (MFA). Consulta [Hashing de Contraseñas](/recipes/authentication/password-hashing) para mejores prácticas de almacenamiento de credenciales.
- Soportes apps de autenticación (Google Authenticator, Authy, Microsoft Authenticator)

## Solución

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

# Uso
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

// Uso
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

## Explicación

- **TOTP** genera un código de 6 dígitos a partir de un secreto compartido y la marca de tiempo actual (ventanas de 30 segundos). Tanto el cliente (app de autenticación) como el servidor deben tener el mismo secreto y relojes sincronizados.
- **Aprovisionamiento por QR Code** codifica una URI `otpauth://` que las apps de autenticación escanean para registrar la cuenta. Nunca transmitas el secreto raw por canales inseguros.
- **Ventana de verificación** permite una ligera desviación de reloj aceptando códigos de ventanas de tiempo adyacentes (típicamente ±1 ventana). Reduce esto en contextos de alta seguridad.
- **Códigos de respaldo** son códigos de recuperación de un solo uso hasheados y almacenados como contraseñas. Los usuarios los usan cuando pierden acceso a su dispositivo de autenticación.
- **Almacenamiento de secretos** debe tratar los secretos TOTP como contraseñas: encriptados en reposo (AES-256-GCM) y nunca registrados en logs.

## Variantes

| Método | Librería / Estándar | Ideal Para |
|--------|---------------------|------------|
| SMS OTP | Twilio, AWS SNS | Usuarios sin smartphones (menos seguro) |
| WebAuthn / FIDO2 | `py_webauthn`, `fido2-lib` | Autenticación con llave física resistente a phishing |
| Push Notification | Firebase, OneSignal | Aprobación sin fricción en dispositivos de confianza |
| Email OTP | Implementación custom | Fallback cuando TOTP no está disponible |

## Mejores Prácticas

1. **Encripta secretos en reposo** — nunca almacenes secretos TOTP en texto plano; usa AES-256-GCM o un vault de secretos dedicado.
2. **[Limita intentos](/recipes/api/rate-limiting) de verificación** — bloquea o retrasa tras 5 intentos fallidos de TOTP para prevenir fuerza bruta.
3. **Proporciona códigos de respaldo al enrolar** — genera 8-10 códigos de un solo uso y hashealos antes de almacenarlos.
4. **Permite re-enrolamiento** — permite a los usuarios desactivar y reactivar 2FA cuando cambian de dispositivo, con confirmación por email.
5. **[Loguea eventos de 2FA](/recipes/api/logging)** — audita enrolamiento, éxito/fallo de verificación y uso de códigos de respaldo para monitoreo de seguridad.

## Errores Comunes

1. Almacenar secretos TOTP en texto plano o columnas de base de datos sin encriptar.
2. No validar la longitud del token (debe ser 6 dígitos) antes de pasarlo al verificador.
3. Permitir intentos de verificación ilimitados, habilitando ataques de fuerza bruta.
4. Olvidar invalidar códigos de respaldo tras su uso, permitiendo su reutilización.
5. Usar SMS como método principal de 2FA sin advertir a los usuarios sobre los riesgos de SIM-swapping.

## Preguntas Frecuentes

### ¿Cómo manejo la desviación de reloj entre servidor y cliente?

Usa una ventana de verificación de 1 (±30 segundos). Para desviaciones severas, pide al usuario re-sincronizar o usar códigos de respaldo. La sincronización NTP en servidores es esencial.

### ¿Puedo usar el mismo secreto TOTP en múltiples dispositivos?

Sí, escaneando el mismo QR code en múltiples apps de autenticación. Por seguridad, cada dispositivo debería estar rastreado en la cuenta de usuario y revocable individualmente.

### ¿Qué pasa si un usuario pierde su dispositivo de autenticación?

Proporciona códigos de respaldo durante el enrolamiento. Si también los pierde, requiere verificación de identidad (email + reset de contraseña con confirmación adicional) antes de desactivar 2FA. Consulta [Magic Links](/recipes/authentication/magic-link-authentication) para verificación segura por email.
