---
contentType: docs
slug: ci-cd-pipeline-security-template
title: "Plantilla de Seguridad de Pipeline CI/CD"
description: "Una plantilla para asegurar pipelines de compilacion y despliegue contra filtraciones de credenciales, manipulacion, ataques a la cadena de suministro y despliegues no autorizados."
metaDescription: "Asegura pipelines CI/CD con esta plantilla. Cubre secretos, endurecimiento de runners, firma de artefactos, proteccion de ramas y puertas de despliegue."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - ci-cd-security
  - supply-chain
  - pipeline-hardening
  - secrets-management
  - devsecops
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/devops/rbac-policy-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Asegura pipelines CI/CD con esta plantilla. Cubre secretos, endurecimiento de runners, firma de artefactos, proteccion de ramas y puertas de despliegue."
  keywords:
    - seguridad de pipeline CI/CD
    - seguridad de la cadena de suministro
    - endurecimiento de pipelines
    - pipeline de despliegue seguro
    - plantilla DevSecOps
---

## Descripcion General

Los pipelines CI/CD son un objetivo de alto valor para atacantes porque tienen acceso al codigo fuente, secretos de compilacion y rutas de despliegue a produccion. Un pipeline comprometido puede introducir malware, exfiltrar datos o desplegar cambios no autorizados. Esta plantilla define controles para proteger la integridad del codigo, la seguridad de los runners, los secretos y las aprobaciones de despliegue.

## Cuando Usar

- Configurar una nueva plataforma CI/CD.
- Revisar o mejorar un pipeline existente.
- Prepararse para una auditoria de seguridad de la cadena de suministro.
- Despues de un compromiso del sistema de compilacion o despliegue no autorizado.
- Integrar controles DevSecOps en los flujos de trabajo de ingenieria.

## Prerequisitos

- Un sistema de control de versiones con proteccion de ramas y registro de auditoria.
- Una plataforma CI/CD como GitHub Actions, GitLab CI, Azure DevOps o Jenkins.
- Una solucion de gestion de secretos para credenciales de pipeline.
- Un proceso de revision y aprobacion de codigo antes de mergear.
- Duenos por parte de platform engineering, seguridad y release management.

## Solucion

### Plantilla

#### 1. Seguridad del Control de Codigo

| Control | Requisito | Verificacion |
|---------|-----------|--------------|
| Proteccion de ramas | Revisiones requeridas antes de mergear a main | Configuracion del repositorio |
| Commits firmados | Requerir commits verificados para cuentas privilegiadas | Configuracion de Git |
| Control de acceso | Acceso de minimo privilegio a repositorios | Revision de RBAC |
| Registro de auditoria | Todos los pushes, merges y cambios de permisos registrados | Logs de la plataforma |
| Dependencias fijadas | Lockfiles y versiones fijas para compilaciones reproducibles | Archivos del repositorio |
| Escaneo de secretos | Deteccion automatizada de secretos en commits | Pre-commit hooks + CI |

#### 2. Configuracion del Pipeline

| Control | Requisito | Verificacion |
|---------|-----------|--------------|
| Definiciones inmutables de pipeline | Pipelines almacenados como codigo y revisados | Archivos del repositorio |
| Sin secretos en codigo | Secretos cargados desde vault, variables de CI u OIDC | Escaneo de secretos |
| Validacion de entradas | Parametros de pipeline validados y saneados | Revision de codigo |
| Aislamiento de runners auto-hospedados | Runners de produccion aislados de runners de desarrollo | Configuracion de runners |
| Runners efimeros | Runner nuevo por compilacion para reducir persistencia | Configuracion de runners |
| Provenance del pipeline | Provenance SLSA generado para artefactos | Herramienta de attestacion |

#### 3. Gestion de Secretos

| Tipo de Secreto | Almacenamiento | Rotacion | Alcance |
|-----------------|----------------|----------|---------|
| Credenciales cloud | Vault externo u OIDC | 90 dias | Por ambiente |
| Tokens de registro de contenedores | Vault o tokens de CI de corta duracion | 90 dias | Por pipeline |
| Claves de firma | Respaldada por hardware o KMS | 180 dias | Cuentas de servicio limitadas |
| Claves API | Vault o secret manager | 90 dias | Permisos minimos requeridos |
| Contraseñas de base de datos | Secretos dinamicos de Vault | 24 horas | Por ejecucion de pipeline |

#### 4. Seguridad de la Compilacion

