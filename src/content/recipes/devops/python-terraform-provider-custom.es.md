---
contentType: recipes
slug: python-terraform-provider-custom
title: "Construye un Provider Personalizado de Terraform con Python y..."
description: "Extiende Terraform con un provider personalizado usando Python y terraform-plugin-framework para gestionar recursos externos."
metaDescription: "Construye un provider personalizado de Terraform en Python con terraform-plugin-framework. Define recursos, data sources, operaciones CRUD y validación de schema."
difficulty: advanced
topics:
  - devops
  - infrastructure
tags:
  - python
  - terraform
  - infrastructure-as-code
  - custom-provider
  - terraform-plugin-framework
  - iac
relatedResources:
  - /recipes/devops/docker-network-isolation
  - /recipes/devops/docker-health-check-configuration
  - /guides/infrastructure-as-code-guide
  - /patterns/infrastructure-as-code-guide
  - /guides/complete-guide-terraform-modules
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Construye un provider personalizado de Terraform en Python con terraform-plugin-framework. Define recursos, data sources, operaciones CRUD y validación de schema."
  keywords:
    - python terraform provider
    - terraform custom provider python
    - terraform-plugin-framework python
    - terraform provider development
    - custom terraform resource
    - infrastructure as code python
---

## Visión General

Los providers de Terraform gestionan recursos para APIs externas. Cuando ningún provider existente cubre tu servicio, puedes construir uno personalizado. El `terraform-plugin-framework` es el SDK moderno para escribir providers en Go, pero `terraform-plugin-python` (basado en `terraform-plugin-go`) trae el desarrollo de providers a Python. Esta recipe muestra cómo construir un provider que gestiona un recurso de API personalizado.

## Cuándo Usar

- Tienes una API o servicio interno no cubierto por providers existentes de Terraform
- Quieres gestionar recursos de infraestructura declarativamente vía Terraform
- Necesitas integrar un SaaS o herramienta on-prem personalizado con Terraform
- Quieres control de versiones de tu infraestructura junto al código de aplicación

## Solución

### Estructura del provider

```text
terraform-provider-custom/
├── pyproject.toml
├── main.py
├── provider.py
├── resource_item.py
├── data_source_item.py
└── client.py
```

### Wrapper del cliente para la API externa

```python
import requests
from typing import Any

class ApiClient:
    """Wrapper para la API externa que Terraform gestionará."""

    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        })

    def create_item(self, data: dict[str, Any]) -> dict[str, Any]:
        resp = self.session.post(f"{self.base_url}/items", json=data)
        resp.raise_for_status()
        return resp.json()

    def get_item(self, item_id: str) -> dict[str, Any]:
        resp = self.session.get(f"{self.base_url}/items/{item_id}")
        resp.raise_for_status()
        return resp.json()

    def update_item(self, item_id: str, data: dict[str, Any]) -> dict[str, Any]:
        resp = self.session.put(f"{self.base_url}/items/{item_id}", json=data)
        resp.raise_for_status()
        return resp.json()

    def delete_item(self, item_id: str) -> None:
        resp = self.session.delete(f"{self.base_url}/items/{item_id}")
        resp.raise_for_status()
```

### Definición del provider

```python
# provider.py
from terraform_plugin_framework.provider import Provider
from terraform_plugin_framework.types import Schema, StringAttribute

class CustomProvider(Provider):
    """Definición del provider de Terraform."""

    def schema(self) -> Schema:
        return Schema(
            attributes={
                "api_url": StringAttribute(
                    required=True,
                    description="URL base de la API personalizada",
                ),
                "api_token": StringAttribute(
                    required=True,
                    sensitive=True,
                    description="Token de autenticación de la API",
                ),
            }
        )

    def configure(self, config: dict) -> "CustomProviderClient":
        from client import ApiClient
        return ApiClient(
            base_url=config["api_url"],
            api_token=config["api_token"],
        )

    def resources(self) -> dict:
        from resource_item import ItemResource
        return {
            "custom_item": ItemResource,
        }

    def data_sources(self) -> dict:
        from data_source_item import ItemDataSource
        return {
            "custom_item": ItemDataSource,
        }
```

### Definición de recurso con operaciones CRUD

