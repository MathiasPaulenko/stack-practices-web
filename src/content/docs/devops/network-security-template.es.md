---
contentType: docs
slug: network-security-template
title: "Plantilla de Seguridad de Red"
description: "Una plantilla para documentar el inventario de reglas de seguridad de VPC, firewall y DNS."
metaDescription: "Usa esta plantilla de seguridad de red para inventariar reglas de VPC, configuraciones de firewall, ajustes de DNS y controles de acceso a la red."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - network-security
  - vpc
  - firewall
  - dns
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
  metaDescription: "Usa esta plantilla de seguridad de red para inventariar reglas de VPC, configuraciones de firewall, ajustes de DNS y controles de acceso a la red."
  keywords:
    - devops
    - seguridad-de-red
    - vpc
    - firewall
    - dns
    - plantilla
---
## Visión General

Tu red es el perímetro. Reglas de firewall mal configuradas, security groups demasiado permisivos y registros DNS obsoletos son puntos de entrada comunes para atacantes. Esta plantilla inventaría tus controles de seguridad de red para que puedas auditarlos, rastrear cambios y demostrar cumplimiento durante una revisión de seguridad.

## Cuándo Usar

Usa este recurso cuando:
- Onboardees un nuevo servicio que requiere reglas de acceso a la red
- Realices una auditoría de seguridad trimestral o preparación para prueba de penetración
- Migres infraestructura a un nuevo VPC o proveedor de nube

## Solución

```markdown
# Inventario de Seguridad de Red: `<Entorno>`

## 1. Alcance

| Campo | Valor |
|-------|-------|
| Entorno | `prod / staging / dev` |
| Proveedor de Nube | `AWS / GCP / Azure / On-prem` |
| CIDR de Red | `10.0.0.0/16` |
| Última Revisión | `YYYY-MM-DD` |
| Revisor | `@security-team` |

## 2. Segmentación de VPC / Red

| Segmento | CIDR | Propósito | Acceso a Internet | Peering |
|----------|------|-----------|-------------------|---------|
| Subnet pública | `10.0.1.0/24` | Load balancers, bastion | Sí (solo egress) | Ninguno |
| Subnet de aplicación | `10.0.2.0/24` | Microservicios | No | Peered a shared services |
| Subnet de base de datos | `10.0.3.0/24` | PostgreSQL, Redis | No | Peered a shared services |
| Subnet de administración | `10.0.4.0/24` | CI/CD runners, monitoreo | Sí (NAT) | Ninguno |
| Servicios compartidos | `10.1.0.0/24` | SSO, logging, secretos | No | Peered a todos los VPCs |

## 3. Reglas de Firewall / Security Groups

### 3.1. Reglas de Entrada

| Origen | Protocolo | Puerto | Destino | Justificación | Última Revisión |
|--------|-----------|--------|---------|---------------|---------------|
| `0.0.0.0/0` | TCP | 443 | ALB público | HTTPS público | `YYYY-MM-DD` |
| `10.0.2.0/24` | TCP | 5432 | Subnet de base de datos | Aplicación → DB | `YYYY-MM-DD` |
| `10.0.4.0/24` | TCP | 22 | Bastion host | Acceso admin | `YYYY-MM-DD` |
| `CIDR VPN` | TCP | 3389 | Windows jump host | Acceso admin | `YYYY-MM-DD` |

### 3.2. Reglas de Salida

| Destino | Protocolo | Puerto | Origen | Justificación | Última Revisión |
|---------|-----------|--------|--------|---------------|---------------|
| `0.0.0.0/0` | TCP | 443 | Todas las subnets | Actualizaciones de software, APIs | `YYYY-MM-DD` |
| `0.0.0.0/0` | TCP | 53 | Todas las subnets | Resolución DNS | `YYYY-MM-DD` |
| `0.0.0.0/0` | UDP | 53 | Todas las subnets | Resolución DNS | `YYYY-MM-DD` |
| `Rango IP SaaS` | TCP | 443 | Subnet de aplicación | API de terceros | `YYYY-MM-DD` |

## 4. Configuración de DNS

| Registro | Tipo | Valor | TTL | Propósito | Seguro |
|----------|------|-------|-----|-----------|--------|
| `api.example.com` | A | IP ALB | 60s | API pública | DNSSEC habilitado |
| `internal.example.com` | A | IP privada | 300s | Servicios internos | Solo zona privada |
| `cdn.example.com` | CNAME | `cdn.provider.com` | 300s | Entrega de assets | HTTPS forzado |

## 5. Controles de Acceso a la Red

| Control | Implementación | Alcance | Estado |
|---------|----------------|---------|--------|
| Protección DDoS | AWS Shield / Cloud Armor / Azure DDoS | Endpoints públicos | Activo |
| WAF | AWS WAF / Cloudflare / ModSecurity | Endpoints públicos | Activo |
| Detección de intrusiones | Suricata / GuardDuty / Azure Sentinel | Flow logs de VPC | Activo |
| VPN / Zero Trust | WireGuard / Zscaler / BeyondCorp | Todo acceso admin | Activo |
| Endpoints privados | VPC endpoints / PrivateLink / Private Link | Servicios AWS / Azure | Activo |

## 6. Registro de Cambios

| Fecha | Cambio | Solicitante | Aprobado Por | Ticket |
|-------|--------|-------------|--------------|--------|
| `YYYY-MM-DD` | Abrir puerto 5432 para nuevo servicio de analytics | `data-team` | `security-team` | `SEC-123` |
| `YYYY-MM-DD` | Eliminar SSH de subnet pública | `sre-team` | `security-team` | `SEC-124` |
```

