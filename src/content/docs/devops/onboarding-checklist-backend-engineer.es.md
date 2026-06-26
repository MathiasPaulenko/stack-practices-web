---
contentType: docs
slug: onboarding-checklist-backend-engineer
title: "Checklist de Onboarding para Ingenieros Backend"
description: "Una checklist integral para onboardear nuevos ingenieros backend cubriendo configuracion del entorno, orientacion al codebase, entrenamiento de seguridad y metas de la primera semana."
metaDescription: "Onboarda ingenieros backend con esta checklist. Cubre entorno, codebase, seguridad, despliegue y entregables de la primera semana."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - onboarding
  - checklist
  - backend
  - new-hire
  - team-process
  - engineering
relatedResources:
  - /docs/devops/engineering-handbook-template
  - /docs/devops/git-branching-strategy-document
  - /docs/devops/code-review-checklist-template
  - /docs/devops/service-ownership-document-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Onboarda ingenieros backend con esta checklist. Cubre entorno, codebase, seguridad, despliegue y entregables de la primera semana."
  keywords:
    - onboarding ingeniero backend
    - checklist onboarding desarrollador
    - nueva contratacion ingenieria
    - plantilla onboarding
    - primera semana ingeniero
---

## Overview

Un onboarding desestructurado desperdicia el primer mes de contribucion de un nuevo ingeniero. Sin una checklist, los nuevos contratados pierden dias descubriendo que repositorios clonar, que canales de Slack importan, y como desplegar su primer cambio. Esta checklist estructura las primeras dos semanas para que los nuevos ingenieros backend se conviertan rapidamente en contribuyentes productivos mientras absorben la cultura del equipo y los estandares tecnicos.

## When to Use

Usa esta checklist cuando:
- Un nuevo ingeniero backend se une a tu equipo
- Un ingeniero se transfiere de frontend u otra especializacion
- Estas estandarizando el onboarding entre multiples equipos
- Necesitas medir y mejorar tu proceso de onboarding

## Prerequisites

Antes de que el nuevo contratado empiece:
- [ ] Hardware pedido y configurado (laptop, monitores, perifericos)
- [ ] Cuentas creadas (email, Slack, GitHub, proveedor cloud, VPN)
- [ ] Manager asignado y calendario bloqueado para 1:1s de la primera semana
- [ ] Companero de onboarding asignado del equipo de ingenieria
- [ ] Solicitudes de acceso enviadas para acceso de solo lectura a produccion

## Solution

