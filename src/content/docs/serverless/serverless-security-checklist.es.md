---


contentType: docs
slug: serverless-security-checklist
templateType: penetration-test
title: "Checklist de Seguridad Serverless"
description: "Checklist de hardening de seguridad para funciones serverless: IAM least privilege, secret management, input validation, dependency scanning, network isolation, logging y compliance con ejemplos de codigo para AWS Lambda, Azure y GCP."
metaDescription: "Security checklist for serverless functions: IAM least privilege, secrets, input validation, dependency scanning, network isolation, logging, compliance."
difficulty: advanced
topics:
  - serverless
tags:
  - serverless
  - security
  - aws-lambda
  - iam
  - checklist
  - compliance
relatedResources:
  - /docs/serverless-function-deployment-checklist
  - /docs/serverless-cost-estimation-template
  - /docs/serverless-cold-start-runbook
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Security checklist for serverless functions: IAM least privilege, secrets, input validation, dependency scanning, network isolation, logging, compliance."
  keywords:
    - serverless security
    - lambda security
    - iam least privilege
    - serverless hardening
    - function security
    - serverless compliance
    - serverless vulnerabilities


---

## Overview

Este checklist cubre security hardening para funciones serverless across AWS Lambda, Azure Functions y Google Cloud Functions. Serverless functions inheritan platform security pero application-level security sigue siendo responsibility del developer. Cada item debe ser verified antes de production deployment.

---

## 1. IAM and Access Control

### 1.1 Least Privilege

- [ ] Execution role tiene solo el minimum required permissions
- [ ] No wildcard (`*`) actions en IAM policies
- [ ] Resource ARNs estan scoped a specific resources (no `*`)
- [ ] Separate roles per function (no shared roles)
- [ ] No inline policies (usa managed policies)
- [ ] Role trust policy restricte que services pueden assumir el role

```yaml
# GOOD: Scoped IAM role
iam:
  role:
    statements:
      - Effect: Allow
        Action:
          - s3:GetObject
        Resource:
          - !Sub "arn:aws:s3:::orders-bucket/prod/*"
      - Effect: Allow
        Action:
          - dynamodb:PutItem
        Resource:
          - !Sub "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/orders-prod"

# BAD: Wildcard permissions
iam:
  role:
    statements:
      - Effect: Allow
        Action:
          - s3:*           # too broad
          - dynamodb:*     # too broad
        Resource:
          - "*"            # nunca uses wildcard resources
```

### 1.2 Cross-Service Access

- [ ] No hardcoded AWS credentials en code
- [ ] No access keys en environment variables
- [ ] Secrets se loadean de Secrets Manager / Key Vault / Secret Manager
- [ ] STS assumed roles para cross-account access
- [ ] Temporary credentials con short TTL (1 hour max)

```python
import boto3
import json

def get_secret(secret_name: str, region: str = "us-east-1") -> dict:
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])

# Usage — no hardcoded credentials
db_password = get_secret("prod/db-password")["password"]
api_key = get_secret("prod/api-key")["key"]
```

---

## 2. Input Validation

### 2.1 Request Validation

- [ ] All inputs se validean (body, query params, path params, headers)
- [ ] Schema validation usando JSON Schema o equivalent
- [ ] Maximum payload size enforced (e.g., 1MB para APIs)
- [ ] Content-Type header se valida
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)

```python
import json
from jsonschema import validate, ValidationError

ORDER_SCHEMA = {
    "type": "object",
    "properties": {
        "customerId": {"type": "string", "minLength": 1, "maxLength": 100},
        "items": {
            "type": "array",
            "minItems": 1,
            "maxItems": 100,
            "items": {
                "type": "object",
                "properties": {
                    "productId": {"type": "string", "pattern": "^[a-zA-Z0-9-]+$"},
                    "quantity": {"type": "integer", "minimum": 1, "maximum": 999},
                },
                "required": ["productId", "quantity"],
            },
        },
    },
    "required": ["customerId", "items"],
    "additionalProperties": False,
}

def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        validate(instance=body, schema=ORDER_SCHEMA)
    except ValidationError as e:
        return {"statusCode": 400, "body": json.dumps({"error": str(e)})}
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON"})}
    
    return process_order(body)
```

### 2.2 SQL Injection Prevention

```python
# BAD: String concatenation
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    return db.execute(query)  # SQL injection!

# GOOD: Parameterized queries
def get_user(user_id):
    query = "SELECT * FROM users WHERE id = %s"
    return db.execute(query, (user_id,))

# GOOD: ORM con built-in parameterization
def get_user(user_id):
    return User.query.filter(User.id == user_id).first()
```

