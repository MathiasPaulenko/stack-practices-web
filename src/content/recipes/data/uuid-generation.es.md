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
author: "Mathias Paulenko"
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

- Generas claves primarias en bases de datos distribuidas. Consulta [Connection Pooling](/recipes/databases/database-connection-pooling) para patrones de acceso a base de datos.
- Creas tokens de sesión o API. Consulta [JWT Authentication](/recipes/authentication/jwt-authentication) para manejo seguro de tokens.
- Nombras archivos, imágenes o uploads para prevenir colisiones. Consulta [File Upload Validation](/recipes/file-handling/file-upload-validation) para manejo seguro de subidas.
- Fusionas datos de múltiples fuentes donde los IDs no deben chocar. Consulta [Parse JSON](/recipes/data/parse-json) para fusión de datos estructurados.
- Construyes sistemas donde los clientes generan IDs antes de enviarlos al servidor. Consulta [Call REST API](/recipes/api/call-rest-api) para comunicación cliente-servidor.

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

- **Formatting locale-aware en sistemas distribuidos**: si los servidores spanean multiples timezones, formatear fechas localmente por-servidor causa inconsistencias. Siempre formatea en UTC en el servidor y convierte en la capa de presentacion usando el locale del usuario
- **Llamadas de formatting de alta frecuencia**: si el formatting se llama millones de veces por segundo, el overhead de strftime o Intl.DateTimeFormat se vuelve significativo. Pre-formatea valores estaticos y cachea el resultado
- **Calculos financieros que requieren precision exacta**: la aritmetica de floating-point causa errores de redondeo en calculos de dinero (0.1 + 0.2 != 0.3). Usa decimal.Decimal (Python), BigDecimal (Java) o representacion en centavos enteros
- **URL encoding de strings ya encodeados**: double-encoding %20 produce %2520. Chequea si el string ya esta encodeado antes de aplicar encodeURIComponent. Usa decodeURIComponent primero para normalizar
- **Generacion de UUID en paths performance-critical**: la generacion de UUIDv4 usa CSPRNG que es 10-100x mas lento que IDs secuenciales. Para sistemas internos, usa UUIDv7 (time-ordered) o Snowflake IDs para mejor localidad de indice en base de datos
- **Parsing de argumentos CLI para scripts simples**: si un script necesita 2-3 flags, rgparse o commander es excesivo. Usa sys.argv o argumentos posicionales directamente

## Benchmarks de Rendimiento

- **Formatting de fechas**: strftime en Python formatea 1M fechas en 200-500ms. Intl.DateTimeFormat en JavaScript formatea 1M fechas en 100-300ms. Formatting ISO 8601 (	oISOString) es 2-5x mas rapido que formatting locale-aware
- **URL encoding**: encodeURIComponent en JavaScript encodea 1M strings en 50-200ms. urllib.parse.quote de Python encodea 1M strings en 100-400ms. Tablas de encoding pre-computadas pueden lograr 10-50ms para el mismo volumen
- **Generacion de UUID**: uuid.uuid4() en Python genera 1M UUIDs en 500ms-2s. crypto.randomUUID() en Node.js genera 1M UUIDs en 100-300ms. La generacion de UUIDv7 es similar a v4 pero produce IDs time-ordered
- **Truncacion de texto**: slicear 1M strings a 100 chars toma 50-150ms en Python y 20-80ms en JavaScript. Truncacion Unicode-aware (sin romper caracteres multi-byte) agrega 2-3x de overhead
- **Formatting de phone numbers**: la libreria phonenumbers en Python formatea 100K phone numbers en 500ms-2s. Google's libphonenumber (C++) formatea el mismo volumen en 50-100ms
- **Generacion de QR codes**: la libreria qrcode en Python genera un QR code de 100x100 en 5-20ms. qrcode-terminal es mas rapido pero produce output de menor calidad. Generacion batch de 10,000 QR codes toma 50-200ms

## Estrategia de Testing

- **Test de manejo de timezones**: verifica que el formatting de fechas produzca output correcto a traves de timezones (UTC, PST, JST, AEDT). Testea transiciones DST (spring forward, fall back) y cambios historicos de timezone
- **Test con input invalido**: verifica que phone numbers invalidos, URLs malformadas y fechas out-of-range sean rechazadas con errores claros. Testea con strings vacios, null y undefined
- **Test de formatting locale-specific**: verifica que el formatting de currency use el simbolo correcto, separador decimal y agrupamiento para cada locale (,234.56 vs 1.234,56 EUR)
- **Test de edge cases Unicode**: verifica que la truncacion no rompa caracteres multi-byte (emoji, CJK). Testea URL encoding con paths Unicode (IRI). Testea formatting de fechas con calendarios no-Gregorianos
- **Test de unicidad de UUID**: genera 10M UUIDs y verifica que no haya colisiones. Usa un set o bloom filter para deteccion de colisiones. UUIDv4 tiene 50% de probabilidad de colision despues de 2.7x10^36 IDs
- **Test de edge cases de argumentos CLI**: testea con argumentos requeridos faltantes, flags duplicados, numeros negativos como valores y separador --. Verifica que el texto de ayuda sea preciso y completo

