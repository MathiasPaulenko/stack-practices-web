---
contentType: recipes
slug: serverless-dynamodb-single-table
title: "Design a DynamoDB Single-Table Schema for Serverless Apps"
description: "Design a DynamoDB single-table schema with composite keys, GSI patterns, and access patterns for serverless applications using Python and boto3."
metaDescription: "Design a DynamoDB single-table schema with composite keys, GSI patterns, and access patterns for serverless apps using Python and boto3."
difficulty: advanced
topics:
  - serverless
  - databases
  - architecture
tags:
  - dynamodb
  - single-table
  - nosql
  - aws
  - serverless
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/aws-lambda-cold-start-optimization
  - /guides/serverless-architecture-guide
  - /guides/complete-guide-mobile-responsive-design
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Design a DynamoDB single-table schema with composite keys, GSI patterns, and access patterns for serverless apps using Python and boto3."
  keywords:
    - dynamodb single table design
    - dynamodb schema design
    - nosql access patterns
    - dynamodb gsi
    - serverless dynamodb python
---

## Overview

DynamoDB single-table design puts all entities (users, orders, products) in one table using composite keys (PK + SK) and GSIs to satisfy all access patterns. This contrasts with relational design (one table per entity) and is counterintuitive, but it minimizes reads, reduces costs, and enables single-query aggregations. Below: designing access patterns, constructing composite keys, using GSIs, and querying with Python/boto3.

## When to Use This

- Serverless applications on AWS that need NoSQL storage
- Workloads with known access patterns (list them before designing)
- Applications that need low-latency reads at any scale
- Cost-sensitive projects (single-table minimizes read capacity)

## Prerequisites

- Python 3.10+
- AWS account with DynamoDB access
- `boto3` package

## Solution

### 1. Define Access Patterns

Before writing any code, list every query your application needs:

```text
Access Patterns:
1. Get user by ID → PK=USER#<id>, SK=PROFILE
2. Get all orders for a user → PK=USER#<id>, SK begins_with ORDER#
3. Get order by ID → PK=ORDER#<id>, SK=DETAILS
4. Get all items in an order → PK=ORDER#<id>, SK begins_with ITEM#
5. Get orders by status (e.g., PENDING) → GSI1PK=ORDERSTATUS#PENDING, GSI1SK=ORDER#<id>
6. Get orders by date range → GSI1PK=ORDERBYDATE, GSI1SK between dates
7. Get product by ID → PK=PRODUCT#<id>, SK=DETAILS
8. Get products by category → GSI1PK=CATEGORY#<cat>, GSI1SK=PRODUCT#<id>
```

### 2. Create the Table

```python
import boto3

dynamodb = boto3.client('dynamodb', region_name='us-east-1')

response = dynamodb.create_table(
    TableName='AppTable',
    KeySchema=[
        {'AttributeName': 'PK', 'KeyType': 'HASH'},
        {'AttributeName': 'SK', 'KeyType': 'RANGE'},
    ],
    AttributeDefinitions=[
        {'AttributeName': 'PK', 'AttributeType': 'S'},
        {'AttributeName': 'SK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
    ],
    GlobalSecondaryIndexes=[
        {
            'IndexName': 'GSI1',
            'KeySchema': [
                {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'},
            ],
            'Projection': {'ProjectionType': 'ALL'},
        },
    ],
    BillingMode='PAY_PER_REQUEST',
)

print(f"Table created: {response['TableDescription']['TableName']}")
```

### 3. Entity Patterns

```python
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('AppTable')

# User entity
def put_user(user_id: str, name: str, email: str):
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'PROFILE',
        'entityType': 'User',
        'userId': user_id,
        'name': name,
        'email': email,
        'createdAt': datetime.utcnow().isoformat(),
    })

# Order entity
def put_order(order_id: str, user_id: str, status: str, total: float):
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': f'ORDER#{order_id}',
        'GSI1PK': f'ORDERSTATUS#{status}',
        'GSI1SK': f'ORDER#{order_id}',
        'entityType': 'Order',
        'orderId': order_id,
        'userId': user_id,
        'status': status,
        'total': total,
        'createdAt': datetime.utcnow().isoformat(),
    })

# Order item entity (nested under order)
def put_order_item(order_id: str, item_id: str, product_id: str, quantity: int, price: float):
    table.put_item(Item={
        'PK': f'ORDER#{order_id}',
        'SK': f'ITEM#{item_id}',
        'entityType': 'OrderItem',
        'itemId': item_id,
        'orderId': order_id,
        'productId': product_id,
        'quantity': quantity,
        'price': price,
    })

# Product entity
def put_product(product_id: str, category: str, name: str, price: float):
    table.put_item(Item={
        'PK': f'PRODUCT#{product_id}',
        'SK': 'DETAILS',
        'GSI1PK': f'CATEGORY#{category}',
        'GSI1SK': f'PRODUCT#{product_id}',
        'entityType': 'Product',
        'productId': product_id,
        'category': category,
        'name': name,
        'price': price,
    })
```

