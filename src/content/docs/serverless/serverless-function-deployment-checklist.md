---
contentType: docs
slug: serverless-function-deployment-checklist
templateType: post-deployment-checklist
title: "Serverless Function Deployment Checklist"
description: "Pre-deploy and post-deploy checklist for serverless functions (AWS Lambda, Azure Functions, GCP Cloud Functions): IAM roles, environment variables, memory sizing, timeout config, logging, alarms, and rollback procedures."
metaDescription: "Pre-deploy checklist for serverless functions: IAM roles, env vars, memory sizing, timeout, logging, alarms, rollback for Lambda, Azure, GCP."
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
  metaDescription: "Pre-deploy checklist for serverless functions: IAM roles, env vars, memory sizing, timeout, logging, alarms, rollback for Lambda, Azure, GCP."
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

This checklist covers pre-deployment and post-deployment verification for serverless functions across AWS Lambda, Azure Functions, and Google Cloud Functions. Each item must be verified before promoting a function to production.

---

## 1. Pre-Deployment Checklist

### 1.1 Function Configuration

- [ ] **Memory size** is set to the minimum that meets p99 latency target
- [ ] **Timeout** is set to 90% of the expected max execution time
- [ ] **Concurrency limit** is configured (reserved or provisioned)
- [ ] **Runtime version** is pinned (not latest)
- [ ] **Handler signature** matches the runtime expectation
- [ ] **Dead letter queue** (DLQ) is configured for failed invocations

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

- [ ] **Execution role** has minimum required permissions (no `*:*`)
- [ ] **Resource ARNs** are scoped to specific resources (not `*`)
- [ ] **No hardcoded credentials** in code or environment variables
- [ ] **Secrets** are loaded from Secrets Manager / Key Vault / Secret Manager
- [ ] **Cross-service permissions** are documented and approved

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

- [ ] **Environment variables** are set per stage (dev, staging, prod)
- [ ] **No secrets in plaintext** environment variables
- [ ] **Feature flags** are configured for gradual rollout
- [ ] **Log level** is set appropriately (INFO for prod, DEBUG for dev)
- [ ] **Region** is set to the deployment target

```yaml
environment:
  LOG_LEVEL: ${self:custom.logLevel.${sls:stage}}
  DB_HOST: ${ssm:/order-service/${sls:stage}/db-host}
  API_KEY: ${ssm:/order-service/${sls:stage}/api-key~true}  # secure string
  FEATURE_NEW_PRICING: "true"
```

### 1.4 Code Quality

- [ ] **Unit tests** pass with > 80% coverage
- [ ] **Integration tests** pass against staging environment
- [ ] **Linting** passes (ESLint, Prettier, or equivalent)
- [ ] **No console.log** in production code (use structured logger)
- [ ] **Dependencies** are pinned and audited (`npm audit` clean)
- [ ] **Bundle size** is under 50MB (250MB unzipped limit for Lambda)

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

- [ ] **Route** is configured and matches the handler
- [ ] **Method** (GET, POST, etc.) is correct
- [ ] **CORS** is configured for web-facing endpoints
- [ ] **Rate limiting** is enabled
- [ ] **Request validation** schema is defined
- [ ] **API key / auth** is required for protected endpoints

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

- [ ] **Event source mapping** is configured (SQS, Kinesis, DynamoDB Streams)
- [ ] **Batch size** is tuned for throughput vs. latency
- [ ] **Retry policy** is defined (max retries, backoff)
- [ ] **Filter pattern** is set to reduce unnecessary invocations
- [ ] **DLQ** is attached for poison messages

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

- [ ] **Structured logging** is implemented (JSON format)
- [ ] **Distributed tracing** is enabled (X-Ray, Application Insights)
- [ ] **Custom metrics** are emitted (business metrics)
- [ ] **Dashboards** are created for key metrics
- [ ] **Alarms** are configured for error rate, duration, throttles

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

# 1. Run tests
echo "Running tests..."
npm run test:unit
npm run test:integration -- --stage=$STAGE

# 2. Package
echo "Packaging..."
npx serverless package --stage $STAGE

# 3. Deploy
echo "Deploying..."
npx serverless deploy --stage $STAGE --verbose

# 4. Run smoke tests
echo "Running smoke tests..."
npm run test:smoke -- --stage=$STAGE --url=$(npx serverless info --stage $STAGE --verbose | grep "endpoint:" | awk '{print $2}')

