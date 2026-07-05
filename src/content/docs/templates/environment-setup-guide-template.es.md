---
contentType: docs
slug: environment-setup-guide-template
templateType: guideline
title: "Plantilla de Guía de Configuración de Entorno"
description: "Plantilla para documentar cómo configurar ambientes de desarrollo local, staging y producción de forma consistente y reproducible."
metaDescription: "Plantilla de guía de configuración de entorno: documenta pasos de setup local, staging y producción para onboarding consistente y reproducible."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - onboarding
  - template
  - ci-cd
  - automation
relatedResources:
  - /docs/templates/onboarding-guide-template
  - /docs/templates/runbook-template
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de guía de configuración de entorno: documenta pasos de setup local, staging y producción para onboarding consistente y reproducible."
  keywords:
    - guia configuracion entorno template
    - setup desarrollo local
    - documentacion entorno dev
    - onboarding dev setup
    - entorno reproducible
---

# Plantilla de Guía de Configuración de Entorno

Usa esta plantilla para documentar setup de entorno reproducible para nuevos miembros del equipo y pipelines de CI.

## Resumen

La documentación de setup de entorno es lo primero que lee un nuevo desarrollador. Si está desactualizada, incompleta o solo funciona en una máquina, pierdes horas de productividad antes de que se escriba la primera línea de código. Una buena guía de setup lleva a un desarrollador de clone fresco a aplicación corriendo en menos de 15 minutos.

Esta plantilla cubre:

1. **Prerrequisitos** — herramientas, versiones y comandos de instalación
2. **Inicio rápido** — comandos paso a paso desde clone hasta app corriendo
3. **Variables de entorno** — configuración requerida y opcional
4. **Verificación** — cómo confirmar que el setup funcionó
5. **Troubleshooting** — problemas comunes y soluciones

## Cuándo Usar

- **Setup de proyecto nuevo** — documenta requisitos de entorno desde el día uno
- **Onboarding de equipo** — da a nuevos hires un único documento para arrancar
- **Setup de pipeline CI** — usa los mismos pasos en CI que en desarrollo local
- **Migración de entorno** — mudando de un cloud provider a otro
- **Recuperación ante desastres** — rebuildando un entorno de desarrollo desde cero

## Plantilla

```markdown
# Configuración de Entorno: [Nombre del Proyecto]

## Prerrequisitos

| Herramienta | Versión | Comando de Instalación |
|-------------|---------|----------------------|
| Node.js | 20.x | `nvm install 20` |
| Docker | 24.x | [Docker Desktop](...) |
| Git | 2.40+ | `brew install git` |

## Inicio Rápido

```bash
# 1. Clonar repositorio
git clone git@github.com:org/project.git
cd project

# 2. Instalar dependencias
npm install

# 3. Copiar archivo de entorno
cp .env.example .env

# 4. Iniciar servicios
docker compose up -d

# 5. Correr migraciones de base de datos
npm run db:migrate

# 6. Seed de datos de prueba
npm run db:seed

# 7. Iniciar aplicación
npm run dev
```

## Variables de Entorno

| Variable | Requerida | Default | Descripción |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Sí | — | Connection string de PostgreSQL |
| `REDIS_URL` | No | `redis://localhost:6379` | Conexión de cache |
| `API_KEY` | Sí | — | Key de servicio externo |

## Verificación

```bash
# Health check
curl http://localhost:3000/health

# Respuesta esperada
{"status":"ok","version":"2.4.1"}
```

## Troubleshooting

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Puerto 3000 en uso | Otro proceso | `lsof -ti:3000 | xargs kill -9` |
| Migración falla | Schema drift | `npm run db:reset` |
| Docker no inicia | Docker Desktop no corriendo | Iniciar Docker Desktop |
```

## Lifecycle

### Setup inicial

Cuando un proyecto arranca, documenta el setup de entorno desde el día uno. Incluye cada herramienta, versión y paso de configuración. Esto se convierte en la fundación para onboarding y CI.

### Onboarding

Nuevos desarrolladores siguen la guía para arrancar. Trackea cuánto tiempo toma y recolecta feedback. Si un desarrollador se atasca, actualiza la guía para prevenir el mismo issue para la siguiente persona.

### Mantenimiento

Revisa la guía de setup mensualmente. Verifica versiones desactualizadas, links rotos y pasos faltantes. Testea la guía en un entorno limpio trimestralmente para detectar drift.

### Migración

Cuando pases a nuevas herramientas o cloud providers, actualiza la guía primero, luego migra. La guía se convierte en el plan de migración.

## Ejemplo Completo

```markdown
# Configuración de Entorno: StackPractices Web

