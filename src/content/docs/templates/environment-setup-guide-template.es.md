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

## Lo que funciona

- **Usa `.env.example`** — nunca commitees secrets; commitea un template con valores dummy
- **Automatiza con `make` o scripts** — un comando debería poner a un nuevo dev en marcha. Enlaza a la [Plantilla de Guía de Onboarding](/docs/templates/onboarding-guide-template) para un checklist completo.
- **Testea el setup mensualmente** — docs de setup stale son peores que no tener docs
- **Pinea versiones de dependencias** — "latest" causa "en mi máquina funciona"
- **Documenta diferencias de SO** — macOS, Linux y Windows tienen paths distintos

## Errores Comunes

- Instrucciones de setup que solo funcionan en la máquina del autor
- Falta de `.env.example` — nuevos devs adivinan variables requeridas. Combínalo con la [Plantilla de Runbook](/docs/templates/runbook-template) para pasos de troubleshooting.
- Sin paso de verificación — los devs no saben si el setup funcionó
- Paths locales hardcodeados — `/Users/alice/project` no funciona para Bob

## Preguntas Frecuentes

### ¿Debería usar Docker para desarrollo local?

Sí, si tu proyecto tiene más de dos dependencias (base de datos, cache, cola). Consulta la [Guía de Docker para Desarrolladores](/guides/devops/docker-for-developers-guide) para pautas de configuración. Un `docker-compose.yml` asegura que cada dev corre las mismas versiones. Para proyectos simples, package managers locales bastan.

### ¿Cómo manejo secrets en setup local?

Usa un secret manager compartido (1Password, Vault) o archivos `.env` encriptados. Nunca commitees secrets a Git. Documenta qué secrets se necesitan y dónde conseguirlos.

### ¿Qué pasa si el setup toma más de 30 minutos?

Automatiza más. Si un nuevo empleado pasa un día entero en setup, tu automatización está rota. Target: laptop fresco a código corriendo en menos de 15 minutos.
