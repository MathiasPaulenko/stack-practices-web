---
contentType: guides
slug: complete-guide-serverless-databases
title: "Complete Guide to Serverless Databases"
description: "Choose and operate serverless databases for event-driven applications. Covers DynamoDB, Aurora Serverless, FaunaDB, and PlanetScale with pricing, scaling, query patterns, and migration strategies."
metaDescription: "Choose serverless databases: DynamoDB, Aurora Serverless, FaunaDB, PlanetScale. Covers pricing, scaling, query patterns, and migration strategies."
difficulty: advanced
topics:
  - serverless
  - databases
  - infrastructure
tags:
  - serverless
  - databases
  - guide
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
  metaDescription: "Choose serverless databases: DynamoDB, Aurora Serverless, FaunaDB, PlanetScale. Covers pricing, scaling, query patterns, and migration strategies."
  keywords:
    - serverless databases
    - dynamodb
    - aurora serverless
    - faunadb
    - planetscale
    - serverless data storage
    - database scaling
    - serverless query patterns
---

## Introduction

Serverless applications need serverless databases. Traditional databases require provisioning, connection management, and capacity planning — all things serverless functions are not good at. Serverless databases solve this by auto-scaling, handling connection management, and charging per request. The following walks through the major serverless database options, their tradeoffs, and how to use them effectively with serverless functions.

## Serverless Database Landscape

```text
Database           Type            Scaling          Connections      Pricing
──────────────────────────────────────────────────────────────────────────────
DynamoDB           NoSQL (KV)      Auto, instant    HTTP API         Per request
Aurora Serverless  Relational      Auto (pause)     Proxy-managed    Per ACU-hour
FaunaDB            NoSQL (doc)     Auto, global     HTTP API         Per request
PlanetScale        MySQL (Vitess)  Horizontal       Proxy-managed    Per row read
Upstash            Redis           Auto             HTTP API         Per request
```

## Amazon DynamoDB

DynamoDB is the most popular serverless database. It is a fully managed NoSQL key-value store that scales automatically and charges per request.

### Basic Operations

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

# Query by partition key
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

### Designing for DynamoDB

DynamoDB has specific constraints. Understanding them is critical for good schema design.

**Single-table design**: Unlike relational databases, DynamoDB works best with a single table that holds multiple entity types. This minimizes queries and maximizes performance.

```python
# Single table holding users, orders, and products
table = dynamodb.Table("app-table")

# User entity
table.put_item(Item={
    "PK": "USER#123",
    "SK": "PROFILE",
    "name": "Alice",
    "email": "alice@example.com"
})

# Order entity (linked to user)
table.put_item(Item={
    "PK": "USER#123",
    "SK": "ORDER#2026-0704-001",
    "product_id": "PROD#456",
    "quantity": 2,
    "total": 99.98
})

# Product entity
table.put_item(Item={
    "PK": "PROD#456",
    "SK": "DETAILS",
    "name": "Widget",
    "price": 49.99
})

# Query: get user and all their orders in one query
response = table.query(
    KeyConditionExpression=Key("PK").eq("USER#123")
)
# Returns user profile + all orders
```

### DynamoDB Capacity Modes

```python
# On-demand: pay per request (best for unpredictable traffic)
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

# Provisioned: set read/write capacity (best for predictable traffic)
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

DynamoDB Streams capture table changes. Lambda functions can react to data changes in real time.

```python
# Lambda function triggered by DynamoDB stream
def lambda_handler(event, context):
    for record in event["Records"]:
        event_name = record["eventName"]
        
        if event_name == "INSERT":
            new_image = record["dynamodb"]["NewImage"]
            # React to new item
            if "USER#" in new_image["PK"]["S"]:
                send_welcome_email(new_image["email"]["S"])
        
        elif event_name == "MODIFY":
            old_image = record["dynamodb"]["OldImage"]
            new_image = record["dynamodb"]["NewImage"]
            # React to update
            if old_image["status"]["S"] != new_image["status"]["S"]:
                notify_status_change(new_image["id"]["S"])
        
        elif event_name == "REMOVE":
            old_image = record["dynamodb"]["OldImage"]
            # React to deletion
            cleanup_related_data(old_image["id"]["S"])
    
    return {"status": "processed"}
