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
  - /docs/deployment-checklist-template
  - /docs/cloud-resource-tagging-policy-template
  - /docs/zero-downtime-deployment-checklist
  - /recipes/istio-canary-deployment
  - /patterns/external-configuration-store-pattern
  - /guides/canary-deployment-guide
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


- For alternatives, see [Blue-Green Deployment](/es/guides/blue-green-deployment-guide/).

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

## Ejemplo de ConfigMap y Secret en Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  DATABASE_HOST: "db.production.svc.cluster.local"
  DATABASE_PORT: "5432"
  REDIS_URL: "redis://redis.production.svc.cluster.local:6379"
  LOG_LEVEL: "info"
  FEATURE_FLAGS: "checkout-v2,search-v3"
  API_RATE_LIMIT: "1000"
  CORS_ORIGINS: "https://app.example.com,https://admin.example.com"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: "rotated-2026-06"
  JWT_SECRET: "rotated-2026-06"
  STRIPE_API_KEY: "sk_live_..."
  SENTRY_DSN: "https://..."
```

## Matriz de Comparacion de Entornos

| Variable | Desarrollo | Staging | Produccion | Notas |
|----------|------------|---------|------------|-------|
| DATABASE_HOST | localhost | db.staging.svc | db.prod.svc | Diferente por entorno |
| DATABASE_PORT | 5432 | 5432 | 5432 | Igual |
| LOG_LEVEL | debug | info | warn | Mas verbose en dev |
| API_RATE_LIMIT | 100 | 500 | 1000 | Escala con trafico |
| FEATURE_FLAGS | todas | selectivas | conservadoras | Dev habilita todas |
| CORS_ORIGINS | * | staging.example.com | app.example.com | Restringido en prod |
| REDIS_URL | localhost:6379 | redis.staging:6379 | redis.prod:6379 | Diferente por entorno |
| SENTRY_DSN | deshabilitado | DSN staging | DSN prod | Tracking de errores |

## Plantilla de Calendario de Rotacion de Secretos

```text
=== Calendario de Rotacion de Secretos ===

Credenciales de base de datos:
  - Frecuencia de rotacion: Trimestral
  - Responsable: Equipo de plataforma
  - Metodo: Auto-rotacion de AWS Secrets Manager
  - Ultima rotacion: 2026-06-01
  - Proxima rotacion: 2026-09-01

Clave de firma JWT:
  - Frecuencia de rotacion: Cada 6 meses
  - Responsable: Equipo de seguridad
  - Metodo: Manual con superposicion de doble clave
  - Ultima rotacion: 2026-04-15
  - Proxima rotacion: 2026-10-15

Stripe API key:
  - Frecuencia de rotacion: Anual
  - Responsable: Ingenieria de finanzas
  - Metodo: Manual via dashboard de Stripe
  - Ultima rotacion: 2026-01-10
  - Proxima rotacion: 2027-01-10

Sentry DSN:
  - Frecuencia de rotacion: Al salida de miembro del equipo
  - Responsable: Equipo SRE
  - Metodo: Manual via dashboard de Sentry
