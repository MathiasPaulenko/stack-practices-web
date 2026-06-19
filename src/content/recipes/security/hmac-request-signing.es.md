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
- Aseguras que payloads de webhooks no han sido alterados
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

## Mejores Prácticas

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
5. **Almacenar secretos en variables de entorno sin encriptar**: Usa un secret manager

## Preguntas Frecuentes

**P: ¿Es HMAC mejor que JWT para auth de servicio a servicio?**
R: HMAC es más simple y stateless para servicios internos. JWT es mejor cuando necesitas claims de identidad y verificación por terceros.

**P: ¿Cómo manejo desviación de reloj entre servicios?**
R: Permite una ventana de 5 minutos y sincroniza con NTP. Rechaza requests fuera de la ventana.

**P: ¿Puedo usar el mismo secreto para múltiples clientes?**
R: No. Cada cliente debería tener un secreto único para poder revocar uno sin afectar a otros.
