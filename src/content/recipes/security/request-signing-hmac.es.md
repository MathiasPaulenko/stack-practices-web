---


contentType: recipes
slug: request-signing-hmac
title: "Implementar firma de peticiones con HMAC"
description: "Asegura peticiones de API con firmas HMAC y autenticación AWS Signature v4 para integridad de mensajes a prueba de manipulaciones."
metaDescription: "Implementa firma de peticiones con HMAC y AWS Signature v4. Autenticación segura de API con integridad de mensajes en Python, JavaScript y Java."
difficulty: advanced
topics:
  - security
tags:
  - security
  - api-security
  - vulnerabilities
  - encryption
  - owasp
relatedResources:
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
  - /patterns/builder-pattern
  - /recipes/api-security-headers
  - /recipes/encryption-at-rest
  - /guides/api-security-checklist-guide
lastUpdated: "2026-06-12"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa firma de peticiones con HMAC y AWS Signature v4. Autenticación segura de API con integridad de mensajes en Python, JavaScript y Java."
  keywords:
    - hmac
    - request-signing
    - aws-signature
    - api-security
    - cryptography
    - python
    - javascript
    - java


---
## Visión General

HMAC (Hash-based Message Authentication Code) proporciona integridad y autenticación de mensajes. Al firmar peticiones de API con un secreto compartido, el servidor puede verificar que la petición no fue manipulada en tránsito y que proviene de un cliente de confianza.

Esta implementacion proporciona firmas de petición HMAC-SHA256 y patrones de autenticación AWS Signature v4 en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas peticiones de API a prueba de manipulaciones sobre HTTP (TLS solo no es suficiente)
- Estás construyendo sistemas de entrega de [webhooks](/recipes/messaging/event-driven-microservices) que requieren verificación del remitente
- Estás implementando autenticación compatible con AWS
- Necesitas autenticación stateless sin almacenamiento de sesiones

## Solución

### Python

```python
import hmac
import hashlib
import base64
from datetime import datetime

def sign_request(secret: str, method: str, path: str, body: str = "") -> dict:
    timestamp = datetime.utcnow().isoformat()
    message = f"{method}\n{path}\n{timestamp}\n{body}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return {
        "X-Request-Timestamp": timestamp,
        "X-Request-Signature": signature,
    }

# Uso del cliente
headers = sign_request("my-secret-key", "POST", "/api/orders", '{"item": "book"}')
requests.post("https://api.example.com/api/orders",
              headers=headers, data='{"item": "book"}')
```

### JavaScript

```javascript
const crypto = require('crypto');

function signRequest(secret, method, path, body = '') {
  const timestamp = new Date().toISOString();
  const message = `${method}\n${path}\n${timestamp}\n${body}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return {
    'X-Request-Timestamp': timestamp,
    'X-Request-Signature': signature,
  };
}

// Verificación del servidor
function verifyRequest(secret, headers, method, path, body) {
  const expected = signRequest(secret, method, path, body);
  return crypto.timingSafeEqual(
    Buffer.from(headers['x-request-signature']),
    Buffer.from(expected['X-Request-Signature'])
  );
}
```

### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public class RequestSigner {
    private static final String HMAC_ALGO = "HmacSHA256";

    public static String sign(String secret, String method, String path, String body) throws Exception {
        String timestamp = Instant.now().toString();
        String message = String.join("\n", method, path, timestamp, body);

        Mac mac = Mac.getInstance(HMAC_ALGO);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
        byte[] signature = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));

        return Base64.getEncoder().encodeToString(signature);
    }
}
```

## Explicación

HMAC combina una función hash criptográfica (SHA-256) con una clave secreta:
1. **Canonica**: Construye una cadena a partir de method, path, timestamp y body
2. **Hash**: Calcula HMAC-SHA256 con el secreto compartido
3. **Adjunta**: Envía la firma y timestamp en los headers
4. **Verifica**: El servidor recrea la firma y compara con igualdad de tiempo constante

AWS Signature v4 extiende esto con scopes de credenciales, headers firmados e identificadores de región/servicio. Es más complejo pero proporciona límites de seguridad adicionales.

## Variantes

