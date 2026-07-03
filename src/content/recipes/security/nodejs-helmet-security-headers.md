---
contentType: recipes
slug: nodejs-helmet-security-headers
title: "Configure HTTP Security Headers with Helmet in Node.js"
description: "Set security HTTP headers in Express apps with Helmet — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and CORS for OWASP-compliant web security"
metaDescription: "Configure HTTP security headers with Helmet in Node.js Express. Set CSP, HSTS, X-Frame-Options, CORS, and prevent clickjacking, XSS, and MIME sniffing attacks."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - nodejs
  - helmet
  - security headers
  - express
  - owasp
relatedResources:
  - /recipes/security/python-jwt-refresh-token-rotation
  - /recipes/security/python-sql-injection-sqlalchemy
  - /recipes/ai/python-llm-streaming-responses
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure HTTP security headers with Helmet in Node.js Express. Set CSP, HSTS, X-Frame-Options, CORS, and prevent clickjacking, XSS, and MIME sniffing attacks."
  keywords:
    - helmet nodejs
    - security headers
    - express security
    - csp header
    - hsts header
---

# Configure HTTP Security Headers with Helmet in Node.js

HTTP security headers protect your web app from clickjacking, XSS, MIME sniffing, and man-in-the-middle attacks. Helmet is an Express middleware that sets them automatically. Below: configuring Helmet with Content Security Policy (CSP), HSTS, CORS, and custom headers for OWASP compliance.

## When to Use This

- Any Express.js web application or API
- Production deployments requiring OWASP security header compliance
- Apps serving HTML to browsers (CSP is critical for XSS prevention)

## Prerequisites

- Node.js 18+
- Express.js project (`npm install express`)
- Helmet (`npm install helmet`)

## Solution

### 1. Install Dependencies

```bash
npm install express helmet cors
```

### 2. Basic Helmet Setup

```javascript
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const app = express();

// Enable Helmet with default security headers
app.use(helmet());

// Enable CORS with specific origins
app.use(cors({
  origin: ["https://example.com", "https://app.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // Preflight cache: 24 hours
}));

app.get("/", (req, res) => {
  res.json({ message: "Secure API" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### 3. Custom Content Security Policy (CSP)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://www.googletagmanager.com",
      ],
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "'unsafe-inline'", // Required for many CSS frameworks
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
      ],
      connectSrc: [
        "'self'",
        "https://api.example.com",
        "https://www.google-analytics.com",
      ],
      frameAncestors: ["'none'"], // Prevent clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

### 4. HSTS (HTTP Strict Transport Security)

```javascript
app.use(helmet({
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 5. Fine-Grained Header Control

```javascript
app.use(helmet({
  // Prevent clickjacking
  frameguard: { action: "deny" },

  // Prevent MIME sniffing
  noSniff: true,

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // X-Content-Type-Options
  contentTypeOptions: true,

  // Referrer policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },

  // X-Download-Options (IE8)
  ieNoOpen: true,

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: { policy: "require-corp" },

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "same-origin" },

  // Origin Agent Cluster
  originAgentCluster: true,
}));
```

### 6. Per-Route Header Configuration

```javascript
// API routes — stricter headers, no CSP
const apiHelmet = helmet({
  contentSecurityPolicy: false,
  frameguard: { action: "deny" },
});

app.use("/api", apiHelmet);

// Web routes — full CSP
const webHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
});

app.use("/web", webHelmet);
```

### 7. Custom Headers Middleware

```javascript
// Custom security headers not covered by Helmet
app.use((req, res, next) => {
  // Permissions Policy (Feature Policy successor)
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // X-Robots-Tag (prevent indexing of API endpoints)
  if (req.path.startsWith("/api")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }

  // Cache-Control for sensitive endpoints
  if (req.path.includes("/auth") || req.path.includes("/user")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  }

  next();
});
```

### 8. Verify Headers with Test

```javascript
const request = require("supertest");

describe("Security Headers", () => {
  it("should set X-Content-Type-Options", async () => {
    const response = await request(app).get("/");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should set X-Frame-Options", async () => {
    const response = await request(app).get("/");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("should set Strict-Transport-Security", async () => {
    const response = await request(app).get("/");
    expect(response.headers["strict-transport-security"]).toContain("max-age=31536000");
  });

  it("should set Content-Security-Policy", async () => {
    const response = await request(app).get("/");
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
  });

  it("should remove X-Powered-By", async () => {
    const response = await request(app).get("/");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
```

## How It Works

1. **Content-Security-Policy (CSP)** — the most important header. It defines which sources are allowed to load scripts, styles, images, etc. This prevents XSS by blocking inline scripts and unauthorized external resources.
2. **Strict-Transport-Security (HSTS)** — forces the browser to use HTTPS for all future requests to this domain. `includeSubDomains` extends this to all subdomains. `preload` allows submission to the HSTS preload list.
3. **X-Frame-Options** — prevents your page from being embedded in an iframe, blocking clickjacking attacks. `DENY` blocks all framing; `SAMEORIGIN` allows same-site framing.
4. **X-Content-Type-Options: nosniff** — prevents browsers from MIME-sniffing responses, which can lead to XSS by interpreting non-script files as scripts.
5. **Referrer-Policy** — controls how much referrer information is sent with requests. `strict-origin-when-cross-origin` sends the full URL for same-origin requests but only the origin for cross-origin.

## Variants

### Nonce-Based CSP for Inline Scripts

```javascript
const crypto = require("crypto");

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
    },
  },
}));

// Use nonce in templates
app.get("/", (req, res) => {
  res.send(`
    <script nonce="${res.locals.nonce}">
      console.log("This inline script is allowed");
    </script>
  `);
});
```

### Report-Only CSP (Testing)

```javascript
// Report violations without blocking — for testing CSP before enforcement
app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      reportUri: ["/api/csp-report"],
    },
  },
}));

app.post("/api/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  console.log("CSP Violation:", req.body);
  res.status(204).end();
});
```

### Production vs Development

```javascript
const isProduction = process.env.NODE_ENV === "production";

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  } : false, // Disable CSP in dev for hot reload

  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false, // Disable HSTS in dev (HTTP)
}));
```

## Best Practices

- **Start with report-only CSP** — use `reportOnly: true` to find violations before enforcing
- **Use nonces for inline scripts** — avoid `'unsafe-inline'` in scriptSrc; use per-request nonces
- **Set HSTS only over HTTPS** — HSTS over HTTP is ignored by browsers
- **Test with securityheaders.com** — scan your site to verify header configuration

## Common Mistakes

- **Using `'unsafe-inline'` in scriptSrc** — defeats XSS protection; use nonces instead
- **Forgetting to disable HSTS in development** — browsers cache HSTS and won't allow HTTP
- **Not setting `frameAncestors` in CSP** — X-Frame-Options is deprecated; CSP `frameAncestors` is the modern equivalent
- **Overly permissive CORS** — `origin: "*"` with `credentials: true` is invalid and insecure

## FAQ

**Q: Does Helmet make my app secure?**
A: Helmet sets security headers but is not a complete security solution. You still need input validation, authentication, and secure coding practices.

**Q: Should I use Helmet for API-only backends?**
A: Yes. Even APIs benefit from `noSniff`, `hidePoweredBy`, and HSTS. Disable CSP for API routes since they don't serve HTML.

**Q: How do I debug CSP violations?**
A: Use `reportOnly: true` and log violations. Browser DevTools also show CSP errors in the console.

**Q: Can I use Helmet with Next.js?**
A: Next.js has its own headers config. Use `next.config.js` `headers()` instead of Helmet for Next.js apps.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
