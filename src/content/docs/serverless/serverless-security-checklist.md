---


contentType: docs
slug: serverless-security-checklist
templateType: penetration-test
title: "Serverless Security Checklist"
description: "Security hardening checklist for serverless functions: IAM least privilege, secret management, input validation, dependency scanning, network isolation, logging, and compliance with code examples for AWS Lambda, Azure, and GCP."
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

This checklist covers security hardening for serverless functions across AWS Lambda, Azure Functions, and Google Cloud Functions. Serverless functions inherit platform security but application-level security remains the developer's responsibility. Each item must be verified before production deployment.

---

## 1. IAM and Access Control

### 1.1 Least Privilege

- [ ] Execution role has only the minimum required permissions
- [ ] No wildcard (`*`) actions in IAM policies
- [ ] Resource ARNs are scoped to specific resources (not `*`)
- [ ] Separate roles per function (no shared roles)
- [ ] No inline policies (use managed policies)
- [ ] Role trust policy restricts which services can assume the role

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
          - "*"            # never use wildcard resources
```

### 1.2 Cross-Service Access

- [ ] No hardcoded AWS credentials in code
- [ ] No access keys in environment variables
- [ ] Secrets loaded from Secrets Manager / Key Vault / Secret Manager
- [ ] STS assumed roles for cross-account access
- [ ] Temporary credentials with short TTL (1 hour max)

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

- [ ] All inputs are validated (body, query params, path params, headers)
- [ ] Schema validation using JSON Schema or equivalent
- [ ] Maximum payload size enforced (e.g., 1MB for APIs)
- [ ] Content-Type header is validated
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

# GOOD: ORM with built-in parameterization
def get_user(user_id):
    return User.query.filter(User.id == user_id).first()
```

---

## 3. Dependency Security

### 3.1 Dependency Management

- [ ] All dependencies are pinned to specific versions
- [ ] `npm audit` or `pip audit` passes with no high/critical vulnerabilities
- [ ] Dependencies are scanned in CI/CD pipeline
- [ ] No dependencies from untrusted registries
- [ ] Lockfile is committed and verified
- [ ] SBOM (Software Bill of Materials) is generated

```bash
# npm — audit and fix
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

- [ ] Functions that access private resources are in a VPC
- [ ] Security groups restrict inbound/outbound traffic
- [ ] NAT Gateway is used for outbound internet access
- [ ] VPC endpoints for AWS services (S3, DynamoDB, SQS)
- [ ] No public subnets for Lambda functions

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
- [ ] Rate limiting configured
- [ ] CORS restricted to known origins (not `*`)
- [ ] Request validation enabled
- [ ] WAF rules attached for web-facing APIs
- [ ] TLS 1.2+ enforced

```yaml
# API Gateway with JWT auth
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

- [ ] Data at rest is encrypted (KMS, AES-256)
- [ ] Data in transit uses TLS 1.2+
- [ ] Environment variables with sensitive data use KMS encryption
- [ ] Database connections use SSL/TLS
- [ ] Secrets are encrypted in Secrets Manager / Key Vault

```python
# Enable SSL for database connections
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

- [ ] PII is not logged in plain text
- [ ] PII is masked or hashed in logs
- [ ] Data retention policies are defined and enforced
- [ ] GDPR / CCPA compliance verified
- [ ] Data classification labels applied

```python
import hashlib
import re

def mask_pii(data: dict) -> dict:
    """Mask sensitive fields for logging."""
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

- [ ] Authentication events are logged
- [ ] Authorization failures are logged
- [ ] Input validation failures are logged
- [ ] Rate limit violations are logged
- [ ] Security logs are sent to a separate, tamper-proof log group

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

- [ ] Alarm on high error rate (possible attack)
- [ ] Alarm on high 4xx rate (possible scanning)
- [ ] Alarm on unusual invocation patterns
- [ ] Alarm on IAM policy changes
- [ ] Alarm on function code changes outside CI/CD

```yaml
# CloudWatch alarm for high 4xx rate (potential scanning)
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

- [ ] Data classification: identify what data the function processes
- [ ] Data residency: verify data stays in compliant regions
- [ ] Audit trail: all security-relevant actions are logged
- [ ] Access reviews: IAM roles reviewed quarterly
- [ ] Penetration testing: functions included in scope
- [ ] Incident response: runbook covers serverless-specific scenarios

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

## FAQ

### How do I prevent serverless function code injection?

Validate all inputs with strict schemas. Never concatenate user input into commands, queries, or templates. Use parameterized queries for databases. Avoid `eval()`, `exec()`, or `Function()` constructors with user input. Set Content-Type headers and validate them. Use output encoding when returning user-generated content. Run dependency scanning to detect known injection vulnerabilities in libraries.

### Should serverless functions use a VPC?

Only when the function needs to access private resources (RDS, ElastiCache, internal APIs). VPC-attached functions have higher cold start latency and require NAT Gateway for internet access (additional cost). If the function only calls AWS services (S3, DynamoDB, SQS), it does not need a VPC — use VPC endpoints instead. If the function calls external APIs, keep it outside the VPC for lower latency and cost.

### How do I rotate secrets for serverless functions?

Use AWS Secrets Manager automatic rotation for supported databases (RDS, DocumentDB, Redshift). For other secrets, use a rotation Lambda function triggered by Secrets Manager on a schedule (30-90 days). The rotation function updates the secret and notifies dependent services. Never hardcode secrets in code or environment variables. Use extension cache to avoid calling Secrets Manager on every invocation (cache for 5-15 minutes).

### What security tools should I use for serverless functions?

Use Snyk or Dependabot for dependency scanning. Use AWS Config rules for IAM and resource compliance. Use AWS GuardDuty for threat detection (anomalous API calls, unauthorized deployments). Use AWS CloudTrail for audit logging of all API actions. Use Serverless Framework security plugins (serverless-iam-roles-per-function). Run OWASP ZAP against API Gateway endpoints. Use AWS Access Analyzer to detect unintended public access.

### How do I secure environment variables in serverless functions?

Use AWS SSM Parameter Store (free, encrypted with KMS) for non-secret configuration. Use AWS Secrets Manager for secrets (automatic rotation, audit logging). Never store secrets in plaintext environment variables — they are visible in the AWS console and CloudFormation templates. Use Lambda environment variable encryption with a custom KMS key. Access secrets at runtime via the SDK, not via environment variables. Cache secret values to avoid repeated API calls.

## See Also

- [Complete Guide to AWS Lambda in Production](/guides/complete-guide-aws-lambda-production/)
- [Serverless Function Deployment Checklist](/docs/serverless-function-deployment-checklist/)
- [Complete Guide to Serverless Architecture](/guides/complete-guide-serverless-architecture/)
- [Minimize Cold Start Latency in Serverless Functions](/recipes/cold-start-optimization/)
- [Build Event-Driven Serverless Architectures](/recipes/event-driven-functions/)