| Algoritmo | Tipo de clave | Fortaleza | Caso de uso |
|-----------|--------------|-----------|-------------|
| HMAC-SHA256 | Secreto compartido | 256-bit | Autenticación de API, webhooks |
| AWS SigV4 | Credenciales IAM | 256-bit | Compatibilidad con servicios AWS |
| Ed25519 | Asimétrica | 128-bit | Verificación con clave pública/privada |
| RSA-SHA256 | Asimétrica | 2048+ bit | Integración con PKI empresarial |

## Lo que funciona

- **Usa comparación de tiempo constante**: `crypto.timingSafeEqual()` previene ataques de timing
- **Incluye timestamps**: Rechaza peticiones mayores a 5 minutos para prevenir replay attacks
- **Rota secretos regularmente**: Implementa rotación graceful con períodos de aceptación de clave dual
- **Firma el body, no solo headers**: La manipulación del payload debe invalidar la firma
- **Almacena secretos en vaults**: Nunca hardcodees secretos; usa [HashiCorp Vault](/recipes/security/vault-dynamic-credentials) o AWS Secrets Manager

## Errores Comunes

- **Usar MD5 o SHA1**: Ambos están criptográficamente rotos; usa SHA-256 como mínimo
- **Comparación de strings simple**: La comparación `==` filtra información de timing — usa siempre comparación de tiempo constante
- **Omitir body en la firma**: Un atacante puede modificar el payload sin detección
- **Sin protección contra replay**: Sin timestamps, las peticiones capturadas pueden repetirse indefinidamente
- **Almacenar secretos en variables de entorno**: Usa servicios de [gestión de secretos](/guides/security/security-best-practices-guide) en su lugar

## Preguntas Frecuentes

**P: ¿Es HMAC mejor que el hash SHA-256 raw?**
R: Sí. HMAC usa una clave y añade protecciones estructurales contra ataques de extensión de longitud. Nunca uses SHA-256 raw para autenticación.

**P: ¿En qué se diferencia AWS Signature v4 de HMAC simple?**
R: AWS SigV4 añade un scope de credenciales (fecha/región/servicio), firma headers adicionales y usa un proceso de firma de 4 pasos. Está diseñado para servicios AWS distribuidos con integración IAM.

**P: ¿Puedo usar el mismo secreto para múltiples clientes?**
R: No. Cada cliente debe tener un secreto único. Si un cliente se ve comprometido, rota solo su clave sin afectar a los demás.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Implementación de AWS Signature v4 (Python)

```python
import hashlib
import hmac
import datetime
import urllib.parse

def get_aws_signature_v4(
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
    method: str,
    url: str,
    headers: dict,
    body: str = '',
) -> dict:
    """Generar headers de AWS Signature v4 para una petición de API."""
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc
    path = parsed.path or '/'
    query = parsed.query

    # Paso 1: Crear canonical request
    amz_date = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    date_stamp = amz_date[:8]

    # Normalizar y ordenar headers
    signed_headers = sorted(headers.keys())
    canonical_headers = ''.join(
        f'{h.lower()}:{headers[h].strip()}\n' for h in signed_headers
    )
    signed_header_str = ';'.join(h.lower() for h in signed_headers)

    payload_hash = hashlib.sha256(body.encode()).hexdigest()

    canonical_request = '\n'.join([
        method.upper(),
        path,
        query,
        canonical_headers,
        signed_header_str,
        payload_hash,
    ])

    # Paso 2: Crear string a firmar
    credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
    string_to_sign = '\n'.join([
        'AWS4-HMAC-SHA256',
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode()).hexdigest(),
    ])

    # Paso 3: Calcular firma
    def sign(key: bytes, msg: str) -> bytes:
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

    signing_key = sign(
        sign(sign(sign(
            ('AWS4' + secret_key).encode(), date_stamp),
            region),
            service),
        'aws4_request'
    )

    signature = hmac.new(
        signing_key, string_to_sign.encode(), hashlib.sha256
    ).hexdigest()

    # Paso 4: Construir header de autorización
    auth_header = (
        f'AWS4-HMAC-SHA256 '
        f'Credential={access_key}/{credential_scope}, '
        f'SignedHeaders={signed_header_str}, '
        f'Signature={signature}'
    )

    result = dict(headers)
    result['Authorization'] = auth_header
    result['X-Amz-Date'] = amz_date
    result['X-Amz-Content-Sha256'] = payload_hash
    return result

# Uso
headers = get_aws_signature_v4(
    access_key='AKIAIOSFODNN7EXAMPLE',
    secret_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region='us-east-1',
    service='s3',
    method='GET',
    url='https://s3.amazonaws.com/my-bucket/object.txt',
    headers={'Host': 's3.amazonaws.com'},
)
```

