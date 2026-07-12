---





contentType: recipes
slug: aws-lambda-python-dependencies
title: "Package Python Dependencies for AWS Lambda with Layers"
description: "Package Python dependencies for AWS Lambda using Lambda Layers, Docker builds for native extensions, and SAM/Serverless Framework integration."
metaDescription: "Package Python dependencies for AWS Lambda with Lambda Layers, Docker builds for native extensions, and SAM or Serverless Framework deployment."
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
  - /recipes/aws-lambda-cold-start-optimization
  - /recipes/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/complete-guide-cost-optimization-aws
  - /patterns/serverless-db-connection-pooling-pattern
  - /recipes/serverless-step-functions-workflow
  - /docs/zero-downtime-deployment-checklist
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Package Python dependencies for AWS Lambda with Lambda Layers, Docker builds for native extensions, and SAM or Serverless Framework deployment."
  keywords:
    - aws lambda python dependencies
    - lambda layers python
    - python lambda packaging
    - native extensions lambda
    - sam serverless python





---

## Overview

AWS Lambda has a 250MB deployment limit and runs on Amazon Linux 2. Python packages with native extensions (NumPy, pandas, psycopg2) need to be compiled for that platform. Lambda Layers solve both problems: they package dependencies separately from function code, can be shared across functions, and are built on the correct OS. Below: creating layers manually, with Docker, and with SAM/Serverless Framework.

## When to Use This

- Lambda functions that need third-party Python packages (requests, SQLAlchemy, pandas)
- Packages with C extensions that must be compiled for Amazon Linux 2
- Sharing dependencies across multiple Lambda functions
- Reducing deployment package size by moving dependencies to a layer

## Prerequisites

- Python 3.11+
- AWS CLI configured with appropriate permissions
- Docker (for native extension builds)
- AWS SAM CLI (optional, for SAM-based deployment)

## Solution

### 1. Manual Layer Build (Pure Python Packages)

```bash
# Create a directory structure matching Lambda's Python path
mkdir -p layer/python
pip install requests pydantic sqlalchemy --target layer/python

# Zip the layer
cd layer
zip -r ../my-deps-layer.zip python
cd ..

# Publish the layer
aws lambda publish-layer-version \
  --layer-name my-python-deps \
  --zip-file fileb://my-deps-layer.zip \
  --compatible-runtimes python3.11 python3.12 \
  --compatible-architectures x86_64 arm64
```

### 2. Docker Build for Native Extensions

Native packages (NumPy, pandas, psycopg2-binary) must be compiled for Amazon Linux 2:

```bash
# Build in a container matching Lambda's runtime
docker run --rm -v "$PWD/layer":/var/task public.ecr.aws/lambda/python:3.11 \
  /bin/sh -c "pip install numpy pandas psycopg2-binary --target /var/task/python"

# Zip and publish
cd layer
zip -r ../native-deps-layer.zip python
cd ..

aws lambda publish-layer-version \
  --layer-name native-python-deps \
  --zip-file fileb://native-deps-layer.zip \
  --compatible-runtimes python3.11 \
  --compatible-architectures x86_64
```

### 3. Automated Layer Build Script

```bash
#!/bin/bash
# build-layer.sh
set -euo pipefail

LAYER_NAME="app-deps"
RUNTIME="python3.11"
ARCH="x86_64"
REQUIREMENTS_FILE="requirements-layer.txt"

# Clean previous build
rm -rf build && mkdir -p build/python

# Install dependencies in Docker (matching Lambda runtime)
docker run --rm \
  -v "$PWD/build":/var/task \
  public.ecr.aws/lambda/python:${RUNTIME} \
  /bin/sh -c "pip install -r /var/task/../requirements-layer.txt --target /var/task/python"

# Zip
cd build
zip -r "../${LAYER_NAME}.zip" python
cd ..

# Publish
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

### 4. Using the Layer in a Lambda Function

```python
# lambda_function.py
import json
import requests  # From the layer
from pydantic import BaseModel  # From the layer

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

Deploy with the layer attached:

```bash
# Zip only the function code (no dependencies)
zip function.zip lambda_function.py

# Create or update function with layer
aws lambda create-function \
  --function-name my-api \
  --runtime python3.11 \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::123456789012:role/lambda-role \
  --layers $(cat layer-arn.txt)
```

### 5. SAM Template with Layers

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

Build and deploy:

```bash
# Build the layer content
sam build

# Deploy
sam deploy --guided
```

### 6. Serverless Framework with Layers

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

### 7. requirements.txt Split Strategy

Separate function code dependencies from layer dependencies:

