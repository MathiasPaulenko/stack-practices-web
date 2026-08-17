---
contentType: recipes
slug: email-templates-mjml
title: "Templates de Email Responsivos con MJML"
description: "Crea templates de email responsivos con MJML, variables en vivo con Handlebars y CSS inline para Gmail, Outlook y Apple Mail."
metaDescription: "Crea templates de email responsivos con MJML. Emails compatibles cross-client con variables en vivo y CSS inline para Gmail, Outlook y Apple Mail."
difficulty: beginner
topics:
  - frontend
  - security
tags:
  - email
  - frontend
  - mjml
  - handlebars
  - nodemailer
  - css
relatedResources:
  - /recipes/security/xss-prevention
  - /recipes/security/data-validation-zod
  - /recipes/frontend/css-dark-mode-prefers-color-scheme
  - /recipes/frontend/server-side-rendering
  - /recipes/frontend/css-custom-properties-design-tokens
  - /guides/complete-guide-mobile-responsive-design
lastUpdated: "2026-08-18"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Crea templates de email responsivos con MJML. Emails compatibles cross-client con variables en vivo y CSS inline para Gmail, Outlook y Apple Mail."
  keywords:
    - mjml
    - email templates
    - responsive email
    - cross-client email
    - handlebars
---

## Visión General

El HTML de correo debe funcionar en decenas de clientes con motores de
renderizado distintos, desde Apple Mail hasta el parser de Word de Outlook y el
sanitizador de Gmail. MJML convierte un lenguaje de marcado XML en HTML basado
en tablas con estilos inline que se lee bien en escritorio y móvil. Esta receta
muestra cómo escribir un template de MJML, compilarlo, inyectar variables en
vivo con Handlebars y enviar el resultado con Nodemailer.

## Cuándo Usar

Usa esta receta cuando envíes correos transaccionales como resets de contraseña
o confirmaciones de pedido, cuando tus boletines deban verse bien en móvil y
escritorio, o cuando quieras dejar de escribir HTML de correo a mano. También
sirve cuando necesitas templates versionados que funcionen con cualquier proveedor de email.

- Combínala con [Input Validation](/recipes/input-validation/) para limpiar los
datos que pasas al template.
- Consulta [XSS Prevention](/recipes/security/xss-prevention/) antes de incluir
  input del usuario en el HTML del correo.
- Mira [CSS Dark Mode](/recipes/frontend/css-dark-mode-prefers-color-scheme/) si
  quieres soportar `prefers-color-scheme`.

## Solución

### Template básico de MJML

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
          ¡Bienvenido, {{name}}!
        </mj-text>
        <mj-text font-size="16px" line-height="24px">
          Gracias por unirte. Tu cuenta ya está lista.
        </mj-text>
        <mj-button href="{{dashboardUrl}}" font-size="16px" padding="16px 32px">
          Ir al Dashboard
        </mj-button>
        <mj-text font-size="12px" color="#6b7280" align="center">
          Si no te registraste, ignora este correo.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Compilar y renderizar

```typescript
// email/EmailRenderer.ts
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import * as fs from 'fs/promises';

interface WelcomeData {
  name: string;
  dashboardUrl: string;
}

async function compileTemplate(
  mjmlSource: string,
  data: WelcomeData
): Promise<{ html: string; errors: unknown[] }> {
  const { html: rawHtml, errors } = mjml2html(mjmlSource, {
    validationLevel: 'strict',
    minify: true,
  });

  const template = Handlebars.compile(rawHtml);
  const html = template(data);

  return { html, errors };
}
```

### Enviar vía SMTP con Nodemailer

```typescript
// email/EmailSender.ts
import * as fs from 'fs/promises';
import nodemailer from 'nodemailer';
import { compileTemplate } from './EmailRenderer';

const transporter = nodemailer.createTransport({
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
    console.warn('Advertencias de compilación MJML:', errors);
  }

  await transporter.sendMail({
    from: '"StackPractices" <noreply@example.com>',
    to,
    subject: 'Bienvenido a StackPractices',
    html,
    text: `Bienvenido ${data.name}. Visita: ${data.dashboardUrl}`,
  });
}
```

