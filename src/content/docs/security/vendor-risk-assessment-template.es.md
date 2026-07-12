---



contentType: docs
slug: vendor-risk-assessment-template
title: "Plantilla de Evaluación de Riesgos de Proveedores"
description: "Plantilla para evaluar riesgos operativos y de seguridad de proveedores de terceros."
metaDescription: "Usa esta plantilla de evaluación de riesgos de proveedores para evaluar seguridad, cumplimiento y riesgos operativos de terceros antes del onboarding."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - vendor
  - risk
  - assessment
  - compliance
  - template
relatedResources:
  - /docs/incident-response-playbook-template
  - /docs/data-retention-policy-template
  - /docs/api-security-review-template
  - /docs/security-audit-checklist-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-remediation-template
  - /docs/data-classification-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de evaluación de riesgos de proveedores para evaluar seguridad, cumplimiento y riesgos operativos de terceros antes del onboarding."
  keywords:
    - seguridad
    - proveedor
    - riesgo
    - evaluacion
    - cumplimiento
    - plantilla



---
## Visión General

Los proveedores de terceros procesan tus datos, se integran con tus APIs y a menudo tienen acceso privilegiado a tus sistemas. Una violación de seguridad de un proveedor se convierte en tu violación. La mayoría de los cuestionarios de seguridad se ignoran después del onboarding. Esta plantilla estructura una evaluación de riesgos repetible que evalúa proveedores antes de la firma del contrato, durante las revisiones anuales y después de cualquier incidente de seguridad que involucre al proveedor.

## Cuándo Usar


- For alternatives, see [Penetration Test Remediation Template](/es/docs/penetration-test-remediation-template/).

Usa este recurso cuando:
- Incorporas un nuevo proveedor SaaS, de nube o un equipo de desarrollo externalizado
- Realizas una revisión de seguridad anual de proveedores existentes
- Un proveedor revela una violación o cambia su postura de seguridad

## Solución

```markdown
# Evaluación de Riesgos de Proveedor: `<Nombre del Proveedor>`

## 1. Metadatos del Proveedor

| Campo | Valor |
|-------|-------|
| Nombre del Proveedor | `nombre` |
| Servicio Proporcionado | `descripcion` |
| Nivel de Acceso a Datos | `Ninguno / Lectura / Escritura / Admin` |
| Tipos de Datos Manejados | `PII / PHI / Financieros / Confidenciales / Públicos` |
| Valor del Contrato | `$X / año` |
| Clasificación de Criticidad | `Baja / Media / Alta / Crítica` |
| Fecha de Evaluación | `AAAA-MM-DD` |
| Evaluador | `@security-team` |
| Próxima Revisión | `AAAA-MM-DD` |

## 2. Controles de Seguridad

| Categoría de Control | Declaración del Proveedor | Evidencia Solicitada | Verificado | Riesgo |
|----------------------|---------------------------|---------------------|------------|--------|
| SOC 2 Tipo II | Sí / No | Informe (últimos 12 meses) | | |
| ISO 27001 | Sí / No | Certificado | | |
| Cumplimiento GDPR / CCPA | Sí / No | DPA + política de privacidad | | |
| Cifrado en Reposos | Sí / No | Documento de arquitectura / captura | | |
| Cifrado en Tránsito (TLS 1.2+) | Sí / No | Escaneo SSL Labs | | |
| MFA para Acceso Admin | Sí / No | Captura de configuración | | |
| Prueba de Penetración (anual) | Sí / No | Resumen de informe (redactado) | | |
| Plan de Respuesta a Incidentes | Sí / No | Documento + SLAs | | |
| Sub-procesadores Publicados | Sí / No | Lista de sub-procesadores | | |

## 3. Riesgo Operativo

| Factor | Calificación | Justificación | Mitigación |
|--------|--------------|---------------|------------|
| Estabilidad financiera | `Baja / Med / Alta` | | |
| Riesgo geográfico / político | `Baja / Med / Alta` | | |
| Riesgo de concentración (proveedor único) | `Baja / Med / Alta` | | |
| Complejidad de integración | `Baja / Med / Alta` | | |
| Dificultad de salida (portabilidad de datos) | `Baja / Med / Alta` | | |

## 4. Evaluación del Manejo de Datos

| Pregunta | Respuesta del Proveedor | Satisfactorio |
|----------|------------------------|---------------|
| ¿Dónde se almacenan los datos? | `Región / país` | Sí / No |
| ¿Quién puede acceder a nuestros datos? | `Rol / proceso` | Sí / No |
| ¿Los datos se mezclan con otros clientes? | `Sí / No / Multi-tenant` | Sí / No |
| ¿Retención de datos tras fin de contrato? | `Días / política` | Sí / No |
| ¿Podemos solicitar eliminación? | `Proceso / SLA` | Sí / No |
| ¿Frecuencia y retención de copias de seguridad? | `Frecuencia / retención` | Sí / No |

## 5. Puntuación de Riesgo

| Categoría | Peso | Puntaje Bruto (1-5) | Puntaje Ponderado |
|-----------|------|---------------------|-------------------|
| Postura de seguridad | 30% | | |
| Cumplimiento | 25% | | |
| Resiliencia operativa | 20% | | |
| Protección de datos | 25% | | |
| **Total** | **100%** | | |

### Interpretación de Puntaje

| Rango | Calificación | Acción |
|-------|--------------|--------|
| 4.0 – 5.0 | Riesgo Bajo | Contrato estándar; revisión anual |
| 3.0 – 3.9 | Riesgo Medio | Requerir plan de remediación; revisión a 6 meses |
| 2.0 – 2.9 | Riesgo Alto | Mejoras de seguridad requeridas antes del onboarding |
| 1.0 – 1.9 | Riesgo Crítico | No incorporar sin aprobación del CISO + auditoría externa |

## 6. Plan de Remediación (si aplica)

| Brecha | Acción Requerida | Responsable | Fecha Límite | Estado |
|--------|-----------------|-------------|--------------|--------|
| | | | | |
```

