---
contentType: docs
slug: api-performance-budget-template
title: "Plantilla de Presupuesto de Rendimiento de API"
description: "Una plantilla para establecer y rastrear presupuestos de rendimiento de latencia y throughput para APIs."
metaDescription: "Usa esta plantilla de presupuesto de rendimiento de API para definir objetivos de latencia, límites de throughput y restricciones de recursos para diseño de APIs."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - performance
  - budget
  - latency
  - template
relatedResources:
  - /docs/api-lifecycle-management-template
  - /docs/api-monitoring-alerting-template
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de presupuesto de rendimiento de API para definir objetivos de latencia, límites de throughput y restricciones de recursos para diseño de APIs."
  keywords:
    - arquitectura
    - api
    - rendimiento
    - presupuesto
    - latencia
    - plantilla
---
## Visión General

Cada endpoint de API consume recursos: CPU, memoria, conexiones de base de datos y ancho de banda de red. Sin presupuestos explícitos, los equipos agregan funcionalidades hasta que el sistema colapsa bajo carga. Esta plantilla define presupuestos de rendimiento como un contrato entre requisitos de producto y capacidad de infraestructura, haciendo explícitos los trade-offs antes de que se conviertan en caídas.

## Cuándo Usar

Usa este recurso cuando:
- Diseñas una nueva API o agregas un nuevo endpoint a una existente
- Planificas capacidad para una campaña de marketing o pico de tráfico estacional
- Investigas por qué una API es lenta bajo carga

## Solución

```markdown
# Presupuesto de Rendimiento de API: `<Nombre de la API>`

## 1. Presupuestos por Endpoint

### 1.1. Presupuesto de Latencia (p95)

| Endpoint | Objetivo | Actual | Margen | Notas |
|----------|----------|--------|--------|-------|
| `GET /health` | < 10ms | 8ms | 2ms | No debe depender de DB |
| `GET /users/{id}` | < 100ms | 85ms | 15ms | Solo una query de DB permitida |
| `POST /orders` | < 250ms | 210ms | 40ms | Transacción multi-tabla |
| `GET /reports/aggregate` | < 2s | 1.8s | 200ms | Réplica de lectura permitida |

### 1.2. Presupuesto de Throughput

| Endpoint | RPS Objetivo | Burst Máximo | Pool de Conexiones | Notas |
|----------|--------------|--------------|--------------------|-------|
| `GET /products` | 5,000 | 10,000 | 50 | Cacheado en Redis |
| `POST /checkout` | 500 | 1,000 | 20 | Escritura DB, idempotente |

### 1.3. Presupuesto de Payload

| Dirección | Tamaño Máximo | Típico | Compresión |
|-----------|---------------|--------|------------|
| Request body | 1 MB | 10 KB | Gzip |
| Response body | 5 MB | 50 KB | Gzip + Brotli |
| Header total | 16 KB | 1 KB | Ninguna |

### 1.4. Presupuesto de Dependencias

| Dependencia | Contribución Máxima de Latencia | Llamadas Concurrentes Máximas | Fallback |
|-------------|-----------------------------------|-------------------------------|----------|
| PostgreSQL | 40ms | 20 | Réplica de lectura |
| Redis | 5ms | 100 | Saltear caché (más lento) |
| Payment Gateway | 200ms | 10 | Encolar para async |
| Search Service | 100ms | 50 | Query LIKE básica |

## 2. Presupuestos de Recursos

| Recurso | Línea Base | Margen | Máximo | Alertar En |
|---------|------------|--------|--------|------------|
| CPU / núcleo | 40% | 30% | 70% | 60% |
| Memoria / pod | 512 MB | 256 MB | 1 GB | 800 MB |
| Conexiones DB | 50 | 30 | 80 | 70 |
| Egress de red | 100 Mbps | 50 Mbps | 200 Mbps | 150 Mbps |

## 3. Aplicación de Presupuestos

- [ ] Aserciones de latencia en CI (fallar build si p95 excede presupuesto)
- [ ] Gates de load test en pipeline de despliegue
- [ ] Validación de tamaño de payload en API gateway
- [ ] Circuit breaker en llamadas a dependencias que excedan latencia máxima
- [ ] Autoscaling disparado al 60% de CPU, no al 80%

## 4. Cadencia de Revisión

| Disparador | Acción | Responsable |
|------------|--------|-------------|
| Semanal | Revisar dashboards por desviación sobre presupuesto | SRE |
| Mensual | Ajustar presupuestos basado en crecimiento de tráfico | Plataforma |
| Trimestral | Re-negociar presupuestos con equipo de producto | Engineering Lead |
| Incidente | Auditoría de presupuesto post-incidente | Incident Commander |
```

## Explicación

Un **presupuesto de latencia** es una cadena: frontend (100ms) + red (50ms) + API (200ms) + base de datos (40ms) = 390ms total. Si cualquier eslabón excede su asignación, toda la experiencia de usuario se degrada. La **columna de margen** existe porque el rendimiento del mundo real es ruidoso. Los **presupuestos de dependencias** evitan que un servicio downstream lento consuma todo el presupuesto de la API. Los presupuestos de throughput definen pools de conexiones y tamaños de caché. Los presupuestos de recursos evitan que un endpoint pesado limite recursos de otros en el mismo host.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| GraphQL | Presupuesto de complejidad de query | Limitar costo total de campos por query, no solo profundidad |
| API de streaming | Throughput por shard | Presupuesto por partición, no global |
| SDK móvil | Tamaño de bundle + frecuencia de llamadas | Presupuesto incluye tamaño de payload y número de requests paralelos |

## Mejores Prácticas

1. Establecer presupuestos durante el diseño, no después del lanzamiento
2. Incluir presupuestos en checklists de revisión de diseño de API
3. Fallar builds de CI cuando tests de latencia excedan el presupuesto por cualquier margen
4. Reservar 20-30% de margen en cada presupuesto para picos de tráfico
5. Documentar quién puede aprobar excepciones de presupuesto (usualmente el engineering lead)

## Errores Comunes

1. Basar presupuestos en condiciones de laboratorio en lugar de percentiles de producción
2. Ignorar latencia de dependencias al calcular presupuestos de endpoint
3. Establecer un presupuesto global para todos los endpoints sin importar criticidad
4. Tratar los presupuestos como decisiones únicas en lugar de documentos vivos
5. No hacer cumplir presupuestos en CI o gates de despliegue

## Preguntas Frecuentes

### ¿Qué pasa cuando un endpoint excede su presupuesto?

Primero, optimiza: agrega caching, desnormaliza queries o pagina. Si el endpoint fundamentalmente necesita más tiempo, escala al engineering lead quien puede aprobar un aumento de presupuesto o degradar el SLO. Nunca ignores violaciones de presupuesto silenciosamente.

### ¿Cómo presupuesto para endpoints con patrones de tráfico desconocidos?

Comienza con estimaciones conservadoras basadas en endpoints similares. Monitorea por 2 semanas después del lanzamiento, luego ajusta. Usa feature flags para rampar tráfico gradualmente y observar rendimiento real antes de comprometerte con un presupuesto.

### ¿Deberían los presupuestos aplicar a endpoints batch / async?

Sí, pero usa métricas diferentes. Para async, presupuesta profundidad de cola, tasa de procesamiento (items/segundo) y latencia end-to-end desde enqueue hasta completion. El throughput importa más que el tiempo de respuesta para jobs batch.
