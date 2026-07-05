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
  - vulnerabilities
  - encryption
  - owasp
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

## Resumen

Cada dependencia de terceros es un pasivo de seguridad y mantenimiento. Las dependencias vienen con sus propios bugs, vulnerabilidades y restricciones de licenciamiento. Sin un proceso de auditoría estructurado, los equipos acumulan librerías que no están mantenidas, son vulnerables o son legalmente incompatibles con su producto.

Esta plantilla cubre:

1. **Seguridad** — CVEs conocidos, cobertura SAST, firma de releases
2. **Salud de mantenimiento** — cadencia de releases, cantidad de contribuidores, bus factor
3. **Riesgo de supply chain** — dependencias transitivas, código nativo, backing corporativo
4. **Cumplimiento de licencias** — identificadores SPDX, detección de copyleft
5. **Decisión** — aprobado, aprobado con monitoreo, o rechazado

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

## Ejemplo Completo

```markdown
# Auditoría de Dependencia: fast-json-stringify v3.2.0

## Overview
| Campo | Valor |
|-------|-------|
| **Librería** | fast-json-stringify v3.2.0 |
| **Propósito** | Serialización JSON 2x más rápida para respuestas de API |
| **Reemplaza** | JSON.stringify() en hot paths |
| **Auditor** | Jane Doe |
| **Fecha** | 2026-07-15 |

## Seguridad

| Check | Resultado | Evidencia |
|-------|-----------|----------|
| CVEs conocidos | Ninguno | Reporte Snyk 2026-07-15 |
| SAST disponible | Sí | Workflow CodeQL en repo |
| Programa de bug bounty | No | N/A |
| Firmado releases | Sí | Provenance Sigstore |

## Salud de Mantenimiento

| Métrica | Valor | Umbral |
|---------|-------|--------|
| Último release | 2026-06-20 | < 12 meses PASS |
| Issues abiertos | 34 | < 500 PASS |
| PRs abiertos | 5 | < 100 PASS |
| Contribuidores | 18 | > 2 PASS |
| Licencia | MIT | Lista aprobada PASS |

## Riesgo de Supply Chain

| Check | Resultado |
|-------|-----------|
| Download count | 12M/semana (npm) |
| Backing corporativo | Sí — NearForm |
| Dependencias transitivas | 3 |
| Código nativo / binarios compilados | No |

## Decisión

| Resultado | Condiciones |
|-----------|-------------|
| **Aprobado** | Todos los checks pasan. Revisar en próxima auditoría trimestral. |
```

## Cuándo Usar

- **Antes de agregar una nueva dependencia** — audita antes de instalar, no después
- **Revisión trimestral de dependencias** — programa auditorías recurrentes para todas las dependencias
- **Después de un incidente de seguridad** — audita todas las dependencias del ecosistema afectado
- **Antes de un release** — verifica que no se introdujeron nuevas vulnerabilidades
- **Durante due diligence** — audita dependencias antes de adquirir o fusionar con otra empresa
- **Cuando una dependencia es deprecada** — audita alternativas antes de migrar

## Lifecycle

### Fase 1: Auditoría pre-adopción

Ejecuta la auditoría completa antes de agregar la dependencia. Verifica seguridad, salud de mantenimiento, riesgo de supply chain y cumplimiento de licencias. Documenta la decisión en un ADR si la dependencia es crítica.

### Fase 2: Monitoreo continuo

Configura alertas automatizadas para nuevas vulnerabilidades. Dependabot, Snyk o GitHub security advisories te notifican cuando se publica un CVE para una dependencia que usas.

### Fase 3: Revisión trimestral

Re-audita todas las dependencias trimestralmente. Verifica si los mantenedores siguen activos, si la librería sigue siendo la mejor opción y si nuevas alternativas ofrecen mejor seguridad o performance.

### Fase 4: Deprecación y reemplazo

