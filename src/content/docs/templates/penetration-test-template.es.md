---
contentType: docs
slug: penetration-test-template
templateType: guideline
title: "Plantilla de Reporte de Penetration Test"
description: "Plantilla de reporte de penetration test para documentar hallazgos, ratings de riesgo, pasos de reproducción y guía de remediación para evaluaciones de seguridad."
metaDescription: "Plantilla de reporte de penetration test: documenta hallazgos, ratings de riesgo, pasos de reproducción y guía de remediación para evaluaciones de seguridad."
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
  - /docs/templates/security-incident-response-template
  - /docs/templates/bug-report-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de reporte de penetration test: documenta hallazgos, ratings de riesgo, pasos de reproducción y guía de remediación para evaluaciones de seguridad."
  keywords:
    - plantilla reporte penetration test
    - formato reporte pentest
    - template evaluacion seguridad
    - plantilla reporte vulnerabilidad
    - documentacion hallazgos seguridad
---

# Plantilla de Reporte de Penetration Test

Usa esta plantilla para documentar hallazgos de evaluaciones de seguridad de forma clara y accionable. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/security/web-application-security-guide) para prácticas de seguridad más amplias.

## Plantilla

```markdown
# Reporte de Penetration Test

## Resumen Ejecutivo

| Campo | Valor |
|-------|-------|
| **Target** | [aplicación / red / API] |
| **Alcance** | [URLs / IPs in-scope y out-of-scope] |
| **Período de test** | [AAAA-MM-DD a AAAA-MM-DD] |
| **Tester** | [equipo interno / vendor] |
| **Riesgo general** | [Crítico / Alto / Medio / Bajo] |

## Resumen de Riesgo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| Crítico | [N] | [abierto / remediado] |
| Alto | [N] | [abierto / remediado] |
| Medio | [N] | [abierto / remediado] |
| Bajo | [N] | [abierto / remediado] |
| Informativo | [N] | [abierto / remediado] |

## Template de Hallazgo

### [FINDING-001] [Título]

| Campo | Valor |
|-------|-------|
| **Severidad** | [Crítico / Alto / Medio / Bajo / Info] |
| **CVSS** | [score] |
| **Categoría** | [categoría OWASP] |
| **Estado** | [abierto / remediado / riesgo aceptado] |

#### Descripción
Qué es la vulnerabilidad y por qué importa.

#### Recursos Afectados
- URL: `https://example.com/api/v1/users`
- Parámetro: `id`
- Componente: User controller

#### Proof of Concept
```bash
curl "https://example.com/api/v1/users?id=1 OR 1=1"
# Retorna todos los usuarios — SQL injection confirmado
```

#### Impacto
Qué podría hacer un atacante con esta vulnerabilidad.

#### Remediación
Pasos específicos para arreglar. Incluye ejemplos de código si aplica.

#### Referencias
- OWASP: [link]
- CVE: [si aplica]
```

## Trackeo de Remediación

| ID | Hallazgo | Owner | Fecha Límite | Estado |
|----|----------|-------|-------------|--------|
| 001 | SQL Injection | Backend team | +7 días | En progreso |
| 002 | XSS | Frontend team | +14 días | Abierto |

## Matriz de Rating de Riesgo

| Probabilidad \ Impacto | Bajo | Medio | Alto |
|------------------------|------|-------|------|
| Alta | Medio | Alto | Crítico |
| Media | Bajo | Medio | Alto |
| Baja | Info | Bajo | Medio |
```

## Lo que funciona

- **Incluye proof of concept** — sin pasos de reproducción, los devs no pueden arreglarlo
- **Ratea riesgo en contexto de negocio** — un bug teóricamente crítico en una página admin interna-only puede ser riesgo medio
- **Provee remediación a nivel de código** — "fix the injection" no es suficiente; muestra sintaxis de query parametrizada. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/security/web-application-security-guide) para ejemplos de código.
- **Trackea remediación como un sprint** — asigna owners y fechas límite

## Errores Comunes

- Hallazgos vagos — "la app tiene XSS" sin URL o parámetro
- Sin screenshots o PoC — los devs pierden tiempo reproduciendo
- Fecha de retest faltante — remediación sin verificación está incompleta. Traquea seguimientos con la [Plantilla de Respuesta a Incidentes de Seguridad](/docs/templates/security-incident-response-template).
- Scoring solo por CVSS — el contexto de negocio importa más que la fórmula

## Preguntas Frecuentes

### ¿Cómo priorizo hallazgos cuando todo parece crítico?

Usa la matriz de riesgo: probabilidad × impacto. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/security/web-application-security-guide) para contexto de threat modeling. Una SQL injection en un form de login público es crítica. El mismo bug en un reporte interno read-only puede ser medio. Considera explotabilidad y sensibilidad de datos.

### ¿Cada hallazgo debería ser arreglado?

No. Algunos riesgos pueden ser aceptados si el costo de arreglar excede el impacto y existen controles compensatorios. Documenta riesgos aceptados con sign-off ejecutivo y fechas de revisión.

### ¿Quién debería recibir el reporte completo?

Equipo de seguridad, leads de ingeniería, y liderazgo ejecutivo (solo resumen ejecutivo). Comparte hallazgos detallados on a need-to-know basis para prevenir weaponización.
