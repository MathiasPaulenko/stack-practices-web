---
contentType: docs
slug: environment-configuration-template
title: "Plantilla de Configuracion de Entornos"
description: "Una plantilla para documentar variables de entorno, secretos, endpoints y configuraciones de infraestructura para cada entorno de despliegue."
metaDescription: "Documenta variables de entorno, secretos, endpoints y configuraciones de infraestructura por entorno de despliegue con esta plantilla."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - configuration
  - environment
  - env-vars
  - secrets
  - deployment
relatedResources:
  - /docs/runbook-template
  - /docs/devops/deployment-checklist-template
  - /docs/devops/cloud-resource-tagging-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Documenta variables de entorno, secretos, endpoints y configuraciones de infraestructura por entorno de despliegue con esta plantilla."
  keywords:
    - plantilla de configuracion de entornos
    - documentacion de variables de entorno
    - documento de configuracion de entornos
    - plantilla de configuracion de despliegue
    - configuracion por entorno
---

## Descripcion General

Toda aplicacion se ejecuta en multiples entornos como desarrollo, staging y produccion. Cada entorno tiene su propia configuracion, endpoints, secretos y ajustes de infraestructura. Esta plantilla ayuda a los equipos a documentar esos ajustes en un solo lugar, facilitando la incorporacion, la depuracion y la recuperacion ante desastres.

## Cuando Usar

- Configurar una nueva aplicacion o servicio.
- Incorporar un nuevo miembro del equipo o contratista.
- Preparar un plan de despliegue o migracion.
- Solucionar errores especificos de un entorno.
- Auditar la desviacion de configuracion entre entornos.
- Crear un runbook para respuesta a incidentes.

## Prerequisitos

- Acceso a la plataforma de despliegue o consola cloud.
- Lista de servicios, bases de datos e integraciones de terceros que usa la aplicacion.
- Permiso para ver secretos y credenciales, o un proceso de entrega seguro.
- Una convencion de nombres para variables de entorno y claves de configuracion.
- Comprension de los requisitos de cumplimiento y seguridad para cada entorno.

## Solucion

### Plantilla

#### 1. Identificacion del Entorno

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| Aplicacion / Servicio | Nombre del sistema | `Payment API` |
| Entorno | dev, staging, production, etc. | `production` |
| Region / Zona | Despliegue geografico | `us-east-1` |
| Cluster / Instancia | Donde corre la app | `prod-k8s-cluster-01` |
| Version desplegada | Release actual | `v2.4.1` |
| Dueno | Equipo responsable | `Equipo de pagos` |
| Ultima revision | Fecha de ultima actualizacion | `2026-06-27` |

#### 2. Variables de Entorno Principales

| Variable | Proposito | Valor dev | Valor staging | Valor production | Secreto |
|----------|-----------|-----------|---------------|------------------|---------|
| `APP_ENV` | Entorno de ejecucion | `development` | `staging` | `production` | No |
| `LOG_LEVEL` | Verbosidad de logs | `debug` | `info` | `warn` | No |
| `API_PORT` | Puerto donde escucha el servicio | `8080` | `8080` | `443` | No |
| `DATABASE_URL` | Cadena de conexion a la base de datos principal | `postgres://dev-db` | `postgres://staging-db` | `postgres://prod-db` | Si |
| `REDIS_URL` | Cadena de conexion al cache | `redis://dev-redis` | `redis://staging-redis` | `redis://prod-redis` | Si |
| `JWT_SECRET` | Secreto para firma de tokens | `dev-secret` | `staging-secret` | `prod-secret` | Si |
| `EXTERNAL_API_KEY` | Clave para integracion de terceros | `test-key` | `test-key` | `live-key` | Si |
| `FEATURE_FLAG_X` | Interruptor para nueva feature | `true` | `true` | `false` | No |

#### 3. Endpoints de Servicios

| Servicio | Entorno | URL / Host | Puerto | Protocolo | Notas |
|----------|---------|------------|--------|-----------|-------|
| Aplicacion | production | `api.payments.example.com` | `443` | HTTPS | Detras del load balancer |
| Base de datos | production | `prod-db.internal.example.com` | `5432` | PostgreSQL | Subred privada |
| Cache | production | `prod-redis.internal.example.com` | `6379` | Redis | Subred privada |
| Cola de mensajes | production | `prod-rabbit.internal.example.com` | `5672` | AMQP | Subred privada |
| Almacenamiento de objetos | production | `s3://prod-payments-data` | `443` | HTTPS | Cifrado en reposo |

#### 4. Configuracion de Infraestructura

