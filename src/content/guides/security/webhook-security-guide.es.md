---
contentType: guides
slug: webhook-security-guide
title: "Seguridad de Webhooks — Entrega, Verificación y Protección"
description: "Guía práctica para asegurar webhooks: verificación de firmas, prevención de ataques de repetición, cifrado de payloads y endurecimiento de endpoints para entrega confiable."
metaDescription: "Asegura webhooks con verificación de firmas, protección contra repetición y cifrado de payloads. Guía práctica de seguridad para desarrolladores."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - webhook
  - security
  - api
  - signature-verification
  - replay-attacks
  - encryption
  - guide
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/web-application-security-guide
  - /recipes/api-rate-limiting-redis
  - /recipes/websocket-authentication
  - /recipes/data-validation-zod
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Asegura webhooks con verificación de firmas, protección contra repetición y cifrado de payloads. Guía práctica de seguridad para desarrolladores."
  keywords:
    - webhook
    - seguridad
    - api
    - verificacion de firmas
    - ataques de repeticion
    - cifrado
    - guia
---
## Visión General

Los webhooks son la infraestructura de integración moderna. Stripe envía eventos de pago a tu endpoint. GitHub notifica tu pipeline CI sobre pushes. Slack envía interacciones de usuario a tu servidor. Pero cada webhook es un request HTTP entrante no solicitado a tu infraestructura — y cada request entrante es una superficie de ataque. Esta guía cubre cómo asegurar webhooks con verificación de firmas, protección contra repetición, cifrado de payloads y endurecimiento de endpoints.

## Cuándo Usar

Usa esta guía cuando:
- Estás implementando endpoints webhook por primera vez
- Recibes webhooks de proveedores de terceros y necesitas validar su autenticidad
- Tu endpoint webhook está experimentando spam, ataques de repetición o payloads maliciosos

## Solución

### Arquitectura de Seguridad de Webhook

| Capa | Mecanismo | Implementación |
|------|-----------|----------------|
| **Transporte** | TLS 1.2+ obligatorio | Rechazar conexiones HTTP sin redirección |
| **Autenticación** | Firma HMAC-SHA256 del payload | Verificar contra secret compartido |
| **Protección de repetición** | Timestamp + nonce, rechazar requests > 5 min | Comparar timestamp contra reloj del servidor |
| **Payload** | Cifrado opcional para datos sensibles | AES-256-GCM con clave derivada del secreto |
| **Endpoint** | Rate limiting, validación de schema, lista blanca de IPs | Rechazar requests malformados antes de procesar |
| **Monitoreo** | Logs de entrega, reintentos con backoff exponencial | Alertar en múltiples fallos consecutivos |

### Verificación de Firma

```python
import hmac
import hashlib
import time

def verify_webhook(payload: bytes, signature: str, secret: bytes, tolerance=300) -> bool:
    """
    Verifica firma HMAC-SHA256 de webhook.
    Formato esperado de signature: 't=<timestamp>,v1=<hex>'
    """
    try:
        # Parsear header de firma
        parts = dict(p.split('=') for p in signature.split(','))
        timestamp = int(parts['t'])
        expected_sig = parts['v1']

        # Verificar freshness
        if abs(time.time() - timestamp) > tolerance:
            return False

        # Recomputar firma
        signed_payload = f"{timestamp}.".encode() + payload
        computed = hmac.new(secret, signed_payload, hashlib.sha256).hexdigest()

        # Comparación constant-time
        return hmac.compare_digest(computed, expected_sig)
    except (ValueError, KeyError):
        return False
```

### Prevención de Repetición

```python
import redis

class ReplayProtection:
    def __init__(self, redis_client, window_seconds=300):
        self.redis = redis_client
        self.window = window_seconds

    def is_fresh(self, event_id: str, timestamp: float) -> bool:
        """Rechaza eventos duplicados o muy antiguos."""
        now = time.time()
        if now - timestamp > self.window:
            return False

        # Deduplicación con TTL de ventana
        key = f"webhook:{event_id}"
        if self.redis.set(key, "1", nx=True, ex=self.window):
            return True
        return False  # Duplicate
```

### Endpoint Webhook Hardened

```python
from fastapi import FastAPI, Request, HTTPException
import json

app = FastAPI()

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    # 1. Rate limiting (middleware)
    # 2. Extraer firma
    sig_header = request.headers.get("Stripe-Signature")
    if not sig_header:
        raise HTTPException(400, "Missing signature")

    # 3. Leer raw payload — NO parsear JSON antes de verificar firma
    payload = await request.body()

    # 4. Verificar firma
    if not verify_stripe_signature(payload, sig_header, WEBHOOK_SECRET):
        raise HTTPException(401, "Invalid signature")

    # 5. Parsear payload solo después de verificación
    event = json.loads(payload)

    # 6. Procesar evento
    handle_stripe_event(event)
    return {"status": "ok"}
```

