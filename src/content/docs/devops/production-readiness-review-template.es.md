---
contentType: docs
slug: production-readiness-review-template
title: "Plantilla de Production Readiness Review"
description: "Una checklist essential para verificar que un servicio, feature, o sistema esta listo para despliegue en produccion y operacion continua."
metaDescription: "Asegura la preparacion para produccion con esta checklist de revision. Cubre monitoreo, SLOs, rollback, seguridad, docs y procedimientos operativos."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - production-readiness
  - checklist
  - deployment
  - monitoring
  - operations
relatedResources:
  - /docs/devops/feature-specification-template
  - /docs/devops/service-ownership-document-template
  - /docs/devops/incident-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Asegura la preparacion para produccion con esta checklist de revision. Cubre monitoreo, SLOs, rollback, seguridad, docs y procedimientos operativos."
  keywords:
    - revision de preparacion para produccion
    - checklist de produccion
    - preparacion para deployment
    - checklist de go-live
    - lanzamiento de servicio
---

## Descripcion General

Enviar a produccion no es la linea de meta. Es la linea de salida para la responsabilidad operativa. Un Production Readiness Review (PRR) es un checkpoint estructurado que verifica que un servicio o feature esta listo para correr en produccion: puede monitorearse, revertirse, asegurarse, y operarse por personas distintas al autor. Los PRRs previenen las sorpresas a las 3 AM donde nadie sabe como reiniciar un servicio, como se ve "normal", o como revertir un mal deploy.

## Cuando Usar

Usa esta plantilla cuando:
- Un nuevo servicio se despliega a produccion por primera vez
- Un feature o refactor mayor cambia como opera un servicio existente
- Un servicio cambia de tier (ej., de herramienta interna Tier 3 a customer-facing Tier 1)
- Adquieres o migras un servicio de otro equipo o empresa
- Una auditoria requiere evidencia documentada de preparacion para produccion

## Prerrequisitos

Antes de conducir un PRR:
- [ ] El servicio o feature esta completo en codigo y pasa todos los tests automaticos
- [ ] Existe un documento de ownership de servicio (o se creara como parte de esta revision)
- [ ] La rotacion de on-call esta definida y entrenada
- [ ] Existen runbooks para escenarios comunes de falla
- [ ] Un procedimiento de rollback ha sido probado en un ambiente no productivo

## Solucion

