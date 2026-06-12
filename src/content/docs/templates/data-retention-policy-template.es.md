---
contentType: docs
slug: data-retention-policy-template
templateType: data-retention-policy
title: "Plantilla de Política de Retención de Datos"
description: "Plantilla de política de retención de datos que define cuánto tiempo se conservan los datos, cuándo se archivan y cómo se destruyen de forma segura y conforme a regulaciones."
metaDescription: "Plantilla de política de retención de datos: define ciclos de vida, reglas de archivo y procedimientos de destrucción para cumplir GDPR, CCPA y regulaciones."
difficulty: intermediate
topics:
  - security
tags:
  - data-retention
  - gdpr
  - compliance
  - privacy
  - template
relatedResources:
  - /guides/security/web-application-security-guide
  - /docs/templates/security-incident-response-template
  - /guides/devops/technical-documentation-strategy-guide
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de política de retención de datos: define ciclos de vida, reglas de archivo y procedimientos de destrucción para cumplir GDPR, CCPA y regulaciones."
  keywords:
    - plantilla politica retencion datos
    - gdpr retencion datos
    - politica ciclo vida datos
    - plantilla destruccion datos
    - compliance privacidad
---

# Plantilla de Política de Retención de Datos

Usa esta plantilla para definir cuánto tiempo viven los datos, cuándo se mueven y cómo se destruyen de forma segura.

## Plantilla

```markdown
# Política de Retención de Datos: [Categoría de Datos]

## Alcance
| Campo | Valor |
|-------|-------|
| **Dueño de la política** | [equipo o individuo] |
| **Fecha de revisión** | [anual] |
| **Regulaciones aplicables** | GDPR, CCPA, HIPAA, SOC 2 |

## Categorías de Datos

| Categoría | Período de Retención | Archivar Después | Destruir Después | Ubicación de Almacenamiento |
|-----------|---------------------|------------------|-----------------|---------------------------|
| Logs de actividad de usuario | 90 días | — | 90 días | Hot storage |
| Registros de transacciones | 7 años | 1 año | 7 años | Glacier / cold |
| Tokens de sesión | 24 horas | — | 24 horas | Redis |
| Error logs con PII | 30 días | — | 30 días | Almacenamiento encriptado |
| Snapshots de backup | 30 días | — | 30 días | Object storage |

## Reglas de Retención

1. **Datos activos** — accesibles en almacenamiento primario
2. **Datos archivados** — movidos a cold storage; recuperación > 24 horas
3. **Datos destruidos** — borrado criptográficamente, no recuperable

## Procedimiento de Destrucción

| Paso | Acción | Verificación |
|------|--------|-------------|
| 1 | Identificar datos pasados su fecha de retención | Scan automatizado |
| 2 | Exportar subconjunto requerido para retención legal | Revisión legal |
| 3 | Ejecutar eliminación via API o wipe seguro | Log de eliminación |
| 4 | Verificar eliminación con query o checksum | Registro de auditoría |

## Excepciones

| Excepción | Aprobación Requerida | Documentación |
|-----------|---------------------|---------------|
| Retención legal | Asesoría legal | Número de caso |
| Requerimiento de auditoría | Oficial de compliance | Alcance de auditoría |
| Solicitud de eliminación por usuario | DPO | Referencia de ticket |

## Roles

| Rol | Responsabilidad |
|------|---------------|
| **Dueño de datos** | Define requerimientos de retención |
| **Ingeniería** | Implementa eliminación automatizada |
| **Compliance** | Audita adherencia |
| **Legal** | Aprueba excepciones |
```

## Guías de Períodos de Retención

| Tipo de Dato | Mínimo | Máximo | Razonamiento |
|--------------|--------|--------|------------|
| Logs de autenticación | 1 año | 2 años | Investigaciones de seguridad |
| Transacciones financieras | 7 años | 10 años | Requerimientos legales y fiscales |
| Contenido generado por usuarios | Hasta eliminación de cuenta | — | Control de usuario (GDPR) |
| Telemetría / analytics | 90 días | 1 año | Decisiones de producto |
| PII en error logs | 30 días | 30 días | Minimización de privacidad |

## Mejores Prácticas

- **Automatiza la eliminación** — los procesos manuales fallan; cron jobs con logs de auditoría funcionan
- **Etiqueta datos al crear** — la metadata determina el ciclo de vida, no la clasificación manual posterior
- **Testea recuperación desde archivo** — datos archivados que no pueden restaurarse son inútiles
- **Documenta retenciones legales** — las excepciones deben ser trackeadas y expirar cuando la retención termina
- **Encripta antes de archivar** — el cold storage es más barato pero aún necesita protección

## Errores Comunes

- Retener todo para siempre — los costos de almacenamiento explotan y el riesgo legal aumenta
- Sin enforcement automatizado — una política sin automatización es un deseo
- Confundir retención de backup con retención de datos — los backups pueden sobrevivir a los datos que protegen
- Ignorar copias downstream — logs enviados a terceros necesitan eliminación paralela

## Preguntas Frecuentes

### ¿Qué pasa si un usuario solicita eliminación antes de que termine el período de retención?

GDPR y CCPA otorgan a usuarios el derecho a eliminación. Implementa un workflow de "eliminar bajo solicitud" que anule el cronograma estándar de retención. Loguea la solicitud y la excepción.

### ¿Cómo manejo datos en backups que han excedido su período de retención?

Usa backups inmutables con políticas de expiración. Si un backup contiene datos pasados su retención, restaura-elimina-recrea el backup o mantén una lista de supresión que bloquee los datos stale de ser restaurados.

### ¿Debería eliminar o anonimizar datos?

Elimina cuando los datos no tienen valor continuo. Anonimiza cuando necesitas analytics agregados pero no registros individuales. La anonimización debe ser irreversible (k-anonimidad o privacidad diferencial) para contar como eliminación bajo GDPR.
