---
contentType: docs
slug: logging-standards-document
title: "Documento de Estandares de Logging"
description: "Una plantilla de documento para definir convenciones de logging estructurado, niveles de log, retencion y requisitos de observabilidad en servicios."
metaDescription: "Define estandares de logging estructurado con esta plantilla de documento. Cubre niveles, formatos, campos, retencion, muestreo y lineamientos de seguridad."
difficulty: beginner
topics:
  - observability
  - devops
tags:
  - logging
  - observability
  - structured-logs
  - monitoring
  - standards
relatedResources:
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/runbook-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define estandares de logging estructurado con esta plantilla de documento. Cubre niveles, formatos, campos, retencion, muestreo y lineamientos de seguridad."
  keywords:
    - estandares de logging
    - logging estructurado
    - niveles de log
    - retencion de logs
    - observabilidad con logs
---

## Descripcion General

Un Documento de Estandares de Logging define como los servicios, aplicaciones e infraestructura producen logs. Logging consistente facilita la depuracion, el monitoreo, la investigacion de seguridad y el cumplimiento. Esta plantilla cubre niveles de log, formatos estructurados, campos requeridos, retencion, muestreo y reglas de seguridad.

## Cuando Usar

- Incorporar un nuevo servicio o equipo de desarrollo.
- Consolidar logs de multiples sistemas en una plataforma central de observabilidad.
- Prepararse para una auditoria de seguridad o cumplimiento.
- Investigar un incidente de produccion donde los logs estan incompletos o inconsistentes.
- Definir una estrategia de logging para microservicios o ambientes serverless.

## Prerequisitos

- Una plataforma de agregacion de logs como ELK, Splunk, Datadog, Grafana Loki o CloudWatch.
- Un estandar de timestamp y politica de zona horaria compartida.
- Una lista de eventos criticos que siempre deben registrarse.
- Un acuerdo sobre clasificacion de datos sensibles y reglas de redaccion de logs.

## Solucion

### Documento

#### 1. Niveles de Log

| Nivel | Uso | Ejemplo |
|-------|-----|---------|
| DEBUG | Informacion detallada de diagnostico durante desarrollo | `cache miss para clave user:1234` |
| INFO | Eventos normales de la aplicacion | `usuario inicio sesion`, `orden completada` |
| WARN | Situaciones inesperadas pero recuperables | `timeout de conexion, reintentando` |
| ERROR | Fallas que afectan la operacion | `pasarela de pagos devolvio 500` |
| FATAL | Fallas criticas que requieren atencion inmediata | `base de datos no disponible, apagando servicio` |

Lineamientos:
- DEBUG debe estar deshabilitado en produccion por defecto.
- INFO es el nivel de produccion por defecto para la mayoria de servicios.
- ERROR debe disparar una alerta o ticket.
- FATAL debe activar una pagina al equipo de guardia.

#### 2. Formato de Log Estructurado

Todos los logs deben emitirse como JSON con los siguientes campos requeridos:

| Campo | Tipo | Descripcion | Ejemplo |
|-------|------|-------------|---------|
| `timestamp` | ISO 8601 | Hora del evento en UTC | `2026-06-27T14:30:00Z` |
| `level` | string | Nivel de log | `INFO` |
| `service` | string | Nombre del servicio o aplicacion | `payment-service` |
| `environment` | string | Ambiente | `production` |
| `message` | string | Resumen legible | `Order 12345 completed` |
| `correlation_id` | string | ID de traza de la solicitud | `abc-123-def` |
| `span_id` | string | ID de span de OpenTelemetry | `span-xyz-789` |

Campos opcionales:
- `user_id`: Identidad del usuario asociado al evento.
- `tenant_id`: Identificador para aislamiento multi-tenant.
- `duration_ms`: Tiempo tomado para completar una operacion.
- `error_code`: Codigo de error estable para manejo programatico.
- `source_file`: Archivo y linea donde se emitio el log.

#### 3. Categorias de Eventos Requeridos

| Categoria | Eventos a Registrar | Nivel |
|-----------|---------------------|-------|
| Autenticacion | Inicio de sesion, cierre de sesion, inicio fallido, desafio MFA | INFO / WARN |
| Autorizacion | Acceso denegado, escalacion de permisos | WARN |
| Cambios de datos | Crear, actualizar, eliminar registros sensibles | INFO |
| Errores | Excepciones, fallas externas, reintentos | ERROR |
| Rendimiento | Consultas lentas, alta latencia, timeouts | WARN |
| Seguridad | Actividad sospechosa, limites de tasa, solicitudes bloqueadas | WARN |
| Operacionales | Inicio, apagado, cambios de configuracion | INFO |
| Negocio | Orden colocada, pago recibido, flujo completado | INFO |

