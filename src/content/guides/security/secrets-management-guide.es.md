---
contentType: guides
slug: secrets-management-guide
title: "Gestión de Secretos — Vault, Cloud Managers y Mejores Prácticas"
description: "Guía práctica de gestión de secretos: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault y GCP Secret Manager con rotación, control de acceso e integración CI/CD."
metaDescription: "Aprende gestión de secretos con Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager. Rotación, control de acceso e integración CI/CD."
difficulty: intermediate
topics:
  - security
  - devops
  - infrastructure
tags:
  - secrets-management
  - hashicorp-vault
  - aws-secrets-manager
  - azure-key-vault
  - gcp-secret-manager
  - secret-rotation
  - guia
relatedResources:
  - /guides/secure-coding-guide
  - /guides/cryptography-basics-guide
  - /guides/zero-trust-architecture-guide
  - /recipes/security/secrets-management-vault
  - /recipes/devops/ci-cd-secrets-injection
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende gestión de secretos con Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager. Rotación, control de acceso e integración CI/CD."
  keywords:
    - secrets-management
    - hashicorp-vault
    - aws-secrets-manager
    - azure-key-vault
    - gcp-secret-manager
    - secret-rotation
    - guia
---

## Overview

Los secretos — contraseñas, claves de API, tokens, certificados — son las llaves de tu reino. Almacenarlos en código fuente, archivos de configuración o variables de entorno es una fuente común de brechas. Una gestión adecuada de secretos asegura que las credenciales estén encriptadas, rotadas, auditadas y accesibles solo para servicios y usuarios autorizados. Esta guía cubre las soluciones líderes de gestión de secretos y las prácticas que las hacen efectivas.

## When to Use

- Tienes credenciales, claves de API o certificados para proteger
- Necesitas compartir secretos entre equipos o servicios
- Quieres auditar quién accedió a qué secreto y cuándo
- Estás construyendo un pipeline CI/CD que necesita secretos en runtime

## Qué No Hacer

| Anti-Patrón | Por Qué Falla | Qué Hacer en su Lugar |
|-------------|--------------|-----------------------|
| Hardcodear secretos en código | Los commits a Git son para siempre; el historial filtra | Usar referencias de secretos |
| Guardar secretos en variables de entorno | Visibles en dumps de procesos, `/proc` y endpoints de debug | Usar gestores de secretos con inyección en runtime |
| Compartir una contraseña entre servicios | El radio de explosión es toda la infraestructura | Credenciales específicas por servicio |
| Nunca rotar secretos | Las claves comprometidas permanecen válidas indefinidamente | Automatizar rotación |
| Enviar secretos por Slack/email | Sin encriptar, sin registro, sin control | Usar herramientas aprobadas de intercambio de secretos |

## HashiCorp Vault

El estándar open-source para gestión de secretos.

### Conceptos Core

| Componente | Propósito |
|------------|-----------|
| Secrets Engine | Almacena o genera secretos (KV, database, PKI, AWS) |
| Auth Method | Cómo usuarios/servicios se autentican (Kubernetes, OIDC, AppRole) |
| Policy | Control de acceso granular (ACL) |
| Dynamic Secret | Credenciales de corta duración, revocadas automáticamente |

### Credenciales Dinámicas de Base de Datos

```bash
# Habilitar motor de secretos de base de datos
vault secrets enable database

# Configurar conexión PostgreSQL
vault write database/config/my-postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app" \
  connection_url="postgresql://{{username}}:{{password}}@db:5432/mydb" \
  username="vaultadmin" \
  password="vaultpass"

# Crear un rol que genera leases de 1 hora
vault write database/roles/app \
  db_name=my-postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Leyendo Secretos en Aplicaciones

```python
import hvac

client = hvac.Client(url='https://vault.example.com')
client.auth.kubernetes.login(role='my-app', jwt=service_account_token)

# Leer un secreto estático
secret = client.secrets.kv.v2.read_secret_version(path='my-app/config')
api_key = secret['data']['data']['api_key']

