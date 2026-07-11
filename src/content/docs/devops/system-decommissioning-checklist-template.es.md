---
contentType: docs
slug: system-decommissioning-checklist-template
title: "Plantilla de Checklist de Desmantelamiento de Sistemas"
description: "Una checklist para retirar servicios antiguos de forma segura, eliminar dependencias y limpiar infraestructura sin romper consumidores downstream."
metaDescription: "Retira servicios antiguos de forma segura con esta checklist de desmantelamiento. Cubre mapeo de dependencias, migracion de datos, limpieza y comunicacion."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - decommissioning
  - retirement
  - infrastructure
  - migration
  - cleanup
relatedResources:
  - /docs/devops/deprecation-timeline-template
  - /docs/devops/service-ownership-document-template
  - /docs/devops/feature-specification-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Retira servicios antiguos de forma segura con esta checklist de desmantelamiento. Cubre mapeo de dependencias, migracion de datos, limpieza y comunicacion."
  keywords:
    - desmantelamiento de sistemas
    - retiro de servicios
    - limpieza de infraestructura
    - checklist de deprecacion
    - apagado de sistemas legacy
---

## Descripcion General

Los servicios antiguos nunca mueren en silencio. Persisten en registros DNS, confunden a nuevos ingenieros, cuestan dinero y ocasionalmente rompen cosas cuando alguien cambia un certificado o rota un secreto. El desmantelamiento es el proceso disciplinado de apagar un servicio: identificar cada dependencia, migrar cada usuario, eliminar cada recurso y documentar que fue removido. Bien hecho, reduce costos y complejidad. Mal hecho, causa interrupciones en sistemas que pensabas no estaban relacionados.

## Cuando Usar

Usa esta plantilla cuando:
- Un servicio ha sido reemplazado por uno nuevo y el trafico ha migrado
- Una funcion esta siendo discontinuada y la infraestructura de soporte ya no se necesita
- Una integracion de terceros esta siendo discontinuada
- Un experimento o prueba de concepto ha concluido
- Una auditoria requiere evidencia de que recursos no utilizados fueron removidos

## Requisitos Previos

Antes de desmantelar un sistema:
- [ ] El sistema de reemplazo esta listo para produccion y maneja todo el trafico
- [ ] Una linea de tiempo de deprecacion ha sido comunicada a todos los stakeholders
- [ ] Todos los requisitos de retencion de datos y cumplimiento han sido revisados
- [ ] Existe un plan de rollback en caso de que el nuevo sistema falle despues del apagado
- [ ] El propietario del servicio ha aprobado la fecha de desmantelamiento

## Solucion

