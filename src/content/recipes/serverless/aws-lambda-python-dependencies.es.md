---
contentType: recipes
slug: aws-lambda-python-dependencies
title: "Empaquetar Dependencias Python para AWS Lambda con Layers"
description: "Empaquetar dependencias Python para AWS Lambda usando Lambda Layers, builds con Docker para extensiones nativas e integracion con SAM/Serverless Framework."
metaDescription: "Empaqueta dependencias Python para AWS Lambda con Lambda Layers, Docker para extensiones nativas y despliegue con SAM o Serverless Framework."
difficulty: intermediate
topics:
  - serverless
  - devops
  - infrastructure
tags:
  - aws
  - lambda
  - python
  - layers
  - deployment
relatedResources:
  - /recipes/serverless/aws-lambda-cold-start-optimization
  - /recipes/serverless/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/complete-guide-cost-optimization-aws
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Empaqueta dependencias Python para AWS Lambda con Lambda Layers, Docker para extensiones nativas y despliegue con SAM o Serverless Framework."
  keywords:
    - aws lambda python dependencies
    - lambda layers python
    - python lambda packaging
    - native extensions lambda
    - sam serverless python
---

## Descripcion general

AWS Lambda tiene un limite de despliegue de 250MB y se ejecuta en Amazon Linux 2. Los paquetes Python con extensiones nativas (NumPy, pandas, psycopg2) necesitan compilarse para esa plataforma. Lambda Layers resuelve ambos problemas: empaqueta dependencias separadamente del codigo de funcion, pueden compartirse entre funciones y se construyen en el OS correcto. A continuacion: crear layers manualmente, con Docker y con SAM/Serverless Framework.

## Cuando Usar Esto

- Funciones Lambda que necesitan paquetes Python de terceros (requests, SQLAlchemy, pandas)
- Paquetes con extensiones C que deben compilarse para Amazon Linux 2
- Compartir dependencias entre multiples funciones Lambda
- Reducir el tamano del paquete de despliegue moviendo dependencias a un layer

## Prerrequisitos

- Python 3.11+
- AWS CLI configurado con permisos apropiados
- Docker (para builds de extensiones nativas)
- AWS SAM CLI (opcional, para despliegue basado en SAM)

## Solucion

### 1. Build Manual de Layer (Paquetes Python Puros)

```bash
# Crear una estructura de directorios que coincida con el path de Python de Lambda
mkdir -p layer/python
pip install requests pydantic sqlalchemy --target layer/python

# Zipear el layer
cd layer
zip -r ../my-deps-layer.zip python
cd ..

# Publicar el layer
aws lambda publish-layer-version \
  --layer-name my-python-deps \
  --zip-file fileb://my-deps-layer.zip \
  --compatible-runtimes python3.11 python3.12 \
  --compatible-architectures x86_64 arm64
```

### 2. Build con Docker para Extensiones Nativas

Paquetes nativos (NumPy, pandas, psycopg2-binary) deben compilarse para Amazon Linux 2:

```bash
# Build en un container que coincide con el runtime de Lambda
docker run --rm -v "$PWD/layer":/var/task public.ecr.aws/lambda/python:3.11 \
  /bin/sh -c "pip install numpy pandas psycopg2-binary --target /var/task/python"

# Zipear y publicar
cd layer
zip -r ../native-deps-layer.zip python
cd ..

aws lambda publish-layer-version \
  --layer-name native-python-deps \
  --zip-file fileb://native-deps-layer.zip \
  --compatible-runtimes python3.11 \
  --compatible-architectures x86_64
```

### 3. Script Automatizado de Build de Layer

```bash
#!/bin/bash
# build-layer.sh
set -euo pipefail

LAYER_NAME="app-deps"
RUNTIME="python3.11"
ARCH="x86_64"
REQUIREMENTS_FILE="requirements-layer.txt"

# Limpiar build previo
rm -rf build && mkdir -p build/python

# Instalar dependencias en Docker (coincidiendo con runtime de Lambda)
docker run --rm \
  -v "$PWD/build":/var/task \
  public.ecr.aws/lambda/python:${RUNTIME} \
  /bin/sh -c "pip install -r /var/task/../requirements-layer.txt --target /var/task/python"

# Zipear
cd build
zip -r "../${LAYER_NAME}.zip" python
cd ..

# Publicar
LAYER_ARN=$(aws lambda publish-layer-version \
  --layer-name "${LAYER_NAME}" \
  --zip-file "fileb://${LAYER_NAME}.zip" \
  --compatible-runtimes "${RUNTIME}" \
  --compatible-architectures "${ARCH}" \
  --query 'LayerVersionArn' \
  --output text)

echo "Layer published: ${LAYER_ARN}"
echo "${LAYER_ARN}" > layer-arn.txt
```

