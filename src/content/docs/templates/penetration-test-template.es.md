---
contentType: docs
slug: penetration-test-template
templateType: guideline
title: Plantilla de Plan de Pruebas de Penetración
description: Documenta hallazgos de auditorías de seguridad con esta plantilla de plan de pruebas de penetración, incluyendo calificaciones de riesgo, pasos de reproducción y guías de remediación accionables.
metaDescription: Usa esta plantilla de plan de pruebas de penetración para documentar hallazgos, riesgos, pasos de reproducción y guías de remediación con severidades claras.
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
  - /guides/web-application-security-guide
  - /docs/security-incident-response-template
  - /docs/bug-report-template
  - /recipes/container-security
  - /recipes/data-privacy-gdpr
  - /recipes/security-headers
  - /docs/incident-response-playbook-template
  - /docs/security-audit-checklist-template
lastUpdated: "2026-08-17"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: Usa esta plantilla de plan de pruebas de penetración para documentar hallazgos, riesgos, pasos de reproducción y guías de remediación con severidades claras.
  keywords:
    - plan de pruebas de penetración
    - plantilla de pentest
    - auditoría de seguridad
---
Usa esta plantilla para documentar hallazgos de auditorías de seguridad de forma clara y accionable. Te da una estructura para el informe, una matriz de calificación repetible y un trackeo de remediación. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/web-application-security-guide/) para prácticas de seguridad más amplias.

## Descripción General

Esta plantilla ayuda a equipos de seguridad y líderes de ingeniería a producir informes de pruebas de penetración consistentes y útiles. Cubre el resumen ejecutivo, el alcance, los hallazgos, las calificaciones de riesgo, el trackeo de remediación y los entregables. Úsala antes, durante y después de una auditoría de seguridad para que no se pierda nada.

## Cuándo Usar

- Planificar una prueba de penetración próxima con equipos internos o un vendor.
- Documentar hallazgos de una auditoría de seguridad.
- Trackear remediación entre equipos de ingeniería.
- Preparar un resumen ejecutivo para el liderazgo.
- Programar una nueva prueba después de aplicar correcciones.

## Plantilla

````markdown
# Reporte de Prueba de Penetración

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

## Plantilla de Hallazgo

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
## Retorna todos los usuarios — SQL injection confirmado
```

#### Impacto
Qué podría hacer un atacante con esta vulnerabilidad.

#### Remediación
Pasos específicos para arreglar. Incluye ejemplos de código si aplica.

#### Referencias
- OWASP: [link]
- CVE: [si aplica]
````

## Trackeo de Remediación

| ID | Hallazgo | Owner | Fecha Límite | Estado |
|----|----------|-------|--------------|--------|
| 001 | SQL Injection | Backend team | +7 días | En progreso |
| 002 | XSS | Frontend team | +14 días | Abierto |

## Matriz de Calificación de Riesgo

| Probabilidad \ Impacto | Bajo | Medio | Alto |
|------------------------|------|-------|------|
| Alta | Medio | Alto | Crítico |
| Media | Bajo | Medio | Alto |
| Baja | Info | Bajo | Medio |

## Mejores Prácticas

- **Incluye una prueba de concepto** — sin pasos de reproducción, los desarrolladores no pueden arreglar el problema.
- **Califica el riesgo en contexto de negocio** — un bug teóricamente crítico en una página admin interna puede ser riesgo medio.
- **Proporciona remediación a nivel de código** — "arregla la inyección" no es suficiente; muestra la sintaxis de consultas parametrizadas. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/web-application-security-guide/) para ejemplos de código.
- **Trackea la remediación como un sprint** — asigna owners, fechas límite y una ventana de retest.

## Errores Comunes

- Hallazgos vagos — "la app tiene XSS" sin URL o parámetro.
- Sin screenshots o prueba de concepto — los desarrolladores pierden tiempo reproduciendo.
- Fecha de retest faltante — la remediación sin verificación está incompleta. Traquea seguimientos con la [Plantilla de Respuesta a Incidentes de Seguridad](/docs/security-incident-response-template/).
- Scoring solo por CVSS — el contexto de negocio importa más que la fórmula.
- Dejar que las cuentas de test alcancen endpoints de producción durante el engagement.
- Confiar en la salida del scanner sin validación manual.
- Registrar tokens, contraseñas o claves durante el test.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Web app | OWASP Top 10 + ASVS | Enfocarse en input validation y auth |
| API REST | OWASP API Security Top 10 | Enfocarse en rate limiting y auth |
| Mobile app | OWASP MASVS | Incluir análisis de APK/IPA |
| Infraestructura cloud | CIS Benchmarks + pentest de red | Incluir IAM y network policies |
| Internal red team | Sin notificación previa | Simular un atacante real |

## Ejemplo de Plan de Pruebas de Penetración

```text
=== Plan de Pruebas de Penetración: payment-service ===

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
    - Datos de test sintéticos únicamente
    - No acceder a datos de producción reales
    - No modificar datos persistentes