## Estimacion de Costos

- **TamaÃ±o de bundle de libreria de fechas**: moment.js es 67KB minificado. date-fns con tree-shaking es 5-15KB. luxon es 25KB. Intl.DateTimeFormat nativo es 0KB (built into the runtime). Elije APIs nativas cuando sea posible
- **Validacion de phone numbers**: libphonenumber-js es 45KB minificado. La validacion server-side con la libreria de Google es gratis pero requiere una dependencia C++. Para validacion solo web, usa un regex ligero para checking de formato
- **Costo de generacion de QR codes**: generar 1M QR codes server-side cuesta .50-2.00 en compute. Pre-generar y almacenar como PNG cuesta -20/mes en almacenamiento pero elimina el compute por-request
- **Infraestructura de generacion de UUID**: UUIDv4 no requiere coordinacion pero causa patrones de I/O random en bases de datos. UUIDv7 o Snowflake IDs mejoran el throughput de escritura 2-5x clusterizando inserts. El costo es una dependencia de time-source
- **Distribucion de CLI tools**: empaquetar un CLI tool con pip o 
pm es gratis. Distribuir como binario standalone (PyInstaller, pkg) agrega 10-50MB pero elimina la dependencia de runtime. Elije basado en la audiencia de usuarios

## Monitoring y Observabilidad

- **Tasa de errores de formatting**: trackea el porcentaje de operaciones de formatting que fallan. Tasas altas indican datos de input malos o issues de configuracion de locale
- **Latencia de formatting**: monitorea el tiempo gastado en formatting de fechas/phone/URL. Si el formatting excede 5% del tiempo de request, cachea valores formateados o cambia a librerias mas rapidas
- **Drift de configuracion de timezone**: loguea el timezone del server al startup. Alerta si cambia de UTC. Timezones de server no-UTC son una fuente comun de bugs de fecha en sistemas distribuidos
- **Rate de generacion de UUID**: monitorea el rate de generacion de UUID. Un spike repentino puede indicar un bug causando creacion excesiva de IDs o un retry loop
- **Patrones de uso de CLI**: loguea que flags de CLI se usan mas frecuentemente. Esto informa prioridades de documentacion y decisiones de deprecation

## Deployment Checklist

- [ ] Setear el timezone del server a UTC: variable de entorno TZ=UTC. Nunca confies en el timezone default del sistema en codigo de produccion
- [ ] Configurar defaults de locale: setea variables de entorno LANG y LC_ALL. Usa Intl.DateTimeFormat con locale explicito en JavaScript
- [ ] Setear longitud maxima de input: rechaza strings mas largos que el maximo configurado antes de formatear. Previene agotamiento de memoria por inputs oversized
- [ ] Configurar nivel de correccion de errores de QR code: usa nivel M (15% recovery) para uso general, nivel H (30% recovery) para entornos industriales. Niveles mas altos producen codes mas densos
- [ ] Setear limites de argumentos CLI: limita el numero de argumentos y su tamaÃ±o total. getopt y rgparse tienen limites built-in, pero parsers custom necesitan limites explicitos
- [ ] Pinear versiones de librerias: las librerias de fechas y phone cambian frecuentemente. Pinea versiones para evitar breaking changes de updates de timezone database o cambios de formato de locale

## Consideraciones de Seguridad

