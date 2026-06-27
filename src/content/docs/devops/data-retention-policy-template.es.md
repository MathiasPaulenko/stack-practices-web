---
contentType: docs
slug: data-retention-policy-template
title: "Plantilla de Politica de Retencion de Datos"
description: "Una plantilla para definir cuanto tiempo se conservan los datos, cuando se archivan y cuando deben eliminarse por cumplimiento y costos."
metaDescription: "Define reglas de retencion, archivado y eliminacion de datos con esta plantilla. Cubre categorias, periodos de retencion, retenciones legales y controles de cumplimiento."
difficulty: beginner
topics:
  - security
  - infrastructure
tags:
  - data-retention
  - compliance
  - gdpr
  - privacy
  - governance
relatedResources:
  - /docs/devops/security-incident-report-template
  - /docs/devops/user-access-audit-template
  - /docs/devops/backup-verification-test-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define reglas de retencion, archivado y eliminacion de datos con esta plantilla. Cubre categorias, periodos de retencion, retenciones legales y controles de cumplimiento."
  keywords:
    - plantilla de politica de retencion de datos
    - politica de eliminacion de datos
    - politica de archivado de datos
    - politica de retencion GDPR
    - retencion de datos cumplimiento
---

## Descripcion General

Una politica de retencion de datos define cuanto tiempo una organizacion conserva los datos, cuando se mueven a un almacenamiento de menor costo y cuando se eliminan permanentemente. Esta plantilla ayuda a los equipos a clasificar datos, asignar periodos de retencion, implementar retenciones legales y documentar controles de cumplimiento. Una politica clara reduce costos de almacenamiento, riesgo legal y complejidad operativa.

## Cuando Usar

- Configurar una nueva plataforma de datos o aplicacion.
- Prepararse para auditorias de GDPR, CCPA, HIPAA o SOC 2.
- Reducir costos de almacenamiento en la nube y optimizar el ciclo de vida de datos.
- Responder a una solicitud de acceso o eliminacion por parte de un titular de datos.
- Definir estrategias de backup y archivo.
- Despues de un incidente de seguridad que involucre exposicion de datos.

## Prerequisitos

- Inventario de tipos de datos, sistemas y ubicaciones de almacenamiento.
- Guia legal y de cumplimiento para periodos de retencion minima y maxima.
- Esquema de clasificacion de datos como publico, interno, confidencial, restringido.
- Herramientas de almacenamiento y backup que soporten politicas de ciclo de vida.
- Proceso para identificar y gestionar retenciones legales.
- Duenos para cada categoria de datos o sistema.

## Solucion

### Plantilla

#### 1. Alcance y Roles de la Politica

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| Nombre de la politica | Nombre de la politica | `Politica de Retencion de Datos de Clientes` |
| Fecha efectiva | Cuando entra en vigor | `2026-07-01` |
| Ciclo de revision | Cada cuanto se revisa | `Anualmente` |
| Dueno de la politica | Equipo responsable | `Data governance` |
| Aprobador legal | Revisor de cumplimiento o legal | `Asesoria legal` |
| Dueno tecnico | Equipo que implementa controles | `Ingenieria de plataforma` |
| Alcance | Sistemas y datos cubiertos | `Todas las bases de datos productivas, logs, almacenamiento de objetos y backups` |

#### 2. Categorias de Datos y Periodos de Retencion

| Categoria de Datos | Ejemplos | Periodo de Retencion | Archivar Despues de | Eliminar Despues de | Base Legal |
|--------------------|----------|----------------------|---------------------|---------------------|------------|
| Datos de cuenta de cliente | Perfiles, preferencias | Vida de la cuenta + 1 año | 1 año despues del cierre | 2 años despues del cierre | Contrato, obligacion legal |
| Registros de transacciones | Ordenes, pagos | 7 años | 1 año | 7 años despues del cierre del periodo | Ley fiscal y contable |
| Logs de aplicacion | Logs de request, logs de error | 90 dias | 30 dias | 90 dias | Necesidad operativa |
| Logs de seguridad | Autenticacion, logs de acceso | 2 años | 1 año | 2 años despues de la creacion | Seguridad y cumplimiento |
| Datos de backup | Backups completos e incrementales | 30 dias | 30 dias | Segun programacion de backup | Recuperacion ante desastres |
| Datos de analitica | Eventos agregados | 1 año | 6 meses | 1 año despues de la agregacion | Interes legitimo |
| Datos de marketing | Interacciones de email, leads | 2 años o hasta opt-out | 1 año | En opt-out o 2 años | Consentimiento |
| Datos temporales | Cache, archivos de importacion | 7 dias | 3 dias | 7 dias | Necesidad operativa |

#### 3. Reglas de Retencion por Clasificacion de Datos

| Clasificacion | Retencion Minima | Retencion Maxima | Manejo Especial |
|---------------|------------------|------------------|-----------------|
| Publico | Segun necesidad del negocio | 1 año o menos | Sin manejo especial |
| Interno | Necesidad del negocio | 3 años | Ciclo de vida estandar |
| Confidencial | Minimo legal o contractual | 7 años o menos | Cifrado, logs de acceso |
| Restringido | Minimo regulatorio | Maximo regulatorio | Proceso de retencion legal, cifrado, trazabilidad de auditoria |

#### 4. Acciones del Ciclo de Vida de Datos