```markdown
# Production Readiness Review: `<Servicio / Feature>`

> Revisor: ______ | Fecha: ______ | Estado: Aprobado / Condicional / Rechazado
> Dueno del servicio: ______ | Equipo: ______ | Target de release: ______

---

## 1. Definicion del Servicio

- [ ] El proposito del servicio esta documentado y entendido por ingenieros de on-call
- [ ] El tier de servicio esta definido (1 / 2 / 3) y coincide con requerimientos operacionales
- [ ] El documento de ownership de servicio esta completo y accesible
- [ ] Las dependencias (upstream y downstream) estan documentadas
- [ ] La clasificacion de datos esta definida (Publico / Interno / Confidencial / Restringido)

## 2. Arquitectura y Calidad de Codigo

- [ ] La arquitectura fue revisada y aprobada por un ingeniero senior o arquitecto
- [ ] El codigo sigue estandares del equipo (linting, formato, cobertura de tests)
- [ ] No hay vulnerabilidades de seguridad conocidas en dependencias (escaneadas en 30 dias)
- [ ] Los secretos se manejan via secret manager, no hardcodeados ni en archivos de config
- [ ] No hay puntos unicos de falla sin mitigaciones documentadas

## 3. Testing

- [ ] La cobertura de unit tests esta por encima del minimo del equipo (usualmente 70-80%)
- [ ] Los integration tests cubren dependencias externas y caminos criticos
- [ ] Los load tests confirman que el servicio maneja el trafico pico esperado
- [ ] Los chaos o failure injection tests verifican degradacion graceful
- [ ] Los end-to-end tests cubren el journey completo del usuario donde aplica

## 4. Observabilidad

- [ ] Se emiten metricas para tasa de requests, errores, y duracion (RED)
- [ ] Los logs son estructurados, correlacionados con trace IDs, y consultables
- [ ] El distributed tracing esta configurado para requests cross-servicio
- [ ] Existen dashboards para salud del servicio y metricas clave de negocio
- [ ] Las reglas de alertado estan configuradas con severidad y umbrales apropiados
- [ ] Los ingenieros de on-call pueden distinguir entre sintomas y causas

## 5. Confiabilidad y Resiliencia

- [ ] Existe endpoint de health check y es usado por load balancers
- [ ] Circuit breakers o bulkheads protegen contra fallas en cascada
- [ ] Timeouts y retries estan configurados para llamadas externas
- [ ] Rate limiting esta en place para endpoints publicos o de socios
- [ ] Las conexiones a base de datos estan pooleadas y acotadas
- [ ] El servicio degrada gracefulmente cuando dependencias fallan

## 6. Despliegue y Release

- [ ] Existe pipeline CI/CD y esta verde
- [ ] Los deploys son automatizados; no se requieren cambios manuales en produccion
- [ ] Canary o staged rollout esta configurado para servicios de alto tier
- [ ] Feature flags estan disponibles para cambios riesgosos o irreversibles
- [ ] Las migraciones de base de datos son compatibles hacia atras o tienen rollback probado
- [ ] El procedimiento de rollback esta documentado y probado en los ultimos 30 dias

## 7. Seguridad

- [ ] Autenticacion y autorizacion estan implementadas correctamente
- [ ] Validacion y sanitizacion de inputs protegen contra ataques de inyeccion
- [ ] Encripcion en transito (TLS 1.2+) esta forzada
- [ ] Datos sensibles estan encriptados en reposo
- [ ] Revision de seguridad completada para cambios de auth, pagos, o manejo de datos
- [ ] Resultados de pentest o security scan revisados y remediados

## 8. Datos y Estado

- [ ] Cambios de esquema de base de datos fueron revisados por impacto en rendimiento
- [ ] Backups estan configurados y probados (restore verificado en 90 dias)
- [ ] Politicas de retencion de datos estan documentadas y forzadas
- [ ] Requerimientos GDPR / CCPA / compliance se cumplen para datos de usuarios
- [ ] Scripts de migracion son idempotentes y reversibles donde sea posible

## 9. Documentacion

- [ ] El README explica como construir, testear, y ejecutar el servicio localmente
- [ ] La documentacion de API esta actualizada (OpenAPI / Swagger / equivalente)
- [ ] Existen runbooks para: deploy, rollback, incidentes comunes, y escalamiento
- [ ] El documento de handoff de on-call esta actualizado con cambios y riesgos recientes
- [ ] Los ADRs cubren decisiones de diseno mayores

## 10. Preparacion Operacional

- [ ] La rotacion de on-call esta cubierta y entrenada en este servicio
- [ ] Las alertas de paging llegan a las personas correctas con contexto útil
- [ ] La ruta de escalamiento esta documentada y los contactos verificados
- [ ] Los runbooks fueron probados por alguien que no escribio el servicio
- [ ] Los pasos de verificacion post-deploy estan definidos y automatizados donde sea posible

---

## Notas de Revision

| Item | Hallazgo | Riesgo | Mitigacion / Accion | Dueno | Fecha limite |
|------|----------|--------|---------------------|-------|-------------|
| ______ | ______ | Alto / Medio / Bajo | ______ | ______ | ______ |

## Sign-Off

| Rol | Nombre | Fecha | Firma (aprobar / bloquear) |
|-----|--------|-------|---------------------------|
| Dueno de ingenieria | ______ | ______ | ______ |
| Product owner | ______ | ______ | ______ |
| Revisor de seguridad | ______ | ______ | ______ |
| SRE / Plataforma | ______ | ______ | ______ |
```

## Explicacion

El PRR esta organizado en diez dominios que cubren el ciclo de vida completo de operar software en produccion. Cada dominio tiene checkboxes concretas que pueden verificarse objetivamente. La seccion de sign-off asegura que ninguna persona pueda declarar un servicio listo sin input de ingenieria, producto, seguridad, y operaciones. La tabla de notas de revision captura gaps que no son bloqueadores pero necesitan seguimiento.

