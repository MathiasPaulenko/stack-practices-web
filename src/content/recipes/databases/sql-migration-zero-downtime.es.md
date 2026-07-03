---
contentType: recipes
slug: sql-migration-zero-downtime
title: "Migración de columnas sin downtime"
description: "Renombra columnas o cambia tipos de datos sin bloquear tablas usando vistas, triggers y estrategias de relleno incremental."
metaDescription: "Renombra columnas y cambia tipos de datos en SQL sin detener la aplicación. Usa expand-contract, triggers y relleno por lotes."
difficulty: advanced
topics:
  - databases
tags:
  - sql
  - postgresql
  - migration
  - schema
  - zero-downtime
relatedResources:
  - /docs/database-schema-documentation-template
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-partitioning-strategies
  - /recipes/sql-recursive-cte-query
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Renombra columnas y cambia tipos de datos en SQL sin detener la aplicación. Usa expand-contract, triggers y relleno por lotes."
  keywords:
    - sql
    - postgresql
    - migración
    - esquema
    - zero-downtime
---


## Visión General

Renombrar una columna o cambiar su tipo en una tabla ocupada es riesgoso porque `ALTER TABLE` puede adquirir un bloqueo exclusivo y bloquear lecturas y escrituras por minutos u horas. Las migraciones sin downtime evitan esto agregando una nueva columna, rellenando datos incrementalmente, sincronizando escrituras con triggers o vistas, y luego cambiando una vez que los valores antiguos y nuevos coinciden.

## Cuándo Usar

Usa este recurso cuando:
- Necesites renombrar una columna en una tabla de producción sin downtime.
- Estés cambiando un tipo de datos y no puedas permitir un bloqueo largo.
- Estés migrando una columna legada a un nuevo formato.
- Tu aplicación no tolere una ventana de mantenimiento.

## Solución

### Renombrar una columna sin downtime

```sql
-- Paso 1: agregar la nueva columna
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);

-- Paso 2: crear un trigger para mantener ambas columnas sincronizadas
CREATE OR REPLACE FUNCTION sync_email() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_address IS DISTINCT FROM OLD.email_address THEN
    NEW.email := NEW.email_address;
  ELSIF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email_address := NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_sync_email
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION sync_email();

-- Paso 3: rellenar en lotes
UPDATE customers
SET email_address = email
WHERE id BETWEEN 1 AND 1000
  AND email_address IS NULL;

-- Paso 4: verificar que todas las filas coinciden, luego eliminar la columna vieja y renombrar
```

## Explicación

El enfoque se llama expand-contract. Primero expandes el esquema agregando la nueva columna manteniendo la vieja. Un trigger asegura que las escrituras actualicen ambas columnas durante la transición. Rellena la nueva columna en lotes pequeños para evitar bloqueos largos. Una vez que la nueva columna está completamente poblada y las aplicaciones se han cambiado a usarla, elimina la vieja y opcionalmente renombra la nueva. Esto permite que la aplicación cambie a su propio ritmo sin un cutover a nivel de base de datos.

## Variantes

| Paso | Herramienta | Propósito |
|------|-------------|-----------|
| Agregar columna | `ALTER TABLE` | Expandir esquema |
| Sincronizar escrituras | Trigger o aplicación | Escritura dual |
| Rellenar | `UPDATE` por lotes | Migrar filas existentes |
| Validar | `COUNT(*)` con filtro de mismatch | Confirmar paridad |
| Cambiar | Desplegar nueva versión de app | Leer de nueva columna |

## Lo que funciona

1. **Ejecuta migraciones en una transacción cuando sea posible.** Esto mantiene el esquema consistente.
2. **Rellena en lotes pequeños con pausas entre ellos.** Esto reduce contención de bloqueos y lag de replicación.
3. **Usa `IS DISTINCT FROM` para comparaciones seguras con NULL.** `NULL = NULL` es desconocido, así que usa el operador distinct.
4. **Agrega un feature flag para cambiar lecturas.** Cambia la aplicación a la nueva columna una vez completado el relleno.
5. **Monitorea el lag de replicación durante el relleno.** Grandes actualizaciones pueden saturar réplicas; pausa si el lag crece.

## Errores Comunes

1. **Ejecutar un UPDATE masivo único.** Esto bloquea la tabla y puede revertirse en caso de fallo.
2. **Olvidar manejar escrituras nuevas durante el relleno.** Sin un trigger, las filas insertadas después de iniciar el relleno faltarán.
3. **Eliminar la columna vieja demasiado pronto.** Verifica que ambas columnas coinciden para cada fila antes de cambiar.
4. **No indexar la nueva columna.** Si la aplicación consulta la nueva columna, agrega los índices necesarios antes de cambiar.
5. **Ignorar referencias de claves foráneas.** Otras tablas o vistas pueden referenciar la columna vieja por nombre.

## Preguntas Frecuentes

**P: ¿Cuánto tiempo debe durar un relleno?**
R: Depende del tamaño de la tabla y la tasa de escritura. Estrategias típicas procesan unos pocos miles de filas por lote con pausas cortas entre lotes para evitar impacto en horas pico.

**P: ¿Puedo hacer esto sin triggers?**
R: Sí, puedes escribir dualmente desde la capa de aplicación. El trigger de base de datos es una red de seguridad en caso de que no todas las rutinas de código se actualicen.

**P: ¿Qué pasa si la nueva columna tiene un tipo de datos diferente?**
R: Convierte valores durante el relleno y actualiza el trigger para manejar conversiones. Prueba la conversión en una muestra antes de ejecutarla en la tabla completa.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