---

## 3. Dependency Security

### 3.1 Dependency Management

- [ ] All dependencies estan pinned a specific versions
- [ ] `npm audit` o `pip audit` pasa con no high/critical vulnerabilities
- [ ] Dependencies se scannean en CI/CD pipeline
- [ ] No dependencies de untrusted registries
- [ ] Lockfile esta committed y verified
- [ ] SBOM (Software Bill of Materials) se genera

```bash
# npm — audit y fix
npm audit --audit-level=high
npm audit fix

# pip — safety check
pip install safety
safety check --full-report

# Snyk scan
npx snyk test --severity-threshold=high

# GitHub Dependabot — .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 3.2 Supply Chain Hardening

```yaml
# .npmrc — restrict registry
registry=https://registry.npmjs.org/
strict-ssl=true

# package.json — lock dependencies
"scripts": {
  "preinstall": "npx lockfile-lint --path package-lock.json --allowed-hosts npm --validate-https"
}
```

---

## 4. Network Security

### 4.1 VPC Configuration (AWS Lambda)

- [ ] Functions que acceden private resources estan en un VPC
- [ ] Security groups restricten inbound/outbound traffic
- [ ] NAT Gateway se usa para outbound internet access
- [ ] VPC endpoints para AWS services (S3, DynamoDB, SQS)
- [ ] No public subnets para Lambda functions

```yaml
# serverless.yml — VPC configuration
functions:
  internalAPI:
    handler: src/handlers/internal.handler
    vpc:
      securityGroupIds:
        - !Ref LambdaSecurityGroup
      subnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

resources:
  Resources:
    LambdaSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: "Lambda security group"
        SecurityGroupEgress:
          - IpProtocol: tcp
            FromPort: 443
            ToPort: 443
            CidrIp: 0.0.0.0/0  # HTTPS only
```

### 4.2 API Gateway Security

- [ ] API authentication enabled (JWT, API key, IAM)
- [ ] Rate limiting configurado
- [ ] CORS restricted a known origins (no `*`)
- [ ] Request validation enabled
- [ ] WAF rules attached para web-facing APIs
- [ ] TLS 1.2+ enforced

```yaml
# API Gateway con JWT auth
events:
  - http:
      path: /orders
      method: post
      authorizer:
        type: jwt
        identitySource: $request.header.Authorization
        jwtConfiguration:
          issuer: "https://auth.example.com/"
          audience:
            - "order-service-api"
      cors:
        origin: "https://app.example.com"  # not "*"
        headers:
          - Content-Type
          - Authorization
```

---

## 5. Data Protection

### 5.1 Encryption

- [ ] Data at rest esta encrypted (KMS, AES-256)
- [ ] Data in transit usa TLS 1.2+
- [ ] Environment variables con sensitive data usan KMS encryption
- [ ] Database connections usan SSL/TLS
- [ ] Secrets estan encrypted en Secrets Manager / Key Vault

```python
# Enable SSL para database connections
import psycopg2

conn = psycopg2.connect(
    host=db_host,
    dbname=db_name,
    user=db_user,
    password=db_password,
    sslmode="require",  # enforce TLS
    sslrootcert="/opt/certs/rds-ca.pem",
)
```

### 5.2 PII Handling

- [ ] PII no se loggea en plain text
- [ ] PII se maskea o hashea en logs
- [ ] Data retention policies estan defined y enforced
- [ ] GDPR / CCPA compliance verified
- [ ] Data classification labels applied

```python
import hashlib
import re

def mask_pii(data: dict) -> dict:
    """Maskea sensitive fields para logging."""
    sensitive_fields = ["email", "phone", "ssn", "creditCard"]
    masked = {}
    for key, value in data.items():
        if key in sensitive_fields:
            masked[key] = hash_value(str(value))
        else:
            masked[key] = value
    return masked

def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:16]
```

---

## 6. Logging and Monitoring

### 6.1 Security Logging

- [ ] Authentication events se loggean
- [ ] Authorization failures se loggean
- [ ] Input validation failures se loggean
- [ ] Rate limit violations se loggean
- [ ] Security logs se envian a un separate, tamper-proof log group

```python
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_security_event(event_type: str, user_id: str, detail: str):
    logger.info(json.dumps({
        "security_event": True,
        "event_type": event_type,
        "user_id": user_id,
        "detail": detail,
        "timestamp": datetime.utcnow().isoformat(),
    }))