### Componente de botón reutilizable

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

Úsalo en un template con `mj-include`:

```xml
<mj-include path="./components/Button.mjml" />
```

### Soporte de dark mode

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

Aplica las clases dentro del template:

```xml
<mj-wrapper css-class="dark-bg">
  <mj-text css-class="dark-text" align="center">
    Contenido en dark mode
  </mj-text>
</mj-wrapper>
```

## Explicación

Los componentes de MJML como `<mj-section>`, `<mj-column>` y `<mj-text>` se
convierten en tablas HTML anidadas con estilos inline. Es el único enfoque de
layout que funciona de forma consistente entre clientes, porque muchos no
soportan flexbox, grid ni hojas de estilo externas. Handlebars corre después de
la compilación de MJML, así que el HTML de tabla generado se mantiene intacto y
solo el texto o los valores de URL cambian en runtime.

Compilar con `validationLevel: 'strict'` atrapa componentes mal formados antes
de que lleguen a un cliente. `minify: true` elimina espacios extra y reduce el
tamaño del payload. Nodemailer envía el resultado como un mensaje multiparte con
HTML y texto plano; la versión de texto plano es importante para deliverability y
para usuarios que no pueden o no quieren cargar HTML.

## Variantes

| Enfoque | Mejor para | Compromiso |
| --- | --- | --- |
| MJML + Handlebars | Equipos que envían muchos correos transaccionales | Build step y dependencia de Node |
| HTML en tablas a mano | Campañas puntuales | Control total pero frágil en Outlook |
| Texto plano | Alta deliverability, notificaciones simples | Sin branding ni tracking |
| Editor drag-and-drop del ESP | Equipos de marketing sin código | Atado al ESP, más difícil de versionar |

## Mejores Prácticas

- Siempre envía `multipart/alternative` con HTML y texto plano.
- Mantén el ancho del correo bajo 600px y el tamaño total bajo 102KB.
- Usa URLs absolutas para imágenes; la mayoría de clientes bloquean CSS externo y archivos locales.
- Prueba en clientes reales o con Litmus / Email on Acid antes de una campaña.
- Escapa el input del usuario con el escaping HTML por defecto de Handlebars
  o con un sanitizador antes de que llegue al template.
- Incluye un link de unsubscribe en cada correo de marketing.
- Agrega alt text a las imágenes para que el correo se lea cuando las imágenes están bloqueadas.

## Errores Comunes

- Usar web fonts o `@font-face`; quédate en fuentes del sistema como Arial,
  Georgia y Verdana.
- Depender de flexbox, grid, `border-radius` o `position`; muchos clientes los ignoran.
- Olvidar la versión de texto plano; los filtros de spam y algunos usuarios la necesitan.
- Embeber imágenes base64 grandes; inflan el mensaje y pueden ser eliminadas.
- Confiar en bloques `<style>` del cliente; Gmail los elimina en muchos casos.
- Incluir input del usuario sin escapar; puede llevar a inyección de HTML.

## Preguntas Frecuentes

### ¿Necesito MJML si uso SendGrid?

SendGrid provee templates, pero MJML te da markup versionado que puedes
renderizar y enviar con cualquier proveedor. Además facilita las pruebas locales.

### ¿Puedo usar React para renderizar MJML?

Sí. El paquete `mjml-react` te permite escribir MJML como componentes JSX y
seguir compilandolo con el mismo pipeline.

### ¿Por qué mi template se ve mal en Outlook?

Outlook en Windows usa el motor de HTML de Word, que no soporta CSS moderno.
MJML genera HTML basado en tablas con comentarios condicionales pensados
específicamente para Outlook.

### ¿Puedo usar mis propias fuentes de marca?

La mayoría de clientes no carga web fonts. Usa una pila de fuentes del sistema y
prueba el fallback.

### ¿Cómo pruebo correos antes de enviarlos?

Renderiza el template, envía un correo de prueba a ti mismo y revísalo en
Gmail, Outlook y Apple Mail. Para campañas grandes, usa Litmus o Email on Acid.
