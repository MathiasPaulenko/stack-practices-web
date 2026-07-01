---
contentType: docs
slug: dependency-audit-template
templateType: guideline
title: "Plantilla de Auditoría de Dependencias de Terceros"
description: "Plantilla para auditar dependencias de terceros: cumplimiento de licencias, vulnerabilidades de seguridad, salud de mantenimiento y riesgo de supply chain."
metaDescription: "Plantilla de auditoría de dependencias: evalúa librerías de terceros para cumplimiento de licencias, vulnerabilidades, salud de mantenimiento y riesgo de supply chain."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - template
relatedResources:
  - /guides/security/web-application-security-guide
  - /guides/devops/cicd-pipeline-guide
  - /docs/templates/security-incident-response-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de auditoría de dependencias: evalúa librerías de terceros para cumplimiento de licencias, vulnerabilidades, salud de mantenimiento y riesgo de supply chain."
  keywords:
    - plantilla auditoria dependencias
    - auditoria librerias terceros
    - seguridad supply chain
    - cumplimiento licencias
    - evaluacion vulnerabilidades dependencias
---

# Plantilla de Auditoría de Dependencias de Terceros

Usa esta plantilla para evaluar librerías antes de agregarlas o durante auditorías periódicas. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/security/web-application-security-guide) para prácticas de seguridad más amplias.

## Plantilla

```markdown
# Auditoría de Dependencia: [Nombre de Librería]

## Overview
| Campo | Valor |
|-------|-------|
| **Librería** | [nombre] v[x.y.z] |
| **Propósito** | [qué problema resuelve] |
| **Reemplaza** | [código interno / otra librería] |
| **Auditor** | [nombre] |
| **Fecha** | [AAAA-MM-DD] |

## Seguridad

| Check | Resultado | Evidencia |
|-------|-----------|----------|
| CVEs conocidos | [ninguno / lista] | Link a reporte Snyk / OSV |
| SAST disponible | [sí / no] | Link a auditoría de seguridad |
| Programa de bug bounty | [sí / no] | Link |
| Firmado releases | [sí / no] | Verificación GPG / Sigstore |

## Salud de Mantenimiento

| Métrica | Valor | Umbral |
|---------|-------|--------|
| Último release | [fecha] | < 12 meses |
| Issues abiertos | [cantidad] | < 500 |
| PRs abiertos | [cantidad] | < 100 |
| Contribuidores | [cantidad] | > 2 (bus factor) |
| Licencia | [identificador SPDX] | [lista aprobada] |

## Riesgo de Supply Chain

| Check | Resultado |
|-------|-----------|
| Download count | [stats npm / PyPI] |
| Backing corporativo | [sí / no — quién] |
| Dependencias transitivas | [cantidad] |
| Código nativo / binarios compilados | [sí / no] |

## Decisión

| Resultado | Condiciones |
|-----------|-------------|
| **Aprobado** | Todos los checks pasan |
| **Aprobado con monitoreo** | Riesgos menores, trackear trimestralmente |
| **Rechazado** | Riesgo crítico, buscar alternativa |
```

## Red Flags

| Flag | Acción |
|------|--------|
| Sin release en 2+ años | Buscar alternativa activamente mantenida |
| Un solo mantenedor | Alto riesgo de bus factor; considerar fork o reemplazo |
| Licencia copyleft (GPL) | Revisión legal requerida para uso comercial |
| Binarios nativos sin builds reproducibles | Riesgo de ataque de supply chain |
| > 100 dependencias transitivas | Cada una es una nueva superficie de ataque |

## Lo que funciona

- **Audita antes de agregar** — auditorías retroactivas descubren problemas demasiado tarde
- **Automatiza scanning** — Dependabot, Snyk, o OWASP Dependency-Check en CI. Consulta la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para integrar scans de seguridad.
- **Pinea versiones** — lockfiles previenen upgrades silenciosos a versiones comprometidas
- **Revisa compatibilidad de licencias** — AGPL en backend SaaS es un riesgo legal
- **Trackeá deprecación** — las librerías mueren lentamente; monitorea salud trimestralmente

## Errores Comunes

- Agregar dependencias para funcionalidad trivial — los incidentes tipo "left-pad" ocurren
- Ignorar dependencias transitivas — el árbol de dependencias es tu superficie de ataque
- No actualizar después de la auditoría — un reporte limpio hoy no significa nada en 6 meses
- Confianza ciega en paquetes populares — popularidad no equivale a seguridad

## Preguntas Frecuentes

### ¿Qué tan frecuentemente debería auditar dependencias?

Nuevas dependencias antes de agregar. Dependencias existentes trimestralmente. Dependencias críticas mensualmente. Después de cualquier incidente de seguridad involucrando una dependencia, audita todas las dependencias del mismo ecosistema. Sigue los procedimientos de la [Plantilla de Respuesta a Incidentes de Seguridad](/docs/templates/security-incident-response-template).

### ¿Qué licencia es segura para uso comercial?

MIT, Apache-2.0, y BSD son generalmente seguras. GPL requiere revisión legal si distribuyes el software. AGPL es riesgosa para SaaS. Siempre confirma con tu equipo legal.

### ¿Debería hacer fork de una librería en lugar de usarla directamente?

Haz fork solo si necesitas customización que el upstream no aceptará. Hacer fork traslada la carga de mantenimiento a tu equipo. Preferí contribuir upstream o wrapper la librería.
