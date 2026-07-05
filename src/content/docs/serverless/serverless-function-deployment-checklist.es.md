---
contentType: docs
slug: serverless-function-deployment-checklist
templateType: post-deployment-checklist
title: "Checklist de Deployment de Funciones Serverless"
description: "Checklist pre-deploy y post-deploy para funciones serverless (AWS Lambda, Azure Functions, GCP Cloud Functions): IAM roles, variables de entorno, memory sizing, timeout, logging, alarmas y rollback procedures."
metaDescription: "Checklist pre-deploy para funciones serverless: IAM, env vars, memory, timeout, logging, alarmas, rollback. Cubre Lambda, Azure, GCP."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - deployment
  - aws-lambda
  - checklist
  - ci-cd
  - cloud-functions
relatedResources:
  - /docs/serverless/serverless-cost-estimation-template
  - /docs/serverless/serverless-cold-start-runbook
  - /docs/serverless/serverless-security-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Checklist pre-deploy para funciones serverless: IAM, env vars, memory, timeout, logging, alarmas, rollback. Cubre Lambda, Azure, GCP."
  keywords:
    - serverless deployment
    - lambda deployment checklist
    - serverless checklist
    - aws lambda
    - azure functions
    - gcp cloud functions
    - serverless ci-cd
---

## Overview

Este checklist cubre pre-deployment y post-deployment verification para funciones serverless across AWS Lambda, Azure Functions y Google Cloud Functions. Cada item debe ser verified antes de promotear una function a production.

---

## 1. Pre-Deployment Checklist

### 1.1 Function Configuration

- [ ] **Memory size** esta seteado al minimum que meets p99 latency target
- [ ] **Timeout** esta seteado a 90% del expected max execution time
- [ ] **Concurrency limit** esta configurado (reserved o provisioned)
- [ ] **Runtime version** esta pinned (no latest)
- [ ] **Handler signature** matchea el runtime expectation
- [ ] **Dead letter queue** (DLQ) esta configurado para failed invocations

```yaml
# AWS Lambda — serverless.yml
functions:
  processOrder:
    handler: src/handlers/processOrder.handler
    memorySize: 512        # MB — tuned via profiling
    timeout: 30            # seconds — 90% of max observed
    reservedConcurrency: 100  # limit concurrent executions
    runtime: nodejs20.x    # pinned runtime
    deadLetter:
      queueName: processOrder-dlq
```

### 1.2 IAM and Permissions

- [ ] **Execution role** tiene minimum required permissions (no `*:*`)
- [ ] **Resource ARNs** estan scoped a specific resources (no `*`)
- [ ] **No hardcoded credentials** en code o environment variables
- [ ] **Secrets** se loadean de Secrets Manager / Key Vault / Secret Manager
- [ ] **Cross-service permissions** estan documented y approved

```yaml
# IAM role — least privilege
iam:
  role:
    statements:
      - Effect: Allow
        Action:
          - s3:GetObject
          - s3:PutObject
        Resource:
          - !Sub "arn:aws:s3:::orders-bucket/*"
      - Effect: Allow
        Action:
          - secretsmanager:GetSecretValue
        Resource:
          - !Sub "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:order-api-key-*"
```

### 1.3 Environment and Configuration

- [ ] **Environment variables** estan seteados per stage (dev, staging, prod)
- [ ] **No secrets en plaintext** environment variables
- [ ] **Feature flags** estan configurados para gradual rollout
- [ ] **Log level** esta seteado appropriately (INFO para prod, DEBUG para dev)
- [ ] **Region** esta seteado al deployment target

```yaml
environment:
  LOG_LEVEL: ${self:custom.logLevel.${sls:stage}}
  DB_HOST: ${ssm:/order-service/${sls:stage}/db-host}
  API_KEY: ${ssm:/order-service/${sls:stage}/api-key~true}  # secure string
  FEATURE_NEW_PRICING: "true"
```

### 1.4 Code Quality

- [ ] **Unit tests** pasan con > 80% coverage
- [ ] **Integration tests** pasan contra staging environment
- [ ] **Linting** pasa (ESLint, Prettier, o equivalent)
- [ ] **No console.log** en production code (usa structured logger)
- [ ] **Dependencies** estan pinned y audited (`npm audit` clean)
- [ ] **Bundle size** esta under 50MB (250MB unzipped limit para Lambda)

