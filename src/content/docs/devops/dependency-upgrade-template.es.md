---



contentType: docs
slug: dependency-upgrade-template
title: "Runbook para Actualización de Dependencias"
description: "Un runbook paso a paso para actualizar las dependencias del proyecto de forma segura."
metaDescription: "Sigue este runbook de actualización de dependencias para actualizar paquetes, probar cambios incompatibles y revertir de forma segura si surgen problemas."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - dependencies
  - upgrade
  - runbook
  - maintenance
relatedResources:
  - /docs/runbook-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/changelog-template
  - /docs/on-call-runbook-template
  - /guides/event-driven-architecture-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Sigue este runbook de actualización de dependencias para actualizar paquetes, probar cambios incompatibles y revertir de forma segura si surgen problemas."
  keywords:
    - devops
    - dependencias
    - actualización
    - runbook
    - mantenimiento



---

## Visión General

Las dependencias desactualizadas exponen los proyectos a vulnerabilidades de seguridad, problemas de compatibilidad y capacidades faltantes. Este runbook proporciona un proceso repetible para actualizar dependencias de forma segura con un riesgo mínimo.

## Cuándo Usar

Usa este recurso cuando:
- Se publique un parche de seguridad crítico para una dependencia directa o transitiva
- Se requieran actualizaciones de versiones mayores para soporte a largo plazo
- Haya ventanas de mantenimiento trimestrales o por sprint para actualizar dependencias

## Solución

```markdown
# Runbook de Actualización de Dependencias

## 1. Preparación

- [ ] Identificar la dependencia y la versión objetivo
- [ ] Revisar el changelog / notas de la versión en busca de cambios incompatibles
- [ ] Comprobar issues abiertos en el repositorio de la dependencia relacionados con la actualización
- [ ] Crear una rama dedicada: `deps/upgrade-<nombre>-<version>`
- [ ] Asegurar que el CI esté verde en la rama principal actual

## 2. Actualización

- [ ] Actualizar la versión en `package.json`, `requirements.txt`, `pom.xml`, etc.
- [ ] Ejecutar el comando de instalación de dependencias
- [ ] Revisar advertencias de dependencias peer o conflictos
- [ ] Ejecutar pruebas automatizadas (unitarias, integración, lint)
- [ ] Ejecutar pruebas de humo contra un entorno local o staging

## 3. Validación

- [ ] Revisar informes de cobertura de pruebas en busca de regresiones
- [ ] Comprobar logs de la aplicación en busca de nuevas advertencias o errores
- [ ] Verificar rutas críticas del usuario manualmente si cambió el comportamiento
- [ ] Ejecutar escaneo de seguridad (`npm audit`, `safety check`, OWASP dependency check)

## 4. Plan de Reversión

- [ ] Etiquetar el último commit conocido como bueno antes del merge
- [ ] Documentar cualquier cambio manual de datos o configuración requerido
- [ ] Confirmar que la reversión puede ejecutarse en 15 minutos

## 5. Merge y Monitoreo

- [ ] Abrir un pull request con resumen del changelog
- [ ] Desplegar en staging y dejarlo madurar por 24 horas
- [ ] Desplegar en producción durante una ventana de bajo tráfico
- [ ] Monitorear tasas de error y latencia durante 48 horas después del despliegue
```

## Explicación

El runbook divide las actualizaciones en **cinco fases** para reducir el riesgo. La preparación evita sorpresas revisando changelogs. La fase de Actualización aísla los cambios en una rama. La Validación usa pruebas automatizadas y manuales. El Plan de Reversión garantiza una recuperación rápida. Merge y Monitoreo completa el ciclo con observación en producción.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Parche de seguridad | Rama de vía rápida | Omitir tiempo de maduración solo para CVEs con exploits activos |
| Versión mayor | Despliegue con feature flags | Aislar nuevo comportamiento bajo banderas durante la transición |
| Monorepo | Actualizaciones en lote | Actualizar librerías compartidas primero, luego los consumidores |

## Lo que funciona

1. Actualizar una dependencia mayor a la vez para simplificar la depuración
2. Fijar versiones exactas en archivos de bloqueo (`package-lock.json`, `poetry.lock`) y commitearlos
3. Usar herramientas automatizadas como Dependabot o Renovate para parches y menores
4. Mantener un calendario de deprecación para dependencias en fin de vida
5. Documentar todos los cambios incompatibles y pasos de migración en el pull request

## Errores Comunes

1. Actualizar múltiples dependencias mayores simultáneamente, haciendo difícil atribuir fallos
2. Ignorar advertencias de dependencias peer que causan errores en tiempo de ejecución
3. Omitir el plan de reversión, extendiendo el tiempo de inactividad cuando surgen problemas
4. No revisar cambios de dependencias transitivas en archivos de bloqueo
5. Desplegar durante tráfico pico sin un período de maduración

## Preguntas Frecuentes

### ¿Con qué frecuencia debo actualizar las dependencias?

Versiones de parche: semanalmente o automatizado. Versiones menores: mensualmente. Versiones mayores: trimestralmente o cuando se requiera.

### ¿Qué pasa si una dependencia transitiva tiene un CVE?

Usa `npm audit fix`, `pip-audit`, o campos de override/resolution para forzar una versión transitiva parcheada sin esperar a la dependencia directa.

### ¿Debo commitear los archivos de bloqueo?

Sí. Los archivos de bloqueo aseguran builds reproducibles entre entornos y hacen los diffs revisables durante las actualizaciones.

## Soluciones Avanzadas

### Pipeline automatizado de actualización con Renovate

