---
contentType: recipes
slug: serverless-api-gateway-lambda-authorizer
title: "Secure API Gateway with Custom Lambda Authorizers"
description: "Implement custom Lambda authorizers for API Gateway with JWT validation, IAM policy generation, and caching for token-based authentication in serverless APIs."
metaDescription: "Secure API Gateway with custom Lambda authorizers. Validate JWT tokens, generate IAM policies, enable caching, and handle authorization context in Python."
difficulty: advanced
topics:
  - serverless
  - authentication
  - api
tags:
  - aws
  - api-gateway
  - lambda-authorizer
  - jwt
  - authentication
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/security/python-jwt-refresh-token-rotation
  - /guides/serverless-architecture-guide
  - /guides/api-security-checklist-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Secure API Gateway with custom Lambda authorizers. Validate JWT tokens, generate IAM policies, enable caching, and handle authorization context in Python."
  keywords:
    - api gateway lambda authorizer
    - custom authorizer aws
    - jwt validation lambda
    - iam policy authorizer
    - serverless authentication
---

## Overview

API Gateway Lambda authorizers intercept requests before they reach your handler, validate tokens, and return IAM policies that allow or deny access. This separates authentication from business logic and works with any token format (JWT, OAuth, custom). Below: building a JWT authorizer, generating IAM policies, passing context to handlers, configuring caching, and handling request/response authorizer types.

## When to Use This

- Serverless APIs that need custom authentication (JWT, OAuth, API keys with database lookup)
- Fine-grained access control per route or method
- Integrating with third-party identity providers (Auth0, Cognito, Okta)
- Any API Gateway + Lambda architecture that needs token validation

## Prerequisites

- Python 3.11+
- API Gateway (REST or HTTP API)
- `PyJWT` package for JWT validation

## Solution

### 1. JWT Lambda Authorizer (Request Type)

```python
import json
import jwt
import time
import os

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = 'HS256'

def lambda_handler(event, context):
    try:
        token = extract_token(event)
        claims = validate_jwt(token)

        principal_id = claims['sub']
        policy = generate_policy(
            principal_id=principal_id,
            effect='Allow',
            resource=event['routeArn'],
            context={
                'userId': principal_id,
                'email': claims.get('email', ''),
                'role': claims.get('role', 'user'),
            },
        )
        return policy

    except Exception as e:
        print(f"Authorization failed: {e}")
        return generate_policy(
            principal_id='unauthorized',
            effect='Deny',
            resource=event['routeArn'],
            context={},
        )

def extract_token(event: dict) -> str:
    headers = event.get('headers', {})
    auth_header = headers.get('Authorization') or headers.get('authorization', '')

    if not auth_header.startswith('Bearer '):
        raise ValueError("Missing or invalid Authorization header")

    return auth_header[7:]

def validate_jwt(token: str) -> dict:
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if claims.get('exp', 0) < time.time():
            raise ValueError("Token expired")
        return claims
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")

def generate_policy(principal_id: str, effect: str, resource: str, context: dict) -> dict:
    return {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Action': 'execute-api:Invoke',
                    'Effect': effect,
                    'Resource': resource,
                }
            ],
        },
        'context': context,
    }
```

### 2. SAM Template with Authorizer

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  AuthFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: authorizer.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      Environment:
        Variables:
          JWT_SECRET: '{{resolve:secretsmanager:jwt-secret:SecretString}}'

  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handler.lambda_handler
      Runtime: python3.11
      CodeUri: src/

  MyApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: JwtAuthorizer
        Authorizers:
          JwtAuthorizer:
            FunctionArn: !GetAtt AuthFunction.Arn
            Identity:
              Header: Authorization
              ValidationExpression: ^Bearer [a-zA-Z0-9._-]+$
            AuthorizerResultTtlInSeconds: 300

Resources:
  ProtectedResource:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handler.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      Events:
        GetUsers:
          Type: Api
          Properties:
            RestApiId: !Ref MyApi
            Path: /users
            Method: GET
            Auth:
              Authorizer: JwtAuthorizer
```

### 3. Access Authorizer Context in Handler

```python
import json