```bash
# Pre-deploy checks
npm run lint
npm run test:unit -- --coverage
npm audit --audit-level=high
npx serverless package --stage staging  # verify package builds
```

---

## 2. Infrastructure Checklist

### 2.1 API Gateway / HTTP Trigger

- [ ] **Route** esta configurado y matchea el handler
- [ ] **Method** (GET, POST, etc.) es correcto
- [ ] **CORS** esta configurado para web-facing endpoints
- [ ] **Rate limiting** esta enabled
- [ ] **Request validation** schema esta defined
- [ ] **API key / auth** es required para protected endpoints

```yaml
events:
  - http:
      path: /orders
      method: post
      cors: true
      request:
        schemas:
          application/json: ${file(schema/order-create.json)}
  - http:
      path: /orders/{id}
      method: get
      request:
        parameters:
          paths:
            id: true  # required
```

### 2.2 Event Sources

- [ ] **Event source mapping** esta configurado (SQS, Kinesis, DynamoDB Streams)
- [ ] **Batch size** esta tuned para throughput vs. latency
- [ ] **Retry policy** esta defined (max retries, backoff)
- [ ] **Filter pattern** esta seteado para reduce unnecessary invocations
- [ ] **DLQ** esta attached para poison messages

```yaml
events:
  - sqs:
      arn: !GetAtt OrderQueue.Arn
      batchSize: 10
      maximumBatchingWindow: 5  # seconds
      functionResponseTypes:
        - ReportBatchItemFailures  # partial batch response
      filterPatterns:
        - body: { eventType: [ "ORDER_CREATED" ] }
```

### 2.3 Observability

- [ ] **Structured logging** esta implementado (JSON format)
- [ ] **Distributed tracing** esta enabled (X-Ray, Application Insights)
- [ ] **Custom metrics** se emiten (business metrics)
- [ ] **Dashboards** estan creados para key metrics
- [ ] **Alarms** estan configurados para error rate, duration, throttles

```yaml
# CloudWatch alarms
resources:
  Resources:
    ProcessOrderErrors:
      Type: AWS::CloudWatch::Alarm
      Properties:
        MetricName: Errors
        Namespace: AWS/Lambda
        Statistic: Sum
        Period: 60
        EvaluationPeriods: 1
        Threshold: 5
        ComparisonOperator: GreaterThanThreshold
        AlarmActions:
          - !Ref AlertTopic
```

---

## 3. Deployment Procedure

### 3.1 Deployment Steps

```bash
#!/bin/bash
# deploy.sh — serverless deployment pipeline

set -euo pipefail

STAGE="${1:-staging}"
SERVICE="order-service"

echo "=== Deploying $SERVICE to $STAGE ==="

# 1. Corre tests
echo "Running tests..."
npm run test:unit
npm run test:integration -- --stage=$STAGE

# 2. Packagea
echo "Packaging..."
npx serverless package --stage $STAGE

# 3. Deployea
echo "Deploying..."
npx serverless deploy --stage $STAGE --verbose

# 4. Corre smoke tests
echo "Running smoke tests..."
npm run test:smoke -- --stage=$STAGE --url=$(npx serverless info --stage $STAGE --verbose | grep "endpoint:" | awk '{print $2}')

# 5. Verifica deployment
echo "Verifying deployment..."
npx serverless info --stage $STAGE

echo "=== Deployment complete ==="
```

### 3.2 Canary Deployment

```yaml
# serverless.yml — gradual deployment via CodeDeploy
deploymentMethod: CodeDeploy

deploymentPreference:
  type: Canary10Percent5Minutes
  alarms:
    - ProcessOrderErrors
    - ProcessOrderDuration
  rollbackEnabled: true
```

---

## 4. Post-Deployment Verification

### 4.1 Health Checks

- [ ] **Function esta active** (no pending o failed)
- [ ] **Invoke test** retorna 200 OK
- [ ] **Logs estan flowing** a CloudWatch / Application Insights
- [ ] **Metrics se emiten** (invocations, errors, duration)
- [ ] **Traces estan visible** en X-Ray / Application Insights
- [ ] **DLQ esta empty** (no poison messages)

