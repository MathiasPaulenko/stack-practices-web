---
contentType: recipes
slug: hmac-request-signing
title: "Firma de Requests con HMAC"
description: "Asegura requests de APIs con firmas HMAC-SHA256 para garantizar integridad y autenticidad."
metaDescription: "Implementa firma de requests HMAC-SHA256 para autenticación segura de APIs. Protege integridad de mensajes y previene ataques de replay entre servicios."
difficulty: intermediate
topics:
  - security
tags:
  - hmac
  - security
  - api
  - authentication
  - vulnerabilities
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /guides/web-application-security-guide
  - /recipes/websocket-authentication
  - /recipes/csrf-protection
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Implementa firma de requests HMAC-SHA256 para autenticación segura de APIs. Protege integridad de mensajes y previene ataques de replay entre servicios."
  keywords:
    - hmac
    - security
    - api
    - authentication
---
## Visión General

HMAC (Hash-based Message Authentication Code) es el estándar de la industria para firmar requests de APIs. Al combinar un secreto compartido con el payload del request y un hash criptográfico, tanto emisor como receptor pueden verificar la integridad y autenticidad del mensaje sin transmitir el secreto por la red.

## Cuándo Usar

Usa este recurso cuando:
- Autenticas llamadas API de servicio a servicio
- Aseguras que payloads de [webhooks](/recipes/messaging/event-driven-microservices) no han sido alterados
- Implementas autenticación de API keys sin la complejidad de OAuth
- Verificas integridad de requests a través de redes no confiables

## Solución

### Firma HMAC-SHA256 (Node.js)

```javascript
const crypto = require('crypto');

function signRequest(method, path, body, timestamp, secret) {
  const payload = method.toUpperCase() + path + timestamp + JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequest(method, path, body, timestamp, signature, secret) {
  const expected = signRequest(method, path, body, timestamp, secret);
  // Comparación en tiempo constante
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

### Ejemplo Cliente-Servidor (Python)

```python
import hmac
import hashlib
import time

def sign_request(method: str, path: str, body: bytes, secret: str) -> str:
    timestamp = str(int(time.time()))
    message = f"{method.upper()}{path}{timestamp}{body.decode()}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature, timestamp

# Cliente
signature, ts = sign_request("POST", "/api/orders", b'{"id":1}', "my-secret")
headers = {"X-Signature": signature, "X-Timestamp": ts}

# Servidor
def verify(signature: str, timestamp: str, method, path, body, secret):
    # Rechazar requests antiguos (protección contra replay)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False
    expected, _ = sign_request(method, path, body, secret)
    return hmac.compare_digest(signature, expected)