Cuando una dependencia es deprecada o surge una mejor alternativa, planifica la migración. Audita el reemplazo, crea un plan de migración y elimina la dependencia vieja del codebase.

## Red Flags

| Flag | Acción |
|------|--------|
| Sin release en 2+ años | Buscar alternativa activamente mantenida |
| Un solo mantenedor | Alto riesgo de bus factor; considerar fork o reemplazo |
| Licencia copyleft (GPL) | Revisión legal requerida para uso comercial |
| Binarios nativos sin builds reproducibles | Riesgo de ataque de supply chain |
| > 100 dependencias transitivas | Cada una es una nueva superficie de ataque |

### Cómo manejo dependencias transitivas con vulnerabilidades?

Usa `npm audit` o `pip-audit` para identificar qué dependencias transitivas tienen vulnerabilidades. Si la dependencia directa no puede actualizar la transitiva, considera reemplazar la dependencia directa o usar un resolution override (campo `overrides` de npm, archivo `constraints` de pip).

### Cuál es la diferencia entre una auditoría de seguridad y una auditoría de dependencias?

Una auditoría de seguridad se enfoca en vulnerabilidades (CVEs, exploits). Una auditoría de dependencias es más amplia: cubre seguridad, salud de mantenimiento, riesgo de supply chain, cumplimiento de licencias y calidad de código. Seguridad es una dimensión de una auditoría completa de dependencias.

### Debería fijar versiones exactas o usar rangos?

Para aplicaciones: fija versiones exactas (`package-lock.json`, `poetry.lock`). Para librerías: usa rangos (`^1.2.0`, `>=1.2,<2.0`). Fijar versiones exactas en aplicaciones asegura builds reproducibles y previene ataques de supply chain vía sustitución de versión.

## Automatización

### Dependabot (GitHub)

Configura `dependabot.yml` para escanear vulnerabilidades y abrir PRs automáticamente:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Snyk

Ejecuta `snyk test` en CI para fallar builds en vulnerabilidades de alta severidad. Usa `snyk monitor` para trackear nuevas vulnerabilidades a lo largo del tiempo.

### OWASP Dependency-Check

Scanner self-hosted que verifica dependencias contra la base de datos NVD. Se integra con Maven, Gradle y Jenkins.

### Renovate Bot

Alternativa a Dependabot con más opciones de configuración: updates agrupados, reglas de auto-merge y soporte multi-ecosystem.

## Lo que funciona

- **Audita antes de agregar** — auditorías retroactivas descubren problemas demasiado tarde
- **Automatiza scanning** — Dependabot, Snyk, o OWASP Dependency-Check en CI. Consulta la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para integrar scans de seguridad.
- **Pinea versiones** — lockfiles previenen upgrades silenciosos a versiones comprometidas
- **Revisa compatibilidad de licencias** — AGPL en backend SaaS es un riesgo legal
- **Trackeá deprecación** — las librerías mueren lentamente; monitorea salud trimestralmente
- **Documenta la decisión** — mantén registros de auditoría junto a ADRs en `docs/audits/`
- **Configura alertas** — suscríbete a advisories de seguridad para dependencias críticas

## Errores Comunes

- Agregar dependencias para funcionalidad trivial — los incidentes tipo "left-pad" ocurren
- Ignorar dependencias transitivas — el árbol de dependencias es tu superficie de ataque
- No actualizar después de la auditoría — un reporte limpio hoy no significa nada en 6 meses
- Confianza ciega en paquetes populares — popularidad no equivale a seguridad
- No verificar compatibilidad de licencias antes de shipped — el riesgo legal aparece en due diligence
- Eliminar lockfiles para "simplificar" — pierdes builds reproducibles y vulnerability pinning

## Variantes

### Auditoría de dependencias frontend

Para proyectos frontend, agrega checks para: impacto en bundle size, tree-shakeability, riesgo de CSS injection y compliance de accesibilidad. Herramientas: Bundlephobia, webpack-bundle-analyzer.

### Auditoría de imagen container

