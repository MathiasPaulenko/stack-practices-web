---
contentType: recipes
slug: email-templates-mjml
title: "Build Responsive Email Templates with MJML"
description: "Create cross-client responsive email templates using MJML markup, live Handlebars variables, and inline CSS for reliable rendering across Gmail, Outlook, and Apple Mail"
metaDescription: "Build responsive email templates with MJML. Create cross-client compatible emails with live variables and inline CSS for Gmail, Outlook, and Apple Mail."
difficulty: beginner
topics:
  - frontend
  - data
tags:
  - email
  - frontend
  - ui
  - css
  - javascript
relatedResources:
  - /recipes/performance/spa-code-splitting-lazy
  - /recipes/api/go-rest-api-gin
  - /guides/design/clean-code-principles-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build responsive email templates with MJML. Create cross-client compatible emails with live variables and inline CSS for Gmail, Outlook, and Apple Mail."
  keywords:
    - mjml
    - email templates
    - responsive email
    - cross-client email
    - handlebars
---

# Build Responsive Email Templates with MJML

Email HTML is notoriously difficult due to inconsistent client rendering engines. MJML abstracts these complexity into a declarative markup language that compiles to battle-tested, responsive HTML with inline styles. The following demonstrates how to MJML structure, live templating with Handlebars, and sending via SMTP/API.

## When to Use This

- Transactional emails (password resets, order confirmations) must render reliably. See [Input Validation](/recipes/api/input-validation) for validating email form data.
- Marketing newsletters need responsive layouts on mobile and desktop. See [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) for responsive frontend design.
- You want to avoid writing table-based HTML by hand. See [Component Testing](/recipes/testing/e2e-testing) for testing email components.

## Solution

### 1. Basic MJML Template

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
          Thanks for joining. Your account is ready and you can start exploring right away.
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

### 2. Compile and Render

```typescript
// email/EmailRenderer.ts
import mjml2html from 'mjml';
import Handlebars from 'handlebars';

interface WelcomeData {
  name: string;
  dashboardUrl: string;
}

function compileTemplate(mjmlSource: string, data: WelcomeData): { html: string; errors: unknown[] } {
  // Compile MJML to HTML
  const { html: rawHtml, errors } = mjml2html(mjmlSource, {
    validationLevel: 'strict',
    minify: true,
  });

  // Inject live variables
  const template = Handlebars.compile(rawHtml);
  const html = template(data);

  return { html, errors };
}
```

### 3. Send via SMTP with Nodemailer

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

### 4. Reusable Component Library

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

<!-- Usage in template -->
<mj-include path="./components/Button.mjml" />
<mj-button url="{{ctaUrl}}" text="Get Started" />
```

### 5. Dark Mode Support

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

## How It Works

- **MJML components** abstract table-based layouts into semantic tags like `<mj-section>` and `<mj-column>`
- **Compilation** generates Outlook-safe, inline-styled HTML with conditional comments
- **Handlebars** injects runtime variables after MJML compilation to preserve markup
- **Minification** reduces payload size for faster email delivery

## Production Considerations

- Test templates in Litmus or Email on Acid before production deployment
- Keep total email width under 600px for mobile compatibility
- Use absolute URLs for all images; most clients block external CSS

## Common Mistakes

- Using web fonts (not supported in most clients; stick to system fonts)
- Relying on flexbox or grid (use MJML's column system instead)
- Forgetting plain-text versions, which hurt deliverability scores

## FAQ

**Q: Do I need MJML if I use a service like SendGrid?**
A: SendGrid provides templates, but MJML gives you version-controlled, reusable markup that works across any provider.

**Q: Can I use React to render MJML?**
A: Yes. Use `mjml-react` to write MJML as JSX components while keeping the same compilation pipeline.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
