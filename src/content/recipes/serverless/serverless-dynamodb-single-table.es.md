---
contentType: recipes
slug: serverless-dynamodb-single-table
title: "Disenar un Schema Single-Table de DynamoDB para Apps Serverless"
description: "Disenar un schema single-table de DynamoDB con composite keys, patrones de GSI y access patterns para aplicaciones serverless usando Python y boto3."
metaDescription: "Disena un schema single-table de DynamoDB con composite keys, patrones de GSI y access patterns para apps serverless con Python y boto3."
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
  metaDescription: "Disena un schema single-table de DynamoDB con composite keys, patrones de GSI y access patterns para apps serverless con Python y boto3."
  keywords:
    - dynamodb single table design
    - dynamodb schema design
    - nosql access patterns
    - dynamodb gsi
    - serverless dynamodb python
---

## Descripcion general

El diseno single-table de DynamoDB pone todas las entidades (usuarios, ordenes, productos) en una tabla usando composite keys (PK + SK) y GSIs para satisfacer todos los access patterns. Esto contrasta con el diseno relacional (una tabla por entidad) y es contraintuitivo, pero minimiza lecturas, reduce costos y habilita agregaciones de una sola query. A continuacion: disenar access patterns, construir composite keys, usar GSIs y consultar con Python/boto3.

## Cuando Usar Esto

- Aplicaciones serverless en AWS que necesitan almacenamiento NoSQL
- Workloads con access patterns conocidos (listalos antes de disenar)
- Aplicaciones que necesitan lecturas de baja latencia a cualquier escala
- Proyectos sensibles a costo (single-table minimiza la capacidad de lectura)

## Prerrequisitos

- Python 3.10+
- Cuenta AWS con acceso a DynamoDB
- Paquete `boto3`

## Solucion

### 1. Definir Access Patterns

Antes de escribir codigo, lista cada query que tu aplicacion necesita:

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

### 2. Crear la Tabla

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

### 3. Patrones de Entidad

```python
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('AppTable')

# Entidad User
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

# Entidad Order
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

# Entidad OrderItem (anidada bajo order)
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

# Entidad Product
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

### 4. Query de Access Patterns

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

# AP3: Get order details + items en una query
def get_order_with_items(order_id: str) -> dict:
    response = table.query(
        KeyConditionExpression='PK = :pk',
        ExpressionAttributeValues={':pk': f'ORDER#{order_id}'},
    )
    items = response.get('Items', [])
    order = next((i for i in items if i.get('entityType') == 'Order'), None)
    order_items = [i for i in items if i.get('entityType') == 'OrderItem']
    return {'order': order, 'items': order_items}

# AP5: Get orders by status (usando GSI1)
def get_orders_by_status(status: str) -> list:
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': f'ORDERSTATUS#{status}'},
    )
    return response.get('Items', [])

# AP8: Get products by category (usando GSI1)
def get_products_by_category(category: str) -> list:
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :pk',
        ExpressionAttributeValues={':pk': f'CATEGORY#{category}'},
    )
    return response.get('Items', [])
```

### 5. Writes Transaccionales

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

### 6. Update con Condition

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

## Como Funciona

1. **Composite keys**: `PK` (partition key) determina en que particion vive el item. `SK` (sort key) determina el orden dentro de la particion. Juntos forman un identificador unico y habilitan range queries.
2. **Colocacion de entidades**: Entidades relacionadas comparten el mismo PK. El perfil y las ordenes de un usuario tienen `PK=USER#<id>`. Una query obtiene todo — sin joins.
3. **GSI para access patterns alternativos**: La tabla principal soporta queries por PK. Para queries por una dimension diferente (status, categoria), un GSI remapea los datos con un PK/SK diferente.
4. **begins_with para queries jerarquicos**: Valores de `SK` como `ORDER#123`, `ORDER#456` pueden consultarse con `begins_with(SK, 'ORDER#')` para obtener todas las ordenes de un usuario.
5. **Ventaja single-table**: Todas las entidades en una tabla significa una unidad de billing, un conjunto de settings de capacidad y la habilidad de obtener datos relacionados en una sola query.

