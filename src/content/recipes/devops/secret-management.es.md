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
  - devops
  - secret-management
  - vault
  - ci-cd
  - automation
relatedResources:
  - /recipes/environment-variables
  - /recipes/docker-basics
  - /recipes/api-security-headers
  - /recipes/ansible-playbook
  - /recipes/setup-ssl-certificates
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

La gestión segura de secretos significa almacenarlos en vaults dedicados con encriptación at rest, control de acceso, audit logging y rotación automática. Las aplicaciones obtienen secretos en runtime a través de llamadas API autenticadas, nunca persistiéndolos a disco. Aqui se explica como secret managers nativos de cloud (AWS, GCP, Azure), HashiCorp Vault y Kubernetes Secrets.

## Cuándo usarlo

Usa esta receta cuando:

- Migrando de archivos `.env` de desarrollo a almacenamiento de secretos de producción. Consulta [Environment Variables](/recipes/devops/environment-variables) para patrones de configuración local.
- Rotando credenciales comprometidas o cumpliendo con requerimientos de auditoría de seguridad. Consulta [JWT Authentication](/recipes/authentication/jwt-authentication) para estrategias de rotación de tokens.
- Compartiendo secretos entre microservicios, pipelines CI/CD y miembros del equipo. Consulta [Docker Basics](/recipes/devops/docker-basics) para inyección de secretos en contenedores.
- Gestionando certificados TLS, claves SSH o strings de conexión a base de datos. Consulta [Parse Config Files](/recipes/devops/parse-config-files) para referencias de secretos por configuración.
- Auditando quién accedió a qué secreto y cuándo. Consulta [Structured Logging](/recipes/observability/structured-logging) para auditoría de logs.

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
- **Secretos en vivo**: Vault y AWS pueden generar credenciales de corta duración bajo demanda. Un rol de PostgreSQL podría ser válido por 1 hora y luego revocarse automáticamente, minimizando el blast radius si se filtran.
- **Control de acceso**: Políticas IAM, políticas de Vault y RBAC de Kubernetes restringen qué servicios o usuarios pueden leer qué secretos. Nunca otorgues acceso de lectura a todos los secretos.
- **Audit logging**: cada lectura, escritura y rotación de secreto se loguea. Reenvía estos logs a herramientas SIEM para detección de anomalías.

## Variantes

| Herramienta | Plataforma | Secretos en vivo | Auto-rotación | Mejor para |
|-------------|------------|-------------------|---------------|------------|
| AWS Secrets Manager | AWS | Sí | Sí | Workloads nativos AWS |
| HashiCorp Vault | Multi | Sí | Sí | Multi-cloud, on-prem |
| Azure Key Vault | Azure | Parcial | Sí | Ecosistemas Azure |
| GCP Secret Manager | GCP | No | No | Workloads nativos GCP |
| Kubernetes Secrets | K8s | No | No | Inyección in-cluster |

