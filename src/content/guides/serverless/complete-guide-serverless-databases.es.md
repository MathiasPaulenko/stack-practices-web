---
contentType: guides
slug: complete-guide-serverless-databases
title: "Guía Completa de Bases de Datos Serverless"
description: "Elegir y operar bases de datos serverless para aplicaciones event-driven. Cubre DynamoDB, Aurora Serverless, FaunaDB y PlanetScale con pricing, escalado, patrones de query y estrategias de migracion."
metaDescription: "Elegir bases de datos serverless: DynamoDB, Aurora Serverless, FaunaDB, PlanetScale. Cubre pricing, escalado, query patterns y migracion."
difficulty: advanced
topics:
  - serverless
  - databases
  - infrastructure
tags:
  - serverless
  - databases
  - guia
  - dynamodb
  - aurora-serverless
  - faunadb
  - planetscale
  - scaling
relatedResources:
  - /guides/serverless/complete-guide-serverless-architecture
  - /guides/serverless/complete-guide-aws-lambda-production
  - /guides/caching/complete-guide-redis-caching-strategies
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Elegir bases de datos serverless: DynamoDB, Aurora Serverless, FaunaDB, PlanetScale. Cubre pricing, escalado, query patterns y migracion."
  keywords:
    - bases de datos serverless
    - dynamodb
    - aurora serverless
    - faunadb
    - planetscale
    - almacenamiento serverless
    - escalado base datos
    - patrones query serverless
---

## Introducción

Las aplicaciones serverless necesitan bases de datos serverless. Las bases de datos tradicionales requieren provisioning, gestion de conexiones, y capacity planning — todas cosas que las funciones serverless no manejan bien. Las bases de datos serverless resuelven esto con auto-escalado, gestion de conexiones, y facturacion por request. Esta guia recorre las principales opciones de bases de datos serverless, sus tradeoffs, y como usarlas efectivamente con funciones serverless.

## Panorama de Bases de Datos Serverless

```text
Base de Datos     Tipo            Escalado         Conexiones        Pricing
──────────────────────────────────────────────────────────────────────────────
DynamoDB          NoSQL (KV)      Auto, instant    HTTP API          Por request
Aurora Serverless Relacional      Auto (pause)     Proxy-managed     Por ACU-hour
FaunaDB           NoSQL (doc)     Auto, global     HTTP API          Por request
PlanetScale       MySQL (Vitess)  Horizontal       Proxy-managed     Por row read
Upstash           Redis           Auto             HTTP API          Por request
```

## Amazon DynamoDB

DynamoDB es la base de datos serverless mas popular. Es un key-value store NoSQL fully managed que escala automaticamente y cobra por request.

### Operaciones Básicas

```python
import boto3
import json
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("users")

# Put item
def create_user(user_id, name, email):
    table.put_item(Item={
        "id": user_id,
        "name": name,
        "email": email,
        "created_at": "2026-07-04T12:00:00Z"
    })

# Get item
def get_user(user_id):
    response = table.get_item(Key={"id": user_id})
    return response.get("Item")

# Query por partition key
def get_users_by_status(status):
    response = table.query(
        IndexName="status-index",
        KeyConditionExpression=Key("status").eq(status)
    )
    return response["Items"]

# Update item
def update_user(user_id, data):
    update_expr = "SET "
    expr_values = {}
    expr_names = {}
    
    for key, value in data.items():
        update_expr += f"#{key} = :{key}, "
        expr_names[f"#{key}"] = key
        expr_values[f":{key}"] = value
    
    update_expr = update_expr.rstrip(", ")
    
    table.update_item(
        Key={"id": user_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values
    )

# Delete item
def delete_user(user_id):
    table.delete_item(Key={"id": user_id})
```

### Disenar para DynamoDB

DynamoDB tiene restricciones especificas. Entenderlas es critico para un buen diseno de schema.

**Single-table design**: A diferencia de las bases de datos relacionales, DynamoDB funciona mejor con una sola tabla que contiene multiples tipos de entidades. Esto minimiza queries y maximiza rendimiento.

```python
# Tabla unica conteniendo users, orders, y products
table = dynamodb.Table("app-table")

# Entidad User
table.put_item(Item={
    "PK": "USER#123",
    "SK": "PROFILE",
    "name": "Alice",
    "email": "alice@example.com"
})

# Entidad Order (linkeada a user)
table.put_item(Item={
    "PK": "USER#123",
    "SK": "ORDER#2026-0704-001",
    "product_id": "PROD#456",
    "quantity": 2,
    "total": 99.98
})

# Entidad Product
table.put_item(Item={
    "PK": "PROD#456",
    "SK": "DETAILS",
    "name": "Widget",
    "price": 49.99
})

# Query: obtener user y todas sus orders en una query
response = table.query(
    KeyConditionExpression=Key("PK").eq("USER#123")
)
# Retorna user profile + todas las orders
```

