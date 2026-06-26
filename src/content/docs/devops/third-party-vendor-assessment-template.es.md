---
contentType: docs
slug: third-party-vendor-assessment-template
title: "Plantilla de Evaluacion de Proveedores Terceros"
description: "Una plantilla estructurada para evaluar la seguridad, cumplimiento y postura operativa de proveedores terceros antes de la incorporacion o renovacion."
metaDescription: "Evalua proveedores terceros con esta plantilla. Cubre postura de seguridad, cumplimiento, compromisos de SLA y puntuacion de riesgo."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - vendor-assessment
  - third-party-risk
  - security
  - compliance
  - due-diligence
relatedResources:
  - /docs/devops/data-breach-response-playbook
  - /docs/devops/access-control-review-template
  - /docs/devops/rbac-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Evalua proveedores terceros con esta plantilla. Cubre postura de seguridad, cumplimiento, compromisos de SLA y puntuacion de riesgo."
  keywords:
    - evaluacion de proveedores
    - riesgo tercero
    - cuestionario de seguridad
    - debida diligencia
    - revision de cumplimiento
---

## Descripcion General

Una Plantilla de Evaluacion de Proveedores Terceros estandariza como tu organizacion evalua a proveedores externos antes de firmar un contrato, integrar un servicio o renovar un acuerdo. Recolecta evidencia sobre los controles de seguridad, certificaciones de cumplimiento, practicas operativas y postura de continuidad del negocio del proveedor para que los equipos puedan tomar decisiones de riesgo informadas.

## Cuando Usar

- Antes de incorporar un nuevo proveedor SaaS, cloud o infraestructura.
- Durante revisiones de seguridad anuales o renovaciones de contrato.
- Despues de que un proveedor experimente un incidente o violacion de seguridad.
- Cuando procurement requiere un proceso documentado de aceptacion de riesgo.
- Para comparar multiples proveedores contra los mismos criterios de seguridad.

## Prerequisitos

- Un apetito de riesgo definido y baselines de controles aceptables.
- Soporte legal o de procurement para la revision de contratos.
- Acceso a la documentacion de seguridad del proveedor, reportes SOC 2 o resumenes de pruebas de penetracion.
- Un stakeholder de ingenieria, seguridad y legal para la puntuacion.

## Solucion

### Plantilla

#### 1. Identificacion del Proveedor

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| Nombre del proveedor | Nombre legal | Acme Cloud Services |
| Descripcion del servicio | Que provee el proveedor | Managed Kubernetes hosting |
| Acceso a datos | Datos que procesara o almacenara | Direcciones de email de clientes, logs |
| Tipo de integracion | Como se conecta a tus sistemas | API, OAuth, SSO |
| Fecha de renovacion | Vencimiento del contrato | 2027-12-31 |

#### 2. Postura de Seguridad

| Area de Control | Respuesta del Proveedor | Evidencia Requerida | Puntuacion (1-5) |
|-----------------|-------------------------|---------------------|------------------|
| Cifrado en transito | TLS 1.2+ | Escaneo de certificado | |
| Cifrado en reposo | AES-256 | Documento de arquitectura | |
| Gestion de identidad y acceso | SSO + MFA | Captura de configuracion | |
| Logging y monitoreo | SIEM + alertas | Documento de politica | |
| Respuesta a incidentes | Equipo 24/7 | Runbook o clausula de contrato | |
| Gestion de vulnerabilidades | Escaneos mensuales | Reporte de escaneo | |

#### 3. Cumplimiento y Certificaciones

| Certificacion | Estado | Vencimiento | Notas |
|---------------|--------|-------------|-------|
| SOC 2 Type II | Vigente | 2026-09-30 | Reporte revisado |
| ISO 27001 | Vigente | 2027-03-15 | Certificado adjunto |
| GDPR / privacidad | Cumple | N/A | DPA firmado |
| HIPAA | N/A | N/A | Sin datos de salud |

