---
contentType: recipes
slug: send-emails-smtp
title: "Enviar Emails con SMTP en Python, Node.js y Java"
description: "Aprende a enviar emails transaccionales y masivos vía SMTP con Python, Node.js y Java. Cubre autenticación, plantillas, adjuntos y entregabilidad."
metaDescription: "Envía emails transaccionales y masivos con SMTP en Python, Node.js y Java. Usa smtplib, nodemailer y Jakarta Mail con TLS, plantillas, adjuntos y rate limiting."
difficulty: intermediate
topics:
  - messaging
  - api
tags:
  - email
  - smtp
  - python
  - javascript
  - java
  - deliverability
relatedResources:
  - /recipes/call-rest-api
  - /recipes/input-validation
  - /recipes/secret-management
  - /recipes/rate-limiting
  - /recipes/handle-errors
  - /recipes/logging
lastUpdated: "2026-08-23"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Envía emails transaccionales y masivos con SMTP en Python, Node.js y Java. Usa smtplib, nodemailer y Jakarta Mail con TLS, plantillas, adjuntos y rate limiting."
  keywords:
    - smtp
    - email
    - enviar email
    - nodemailer
    - smtplib
    - jakarta mail
    - adjuntos
    - entregabilidad
---

## Visión General

La mayoría de las aplicaciones aún recurren al email para resets de contraseña, confirmaciones de
orden, newsletters y alertas. SMTP (Simple Mail Transfer Protocol) es lo que mueve esos mensajes
desde tu aplicación hasta la bandeja del destinatario. Usarlo directamente te mantiene
portable entre proveedores y te da control total sobre plantillas, adjuntos y reputación de
remitente. Esta receta cubre patrones listos para producción en Python, Node.js y Java, con TLS,
cuerpos de texto y HTML, adjuntos y limitación de tasa.

## Cuándo Usar

- Tu aplicación envía emails transaccionales y quieres poder cambiar de proveedor sin reescribir
  código.
- Necesitas plantillas que traigan datos en vivo, o simplemente prefieres mantener la lógica de email
  dentro de tu código.
- Necesitas adjuntar facturas, reportes o exportaciones a los mensajes salientes.
- Ya operas una cola de mensajes o un pool de workers y quieres que remitentes SMTP extraigan
  trabajos de ella.
- Estás combinando email con buenas prácticas de [rate limiting](/recipes/rate-limiting/) y [gestión
  de secretos](/recipes/secret-management/).

## Cuándo Evitar

- Tu volumen es millones de emails de marketing al mes. Plataformas como Mailchimp, Brevo y Mailgun
  manejan la higiene de listas y el cumplimiento de bajas mucho mejor.
- Tu equipo no puede hacerse cargo de registros DNS (SPF, DKIM, DMARC), rebotes y reputación de
  remitente.
- Las notificaciones in-app necesitan baja latencia. Para esos casos, push o WebSockets suelen
  encajar mejor.

## Solución

### Python

```python
import mimetypes
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from string import Template

SMTP_HOST = "smtp.example.com"
SMTP_PORT = 587
SMTP_USER = "user@example.com"
SMTP_PASS = "app-password"


def build_message(from_addr, to, subject, text, html=None, attachments=None):
    """Construye un email multipart con texto, HTML opcional y adjuntos."""
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text, "plain"))
    if html:
        alt.attach(MIMEText(html, "html"))
    msg.attach(alt)

    if attachments:
        for path in attachments:
            ctype, _ = mimetypes.guess_type(path)
            if ctype is None:
                ctype = "application/octet-stream"
            maintype, subtype = ctype.split("/", 1)

            with open(path, "rb") as f:
                part = MIMEBase(maintype, subtype)
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=Path(path).name,
            )
            msg.attach(part)

    return msg


def send_template_email(to, subject, template_text, template_html, context):
    text = Template(template_text).substitute(context)
    html = Template(template_html).substitute(context) if template_html else None
    msg = build_message(SMTP_USER, to, subject, text, html)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


# Uso
text_template = "Hola $name, tu orden $order_id está confirmada."
html_template = "<p>Hola $name, tu orden <b>$order_id</b> está confirmada.</p>"
send_template_email(
    to="user@example.com",
    subject="Orden #12345 confirmada",
    template_text=text_template,
    template_html=html_template,
    context={"name": "Alice", "order_id": "12345"},
)
```

