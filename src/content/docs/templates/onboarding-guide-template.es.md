---
contentType: docs
templateType: onboarding
slug: onboarding-guide-template
title: "Plantilla de Guía de Onboarding"
description: "Plantilla de guía de onboarding completa para ayudar a nuevos miembros del equipo a ser productivos rápidamente."
metaDescription: "Plantilla de onboarding para nuevos desarrolladores. Cubre setup, herramientas, visión general del codebase y tareas de la primera semana."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - documentacion
  - equipo
  - onboarding
  - ci-cd
relatedResources:
  - /docs/readme-template
  - /docs/contributing-guide
  - /guides/software-architecture-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Plantilla de onboarding para nuevos desarrolladores. Cubre setup, herramientas, visión general del codebase y tareas de la primera semana."
  keywords:
    - guía de onboarding
    - plantilla nueva contratación
    - onboarding desarrolladores
    - onboarding de equipo
    - tareas primera semana
---

## Resumen

Una guía de onboarding acelera la productividad de nuevos miembros del equipo al proveer un camino claro desde el día uno hasta la primera contribución significativa. Consulta la [Plantilla de README](/docs/templates/readme-template) para docs de proyecto y la [Guía de Contribución](/docs/templates/contributing-guide) para estándares de contribución. Reduce la carga sobre miembros existentes y asegura consistencia.

## Cuándo Usar

- Un nuevo desarrollador se une al equipo
- Quieres reducir preguntas repetitivas de "cómo hago..."
- Necesitas documentar conocimiento tribal
- Tu equipo está creciendo rápidamente

## Plantilla

```markdown
# Guía de Onboarding

¡Bienvenido al equipo! Esta guía te ayudará a ponerte en marcha.

## Día 1: Cuentas y Accesos

- [ ] Cuenta de email y Slack/Teams creada
- [ ] Acceso a repositorio Git otorgado
- [ ] Acceso a plataforma CI/CD configurado
- [ ] Credenciales de ambiente de desarrollo recibidas
- [ ] Invitaciones de calendario enviadas para standups y rituales del equipo

## Día 1-2: Configuración del Entorno

Consulta la [Plantilla de Guía de Configuración de Entorno](/docs/templates/environment-setup-guide-template) para instrucciones detalladas.

### Herramientas Requeridas
| Herramienta | Versión | Propósito | Link de Instalación |
|-------------|---------|-----------|---------------------|
| Node.js | 20.x | Runtime | [nodejs.org](https://nodejs.org) |
| Docker | Última | Contenedores | [docker.com](https://docker.com) |
| Git | 2.40+ | Control de versiones | [git-scm.com](https://git-scm.com) |

### Setup del Repositorio
```bash
git clone git@github.com:org/repo.git
cd repo
npm install
npm run dev
```

Verificación: `http://localhost:4321` debería mostrar la aplicación.

## Día 2-3: Visión General del Código

### Arquitectura
[Diagrama de alto nivel o descripción de componentes del sistema]

### Directorios Clave
| Directorio | Propósito |
|------------|-----------|
| `/src/components` | Componentes UI reutilizables |
| `/src/pages` | Definiciones de rutas |
| `/src/lib` | Utilidades y schemas compartidos |
| `/tests` | Suites de tests |

