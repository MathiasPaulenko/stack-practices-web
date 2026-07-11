---
contentType: docs
slug: api-lifecycle-management-template
title: "Plantilla de Gestión del Ciclo de Vida de APIs"
description: "Una plantilla de checklist para la deprecación, versionado y cierre de APIs."
metaDescription: "Usa esta plantilla de gestión del ciclo de vida de APIs para rastrear avisos de deprecación, transiciones de versionado y verificaciones de cierre."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - lifecycle
  - versioning
  - deprecation
  - template
relatedResources:
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
  - /docs/technical-spec-template
  - /docs/adr-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de gestión del ciclo de vida de APIs para rastrear avisos de deprecación, transiciones de versionado y verificaciones de cierre."
  keywords:
    - arquitectura
    - api
    - ciclo de vida
    - versionado
    - deprecación
    - plantilla
---
## Visión General

Las APIs son contratos de larga duración entre sistemas. Cambiar o eliminar un endpoint sin un proceso estructurado rompe consumidores downstream, causa caídas y daña la confianza. Esta plantilla proporciona un enfoque basado en checklists para deprecar versiones antiguas, introducir nuevas versiones y cerrar APIs de forma segura.

## Cuándo Usar

Usa este recurso cuando:
- Planeas deprecar un endpoint o versión de API
- Introduces un cambio incompatible que requiere una nueva versión
- Preparas el cierre de toda una API o servicio

## Solución

```markdown
# Gestión del Ciclo de Vida de API: `<Nombre de la API>`

## 1. Metadatos de la API

| Campo | Valor |
|-------|-------|
| Nombre de API | `nombre` |
| Versión Actual | `v2.3` |
| URL Base | `https://api.example.com/v2` |
| Equipo Responsable | `@platform-team` |
| Consumidores | Internos: 3, Externos: 12 |

## 2. Checklist de Deprecación

### 2.1. Decisión y Comunicación

- [ ] Documentar la razón de la deprecación (seguridad, rendimiento, mantenibilidad)
- [ ] Identificar todos los consumidores del endpoint/versión deprecado
- [ ] Establecer fecha de deprecación (mínimo 6 meses para APIs externas, 3 meses para internas)
- [ ] Publicar aviso de deprecación en:
  - [ ] Documentación de la API (changelog)
  - [ ] Portal de desarrolladores / página de estado
  - [ ] Email directo a consumidores registrados
  - [ ] Headers de respuesta (`Deprecation: true`, `Sunset: <date>`)

### 2.2. Ruta de Migración

- [ ] Proporcionar guía de migración con ejemplos antes/después
- [ ] Ofrecer entorno sandbox para probar la nueva versión
- [ ] Programar sesiones de preguntas para equipos consumidores
- [ ] Crear shim de compatibilidad si la migración es compleja

### 2.3. Monitoreo

- [ ] Rastrear tráfico al endpoint deprecado diariamente
- [ ] Alertar cuando el uso baje del umbral (listo para cierre)
- [ ] Mantener dashboard de progreso de migración de consumidores

## 3. Checklist de Versionado

### 3.1. Selección de Versión

- [ ] Determinar si el cambio es compatible (patch/minor) o incompatible (major)
- [ ] Seguir versionado semántico: `MAJOR.MINOR.PATCH`
- [ ] Actualizar ruta URL (`/v3/`) o usar versionado por headers (`Accept: application/vnd.api.v3+json`)

### 3.2. Release

- [ ] Desplegar la nueva versión junto a la antigua
- [ ] Actualizar documentación con nuevos ejemplos de request/response
- [ ] Ejecutar tests de contrato contra la nueva versión
- [ ] Verificar compatibilidad hacia atrás para cambios no rotos

### 3.3. Post-Release

- [ ] Monitorear tasas de error y latencia de la nueva versión
- [ ] Recoger feedback de early adopters
- [ ] Actualizar SDKs y librerías cliente

## 4. Checklist de Cierre

### 4.1. Pre-Cierre

- [ ] Confirmar tráfico cero al endpoint deprecado durante 7 días consecutivos
- [ ] Verificar que todos los consumidores conocidos han migrado (contactar rezagados individualmente)
- [ ] Anunciar fecha final de cierre (aviso de 30 días)

