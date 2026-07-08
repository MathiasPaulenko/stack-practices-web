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

## Lo que funciona

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

## Preguntas Frecuentes

**Q: ¿Cuál es la diferencia entre un certificado autofirmado y uno firmado por CA?**
A: Un certificado autofirmado lo emites tú y generará advertencias en el navegador. Un certificado firmado por CA es confiable por defecto porque los navegadores confían en la Autoridad Certificadora emisora.

**Q: ¿Cómo funciona Let's Encrypt?**
A: Let's Encrypt es una CA gratuita que valida la propiedad del dominio mediante desafíos HTTP o DNS y emite certificados de corta duración, típicamente válidos por 90 días.

**Q: ¿Por qué debería automatizar la renovación de certificados?**
A: Los certificados TLS expiran. La renovación automatizada previene interrupciones del servicio por certificados vencidos y reduce el trabajo operativo manual.

### Desafío DNS para Certificados Wildcard

```bash
# Certificados wildcard requieren desafío DNS-01
certbot certonly --manual --preferred-challenges dns \
  -d "*.example.com" -d example.com \
  --agree-tos --email admin@example.com

# Para validación DNS automatizada con Cloudflare
pip install certbot-dns-cloudflare
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.example.com" -d example.com
```

```ini
# ~/.secrets/cloudflare.ini
dns_cloudflare_api_token = your-api-token-here
```

### Kubernetes Ingress con cert-manager

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

### Headers de Seguridad y OCSP Stapling

```nginx
# Agregar al server block HTTPS
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # OCSP stapling - handshakes TLS mas rápidos
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Caché de sesiones para rendimiento
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
}
```

### Monitoreo de Expiración de Certificados

```bash
# Verificar expiración del certificado
echo | openssl s_client -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# Alerta con Prometheus blackbox exporter
# Alertar si el certificado expira en 7 días
- alert: SslCertificateExpiringSoon
  expr: probe_ssl_earliest_cert_expiry - time() < 7 * 24 * 3600
  for: 10m
  labels:
    severity: warning
```

## Mejores Prácticas Adicionales

1. **Usa certificados ECC cuando sea posible.** Las llaves ECDSA son más pequeñas y rápidas que RSA:

```bash
# Solicitar un certificado ECDSA
certbot certonly --nginx --key-type ecdsa --elliptic-curve secp256r1 \
  -d example.com
```

2. **Configura HSTS preload.** Envía tu dominio a hstspreload.org después de confirmar que HTTPS funciona en todas partes:

```nginx
# Debe incluir includeSubDomains y preload
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

3. **Usa un servicio de monitoreo de certificados.** Herramientas como SSL Certificate Monitor o Uptime Robot te alertan antes de la expiración:

```bash
# Monitoreo basado en cron
0 8 * * * /usr/local/bin/check-cert-expiry.sh example.com 14 >> /var/log/cert-check.log
```

## Errores Comunes Adicionales

1. **Olvidar recargar el servidor web después de renovar.** Certbot actualiza archivos pero Nginx mantiene certificados viejos en memoria:

```bash
# Usa --deploy-hook para recargar automáticamente
certbot renew --deploy-hook "systemctl reload nginx"
```

2. **No respetar los rate limits de Let's Encrypt.** Hay límites estrictos: 50 certificados por dominio registrado por semana:

```bash
# Usa --staging para testing y evitar rate limits
certbot certonly --staging -d example.com
```

3. **Mezclar contenido HTTP y HTTPS.** Los navegadores bloquean mixed content activo. Asegúrate de que todos los assets usen HTTPS:

```html
<!-- Mal: mixed content bloqueado -->
<script src="http://cdn.example.com/script.js"></script>

<!-- Bien: HTTPS en todas partes -->
<script src="https://cdn.example.com/script.js"></script>
```

## FAQ Adicional

### Como obtengo un certificado wildcard?

Los certificados wildcard (`*.example.com`) cubren todos los subdominios de primer nivel. Requieren desafío DNS-01, no HTTP-01. Usa un plugin DNS como `certbot-dns-cloudflare` o `certbot-dns-route53` para renovación automatizada.

### Cuales son los rate limits de Let's Encrypt?

- 50 certificados por dominio registrado por semana
- 5 certificados duplicados por semana
- 5 validaciones fallidas por hora por cuenta
- 300 nuevas órdenes por 3 horas por cuenta

Usa `--staging` para testing y evitar tocar los rate limits de producción.

### Debo usar TLS 1.3?

Sí. TLS 1.3 es más rápido (handshake 1-RTT vs 2-RTT) y elimina algoritmos inseguros. Todos los navegadores modernos lo soportan. Habilítalo junto con TLS 1.2 para compatibilidad:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

## Tips de Rendimiento

1. **Habilita OCSP stapling.** Los clientes verifican el estado del cert sin contactar a la CA, reduciendo latencia del handshake:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
```

2. **Usa session resumption.** Cachéa sesiones TLS para saltar el handshake completo en clientes recurrentes:

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

3. **Prefiere ECDSA sobre RSA.** Llaves más pequeñas significan handshakes más rápidos y menos uso de CPU:

```bash
certbot certonly --key-type ecdsa --elliptic-curve secp256r1 -d example.com
```