### Modos de Capacity de DynamoDB

```python
# On-demand: pagar por request (mejor para trafico impredecible)
table = dynamodb.create_table(
    TableName="users",
    BillingMode="PAY_PER_REQUEST",
    AttributeDefinitions=[
        {"AttributeName": "id", "AttributeType": "S"}
    ],
    KeySchema=[
        {"AttributeName": "id", "KeyType": "HASH"}
    ]
)

# Provisioned: setear read/write capacity (mejor para trafico predecible)
table = dynamodb.create_table(
    TableName="users",
    BillingMode="PROVISIONED",
    AttributeDefinitions=[
        {"AttributeName": "id", "AttributeType": "S"}
    ],
    KeySchema=[
        {"AttributeName": "id", "KeyType": "HASH"}
    ],
    ProvisionedThroughput={
        "ReadCapacityUnits": 100,
        "WriteCapacityUnits": 50
    }
)
```

### DynamoDB Streams

DynamoDB Streams capturan cambios de tabla. Las funciones Lambda pueden reaccionar a cambios de datos en tiempo real.

```python
# Funcion Lambda triggerada por DynamoDB stream
def lambda_handler(event, context):
    for record in event["Records"]:
        event_name = record["eventName"]
        
        if event_name == "INSERT":
            new_image = record["dynamodb"]["NewImage"]
            # Reaccionar a nuevo item
            if "USER#" in new_image["PK"]["S"]:
                send_welcome_email(new_image["email"]["S"])
        
        elif event_name == "MODIFY":
            old_image = record["dynamodb"]["OldImage"]
            new_image = record["dynamodb"]["NewImage"]
            # Reaccionar a update
            if old_image["status"]["S"] != new_image["status"]["S"]:
                notify_status_change(new_image["id"]["S"])
        
        elif event_name == "REMOVE":
            old_image = record["dynamodb"]["OldImage"]
            # Reaccionar a eliminacion
            cleanup_related_data(old_image["id"]["S"])
    
    return {"status": "processed"}
```

### Global Secondary Indexes de DynamoDB

Los GSIs habilitan queries en atributos otros que la partition key.

```python
# Crear un GSI para queryear users por email
table.update(
    AttributeDefinitions=[
        {"AttributeName": "email", "AttributeType": "S"}
    ],
    GlobalSecondaryIndexUpdates=[
        {
            "Create": {
                "IndexName": "email-index",
                "KeySchema": [
                    {"AttributeName": "email", "KeyType": "HASH"}
                ],
                "Projection": {"ProjectionType": "ALL"}
            }
        }
    ]
)

# Query por email usando GSI
def get_user_by_email(email):
    response = table.query(
        IndexName="email-index",
        KeyConditionExpression=Key("email").eq(email)
    )
    return response["Items"][0] if response["Items"] else None
```

## Aurora Serverless v2

Aurora Serverless es una base de datos managed PostgreSQL/MySQL que auto-escala compute y storage. Se pausa cuando esta idle para reducir costos.

### Conectando desde Lambda

```python
import os
import json
import boto3
import psycopg2
from functools import lru_cache

@lru_cache(maxsize=1)
def get_credentials():
    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=os.environ["DB_SECRET_ARN"])
    return json.loads(response["SecretString"])

def get_connection():
    creds = get_credentials()
    # Conectar a traves de RDS Proxy para connection pooling
    return psycopg2.connect(
        host=os.environ["DB_PROXY_ENDPOINT"],
        port=5432,
        dbname=creds["dbname"],
        user=creds["username"],
        password=creds["password"],
        sslmode="require"
    )

def lambda_handler(event, context):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (event["user_id"],))
        columns = [desc[0] for desc in cursor.description]
        user = dict(zip(columns, cursor.fetchone()))
        return {"statusCode": 200, "body": json.dumps(user)}
    finally:
        cursor.close()
        conn.close()
```

### Escalado de Aurora Serverless

```text
Idle (0 ACU) → Llega request → Escala a min ACU → Procesa request
     ↑                                              ↓
     └────────── Idle por timeout ← Escala down ←────┘
```

- **Minimo ACU**: 0 (pausa completamente) a 0.5 (always warm)
- **Maximo ACU**: Hasta 256 ACU
- **Tiempo de scale-up**: ~1 segundo (warm) a ~10 segundos (paused)
- **Costo**: ~$0.12 por ACU-hour

### Cuándo Usar Aurora Serverless

- Necesitas features relacionales (JOINs, transacciones, foreign keys)
- El trafico es variable con periodos idle
- Quieres compatibilidad PostgreSQL/MySQL
- Necesitas transacciones ACID

## FaunaDB

FaunaDB es una base de datos serverless globalmente distribuida con un query language tipo relacional (FQL) y GraphQL API.