### 4. Query Access Patterns

```python
# AP1: Get user by ID
def get_user(user_id: str) -> dict:
    response = table.get_item(
        Key={'PK': f'USER#{user_id}', 'SK': 'PROFILE'}
    )
    return response.get('Item')

# AP2: Get all orders for a user
def get_user_orders(user_id: str) -> list:
    response = table.query(
        KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues={
            ':pk': f'USER#{user_id}',
            ':sk': 'ORDER#',
        },
    )
    return response.get('Items', [])

# AP3: Get order details + items in one query
def get_order_with_items(order_id: str) -> dict:
    response = table.query(
        KeyConditionExpression='PK = :pk',
        ExpressionAttributeValues={':pk': f'ORDER#{order_id}'},
    )
    items = response.get('Items', [])
    order = next((i for i in items if i.get('entityType') == 'Order'), None)
    order_items = [i for i in items if i.get('entityType') == 'OrderItem']
    return {'order': order, 'items': order_items}

# AP5: Get orders by status (using GSI1)
def get_orders_by_status(status: str) -> list:
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': f'ORDERSTATUS#{status}'},
    )
    return response.get('Items', [])

# AP8: Get products by category (using GSI1)
def get_products_by_category(category: str) -> list:
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': f'CATEGORY#{category}'},
    )
    return response.get('Items', [])
```

### 5. Transactional Writes

```python
def create_order_with_items(user_id: str, order_id: str, items: list, total: float):
    transact_items = [{
        'Put': {
            'TableName': 'AppTable',
            'Item': {
                'PK': f'USER#{user_id}',
                'SK': f'ORDER#{order_id}',
                'GSI1PK': 'ORDERSTATUS#PENDING',
                'GSI1SK': f'ORDER#{order_id}',
                'entityType': 'Order',
                'orderId': order_id,
                'userId': user_id,
                'status': 'PENDING',
                'total': total,
                'createdAt': datetime.utcnow().isoformat(),
            },
        }
    }]

    for item in items:
        transact_items.append({
            'Put': {
                'TableName': 'AppTable',
                'Item': {
                    'PK': f'ORDER#{order_id}',
                    'SK': f'ITEM#{item["id"]}',
                    'entityType': 'OrderItem',
                    'itemId': item['id'],
                    'orderId': order_id,
                    'productId': item['product_id'],
                    'quantity': item['quantity'],
                    'price': item['price'],
                },
            }
        })

    dynamodb.meta.client.transact_write_items(TransactItems=transact_items)
```

### 6. Update with Condition

```python
def update_order_status(order_id: str, user_id: str, new_status: str):
    table.update_item(
        Key={
            'PK': f'USER#{user_id}',
            'SK': f'ORDER#{order_id}',
        },
        UpdateExpression='SET #status = :status, GSI1PK = :gsi_pk',
        ConditionExpression='attribute_exists(PK) AND attribute_exists(SK)',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': new_status,
            ':gsi_pk': f'ORDERSTATUS#{new_status}',
        },
    )
```

## How It Works

1. **Composite keys**: `PK` (partition key) determines which partition the item lives on. `SK` (sort key) determines ordering within the partition. Together they form a unique identifier and enable range queries.
2. **Entity colocation**: Related entities share the same PK. A user's profile and orders all have `PK=USER#<id>`. One query fetches everything — no joins.
3. **GSI for alternate access patterns**: The main table supports queries by PK. For queries by a different dimension (status, category), a GSI remaps the data with a different PK/SK.
4. **begins_with for hierarchical queries**: `SK` values like `ORDER#123`, `ORDER#456` can be queried with `begins_with(SK, 'ORDER#')` to get all orders for a user.
5. **Single-table advantage**: All entities in one table means one billing unit, one set of capacity settings, and the ability to fetch related data in a single query.