```

### DynamoDB Global Secondary Indexes

GSIs enable querying on attributes other than the partition key.

```python
# Create a GSI for querying users by email
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

# Query by email using GSI
def get_user_by_email(email):
    response = table.query(
        IndexName="email-index",
        KeyConditionExpression=Key("email").eq(email)
    )
    return response["Items"][0] if response["Items"] else None
```

## Aurora Serverless v2

Aurora Serverless is a managed PostgreSQL/MySQL database that auto-scales compute and storage. It pauses when idle to reduce costs.

### Connecting from Lambda

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
    # Connect through RDS Proxy for connection pooling
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

### Aurora Serverless Scaling

```text
Idle (0 ACU) → Request arrives → Scales to min ACU → Processes request
     ↑                                              ↓
     └────────── Idle for timeout ← Scales down ←────┘
```

- **Minimum ACU**: 0 (pauses completely) to 0.5 (always warm)
- **Maximum ACU**: Up to 256 ACU
- **Scale-up time**: ~1 second (from warm) to ~10 seconds (from paused)
- **Cost**: ~$0.12 per ACU-hour

### When to Use Aurora Serverless

- You need relational features (JOINs, transactions, foreign keys)
- Traffic is variable with idle periods
- You want PostgreSQL/MySQL compatibility
- You need ACID transactions

## FaunaDB

FaunaDB is a globally distributed serverless database with a relational-like query language (FQL) and GraphQL API.

```python
from faunadb import query as q
from faunadb.client import FaunaClient

client = FaunaClient(secret="your-secret-key")

# Create a document
def create_user(user_id, name, email):
    return client.query(
        q.create(
            q.collection("users"),
            {"data": {"id": user_id, "name": name, "email": email}}
        )
    )

# Get a document by ID
def get_user(user_id):
    return client.query(
        q.get(q.ref(q.collection("users"), user_id))
    )

# Query with index
def get_users_by_email(email):
    return client.query(
        q.map_(
            lambda ref: q.get(ref),
            q.paginate(q.match(q.index("users_by_email"), email))
        )
    )

# Transaction: transfer credits between users
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

### FaunaDB Strengths

- ACID transactions across global distribution
- No connection pooling needed (HTTP API)
- GraphQL API out of the box
- Temporal queries (query data at any point in time)

### FaunaDB Weaknesses

- Vendor lock-in (proprietary query language)
- Higher latency than DynamoDB for simple lookups
- Limited ecosystem and tooling
- Pricing can be unpredictable for high-volume workloads

## PlanetScale

PlanetScale is a serverless MySQL platform built on Vitess (the same sharding system used by YouTube).

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

### PlanetScale Features

- MySQL compatibility (use existing MySQL tools and ORMs)
- Horizontal sharding via Vitess
- Branching: create database branches like git branches
- No connection pooling issues (proxy handles it)

### PlanetScale Limitations

- No foreign key constraints (for sharding compatibility)
- Row-level read pricing can be unpredictable
- Limited write scalability compared to DynamoDB

## Choosing a Serverless Database

| Criteria | DynamoDB | Aurora Serverless | FaunaDB | PlanetScale |
|----------|----------|-------------------|---------|-------------|
| Data model | Key-value | Relational | Document | Relational |
| Connections | HTTP API | TCP (proxy) | HTTP API | TCP (proxy) |
| Transactions | Single-region | Full ACID | Global ACID | Limited |
| Query flexibility | Limited (needs GSIs) | Full SQL | FQL/GraphQL | Full SQL |
| Cold start | None | 10s from paused | None | None |
| Global replication | Yes (Global Tables) | Read replicas | Yes (native) | Read replicas |
| Pricing predictability | High | Medium | Medium | Low |

### Decision Framework

```text
Need key-value lookups at scale? → DynamoDB
Need relational queries and JOINs? → Aurora Serverless or PlanetScale
Need global ACID transactions? → FaunaDB
Need MySQL compatibility? → PlanetScale
Need PostgreSQL compatibility? → Aurora Serverless
Need zero connection management? → DynamoDB or FaunaDB
```

## Data Modeling for Serverless

### Denormalization

Serverless databases favor denormalization. Instead of JOINs, store related data together.

