---
contentType: docs
slug: incident-response-playbook-template
title: "Plantilla de Playbook de Respuesta a Incidentes"
description: "Una plantilla de playbook paso a paso para manejar incidentes de seguridad."
metaDescription: "Plantilla de playbook de respuesta a incidentes: documenta detección, contención, erradicación, recuperación y lecciones aprendidas."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - incident-response
  - playbook
  - template
  - compliance
relatedResources:
  - /docs/data-retention-policy-template
  - /docs/security-incident-response-template
  - /docs/security-audit-checklist-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de playbook de respuesta a incidentes: documenta detección, contención, erradicación, recuperación y lecciones aprendidas."
  keywords:
    - seguridad
    - respuesta a incidentes
    - playbook
    - plantilla
    - cumplimiento
---
## Visión General

Los incidentes de seguridad requieren una respuesta coordinada y rápida. El pánico y la improvisación extienden el tiempo de caída, aumentan la exposición de datos y violan obligaciones de cumplimiento. Este playbook estructura la respuesta en cinco fases: Detección, Contención, Erradicación, Recuperación y Lecciones Aprendidas (basado en NIST SP 800-61).

## Cuándo Usar

Usa este recurso cuando:
- Se dispara una alerta de seguridad (acceso no autorizado, fuga de datos, malware)
- Un miembro del equipo reporta actividad sospechosa
- Un tercero te notifica de una vulnerabilidad o brecha

## Solución

```markdown
# Playbook de Respuesta a Incidentes: `<Tipo de Incidente>`

## Metadatos del Incidente

| Campo | Valor |
|-------|-------|
| ID de Incidente | `INC-YYYY-MM-DD-###` |
| Severidad | `P1 (Crítico) / P2 (Alto) / P3 (Medio) / P4 (Bajo)` |
| Detectado Por | `@reporter` o `sistema_alerta` |
| Hora de Detección | `YYYY-MM-DD HH:MM UTC` |
| Líder de Respuesta | `@incident-commander` |
| Estado | `Abierto / Contenido / Erradicado / Cerrado` |

## 1. Detección

### 1.1. Validar la Alerta

- [ ] Confirmar que la alerta no es un falso positivo
- [ ] Recolectar evidencia inicial (logs, capturas de pantalla, capturas de red)
- [ ] Documentar el primer indicador de compromiso (IOC) observado

### 1.2. Clasificar Severidad

| Severidad | Criterios | Tiempo de Respuesta |
|----------|-----------|---------------------|
| P1 | Brecha de datos activa, ransomware, producción caída | < 15 minutos |
| P2 | Acceso admin no autorizado, malware detectado | < 1 hora |
| P3 | Intento de phishing, compromiso de cuenta de bajo privilegio | < 4 horas |
| P4 | Ruido de escaneo de vulnerabilidades, violación de política | < 24 horas |

### 1.3. Ensamblar Equipo de Respuesta

- [ ] Asignar Incident Commander (único tomador de decisiones)
- [ ] Asignar Líder Técnico (forense y remediación)
- [ ] Asignar Líder de Comunicaciones (actualizaciones internas/externas)
- [ ] Llamar a ingenieros on-call de seguridad e infraestructura

## 2. Contención

### 2.1. Contención a Corto Plazo

- [ ] Aislar sistemas afectados (desconectar red, deshabilitar cuentas)
- [ ] Revocar credenciales comprometidas (API keys, contraseñas, tokens)
- [ ] Bloquear IPs maliciosas a nivel de firewall o WAF
- [ ] Preservar evidencia (snapshot de discos, exportar logs)

### 2.2. Contención a Largo Plazo

- [ ] Parchear la vulnerabilidad que habilitó el incidente
- [ ] Rotar todos los secretos en el alcance afectado
- [ ] Habilitar monitoreo adicional en sistemas relacionados
- [ ] Restringir acceso a sistemas afectados solo al equipo de respuesta

## 3. Erradicación

- [ ] Eliminar malware, puertas traseras o cuentas no autorizadas
- [ ] Validar integridad del sistema (checksums, baselines conocidos)
- [ ] Reconstruir sistemas comprometidos desde imágenes limpias
- [ ] Verificar que no quedan mecanismos de persistencia (cron jobs, tareas programadas)