### 4. Usar el Layer en una Funcion Lambda

```python
# lambda_function.py
import json
import requests  # Desde el layer
from pydantic import BaseModel  # Desde el layer

class ApiResponse(BaseModel):
    status: str
    data: dict

def lambda_handler(event, context):
    response = requests.get("https://api.example.com/data")
    api_data = ApiResponse(status="ok", data=response.json())
    return {
        "statusCode": 200,
        "body": json.dumps(api_data.model_dump()),
    }
```

Desplegar con el layer adjunto:

```bash
# Zipear solo el codigo de funcion (sin dependencias)
zip function.zip lambda_function.py

# Crear o actualizar funcion con layer
aws lambda create-function \
  --function-name my-api \
  --runtime python3.11 \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::123456789012:role/lambda-role \
  --layers $(cat layer-arn.txt)
```

### 5. Template SAM con Layers

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  DepsLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: app-deps
      ContentUri: layer/
      CompatibleRuntimes:
        - python3.11
      CompatibleArchitectures:
        - x86_64

  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-api
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      Layers:
        - !Ref DepsLayer
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /data
            Method: GET
      Environment:
        Variables:
          API_URL: https://api.example.com
```

Build y despliegue:

```bash
# Build el contenido del layer
sam build

# Desplegar
sam deploy --guided
```

### 6. Serverless Framework con Layers

```yaml
# serverless.yml
service: my-api

provider:
  name: aws
  runtime: python3.11
  architecture: x86_64

layers:
  deps:
    path: layer
    name: app-deps
    compatibleRuntimes:
      - python3.11

functions:
  api:
    handler: lambda_function.lambda_handler
    layers:
      - { Ref: DepsLambdaLayer }
    events:
      - http:
          path: /data
          method: get
```

### 7. Estrategia de Split de requirements.txt

Separar dependencias de codigo de funcion de dependencias de layer:

```text
# requirements.txt — nivel funcion (pequeno, cambia a menudo)
boto3>=1.34.0
aws-xray-sdk>=2.12.0

# requirements-layer.txt — nivel layer (grande, cambia raramente)
requests>=2.31.0
pydantic>=2.5.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
numpy>=1.26.0
pandas>=2.1.0
```

### 8. Multiples Layers para Diferentes Necesidades

```yaml
# Template SAM con multiples layers
Resources:
  DataLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: data-deps
      ContentUri: layers/data/
      CompatibleRuntimes: [python3.11]

  HttpLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: http-deps
      ContentUri: layers/http/
      CompatibleRuntimes: [python3.11]

  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      Layers:
        - !Ref DataLayer
        - !Ref HttpLayer
```

## Como Funciona

1. **Estructura del layer**: Lambda espera paquetes Python en `/opt/python/` dentro del zip del layer. Cuando un layer se adjunta, Lambda lo monta en `/opt`, y `/opt/python` se agrega a `PYTHONPATH`.
2. **Extensiones nativas**: Paquetes como NumPy compilan codigo C durante la instalacion. El binario compilado debe coincidir con el OS del runtime de Lambda (Amazon Linux 2) y arquitectura (x86_64 o arm64). Los builds con Docker aseguran compatibilidad.
3. **Limites del layer**: Hasta 5 layers por funcion. El tamano total descomprimido (funcion + layers) debe ser menor a 250MB. Cada layer puede ser hasta 50MB comprimido.
4. **Versionado de layers**: Cada publicacion crea una nueva version inmutable. Las funciones referencian un ARN de version especifica. Actualizar un layer requiere actualizar la funcion para apuntar a la nueva version.
5. **Cold start**: Los layers se cachean en el entorno de ejecucion. La primera invocacion descarga el layer; invocaciones subsecuentes lo reutilizan. Layers mas grandes aumentan el tiempo de cold start.

## Variantes

### Build ARM64 (Graviton)

```bash
# Build para ARM64 (Graviton2 — menor costo, mejor rendimiento)
docker run --rm --platform linux/arm64 \
  -v "$PWD/layer":/var/task \
  public.ecr.aws/lambda/python:3.11-arm64 \
  /bin/sh -c "pip install numpy --target /var/task/python"