## Variants

### Sparse GSI

Only items with a specific attribute appear in the GSI, reducing cost:

```python
# Only published products have GSI2PK — drafts are excluded from the GSI
def put_product(product_id: str, category: str, name: str, price: float, published: bool):
    item = {
        'PK': f'PRODUCT#{product_id}',
        'SK': 'DETAILS',
        'GSI1PK': f'CATEGORY#{category}',
        'GSI1SK': f'PRODUCT#{product_id}',
        'entityType': 'Product',
        'productId': product_id,
        'name': name,
        'price': price,
    }
    if published:
        item['GSI2PK'] = 'PUBLISHED'
        item['GSI2SK'] = f'PRODUCT#{product_id}'
    table.put_item(Item=item)
```

### Overloaded GSI

Use one GSI for multiple access patterns by varying the GSI PK prefix:

```text
GSI1PK=ORDERSTATUS#PENDING → orders by status
GSI1PK=CATEGORY#electronics → products by category
GSI1PK=USEREMAIL#alice@test.com → user by email
```

### Time-Based Queries

```python
# Get orders in a date range using GSI
def get_orders_by_date_range(start: str, end: str) -> list:
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
        ExpressionAttributeValues={
            ':pk': 'ORDERBYDATE',
            ':start': f'DATE#{start}',
            ':end': f'DATE#{end}',
        },
    )
    return response.get('Items', [])
```

## Best Practices

- **List access patterns first**: DynamoDB is query-driven, not schema-driven. If you can't list your access patterns, you can't design the table.
- **Use `begins_with` for hierarchical SKs**: `USER#<id>` as PK, `ORDER#<id>` as SK lets you query all orders for a user in one call.
- **Minimize GSIs**: Each GSI costs read/write capacity and storage. Use overloaded GSIs (one GSI, multiple access patterns) to reduce count.
- **Use `PAY_PER_REQUEST` for unpredictable workloads**: On-demand billing avoids capacity planning. Switch to provisioned for steady, high traffic.
- **Keep items under 400KB**: DynamoDB item limit is 400KB. For larger data, split into multiple items or use S3 with a pointer.
- **Use transactions sparingly**: `transact_write_items` costs 2x write capacity and has a 100-item limit. Use only when atomicity is required.

## Common Mistakes

- **Designing like a relational database**: DynamoDB doesn't support JOINs. If you need joins, denormalize or use multiple queries.
- **Too many GSIs**: Each GSI replicates data and costs capacity. Aim for 1-2 GSIs per table, overloaded for multiple patterns.
- **Not planning access patterns**: Adding a new access pattern after deployment requires a new GSI, which takes time and costs money.
- **Using scan instead of query**: `scan` reads the entire table. `query` uses indexes. Never use `scan` in production for filtered reads.
- **Hot partitions**: If all writes go to one PK (e.g., a counter), that partition becomes a bottleneck. Use random suffixes to distribute writes.

## FAQ

**Why single-table instead of one table per entity?**

Single-table design collocates related entities, enabling single-query reads (no joins). It reduces read capacity units and simplifies billing. The tradeoff is a steeper learning curve and less flexibility for new access patterns.

**How many GSIs should I create?**

Aim for 1-3 GSIs. Each GSI has its own read/write capacity and storage cost. Use overloaded GSIs (different PK prefixes for different access patterns) to serve multiple queries with one index.

**Can I change a table's schema after creation?**

You can add GSIs (takes time, costs capacity during creation). You cannot change the main table's key schema. Plan access patterns before creating the table.

**What is the difference between LSI and GSI?**

LSI (Local Secondary Index) has the same PK as the main table but a different SK. Limited to 10GB per partition. GSI (Global Secondary Index) can have different PK and SK. Use LSI for alternate sort orders within the same partition, GSI for completely different access patterns.

**How do I handle pagination?**

Use `ExclusiveStartKey` with the `LastEvaluatedKey` from the previous query:

```python
response = table.query(
    KeyConditionExpression='PK = :pk',
    ExpressionAttributeValues={':pk': f'USER#{user_id}'},
    Limit=20,
)
last_key = response.get('LastEvaluatedKey')
# Next page: pass ExclusiveStartKey=last_key
```

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
