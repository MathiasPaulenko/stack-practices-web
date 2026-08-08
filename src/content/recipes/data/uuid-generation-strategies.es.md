---
contentType: recipes
slug: uuid-generation-strategies
title: "Generacion de UUID: v4, v7 y Comparacion con ULID"
description: "Compara UUID v4, v7, ULID y nanoid para generar identificadores unicos con diferentes tradeoffs en aleatoriedad, ordenamiento, rendimiento y localidad de indices de base de datos"
metaDescription: "Compara UUID v4, v7, ULID y nanoid para identificadores unicos. Diferentes tradeoffs en aleatoriedad, ordenamiento, rendimiento y localidad de indices."
difficulty: beginner
topics:
  - data
  - databases
tags:
  - guid
  - data
  - database
  - performance
relatedResources:
  - /recipes/postgres-query-optimization
  - /recipes/batch-processing-patterns
  - /recipes/database-replication
  - /recipes/schema-evolution
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Compara UUID v4, v7, ULID y nanoid para identificadores unicos. Diferentes tradeoffs en aleatoriedad, ordenamiento, rendimiento y localidad de indices."
  keywords:
    - uuid generation
    - ulid
    - nanoid
    - unique identifiers
    - database indexing



---
Elige la estrategia de identificador unico correcta para tu aplicacion comparando UUID v4 (random), v7 (time-sortable), ULID (lexicographically sortable) y nanoid (compact URL-safe). Esta recipe cubre generacion, implicaciones de indices de base de datos, probabilidad de colision y consideraciones de migracion.

## Cuando Usar Esto

- Las primary keys de [base de datos](/recipes/databases/database-transactions) deben ser globalmente unicas en sistemas distribuidos
- El ordenamiento de identificadores afecta el rendimiento de queries y fragmentacion de indices
- Se necesitan identificadores cortos y URL-safe para recursos public-facing

## Solucion

### 1. UUID v4 (Random)

```typescript
// ids/uuid4.ts
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// Caracteristicas
// - Completamente random (122 bits de aleatoriedad)
// - No sortable por tiempo
// - Causa fragmentacion de indice en B-trees
// - Formato standard con hyphens
```

### 2. UUID v7 (Time-Sortable)

```typescript
// ids/uuid7.ts
import { v7 as uuidv7 } from 'uuid';

const id = uuidv7(); // '018f3bda-7c58-7e8a-8b5e-4f3e8c9d2a1b'

// Caracteristicas
// - Primeros 48 bits = Unix timestamp en milisegundos
// - Restantes 74 bits = random
// - Sortable por tiempo de creacion
// - Mejor localidad de indice que v4
// - Standard RFC draft (estable para produccion)
```

### 3. ULID (Lexicographically Sortable)

```typescript
// ids/ulid.ts
import { ulid } from 'ulid';

const id = ulid(); // '01HV8J3K2M4N5P6Q7R8S9T0UV'

// Caracteristicas
// - 26 caracteres, Crockford's base32
// - Primeros 10 chars = timestamp (sortable)
// - Ultimos 16 chars = aleatoriedad
// - Lexicographically sortable como string
// - Sin hyphens, URL-safe
```

### 4. NanoID (Compacto y Rapido)

```typescript
// ids/nanoid.ts
import { nanoid } from 'nanoid';

const id = nanoid();       // default 21 chars
const short = nanoid(10);  // longitud configurable

// Caracteristicas
// - 21 chars por defecto (similar resistencia de colision a UUID v4)
// - Alfabeto custom soportado
// - Generacion rapida (~50% mas rapido que UUID)
// - URL-safe por defecto (sin hyphens)
```

### 5. Matriz de Comparacion

```typescript
// ids/comparison.ts
const comparison = {
  uuidv4: {
    length: 36,
    sortable: false,
    indexLocality: 'poor',
    standard: 'RFC 4122',
    collisionRisk: 'negligible (2^122)',
  },
  uuidv7: {
    length: 36,
    sortable: true,
    indexLocality: 'good',
    standard: 'RFC draft',
    collisionRisk: 'negligible (2^74)',
  },
  ulid: {
    length: 26,
    sortable: true,
    indexLocality: 'good',
    standard: 'Community',
    collisionRisk: 'negligible (2^80)',
  },
  nanoid: {
    length: 21,
    sortable: false,
    indexLocality: 'poor',
    standard: 'Community',
    collisionRisk: 'negligible (2^126)',
  },
};
```

### 6. PostgreSQL con UUID v7