### JavaScript (Node.js)

```javascript
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: { user: 'user@example.com', pass: 'app-password' },
  tls: { rejectUnauthorized: true },
});

async function sendEmail(to, subject, text, html = null, attachments = []) {
  await transporter.sendMail({
    from: '"StackPractices" <noreply@example.com>',
    to,
    subject,
    text,
    html,
    attachments: attachments.map((file) => ({
      path: file,
      filename: path.basename(file),
    })),
  });
}

async function sendOrderConfirmation(to, context) {
  const text = `Hola ${context.name}, tu orden ${context.orderId} está confirmada.`;
  const html = `<p>Hola ${context.name}, tu orden <b>${context.orderId}</b> está confirmada.</p>`;
  await sendEmail(to, `Orden #${context.orderId} confirmada`, text, html);
}

// Uso
sendOrderConfirmation('user@example.com', { name: 'Alice', orderId: '12345' });
```

### Java

```java
import jakarta.activation.DataHandler;
import jakarta.activation.DataSource;
import jakarta.activation.FileDataSource;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.io.File;
import java.util.Properties;

public class SmtpSender {

    public static void send(String host, int port, String user, String pass,
                            String to, String subject, String text, String html,
                            File[] attachments) throws Exception {
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", port);

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(user, pass);
            }
        });

        Message msg = new MimeMessage(session);
        msg.setFrom(new InternetAddress(user));
        msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
        msg.setSubject(subject);

        Multipart mixed = new MimeMultipart("mixed");
        Multipart alt = new MimeMultipart("alternative");

        MimeBodyPart textPart = new MimeBodyPart();
        textPart.setText(text);
        alt.addBodyPart(textPart);

        if (html != null) {
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(html, "text/html; charset=utf-8");
            alt.addBodyPart(htmlPart);
        }

        MimeBodyPart wrapper = new MimeBodyPart();
        wrapper.setContent(alt);
        mixed.addBodyPart(wrapper);

        if (attachments != null) {
            for (File f : attachments) {
                MimeBodyPart att = new MimeBodyPart();
                DataSource source = new FileDataSource(f);
                att.setDataHandler(new DataHandler(source));
                att.setFileName(f.getName());
                mixed.addBodyPart(att);
            }
        }

        msg.setContent(mixed);
        Transport.send(msg);
    }

    public static void main(String[] args) throws Exception {
        send(
            "smtp.example.com",
            587,
            "user@example.com",
            "app-password",
            "user@example.com",
            "Orden #12345 confirmada",
            "Hola Alice, tu orden 12345 está confirmada.",
            "<p>Hola Alice, tu orden <b>12345</b> está confirmada.</p>",
            null
        );
    }
}
```

## Explicación

SMTP funciona como una breve negociación entre tu cliente y el servidor de correo. El cliente abre una
conexión por el puerto 587 (startTLS) o 465 (SSL/TLS), inicia sesión con un usuario y una contraseña
de app o un token OAuth2, y luego construye y envía un mensaje MIME. La entrega real usa la secuencia
`MAIL FROM` → `RCPT TO` → `DATA`. A partir de ahí, el servidor responde con códigos de estado; tu
trabajo es manejar rebotes, reintentos y límites de tasa por separado.

A alto volumen, no llames a SMTP directamente desde un handler HTTP. Eso acopla tu API a la
velocidad del servidor de correo y puede causar timeouts. Un diseño mejor es pasar los mensajes a
una cola y dejar que los workers hagan el envío. Esto mantiene los tiempos de respuesta bajos y te
da un lugar limpio para reintentar fallos transitorios.

## Variantes

En Python, combina `smtplib` con el paquete `email` cuando necesites MIME personalizado. Node.js suele
usar `nodemailer` para apps full-stack, SSR y soporte rápido de adjuntos. En Java, `Jakarta Mail` es
la opción habitual para enterprise, Spring Boot y APIs tipadas.

Go y C# también son opciones sólidas. En Go, `net/smtp` y el paquete `jordan-wright/email` funcionan
bien para servicios de baja latencia, mientras que los desarrolladores .NET suelen elegir `MailKit`.

## Mejores Prácticas

Empieza por lo básico: usa contraseñas de app o tokens OAuth2, y nunca las commitees en el control
de versiones. Guárdalas en un gestor de secretos y rótalas periódicamente. Después añade los
registros DNS SPF, DKIM y DMARC a tu dominio de envío. Ningún otro cambio mueve la aguja de la
entregabilidad.

Incluye siempre un fallback de texto plano junto con cada mensaje HTML. Algunos clientes,
especialmente relojes y lectores de terminal, solo renderizan texto. Limita la tasa de envíos porque
la mayoría de proveedores te limitan a unos pocos cientos de emails por minuto. Un
dominio de envío dedicado también vale la pena: si una campaña daña su reputación, tu dominio
principal queda limpio.

Por el lado operativo, maneja rebotes y quejas de forma asíncrona. Lee respuestas SMTP y eventos
webhook para mantener la lista limpia. Por último, sanitiza cualquier entrada de usuario que termine
en una plantilla o línea de asunto; la inyección de headers y los enlaces maliciosos son riesgos
reales.

## Errores Comunes

- Enviar desde localhost o un servidor compartido sin registros SPF/DKIM válidos. Tus mensajes
  terminan en spam.
- Meter credenciales de producción en el código o en archivos de entorno que se suben a control de
  versiones.
- Omitir la validación de direcciones de destinatario antes de encolar. Consulta [validación de
  entrada](/recipes/input-validation/) para patrones seguros.
- Enviar correo de forma síncrona dentro de handlers HTTP, donde puede haber timeouts bajo carga.
- Ignorar límites de tasa y reintentos, lo que termina en bloqueos temporales o blacklist.
- Usar `To` o `Cc` para envíos masivos. Usa `Bcc` o mensajes individuales para proteger a los
  destinatarios.
- Correr sin logs ni monitoreo. Sin ellos, solo te enterarás de los problemas de entrega cuando los
  usuarios se quejen.

## Preguntas Frecuentes

### ¿Debería usar SMTP o una API de email transaccional?

SMTP tiene más sentido cuando valoras la portabilidad y podrías cambiar de proveedor más adelante.
Una API de email transaccional como SendGrid, Mailgun o Postmark es mejor cuando quieres plantillas
gestionadas, analytics y webhooks de rebotes listos para usar. La mayoría de proveedores te dan ambas
opciones, así que no siempre tienes que elegir.

### ¿Cómo evito que mis emails terminen en spam?

El primer paso es autenticar con SPF, DKIM y DMARC. Envía desde una dirección consistente, mantén el
HTML limpio y adaptado a móviles, evita palabras spam en los asuntos y vigila tu reputación de
remitente
con Google Postmaster Tools. La interacción también importa: elimina direcciones inactivas de tu
lista con regularidad.

### ¿Puedo enviar newsletters masivas vía SMTP?

Técnicamente puedes, pero las newsletters masivas no son el punto fuerte de SMTP. Funciona genial
para email transaccional y lotes pequeños. Para decenas de miles de destinatarios, usa una plataforma
dedicada de email marketing y conéctala a tu aplicación a través de su API o importaciones de lista.
