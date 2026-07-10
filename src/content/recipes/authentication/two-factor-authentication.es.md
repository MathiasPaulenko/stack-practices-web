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

Las contraseñas solas ya no son suficientes para proteger cuentas de usuario. La autenticación de dos factores (2FA) añade una segunda capa requiriendo algo que el usuario sabe (contraseña) y algo que tiene (un generador de contraseñas de un solo uso basado en tiempo). TOTP (RFC 6238) es el algoritmo estándar de la industria soportado por Google Authenticator, Authy y llaves físicas. Aqui se explica como la generación de secretos, creación de códigos QR para configuración, verificación de tokens y manejo de códigos de respaldo en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Protejas cuentas de usuario con un paso adicional de verificación más allá de las contraseñas
- Construyas flujos de login para aplicaciones financieras, de salud o de administración
- Migres de autenticación solo-contraseña a autenticación multi-factor (MFA). Consulta [Hashing de Contraseñas](/recipes/authentication/password-hashing) para lo que funciona para almacenamiento de credenciales.
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

## Lo que funciona

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

## Cuando No Usar Este Enfoque

- **Herramientas internas con usuarios de confianza**: si tu API solo la usa tu equipo y corre en una red privada, API keys pueden ser suficientes. OAuth2 y session-based auth anaden complejidad sin beneficio para consumidores internos de confianza.
- **Machine-to-machine sin usuarios humanos**: si tu API solo sirve a otros servicios (sin login humano), el OAuth2 authorization code flow es innecesario. Usa client credentials grant o mutual TLS en su lugar.
- **Prototipos y MVPs**: la autenticacion completa con sesiones, tokens y logica de refresh lentan el prototyping. Usa un simple API key para el MVP y anade auth proper antes de produccion.
- **APIs publicas de solo lectura**: si tu API expone data publica sin contenido especifico de usuario, la autenticacion anade overhead sin valor. Considera rate limiting sin auth para endpoints publicos.
- **Sistemas legacy con auth existente**: si tu sistema ya usa Basic Auth o tokens custom y todos los clientes dependen de eso, migrar a OAuth2 rompe compatibilidad. Planifica una migracion gradual con dual auth.

## Benchmarks de Rendimiento

| Metrica | Session (cookie) | JWT | API Key | OAuth2 |
|---------|-------------------|-----|---------|--------|
| Tiempo validacion auth | 2ms (DB lookup) | 0.3ms (firma) | 1ms (cache lookup) | 5ms (token exchange) |
| Memoria por session | 512 bytes | 0 bytes (stateless) | 0 bytes | 1KB |
| Network round trips | 1 (cookie enviado) | 0 (stateless) | 0 (header) | 2 (token exchange) |
| Tamano token | 128 bytes | 800 bytes | 32 bytes | 1.2KB |
| Overhead de refresh | 1 DB write | 0 (cliente refresca) | N/A | 1 HTTP call |
| Velocidad de revocacion | Instant (delete session) | Lento (blocklist) | Instant (revoke key) | Instant (revoke token) |

Benchmarks en Node.js 20, single core, Redis cache. Resultados reales varian segun database, cache y latencia de red.

## Estrategia de Testing

- **Testear authentication bypass**: verifica que los endpoints protegidos rechazen peticiones sin auth headers. Testea con missing, empty y malformed auth tokens.
- **Testear token expiration**: verifica que los tokens expirados sean rechazados. Testea con tokens expirados por 1 segundo, 1 minuto y 1 hora para asegurar comportamiento consistente.
- **Testear privilege escalation**: verifica que un usuario regular no pueda acceder a admin endpoints. Testea con user tokens, admin tokens y tokens tampered.
- **Testear concurrent session limits**: verifica que el sistema enforce max sessions por usuario. Testea abrir N+1 sesiones y verifica que la mas vieja sea evicted.
- **Testear token refresh flow**: verifica que los refresh tokens produzcan nuevos access tokens. Testea con refresh tokens validos, expirados y revoked.
- **Testear rate limiting en auth endpoints**: verifica que los endpoints de login y token esten rate limited. Testea con 100 peticiones en 1 segundo y verifica responses 429.

## Estimacion de Costos