# Generar credenciales dinámicas de base de datos
db_creds = client.secrets.database.generate_credentials(name='app')
username = db_creds['data']['username']
password = db_creds['data']['password']
```

## AWS Secrets Manager

Rotación de secretos gestionada completamente para cargas de trabajo AWS.

```bash
# Crear un secreto
aws secretsmanager create-secret \
  --name prod/database/password \
  --secret-string '{"username":"admin","password":"supersecret"}'

# Recuperar un secreto
aws secretsmanager get-secret-value --secret-id prod/database/password

# Configurar rotación automática
aws secretsmanager rotate-secret \
  --secret-id prod/database/password \
  --rotation-lambda-arn arn:aws:lambda:...:function:rotation \
  --automatically-after-days 30
```

### Política IAM para Acceso

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:prod/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpc": "vpc-12345"
        }
      }
    }
  ]
}
```

## Azure Key Vault

Integrado con Azure AD y ecosistemas Microsoft.

```bash
# Crear un Key Vault
az keyvault create --name myvault --resource-group mygroup --location eastus

# Almacenar un secreto
az keyvault secret set --vault-name myvault --name db-password --value secret123

# Recuperar un secreto
az keyvault secret show --vault-name myvault --name db-password
```

### Acceso con Managed Identity

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://myvault.vault.azure.net/", credential=credential)

secret = client.get_secret("db-password")
print(secret.value)
```

## GCP Secret Manager

Integración nativa con IAM de GCP y Cloud Run.

```bash
# Crear un secreto
echo -n "supersecret" | gcloud secrets create db-password --data-file=-

# Agregar una versión
echo -n "newsecret" | gcloud secrets versions add db-password --data-file=-

# Acceder desde Cloud Run (sin cambios de código)
gcloud run deploy my-app --set-secrets=DB_PASSWORD=db-password:latest
```

## Integración CI/CD

### GitHub Actions con OIDC

```yaml
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
          aws-region: us-east-1
      - run: |
          DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text)
          echo "DB_PASSWORD=$DB_PASSWORD" >> $GITHUB_ENV
```

### Escaneo de Secretos en Pipelines

```bash
# Detectar secretos antes del merge
 trufflehog filesystem --directory=.
 gitleaks detect --source .
 detect-secrets scan
```

## Estrategias de Rotación

| Estrategia | Mejor Para | Complejidad |
|------------|------------|-------------|
| Manual | Ad-hoc, equipos pequeños | Baja |
| Lambda/Function | AWS RDS, bases de datos estándar | Media |
| Vault Dynamic | Microservicios, multi-cloud | Alta |
| Certificado Auto | Certificados TLS (Let's Encrypt, ACM) | Baja |

## Errores Comunes

- **Usar un secreto para todos los ambientes** — separa secretos de prod, staging y dev
- **Sin logging de auditoría** — no puedes investigar brechas sin logs de acceso
- **Políticas demasiado permisivas** — un token CI/CD comprometido no debería acceder a secretos de producción
- **Ignorar la proliferación de secretos** — claves viejas de API en variables de entorno, logs y backups
- **Sin plan de revocación** — cuando un secreto filtra, ¿qué tan rápido puedes rotarlo?

## FAQ

**¿Debería usar Vault o un gestor nativo de cloud?**
Usa Vault para multi-cloud, flujos complejos o secretos dinámicos. Usa gestores nativos (AWS, Azure, GCP) para simplicidad e integración directa con ese cloud.

**¿Con qué frecuencia debería rotar secretos?**
- Credenciales de base de datos: 30-90 días
- Claves de API: 90 días o al momento de desvinculación de empleado
- Certificados TLS: antes del vencimiento (típicamente anual)
- Emergencia: inmediatamente ante sospecha de compromiso

**¿Puedo evitar que desarrolladores vean secretos?**
Sí. Otorga `read` pero no `list` ni `update`. Usa credenciales dinámicas para que los desarrolladores obtengan permisos temporales y limitados sin ver la contraseña raíz.