Para imágenes Docker, escanea la imagen base y todos los paquetes instalados. Herramientas: Trivy, Grype, Snyk Container. Verifica usuario root, puertos expuestos y secrets en layers.

### Auditoría de dependencias monorepo

Para monorepos, audita dependencias compartidas across todos los paquetes. Usa lockfiles a nivel workspace. Trackea qué paquetes consumen cada dependencia para evaluar blast radius.

## Preguntas Frecuentes

### ¿Qué tan frecuentemente debería auditar dependencias?

Nuevas dependencias antes de agregar. Dependencias existentes trimestralmente. Dependencias críticas mensualmente. Después de cualquier incidente de seguridad involucrando una dependencia, audita todas las dependencias del mismo ecosistema. Sigue los procedimientos de la [Plantilla de Respuesta a Incidentes de Seguridad](/docs/templates/security-incident-response-template).

### ¿Qué licencia es segura para uso comercial?

MIT, Apache-2.0, y BSD son generalmente seguras. GPL requiere revisión legal si distribuyes el software. AGPL es riesgosa para SaaS. Siempre confirma con tu equipo legal.

### ¿Debería hacer fork de una librería en lugar de usarla directamente?

Haz fork solo si necesitas customización que el upstream no aceptará. Hacer fork traslada la carga de mantenimiento a tu equipo. Preferí contribuir upstream o wrapper la librería.

### ¿Qué es una dependencia transitiva y por qué importa?

Una dependencia transitiva es una librería de la que depende tu dependencia. Si instalas el paquete A, y A depende de B, entonces B es una dependencia transitiva. Las dependencias transitivas son parte de tu superficie de ataque — una vulnerabilidad en B te afecta aunque solo instalaste A. Lockfiles y SBOMs (Software Bill of Materials) ayudan a trackearlas.

### ¿Cómo manejo una vulnerabilidad crítica en una dependencia?

1. Verifica si existe una versión parcheada y actualiza inmediatamente
2. Si no hay parche, busca un workaround o mitigación
3. Si no hay workaround, evalúa reemplazar la dependencia
4. Documenta la decisión en una [Respuesta a Incidente de Seguridad](/docs/templates/security-incident-response-template) si la vulnerabilidad fue explotada

### ¿Debería usar un SBOM (Software Bill of Materials)?

Sí. Un SBOM lista cada componente en tu software, incluyendo dependencias transitivas y sus versiones. Ayuda a trackear vulnerabilidades y responder rápidamente a nuevos CVEs. Herramientas: `cyclonedx`, `spdx-tools`, dependency graph de GitHub.

### ¿Cómo audito dependencias en un monorepo?

Audita a nivel workspace primero, luego por paquete. Usa lockfiles a nivel workspace (`pnpm-lock.yaml`, `poetry.lock` en root). Trackea qué paquetes consumen cada dependencia para evaluar blast radius. Herramientas como `nx` y `turbo` pueden identificar paquetes afectados cuando una dependencia cambia.

### ¿Qué es prevención de ataques de supply chain?

Verifica la proveniencia de dependencias con Sigstore o firmas GPG. Usa `npm ci` en lugar de `npm install` para respetar lockfiles. Pinea dependencias transitivas con `overrides` o `resolutions`. Usa un proxy de registro privado para bloquear paquetes inesperados.

### Puedo usar una dependencia con licencia permisiva en un producto comercial?

MIT, Apache 2.0 y BSD son generalmente seguras para uso comercial. Incluye el texto de la licencia en tu distribución. ISC y Unlicense también son seguras. Siempre verifica con asesoría legal para casos edge. Mantén un registro de todas las licencias aprobadas en tu política de dependencias.

### ¿Con qué frecuencia debería correr scans automatizados de dependencias?

Corre scans en cada pull request vía CI (e.g., Dependabot, Snyk). Programa un audit completo semanal. Para proyectos críticos, corre scans diarios. Revisa y triagea findings semanalmente.
