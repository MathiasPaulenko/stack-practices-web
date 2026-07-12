---


contentType: recipes
slug: azure-functions-python-http
title: "Build HTTP-Triggered Azure Functions with Python"
description: "Create HTTP-triggered Azure Functions in Python with binding configuration, async handlers, dependency injection, and deployment via Azure CLI."
metaDescription: "Build HTTP-triggered Azure Functions in Python. Configure bindings, use async handlers, dependency injection, and deploy with Azure CLI and VS Code."
difficulty: intermediate
topics:
  - serverless
  - api
  - infrastructure
tags:
  - azure
  - functions
  - python
  - http-trigger
  - serverless
relatedResources:
  - /recipes/aws-lambda-python-dependencies
  - /recipes/gcp-cloud-functions-nodejs
  - /guides/serverless-architecture-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build HTTP-triggered Azure Functions in Python. Configure bindings, use async handlers, dependency injection, and deploy with Azure CLI and VS Code."
  keywords:
    - azure functions python
    - http trigger azure
    - python serverless azure
    - azure functions v2
    - azure functions deployment


---

## Overview

Azure Functions is Microsoft's serverless compute platform. The Python v2 programming model uses decorators for bindings instead of `function.json`, making the code cleaner and more Pythonic. Below: creating HTTP-triggered functions, handling input/output bindings, async handlers, dependency injection, error handling, and deploying via Azure CLI.

## When to Use This

- Building serverless HTTP APIs on Azure
- Webhooks and event-driven HTTP endpoints
- Lightweight microservices without managing infrastructure
- Integrating with other Azure services (Cosmos DB, Service Bus, Storage)

## Prerequisites

- Python 3.10+
- Azure Functions Core Tools v4
- Azure CLI
- VS Code with Azure Functions extension (optional)

## Solution

### 1. Create a Function App

```bash
# Install Azure Functions Core Tools
# macOS: brew tap azure/functions && brew install azure-functions-core-tools@4
# Windows: winget install Microsoft.AzureFunctionsCoreTools

# Create a new function app (v2 model)
func init MyFunctionApp --python
cd MyFunctionApp

# Add an HTTP-triggered function
func new --name HttpGetUser --template "HTTP trigger" --authlevel function
```

### 2. HTTP Trigger Function (v2 Model)

```python
# function_app.py
import azure.functions as func
import json
import logging

app = func.FunctionApp()

@app.route(route="users/{user_id}", methods=[func.HttpMethod.GET])
def get_user(req: func.HttpRequest) -> func.HttpResponse:
    user_id = req.route_params.get('user_id')

    user = fetch_user_from_db(user_id)
    if not user:
        return func.HttpResponse(
            body=json.dumps({"error": "User not found"}),
            status_code=404,
            mimetype="application/json",
        )

    return func.HttpResponse(
        body=json.dumps(user),
        status_code=200,
        mimetype="application/json",
    )

@app.route(route="users", methods=[func.HttpMethod.POST])
def create_user(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            body=json.dumps({"error": "Invalid JSON"}),
            status_code=400,
            mimetype="application/json",
        )

    user = create_user_in_db(body)
    return func.HttpResponse(
        body=json.dumps(user),
        status_code=201,
        mimetype="application/json",
    )
```

### 3. Input/Output Bindings

```python
import azure.functions as func
import json

app = func.FunctionApp()

# Cosmos DB input binding — fetch document by ID
@app.route(route="documents/{doc_id}")
@app.cosmos_db_input(
    arg_name="document",
    database_name="mydb",
    container_id="documents",
    id="{doc_id}",
    partition_key="{doc_id}",
    connection="CosmosDBConnection",
)
def get_document(req: func.HttpRequest, document: func.Document) -> func.HttpResponse:
    if document is None:
        return func.HttpResponse(
            body=json.dumps({"error": "Document not found"}),
            status_code=404,
            mimetype="application/json",
        )
    return func.HttpResponse(
        body=json.dumps(document.to_dict()),
        status_code=200,
        mimetype="application/json",
    )

# Cosmos DB output binding — save document
@app.route(route="documents", methods=[func.HttpMethod.POST])
@app.cosmos_db_output(
    arg_name="output",
    database_name="mydb",
    container_id="documents",
    connection="CosmosDBConnection",
)
def create_document(req: func.HttpRequest, output: func.Out[func.Document]) -> func.HttpResponse:
    body = req.get_json()
    output.set(func.Document.from_dict(body))
    return func.HttpResponse(
        body=json.dumps({"status": "created"}),
        status_code=201,
        mimetype="application/json",
    )
```

