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
  - /docs/container-security-baseline-template
  - /docs/rbac-policy-template
  - /docs/secret-rotation-schedule-template
  - /docs/dependency-vulnerability-report-template
  - /docs/encryption-key-lifecycle-template
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


- For alternatives, see [CI/CD Security: Harden Your Pipelines and Prevent Supply](/es/guides/ci-cd-security-guide/).

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

## Configuracion de Seguridad de GitHub Actions

```yaml
name: Secure CI Pipeline
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/ci-role
          aws-region: us-east-1
          # Sin claves estaticas - solo OIDC

      - name: Build and sign
        uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign-blob --yes artifact.tar.gz

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Scan dependencies
        uses: github/codeql-action/init@v3
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/analyze@v3
```

## Ejemplo de Provenance SLSA

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    {
      "name": "artifact.tar.gz",
      "digest": { "sha256": "abc123..." }
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v1",
  "predicate": {
    "builder": { "id": "github-actions" },
    "buildType": "https://github.com/actions/runner",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/org/repo",
        "digest": { "sha1": "commit-hash" }
      }
    },
    "materials": [
      { "uri": "git+https://github.com/org/repo", "digest": { "sha1": "commit-hash" } }
    ]
  }
}
```

## Checklist de Auditoria de Seguridad del Pipeline

| Control | Verificado | Notas |
|---------|-----------|-------|
| Sin secretos de larga duracion en CI | | |
| OIDC para autenticacion cloud | | |
| Actions fijadas a SHA | | |
| Permisos minimos por job | | |
| Proteccion de rama en main | | |
| Artefactos firmados verificados | | |
| SBOM generado por build | | |
| Escaneo de dependencias en pipeline | | |
| Runners aislados por entorno | | |
| Retencion de logs de auditoria > 90 dias | | |


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


### Como aseguramos los secretos en pipelines de CI/CD?

Usa un gestor de secretos dedicado (HashiCorp Vault, AWS Secrets Manager, GitHub Actions secrets). Nunca hardcodees secretos en archivos de pipeline o variables de entorno. Usa OIDC para autenticacion cloud en lugar de claves estaticas. Rota los secretos trimestralmente y despues de cualquier compromiso sospechado. Para runners auto-gestionados, asegurate de que los secretos se limpien de los logs y que el runner sea efimero.

### Cual es la diferencia entre SAST, DAST y SCA?

SAST (Static Application Security Testing) analiza codigo fuente en busca de vulnerabilidades sin ejecutarlo. DAST (Dynamic Application Security Testing) prueba una aplicacion en ejecucion desde el exterior. SCA (Software Composition Analysis) escanea dependencias en busca de vulnerabilidades conocidas. Los tres deben ejecutarse en tu pipeline: SAST en cada PR, SCA en cada merge, DAST en despliegues de staging.

### Deberiamos usar runners auto-gestionados o gestionados por la nube?

Los runners gestionados por la nube (GitHub-hosted, GitLab SaaS) son efimeros y aislados por defecto, reduciendo la superficie de ataque. Los runners auto-gestionados son necesarios para acceso a red privada o hardware especializado, pero requieren endurecimiento: instancias efimeras, sin estado compartido entre jobs, y segmentacion de red entre entornos de compilacion y produccion. Nunca ejecutes despliegues de produccion en el mismo runner que builds de PRs no confiables.

### Como implementamos doble aprobacion para despliegues a produccion?

Configura tu pipeline para requerir aprobacion manual de dos miembros diferentes del equipo antes de desplegar a produccion. Usa reglas de proteccion de entorno en GitHub Actions o entornos protegidos en GitLab. Los aprobadores no deben ser la misma persona que disparo el pipeline. Registra todas las aprobaciones con timestamp, usuario y razon para cumplimiento de auditoria.

### Que es un SBOM y por que lo necesitamos?

Un SBOM (Software Bill of Materials) es un inventario legible por maquina de todos los componentes en un artefacto de software, incluyendo dependencias transitivas, versiones y licencias. Permite escaneo de vulnerabilidades, cumplimiento de licencias y transparencia de cadena de suministro. Genera un SBOM para cada build usando herramientas como syft, trivy o el grafo de dependencias de GitHub. Almacena SBOMs junto con los artefactos y conservalos durante el tiempo de vida del software desplegado.


### Que es cosign y como funciona?

Cosign es una herramienta del proyecto Sigstore para firmar y verificar imagenes de contenedores y blobs. Usa firma sin claves con tokens OIDC de tu proveedor de CI, eliminando la necesidad de gestionar claves de firma. La firma se almacena en un log de transparencia (Rekor), haciendolo verificable publicamente. Integra cosign en tu pipeline para firmar artefactos despues del build y verificar firmas antes del despliegue.

### Como manejamos secretos para runners auto-gestionados?

Usa runners efimeros que se destruyen despues de cada job. Inyecta secretos en tiempo de ejecucion desde un gestor de secretos (Vault, AWS Secrets Manager). Nunca almacenes secretos en el disco del runner. Limpia valores de secretos de los logs del pipeline usando masking. Rota las credenciales del runner frecuentemente y audita los logs de acceso del runner. Para entornos sensibles, usa pools de runners dedicados por entorno con aislamiento de red.

### Que es el framework SLSA?

SLSA (Supply-chain Levels for Software Artifacts) es un framework de seguridad con cuatro niveles de assurance. El Nivel 1 requiere generacion de provenance. El Nivel 2 agrega plataforma de build hospedada y provenance no falsificable. El Nivel 3 requiere builds aislados y provenance firmada. El Nivel 4 agrega revision de dos partes y builds reproducibles. La mayoria de organizaciones deberian apuntar a SLSA Nivel 3 para software critico de produccion.

Deberiamos escanear imagenes Docker en el pipeline?

Si. Escanea imagenes en dos etapas: despues del build (para retroalimentacion rapida sobre CVEs conocidos) y antes del despliegue (para detectar vulnerabilidades recientemente divulgadas). Usa Trivy, Grype o Snyk Container. Configura el escaneo para fallar en vulnerabilidades criticas pero permite overrides para riesgos aceptados con justificacion documentada. Almacena los resultados del escaneo como artefactos del pipeline para auditoria.

### Como manejamos la seguridad de actions de terceros?

Fija todas las GitHub Actions de terceros a un SHA de commit especifico, no a un tag de version. Revisa el codigo fuente del action antes del primer uso. Usa Dependabot para monitorear avisos de seguridad en actions fijadas. Ejecuta actions no confiables en runners aislados con permisos minimos. Para pipelines criticos, mantiene un fork de actions aprobadas y revisa actualizaciones antes de mergear.

### Que es un build reproducible y por que importa?

Un build reproducible produce salida identica dado el mismo codigo fuente y entorno de compilacion. Esto significa que cualquiera puede verificar que un binario se construyo desde la fuente reclamada reconstruyendolo y comparando checksums. Los builds reproducibles son un requisito de SLSA Nivel 4. Logra reproducibilidad fijando timestamps, ordenando listas de archivos y eliminando entradas no deterministas como seeds aleatorios o llamadas de red durante el build.