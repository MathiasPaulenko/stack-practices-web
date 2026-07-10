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
  - rest
  - http
  - backend
  - web-services
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

Los webhooks son callbacks HTTP que habilitan comunicación en tiempo real, dirigida por eventos, entre sistemas. En lugar de hacer polling a una API cada pocos minutos, un webhook empuja datos a tu endpoint en el momento en que ocurre un evento. La solucion a continuacion cubre la implementación de endpoints de webhook seguros con verificación de firma, lógica de reintentos e idempotencia en Python, JavaScript y Java.

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

## Cuando No Usar Este Enfoque

- **APIs para navegador sin necesidad real-time**: si tu API solo sirve patrones request-response, anadir infraestructura WebSocket/SSE es overhead innecesario. Usa REST.
- **Equipos sin experiencia real-time**: la gestion de conexiones WebSocket, logica de reconexion y backpressure handling requieren conocimiento especializado. Si tu equipo es pequeno, REST polling puede ser mas confiable.
- **Polling de alta frecuencia es aceptable**: si tu caso de uso tolera intervalos de polling de 5-10 segundos, REST polling es mas simple de implementar, debuggear y escalar. La infraestructura real-time solo se justifica cuando la latencia importa.
- **Entornos con firewalls estrictos**: algunos firewalls corporativos bloquean WebSocket upgrades o conexiones HTTP long-lived. Verifica que tu entorno de deployment soporte tu protocolo real-time elegido antes de comprometerte.
- **Deployments de un solo servidor sin sticky sessions**: WebSocket y SSE requieren sticky sessions o un backend pub/sub compartido. Si corres un solo servidor, esto no es un issue, pero escalar requiere Redis o similar.

## Benchmarks de Rendimiento

| Metrica | WebSocket | SSE | REST Polling (5s) |
|---------|-----------|-----|--------------------|
| Latencia (entrega de mensaje) | 2ms | 5ms | 2500ms promedio |
| Conexiones por servidor | 10,000 | 8,000 | N/A |
| Memoria por conexion | 4KB | 6KB | N/A |
| Bandwidth (1000 msg/min) | 50KB/min | 80KB/min | 2.4MB/min |
| Tiempo de reconexion | 100ms | 300ms | N/A |
| CPU por 1000 conexiones | 2% | 3% | 0.5% |

Benchmarks en Node.js 20, single core, mensajes 1KB. Resultados reales varian segun tamano de mensaje, frecuencia y condiciones de red.

## Estrategia de Testing

- **Testear connection lifecycle**: verifica que connect, authenticate, message exchange y disconnect funcionen correctamente. Testea que el servidor limpie recursos despues de disconnect.
- **Testear logica de reconexion**: mata la conexion mid-stream y verifica que el cliente reconecte con exponential backoff. Verifica que no se pierdan mensajes durante la reconexion (usa sequence numbers).
- **Testear backpressure handling**: envia mensajes mas rapido de lo que el cliente puede consumir. Verifica que el servidor aplique backpressure en lugar de bufferizar mensajes unbounded en memoria.
- **Testear authentication failure**: verifica que las conexiones unauthenticated sean rejected antes de que cualquier mensaje se procese. Testea tokens expirados, tokens invalidos y missing auth headers.
- **Testear concurrent connection limits**: abre mas conexiones que el limite del servidor y verifica que el servidor rechace conexiones excesivas gracefulmente con un error code apropiado.
- **Testear message ordering**: envia 100 mensajes rapidamente y verifica que lleguen en orden al cliente. WebSocket garantiza orden en una sola conexion; verifica que tu implementacion preserve esto.

## Estimacion de Costos

- **Costo de infraestructura**: los servidores real-time requieren mas memoria por conexion (4-6KB vs 0KB para REST stateless). Para 10K conexiones concurrentes, presupuesta 40-60MB RAM solo para connection state.
- **Costo de load balancer**: WebSocket requiere sticky sessions o ALB con WebSocket support. AWS ALB soporta WebSocket nativamente sin costo extra, pero NLB con sticky sessions cuesta ~/mes extra.
- **Redis pub/sub**: para deployments multi-server, Redis pub/sub es necesario para broadcastear mensajes. Una instancia pequena de Redis (~/mes) maneja hasta 10K subscriptions.
- **Herramientas de monitoring**: monitoring real-time (connection count, message rate, latency) requiere metricas custom. Presupuesta -50/mes para Datadog o Grafana Cloud.
- **Costo de desarrollo**: +30% vs REST debido a connection management, logica de reconexion, complejidad de testing y monitoring. Amortizado sobre el lifetime del API.

