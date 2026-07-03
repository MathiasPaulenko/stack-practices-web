---
contentType: patterns
slug: strangler-fig-pattern
title: "Patron de Higuera Estranguladora"
description: "Migra funcionalidad incrementalmente desde un sistema legacy hacia uno nuevo interceptando llamadas y enrutandolas, reemplazando eventualmente el sistema viejo por completo."
metaDescription: "Aprende el Patron de Higuera Estranguladora para migracion legacy incremental. Ejemplos en Python, Java y JavaScript con API gateways, proxies y feature toggles."
difficulty: intermediate
topics:
  - design
  - architecture
  - devops
tags:
  - higuera-estranguladora
  - patron
  - patron-de-diseno
  - migracion-legacy
  - refactorizacion
  - microservicios
  - api-gateway
relatedResources:
  - /patterns/design/anti-corruption-layer-pattern
  - /patterns/design/database-per-service-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Higuera Estranguladora para migracion legacy incremental. Ejemplos en Python, Java y JavaScript con API gateways, proxies y feature toggles."
  keywords:
    - higuera estranguladora
    - patron de diseno
    - migracion legacy
    - refactorizacion
    - microservicios
    - api gateway
    - migracion incremental
---

# Patron de Higuera Estranguladora

## Resumen

El Patron de Higuera Estranguladora permite migrar funcionalidad desde un sistema legacy hacia uno nuevo de forma incremental. Una capa intermediaria intercepta solicitudes y las enruta al sistema legacy o al nuevo.

Con el tiempo, a medida que más capacidades migran, el sistema legacy se reduce hasta poder desmantelarse por completo.

## Cuando Usar

- Migrar de monolito legacy a microservicios
- Reemplazar stack tecnologico sin rewrite riesgoso
- Modernizar un sistema con requisitos en evolucion
- Entregar nuevas capacidades en el sistema nuevo mientras se mantiene el legacy

## Cuando Evitar

- Sistema legacy pequeno para reemplazo directo
- Equipo sin capacidad de mantener ambos sistemas
- Latencia de red de una capa de enrutamiento inaceptable

## Solucion

### Python (Flask Proxy)

```python
from flask import Flask, request, jsonify
import requests
import os

class StranglerRouter:
    def __init__(self):
        self.legacy = os.getenv('LEGACY_API', 'http://legacy:8080')
        self.new = os.getenv('NEW_API', 'http://new-service:8080')
        self.routes = {
            '/api/users': 'new',
            '/api/orders': 'new',
            '/api/inventory': 'legacy',
        }

    def route(self, path, method, data=None):
        target = self.routes.get(path, 'legacy')
        base = self.new if target == 'new' else self.legacy
        response = requests.request(method, f"{base}{path}", json=data)
        return response.json(), response.status_code

app = Flask(__name__)
router = StranglerRouter()

@app.route('/api/<path:path>')
def gateway(path):
    body, status = router.route(f"/api/{path}", request.method,
                                request.get_json() if request.is_json else None)
    return jsonify(body), status
```

### Java (Spring Cloud Gateway)

```java
@Configuration
public class StranglerGatewayConfig {
    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("users", r -> r.path("/api/users/**")
                .uri("http://new-users-service:8080"))
            .route("legacy", r -> r.path("/**")
                .uri("http://legacy-system:8080"))
            .build();
    }
}
```

### JavaScript (Express Proxy)

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

app.use('/api/users', createProxyMiddleware({
    target: 'http://new-users-service:8080', changeOrigin: true }));
app.use('/', createProxyMiddleware({
    target: 'http://legacy-system:8080', changeOrigin: true }));
app.listen(3000);
```

## Explicacion

La capa intermediaria enruta solicitudes:

1. Identificar un bounded context dentro del sistema legacy
2. Construir el nuevo servicio con funcionalidad equivalente
3. Actualizar el enrutador para enviar trafico al nuevo servicio
4. Validar que el nuevo servicio maneja trafico de produccion
5. Repetir hasta reemplazar completamente el sistema legacy
6. Desmantelar el sistema legacy

## Variantes

| Variante | Enfoque | Ideal Para |
|----------|---------|------------|
| API Gateway | Enrutar por prefijo de path | Migracion a microservicios |
| Servidor proxy | Reglas de rewrite de NGINX/Apache | Enrutamiento simple por URL |
| Feature toggle | Enrutamiento en vivo por solicitud | Migracion gradual de usuarios |
| Sync de base de datos | Dual-write durante transicion | Migracion de capa de datos |

## Lo que funciona

- Empezar con endpoints de solo lectura de bajo riesgo
- Implementar trafico shadow para comparar respuestas
- Mantener compatibilidad hacia atras en APIs
- Monitorear ambos sistemas durante la transicion
- Mantener capacidad de rollback

## Errores Comunes

- Migrar demasiado sin validacion
- No monitorear el nuevo sistema bajo carga
- Romper contratos de datos entre sistemas
- Eliminar legacy antes de que el nuevo sistema este operativo

## Ejemplos del Mundo Real

- **Amazon:** Famoso por migrar de monolito C++ a arquitectura orientada a servicios usando wrappers y proxies.
- **UK Government Digital Service:** GOV.UK se construyo junto a sitios gubernamentales existentes, reemplazandolos dominio por dominio.

## Preguntas Frecuentes

**P: ¿Cuanto dura una migracion con este patron?**
R: Meses a años. Lo clave es que el sistema es funcional y mejora durante todo el proceso.

**P: ¿Que pasa si legacy y nuevo usan diferentes bases de datos?**
R: Implementar una capa anticorrupcion y considerar estrategias de dual-write durante la transicion.

**P: ¿Puedo usar esto para migracion frontend?**
R: Si — enrutar paginas o componentes a nuevas implementaciones manteniendo el shell de la app vieja.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