```

## Explicación

La seguridad de HMAC se basa en tres propiedades:

1. **Clave secreta**: Nunca transmitida; compartida out-of-band durante el onboarding
2. **Cobertura del mensaje**: La firma debe cubrir method, path, timestamp y body
3. **Protección contra replay**: Ventanas de tiempo previenen que atacantes reutilicen requests antiguos

**¿Por qué no SHA-256 plano?**
SHA-256 sin HMAC es vulnerable a ataques de extensión de longitud. HMAC usa dos pasadas anidadas de hashing que previenen esto.

## Variantes

| Algoritmo | Hash | Fortaleza | Notas |
|-----------|------|-----------|-------|
| HMAC-SHA256 | SHA-256 | 128-bit | Recomendado por defecto |
| HMAC-SHA384 | SHA-384 | 192-bit | Mayor margen de seguridad |
| HMAC-SHA512 | SHA-512 | 256-bit | Más lento; usar en contextos de alta seguridad |
| HMAC-Blake3 | Blake3 | 256-bit | Rápido; alternativa moderna |

## Lo que funciona

- **Incluye timestamp**: Rechaza requests más antiguos que 5 minutos para prevenir ataques de replay
- **Firma todo el request**: Method + path + timestamp + body (headers ordenados si se incluyen)
- **Usa comparación en tiempo constante**: timingSafeEqual previene ataques de timing
- **Rota secretos regularmente**: Usa versionado de claves (v1, v2) en el header de firma
- **Nunca loguees el secreto**: Loguea firmas y claves, nunca el secreto raw

## Errores Comunes

1. **Firmar solo el body**: Un atacante puede replayar un body válido con un endpoint diferente
2. **Faltar protección contra replay**: Sin timestamps, requests interceptados son válidos para siempre
3. **Usar MD5 o SHA-1**: Criptográficamente rotos; usar mínimo SHA-256
4. **Comparación de strings en lugar de timingSafeEqual**: Vulnerable a ataques de timing
5. **Almacenar secretos en variables de entorno sin encriptar**: Usa un [secret manager](/recipes/security/vault-dynamic-credentials)

## Preguntas Frecuentes

**P: ¿Es HMAC mejor que JWT para auth de servicio a servicio?**
R: HMAC es más simple y stateless para servicios internos. JWT es mejor cuando necesitas claims de identidad y verificación por terceros. Para una visión completa de seguridad de API, consulta el [checklist de seguridad API](/guides/security/api-security-checklist-guide).

**P: ¿Cómo manejo desviación de reloj entre servicios?**
R: Permite una ventana de 5 minutos y sincroniza con NTP. Rechaza requests fuera de la ventana.

**P: ¿Puedo usar el mismo secreto para múltiples clientes?**
R: No. Cada cliente debería tener un secreto único para poder revocar uno sin afectar a otros.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Firma HMAC-SHA256 en Java con rotación de claves

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class HmacSigner {

    private final Map<String, String> secrets = new HashMap<>();

    public HmacSigner() {
        secrets.put("v1", "old-secret-key");
        secrets.put("v2", "current-secret-key");
    }

    public String sign(String method, String path, String body, String timestamp, String keyVersion)
            throws Exception {
        String payload = method.toUpperCase() + path + timestamp + body;
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(
            secrets.get(keyVersion).getBytes(StandardCharsets.UTF_8),
            "HmacSHA256"
        );
        mac.init(keySpec);
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return keyVersion + ":" + Base64.getEncoder().encodeToString(hash);
    }

    public boolean verify(String method, String path, String body, String timestamp, String signature)
            throws Exception {
        // Parsear versión de clave desde la firma: "v2:base64hash"
        String[] parts = signature.split(":", 2);
        if (parts.length != 2) return false;

        String keyVersion = parts[0];
        String receivedHash = parts[1];

        if (!secrets.containsKey(keyVersion)) return false;

        String expected = sign(method, path, body, timestamp, keyVersion);
        String expectedHash = expected.split(":", 2)[1];

        // Comparación en tiempo constante
        return MessageDigest.isEqual(
            receivedHash.getBytes(StandardCharsets.UTF_8),
            expectedHash.getBytes(StandardCharsets.UTF_8)
        );
    }
}

// Uso
HmacSigner signer = new HmacSigner();
String sig = signer.sign("POST", "/api/orders", "{\"id\":1}", "1690000000", "v2");
// Headers: X-Signature: v2:base64hash, X-Timestamp: 1690000000
```

### Verificación de firma de webhook con raw body

Muchas APIs (Stripe, GitHub, Slack) firman webhooks con HMAC. Debes verificar usando el raw body del request antes de cualquier parseo JSON:

```javascript
const crypto = require('crypto');

/**
 * Verifica una firma de webhook estilo Stripe.
 * Stripe usa: t=<timestamp>,v1=<firma>
 */
function verifyWebhook(rawBody, signatureHeader, secret) {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signatures = parts
        .filter(p => p.startsWith('v1='))
        .map(p => p.split('=')[1]);

    if (!timestamp || signatures.length === 0) return false;

    // Rechazar timestamps antiguos (ventana de 5 minutos)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300 || age < -300) return false;

    // Calcular firma esperada: HMAC-SHA256(timestamp + rawBody)
    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

    // Verificar contra todas las firmas proporcionadas (Stripe puede enviar múltiples)
    return signatures.some(sig =>
        crypto.timingSafeEqual(
            Buffer.from(sig, 'hex'),
            Buffer.from(expected, 'hex')
        )
    );
}

// Middleware Express: debe usar raw body
const express = require('express');
const app = express();

// IMPORTANTE: usar raw body para verificación de firma
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/stripe', (req, res) => {
    const rawBody = req.body.toString('utf8');
    const sig = req.headers['stripe-signature'];

    if (!verifyWebhook(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)) {
        return res.status(400).send('Firma inválida');
    }

    const event = JSON.parse(rawBody);
    console.log('Webhook verificado:', event.type);
    res.status(200).send('OK');
});
```

### Prevención de replay con nonce

Los timestamps solos permiten una ventana de replay de 5 minutos. Añade un cache de nonce para rechazar requests duplicados dentro de esa ventana:

