---



contentType: docs
slug: ssl-certificate-renewal-template
title: "Plantilla de Renovación de Certificados SSL"
description: "Plantilla para rastrear la caducidad de certificados SSL y los flujos de trabajo de renovación."
metaDescription: "Usa esta plantilla de renovación de certificados SSL para rastrear fechas de caducidad, flujos de renovación y verificaciones de validación antes de que expiren."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - ssl
  - certificate
  - tls
  - security
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/cross-region-failover-template
  - /docs/deployment-checklist-template
  - /recipes/setup-ssl-certificates
  - /docs/patch-management-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de renovación de certificados SSL para rastrear fechas de caducidad, flujos de renovación y verificaciones de validación antes de que expiren."
  keywords:
    - devops
    - ssl
    - certificado
    - tls
    - seguridad
    - plantilla



---
## Visión General

Los certificados SSL/TLS expiran. Cuando lo hacen, los navegadores bloquean tu sitio, las APIs fallan y los usuarios ven advertencias de seguridad alarmantes. La mayoría de los equipos descubren un certificado vencido cuando un cliente se queja. Esta plantilla crea un flujo de trabajo de renovación repetible con seguimiento, verificaciones de validación y pasos de reversión para que nunca vuelvas a perder una fecha de caducidad.

## Cuándo Usar

Usa este recurso cuando:
- Gestionas múltiples dominios, subdominios o certificados comodín en varios entornos
- Tu equipo ha perdido una fecha de caducidad de certificado en el pasado
- Estás migrando de la renovación manual a la gestión automatizada de certificados

## Solución

```markdown
# Seguimiento de Renovación de Certificados SSL: `<Dominio>`

## 1. Inventario de Certificados

| Dominio / Subdominio | Proveedor | Tipo | Caducidad | Auto-Renovación | Responsable | Última Verificación |
|----------------------|-----------|------|-----------|-----------------|-------------|-------------------|
| `example.com` | Let's Encrypt | DV | `AAAA-MM-DD` | Sí | `@sre-team` | `AAAA-MM-DD` |
| `*.api.example.com` | DigiCert | Comodín OV | `AAAA-MM-DD` | No | `@platform-team` | `AAAA-MM-DD` |
| `internal.example.com` | CA Interna | Empresarial | `AAAA-MM-DD` | N/D | `@it-team` | `AAAA-MM-DD` |

## 2. Cronograma de Renovación

| Fase | Disparador | Acción | Responsable | Fecha Límite |
|------|------------|--------|-------------|--------------|
| Alerta | 30 días antes de caducar | Crear ticket de renovación | `@sre-team` | — |
| Preparación | 14 días antes de caducar | Verificar control DNS + generar CSR | `@sre-team` | — |
| Solicitud | 10 días antes de caducar | Enviar solicitud de certificado | `@sre-team` | — |
| Instalación | 7 días antes de caducar | Desplegar en balanceadores / CDN | `@sre-team` | — |
| Validación | 5 días antes de caducar | Ejecutar verificaciones de validación | `@sre-team` | — |
| Monitoreo | 48 horas después de instalar | Observar errores de contenido mixto o handshake | `@on-call` | — |

## 3. Lista de Verificación de Validación

- [ ] La cadena de certificados está completa (hoja + intermedios + raíz)
- [ ] El nombre de dominio coincide exactamente (sin omisiones de SAN)
- [ ] La fecha de caducidad supera la ventana de renovación esperada
- [ ] El handshake TLS 1.2+ tiene éxito desde un sondeo externo
- [ ] El respondedor OCSP es accesible y devuelve estado válido
- [ ] No hay advertencias de contenido mixto en las páginas principales
- [ ] Las aplicaciones móviles e integraciones de terceros aceptan el nuevo certificado
- [ ] El certificado anterior fue revocado (si aplica) después de la validación

## 4. Plan de Reversión

| Condición | Acción de Reversión | Tiempo para Completar |
|-----------|--------------------|-----------------------|
| El nuevo certificado causa fallos de handshake | Re-desplegar el certificado anterior desde la copia de seguridad | 5 minutos |
| Cadena incompleta | Re-empaquetar con la CA intermedia correcta | 10 minutos |
| SAN faltante | Re-emitir con el CSR corregido | 2–24 horas (depende del proveedor) |

## 5. Notas de Automatización

| Herramienta | Método de Renovación | Validación | Destino de Despliegue |
|-------------|---------------------|------------|-----------------------|
| certbot | Desafío ACME | HTTP-01 / DNS-01 | Servidor web local |
| cert-manager (Kubernetes) | ACME / Vault | DNS-01 / HTTP-01 | Secreto de Kubernetes → Ingress |
| AWS ACM | Gestionado | Validación DNS | ALB / CloudFront |
| Azure Key Vault | Gestionado / importado | DNS / correo | Application Gateway / CDN |
```

