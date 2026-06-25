---
contentType: recipes
slug: setup-ssl-certificates
title: "Configurar Certificados SSL con Let's Encrypt"
description: "Cómo obtener, instalar y renovar automáticamente certificados SSL usando Certbot con Nginx, Apache y modos standalone para despliegues con HTTPS."
metaDescription: "Obtén, instala y renueva automáticamente certificados SSL con Certbot, Nginx, Apache y standalone para despliegues HTTPS."
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
  metaDescription: "Obtén, instala y renueva automáticamente certificados SSL con Certbot, Nginx, Apache y standalone para despliegues HTTPS."
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

## Descripción General

Let's Encrypt es una autoridad certificadora gratuita y automatizada que provee certificados SSL/TLS confiables por todos los navegadores principales. Certbot es el cliente oficial que automatiza la emisión, instalación y renovación de certificados. Juntos eliminan el costo y trabajo manual de configurar HTTPS.

Antes de Let's Encrypt, obtener un certificado SSL válido requería comprar a una CA comercial, generar un CSR, validar la propiedad del dominio vía email e instalar el certificado manualmente. El proceso tomaba horas o días y costaba cientos de dólares por año. Let's Encrypt redujo esto a un solo comando y costo cero.

## Cuándo Usar

Usa esta receta cuando:

- Configuras HTTPS para una nueva aplicación web pública.
- Reemplazas certificados expirados o autofirmados con otros confiables por navegadores.
- Automatizas la renovación de certificados para que nunca expiren inadvertidamente.
- Configuras SSL en un reverse proxy (Nginx, Apache, HAProxy) o load balancer.
- Habilitas HTTPS en un contenedor Docker o ingress de Kubernetes.

## Implementación Paso a Paso

### Instalar Certbot

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# macOS (para testing)
brew install certbot

# Verificar instalación
certbot --version
```

### Nginx (Plugin Automático)

```bash
# Emitir e instalar certificado en un solo paso
certbot --nginx -d example.com -d www.example.com

# Probar renovación automática
sudo certbot renew --dry-run
```

El plugin `--nginx` lee automáticamente el server block, instala el certificado y configura la redirección a HTTPS.

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

    # Configuración TLS moderna
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

### Apache (Plugin Automático)

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

    # TLS moderno
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder on
</VirtualHost>
```

### Standalone (Sin Servidor Web)

```bash
# Usar modo standalone cuando no hay servidor web corriendo
certbot certonly --standalone -d example.com

# Los certificados se guardan en /etc/letsencrypt/live/example.com/
# Configura tu aplicación para leer:
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

### Auto-Renovación (Systemd Timer)

```bash
# Certbot instala un systemd timer automáticamente en la mayoría de sistemas
sudo systemctl status certbot.timer

# Fallback con cron manual
sudo crontab -e
# Agregar:
# 0 3 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

## Mejores Prácticas

- **Usa el plugin del servidor web** (`--nginx`, `--apache`) cuando sea posible. Maneja la configuración automáticamente y reduce errores humanos.
- **Configura la auto-renovación desde el día uno.** Los certificados de Let's Encrypt expiran cada 90 días. Un cron job olvidado causa downtime en producción.
- **Incluye dominio y subdominio www** en la solicitud del certificado para evitar warnings del navegador en cualquiera de las URLs.
- **Redirige HTTP a HTTPS** a nivel de servidor web, no en código de aplicación. Es más rápido y confiable.
- **Usa `fullchain.pem`, no `cert.pem`.** La cadena completa incluye certificados intermedios que los navegadores necesitan para validar la cadena de confianza.

## Errores Comunes

- **Abrir el puerto 80 solo temporalmente** durante la configuración inicial y luego cerrarlo. Let's Encrypt requiere el puerto 80 abierto para validación HTTP-01 en cada renovación.
- **Solicitar un certificado para un dominio interno** (ej., `app.local`). Let's Encrypt solo emite certificados para dominios públicamente resolvibles.
- **Usar `cert.pem` en lugar de `fullchain.pem`** causa errores "certificado no confiado" en algunos navegadores porque faltan intermedios.
- **No probar la renovación con `--dry-run`.** Una emisión inicial exitosa no garantiza que la renovación funcionará. Pruébalo antes de los 90 días.
- **Ejecutar Certbot como root innecesariamente.** Usa `sudo` para la instalación, pero considera ejecutar la renovación como un usuario dedicado con privilegios limitados.

## Recursos Relacionados

- [Ansible Playbook](/recipes/ansible-playbook)
- [Docker Basics](/recipes/docker-basics)
- [Secret Management](/recipes/secret-management)