## Lo que funciona

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
R: Los K8s Secrets están bien para inyección in-cluster pero carecen de capacidades avanzadas como generación en vivo y sharing cross-cluster. Usa un vault dedicado para requerimientos complejos.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### GCP Secret Manager (Node.js)

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({
    name: `projects/my-project/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}

// Uso
const apiKey = await getSecret('stripe-api-key');
```

### Doppler para Sincronización de Secretos

Doppler sincroniza secretos desde un dashboard central a tu entorno de runtime:

```bash
# Instalar Doppler CLI
$ brew install dopplerhq/doppler/doppler

# Login y seleccionar proyecto
$ doppler login
$ doppler setup

# Ejecutar app con secretos inyectados
$ doppler run -- npm start

# Exportar secretos a .env para CI
$ doppler secrets download --no-file --format=env > .env
```

### Vault Agent Sidecar Injector (Kubernetes)

```yaml
# helm values para Vault Agent Injector
injector:
  enabled: true
  replicas: 1

# Anotación de Pod para inyectar secretos como archivos
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "api-server"
    vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/api"
    vault.hashicorp.com/agent-inject-template-db-creds: |
      {{- with secret "database/creds/api" -}}
      DB_USER={{ .Data.username }}
      DB_PASS={{ .Data.password }}
      {{- end }}
spec:
  template:
    spec:
      containers:
      - name: api
        env:
        - name: DB_USER_FILE
          value: /vault/secrets/db-creds
```

### Rotación de Secretos con AWS Lambda

```python
import boto3
import json
import psycopg2

def rotate_secret(event, context):
    client = boto3.client('secretsmanager')
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']

    # Obtener secreto actual
    current = client.get_secret_value(SecretId=secret_arn, VersionStage='AWSCURRENT')
    creds = json.loads(current['SecretString'])

    # Generar nueva contraseña
    new_password = generate_secure_password()

    # Actualizar contraseña de base de datos
    conn = psycopg2.connect(
        host=creds['host'],
        user=creds['username'],
        password=creds['password'],
        dbname='postgres'
    )
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(f"ALTER USER {creds['username']} WITH PASSWORD '{new_password}'")
    cursor.close()
    conn.close()

    # Actualizar secreto en AWS
    new_secret = json.dumps({
        **creds,
        'password': new_password
    })
    client.put_secret_value(
        SecretId=secret_arn,
        SecretString=new_secret,
        VersionStage='AWSPENDING'
    )
    client.update_secret_version_stage(
        SecretId=secret_arn,
        VersionStage='AWSCURRENT',
        MoveToVersion=token,
        RemoveFromVersion=current['VersionId']
    )

def generate_secure_password(length=32):
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(secrets.choice(alphabet) for _ in range(length))
```

### Patrón de Inyección de Variables de Entorno

```python
import os
from functools import lru_cache

@lru_cache(maxsize=1)
def get_secrets():
    """Carga secretos una vez al inicio, cachea por el lifetime del proceso."""
    if os.environ.get('ENVIRONMENT') == 'production':
        # Obtener de AWS Secrets Manager
        import boto3, json
        client = boto3.client('secretsmanager')
        response = client.get_secret_value(SecretId='prod/app/secrets')
        return json.loads(response['SecretString'])
    else:
        # Dev: cargar de archivo .env
        from dotenv import load_dotenv
        load_dotenv()
        return dict(os.environ)

# Uso en la aplicación
secrets = get_secrets()
db_url = secrets.get('DATABASE_URL')
api_key = secrets.get('STRIPE_API_KEY')
```

### Escaneo de Secretos en CI/CD

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Historial completo para escaneo

      - name: TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: .
          extra_args: --only-verified

      - name: GitLeaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Credenciales Dinámicas de Base de Datos con Vault

```bash
# Configurar database secrets engine de Vault
$ vault secrets enable database

# Configurar conexión PostgreSQL
$ vault write database/config/my-postgresql \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db:5432/mydb?sslmode=disable" \
    allowed_roles="readonly"

# Crear un rol que genera credenciales válidas por 1 hora
$ vault write database/roles/readonly \
    db_name=my-postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generar credenciales bajo demanda
$ vault read database/creds/readonly
# Key        Value
# lease_id   database/creds/readonly/abc123
# password   A1b2C3d4E5f6G7h8
# username   v-token-readonly-xyz123
```

## Mejores Prácticas Adicionales

6. **Usa referencias de secretos, no valores.** En archivos de config, referencia secretos por nombre o path, no por valor:

```yaml
# config.yaml
database:
  host: db.internal
  credentials_secret: prod/db/postgres  # Referencia al path de vault
```

7. **Implementa fallback de secretos para dev local.** Permite a developers overridear secretos con archivos `.env` locales:

```python
def get_secret(name):
    # Verificar entorno primero (override de dev local)
    if os.environ.get(name):
        return os.environ[name]
    # Fallback a secret manager
    return fetch_from_vault(name)
```

8. **Etiqueta y categoriza secretos.** Usa convenciones de naming que codifiquen entorno, servicio y tipo:

```text
prod/db/postgres-primary
prod/db/postgres-replica
prod/api/stripe-key
prod/api/sendgrid-key
staging/db/postgres
dev/db/postgres
```

9. **Configura alertas de acceso a secretos.** Alerta sobre patrones de acceso anómalos (fuera de horario, IPs inusuales, lecturas en bulk):

```yaml
# Alarma de CloudWatch para acceso inusual a secretos
AlarmDescription: "Alerta cuando el conteo de acceso a secretos excede el threshold"
MetricName: "GetSecretValue"
Threshold: 100
Period: 300
EvaluationPeriods: 1
```

## Errores Comunes Adicionales

5. **Compartir secretos via chat o email.** Incluso shares "temporales" se loguean en el historial de chat. Usa un secret manager con links de acceso expirables en su lugar.

6. **No revocar secretos cuando miembros del equipo se van.** Crea un checklist de offboarding que incluya rotar todos los secretos que el miembro saliente pudo acceder.

7. **Usar el mismo secreto entre entornos.** Producción y staging nunca deberían compartir una contraseña de base de datos. Un breach de staging se convierte en un breach de producción.

8. **Almacenar secretos en variables de CI/CD sin masking.** La mayoría de herramientas de CI soportan variables enmascaradas. Asegúrate de que los valores de secretos estén enmascarados en logs:

```yaml
# GitHub Actions - los secretos se enmascaran automáticamente
env:
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

## FAQ Adicional

### ¿Cómo manejo secretos en una arquitectura de microservicios?

Cada servicio debería tener su propio set de secretos con políticas de acceso independientes. Usa una identidad de servicio (IAM role, service account, o token de Vault) para autenticarse al secret manager. Nunca compartas un único token de vault entre servicios.

### ¿Cuál es el overhead de obtener secretos en runtime?

Las respuestas de AWS Secrets Manager típicamente toman 50-200ms. Cachea secretos en memoria por 5-15 minutos para minimizar latencia. Las respuestas de Vault son más rápidas (10-50ms) pero también merecen caching.

### ¿Cómo pruebo código que depende de secret managers?

Usa inyección de dependencias e interfaces:

```python
from abc import ABC, abstractmethod

class SecretProvider(ABC):
    @abstractmethod
    def get_secret(self, name: str) -> str: ...

class AWSSecretProvider(SecretProvider):
    def get_secret(self, name: str) -> str:
        # Llamada real a AWS
        ...

class MockSecretProvider(SecretProvider):
    def get_secret(self, name: str) -> str:
        return "test-value"

# En tests
provider = MockSecretProvider()
service = MyService(provider)
```

### ¿Debería encriptar secretos a nivel de aplicación también?

Para datos altamente sensibles (PII, registros financieros), sí. Usa envelope encryption: encripta los datos con una data key, encripta la data key con una master key de KMS/Vault. Esto añade defense in depth más allá de la encriptación de transporte y at-rest del vault.

## Tips de Rendimiento

1. **Cachea secretos en memoria.** Obtén una vez al inicio, refresca periódicamente:

```python
import time

class SecretCache:
    def __init__(self, ttl=300):
        self._cache = {}
        self._ttl = ttl
        self._timestamps = {}

    def get(self, name, fetch_func):
        if name not in self._cache or time.time() - self._timestamps[name] > self._ttl:
            self._cache[name] = fetch_func(name)
            self._timestamps[name] = time.time()
        return self._cache[name]
```

2. **Usa lecturas bulk de secretos.** Obtén todos los secretos de un servicio en una sola llamada API:

```python
# AWS: almacenar todos los secretos del servicio como un único secreto JSON
response = client.get_secret_value(SecretId='prod/api/all-secrets')
all_secrets = json.loads(response['SecretString'])
# all_secrets = {'db_url': '...', 'stripe_key': '...', 'sendgrid_key': '...'}
```

3. **Usa connection pooling para Vault.** Reutiliza conexiones HTTP a Vault:

```go
client, _ := api.NewClient(api.DefaultConfig())
// Client reutiliza conexiones internamente
// Ajusta settings de transport para alto throughput:
transport := &http.Transport{
    MaxIdleConns:        10,
    IdleConnTimeout:     30 * time.Second,
}
```

4. **Pre-carga secretos en init del contenedor.** Obtén secretos durante el startup del contenedor, no en el primer request:

```yaml
# Init container de Kubernetes
initContainers:
- name: secret-loader
  image: secret-loader:latest
  command: ["/bin/sh", "-c"]
  args:
    - |
      vault kv get -field=password secret/db > /secrets/db_password
      vault kv get -field=apikey secret/api > /secrets/api_key
  volumeMounts:
  - name: secrets
    mountPath: /secrets
```

5. **Usa sidecar para rotación de secretos.** Un sidecar puede observar cambios de secretos y enviar señales al contenedor principal:

```yaml
# Vault Agent sidecar envía SIGHUP cuando los secretos cambian
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/agent-inject-command-db-creds: "kill -HUP 1"
```
