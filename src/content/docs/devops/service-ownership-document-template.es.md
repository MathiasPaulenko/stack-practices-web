---
contentType: docs
slug: service-ownership-document-template
title: "Plantilla de Documento de Ownership de Servicio"
description: "Una plantilla para definir quien es dueno de un servicio, que hace, como operarlo, y donde encontrar informacion critica cuando las cosas salen mal."
metaDescription: "Define claramente el ownership de servicios con esta plantilla. Cubre responsabilidades, dependencias, runbooks, contactos y on-call para cada servicio."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - service-ownership
  - microservices
  - runbook
  - on-call
  - documentation
relatedResources:
  - /docs/devops/engineering-handbook-template
  - /docs/devops/incident-communication-template
  - /docs/devops/onboarding-checklist-backend-engineer
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define claramente el ownership de servicios con esta plantilla. Cubre responsabilidades, dependencias, runbooks, contactos y on-call para cada servicio."
  keywords:
    - ownership de servicio
    - documentacion de microservicios
    - runbook de servicio
    - responsabilidades de on-call
    - catalogo de servicios
---

## Descripcion General

Los microservicios se multiplican rapidamente. En una organizacion de ingenieria en crecimiento, es facil perder track de quien es dueno de que, como desplegar un servicio, o a quien llamar cuando falla a las 3 AM. Un documento de ownership de servicio es una pagina unica de verdad para cada servicio en produccion: que hace, quien es dueno, como operarlo, y donde encontrar todo lo demas. Convierte conocimiento tribal en documentacion referenciable y previene la crisis de "nadie sabe como esto funciona".

## Cuando Usar

Usa esta plantilla cuando:
- Tengas mas de cinco servicios en produccion y el ownership se este volviendo confuso
- Nuevos ingenieros necesiten dias para descubrir como desplegar o depurar un servicio
- Los incidentes se prolonguen porque nadie sabe quien es dueno del componente que falla
- Te prepares para una auditoria que requiera ownership de servicios documentado
- Estes separando un monolito y necesites asignar ownership a los servicios extraidos

## Prerrequisitos

Antes de escribir documentos de ownership:
- [ ] Identificar al dueno primario (equipo o individuo) de cada servicio
- [ ] Confirmar que el servicio sigue activo; documentar servicios deprecados por separado
- [ ] Reunir links a repositorios, dashboards, runbooks, y pipelines de CI
- [ ] Verificar informacion de contacto para rotaciones de on-call
- [ ] Decidir donde viven los documentos (wiki, docs site, o READMEs de repositorio)

## Solucion

```markdown
# Ownership de Servicio: `<Nombre del Servicio>`

> Dueno: ______ | Equipo: ______ | Actualizado: ______ | Tier: [1/2/3]

## 1. Que Hace Este Servicio

**Proposito:** [Una oracion describiendo el rol del servicio en el sistema]

**Capacidades clave:**
- ______
- ______
- ______

**Consumidores:** [Quien llama este servicio: otros servicios, UIs, socios externos]

**Tier de servicio:**
- Tier 1 = Critico para revenue; 99.99% uptime, on-call 24/7, postmortems obligatorios
- Tier 2 = Importante; 99.9% uptime, on-call en horario laboral
- Tier 3 = Interno o no critico; 99% uptime, respuesta best-effort

---

## 2. Arquitectura

### Stack Tecnologico
| Capa | Tecnologia | Version |
|------|------------|---------|
| Lenguaje | ______ | ______ |
| Framework | ______ | ______ |
| Base de datos | ______ | ______ |
| Cache | ______ | ______ |
| Cola | ______ | ______ |
| Infraestructura | ______ | ______ |

### Diagrama
```
[Consumidor] -> [Load Balancer] -> [Servicio] -> [Base de datos]
                           v
                        [Cache]