## Ejemplo de PRR Completado

```markdown
# PRR: Servicio de Notificaciones en Tiempo Real

## Servicio
- Nombre: notification-service
- Tipo: Microservicio (Go)
- Tier: 1 (Critico para experiencia de usuario)
- Fecha de revision: 2026-07-11

## Hallazgos de Revision

| Item | Hallazgo | Riesgo | Mitigacion | Dueno | Fecha |
|------|----------|--------|------------|-------|-------|
| Observabilidad | No hay dashboard de WebSocket | Medio | Crear dashboard antes de lanzar | alice | 2026-07-15 |
| Alertas | No hay alerta para conexiones rechazadas | Alto | Agregar alerta antes de lanzar | bob | 2026-07-14 |
| Seguridad | JWT validacion falta test de expiracion | Alto | Agregar test antes de lanzar | carol | 2026-07-14 |
| Documentacion | Runbook de rollback no existe | Medio | Escribir runbook antes de lanzar | alice | 2026-07-16 |
| Operacional | On-call no entrenado en WebSocket | Medio | Sesion de capacitacion | platform | 2027-07-18 |

## Sign-Off

| Rol | Nombre | Fecha | Decision |
|-----|--------|-------|----------|
| Dueno de ingenieria | alice | 2026-07-18 | Aprobar condicional |
| Product owner | dave | 2026-07-18 | Aprobar |
| Revisor de seguridad | carol | 2026-07-18 | Aprobar (test agregado) |
| SRE / Plataforma | bob | 2026-07-18 | Aprobar condicional |

## Decision
Aprobado condicionalmente. Lanzamiento permitido despues de
completar los 3 items de riesgo Alto (alertas, seguridad, test).
Items de riesgo Medio rastreados con fechas limite pero no
bloquean el lanzamiento.
```


## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Release de app mobile | Agregar revision de app store, porcentaje de rollout, y monitoreo con crashlytics | Los releases mobile son mas dificiles de revertir |
| Plataforma de datos / pipeline | Agregar checks de calidad de datos, plan de evolucion de esquema, y evaluacion de impacto a consumidores | Los cambios de datos afectan a equipos downstream silenciosamente |
| Integracion de terceros | Agregar revision de SLA de vendor, terminos de contrato, y comportamiento de fallback | No controlas el upstream |
| Lanzamiento critico de seguridad | Requerir revision de seguridad obligatoria y sign-off del equipo de seguridad | Auth, pagos, y datos de salud |
| Promocion de herramienta interna | Reducir requerimientos de observabilidad y on-call; enfocarse en documentacion y soporte | Las herramientas internas tienen estandares operativos diferentes |

## Lo que funciona

1. Corre el PRR temprano. No esperes al dia del lanzamiento; identifica gaps mientras hay tiempo de arreglarlos
2. Hazlo una conversacion, no una puerta. El objetivo es preparacion, no papeleo; colabora en mitigaciones
3. Rastrea gaps explicitamente. Items no chequeados deberian tener duenos y fechas limite, no ser ignorados
4. Revisa trimestralmente servicios existentes. Los servicios se desvian de la preparacion con el tiempo; programa revisiones periodicas
5. Automatiza lo que puedas. Reportes de cobertura, scans de dependencias, y checks de salud de deploy deberian alimentar el PRR automaticamente

## Errores Comunes

1. Tratar el PRR como un evento unico. La preparacion para produccion decae; programa re-revisiones para cambios mayores
2. Saltarse la prueba de rollback. Lo unico peor que un mal deploy es no saber como deshacerlo
3. No involucrar a operaciones temprano. SREs y equipos de plataforma detectan restricciones que desarrolladores omiten
4. Chequear casillas sin verificar. "tenemos monitoreo" no es suficiente; confirma que los dashboards son utiles y las alertas son útiles
5. Olvidar el lado humano. Los ingenieros de on-call necesitan entrenamiento, no solo documentacion; verifica que han corrido los runbooks