```python
# Relational approach (requires JOINs — bad for DynamoDB)
# Table: users (id, name)
# Table: orders (id, user_id, product, total)
# Query: SELECT * FROM orders o JOIN users u ON o.user_id = u.id

# Denormalized approach (single table — good for DynamoDB)
table.put_item(Item={
    "PK": "USER#123",
    "SK": "ORDER#001",
    "user_name": "Alice",
    "user_email": "alice@example.com",
    "product": "Widget",
    "total": 49.99,
    "created_at": "2026-07-04T12:00:00Z"
})

# One query gets everything
response = table.query(
    KeyConditionExpression=Key("PK").eq("USER#123") & Key("SK").begins_with("ORDER#")
)
```

### Access Pattern-Driven Design

Design your schema based on how you will query the data, not how the data is structured.

```python
# Access patterns:
# 1. Get user by ID
# 2. Get all orders for a user
# 3. Get orders by date range
# 4. Get popular products

# Schema design for these patterns:
# PK: USER#<id>, SK: PROFILE → pattern 1
# PK: USER#<id>, SK: ORDER#<date> → pattern 2
# GSI: PK: ORDER_DATE#<date>, SK: USER#<id> → pattern 3
# GSI: PK: PRODUCT#<id>, SK: ORDER#<date> → pattern 4
```

## Migration Strategies

### From Relational to DynamoDB

```python
# Step 1: Analyze access patterns
# What queries do you currently run?
# SELECT * FROM users WHERE id = ?          → GetItem
# SELECT * FROM orders WHERE user_id = ?    → Query
# SELECT * FROM users WHERE email = ?       → Query (GSI)

# Step 2: Design single-table schema
# PK = USER#<id>, SK = PROFILE for users
# PK = USER#<id>, SK = ORDER#<date> for orders
# GSI: email-index for email lookups

# Step 3: Migrate data
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

# Step 4: Update application code
# Replace SQL queries with DynamoDB operations
```

## Cost Optimization

### DynamoDB Cost Tips

```python
# Use on-demand for unpredictable workloads
# Use provisioned for predictable workloads with auto-scaling

# Minimize GSI count (each GSI costs storage + read/write units)
# Use sparse indexes (only items with the indexed attribute are included)

# Batch operations reduce costs
def batch_get_users(user_ids):
    response = dynamodb.batch_get_item(
        RequestItems={
            "users": {
                "Keys": [{"id": uid} for uid in user_ids]
            }
        }
    )
    return response["Responses"]["users"]

# Use projection expressions to fetch only needed attributes
def get_user_name(user_id):
    response = table.get_item(
        Key={"id": user_id},
        ProjectionExpression="name"
    )
    return response.get("Item", {}).get("name")
```

## FAQ

### Which serverless database should I start with?

If you are on AWS, start with DynamoDB. It has the best integration with Lambda, no connection pooling issues, and transparent pricing. If you need relational features, use Aurora Serverless with RDS Proxy.

### Can I use a traditional database with serverless functions?

Yes, but you need to handle connection pooling. Each Lambda execution environment opens its own connection. Use RDS Proxy for PostgreSQL/MySQL, or use a connection pooler like pgBouncer. Without pooling, high concurrency will exhaust database connections.

### How does Aurora Serverless pricing work?

Aurora Serverless v2 charges per ACU-hour (Aurora Capacity Unit). 1 ACU = 2 GB RAM + 1 vCPU. It scales between a minimum and maximum ACU you configure. When idle, it can scale to 0 ACU (paused), but resuming takes ~10 seconds.

### Is DynamoDB expensive?

DynamoDB on-demand costs $1.25 per million write request units and $0.25 per million read request units. For high-traffic applications, provisioned capacity with auto-scaling is cheaper. For low-traffic or unpredictable workloads, on-demand is more cost-effective.

### Can I use GraphQL with serverless databases?

Yes. FaunaDB has a built-in GraphQL API. AWS AppSync provides GraphQL on top of DynamoDB. You define a GraphQL schema and map resolvers to DynamoDB operations.

### How do I handle transactions in serverless databases?

DynamoDB supports transactions across up to 10 items in a single table or multiple tables. Aurora Serverless supports full ACID transactions (it is PostgreSQL/MySQL). FaunaDB supports global ACID transactions. PlanetScale does not support multi-statement transactions across shards.