```python
# resource_item.py
from terraform_plugin_framework.resource import Resource
from terraform_plugin_framework.types import (
    Schema,
    StringAttribute,
    TextAttribute,
)
from terraform_plugin_framework.plan import ResourcePlan
from terraform_plugin_framework.state import ResourceState

class ItemResource(Resource):
    """Gestiona un recurso custom_item vía operaciones CRUD."""

    def schema(self) -> Schema:
        return Schema(
            attributes={
                "id": StringAttribute(
                    computed=True,
                    description="El ID del item asignado por la API",
                ),
                "name": StringAttribute(
                    required=True,
                    description="El nombre del item",
                ),
                "description": TextAttribute(
                    optional=True,
                    description="Descripción opcional",
                ),
                "tags": StringAttribute(
                    optional=True,
                    description="Tags separados por comas",
                ),
            }
        )

    def create(self, plan: ResourcePlan, client) -> ResourceState:
        data = {
            "name": plan.attributes["name"],
            "description": plan.attributes.get("description", ""),
            "tags": plan.attributes.get("tags", ""),
        }
        result = client.create_item(data)
        return ResourceState(
            attributes={
                "id": result["id"],
                "name": result["name"],
                "description": result.get("description", ""),
                "tags": result.get("tags", ""),
            }
        )

    def read(self, state: ResourceState, client) -> ResourceState:
        item_id = state.attributes["id"]
        try:
            result = client.get_item(item_id)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                return ResourceState(attributes={})  # Recurso gone
            raise
        return ResourceState(
            attributes={
                "id": result["id"],
                "name": result["name"],
                "description": result.get("description", ""),
                "tags": result.get("tags", ""),
            }
        )

    def update(self, state: ResourceState, plan: ResourcePlan, client) -> ResourceState:
        item_id = state.attributes["id"]
        data = {
            "name": plan.attributes["name"],
            "description": plan.attributes.get("description", ""),
            "tags": plan.attributes.get("tags", ""),
        }
        result = client.update_item(item_id, data)
        return ResourceState(
            attributes={
                "id": result["id"],
                "name": result["name"],
                "description": result.get("description", ""),
                "tags": result.get("tags", ""),
            }
        )

    def delete(self, state: ResourceState, client) -> None:
        item_id = state.attributes["id"]
        client.delete_item(item_id)
```

### Data source para leer items existentes

```python
# data_source_item.py
from terraform_plugin_framework.data_source import DataSource
from terraform_plugin_framework.types import Schema, StringAttribute

class ItemDataSource(DataSource):
    """Lee un custom_item existente por ID."""

    def schema(self) -> Schema:
        return Schema(
            attributes={
                "id": StringAttribute(required=True),
                "name": StringAttribute(computed=True),
                "description": StringAttribute(computed=True),
            }
        )

    def read(self, config: dict, client) -> dict:
        result = client.get_item(config["id"])
        return {
            "id": result["id"],
            "name": result["name"],
            "description": result.get("description", ""),
        }
```

### Entry point

```python
# main.py
from terraform_plugin_framework.serve import serve
from provider import CustomProvider

if __name__ == "__main__":
    serve(CustomProvider())
```

### Configuración de Terraform usando el provider personalizado

```hcl
# main.tf
terraform {
    required_providers {
        custom = {
            source  = "local/custom"
            version = "0.1.0"
        }
    }
}

provider "custom" {
    api_url   = "https://api.internal.example.com"
    api_token = var.api_token
}

variable "api_token" {
    type      = string
    sensitive = true
}

resource "custom_item" "my_item" {
    name        = "production-config"
    description = "Production configuration entry"
    tags        = "prod,config,critical"
}

data "custom_item" "existing" {
    id = "abc-123-def"
}

output "item_id" {
    value = custom_item.my_item.id
}

output "existing_name" {
    value = data.custom_item.existing.name
}
```

### Ejecutando el provider localmente

```bash
# Instalar el plugin framework
pip install terraform-plugin-framework-python

# Build e instalar el provider
python main.py

# En otra terminal, init y apply
export TF_CLI_CONFIG_FILE=~/.terraformrc
terraform init
terraform plan
terraform apply
```

### .terraformrc para provider local

```text
# ~/.terraformrc
provider_installation {
    dev_overrides {
        "local/custom" = "/path/to/terraform-provider-custom"
    }
    direct {}
}
```

