---
contentType: recipes
slug: aws-lambda-cold-start-optimization
title: "Reducir Cold Start de AWS Lambda con Provisioned Concurrency"
description: "Minimizar la latencia de cold start de Lambda usando provisioned concurrency, ARM64 Graviton, dependencias ligeras y optimizacion del codigo de inicializacion."
metaDescription: "Reduce el cold start de AWS Lambda con provisioned concurrency, ARM64 Graviton, dependencias ligeras y patrones de inicializacion optimizados."
difficulty: advanced
topics:
  - serverless
  - performance
  - infrastructure
tags:
  - aws
  - lambda
  - cold-start
  - provisioned-concurrency
  - performance
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/serverless-dynamodb-single-table
  - /guides/complete-guide-serverless-architecture
  - /guides/complete-guide-aws-lambda-performance
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reduce el cold start de AWS Lambda con provisioned concurrency, ARM64 Graviton, dependencias ligeras y patrones de inicializacion optimizados."
  keywords:
    - aws lambda cold start
    - provisioned concurrency
    - lambda performance
    - graviton lambda
    - lambda initialization
---

## Descripcion general

Cold start es el retraso cuando Lambda crea un nuevo entorno de ejecucion para una funcion. Incluye descargar codigo, inicializar el runtime, cargar dependencias y ejecutar codigo de inicializacion. Para APIs sensibles a latencia, cold starts de 1-10 segundos son inaceptables. A continuacion: reducir cold start con provisioned concurrency, ARM64 Graviton, recorte de dependencias, inicializacion lazy y SnapStart (para Java).

## Cuando Usar Esto

- Funciones Lambda que sirven APIs HTTP sincronas con requerimientos estrictos de latencia
- Funciones con dependencias pesadas (pandas, SQLAlchemy, clientes SDK)
- Workloads de produccion donde los cold starts causan retrasos visibles para el usuario o timeouts
- Funciones que necesitan tiempos de respuesta predecibles bajo trafico variable

## Prerrequisitos

- Funcion Lambda en Python 3.11+
- AWS CLI con permisos para configurar concurrencia
- Comprension del costo de inicializacion de tu funcion

## Solucion

### 1. Medir Cold Start

```python
import json
import time

def lambda_handler(event, context):
    start = time.time()

    # Verificar si es un cold start
    is_cold_start = not hasattr(context, 'warm')

    response = {
        "cold_start": is_cold_start,
        "init_time_ms": round((time.time() - start) * 1000, 2),
        "remaining_time_ms": context.get_remaining_time_in_millis(),
    }

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(response),
    }
```

Loguear cold starts con CloudWatch Insights:

```text
filter @type = "REPORT"
| parse @message "* Duration: * ms Billed Duration: * ms Memory Size: * MB Max Memory Used: * MB*" as type, duration, billed, memory, maxMemory
| parse @message "* Init Duration: * ms*" as type2, initDuration
| filter ispresent(initDuration)
| stats avg(initDuration), max(initDuration), count() by bin(1h)
```

### 2. Provisioned Concurrency

Pre-calentar entornos de ejecucion para que esten listos para servir inmediatamente:

```bash
# Habilitar provisioned concurrency en un alias
aws lambda put-provisioned-concurrency \
  --function-name my-api \
  --qualifier prod \
  --provisioned-concurrent-executions 10

# Con SAM
```

```yaml
# template.yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-api
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      AutoPublishAlias: prod
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 10
```

### 3. Inicializacion Lazy

Mover inicializacion costosa dentro del handler — solo se ejecuta en la primera peticion, no en cold start:

```python
import json

# MAL: Inicializacion a nivel modulo — se ejecuta en cada cold start
# import pandas as pd
# df = pd.read_csv('data.csv')  # 2-3 segundos

# BIEN: Inicializacion lazy — solo se ejecuta cuando se necesita
_pd = None
_df = None

def get_pandas():
    global _pd
    if _pd is None:
        import pandas as pd
        _pd = pd
    return _pd

def get_data():
    global _df
    if _df is None:
        pd = get_pandas()
        _df = pd.read_csv('data.csv')
    return _df

def lambda_handler(event, context):
    df = get_data()
    result = df.head(10).to_dict(orient="records")
    return {
        "statusCode": 200,
        "body": json.dumps(result),
    }
```

