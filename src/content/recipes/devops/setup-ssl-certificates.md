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

## Best Practices

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