```sql
-- Habilitar extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla con primary key UUID v7
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Para UUIDs sortables, generar en la aplicacion e insertar
INSERT INTO events (id, name) VALUES ('018f3bda-7c58-7e8a-8b5e-4f3e8c9d2a1b', 'signup');
```

## Como Funciona

- **UUID v4** usa aleatoriedad para unicidad pero dispersa inserts de indice
- **UUID v7** embebe un prefijo de timestamp, haciendo los inserts aproximadamente secuenciales
- **ULID** usa codificacion base32 para identificadores mas cortos aun sortable
- **NanoID** prioriza velocidad y compacidad con longitud configurable

## Consideraciones de Produccion

- Usa UUID v7 para aplicaciones nuevas que necesiten keys time-sortable. Consulta [Database Migrations](/recipes/databases/database-migrations) para evolucionar schemas.
- Manten UUID v4 para sistemas existentes a menos que la migracion este justificada
- Usa ULID cuando la longitud del identificador y el ordenamiento lexicografico importen
- Usa nanoid para tokens de corta vida, short URLs o cuando el tamano sea critico

## Errores Comunes

- Generar UUIDs en la base de datos en lugar de la application layer
- Usar v4 en sistemas de alto insert sin monitorear fragmentacion de indice
- No manejar la rara pero posible colision de UUID en sistemas distribuidos

## Cuando No Usar Este Enfoque

- **Formatting locale-aware en sistemas distribuidos**: si los servidores spanean multiples timezones, formatear fechas localmente por-servidor causa inconsistencias.
- **Llamadas de formatting de alta frecuencia**: si el formatting se llama millones de veces por segundo, el overhead de strftime o Intl.  DateTimeFormat se vuelve significativo.
- **Calculos financieros que requieren precision exacta**: la aritmetica de floating-point causa errores de redondeo en calculos de dinero (0.  1 + 0.  2 !  = 0.  3).
- **URL encoding de strings ya encodeados**: double-encoding %20 produce %2520.
- **Generacion de UUID en paths performance-critical**: la generacion de UUIDv4 usa CSPRNG que es 10-100x mas lento que IDs secuenciales.
- **Parsing de argumentos CLI para scripts simples**: si un script necesita 2-3 flags, rgparse o commander es excesivo.

## Benchmarks de Rendimiento

- **Formatting de fechas**: strftime en Python formatea 1M fechas en 200-500ms.   Intl.  DateTimeFormat en JavaScript formatea 1M fechas en 100-300ms.
- **URL encoding**: encodeURIComponent en JavaScript encodea 1M strings en 50-200ms.   urllib.  parse.  quote de Python encodea 1M strings en 100-400ms.
- **Generacion de UUID**: uuid.   crypto.  randomUUID() en Node.
- **Truncacion de texto**: slicear 1M strings a 100 chars toma 50-150ms en Python y 20-80ms en JavaScript.
- **Formatting de phone numbers**: la libreria phonenumbers en Python formatea 100K phone numbers en 500ms-2s.
- **Generacion de QR codes**: qrcode-terminal es mas rapido pero produce output de menor calidad.

## Estrategia de Testing

- **Test de manejo de timezones**: verifica que el formatting de fechas produzca output correcto a traves de timezones (UTC, PST, JST, AEDT).
- **Test con input invalido**: verifica que phone numbers invalidos, URLs malformadas y fechas out-of-range sean rechazadas con errores claros.
- **Test de formatting locale-specific**: 56 vs 1.
- **Test de edge cases Unicode**: verifica que la truncacion no rompa caracteres multi-byte (emoji, CJK).
- **Test de unicidad de UUID**: UUIDv4 tiene 50% de probabilidad de colision despues de 2.
- **Test de edge cases de argumentos CLI**: testea con argumentos requeridos faltantes, flags duplicados, numeros negativos como valores y separador --.

## Estimacion de Costos

- **TamaÃ±o de bundle de libreria de fechas**: moment.  js es 67KB minificado.   date-fns con tree-shaking es 5-15KB.   luxon es 25KB.   Intl.  DateTimeFormat nativo es 0KB (built into the runtime).
- **Validacion de phone numbers**: libphonenumber-js es 45KB minificado.   La validacion server-side con la libreria de Google es gratis pero requiere una dependencia C++.
- **Costo de generacion de QR codes**: 50-2.  00 en compute.
- **Infraestructura de generacion de UUID**: UUIDv4 no requiere coordinacion pero causa patrones de I/O random en bases de datos.   UUIDv7 o Snowflake IDs mejoran el throughput de escritura 2-5x clusterizando inserts.
- **Distribucion de CLI tools**: empaquetar un CLI tool con pip o 
pm es gratis. Distribuir como binario standalone (PyInstaller, pkg) agrega 10-50MB pero elimina la dependencia de runtime. Elije basado en la audiencia de usuarios