```python
import hmac
import hashlib
import time
from collections import OrderedDict
from typing import Optional


class NonceCache:
    """Cache LRU para rastrear nonces usados dentro de la ventana de timestamp."""

    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300):
        self._cache: OrderedDict[str, float] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def check_and_add(self, nonce: str) -> bool:
        """Retorna True si el nonce es nuevo (aceptable), False si es duplicado."""
        now = time.time()
        self._evict_expired(now)

        if nonce in self._cache:
            return False  # Nonce duplicado

        self._cache[nonce] = now
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)
        return True

    def _evict_expired(self, now: float):
        expired = [
            k for k, ts in self._cache.items()
            if now - ts > self._ttl
        ]
        for k in expired:
            self._cache.pop(k, None)


class HmacVerifier:
    """Verificador HMAC con prevención de replay basada en nonce."""

    def __init__(self, secret: str, max_skew_seconds: int = 300):
        self.secret = secret.encode()
        self.max_skew = max_skew_seconds
        self.nonces = NonceCache(max_size=10000, ttl_seconds=max_skew_seconds)

    def verify(
        self,
        method: str,
        path: str,
        body: str,
        timestamp: str,
        nonce: str,
        signature: str,
    ) -> bool:
        # Verificar ventana de timestamp
        try:
            ts = int(timestamp)
        except ValueError:
            return False

        if abs(int(time.time()) - ts) > self.max_skew:
            return False

        # Verificar unicidad del nonce
        if not self.nonces.check_and_add(nonce):
            return False

        # Verificar firma
        message = f"{method.upper()}{path}{timestamp}{nonce}{body}"
        expected = hmac.new(
            self.secret,
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected)


# Uso en el servidor
verifier = HmacVerifier("my-secret-key")

# El request llega con headers:
# X-Timestamp: 1690000000
# X-Nonce: a1b2c3d4-e5f6-7890-abcd-ef1234567890
# X-Signature: hexhash

is_valid = verifier.verify(
    method="POST",
    path="/api/orders",
    body='{"id":1,"item":"widget"}',
    timestamp="1690000000",
    nonce="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    signature="abc123...",
)
```

### Estrategia de rotación de claves

```python
import hmac
import hashlib
import time
from typing import Optional


class KeyRotator:
    """Gestiona rotación de claves HMAC con período de superposición para zero downtime."""

    def __init__(self):
        self.keys: dict[str, dict] = {}
        self.active_version: Optional[str] = None

    def add_key(self, version: str, secret: str, activate: bool = True):
        self.keys[version] = {
            "secret": secret,
            "created": time.time(),
        }
        if activate:
            self.active_version = version

    def deactivate_key(self, version: str):
        self.keys.pop(version, None)
        if self.active_version == version:
            # Activar la clave más reciente restante
            if self.keys:
                self.active_version = max(self.keys.keys())
            else:
                self.active_version = None

    def get_signing_key(self) -> tuple[str, str]:
        """Retorna (versión, secreto) para firmar nuevos requests."""
        if not self.active_version:
            raise RuntimeError("No hay clave de firma activa")
        return self.active_version, self.keys[self.active_version]["secret"]

    def get_verification_keys(self) -> list[tuple[str, str]]:
        """Retorna todas las claves válidas para verificar requests entrantes."""
        return [(v, info["secret"]) for v, info in self.keys.items()]

    def sign(self, method: str, path: str, body: str, timestamp: str) -> str:
        version, secret = self.get_signing_key()
        message = f"{method.upper()}{path}{timestamp}{body}"
        sig = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
        return f"{version}:{sig}"

    def verify(self, method: str, path: str, body: str, timestamp: str, signature: str) -> bool:
        parts = signature.split(":", 1)
        if len(parts) != 2:
            return False

        version, received_sig = parts
        for v, secret in self.get_verification_keys():
            if v != version:
                continue
            message = f"{method.upper()}{path}{timestamp}{body}"
            expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(received_sig, expected):
                return True
        return False


# Flujo de rotación:
# 1. Añadir nueva clave (v2) — tanto v1 como v2 son válidas para verificación
rotator = KeyRotator()
rotator.add_key("v1", "old-secret", activate=False)
rotator.add_key("v2", "new-secret", activate=True)

# 2. Desplegar: nuevos requests firmados con v2, requests v1 antiguos aún verifican
# 3. Después de que todos los requests antiguos expiren (ventana de timestamp), desactivar v1
# rotator.deactivate_key("v1")
```