```python
from faunadb import query as q
from faunadb.client import FaunaClient

client = FaunaClient(secret="your-secret-key")

# Crear un documento
def create_user(user_id, name, email):
    return client.query(
        q.create(
            q.collection("users"),
            {"data": {"id": user_id, "name": name, "email": email}}
        )
    )

# Obtener un documento por ID
def get_user(user_id):
    return client.query(
        q.get(q.ref(q.collection("users"), user_id))
    )

# Query con index
def get_users_by_email(email):
    return client.query(
        q.map_(
            lambda ref: q.get(ref),
            q.paginate(q.match(q.index("users_by_email"), email))
        )
    )

# Transaccion: transferir creditos entre users
def transfer_credits(from_id, to_id, amount):
    return client.query(
        q.let(
            {
                "from": q.get(q.ref(q.collection("users"), from_id)),
                "to": q.get(q.ref(q.collection("users"), to_id))
            },
            q.if_(
                q.gte(q.select(["data", "credits"], q.var("from")), amount),
                q.do(
                    q.update(q.ref(q.collection("users"), from_id), {
                        "data": {"credits": q.subtract(q.select(["data", "credits"], q.var("from")), amount)}
                    }),
                    q.update(q.ref(q.collection("users"), to_id), {
                        "data": {"credits": q.add(q.select(["data", "credits"], q.var("to")), amount)}
                    })
                ),
                q.abort("Insufficient credits")
            )
        )
    )
```

### Fortalezas de FaunaDB

- Transacciones ACID across distribucion global
- Sin connection pooling necesario (HTTP API)
- GraphQL API out of the box
- Temporal queries (queryear datos en cualquier punto en el tiempo)

### Debilidades de FaunaDB

- Vendor lock-in (query language propietario)
- Mayor latencia que DynamoDB para lookups simples
- Ecosistema y tooling limitados
- Pricing puede ser impredecible para workloads de alto volumen

## PlanetScale

PlanetScale es una plataforma MySQL serverless construida sobre Vitess (el mismo sistema de sharding usado por YouTube).

```python
import mysql.connector
import os
import json

def get_connection():
    return mysql.connector.connect(
        host=os.environ["PLANETSCALE_HOST"],
        user=os.environ["PLANETSCALE_USER"],
        password=os.environ["PLANETSCALE_PASSWORD"],
        database=os.environ["PLANETSCALE_DB"],
        ssl_ca="/path/to/ssl-cert.pem"
    )

def lambda_handler(event, context):
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE id = %s", (event["user_id"],))
        user = cursor.fetchone()
        return {"statusCode": 200, "body": json.dumps(user)}
    finally:
        cursor.close()
        conn.close()
```

### Features de PlanetScale

- Compatibilidad MySQL (usar tools y ORMs de MySQL existentes)
- Sharding horizontal via Vitess
- Branching: crear branches de base de datos como git branches
- Sin problemas de connection pooling (proxy lo maneja)

### Limitaciones de PlanetScale

- Sin foreign key constraints (para compatibilidad de sharding)
- Pricing de row-level read puede ser impredecible
- Escalabilidad de escritura limitada comparada con DynamoDB

## Elegir una Base de Datos Serverless

| Criterio | DynamoDB | Aurora Serverless | FaunaDB | PlanetScale |
|----------|----------|-------------------|---------|-------------|
| Modelo de datos | Key-value | Relacional | Documento | Relacional |
| Conexiones | HTTP API | TCP (proxy) | HTTP API | TCP (proxy) |
| Transacciones | Single-region | ACID completo | ACID global | Limitadas |
| Flexibilidad query | Limitada (necesita GSIs) | SQL completo | FQL/GraphQL | SQL completo |
| Cold start | Ninguno | 10s desde paused | Ninguno | Ninguno |
| Replicacion global | Si (Global Tables) | Read replicas | Si (native) | Read replicas |
| Predictibilidad pricing | Alta | Media | Media | Baja |

### Framework de Decision

```text
Necesitas key-value lookups a escala? → DynamoDB
Necesitas queries relacionales y JOINs? → Aurora Serverless o PlanetScale
Necesitas transacciones ACID globales? → FaunaDB
Necesitas compatibilidad MySQL? → PlanetScale
Necesitas compatibilidad PostgreSQL? → Aurora Serverless
Necesitas cero gestion de conexiones? → DynamoDB o FaunaDB
```

## Data Modeling para Serverless

### Desnormalización

Las bases de datos serverless favorecen la desnormalizacion. En lugar de JOINs, almacena datos relacionados juntos.