```markdown
# Checklist de Desmantelamiento: `<Nombre del Sistema / Servicio>`

> Propietario del servicio: ______ | Fecha: ______ | Aprobado por: ______
> Sistema de reemplazo: ______ | Fecha objetivo de desmantelamiento: ______

## 1. Descubrimiento

- [ ] Listar todos los servicios upstream que llaman a este sistema
- [ ] Listar todos los servicios downstream a los que este sistema llama
- [ ] Listar todas las integraciones externas (proveedores, socios, webhooks)
- [ ] Listar todos los registros DNS, balanceadores de carga y configs de CDN que apuntan a este servicio
- [ ] Listar todos los certificados SSL vinculados a este servicio
- [ ] Listar todas las bases de datos, caches, colas y buckets de almacenamiento propiedad de este servicio
- [ ] Listar todos los trabajos programados, tareas cron o workers en segundo plano
- [ ] Listar todos los feature flags o entradas de configuracion que referencian este servicio

## 2. Manejo de Datos

- [ ] Confirmar requisitos de retencion de datos (legal, cumplimiento, negocio)
- [ ] Exportar y archivar datos que deben retenerse
- [ ] Verificar ubicacion del archivo, cifrado y controles de acceso
- [ ] Migrar datos activos al sistema de reemplazo
- [ ] Documentar la ubicacion del archivo de datos y el cronograma de retencion
- [ ] Confirmar eliminacion de datos que no necesitan retenerse

## 3. Eliminacion de Dependencias

- [ ] Remover servicio de balanceadores de carga upstream y DNS
- [ ] Actualizar servicios upstream para dejar de llamar a este sistema
- [ ] Remover referencias del servicio de API gateways y service meshes
- [ ] Remover servicio de monitoreo, alertas y dashboards
- [ ] Remover servicio de pipelines CI/CD y herramientas de despliegue
- [ ] Remover servicio de administradores de secretos y almacenes de credenciales
- [ ] Remover servicio de cronogramas de respaldo y planes de recuperacion ante desastres

## 4. Apagado

- [ ] Redirigir trafico (si aplica) al reemplazo o pagina de discontinuacion
- [ ] Detener el servicio en staging / pre-produccion
- [ ] Monitorear errores o trafico inesperado por 24-48 horas
- [ ] Detener el servicio en produccion
- [ ] Monitorear nuevamente por 24-48 horas
- [ ] Deshabilitar auto-reinicio o recuperacion de health-check

## 5. Limpieza de Recursos

- [ ] Terminar instancias de computo, contenedores o funciones serverless
- [ ] Eliminar bases de datos (tras confirmar archivo y retencion)
- [ ] Eliminar caches, colas y topics
- [ ] Eliminar buckets y volumenes de almacenamiento
- [ ] Liberar IPs estaticas e interfaces de red elasticas
- [ ] Eliminar listeners de balanceador de carga y target groups
- [ ] Eliminar registros DNS (tras expirar el TTL)
- [ ] Revocar o eliminar certificados SSL
- [ ] Eliminar roles IAM, politicas y cuentas de servicio

## 6. Documentacion

- [ ] Actualizar diagramas de arquitectura para remover el servicio
- [ ] Actualizar runbooks y documentacion operacional
- [ ] Actualizar catalogo de servicios o documentos de propiedad
- [ ] Escribir un breve postmortem o retrospectiva sobre el desmantelamiento
- [ ] Notificar a stakeholders que el servicio ha sido completamente retirado

## 7. Verificacion

- [ ] Confirmar que no hay cargos de facturacion para el servicio en el siguiente ciclo
- [ ] Confirmar que no hay alertas ni errores que referencien el servicio
- [ ] Confirmar que no hay repositorios de codigo que referencien el servicio (excluyendo historial)
- [ ] Confirmar que ningun ingeniero nuevo esta siendo onboarded al servicio retirado
```

## Explicacion

La checklist esta ordenada por riesgo: descubrimiento primero (para saber que estas tocando), manejo de datos segundo (para no eliminar algo que debes conservar), eliminacion de dependencias tercero (para que sistemas upstream no se rompan), apagado cuarto, limpieza quinto y documentacion al final. La seccion de verificacion atrapa lo que siempre se olvida: un registro DNS con TTL largo, un trabajo cron en un servidor olvidado, o un rol IAM que silenciosamente otorga acceso a otra cosa.

## Script de Verificacion de Recursos Remanentes

```bash
#!/bin/bash
# Verificar recursos remanentes despues del desmantelamiento
set -euo pipefail

SERVICE_NAME="legacy-auth-service"
AWS_REGION="us-east-1"

echo "=== Verificacion de Recursos Remanentes ==="
echo "Servicio: $SERVICE_NAME"
echo "Fecha: $(date)"
echo ""

# Verificar registros DNS
echo "--- Registros DNS ---"
dig +short "$SERVICE_NAME.internal.example.com" && echo "ADVERTENCIA: Registro DNS aun existe" || echo "OK: Sin registro DNS"

# Verificar recursos AWS
echo "--- Recursos AWS ---"
aws ec2 describe-instances --region $AWS_REGION --filters "Name=tag:Service,Values=$SERVICE_NAME" --query 'Reservations[*].Instances[*].InstanceId' --output text 2>/dev/null | while read id; do
  [ -n "$id" ] && echo "ADVERTENCIA: Instancia EC2 encontrada: $id"
done

aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[?DBInstanceIdentifier.contains(@, `'$SERVICE_NAME'`)].DBInstanceIdentifier' --output text 2>/dev/null | while read id; do
  [ -n "$id" ] && echo "ADVERTENCIA: Instancia RDS encontrada: $id"
done

aws s3 ls --region $AWS_REGION 2>/dev/null | grep "$SERVICE_NAME" && echo "ADVERTENCIA: Bucket S3 encontrado" || echo "OK: Sin buckets S3"

# Verificar certificados
echo "--- Certificados ---"
aws acm list-certificates --region $AWS_REGION --query 'CertificateSummaryList[*].DomainName' --output text 2>/dev/null | tr '	' '
' | grep -i "$SERVICE_NAME" && echo "ADVERTENCIA: Certificado ACM encontrado" || echo "OK: Sin certificados"

# Verificar CloudWatch alarms
echo "--- Alarmas CloudWatch ---"
aws cloudwatch describe-alarms --region $AWS_REGION --query 'MetricAlarms[?AlarmName.contains(@, `'$SERVICE_NAME'`)].AlarmName' --output text 2>/dev/null | while read alarm; do
  [ -n "$alarm" ] && echo "ADVERTENCIA: Alarma CloudWatch encontrada: $alarm"
done

echo ""
echo "=== Verificacion Completada ==="
```