### 4. Cambiar a ARM64 (Graviton2)

Los procesadores ARM64 Graviton2 tienen cold starts mas rapidos para muchos workloads:

```bash
# Actualizar arquitectura de funcion
aws lambda update-function-configuration \
  --function-name my-api \
  --architectures arm64

# Rebuild layer para ARM64
docker run --rm --platform linux/arm64 \
  -v "$PWD/layer":/var/task \
  public.ecr.aws/lambda/python:3.11-arm64 \
  /bin/sh -c "pip install -r requirements.txt --target /var/task/python"
```

### 5. Reducir Tamano del Paquete

Eliminar archivos innecesarios de los paquetes de despliegue:

```bash
# Remover tests, docs, __pycache__
find layer/python -type d -name "tests" -exec rm -rf {} +
find layer/python -type d -name "__pycache__" -exec rm -rf {} +
find layer/python -type f -name "*.pyc" -delete
find layer/python -type f -name "*.so" -exec strip {} \;

# Usar alternativas mas ligeras
# En lugar de pandas: usa polars (10x mas pequeno, init mas rapido)
# En lugar de requests: usa urllib3 o el cliente HTTP integrado de boto3
# En lugar de SQLAlchemy: usa psycopg2 directo o aiobotocore
```

### 6. Reutilizacion de Conexiones Fuera del Handler

Inicializar clientes una vez a nivel modulo para que persistan entre invocaciones warm:

```python
import json
import boto3
import os

# Nivel modulo: se ejecuta una vez por entorno de ejecucion
# Estos persisten entre invocaciones warm
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

# Pero mantenlo ligero — solo clientes, no datos
def lambda_handler(event, context):
    # Invocacion warm reutiliza el cliente de tabla
    response = table.get_item(Key={'id': event['pathParameters']['id']})
    return {
        "statusCode": 200,
        "body": json.dumps(response.get('Item', {})),
    }
```

### 7. Usar Lambda Powertools para Logging Estructurado

Evitar frameworks de logging pesados que ralentizan la inicializacion:

```python
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths

logger = Logger()

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
def lambda_handler(event, context):
    logger.info("Processing request", extra={"path": event["path"]})
    return {"statusCode": 200, "body": json.dumps({"ok": True})}
```

### 8. Plugin Warm-Up (Serverless Framework)

Mantener funciones calientes con invocaciones periodicas:

```yaml
# serverless.yml
service: my-api

provider:
  name: aws
  runtime: python3.11

functions:
  api:
    handler: lambda_function.lambda_handler
    events:
      - http: { path: /data, method: get }

plugins:
  - serverless-plugin-warmup

custom:
  warmup:
    warmerName: 'warmer'
    schedule: 'rate(5 minutes)'
    concurrency: 5
    batchSize: 1
```

## Como Funciona

1. **Fases del cold start**: (1) Descargar codigo de funcion + layers, (2) Inicializar runtime (interprete Python), (3) Cargar modulos y ejecutar codigo a nivel modulo, (4) Ejecutar handler. Las fases 1-3 son la "init duration" mostrada en CloudWatch.
2. **Provisioned concurrency**: AWS pre-crea entornos de ejecucion y los mantiene listos. Las peticiones se enrutan a entornos pre-calentados con cero tiempo de init. El scale-from-zero solo ocurre mas alla de la capacidad provisionada.
3. **Inicializacion lazy**: El codigo a nivel modulo se ejecuta en cada cold start. Mover operaciones costosas (lecturas de archivos, imports pesados) a funciones que se ejecutan en primer uso difiere el costo a cuando realmente se necesita.
4. **ARM64**: Los procesadores Graviton2 tienen pipelines de instrucciones diferentes que pueden ser mas rapidos para las extensiones C de Python. El runtime mismo tambien esta optimizado para ARM.
5. **Invocaciones warm**: Despues de un cold start, el entorno de ejecucion persiste por 5-15 minutos. Las invocaciones subsecuentes lo reutilizan — sin init duration. Los plugins de warm-up envian pings periodicos para mantener los entornos vivos.

