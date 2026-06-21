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

## Mejores Prácticas

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