## Explicación

La plantilla trata la evaluación de proveedores como un **proceso estructurado basado en evidencia**, no un ejercicio de casillas. Cada control requiere **evidencia**, no solo un "sí". La puntuación de riesgo fuerza compensaciones: un proveedor barato con cifrado deficiente puede ser aceptable para datos de marketing públicos pero nunca para registros de salud. La sección de manejo de datos es particularmente crítica porque los proveedores a menudo mezclan datos de clientes en arquitecturas multi-tenant, dificultando la eliminación y contención de brechas.

## Proceso de Evaluacion de Riesgo de Vendors

```text
=== Flujo de Evaluacion de Vendor ===

1. IDENTIFICACION
   - Equipo identifica necesidad de un nuevo vendor/SaaS
   - Completa solicitud de evaluacion con caso de uso y datos a compartir
   - Security team recibe solicitud y asigna evaluador

2. CUESTIONARIO INICIAL
   - Enviar cuestionario de seguridad al vendor (SOC 2, ISO 27001, etc.)
   - Solicitar: certificaciones, politicas de seguridad, reportes de auditoria
   - Revisar: pagina de status, historial de incidentes, breach notification policy
   - Deadline de respuesta: 2 semanas

3. EVALUACION TECNICA
   - Revisar metodos de autenticacion (SSO, MFA, SAML)
   - Revisar encripcion (en transito y reposo)
   - Revisar gestion de acceso (RBAC, least privilege)
   - Revisar retencion y eliminacion de datos
   - Revisar ubicacion de datos (residencia, procesamiento)
   - Revisar sub-procesadores (el vendor usa otros vendors?)

4. EVALUACION DE COMPLIANCE
   - Mapear requisitos regulatorios (GDPR, CCPA, HIPAA, SOC 2)
   - Revisar DPA (Data Processing Agreement)
   - Verificar clausulas de breach notification (72 horas para GDPR)
   - Verificar clausulas de auditoria y derecho a inspeccion

5. DECISION
   - Score de riesgo calculado: Critico / Alto / Medio / Bajo
   - Aprobacion: security team + legal + liderazgo de ingenieria
   - Si Alto/Critico: requiere mitigaciones antes de aprobar
   - Documentar decision y condiciones de aprobacion

6. MONITOREO CONTINUO
   - Revisar vendor anualmente
   - Suscribirse a notificaciones de incidentes del vendor
   - Revisar cambios en sub-procesadores
   - Reevaluar si el vendor cambia su postura de seguridad
```


## Variantes

| Contexto | Enfoque | Verificaciones Adicionales |
|----------|---------|---------------------------|
| Infraestructura en la nube (IaaS) | Modelo de responsabilidad compartida | Verificar dónde termina la responsabilidad del proveedor y comienza la tuya |
| SaaS con integración API | Seguridad de OAuth / tokens | Revisar alcances, rotación de tokens y firma de webhooks |
| Desarrollo externalizado | Acceso al código fuente | NDA, verificaciones de antecedentes, prácticas de desarrollo seguro |
| Procesador de pagos | PCI DSS | Requerir AoC (Attestation of Compliance) y SAQ |
| Proveedor de IA / ML | Datos de entrenamiento del modelo | Verificar que tus datos no se usen para entrenar modelos a menos que se acuerde explícitamente |

## Lo que funciona

1. Evalúa proveedores **antes** de la firma del contrato, no después del onboarding
2. Requiere un Acuerdo de Procesamiento de Datos (DPA) para cualquier proveedor que toque PII
3. Revisa sub-procesadores anualmente; el proveedor de tu proveedor sigue siendo tu riesgo
4. Mantén una lista de verificación de offboarding que incluya verificación de eliminación de datos
5. Documenta la justificación para cualquier riesgo aceptado; los auditores lo pedirán

## Errores Comunes

1. Aceptar el cuestionario de seguridad de un proveedor sin solicitar evidencia
2. Tratar a todos los proveedores igual independientemente de la sensibilidad de los datos o nivel de acceso
3. No reevaluar proveedores después de una violación o adquisición
4. Ignorar sub-procesadores; muchas violaciones ocurren a nivel de cuarta parte
5. No tener un plan de salida; los proveedores saben que los costos de migración te mantienen atado

