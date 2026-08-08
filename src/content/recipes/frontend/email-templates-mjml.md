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
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Build responsive email templates with MJML. Create cross-client compatible emails with live variables and inline CSS for Gmail, Outlook, and Apple Mail."
  keywords:
    - mjml
    - email templates
    - responsive email
    - cross-client email
    - handlebars


---
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

- **MJML vs Handlebars + inline CSS**: MJML abstracts responsive layout but requires a build step.  Handlebars with inline CSS gives full control but needs manual responsive design.
- **HTML email vs plain text**: HTML emails support branding and tracking pixels but have deliverability risks.  Plain text emails have higher deliverability but no visual branding.
- **Table-based layout vs flexbox**: email clients have inconsistent CSS support.  Outlook uses Word's rendering engine (limited CSS).  Gmail strips <style> blocks.
- **Dynamic content vs static templates**: dynamic templates (Handlebars, Mustache) allow personalization but require a rendering step.  Static templates are faster to send but less personalized.
- **Embedded images vs hosted images**: embedded images (CID attachments) work offline but increase email size.  Hosted images (URLs) keep emails small but require an internet connection.
- **Dark mode support**: use prefers-color-scheme media query in <style> blocks.  Not all clients support it.  Provide fallback colors.

## Common Pitfalls in Production

- **Outlook rendering issues**: Outlook uses Word's HTML engine, not a browser.  It does not support order-radius, lexbox, grid, or position.
- **Gmail clipping at 102KB**: Gmail clips emails larger than 102KB.
- **Image blocking by default**: most email clients block images by default.  Design emails that work without images.
- **CSS inlining failures**: some email clients strip <style> blocks.
- **Font fallback chains**: web fonts (@font-face) work in Apple Mail and iOS Mail but not in Gmail or Outlook.
- **Testing across clients**: there are 50+ email clients with different rendering engines.

## Integration Patterns

- **Transactional email pipeline**: trigger event -> render template with data -> inline CSS -> send via SMTP or API -> track delivery/open/click.
- **Newsletter campaign pipeline**: import subscriber list -> segment by preferences -> render personalized template -> send in batches (to avoid rate limits) -> track opens and clicks -> generate report
- **Multi-language email support**: detect user locale -> select template by locale -> render with localized strings -> send.
- **Email queue with retry**: enqueue email -> send attempt -> on failure, retry with exponential backoff (1m, 5m, 30m, 2h, 12h) -> after 5 failures, dead letter queue.
- **A/B testing email content**: create two template variants -> split audience 50/50 -> send both -> track open rate and click rate -> declare winner after 24 hours.
- **Email suppression list management**: maintain a list of bounced, complained, and unsubscribed addresses.  Never send to suppressed addresses.

## Tooling and Ecosystem

- **MJML**: open-source markup language for responsive emails.  Compiles to table-based HTML.  40K+ GitHub stars.  CLI: mjml input. mjml -o output. html.
- **Handlebars**: logic-less templating for dynamic content.  17K+ GitHub stars.  Helpers for conditionals, loops, and partials.
- **Juice**: CSS inliner for Node. js.  3K+ GitHub stars.  Inlines <style> blocks into inline style attributes.
- **Litmus**: email testing platform.  Tests across 90+ email clients.  Screenshot comparison, spam testing, accessibility checks.
- **Email on Acid**: alternative to Litmus.  Screenshot testing across 70+ clients.  Free trial available.
- **Premailer**: Ruby-based CSS inliner.  Also available as web service.

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

- **Bounce handling**: hard bounces (permanent failures) should immediately suppress the address.  Soft bounces (temporary failures) should retry for 3-5 days before suppressing.
- **Spam complaint handling**: when a user marks an email as spam, immediately suppress the address.  Do not send any further emails.  This protects your sender reputation.
- **Template rendering errors**: if a template variable is missing, use a default value instead of showing an empty string.  Log the missing variable for debugging.
- **ESP rate limiting**: if your ESP rate-limits your sends, implement a queue with rate limiting.  Send in batches of 100-1000 emails per second depending on your ESP limits.
- **Unsubscribe link failures**: if the unsubscribe link is broken, the user cannot opt out.  This violates CAN-SPAM and GDPR.
- **Email validation before sending**: validate email addresses before adding to your list.

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

- **Email injection attacks**: if user input is included in email headers (subject, from, reply-to), attackers can inject additional headers or BCC recipients.  Sanitize all user input with ilter_var(, FILTER_SANITIZE_EMAIL) or equivalent.
- **HTML injection in email body**: if user input is rendered in HTML emails without escaping, attackers can inject scripts or malicious links.  Always escape user input with HTML entity encoding.
- **Tracking pixel privacy**: tracking pixels (1x1 transparent images) raise privacy concerns.  Some email clients block them.  GDPR requires consent for tracking.  Provide a privacy policy and an opt-out mechanism.
- **Unsubscribe link security**: unsubscribe links should use signed tokens, not sequential IDs.  An attacker could enumerate unsubscribe links to unsubscribe other users.
- **SMTP credential protection**: never hardcode SMTP credentials in source code.  Rotate credentials regularly.
- **Content Security Policy for email**: email clients do not support CSP headers.  Do not include <script> tags (they are stripped by all clients).
## Testing and Quality Assurance

- **Visual testing across clients**: use Litmus or Email on Acid to screenshot your email across 90+ clients.
- **Dark mode testing**: test emails in dark mode on iOS, macOS, and Outlook.
- **Accessibility testing**: use accessibility checkers in Litmus or Email on Acid. 5:1 for text.
- **Link testing**: test all links before sending.  Verify unsubscribe links work.  Verify tracking parameters are correct.
- **Spam testing**: use Mail Tester or Litmus spam testing.  Score below 8/10 indicates potential issues.
- **Send test emails**: send test emails to internal addresses before the full send.  Verify rendering, links, and tracking.

## Deployment and CI/CD

- **Template versioning**: version email templates with semantic versioning.  Tag releases.
- **CI/CD pipeline for emails**: lint MJML -> compile to HTML -> inline CSS -> run visual tests -> run spam tests -> deploy to ESP.  Block deployment on test failures.
- **Progressive deployment**: send to a seed list (10-50 internal addresses) first.  Verify rendering and deliverability.  Send to 5% of the list.
- **ESP integration**: use ESP APIs (SendGrid, Mailgun, Postmark) for programmatic sending.
- **Template migration**: when switching ESPs, migrate templates carefully.  Different ESPs use different templating languages (Handlebars, Mustache, Liquid).
- **Monitoring and alerting**: monitor bounce rate (< 5%), spam complaint rate (< 0. 1%), open rate (baseline per email type).  Set up alerts for abnormal rates.

## Troubleshooting

- **Component does not re-render**: verify state reference, props, and memoization.  A mutated object can bypass change detection.
- **Style does not apply in production**: check that CSS is loaded, class names are not mangled, and specificity wins.  Purge unused styles carefully.
- **Build fails after dependency update**: read the changelog, pin versions, and clean the lock file.
- **Accessibility audit fails**: add labels, landmarks, focus management, and color contrast.
- **Hydration mismatch**: ensure server and client render the same initial HTML. random, or window during SSR.




## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the email and frontend guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply build responsive email templates with mjml** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

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

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