## Explicación

La plantilla separa el **inventario** (qué certificados tienes) del **flujo de trabajo** (cómo los renuevas). El inventario evita que se olviden certificados en servicios perimetrales (CDNs, APIs internas, puertas de enlace móviles). El flujo de trabajo impone un margen: si algo sale mal durante la renovación, tienes días para corregirlo antes de la caducidad. La lista de verificación de validación detecta los problemas post-despliegue más comunes—certificados intermedios faltantes y SANs incompletos—antes de que los usuarios lo hagan.

## Variantes

| Entorno | Fuente de Certificado | Estrategia de Renovación | Notas |
|---------|----------------------|--------------------------|-------|
| Web pública | Let's Encrypt (ACME) | Ciclo automatizado de 60 días con certbot o cert-manager | Gratuito, vida corta (90 días) |
| SaaS empresarial | DigiCert / Sectigo | Compra anual con aprobación manual para OV/EV | Mayor validez, mayor confianza |
| Servicios internos | PKI interna / Vault | Renovación automática mediante el motor PKI de Vault | Control total, requiere distribución de confianza |
| IoT / embebidos | Certificados con atestación de dispositivo | Aprovisionamiento de fábrica + actualizaciones OTA | Opciones de validación limitadas |

## Lo que funciona

1. Configura alertas de calendario a 30, 14 y 7 días antes de la caducidad—incluso para certificados con "renovación automática"
2. Almacena las copias de seguridad de certificados (clave privada + cadena) en un gestor de secretos, no en la laptop de un solo ingeniero
3. Prueba el proceso de renovación en staging antes de producción; los desafíos ACME pueden fallar por cambios en DNS o firewall
4. Usa certificados comodín con moderación; reducen la carga de gestión pero aumentan el radio de impacto si se comprometen
5. Documenta el comando o pipeline exacto usado para la renovación para que cualquier persona de guardia pueda ejecutarlo

## Errores Comunes

1. Confiar en la renovación automática sin monitorear si realmente tuvo éxito
2. Olvidar actualizar el certificado en el CDN o WAF después de renovarlo en el servidor de origen
3. Faltar certificados intermedios en el paquete, causando errores de "no confiable" en algunos clientes
4. No incluir todos los SANs requeridos en el CSR (por ejemplo, `www.` y dominio raíz)
5. Dejar que el certificado anterior caduque antes de validar el nuevo en todos los puntos de acceso

## Preguntas Frecuentes

### ¿Cómo manejo certificados comodín?

Los certificados comodín (`*.example.com`) cubren todos los subdominios pero no pueden cubrir el dominio raíz (`example.com`) a menos que se incluya explícitamente como SAN. Para la renovación comodín con ACME, debes usar la validación DNS-01, que requiere acceso API a tu proveedor DNS. Mantén el alcance del comodín estrecho: no uses un solo comodín para producción y staging.

### ¿Cuál es la diferencia entre certificados DV, OV y EV?

**DV (Validación de Dominio)** demuestra que controlas el dominio. **OV (Validación de Organización)** agrega la identidad verificada de la empresa. **EV (Validación Extendida)** muestra el nombre de la empresa en la barra del navegador y requiere la auditoría más rigurosa. Para la mayoría de las APIs y servicios internos, DV es suficiente. Un SaaS orientado al cliente puede beneficiarse de OV para la confianza de la marca.

### ¿Debo usar un certificado gestionado por CDN o traer el mío propio?

Los certificados gestionados por CDN (AWS ACM, Cloudflare Origin CA) simplifican el despliegue y la renovación automática, pero te atan a ese proveedor. Los certificados propios ofrecen portabilidad pero requieren que tú manejes la renovación y el despliegue. Para arquitecturas multi-nube, usa un gestor de secretos centralizado (HashiCorp Vault, AWS Secrets Manager) e impulsa los certificados a cada borde durante el despliegue.

## Soluciones Avanzadas

### cert-manager para Kubernetes con Let's Encrypt

Automatiza la emisión y renovación de certificados en Kubernetes usando cert-manager con desafío DNS-01:

```yaml
# Instalar CRDs de cert-manager y configurar ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@company.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - dns01:
          cloudflare:
            email: platform-team@company.com
            apiKeySecretRef:
              name: cloudflare-api-key
              key: api-key
---
# Emitir un certificado para el ingress
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
  namespace: production
spec:
  secretName: api-tls-secret
  duration: 2160h    # 90 dias
  renewBefore: 360h  # Renovar 15 dias antes de caducar
  dnsNames:
    - api.example.com
    - "*.api.example.com"
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
---
# Referenciar en Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret
```