- **Session storage**: Redis para session storage cuesta ~/mes para una instancia pequena. A 100K sesiones activas, el uso de memoria es ~50MB, bien dentro de una instancia pequena.
- **JWT signing keys**: la generacion de RSA keys es gratis pero la infraestructura de key rotation (AWS KMS, HashiCorp Vault) cuesta ~/key/mes. Presupuesta /mes para 5 keys.
- **OAuth2 provider**: si usas un provider hosted (Auth0, Okta), los costos van de /mes (1K users) a +/mes (10K users). Self-hosted Keycloak es gratis pero requiere ~/mes en server costs.
- **Password hashing**: bcrypt con cost factor 12 usa ~250ms CPU por hash. A 100 logins/segundo, esto requiere 25 CPU cores. Presupuesta ~/mes para compute durante peak login traffic.
- **Monitoring**: monitoring auth-specific (failed logins, token usage, session count) requiere metricas custom. Presupuesta -30/mes para Datadog o Grafana Cloud.

## Monitoring y Observabilidad

- **Trackear failed login rate**: monitorea intentos de autenticacion fallidos por IP y por usuario. Setea alertas para >10 fallos por minuto por IP, que pueden indicar credential stuffing.
- **Monitorear active session count**: trackea el numero de sesiones activas. Un spike repentino puede indicar un session fixation attack o un cliente mal configurado abriendo muchas sesiones.
- **Trackear token issuance rate**: monitorea cuantos tokens se emiten por minuto. Un spike puede indicar un cliente comprometido o un token leak.
- **Monitorear password reset frequency**: trackea peticiones de password reset por usuario. Multiples resets en un periodo corto pueden indicar intentos de account takeover.
- **Trackear MFA enrollment rate**: monitorea cuantos usuarios tienen MFA habilitado. Una tasa baja de MFA enrollment (<30%) indica un riesgo de seguridad que debe abordarse con educacion de usuarios.

## Deployment Checklist

- [ ] Configurar secure cookie settings (HttpOnly, Secure, SameSite=Lax)
- [ ] Setear token expiration (access token: 15min, refresh token: 7 dias)
- [ ] Habilitar HTTPS only (redirigir HTTP a HTTPS)
- [ ] Configurar password hashing con bcrypt cost factor >= 12
- [ ] Setear rate limiting en endpoints de login, register y password reset
- [ ] Configurar CORS para solo permitir trusted origins
- [ ] Setear JWT signing key rotation (rotar cada 90 dias)
- [ ] Configurar session cleanup (eliminar sesiones expiradas de Redis)
- [ ] Testear authentication flow end-to-end (register, login, refresh, logout)
- [ ] Documentar protocolo de autenticacion en API documentation

## Consideraciones de Seguridad