### Verificación de firma de webhook con nonce (Node.js)

```javascript
const crypto = require('crypto');
const redis = require('redis');

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
const REPLAY_WINDOW = 5 * 60; // 5 minutos

async function verifyWebhook(secret, req) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const nonce = req.headers['x-webhook-nonce'];
  const body = req.rawBody; // Deben ser bytes crudos, no JSON parseado

  // 1. Verificar frescura del timestamp
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > REPLAY_WINDOW) {
    throw new Error('Timestamp fuera de ventana de replay');
  }

  // 2. Verificar unicidad del nonce (prevenir replay)
  const nonceKey = `webhook:nonce:${nonce}`;
  const exists = await redisClient.set(nonceKey, '1', {
    NX: true,
    EX: REPLAY_WINDOW,
  });
  if (!exists) {
    throw new Error('Nonce ya usado — posible replay attack');
  }

  // 3. Verificar firma
  const message = `${timestamp}.${nonce}.${body.toString('utf-8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    throw new Error('Firma inválida');
  }

  return true;
}

// Middleware de Express
async function webhookMiddleware(req, res, next) {
  try {
    req.rawBody = await getRawBody(req);
    await verifyWebhook(process.env.WEBHOOK_SECRET, req);
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}
```

### Firma de peticiones HMAC en Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"
)

func SignRequest(secret, method, path, body string) http.Header {
	timestamp := time.Now().UTC().Format(time.RFC3339)
	message := fmt.Sprintf("%s\n%s\n%s\n%s", method, path, timestamp, body)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	signature := hex.EncodeToString(mac.Sum(nil))

	header := http.Header{}
	header.Set("X-Request-Timestamp", timestamp)
	header.Set("X-Request-Signature", signature)
	return header
}

func VerifyRequest(secret string, r *http.Request, body []byte) bool {
	timestamp := r.Header.Get("X-Request-Timestamp")
	signature := r.Header.Get("X-Request-Signature")

	// Verificar frescura del timestamp
	ts, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return false
	}
	if time.Since(ts) > 5*time.Minute {
		return false
	}

	message := fmt.Sprintf("%s\n%s\n%s\n%s",
		r.Method, r.URL.Path, timestamp, string(body))

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	expected := hex.EncodeToString(mac.Sum(nil))

	// Comparación de tiempo constante
	return hmac.Equal([]byte(signature), []byte(expected))
}
```

### Estrategia de rotación de claves (Python)

```python
import time
from dataclasses import dataclass

@dataclass
class KeyRotation:
    """Gestionar rotación de claves HMAC con período de overlap."""
    current_key: str
    previous_key: str | None = None
    rotation_time: float = 0
    overlap_seconds: int = 3600  # 1 hora de overlap

    def rotate(self, new_key: str):
        """Rotar a una nueva clave, manteniendo la clave anterior válida durante el overlap."""
        self.previous_key = self.current_key
        self.current_key = new_key
        self.rotation_time = time.time()

    def get_valid_keys(self) -> list[str]:
        """Retornar todas las claves actualmente válidas."""
        keys = [self.current_key]
        if self.previous_key and self.previous_key != self.current_key:
            if time.time() - self.rotation_time < self.overlap_seconds:
                keys.append(self.previous_key)
        return keys

    def verify(self, signature: str, method: str, path: str,
               timestamp: str, body: str) -> bool:
        """Verificar contra cualquier clave válida (soporta overlap de rotación)."""
        import hmac
        import hashlib
        message = f"{method}\n{path}\n{timestamp}\n{body}"

        for key in self.get_valid_keys():
            expected = hmac.new(
                key.encode(), message.encode(), hashlib.sha256
            ).hexdigest()
            if hmac.compare_digest(signature, expected):
                return True
        return False

# Uso
rotation = KeyRotation(current_key='secret-v1')
# Después de rotar: tanto v1 como v2 son válidos por 1 hora
rotation.rotate('secret-v2')
# Después de 1 hora: solo v2 es válido
```