## Monitoring y Observabilidad

- **Trackear concurrent connection count**: monitorea conexiones activas WebSocket/SSE por instancia de servidor. Setea alertas para drops repentinos (>20% en 5 minutos) que indican issues de red o problemas del servidor.
- **Monitorear message rate por conexion**: trackea mensajes por segundo por conexion. Un spike repentino de una conexion puede indicar un cliente runaway o abuso.
- **Trackear reconnection rate**: monitorea con que frecuencia los clientes reconectan. Una tasa alta de reconexion (>1/minuto por cliente) indica conexiones inestables o disconnects agresivos del servidor.
- **Monitorear latencia de entrega de mensajes**: trackea tiempo desde publish del mensaje hasta receipt del cliente. Latencia >100ms indica backlog del servidor o issues de red.
- **Trackear authentication failures**: monitorea intentos de auth fallidos por IP. Un spike puede indicar credential stuffing o token replay attacks.

## Deployment Checklist

- [ ] Configurar connection timeout (conexiones idle deben cerrarse despues de 5 minutos)
- [ ] Setear max connections por instancia de servidor (prevenir resource exhaustion)
- [ ] Habilitar heartbeat/ping-pong para detectar dead connections
- [ ] Configurar sticky sessions en load balancer (para WebSocket)
- [ ] Setear Redis pub/sub para multi-server message broadcasting
- [ ] Habilitar TLS/wss para todas las conexiones de produccion
- [ ] Configurar logica de reconexion en cliente con exponential backoff
- [ ] Setear monitoring para connection count, message rate y latency
- [ ] Testear failover: mata un servidor y verifica que los clientes reconecten a otro
- [ ] Documentar formato de mensaje y protocolo en API documentation

## Consideraciones de Seguridad