Configura Renovate para automatizar actualizaciones de parches y menores con reglas de auto-merge:

```json
{
  "extends": ["config:base"],
  "schedule": ["before 6am on Monday"],
  "automerge": true,
  "automergeType": "pr",
  "packageRules": [
    {
      "updateTypes": ["patch", "minor"],
      "automerge": true,
      "groupName": "patch and minor updates"
    },
    {
      "updateTypes": ["major"],
      "automerge": false,
      "labels": ["major-upgrade", "needs-review"],
      "dependencyDashboardApproval": true
    },
    {
      "depTypeList": ["devDependencies"],
      "automerge": true,
      "schedule": ["at any time"]
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "schedule": ["at any time"]
  }
}
```

### Script de reversión para actualizaciones npm

Un script bash para revertir rápidamente una actualización de dependencia fallida:

```bash
#!/bin/bash
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)
TAG="pre-upgrade-$(date +%Y%m%d-%H%M%S)"

# Crear un tag de seguridad antes de proceder
git tag "$TAG"
echo "Created safety tag: $TAG"

# Si la actualización falla, revertir:
# git checkout "$TAG" -- package.json package-lock.json
# npm ci
# git checkout main
# git branch -D "$BRANCH"
# git tag -d "$TAG"

echo "To rollback: git checkout $TAG -- package.json package-lock.json && npm ci"
```

### Actualización de dependencias Python con pip-tools

Usa `pip-tools` para gestionar requirements con archivos separados de origen y bloqueo:

```bash
#!/bin/bash
set -euo pipefail

# requirements.in contiene deps sin pinear o loosely pinedas
# requirements.txt es el output bloqueado y fully resuelto

# Actualizar un solo paquete a una versión específica
echo "package-name==2.0.0" >> requirements.in

# Recompilar requirements bloqueados
pip-compile --upgrade-package package-name --output-file requirements.txt requirements.in

# Verificar que no haya deps transitivas en conflicto
pip install -r requirements.txt --dry-run

# Ejecutar tests
pytest tests/ -x

# Si todo pasa, commitear ambos archivos
git add requirements.in requirements.txt
git commit -m "deps: upgrade package-name to 2.0.0"
```

### Dashboard de auditoría con npm audit + cyclonedx

Genera un SBOM (Software Bill of Materials) y reporte de auditoría para compliance:

```bash
#!/bin/bash
set -euo pipefail

# Generar SBOM CycloneDX
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Ejecutar audit y exportar JSON
npm audit --json > audit-report.json

# Extraer vulnerabilidades high y critical
node -e "
const audit = require('./audit-report.json');
const vulns = audit.vulnerabilities || {};
const high = Object.entries(vulns).filter(([k,v]) => v.severity === 'high' || v.severity === 'critical');
if (high.length > 0) {
  console.log('HIGH/CRITICAL vulnerabilities:');
  high.forEach(([name, info]) => console.log('  ' + name + ': ' + info.severity));
  process.exit(1);
} else {
  console.log('No high or critical vulnerabilities found.');
}
"
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [On-Call Runbook Template](/es/docs/on-call-runbook-template/).

1. **Usa `npm ci` en vez de `npm install` en CI.** El comando `ci` borra `node_modules` e instala exactamente desde el lock file. Falla si el lock file está desincronizado con `package.json`, detectando actualizaciones incompletas:

```yaml
# Ejemplo en GitHub Actions
- name: Install dependencies
  run: npm ci
```

2. **Configura alertas de seguridad de Dependabot como checks obligatorios.** Configura reglas de branch protection para que los PRs de seguridad de Dependabot bypassen revisión pero sigan necesitando CI verde:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      patch-and-minor:
        update-types: ["patch", "minor"]
```

## Errores Comunes Adicionales

1. **Actualizar devDependencies sin testear el pipeline de build.** Dev dependencies como webpack, babel o eslint pueden romper el output del build incluso si los tests pasan. Siempre ejecuta un build de producción completo después de actualizar devDependencies:

```bash
npm run build && npm run test
```

2. **Ignorar advertencias de deprecación durante las actualizaciones.** Las advertencias de deprecación en una versión menor suelen convertirse en errores en la siguiente versión mayor. Trackéalas en tu issue tracker:

```bash
# Capturar advertencias de deprecación durante los tests
npm test 2>&1 | grep -i "deprecat" > deprecation-warnings.txt
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo una dependencia que ya no tiene mantenimiento?

Si la dependencia no tiene mantenimiento, evalúa alternativas, haz un fork si la licencia lo permite, o véndela dentro de tu codebase. Agrégala a tu calendario de deprecación con fecha objetivo de reemplazo. Ejecuta un escaneo de seguridad en la última versión publicada para identificar vulnerabilidades conocidas.

### ¿Cuál es la diferencia entre tilde (`~`) y caret (`^`) en semver?

Caret (`^`) permite actualizaciones a cualquier versión que no modifique el dígito no-cero más a la izquierda. Tilde (`~`) permite solo cambios a nivel de parche. Por ejemplo, `^1.2.3` permite `1.x.x` mientras que `~1.2.3` permite `1.2.x`. Usa caret para la mayoría de dependencias y tilde para paquetes críticos donde quieres control más estricto.

### ¿Debo usar una herramienta de monorepo para gestion de dependencias?

Herramientas de monorepo como Nx, Turborepo o Lerna proporcionan hoisting de dependencias a nivel workspace, caching y comandos de actualizacion batch. Ayudan cuando multiples paquetes comparten dependencias y necesitas coordinar upgrades entre ellos. Para proyectos pequenos, un solo `package.json` con tooling estandar es suficiente.
