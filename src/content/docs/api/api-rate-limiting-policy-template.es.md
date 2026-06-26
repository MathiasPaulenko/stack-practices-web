---
contentType: docs
slug: api-rate-limiting-policy-template
title: "Plantilla de Politica de Rate Limiting de API"
description: "Plantilla para definir limites de tasa de API por tier de consumidor, incluyendo allowances de burst, periodos de cuota y rutas de escalamiento."
metaDescription: "Define limites de tasa de API por tier con esta plantilla. Cubre limites de burst, ventanas de cuota, headers y escalamiento para consumidores."
difficulty: intermediate
topics:
  - api
  - architecture
  - performance
tags:
  - api
  - rate-limiting
  - throttling
  - politica
  - plantilla
  - rendimiento
relatedResources:
  - /docs/architecture/api-performance-budget-template
  - /docs/devops/escalation-policy-template
  - /docs/security/api-security-review-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define limites de tasa de API por tier con esta plantilla. Cubre limites de burst, ventanas de cuota, headers y escalamiento para consumidores."
  keywords:
    - rate limiting
    - throttling api
    - politica de cuotas
    - limites de burst
    - tiers de api
    - headers de rate limit
---

## Resumen

El acceso ilimitado a API es una receta para abuso, DDoS accidental y costos impredecibles. El rate limiting protege tu infraestructura mientras da a los consumidores acceso predecible. Sin una politica documentada, los consumidores descubren los limites solo cuando sus solicitudes comienzan a fallar con `429 Too Many Requests`. Esta plantilla define limites de tasa por tier, los comunica transparentemente y proporciona una ruta de escalamiento para quienes necesitan mas.

## Cuando Usar

Usa este recurso cuando:
- Lances una API publica o de partners
- Definas tiers de precios para acceso a API
- Experimentes picos de trafico que degraden el servicio para otros
- Negocies SLAs con clientes enterprise que necesitan limites mas altos

## Solucion

```markdown
# Politica de Rate Limiting de API

## Tiers y Limites

| Tier | Solicitudes / Minuto | Solicitudes / Hora | Burst | Costo |
|------|----------------------|--------------------|-------|-------|
| Gratis | 60 | 1,000 | 10 | $0 |
| Starter | 300 | 10,000 | 50 | $49/mes |
| Pro | 1,000 | 100,000 | 200 | $199/mes |
| Enterprise | 10,000 | 1,000,000 | 2,000 | Personalizado |

## Alcance del Limite

Los limites se aplican por **API key** en los siguientes alcances:
- **Global:** Todos los endpoints combinados cuentan hacia el mismo limite
- **Por endpoint:** `POST /orders` tiene su propio limite separado de `GET /products`
- **Por IP (solo tier Gratis):** Aplicacion de respaldo cuando la API key esta ausente

## Periodos de Cuota

- **Limite por minuto:** Se reinicia al inicio de cada minuto (UTC)
- **Limite por hora:** Se reinicia al inicio de cada hora (UTC)
- **Ventana deslizante:** Una ventana deslizante de 60 segundos (mas precisa pero computacionalmente costosa)

## Headers de Respuesta

Cada respuesta de API incluye los siguientes headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1719398400
X-RateLimit-Policy: pro;w=3600
```

| Header | Descripcion |
|--------|-------------|
| `X-RateLimit-Limit` | Maximo de solicitudes permitidas en la ventana actual |
| `X-RateLimit-Remaining` | Solicitudes restantes en la ventana actual |
| `X-RateLimit-Reset` | Timestamp Unix cuando se reinicia la ventana actual |
| `X-RateLimit-Policy` | Identificador de tier y tamano de ventana |