```markdown
# Checklist de Onboarding para Ingeniero Backend

## Nuevo Ingreso: ______ | Fecha de Inicio: ______ | Manager: ______ | Companero: ______

---

## Dia 1: Bienvenida y Configuracion

### Administrativo
- [ ] Completar papeleo de RRHH e inscripcion de beneficios
- [ ] Recibir laptop y configuracion de hardware
- [ ] Obtener tarjeta de acceso al edificio / pase de estacionamiento
- [ ] Configurar email y calendario
- [ ] Unirse a canales esenciales de Slack/Teams
  - #general, #engineering, #backend, #incidents, #deployments
- [ ] Agregar foto de perfil y estado a Slack
- [ ] Programar 1:1s con manager, companero y tech lead

### Entorno de Desarrollo
- [ ] Instalar software requerido (ver handbook de ingenieria para versiones)
  - [ ] Git
  - [ ] Docker y Docker Compose
  - [ ] Node.js / Python / Java / Go (stack especifico)
  - [ ] IDE (VS Code / IntelliJ / GoLand) con configuracion del equipo
  - [ ] kubectl y herramientas CLI del proveedor cloud
  - [ ] Postman o cliente API
- [ ] Configurar Git con email de la empresa y clave de firma
- [ ] Clonar repositorios principales
  - [ ] Repositorio de aplicacion principal
  - [ ] Repositorio de infraestructura / despliegue
  - [ ] Repositorio de librerias compartidas / SDK
- [ ] Ejecutar el proyecto localmente siguiendo las instrucciones del README
- [ ] Verificar que los tests locales pasan
- [ ] Hacer una correccion trivial de documentacion y abrir primer PR

### Acceso y Seguridad
- [ ] Completar entrenamiento de concientizacion de seguridad
- [ ] Configurar gestor de contrasenas con acceso al vault del equipo
- [ ] Habilitar MFA en todas las cuentas (GitHub, proveedor cloud, VPN)
- [ ] Solicitar y recibir acceso al entorno de staging
- [ ] Leer y reconocer las politicas de manejo de datos

---

## Semana 1: Orientacion al Codebase

### Arquitectura y Sistemas
- [ ] Asistir a sesion de overview de arquitectura (grabada si no esta disponible en vivo)
- [ ] Revisar diagrama de arquitectura del sistema y documentacion de flujo de datos
- [ ] Identificar los 5 servicios mas criticos que posee el equipo
- [ ] Entender el ciclo de vida de la peticion: cliente → balanceador → servicio → base de datos
- [ ] Revisar documentacion de API (OpenAPI / Swagger)
- [ ] Recorrer la guia de debugging para problemas locales comunes

### Estandares de Codigo
- [ ] Leer el documento de estandares de codigo del equipo
- [ ] Revisar 5 PRs recientemente mergeados para entender patrones de revision
- [ ] Entender reglas de linting y formateo (ejecutar linters localmente)
- [ ] Aprender la filosofia de testing del equipo (unitario vs integracion vs e2e)
- [ ] Revisar patrones de manejo de errores en el codebase

### Procesos
- [ ] Entender el ritmo de sprint/iteracion (planning, standups, retros)
- [ ] Aprender como tomar trabajo (sistema de tickets, tablero Kanban)
- [ ] Asistir a planning de sprint y retrospectiva como observador
- [ ] Entender la rotacion de guardia y procedimientos de escalamiento
- [ ] Revisar runbooks de respuesta a incidentes

### Primera Contribucion
- [ ] Tomar un "good first issue" (etiquetado en el tracker)
- [ ] Abrir un PR siguiendo la plantilla de PR del equipo
- [ ] Recibir y atender feedback de code review
- [ ] Mergear primer PR con guia del companero
- [ ] Verificar que el cambio se despliega exitosamente a staging

---

## Semana 2: Integracion Profunda

### Conciencia de Produccion
- [ ] Observar un turno de un ingeniero de guardia (sin interrumpir)
- [ ] Revisar dashboards de monitoreo de produccion
- [ ] Entender umbrales de alertas y procedimientos de paging
- [ ] Aprender como consultar logs en la herramienta de agregacion del equipo
- [ ] Revisar postmortems recientes (ultimos 3 meses)

### Conocimiento de Dominio
- [ ] Reunirse con product manager para entender el roadmap actual
- [ ] Revisar funcionalidades orientadas al usuario y logica de negocio con experto de dominio
- [ ] Entender el modelo de datos y relaciones entre entidades
- [ ] Revisar puntos de integracion con servicios externos
- [ ] Aprender sobre requisitos de cumplimiento y regulatorios (si aplica)

### Ownership
- [ ] Identificar el servicio o componente que poseeras
- [ ] Revisar documentacion de ownership del servicio
- [ ] Entender el pipeline de despliegue para tu servicio
- [ ] Aprender procedimientos de rollback para tu servicio
- [ ] Agregarte a la rotacion de guardia del servicio (con supervision)

---

## Verificacion de Completitud

| Area | Verificado Por | Fecha | Notas |
|------|----------------|-------|-------|
| Configuracion del Entorno | ______ | ______ | |
| Build Local Funcionando | ______ | ______ | |
| Primer PR Mergeado | ______ | ______ | |
| Entrenamiento de Seguridad | ______ | ______ | |
| Overview de Arquitectura | ______ | ______ | |
| Observacion de Guardia Completa | ______ | ______ | |

## Feedback

**Que fue mas util?**

**Que falto o fue confuso?**

**Cuanto tiempo hasta que te sentiste productivo?**

**Recomendaciones para mejorar esta checklist:**
```