Reglas de Engagement:
  - Horario de testing: 09:00-18:00 UTC-5
  - Rate limit: max 100 requests/segundo
  - No usar exploits que causen DoS
  - No usar social engineering
  - No testing físico
  - Notificar inmediatamente si se encuentra un hallazgo Crítico

Metodología:
  - OWASP Testing Guide v4.2
  - OWASP API Security Top 10
  - PTES (Penetration Testing Execution Standard)

Entregables:
  - Reporte ejecutivo (para liderazgo)
  - Reporte técnico (para ingeniería)
  - Hallazgos en formato CSV (para importar al tracker)
  - Presentación de debrief (sesión de 2 horas)

Cronograma:
  Día 1: Reconocimiento y mapeo de superficie de ataque
  Día 2: Testing de autenticación y autorización
  Día 3: Testing de lógica de negocio y flujo de pagos
  Día 4: Testing de infraestructura y configuración
  Día 5: Reporte y debrief
```

## Preguntas Frecuentes

### ¿Cómo priorizo hallazgos cuando todo parece crítico?

Usa la matriz de riesgo: probabilidad × impacto. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/web-application-security-guide/) para contexto de threat modeling. Una SQL injection en un form de login público es crítica. El mismo bug en un reporte interno read-only puede ser medio. Considera explotabilidad y sensibilidad de datos.

### ¿Cada hallazgo debería ser arreglado?

No. Algunos riesgos pueden ser aceptados si el costo de arreglar excede el impacto y existen controles compensatorios. Documenta riesgos aceptados con sign-off ejecutivo y fechas de revisión.

### ¿Quién debería recibir el reporte completo?

Equipo de seguridad, leads de ingeniería y liderazgo ejecutivo (solo resumen ejecutivo). Comparte hallazgos detallados on a need-to-know basis para prevenir weaponización.

### ¿Cómo elegimos una firma de penetration testing?

Evalúa firmas por certificaciones (OSCP, CEH, CISSP), experiencia en tu industria, referencias de clientes anteriores, metodología (OWASP, PTES) y calidad de reportes anteriores. Pide un reporte de muestra anonimizado — la calidad del reporte es tan importante como la calidad del testing. Verifica que la firma tenga seguro de responsabilidad profesional. Asegúrate de que la firma firme un NDA antes de compartir cualquier información. Compara precios pero no elijas solo por precio — un pentest barato puede perder hallazgos críticos. Mantén una relación continua con la firma — los testers que conocen tu sistema encuentran issues más profundos.

### ¿Cómo preparamos al equipo para un pen-test?

Notifica al equipo con 2 semanas de anticipación: fechas, alcance y SPOC. Asegúrate de que el SPOC tenga disponibilidad dedicada durante el pen-test (no esté on-call para otra cosa). Prepara cuentas de test con datos sintéticos. Prepara acceso a staging y producción si aplica. Documenta la arquitectura actual y compártela con el tester. Configura monitoring extra durante el pen-test para detectar si el testing causa impacto. Programa una llamada de kickoff el día 1 y una llamada de debrief el último día. Asegúrate de que el equipo sepa que no debe bloquear el tráfico del tester a menos que cause impacto real.

### ¿Qué hacemos después de recibir el reporte de pen-test?

Importa todos los hallazgos al tracker de remediación dentro de 48 horas. Clasifica cada hallazgo por severidad (Crítico/Alto/Medio/Bajo/Informativo). Asigna un owner a cada hallazgo. Programa la remediación según SLAs: Crítico 24-48h, Alto 1 semana, Medio 30 días, Bajo 90 días. Programa la ventana de retest con la firma (30-90 días). Comparte hallazgos sanitizados con el resto de ingeniería — los patrones se repiten. Conduce un postmortem del proceso de pen-test: qué funcionó, qué no y qué mejorar. Actualiza el threat model con los hallazgos nuevos. Agrega tests de regresión al CI/CD para prevenir recurrencia.
