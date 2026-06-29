---
contentType: recipes
slug: email-templates-mjml
title: "Templates de Email Responsivos con MJML"
description: "Crea templates de email responsivos compatibles con multiples clientes usando MJML, variables en vivo con Handlebars y CSS inline para renderizado confiable en Gmail, Outlook y Apple Mail"
metaDescription: "Crea templates de email responsivos con MJML. Emails compatibles cross-client con variables en vivo y CSS inline para Gmail, Outlook y Apple Mail."
difficulty: beginner
topics:
  - frontend
  - data
tags:
  - email
  - frontend
relatedResources:
  - /recipes/performance/spa-code-splitting-lazy
  - /recipes/api/go-rest-api-gin
  - /guides/design/clean-code-principles-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Crea templates de email responsivos con MJML. Emails compatibles cross-client con variables en vivo y CSS inline para Gmail, Outlook y Apple Mail."
  keywords:
    - mjml
    - email templates
    - responsive email
    - cross-client email
    - handlebars
---

# Templates de Email Responsivos con MJML

El HTML de email es notoriamente dificil debido a motores de renderizado inconsistentes entre clientes. MJML abstrae esta complejidad en un lenguaje de markup declarativo que compila a HTML responsivo y probado en batalla con estilos inline. Esta recipe cubre estructura MJML, templating en vivo con Handlebars y envio via SMTP/API.

## Cuando Usar Esto

- Emails transaccionales (reset de password, confirmaciones de orden) deben renderizar confiablemente. Consulta [Input Validation](/recipes/api/input-validation) para validar datos de formularios de email.
- Newsletters de marketing necesitan layouts responsivos en mobile y desktop. Consulta [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) para diseño frontend responsive.
- Quieres evitar escribir HTML basado en tablas manualmente. Consulta [Component Testing](/recipes/testing/e2e-testing) para testear componentes de email.

## Solucion

### 1. Template Basico de MJML

```xml
<!-- emails/welcome.mjml -->
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Arial, sans-serif" color="#333333" />
      <mj-button background-color="#3b82f6" color="#ffffff" border-radius="4px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    <mj-section>
      <mj-column>
        <mj-image width="120px" src="https://example.com/logo.png" alt="Logo" />
        <mj-text font-size="24px" font-weight="bold" align="center">
          Bienvenido, {{name}}!
        </mj-text>
        <mj-text font-size="16px" line-height="24px">
          Gracias por unirte. Tu cuenta esta lista y puedes empezar a explorar.
        </mj-text>
        <mj-button href="{{dashboardUrl}}" font-size="16px" padding="16px 32px">
          Ir al Dashboard
        </mj-button>
        <mj-text font-size="12px" color="#6b7280" align="center">
          Si no te registraste, ignora este email.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### 2. Compilar y Renderizar

```typescript
// email/EmailRenderer.ts
import mjml2html from 'mjml';
import Handlebars from 'handlebars';

interface WelcomeData {
  name: string;
  dashboardUrl: string;
}

function compileTemplate(mjmlSource: string, data: WelcomeData): { html: string; errors: unknown[] } {
  const { html: rawHtml, errors } = mjml2html(mjmlSource, {
    validationLevel: 'strict',
    minify: true,
  });

  const template = Handlebars.compile(rawHtml);
  const html = template(data);

  return { html, errors };
}
```

### 3. Enviar via SMTP con Nodemailer

```typescript
// email/EmailSender.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWelcomeEmail(to: string, data: WelcomeData): Promise<void> {
  const mjmlSource = await fs.readFile('./templates/welcome.mjml', 'utf8');
  const { html, errors } = compileTemplate(mjmlSource, data);

  if (errors.length > 0) {
    console.warn('Advertencias de compilacion MJML:', errors);
  }

  await transporter.sendMail({
    from: '"StackPractices" <noreply@example.com>',
    to,
    subject: 'Bienvenido a StackPractices',
    html,
    text: `Bienvenido ${data.name}! Visita: ${data.dashboardUrl}`,
  });
}
```

### 4. Libreria de Componentes Reutilizables

```xml
<!-- emails/components/Button.mjml -->
<mj-button
  href="{{url}}"
  background-color="{{#if color}}{{color}}{{else}}#3b82f6{{/if}}"
  color="#ffffff"
  border-radius="4px"
  font-size="16px"
  padding="16px 32px"
>
  {{text}}
</mj-button>
```

### 5. Soporte de Dark Mode

```xml
<mj-raw>
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
</mj-raw>
<mj-style>
  @media (prefers-color-scheme: dark) {
    .dark-bg { background-color: #1f2937 !important; }
    .dark-text { color: #f3f4f6 !important; }
  }
</mj-style>
```

## Como Funciona

- **Componentes MJML** abstraen layouts basados en tablas en tags semanticos como `<mj-section>` y `<mj-column>`
- **Compilacion** genera HTML con estilos inline seguro para Outlook con conditional comments
- **Handlebars** inyecta variables en vivo despues de la compilacion MJML para preservar markup
- **Minificacion** reduce tamano de payload para delivery mas rapido

## Consideraciones de Produccion

- Testea templates en Litmus o Email on Acid antes de deployment en produccion
- Manten el ancho total del email bajo 600px para compatibilidad mobile
- Usa URLs absolutas para todas las imagenes; la mayoria de clientes bloquean CSS externo

## Errores Comunes

- Usar web fonts (no soportadas en la mayoria de clientes; usa system fonts)
- Depender de flexbox o grid (usa el sistema de columnas de MJML en su lugar)
- Olvidar versiones plain-text, que afectan scores de deliverability

## FAQ

**P: Necesito MJML si uso un servicio como SendGrid?**
R: SendGrid provee templates, pero MJML te da markup versionado y reusable que funciona con cualquier provider.

**P: Puedo usar React para renderizar MJML?**
R: Si. Usa `mjml-react` para escribir MJML como componentes JSX manteniendo el mismo pipeline de compilacion.
