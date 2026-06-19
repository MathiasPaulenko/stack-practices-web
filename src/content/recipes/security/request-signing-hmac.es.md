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
relatedResources:
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
  - /patterns/builder-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
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

Esta receta implementa firmas de petición HMAC-SHA256 y patrones de autenticación AWS Signature v4 en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas peticiones de API a prueba de manipulaciones sobre HTTP (TLS solo no es suficiente)
- Estás construyendo sistemas de entrega de [webhooks](/recipes/serverless/event-driven-functions) que requieren verificación del remitente
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

## Mejores Prácticas

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
- **Almacenar secretos en variables de entorno**: Usa servicios de [gestión de secretos](/guides/devops/secrets-management-guide) en su lugar

## Preguntas Frecuentes

**P: ¿Es HMAC mejor que el hash SHA-256 raw?**
R: Sí. HMAC usa una clave y añade protecciones estructurales contra ataques de extensión de longitud. Nunca uses SHA-256 raw para autenticación.

**P: ¿En qué se diferencia AWS Signature v4 de HMAC simple?**
R: AWS SigV4 añade un scope de credenciales (fecha/región/servicio), firma headers adicionales y usa un proceso de firma de 4 pasos. Está diseñado para servicios AWS distribuidos con integración IAM.

**P: ¿Puedo usar el mismo secreto para múltiples clientes?**
R: No. Cada cliente debe tener un secreto único. Si un cliente se ve comprometido, rota solo su clave sin afectar a los demás.
