---



contentType: docs
slug: secrets-rotation-template
title: "Plantilla de Rotación de Secretos"
description: "Plantilla para programar y rastrear la rotación de claves API, tokens y certificados."
metaDescription: "Usa esta plantilla de rotación de secretos para programar y rastrear la rotación de claves API, tokens, contraseñas y certificados en toda tu infraestructura."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - secrets
  - rotation
  - api-keys
  - tokens
  - certificates
  - credentials
  - template
relatedResources:
  - /docs/api-security-review-template
  - /docs/data-classification-template
  - /docs/incident-response-playbook-template
  - /docs/vendor-risk-assessment-template
  - /docs/data-retention-policy-template
  - /recipes/docker-secrets-management
  - /docs/secrets-rotation-runbook
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de rotación de secretos para programar y rastrear la rotación de claves API, tokens, contraseñas y certificados en toda tu infraestructura."
  keywords:
    - security
    - secrets
    - rotation
    - api-keys
    - tokens
    - certificates
    - credentials
    - template



---
## Visión General

Las credenciales largas de vida son objetivos de alto valor para los atacantes. Un token de API de dos años puede estar en repos Git de ex empleados, en logs de chat, en screenshots de documentación y en 20 servicios que nadie recuerda. La rotación de secretos reduce el tiempo de exposición y limita el blast radius cuando una credencial se filtra. La rotación regular también fuerza la documentación: cuando rotas un secreto, descubres quién realmente lo usa.

## Cuándo Usar


- For alternatives, see [Docker Secrets Management Without Hardcoding Credentials](/es/recipes/docker-secrets-management/).

Usa este recurso cuando:
- Estás estableciendo una política de ciclo de vida de credenciales para tu organización
- Una credencial se filtró y necesitas rastrear qué servicios se vieron afectados
- Estás migrando de secretos manuales a un vault centralizado y necesitas un inventario

## Solución

```markdown
# Programa de Rotación de Secretos: `<Infraestructura / Cuarto>`

## 1. Inventario de Secretos

| Nombre | Tipo | Ubicación | Sistema Consumidor | Responsable | Última Rotación | Próxima Rotación | Cadencia |
|--------|------|-----------|--------------------|-------------|-----------------|------------------|----------|
| `api-gateway-key` | Clave API | HashiCorp Vault | `api-gateway`, `billing-worker` | @platform | 2026-05-01 | 2026-11-01 | 6 meses |
| `db-primary-password` | Contraseña | AWS Secrets Manager | `app`, `analytics` | @dba | 2026-06-01 | 2026-09-01 | 3 meses |
| `tls-cert-prod` | Certificado | ACM + almacenamiento seguro | `cdn`, `lb` | @sre | 2026-01-15 | 2026-07-15 | 6 meses |
| `stripe-webhook-secret` | Secreto compartido | Vault + integración Stripe | `payments` | @payments | 2026-06-01 | 2027-06-01 | 12 meses |

## 2. Política de Rotación

| Tipo de Secreto | Cadencia | Ventana de Rotación | Método | Desactivación Antigua |
|-----------------|----------|---------------------|--------|-----------------------|
| Claves de servicio a servicio | 90 días | 7 días antes de vencimiento | Automatizado (CI/CD) | 24 horas post-rotación |
| Contraseñas de BD | 90 días | 48 horas | Automatizado (script de rotación) | Inmediato tras verificación |
| Tokens de API de terceros | Según proveedor (generalmente 6–12 meses) | 30 días antes | Semi-automático (recordatorio + manual) | Inmediato tras verificación |
| Certificados TLS | 6 meses | 30 días antes | Automatizado (ACME / ACM) | Inmediato tras deploy |
| Claves de cifrado (HSM) | 1 año | 30 días | Manual (ceremonia de cifrado) | Tras confirmación de descifrado con nueva clave |
| Claves SSH de máquina | 90 días | 7 días | Automatizado (gestión de config) | Inmediato tras verificación |

## 3. Procedimiento de Rotación

### Pasos Generales

1. **Preparación:** Verificar todos los servicios consumidores y sus owners
2. **Generación:** Crear nuevo secreto en el vault; no reutilizar valores antiguos
3. **Distribución:** Actualizar secretos en configuración / vault; no enviar por email o chat
4. **Deploy:** Rollout progresivo (canario → staging → producción)
5. **Verificación:** Confirmar que todos los servicios consumidores funcionan con el nuevo secreto
6. **Desactivación:** Desactivar secreto anterior; retener por 24–72 horas para rollback rápido
7. **Documentación:** Actualizar fecha de última rotación; registrar cambios

### Runbook de Rotación: `Nombre del Secreto`

```bash
# 1. Verificar servicios consumidores
vault read secret/api-gateway-key --format=json | jq .data.consumers

