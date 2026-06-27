---
contentType: docs
slug: ssl-certificate-management-template
title: "Plantilla de Gestion de Certificados SSL"
description: "Una plantilla para rastrear el inventario, renovaciones, despliegues y riesgos de vencimiento de certificados TLS/SSL en dominios y servicios."
metaDescription: "Gestiona certificados SSL/TLS con esta plantilla. Cubre inventario, renovaciones, despliegues, monitoreo de vencimiento y respuesta a incidentes."
difficulty: beginner
topics:
  - security
  - infrastructure
tags:
  - ssl
  - tls
  - certificates
  - security
  - automation
relatedResources:
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/devops/cloud-resource-tagging-policy-template
  - /docs/devops/runbook-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Gestiona certificados SSL/TLS con esta plantilla. Cubre inventario, renovaciones, despliegues, monitoreo de vencimiento y respuesta a incidentes."
  keywords:
    - gestion de certificados SSL
    - renovacion de certificados TLS
    - inventario de certificados
    - monitoreo de vencimiento de certificados
    - despliegue de certificados
---

## Descripcion General

Los certificados SSL/TLS protegen los datos en transito al cifrar el trafico entre clientes y servidores. Certificados vencidos, mal configurados u olvidados pueden causar interrupciones, advertencias de seguridad y perdida de confianza del cliente. Esta plantilla proporciona un proceso para rastrear el inventario de certificados, planificar renovaciones, desplegar certificados y responder a incidentes relacionados con certificados.

## Cuando Usar

- Configurar un nuevo dominio o servicio publico.
- Migrar de una autoridad certificadora a otra.
- Prepararse para una auditoria de seguridad o higiene de infraestructura.
- Despues de que un certificado vencido causo una interrupcion o advertencia.
- Automatizar la gestion del ciclo de vida de certificados con herramientas como Let's Encrypt, Certbot o un servicio de certificados gestionados.

## Prerequisitos

- Lista de dominios, subdominios y servicios que usan certificados TLS.
- Autoridad certificadora (CA) o proveedor de certificados gestionados como Let's Encrypt, DigiCert o AWS ACM.
- Proceso de despliegue para actualizar certificados en load balancers, servidores web, CDNs y contenedores.
- Sistema de monitoreo para alertar sobre vencimiento de certificados.
- Propiedad de los equipos de seguridad, plataforma y aplicacion.

## Solucion

### Plantilla

#### 1. Inventario de Certificados

| Dominio / Servicio | Tipo de Certificado | Proveedor | Fecha de Vencimiento | Renovacion Automatica | Dueno | Notas |
|--------------------|---------------------|-----------|----------------------|-----------------------|-------|-------|
| `example.com` | Wildcard | Let's Encrypt | 2026-09-15 | Si | Equipo de plataforma | Usado en CDN |
| `api.example.com` | Estandar | DigiCert | 2026-12-01 | No | Equipo API | Renovacion manual |
| `app.example.com` | Gestionado | AWS ACM | Auto | Si | Equipo de plataforma | Adjunto a ELB |
| `internal.example.com` | Auto-firmado | CA interna | 2027-01-10 | No | Equipo IT | Herramientas internas |
| `cdn.example.com` | Estandar | Cloudflare | Auto | Si | Equipo de plataforma | Certificado edge |

#### 2. Etapas del Ciclo de Vida del Certificado

| Etapa | Actividades | Dueno | Momento |
|-------|-------------|-------|---------|
| Solicitud | Identificar dominio, validar propiedad, elegir CA | Equipo de aplicacion o plataforma | Al aprovisionar |
| Aprobacion | Revision de seguridad, aprobacion de presupuesto, seleccion de CA | Seguridad / finanzas | Antes de la compra |
| Emision | Generar CSR, enviar solicitud, descargar certificado | Equipo de plataforma | Mismo dia |
| Despliegue | Instalar certificado en todos los endpoints y probar | Equipo de plataforma | Mismo dia |
| Renovacion | Solicitar nuevo certificado antes del vencimiento | Equipo de plataforma | 30 dias antes del vencimiento |
| Revocacion | Revocar certificado comprometido y reemplazar | Equipo de seguridad | Inmediato |
| Retiro | Eliminar certificado antiguo del inventario y sistemas | Equipo de plataforma | Despues del reemplazo |

#### 3. Flujo de Trabajo de Renovacion

| Paso | Accion | Dueno | Momento |
|------|--------|-------|---------|
| 1 | Revisar inventario de certificados que vencen en 30, 14 y 7 dias | Equipo de plataforma | Diario |
| 2 | Generar o renovar certificado con la CA | Equipo de plataforma | 30 dias antes del vencimiento |
| 3 | Validar cadena de certificados y probar en staging | Equipo de plataforma | Antes del despliegue |
| 4 | Desplegar certificado en endpoints de produccion | Equipo de plataforma | Durante ventana de mantenimiento |
| 5 | Verificar endpoint de produccion usando verificadores SSL | Equipo de plataforma | Despues del despliegue |
| 6 | Actualizar inventario y log de renovacion | Equipo de plataforma | Mismo dia |
| 7 | Cerrar ticket de renovacion | Equipo de plataforma | Mismo dia |

