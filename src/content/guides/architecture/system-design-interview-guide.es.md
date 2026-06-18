---
contentType: guides
slug: system-design-interview-guide
title: "Guía de Entrevistas de System Design — Conceptos Clave"
description: "Una guía práctica para entrevistas de system design: escalabilidad, bases de datos, caching, load balancing, microservicios y cómo estructurar tu respuesta."
metaDescription: "Guía de entrevistas de system design: escalabilidad, bases de datos, caching, load balancing, microservicios. Aprende a estructurar respuestas para entrevistas técnicas."
difficulty: advanced
topics:
  - architecture
  - performance
tags:
  - architecture
  - arquitectura
  - entrevista
  - escalabilidad
  - guia
  - performance
  - sistemas-distribuidos
relatedResources:
  - /guides/architecture/software-architecture-guide
  - /guides/devops/kubernetes-basics-guide
  - /patterns/design/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de entrevistas de system design: escalabilidad, bases de datos, caching, load balancing, microservicios. Aprende a estructurar respuestas para entrevistas técnicas."
  keywords:
    - entrevista system design
    - guia system design
    - entrevista sistemas distribuidos
    - preguntas escalabilidad
    - disenar twitter
    - disenar url shortener
---

# Guía de Entrevistas de System Design

## Introducción

Las entrevistas de system design evalúan tu capacidad para diseñar sistemas escalables, confiables y mantenibles. A diferencia de las entrevistas de código, no hay una única respuesta correcta. El objetivo es demostrar pensamiento estructurado, análisis de trade-offs y profundidad de conocimiento técnico.

## Estructura de la Entrevista

Una respuesta fuerte sigue un framework de 4S:

### 1. Scope (2-3 minutos)

Clarifica los requerimientos antes de diseñar:

**Requerimientos funcionales:**
- ¿Qué features debe soportar el sistema?
- ¿Cuáles son los casos de uso principales?

**Requerimientos no funcionales:**
- Escala: ¿Cuántos usuarios? ¿Requests por segundo?
- Latencia: ¿Cuál es el tiempo de respuesta aceptable?
- Disponibilidad: ¿Qué uptime se requiere (99.9%, 99.99%)?
- Consistencia vs. disponibilidad: ¿Podemos tolerar consistencia eventual?

**Ejemplo:**
> "Diseña un acortador de URLs como bit.ly."
> - Funcional: Acortar URL, redireccionar, alias personalizados, analytics
> - Escala: 100M URLs nuevas/día, 10B lecturas/día
> - Latencia: <50ms para redirecciones
> - Disponibilidad: 99.99%

### 2. Sketch (10-15 minutos)

Dibuja un diseño de alto nivel con los componentes principales:

```
Cliente → Load Balancer → API Servers → Cache → Database
              ↓
        Message Queue → Analytics Workers
```

Componentes clave a considerar:
- **Load Balancer**: Distribuye tráfico (round-robin, least connections)
- **API Gateway**: Autenticación, rate limiting, routing
- **Application Servers**: Stateless, escalables horizontalmente
- **Cache**: Redis, Memcached para datos hot
- **Database**: Elección SQL vs. NoSQL
- **Message Queue**: Kafka, RabbitMQ para procesamiento async
- **CDN**: Assets estáticos y edge caching
- **Object Storage**: S3 para archivos/imágenes

### 3. Scale (10-15 minutos)

Identifica cuellos de botella y propone soluciones:

| Cuello de Botella | Solución |
|-------------------|----------|
| Tráfico read-heavy | Cache + CDN + read replicas |
| Tráfico write-heavy | Sharding + message queues |
| Punto único de fallo | Multi-AZ, replicación, failover |
| Queries lentos | Índices, desnormalización, índices de búsqueda |
| Almacenamiento de archivos grandes | Object storage (S3) + presigned URLs |

**Cálculos aproximados:**

```
100M URLs/día = ~1,160 escrituras/segundo (peak ~3,000/s)
10B lecturas/día = ~115,000 lecturas/segundo (peak ~300,000/s)

Registro de URL: short_code (6 bytes) + long_url (500 bytes) + metadata (100 bytes)
≈ 600 bytes por URL

Almacenamiento diario: 100M × 600B = 60 GB/día
Almacenamiento anual: ~22 TB/año
```

### 4. Solidify (5 minutos)