### 4.2. Cierre

- [ ] Deshabilitar el endpoint (devolver `410 Gone` o `404 Not Found`)
- [ ] Eliminar código y tests deprecados
- [ ] Actualizar infraestructura (reglas de load balancer, DNS)
- [ ] Archivar documentación con redirección a la nueva versión

### 4.3. Post-Cierre

- [ ] Monitorear 404s inesperados de consumidores desconocidos
- [ ] Documentar lecciones aprendidas
- [ ] Actualizar línea de tiempo del ciclo de vida de la API
```

## Explicación

El checklist impone un **período mínimo de aviso** que respeta los cronogramas de los consumidores. Las APIs externas necesitan ventanas de deprecación más largas porque no puedes controlar cuándo los consumidores actualizan. El header `Sunset` es legible por máquinas, permitiendo que las librerías cliente adviertan a desarrolladores automáticamente. Rastrear tráfico antes del cierre previene roturas sorpresa de integraciones internas olvidadas.

## Headers de Deprecación y Sunset

Agrega headers HTTP a cada respuesta del endpoint deprecado para que los consumidores descubran la deprecación programáticamente:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Link: <https://api.example.com/v3/users>; rel="successor-version"
```

Las librerías cliente pueden parsear estos headers y registrar advertencias:

```javascript
function checkDeprecationHeaders(response) {
  const sunset = response.headers.get("Sunset");
  const deprecation = response.headers.get("Deprecation");
  const successor = response.headers.get("Link");

  if (deprecation === "true") {
    console.warn(`Este endpoint esta deprecado. Fecha de cierre: ${sunset}`);
    if (successor) {
      console.warn(`Migra a: ${successor.match(/<([^>]+)>/)?.[1]}`);
    }
  }
}
```

## Plantilla de Guía de Migración

Proporciona una guía de migración estructurada para cada cambio incompatible:

```markdown
# Guía de Migración: v2 -> v3 User Service API

## Resumen
- Campo `name` dividido en `firstName` y `lastName`
- Endpoint `/v2/users/{id}` reemplazado por `/v3/users/{id}`
- Respuestas de error ahora usan formato RFC 7807 Problem Details

## Antes (v2)
```json
GET /v2/users/123
{
  "id": 123,
  "name": "Alice Johnson",
  "email": "alice@example.com"
}
```

## Después (v3)
```json
GET /v3/users/123
{
  "id": 123,
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com"
}
```

## Cambio de Formato de Error
```json
// Error v2
{ "error": "User not found", "code": 404 }

// Error v3 (RFC 7807)
{
  "type": "https://api.example.com/errors/not-found",
  "title": "User not found",
  "status": 404,
  "detail": "User 123 does not exist"
}
```

## Pasos de Migración Automatizados
1. Actualizar URL base de `/v2/` a `/v3/`
2. Reemplazar `name` con `firstName` + `lastName` en modelos de request/response
3. Actualizar manejo de errores para parsear formato RFC 7807
4. Probar contra sandbox en `https://sandbox.api.example.com/v3/`
```

## Script de Monitoreo de Cierre Automatizado

Rastrea tráfico a endpoints deprecados para saber cuándo es seguro cerrarlos:

```python
import requests
from datetime import datetime, timedelta

def check_sunset_readiness(grafana_url, dashboard_id, api_token):
    headers = {"Authorization": f"Bearer {api_token}"}
    end = datetime.utcnow()
    start = end - timedelta(days=7)

    query = f'sum(rate(http_requests_total{{version="v2"}}[1h]))'
    params = {
        "query": query,
        "start": start.timestamp(),
        "end": end.timestamp(),
        "step": 3600,
    }

    resp = requests.get(f"{grafana_url}/api/datasources/proxy/1/api/v1/query_range",
                        headers=headers, params=params)
    data = resp.json()

    hourly_rates = [float(point[1]) for point in data["data"]["result"][0]["values"]]
    zero_traffic_days = sum(1 for rate in hourly_rates if rate == 0)

    if zero_traffic_days >= 7:
        print("LISTO PARA CIERRE: 7 dias consecutivos de trafico cero")
    else:
        print(f"NO LISTO: Solo {zero_traffic_days} horas de trafico cero en ultimos 7 dias")
        print(f"Trafico promedio por hora: {sum(hourly_rates) / len(hourly_rates):.1f} requests")