## Variantes

### Sparse GSI

Solo items con un atributo especifico aparecen en el GSI, reduciendo costo:

```python
# Solo productos publicados tienen GSI2PK — los drafts se excluyen del GSI
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

### GSI Overloaded

Usar un GSI para multiples access patterns variando el prefijo del GSI PK:

```text
GSI1PK=ORDERSTATUS#PENDING → ordenes por status
GSI1PK=CATEGORY#electronics → productos por categoria
GSI1PK=USEREMAIL#alice@test.com → usuario por email
```

### Queries Basadas en Tiempo

```python
# Get ordenes en un rango de fechas usando GSI
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

## Mejores Practicas

- **Listar access patterns primero**: DynamoDB es query-driven, no schema-driven. Si no puedes listar tus access patterns, no puedes disenar la tabla.
- **Usar `begins_with` para SKs jerarquicos**: `USER#<id>` como PK, `ORDER#<id>` como SK te permite consultar todas las ordenes de un usuario en una llamada.
- **Minimizar GSIs**: Cada GSI cuesta capacidad de read/write y almacenamiento. Usa GSIs overloaded (un GSI, multiples access patterns) para reducir el conteo.
- **Usar `PAY_PER_REQUEST` para workloads impredecibles**: On-demand billing evita planificacion de capacidad. Cambia a provisioned para trafico estable y alto.
- **Mantener items bajo 400KB**: El limite de item de DynamoDB es 400KB. Para datos mas grandes, divide en multiples items o usa S3 con un puntero.
- **Usar transacciones con moderacion**: `transact_write_items` cuesta 2x capacidad de write y tiene un limite de 100 items. Usa solo cuando se requiere atomicidad.

## Errores Comunes

- **Disenar como base de datos relacional**: DynamoDB no soporta JOINs. Si necesitas joins, desnormaliza o usa multiples queries.
- **Demasiados GSIs**: Cada GSI replica datos y cuesta capacidad. Apunta a 1-2 GSIs por tabla, overloaded para multiples patrones.
- **No planear access patterns**: Agregar un nuevo access pattern despues del despliegue requiere un nuevo GSI, que toma tiempo y cuesta dinero.
- **Usar scan en lugar de query**: `scan` lee toda la tabla. `query` usa indices. Nunca uses `scan` en produccion para lecturas filtradas.
- **Particiones hot**: Si todos los writes van a un PK (ej., un contador), esa particion se vuelve un bottleneck. Usa sufijos aleatorios para distribuir writes.

## FAQ

**Por que single-table en lugar de una tabla por entidad?**

El diseno single-table coloca entidades relacionadas, habilitando lecturas de una sola query (sin joins). Reduce read capacity units y simplifica billing. El tradeoff es una curva de aprendizaje mas pronunciada y menos flexibilidad para nuevos access patterns.

**Cuantos GSIs deberia crear?**

Apunta a 1-3 GSIs. Cada GSI tiene su propia capacidad de read/write y costo de almacenamiento. Usa GSIs overloaded (diferentes prefijos de PK para diferentes access patterns) para servir multiples queries con un indice.

**Puedo cambiar el schema de una tabla despues de crearla?**

Puedes agregar GSIs (toma tiempo, cuesta capacidad durante la creacion). No puedes cambiar el key schema de la tabla principal. Planea access patterns antes de crear la tabla.

**Cual es la diferencia entre LSI y GSI?**

LSI (Local Secondary Index) tiene el mismo PK que la tabla principal pero un SK diferente. Limitado a 10GB por particion. GSI (Global Secondary Index) puede tener PK y SK diferentes. Usa LSI para ordenes de sort alternativos dentro de la misma particion, GSI para access patterns completamente diferentes.

**Como manejo paginacion?**

Usa `ExclusiveStartKey` con el `LastEvaluatedKey` de la query anterior:

```python
response = table.query(
    KeyConditionExpression='PK = :pk',
    ExpressionAttributeValues={':pk': f'USER#{user_id}'},
    Limit=20,
)
last_key = response.get('LastEvaluatedKey')
# Siguiente pagina: pasa ExclusiveStartKey=last_key
```