| Control | Requisito | Verificacion |
|---------|-----------|--------------|
| Escaneo de dependencias | Todas las dependencias escaneadas por CVEs conocidos | Scanner en CI |
| Analisis estatico | SAST ejecutado en cada pull request | Job de CI |
| Escaneo de imagenes de contenedores | Imagen base y capas escaneadas antes de push | Escaneo de registro |
| Compilaciones reproducibles | Misma fuente produce mismo artefacto | Verificacion de compilacion |
| Firma de artefactos | Todos los artefactos firmados con identidad de compilacion | Verificacion de firma |
| Generacion de SBOM | Bill of materials generado por compilacion | Salida de CI |

#### 5. Seguridad del Despliegue

| Control | Requisito | Verificacion |
|---------|-----------|--------------|
| Puertas de despliegue | Aprobacion manual o automatizada antes de produccion | Reglas de pipeline |
| Separacion de ambientes | Credenciales de produccion no disponibles en desarrollo | Alcance de secretos |
| Plan de rollback | Disparador de rollback automatico ante falla | Definicion de pipeline |
| Despliegues inmutables | Artefactos desplegados por referencia, no recompilados | Logs de despliegue |
| Deteccion de drift | Cambios no autorizados en produccion detectados | Herramienta de monitoreo |
| Pista de auditoria | Quien desplego que, cuando y por que | Logs de despliegue |

#### 6. Respuesta a Incidentes

| Escenario | Respuesta | Dueno |
|-----------|-----------|-------|
| Secreto filtrado | Rotar secreto, revocar tokens, auditar uso | Equipo de seguridad |
| Commit malicioso | Revertir, investigar, revocar credenciales | Equipo de plataforma |
| Runner comprometido | Terminar runner, reconstruir, revisar logs | Equipo de plataforma |
| Despliegue no autorizado | Rollback, congelar pipeline, auditar | Release manager |
| Artefacto manipulado | Bloquear despliegue, trazar provenance | Equipo de seguridad |

## Explicacion

La seguridad del pipeline es un subconjunto de la seguridad de la cadena de suministro. Al proteger la fuente, el proceso de compilacion y la ruta de despliegue, la organizacion reduce el riesgo de que codigo malicioso llegue a produccion. La plantilla mapea cada control a un metodo de verificacion, haciendola adecuada para auditorias y mejora continua.

## Variantes

- **Checklist de seguridad de GitHub Actions**: Se enfoca en fijar actions, permisos de workflows y workflows reutilizables.
- **Plantilla de seguridad de GitLab CI**: Incluye alcance de tokens de jobs de CI/CD, runners protegidos y pipelines de cumplimiento.
- **Plantilla de endurecimiento de Jenkins**: Cubre gestion de plugins, aislamiento de agentes y sandboxing de Groovy.
- **Pipeline nativa de contenedores**: Enfatiza firma de imagenes, escaneo de registro y admission de Kubernetes.
- **Pipeline de alta cumplimiento**: Agrega SLSA Nivel 3, doble aprobacion y SBOMs firmados para entornos regulados.

## Lo que funciona

- Almacena las definiciones de pipeline como codigo y revisalas como codigo de aplicacion.
- Utiliza credenciales de corta duracion y OIDC en lugar de secretos de larga duracion.
- Escanea dependencias antes de mergear y antes de desplegar.
- Firma artefactos y verifica firmas antes del despliegue.
- Separa los ambientes de compilacion y produccion fisica o logicamente.
- Requiere aprobacion humana para despliegues en produccion.
- Genera y conserva SBOMs para cada release.
- Monitorea la actividad del pipeline en busca de comportamiento inusual.

## Errores Comunes

- Almacenar secretos en variables de entorno o archivos de pipeline.
- Usar actions de terceros sin fijarlas o revisarlas.
- Permitir que cualquier rama despliegue a produccion.
- Ejecutar cargas de trabajo de produccion y desarrollo en el mismo runner.
- Omitir escaneos de seguridad para despliegues de hotfix.
- No rotar credenciales de pipeline despues de un compromiso.
- Confiar en artefactos sin verificar su firma.

## FAQs

### Cual es el riesgo mas grande en CI/CD?

El riesgo de alto impacto mas comun es el robo de credenciales de un runner o archivo de pipeline, lo que permite a un atacante acceder a produccion o manipular compilaciones.

### Como balanceamos seguridad con despliegues rapidos?

Automatiza los controles de seguridad, utiliza escaneres rapidos y requiere aprobacion solo para produccion. El escaneo shift-left da retroalimentacion rapida sin bloquear el pipeline.

### Que es la provenance SLSA?

SLSA es un framework para la seguridad de la cadena de suministro. La provenance registra como se construyo un artefacto, incluyendo repositorio fuente, comando de compilacion y dependencias, facilitando la deteccion de manipulaciones.
