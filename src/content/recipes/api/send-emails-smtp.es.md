---
contentType: recipes
slug: send-emails-smtp
title: "Enviar Emails con SMTP"
description: "Cómo enviar emails transaccionales y masivos de forma segura usando SMTP con soporte de plantillas."
metaDescription: "Aprende a enviar emails con SMTP en Python, JavaScript y Java. Incluye plantillas, autenticación, adjuntos y manejo de errores."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - email
  - java
  - rest
  - http
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/middleware
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a enviar emails con SMTP en Python, JavaScript y Java. Incluye plantillas, autenticación, adjuntos y manejo de errores."
  keywords:
    - enviar email smtp
    - smtp python
    - nodemailer javascript
    - plantillas email
    - email transaccional java
---

## Visión General

El email sigue siendo la columna vertebral de la comunicación con usuarios: resets de contraseña, confirmaciones de orden, newsletters y alertas. Enviar email vía SMTP te da control total sobre entregabilidad, plantillas y tracking. Aqui se explica como el envío de emails de texto plano, HTML y con plantillas usando Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Tu aplicación necesite enviar emails transaccionales (registro, reset de contraseña, recibos). Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para seguridad de email.
- Quieras evitar vendor lock-in de plataformas SaaS de email
- Necesites plantillas de email personalizadas con datos en vivo
- Debas enviar adjuntos (facturas, reportes, exports)

## Solución

### Python

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from string import Template

SMTP_HOST = "smtp.example.com"
SMTP_PORT = 587
SMTP_USER = "user@example.com"
SMTP_PASS = "app-password"

def send_template_email(to, subject, template_path, context):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to

    with open(template_path) as f:
        template = Template(f.read())
    html = template.substitute(context)

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to, msg.as_string())

# Uso
send_template_email(
    to="user@example.com",
    subject="Bienvenido a StackPractices",
    template_path="welcome.html",
    context={"name": "Alice", "login_url": "https://app.example.com/login"}
)
```

### JavaScript (Node.js)

```javascript
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: { user: "user@example.com", pass: "app-password" },
});

async function sendTemplateEmail(to, subject, templatePath, context) {
  const source = fs.readFileSync(templatePath, "utf8");
  const template = handlebars.compile(source);
  const html = template(context);

  await transporter.sendMail({
    from: "StackPractices <noreply@example.com>",
    to,
    subject,
    html,
  });
}

// Uso
sendTemplateEmail(
  "user@example.com",
  "Confirmación de Orden #12345",
  "order-confirmation.hbs",
  { name: "Alice", orderId: "12345", total: "$99.00" }
);
```

### Java (Spring Boot)

```java
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void send(String to, String subject, String htmlBody) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        helper.setFrom("noreply@example.com");
        mailSender.send(message);
    }
}
```

## Explicación

SMTP (Simple Mail Transfer Protocol) es el protocolo estándar para enviar email. El flujo es:

1. **Conectar** al servidor SMTP (puerto 25, 587, o 465 para TLS).
2. **Autenticar** con usuario y contraseña (o OAuth2).
3. **Construir** el mensaje MIME (texto plano, HTML, multipart).
4. **Enviar** vía comandos `MAIL FROM` → `RCPT TO` → `DATA`.
5. **Manejar** rebotes, reintentos y límites de tasa de forma asíncrona.

Para alto volumen, considera una **cola de mensajes** ([Kafka](/recipes/messaging/kafka-event-streaming), RabbitMQ) que alimente un pool de workers SMTP. Esto desacopla tu API de la latencia y fallos del email.

## Variantes

| Tecnología | Librería | Motor de Plantillas | Ideal Para |
|------------|----------|---------------------|------------|
| Python | smtplib + email | Jinja2 / string.Template | Scripts simples, microservicios |
| Node.js | nodemailer | Handlebars / EJS | Apps full-stack, SSR |
| Java | Jakarta Mail | Thymeleaf / FreeMarker | Enterprise, Spring Boot |
| Go | net/smtp | html/template | Microservicios, baja latencia |
| Ruby | Action Mailer | ERB | Apps Rails |

## Lo que funciona

- **Usa contraseñas de app o OAuth2**: Nunca hardcodees tu contraseña personal de email.
- **Configura SPF, DKIM y DMARC**: Estos registros DNS mejoran dramáticamente la entregabilidad.
- **Limita el envío**: La mayoría de proveedores SMTP limitan a ~100 emails/minuto.
- **Usa un dominio dedicado para envío**: Evita que la reputación de tu dominio principal sufra.
- **Maneja rebotes asíncronamente**: Parsea respuestas SMTP y eventos webhook para limpiar tu lista.

## Errores Comunes

- **Enviar desde localhost sin SPF**: Tus emails irán directo a spam.
- **Sin fallback de texto plano**: Algunos clientes (reloj, CLI) solo renderizan texto.
- **Incrustar secretos en código**: Usa variables de entorno o un gestor de secretos. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para gestión de secretos.
- **Ignorar límites de tasa SMTP**: Serás bloqueado temporalmente o blacklisteado.
- **Envío síncrono en requests**: Usa un [worker en background](/recipes/api/middleware) para evitar timeouts HTTP.

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

### Debería usar SMTP o una API de email transaccional?

Usa SMTP cuando necesites portabilidad y control (cambiar proveedores fácilmente). Usa una API (SendGrid, Mailgun, Postmark) cuando necesites analytics, plantillas gestionadas por UI y eventos webhook out of the box. Muchas APIs también ofrecen endpoints SMTP para lo mejor de ambos mundos.

### Cómo evito que mis emails vayan a spam?

Autentica con SPF, DKIM y DMARC. Usa una dirección "From" consistente. Evita palabras spam en los asuntos. Mantén tu HTML simple y mobile-friendly. Monitorea tu reputación de remitente con Google Postmaster Tools.

### Puedo enviar newsletters masivas vía SMTP?

Sí, pero SMTP no está optimizado para bulk. Para newsletters (10k+ destinatarios), usa una plataforma dedicada de email marketing (Mailchimp, ConvertKit, Brevo). Para transaccional + bulk pequeño, SMTP funciona bien con throttling basado en colas.
- **SMTP connection pooling**: reusa conexiones SMTP entre envios de emails para evitar TCP+TLS handshake overhead. Setea max pool size a 10 e idle timeout a 30 segundos.
- **Email template injection**: si las plantillas de email incluyen user input sin escaping, atacantes pueden inyectar contenido malicioso en emails. Siempre escapa user input en plantillas de email, incluso en plain text emails.
- **BCC leakage en bulk emails**: si los bulk emails se envian con todos los recipients en To o Cc, los recipients pueden ver las direcciones de los demas. Siempre usa Bcc o mensajes individuales para bulk sends.
- **SMTP timing attacks**: si la validacion de email revela si un email se envio exitosamente, atacantes pueden enumerar direcciones de email validas. Retorna la misma response independientemente de si el email se envio.