## Plantilla de Notificacion de Desmantelamiento

```text
=== Notificacion de Desmantelamiento de Servicio ===

Para: engineering@example.com, stakeholders@example.com
De: platform-team@example.com
Fecha: [FECHA]
Asunto: Desmantelamiento de [NOMBRE_SERVICIO]

El servicio [NOMBRE_SERVICIO] sera desmantelado el [FECHA_APERTURA].

Que significa esto?
- El servicio dejara de aceptar trafico el [FECHA_APERTURA]
- Los datos seran archivados y disponibles por [PERIODO_RETENCION]
- Los endpoints devolveran 410 Gone despues del apagado
- Las dependencias upstream deben actualizarse antes del [FECHA_APERTURA]

Que necesitas hacer?
1. Verifica si tu servicio depende de [NOMBRE_SERVICIO]
2. Si depende, migra a [SERVICIO_REEMPLAZO] antes del [FECHA_APERTURA]
3. Actualiza configuraciones, variables de entorno y documentacion
4. Contacta a platform-team@example.com si necesitas ayuda con la migracion

Cronograma:
- [FECHA_HOY]: Notificacion enviada
- [FECHA-30]: Apagado del servicio (stop)
- [FECHA-60]: Eliminacion de infraestructura
- [FECHA-90]: Eliminacion de datos (segun politica de retencion)

Contacto: platform-team@example.com
```

## Checklist de Auditoria Post-Desmantelamiento

```text
=== Auditoria Post-Desmantelamiento (30 dias) ===

Infraestructura:
  [ ] Ningun recurso cloud genera cargos
  [ ] No hay alarmas activas referenciando el servicio
  [ ] No hay dashboards obsoletos en Grafana/Datadog
  [ ] No hay targets en Prometheus/CloudWatch

Red y DNS:
  [ ] Registros DNS eliminados o redirigidos
  [ ] Certificados TLS revocados o eliminados
  [ ] Reglas de firewall/security groups eliminadas
  [ ] Load balancers y target groups eliminados

Codigo y CI/CD:
  [ ] Repositorio archivado (no eliminado)
  [ ] Pipelines de CI/CD deshabilitados
  [ ] Webhooks eliminados
  [ ] Variables de entorno en CI eliminadas

Datos:
  [ ] Backups archivados en almacenamiento economico
  [ ] Politica de retencion documentada
  [ ] Acceso a datos archivados restringido y auditado

Documentacion:
  [ ] Lapida creada en wiki/documentacion
  [ ] Catalogo de servicios actualizado
  [ ] Diagramas de arquitectura actualizados
  [ ] Runbooks referenciando el servicio actualizados
```


## Variantes

| Contexto | Ajustes | Notas |
|---------|---------|-------|
| Reemplazo de servicio de terceros | Agregar terminacion de contrato con proveedor, exportacion de datos y revocacion de claves API | No controlas la infraestructura |
| Retiro solo de base de datos | Enfocarse en migracion de esquema, integridad referencial y redireccion de consultas | Los datos sobreviven al codigo |
| Retiro de microservicio | Agregar remocion de service mesh, actualizacion de contratos y notificacion a consumidores | Los consumidores pueden ser otros equipos |
| Cierre de region | Agregar verificaciones de residencia de datos, migracion de usuarios y evaluacion de impacto de latencia | Las regiones tienen implicaciones de cumplimiento |
| Desmantelamiento de experimento | Checklist mas corta; enfocarse en eliminacion de datos y confirmacion de costos | Los experimentos deben limpiarse rapido |

## Lo que funciona