- **Bypass de control de acceso basado en timezone**: si los checks de control de acceso usan hora local, un cambio de timezone del server puede bypassar restricciones basadas en tiempo. Siempre usa UTC para comparaciones de tiempo security-relevant
- **Bypass de URL encoding**: double-encoding o mixed encoding puede bypassar filtros de seguridad basados en URL. Normaliza URLs con decodeURIComponent y luego re-encodea antes de checks de seguridad
- **Spoofing de phone numbers**: el caller ID spoofing significa que la validacion de phone number no verifica identidad. No uses validacion de formato de phone number como unico factor de autenticacion
- **Phishing via QR codes**: los QR codes pueden encodear URLs maliciosas. Si generas QR codes desde input del usuario, valida la URL target contra una blocklist antes de encodear
- **Predictibilidad de UUID**: UUIDv1 contiene la MAC address y timestamp, lo que leakea info de hardware y permite prediccion. Usa UUIDv4 (random) o UUIDv7 (time-ordered sin MAC) para contextos security-sensitive
- **Inyeccion via parsing de fechas**: algunos parsers de fechas ejecutan codigo arbitrario via format strings (ej. strftime con format controlado por el usuario). Nunca pases input del usuario directamente como format string
- **Bypass de XSS via truncacion**: truncar HTML a un numero fijo de caracteres puede partir tags y crear HTML invalido que bypassa filtros XSS. Trunca en boundaries de tags o usa un parser HTML apropiado
- **Inyeccion de argumentos CLI**: si los argumentos CLI se pasan a subprocess sin escaping apropiado, un atacante puede inyectar shell commands. Usa subprocess.run(args_list) en lugar de shell=True
- **Perdida de precision en formatting de dinero**: convertir entre currencies usando floating-point puede perder precision. Usa Decimal con modos de redondeo explicitos. Loguea todas las conversiones de currency para audit
- **Leak de metadata de phone numbers**: libphonenumber puede revelar el carrier y region de un phone number. No expongas esta metadata a clientes no confiables
- **Inyeccion de contenido en QR codes**: si los QR codes se renderizan desde URLs suministradas por el usuario sin validacion, un atacante puede encodear URIs javascript: o data:. Valida el scheme de la URL antes de la generacion de QR
- **DoS via format strings de fecha**: algunas librerias de formatting de fechas soportan format strings complejas que pueden causar uso excesivo de CPU. Limita la longitud y complejidad del format string en APIs user-facing
## Variantes y Alternativas

- **Intl nativo vs librerias**: Intl.DateTimeFormat, Intl.NumberFormat e Intl.ListFormat estan built-in en runtimes JS modernos. Son 0KB y 2-5x mas rapidos que moment.js o date-fns. Usa librerias solo para math de timezone complejo
- **UUIDv4 vs UUIDv7 vs ULID vs Snowflake**: UUIDv4 es random (bueno para seguridad, malo para indices DB). UUIDv7 es time-ordered (bueno para localidad DB). ULID es lexicograficamente sortable. Snowflake es distribuido y requiere coordinacion
- **Decimal vs centavos enteros vs floating-point**: Decimal es exacto pero lento. Centavos enteros (guardar 199 en lugar de 1.99) es exacto y rapido pero requiere conversion en boundaries. Floating-point es rapido pero con perdida (nunca uses para dinero)
- **Template literals vs concatenacion de strings**: template literals (` Hola  `) son mas legibles y ligeramente mas rapidos en V8. Concatenacion ("Hola " + name) es compatible con runtimes antiguos. Elije basado en el entorno target
- **API URL nativa vs parsing con regex**: 
ew URL(string) parsea URLs correctamente incluyendo edge cases (IPv6, userinfo, caracteres encodeados). Parsing basado en regex pierde edge cases. Siempre usa la API URL nativa para manipulacion de URLs
- **Comparacion de frameworks CLI**: rgparse (Python, stdlib, verbose), click (Python, decorators, clean), 	yper (Python, type hints, modern), commander (Node.js, widely used), yargs (Node.js, feature-rich). Elije basado en complejidad

## Pitfalls Comunes en Produccion

- **Offset de timezone vs nombre de timezone**: +02:00 es un offset que cambia con DST. Europe/Paris es un nombre de timezone que maneja DST automaticamente. Siempre almacena nombres de timezone, no offsets, para eventos recurrentes
- **Confusion de codigos de locale**: en-US vs en_US vs en â€” diferentes librerias esperan diferentes formatos. ICU usa en-US, POSIX usa en_US. Normaliza codigos de locale en el boundary de la aplicacion
- **Modos de redondeo de currency**: ROUND_HALF_UP (banker's rounding) difiere de ROUND_HALF_EVEN (default Python). Sistemas financieros requieren modos de redondeo especificos. Documenta y testea el modo de redondeo explicitamente
- **Colision de UUID en la practica**: la probabilidad de colision de UUIDv4 es despreciable (1 en 2.7x10^36 para 50% de probabilidad). Pero la colision de UUIDv1 puede ocurrir si la MAC address se reusa o el reloj se setea hacia atras. Usa v4 o v7 para seguridad
- **URL encoding de caracteres especiales**: !, ', (, ) son tecnicamente seguros en URLs pero algunos servidores los rechazan. encodeURIComponent los encodea; encodeURI no. Usa encodeURIComponent para valores de query parameters
- **Truncacion con HTML**: truncar HTML por conteo de caracteres puede romper tags. Usa un parser HTML apropiado para truncar en boundaries de tags. Alternativamente, strippa tags HTML antes de truncar para previews de plain-text
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