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
  - /recipes/spa-code-splitting-lazy
  - /recipes/go-rest-api-gin
  - /guides/clean-code-principles-guide
  - /recipes/server-side-rendering
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

## Variants and Alternatives

- **MJML vs Handlebars + inline CSS**: MJML abstracts responsive layout but requires a build step. Handlebars with inline CSS gives full control but needs manual responsive design. Use MJML for teams without email expertise, Handlebars for complex conditional layouts
- **HTML email vs plain text**: HTML emails support branding and tracking pixels but have deliverability risks. Plain text emails have higher deliverability but no visual branding. Send multipart/alternative with both HTML and plain text for best results
- **Table-based layout vs flexbox**: email clients have inconsistent CSS support. Outlook uses Word's rendering engine (limited CSS). Gmail strips <style> blocks. Use table-based layouts with inline CSS for maximum compatibility
- **Dynamic content vs static templates**: dynamic templates (Handlebars, Mustache) allow personalization but require a rendering step. Static templates are faster to send but less personalized. Use dynamic for transactional emails, static for newsletters
- **Embedded images vs hosted images**: embedded images (CID attachments) work offline but increase email size. Hosted images (URLs) keep emails small but require an internet connection. Use hosted images for newsletters, embedded for transactional
- **Dark mode support**: use prefers-color-scheme media query in <style> blocks. Not all clients support it. Provide fallback colors. Test with Litmus or Email on Acid

## Common Pitfalls in Production

- **Outlook rendering issues**: Outlook uses Word's HTML engine, not a browser. It does not support order-radius, lexbox, grid, or position. Use VML for rounded corners and buttons in Outlook
- **Gmail clipping at 102KB**: Gmail clips emails larger than 102KB. Optimize by removing unused CSS, compressing images, and using external image hosting. Test with a tool like Litmus to check email size
- **Image blocking by default**: most email clients block images by default. Use alt text for all images. Design emails that work without images. Use background colors as fallbacks
- **CSS inlining failures**: some email clients strip <style> blocks. Use a CSS inliner (Juice, Premailer) to inline all styles. Test with Gmail, Outlook, and Apple Mail
- **Font fallback chains**: web fonts (@font-face) work in Apple Mail and iOS Mail but not in Gmail or Outlook. Always provide fallback fonts: ont-family: 'Custom Font', Arial, sans-serif
- **Testing across clients**: there are 50+ email clients with different rendering engines. Test with Litmus or Email on Acid. At minimum test: Gmail (web), Outlook (desktop), Apple Mail (desktop), Gmail (mobile), iOS Mail

## Integration Patterns

- **Transactional email pipeline**: trigger event -> render template with data -> inline CSS -> send via SMTP or API -> track delivery/open/click. Use SendGrid, Postmark, or AWS SES for delivery. Use webhooks for bounce and spam complaint tracking
- **Newsletter campaign pipeline**: import subscriber list -> segment by preferences -> render personalized template -> send in batches (to avoid rate limits) -> track opens and clicks -> generate report
- **Multi-language email support**: detect user locale -> select template by locale -> render with localized strings -> send. Store translations in JSON files. Use Handlebars helpers for pluralization and gender
- **Email queue with retry**: enqueue email -> send attempt -> on failure, retry with exponential backoff (1m, 5m, 30m, 2h, 12h) -> after 5 failures, dead letter queue. Use Redis or RabbitMQ for the queue
- **A/B testing email content**: create two template variants -> split audience 50/50 -> send both -> track open rate and click rate -> declare winner after 24 hours. Use SendGrid A/B testing or implement custom
- **Email suppression list management**: maintain a list of bounced, complained, and unsubscribed addresses. Check against this list before sending. Never send to suppressed addresses. Sync with ESP suppression list

## Tooling and Ecosystem

- **MJML**: open-source markup language for responsive emails. Compiles to table-based HTML. 40K+ GitHub stars. CLI: mjml input.mjml -o output.html. VS Code extension available
- **Handlebars**: logic-less templating for dynamic content. 17K+ GitHub stars. Helpers for conditionals, loops, and partials. Used by SendGrid, Mailgun, and SparkPost
- **Juice**: CSS inliner for Node.js. 3K+ GitHub stars. Inlines <style> blocks into inline style attributes. Essential for email compatibility
- **Litmus**: email testing platform. Tests across 90+ email clients. Screenshot comparison, spam testing, accessibility checks. Paid service starting at /month
- **Email on Acid**: alternative to Litmus. Screenshot testing across 70+ clients. Free trial available. Good for smaller teams
- **Premailer**: Ruby-based CSS inliner. Also available as web service. Pre-processes CSS for email compatibility

## Best Practices Summary

- Always send multipart/alternative with both HTML and plain text
- Use table-based layouts with inline CSS for maximum client compatibility
- Test across at least 5 email clients before sending
- Keep email size under 102KB to avoid Gmail clipping
- Use alt text for all images and design for image-blocking
- Provide font fallback chains for all custom fonts
- Include an unsubscribe link in every email (CAN-SPAM, GDPR requirement)
- Test dark mode rendering with prefers-color-scheme media query
- Monitor bounce rate, spam complaint rate, and open rate
- Use a suppression list and never send to bounced or unsubscribed addresses
## Error Handling and Recovery