```python
# Approach relacional (requiere JOINs — mal para DynamoDB)
# Table: users (id, name)
# Table: orders (id, user_id, product, total)
# Query: SELECT * FROM orders o JOIN users u ON o.user_id = u.id

# Approach desnormalizado (tabla unica — bien para DynamoDB)
table.put_item(Item={
    "PK": "USER#123",
    "SK": "ORDER#001",
    "user_name": "Alice",
    "user_email": "alice@example.com",
    "product": "Widget",
    "total": 49.99,
    "created_at": "2026-07-04T12:00:00Z"
})

# Una query obtiene todo
response = table.query(
    KeyConditionExpression=Key("PK").eq("USER#123") & Key("SK").begins_with("ORDER#")
)
```

### Diseno Driven por Access Patterns

Disena tu schema basandote en como vas a queryear los datos, no en como los datos estan estructurados.

```python
# Access patterns:
# 1. Get user by ID
# 2. Get all orders for a user
# 3. Get orders by date range
# 4. Get popular products

# Diseno de schema para estos patrones:
# PK: USER#<id>, SK: PROFILE → patron 1
# PK: USER#<id>, SK: ORDER#<date> → patron 2
# GSI: PK: ORDER_DATE#<date>, SK: USER#<id> → patron 3
# GSI: PK: PRODUCT#<id>, SK: ORDER#<date> → patron 4
```

## Estrategias de Migración

### De Relacional a DynamoDB

```python
# Step 1: Analizar access patterns
# Que queries corres actualmente?
# SELECT * FROM users WHERE id = ?          → GetItem
# SELECT * FROM orders WHERE user_id = ?    → Query
# SELECT * FROM users WHERE email = ?       → Query (GSI)

# Step 2: Disenar single-table schema
# PK = USER#<id>, SK = PROFILE for users
# PK = USER#<id>, SK = ORDER#<date> for orders
# GSI: email-index for email lookups

# Step 3: Migrar datos
def migrate_users():
    users = old_db.execute("SELECT * FROM users")
    for user in users:
        table.put_item(Item={
            "PK": f"USER#{user['id']}",
            "SK": "PROFILE",
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"].isoformat()
        })

# Step 4: Actualizar codigo de aplicacion
# Reemplazar SQL queries con operaciones DynamoDB
```

## Optimización de Costo

### Tips de Costo DynamoDB

```python
# Usar on-demand para workloads impredecibles
# Usar provisioned para workloads predecibles con auto-scaling

# Minimizar cantidad de GSIs (cada GSI cuesta storage + read/write units)
# Usar sparse indexes (solo items con el atributo indexado son incluidos)

# Batch operations reducen costos
def batch_get_users(user_ids):
    response = dynamodb.batch_get_item(
        RequestItems={
            "users": {
                "Keys": [{"id": uid} for uid in user_ids]
            }
        }
    )
    return response["Responses"]["users"]

# Usar projection expressions para fetchar solo atributos necesarios
def get_user_name(user_id):
    response = table.get_item(
        Key={"id": user_id},
        ProjectionExpression="name"
    )
    return response.get("Item", {}).get("name")
```

## Preguntas Frecuentes

### ¿Con qué base de datos serverless debería empezar?

Si estas en AWS, empieza con DynamoDB. Tiene la mejor integracion con Lambda, sin problemas de connection pooling, y pricing transparente. Si necesitas features relacionales, usa Aurora Serverless con RDS Proxy.

### ¿Puedo usar una base de datos tradicional con funciones serverless?

Si, pero necesitas manejar connection pooling. Cada execution environment de Lambda abre su propia conexion. Usa RDS Proxy para PostgreSQL/MySQL, o un connection pooler como pgBouncer. Sin pooling, la alta concurrencia agotara las conexiones de base de datos.

### ¿Cómo funciona el pricing de Aurora Serverless?

Aurora Serverless v2 cobra por ACU-hour (Aurora Capacity Unit). 1 ACU = 2 GB RAM + 1 vCPU. Escala entre un minimo y maximo ACU que configuras. Cuando idle, puede escalar a 0 ACU (paused), pero resumir toma ~10 segundos.

### ¿Es DynamoDB caro?

DynamoDB on-demand cuesta $1.25 por millon de write request units y $0.25 por millon de read request units. Para aplicaciones de alto trafico, provisioned capacity con auto-scaling es mas barato. Para workloads de bajo trafico o impredecibles, on-demand es mas costo-efectivo.

### ¿Puedo usar GraphQL con bases de datos serverless?

Si. FaunaDB tiene una GraphQL API built-in. AWS AppSync proporciona GraphQL sobre DynamoDB. Defines un GraphQL schema y mapeas resolvers a operaciones DynamoDB.

### ¿Cómo manejo transacciones en bases de datos serverless?

DynamoDB soporta transacciones across hasta 10 items en una sola tabla o multiples tablas. Aurora Serverless soporta transacciones ACID completas (es PostgreSQL/MySQL). FaunaDB soporta transacciones ACID globales. PlanetScale no soporta transacciones multi-statement across shards.