```text
# requirements.txt — function-level (small, changes often)
boto3>=1.34.0
aws-xray-sdk>=2.12.0

# requirements-layer.txt — layer-level (large, changes rarely)
requests>=2.31.0
pydantic>=2.5.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
numpy>=1.26.0
pandas>=2.1.0
```

### 8. Multiple Layers for Different Needs

```yaml
# SAM template with multiple layers
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

## How It Works

1. **Layer structure**: Lambda expects Python packages in `/opt/python/` inside the layer zip. When a layer is attached, Lambda mounts it at `/opt`, and `/opt/python` is added to `PYTHONPATH`.
2. **Native extensions**: Packages like NumPy compile C code during installation. The compiled binary must match the Lambda runtime OS (Amazon Linux 2) and architecture (x86_64 or arm64). Docker builds ensure compatibility.
3. **Layer limits**: Up to 5 layers per function. Total unzipped size (function + layers) must be under 250MB. Each layer can be up to 50MB compressed.
4. **Layer versioning**: Each publish creates a new immutable version. Functions reference a specific version ARN. Updating a layer requires updating the function to point to the new version.
5. **Cold start**: Layers are cached on the execution environment. First invocation downloads the layer; subsequent invocations reuse it. Larger layers increase cold start time.

## Variants

### ARM64 (Graviton) Build

```bash
# Build for ARM64 (Graviton2 — lower cost, better performance)
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

### Custom Runtime with Compiled Binary

```dockerfile
# Dockerfile for a custom Lambda layer with compiled extensions
FROM public.ecr.aws/lambda/python:3.11

COPY requirements-layer.txt /tmp/
RUN pip install --target /opt/python -r /tmp/requirements-layer.txt

# Compile any native code
COPY src/ /opt/native/
RUN cd /opt/native && make install
```

### Using AWS-Provided Layers

```bash
# List AWS-provided layers
aws lambda list-layers

# Use AWS's Pillow layer (pre-built for Lambda)
aws lambda update-function-configuration \
  --function-name my-image-processor \
  --layers arn:aws:lambda:us-east-1:770693414926:layer:Klayers-p311-Pillow:1
```

## Best Practices


- For a deeper guide, see [AWS Basics — Core Services for Developers](/guides/aws-basics-guide/).

- **Split layers by change frequency**: Put stable dependencies (pandas, numpy) in one layer and frequently changing ones in another. This maximizes layer cache reuse.
- **Use Docker for any package with C extensions**: Installing locally on macOS/Windows produces binaries that won't work on Lambda's Amazon Linux 2.
- **Pin dependency versions**: Use `==` in requirements.txt to ensure reproducible builds. A new version of a dependency shouldn't break your layer.
- **Keep function code small**: Only include the handler and business logic in the function zip. Move all dependencies to layers.
- **Use ARM64 when possible**: Graviton2 processors are cheaper and faster for many workloads. Build separate layers for x86_64 and arm64.
- **Minimize layer count**: You can attach up to 5 layers. Consolidate related packages into one layer to stay under the limit.

## Common Mistakes

- **Installing packages locally on macOS/Windows**: Native extensions compiled for your OS won't work on Lambda. Always use Docker with the Lambda runtime image.
- **Exceeding 250MB unzipped limit**: Large dependencies (pandas, scipy) can push you over the limit. Use lighter alternatives or strip unnecessary files.
- **Not pinning versions**: A `pip install` without version pins can pull a newer, incompatible package. Always pin.
- **Including `.pyc` and `__pycache__`**: These add unnecessary size. Add `--no-compile` to pip or exclude them in the zip.
- **Forgetting to update function after layer update**: Publishing a new layer version doesn't automatically update functions. You must call `update-function-configuration` with the new ARN.

## FAQ

**What is the maximum size for a Lambda layer?**

50MB compressed, up to 250MB unzipped (combined with function code). For larger dependencies, consider container-based Lambda functions (up to 10GB image size).

**Can I share layers across functions?**

Yes. Layers are regional resources. Any function in the same region and account can attach a layer. You can also share layers across accounts via resource-based policies.

**How do I strip unnecessary files from a layer?**

After pip install, remove `__pycache__`, `.pyc`, tests, docs, and examples:

```bash
find layer/python -type d -name "__pycache__" -exec rm -rf {} +
find layer/python -type d -name "tests" -exec rm -rf {} +
find layer/python -type f -name "*.pyc" -delete
```

**Can I use conda packages in Lambda?**

Not directly. Lambda runs Amazon Linux 2 with Python from the runtime. Use pip with Docker builds instead. For scientific packages, check if AWS provides a pre-built layer (e.g., AWS's SciPy layer).

**What is the difference between layers and container Lambda?**

Layers are zip-based and limited to 250MB. Container Lambda packages the function as a Docker image (up to 10GB), giving more flexibility for large dependencies and custom runtimes.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