def lambda_handler(event, context):
    # Authorizer context is available in the event
    auth_context = event.get('requestContext', {}).get('authorizer', {})

    user_id = auth_context.get('userId', 'unknown')
    email = auth_context.get('email', 'unknown')
    role = auth_context.get('role', 'user')

    if role != 'admin':
        return {
            'statusCode': 403,
            'body': json.dumps({'error': 'Insufficient permissions'}),
        }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': f'Hello {email}',
            'userId': user_id,
        }),
    }
```

### 4. Role-Based Access Control

```python
import json
import jwt
import os

JWT_SECRET = os.environ['JWT_SECRET']

def lambda_handler(event, context):
    try:
        token = extract_token(event)
        claims = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        role = claims.get('role', 'user')
        method = event['httpMethod']
        resource = event['routeArn']

        # Define role-based permissions
        permissions = {
            'admin': ['GET', 'POST', 'PUT', 'DELETE'],
            'editor': ['GET', 'POST', 'PUT'],
            'user': ['GET'],
        }

        allowed_methods = permissions.get(role, [])

        if method in allowed_methods:
            return generate_policy(claims['sub'], 'Allow', resource, {
                'userId': claims['sub'],
                'role': role,
            })
        else:
            return generate_policy(claims['sub'], 'Deny', resource, {
                'userId': claims['sub'],
                'role': role,
            })

    except Exception as e:
        print(f"Auth error: {e}")
        return generate_policy('error', 'Deny', event['routeArn'], {})

def generate_policy(principal_id, effect, resource, context):
    return {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource,
            }],
        },
        'context': context,
    }

def extract_token(event):
    headers = event.get('headers', {})
    auth_header = headers.get('Authorization') or headers.get('authorization', '')
    if not auth_header.startswith('Bearer '):
        raise ValueError("Missing Authorization header")
    return auth_header[7:]
```

### 5. Authorizer with Database Lookup (API Key)

```python
import json
import boto3
import hashlib

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['API_KEYS_TABLE'])

def lambda_handler(event, context):
    api_key = event.get('headers', {}).get('x-api-key', '')

    if not api_key:
        return generate_deny(event['routeArn'], 'Missing API key')

    # Hash the API key for lookup
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    response = table.get_item(Key={'apiKeyHash': key_hash})

    if 'Item' not in response:
        return generate_deny(event['routeArn'], 'Invalid API key')

    item = response['Item']

    # Check if key is active
    if item.get('status') != 'active':
        return generate_deny(event['routeArn'], 'API key inactive')

    # Check rate limits or quotas
    tier = item.get('tier', 'free')

    return generate_allow(
        principal_id=item['clientId'],
        resource=event['routeArn'],
        context={
            'clientId': item['clientId'],
            'tier': tier,
        },
    )

def generate_allow(principal_id, resource, context):
    return {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': 'Allow',
                'Resource': resource,
            }],
        },
        'context': context,
    }

def generate_deny(resource, reason):
    return {
        'principalId': 'unauthorized',
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': 'Deny',
                'Resource': resource,
            }],
        },
        'context': {'denyReason': reason},
    }
```

### 6. Caching Configuration

```yaml
# Authorizer caching — TTL in seconds
# Cached by Identity header value (e.g., Authorization header)
Auth:
  DefaultAuthorizer: JwtAuthorizer
  Authorizers:
    JwtAuthorizer:
      FunctionArn: !GetAtt AuthFunction.Arn
      Identity:
        Header: Authorization
        ValidationExpression: ^Bearer .+$
      AuthorizerResultTtlInSeconds: 300  # Cache for 5 minutes