def handler(event, context):
    user = authenticate(event)
    if not user:
        log_security_event("auth_failure", "unknown", "Invalid token")
        return {"statusCode": 401, "body": json.dumps({"error": "Unauthorized"})}
    
    if not authorize(user, "read:orders"):
        log_security_event("authz_failure", user["id"], "Insufficient permissions")
        return {"statusCode": 403, "body": json.dumps({"error": "Forbidden"})}
    
    return process_order(event, user)
```

### 6.2 Security Alarms

- [ ] Alarm en high error rate (possible attack)
- [ ] Alarm en high 4xx rate (possible scanning)
- [ ] Alarm en unusual invocation patterns
- [ ] Alarm en IAM policy changes
- [ ] Alarm en function code changes outside CI/CD

```yaml
# CloudWatch alarm para high 4xx rate (potential scanning)
SecurityScanAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    MetricName: 4XXError
    Namespace: AWS/ApiGateway
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 100
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SecurityAlertTopic
```

---

## 7. Compliance Checklist

### 7.1 General Compliance

- [ ] Data classification: identifica que data la function processea
- [ ] Data residency: verifica data se queda en compliant regions
- [ ] Audit trail: all security-relevant actions se loggean
- [ ] Access reviews: IAM roles se reviewean quarterly
- [ ] Penetration testing: functions incluidos en scope
- [ ] Incident response: runbook cubre serverless-specific scenarios

### 7.2 Compliance Frameworks

```text
Framework  | Key requirements for serverless
───────────┼──────────────────────────────────────────────────
SOC 2      | Access controls, encryption, audit logging, monitoring
GDPR       | Data minimization, right to erasure, data residency
HIPAA      | PHI encryption, audit trails, BAA with cloud provider
PCI DSS    | No card data in functions, tokenization, network isolation
ISO 27001  | Risk assessment, access control, incident management
```

## Preguntas Frecuentes

### ¿Cómo prevengo serverless function code injection?

Validatea all inputs con strict schemas. Nunca concatenes user input en commands, queries o templates. Usa parameterized queries para databases. Avoida `eval()`, `exec()` o `Function()` constructors con user input. Setea Content-Type headers y validealos. Usa output encoding cuando returneas user-generated content. Corre dependency scanning para detectar known injection vulnerabilities en libraries.

### ¿Deberian las serverless functions usar un VPC?

Solo cuando la function necesita acceder private resources (RDS, ElastiCache, internal APIs). VPC-attached functions tienen higher cold start latency y requieren NAT Gateway para internet access (additional cost). Si la function solo llama AWS services (S3, DynamoDB, SQS), no necesita un VPC — usa VPC endpoints en vez. Si la function llama external APIs, keepeala outside del VPC para lower latency y cost.

### ¿Cómo roto secrets para serverless functions?

Usa AWS Secrets Manager automatic rotation para supported databases (RDS, DocumentDB, Redshift). Para otros secrets, usa una rotation Lambda function triggered por Secrets Manager en un schedule (30-90 days). La rotation function updateea el secret y notifica dependent services. Nunca hardcodees secrets en code o environment variables. Usa extension cache para avoid llamarear Secrets Manager en every invocation (cache por 5-15 minutes).

### ¿Qué security tools deberia usar para serverless functions?

Usa Snyk o Dependabot para dependency scanning. Usa AWS Config rules para IAM y resource compliance. Usa AWS GuardDuty para threat detection (anomalous API calls, unauthorized deployments). Usa AWS CloudTrail para audit logging de all API actions. Usa Serverless Framework security plugins (serverless-iam-roles-per-function). Corre OWASP ZAP contra API Gateway endpoints. Usa AWS Access Analyzer para detectar unintended public access.

### ¿Cómo securitizo environment variables en serverless functions?

Usa AWS SSM Parameter Store (free, encrypted con KMS) para non-secret configuration. Usa AWS Secrets Manager para secrets (automatic rotation, audit logging). Nunca stores secrets en plaintext environment variables — son visible en el AWS console y CloudFormation templates. Usa Lambda environment variable encryption con un custom KMS key. Accede secrets at runtime via el SDK, no via environment variables. Cachea secret values para avoid repeated API calls.

## See Also

- [Complete Guide to AWS Lambda in Production](/es/guides/complete-guide-aws-lambda-production/)
- [Serverless Function Deployment Checklist](/es/docs/serverless-function-deployment-checklist/)
- [Complete Guide to Serverless Architecture](/es/guides/complete-guide-serverless-architecture/)
- [Minimize Cold Start Latency in Serverless Functions](/es/recipes/cold-start-optimization/)
- [Build Event-Driven Serverless Architectures](/es/recipes/event-driven-functions/)