#### 4. Datos Sensibles y Redaccion

| Tipo de Dato | Registrado | Redaccion |
|--------------|------------|-----------|
| Contrasenas | Nunca | Redactar o excluir |
| Numeros de tarjeta de credito | Nunca | Tokenizar o excluir |
| Claves API | Nunca | Redactar o excluir |
| Nombres personales | Con aprobacion | Enmascarar si no es requerido |
| Direcciones de correo | Permitido | Enmascarar parcialmente para no administradores |
| Direcciones IP | Permitido | Permitido para logs de seguridad |
| IDs de usuario | Permitido | Permitido |

Reglas:
- Nunca registrar secretos o credenciales.
- Usar listas permitidas para campos de datos personales.
- Redactar o tokenizar valores antes de registrarlos.
- Cifrar logs si contienen datos sensibles.

#### 5. Retencion y Muestreo

| Tipo de Log | Retencion | Muestreo | Notas |
|-------------|-----------|----------|-------|
| Logs de aplicacion | 30 dias | 100% | Conservar todos para depuracion |
| Logs de seguridad | 1 año | 100% | Requisito de cumplimiento |
| Logs de auditoria | 7 años | 100% | Legal y regulatorio |
| Logs de debug | 7 dias | 100% | Solo cuando esta habilitado |
| Logs de traza de alto volumen | 14 dias | 1% o live | Control de costos |

#### 6. Agregacion y Transporte de Logs

| Requisito | Regla |
|-----------|-------|
| Transporte | Enviar logs a la plataforma central con manejo de backpressure. |
| Ordenamiento | Usar timestamps para ordenar; tolerar pequeño desfase de reloj. |
| Buffering | Almacenar localmente si el recolector no esta disponible. |
| Codificacion | Usar JSON UTF-8. |
| Respaldos | Replicar logs criticos a un almacenamiento secundario. |
| Alertas | Enrutar logs ERROR y FATAL al sistema de alertas. |

## Explicacion

Logging consistente transforma archivos de texto ruidosos en datos estructurados y buscables. Al definir niveles, campos y retencion, los equipos pueden correlacionar eventos entre servicios, investigar incidentes mas rapido y cumplir con requisitos regulatorios. Los logs estructurados tambien se integran con tracing y metricas para crear una vision completa de observabilidad.

## Variantes

- **Estandares de logging en cloud**: Adaptados para AWS CloudWatch, Azure Monitor o Google Cloud Logging.
- **Logging en contenedores y Kubernetes**: Cubre shippers de logs sidecar, Fluentd y convenciones de logs de pods.
- **Logging enfocado en seguridad**: Enfatiza eventos de auditoria, integridad y deteccion de manipulacion.
- **Logging serverless**: Aborda funciones de corta duracion, cold starts y recoleccion centralizada de logs.
- **Logging movil o cliente**: Se enfoca en privacidad, batching y almacenamiento offline.

## Lo que funciona

- Usa un unico formato estructurado en todos los servicios.
- Incluye un correlation ID en cada solicitud para habilitar tracing distribuido.
- Registra resultados en limites de negocio, no cada paso interno.
- Manten los mensajes de log concisos y agrega contexto como campos estructurados.
- Evita registrar datos sensibles por defecto.
- Usa niveles de log consistentes para que las alertas sean significativas.
- Revisa las politicas de retencion contra costos y necesidades de cumplimiento.
- Prueba las reglas de parseo y alertas como parte de los despliegues.

## Errores Comunes

- Registrar todo a nivel INFO, dificultando detectar problemas reales.
- Escribir logs como texto plano que no puede parsearse automaticamente.
- Omitir timestamps o usar formatos inconsistentes.
- Incluir contrasenas o tokens en logs.
- No incluir suficiente contexto para reproducir una falla.
- Conservar logs por siempre y aumentar costos de almacenamiento innecesariamente.
- No correlacionar logs entre servicios durante un incidente.

## FAQs

### Debemos registrar a nivel DEBUG en produccion?

No, DEBUG debe estar deshabilitado por defecto. Habilitarlo temporalmente para solucionar problemas especificos y desactivarlo cuando se resuelva el incidente.

### Que es un correlation ID?

Un correlation ID es un identificador unico que se pasa a traves de todos los servicios que manejan una misma solicitud. Permite agrupar entradas de log relacionadas en un sistema distribuido.

### Como manejamos datos sensibles en logs?

Usa un enfoque de lista permitida: solo registra campos explicitamente aprobados, y redacta o tokeniza valores sensibles antes de que lleguen al flujo de logs.