```
*Link al diagrama de arquitectura completo: ______*

---

## 3. Ownership y Contactos

| Rol | Equipo / Persona | Contacto | Escalamiento |
|-----|------------------|----------|-------------|
| Dueno primario | ______ | ______ | ______ |
| Rotacion on-call | ______ | Link PagerDuty/Opsgenie | ______ |
| Engineering manager | ______ | ______ | ______ |
| Product owner | ______ | ______ | ______ |
| Contacto de seguridad | ______ | ______ | ______ |

---

## 4. Recursos Operacionales

| Recurso | Link | Notas |
|---------|------|-------|
| Codigo fuente | ______ | Branch main, tags de release |
| Pipeline CI/CD | ______ | Build, test, deploy |
| Dashboard de monitoreo | ______ | Grafana / Datadog / CloudWatch |
| Politica de alertas | ______ | PagerDuty / Opsgenie |
| Tracking de errores | ______ | Sentry / Bugsnag |
| Logs | ______ | Kibana / CloudWatch Logs |
| Runbooks | ______ | Incidentes comunes y procedimientos |
| Postmortems | ______ | Analisis historico de incidentes |
| Documentacion de API | ______ | OpenAPI / Swagger |

---

## 5. Despliegue

**Despliegue estandar:**
1. Mergear PR a main
2. CI pasa (link al pipeline)
3. Deploy via [herramienta] a [ambiente]
4. Verificar via [health check / smoke test]

**Despliegue de emergencia:**
- Branch hotfix desde ultimo tag
- Build y deploy omitiendo pasos no criticos de CI
- Rollback: ______

**Calendario de deploys:**
- Regular: ______
- Periodos de congelamiento: ______

---

## 6. Dependencias

| Servicio | Direccion | Proposito | Contacto | Critico? |
|----------|-----------|-----------|----------|----------|
| ______ | Upstream | ______ | ______ | Si/No |
| ______ | Downstream | ______ | ______ | Si/No |

**Dependencias de terceros:**
| Vendor | Servicio | Proposito | Pagina de estado |
|--------|----------|-----------|-----------------|
| ______ | ______ | ______ | ______ |

---

## 7. Seguridad y Compliance

- Autenticacion: ______
- Autorizacion: ______
- Clasificacion de datos: [Publico / Interno / Confidencial / Restringido]
- Encripcion en transito: ______
- Encripcion en reposo: ______
- Requerimientos de compliance: ______
- Ultima revision de seguridad: ______

---

## 8. Limitaciones y Riesgos Conocidos

- ______
- ______
- ______

## 9. Registro de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| ______ | Documento de ownership inicial | ______ |
```

## Explicacion

La plantilla sigue el principio de **revelacion progresiva**: la primera seccion responde "que es esto y a quien llamo?" en segundos. La arquitectura y los links operacionales siguen para ingenieros que necesiten depurar o modificar el servicio. Las secciones de dependencias y seguridad existen para respuesta a incidentes y auditorias. Manteniendo todo en una pagina, el documento sigue siendo usable bajo presion.

## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Serverless / funcion | Reemplazar seccion de deploy con version de funcion y configuracion de triggers | Las funciones pueden no tener pipelines CI tradicionales |
| SaaS de terceros | Agregar detalles de contrato, fechas de renovacion, y rutas de escalamiento con vendor | No controlas la infraestructura |
| Data pipeline | Agregar schemas de entrada/salida, SLAs, y checks de calidad de datos | La frescura de datos importa tanto como el uptime |
| Libreria compartida | Agregar lista de consumidores, politica de versionado, y proceso de breaking changes | Las librerias tienen impacto transitivo |
| App mobile | Agregar proceso de release, links a app stores, y estrategia de rollout | Los deploys mobile no son completamente automatizables |

## Mejores Practicas

1. **Una pagina por servicio** — si no cabe en una pantalla, no se leera durante un incidente
2. **Link, no dupliques** — el doc de ownership es un indice, no un repositorio de todo el conocimiento
3. **Revisa trimestralmente** — ownership, dependencias, y stacks tecnologicos cambian mas rapido de lo que crees
4. **Hazlo buscable** — nuevos ingenieros encuentran servicios por nombre, no navegando carpetas
5. **Incluye un changelog** — saber cuando se actualizo el doc te dice si confiar en el

## Errores Comunes

1. **Escribirlo una vez y olvidarlo** — los docs de ownership obsoletos causan mas dano que ningun doc; te enganan
2. **Hacerlo demasiado largo** — si un ingeniero no encuentra la rotacion on-call en 10 segundos, el doc ha fallado
3. **Omitir dependencias** — la mitad de los incidentes son causados por fallas upstream; saber de que dependes
4. **No asignar un dueno unico** — "el equipo backend lo posee" no es ownership; nombra un equipo y una persona
5. **Esconderlo en un wiki que nadie usa** — el doc deberia estar linkeado desde el README del repo, dashboard de monitoreo, y pipeline de CI

## Preguntas Frecuentes

### En que se diferencia de un README?

Un README explica como construir y ejecutar el codigo localmente. Un documento de ownership de servicio explica como operar el servicio en produccion: a quien llamar, como desplegar, de que depende, y como responder a fallas. Ambos son necesarios; ninguno reemplaza al otro.

### Cada servicio deberia tener un documento de ownership?

Todo servicio en produccion deberia tener uno. Herramientas experimentales o internas pueden usar una version mas ligera. Si un servicio vale la pena desplegar, vale la pena documentar quien es dueno y como arreglarlo cuando se rompe.

### Que pasa cuando el ownership cambia?

Actualiza el documento inmediatamente. Programa una reunion de handoff donde el dueno saliente recorra incidentes recientes, riesgos conocidos, y pasos complicados de deploy. El documento captura hechos; el handoff captura contexto.