### Motor PKI de HashiCorp Vault para certificados internos

Configura una CA privada usando el motor PKI de Vault para servicios internos:

```bash
# Habilitar motor PKI
vault secrets enable -path=pki pki

# Configurar duracion maxima de lease
vault secrets tune -max-lease-ttl=87600h pki

# Generar CA raiz
vault write pki/root/generate/internal \
    common_name="Internal CA" \
    ttl=87600h

# Configurar URLs para CRL y emision
vault write pki/config/urls \
    issuing_certificates="https://vault.internal:8200/v1/pki/ca" \
    crl_distribution_points="https://vault.internal:8200/v1/pki/crl"

# Crear un role para emitir certificados
vault write pki/roles/internal-service \
    allowed_domains="internal.company.com" \
    allow_subdomains=true \
    max_ttl="720h" \
    key_type="rsa" \
    key_bits=2048

# Emitir un certificado
vault write pki/issue/internal-service \
    common_name="api.internal.company.com" \
    ttl="24h"
```

### Script de monitoreo de expiracion de certificados

Un script bash para verificar todos los certificados en un cluster de Kubernetes y alertar sobre expiraciones proximas:

```bash
#!/bin/bash
set -euo pipefail

DAYS_THRESHOLD=30
ALERT_EMAIL="platform-team@company.com"

echo "Checking TLS certificates across all namespaces..."

kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] | select(.type=="kubernetes.io/tls") | "\(.metadata.namespace) \(.metadata.name) \(.data."tls.crt")"' | \
  while read -r namespace secret_name cert_b64; do
    cert_pem=$(echo "$cert_b64" | base64 -d)
    expiry_date=$(echo "$cert_pem" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -z "$expiry_date" ]; then
      continue
    fi

    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    now_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_left" -lt "$DAYS_THRESHOLD" ]; then
      echo "WARNING: $namespace/$secret_name expires in $days_left days ($expiry_date)"
    fi
  done
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Setup SSL Certificates with Let's Encrypt](/es/recipes/setup-ssl-certificates/).

1. **Usa monitoreo de transparencia de certificados.** Suscribete a CT logs para tus dominios y detecta emisiones no autorizadas de certificados. Configura alertas cuando se emita un nuevo certificado para un dominio que posees:

```bash
# Verificar CT logs para tu dominio usando curl
curl -s "https://crt.sh/?q=%25.example.com&output=json" | \
  jq '.[] | select(.not_before > "2026-01-01") | {issuer_name, common_name, not_before}'
```

2. **Implementa HSTS preload para dominios de produccion.** Una vez que tienes automatizacion confiable de certificados, habilita HTTP Strict Transport Security para prevenir ataques de downgrade:

```nginx
# configuracion nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

## Errores Comunes Adicionales

1. **Usar TLS 1.0 o 1.1 despues de la renovacion del certificado.** Renovar un certificado no actualiza tu configuracion TLS. Deshabilita explicitamente protocolos antiguos durante la renovacion para evitar fallos de compliance:

```nginx
# Deshabilitar TLS 1.0 y 1.1
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

2. **No actualizar la configuracion de OCSP stapling.** Despues de la renovacion, OCSP stapling puede servir datos stale del certificado viejo. Reinicia el web server o limpia el cache OCSP:

```bash
# Reiniciar nginx para refrescar OCSP stapling
nginx -t && systemctl restart nginx
```

## Preguntas Frecuentes Adicionales

### Como automatizo la renovacion de certificados para multiples dominios?

Usa cert-manager en Kubernetes o un cliente ACME central (certbot, acme.sh) con un cron job. Para entornos no-Kubernetes, certbot con desafio DNS-01 y un plugin de proveedor DNS maneja certificados comodin y multi-dominio automaticamente:

```bash
# renovacion comodin con certbot usando Cloudflare DNS
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.example.com" \
  -d "example.com" \
  --non-interactive \
  --agree-tos \
  --email platform-team@company.com
```

### Que es OCSP stapling y por que importa?

OCSP stapling permite al servidor incluir una respuesta OCSP firmada por la CA en el handshake TLS, de modo que el cliente no necesita contactar al respondedor OCSP de la CA por separado. Esto mejora rendimiento y privacidad. Habilita esta funcion en la configuracion de tu web server y asegurate de que el respondedor OCSP sea accesible durante la renovacion.