```bash
# Verifica function esta deployed y healthy
aws lambda invoke \
  --function-name order-service-prod-processOrder \
  --payload '{"test": true}' \
  --log-type Tail \
  /tmp/response.json

# Checkea CloudWatch logs
aws logs tail /aws/lambda/order-service-prod-processOrder --since 5m

# Checkea metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=order-service-prod-processOrder \
  --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

### 4.2 Performance Verification

- [ ] **p50 latency** esta within target (< 200ms)
- [ ] **p99 latency** esta within target (< 1s)
- [ ] **Cold start** es acceptable (< 3s para first invocation)
- [ ] **Memory utilization** esta below 80% de allocated memory
- [ ] **No throttles** en los first 15 minutes

### 4.3 Security Verification

- [ ] **No secrets leakeados** en logs o responses
- [ ] **IAM role** esta correctly scoped
- [ ] **API endpoint** requiere authentication (si applicable)
- [ ] **Security headers** estan present en HTTP responses
- [ ] **WAF rules** estan attached (si web-facing)

---

## 5. Rollback Procedure

### 5.1 Quick Rollback

```bash
# AWS Lambda — rollback a previous version
aws lambda update-alias \
  --function-name order-service-prod-processOrder \
  --name prod \
  --function-version 42  # previous version number

# Verifica rollback
aws lambda get-alias \
  --function-name order-service-prod-processOrder \
  --name prod
```

### 5.2 Rollback Checklist

- [ ] Identifica el last stable version number
- [ ] Updatea alias para pointear a previous version
- [ ] Verifica function esta serving traffic en old version
- [ ] Checkea error rate retorna a baseline
- [ ] Notifica team del rollback
- [ ] Crea incident ticket para root cause analysis
- [ ] Schedulea post-mortem dentro de 48 hours

## Preguntas Frecuentes

### ¿Cómo determino el right memory size para mi Lambda function?

Empeza a 128MB y usa AWS Lambda Power Tuning para profilear tu function. El tool corre tu function en different memory settings y muestra el cost-performance tradeoff. Most functions hittean optimal cost-performance entre 512MB y 1GB. Higher memory tambien allocatea mas CPU, asi que CPU-bound functions pueden correr faster en higher memory incluso si no necesitan el RAM. Profileea con realistic payloads — test data deberia matchear production data size y complexity.

### ¿Cuál es el maximo deployment package size para serverless functions?

AWS Lambda: 50MB zipped (250MB unzipped) para direct upload, 10GB para container images. Azure Functions: 100MB para consumption plan. GCP Cloud Functions: 100MB para source upload, 32MB para direct upload. Si tu package excede estos limits, usa Lambda Layers (AWS), extension bundles (Azure), o movee large dependencies a un container image. Stripea dev dependencies, usa tree-shaking, y minimiza bundle size.

### ¿Deberia usar provisioned concurrency para mis serverless functions?

Usa provisioned concurrency cuando tens strict latency requirements (< 100ms p99) y predictable traffic patterns. Provisioned concurrency keepea functions warm y elimina cold starts para el configured number de concurrent executions. Cuesta mas que on-demand pero garantiza consistent latency. Empeza con 5-10 concurrent executions y adjusta basado en traffic. Para sporadic traffic o dev/staging environments, on-demand es sufficient.

### ¿Cómo handleo database connections en serverless functions?

Connection pooling es critical porque cada concurrent function invocation puede openear un new database connection. Usa un connection pooler como PgBouncer (PostgreSQL) o ProxySQL (MySQL) con connection pooling mode. Alternativamente, usa serverless-compatible databases como Aurora Serverless Data API, Cosmos DB, o Firestore que handlean connection management. Inicializa el connection outside del handler function para que persista across invocations dentro del same execution environment.

### ¿Qué deberia monitorear despues de deployear una serverless function?

Monitorea four key areas: errors (error rate, error types), performance (p50/p99 duration, cold start percentage), concurrency (concurrent executions, throttles), y cost (invocations, GB-seconds). Setea alarms para error rate > 1%, p99 duration > 2x baseline, throttle count > 0, y concurrent executions > 80% de reserved limit. Usa distributed tracing para identificar bottlenecks en downstream services.