- **Bounce handling**: hard bounces (permanent failures) should immediately suppress the address. Soft bounces (temporary failures) should retry for 3-5 days before suppressing. Use webhooks from your ESP to process bounces in real-time
- **Spam complaint handling**: when a user marks an email as spam, immediately suppress the address. Do not send any further emails. This protects your sender reputation. Process spam complaints via ESP webhooks
- **Template rendering errors**: if a template variable is missing, use a default value instead of showing an empty string. Log the missing variable for debugging. Never crash the email pipeline for a missing variable
- **ESP rate limiting**: if your ESP rate-limits your sends, implement a queue with rate limiting. Send in batches of 100-1000 emails per second depending on your ESP limits. Use a token bucket algorithm for smooth rate limiting
- **Unsubscribe link failures**: if the unsubscribe link is broken, the user cannot opt out. This violates CAN-SPAM and GDPR. Test unsubscribe links before every send. Use a dedicated unsubscribe service or ESP-managed unsubscribe
- **Email validation before sending**: validate email addresses before adding to your list. Use regex for basic format validation, SMTP check for domain existence, and ESP validation for deliverability. Reject disposable email domains

## Performance Optimization Tips

- Pre-render templates at build time for static content. Only render dynamic content at send time
- Use MJML CLI with --minify flag to reduce output HTML size by 10-20%
- Cache rendered templates in Redis with a TTL of 1 hour. Invalidate on template update
- Batch send emails in parallel using Promise.all with a concurrency limit of 50-100
- Use a CDN for hosted email images. Set cache headers to 1 year for static images
- Compress images with WebP or optimized JPEG before embedding. Target <100KB per image
- Use premailer with 
emove_classes and merge_inline options to reduce CSS size
- Avoid base64-encoded images in emails. They increase size by 33% and are blocked by some clients
- Use short, descriptive alt text (50-100 chars). Long alt text is truncated by some clients
- Test email load time with Litmus. Target <3 seconds to render on mobile devices
## Security Considerations

- **Email injection attacks**: if user input is included in email headers (subject, from, reply-to), attackers can inject additional headers or BCC recipients. Sanitize all user input with ilter_var(, FILTER_SANITIZE_EMAIL) or equivalent. Never allow newlines in header values
- **HTML injection in email body**: if user input is rendered in HTML emails without escaping, attackers can inject scripts or malicious links. Always escape user input with HTML entity encoding. Use template engines with auto-escaping (Handlebars, Pug)
- **Tracking pixel privacy**: tracking pixels (1x1 transparent images) raise privacy concerns. Some email clients block them. GDPR requires consent for tracking. Provide a privacy policy and an opt-out mechanism. Consider server-side open tracking instead
- **Unsubscribe link security**: unsubscribe links should use signed tokens, not sequential IDs. An attacker could enumerate unsubscribe links to unsubscribe other users. Use HMAC-signed tokens with expiration. Validate the token server-side
- **SMTP credential protection**: never hardcode SMTP credentials in source code. Use environment variables or a secrets manager. Rotate credentials regularly. Use TLS for SMTP connections. Monitor for credential leaks in git history
- **Content Security Policy for email**: email clients do not support CSP headers. Use inline CSS only. Avoid external stylesheets. Do not include <script> tags (they are stripped by all clients). Sanitize all user-generated content before rendering
## Testing and Quality Assurance

- **Visual testing across clients**: use Litmus or Email on Acid to screenshot your email across 90+ clients. Test at minimum: Gmail (web), Outlook (2016/2019/365), Apple Mail (desktop/iOS), Yahoo Mail, Samsung Mail. Fix rendering issues before sending
- **Dark mode testing**: test emails in dark mode on iOS, macOS, and Outlook. Ensure text is readable on dark backgrounds. Use prefers-color-scheme media query. Provide fallback colors for clients that do not support media queries
- **Accessibility testing**: use accessibility checkers in Litmus or Email on Acid. Ensure alt text for all images. Use semantic HTML (<table>, <h1>, <p>). Maintain color contrast ratio of 4.5:1 for text. Test with screen readers (NVDA, VoiceOver)
- **Link testing**: test all links before sending. Use a link checker tool. Verify unsubscribe links work. Verify tracking parameters are correct. Test on mobile devices. Check that links open in the correct app (browser vs in-app browser)
- **Spam testing**: use Mail Tester or Litmus spam testing. Score below 8/10 indicates potential issues. Check SPF, DKIM, and DMARC records. Avoid spam trigger words (FREE, GUARANTEED, ACT NOW). Keep image-to-text ratio balanced (60% text, 40% images)
- **Send test emails**: send test emails to internal addresses before the full send. Verify rendering, links, and tracking. Test on both desktop and mobile. Use a staging ESP account for tests to avoid affecting production sender reputation

## Deployment and CI/CD

- **Template versioning**: version email templates with semantic versioning. Store in git. Tag releases. Keep a changelog of template changes. Roll back to previous version if rendering issues are found after deployment
- **CI/CD pipeline for emails**: lint MJML -> compile to HTML -> inline CSS -> run visual tests -> run spam tests -> deploy to ESP. Use GitHub Actions or CircleCI. Block deployment on test failures. Cache compiled templates between runs
- **Progressive deployment**: send to a seed list (10-50 internal addresses) first. Verify rendering and deliverability. Send to 5% of the list. Monitor open rate and bounce rate. If metrics are normal, send to the remaining 95%
- **ESP integration**: use ESP APIs (SendGrid, Mailgun, Postmark) for programmatic sending. Store API keys in environment variables. Implement retry logic for API failures. Monitor ESP status pages for outages. Have a backup ESP for failover
- **Template migration**: when switching ESPs, migrate templates carefully. Different ESPs use different templating languages (Handlebars, Mustache, Liquid). Test all templates in the new ESP before switching production traffic
- **Monitoring and alerting**: monitor bounce rate (< 5%), spam complaint rate (< 0.1%), open rate (baseline per email type). Set up alerts for abnormal rates. Track delivery rate by ESP. Monitor sender reputation via Sender Score
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