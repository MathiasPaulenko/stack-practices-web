---
contentType: recipes
slug: setup-ssl-certificates
title: "Setup SSL Certificates with Let's Encrypt"
description: "How to obtain, install, and auto-renew SSL certificates using Certbot with Nginx, Apache, and standalone modes for HTTPS-enabled deployments."
metaDescription: "Obtain, install, and auto-renew SSL certificates using Certbot with Nginx, Apache, and standalone modes for HTTPS-enabled deployments."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - ssl
  - tls
  - lets-encrypt
  - certbot
  - https
  - security
  - recipe
relatedResources:
  - /recipes/ansible-playbook
  - /recipes/docker-basics
  - /recipes/secret-management
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Obtain, install, and auto-renew SSL certificates using Certbot with Nginx, Apache, and standalone modes for HTTPS-enabled deployments."
  keywords:
    - ssl
    - tls
    - lets-encrypt
    - certbot
    - https
    - security
    - devops
    - recipe
---

## Overview

Let's Encrypt is a free, automated certificate authority that provides SSL/TLS certificates trusted by all major browsers. Certbot is the official client that automates certificate issuance, installation, and renewal. Together they eliminate the cost and manual work of HTTPS setup.

Before Let's Encrypt, obtaining a valid SSL certificate required purchasing from a commercial CA, generating a CSR, validating domain ownership via email, and manually installing the certificate. The process took hours or days and cost hundreds of dollars per year. Let's Encrypt reduced this to a single command and zero cost.

## When to Use

Use this recipe when:

- Setting up HTTPS for a new public-facing web application.
- Replacing expired or self-signed certificates with browser-trusted ones.
- Automating certificate renewal so certificates never expire unnoticed.
- Setting up SSL on a reverse proxy (Nginx, Apache, HAProxy) or load balancer.
- Enabling HTTPS in a Docker container or Kubernetes ingress.

## Step-by-Step Implementation

### Install Certbot

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# macOS (for testing)
brew install certbot

# Verify installation
certbot --version
```

### Nginx (Automatic Plugin)

```bash
# Issue and install certificate in one step
certbot --nginx -d example.com -d www.example.com

# Test automatic renewal
sudo certbot renew --dry-run
```

The `--nginx` plugin automatically reads your server block, installs the certificate, and configures HTTPS redirection.

```nginx
# /etc/nginx/sites-available/example.com
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Apache (Automatic Plugin)

```bash
certbot --apache -d example.com -d www.example.com
```

```apache
# /etc/apache2/sites-available/example.com.conf
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    Redirect permanent / https://example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Modern TLS
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder on
</VirtualHost>
```

### Standalone (No Web Server)

```bash
# Use standalone mode when no web server is running
certbot certonly --standalone -d example.com

# Certificates are saved to /etc/letsencrypt/live/example.com/
# Configure your application to read:
#   /etc/letsencrypt/live/example.com/fullchain.pem
#   /etc/letsencrypt/live/example.com/privkey.pem
```

### Docker / Certbot

```yaml
# docker-compose.yml
version: '3'
services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
      - ./certbot/log:/var/log/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://app:3000;
    }
}
```

### Auto-Renewal (Systemd Timer)

```bash
# Certbot installs a systemd timer automatically on most systems
sudo systemctl status certbot.timer

# Manual cron fallback
sudo crontab -e
# Add:
# 0 3 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

## What Works

- **Use the web server plugin** (`--nginx`, `--apache`) when possible. It handles configuration automatically and reduces human error.
- **Set up auto-renewal from day one.** Let's Encrypt certificates expire every 90 days. A forgotten cron job causes production downtime.
- **Include both domain and www subdomain** in the certificate request to avoid browser warnings on either URL.
- **Redirect HTTP to HTTPS** at the web server level, not in application code. This is faster and more reliable.
- **Use `fullchain.pem`, not `cert.pem`.** The full chain includes intermediate certificates that browsers need to validate the trust chain.

## Common Mistakes

- **Opening port 80 only temporarily** during initial setup and then closing it. Let's Encrypt requires port 80 open for HTTP-01 validation on every renewal.
- **Requesting a certificate for an internal domain** (e.g., `app.local`). Let's Encrypt only issues certificates for publicly resolvable domains.
- **Using `cert.pem` instead of `fullchain.pem`** causes "certificate not trusted" errors in some browsers because intermediates are missing.
- **Not testing renewal with `--dry-run`.** A working initial issuance does not guarantee renewal will work. Test it before the 90-day deadline.
- **Running Certbot as root unnecessarily.** Use `sudo` for installation, but consider running the renewal as a dedicated user with limited privileges.

## Frequently Asked Questions

**Q: What is the difference between a self-signed and a CA-signed certificate?**
A: A self-signed certificate is issued by you and will cause browser warnings. A CA-signed certificate is trusted by default because browsers trust the issuing Certificate Authority.

**Q: How does Let's Encrypt work?**
A: Let's Encrypt is a free CA that validates domain ownership via HTTP or DNS challenges and issues short-lived certificates, typically valid for 90 days.

**Q: Why should I automate certificate renewal?**
A: TLS certificates expire. Automated renewal prevents service outages caused by expired certificates and reduces manual operational work.

### DNS Challenge for Wildcard Certificates

```bash
# Wildcard certs require DNS-01 challenge
certbot certonly --manual --preferred-challenges dns \
  -d "*.example.com" -d example.com \
  --agree-tos --email admin@example.com

