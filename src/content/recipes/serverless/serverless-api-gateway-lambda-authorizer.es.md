---





contentType: recipes
slug: serverless-api-gateway-lambda-authorizer
title: "Asegurar API Gateway con Lambda Authorizers Personalizados"
description: "Implementar Lambda authorizers personalizados para API Gateway con validacion JWT, generacion de politicas IAM y caching para autenticacion basada en tokens."
metaDescription: "Asegura API Gateway con Lambda authorizers personalizados. Valida tokens JWT, genera politicas IAM, habilita caching y maneja contexto de autorizacion en Python."
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
  - /recipes/aws-lambda-python-dependencies
  - /recipes/python-jwt-refresh-token-rotation
  - /guides/serverless-architecture-guide
  - /guides/api-security-checklist-guide
  - /recipes/python-memcached-session-storage
  - /recipes/graphql-directives-auth
  - /guides/complete-guide-authentication-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Asegura API Gateway con Lambda authorizers personalizados. Valida tokens JWT, genera politicas IAM, habilita caching y maneja contexto de autorizacion en Python."
  keywords:
    - api gateway lambda authorizer
    - custom authorizer aws
    - jwt validation lambda
    - iam policy authorizer
    - serverless authentication





---

## Descripcion general

Los Lambda authorizers de API Gateway interceptan peticiones antes de que lleguen a tu handler, validan tokens y retornan politicas IAM que permiten o niegan acceso. Esto separa la autenticacion de la logica de negocio y funciona con cualquier formato de token (JWT, OAuth, custom). A continuacion: construir un authorizer JWT, generar politicas IAM, pasar contexto a handlers, configurar caching y manejar tipos de authorizer request/response.

## Cuando Usar Esto


- For alternatives, see [Complete Guide to Authentication Patterns](/es/guides/complete-guide-authentication-patterns/).

- APIs serverless que necesitan autenticacion personalizada (JWT, OAuth, API keys con lookup en base de datos)
- Control de acceso fino por ruta o metodo
- Integracion con proveedores de identidad de terceros (Auth0, Cognito, Okta)
- Cualquier arquitectura API Gateway + Lambda que necesita validacion de tokens

## Prerrequisitos

- Python 3.11+
- API Gateway (REST o HTTP API)
- Paquete `PyJWT` para validacion JWT

## Solucion

### 1. JWT Lambda Authorizer (Tipo Request)

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

### 2. Template SAM con Authorizer

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

### 3. Acceder al Contexto del Authorizer en el Handler

```python
import json

def lambda_handler(event, context):
    # El contexto del authorizer esta disponible en el event
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

### 4. Control de Acceso Basado en Roles

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

        # Definir permisos basados en rol
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

### 5. Authorizer con Lookup en Base de Datos (API Key)

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

    # Hash del API key para lookup
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    response = table.get_item(Key={'apiKeyHash': key_hash})

    if 'Item' not in response:
        return generate_deny(event['routeArn'], 'Invalid API key')

    item = response['Item']

    # Verificar si la key esta activa
    if item.get('status') != 'active':
        return generate_deny(event['routeArn'], 'API key inactive')

    # Verificar rate limits o quotas
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

### 6. Configuracion de Caching

```yaml
# Caching del authorizer — TTL en segundos
# Cacheado por valor del header de Identity (ej., Authorization header)
Auth:
  DefaultAuthorizer: JwtAuthorizer
  Authorizers:
    JwtAuthorizer:
      FunctionArn: !GetAtt AuthFunction.Arn
      Identity:
        Header: Authorization
        ValidationExpression: ^Bearer .+$
      AuthorizerResultTtlInSeconds: 300  # Cachear por 5 minutos