aws lambda publish-layer-version \
  --layer-name native-deps-arm64 \
  --zip-file fileb://native-deps-layer.zip \
  --compatible-runtimes python3.11 \
  --compatible-architectures arm64
```

### Runtime Personalizado con Binario Compilado

```dockerfile
# Dockerfile para un layer de Lambda personalizado con extensiones compiladas
FROM public.ecr.aws/lambda/python:3.11

COPY requirements-layer.txt /tmp/
RUN pip install --target /opt/python -r /tmp/requirements-layer.txt

# Compilar cualquier codigo nativo
COPY src/ /opt/native/
RUN cd /opt/native && make install
```

### Usar Layers Proporcionados por AWS

```bash
# Listar layers proporcionados por AWS
aws lambda list-layers

# Usar el layer de Pillow de AWS (pre-construido para Lambda)
aws lambda update-function-configuration \
  --function-name my-image-processor \
  --layers arn:aws:lambda:us-east-1:770693414926:layer:Klayers-p311-Pillow:1
```

## Mejores Practicas

- **Dividir layers por frecuencia de cambio**: Pon dependencias estables (pandas, numpy) en un layer y las que cambian frecuentemente en otro. Esto maximiza la reutilizacion del cache de layers.
- **Usar Docker para cualquier paquete con extensiones C**: Instalar localmente en macOS/Windows produce binarios que no funcionaran en Amazon Linux 2 de Lambda.
- **Fijar versiones de dependencias**: Usa `==` en requirements.txt para asegurar builds reproducibles. Una nueva version de una dependencia no deberia romper tu layer.
- **Mantener el codigo de funcion pequeno**: Solo incluye el handler y logica de negocio en el zip de funcion. Mueve todas las dependencias a layers.
- **Usar ARM64 cuando sea posible**: Los procesadores Graviton2 son mas baratos y rapidos para muchos workloads. Build layers separadas para x86_64 y arm64.
- **Minimizar el conteo de layers**: Puedes adjuntar hasta 5 layers. Consolida paquetes relacionados en un layer para mantenerte bajo el limite.

## Errores Comunes

- **Instalar paquetes localmente en macOS/Windows**: Las extensiones nativas compiladas para tu OS no funcionaran en Lambda. Siempre usa Docker con la imagen del runtime de Lambda.
- **Exceder el limite de 250MB descomprimido**: Dependencias grandes (pandas, scipy) pueden empujarte sobre el limite. Usa alternativas mas ligeras o elimina archivos innecesarios.
- **No fijar versiones**: Un `pip install` sin versiones fijas puede traer un paquete mas nuevo e incompatible. Siempre fija versiones.
- **Incluir `.pyc` y `__pycache__`**: Estos agregan tamano innecesario. Agrega `--no-compile` a pip o excluyelos en el zip.
- **Olvidar actualizar la funcion despues de actualizar el layer**: Publicar una nueva version del layer no actualiza automaticamente las funciones. Debes llamar `update-function-configuration` con el nuevo ARN.

## FAQ

**Cual es el tamano maximo para un layer de Lambda?**

50MB comprimido, hasta 250MB descomprimido (combinado con el codigo de funcion). Para dependencias mas grandes, considera funciones Lambda basadas en contenedores (tamano de imagen hasta 10GB).

**Puedo compartir layers entre funciones?**

Si. Los layers son recursos regionales. Cualquier funcion en la misma region y cuenta puede adjuntar un layer. Tambien puedes compartir layers entre cuentas via politicas basadas en recursos.

**Como elimino archivos innecesarios de un layer?**

Despues de pip install, remueve `__pycache__`, `.pyc`, tests, docs y examples:

```bash
find layer/python -type d -name "__pycache__" -exec rm -rf {} +
find layer/python -type d -name "tests" -exec rm -rf {} +
find layer/python -type f -name "*.pyc" -delete
```

**Puedo usar paquetes conda en Lambda?**

No directamente. Lambda ejecuta Amazon Linux 2 con Python del runtime. Usa pip con builds de Docker en su lugar. Para paquetes cientificos, verifica si AWS proporciona un layer pre-construido (ej., el layer de SciPy de AWS).

**Cual es la diferencia entre layers y Lambda con contenedores?**

Los layers son basados en zip y limitados a 250MB. Lambda con contenedores empaqueta la funcion como una imagen Docker (hasta 10GB), dando mas flexibilidad para dependencias grandes y runtimes personalizados.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