```

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Microservicios internos | Tiempos más cortos, cumplimiento más estricto | Los equipos pueden coordinar vía canal Slack compartido |
| API pública SaaS | Tiempos largos, revisión legal | Puede requerir compromisos SLA para avisos de deprecación |
| Backends de app móvil | Forzar actualización vía app store | Usar verificaciones de versión mínima para cerrar endpoints antiguos |
| APIs GraphQL | Directivas de deprecación de esquema | Usar directiva `@deprecated` en campos y tipos |
| Event-driven | Modos de compatibilidad del registro de esquemas | Transicionar de BACKWARD a NONE antes de eliminar esquema antiguo |

## Lo que funciona

1. Nunca eliminar una API sin período de deprecación, ni siquiera para uso interno
2. Devolver headers de deprecación tan pronto como se toma la decisión, no en el cierre
3. Mantener un changelog público de la API con fechas para cada cambio
4. Versionar el contrato de API independientemente del despliegue del servicio
5. Mantener endpoints deprecados observables con dashboards dedicados
6. Enviar avisos de deprecación por múltiples canales (email, headers, changelog, página de estado)
7. Proporcionar un shim de compatibilidad para migraciones complejas para reducir esfuerzo del consumidor

## Errores Comunes

1. Anunciar deprecación pero no rastrear si los consumidores realmente migran
2. Cambiar comportamiento en una versión existente sin incrementar el número
3. Eliminar documentación antes de que la API se cierre
4. Asumir que todos los consumidores leen los avisos por email
5. Forzar migraciones durante temporadas altas o cierres fiscales
6. No proporcionar un entorno sandbox para que los consumidores prueben la nueva versión
7. Cerrar sin monitorear 404s de consumidores desconocidos post-cierre

## Preguntas Frecuentes

### ¿Cuánto tiempo debería mantener viva una API deprecada?

APIs externas: mínimo 6-12 meses. APIs internas: mínimo 3 meses. Los contratos enterprise pueden especificar períodos más largos. Nunca deprecar durante períodos de alto tráfico conocidos (Black Friday, temporada de impuestos).

### ¿Debería usar versionado por URL o por headers?

El versionado por URL (`/v1/`, `/v2/`) es explícito y fácil de depurar. El versionado por headers mantiene URLs limpias pero es más difícil de cachear y solucionar. La mayoría de equipos usan versionado por URL para APIs REST.

### ¿Qué hago si un consumidor se niega a migrar?

Si un consumidor es crítico y no puede migrar a tiempo, negocia una extensión con fecha límite dura. Si el consumidor no es crítico, procede con el cierre; la respuesta `410 Gone` forzará la acción.

### ¿Cómo manejo el versionado para APIs GraphQL?

GraphQL usa un único endpoint. Deprecar campos con la directiva `@deprecated` y monitorear uso vía consultas de introspección. Eliminar campos deprecados solo después de que el uso baje a cero.

### ¿Qué es un shim de compatibilidad y cuándo debo usarlo?

Un shim de compatibilidad es una capa de traducción que acepta requests en formato antiguo y los convierte al nuevo formato internamente. Úsalo cuando la migración es compleja (ej. división de campos, reestructuración de respuesta) y los consumidores necesitan tiempo para adaptarse. Elimina el shim después de que todos los consumidores hayan migrado.

### ¿Debería mantener SDKs separados para cada versión de API?

Mantén SDKs para la versión major actual y la anterior. Elimina soporte para SDKs más antiguos después de que la ventana de deprecación expire. Publica guías de migración junto con actualizaciones de SDK para que los desarrolladores puedan actualizar en una sola pasada.

### ¿Cómo automatizo la verificación de preparación para cierre?

Instrumenta tu API gateway o load balancer para etiquetar requests por versión. Construye un dashboard que muestre tráfico por versión a lo largo del tiempo. Configura una alerta cuando el tráfico a una versión deprecada baje de un umbral durante 7 días consecutivos, señalando preparación para cierre.
