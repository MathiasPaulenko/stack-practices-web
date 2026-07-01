---
contentType: docs
slug: service-dependency-map-template
title: "Plantilla de Mapa de Dependencias de Servicios"
description: "Una plantilla para documentar y visualizar dependencias de servicios en sistemas distribuidos."
metaDescription: "Usa esta plantilla de mapa de dependencias de servicios para documentar dependencias upstream y downstream, rutas críticas y análisis de impacto de fallas."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - microservices
  - dependencies
  - visualization
  - template
relatedResources:
  - /docs/microservice-contract-template
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de mapa de dependencias de servicios para documentar dependencias upstream y downstream, rutas críticas y análisis de impacto de fallas."
  keywords:
    - arquitectura
    - microservicios
    - dependencias
    - visualización
    - plantilla
---

## Visión General

En sistemas distribuidos, una falla en un servicio puede propagarse de forma impredecible. Un mapa de dependencias documenta qué servicios llaman a cuáles, la naturaleza de esas llamadas y el radio de impacto si una dependencia falla. Esta plantilla proporciona tanto un registro textual como guía para crear diagramas visuales.

## Cuándo Usar

Usa este recurso cuando:
- Integras un nuevo servicio y documentas sus relaciones upstream y downstream
- Planeas una migración, deprecación o cambio de infraestructura
- Realizas un análisis de modos y efectos de falla (FMEA)

## Solución

```markdown
# Mapa de Dependencias de Servicios: `<Nombre del Servicio>`

## 1. Metadatos del Servicio

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Equipo Responsable | `@equipo-nombre` |
| Repositorio | `github.com/org/repo` |
| Runtime | `Kubernetes / ECS / Lambda / VM` |
| Última Actualización | `YYYY-MM-DD` |

## 2. Dependencias Upstream (Este Servicio Consume)

| Servicio | Protocolo | Endpoint / Tema | Propósito | Crítico? | Fallback |
|----------|-----------|-----------------|-----------|----------|----------|
| user-service | HTTP | GET /users/{id} | Validación de auth | Sí | Cache por 5 min |
| payment-service | gRPC | Charge() | Procesar pago | Sí | Cola para retry |
| notification-service | Evento | `notify.send` | Enviar email | No | Omitir silenciosamente |
| analytics-service | HTTP | POST /events | Métricas | No | Descartar (best effort) |

## 3. Dependencias Downstream (Servicios que Consumen Este)

| Servicio | Protocolo | Endpoint / Tema | Propósito | Rate Limit |
|----------|-----------|-----------------|-----------|------------|
| web-frontend | HTTP | GET /api/products | Catálogo | 1,000/min |
| mobile-app | HTTP | GET /api/products | Catálogo | 500/min |
| inventory-service | Evento | `inventory.update` | Cambios de stock | 10,000/hr |

## 4. Dependencias Externas

| Proveedor | Servicio | Propósito | SLA | Escalamiento |
|-----------|----------|-----------|-----|--------------|
| Stripe | Payment API | Procesar tarjetas | 99.9% | support@stripe.com |
| SendGrid | Email API | Email transaccional | 99.9% | status.sendgrid.com |
| AWS S3 | Object storage | Cargas de archivos | 99.99% | AWS Support |

## 5. Análisis de Ruta Crítica

| Flujo | Servicios Involucrados | Latencia Máxima Aceptable | Riesgo si Falla |
|-------|------------------------|---------------------------|-----------------|
| Checkout | web → cart → payment → user | 2s | Pérdida de ingresos |
| Login | web → user → session-cache | 500ms | Bloqueo de usuarios |
| Search | web → search → product-db | 1s | UX degradada |

## 6. Matriz de Impacto de Fallas

| Dependencia Falla | Impacto Directo | Impacto en Cascada | Mitigación |
|-------------------|-----------------|--------------------|------------|
| payment-service | No puede checkout | Sin ingresos | Cola + retry + alerta |
| user-service | No puede autenticar | Todos los flujos se detienen | JWT cacheado + modo degradado |
| notification-service | Emails retrasados | Sin cascada | Omitir + log de auditoría |

## 7. Representación del Diagrama

```
[web-frontend] ──→ [product-service] ──→ [product-db]
                        │
                        ↓
              [payment-service] ←── [Stripe]
                        │
                        ↓
           [notification-service] ──→ [SendGrid]
```

- Usar diagramas C4 o gráficos de dependencias (Graphviz, Mermaid, Lucidchart)
- Código de color: verde (saludable), amarillo (degradado), rojo (interrupción), gris (eliminación planeada)
```

## Explicación

El mapa separa **upstream** (lo que el servicio necesita) de **downstream** (lo que necesita el servicio). Las banderas de criticidad destacan qué fallas requieren atención inmediata. La matriz de impacto de fallas responde "¿qué se rompe y qué tan grave es?" antes de que ocurran incidentes. Las dependencias externas tienen su propia sección porque los SLAs de proveedores están fuera de tu control. El diagrama proporciona un resumen visual para revisiones de arquitectura.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Startup | Tabla simple + diagrama Mermaid | Mantenerlo en el README del servicio |
| Enterprise | Diagramas C4 + integración CMDB | Usar herramientas como ServiceNow o Backstage |
| Serverless | Granularidad a nivel de función | Mapear Lambdas individuales a triggers y destinos |

## Lo que funciona

1. Actualizar el mapa después de cada cambio arquitectónico, no solo trimestralmente
2. Almacenar mapas en control de versiones junto al código del servicio
3. Marcar dependencias como deprecadas antes de eliminarlas, con fechas objetivo de remoción
4. Incluir límites de tasa y cuotas para servicios downstream para prevenir sobrecarga accidental
5. Enlazar cada dependencia a su contrato de microservicio o runbook para referencia rápida

## Errores Comunes

1. Documentar solo llamadas HTTP síncronas e ignorar dependencias de eventos asíncronos
2. Tratar todas las dependencias como igualmente críticas, ocultando el verdadero radio de impacto
3. Crear diagramas demasiado detallados para leer en una sola pantalla
4. No actualizar mapas después de refactorizaciones, haciéndolos poco confiables
5. Omitir servicios de terceros porque "son problema de alguien más"

## Preguntas Frecuentes

### ¿Qué herramienta debería usar para dibujar mapas de dependencias?

Mermaid.js funciona bien en Markdown y wikis. Lucidchart y draw.io son mejores para presentaciones. Para descubrimiento automatizado, usa Datadog Service Map, AWS X-Ray o gráficos de servicios de OpenTelemetry.

### ¿Cómo mantengo los mapas actualizados sin actualizaciones manuales?

Usa tracing distribuido (Jaeger, Zipkin) para descubrir automáticamente gráficos de llamadas. Exporta la topología de traces a un diagrama vivo que se actualiza con cada despliegue.

### ¿Debo incluir bases de datos y caches como dependencias?

Sí. Las bases de datos y caches son dependencias críticas de infraestructura. Inclúyelas con su tipo (PostgreSQL, Redis, DynamoDB) y cualquier detalle de pool de conexiones o replicación que afecte la conmutación por error.