## Explicación

La verificación de firma es tu línea de defensa más importante. Funciona porque tanto tú como el emisor conocen un secreto que nunca viaja por la red. El emisor firma el payload con HMAC-SHA256; tú recalculas la misma firma. Si coinciden, el payload no fue modificado y proviene del emisor legítimo. **Nunca parsees el payload JSON antes de verificar la firma** — un atacante podría enviar JSON malformado que cause excepciones y filtre detalles de implementación.

La protección contra repetición previene que un atacante capture un webhook legítimo y lo re-envíe. Incluso sin el secreto, un webhook re-played puede causar daño (ej. procesar un pago dos veces). El timestamp en la firma asegura que el webhook es reciente; el nonce/event_id previene re-entrega exacta.

El cifrado de payload es raramente necesario si ya usas TLS, pero puede requerirse para datos altamente sensibles (información de salud, financiera). En ese caso, el emisor cifra el payload con AES-256-GCM y tú descifras antes de procesar. Esto protege contra intermediarios maliciosos incluso si TLS es comprometido.

## Variantes

| Proveedor | Formato de Firma | Secret | Documentación |
|-----------|-----------------|--------|---------------|
| **Stripe** | `t=<ts>,v1=<sig>` | Secreto de endpoint webhook | Requiere timestamp + v1 |
| **GitHub** | `sha256=<sig>` | Secreto de webhook | Firma directa del payload |
| **Slack** | `x-slack-signature` | Signing secret | Similar a Stripe con timestamp |
| **Shopify** | `hmac=<sig>` | Clave API | Query string HMAC para webhooks de app |
| **Genérico** | `X-Webhook-Signature` | Secreto compartido | Implementación personalizada recomendada |

## Lo que funciona

1. Usa **TLS 1.3** y rechaza HTTP plano — redirige a HTTPS sin procesar el payload
2. Almacena **secretos en variables de entorno** o secret managers, nunca en código
3. Implementa **idempotencia en el procesamiento** — el mismo event_id no debe ejecutar acción dos veces
4. Responde con **200 OK rápidamente** y procesa asíncronamente; timeouts causarán reintentos
5. Rota **secretos periódicamente** usando mecanismos de doble secreto del proveedor si disponible

## Errores Comunes

1. Verificar firma con **comparación de strings normal** en lugar de `hmac.compare_digest`; vulnerable a timing attacks
2. **Parsear JSON antes de verificar firma**; expones la aplicación a payloads maliciosos
3. No validar **timestamps**; aceptar webhooks de cualquier edad permite ataques de repetición
4. Procesar webhooks **síncronamente** en el hilo del request; timeouts causan reintentos en cascada
5. **Loggear payloads completos** incluyendo PII; los logs no deben contener datos sensibles

## Preguntas Frecuentes

### ¿Necesito cifrar el payload si ya uso HTTPS?

HTTPS (TLS) protege el payload en tránsito contra sniffing pasivo. El cifrado de payload adicional protege contra:
- Compromiso de certificados TLS
- Almacenamiento de payload en logs de proxy/intermediario
- Re-envío de webhook a un endpoint comprometido

Para la mayoría de casos, TLS + verificación de firma es suficiente. Agrega cifrado de payload solo si tus datos son regulados (HIPAA, PCI) o si el emisor no soporta firmas.

### ¿Cómo manejo reintentos del emisor si mi endpoint está caído?

Diseña para **idempotencia** desde el inicio. Cada evento debe tener un ID único; almacénalo con estado "procesado" en tu base de datos. Si el mismo evento llega de nuevo (reintento), devuelve 200 OK sin re-ejecutar la acción. Usa un TTL en tu tabla de deduplicación (24-72 horas típicamente). No dependas de que el emisor te avise que es un reintento — algunos no lo hacen.

### ¿Qué pasa si el secreto de firma se filtra?

Rota inmediatamente. La mayoría de proveedores permiten configurar un nuevo secreto mientras el anterior sigue funcionando (ventana de migración). Genera un nuevo secreto, actualiza tu aplicación, verifica que los webhooks nuevos funcionan, luego invalida el anterior. Si no hay soporte de doble secreto, acepta un breve periodo de fallo mientras rotas.