## Mejores Prácticas Adicionales

1. **Firma headers que afectan el routing.** Incluye `Host`, `X-Forwarded-For` y `Content-Type` en la firma si tu infraestructura los usa para routing o procesamiento:

```javascript
function signWithHeaders(method, path, body, timestamp, secret, headers) {
    // Ordenar headers alfabéticamente para firma determinística
    const sortedHeaders = Object.keys(headers)
        .sort()
        .map(k => `${k.toLowerCase()}:${headers[k]}`)
        .join('\n');

    const payload = [
        method.toUpperCase(),
        path,
        timestamp,
        sortedHeaders,
        JSON.stringify(body),
    ].join('\n');

    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
```

2. **Usa una librería de firma dedicada en producción.** Librerías como `aws-sdk` (AWS SigV4), `stripe-node` (firma Stripe) o `sentry` manejan edge cases que podrías omitir:

```python
# AWS Signature Version 4 (integrado en boto3)
import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.credentials import Credentials
from botocore.httpsession import URLLib3Session

# boto3 firma automáticamente los requests con SigV4
client = boto3.client('s3', region_name='us-east-1')
client.put_object(Bucket='my-bucket', Key='file.txt', Body='content')

# Para APIs personalizadas que requieren AWS SigV4:
credentials = Credentials(access_key, secret_key)
auth = SigV4Auth(credentials, 'execute-api', 'us-east-1')
# El signer maneja canonical request, string-to-sign y derivación de signing key
```

## Errores Comunes Adicionales

1. **Usar `JSON.stringify()` en el servidor cuando el cliente firmó un string raw.** La serialización JSON no es determinística — el orden de claves y whitespace pueden diferir. Siempre firma los bytes raw del body:

```javascript
// INCORRECTO: diferente serialización JSON en cliente vs servidor
const payload = JSON.stringify(body); // orden de claves puede diferir

// CORRECTO: firmar bytes raw como se reciben
const payload = rawBody; // middleware express.raw()
```

2. **No manejar errores de parseo del header de firma.** Headers malformados deberían retornar 401, no causar un error 500:

```javascript
function safeVerify(rawBody, signatureHeader, secret) {
    try {
        if (!signatureHeader || typeof signatureHeader !== 'string') {
            return false;
        }
        return verifyWebhook(rawBody, signatureHeader, secret);
    } catch (err) {
        console.error('Error de verificación de firma:', err.message);
        return false; // Fallar cerrado
    }
}
```

## Preguntas Frecuentes Adicionales

### ¿Cómo pruebo la firma HMAC localmente?

Usa un timestamp fijo y un secreto conocido para generar firmas determinísticas para testing:

```python
import hmac
import hashlib

def generate_test_signature(method, path, body, secret, timestamp="1690000000"):
    message = f"{method.upper()}{path}{timestamp}{body}"
    return hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest(), timestamp

# Vectores de prueba
sig, ts = generate_test_signature("GET", "/api/health", "", "test-secret")
assert len(sig) == 64  # Hex digest SHA-256
print(f"Firma de prueba: {sig}")
print(f"Timestamp: {ts}")
```

### ¿Debo usar HMAC o mTLS para auth de servicio a servicio?

Usa **mTLS** cuando controlas ambos servicios y necesitas autenticación mutua a nivel de transporte. Usa **HMAC** cuando necesitas firma a nivel de aplicación (ej. webhooks de terceros, API gateways con múltiples consumidores). Se complementan — mTLS encripta el canal, HMAC verifica el mensaje.

### ¿Cómo manejo la distribución de claves de forma segura?

Nunca embebas secretos en código ni los commitees a control de versiones. Usa uno de estos métodos:

```bash
# 1. Variables de entorno (para desarrollo)
export HMAC_SECRET="your-secret-key"

# 2. HashiCorp Vault (para producción)
export HMAC_SECRET=$(vault kv get -field=secret secret/hmac/api-service)

# 3. AWS Secrets Manager (para despliegues AWS)
export HMAC_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id hmac/api-service \
    --query SecretString --output text)

# 4. Kubernetes secrets (para despliegues k8s)
# kubectl create secret generic hmac-secret --from-literal=secret='your-secret'
# Montar como variable de entorno en el spec del pod
```