#### 4. Resiliencia Operativa

| Topico | Pregunta | Respuesta |
|--------|----------|-----------|
| SLA de uptime | Disponibilidad garantizada | 99.95% mensual |
| Respuesta de soporte | Tiempo para issues criticos | 1 hora |
| Residencia de datos | Donde se almacenan los datos | UE, US-East |
| Backup y recuperacion | Objetivos RPO / RTO | 1 hora / 4 horas |
| Estrategia de salida | Como se devuelven o eliminan datos | Export cifrado en 30 dias |

#### 5. Resumen de Puntuacion de Riesgo

| Categoria de Riesgo | Peso | Puntuacion | Puntuacion Ponderada |
|---------------------|------|------------|----------------------|
| Seguridad | 30% | 4 | 1.2 |
| Cumplimiento | 25% | 5 | 1.25 |
| Operativo | 25% | 3 | 0.75 |
| Financiero | 10% | 4 | 0.4 |
| Reputacional | 10% | 3 | 0.3 |
| **Total** | 100% | | **3.9** |

#### 6. Decision

| Resultado | Condicion |
|-----------|-----------|
| Aprobar | Puntuacion total >= 4.0 y sin brechas criticas |
| Aprobar con condiciones | Puntuacion 3.0 - 3.9 y brechas remediables |
| Rechazar | Puntuacion < 3.0 o riesgo critico no mitigado |

## Explicacion

La plantilla recolecta evidencia consistente entre proveedores, lo que facilita comparar riesgos y justificar decisiones. La puntuacion convierte respuestas cualitativas en numeros que se pueden rastrear a lo largo del tiempo y escalar a liderazgo. La seccion de decision elimina la ambiguedad sobre si un proveedor puede avanzar.

## Variantes

- **Revision ligera de proveedor**: Una checklist corta de 10 preguntas para proveedores de bajo riesgo como herramientas de analytics o marketing.
- **Revision de infraestructura critica**: Una evaluacion profunda con diagramas arquitectonicos, derechos de revision de codigo y auditorias presenciales.
- **Evaluacion de proveedor AI/ML**: Agrega preguntas sobre datos de entrenamiento, sesgo, propiedad de outputs y explicabilidad.
- **Revision de renovacion**: Omite preguntas basicas de onboarding y se enfoca en cambios desde la ultima evaluacion.

## Mejores Practicas

- Reutiliza la misma plantilla para cada proveedor para mantener comparaciones justas.
- Solicita evidencia, no solo respuestas si/no.
- Define una puntuacion minima y controles obligatorios antes de comenzar la revision.
- Almacena las evaluaciones completadas en un repositorio central para auditorias.
- Re-evalua proveedores de alto riesgo anualmente o despues de incidentes mayores.
- Incluye clausulas de derecho a auditar en contratos cuando el riesgo es alto.

## Errores Comunes

- Aceptar diapositivas de marketing del proveedor como evidencia.
- Saltar la re-evaluacion durante renovaciones.
- No rastrear compromisos de remediacion despues de aprobacion condicional.
- Asignar la puntuacion a una sola persona sin revision entre pares.
- Ignorar subcontratistas o dependencias de cuarto nivel usadas por el proveedor.

## FAQs

### Que pasa si un proveedor se niega a compartir un reporte SOC 2?

Solicita un resumen de controles o un cuestionario de cumplimiento. Si aun se niega, escala el riesgo y considera requerir un derecho a auditar contractual o controles de seguridad adicionales.

### Con que frecuencia se deben reevaluar los proveedores?

Anualmente para proveedores de alto riesgo, y en cada renovacion o cambio mayor de servicio para los demas. Tambien se recomiendan revisiones disparadas por incidentes.

### Quien debe ser dueno del proceso de evaluacion?

Seguridad o riesgo usualmente son duenos, pero procurement, legal e ingenieria deben aportar. La aprobacion final debe involucrar al dueno de los datos.
