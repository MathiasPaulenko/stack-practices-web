---
contentType: guides
slug: platform-engineering-guide
title: "Platform Engineering — Construyendo Plataformas de Desarrollo Internas"
description: "Guia practica de platform engineering: conceptos de IDP, golden paths, infraestructura self-service, developer experience, y herramientas como Backstage, Crossplane y Terraform."
metaDescription: "Aprende platform engineering: construye Internal Developer Platforms, golden paths, infraestructura self-service. Herramientas como Backstage, Crossplane y Terraform."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - platform-engineering
  - idp
  - internal-developer-platform
  - golden-path
  - developer-experience
  - backstage
  - crossplane
  - terraform
  - guia
relatedResources:
  - /guides/sre-practices-guide
  - /guides/observability-guide
  - /guides/terraform-best-practices-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende platform engineering: construye Internal Developer Platforms, golden paths, infraestructura self-service. Herramientas como Backstage, Crossplane y Terraform."
  keywords:
    - platform-engineering
    - idp
    - internal-developer-platform
    - golden-path
    - developer-experience
    - backstage
    - guia
---

## Overview

Platform engineering es la disciplina de construir y mantener Internal Developer Platforms (IDPs): capas de self-service que abstraen la complejidad de infraestructura y permiten a los desarrolladores desplegar, operar y observar sus aplicaciones sin experiencia profunda en plataforma. En lugar de que cada equipo reinvente CI/CD, observabilidad y patrones de seguridad, un equipo de plataforma cura "golden paths" — caminos pavimentados con guardrails que hacen que lo correcto sea lo facil. El objetivo no es restringir a los desarrolladores sino acelerarlos removiendo carga cognitiva.

## When to Use

- Tienes 10+ equipos de ingenieria con esfuerzo duplicado en infraestructura
- El onboarding de desarrolladores toma dias porque los entornos son artesanales
- Los equipos pasan mas tiempo en YAML que en logica de negocio
- Los requerimientos de seguridad y compliance se aplican inconsistentemente
- Quieres escalar la adopcion de Kubernetes sin que cada equipo sea admin de cluster

## Componentes Core de IDP

| Componente | Proposito | Herramientas ejemplo |
|-----------|---------|---------------------|
| **Portal de desarrollador** | Catalogo de servicios, docs, scaffolds | Backstage, Port, Cortex |
| **Infraestructura self-service** | Entornos on-demand, bases de datos | Crossplane, Terraform Cloud, Pulumi |
| **Golden path CI/CD** | Pipelines de despliegue estandarizadas | ArgoCD, GitHub Actions, Tekton |
| **Stack de observabilidad** | Metricas, logs, traces por servicio | Prometheus, Grafana, Tempo, Loki |
| **Guardrails de seguridad** | Policy-as-code, gestion de secretos | OPA, Kyverno, Vault |

## El Golden Path

Un golden path es un workflow bien soportado, documentado y templatizado para una tarea comun:

```
┌─────────────────────────────────────────────────────────┐
│  Desarrollador quiere: "Desplegar una nueva REST API"    │
│                                                         │
│  → Backstage scaffold: template de API                   │
│  → Auto-generado: pipeline CI/CD, monitoreo, TLS         │
│  → ArgoCD despliega en staging con policy checks         │
│  → PR a main → canary a produccion                      │
│  → Dashboard Grafana y alertas auto-provisionadas        │
└─────────────────────────────────────────────────────────┘
```

El desarrollador no elige el controlador de ingress, el formato de logs, ni la convencion de nombres de metricas. La plataforma tomo esas decisiones — y las hace cumplir.

## Configuracion de Backstage

```yaml
# app-config.yaml
app:
  title: Internal Developer Portal
  baseUrl: http://localhost:3000

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007

catalog:
  rules:
    - allow: [Component, System, API, Resource, Location]
  locations:
    - type: url
      target: https://github.com/acme/catalog-info.yaml

scaffolder:
  locations:
    - type: url
      target: https://github.com/acme/backstage-templates/nodejs-api/template.yaml

techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
```

## Crossplane para Infraestructura Self-Service

```yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: payment-db
  namespace: payments
spec:
  engine: postgres
  version: "15"
  size: small
  backupRetentionDays: 7
```

El equipo de plataforma define este CRD. Crossplane lo compone en instancias RDS, grupos de seguridad VPC y politicas de backup. El desarrollador solicita una base de datos sin saber que AWS existe.

## Midiendo el Exito de la Plataforma

| Metrica | Como medir | Target |
|---------|-----------|--------|
| **Tiempo para provisionar entorno** | Analytics de Backstage | < 10 minutos |
| **Tiempo de onboarding de desarrollador** | Encuestas HR + plataforma | < 1 dia |
| **Frecuencia de despliegue** | Metricas DORA | 2+ por desarrollador por dia |
| **NPS de plataforma** | Encuesta trimestral de desarrolladores | > 50 |
| **Volumen de tickets al equipo de plataforma** | Datos ITSM | Tendencia decreciente |

## Anti-Patrones de Equipo de Plataforma

| Anti-patron | Fix |
|-------------|-----|
| **Equipo de plataforma como ticket ops** | Construir APIs self-service, no colas de tickets |
| **Mandatos one-size-fits-all** | Los golden paths deben ser defaults, no requerimientos. Permitir escape hatches. |
| **Plataforma sin usuarios** | Tratar equipos internos como clientes. Hacer user research. |
| **Sobre-abstraer** | Si la plataforma es mas dificil que la herramienta subyacente, ha fallado. |
| **Sin product management** | Los equipos de plataforma necesitan roadmaps, OKRs y loops de feedback como cualquier equipo de producto. |

## Common Mistakes

- **Construir antes de entender el dolor** — entrevista equipos antes de escribir cualquier codigo de plataforma
- **Sin documentacion** — una plataforma sin docs es una caja negra que genera tickets
- **Tratar la plataforma como cost center** — medir ganancias de productividad del desarrollador, no solo uptime de plataforma
- **Ignorando la cola larga** — el caso del 80% es facil; la plataforma debe manejar el 20% sin romper
- **Sin path de migracion** — los servicios existentes necesitan un path hacia la plataforma, no solo templates greenfield

## FAQ

**Cual es la diferencia entre platform engineering y DevOps?**
DevOps es una cultura de responsabilidad compartida. Platform engineering es una funcion de equipo que construye las herramientas y abstracciones que habilitan DevOps a escala. Puedes tener DevOps sin un equipo de plataforma; no puedes tener un equipo de plataforma sin cultura DevOps.

**Deberiamos construir o comprar un IDP?**
Comienza con Backstage (open source, ampliamente adoptado) para el portal. Compra infraestructura gestionada (RDS, EKS, Datadog) para el backend. Construye solo lo que diferencia tu negocio.

**Como prevenimos que la plataforma se convierta en cuello de botella?**
Hazla self-service. Cada request que requiere un humano en el equipo de plataforma es un fallo de diseno. Automatiza aprobaciones con policy-as-code donde sea posible.