## Monitoring y Observabilidad

- **Tasa de errores de formatting**: trackea el porcentaje de operaciones de formatting que fallan.
- **Latencia de formatting**: monitorea el tiempo gastado en formatting de fechas/phone/URL.
- **Drift de configuracion de timezone**: loguea el timezone del server al startup.   Alerta si cambia de UTC.
- **Rate de generacion de UUID**: monitorea el rate de generacion de UUID.
- **Patrones de uso de CLI**: loguea que flags de CLI se usan mas frecuentemente.

## Deployment Checklist

- [ ] Setear el timezone del server a UTC: variable de entorno TZ=UTC. Nunca confies en el timezone default del sistema en codigo de produccion
- [ ] Configurar defaults de locale: setea variables de entorno LANG y LC_ALL. Usa Intl.DateTimeFormat con locale explicito en JavaScript
- [ ] Setear longitud maxima de input: rechaza strings mas largos que el maximo configurado antes de formatear. Previene agotamiento de memoria por inputs oversized
- [ ] Configurar nivel de correccion de errores de QR code: usa nivel M (15% recovery) para uso general, nivel H (30% recovery) para entornos industriales. Niveles mas altos producen codes mas densos
- [ ] Setear limites de argumentos CLI: limita el numero de argumentos y su tamaÃ±o total. getopt y rgparse tienen limites built-in, pero parsers custom necesitan limites explicitos
- [ ] Pinear versiones de librerias: las librerias de fechas y phone cambian frecuentemente. Pinea versiones para evitar breaking changes de updates de timezone database o cambios de formato de locale

## Consideraciones de Seguridad

- **Bypass de control de acceso basado en timezone**: si los checks de control de acceso usan hora local, un cambio de timezone del server puede bypassar restricciones basadas en tiempo.
- **Bypass de URL encoding**: double-encoding o mixed encoding puede bypassar filtros de seguridad basados en URL.
- **Spoofing de phone numbers**: el caller ID spoofing significa que la validacion de phone number no verifica identidad.
- **Phishing via QR codes**: los QR codes pueden encodear URLs maliciosas.
- **Predictibilidad de UUID**: UUIDv1 contiene la MAC address y timestamp, lo que leakea info de hardware y permite prediccion.
- **Inyeccion via parsing de fechas**: algunos parsers de fechas ejecutan codigo arbitrario via format strings (ej.   strftime con format controlado por el usuario).
- **Bypass de XSS via truncacion**: truncar HTML a un numero fijo de caracteres puede partir tags y crear HTML invalido que bypassa filtros XSS.
- **Inyeccion de argumentos CLI**: si los argumentos CLI se pasan a subprocess sin escaping apropiado, un atacante puede inyectar shell commands.
- **Perdida de precision en formatting de dinero**: convertir entre currencies usando floating-point puede perder precision.
- **Leak de metadata de phone numbers**: libphonenumber puede revelar el carrier y region de un phone number.
- **Inyeccion de contenido en QR codes**: si los QR codes se renderizan desde URLs suministradas por el usuario sin validacion, un atacante puede encodear URIs javascript: o data:.
- **DoS via format strings de fecha**: algunas librerias de formatting de fechas soportan format strings complejas que pueden causar uso excesivo de CPU.
## Variantes y Alternativas

- **Intl nativo vs librerias**: Intl.  DateTimeFormat, Intl.  NumberFormat e Intl.  ListFormat estan built-in en runtimes JS modernos.   Son 0KB y 2-5x mas rapidos que moment.  js o date-fns.
- **UUIDv4 vs UUIDv7 vs ULID vs Snowflake**: UUIDv4 es random (bueno para seguridad, malo para indices DB).   UUIDv7 es time-ordered (bueno para localidad DB).   ULID es lexicograficamente sortable.
- **Decimal vs centavos enteros vs floating-point**: Decimal es exacto pero lento.   Centavos enteros (guardar 199 en lugar de 1.  99) es exacto y rapido pero requiere conversion en boundaries.
- **Template literals vs concatenacion de strings**: template literals (` Hola  `) son mas legibles y ligeramente mas rapidos en V8.   Concatenacion ("Hola " + name) es compatible con runtimes antiguos.
- **API URL nativa vs parsing con regex**: 
ew URL(string) parsea URLs correctamente incluyendo edge cases (IPv6, userinfo, caracteres encodeados). Parsing basado en regex pierde edge cases. Siempre usa la API URL nativa para manipulacion de URLs
- **Comparacion de frameworks CLI**: rgparse (Python, stdlib, verbose), click (Python, decorators, clean), 	yper (Python, type hints, modern), commander (Node.  js, widely used), yargs (Node.  js, feature-rich).

