---
contentType: recipes
slug: parse-config-files
title: "Parsear y Validar Configuración YAML/JSON"
description: "Cómo parsear y validar archivos de configuración de aplicaciones en YAML y JSON en Python, JavaScript, Java y Go."
metaDescription: "Parsea y valida archivos de configuración YAML y JSON en Python, JavaScript, Java y Go. Incluye validación de schema, overrides y valores por defecto."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - yaml
  - json
  - config
  - validation
  - python
  - javascript
  - java
  - go
relatedResources:
  - /recipes/input-validation
  - /recipes/environment-variables
  - /recipes/cli-tool-argument-parsing
  - /recipes/feature-flags
  - /recipes/docker-compose-local-dev
  - /recipes/health-check-endpoint
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Parsea y valida archivos de configuración YAML y JSON en Python, JavaScript, Java y Go. Incluye validación de schema, overrides y valores por defecto."
  keywords:
    - config
    - yaml
    - json
    - validacion
    - schema
    - python
    - javascript
    - java
    - go
---

## Resumen

La mayoría de las aplicaciones necesitan configuración externa para adaptarse a
ambientes distintos sin cambiar código. YAML y JSON son los formatos más usados, pero
parsear no alcanza: una configuración inválida puede romper todo en runtime. Esta
receta muestra cómo leer archivos y validarlos antes de que la app arranque.

## Cuándo Usar

- Para cargar credenciales de base de datos, API keys o feature flags desde archivos.
- Para soportar múltiples ambientes con distintos valores.
- Para validar configuración provista por el usuario y fallar rápido al inicio.
- Para migrar constantes hardcodeadas a configuración basada en archivos.

## Cuándo NO Usar

- Para secretos que nunca deberían tocar disco: usá variables de entorno o un gestor de
  secretos.
- Cuando una sola variable de entorno alcanza; no agregues un archivo de config para un
  solo valor.

## Solución

### Python con Pydantic

```python
import json
import yaml
from pydantic import BaseModel, Field, ValidationError
from pathlib import Path

class DatabaseConfig(BaseModel):
    host: str
    port: int = Field(default=5432, ge=1, le=65535)
    username: str
    password: str

class AppConfig(BaseModel):
    app_name: str
    debug: bool = False
    database: DatabaseConfig

def load_config(path: str) -> AppConfig:
    file_path = Path(path)
    raw = file_path.read_text(encoding="utf-8")

    if file_path.suffix in (".yaml", ".yml"):
        data = yaml.safe_load(raw)
    elif file_path.suffix == ".json":
        data = json.loads(raw)
    else:
        raise ValueError(f"Unsupported config format: {file_path.suffix}")

    return AppConfig.model_validate(data)

try:
    config = load_config("config.yaml")
    print(config.database.host)
except ValidationError as e:
    print("Config validation failed:", e)
```

### JavaScript con Zod

```javascript
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const dbSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535).default(5432),
  username: z.string(),
  password: z.string().min(8),
});

const appSchema = z.object({
  appName: z.string(),
  debug: z.boolean().default(false),
  database: dbSchema,
});

function loadConfig(path) {
  const raw = readFileSync(path, "utf-8");
  const ext = path.split(".").pop();
  const data = ext === "json" ? JSON.parse(raw) : parseYaml(raw);
  return appSchema.parse(data);
}

try {
  const config = loadConfig("config.yaml");
  console.log(config.database.host);
} catch (err) {
  console.error("Config validation failed:", err.errors);
}
```

### Java con Jackson y Jakarta Validation

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import jakarta.validation.*;
import jakarta.validation.constraints.*;
import java.io.File;
import java.util.Set;

public class ConfigLoader {

  public record DatabaseConfig(
    @NotBlank String host,
    @Min(1) @Max(65535) int port,
    @NotBlank String username,
    @NotBlank String password
  ) {}

  public record AppConfig(
    @NotBlank String appName,
    boolean debug,
    @NotNull @Valid DatabaseConfig database
  ) {}

  public static AppConfig load(String path) {
    ObjectMapper mapper = path.endsWith(".yaml") || path.endsWith(".yml")
      ? new ObjectMapper(new YAMLFactory())
      : new ObjectMapper();

    AppConfig config = mapper.readValue(new File(path), AppConfig.class);

    Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    Set<ConstraintViolation<AppConfig>> violations = validator.validate(config);
    if (!violations.isEmpty()) {
      throw new IllegalArgumentException("Config validation failed: " + violations);
    }
    return config;
  }
}
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "os"
    "gopkg.in/yaml.v3"
)

type DatabaseConfig struct {
    Host     string `json:"host" yaml:"host"`
    Port     int    `json:"port" yaml:"port"`
    Username string `json:"username" yaml:"username"`
    Password string `json:"password" yaml:"password"`
}

