---
contentType: docs
slug: data-breach-response-playbook
title: "Playbook de Respuesta a Violaciones de Datos"
description: "Un playbook paso a paso para responder a incidentes de seguridad que involucran acceso no autorizado a datos, desde la deteccion inicial hasta la notificacion y remediacion."
metaDescription: "Responde a violaciones de datos con este playbook. Cubre deteccion, contencion, preservacion de evidencia, requisitos de notificacion y remediacion post-incidente."
difficulty: advanced
topics:
  - security
  - devops
tags:
  - data-breach
  - incident-response
  - security-playbook
  - compliance
  - privacy
relatedResources:
  - /docs/devops/postmortem-incident-review-template
  - /docs/devops/incident-communication-template
  - /docs/devops/access-control-review-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Responde a violaciones de datos con este playbook. Cubre deteccion, contencion, preservacion de evidencia, requisitos de notificacion y remediacion post-incidente."
  keywords:
    - respuesta a violacion de datos
    - playbook de respuesta a incidentes
    - brecha de seguridad
    - privacidad de datos
    - notificacion de violacion
---

## Descripcion General

Una violacion de datos no es solo un incidente tecnico. Es una crisis legal, reputacional y operativa. Las primeras 24 horas determinan si la violacion se convierte en un incidente manejable o en un titular. Este playbook proporciona una respuesta estructurada: contener el dano, preservar evidencia, notificar a las personas correctas y remediar la causa raiz. Esta disenado para usarse bajo presion, con puntos de decision claros y asignaciones de responsables.

## Cuando Usar

Activa este playbook cuando:
- Se ha detectado o sospecha acceso no autorizado a datos sensibles
- Un sistema que contiene PII, PHI, datos financieros o credenciales ha sido comprometido
- Un insider ha exfiltrado datos sin autorizacion
- Un proveedor de terceros con acceso a tus datos reporta una violacion
- Un ataque de ransomware ha encriptado o amenazado publicar datos

## Requisitos Previos

Antes de que ocurra una violacion:
- [ ] El asesor legal ha revisado los requisitos de notificacion (GDPR, CCPA, leyes estatales, contratos)
- [ ] Existe un contacto o retainer de forense
- [ ] Un equipo de respuesta a incidentes con roles (lider, legal, comunicaciones, tecnico) esta definido
- [ ] Las listas de contacto de reguladores, clientes y medios estan actualizadas
- [ ] El inventario de datos mapea donde viven los datos sensibles y quien tiene acceso

## Solucion