## Explicación

La plantilla trata tu red como un **sistema de defensa en profundidad**. La segmentación asegura que si una subnet es comprometida, el atacante no puede moverse lateralmente hacia la base de datos. Cada regla requiere una **justificación** y una **fecha de última revisión**, para que reglas obsoletas no persistan indefinidamente. Los registros DNS son frecuentemente pasados por alto en revisiones de seguridad, pero DNS secuestrado o obsoleto puede redirigir tráfico a infraestructura controlada por atacantes.

## Variantes

| Entorno | Enfoque | Notas |
|---------|---------|-------|
| AWS | VPC + Security Groups + NACLs | Usa NACLs para reglas a nivel de subnet, SGs para nivel de instancia |
| GCP | VPC Firewall Rules + Cloud Armor | Las reglas de firewall son stateful; usa service accounts para identidad |
| Azure | NSGs + Azure Firewall | Los NSGs aplican a subnets o NICs; Azure Firewall para logging central |
| Kubernetes | Network Policies + Cilium / Calico | Enforce aislamiento de namespaces; default-deny es más seguro |
| Híbrido / On-prem | Firewall físico + SD-WAN | Documenta tanto rutas lógicas como físicas |

## Lo que funciona

1. Denegar todo por defecto; whitelista solo lo requerido con justificación documentada
2. Revisa reglas de firewall trimestralmente; elimina reglas que ya no tienen justificación válida
3. No uses `0.0.0.0/0` para entrada excepto a un load balancer que termina TLS
4. Habilita flow logs de VPC y reténlos por al menos 90 días para análisis forense
5. Usa endpoints privados para servicios de nube en lugar de enrutar tráfico por internet público

## Errores Comunes

1. Permitir SSH o RDP desde `0.0.0.0/0` en lugar de solo desde bastion o VPN
2. Reusar el mismo security group en producción y staging, difuminando límites
3. Olvidar eliminar reglas temporales agregadas durante un incidente o sesión de debugging
4. No monitorear flow logs de VPC, perdiendo movimiento lateral durante una brecha
5. Hardcodear direcciones IP en DNS en lugar de usar CNAMEs a load balancers

## Preguntas Frecuentes

### ¿Cómo audito security groups existentes rápidamente?

Usa `aws ec2 describe-security-groups` (o equivalente) y exporta a CSV. Ordena por reglas de entrada con `0.0.0.0/0`. Cruza cada regla con tickets de cambio. Si una regla no tiene justificación o no ha sido revisada en más de un año, márcala para eliminación y notifica al equipo propietario.

### ¿Debería usar Network ACLs o Security Groups?

Ambos. Los **security groups** son stateful y aplican a instancias; son tu control primario. Los **NACLs** son stateless y aplican a subnets; úsalos como defensa de respaldo de grano grueso. Por ejemplo, un NACL puede bloquear un puerto completamente a nivel de subnet incluso si un security group lo permite por error.

### ¿Cómo aseguro registros DNS?

Habilita DNSSEC para zonas públicas para prevenir envenenamiento de caché. Usa TTLs cortos (60–300s) para registros que pueden necesitar cambios rápidos. Monitorea cambios no autorizados de registros con logs de auditoría del proveedor DNS. Para DNS interno, restringe transferencias de zona a servidores autorizados y usa zonas privadas solo accesibles dentro del VPC.
