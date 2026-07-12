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
  - /docs/user-access-audit-template
  - /docs/backup-verification-test-template
  - /recipes/data-privacy-gdpr
  - /recipes/container-security
  - /recipes/security-headers
  - /docs/api-security-review-template
  - /docs/data-classification-template
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


- For alternatives, see [Disaster Recovery Test Plan](/es/docs/disaster-recovery-test-plan/).

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

## Configuracion de Politica de Ciclo de Vida S3

```json
{
  "Rules": [
    {
      "ID": "transition-to-glacier",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 2555 }
    },
    {
      "ID": "expire-temp-data",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 7 }
    },
    {
      "ID": "retain-user-data",
      "Status": "Enabled",
      "Filter": { "Prefix": "users/" },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
      "Expiration": { "Days": 3650 }
    }
  ]
}
```

## Script de Purga de Retencion de Base de Datos

```sql
-- Trabajo programado de purga en PostgreSQL
-- Ejecutar semanalmente via pg_cron o scheduler externo

-- Purgar sesiones expiradas (retencion: 30 dias)
DELETE FROM sessions
WHERE created_at < NOW() - INTERVAL '30 days';

-- Purgar logs de auditoria (retencion: 7 anos para cumplimiento)
-- NO PURGAR: archivados por separado

-- Purgar datos de usuarios eliminados (retencion: 90 dias despues de eliminacion)
DELETE FROM user_data
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '90 days';

-- Purgar logs de eventos (retencion: 180 dias)
DELETE FROM event_logs
WHERE created_at < NOW() - INTERVAL '180 days';

-- Vacuum y analyze despues de purga
VACUUM ANALYZE sessions;
VACUUM ANALYZE user_data;
VACUUM ANALYZE event_logs;
```

## Matriz de Clasificacion y Retencion de Datos

```text
=== Matriz de Clasificacion y Retencion de Datos ===

| Tipo de Dato        | Clasificacion  | Retencion  | Almacenamiento  | Metodo de Purga    |
|---------------------|----------------|------------|-----------------|---------------------|
| PII de Usuario      | Confidencial   | 3 anos     | RDS Cifrado     | Purga programada    |
| Registros de pago   | Restringido    | 7 anos     | RDS Cifrado     | Revision legal      |
| Logs de auditoria   | Interno        | 7 anos     | S3 Glacier      | Politica lifecycle  |
| Logs de aplicacion  | Interno        | 90 dias    | CloudWatch      | Auto-expire         |
| Datos de sesion     | Interno        | 30 dias    | Redis           | TTL auto-expire     |
| Archivos temporales | Publico        | 7 dias     | S3 temp/        | Politica lifecycle  |
| Eventos analytics   | Interno        | 2 anos     | BigQuery        | Partition expire    |
| Backups             | Confidencial   | 90 dias    | S3 + Glacier    | Politica backup     |
| Exportes cliente    | Confidencial   | 30 dias    | S3 signed URL   | Politica lifecycle  |
| Datos ML training   | Interno        | 1 ano      | S3 IA           | Purga programada    |
```


## Variantes

- **Politica de ciclo de vida de almacenamiento de objetos en la nube**: Reglas de ciclo de vida de S3, Azure Blob o GCP Storage para transicion y expiracion.
- **Politica de retencion de base de datos**: Partition pruning, eliminacion por filas o jobs de purga automatizados.
- **Politica de retencion de logs**: Retencion de logs de aplicacion, infraestructura y seguridad con diferentes periodos.
- **Politica de retencion de datos de clientes**: Enfocada en requisitos GDPR y CCPA para datos personales.
- **Politica de retencion de datos de salud**: Alineada con HIPAA para proteccion de informacion de salud.
- **Politica de retencion de datos financieros**: Retencion de registros fiscales y de auditoria con almacenamiento inmutable.

## Lo que funciona

- Clasifica los datos antes de definir periodos de retencion.
- Automatiza las transiciones del ciclo de vida usando capacidades nativas de almacenamiento o base de datos.
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


### Como manejamos solicitudes de derecho al olvido del GDPR?

Cuando un usuario solicita la eliminacion de datos, identifica todos los almacenes de datos que contienen su PII. Crea un ticket de eliminacion que rastree cada almacen. Elimina o anonimiza datos en la base de datos primaria, object storage, caches, indices de busqueda, data warehouses y backups. Para backups, documenta que los datos seran purgados cuando expire el periodo de retencion del backup (o inicia una purga acelerada si es requerido). Registra la eliminacion con timestamp, alcance y aprobador. Proporciona confirmacion al usuario dentro de 30 dias. Prueba el proceso de eliminacion trimestralmente.

### Que es la anonimizacion de datos y cuando deberiamos usarla?