```markdown
# Playbook de Respuesta a Violaciones de Datos

> Propietario del playbook: ______ | Ultima actualizacion: ______
> Equipo de respuesta a incidentes: ______ | Contacto legal: ______

## Fase 1: Deteccion y Evaluacion (0-2 horas)

### Acciones inmediatas

- [ ] Confirmar que la violacion es real (descartar falso positivo)
- [ ] Documentar el indicador inicial: hora, fuente, tipo de alerta
- [ ] Clasificar datos involucrados: PII, PHI, financieros, credenciales, propiedad intelectual, otros
- [ ] Estimar numero de registros o usuarios afectados
- [ ] Asignar comandante de incidente y roles
- [ ] Abrir un canal de comunicacion seguro y restringido (no el canal general de incidentes)

### Decision: esto dispara requisitos de notificacion?

| Jurisdiccion | Disparador | Plazo | Notas |
|-------------|---------|----------|-------|
| GDPR | Datos personales comprometidos | 72 horas a autoridad supervisora | ______ |
| CCPA / CPRA | Informacion personal accedida sin autorizacion | Sin demora irrazonable | ______ |
| Leyes estatales (EEUU) | Varia por estado | Varia | ______ |
| Contractuales | Definido en DPA o MSA | Definido en acuerdo | ______ |

## Fase 2: Contencion (2-24 horas)

### Contencion tecnica

- [ ] Aislar sistemas comprometidos (no apagues — preserva memoria volatil)
- [ ] Revocar credenciales y sesiones comprometidas
- [ ] Bloquear IPs o cuentas no autorizadas a nivel firewall / WAF
- [ ] Deshabilitar claves API o cuentas de servicio comprometidas
- [ ] Rotar todos los secretos que puedan haber sido expuestos
- [ ] Preservar logs, snapshots e imagenes de disco antes de limpiar

### Contencion administrativa

- [ ] Restringir acceso a detalles del incidente a personal con necesidad de saber
- [ ] Pausar despliegues o cambios no esenciales
- [ ] Informar al liderazgo ejecutivo sobre alcance y estado de respuesta

## Fase 3: Preservacion de Evidencia e Investigacion (24-72 horas)

- [ ] Enganchar equipo de forensia (interno o externo)
- [ ] Crear imagenes forenses de sistemas afectados
- [ ] Recopilar y preservar logs: aplicacion, base de datos, red, acceso, auditoria
- [ ] Documentar cadena de custodia de toda evidencia
- [ ] Construir linea de tiempo de actividad del atacante: acceso inicial, movimiento lateral, acceso a datos, exfiltracion
- [ ] Identificar causa raiz: vulnerabilidad, mala configuracion, robo de credenciales, amenaza interna, compromiso de terceros

## Fase 4: Notificacion (segun linea de tiempo legal)

### Notificacion interna

- [ ] Junta directiva / liderazgo ejecutivo
- [ ] Asesor legal
- [ ] Proveedor de seguros (ciberseguridad)
- [ ] RRHH (si se sospecha amenaza interna)

### Notificacion externa

- [ ] Organismos reguladores (segun ley aplicable)
- [ ] Clientes / usuarios afectados
- [ ] Socios o proveedores si sus datos estuvieron involucrados
- [ ] Fuerzas del orden (si es requerido o aconsejable)

### Checklist de contenido de notificacion

- [ ] Que paso
- [ ] Que datos estuvieron involucrados
- [ ] Que pasos se tomaron para contener la violacion
- [ ] Que pasos deben tomar las personas afectadas
- [ ] Informacion de contacto para preguntas
- [ ] Que esta haciendo la organizacion para prevenir recurrencia

## Fase 5: Remediacion y Recuperacion (1-4 semanas)

- [ ] Parchear o corregir la vulnerabilidad de causa raiz
- [ ] Remover mecanismos de persistencia del atacante (backdoors, cuentas, tareas programadas)
- [ ] Reconstruir sistemas comprometidos desde fuentes confiables si la integridad es incierta
- [ ] Re-habilitar sistemas con monitoreo mejorado
- [ ] Verificar que no persista acceso no autorizado
- [ ] Realizar una revision de seguridad de sistemas afectados
- [ ] Actualizar controles de seguridad: MFA, segmentacion, logging, alertas

## Fase 6: Post-Incidente (2-4 semanas)

- [ ] Realizar un postmortem sin culpa (ver plantilla de postmortem)
- [ ] Rastrear y completar todas las acciones de remediacion
- [ ] Revisar y actualizar este playbook basado en lecciones aprendidas
- [ ] Revisar inventario de datos y controles de acceso
- [ ] Actualizar evaluacion de riesgos y cobertura de seguros si es necesario
- [ ] Publicar un resumen transparente a las partes afectadas (segun corresponda)

## Roles y Responsabilidades

| Rol | Responsabilidades | Primario | Respaldo |
|------|------------------|----------|----------|
| Comandante de Incidente | Coordinacion general, autoridad de decision, actualizaciones a stakeholders | ______ | ______ |
| Lider Tecnico | Contencion, forensia, remediacion | ______ | ______ |
| Asesor Legal | Requisitos de notificacion, cumplimiento regulatorio, privilegio | ______ | ______ |
| Lider de Comunicaciones | Mensajeria a clientes, medios e interna | ______ | ______ |
| Representante de RRHH | Amenaza interna, impacto en empleados | ______ | ______ |

## Lista de Contactos

| Parte | Contacto | Metodo | Notas |
|-------|----------|--------|-------|
| Asesor legal | ______ | ______ | ______ |
| Seguro cibernetico | ______ | ______ | ______ |
| Firma forense | ______ | ______ | ______ |
| Fuerzas del orden | ______ | ______ | ______ |
| Organismo regulador | ______ | ______ | ______ |
```