### Convenciones
- Nomenclatura de branches: `feature/descripcion`, `bugfix/descripcion`
- Mensajes de commit: [Conventional Commits](https://conventionalcommits.org)
- Estilo de código: Aplicado por ESLint y Prettier

## Día 3-5: Primeras Contribuciones

### Good First Issues
Busca issues con labels:
- `good first issue`
- `help wanted`
- `documentation`

### Primeras Tareas
| Día | Tarea | Objetivo |
|-----|-------|----------|
| 3 | Corregir un typo o actualizar docs | Aprender el flujo de PR |
| 4 | Escribir un test unitario | Entender estándares de testing |
| 5 | Elegir un bug pequeño | Flujo completo de contribución |

## Semana 2+: Profundización

- [ ] Asistir a sesión de overview de arquitectura
- [ ] Leer [ADRs](/docs/templates/adr-template) en `/docs/adr/`
- [ ] Observar una rotación de on-call (solo observación)
- [ ] Pair programming con un compañero

## Recursos

- [Wiki del Equipo](link)
- [Documentación de API](link)
- [Runbooks](link)
- [Architecture Decision Records](link)

## ¿Preguntas?

Tu compañero de onboarding es: **[Nombre]**
Slack: `@username` | Email: `name@company.com`
```

## Secciones Clave

| Sección | Propósito |
|---------|-----------|
| **Cuentas y Accesos** | Eliminar bloqueos el día uno |
| **Configuración del Entorno** | Ambiente de desarrollo estandarizado |
| **Visión General del Código** | Contexto arquitectónico |
| **Primeras Contribuciones** | Camino claro al primer PR |
| **Recursos** | Dónde encontrar más info |

## Lo que funciona

- **Hazlo útil**: Cada item debe ser un checkbox o comando
- **Asigna un buddy**: Los nuevos necesitan un punto de contacto humano
- **Manténlo actualizado**: Revisa y actualiza trimestralmente
- **Empieza simple**: El día 1 no debe ser abrumador

## Errores Comunes

- **Instrucciones desactualizadas**: Links rotos o procesos cambiados
- **Credenciales faltantes**: Solicitudes de acceso que toman días
- **Sin sistema de buddy**: Nuevo aislado sin ayuda

## Preguntas Frecuentes

### Cuánto debería durar el onboarding?

Un onboarding útil abarca 2-4 semanas. La primera semana se enfoca en configuración del ambiente y contribuciones pequeñas. Las semanas 2-4 profundizan el conocimiento del dominio y aumentan la complejidad de las contribuciones.

### Qué pasa si el nuevo contratado es remoto?

El onboarding remoto requiere check-ins más estructurados. Usa videollamadas para sesiones de pair programming, mantén una checklist de onboarding compartida en una herramienta de gestión de proyectos y sobre-comunícale durante el primer mes.

### Debería ser el mismo onboarding para juniors y seniors?

No. Los desarrolladores senior necesitan menos ayuda con herramientas pero más contexto sobre arquitectura y dominio. Los juniors necesitan más orientación sobre workflows, estándares de código y ciclos de feedback.


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Startup | Onboarding de 1 semana | Enfocarse en setup y primer ticket |
| Enterprise | Onboarding de 30 dias con mentor | Incluir cultura, procesos, compliance |
| Remoto | Onboarding con envio de equipo | Incluir setup de VPN, acceso remoto |
| Open source | Onboarding de contribuidor | Enfocarse en setup de dev y PR workflow |

## Ejemplo de Onboarding: Semana 1

```text
=== Onboarding: Backend Engineer ===

Dia 1: Setup y Accesos
  Manana:
    [ ] Laptop y equipo entregados
    [ ] Cuentas creadas: Google Workspace, Slack, GitHub, Jira
    [ ] Acceso a repos: permisos de lectura en todos los repos
    [ ] VPN configurada
    [ ] Ambiente local: Node.js, Docker, PostgreSQL
    [ ] Clonar repo principal y correr localmente
    [ ] Reunion 1:1 con mentor asignado
  Tarde:
    [ ] Tour de la documentacion interna
    [ ] Leer arquitectura general (docs/architecture.md)
    [ ] Unirse a canales de Slack del equipo
    [ ] Configurar notificaciones y perfil

Dia 2-3: Inmersion en el Codigo
  [ ] Leer el README del servicio principal
    [ ] Entender la estructura de directorios
    [ ] Entender el modelo de datos
    [ ] Entender el flujo de requests
  [ ] Correr el servicio localmente
    [ ] Hacer un request de prueba
    [ ] Ver los logs
    [ ] Conectar al debugger
  [ ] Leer 3 PRs recientes para entender el flujo de revision
  [ ] Reunion con el Product Owner: entender el roadmap
  [ ] Reunion con el Tech Lead: entender estandares de codigo

Dia 4-5: Primera Contribucion
  [ ] Asignacion de un ticket "good first issue"
  [ ] Crear rama siguiendo la convencion de naming
  [ ] Implementar el cambio
  [ ] Escribir tests
  [ ] Crear PR con descripcion clara
  [ ] Direcciones de code review
  [ ] Addressar comentarios de review
  [ ] Merge del PR
  [ ] Celebrar primera contribucion!

Fin de Semana 1:
  [ ] Retro 1:1 con mentor: que funciono, que no
  [ ] Retro 1:1 con manager: expectativas, preguntas
  [ ] Identificar areas de aprendizaje para Semana 2-4
  [ ] Configurar reuniones 1:1 recurrentes
```

### Como asignamos un mentor efectivo?

Un buen mentor es paciente, conoce el codigo, y tiene disponibilidad. Asigna el mentor antes del dia 1 — el mentor debe preparar el onboarding. El mentor debe: hacer 1:1 diarios durante la primera semana, estar disponible para preguntas en Slack, hacer pair programming en el primer ticket, y dar feedback continuo. No asignes como mentor al ingeniero mas ocupado — la disponibilidad es mas importante que el conocimiento. Rota el mentor si no funciona la quimica. El mentor no es responsable del desempeno del nuevo ingeniero — es responsable de facilitar el onboarding. Reconoce el trabajo del mentor en las evaluaciones de desempeno.

### Como medimos si el onboarding fue exitoso?

Mide: tiempo hasta primera contribucion (objetivo: < 5 dias), tiempo hasta autonomia completa (objetivo: < 30 dias), satisfaccion del nuevo ingeniero (encuesta al final de semana 1 y mes 1), y retencion a 90 dias. Pide feedback estructurado: que fue util, que falto, que cambiarias. Compara onboarding de diferentes ingenieros para identificar patrones. Si un ingeniero tarda mas de 2 semanas en hacer su primer PR, el onboarding tiene un problema. Si mas de 1 ingeniero reporta la misma brecha, arregla el onboarding. El onboarding es una inversion — un buen onboarding reduce el tiempo hasta productividad.
































































End of document. Review and update quarterly.