## Respuesta de Limite Excedido

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Has excedido tu limite de tasa. Por favor reintenta despues de 2026-06-26T11:00:00Z.",
    "retryAfter": 3600,
    "documentationUrl": "https://docs.ejemplo.com/rate-limits"
  }
}
```

Estado HTTP: `429 Too Many Requests`
Header Requerido: `Retry-After: 3600`

## Comportamiento de Burst

Los limites de burst permiten picos cortos por encima de la tasa sostenida:
- **Tier Pro:** 200 solicitudes en 1 segundo, luego limitado a 1,000/hora promedio
- **Algoritmo:** Token bucket con tasa de recarga = limite sostenido / tamano de ventana
- **Penalizacion:** Sin penalizacion por uso de burst dentro de los limites configurados

## Aumentar Limites

1. **Actualizar tier:** Cambia tu plan en el panel de desarrollador
2. **Solicitar excepcion:** Contactar api-soporte@ejemplo.com con:
   - Patrones de uso actuales (solicitudes por endpoint, horas pico)
   - Justificacion de negocio (lanzamiento de producto, partner de integracion)
   - Cronograma esperado y volumen
3. **Negociacion enterprise:** Capacidad dedicada, SLA personalizado, endpoints privados

## Monitoreo y Alertas

| Alerta | Condicion | Accion |
|--------|-----------|--------|
| Cercano al Limite | 80% de cuota horaria consumida | Notificacion por email al admin |
| Limite Excedido | Respuestas 429 > 1% del trafico | Alerta PagerDuty al de guardia |
| Patron de Abuso | 10x volumen normal desde una sola key | Auto-throttle + revision manual |

## Politica de Uso Justo

- **Sin evasion automatizada:** Usar multiples API keys para evadir limites viola los terminos
- **Cachear agresivamente:** Las respuestas marcadas `Cache-Control: public` deben ser cacheadas
- **Operaciones batch:** Usar endpoints bulk en lugar de llamadas individuales
- **Preferir webhooks:** Suscribirse a webhooks en lugar de hacer polling por cambios de estado
```

## Explicacion

La politica separa los **limites sostenidos** (promedio en el tiempo) de los **limites de burst** (picos a corto plazo). El algoritmo de token bucket es el estandar de la industria porque permite rafagas mientras impone promedios a largo plazo. Los headers de respuesta dan a los consumidores retroalimentacion en tiempo real para que puedan retroceder antes de alcanzar los limites. La ruta de escalamiento previene tickets de soporte de consumidores que simplemente necesitan un tier mas alto.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| SaaS Publico | Precios por tier con tier gratis | Orientado a conversion, los limites impulsan upgrades |
| Plataforma interna | Cuotas por equipo con pool compartido | Previene que un equipo ahogue a otros |
| API de Partners | Limites negociados por contrato | Definidos en acuerdos legales |

## Mejores Practicas

1. **Retornar headers en cada respuesta** — no solo cuando los limites estan cerca
2. **Usar un algoritmo estandar** (token bucket o leaky bucket) — la logica personalizada confunde a los consumidores
3. **Documentar el comportamiento de reinicio** — los consumidores necesitan saber cuando reintentar
4. **Proporcionar endpoints bulk** — un `POST /orders/bulk` es mejor que 100 `POST /orders`
5. **Monitorear tasas de 429** — tasas altas de 429 indican limites mal configurados o abuso de consumidores

## Errores Comunes

1. **Retornar 403 en lugar de 429** — los consumidores no pueden distinguir falla de auth de rate limiting
2. **No documentar el algoritmo** — los consumidores no pueden predecir cuando seran limitados
3. **Limites inconsistentes entre endpoints** — misma key, diferentes reglas, confusion del consumidor
4. **Sin allowance de burst** — picos de trafico legitimos son bloqueados
5. **Limites estrictos sin escalamiento** — los clientes enterprise no pueden negociar mayor capacidad

## Preguntas Frecuentes

### Que pasa si excedo tanto el limite por minuto como por hora?

Se aplica el limite mas restrictivo. Si excedes el limite por minuto, recibes 429 inmediatamente aunque la cuota horal permanezca. Si excedes el limite por hora, todas las solicitudes son bloqueadas hasta que se reinicie la hora.

### Deberian los limites de tasa ser los mismos para operaciones de lectura y escritura?

No. Las operaciones de escritura son mas costosas y deberian tener limites mas bajos. Limites separados para `GET` (mayor), `POST/PUT/PATCH` (medio) y `DELETE` (menor) son practica estandar.

### Como pruebo mi integracion sin alcanzar los limites?

Usa un entorno sandbox dedicado con limites mas altos o ilimitados. Alternativamente, simula las respuestas de API en tu suite de pruebas y verifica que parses los headers de rate limit correctamente.
