---
contentType: recipes
slug: uuid-generation
title: "Generación de UUID"
description: "Cómo generar identificadores únicos universales (UUIDs) para claves de base de datos, tokens de sesión y nombrado de recursos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de generación de UUID en Python, JavaScript y Java. Aprende UUID v4, v7, ULID y cuándo usar cada uno."
difficulty: beginner
topics:
  - data
tags:
  - data
  - database
  - guid
  - parsing
  - json
relatedResources:
  - /recipes/parse-json
  - /recipes/caching
  - /patterns/singleton-pattern
lastUpdated: "2026-06-10"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Ejemplos prácticos de generación de UUID en Python, JavaScript y Java. Aprende UUID v4, v7, ULID y cuándo usar cada uno."
  keywords:
    - generación de uuid
    - guid
    - uuid v4
    - uuid v7
    - ulid
    - identificadores únicos
    - claves primarias de base de datos
    - python uuid
    - javascript uuid
    - java uuid

---
## Visión general

Los UUIDs (Universally Unique Identifiers) son valores de 128 bits diseñados para ser únicos tanto en espacio como en tiempo. Son el estándar para claves primarias de base de datos en sistemas distribuidos, tokens de sesión, nombres de archivos y cualquier escenario donde los enteros auto-incrementales son insuficientes.

Los sistemas modernos prefieren cada vez más UUID v7 o ULID sobre v4 porque son ordenables por tiempo, mejorando el rendimiento de índices de base de datos.

## Cuándo usarlo

Usa esta recipe cuando:

- Generas claves primarias en bases de datos distribuidas. Consulta [Connection Pooling](/recipes/database-connection-pooling/) para patrones de acceso a base de datos.
- Creas tokens de sesión o API. Consulta [JWT Authentication](/recipes/jwt-authentication/) para manejo seguro de tokens.
- Nombras archivos, imágenes o uploads para prevenir colisiones. Consulta [File Upload Validation](/recipes/file-upload-validation/) para manejo seguro de subidas.
- Fusionas datos de múltiples fuentes donde los IDs no deben chocar. Consulta [Parse JSON](/recipes/parse-json/) para fusión de datos estructurados.
- Construyes sistemas donde los clientes generan IDs antes de enviarlos al servidor. Consulta [Call REST API](/recipes/call-rest-api/) para comunicación cliente-servidor.

## Solución

### Python

```python
import uuid
import ulid

# UUID v4 (random) — más común
id_v4 = uuid.uuid4()
print(id_v4)  # ej., 550e8400-e29b-41d4-a716-446655440000

# UUID v7 (time-ordered) — ordenable, mejor para índices de DB
id_v7 = uuid.uuid7()  # Python 3.13+
print(id_v7)

# ULID (time-ordered, lexicográficamente ordenable)
id_ulid = ulid.new()
print(id_ulid)  # 01ARZ3NDEKTSV4RRFFQ69G5FAV

# Como string para JSON o DB
str_id = str(uuid.uuid4())
```

### JavaScript

```javascript
import { v4, v7 } from 'uuid';
import { ulid } from 'ulid';

// UUID v4 (random)
console.log(v4()); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — requiere uuid@10+
console.log(v7()); // 018f3d7e-8... (empieza con timestamp)

// ULID (time-ordered, lexicográficamente ordenable)
console.log(ulid()); // 01ARZ3NDEKTSV4RRFFQ69G5FAV

// Crypto random UUID (nativo del browser)
console.log(crypto.randomUUID()); // Disponible en Node 19+ y browsers modernos
```

### Java

```java
import java.util.UUID;

// UUID v4 (random)
UUID idV4 = UUID.randomUUID();
System.out.println(idV4); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — usa java-uuid-generator o JDK 23+
// Para JDKs antiguos, usa una librería como java-uuid-generator

// ULID vía librería externa (ej., ulid-java)
// String ulid = Ulid.generate();
```

## Comparación de Versiones de UUID

| Versión | Formato | Ordenable | Caso de uso |
| ------- | ------- | --------- | ----------- |
| **v4** | Random | No | Uso general, más ampliamente soportado |
| **v7** | Time-ordered | Sí | Claves de base de datos, logs de eventos (mejor localidad de índice) |
| **v8** | Custom | Configurable | Extensiones específicas de vendor |
| **ULID** | Time + random | Sí | URL-safe, lexicográficamente ordenable |

## Lo que funciona