# 2. Generar nuevo secreto
vault write secret/api-gateway-key rotation=auto ttl=90d

# 3. Actualizar servicios consumidores
./scripts/update-secret.sh --secret api-gateway-key --services api-gateway,billing-worker

# 4. Verificar salud
./scripts/verify-secret.sh --secret api-gateway-key

# 5. Desactivar antiguo (tras 24h de estabilidad)
vault delete secret/api-gateway-key/v1
```

## 4. Manejo de Excepciones

| Secreto | Justificación de Extensión | Riesgo Aceptado | Aprobado Por | Nueva Fecha Límite |
|---------|---------------------------|-----------------|--------------|-------------------|
| | | | | |

## 5. Comprobaciones de Post-Incidente

| Fecha de Filtración | Secreto | Servicios Afectados | Rotación Forzada | Prueba de Impacto | Notas |
|---------------------|---------|--------------------:|-----------------:|------------------:|------|
| | | | | | |

## 6. Métricas de Rotación

| Mes | Secretos Programados | Rotados a Tiempo | Retrasados | Tasa de Cumplimiento |
|-----|---------------------:|------------------:|-----------:|---------------------:|
| | | | | |
```

## Explicación

La plantilla aborda tres problemas comunes: **no saber qué secretos tienes**, **no saber cuándo expiran** y **no saber quién los usa**. El inventario es el paso uno; sin un inventario, la rotación es imposible. Las cadencias diferenciadas reconocen que no todos los secretos son iguales: los certificados TLS necesitan rotación suave mientras que las claves de API comprometidas necesitan rotación inmediata. El procedimiento de 7 pasos evita el error más común: rotar un secreto, verificar que un servicio funciona y descubrir tres días después que otro servicio falló silenciosamente.

## Automatizacion de Rotacion de Secrets

```bash
#!/bin/bash
# Ejemplo: Rotar password de base de datos con zero downtime
# Usa patron dual-read: password vieja + nueva validas durante transicion

set -euo pipefail

DB_HOST="db.internal"
DB_NAME="appdb"
OLD_USER="app_user_old"
NEW_USER="app_user_new"
NEW_PASSWORD=$(openssl rand -base64 32)

# Paso 1: Crear nuevo usuario con permisos identicos
psql -h "$DB_HOST" -U admin -d "$DB_NAME" -c "
  CREATE USER $NEW_USER WITH PASSWORD '$NEW_PASSWORD';
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $NEW_USER;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO $NEW_USER;
"

# Paso 2: Actualizar secret manager con nuevas credenciales
aws secretsmanager update-secret \
  --secret-id prod/db/app-user \
  --secret-string "{\"username\":\"$NEW_USER\",\"password\":\"$NEW_PASSWORD\"}"

# Paso 3: Triggerar reload de app para tomar nuevo secret
kubectl rollout restart deployment/app -n production

# Paso 4: Esperar a que el rollout complete
kubectl rollout status deployment/app -n production --timeout=300s

# Paso 5: Verificar que nuevas conexiones usan nuevo usuario
psql -h "$DB_HOST" -U admin -d "$DB_NAME" -c "
  SELECT usename, count(*) FROM pg_stat_activity
  WHERE datname='appdb' GROUP BY usename;
"

# Paso 6: Despues de verificacion, eliminar usuario viejo
psql -h "$DB_HOST" -U admin -d "$DB_NAME" -c "DROP USER $OLD_USER;"

echo "Rotacion completa. Usuario viejo eliminado."
```


