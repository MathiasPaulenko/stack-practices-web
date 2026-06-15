---
contentType: recipes
slug: secret-management
title: "Gestionar Secretos de Aplicaciones de Forma Segura"
description: "Cómo almacenar, rotar e inyectar API keys, contraseñas de base de datos y certificados sin hardcodearlos en código fuente o archivos de entorno."
metaDescription: "Aprende gestión de secretos. Almacena, rota e inyecta API keys y contraseñas de forma segura sin hardcodearlas en código fuente."
difficulty: intermediate
topics:
  - devops
tags:
  - secret-management
  - vault
  - aws-secrets-manager
  - kubernetes-secrets
  - environment-variables
  - security
  - devops
  - ci-cd
relatedResources:
  - /recipes/environment-variables
  - /recipes/docker-basics
  - /recipes/api-security-headers
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende gestión de secretos. Almacena, rota e inyecta API keys y contraseñas de forma segura sin hardcodearlas en código fuente."
  keywords:
    - gestion secretos
    - vault hashicorp
    - aws secrets manager
    - kubernetes secrets
    - credenciales seguras
    - rotacion contraseñas
---

## Visión general

Los secretos — API keys, contraseñas de base de datos, certificados TLS, claves de encriptación — son las joyas de la corona de cualquier aplicación. Hardcodearlos en código fuente los commitea a control de versiones para siempre, expuestos a cualquiera con acceso al repositorio. Almacenarlos en archivos `.env` de texto plano en servidores los deja legibles por cualquier proceso corriendo como el mismo usuario.

La gestión segura de secretos significa almacenarlos en vaults dedicados con encriptación at rest, control de acceso, audit logging y rotación automática. Las aplicaciones obtienen secretos en runtime a través de llamadas API autenticadas, nunca persistiéndolos a disco. Esta receta cubre secret managers nativos de cloud (AWS, GCP, Azure), HashiCorp Vault y Kubernetes Secrets.

## Cuándo usarlo

Usa esta receta cuando:

- Migrando de archivos `.env` de desarrollo a almacenamiento de secretos de producción
- Rotando credenciales comprometidas o cumpliendo con requerimientos de auditoría de seguridad
- Compartiendo secretos entre microservicios, pipelines CI/CD y miembros del equipo
- Gestionando certificados TLS, claves SSH o strings de conexión a base de datos
- Auditando quién accedió a qué secreto y cuándo

## Solución

### AWS Secrets Manager (Python)

```python
import boto3
import json

client = boto3.client('secretsmanager')

def get_secret(secret_name):
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

db_creds = get_secret('prod/db/postgres')
conn = psycopg2.connect(
    host=db_creds['host'],
    user=db_creds['username'],
    password=db_creds['password'],
)
```

### HashiCorp Vault (Go)

```go
import "github.com/hashicorp/vault/api"

client, _ := api.NewClient(api.DefaultConfig())
client.SetToken("s.xxx")

secret, _ := client.KVv2("secret").Get(context.Background(), "database/creds")
username := secret.Data["username"].(string)
password := secret.Data["password"].(string)
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: "{{ .Values.dbPassword }}"
```

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
```

## Explicación

- **Encriptación at rest**: Los secretos se encriptan antes de escribirse a disco. AWS usa KMS, Vault usa su propio motor de encriptación, y Kubernetes almacena secrets base64-encoded (siempre habilita encriptación de etcd para K8s).
- **Secretos dinámicos**: Vault y AWS pueden generar credenciales de corta duración bajo demanda. Un rol de PostgreSQL podría ser válido por 1 hora y luego revocarse automáticamente, minimizando el blast radius si se filtran.
- **Control de acceso**: Políticas IAM, políticas de Vault y RBAC de Kubernetes restringen qué servicios o usuarios pueden leer qué secretos. Nunca otorgues acceso de lectura a todos los secretos.
- **Audit logging**: cada lectura, escritura y rotación de secreto se loguea. Reenvía estos logs a herramientas SIEM para detección de anomalías.

## Variantes

| Herramienta | Plataforma | Secretos dinámicos | Auto-rotación | Mejor para |
|-------------|------------|-------------------|---------------|------------|
| AWS Secrets Manager | AWS | Sí | Sí | Workloads nativos AWS |
| HashiCorp Vault | Multi | Sí | Sí | Multi-cloud, on-prem |
| Azure Key Vault | Azure | Parcial | Sí | Ecosistemas Azure |
| GCP Secret Manager | GCP | No | No | Workloads nativos GCP |
| Kubernetes Secrets | K8s | No | No | Inyección in-cluster |

## Mejores prácticas

- **Nunca commitees secretos a Git**: usa `.gitignore` para archivos `.env` y hooks pre-commit (como `git-secrets` o `truffleHog`) para escanear commits accidentales.
- **Rota secretos regularmente**: configura políticas de rotación automática (30-90 días) y rota inmediatamente si un secreto es expuesto o un empleado se va.
- **Usa acceso least-privilege**: otorga a cada servicio exactamente los secretos que necesita. Un servidor web no necesita la clave de encriptación de backups.
- **Cachea secretos brevemente, no para siempre**: obtén secretos al inicio y refréscalos periódicamente. No llames al secret manager en cada request.
- **Separa secretos por entorno**: `prod/db/password`, `staging/db/password` y `dev/db/password` deberían ser valores diferentes en diferentes paths de vault.

## Errores comunes

- **Almacenar secretos en variables de entorno en hosts compartidos**: las variables de entorno son visibles por todos los procesos en la misma máquina. Usa inyección basada en archivos o sidecars de secretos dedicados en su lugar.
- **Olvidar rotar después de brechas**: cambiar la contraseña de aplicación no es suficiente. Rota API keys, certificados y secretos de sesión de forma comprehensiva.
- **Loguear secretos**: nunca loguees el valor completo de un secreto. Si debes loguear acceso, loguea el nombre del secreto y timestamp, nunca la contraseña misma.
- **Usar Kubernetes Secrets sin encriptación de etcd**: por default, los Kubernetes Secrets están base64-encoded, no encriptados. Habilita encriptación at rest de etcd.

## Preguntas frecuentes

**P: ¿Debería usar un archivo `.env` en producción?**
R: Solo como último recurso. Los archivos `.env` son legibles por cualquiera con acceso al servidor. Prefiere un secret manager que provea encriptación, control de acceso y rotación.

**P: ¿Cómo comparto secretos entre miembros del equipo de forma segura?**
R: Usa un password manager de equipo (1Password, Bitwarden) para credenciales humanas y un secret manager (Vault, AWS SM) para credenciales de aplicación. Nunca compartas via Slack o email.

**P: ¿Qué es secret sprawl?**
R: La duplicación no controlada de secretos a través de sistemas, repos y archivos. Combátelo con un vault centralizado y políticas estrictas de rotación.

**P: ¿Puedo usar Kubernetes Secrets para todo?**
R: Los K8s Secrets están bien para inyección in-cluster pero carecen de features avanzados como generación dinámica y sharing cross-cluster. Usa un vault dedicado para requerimientos complejos.