## Prerrequisitos

| Herramienta | Versión | Comando de Instalación |
|-------------|---------|----------------------|
| Node.js | 20.x | `nvm install 20` |
| Docker | 24.x | [Docker Desktop](https://docker.com) |
| Git | 2.40+ | `brew install git` |
| Astro CLI | 5.x | `npm install -g @astrojs/cli` |

## Inicio Rápido

```bash
# 1. Clonar repositorio
git clone git@github.com:org/stackpractices-web.git
cd stackpractices-web

# 2. Instalar dependencias
npm install

# 3. Copiar archivo de entorno
cp .env.example .env

# 4. Iniciar servicios (base de datos, cache)
docker compose up -d

# 5. Correr migraciones de base de datos
npm run db:migrate

# 6. Seed de datos de prueba
npm run db:seed

# 7. Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:4321 en tu navegador.

## Variables de Entorno

| Variable | Requerida | Default | Descripción |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Sí | — | Connection string de PostgreSQL |
| `REDIS_URL` | No | `redis://localhost:6379` | Conexión de cache |
| `API_KEY` | Sí | — | Key de servicio externo |
| `GA_MEASUREMENT_ID` | No | — | ID de Google Analytics 4 |
| `PUBLIC_SITE_URL` | Sí | `http://localhost:4321` | URL base para SEO |

## Verificación

```bash
# Health check
curl http://localhost:4321/health

# Respuesta esperada
{"status":"ok","version":"2.4.1"}

# Correr tests
npm test

# Check de build
npm run build
```

## Troubleshooting

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Puerto 4321 en uso | Otro proceso | `lsof -ti:4321 | xargs kill -9` |
| Migración falla | Schema drift | `npm run db:reset` |
| Docker no inicia | Docker Desktop no corriendo | Iniciar Docker Desktop |
| `npm install` falla | Versión de Node incorrecta | `nvm use 20` |
| Build falla | Env vars faltantes | Verifica `.env` contra `.env.example` |
```

## Lo que funciona

- **Usa `.env.example`** — nunca commitees secrets; commitea un template con valores dummy
- **Automatiza con `make` o scripts** — un comando debería poner a un nuevo dev en marcha. Enlaza a la [Plantilla de Guía de Onboarding](/docs/templates/onboarding-guide-template) para un checklist completo.
- **Testea el setup mensualmente** — docs de setup stale son peores que no tener docs
- **Pinea versiones de dependencias** — "latest" causa "en mi máquina funciona"
- **Documenta diferencias de SO** — macOS, Linux y Windows tienen paths distintos
- **Provee un paso de verificación** — los devs necesitan saber si el setup funcionó
- **Mantén una tabla de troubleshooting** — cada issue recurrente debería documentarse

## Errores Comunes

- Instrucciones de setup que solo funcionan en la máquina del autor
- Falta de `.env.example` — nuevos devs adivinan variables requeridas. Combínalo con la [Plantilla de Runbook](/docs/templates/runbook-template) para pasos de troubleshooting.
- Sin paso de verificación — los devs no saben si el setup funcionó
- Paths locales hardcodeados — `/Users/alice/project` no funciona para Bob
- No testear en un entorno limpio — caches stale ocultan bugs de setup
- Mezclar instalación global y local de herramientas — documenta qué enfoque usar

## Variantes

### Setup monorepo

Para monorepos, documenta setup a nivel workspace primero, luego setup por paquete. Usa `pnpm` o `turbo` para gestión de workspace. Incluye instrucciones para correr paquetes individuales y el monorepo completo.

### Desarrollo solo en container

Para proyectos que corren completamente en Docker, documenta `docker compose up` como el comando único. Incluye instrucciones para rebuildar containers, ver logs y attachar debuggers. No se necesita instalación local de Node.js o Python.

### Desarrollo remoto (Codespaces, Gitpod)

Para desarrollo basado en cloud, documenta cómo iniciar un workspace, port forwarding e inyección de variables de entorno. Incluye la configuración de devcontainer.json y las extensiones requeridas.

## Automatización

### Enfoque Makefile

```makefile
.PHONY: setup dev test clean

setup:
	nvm install
	npm ci
	cp .env.example .env
	npm run db:migrate
	npm run db:seed

dev:
	npm run dev

test:
	npm run test:unit
	npm run test:integration

clean:
	rm -rf node_modules dist .astro
```

### Devcontainer

Para usuarios de VS Code, un `.devcontainer/devcontainer.json` estandariza el entorno:

```json
{
  "name": "Project Dev Environment",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "postCreateCommand": "npm ci && npm run db:migrate",
  "forwardPorts": [4321, 5432, 6379]
}
```

### Paridad CI

Usa los mismos comandos de setup en CI que en la guía. Esto asegura que la guía se mantenga precisa — si CI se rompe, la guía también necesita actualización.

## Preguntas Frecuentes

### ¿Debería usar Docker para desarrollo local?

Sí, si tu proyecto tiene más de dos dependencias (base de datos, cache, cola). Consulta la [Guía de Docker para Desarrolladores](/guides/devops/docker-for-developers-guide) para pautas de configuración. Un `docker-compose.yml` asegura que cada dev corre las mismas versiones. Para proyectos simples, package managers locales bastan.

### ¿Cómo manejo secrets en setup local?

Usa un secret manager compartido (1Password, Vault) o archivos `.env` encriptados. Nunca commitees secrets a Git. Documenta qué secrets se necesitan y dónde conseguirlos.

### ¿Qué pasa si el setup toma más de 30 minutos?

Automatiza más. Si un nuevo empleado pasa un día entero en setup, tu automatización está rota. Target: laptop fresco a código corriendo en menos de 15 minutos.

### ¿Debería usar nvm, fnm o volta para gestión de versiones de Node.js?

Cualquiera funciona. Elige uno y documéntalo. `nvm` es el más usado. `fnm` es más rápido. `volta` pinea versiones por proyecto automáticamente. La clave es consistencia — todos en el equipo deberían usar la misma herramienta.

### ¿Cómo manejo setup específico por plataforma (macOS vs Windows vs Linux)?

Documenta cada plataforma por separado si los paths o comandos difieren. Usa herramientas cross-platform donde sea posible (Docker, Node.js). Para herramientas específicas de plataforma, provee comandos alternativos en una tabla. Considera un `Makefile` que abstraiga diferencias de plataforma.

### ¿Debería incluir configuración de IDE en la guía de setup?

Sí, si el proyecto requiere extensiones o settings específicos. Incluye un `.vscode/extensions.json` con extensiones recomendadas. Documenta cualquier linter, formatter o language server requerido. Mantenlo opcional — no todos usan el mismo IDE.

### ¿Con qué frecuencia debería actualizar la guía de setup?

Revisa mensualmente. Verifica versiones desactualizadas, links rotos y pasos faltantes. Testea la guía en un entorno limpio trimestralmente. Asigna un owner rotativo para mantener la guía actualizada.

### ¿Qué pasa si un desarrollador está en un OS diferente al equipo?

Documenta pasos específicos por plataforma en secciones o tablas separadas. Usa herramientas cross-platform (Docker, Node.js) donde sea posible. Para herramientas específicas de plataforma, provee comandos alternativos. Considera un devcontainer para usuarios de VS Code para estandarizar el entorno.

### ¿Debería incluir database seeding en la guía de setup?

Sí, si la aplicación requiere seed data para funcionar. Incluye un comando `npm run db:seed` y documenta qué datos crea. Para datasets grandes, provee un subset o generador de datos sintéticos. Consulta la [Plantilla de Documentación de Schema](/docs/templates/database-schema-documentation-template) para contexto de schema.