# For automated DNS validation with Cloudflare
pip install certbot-dns-cloudflare
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.example.com" -d example.com
```

```ini
# ~/.secrets/cloudflare.ini
dns_cloudflare_api_token = your-api-token-here
```

### Kubernetes Ingress with cert-manager

```yaml
# cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - example.com
        - www.example.com
      secretName: example-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

### Security Headers and OCSP Stapling

```nginx
# Add to your HTTPS server block
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # OCSP stapling - faster TLS handshakes
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Session caching for performance
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
}
```

### Monitoring Certificate Expiry

```bash
# Check certificate expiry
echo | openssl s_client -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# Prometheus blackbox exporter alert
# Alert if cert expires within 7 days
- alert: SslCertificateExpiringSoon
  expr: probe_ssl_earliest_cert_expiry - time() < 7 * 24 * 3600
  for: 10m
  labels:
    severity: warning
```

## Additional Best Practices

1. **Use ECC certificates when possible.** ECDSA keys are smaller and faster than RSA:

```bash
# Request an ECDSA certificate
certbot certonly --nginx --key-type ecdsa --elliptic-curve secp256r1 \
  -d example.com
```

2. **Set up HSTS preload.** Submit your domain to hstspreload.org after confirming HTTPS works everywhere:

```nginx
# Must include includeSubDomains and preload
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

3. **Use a certificate monitoring service.** Tools like SSL Certificate Monitor or Uptime Robot alert you before expiry:

```bash
# Cron-based monitoring
0 8 * * * /usr/local/bin/check-cert-expiry.sh example.com 14 >> /var/log/cert-check.log
```

## Additional Common Mistakes

1. **Forgetting to reload the web server after renewal.** Certbot updates files but Nginx keeps old certs in memory:

```bash
# Use --deploy-hook to reload automatically
certbot renew --deploy-hook "systemctl reload nginx"
```

2. **Not rate-limiting certificate requests.** Let's Encrypt has strict rate limits: 50 certificates per registered domain per week:

```bash
# Use --staging for testing to avoid hitting rate limits
certbot certonly --staging -d example.com
```

3. **Mixing HTTP and HTTPS content.** Browsers block active mixed content. Ensure all assets use HTTPS:

```html
<!-- Bad: mixed content blocked -->
<script src="http://cdn.example.com/script.js"></script>

<!-- Good: HTTPS everywhere -->
<script src="https://cdn.example.com/script.js"></script>
```

## Additional FAQ

### How do I get a wildcard certificate?

Wildcard certificates (`*.example.com`) cover all first-level subdomains. They require DNS-01 challenge, not HTTP-01. Use a DNS plugin like `certbot-dns-cloudflare` or `certbot-dns-route53` for automated renewal.

### What are Let's Encrypt rate limits?

- 50 certificates per registered domain per week
- 5 duplicate certificates per week
- 5 failed validations per hour per account
- 300 new orders per 3 hours per account

Use `--staging` for testing to avoid hitting production rate limits.

### Should I use TLS 1.3?

Yes. TLS 1.3 is faster (1-RTT handshake vs 2-RTT) and removes insecure algorithms. All modern browsers support it. Enable it alongside TLS 1.2 for compatibility:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

## Performance Tips

1. **Enable OCSP stapling.** Clients verify cert status without contacting the CA, reducing handshake latency:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
```

2. **Use session resumption.** Cache TLS sessions to skip full handshake on returning clients:

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

3. **Prefer ECDSA over RSA.** Smaller keys mean faster handshakes and less CPU usage:

```bash
certbot certonly --key-type ecdsa --elliptic-curve secp256r1 -d example.com
```
