---
contentType: patterns
slug: voucher-pattern
title: "Patrón Voucher"
description: "Valida claims y delega acceso usando vouchers firmados sin exponer datos sensibles. Un patrón de seguridad para autorización basada en tokens entre servicios."
metaDescription: "Aprende el patrón Voucher en Python, Java y JavaScript. Valida claims firmados entre servicios sin exponer datos sensibles ni credenciales."
difficulty: advanced
topics:
  - authentication
  - security
tags:
  - voucher
  - pattern
  - design-pattern
  - security
  - token-based-auth
  - claims
  - delegation
  - python
  - javascript
  - java
relatedResources:
  - /patterns/authentication/federated-identity-pattern
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/ambassador-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Aprende el patrón Voucher en Python, Java y JavaScript. Valida claims firmados entre servicios sin exponer datos sensibles ni credenciales."
  keywords:
    - voucher pattern
    - design pattern
    - security pattern
    - token based authorization
    - claims validation
    - python voucher pattern
    - java voucher pattern
    - javascript voucher pattern
---

# Patrón Voucher

## Visión General

El patrón [Voucher](/patterns/authentication/voucher-pattern) emite tokens firmados y de corta duración (vouchers) que prueban un claim sin revelar los datos sensibles subyacentes. Un servicio puede emitir un voucher afirmando "este usuario está autenticado" o "esta petición está autorizada" y pasarlo a servicios downstream. Los servicios downstream verifican la firma del voucher y confían en el claim — nunca necesitan acceso a las credenciales originales o al data store.

## Cuándo Usar

Usar el patrón Voucher cuando:
- Un servicio necesita probar un claim a otro servicio sin compartir datos sensibles
- Quieres evitar pasar credenciales a través de múltiples hops de servicio
- Los servicios downstream necesitan verificar autorización sin consultar una base de datos central
- Necesitas tokens de delegación de corta duración y scoped entre microservicios
- Quieres reducir el acoplamiento entre servicios y el identity store

## Solución

### Python

```python
import hmac
import hashlib
import json
import time
import base64
from dataclasses import dataclass, asdict

SECRET_KEY = b"shared-secret-key-between-services"

@dataclass
class Voucher:
    issuer: str
    subject: str
    claims: dict
    issued_at: float
    expires_at: float

    def to_dict(self) -> dict:
        return asdict(self)

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


def sign_voucher(voucher: Voucher) -> str:
    payload = json.dumps(voucher.to_dict(), sort_keys=True).encode()
    signature = hmac.new(SECRET_KEY, payload, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(payload) + b"." + base64.urlsafe_b64encode(signature)
    return token.decode()


def verify_voucher(token: str) -> Voucher | None:
    try:
        payload_b64, sig_b64 = token.rsplit(".", 1)
        payload = base64.urlsafe_b64decode(payload_b64)
        expected_sig = hmac.new(SECRET_KEY, payload, hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        data = json.loads(payload)
        voucher = Voucher(**data)
        if voucher.is_expired():
            return None
        return voucher
    except (ValueError, json.JSONDecodeError, KeyError):
        return None


# Servicio A: Emitir un voucher después de autenticar un usuario
def issue_voucher(user_id: str, permissions: list[str]) -> str:
    voucher = Voucher(
        issuer="auth-service",
        subject=user_id,
        claims={"permissions": permissions, "tenant": "acme"},
        issued_at=time.time(),
        expires_at=time.time() + 300,  # 5 minutos
    )
    return sign_voucher(voucher)


# Servicio B: Verificar el voucher sin acceder a la base de datos de auth
def handle_request(auth_header: str):
    token = auth_header.replace("Bearer ", "")
    voucher = verify_voucher(token)
    if not voucher:
        raise PermissionError("Invalid or expired voucher")
    if "read:reports" not in voucher.claims.get("permissions", []):
        raise PermissionError("Insufficient permissions")
    return f"Report delivered to {voucher.subject}"


# Uso
token = issue_voucher("user-123", ["read:reports", "write:reports"])
result = handle_request(f"Bearer {token}")
print(result)
```

### JavaScript

```javascript
const crypto = require("crypto");

const SECRET_KEY = "shared-secret-key-between-services";

function signVoucher(voucher) {
    const payload = JSON.stringify(voucher);
    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(payload)
        .digest("base64url");
    return Buffer.from(payload).toString("base64url") + "." + signature;
}

function verifyVoucher(token) {
    try {
        const [payloadB64, sig] = token.split(".");
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

        const expectedSig = crypto
            .createHmac("sha256", SECRET_KEY)
            .update(Buffer.from(payloadB64, "base64url"))
            .digest("base64url");

        if (!crypto.timingSafeEqual(
            Buffer.from(sig),
            Buffer.from(expectedSig)
        )) {
            return null;
        }

        if (Date.now() / 1000 > payload.expires_at) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

// Servicio A: Emitir voucher
function issueVoucher(userId, permissions) {
    const voucher = {
        issuer: "auth-service",
        subject: userId,
        claims: { permissions, tenant: "acme" },
        issued_at: Date.now() / 1000,
        expires_at: Date.now() / 1000 + 300,
    };
    return signVoucher(voucher);
}

// Servicio B: Verificar voucher
function handleRequest(authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const voucher = verifyVoucher(token);
    if (!voucher) {
        throw new Error("Invalid or expired voucher");
    }
    if (!voucher.claims.permissions.includes("read:reports")) {
        throw new Error("Insufficient permissions");
    }
    return `Report delivered to ${voucher.subject}`;
}

// Uso
const token = issueVoucher("user-123", ["read:reports", "write:reports"]);
console.log(handleRequest(`Bearer ${token}`));
```

### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

public class VoucherPattern {

    static final String SECRET = "shared-secret-key-between-services";

    record Voucher(String issuer, String subject, Map<String, Object> claims,
                   long issuedAt, long expiresAt) {}

    static String signVoucher(Voucher v) throws Exception {
        String payload = String.format(
            "{\"issuer\":\"%s\",\"subject\":\"%s\",\"claims\":%s,\"issuedAt\":%d,\"expiresAt\":%d}",
            v.issuer(), v.subject(), v.claims().toString(), v.issuedAt(), v.expiresAt()
        );
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(), "HmacSHA256"));
        byte[] sig = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String payloadB64 = Base64.getEncoder().encodeToString(payload.getBytes());
        String sigB64 = Base64.getEncoder().encodeToString(sig);
        return payloadB64 + "." + sigB64;
    }

    static boolean verifyVoucher(String token) throws Exception {
        String[] parts = token.split("\\.");
        if (parts.length != 2) return false;

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(), "HmacSHA256"));
        byte[] expectedSig = mac.doFinal(Base64.getDecoder().decode(parts[0]));
        byte[] actualSig = Base64.getDecoder().decode(parts[1]);

        return java.util.Arrays.equals(expectedSig, actualSig);
    }

    public static void main(String[] args) throws Exception {
        Voucher v = new Voucher(
            "auth-service", "user-123",
            Map.of("permissions", List.of("read:reports")),
            System.currentTimeMillis() / 1000,
            System.currentTimeMillis() / 1000 + 300
        );

        String token = signVoucher(v);
        System.out.println("Valid: " + verifyVoucher(token));
    }
}
```

## Explicación

El patrón Voucher crea una cadena de confianza entre servicios sin compartir datos sensibles:

- **Issuer**: El servicio que autentica al usuario o verifica el claim. Crea y firma el voucher.
- **Voucher**: Un token firmado que contiene claims (user ID, permisos, tenant), issuer y expiración. Firmado con HMAC o clave asimétrica.
- **Verifier**: El servicio downstream que recibe el voucher. Verifica la firma y chequea expiración. Confía en el claim sin consultar el identity store.
- **Short-lived**: Los vouchers expiran rápido (minutos, no horas). Esto limita la ventana de misuse si un voucher es interceptado.
- **Scoped**: Los vouchers contienen solo los claims necesarios para la operación downstream. Sin contraseñas, sin session tokens, sin datos innecesarios.

## Variantes

| Variante | Método de Firma | Caso de Uso |
|---------|---------------|----------|
| **HMAC Voucher** | Shared secret (HMAC-SHA256) | Servicios que comparten una secret key |
| **JWT Voucher** | Asimétrico (RS256, ES256) | Verificación pública con firma privada |
| **Capability Token** | Token opaco + lookup | Cuando los claims son demasiado grandes para un token |
| **Delegation Token** | Firmado por servicio intermedio | Cadena de confianza across múltiples hops |

## Pautas

- **Mantener vouchers de corta duración** — 5 minutos o menos. Limitar el daño de tokens interceptados.
- **Incluir solo claims necesarios** — no embeber perfiles de usuario o datos sensibles en el voucher
- **Usar firma asimétrica para cross-org** — RS256/ES256 permite a verificadores chequear solo con public key
- **Usar HMAC para servicios internos** — más simple, más rápido, shared secret vía secret manager
- **Verificar firma y expiración en cada petición** — nunca skip verification para callers "trusted"
- **Rotar signing keys regularmente** — el compromiso de la key compromete todos los vouchers
- **Incluir audience claim** — un voucher para el Servicio B no debería ser aceptado por el Servicio C
- **Loguear emisión de vouchers** — trackear quién emitió qué voucher para audit trails

## Errores Comunes

- Hacer vouchers de larga duración — se convierten en session tokens reutilizables, derrotando el propósito
- Embeber datos sensibles (contraseñas, PII) en claims del voucher — los vouchers pueden ser logueados
- No verificar la firma — aceptar vouchers sin firmar o tampered
- No chequear expiración — vouchers stale otorgan acceso después de deberían haber expirado
- Usar la misma key para todos los servicios — un compromiso rompe toda la cadena
- No incluir audience claim — vouchers destinados a un servicio son aceptados por otro
- Pasar vouchers en URL query strings — las URLs son logueadas por proxies y load balancers
- No rotar keys — keys de larga duración aumentan el blast radius de un compromiso

## Preguntas Frecuentes

**P: ¿En qué se diferencia el patrón Voucher de JWT?**
R: JWT es un formato de token específico (header.payload.signature). El patrón Voucher es el concepto arquitectónico de emitir claims firmados y de corta duración entre servicios. JWT es una implementación del patrón Voucher. Puedes usar tokens firmados con HMAC, tokens opacos, o cualquier formato firmado.

**P: ¿Deben los vouchers ser almacenados o stateless?**
R: Preferir vouchers stateless — la firma es la prueba. Si necesitas revocación antes de la expiración, mantener una blocklist de corta duración de IDs de vouchers revocados. El almacenamiento server-side completo derrota la ventaja stateless.

**P: ¿Cómo roto signing keys sin downtime?**
R: Publicar tanto la key vieja como la nueva durante un periodo de transición. Los verificadores aceptan tokens firmados por cualquiera de las dos keys. Después de que todos los vouchers viejos hayan expirado, remover la key vieja. Esto se llama key rollover.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