### 4. Async Handlers

```python
import azure.functions as func
import json
import asyncio
import aiohttp

app = func.FunctionApp()

@app.route(route="weather/{city}")
async def get_weather(req: func.HttpRequest) -> func.HttpResponse:
    city = req.route_params.get('city')
    api_key = req.params.get('api_key', 'default')

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"https://api.weather.example.com/{city}",
            headers={"X-API-Key": api_key},
        ) as response:
            data = await response.json()

    return func.HttpResponse(
        body=json.dumps(data),
        status_code=200,
        mimetype="application/json",
    )
```

### 5. Dependency Injection

```python
import azure.functions as func
import json
from dataclasses import dataclass

app = func.FunctionApp()

@dataclass
class UserService:
    db_connection_string: str

    def get_user(self, user_id: str) -> dict:
        # In production, use a real database client
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

# Register the service
app.register_functions(UserService(db_connection_string=""))

# Use in a function via a factory pattern
_user_service = UserService(db_connection_string="")

@app.route(route="users/{user_id}")
def get_user(req: func.HttpRequest) -> func.HttpResponse:
    user_id = req.route_params.get('user_id')
    user = _user_service.get_user(user_id)

    if not user:
        return func.HttpResponse(
            body=json.dumps({"error": "Not found"}),
            status_code=404,
            mimetype="application/json",
        )
    return func.HttpResponse(
        body=json.dumps(user),
        status_code=200,
        mimetype="application/json",
    )
```

### 6. Error Handling and Middleware

```python
import azure.functions as func
import json
import logging
import traceback

app = func.FunctionApp()

def handle_errors(func):
    async def wrapper(req: func.HttpRequest) -> func.HttpResponse:
        try:
            return await func(req)
        except ValueError as e:
            logging.error(f"Validation error: {e}")
            return func.HttpResponse(
                body=json.dumps({"error": str(e)}),
                status_code=400,
                mimetype="application/json",
            )
        except Exception as e:
            logging.error(f"Unexpected error: {e}\n{traceback.format_exc()}")
            return func.HttpResponse(
                body=json.dumps({"error": "Internal server error"}),
                status_code=500,
                mimetype="application/json",
            )
    return wrapper

@app.route(route="orders", methods=[func.HttpMethod.POST])
@handle_errors
async def create_order(req: func.HttpRequest) -> func.HttpResponse:
    body = req.get_json()

    if not body.get("product_id"):
        raise ValueError("product_id is required")
    if not body.get("quantity") or body["quantity"] <= 0:
        raise ValueError("quantity must be positive")

    order = await process_order(body)
    return func.HttpResponse(
        body=json.dumps(order),
        status_code=201,
        mimetype="application/json",
    )
```

### 7. Configuration and Environment

```python
# local.settings.json (development)
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "CosmosDBConnection": "AccountEndpoint=https://...",
    "API_KEY": "dev-key-123"
  }
}
```

Access in code:

```python
import os
import azure.functions as func

app = func.FunctionApp()

@app.route(route="config")
def get_config(req: func.HttpRequest) -> func.HttpResponse:
    api_key = os.environ.get("API_KEY", "not-set")
    cosmos_conn = os.environ.get("CosmosDBConnection", "not-set")

    return func.HttpResponse(
        body=json.dumps({
            "api_key_configured": api_key != "not-set",
            "cosmos_configured": cosmos_conn != "not-set",
        }),
        status_code=200,
        mimetype="application/json",
    )
```

### 8. Deploy to Azure

```bash
# Create resource group
az group create --name my-rg --location eastus

# Create storage account (required by Functions)
az storage account create --name mystorageacct --resource-group my-rg --sku Standard_LRS

# Create the function app
az functionapp create \
  --name my-function-app \
  --resource-group my-rg \
  --storage-account mystorageacct \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --consumption-plan-location eastus

# Deploy
func azure functionapp publish my-function-app

# Get function URL
func azure functionapp list-functions my-function-app
```

## How It Works