## Explicacion

El playbook esta dividido en fases que coinciden con la presion temporal de una violacion: las primeras horas son sobre confirmar y contener; los siguientes dias sobre investigar y notificar; las siguientes semanas sobre arreglar y aprender. Cada fase tiene casillas de verificacion con responsables asignados para que nada se olvide en el caos. La matriz de decision de notificacion es critica. Omitir un plazo legal puede convertir un incidente de seguridad en una multa regulatoria.

## Variantes

| Contexto | Ajustes | Notas |
|---------|---------|-------|
| Violacion de proveedor cloud | Agregar contacto del equipo de respuesta a incidentes del proveedor, revision de responsabilidad compartida y notificacion al proveedor | Tu y el proveedor pueden tener obligaciones |
| Amenaza interna | Agregar involucramiento de RRHH, revision de logs de acceso y consideraciones de derecho laboral | Los casos internos tienen implicaciones legales y de RRHH diferentes |
| Violacion de proveedor de terceros | Agregar revision de DPA del proveedor, requisitos de notificacion del proveedor y evaluacion de dependencias | Tus datos en sus sistemas siguen siendo tu responsabilidad |
| Ransomware | Agregar politica de pago, plan de restauracion de respaldos y contacto con fuerzas del orden | Pagar el rescate es una decision de negocio y legal |
| Startup pequena (sin equipo de seguridad dedicado) | Agregar pasos de enganche de firma de seguridad externa y asignacion simplificada de roles | La velocidad importa mas que la exhaustividad cuando eres pequeno |

## Lo que funciona

1. Practica el playbook. Ejecuta un ejercicio de mesa trimestral. Un playbook que nunca has usado es un pasivo
2. Preserva antes de limpiar. La forensia depende de la evidencia; la contencion que destruye logs hace el analisis de causa raiz imposible
3. Asesor legal temprano. El privilegio cliente-abogado puede proteger los hallazgos de la investigacion del descubrimiento en litigios
4. Documenta todo en tiempo real. Los recuerdos se distorsionan bajo presion; un registro continuo es mas confiable que la memoria
5. No prometas lo que no puedes verificar. Si no sabes el alcance, dilo. Sobreestimar la confianza destruye la credibilidad

## Errores Comunes

1. Apagar sistemas inmediatamente. Pierdes memoria volatil y logs. Aisla, no apagues
2. Notificar demasiado temprano o demasiado tarde. Notificar temprano sin datos causa panico; notificar tarde causa multas regulatorias
3. Saltarse la preservacion de evidencia. Sin evidencia, no puedes probar que paso, defenderte de demandas ni aprender
4. Comunicar sobre canales comprometidos. Asume que el atacante esta leyendo tu chat de incidentes. Usa comunicacion fuera de banda
5. Sin seguimiento de remediacion. La violacion no termina cuando el atacante sale; termina cuando el sistema es demostrablemente mas seguro

## Preguntas Frecuentes

### Deberiamos pagar el rescate?

Esta es una decision de negocio y legal, no puramente tecnica. Involucra al asesor legal, liderazgo ejecutivo y tu asegurador cibernetico. En muchas jurisdicciones, pagar rescates a ciertas entidades es ilegal. Incluso si es legal, pagar no garantiza la recuperacion ni evita la publicacion de datos.

### Como sabemos si el atacante aun esta adentro?

Asume persistencia. Cambia todas las credenciales, revisa todas las cuentas por creacion no autorizada, inspecciona tareas programadas y scripts de inicio, y monitorea trafico saliente anormal. Contrata una firma forense para realizar un barrido exhaustivo si tienes alguna duda.

### Quien decide si notificar a los clientes?

El asesor legal, trabajando con el comandante de incidente y el liderazgo ejecutivo. La decision se basa en la ley aplicable, obligaciones contractuales y evaluacion de riesgos. El lider de comunicaciones ejecuta la decision, pero no la toma unilateralmente.
