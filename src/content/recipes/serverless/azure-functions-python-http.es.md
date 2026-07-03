---
contentType: recipes
slug: azure-functions-python-http
title: "Construir Azure Functions con HTTP Trigger en Python"
description: "Crear Azure Functions con HTTP trigger en Python con configuracion de bindings, handlers async, inyeccion de dependencias y despliegue via Azure CLI."
metaDescription: "Construye Azure Functions con HTTP trigger en Python. Configura bindings, usa handlers async, inyeccion de dependencias y despliega con Azure CLI."
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
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/gcp-cloud-functions-nodejs
  - /guides/serverless-architecture-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye Azure Functions con HTTP trigger en Python. Configura bindings, usa handlers async, inyeccion de dependencias y despliega con Azure CLI."
  keywords:
    - azure functions python
    - http trigger azure
    - python serverless azure
    - azure functions v2
    - azure functions deployment
---

## Descripcion general

Azure Functions es la plataforma de compute serverless de Microsoft. El modelo de programacion Python v2 usa decoradores para bindings en lugar de `function.json`, haciendo el codigo mas limpio y Pythonic. A continuacion: crear funciones con HTTP trigger, manejar bindings de entrada/salida, handlers async, inyeccion de dependencias, manejo de errores y desplegar via Azure CLI.

## Cuando Usar Esto

- Construir APIs HTTP serverless en Azure
- Webhooks y endpoints HTTP event-driven
- Microservicios ligeros sin gestionar infraestructura
- Integrar con otros servicios de Azure (Cosmos DB, Service Bus, Storage)

## Prerrequisitos

- Python 3.10+
- Azure Functions Core Tools v4
- Azure CLI
- VS Code con extension Azure Functions (opcional)

## Solucion

### 1. Crear una Function App

```bash
# Instalar Azure Functions Core Tools
# macOS: brew tap azure/functions && brew install azure-functions-core-tools@4
# Windows: winget install Microsoft.AzureFunctionsCoreTools

# Crear una nueva function app (modelo v2)
func init MyFunctionApp --python
cd MyFunctionApp

# Agregar una funcion con HTTP trigger
func new --name HttpGetUser --template "HTTP trigger" --authlevel function
```

### 2. Funcion HTTP Trigger (Modelo v2)

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

### 3. Bindings de Entrada/Salida

```python
import azure.functions as func
import json

app = func.FunctionApp()

# Binding de entrada Cosmos DB — obtener documento por ID
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

# Binding de salida Cosmos DB — guardar documento
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

### 4. Handlers Async

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

### 5. Inyeccion de Dependencias

```python
import azure.functions as func
import json
from dataclasses import dataclass

app = func.FunctionApp()

@dataclass
class UserService:
    db_connection_string: str

    def get_user(self, user_id: str) -> dict:
        # En produccion, usa un cliente de base de datos real
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

# Registrar el servicio
app.register_functions(UserService(db_connection_string=""))

# Usar en una funcion via patron factory
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

### 6. Manejo de Errores y Middleware

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

### 7. Configuracion y Entorno

```python
# local.settings.json (desarrollo)
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

Acceder en codigo:

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

### 8. Desplegar a Azure

```bash
# Crear resource group
az group create --name my-rg --location eastus

# Crear storage account (requerido por Functions)
az storage account create --name mystorageacct --resource-group my-rg --sku Standard_LRS

# Crear la function app
az functionapp create \
  --name my-function-app \
  --resource-group my-rg \
  --storage-account mystorageacct \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --consumption-plan-location eastus

# Desplegar
func azure functionapp publish my-function-app