| Recurso | dev/test | production | Notas |
|---------|----------|------------|-------|
| Computo | 1 contenedor pequeno | 4 contenedores grandes | Auto-scaling en production |
| CPU / memoria | 0.5 vCPU / 1 GB | 2 vCPU / 4 GB | Por contenedor |
| Base de datos | Instancia compartida dev | Cluster Multi-AZ | Con replicas de lectura en production |
| Cache | 1 nodo | 3 nodos | Modo cluster Redis |
| Cola de mensajes | 1 nodo | 3 nodos | Misma configuracion |
| Almacenamiento | Clase estandar | Tier de acceso infrecuente | Politica de ciclo de vida aplicada |
| Red | Publica para herramientas dev | Subred privada + NAT | Acceso VPN requerido |

#### 5. Secretos y Credenciales

| Nombre del Secreto | Usado Por | Ubicacion de Almacenamiento | Programa de Rotacion | Ultima Rotacion |
|--------------------|-----------|-----------------------------|----------------------|-----------------|
| `DATABASE_PASSWORD` | Aplicacion | AWS Secrets Manager | Trimestral | `2026-06-01` |
| `JWT_SECRET` | Aplicacion | HashiCorp Vault | Trimestral | `2026-06-01` |
| `EXTERNAL_API_KEY` | Servicio de integracion | Azure Key Vault | En rotacion del proveedor | `2026-05-15` |
| `TLS_CERTIFICATE` | Load balancer | AWS ACM | Anual | `2026-04-20` |

#### 6. Registro de Cambios de Configuracion

| Fecha | Cambio | Autor | Razon | Aprobado Por |
|-------|--------|-------|-------|--------------|
| 2026-06-10 | Aumento del cluster de cache en produccion | `alice@example.com` | Preparar venta flash | `bob@example.com` |
| 2026-05-22 | Agregado `FEATURE_FLAG_X` | `carol@example.com` | Desplegar nuevo flujo de checkout | `dave@example.com` |
| 2026-05-01 | Rotacion de credenciales de base de datos | `platform-team` | Rotacion trimestral | `security-team` |

## Explicacion

Una unica fuente de verdad para la configuracion de entornos reduce la confusion y los errores. Cuando las variables, endpoints y secretos estan documentados, los equipos pueden desplegar mas rapido, depurar problemas entre entornos y recuperarse de incidentes sin adivinar. La plantilla tambien ayuda a identificar diferencias entre entornos, una fuente comun de errores en produccion.

## Variantes

- **Configuracion de entornos para microservicios**: Un documento por servicio con referencias cruzadas a endpoints de otros servicios.
- **Configuracion de entornos con infraestructura como codigo**: Enlaces a archivos de variables de Terraform o CloudFormation.
- **Configuracion de entornos para contenedores**: Enfoque en Docker compose, Kubernetes ConfigMaps y Secrets.
- **Configuracion de entornos serverless**: Documenta variables a nivel de funcion, ajustes de API Gateway y fuentes de eventos.
- **Configuracion de entornos para app movil**: Documenta endpoints backend, API keys y feature flags por variante de build.
- **Configuracion de entornos para base de datos**: Enfoque en cadenas de conexion, endpoints de replicas y ajustes de backup.

## Lo que funciona

- Manten los secretos fuera del control de versiones y almacenalos en un vault seguro.
- Usa los mismos nombres de variables en todos los entornos cuando sea posible.
- Documenta por que un valor difiere entre entornos.
- Revisa y actualiza el documento despues de cada despliegue o cambio de infraestructura mayor.
- Separa valores sensibles de la configuracion no sensible.
- Automatiza la generacion de este documento desde infraestructura como codigo cuando sea posible.
- Usa una convencion de nombres consistente para variables de entorno.
- Incluye informacion de contacto del dueno del entorno.

## Errores Comunes

- Hard-codear valores especificos del entorno en el codigo fuente.
- Almacenar secretos en texto plano o archivos sin cifrar.
- No actualizar el documento despues de cambios de configuracion.
- Usar nombres de variables diferentes para el mismo concepto en distintos entornos.
- Mezclar configuracion de multiples entornos en un solo archivo.
- Omitir la razon de las diferencias entre entornos.
- No incluir endpoints o credenciales de servicios de terceros.

## FAQs

### Debemos almacenar secretos en este documento?

No. Guarda los nombres de secretos y programas de rotacion aqui, pero manten los valores reales en un vault seguro. Este documento debe referenciar donde encontrar los secretos, no contenerlos.

### Como mantenemos este documento actualizado?

Asigna un dueno y revisa el documento despues de cada despliegue, cambio de infraestructura o trimestralmente. Vinculalo al proceso de gestion de cambios.

### Cual es la diferencia entre variables de entorno y archivos de configuracion?

Las variables de entorno se usan tipicamente para valores que cambian entre entornos o son sensibles. Los archivos de configuracion son mejores para ajustes estables y estructurados que pueden versionarse.