Trata casos edge y preocupaciones operacionales:
- **Monitoreo**: Latencia, tasa de error, throughput
- **Seguridad**: Rate limiting, validación de inputs, protección DDoS
- **Retención de datos**: Políticas de archivo, eliminación GDPR
- **Disaster recovery**: Backups, point-in-time recovery

## Conceptos Core

### Escalado Horizontal vs. Vertical

| | Vertical | Horizontal |
|---|----------|------------|
| **Enfoque** | Máquina más grande | Más máquinas |
| **Límite** | Tope de hardware | Casi ilimitado |
| **Costo** | Caro por unidad | Más barato por unidad |
| **Downtime** | Usualmente requiere | Rolling, sin downtime |
| **Complejidad** | Simple | Requiere balanceo de carga, estado distribuido |

### Sharding de Base de Datos

Particiona datos entre múltiples bases de datos para distribuir carga:

```
Shard por user_id % 4:
  Usuario 1 → Shard 0
  Usuario 2 → Shard 1
  Usuario 3 → Shard 2
  Usuario 4 → Shard 3
  Usuario 5 → Shard 0
```

**Criterios de selección de shard key:**
- Alta cardinalidad (muchos valores distintos)
- Distribución uniforme (evita hotspots)
- Localidad de queries (la mayoría de queries incluyen la shard key)

### Estrategias de Caching

| Estrategia | Cómo Funciona | Caso de Uso |
|-----------|-------------|-------------|
| **Cache-Aside** | La app revisa cache, carga de DB en miss | Read-heavy, la app controla la lógica |
| **Read-Through** | La cache fetcha de DB transparentemente | Lógica de app más simple |
| **Write-Through** | Las escrituras actualizan cache y DB simultáneamente | Consistencia fuerte |
| **Write-Behind** | Las escrituras van a cache, flush async a DB | Write-heavy, tolera delay |

### Teorema CAP

En un sistema distribuido, solo puedes garantizar dos de tres:

- **Consistencia**: Todos los nodos ven los mismos datos simultáneamente
- **Disponibilidad**: Cada request recibe una respuesta
- **Tolerancia a Particiones**: El sistema continúa operando a pesar de fallas de red

**Implicación práctica:** Las particiones de red son inevitables, así que eliges entre sistemas CP (consistentes) o AP (disponibles).

## Problemas de Diseño Comunes

| Problema | Desafíos Clave |
|----------|---------------|
| **URL Shortener** | Colisiones de hash, alto volumen de lecturas, analytics |
| **Twitter Feed** | Fan-out (push vs. pull), generación de timeline |
| **Sistema de Chat** | Entrega en tiempo real, presencia, orden de mensajes |
| **Motor de Búsqueda** | Indexación, ranking, parsing de queries |
| **Video Streaming** | CDN, bitrate adaptativo, encoding |
| **Rate Limiter** | Token bucket vs. sliding window, estado distribuido |

## Buenas Prácticas

- **Empieza simple**, luego agrega complejidad solo cuando esté justificada
- **Establece suposiciones explícitamente** — los entrevistadores evalúan tu razonamiento
- **Discute trade-offs** — cada decisión tiene pros y contras
- **Usa números concretos** — la matemática aproximada muestra rigor
- **Conoce tu stack tecnológico** — no propongas tecnologías que no puedas explicar
- **Practica con timer** — 45 minutos pasan rápido

## Errores Comunes

- Saltar a un esquema de base de datos detallado antes de clarificar requerimientos
- Ignorar requerimientos no funcionales (escala, disponibilidad)
- Proponer tecnologías sin entenderlas (ej. "usa Kafka" sin saber por qué)
- No discutir trade-offs (ej. SQL vs. NoSQL)
- Olvidar monitoreo, seguridad y preocupaciones operacionales
- Diseñar para escala infinita cuando los requerimientos no la justifican

## Preguntas Frecuentes

**P: ¿Qué tan profundo debo ir en una tecnología?**
R: Lo suficientemente profundo para explicar por qué la elegiste y sus limitaciones. Si mencionas Redis, estate listo para explicar políticas de evicción y opciones de persistencia.

**P: ¿Debería mencionar proveedores de cloud específicos?**
R: Usa términos genéricos ("object storage" en lugar de "S3") a menos que el entrevistador pida específicos. Esto muestra pensamiento arquitectónico independiente de vendors.

**P: ¿Qué pasa si no conozco una tecnología que el entrevistador pregunta?**
R: Sé honesto. Di "No estoy familiarizado con X, pero lo abordaría..." y describe el espacio del problema y cómo evaluarías soluciones.