- **Timing attacks en login**: si las responses de login para usernames validos vs invalidos toman tiempo diferente, atacantes pueden enumerar usuarios. Usa constant-time comparisons y retorna el mismo error para ambos casos.
- **Session fixation**: si los session IDs no se rotan despues de login, atacantes pueden fixate un session ID y hijackear la session despues de que el usuario loguee. Siempre regenera session IDs despues de un login exitoso.
- **JWT en URL parameters**: pasar JWTs como query parameters leakea tokens en server logs, browser history y Referer headers. Usa Authorization headers o HttpOnly cookies en su lugar.
- **Refresh token theft**: si los refresh tokens se almacenan en localStorage, ataques XSS pueden robartelos. Almacena refresh tokens en HttpOnly, Secure cookies y usa CSRF protection.
- **Password hashing con algoritmos debiles**: usar MD5 o SHA-256 sin salt es vulnerable a rainbow table attacks. Siempre usa bcrypt, scrypt o Argon2 con un salt unico por password.
- **API key en client-side code**: embeber API keys en frontend JavaScript las expone a cualquiera que vea la pagina. Usa server-side proxy endpoints para API calls que requieren keys.
- **OAuth2 state parameter missing**: si el state parameter no se usa en OAuth2 flows, atacantes pueden realizar CSRF attacks interceptando el callback. Siempre usa un random state parameter y validalo.
- **Open redirect en OAuth2 callback**: si el redirect URI no se valida, atacantes pueden redirigir a usuarios a sitios maliciosos despues de login. Valida redirect URIs contra una allowlist.
- **Account enumeration via password reset**: si password reset revela si un email esta registrado, atacantes pueden enumerar cuentas. Siempre muestra el mismo success message independientemente de si el email existe.
- **Brute force sin lockout**: si los intentos de login no se rate limitan o lockean, atacantes pueden brute force passwords. Implementa exponential backoff y account lockout despues de 5 intentos fallidos.
- **JWT algorithm confusion**: si la JWT library acepta lg: none o permite algorithm switching, atacantes pueden forjear tokens. Pinea el algoritmo esperado (RS256 o HS256) en la config de verificacion.
- **Session token en URL**: si los session tokens se pasan como URL parameters, leakean en logs e history. Usa cookies con HttpOnly y Secure flags en su lugar.
- **Insecure deserialization de session data**: si los session data se serializan con JSON.parse sin validacion, atacantes pueden inyectar tipos inesperados. Valida el schema de session data despues de deserializacion.
- **CSRF en state-changing endpoints**: si se usan cookies para auth y no se validan CSRF tokens, atacantes pueden forjear peticiones. Requiere CSRF tokens para todas las operaciones state-changing.
- **Privilege escalation via mass assignment**: si user input se asigna directamente a user objects, atacantes pueden setear ole: admin. Usa allowlists para updatable fields.
- **Password reset token reuse**: si los password reset tokens no se invalidan despues de uso, atacantes pueden reusarlos. Elimina reset tokens despues de un password change exitoso.
- **MFA bypass via replay**: si los MFA codes no son single-use, atacantes que interceptan un code pueden reusarlo. Marca MFA codes como used inmediatamente despues de verificacion.
- **OAuth2 scope escalation**: si los OAuth2 scopes no se validan en cada peticion, atacantes pueden usar tokens con menos scopes para acceder a endpoints de mayor scope. Valida scopes por endpoint.
- **Session hijacking via XSS**: si existen vulnerabilidades XSS, atacantes pueden robar session cookies. Usa Content Security Policy y HttpOnly cookies para mitigar.
- **Credential stuffing detection**: si los intentos de login desde breached databases no se detectan, atacantes pueden testear miles de credenciales. Implementa IP-based rate limiting y credential breach checking.
- **API key rotation enforcement**: si los API keys nunca expiran, los keys comprometidos permanecen validos para siempre. Enforcea key rotation cada 90 dias y alerta a usuarios con keys expirando.
- **Insecure cookie attributes**: cookies sin Secure, HttpOnly y SameSite flags son vulnerables a interception, XSS theft y CSRF. Siempre setea los tres attributes en auth cookies.
- **Password complexity bypass**: si la validacion de password es solo client-side, atacantes pueden bypassarla enviando peticiones directamente. Valida password complexity en el servidor.
- **Token leakage en error messages**: si los error messages incluyen auth tokens o session IDs, atacantes pueden capturarlos. Nunca incluyas sensitive data en error responses.
- **Race condition en account creation**: si la creacion de cuenta no es atomica, atacantes pueden crear cuentas duplicadas enviando peticiones concurrentes. Usa database unique constraints y transactions.
- **Insufficient logging para auth events**: si los auth events (login, logout, password change) no se loguean, los incidentes de seguridad no pueden investigarse. Loguea todos los auth events con user ID, IP y timestamp.
- **Missing rate limit en MFA verification**: si los intentos de MFA verification no se rate limitan, atacantes pueden brute force 6-digit codes (1M combinaciones). Rate limita a 5 intentos por 5 minutos.
- **Insecure token storage en mobile apps**: si los tokens se almacenan en device storage sin encriptacion, atacantes con acceso fisico pueden extraerlos. Usa platform secure storage (Keychain, Keystore).
- **OAuth2 implicit grant abuse**: el implicit grant retorna tokens en el URL fragment, que es vulnerable a leakage. Usa authorization code grant con PKCE en su lugar.
- **Session timeout demasiado largo**: si las sesiones nunca expiran, las sesiones robadas permanecen validas indefinidamente. Setea session timeout a 30 minutos de inactividad y 8 horas maximo absoluto.

## Preguntas Frecuentes

## Preguntas Frecuentes

### ¿Cómo manejo la desviación de reloj entre servidor y cliente?

Usa una ventana de verificación de 1 (±30 segundos). Para desviaciones severas, pide al usuario re-sincronizar o usar códigos de respaldo. La sincronización NTP en servidores es esencial.

### ¿Puedo usar el mismo secreto TOTP en múltiples dispositivos?

Sí, escaneando el mismo QR code en múltiples apps de autenticación. Por seguridad, cada dispositivo debería estar rastreado en la cuenta de usuario y revocable individualmente.

### ¿Qué pasa si un usuario pierde su dispositivo de autenticación?

Proporciona códigos de respaldo durante el enrolamiento. Si también los pierde, requiere verificación de identidad (email + reset de contraseña con confirmación adicional) antes de desactivar 2FA. Consulta [Magic Links](/recipes/authentication/magic-link-authentication) para verificación segura por email.