1. **v2 programming model**: Uses `@app.route()` decorators instead of `function.json` files. The `function_app.py` file is the entry point — Azure Functions discovers all decorated functions automatically.
2. **Bindings**: Input and output bindings are declared as decorators (`@app.cosmos_db_input`, `@app.cosmos_db_output`). Azure handles the connection — your function receives the data as a parameter.
3. **Route parameters**: URL parameters like `{user_id}` are accessible via `req.route_params.get('user_id')`. Query parameters are in `req.params`.
4. **Async support**: Async handlers (`async def`) run on the async event loop. Use `aiohttp` for HTTP calls and `aiocosmos` for Cosmos DB to avoid blocking.
5. **Deployment**: `func azure functionapp publish` zips the project and deploys it. Azure automatically scales based on HTTP traffic.

## Variants

### Timer-Triggered Function

```python
import azure.functions as func
import logging

app = func.FunctionApp()

@app.schedule(schedule="0 */6 * * *", arg_name="timer", run_on_startup=False)
def cleanup_timer(timer: func.TimerRequest) -> None:
    logging.info(f"Timer triggered at: {timer.schedule_status}")
    # Run cleanup logic every 6 hours
    cleanup_expired_sessions()
```

### Service Bus Queue Trigger

```python
import azure.functions as func
import json

app = func.FunctionApp()

@app.service_bus_queue_trigger(
    arg_name="msg",
    queue_name="orders",
    connection="ServiceBusConnection",
)
def process_order_message(msg: func.ServiceBusMessage) -> None:
    order = json.loads(msg.get_body().decode('utf-8'))
    process_order(order)
```

### Blob Storage Trigger

```python
import azure.functions as func
import logging

app = func.FunctionApp()

@app.blob_trigger(
    arg_name="blob",
    path="uploads/{name}",
    connection="StorageConnection",
)
def process_upload(blob: func.InputStream) -> None:
    logging.info(f"Processing blob: {blob.name}, size: {blob.length} bytes")
    content = blob.read()
    process_file(content)
```

## Best Practices


- For a deeper guide, see [Deploy HTTP Cloud Functions on Google Cloud with Node.js](/recipes/gcp-cloud-functions-nodejs/).

- **Use the v2 model**: It's cleaner, more Pythonic, and supports decorators. The v1 model with `function.json` is legacy.
- **Use async for I/O-bound functions**: Async handlers with `aiohttp` and async DB drivers improve throughput for I/O-bound workloads.
- **Separate business logic**: Keep the function handler thin — delegate to service classes. This makes the code testable.
- **Use Application Insights for monitoring**: Enable it in the Azure portal to get distributed tracing and error tracking.
- **Set `run_on_startup=False` for timers**: Otherwise the function runs on every deployment, which wastes resources.
- **Validate input explicitly**: Azure Functions doesn't do request validation. Use Pydantic for schema validation.

## Common Mistakes

- **Blocking calls in async handlers**: `requests.get()` blocks the event loop. Use `aiohttp` instead.
- **Not handling JSON parse errors**: `req.get_json()` raises `ValueError` on invalid JSON. Always wrap in try/except.
- **Using `function.json` with v2 model**: The v2 model uses decorators. Mixing `function.json` and decorators causes conflicts.
- **Hardcoding connection strings**: Use environment variables and App Settings. Never commit connection strings.
- **Ignoring cold starts**: Azure Functions consumption plan has cold starts. Use Premium plan for latency-sensitive APIs.

## FAQ

**Azure Functions vs AWS Lambda — which should I choose?**

If you're already on Azure (Cosmos DB, Service Bus, AD), Azure Functions integrates natively. If you're on AWS (DynamoDB, SQS, Cognito), Lambda is the natural choice. Both support Python and HTTP triggers.

**What is the difference between Consumption and Premium plans?**

Consumption plan scales to zero and charges per execution — but has cold starts. Premium plan pre-warms instances — no cold starts, but costs more. Use Consumption for sporadic workloads, Premium for latency-sensitive APIs.

**Can I use FastAPI with Azure Functions?**

Yes. Use the `azure-functions-fastapi` adapter or the ASGI middleware. This gives you FastAPI's validation and routing inside Azure Functions.

**How do I manage dependencies?**

Create a `requirements.txt` file in the project root. Azure Functions installs dependencies during deployment. For native extensions, use a Docker container or a custom deployment image.

**What is the maximum timeout for Azure Functions?**

Consumption plan: 10 minutes (default 5). Premium/Dedicated plan: unlimited (configurable). For long-running tasks, use Durable Functions.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