| Etapa | Disparador | Accion | Herramienta / Equipo Responsable |
|-------|------------|--------|----------------------------------|
| Activo | Datos creados | Almacenar en tier primario con controles de acceso | Equipo de aplicacion |
| Frio | 30 dias de antiguedad | Mover a almacenamiento de menor costo | Politica de ciclo de vida de almacenamiento |
| Archivo | 1 año de antiguedad | Mover a archivo con politica de recuperacion | Politica de ciclo de vida de almacenamiento |
| Marcar para eliminacion | Finaliza periodo de retencion | Marcar registros y notificar duenos | Plataforma de data governance |
| Eliminacion segura | Aprobado por legal / politica | Eliminar o anonimizar permanentemente | Ingenieria de plataforma |
| Log de auditoria | Cada accion del ciclo de vida | Registrar eventos de retencion y eliminacion | Sistema de logs de auditoria |

#### 5. Proceso de Retencion Legal y Excepciones

| Escenario | Proceso | Dueno | Documentacion |
|-----------|---------|-------|---------------|
| Retencion por litigio | Suspender eliminacion de datos afectados | Asesoria legal | Aviso de retencion y alcance |
| Investigacion regulatoria | Extender retencion segun requerido | Oficial de cumplimiento | Registro de solicitud regulatoria |
| Solicitud de titular de datos | Revisar y eliminar o anonimizar | Equipo de privacidad de datos | Log de solicitud y respuesta |
| Solicitud de excepcion | Enviar razon, revision de riesgo, aprobacion | Data governance | Registro de excepciones |
| Anulacion de politica | Aprobacion ejecutiva con revision legal | C-level / legal | Registro de excepcion firmado |

#### 6. Checklist de Eliminacion y Verificacion

- [ ] El dueno de datos confirma que el periodo de retencion ha expirado.
- [ ] No hay retencion legal activa que cubra los datos.
- [ ] Los datos se eliminan del almacenamiento primario y los indices.
- [ ] Los backups que contienen los datos se purgan o se programan para purga segun la politica.
- [ ] Los archivos se eliminan o anonimizan segun la programacion.
- [ ] Los datasets derivados, caches y replicas se refrescan o limpian.
- [ ] La eliminacion se registra con timestamp, dueno y alcance.
- [ ] Se verifica una muestra para confirmar la eliminacion.
- [ ] El equipo de cumplimiento revisa los logs de eliminacion periodicamente.

## Explicacion

La retencion de datos es un equilibrio entre valor de negocio, obligacion legal y costo de almacenamiento. Una politica escrita elimina la ambiguedad, asegura la ejecucion consistente y proporciona evidencia durante auditorias. Al clasificar los datos, definir periodos de retencion y automatizar las acciones del ciclo de vida, los equipos pueden reducir el trabajo manual y evitar conservar datos mas tiempo del necesario.

## Variantes

- **Politica de ciclo de vida de almacenamiento de objetos en la nube**: Reglas de ciclo de vida de S3, Azure Blob o GCP Storage para transicion y expiracion.
- **Politica de retencion de base de datos**: Partition pruning, eliminacion por filas o jobs de purga automatizados.
- **Politica de retencion de logs**: Retencion de logs de aplicacion, infraestructura y seguridad con diferentes periodos.
- **Politica de retencion de datos de clientes**: Enfocada en requisitos GDPR y CCPA para datos personales.
- **Politica de retencion de datos de salud**: Alineada con HIPAA para proteccion de informacion de salud.
- **Politica de retencion de datos financieros**: Retencion de registros fiscales y de auditoria con almacenamiento inmutable.

## Mejores Practicas

- Clasifica los datos antes de definir periodos de retencion.
- Automatiza las transiciones del ciclo de vida usando features nativas de almacenamiento o base de datos.
- Aplica la retencion mas corta que satisfaga necesidades legales y de negocio.
- Manten un inventario centralizado de almacenes de datos y reglas de retencion.
- Registra cada eliminacion y accion de retencion para fines de auditoria.
- Capacita a los equipos en procesos de retencion legal y excepciones.
- Revisa la politica al menos anualmente y despues de cambios regulatorios.
- Usa cifrado y controles de acceso para datos en retencion.
- Prueba los procedimientos de eliminacion periodicamente para asegurar que los datos se eliminen realmente.

## Errores Comunes

- Mantener todos los datos por siempre "por si acaso".
- Eliminar datos sin confirmar el estado de retencion legal.
- Olvidar backups, archivos o replicas al eliminar datos primarios.
- Usar el mismo periodo de retencion para todos los tipos de datos.
- No documentar excepciones y sus aprobaciones.
- No registrar eventos de eliminacion.
- Ignorar datos en servicios de terceros o caches.
- No revisar politicas de retencion despues de nuevas regulaciones.

## FAQs

### Cual es la diferencia entre archivar y eliminar datos?

Archivar mueve los datos a un almacenamiento a largo plazo de menor costo para cumplimiento o referencia. Eliminar remueve permanentemente los datos de forma que no puedan recuperarse.

### Como manejamos los backups bajo una politica de retencion?

Los backups deben tener su propia programacion de retencion. Cuando se eliminan datos primarios, la eliminacion debe propagarse eventualmente a los backups segun la politica de retencion de backups, o los backups deben purgarse explicitamente si lo requiere la ley.

### Que pasa si una retencion legal entra en conflicto con la politica de retencion?

La retencion legal tiene prioridad. Los datos afectados deben preservarse mas alla de su periodo de retencion normal hasta que se levante la retencion, y esta excepcion debe documentarse.