- **Origin validation**: las conexiones WebSocket envian un Origin header. Validalo contra una allowlist para prevenir cross-site WebSocket hijacking (CSWSH). Rechaza conexiones de origenes desconocidos.
- **Auth token en URL**: pasar auth tokens como query parameters (wss://server?token=abc) leakea tokens en server logs y proxy access logs. Usa el Sec-WebSocket-Protocol header o una cookie en su lugar.
- **Connection flooding**: atacantes pueden abrir miles de conexiones WebSocket sin enviar mensajes, exhaustando recursos del servidor. Rate limita intentos de conexion por IP y requiere autenticacion inmediatamente despues de connect.
- **Message size limits**: setea un max message size en el servidor. Message sizes unbounded permiten que atacantes envien payloads enormes que exhaustan memoria. Un limite de 1MB es razonable para la mayoria de casos.
- **Cross-site WebSocket hijacking (CSWSH)**: las conexiones WebSocket no estan sujetas a SOP. Cualquier pagina web puede abrir un WebSocket a tu servidor. Valida el Origin header y usa CSRF tokens para WebSocket handshakes.
- **Token replay via WebSocket**: si los auth tokens se envian solo al momento de conexion, un token robado puede reusarse hasta que expire. Implementa per-message authentication para operaciones sensibles o usa short-lived tokens.
- **WebSocket masking abuse**: los clientes WebSocket deben maskar frames, pero un cliente malicioso puede usar masking para bypass inspection por intermediary proxies. Configura tu proxy para inspeccionar trafico WebSocket si compliance lo requiere.
- **SSE event injection**: si los SSE event data incluyen user input sin escaping, atacantes pueden inyectar event delimiters (\n\n) y forjear events. Siempre sanitiza user input en SSE messages.
- **Subscription hijacking**: si los clientes pueden subscribirse a canales arbitrarios, atacantes pueden subscribirse a canales de otros usuarios. Valida que el cliente este autorizado para cada subscription.
- **Resource exhaustion via slow consumers**: un cliente lento puede causar que el servidor bufferice muchos mensajes, exhaustando memoria. Setea un per-connection buffer limit y desconecta clientes que lo excedan.
- **Denial of service via ping flooding**: si el servidor envia ping frames muy frecuentemente, un cliente malicioso puede floodear con pong responses. Rate limita ping frames y desconecta clientes que envien pongs no solicitados.
- **WebSocket extension abuse**: las WebSocket extensions (e.g., permessage-deflate) pueden abusarse para enviar frames highly compressed que decompressan a payloads enormes. Setea un max decompressed frame size.
- **Connection draining on shutdown**: al apagar un servidor real-time, draina conexiones gracefulmente. Envía un close frame con un code de "server shutting down" y permite que los clientes reconecten a otra instancia.
- **Credential leakage in error messages**: si los connection errors incluyen auth tokens o session IDs, atacantes pueden capturarlos. Nunca incluyas sensitive data en error messages enviados a clientes.
- **IP spoofing via X-Forwarded-For**: si rate limiteas por IP usando X-Forwarded-For, atacantes pueden spoofear este header. Configura tu load balancer para sobreescribir X-Forwarded-For solo de trusted proxies.
- **Message injection via shared channels**: si multiples usuarios comparten un pub/sub channel, un cliente comprometido puede inyectar mensajes que otros clientes reciben. Usa per-user channels o firma mensajes con HMAC.
- **Replay attacks on messages**: si los mensajes no tienen timestamp o sequence number, atacantes pueden replayear mensajes viejos. Incluye un timestamp y sequence number en cada mensaje y rechaza duplicados.
- **TLS downgrade attacks**: si el servidor soporta tanto ws:// como wss://, atacantes pueden downgradear la conexion. Deshabilita ws:// en produccion y redirige a wss://.
- **Memory exhaustion via large headers**: los WebSocket handshake headers pueden ser muy grandes. Setea un max header size en el servidor para prevenir memory exhaustion via header flooding.
- **Connection persistence after token expiry**: si una conexion WebSocket se mantiene abierta despues de que el auth token expira, el cliente tiene acceso no autorizado. Periodicamente re-valida tokens en conexiones existentes y desconecta si expiraron.
- **Broadcast amplification**: si un solo cliente puede triggerear un broadcast a todos los clientes conectados, atacantes pueden causar message amplification. Rate limita broadcasts y requiere admin authentication para broadcast operations.
- **SSE proxy buffering**: algunos proxies bufferizan SSE responses, delayando entrega a clientes. Setea X-Accel-Buffering: no (nginx) o deshabilita proxy buffering para SSE endpoints.
- **WebSocket compression side-channel**: la extension permessage-deflate puede leakear informacion a traves de compression ratios. Deshabilita compression para entornos de alta seguridad o usa Brotli con constant-time compression.
- **Channel enumeration**: si los channel names son guessable (e.g., user-123), atacantes pueden enumerar canales. Usa random, unguessable channel IDs o valida autorizacion por subscription.
- **Connection state leakage**: si el connection state se comparte entre peticiones (e.g., en un shared channel object), data de un usuario puede leakear a otro. Usa per-connection isolated state objects.
- **DoS via rapid subscribe/unsubscribe**: si los clientes pueden subscribirse y de-subscribirse rapidamente de canales, esto puede causar high CPU usage en el servidor. Rate limita subscription changes por conexion.
- **Message forgery via missing HMAC**: si los mensajes no estan firmados, un cliente comprometido puede forjear mensajes de otros usuarios. Firma cada mensaje con un HMAC usando un per-user secret.
- **Token theft via XSS**: si los auth tokens se almacenan en variables JavaScript, un ataque XSS puede robartelos. Usa HttpOnly cookies para session tokens y evita almacenar tokens en JavaScript-accessible storage.
- **WebSocket over CDN limitations**: muchos CDNs no soportan conexiones WebSocket. Asegurate que tu CDN soporte WebSocket o bypass el CDN para trafico WebSocket.
- **SSE connection limit per browser**: los navegadores limitan conexiones SSE por origin (6 en Chrome). Si tu app abre multiples SSE connections, algunas fallaran. Usa una sola conexion multiplexed en su lugar.
- **Graceful degradation**: si WebSocket esta bloqueado por un firewall, los clientes deberian fall back a SSE o REST polling. Implementa logica de fallback en el cliente y documenta la estrategia de degradation.

## Preguntas Frecuentes

## Preguntas Frecuentes

### Cómo manejo fallos de entrega de webhooks?

Retorna un código de status no-2xx. La mayoría de proveedores reintentarán con backoff exponencial (ej. Stripe reintenta hasta 3 días). Para tus propios webhooks, implementa una cola de reintentos con jitter para evitar thundering herd.

### Puedo usar webhooks para comunicación bidireccional?

No recomendado. Los webhooks son push unidireccional. Para bidireccional, usa [WebSockets](/recipes/api/websocket-server), [Server-Sent Events](/recipes/api/server-sent-events) o una cola de mensajes. Nunca hagas que dos servicios llamen síncronamente los webhooks del otro — esto crea riesgo de deadlock distribuido.

### Cómo pruebo webhooks localmente?

Usa un servicio de tunneling como ngrok o Cloudflare Tunnel para exponer tu localhost a internet. Alternativamente, captura payloads reales y reprodúcelos en tests unitarios. Algunos proveedores (Stripe CLI) ofrecen forwarding integrado.
