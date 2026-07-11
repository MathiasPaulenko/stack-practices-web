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


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Web app | OWASP Top 10 + ASVS | Enfocarse en input validation y auth |
| API REST | OWASP API Security Top 10 | Enfocarse en rate limiting y auth |
| Mobile app | OWASP MASVS | Incluir analisis de APK/IPA |
| Infraestructura cloud | CIS Benchmarks + pentest de red | Incluir IAM y network policies |
| Internal red team | Sin notificacion previa | Simular atacante real |

## Ejemplo de Plan de Pen-Test

```text
=== Plan de Penetration Test: payment-service ===

Objetivo: Evaluar la postura de seguridad del servicio de pagos
Fecha: 2026-08-15 a 2026-08-19
Tester: Security Firm XYZ
Contacto SPOC: alice@company.com

Alcance:
  URLs en alcance:
    - https://api.company.com/payments/*
    - https://api.company.com/orders/*
  URLs fuera de alcance:
    - https://api.company.com/auth/* (testeado en pentest anterior)
    - https://admin.company.com (fuera de alcance este engagement)

  Cuentas de test:
    - test-user-1@company.com (rol: customer)
    - test-user-2@company.com (rol: merchant)
    - test-admin@company.com (rol: admin)

  Datos permitidos:
    - Datos de test sinteticos unicamente
    - No acceder a datos de produccion reales
    - No modificar datos persistentes

Reglas de Engagement:
  - Horario de testing: 09:00-18:00 UTC-5
  - Rate limit: max 100 requests/segundo
  - No usar exploits que causen DoS
  - No usar social engineering
  - No testing fisico
  - Notificar inmediatamente si se encuentra un Critico

Metodologia:
  - OWASP Testing Guide v4.2
  - OWASP API Security Top 10
  - PTES (Penetration Testing Execution Standard)

Entregables:
  - Reporte ejecutivo (para liderazgo)
  - Reporte tecnico (para ingenieria)
  - Hallazgos en formato CSV (para importar al tracker)
  - Presentacion de debrief (sesion de 2 horas)

Cronograma:
  Dia 1: Reconocimiento y mapeo de superficie de ataque
  Dia 2: Testing de autenticacion y autorizacion
  Dia 3: Testing de logica de negocio y pagos
  Dia 4: Testing de infraestructura y configuracion
  Dia 5: Reporte y debrief
```

### Como elegimos una firma de penetration testing?

Evalua firmas por: certificaciones (OSCP, CEH, CISSP), experiencia en tu industria (fintech, healthcare, e-commerce), referencias de clientes anteriores, metodologia (OWASP, PTES), y calidad de reportes anteriores. Pide un reporte de muestra anonimizado — la calidad del reporte es tan importante como la calidad del testing. Verifica que la firma tiene seguro de responsabilidad profesional. Asegura que la firma firma un NDA antes de compartir cualquier informacion. Compara precios pero no elijas solo por precio — un pentest barato puede perder hallazgos criticos. Manten una relacion continua con la firma — los testers que conocen tu sistema encuentran issues mas profundos.

### Como preparamos al equipo para un pen-test?

Notifica al equipo con 2 semanas de anticipacion: fechas, alcance, y SPOC. Asegura que el SPOC tiene disponibilidad dedicada durante el pen-test (no esta on-call para otra cosa). Prepara cuentas de test con datos sinteticos. Prepara acceso a staging y produccion (si aplica). Documenta la arquitectura actual y compartela con el tester. Configura monitoring extra durante el pen-test para detectar si el testing causa impacto. Programa una llamada de kickoff el dia 1 y una llamada de debrief el ultimo dia. Asegura que el equipo sabe que no deben bloquear el trafico del tester a menos que cause impacto real.

### Que hacemos despues de recibir el reporte de pen-test?

Importa todos los hallazgos al tracker de remediacion dentro de 48 horas. Clasifica cada hallazgo por severidad (Critico/Alto/Medio/Bajo/Informativo). Asigna un owner a cada hallazgo. Programa la remediacion segun SLAs: Critico 24-48h, Alto 1 semana, Medio 30 dias, Bajo 90 dias. Programa la ventana de retest con la firma (30-90 dias). Comparte hallazgos sanitizados con el resto de ingenieria — los patrones se repiten. Conduce un postmortem del proceso de pen-test: que funciono, que no, que mejorar para el proximo. Actualiza el threat model con los hallazgos nuevos. Agrega tests de regression al CI/CD para prevenir recurrencia.



















































































End of document. Review and update quarterly.