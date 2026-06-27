---
contentType: recipes
slug: batch-processing-patterns
title: "Patrones de Procesamiento por Lotes"
description: "Diseña pipelines robustos de procesamiento por lotes para grandes datasets con retry, idempotencia y observabilidad."
metaDescription: "Patrones de procesamiento por lotes para grandes datasets: diseño robusto de pipelines, retry, idempotencia y mejores prácticas de observabilidad para ETL."
difficulty: intermediate
topics:
  - data
tags:
  - batch-processing
  - data
  - performance
  - architecture
relatedResources:
  - /recipes/caching
  - /recipes/data-validation
  - /recipes/date-formatting
  - /recipes/deep-clone-javascript
  - /recipes/flatten-unflatten-objects
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Patrones de procesamiento por lotes para grandes datasets: diseño robusto de pipelines, retry, idempotencia y mejores prácticas de observabilidad para ETL."
  keywords:
    - batch-processing
    - data
    - performance
    - architecture
---
## Visión General

El procesamiento por lotes es la columna vertebral de pipelines de datos, flujos de trabajo ETL y generación de reportes. A diferencia del procesamiento de streams, los trabajos por lotes procesan conjuntos de datos acotados en chunks, lo que los hace más simples de razonar pero requieren atención cuidadosa a la idempotencia, tolerancia a fallos y observabilidad.

## Cuándo Usar

Usa este recurso cuando:
- Procesas grandes datasets que no caben en memoria. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para manejar fallos transitorios.
- Construyes pipelines ETL para data warehouses
- Generas reportes o agregaciones nocturnas
- Migras datos entre sistemas con ventanas de mantenimiento

## Solución

### Pipeline Resiliente de Procesamiento por Lotes (Python)

```python
import logging
from typing import Callable, List, Iterator

class BatchProcessor:
    def __init__(self, batch_size: int = 1000, max_retries: int = 3):
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.processed = 0
        self.failed = []

    def process(
        self,
        items: Iterator[dict],
        handler: Callable[[List[dict]], None]
    ) -> dict:
        batch = []
        for item in items:
            batch.append(item)
            if len(batch) >= self.batch_size:
                self._execute(batch, handler)
                batch = []

        if batch:
            self._execute(batch, handler)

        return {"processed": self.processed, "failed": len(self.failed)}

    def _execute(self, batch: List[dict], handler: Callable):
        for attempt in range(self.max_retries):
            try:
                handler(batch)
                self.processed += len(batch)
                return
            except Exception as e:
                logging.warning(f"Batch fallido (intento {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    self.failed.extend(batch)
```

### Seguimiento Idempotente de Trabajos (SQL)

```sql
CREATE TABLE job_runs (
    job_id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed')),
    checksum VARCHAR(64)
);

-- Antes de comenzar, verifica si ya está completado
SELECT * FROM job_runs WHERE job_id = 'daily_report_2025_01_15' AND status = 'completed';
```

## Explicación

Un pipeline de producción por lotes necesita tres propiedades:

1. **Idempotencia**: Ejecutar el mismo trabajo dos veces debe producir el mismo resultado. Usa IDs de trabajo y checksums para saltar trabajo ya procesado. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación.
2. **Tolerancia a fallos**: Fallos individuales de batch no deben crashear todo el trabajo. Implementa reintentos con backoff exponencial y una cola de mensajes fallidos.
3. **Observabilidad**: Rastrea progreso, throughput y errores. [Registra](/recipes/api/logging) métricas para items procesados, latencia y tasas de fallo.

**Estrategia de chunking**: Ajusta el tamaño de batches para balancear uso de memoria y throughput. Demasiado pequeño = overhead; demasiado grande = riesgo de OOM.

## Variantes

| Patrón | Caso de Uso | Compromiso |
|--------|-------------|------------|
| Procesamiento por chunks | Archivos grandes, límites de memoria | Más simple, mayor latencia |
| Workers paralelos | Transformaciones CPU-bound | Complejo, necesita coordinación |
| MapReduce | Agregación distribuida | Escala horizontalmente |
| Change Data Capture | Sincronización incremental | Requiere soporte de la fuente |

## Mejores Prácticas

- **Diseña para idempotencia**: Cada trabajo debe ser seguro de reintentar
- **Registra todo**: Inicio de trabajo, fin, y resultado de cada batch
- **Usa transacciones**: Envuelve escrituras de batch en transacciones de base de datos
- **Monitorea profundidad de cola**: Alerta cuando batches pendientes excedan umbrales
- **Implementa [circuit breakers](/recipes/circuit-breaker-pattern-recipe)**: Detén reintentos si el downstream está unhealthy

## Errores Comunes

1. **No manejar fallos parciales**: Un batch de 1000 donde 1 falla necesita reintento individual
2. **Ignorar límites de memoria**: Cargar datasets enteros en RAM crashea el proceso
3. **Faltar checkpointing**: Un trabajo de 6 horas que falla a las 5:55 debe reiniciar desde cero
4. **Pérdida silenciosa de datos**: Errores logueados pero no visibles para operadores
5. **Sin estrategia de rollback**: Trabajos fallidos dejan la base de datos en estado inconsistente

## Preguntas Frecuentes

**P: ¿Qué tan grande debería ser cada batch?**
R: Comienza con 100-1000 items. Haz benchmark con tus datos y restricciones de memoria.

**P: ¿Debería usar una cola de trabajos como Celery o un cron job?**
R: Usa Celery/Redis para sistemas distribuidos y cron para pipelines simples de un solo nodo. Consulta [Rate Limiting](/recipes/api/rate-limiting) para controlar throughput.

**P: ¿Cómo manejo cambios de schema en medio del pipeline?**
R: Versiona tu lógica de trabajo y schemas de datos. Ejecuta versiones viejas y nuevas en paralelo durante la migración.