- **Prefiere UUID v7 o ULID para claves de base de datos**: IDs ordenados por tiempo mejoran el rendimiento de índices B-tree
- **Almacena como tipo `UUID` en bases de datos** cuando esté disponible (PostgreSQL, SQL Server) en lugar de strings
- **Usa `BINARY(16)` en MySQL** para ahorrar espacio comparado con `CHAR(36)`
- **Genera IDs client-side** para patrones offline-first o UI optimista
- **No expongas IDs secuenciales** a usuarios por seguridad (usa UUIDs en lugar de auto-increment)
- **Valida el formato UUID** al parsear input externo

## Errores comunes

- Usar UUID v4 como clave primaria de base de datos sin entender la penalización de inserción random
- Almacenar UUIDs como strings en lugar de tipos binarios nativos, desperdiciando espacio y eficiencia de índice
- Usar UUIDs para tablas pequeñas no distribuidas donde enteros auto-incrementales son suficientes
- No indexar apropiadamente columnas UUID en bases de datos
- Generar UUIDs en un hot loop sin cachear la instancia del generador

## Migración de auto-incremento a UUID

Cambiar una tabla existente de enteros auto-incrementales a UUIDs requiere planificación:

### Paso 1: Añadir columna UUID

```sql
-- PostgreSQL
ALTER TABLE users ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX idx_users_uuid ON users(uuid);
```

### Paso 2: Rellenar filas existentes

Ejecuta un script de migración única para generar UUIDs para registros existentes:

```python
import uuid
for user in User.query.filter(User.uuid.is_(None)):
    user.uuid = uuid.uuid7()
    db.session.commit()
```

### Paso 3: Actualizar código de aplicación

Modifica tus modelos ORM y endpoints de API para leer/escribir la columna UUID en lugar del ID entero.

### Paso 4: Actualizar claves foráneas

Si otras tablas referencian `users.id`, añade una columna `user_uuid` a esas tablas y migra las relaciones.

### Paso 5: Deprecar el ID entero

Después de confirmar que todo funciona, marca la columna `id` entera como deprecada. No la elimines inmediatamente — dáte un camino de rollback.

## UUIDs en sistemas distribuidos

En microservicios o arquitecturas orientadas a eventos, los UUIDs destacan porque pueden generarse independientemente por cualquier nodo:

- **Event sourcing**: Cada evento obtiene un UUID, habilitando consumidores idempotentes
- **Apps offline-first**: El cliente genera el UUID antes de sincronizar con el servidor
- **Sharding de base de datos**: No se necesita un allocator central de IDs; cada shard genera sus propias claves
- **CQRS**: Los modelos de lectura y escritura pueden generar IDs sin coordinación

| Enfoque | Pros | Contras |
|---------|------|---------|
| **Auto-incremento** | Simple, compacto, ordenado | Cuello de botella central, difícil de shard |
| **UUID v4** | Descentralizado, estándar | Penalización de inserción random, no ordenable |
| **UUID v7** | Descentralizado, ordenable | Requiere versiones más nuevas de lenguaje/librería |
| **Snowflake IDs** | Ordenable, compacto (64-bit) | Requiere coordinador central |

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





## Glosario

- **Generación de UUID**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de data y database para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica generación de uuid** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿Debería usar UUID v4 o v7 para proyectos nuevos?**
R: Usa v7 (o ULID) para claves de base de datos. Son ordenados por tiempo, reduciendo la fragmentación de índices. Usa v4 solo para identificadores no ordenables como tokens de sesión.

**P: ¿Son los UUIDs verdaderamente únicos?**
R: La probabilidad de colisión es astronómicamente baja (1 en 2^122 para v4). Para propósitos prácticos, son únicos suficientes para todo excepto la escala más extrema.

**P: ¿Puedo usar UUIDs en URLs?**
R: Sí, pero los ULIDs son más cortos y URL-safe. Si usas v4/v7, encodéalos sin guiones (32 chars) para URLs más cortas.

**P: ¿Los UUIDs afectan el rendimiento de la base de datos?**
R: UUID v4 causa inserciones random en B-tree, lo que perjudica el rendimiento de escritura en tablas grandes. UUID v7 y ULID son ordenados por tiempo, dando rendimiento similar a los enteros auto-incrementales.

**P: ¿Puedo combinar UUIDs con IDs auto-incrementales?**
R: Sí. Usa un entero auto-incremental como clave primaria interna (para clustering/rendimiento) y un UUID como identificador externo (para APIs y URLs). Esto te da lo mejor de ambos mundos.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