## 4. Recuperación

- [ ] Restaurar sistemas desde backups limpios (verificar integridad del backup primero)
- [ ] Re-habilitar servicios con monitoreo intensificado
- [ ] Validar funcionalidad con smoke tests
- [ ] Monitorear durante 24-72 horas por signos de reinfección
- [ ] Comunicar luz verde a stakeholders

## 5. Lecciones Aprendidas

### 5.1. Línea de Tiempo

| Hora (UTC) | Acción | Responsable |
|------------|--------|-------------|
| `T+0` | Alerta disparada | `@system` |
| `T+15m` | Incident Commander asignado | `@security` |
| `T+45m` | Contención completa | `@infra` |
| `T+3h` | Erradicación completa | `@infra` |
| `T+6h` | Recuperación completa | `@app-team` |

### 5.2. Causa Raíz

- ¿Qué pasó?
- ¿Por qué fallaron nuestros controles?
- ¿Cuál fue el radio de impacto (usuarios, datos, sistemas)?

### 5.3. Acciones de Seguimiento

| ID | Acción | Responsable | Fecha Límite |
|----|--------|-------------|---------------|
| A1 | Agregar regla WAF para patrón de ataque | `@security` | +3 días |
| A2 | Habilitar MFA para todas las cuentas admin | `@identity` | +7 días |
| A3 | Mejorar retención de logs a 90 días | `@platform` | +14 días |
```

## Explicación

El playbook impone un **único Incident Commander** para evitar decisiones conflictivas durante momentos de alta presión. La clasificación de severidad determina la velocidad de respuesta para que incidentes P1 reciban atención inmediata sin que alertas de severidad media consuman todo el equipo. La contención prioriza detener la hemorragia antes de investigar la causa raíz. La recuperación incluye un período de monitoreo porque los atacantes a menudo dejan mecanismos de persistencia que se activan después de la respuesta inicial.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Cloud-native | Usar herramientas forenses del proveedor cloud | AWS GuardDuty, Azure Sentinel, GCP Security Command Center |
| On-premise | Procedimientos de aislamiento físico | Requerir acceso a data center, imagenado de hardware |
| Equipo pequeño | Combinar roles (Commander + Líder Técnico) | Documentar quién cubre cada rol si el primario no está disponible |

## Lo que funciona

1. Realizar ejercicios de simulacro (tabletop) trimestralmente para que el equipo conozca el playbook antes de un incidente real
2. Mantener una hoja de contactos con números telefónicos, no solo handles de Slack
3. Preparar scripts de aislamiento (deshabilitar usuario, revocar token, bloquear IP) para ejecución con un clic
4. Documentar procedimientos de manejo de evidencia para posibles procesos legales
5. Publicar un reporte post-incidente dentro de 5 días hábiles del cierre

## Errores Comunes

1. Saltarse la contención para investigar inmediatamente la causa raíz
2. Destruir sistemas comprometidos antes de preservar evidencia forense
3. Comunicar externamente antes de entender el alcance del incidente
4. Fallar en rotar todos los secretos dentro del radio de impacto afectado
5. Tratar el incidente como cerrado tan pronto como los sistemas se restauran

## Preguntas Frecuentes

### ¿Cuándo debería involucrar a legal o cumplimiento?

Para incidentes P1 y cualquier brecha que involucre datos personales, datos regulados (PCI, HIPAA) o ransomware. Legal debería revisar todas las comunicaciones externas. Cumplimiento necesita líneas de tiempo de notificación (GDPR: 72 horas, leyes estatales: varía).

### ¿Debería pagar un rescate?

Consulta con legal y fuerzas del orden primero. La mayoría de expertos en seguridad y agencias policiales aconsejan contra pagar rescates porque el pago no garantiza recuperación y puede financiar más actividad criminal.

### ¿Cómo evito que el mismo incidente se repita?

La fase de Lecciones Aprendidas es obligatoria, no opcional. Rastrea acciones de seguimiento en el mismo backlog que el trabajo de funcionalidades con la misma prioridad. Vuelve a ejecutar el ejercicio de simulacro con el playbook actualizado para validar las correcciones.
