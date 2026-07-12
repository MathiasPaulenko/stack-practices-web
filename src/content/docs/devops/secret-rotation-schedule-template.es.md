---





contentType: docs
slug: secret-rotation-schedule-template
title: "Plantilla de Cronograma de Rotacion de Secretos"
description: "Una plantilla para rastrear y programar la rotacion de claves API, contrasenas, certificados y otros secretos en multiples sistemas."
metaDescription: "Rastrea y programa la rotacion de secretos con esta plantilla. Cubre claves API, contrasenas, certificados, duenos, frecuencia y pasos de verificacion."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - secret-rotation
  - secrets-management
  - certificates
  - api-keys
  - compliance
relatedResources:
  - /docs/rbac-policy-template
  - /docs/access-control-review-template
  - /docs/encryption-key-lifecycle-template
  - /docs/ci-cd-pipeline-security-template
  - /docs/endpoint-security-checklist-template
  - /docs/user-access-audit-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Rastrea y programa la rotacion de secretos con esta plantilla. Cubre claves API, contrasenas, certificados, duenos, frecuencia y pasos de verificacion."
  keywords:
    - rotacion de secretos
    - rotacion de credenciales
    - rotacion de certificados
    - rotacion de api keys
    - gestion de secretos





---

## Descripcion General

Una Plantilla de Cronograma de Rotacion de Secretos te ayuda a rastrear todos los secretos de tu organizacion, su frecuencia de rotacion, duenos y estado actual. Los secretos incluyen claves API, contrasenas, certificados TLS, tokens de firma, llaves de cifrado y credenciales de cuentas de servicio. Un cronograma claro reduce el riesgo de exposicion prolongada de secretos y facilita la respuesta a incidentes.

## Cuando Usar


- For alternatives, see [Complete Guide to Secrets Management](/es/guides/complete-guide-secrets-management/).

- Para construir un inventario de todos los secretos de la organizacion.
- Cuando se planifica una rotacion regular de credenciales.
- Despues de un incidente de seguridad o sospecha de filtracion.
- Al preparar auditorias de cumplimiento como SOC 2 o PCI-DSS.
- Antes de renovar certificados o migrar a un vault de secretos.

## Prerequisitos

- Un inventario de sistemas que almacenan o usan secretos.
- Un vault de secretos o almacen seguro de credenciales.
- Duenos identificados por sistema o aplicacion.
- Procesos de despliegue que permitan actualizar secretos sin downtime.

## Solucion

### Plantilla

#### 1. Resumen del Inventario de Secretos

| Secret | Tipo | Sistema | Dueno | Frecuencia de Rotacion | Ultima Rotacion | Proxima Rotacion | Estado |
|--------|------|---------|-------|------------------------|-----------------|------------------|--------|
| prod-db-password | Contrasena | PostgreSQL | Equipo backend | 90 dias | 2026-05-01 | 2026-07-30 | A tiempo |
| api-gateway-key | API key | Kong | Equipo platform | 180 dias | 2026-01-15 | 2026-07-14 | A tiempo |
| tls-wildcard | Certificado | CDN | DevOps | 365 dias | 2025-09-01 | 2026-08-30 | A tiempo |
| signing-jwt | Token | Auth service | Equipo seguridad | 90 dias | 2026-06-01 | 2026-08-30 | A tiempo |
| backup-encryption | Llave de cifrado | S3 | DevOps | 365 dias | 2025-12-01 | 2026-12-01 | A tiempo |

#### 2. Plantilla de Registro de Rotacion

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| ID de rotacion | Referencia unica | ROT-2026-042 |
| Secret | Nombre del secret rotado | api-gateway-key |
| Fecha de inicio | Cuando comenzo la rotacion | 2026-07-14 |
| Fecha de finalizacion | Cuando se completo la rotacion | 2026-07-15 |
| Responsable | Persona que lidero la rotacion | Carlos Lopez |
| Pasos ejecutados | Lista de sistemas actualizados | Vault, CI/CD, App configs |
| Verificacion | Como se confirmo el funcionamiento | Health checks OK |
| Rollback plan | Como revertir si falla | Restore version anterior en vault |
| Incidentes asociados | IDs de incidentes si aplica | INC-2026-008 |

#### 3. Matriz de Frecuencia Recomendada

| Tipo de Secret | Rotacion | Condicion Adicional |
|----------------|----------|---------------------|
| Credenciales de usuario | 90 dias | O inmediatamente tras sospecha de compromiso |
| API keys de produccion | 90-180 dias | O cuando un desarrollador con acceso se va |
| Tokens de integracion | 180 dias | O cuando cambia el alcance de la integracion |
| Certificados TLS | Antes de vencimiento | 30 dias antes de expiracion |
| Llaves de cifrado | 1-3 anos | O inmediatamente tras rotacion de personal con acceso |
| Cuentas de servicio | 90 dias | O cuando cambia la carga de trabajo |