## Explicación

Un provider de Terraform es un plugin que Terraform lanza como subproceso. Se comunican vía gRPC. El provider define:

- **Schema**: Los atributos de configuración que el provider acepta (URL de API, token).
- **Recursos**: Entidades gestionadas con CRUD. Cada recurso tiene un schema (atributos required, optional, computed) y cuatro operaciones: create, read, update, delete.
- **Data sources**: Lookups de solo lectura para recursos existentes. Solo implementan `read`.

El ciclo de vida de Terraform:
1. `terraform plan` — Terraform llama `read` para obtener el estado actual, compara con la config deseada, muestra el diff.
2. `terraform apply` — Terraform llama `create` para recursos nuevos, `update` para cambios, `delete` para removidos.
3. `terraform refresh` — Terraform llama `read` para sincronizar el estado con la API real.

Conceptos clave:
- **Atributos computed**: Establecidos por la API, no por el usuario. El provider los devuelve después de create/update.
- **Atributos sensitive**: Marcados como sensitive para evitar aparecer en logs y output de plan.
- **State**: Terraform almacena el estado de recursos en un archivo JSON. El `read` del provider lo mantiene sincronizado.
- **Manejo de 404**: Si `read` obtiene un 404, devolver estado vacío para que Terraform sepa que el recurso ya no existe.

## Variantes

| Enfoque | Lenguaje | SDK | Usar Cuando |
|----------|----------|-----|----------|
| terraform-plugin-framework | Python | Python SDK | Equipo Python, herramientas internas |
| terraform-plugin-framework | Go | Go SDK | Producción, providers oficiales |
| terraform-plugin-go | Go | Go low-level | Control máximo |
| Terraform CDK | TypeScript/Python | CDK | Generar TF desde código |

## Pautas

- Mantener el cliente de API separado de la lógica del provider. Testear el cliente independientemente.
- Manejar 404 en `read` devolviendo estado vacío. Esto le dice a Terraform que el recurso ya no existe.
- Marcar atributos sensitive (tokens, passwords) con `sensitive=True`.
- Usar atributos computed para valores asignados por la API (IDs, timestamps).
- Implementar `create` idempotente — si el recurso ya existe, devolverlo en lugar de errorar.
- Validar input en el schema (required, optional, computed).
- Loguear operaciones para debugging (usar el módulo `logging` de Python).
- Versionar el provider semánticamente. Cambios de schema breaking requieren un major version bump.
- Escribir acceptance tests con un mock server de API.

## Errores Comunes

- No manejar 404 en `read`. Terraform muestra el recurso como existente cuando fue eliminado externamente.
- Olvidar devolver atributos computed en `update`. El estado de Terraform se desincroniza de la API.
- No marcar campos sensitive. Los tokens aparecen en el output de plan y logs.
- Hacer `create` no idempotente. Re-ejecutar `terraform apply` después de un fallo parcial puede crear duplicados.
- No validar respuestas de la API. Una respuesta malformada causa errores confusos de Terraform.
- Hardcodear la URL de la API. Siempre hacerla configurable vía el schema del provider.
- No testear el provider con `terraform plan` antes de `apply`. Plan revela problemas de schema de forma segura.

## Preguntas Frecuentes

### ¿Puedo escribir un provider de Terraform en Python?

Sí. El proyecto `terraform-plugin-python` envuelve `terraform-plugin-go` para habilitar providers en Python. Es menos maduro que el SDK de Go pero funcional para providers internos. Para providers de grado producción, se recomienda Go.

### ¿Cómo encuentra Terraform mi provider personalizado?

Terraform busca providers en el plugin path. Para desarrollo local, usa `dev_overrides` en `~/.terraformrc`. Para distribución, publica en el Terraform Registry.

### ¿Cuál es la diferencia entre un resource y un data source?

Los resources son gestionados (create, read, update, delete). Los data sources son de solo lectura. Usa resources para cosas que Terraform crea y destruye. Usa data sources para cosas que existen fuera de Terraform.

### ¿Cómo testeo un provider personalizado?

Escribe acceptance tests que ejecuten `terraform plan` y `terraform apply` contra una API mock. Usa `pytest` con un mock server de `responses` o `httpretty`. Verifica que `terraform state` coincida con la API después de cada operación.