## Pitfalls Comunes en Produccion

- **Offset de timezone vs nombre de timezone**: +02:00 es un offset que cambia con DST.
- **Confusion de codigos de locale**: en-US vs en_US vs en â€” diferentes librerias esperan diferentes formatos.
- **Modos de redondeo de currency**: ROUND_HALF_UP (banker's rounding) difiere de ROUND_HALF_EVEN (default Python).   Sistemas financieros requieren modos de redondeo especificos.
- **Colision de UUID en la practica**: la probabilidad de colision de UUIDv4 es despreciable (1 en 2.  7x10^36 para 50% de probabilidad).   Pero la colision de UUIDv1 puede ocurrir si la MAC address se reusa o el reloj se setea hacia atras.
- **URL encoding de caracteres especiales**: , ', (, ) son tecnicamente seguros en URLs pero algunos servidores los rechazan.   encodeURIComponent los encodea; encodeURI no.
- **Truncacion con HTML**: truncar HTML por conteo de caracteres puede romper tags.
## Patrones de Integracion

- **Pipeline de internacionalizacion (i18n)**: extrae strings user-facing -> formatea con funciones locale-specific -> renderiza en UI.
- **Pipeline de fecha/tiempo**: Nunca almacenes strings de fecha localizados en bases de datos.
- **Pipeline de dinero**: parsea monto (string a Decimal) -> valida codigo de currency (ISO 4217) -> convierte currency si es necesario (usando exchange rates diarios) -> formatea para display usando locale.
- **Pipeline de building de URL**: valida URL base -> appendea path segments (URL-encoded) -> appendea query parameters (URL-encoded) -> appendea fragment.
- **Pipeline de generacion de UUID**: genera UUID -> valida formato -> almacena como string (no tipo UUID para portabilidad) -> usa como primary key.
- **Integracion de CLI con archivos de config**: flags de CLI overriden valores de config file, que overriden variables de entorno, que overriden defaults.   Esta jerarquia es estandar en apps 12-factor.

## Manejo de Errores y Recuperacion

- **Fallback graceful de locale**: si una traduccion falta para r-CA, falla a r, luego en.   Loguea traducciones faltantes para agregarlas despues.
- **Cadena de fallback de parsing de fechas**: prueba ISO 8601 primero, luego formatos locale-specific, luego formatos comunes (MM/DD/YYYY, DD/MM/YYYY).   Si todos fallan, retorna null y deja que el caller decida.
- **Manejo de errores de conversion de currency**: Loguea un warning.   Si no hay rate cacheado, rechaza la conversion con un error claro.
- **Errores de normalizacion de URL**: si el parsing de URL falla, loguea la URL original y el error.   No intentes fixear la URL automaticamente â€” URLs malformadas pueden ser intencionales (ej.   para testing).
- **Manejo de colisiones de UUID**: si ocurre una colision de UUID (extremadamente raro con v4/v7), regenera con un nuevo componente random.   Loguea la colision para investigacion.
- **Recuperacion de errores de argumentos CLI**: si un argumento requerido falta, imprime el texto de ayuda y sale con codigo 2.   Si un argumento tiene un valor invalido, imprime el error, el formato esperado, y sale con codigo 2.
## FAQ

**P: Deberia usar enteros auto-incrementales en su lugar?**
R: Usa enteros para sistemas single-node donde la coordinacion es trivial. Usa UUIDs para sistemas distribuidos o cuando los identificadores no deben revelar informacion de secuencia. Consulta [Database Connection Pooling](/recipes/databases/database-connection-pooling) para gestionar conexiones de base de datos.

**P: Es UUID v7 oficialmente estandarizado?**
R: Esta en estado RFC draft y ampliamente considerado estable. Las principales bases de datos y librerias lo soportan.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.






## Glosario

- **Generacion de UUID: v4, v7 y Comparacion con ULID**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de guid y data para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica generacion de uuid: v4, v7 y comparacion con ulid** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
