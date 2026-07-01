---
contentType: recipes
slug: webhooks
title: "Webhooks"
description: "Cómo crear y consumir endpoints de webhook para integraciones event-driven en tiempo real."
metaDescription: "Aprende a implementar webhooks en Python, JavaScript y Java. Incluye verificación de firma, reintentos, idempotencia y diseño de esquemas de eventos."
difficulty: intermediate
topics:
  - api
tags:
  - api
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/middleware
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar webhooks en Python, JavaScript y Java. Incluye verificación de firma, reintentos, idempotencia y diseño de esquemas de eventos."
  keywords:
    - webhooks implementacion
    - webhook seguridad firma
    - idempotencia webhook
    - event driven architecture
    - webhook retries python
---
## Visión General

Los webhooks son callbacks HTTP que habilitan comunicación en tiempo real, dirigida por eventos, entre sistemas. En lugar de hacer polling a una API cada pocos minutos, un webhook empuja datos a tu endpoint en el momento en que ocurre un evento. Esta receta cubre la implementación de endpoints de webhook seguros con verificación de firma, lógica de reintentos e idempotencia en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Integres con servicios de terceros que emiten eventos (Stripe, GitHub, Slack). Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para integraciones seguras.
- Construyas una plataforma SaaS que notifique a clientes sobre cambios de estado
- Necesites actualizaciones en tiempo real sin la latencia y costo del polling
- Diseñes una arquitectura de microservicios dirigida por eventos

## Solución

### Python (Flask + Verificación HMAC)

```python
import hmac
import hashlib
import json
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_xxxxxxxxxxxxxxxx"

def verify_signature(payload, signature):
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.route("/webhooks", methods=["POST"])
def receive_webhook():
    payload = request.get_data()
    sig = request.headers.get("X-Webhook-Signature", "")

    if not verify_signature(payload, sig):
        abort(400, "Invalid signature")

    event = json.loads(payload)
    event_type = event.get("type")

    # [Idempotencia](/recipes/api/idempotent-api-endpoints): verificar event_id antes de procesar
    if is_duplicate(event["id"]):
        return {"status": "duplicate"}, 200

    if event_type == "payment.succeeded":
        process_payment(event["data"])
    elif event_type == "user.created":
        provision_account(event["data"])

    return {"status": "ok"}, 200

def is_duplicate(event_id):
    # Verificar Redis o DB para IDs de eventos procesados
    return False

def process_payment(data):
    pass

def provision_account(data):
    pass
```

### JavaScript (Express + Raw Body)

```javascript
const express = require("express");
const crypto = require("crypto");

const app = express();
const WEBHOOK_SECRET = "whsec_xxxxxxxxxxxxxxxx";

// Debe usar raw body para verificación de firma
app.use("/webhooks", express.raw({ type: "application/json" }));

app.post("/webhooks", (req, res) => {
  const sig = req.headers["x-webhook-signature"] || "";
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(`sha256=${expected}`))) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body);

  // Verificación de idempotencia
  if (isDuplicate(event.id)) {
    return res.json({ status: "duplicate" });
  }

  switch (event.type) {
    case "payment.succeeded":
      processPayment(event.data);
      break;
    case "user.created":
      provisionAccount(event.data);
      break;
  }

  res.json({ status: "ok" });
});
```

### Java (Spring Boot)

```java
import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
public class WebhookController {
    private static final String SECRET = "whsec_xxxxxxxxxxxxxxxx";

    @PostMapping("/webhooks")
    public Response receive(@RequestBody String payload,
                            @RequestHeader("X-Webhook-Signature") String signature) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] expected = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String expectedBase64 = Base64.getEncoder().encodeToString(expected);

        if (!MessageDigest.isEqual(signature.getBytes(), expectedBase64.getBytes())) {
            throw new SecurityException("Invalid signature");
        }

        // Procesar evento con verificación de idempotencia
        return new Response("ok");
    }

    record Response(String status) {}
}
```

## Explicación

Los webhooks invierten el modelo tradicional de request-response:

1. **Ocurre un evento** en el sistema fuente (pago completado, usuario registrado).
2. **El sistema fuente** hace POST de un payload JSON a tu URL registrada.
3. **Tu endpoint** verifica autenticidad, chequea idempotencia y procesa el evento.
4. **Tu endpoint** retorna HTTP 200 para acusar recibo.

Si tu endpoint falla o hace timeout, el sistema fuente **reintentará** con backoff exponencial. Por eso la idempotencia es crítica — el mismo evento puede ser entregado múltiples veces.

## Variantes

| Concern | Técnica | Notas |
|---------|---------|-------|
| Autenticación | Firma HMAC-SHA256 | Estándar de la industria (Stripe, GitHub) |
| Autenticación | mTLS | Mutual TLS para integraciones enterprise |
| Autenticación | API Key en header | Más simple pero menos seguro que HMAC |
| Idempotencia | Deduplicación por Event ID | Almacena IDs procesados por 24-72h |
| Manejo de Reintentos | Backoff exponencial | 3, 6, 12, 24... minutos |
| Manejo de Reintentos | Dead letter queue | Después de max retries, estacionar para revisión manual |

## Lo que funciona

- **Verifica firmas antes de cualquier procesamiento**: Rechaza payloads forjados inmediatamente.
- **Retorna 200 rápidamente**: Haz procesamiento pesado de forma asíncrona para evitar timeouts.
- **Implementa claves de idempotencia**: Usa el event ID para prevenir efectos secundarios duplicados.
- **Loguea cada webhook**: Incluye event ID, timestamp y HTTP status para debugging.
- **Versiona tu esquema de eventos**: Agrega un campo `version` a payloads para compatibilidad backward.

## Errores Comunes

- **No verificar firmas**: Cualquiera puede hacer POST a tu endpoint y falsificar eventos. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para verificación de firmas.
- **Parsear JSON antes de verificación**: La firma debe calcularse sobre el body crudo.
- **Sin idempotencia**: Entregas duplicadas causan cobros dobles, emails dobles, etc.
- **Procesamiento pesado síncrono**: Los webhooks hacen timeout en ~5-30s. Encola el trabajo con un [worker en background](/recipes/api/middleware).
- **Ignorar tormentas de reintentos**: Un endpoint fallando puede ser golpeado cientos de veces por reintentos.

## Preguntas Frecuentes

### Cómo manejo fallos de entrega de webhooks?

Retorna un código de status no-2xx. La mayoría de proveedores reintentarán con backoff exponencial (ej. Stripe reintenta hasta 3 días). Para tus propios webhooks, implementa una cola de reintentos con jitter para evitar thundering herd.

### Puedo usar webhooks para comunicación bidireccional?

No recomendado. Los webhooks son push unidireccional. Para bidireccional, usa [WebSockets](/recipes/api/websocket-server), [Server-Sent Events](/recipes/api/server-sent-events) o una cola de mensajes. Nunca hagas que dos servicios llamen síncronamente los webhooks del otro — esto crea riesgo de deadlock distribuido.

### Cómo pruebo webhooks localmente?

Usa un servicio de tunneling como ngrok o Cloudflare Tunnel para exponer tu localhost a internet. Alternativamente, captura payloads reales y reprodúcelos en tests unitarios. Algunos proveedores (Stripe CLI) ofrecen forwarding integrado.
