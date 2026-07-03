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
  - devops
  - ci-cd
  - automation
  - deployment
  - infrastructure
relatedResources:
  - /recipes/docker-basics
  - /recipes/jwt-authentication
  - /recipes/password-hashing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

Antes de que las variables de entorno se convirtieran en el estándar, la configuración a menudo se incrustaba directamente en el código fuente o se almacenaba en archivos XML versionados en repositorios. Esto hacía los despliegues frágiles: un cambio de contraseña de base de datos requería un commit de código, rebuild y redeploy. Las variables de entorno resuelven esto externalizando todas las configuraciones específicas del entorno, permitiendo que el mismo artefacto compilado se ejecute en desarrollo, staging y producción sin modificación. Este principio — conocido como "build once, deploy many" — es esencial para pipelines modernos de CI/CD y arquitecturas containerizadas.

## Cuándo usarlo

Usa esta recipe cuando:

- Configuras apps por entorno (dev, staging, prod). Consulta [Docker Basics](/recipes/devops/docker-basics) para configuración de apps containerizadas.
- Almacenas secretos como claves API y credenciales de base de datos. Consulta [JWT Authentication](/recipes/authentication/jwt-authentication) para manejo seguro de tokens.
- Habilitas o deshabilitas capacidades con feature flags. Consulta [Feature Flags](/recipes/devops/feature-flags) para gestión de toggles.
- Gestionas configuración de aplicaciones containerizadas en Docker y Kubernetes. Consulta [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) para orquestación local de contenedores.
- Evitas valores hard-codeados en el código fuente
- Compartes configuración entre microservicios sin un servidor de configuración central
- Cambias endpoints de base de datos entre primaria y réplica para escalado de lecturas
- Habilitas debug logging o profiling solo en entornos específicos

## Solución

### Python

El `os.getenv` de Python lee variables de entorno con un default opcional. El paquete `python-dotenv` carga variables desde un archivo `.env` en desarrollo, lo cual es conveniente para testing local sin polucionar el entorno de tu shell.

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

Node.js expone variables de entorno a través de `process.env`. El paquete `dotenv` carga un archivo `.env` al inicio de la aplicación, pero solo funciona en Node — los entornos de navegador no tienen acceso a `process.env` en runtime.

```javascript
require('dotenv').config(); // Cargar archivo .env

const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/default';
const port = parseInt(process.env.PORT || '8080', 10);
const debug = process.env.DEBUG === 'true';

console.log(`API_KEY=${apiKey}, PORT=${port}, DEBUG=${debug}`);
```

### Java

El `System.getenv()` de Java devuelve un mapa inmutable del entorno del proceso. Usa `getOrDefault` para proporcionar valores de fallback para configuración opcional, y parsea strings a los tipos apropiados explícitamente.

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

- **`os.environ` / `process.env` / `System.getenv()`**: Acceso en tiempo de ejecución a variables de entorno. Estas se heredan del proceso padre (shell, systemd, Docker) y no pueden ser modificadas por procesos hijos de forma que afecten al padre.
- **`load_dotenv()` / `require('dotenv').config()`**: Carga variables desde un archivo `.env` en desarrollo. Este archivo nunca debe ser commiteado — es una conveniencia solo para desarrollo local.
- **Defaults**: Siempre proporciona valores por defecto sensatos para valores no sensibles. Las variables requeridas faltantes deberían hacer que la aplicación falle rápidamente al inicio con un mensaje de error claro.
- **Coerción de tipos**: Las variables de entorno son siempre strings — haz cast a int/boolean explícitamente. Un valor de `"false"` es truthy en JavaScript si no lo comparas apropiadamente.
- **Scope**: Las variables establecidas en el shell están disponibles para el proceso actual y sus hijos. Usa `export` en Bash o `setx` en Windows para persistirlas entre sesiones.

## Lo que funciona

