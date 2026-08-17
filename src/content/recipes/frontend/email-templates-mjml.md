---
contentType: recipes
slug: email-templates-mjml
title: "Build Responsive Email Templates with MJML"
description: "Create cross-client responsive email templates with MJML, compile them with TypeScript, inject live variables with Handlebars, and send via Nodemailer."
metaDescription: "Build responsive email templates with MJML. Create cross-client compatible emails with live variables and inline CSS for Gmail, Outlook and Apple Mail."
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
  metaDescription: "Build responsive email templates with MJML. Create cross-client compatible emails with live variables and inline CSS for Gmail, Outlook and Apple Mail."
  keywords:
    - mjml
    - email templates
    - responsive email
    - cross-client email
    - handlebars
---

## Overview

Building HTML for email means supporting dozens of clients with different
rendering engines, from Apple Mail to Outlook's Word-based parser and Gmail's
sanitizer. MJML turns
a simple XML markup language into table-based, inline-styled HTML that stays
readable on desktop and mobile. This recipe shows how to write an MJML template,
compile it, inject live variables with Handlebars, and send the result with
Nodemailer.

## When to Use

Reach for this recipe when you send transactional emails such as password
resets or order confirmations, when your newsletters must look good on mobile
and desktop, or when you want to stop hand-writing table-based email HTML. It's
also a good fit when you want templates under version control that work with any
ESP.

- Pair it with [Input Validation](/recipes/input-validation/) to clean the data
  you pass into the template.
- See [XSS Prevention](/recipes/security/xss-prevention/) before including user
  input in email HTML.
- Look at [CSS Dark Mode](/recipes/frontend/css-dark-mode-prefers-color-scheme/)
  if you want to support `prefers-color-scheme`.

## Solution

### Basic MJML template

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
          Welcome, {{name}}!
        </mj-text>
        <mj-text font-size="16px" line-height="24px">
          Thanks for joining. Your account is ready.
        </mj-text>
        <mj-button href="{{dashboardUrl}}" font-size="16px" padding="16px 32px">
          Go to Dashboard
        </mj-button>
        <mj-text font-size="12px" color="#6b7280" align="center">
          If you did not sign up, ignore this email.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Compile and render

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

### Send via SMTP with Nodemailer

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
    console.warn('MJML compilation warnings:', errors);
  }

  await transporter.sendMail({
    from: '"StackPractices" <noreply@example.com>',
    to,
    subject: 'Welcome to StackPractices',
    html,
    text: `Welcome ${data.name}! Visit: ${data.dashboardUrl}`,
  });
}
```

### Reusable button component

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

Use it in a template with `mj-include`:

```xml
<mj-include path="./components/Button.mjml" />
```

### Dark mode support

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

Apply the classes inside the template:

```xml
<mj-wrapper css-class="dark-bg">
  <mj-text css-class="dark-text" align="center">
    Dark mode content
  </mj-text>
</mj-wrapper>
```

## Explanation

MJML components such as `<mj-section>`, `<mj-column>` and `<mj-text>` become
nested HTML tables with inline styles. That layout is the only one that behaves
consistently across clients, because many of them don't support flexbox, grid or
external stylesheets. Handlebars runs after MJML
compilation so the generated table HTML stays intact and only the text or URL
values change at runtime.

Compiling with `validationLevel: 'strict'` catches malformed components before
they reach a client. Setting `minify` to `true` removes extra whitespace and
keeps the payload small. Nodemailer then sends the result as a multipart message with both HTML and
plain text; the plain text version is important for deliverability and for users
who can't or don't want to load HTML.

## Variants

| Approach | Best for | Trade-off |
| --- | --- | --- |
| MJML + Handlebars | Teams that send many transactional emails | Build step and Node dependency |
| Hand-written table HTML | One-off campaigns | Full control but easy to break in Outlook |
| Plain text only | High deliverability, simple notifications | No branding or tracking |
| ESP drag-and-drop editor | Marketing teams without code | Locked into the ESP, harder to version |

## Best Practices

- Always send `multipart/alternative` with HTML and plain text.
- Keep the email width under 600px and total size under 102KB.
- Point images to absolute URLs; most clients ignore external CSS and local files.
- Test in real clients or use Litmus / Email on Acid before a campaign.
- Escape user input with Handlebars' default HTML escaping or a sanitizer before
  it reaches the template.
- Add an unsubscribe link to every marketing email.
- Provide alt text for images so the email is readable when images are blocked.

## Common Mistakes

- Web fonts and `@font-face` usually fail; stick to system fonts such as Arial,
  Georgia and Verdana.
- Flexbox, grid, `border-radius` and `position` aren't reliable; most clients
  ignore them.
- Forgetting the plain-text version; spam filters and some users need it.
- Embedding large base64 images; they bloat the message and may be stripped.
- Trusting client `<style>` blocks; Gmail strips them in many cases.
- Including user input without escaping; this can lead to HTML injection.

## FAQ

### Do I need MJML if I use SendGrid?

SendGrid has templates, but MJML gives you version-controlled markup that you
can render and send through any provider. You can also test the template on your
own machine before sending.

### Can I use React to render MJML?

Yes. The `mjml-react` package lets you write MJML as JSX and still compile
through the same pipeline.

### Why does my template look broken in Outlook?

Outlook on Windows relies on Word's HTML engine and ignores most modern CSS.
MJML generates table-based HTML with conditional comments specifically to handle
Outlook.

### Can I use my own brand fonts?

Most email clients won't load web fonts, so a fallback font stack is a must.
Test how it falls back.

### How do I test emails before sending?

Render the template, send a test to yourself, and check it in Gmail, Outlook and
Apple Mail. For large campaigns, use Litmus or Email on Acid.