## Preguntas Frecuentes

### Quien corre el production readiness review?

El dueno del servicio lo coordina. Los revisores incluyen al menos un ingeniero familiarizado con el servicio, un SRE o ingeniero de plataforma, y seguridad para servicios sensibles. Producto puede hacer sign-off pero tipicamente no es revisor tecnico.

### Que pasa si la revision falla?

El equipo aborda los gaps, reprograma la revision, y no despliega a produccion hasta obtener sign-off. Los aprobados condicionalmente son aceptables si los gaps se rastrean con duenos y fechas limite que no bloqueen el lanzamiento.

### Deberiamos revisar servicios existentes?

Si. Programa PRRs anuales para servicios Tier 1 y Tier 2. Refactors mayores, migraciones de infraestructura, o cambios de equipo deberian disparar una revision fuera de ciclo. El objetivo es preparacion a lo largo del tiempo, no solo en el lanzamiento.


### Como automatizamos partes del production readiness review?

Automatiza checks que son objetivamente verificables: cobertura de tests (umbral > 80%), scans de dependencias (Snyk, Dependabot), scans de seguridad (SAST/DAST), health checks de deploy, y verificacion de configuracion de alertas. Usa CI/CD para ejecutar estos checks automaticamente y generar un reporte. Integra los resultados en el PRR document. Para checks que requieren juicio humano (calidad de runbooks, utilidad de dashboards), usa una checklist estructurada con criterios claros. La automatizacion reduce el esfuerzo de revision y hace los checks reproducibles.

### Que pasa si un servicio falla el PRR repetidamente?

Si un servicio falla el PRR mas de 2 veces: programa una revision con liderazgo de ingenieria para entender por que. Es falta de recursos? Falta de conocimiento? El servicio es demasiado complejo? Considera: asignar un SRE embedido al equipo, simplificar el servicio antes de reintentar, o reducir el alcance del lanzamiento para pasar menos items del PRR. Documenta los gaps recurrentes y escalalos si son sistemicos. Nunca apruebes un servicio que falla el PRR sin un plan de remediacion con fechas limite. Un servicio no listo para produccion es un riesgo para todos.

### Como manejamos el PRR para migraciones de infraestructura?

Para migraciones (ej., cambio de proveedor cloud, migracion de base de datos): ejecuta un PRR completo tanto para el sistema nuevo como para el proceso de migracion. El PRR del sistema nuevo verifica que cumple los estandares operacionales. El PRR del proceso de migracion verifica: plan de rollback, comunicacion con stakeholders, ventana de mantenimiento, monitoreo durante la migracion, y criterios de exito/fracaso. Ejecuta el PRR de migracion al menos 2 semanas antes de la migracion programada. Documenta los riesgos de migracion por separado de los riesgos del servicio.

### Con que frecuencia debemos revisar servicios existentes?

Servicios Tier 1 (criticos): PRR anual completo. Servicios Tier 2 (importantes): PRR cada 18 meses. Servicios Tier 3 (internos): PRR cada 2 anos o cuando hay un cambio mayor. Disparadores para PRR fuera de ciclo: cambio de equipo dueo, refactor arquitectonico mayor, migracion de infraestructura, incidente SEV1 que revela gaps operacionales, o cambio de requisitos de compliance. Mantén un registro de PRRs por servicio con fechas y hallazgos. Incluye el estado del PRR en el dashboard de salud del servicio.

### Cual es el rol del SRE en el production readiness review?

El SRE o ingeniero de plataforma es el revisor tecnico del PRR. Su rol: verificar que las alertas son accionables (no solo ruido), que los dashboards muestran metricas utiles (no vanity metrics), que los runbooks son ejecutables por alguien que no escribio el servicio, que el escalado esta probado, y que el plan de rollback funciona. El SRE no es un aprobador de seguridad o producto — su dominio es la operabilidad. Si el SRE bloquea, el bloqueo es sobre preparacion operacional, no sobre features o prioridades de producto. Documenta los bloqueos del SRE con criterios especificos para activar.
































End of document. Review and update quarterly.