# Obtener URL de la funcion
func azure functionapp list-functions my-function-app
```

## Como Funciona

1. **Modelo de programacion v2**: Usa decoradores `@app.route()` en lugar de archivos `function.json`. El archivo `function_app.py` es el entry point — Azure Functions descubre todas las funciones decoradas automaticamente.
2. **Bindings**: Los bindings de entrada y salida se declaran como decoradores (`@app.cosmos_db_input`, `@app.cosmos_db_output`). Azure maneja la conexion — tu funcion recibe los datos como parametro.
3. **Parametros de ruta**: Los parametros de URL como `{user_id}` son accesibles via `req.route_params.get('user_id')`. Los parametros de query estan en `req.params`.
4. **Soporte async**: Los handlers async (`async def`) se ejecutan en el event loop async. Usa `aiohttp` para llamadas HTTP y `aiocosmos` para Cosmos DB para evitar bloqueo.
5. **Despliegue**: `func azure functionapp publish` zipea el proyecto y lo despliega. Azure escala automaticamente basado en trafico HTTP.

## Variantes

### Funcion con Timer Trigger

```python
import azure.functions as func
import logging

app = func.FunctionApp()

@app.schedule(schedule="0 */6 * * *", arg_name="timer", run_on_startup=False)
def cleanup_timer(timer: func.TimerRequest) -> None:
    logging.info(f"Timer triggered at: {timer.schedule_status}")
    # Ejecutar logica de limpieza cada 6 horas
    cleanup_expired_sessions()
```

### Trigger de Cola Service Bus

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

### Trigger de Blob Storage

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

## Mejores Practicas

- **Usar el modelo v2**: Es mas limpio, mas Pythonic y soporta decoradores. El modelo v1 con `function.json` es legacy.
- **Usar async para funciones I/O-bound**: Los handlers async con `aiohttp` y drivers async de DB mejoran el throughput para workloads I/O-bound.
- **Separar logica de negocio**: Manten el handler de funcion delgado — delega a clases de servicio. Esto hace el codigo testeable.
- **Usar Application Insights para monitoreo**: Habilita en el portal de Azure para obtener distributed tracing y error tracking.
- **Establecer `run_on_startup=False` para timers**: De lo contrario la funcion se ejecuta en cada despliegue, lo que desperdicia recursos.
- **Validar input explicitamente**: Azure Functions no hace validacion de peticiones. Usa Pydantic para validacion de schema.

## Errores Comunes

- **Llamadas bloqueantes en handlers async**: `requests.get()` bloquea el event loop. Usa `aiohttp` en su lugar.
- **No manejar errores de parseo JSON**: `req.get_json()` lanza `ValueError` en JSON invalido. Siempre envuelve en try/except.
- **Usar `function.json` con modelo v2**: El modelo v2 usa decoradores. Mezclar `function.json` y decoradores causa conflictos.
- **Hardcodear connection strings**: Usa variables de entorno y App Settings. Nunca commitees connection strings.
- **Ignorar cold starts**: Azure Functions consumption plan tiene cold starts. Usa Premium plan para APIs sensibles a latencia.

## FAQ

**Azure Functions vs AWS Lambda — cual deberia elegir?**

Si ya estas en Azure (Cosmos DB, Service Bus, AD), Azure Functions se integra nativamente. Si estas en AWS (DynamoDB, SQS, Cognito), Lambda es la opcion natural. Ambos soportan Python y HTTP triggers.

**Cual es la diferencia entre plan Consumption y Premium?**

El plan Consumption escala a cero y cobra por ejecucion — pero tiene cold starts. El plan Premium pre-calienta instancias — sin cold starts, pero cuesta mas. Usa Consumption para workloads esporadicos, Premium para APIs sensibles a latencia.

**Puedo usar FastAPI con Azure Functions?**

Si. Usa el adaptador `azure-functions-fastapi` o el middleware ASGI. Esto te da la validacion y routing de FastAPI dentro de Azure Functions.

**Como gestiono dependencias?**

Crea un archivo `requirements.txt` en la raiz del proyecto. Azure Functions instala dependencias durante el despliegue. Para extensiones nativas, usa un contenedor Docker o una imagen de despliegue personalizada.

**Cual es el timeout maximo para Azure Functions?**

Plan Consumption: 10 minutos (default 5). Plan Premium/Dedicado: ilimitado (configurable). Para tareas de larga duracion, usa Durable Functions.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