```

## How It Works

1. **Request flow**: Client sends a request with an `Authorization` header. API Gateway intercepts it, extracts the token, and invokes the authorizer Lambda with the request details.
2. **Token validation**: The authorizer validates the token (JWT signature, expiry, claims). If valid, it generates an IAM policy with `Effect: Allow`. If invalid, `Effect: Deny`.
3. **IAM policy**: The policy's `Resource` is the ARN of the route being accessed (`execute-api:Invoke` on `arn:aws:execute-api:...`). API Gateway evaluates the policy — Allow proceeds to the handler, Deny returns 403.
4. **Context passing**: The `context` object in the authorizer response is passed to the handler via `event.requestContext.authorizer`. Use it to pass user ID, role, or other claims.
5. **Caching**: API Gateway caches the authorizer response keyed by the token. Subsequent requests with the same token skip the authorizer for `AuthorizerResultTtlInSeconds`. This reduces Lambda invocations and latency.

## Variants

### HTTP API (v2) Authorizer

```python
# HTTP API uses a slightly different event format
def lambda_handler(event, context):
    # event['headers'] is lowercase in HTTP API
    token = event.get('headers', {}).get('authorization', '').replace('Bearer ', '')

    # event['routeArn'] is available
    # event['requestContext']['http']['method'] for method

    claims = validate_jwt(token)
    return {
        'principalId': claims['sub'],
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': 'Allow',
                'Resource': event['routeArn'],
            }],
        },
        'context': {'userId': claims['sub']},
    }
```

### Cognito User Pool Authorizer (No Custom Lambda)

```yaml
# Use Cognito directly — no custom authorizer needed
Auth:
  DefaultAuthorizer: CognitoAuthorizer
  Authorizers:
    CognitoAuthorizer:
      UserPoolArn: !GetAtt UserPool.Arn
      Identity:
        Header: Authorization
```

### Response Authorizer (Pre-token generation)

```python
# For HTTP API with OAuth2/JWT authorizer (no Lambda needed)
# Configure directly in API Gateway
# This validates JWT from an external issuer (Auth0, Okta)
```

## Best Practices

- **Enable caching**: Set `AuthorizerResultTtlInSeconds` to 300-900 seconds. This reduces authorizer invocations by 90%+ for repeated requests with the same token.
- **Validate token expiry**: Check `exp` claim before accepting. API Gateway caching may serve stale policies for expired tokens — set TTL shorter than token expiry.
- **Use least-privilege IAM policies**: Only allow `execute-api:Invoke` on the specific route ARN, not `*`.
- **Pass useful context**: Include user ID, role, and permissions in the context object. Handlers can use this without re-validating the token.
- **Handle errors gracefully**: Return `Deny` on any validation failure. Don't throw exceptions — API Gateway treats exceptions as 500 errors, not 403.
- **Use `ValidationExpression`**: A regex on the Authorization header prevents invoking the authorizer for malformed tokens.

## Common Mistakes

- **Not caching the authorizer**: Every request invokes the authorizer Lambda, adding 50-200ms latency and increasing costs. Always set a TTL.
- **Caching too long**: If the TTL exceeds the token expiry, revoked tokens remain valid. Set TTL to 300 seconds or less.
- **Using `Deny` with wildcard resource**: `Deny` on `*` blocks all API access. Deny only the specific route ARN.
- **Not handling missing headers**: If the Authorization header is absent, `headers.get('Authorization')` returns `None`. Handle this case explicitly.
- **Throwing exceptions instead of returning Deny**: Exceptions cause 500 errors. Return a `Deny` policy for any validation failure.

## FAQ

**What is the difference between a Lambda authorizer and Cognito authorizer?**

Cognito authorizer validates JWT tokens from Cognito User Pools directly — no custom code. Lambda authorizer runs your code, supporting any token format (JWT, API keys, OAuth from third-party IdPs).

**How does authorizer caching work?**

API Gateway caches the IAM policy keyed by the token value. For the TTL duration, requests with the same token receive the cached policy without invoking the authorizer. Changing the token or waiting for TTL expiry triggers a new invocation.

**Can I use a Lambda authorizer with HTTP API (v2)?**

Yes. HTTP API supports Lambda authorizers with a slightly different event format. The event structure uses lowercase headers and `requestContext.http.method` instead of `httpMethod`.

**What is the maximum context size?**

The authorizer context object has a limit of 10KB. Keep it small — pass only essential fields (user ID, role, tenant ID).

**How do I revoke a cached token?**

You can't selectively revoke a cached authorizer response. Reduce the TTL to minimize the window, or use a token revocation list checked in the handler (not the authorizer, since it's cached).
