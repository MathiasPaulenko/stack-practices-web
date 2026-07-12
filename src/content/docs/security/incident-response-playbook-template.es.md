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
  - /docs/api-security-review-template
  - /docs/data-classification-template
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


- For alternatives, see [Data Classification Template](/es/docs/data-classification-template/).

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

## Fases de Respuesta a Incidentes

```text
=== Fase 1: Deteccion y Triage (0-15 min) ===

- Alerta recibida via monitoring, usuario, o tercero
- On-call confirma que es un incidente real (no falso positivo)
- Severidad asignada: SEV1 (Critico) / SEV2 (Alto) / SEV3 (Medio) / SEV4 (Bajo)
- Incident Commander (IC) asignado
- Canal de incidente creado (#incident-xxx)
- Stakeholders notificados

=== Fase 2: Contencion (15-60 min) ===

- Accion inmediata para detener el impacto:
  - Revertir deploy
  - Bloquear trafico malicioso (WAF, IP block)
  - Deshabilitar cuenta/feature comprometida
  - Conmutar a region/instancia de respaldo
- Preservar evidencia (logs, snapshots, dumps) antes de remediar
- Documentar acciones tomadas y timestamps

=== Fase 3: Erradicacion (1-4 horas) ===

- Identificar y eliminar la causa raiz
- Aplicar fix permanente (no solo workaround)
- Rotar credenciales comprometidas
- Actualizar configuraciones vulnerables
- Verificar que el incidente esta contenido

=== Fase 4: Recuperacion (1-24 horas) ===

- Restaurar servicios a operacion normal
- Verificar integridad de datos
- Monitorear de cerca por recurrencia (24-48 horas)
- Comunicar resolucion a stakeholders
- Cerrar canal de incidente

=== Fase 5: Postmortem (1-5 dias) ===

- Postmortem blameless dentro de 48 horas
- Identificar causa raiz y factores contribuyentes
- Crear action items con duenos y fechas
- Compartir learnings con la organizacion
- Actualizar runbooks y playbooks
```


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


### Como elegimos el Incident Commander (IC)?

El IC es la persona que coordina la respuesta al incidente — no necesariamente la persona que arregla el problema. Responsabilidades del IC: mantener el foco en la mitigacion, coordinar comunicacion, asignar tareas, y tomar decisiones cuando hay ambiguedad. El IC no debe estar escribiendo codigo — delega la implementacion a otros. Para SEV1/SEV2: el IC debe ser un ingeniero senior o manager con experiencia en incidentes. Para SEV3/SEV4: el on-call puede ser el IC. Rota el rol de IC para desarrollar experiencia en el equipo. Entrena a todos los ingenieros en el rol de IC con simulacros. El IC declara el incidente resuelto — no el ingeniero que arregla el problema.

### Que hacemos si el incidente involucra datos de clientes?

Si el incidente involucra datos de clientes: escala inmediatamente a legal y compliance. Documenta que datos fueron afectados, que usuarios, y el alcance. Para GDPR: notificacion al regulador requerida en 72 horas. Para CCPA: notificacion a consumidores afectados "sin demora irrazonable". Prepara una comunicacion para clientes con: que paso, que datos fueron afectados, que estamos haciendo, y que deben hacer. No ocultes el alcance — la transparencia construye confianza. Coordina con legal para el lenguaje exacto de la notificacion. Registra todas las decisiones y comunicaciones para auditoria. Considera ofrecer monitoreo de credito si datos financieros fueron expuestos.

### Como manejamos comunicacion durante un incidente?

Comunicacion durante incidentes sigue el principio de "comunicar temprano, comunicar a menudo". Interno: usa un canal dedicado de Slack/Teams para el incidente. Actualiza cada 30 minutos para SEV1, cada 1 hora para SEV2. El IC es responsable de las actualizaciones. Externo: usa la pagina de status (status.io, Statuspage) para comunicaciones a usuarios. Prepara plantillas de comunicacion con anticipacion. Para SEV1: notifica a liderazgo ejecutivo inmediatamente. Designa a una persona para manejar comunicacion externa — el IC no debe manejar ambos. Nunca culpes a individuos en comunicaciones — usa lenguaje factual. Despues de la resolucion: envia una comunicacion final con resumen y proximos pasos.

### Como prevenimos que el mismo incidente recurra?

El postmortem es la herramienta principal para prevenir recurrencia. Conduce un postmortem blameless dentro de 48 horas. Identifica la causa raiz — no solo la causa inmediata. Usa "5 Whys" o analisis de causa raiz. Crea action items especificos, medibles, con duenos y fechas limite. Prioriza action items por impacto en prevencion de recurrencia. Agrega tests de regression para verificar que el fix funciona. Actualiza runbooks y playbooks con los aprendizajes. Comparte el postmortem con toda la ingenieria — los patrones se repiten entre servicios. Rastrea action items hasta su completacion — un postmortem sin action items completados es inutil. Revisa action items vencidos mensualmente.

### Como entrenamos al equipo para respuesta a incidentes?

Entrena al equipo con simulacros regulares (game days). Programa un game day trimestral donde simulas un incidente real. Usa escenarios basados en incidentes pasados o amenazas potenciales. Rota roles (IC, comunicador, implementador) para que todos ganen experiencia. Despues del simulacro: conduce un retro sobre que funciono y que no. Documenta el simulacro como un postmortem. Mantiene un calendario de on-call con sombreado (shadow on-call) para nuevos miembros. Crea un onboarding de respuesta a incidentes con runbooks y playbooks. Usa herramientas de simulacion (Gremlin, Chaos Monkey) para inyectar fallos en staging. La practica hace que la respuesta real sea mas rapida y efectiva.


















































End of document. Review and update quarterly.