## Variantes

### SnapStart (Java)

Para funciones Java, SnapStart cachea la JVM inicializada:

```yaml
# Template SAM
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: java21
      Handler: com.example.Handler
      SnapStart:
        ApplyOn: PublishedVersions
```

### Runtime Personalizado con Init Minimal

```python
# Usar un adaptador ASGI minimal en lugar de un framework completo
# En lugar de Flask/FastAPI (init pesado), usa un handler raw
def lambda_handler(event, context):
    method = event['httpMethod']
    path = event['path']

    if method == 'GET' and path == '/health':
        return {"statusCode": 200, "body": '{"status":"ok"}'}

    if method == 'GET' and path.startswith('/products/'):
        product_id = path.split('/')[-1]
        return handle_get_product(product_id)

    return {"statusCode": 404, "body": '{"error":"not found"}'}
```

### EFS para Dependencias Grandes

Montar EFS en lugar de empaquetar archivos grandes en el despliegue:

```yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      FileSystemConfigs:
        - Arn: !GetAtt AccessPoint.Arn
          LocalMountPath: /mnt/data
```

## Mejores Practicas

- **Perfilizar antes de optimizar**: Usa CloudWatch Insights para medir init duration. No adivines — mide.
- **Mover solo init costoso a lazy**: Los clientes a nivel modulo (boto3) son baratos. Lecturas de archivos, imports pesados y procesamiento de datos deberian ser lazy.
- **Dimensionar memoria correctamente**: Mas memoria = mas CPU. 1024MB a menudo reduce a la mitad el cold start vs 256MB. Prueba diferentes tamanos.
- **Usar provisioned concurrency para caminos criticos**: Solo habilitalo para funciones donde el cold start es visible para el usuario (APIs). Los workers en background pueden tolerar cold starts.
- **Minimizar dependencias**: Cada import agrega al init time. Usa `pip install --no-deps` para verificar que trae un paquete.
- **Mantener el codigo del handler pequeno**: El zip del handler deberia ser menor a 5MB. Mueve dependencias a layers.

## Errores Comunes

- **Importar todo a nivel modulo**: `import pandas` al principio agrega 1-2 segundos a cada cold start. Usa imports lazy.
- **Leer archivos a nivel modulo**: `open('config.json').read()` se ejecuta en cada cold start. Cachealo en un global con init lazy.
- **Sobre-provisionar concurrencia**: Provisioned concurrency cuesta dinero 24/7. Establecelo a tu trafico baseline, no al pico.
- **Ignorar configuracion de memoria**: Lambda asigna CPU proporcional a la memoria. Funciones de 128MB tienen CPU limitado y init lento.
- **Usar frameworks pesados**: Flask + Werkzeug agregan 200-500ms de init. Usa handlers ligeros o API Gateway + integracion proxy de Lambda.

## FAQ

**Cual es la duracion tipica de un cold start?**

Funciones Python con dependencias ligeras: 200-500ms. Con pandas/numpy: 1-3 segundos. Java con Spring: 5-10 segundos (usa SnapStart). Provisioned concurrency lo reduce a casi cero.

**Provisioned concurrency elimina los cold starts completamente?**

Para peticiones dentro de la capacidad provisionada, si. Si el trafico excede la concurrencia provisionada, se crean nuevos entornos con cold starts normales. Establece provisioned concurrency a tu baseline esperado.

**Como afecta la memoria al cold start?**

Lambda asigna CPU proporcional a la memoria. Una funcion de 256MB obtiene ~1/8 CPU; una de 2048MB obtiene una CPU completa. Mas CPU significa inicializacion mas rapida. 1024-2048MB es optimo para la mayoria de funciones.

**Puedo evitar cold starts sin provisioned concurrency?**

Puedes reducirlos con plugins de warm-up (pings periodicos), pero no eliminarlos. Los entornos warm eventualmente expiran (5-15 minutos de inactividad). Provisioned concurrency es la unica garantia.

**SnapStart funciona para Python?**

No. SnapStart es solo para Java. Captura el estado de la JVM inicializada como snapshot y la restaura en milisegundos. Para Python, usa provisioned concurrency e inicializacion lazy.