- **Nunca commitees secretos**: Agrega `.env` a `.gitignore` inmediatamente. Un solo archivo `.env` commiteado con credenciales de producción es un liability de seguridad permanente, incluso si lo borras después — el historial de Git lo retiene para siempre.
- **Usa un `.env.example`**: Documenta las variables requeridas sin valores reales. Los nuevos desarrolladores pueden copiar este archivo a `.env` y llenar sus propias credenciales.
- **Valida al inicio**: Falla rápido si faltan variables requeridas. No dejes que tu aplicación se ejecute en un estado parcialmente configurado que produce errores crípticos horas después.
- **Scope por entorno**: `.env.development`, `.env.production`. Algunos frameworks cargan estos automáticamente basándose en `NODE_ENV` o equivalente.
- **Usa un secrets manager en producción**: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault. Estos proporcionan rotación, logging de auditoría y control de acceso granular que los archivos `.env` no pueden igualar.
- **Loguea configuración (no secretos)**: Imprime la config cargada para debugging, pero redacta claves sensibles. Una línea de log como `DATABASE_URL=***` te dice que la variable está seteada sin exponer credenciales.
- **Prefija variables públicas en frontend**: Frameworks como Vite, Next.js y Create React App solo exponen variables `VITE_*`, `NEXT_PUBLIC_*` o `REACT_APP_*` al navegador. Todo lo demás permanece del lado del servidor.
- **Rota secretos regularmente**: incluso el mejor almacenamiento puede ser comprometido. Establece un recordatorio de calendario para rotar claves API y contraseñas de base de datos trimestralmente.

## Errores comunes

- **Commitear archivos `.env` con secretos reales a GitHub**: Incluso si borras el archivo después, permanece en el historial de Git para siempre. Usa `git filter-repo` o BFG Repo-Cleaner para eliminarlo si ya lo commiteaste.
- **Asumir que las variables de entorno existen sin defaults**: Tu aplicación se caerá con errores confusos. Siempre valida variables requeridas y proporciona defaults sensatos para las opcionales.
- **No validar variables requeridas al inicio de la aplicación**: La configuración faltante a menudo causa fallos profundos en el call stack que son difíciles de rastrear hasta una variable de entorno ausente.
- **Usar variables de entorno para datos estructurados complejos**: Las variables de entorno son strings key-value planos. Usa archivos de config JSON o YAML para configuración anidada, y cárgalos desde una ruta especificada por una variable de entorno.
- **Confundir variables de build-time y runtime en bundlers de frontend**: Las variables referenciadas en código frontend se embeben en build time, no se leen en runtime. Cambiar una variable de entorno después de build no tiene efecto en el bundle del cliente.
- **Imprimir secretos en mensajes de error**: Los stack traces y respuestas de error nunca deben incluir contraseñas de base de datos o claves API. Los atacantes escanean logs y páginas de error públicas exactamente por este error.
- **Usar los mismos secretos en todos los entornos**: Desarrollo y producción deben usar credenciales diferentes. Una contraseña de base de datos de dev filtrada no debería otorgar acceso a producción.

## Preguntas frecuentes

**P: ¿Puedo usar variables de entorno en el navegador?**
R: Solo en build time mediante sustitución del bundler. Nunca expongas secretos del servidor en código client-side. Usa variables públicas con el prefijo de tu framework (ej. `VITE_`, `NEXT_PUBLIC_`, `REACT_APP_`). El navegador no tiene acceso al entorno del servidor.

**P: ¿Qué es el principio de configuración de 12-Factor App?**
R: Almacena la configuración en variables de entorno. Esto mantiene código y config separados, haciendo la app deployable a cualquier entorno sin cambios de código. La misma imagen Docker puede ejecutarse en dev, staging y prod con diferentes variables.

**P: ¿Cómo gestiono secretos en un contenedor Docker?**
R: Pásalos en runtime con flags `-e`, Docker secrets o móntalos como archivos. Nunca incluyas secretos en la imagen. Un registro de imágenes comprometido expondría cada secreto embebido durante el build.

**P: ¿Cuál es la diferencia entre `.env` y exports de shell?**
R: Los archivos `.env` son cargados por el código de la aplicación al inicio y solo afectan a ese proceso. Los exports de shell (`export VAR=value`) afectan la sesión de shell actual y todos los procesos hijos. Usa `.env` para settings por proyecto y exports de shell para herramientas globales.

**P: ¿Debería validar variables de entorno en código o usar una librería de schema?**
R: Ambos enfoques funcionan. Para proyectos pequeños, la validación manual al inicio está bien. Para aplicaciones más grandes, librerías de schema como `envalid` (Node), `pydantic-settings` (Python) o `@ConfigurationProperties` de Spring (Java) proporcionan type safety, defaults y validación automática.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