```


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


### Como gestionamos la configuracion para multiples entornos sin duplicacion?

Usa un archivo de configuracion base con sobrescrituras especificas por entorno. Herramientas como Helm values files, Kustomize overlays o jerarquia dotenv (.env.base, .env.staging, .env.production) permiten configuraciones compartidas con deltas por entorno. Manten el archivo base en control de version y almacena secretos especificos por entorno en un vault. Valida que todos los entornos tengan las variables requeridas en CI.

### Que herramientas deberiamos usar para gestion de secretos?

HashiCorp Vault para self-hosted, AWS Secrets Manager o Parameter Store para AWS-nativo, Azure Key Vault para Azure, GCP Secret Manager para Google Cloud. Para Kubernetes, usa External Secrets Operator para sincronizar desde tu vault a Kubernetes Secrets. Nunca almacenes secretos en Git, archivos de entorno o variables de CI para produccion. Usa credenciales de corta duracion con rotacion automatica cuando sea posible.

### Como manejamos la configuracion para feature flags?

Usa una herramienta dedicada de feature flags (LaunchDarkly, Unleash, Flagsmith) para flags dinamicos que cambian sin despliegue. Para flags estaticos vinculados a releases, usa variables de entorno o archivos de configuracion. Documenta que features estan habilitadas en cada entorno y por que. Incluye el estado de flags en el documento de configuracion de entorno para visibilidad. Limpia flags despues de que las features esten completamente desplegadas o deprecadas.

### Que es configuration drift y como lo prevenimos?

Configuration drift ocurre cuando el estado real de un entorno difiere de su estado documentado, usualmente por cambios manuales. Previenelo: haciendo todos los cambios a traves de IaC (Terraform, CloudFormation), prohibiendo cambios manuales en produccion, ejecutando deteccion de drift diariamente (terraform plan), y auto-remediando drift cuando se detecta. Documenta cualquier cambio manual de emergencia inmediatamente y reconcilialo en IaC dentro de 24 horas.

### Como inicializamos un nuevo entorno?

1. Crea el entorno en IaC con todos los recursos requeridos. 2. Genera o importa secretos al vault. 3. Despliega infraestructura base (red, bases de datos, cache). 4. Ejecuta smoke tests contra todos los endpoints. 5. Verifica que el monitoreo y las alertas esten activos. 6. Documenta el entorno en la matriz de configuracion. 7. Asigna un dueno del entorno. 8. Programa la primera revision de configuracion.


### Como gestionamos la configuracion para microservicios?

Cada microservicio debe tener su propio documento de configuracion. Usa un servicio de configuracion compartido (Spring Cloud Config, Consul KV, o AWS AppConfig) para gestion centralizada. Los endpoints cross-service deben documentarse en un registro de servicios. Usa service mesh (Istio, Linkerd) para configuracion de comunicacion inter-servicio. Manten variables de entorno por servicio y evita compartir secretos entre servicios.

### Cual es la aproximacion 12-factor app para configuracion?

La metodologia 12-factor app recomienda almacenar configuracion en variables de entorno. Esto separa config de codigo, haciendo el mismo build desplegable entre entornos. Sin embargo, para configuraciones complejas, usa una combinacion: variables de entorno para valores simples, archivos de configuracion para ajustes estructurados, y un gestor de secretos para datos sensibles. Nunca almacenes configuracion que cambia entre entornos en el codebase.

### Como versionamos los cambios de configuracion?

Almacena configuracion no sensible en Git junto con el codigo de aplicacion. Usa versionado semantico para releases de configuracion. Etiqueta commits de configuracion con la version correspondiente de aplicacion. Para secretos, versiona los metadatos del secreto (nombre, fecha de rotacion, responsable) en Git mientras mantienes los valores en el vault. Usa herramientas de diff de configuracion para mostrar que cambio entre versiones y cuando.

### Como manejamos la configuracion para bases de datos?

Documenta las cadenas de conexion de base de datos como nombres de variables (no valores) en la configuracion de entorno. Almacena las cadenas de conexion reales en el gestor de secretos. Documenta configuraciones de pool de conexiones, valores de timeout y requisitos de SSL por entorno. Para replicas de lectura, documenta el endpoint de la replica y el procedimiento de failover. Incluye version de base de datos, tipo de engine y configuracion de backup. Revisa la configuracion de base de datos despues de cada migracion de schema o evento de failover.

### Cual es la diferencia entre configuracion de build-time y runtime?

La configuracion de build-time se incorpora al artefacto en tiempo de compilacion (ej. feature flags compilados en el binario). La configuracion de runtime se lee al inicio o durante la ejecucion (ej. variables de entorno, archivos de configuracion). Prefiere configuracion de runtime para valores que cambian entre entornos. Usa configuracion de build-time solo para valores que son verdaderamente constantes en todos los entornos. Documenta que configuracion es build-time vs runtime para evitar confusion durante el debugging.

### Como manejamos la configuracion para funciones serverless?

Documenta variables de entorno por funcion, configuraciones de timeout, asignacion de memoria y limites de concurrencia. Para Lambda, usa variables de entorno para configuracion no sensible y AWS Secrets Manager para secretos. Documenta los mapeos de fuentes de eventos (SQS, EventBridge, S3) y su configuracion. Incluye ARNs de roles de IAM y limites de permisos. Rastrea versiones de funciones y aliases por entorno.


Revisa los documentos de configuracion de entorno trimestralmente. Elimina variables obsoletas, actualiza informacion del responsable y verifica que todos los endpoints documentados sigan activos y alcanzables.







End of document. Review and update quarterly.