1. Nunca elimines el primer dia. Deten el servicio, espera y observa. La eliminacion debe ser el ultimo paso
2. Archiva antes de eliminar. El almacenamiento es barato; explicar datos faltantes a auditores es costoso
3. Comunica temprano y frecuentemente. La peor sorpresa de desmantelamiento es descubrir que otro equipo aun usaba el servicio
4. Documenta lo que fue removido. Futuros ingenieros buscaran el servicio; deja una lapida, no un misterio
5. Verifica la facturacion. Los recursos cloud tienen una forma de generar cargos incluso despues de que crees que se fueron

## Errores Comunes

1. Saltarse el descubrimiento. El servicio que estas apagando es una dependencia critica de alguien mas
2. Eliminar datos muy temprano. Una retencion legal, auditoria o necesidad de negocio puede requerir conservacion mas larga de lo que esperas
3. No esperar despues del apagado. Algunos sistemas solo reciben trafico en ciclos mensuales o trimestrales
4. Olvidar el DNS. Un registro DNS apuntando a una IP eliminada puede ser secuestrado o causar errores extranos
5. Ignorar certificados. Los certificados expirados de servicios eliminados aun disparan alertas y automatizaciones de renovacion

## Preguntas Frecuentes

### Cuanto tiempo deberiamos esperar entre el apagado y la limpieza?

Al menos un ciclo de facturacion completo y un ciclo de negocio completo. Si el servicio procesa reportes mensuales, espera hasta el siguiente mes para confirmar que nada se rompio. Para sistemas criticos, 30 dias es un valor seguro por defecto.

### Que pasa si descubrimos una dependencia desconocida despues del apagado?

Ten un plan de rollback: manten los artefactos del servicio (codigo, config, snapshot de datos) por 90 dias despues del apagado. Si se descubre una dependencia critica, puedes reiniciar temporalmente mientras la migras.

### Deberiamos mantener el repositorio de codigo?

Archivalo, no lo elimines. Muevelo a una organizacion "archivo" o "retirado". Preserva el historial git — contiene la justificacion de decisiones que aun pueden ser relevantes. Elimina los triggers activos de CI/CD y las claves de despliegue.


### Que hacemos con los datos despues del desmantelamiento?

Exporta los datos a un formato portable (CSV, JSON, dump SQL) y almacenalos en almacenamiento economico (S3 Glacier, Azure Archive). Documenta el esquema, el significado de cada columna y cualquier transformacion aplicada. Establece una politica de retencion basada en requisitos legales y de negocio. Configura alertas de costo para el almacenamiento de archivo. Crea un procedimiento de recuperacion para casos donde los datos archivados necesiten consultarse.

### Como manejamos dependencias de servicios ya desmantelados?

Antes del apagado, identifica todos los consumidores del servicio usando analisis de trafico, revision de codigo y encuestas a equipos. Notifica a cada consumidor con al menos 30 dias de anticipacion. Proporciona documentacion de migracion y soporte durante la transicion. Si un consumidor no puede migrar a tiempo, considera mantener el servicio en modo solo-lectura hasta que complete la migracion. Documenta cualquier consumidor que no pudo migrar y la razon.

### Deberiamos reutilizar el nombre del servicio despues del desmantelamiento?

No. Los nombres de servicios deben ser unicos en el tiempo para evitar confusion. Si un nuevo servicio usa el mismo nombre, los ingenieros pueden confundirlo con el servicio anterior, lo que lleva a errores de configuracion y referencias incorrectas en documentacion. Usa nombres versionados o descriptivos (auth-service-v2 en lugar de auth-service). Manten una lapida en la documentacion indicando que el nombre original fue retirado.

### Como calculamos el ahorro de costos del desmantelamiento?

Suma todos los costos directos (computo, almacenamiento, red, licencias) y costos indirectos (tiempo de ingenieria para mantenimiento, monitoreo, on-call). Resta el costo del almacenamiento de archivo. Rastrea el ahorro mensualmente durante 6 meses para verificar que los costos realmente disminuyeron. Reporta el ahorro a finanzas y liderazgo. Usa estos numeros para justificar futuros desmantelamientos.

### Que hacemos si necesitamos reiniciar un servicio desmantelado?

Si tienes los artefactos (codigo, configuracion, snapshot de datos) almacenados, puedes reiniciar temporalmente. Sigue el procedimiento de rollback documentado. Notifica que el servicio se reactiva temporalmente. Establece una fecha limite para la migracion definitiva. Si los artefactos fueron eliminados, reconstruye desde el repositorio archivado usando la version etiquetada en el momento del desmantelamiento. Documenta la razon del reinicio y actualiza la lapida.
