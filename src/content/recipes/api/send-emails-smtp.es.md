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
  - javascript
  - notificacion
  - plantillas
  - python
  - smtp
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

El email sigue siendo la columna vertebral de la comunicación con usuarios: resets de contraseña, confirmaciones de orden, newsletters y alertas. Enviar email vía SMTP te da control total sobre entregabilidad, plantillas y tracking. Esta receta cubre el envío de emails de texto plano, HTML y con plantillas usando Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Tu aplicación necesite enviar emails transaccionales (registro, reset de contraseña, recibos)
- Quieras evitar vendor lock-in de plataformas SaaS de email
- Necesites plantillas de email personalizadas con datos dinámicos
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

Para alto volumen, considera una **cola de mensajes** (Redis, RabbitMQ) que alimente un pool de workers SMTP. Esto desacopla tu API de la latencia y fallos del email.

## Variantes

| Tecnología | Librería | Motor de Plantillas | Ideal Para |
|------------|----------|---------------------|------------|
| Python | smtplib + email | Jinja2 / string.Template | Scripts simples, microservicios |
| Node.js | nodemailer | Handlebars / EJS | Apps full-stack, SSR |
| Java | Jakarta Mail | Thymeleaf / FreeMarker | Enterprise, Spring Boot |
| Go | net/smtp | html/template | Microservicios, baja latencia |
| Ruby | Action Mailer | ERB | Apps Rails |

## Mejores Prácticas

- **Usa contraseñas de app o OAuth2**: Nunca hardcodees tu contraseña personal de email.
- **Configura SPF, DKIM y DMARC**: Estos registros DNS mejoran dramáticamente la entregabilidad.
- **Limita el envío**: La mayoría de proveedores SMTP limitan a ~100 emails/minuto.
- **Usa un dominio dedicado para envío**: Evita que la reputación de tu dominio principal sufra.
- **Maneja rebotes asíncronamente**: Parsea respuestas SMTP y eventos webhook para limpiar tu lista.

## Errores Comunes

- **Enviar desde localhost sin SPF**: Tus emails irán directo a spam.
- **Sin fallback de texto plano**: Algunos clientes (reloj, CLI) solo renderizan texto.
- **Incrustar secretos en código**: Usa variables de entorno o un gestor de secretos.
- **Ignorar límites de tasa SMTP**: Serás bloqueado temporalmente o blacklisteado.
- **Envío síncrono en requests**: Usa un worker en background para evitar timeouts HTTP.

## Preguntas Frecuentes

### Debería usar SMTP o una API de email transaccional?

Usa SMTP cuando necesites portabilidad y control (cambiar proveedores fácilmente). Usa una API (SendGrid, Mailgun, Postmark) cuando necesites analytics, plantillas gestionadas por UI y eventos webhook out of the box. Muchas APIs también ofrecen endpoints SMTP para lo mejor de ambos mundos.

### Cómo evito que mis emails vayan a spam?

Autentica con SPF, DKIM y DMARC. Usa una dirección "From" consistente. Evita palabras spam en los asuntos. Mantén tu HTML simple y mobile-friendly. Monitorea tu reputación de remitente con Google Postmaster Tools.

### Puedo enviar newsletters masivas vía SMTP?

Sí, pero SMTP no está optimizado para bulk. Para newsletters (10k+ destinatarios), usa una plataforma dedicada de email marketing (Mailchimp, ConvertKit, Brevo). Para transaccional + bulk pequeño, SMTP funciona bien con throttling basado en colas.