#### 4. Calendario de Alertas de Vencimiento

| Dias para Vencimiento | Canal de Alerta | Accion |
|-----------------------|-------------------|--------|
| 60 dias | Correo al dueno | Planificar renovacion |
| 30 dias | Slack o correo al equipo | Iniciar proceso de renovacion |
| 14 dias | Pagina al guardia si no se renovo | Escalar renovacion |
| 7 dias | Pagina al gerente y lider de seguridad | Renovacion de emergencia o workaround |
| 1 dia | Pagina ejecutivo + respuesta a incidentes | Tratar como incidente |

#### 5. Checklist de Despliegue

- [ ] El certificado y la clave privada se almacenan de forma segura en un vault o gestor de certificados.
- [ ] La cadena completa de certificados se incluye durante el despliegue.
- [ ] El certificado se despliega en todos los endpoints: load balancers, servidores web, CDNs y proxies.
- [ ] El certificado se prueba con herramientas como SSL Labs, OpenSSL o `curl`.
- [ ] El certificado anterior se elimina de la configuracion despues del despliegue.
- [ ] El inventario se actualiza con la nueva fecha de vencimiento, numero de serie y fecha de despliegue.
- [ ] Las alertas de monitoreo reflejan el nuevo certificado.

#### 6. Respuesta a Incidentes de Certificados

| Escenario | Respuesta | Dueno |
|-----------|-----------|-------|
| Certificado vencido en produccion | Renovar de emergencia o hacer rollback al certificado valido anterior | Equipo de plataforma + guardia |
| Certificado mal configurado | Re-desplegar cadena correcta y probar todos los endpoints | Equipo de plataforma |
| Certificado comprometido | Revocar, reemplazar e investigar exposicion | Equipo de seguridad |
| Falla de validacion de dominio | Re-verificar DNS o validacion HTTP y reintentar | Equipo de plataforma |
| Falla de renovacion automatica | Cambiar a renovacion manual y reparar la causa raiz de la automatizacion | Equipo de plataforma |

## Explicacion

La gestion de certificados es una tarea operativa repetitiva que se vuelve riesgosa a escala. La plantilla centraliza el inventario, las fechas de renovacion y los procedimientos de despliegue para que los certificados no expiren inesperadamente. Tambien vincula la salud de los certificados con monitoreo y respuesta a incidentes, haciendo que los problemas de certificados sean mas faciles de detectar y resolver rapidamente.

## Variantes

- **Automatizacion con Let's Encrypt**: Usa Certbot, acme.sh o clientes ACME con renovacion y despliegue automatizados.
- **Servicio de certificados gestionados**: Usa AWS ACM, Azure Key Vault o Cloudflare SSL para certificados totalmente gestionados.
- **Flujo de CA empresarial**: Usa autoridades certificadoras internas con flujos de aprobacion y validacion de dominio.
- **Gestion de certificados multi-cloud**: Centraliza certificados entre proveedores usando un vault o gestor de certificados.
- **Gestion de certificados nativa de contenedores**: Usa cert-manager o herramientas similares en Kubernetes.

## Mejores Practicas

- Manten una unica fuente de verdad para todos los certificados y sus duenos.
- Automatiza la renovacion y el despliegue siempre que sea posible.
- Monitorea el vencimiento de certificados con alertas a 60, 30, 14, 7 y 1 dia antes del vencimiento.
- Usa certificados de corta duracion con renovacion automatica para reducir la exposicion.
- Almacena claves privadas y certificados en un vault seguro.
- Prueba los despliegues de certificados en staging antes de produccion.
- Documenta las excepciones para certificados que no pueden renovarse automaticamente.
- Incluye verificaciones de certificados en revisiones de gestion de cambios y auditorias.

## Errores Comunes

- Depender del seguimiento manual en hojas de calculo sin monitoreo.
- Olvidar desplegar la cadena de certificados intermedios.
- Perder certificados en endpoints secundarios como CDNs o load balancers.
- No actualizar el monitoreo despues de la renovacion de un certificado.
- Dejar certificados vencidos en archivos de configuracion.
- Usar certificados auto-firmados para servicios publicos.
- No revocar certificados despues de una compromiso.

## FAQs

### Cual es la diferencia entre SSL y TLS?

SSL es el protocolo mas antiguo. TLS es el sucesor moderno y seguro. El termino "certificado SSL" sigue usandose comúnmente, pero los certificados actuales soportan TLS 1.2 o TLS 1.3.

### Deberiamos usar certificados wildcard o certificados separados por subdominio?

Los wildcards son convenientes para muchos subdominios pero comparten una sola clave privada. Los certificados separados reducen el radio de explosion y soportan diferentes ciclos de renovacion. Elige segun las necesidades de seguridad y complejidad operativa.

### Como prevenimos interrupciones por vencimiento de certificados?

Usa renovacion automatica con alertas de monitoreo, manten un inventario preciso y prueba los despliegues. Trata los certificados que vencen en 7 dias como incidentes.