## Variantes

| Contexto | Desafío | Adaptación |
|----------|---------|------------|
| Microservicios (100+) | Escala; no se puede rotar manualmente | Vault con secretos dinámicos; rotación automatizada por TTL |
| Kubernetes nativo | Secretos en etcd; RBAC complejo | External Secrets Operator; rotación vía controller |
| Múltiples nubes | Secretos dispersos en AWS SM, GCP SM, Azure KV | Vault como abstracción; rotación centralizada |
| Claves de cifrado HSM | Ceremonia de cifrado manual requerida | Agregar checklists de 4 ojos; ceremonia programada trimestralmente |
| Ambientes regulados (PCI DSS) | Auditoría requiere trazabilidad | Log de rotación inmutable; aprobación dual para excepciones |

## Lo que funciona

1. Automatiza todo lo posible; la rotación manual falla consistentemente bajo presión
2. Rotar durante ventanas de bajo tráfico; la rotación siempre tiene riesgo de interrupción
3. Mantener secretos antiguos brevemente activos; la desactivación inmediata impide rollback rápido
4. Alertar 30, 14 y 7 días antes del vencimiento; la rotación de último momento genera errores
5. Auditar acceso a secretos regularmente; los secretos no rotados por 18 meses probablemente estén olvidados y sobre-expuestos

## Errores Comunes

1. Rotar secretos sin identificar consumidores; la rotación más rápida es inútil si dejas un servicio roto
2. No probar el rollback; si la rotación falla a las 2 a.m., necesitas un camino de vuelta
3. Almacenar secretos en repositorios junto con código; ningún sistema de rotación arregla la exposición de credenciales en Git
4. Ignorar secretos de terceros; los tokens de Stripe, Slack y AWS IAM son tan críticos como los internos
5. Tratar la rotación como un evento único; sin cadencia programada, la próxima rotación nunca sucede

## Preguntas Frecuentes

### ¿Con qué frecuencia debería rotar los secretos?

Claves de servicio a servicio y contraseñas de base de datos: 90 días. Certificados TLS: 6 meses (aunque muchas CAs ahora emiten certificados de 90 días). Tokens de API de terceros: según la política del proveedor (generalmente 6–12 meses). Claves de cifrado HSM: 1 año con ceremonia formal. Claves SSH de máquina: 90 días. Estas son guías, no leyes; reduce la cadencia si tus servicios carecen de observabilidad y aumenta si manejas datos muy sensibles o estás bajo presión regulatoria.

### ¿Cómo roto secretos en un sistema legacy sin downtime?

Los sistemas legacy a menudo no soportan secretos duales. El patrón es: (1) crear un nuevo secreto, (2) actualizar el consumidor para soportar ambos secretos, (3) deploy, (4) desactivar el antiguo, (5) limpiar el código de soporte dual. Si el legacy no puede soportar secretos duales, usa una ventana de mantenimiento. Documenta el tiempo de inactividad aceptable y ten un rollback. Para sistemas críticos sin capacidad de dual, considera un proxy o sidecar que maneje la rotación.

### ¿Debería rotar secretos después de la salida de un empleado?

Sí, para todos los secretos a los que el empleado tuvo acceso. Esto incluye tokens de API personales, claves SSH y credenciales compartidas que el empleado pudo haber visto. No asumas que "nunca los usó"; el acceso al vault o al sistema de gestión de configuración es suficiente evidencia de exposición. Las rotaciones forzadas por salida de personal deberían ser estándar, no excepcionales. Automatiza la generación de lista de secretos afectados desde logs de auditoría del vault.