type AppConfig struct {
    AppName  string         `json:"appName" yaml:"appName"`
    Debug    bool           `json:"debug" yaml:"debug"`
    Database DatabaseConfig `json:"database" yaml:"database"`
}

func loadConfig(path string) (*AppConfig, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read file: %w", err)
    }

    var config AppConfig
    if path[len(path)-5:] == ".json" {
        err = json.Unmarshal(data, &config)
    } else {
        err = yaml.Unmarshal(data, &config)
    }
    if err != nil {
        return nil, fmt.Errorf("parse: %w", err)
    }

    if config.Database.Host == "" || config.Database.Port == 0 {
        return nil, fmt.Errorf("database.host and database.port are required")
    }
    return &config, nil
}
```

### Sustitución de variables de entorno

```yaml
app_name: "my-service"
debug: ${DEBUG:false}
database:
  host: ${DB_HOST:localhost}
  port: ${DB_PORT:5432}
  username: ${DB_USER:postgres}
  password: ${DB_PASSWORD}
```

```python
import os
import re
import yaml

def substitute_env_vars(content: str) -> str:
    pattern = re.compile(r'\$\{(\w+)(?::([^}]*))?\}')
    def replacer(match):
        var_name = match.group(1)
        default = match.group(2)
        return os.getenv(var_name, default if default is not None else "")
    return pattern.sub(replacer, content)

def load_config_with_env(path: str) -> dict:
    with open(path) as f:
        content = f.read()
    return yaml.safe_load(substitute_env_vars(content))
```

## Explicación

Cada ejemplo hace tres cosas:

1. Lee el archivo.
2. Lo parsea como YAML o JSON.
3. Valida la estructura y los valores contra un schema.

**Pydantic** (Python), **Zod** (JavaScript) y **Jakarta Validation** (Java) dan schemas
declarativos, seguros y con mensajes de error claros. En Go podés usar struct tags y
validación manual.

La idea clave es **fallar rápido**: validar al arranque para que las malas
configuraciones aparezcan inmediatamente, no en runtime.

## Variantes

|Formato|Librería|Ideal para|
|-------|--------|----------|
|TOML|`toml` (Python), `@iarna/toml` (JS), `toml4j` (Java)|Configs estilo Rust/Cargo, más simples que YAML|
|INI|`configparser` (Python), `ini` (JS), `ini4j` (Java)|Configs simples clave-valor, estilo Windows|
|HOCON|`pyhocon` (Python), Lightbend Config (Java)|Configs complejos con includes y substitución|
|Variables de entorno|`python-dotenv`, `dotenv` (JS), Spring `@Value`|Secrets y overrides por ambiente sin archivos|

## Buenas Prácticas

- Validá al inicio; nunca uses config cruda sin un schema.
- Guardá credenciales en variables de entorno o gestores de secretos, no en archivos de
  config.
- Proveé defaults sensatos para reducir la config obligatoria.
- Fallá con un mensaje claro que indique el path y el tipo esperado.
- Versioná el schema de config y documentá cambios breaking.
- Cacheá la config parseada tras el inicio; no la parsees en cada request.
- Preferí JSON para configs generados por máquina; se parsea más rápido que YAML.

## Errores Comunes

- Commitear secretos en archivos YAML/JSON en el control de versiones.
- Ignorar errores de parseo y caer silenciosamente a valores vacíos o nulos.
- Usar YAML anidado complejo sin validación, generando errores crípticos en runtime.
- No recargar la config tras cambios de deployment, obligando a reiniciar.
- Mezclar lógica de configuración con código de aplicación.

## Preguntas Frecuentes

### ¿Uso YAML o JSON para configuración?

YAML es más legible para humanos y soporta comentarios. JSON es más simple de parsear y
estrictamente tipado. Usá YAML para archivos editados a mano y JSON para configs
producidos por máquinas.

### ¿Cómo manejo secretos en archivos de config?

No guardes secretos en archivos de config planos. Usá variables de entorno, gestores de
secretos o archivos encriptados que se desencripten en runtime.

### ¿Puedo recargar configuración sin reiniciar?

Sí, pero con cuidado. Observá el archivo, reparseá en un objeto inmutable y asegurate de
que el reemplazo sea thread-safe y validado, para evitar updates parciales.

### ¿Puedo combinar una config base con overrides por ambiente?

Sí. Cargá un archivo base, luego uno específico del ambiente y hacé un merge profundo.
Los valores del ambiente tienen prioridad.

### ¿Necesito un schema si el YAML/JSON es válido?

Sí. Sintaxis válida no significa valores válidos. Un campo faltante o un tipo incorrecto
pueden romper la app en runtime.