#### 4. Checklist de Ejecucion de Rotacion

- [ ] Generar un nuevo valor del secret en el vault seguro.
- [ ] Actualizar el secret en todos los servicios o consumidores.
- [ ] Reiniciar o recargar los servicios que dependen del secret.
- [ ] Ejecutar pruebas de smoke en cada servicio afectado.
- [ ] Confirmar que los servicios antiguos ya no usan el valor anterior.
- [ ] Revocar el valor anterior del secret en el vault.
- [ ] Registrar la rotacion en el cronograma.
- [ ] Notificar al equipo de seguridad y duenos del sistema.

## Explicacion

La rotacion de secretos es un control preventivo, no solo correctivo. El cronograma hace visible la exposicion acumulada de cada secret y crea una trazabilidad para auditorias. Separar el inventario del registro de rotacion permite planificar por anticipado y documentar cada cambio realizado.

## Variantes

- **Cronograma de certificados**: Solo certificados SSL/TLS con fechas de vencimiento y emisor.
- **Plan de respuesta a filtracion**: Enfocado en rotacion de emergencia tras una brecha sospechada.
- **Cronograma de credenciales de terceros**: Rastrea API keys de proveedores como cloud, payment gateways o SaaS.
- **Registro de rotacion de llaves de cifrado**: Documenta llaves KMS, GPG y llaves de cifrado en reposo.

## Lo que funciona

- Automatiza la rotacion siempre que sea posible usando un vault o secret manager.
- Nunca almacenes secretos en repositorios, logs o configuraciones locales.
- Notifica a los duenos del sistema con anticipacion sobre la proxima rotacion.
- Prueba el rollback de un secret antes de rotar en produccion.
- Usa nombres consistentes para que el inventario sea buscable.
- Sincroniza la rotacion con eventos de baja de personal o cambio de rol.
- Documenta como verificar que un servicio esta usando el nuevo secret.

## Errores Comunes

- Rotar solo el secret en un sistema y olvidar otro consumidor.
- No verificar que el servicio antiguo dejo de usar el valor anterior.
- Guardar el valor nuevo y el viejo en el mismo lugar.
- No programar rotacion de certificados y descubrir el vencimiento en produccion.
- Perder la trazabilidad de quien aprobo o ejecuto una rotacion.

## FAQs

### Cada cuanto se deben rotar los secretos?

Depende del tipo y del riesgo. Las credenciales de alta sensibilidad pueden rotar cada 90 dias, mientras que certificados TLS se rotan al menos 30 dias antes de vencer. Tras un incidente o filtracion, se debe rotar inmediatamente.

### Debe la rotacion ser manual?

No idealmente. Usa un secret manager o vault con rotacion automatica. Cuando la rotacion automatica no es posible, un cronograma con recordatorios y checklist reduce la probabilidad de errores.

### Que pasa si olvidamos un consumidor del secret?

El servicio olvidado fallara cuando se revoque el valor anterior. Manten un inventario de todos los consumidores y ejecuta pruebas de integracion despues de la rotacion para detectar dependencias perdidas.

## Soluciones Avanzadas

### Rotacion automatica de secretos con HashiCorp Vault

Configura Vault dynamic secrets para bases de datos de modo que las credenciales se generen on-demand con TTLs cortos en vez de rotacion manual:

```hcl
# Habilitar database secrets engine
vault secrets enable database

# Configurar conexion PostgreSQL
vault write database/config/payments-postgresql \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db.internal:5432/payments?sslmode=disable" \
    allowed_roles="readonly,readwrite" \
    username="vault-admin" \
    password="$(vault kv get -field=password secret/db/vault-admin)"

# Crear un role con TTL de 1 hora
vault write database/roles/readonly \
    db_name=payments-postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Las aplicaciones piden credenciales al iniciar
vault read database/creds/readonly
# Retorna: username=v-token-readonly-abc123  password=s3cr3t  lease_duration=3600
```

### Script de rotacion de llaves AWS IAM

Automatiza la rotacion de access keys de AWS para service accounts con un script Python:

```python
#!/usr/bin/env python3
"""Rotar AWS IAM access keys con zero downtime."""
import boto3
import time
import sys

def rotate_iam_key(username: str) -> None:
    iam = boto3.client("iam")

    # Listar keys actuales
    keys = iam.list_access_keys(UserName=username)["AccessKeyMetadata"]
    if len(keys) >= 2:
        print(f"User {username} already has 2 keys. Delete one before rotating.")
        sys.exit(1)

    # Crear nueva key
    new_key = iam.create_access_key(UserName=username)["AccessKey"]
    print(f"New key created: {new_key['AccessKeyId']}")

    # Actualizar config de aplicacion con nueva key
    # (desplegar actualizacion de config aqui, reiniciar servicios, etc.)
    print("Update application config and restart services.")
    input("Press Enter once services are using the new key...")

    # Verificar que la nueva key funciona
    sts = boto3.client(
        "sts",
        aws_access_key_id=new_key["AccessKeyId"],
        aws_secret_access_key=new_key["SecretAccessKey"],
    )
    sts.get_caller_identity()
    print("New key verified.")

    # Desactivar y eliminar key vieja
    for old_key in keys:
        iam.update_access_key(
            UserName=username,
            AccessKeyId=old_key["AccessKeyId"],
            Status="Inactive",
        )
        iam.delete_access_key(
            UserName=username,
            AccessKeyId=old_key["AccessKeyId"],
        )
        print(f"Old key deleted: {old_key['AccessKeyId']}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: rotate-iam-key.py <username>")
        sys.exit(1)
    rotate_iam_key(sys.argv[1])
```

### Rotacion de secrets de Kubernetes con rolling restart

Rota secrets de Kubernetes y triggera un rolling update sin downtime:

```bash
#!/bin/bash
set -euo pipefail

SECRET_NAME="db-credentials"
NAMESPACE="production"

# Crear nueva version del secret
kubectl create secret generic "${SECRET_NAME}-v2" \
    --from-literal=username=app_user \
    --from-literal=password="$(openssl rand -base64 32)" \
    --namespace "$NAMESPACE" -o yaml --dry-run=client | kubectl apply -f -

# Actualizar deployment para usar el nuevo secret
kubectl set env deployment/app-deployment \
    --namespace "$NAMESPACE" \
    DB_SECRET_NAME="${SECRET_NAME}-v2"

# Triggerar rolling restart para que tome el nuevo secret
kubectl rollout restart deployment/app-deployment --namespace "$NAMESPACE"

# Esperar a que el rollout complete
kubectl rollout status deployment/app-deployment --namespace "$NAMESPACE"

# Limpiar secret viejo despues del rollout exitoso
kubectl delete secret "$SECRET_NAME" --namespace "$NAMESPACE" 2>/dev/null || true
kubectl label secret "${SECRET_NAME}-v2" --namespace "$NAMESPACE" version=current

echo "Secret rotated and deployment updated successfully."
```

## Mejores Practicas Adicionales

1. **Usa rotacion dual-key para zero downtime.** Manten dos keys activas durante la rotacion. Despliega la nueva key, verifica, luego revoca la vieja. Esto previene disrupcion del servicio si la nueva key tiene problemas:

```yaml
# Config de aplicacion soportando dual keys
database:
  primary:
    host: db.internal
    password: ${DB_PASSWORD_V2}
  fallback:
    host: db.internal
    password: ${DB_PASSWORD_V1}
```

2. **Monitorea patrones de acceso a secrets despues de la rotacion.** Acceso inesperado con credenciales viejas indica un servicio que no fue actualizado. Configura alertas para intentos de autenticacion fallidos con secrets revocados:

```python
# Alertar sobre auth fallida con key vieja
if auth_failed and key_version == "old":
    alert_team(f"Service still using revoked key: {service_name}")
```

## Errores Comunes Adicionales

1. **Guardar cronogramas de rotacion en spreadsheets sin control de acceso.** El cronograma mismo revela que secretos existen y cuando son vulnerables. Guarda el cronograma en una wiki segura o herramienta de governance con acceso basado en roles:

```
# Mal: Google Sheet compartido con nombres de secrets y fechas de rotacion
# Bien: wiki interna con RBAC, o herramienta de governance como Vanta/Drata
```

2. **No testear el procedimiento de rotacion antes de un incidente real.** Ejecuta drills de rotacion trimestralmente para verificar que el procedimiento funciona y el equipo conoce los pasos. Documenta los resultados del drill y actualiza el procedimiento si es necesario.

## Preguntas Frecuentes Adicionales

### Cual es la diferencia entre secretos estaticos y dinamicos?

Los secretos estaticos son credenciales de larga vida almacenadas en un vault y recuperadas por las aplicaciones. Requieren rotacion manual o programada. Los secretos dinamicos se generan on-demand por el vault con un TTL corto y se revocan automaticamente cuando el lease expira. Los secretos dinamicos eliminan la rotacion porque expiran automaticamente.

### Como roto secretos en un sistema distribuido sin downtime?

Usa un enfoque de tres fases: (1) Crea el nuevo secret y hazlo disponible junto al viejo. (2) Despliega servicios incrementalmente para usar el nuevo secret, verificando cada instancia. (3) Una vez que todos los servicios usen el nuevo secret, revoca el viejo. Para bases de datos, usa connection pooling con reconexion graceful para manejar el switch de credenciales.