## Preguntas Frecuentes

### ¿Cómo evalúo una startup que aún no tiene SOC 2?

Solicita su hoja de ruta de seguridad y controles provisionales. Revisa su arquitectura para cifrado, control de acceso y registros. Realiza una evaluación técnica ligera (revisión de arquitectura + prueba de penetración de la integración). Acepta mayor riesgo solo si el proveedor es crítico y no existe una alternativa madura. Requiere SOC 2 Tipo I dentro de 12 meses como cláusula contractual.

### ¿Qué es un Acuerdo de Procesamiento de Datos y cuándo lo necesito?

Un DPA es un contrato legal que define cómo un proveedor (procesador) maneja tus datos bajo GDPR / CCPA. Lo necesitas siempre que un proveedor procese datos personales en tu nombre. El DPA debe cubrir categorías de datos, fines de procesamiento, sub-procesadores, medidas de seguridad, SLAs de notificación de violaciones y requisitos de eliminación.

### ¿Con qué frecuencia debo reevaluar proveedores?

Anualmente para todos los proveedores. Semestralmente para proveedores de alto riesgo o críticos. Inmediatamente después de cualquier incidente de seguridad, adquisición o cambio importante de producto por parte del proveedor. No dejes que las evaluaciones caduquen; configura recordatorios de calendario vinculados al ciclo de renovación del contrato.


### Como manejamos vendors que ya estan en uso sin evaluacion?

Para vendors existentes sin evaluacion: prioriza por riesgo — vendors con acceso a datos Restringidos o Confidenciales primero. Conduce una evaluacion retroactiva usando el mismo proceso. Si la evaluacion revela riesgos inaceptables: implementa mitigaciones (restringe acceso a datos, agrega monitoring, renegocia terminos del contrato). Si el riesgo no es mitigable: considera migrar a un vendor alternativo. Documenta la brecha de evaluacion y el plan de remediacion. Establece una fecha limite para completar todas las evaluaciones retroactivas. Usa esto como caso de estudio para justificar el proceso de evaluacion obligatorio antes de onboarding.

### Que hacemos si un vendor sufre una brecha de datos?

Si un vendor sufre una brecha: activa el plan de respuesta a incidentes. Identifica que datos de tu empresa estaban en el vendor. Evalua el impacto: datos de clientes expuestos? credenciales comprometidas? propiedad intelectual filtrada? Notifica a tus clientes si sus datos fueron expuestos (GDPR requiere notificacion en 72 horas). Rota cualquier credencial compartida con el vendor. Revisa los terminos del contrato para obligaciones de notificacion y compensacion. Documenta el incidente y conducir un postmortem. Reevalua la relacion con el vendor — una brecha puede ser un incidente aislado o un patron de mala seguridad. Si el vendor no notifico dentro del plazo contractual, considera terminacion del contrato.

### Como evaluamos vendors de infraestructura cloud (AWS, GCP, Azure)?

Los proveedores cloud son vendors de alto riesgo debido al volumen de datos y la dependencia operacional. Para evaluar: revisa sus certificaciones (SOC 2 Type II, ISO 27001, FedRAMP). Revisa el shared responsibility model — que es responsabilidad del proveedor vs. tuya. Configura cloud security posture management (CSPM) para monitorear continuamente. Revisa el historial de incidentes del proveedor y su transparencia en postmortems. Evalua las regiones de datos y las opciones de residencia. Para compliance: verifica que el proveedor soporta tus requisitos regulatorios (GDPR, HIPAA, PCI DSS). Los proveedores cloud principales tienen evaluaciones extensas publicas — usalas pero no las tomes como gospel.

### Como manejamos sub-procesadores de vendors?

Un sub-procesador es un vendor que tu vendor usa para procesar datos. Para gestionarlos: requiere que el vendor disclose todos los sub-procesadores. Revisa el contrato del vendor — debe requerir que los sub-procesadores cumplan con los mismos estandares de seguridad. Verifica que el DPA cubre sub-procesadores. Suscribete a notificaciones de cambios de sub-procesadores — tienes derecho a objetar. Para datos Restringidos: verifica la postura de seguridad de cada sub-procesador. Documenta la cadena de procesamiento de datos. Si un sub-procesador cambia, reevalua el riesgo. La cadena de sub-procesadores es a menudo el eslabon mas debil en la postura de seguridad.

### Con que frecuencia debemos reevaluar vendors?

Reevalua vendors: anualmente para vendors con acceso a datos Restringidos o Confidenciales. Bienalmente para vendors con acceso a datos Internos. Trienalmente para vendors con acceso solo a datos Publicos. Reevaluacion fuera de ciclo cuando: el vendor sufre una brecha, cambia sus sub-procesadores, cambia sus terminos de servicio, o cambia su postura de seguridad (ej., pierde una certificacion). Documenta cada reevaluacion. Si un vendor degrada su postura de seguridad: implementa mitigaciones o considera terminacion del contrato. Una reevaluacion no es un rubber stamp — es una evaluacion genuina de si el vendor sigue cumpliendo tus estandares.




































































End of document. Review and update quarterly.