## Explanation

La checklist separa el onboarding en **Dia 1** (administrativo y configuracion tecnica), **Semana 1** (orientacion al codebase y primera contribucion), y **Semana 2** (conciencia de produccion y ownership). La estructura reconoce que los nuevos ingenieros necesitan cosas diferentes en diferentes momentos: primero entornos que funcionen, luego contexto, despues ownership. El sistema de companero asegura que nadie se atasca, y la verificacion de completitud crea responsabilidad tanto para el nuevo contratado como para el equipo.

## Variants

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Ingeniero senior | Agregar revision de arquitectura, responsabilidades de mentorias, introducciones cross-team | Esperar completion mas rapido (5-7 dias en lugar de 10) |
| Contratista / consultor | Enfocarse en repos especificos del proyecto, omitir procesos/cultura del equipo | Timeline mas ajustado, enfoque en entregables especificos |
| Pasante / ingeniero junior | Agregar revision de fundamentos de programacion, calendario de pair programming | Timeline mas largo, guia mas estructurada |
| Equipo remoto | Agregar normas de comunicacion async, coordinacion de zonas horarias, chats virtuales | No hay setup fisico; mayor enfasis en documentacion |
| Fusion de equipos / adquisicion | Agregar orientacion a sistemas legacy, sensibilidad politica, adopcion de nuevos procesos | Enfocarse en integracion en lugar de inicio fresco |

## Best Practices

1. **Asigna un companero, no solo un manager** — los companeros responden las preguntas "como hago..." que los managers no pueden
2. **Ten el primer PR listo el dia 1** — una correccion de documentacion o un test agregan confianza inmediatamente
3. **Graba overviews de arquitectura** — las sesiones en vivo son valiosas pero no repetibles; graba para futuros contratados
4. **Mide tiempo-hasta-primer-PR** — rastrea esta metrica para mejorar tu proceso de onboarding
5. **Actualiza la checklist despues de cada nuevo ingreso** — ojos frescos detectan brechas inmediatamente

## Common Mistakes

1. **Enfocarse solo en configuracion tecnica** — la cultura, relaciones, y conocimiento de procesos importan tanto como el codigo
2. **Lanzar a nuevos contratados a tareas complejas muy temprano** — las primeras contribuciones deberian ser alcanzables en 1-2 dias
3. **Saltar explicaciones de acceso a produccion** — los nuevos ingenieros necesitan entender que pueden y no pueden tocar
4. **No explicar el "por que" detras de procesos** — seguir reglas sin entender crea comportamiento de culto de carga
5. **Olvidar hacer check-in despues de la semana 2** — el onboarding continua por 3-6 meses; la checklist es solo el inicio

## Frequently Asked Questions

### Cuanto deberia durar el onboarding?

Para ingenieros backend experimentados: 1-2 semanas hasta primera contribucion significativa, 1 mes hasta productividad completa. Para ingenieros junior: 2-4 semanas hasta primera contribucion, 2-3 meses hasta productividad completa. Son guias; ajusta basado en complejidad del codebase y requisitos de conocimiento de dominio.

### Deberian los nuevos ingenieros entrar a guardia inmediatamente?

No. Primero observa guardia (sin responsabilidad), luego unete a rotacion con un companero experimentado disponible. La mayoria de los equipos esperan 1-2 meses antes de guardia independiente. El timeline exacto depende de la complejidad del sistema y calidad de la documentacion.

### Que pasa si el nuevo contratado termina todo temprano?

Esa es una senal de un proceso bien ejecutado. Usa el tiempo extra para exploracion mas profunda del dominio, contribuciones a mejoras de herramientas, o observacion de otros equipos. La terminacion temprana tambien indica que tu documentacion y tooling estan en buena forma.
