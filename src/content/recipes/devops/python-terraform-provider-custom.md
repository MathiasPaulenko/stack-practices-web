---
contentType: recipes
slug: python-terraform-provider-custom
title: "Build a Custom Terraform Provider with Python and terraform-plugin-framework"
description: "Extend Terraform with a custom provider using Python and the terraform-plugin-framework to manage external resources."
metaDescription: "Build a custom Terraform provider in Python using terraform-plugin-framework. Define resources, data sources, CRUD operations, and schema validation."
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
  - /patterns/infrastructure-as-code-pattern
  - /guides/terraform-modules-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Build a custom Terraform provider in Python using terraform-plugin-framework. Define resources, data sources, CRUD operations, and schema validation."
  keywords:
    - python terraform provider
    - terraform custom provider python
    - terraform-plugin-framework python
    - terraform provider development
    - custom terraform resource
    - infrastructure as code python
---

## Overview

Terraform providers manage resources for external APIs. When no existing provider covers your service, you can build a custom one. The `terraform-plugin-framework` is the modern SDK for writing providers in Go, but `terraform-plugin-python` (based on `terraform-plugin-go`) brings provider development to Python. This recipe shows how to build a provider that manages a custom API resource.

## When to Use

- You have an internal API or service not covered by existing Terraform providers
- You want to manage infrastructure resources declaratively via Terraform
- You need to integrate a custom SaaS or on-prem tool with Terraform
- You want to version-control your infrastructure alongside application code

## Solution

### Provider structure

```text
terraform-provider-custom/
├── pyproject.toml
├── main.py
├── provider.py
├── resource_item.py
├── data_source_item.py
└── client.py
```

### Client wrapper for the external API

```python
import requests
from typing import Any

class ApiClient:
    """Wrapper for the external API that Terraform will manage."""

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

### Provider definition

```python
# provider.py
from terraform_plugin_framework.provider import Provider
from terraform_plugin_framework.types import Schema, StringAttribute

class CustomProvider(Provider):
    """Terraform provider definition."""

    def schema(self) -> Schema:
        return Schema(
            attributes={
                "api_url": StringAttribute(
                    required=True,
                    description="Base URL of the custom API",
                ),
                "api_token": StringAttribute(
                    required=True,
                    sensitive=True,
                    description="API authentication token",
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

### Resource definition with CRUD operations

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
    """Manages a custom_item resource via CRUD operations."""

    def schema(self) -> Schema:
        return Schema(
            attributes={
                "id": StringAttribute(
                    computed=True,
                    description="The item ID assigned by the API",
                ),
                "name": StringAttribute(
                    required=True,
                    description="The item name",
                ),
                "description": TextAttribute(
                    optional=True,
                    description="Optional description",
                ),
                "tags": StringAttribute(
                    optional=True,
                    description="Comma-separated tags",
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
                return ResourceState(attributes={})  # Resource gone
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

### Data source for reading existing items

```python
# data_source_item.py
from terraform_plugin_framework.data_source import DataSource
from terraform_plugin_framework.types import Schema, StringAttribute

class ItemDataSource(DataSource):
    """Reads an existing custom_item by ID."""

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

### Terraform configuration using the custom provider

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

### Running the provider locally

```bash
# Install the plugin framework
pip install terraform-plugin-framework-python

# Build and install the provider
python main.py

# In another terminal, init and apply
export TF_CLI_CONFIG_FILE=~/.terraformrc
terraform init
terraform plan
terraform apply
```

### .terraformrc for local provider

```text
# ~/.terraformrc
provider_installation {
    dev_overrides {
        "local/custom" = "/path/to/terraform-provider-custom"
    }
    direct {}
}
```

## Explanation

A Terraform provider is a plugin that Terraform launches as a subprocess. They communicate via gRPC. The provider defines:

- **Schema**: The configuration attributes the provider accepts (API URL, token).
- **Resources**: CRUD-managed entities. Each resource has a schema (required, optional, computed attributes) and four operations: create, read, update, delete.
- **Data sources**: Read-only lookups for existing resources. Only implement `read`.

The Terraform lifecycle:
1. `terraform plan` — Terraform calls `read` to get current state, compares with desired config, shows the diff.
2. `terraform apply` — Terraform calls `create` for new resources, `update` for changed ones, `delete` for removed ones.
3. `terraform refresh` — Terraform calls `read` to sync state with the real API.

Key concepts:
- **Computed attributes**: Set by the API, not by the user. The provider returns them after create/update.
- **Sensitive attributes**: Marked as sensitive to avoid appearing in logs and plan output.
- **State**: Terraform stores resource state in a JSON file. The provider's `read` keeps it in sync.
- **404 handling**: If `read` gets a 404, return empty state so Terraform knows the resource is gone.

## Variants

| Approach | Language | SDK | Use When |
|----------|----------|-----|----------|
| terraform-plugin-framework | Python | Python SDK | Python team, internal tools |
| terraform-plugin-framework | Go | Go SDK | Production, official providers |
| terraform-plugin-go | Go | Low-level Go | Maximum control |
| Terraform CDK | TypeScript/Python | CDK | Generate TF from code |

## Guidelines

- Keep the API client separate from the provider logic. Test the client independently.
- Handle 404s in `read` by returning empty state. This tells Terraform the resource no longer exists.
- Mark sensitive attributes (tokens, passwords) with `sensitive=True`.
- Use computed attributes for values assigned by the API (IDs, timestamps).
- Implement idempotent `create` — if the resource already exists, return it instead of erroring.
- Validate input in the schema (required, optional, computed).
- Log operations for debugging (use Python `logging` module).
- Version your provider semantically. Breaking schema changes require a major version bump.
- Write acceptance tests with a mock API server.

## Common Mistakes

- Not handling 404 in `read`. Terraform shows the resource as existing when it was deleted externally.
- Forgetting to return computed attributes in `update`. Terraform state drifts from the API.
- Not marking sensitive fields. Tokens appear in plan output and logs.
- Making `create` non-idempotent. Re-running `terraform apply` after a partial failure can create duplicates.
- Not validating API responses. A malformed response causes confusing Terraform errors.
- Hardcoding the API URL. Always make it configurable via the provider schema.
- Not testing the provider with `terraform plan` before `apply`. Plan reveals schema issues safely.

## Frequently Asked Questions

### Can I write a Terraform provider in Python?

Yes. The `terraform-plugin-python` project wraps `terraform-plugin-go` to enable Python providers. It is less mature than the Go SDK but functional for internal providers. For production-grade providers, Go is recommended.

### How does Terraform find my custom provider?

Terraform looks for providers in the plugin path. For local development, use `dev_overrides` in `~/.terraformrc`. For distribution, publish to the Terraform Registry.

### What is the difference between a resource and a data source?

Resources are managed (create, read, update, delete). Data sources are read-only. Use resources for things Terraform creates and destroys. Use data sources for things that exist outside Terraform.

### How do I test a custom provider?

Write acceptance tests that run `terraform plan` and `terraform apply` against a mock API. Use `pytest` with a `responses` or `httpretty` mock server. Verify that `terraform state` matches the API after each operation.