# 5. Verify deployment
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

- [ ] **Function is active** (not pending or failed)
- [ ] **Invoke test** returns 200 OK
- [ ] **Logs are flowing** to CloudWatch / Application Insights
- [ ] **Metrics are emitting** (invocations, errors, duration)
- [ ] **Traces are visible** in X-Ray / Application Insights
- [ ] **DLQ is empty** (no poison messages)

```bash
# Verify function is deployed and healthy
aws lambda invoke \
  --function-name order-service-prod-processOrder \
  --payload '{"test": true}' \
  --log-type Tail \
  /tmp/response.json

# Check CloudWatch logs
aws logs tail /aws/lambda/order-service-prod-processOrder --since 5m

# Check metrics
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

- [ ] **p50 latency** is within target (< 200ms)
- [ ] **p99 latency** is within target (< 1s)
- [ ] **Cold start** is acceptable (< 3s for first invocation)
- [ ] **Memory utilization** is below 80% of allocated memory
- [ ] **No throttles** in the first 15 minutes

### 4.3 Security Verification

- [ ] **No secrets leaked** in logs or responses
- [ ] **IAM role** is correctly scoped
- [ ] **API endpoint** requires authentication (if applicable)
- [ ] **Security headers** are present in HTTP responses
- [ ] **WAF rules** are attached (if web-facing)

---

## 5. Rollback Procedure

### 5.1 Quick Rollback

```bash
# AWS Lambda — rollback to previous version
aws lambda update-alias \
  --function-name order-service-prod-processOrder \
  --name prod \
  --function-version 42  # previous version number

# Verify rollback
aws lambda get-alias \
  --function-name order-service-prod-processOrder \
  --name prod
```

### 5.2 Rollback Checklist

- [ ] Identify the last stable version number
- [ ] Update alias to point to previous version
- [ ] Verify function is serving traffic on old version
- [ ] Check error rate returns to baseline
- [ ] Notify team of rollback
- [ ] Create incident ticket for root cause analysis
- [ ] Schedule post-mortem within 48 hours

## FAQ

### How do I determine the right memory size for my Lambda function?

Start at 128MB and use AWS Lambda Power Tuning to profile your function. The tool runs your function at different memory settings and shows the cost-performance tradeoff. Most functions hit optimal cost-performance between 512MB and 1GB. Higher memory also allocates more CPU, so CPU-bound functions may run faster at higher memory even if they don't need the RAM. Profile with realistic payloads — test data should match production data size and complexity.

### What is the maximum deployment package size for serverless functions?

AWS Lambda: 50MB zipped (250MB unzipped) for direct upload, 10GB for container images. Azure Functions: 100MB for consumption plan. GCP Cloud Functions: 100MB for source upload, 32MB for direct upload. If your package exceeds these limits, use Lambda Layers (AWS), extension bundles (Azure), or move large dependencies to a container image. Strip dev dependencies, use tree-shaking, and minimize bundle size.

### Should I use provisioned concurrency for my serverless functions?

Use provisioned concurrency when you have strict latency requirements (< 100ms p99) and predictable traffic patterns. Provisioned concurrency keeps functions warm and eliminates cold starts for the configured number of concurrent executions. It costs more than on-demand but guarantees consistent latency. Start with 5-10 concurrent executions and adjust based on traffic. For sporadic traffic or dev/staging environments, on-demand is sufficient.

### How do I handle database connections in serverless functions?

Connection pooling is critical because each concurrent function invocation may open a new database connection. Use a connection pooler like PgBouncer (PostgreSQL) or ProxySQL (MySQL) with connection pooling mode. Alternatively, use serverless-compatible databases like Aurora Serverless Data API, Cosmos DB, or Firestore that handle connection management. Initialize the connection outside the handler function so it persists across invocations within the same execution environment.

### What should I monitor after deploying a serverless function?

Monitor four key areas: errors (error rate, error types), performance (p50/p99 duration, cold start percentage), concurrency (concurrent executions, throttles), and cost (invocations, GB-seconds). Set alarms for error rate > 1%, p99 duration > 2x baseline, throttle count > 0, and concurrent executions > 80% of reserved limit. Use distributed tracing to identify bottlenecks in downstream services.