### Cual es la diferencia entre rotacion y revocacion?

La rotacion reemplaza un secret por uno nuevo manteniendo continuidad del servicio. La revocacion invalida un secret inmediatamente, potencialmente causando disrupcion. La rotacion es planificada y usa patrones dual-read. La revocacion es reactiva y se usa cuando un secret se sabe comprometido. Despues de revocar, tambien debes rotar — la revocacion sola deja servicios sin credenciales validas. El procedimiento de rotacion deberia incluir un paso de revocacion al final (eliminar el secret viejo) pero los procedimientos de revocacion deberian ser separados y mas rapidos, disenados para respuesta a incidentes.

### Como gestionamos secrets en pipelines de CI/CD?

Los pipelines de CI/CD necesitan secrets para construir, testear, y desplegar. Nunca almacenes secrets en archivos de configuracion del pipeline o variables de entorno en la UI del CI. Usa un secret manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) e inyecta secrets en runtime. Usa tokens de corta duracion para CI — autenticacion basada en OIDC para proveedores cloud elimina keys de larga duracion. Rota secrets de CI trimestralmente. Audita logs de acceso a secrets de CI mensualmente. Restringe secrets de CI a los permisos minimos necesarios — un pipeline de build no necesita acceso a la base de datos de produccion. Usa secrets separados para jobs de staging y produccion.

### Como manejamos secrets en entornos containerizados?

En Kubernetes: usa External Secrets Operator para sincronizar secrets desde Vault/AWS SM a Kubernetes Secrets. Usa CSI Secrets Store provider para montar secrets como archivos. Nunca hornees secrets en imagenes de contenedor — usa inyeccion en runtime. Para credenciales de base de datos, usa el patron dual-read con init containers. Para certificados TLS, usa cert-manager para rotacion automatica. Para autenticacion servicio-a-servicio, usa SPIFFE/SPIRE para certificados de identidad de corta duracion. Escanea imagenes de contenedor en busca de secrets hardcoded con Trivy o GitLeaks en CI. Si se encuentra un secret en una imagen, rotalo inmediatamente — la imagen puede haber sido descargada por atacantes.

### Que debemos hacer si un secret se filtra?

Si un secret se filtra: rotalo inmediatamente — no esperes a la rotacion programada. Revoca el secret viejo despues de rotar. Investiga la fuga: como fue expuesto (commit a repo publico, archivo de log, captura, output de CI)? Arregla la causa raiz (agrega pre-commit hooks, actualiza logging para redactar secrets, restringe output de CI). Audita logs de acceso para el secret filtrado — fue usado por partes no autorizadas? Si si, tratalo como incidente de seguridad y sigue el playbook de respuesta a incidentes. Notifica a usuarios afectados si sus datos pueden haber sido accedidos. Documenta el incidente y agrega controles para prevenir recurrencia. Un secret filtrado que no se rota es una puerta abierta.

### Como auditamos el uso de secrets?

Habilita logging de acceso en tu secret manager (Vault audit logs, AWS CloudTrail para Secrets Manager). Registra cada lectura, escritura, y eliminacion de secrets. Envia logs a un SIEM (Splunk, ELK) para analisis centralizado. Configura alertas para patrones de acceso anomalo: secret accedido desde una IP nueva, secret accedido fuera de horario laboral, lecturas masivas de secrets, o acceso a secrets por una identidad no humana. Revisa logs de acceso mensualmente — verifica que solo servicios e ingenieros esperados esten accediendo a secrets. Remueve acceso para servicios que ya no necesitan un secret. Revisiones trimestrales de acceso aseguran que los permisos de secrets coincidan con el ownership actual.



































































End of document. Review and update quarterly.