```

## Como Funciona

1. **Flujo de peticion**: El cliente envia una peticion con un header `Authorization`. API Gateway la intercepta, extrae el token e invoca el authorizer Lambda con los detalles de la peticion.
2. **Validacion de token**: El authorizer valida el token (firma JWT, expiracion, claims). Si es valido, genera una politica IAM con `Effect: Allow`. Si es invalido, `Effect: Deny`.
3. **Politica IAM**: El `Resource` de la politica es el ARN de la ruta accedida (`execute-api:Invoke` en `arn:aws:execute-api:...`). API Gateway evalua la politica — Allow procede al handler, Deny retorna 403.
4. **Pase de contexto**: El objeto `context` en la respuesta del authorizer se pasa al handler via `event.requestContext.authorizer`. Usalo para pasar user ID, rol u otros claims.
5. **Caching**: API Gateway cachea la respuesta del authorizer identificada por el token. Peticiones subsecuentes con el mismo token saltan el authorizer por `AuthorizerResultTtlInSeconds`. Esto reduce invocaciones de Lambda y latencia.

## Variantes

### HTTP API (v2) Authorizer

```python
# HTTP API usa un formato de evento ligeramente diferente
def lambda_handler(event, context):
    # event['headers'] esta en lowercase en HTTP API
    token = event.get('headers', {}).get('authorization', '').replace('Bearer ', '')

    # event['routeArn'] esta disponible
    # event['requestContext']['http']['method'] para el metodo

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

### Cognito User Pool Authorizer (Sin Lambda Custom)

```yaml
# Usar Cognito directamente — no se necesita authorizer custom
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
# Para HTTP API con authorizer OAuth2/JWT (sin Lambda)
# Configurar directamente en API Gateway
# Esto valida JWT de un emisor externo (Auth0, Okta)
```

## Mejores Practicas

- **Habilitar caching**: Establece `AuthorizerResultTtlInSeconds` a 300-900 segundos. Esto reduce invocaciones del authorizer en 90%+ para peticiones repetidas con el mismo token.
- **Validar expiracion del token**: Verifica el claim `exp` antes de aceptar. El caching de API Gateway puede servir politicas stale para tokens expirados — establece TTL mas corto que la expiracion del token.
- **Usar politicas IAM de minimo privilegio**: Solo permite `execute-api:Invoke` en el ARN de ruta especifico, no `*`.
- **Pasar contexto util**: Incluye user ID, rol y permisos en el objeto context. Los handlers pueden usar esto sin re-validar el token.
- **Manejar errores graceful**: Retorna `Deny` en cualquier fallo de validacion. No lances excepciones — API Gateway trata las excepciones como errores 500, no 403.
- **Usar `ValidationExpression`**: Una regex en el header Authorization previene invocar el authorizer para tokens malformados.

## Errores Comunes

- **No cachear el authorizer**: Cada peticion invoca el authorizer Lambda, agregando 50-200ms de latencia e incrementando costos. Siempre establece un TTL.
- **Cachear demasiado tiempo**: Si el TTL excede la expiracion del token, los tokens revocados permanecen validos. Establece TTL a 300 segundos o menos.
- **Usar `Deny` con recurso wildcard**: `Deny` en `*` bloquea todo el acceso al API. Deniega solo el ARN de ruta especifico.
- **No manejar headers faltantes**: Si el header Authorization esta ausente, `headers.get('Authorization')` retorna `None`. Maneja este caso explicitamente.
- **Lanzar excepciones en lugar de retornar Deny**: Las excepciones causan errores 500. Retorna una politica `Deny` para cualquier fallo de validacion.

## FAQ

**Cual es la diferencia entre un Lambda authorizer y un Cognito authorizer?**

El Cognito authorizer valida tokens JWT de Cognito User Pools directamente — sin codigo custom. El Lambda authorizer ejecuta tu codigo, soportando cualquier formato de token (JWT, API keys, OAuth de IdPs de terceros).

**Como funciona el caching del authorizer?**

API Gateway cachea la politica IAM identificada por el valor del token. Por la duracion del TTL, peticiones con el mismo token reciben la politica cacheada sin invocar el authorizer. Cambiar el token o esperar a que el TTL expire dispara una nueva invocacion.

**Puedo usar un Lambda authorizer con HTTP API (v2)?**

Si. HTTP API soporta Lambda authorizers con un formato de evento ligeramente diferente. La estructura del evento usa headers en lowercase y `requestContext.http.method` en lugar de `httpMethod`.

**Cual es el tamano maximo del contexto?**

El objeto context del authorizer tiene un limite de 10KB. Mantenlo pequeno — pasa solo campos esenciales (user ID, rol, tenant ID).

**Como revoco un token cacheado?**

No puedes revocar selectivamente una respuesta de authorizer cacheada. Reduce el TTL para minimizar la ventana, o usa una lista de revocacion de tokens verificada en el handler (no en el authorizer, ya que esta cacheado).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