La anonimizacion de datos elimina u oculta informacion personal identificable preservando la estructura de datos para analitica. Las tecnicas incluyen: masking (reemplazar PII con datos falsos), hashing (transformacion unidireccional), aggregation (agrupar datos para eliminar registros individuales), y pseudonymization (reemplazar identificadores directos con pseudonimos). Usa anonimizacion cuando necesitas datos historicos para analitica pero ya no necesitas el PII. Documenta el metodo de anonimizacion y verifica que no pueda revertirse.

### Como gestionamos los bloqueos legales (legal holds)?

Cuando se emite un bloqueo legal, suspende inmediatamente toda eliminacion y purga de los datos afectados. Etiqueta los datos con un flag de legal-hold en el sistema. Documenta el bloqueo: alcance, autoridad emisora, fecha y duracion esperada. Notifica a todos los equipos con acceso a los datos. Monitorea el estado del bloqueo regularmente. Cuando se libera el bloqueo, documenta la liberacion y reanuda los calendarios de retencion normales. Nunca auto-elimines datos con un bloqueo legal activo. Audita el cumplimiento de bloqueos legales anualmente.

### Como verificamos que los datos han sido eliminados?

Despues de que un trabajo de purga se ejecuta, verifica la eliminacion: consultando registros mas antiguos que el periodo de retencion (debe devolver cero filas), verificando conteos de archivos en prefijos S3 (debe coincidir con lo esperado), y ejecutando una verificacion de muestra en registros especificos. Registra los resultados de verificacion. Para cumplimiento, una segunda persona debe verificar la eliminacion. Almacena certificados o logs de eliminacion en un bucket de almacenamiento inmutable. Revisa los resultados de verificacion de eliminacion mensualmente.

### Como manejamos la retencion de datos entre multiples regiones?

Diferentes regiones tienen diferentes requisitos legales (GDPR en EU, CCPA en California, PDPA en Singapur). Crea una matriz de retencion que mapee tipos de datos a requisitos regionales. Aplica el periodo de retencion mas estricto cuando los datos cruzan regiones. Almacena datos en la region donde fueron recolectados cuando sea posible. Documenta los flujos de datos cross-region y las reglas de retencion que aplican. Revisa los requisitos regionales anualmente a medida que las leyes cambian.


### Como manejamos la retencion de datos para modelos de machine learning?

Los modelos ML y los datos de entrenamiento tienen necesidades unicas de retencion. Reten los artefactos del modelo durante el tiempo de vida del modelo en produccion mas 1 ano para auditoria. Los datos de entrenamiento deben seguir la politica de clasificacion de datos de la fuente. Los feature stores deben expirar features que ya no se usan. Registra las predicciones del modelo por 90 dias para debugging y auditoria de sesgo. Documenta que datasets se usaron para entrenar cada version del modelo para reproducibilidad y cumplimiento.

### Que es el almacenamiento inmutable y cuando lo necesitamos?

El almacenamiento inmutable (S3 Object Lock, Azure Immutable Blob) previene que los objetos sean eliminados o sobrescritos durante un periodo de retencion especificado. Usalo para: requisitos de cumplimiento (SEC, FINRA, HIPAA), datos con bloqueo legal, logs de auditoria que deben ser a prueba de manipulacion, y registros financieros. Configura el modo WORM (Write Once Read Many) a nivel de bucket. Documenta el periodo de inmutabilidad y asegurate de que se alinee con los requisitos regulatorios. Prueba que los intentos de eliminacion sean bloqueados.

### Como manejamos la retencion de datos para archivos de log?

Logs de aplicacion: retener 90 dias en almacenamiento hot (CloudWatch, Elasticsearch), luego archivar a S3 Glacier por 1 ano. Logs de infraestructura: retener 30 dias hot, 180 dias archivados. Logs de seguridad: retener 1 ano hot, 7 anos archivados para cumplimiento. Logs de acceso (ALB, CloudFront): retener 90 dias hot, 1 ano archivados. Usa herramientas de agregacion de logs (Fluentd, Logstash) para enrutar logs al tier de retencion correcto automaticamente. Configura alertas para fallos de ingestion de logs.

### Como documentamos la retencion de datos para auditores?

Crea un registro de retencion de datos que liste: tipo de dato, clasificacion, ubicacion de almacenamiento, periodo de retencion, base legal, metodo de purga, fecha de ultima purga, y responsable. Almacena el registro en un repositorio con control de versiones. Genera reportes trimestrales mostrando logs de ejecucion de purga y estado de cumplimiento. Durante auditorias, proporciona el registro, logs de purga y documentos de politica. Asegura que los auditores puedan rastrear un tipo de dato desde la creacion hasta la eliminacion a traves de la documentacion.


Revisa la politica de retencion de datos anualmente y despues de cualquier cambio regulatorio. Actualiza la matriz de retencion, los calendarios de purga y los procedimientos de bloqueo legal. Capacita a todos los miembros del equipo en la politica actualizada.





End of document. Review and update quarterly.