---
contentType: recipes
slug: environment-variables
title: "Variables de Entorno"
description: "Cómo leer, establecer y gestionar variables de entorno de forma segura en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de variables de entorno en Python, JavaScript y Java. Aprende dotenv, process.env, System.getenv y configuración 12-factor app."
difficulty: beginner
topics:
  - devops
tags:
  - env-vars
  - environment
  - configuration
  - dotenv
  - python
  - javascript
  - java
  - 12-factor-app
relatedResources:
  - /recipes/docker-basics
  - /recipes/jwt-authentication
  - /recipes/password-hashing
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Ejemplos prácticos de variables de entorno en Python, JavaScript y Java. Aprende dotenv, process.env, System.getenv y configuración 12-factor app."
  keywords:
    - variables de entorno
    - env vars
    - gestión de configuración
    - dotenv
    - 12 factor app
    - process.env
    - System.getenv
    - os.environ
    - gestión de secretos
---

## Visión general

Las variables de entorno son pares clave-valor establecidos fuera del código de tu aplicación, usados para configurar comportamiento sin modificar archivos fuente. Son la piedra angular de la metodología 12-Factor App y la forma estándar de gestionar secretos, claves API, URLs de base de datos y feature flags.

Separar la configuración del código hace que las aplicaciones sean portables entre entornos (dev, staging, producción) y evita que datos sensibles se commiteen al control de versiones.

## Cuándo usarlo

Usa esta recipe cuando:

- Configuras apps por entorno (dev, staging, prod)
- Almacenas secretos como claves API y credenciales de base de datos
- Habilitas o deshabilitas features con feature flags
- Gestionas configuración de aplicaciones containerizadas
- Evitas valores hard-codeados en el código fuente

## Solución

### Python

```python
import os
from dotenv import load_dotenv

# Cargar desde archivo .env (solo en dev)
load_dotenv()

# Leer variables
api_key = os.getenv('API_KEY')
db_url = os.getenv('DATABASE_URL', 'sqlite:///default.db')  # con default
port = int(os.getenv('PORT', '8080'))
debug = os.getenv('DEBUG', 'false').lower() == 'true'

print(f"API_KEY={api_key}, PORT={port}, DEBUG={debug}")
```

### JavaScript (Node.js)

```javascript
require('dotenv').config(); // Cargar archivo .env

const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/default';
const port = parseInt(process.env.PORT || '8080', 10);
const debug = process.env.DEBUG === 'true';

console.log(`API_KEY=${apiKey}, PORT=${port}, DEBUG=${debug}`);
```

### Java

```java
public class Config {
    public static void main(String[] args) {
        String apiKey = System.getenv("API_KEY");
        String dbUrl = System.getenv().getOrDefault("DATABASE_URL", "jdbc:mysql://localhost/default");
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        boolean debug = Boolean.parseBoolean(System.getenv().getOrDefault("DEBUG", "false"));

        System.out.println("API_KEY=" + apiKey + ", PORT=" + port + ", DEBUG=" + debug);
    }
}
```

## Ejemplo de archivo .env

```bash
# .env — nunca commitear este archivo al control de versiones
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
API_KEY=sk-live-xxxxxxxxxxxx
PORT=3000
DEBUG=true
```

Agrega `.env` a `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

## Explicación

- **`os.environ` / `process.env` / `System.getenv()`**: Acceso en tiempo de ejecución a variables de entorno
- **`load_dotenv()` / `require('dotenv').config()`**: Carga variables desde un archivo `.env` en desarrollo
- **Defaults**: Siempre proporciona valores por defecto sensatos para valores no sensibles
- **Coerción de tipos**: Las variables de entorno son strings — haz cast a int/boolean explícitamente

## Mejores prácticas

- **Nunca commitees secretos**: Agrega `.env` a `.gitignore` inmediatamente
- **Usa un `.env.example`**: Documenta las variables requeridas sin valores reales
- **Valida al inicio**: Falla rápido si faltan variables requeridas
- **Scope por entorno**: `.env.development`, `.env.production`
- **Usa un secrets manager en producción**: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault
- **Loguea configuración (no secretos)**: Imprime la config cargada para debugging, redacta claves sensibles

## Errores comunes

- Commitear archivos `.env` con secretos reales a GitHub
- Asumir que las variables de entorno existen sin defaults
- No validar variables requeridas al inicio de la aplicación
- Usar variables de entorno para datos estructurados complejos (usa archivos de config en su lugar)
- Confundir variables de build-time y runtime en bundlers de frontend

## Preguntas frecuentes

**P: ¿Puedo usar variables de entorno en el navegador?**
R: Solo en build time mediante sustitución del bundler. Nunca expongas secretos del servidor en código client-side. Usa variables públicas con el prefijo de tu framework (ej. `VITE_`, `NEXT_PUBLIC_`, `REACT_APP_`).

**P: ¿Qué es el principio de configuración de 12-Factor App?**
R: Almacena la configuración en variables de entorno. Esto mantiene código y config separados, haciendo la app deployable a cualquier entorno sin cambios de código.

**P: ¿Cómo gestiono secretos en un contenedor Docker?**
R: Pásalos en runtime con flags `-e`, Docker secrets o móntalos como archivos. Nunca incluyas secretos en la imagen.
