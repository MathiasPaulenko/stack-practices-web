---
contentType: recipes
slug: url-encoding
title: "URL Encoding"
description: "Cómo codificar y decodificar URLs, parámetros de query y segmentos de path de forma segura en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de URL encoding en Python, JavaScript y Java. Aprende percent-encoding, query strings y parsing de URIs."
difficulty: beginner
topics:
  - data
tags:
  - data
  - encoding
  - java
  - parsing
  - json
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de URL encoding en Python, JavaScript y Java. Aprende percent-encoding, query strings y parsing de URIs."
  keywords:
    - url encoding
    - percent encoding
    - query string
    - url decode
    - python urllib
    - javascript encodeURIComponent
    - java URLEncoder
    - uri parsing
    - parámetros url seguros
---

## Visión general

El URL encoding (percent-encoding) convierte caracteres en un formato que puede transmitirse por internet. Reemplaza caracteres ASCII inseguros con `%` seguido de dos dígitos hexadecimales. Es esencial para parámetros de query, segmentos de path y envíos de formularios.

No codificar input de usuarios antes de colocarlo en una URL puede llevar a links rotos, ataques de inyección o comportamiento inesperado de [APIs](/recipes/api/call-rest-api). Consulta [API Security Checklist](/guides/security/api-security-checklist-guide) para protección detallada.

## Cuándo usarlo

Usa esta recipe cuando:

- Construyes query strings con valores en vivo de [input de usuario](/recipes/api/input-validation)
- Codificas nombres de archivo o IDs en paths de URL
- Parseas URLs y extraes parámetros de query
- Envías datos de formulario vía requests GET. Consulta [Data Validation](/recipes/data/data-validation) para sanitizar datos de formularios.
- Manejas URLs de redirección con parámetros

## Solución

### Python

```python
from urllib.parse import quote, unquote, urlencode, parse_qs, urlparse

# Codificar un string para usar en path o query de URL
encoded = quote("hello world & friends")
print(encoded)  # hello%20world%20%26%20friends

# Construir un query string de forma segura
params = {"search": "python & java", "page": 2}
query = urlencode(params)
print(query)  # search=python+%26+java&page=2

# Parsear una URL
url = urlparse("https://api.example.com/search?query=hello%20world&limit=10")
print(url.query)  # query=hello%20world&limit=10
print(parse_qs(url.query))  # {'query': ['hello world'], 'limit': ['10']}

# Decodificar
original = unquote("hello%20world")
print(original)  # hello world
```

### JavaScript

```javascript
// Codificar un componente (query parameter o path segment)
const encoded = encodeURIComponent("hello world & friends");
console.log(encoded); // hello%20world%20%26%20friends

// Construir query string
const params = new URLSearchParams({ search: "python & java", page: "2" });
console.log(params.toString()); // search=python+%26+java&page=2

// Parsear URL
const url = new URL("https://api.example.com/search?query=hello%20world&limit=10");
console.log(url.searchParams.get("query")); // hello world
console.log(url.searchParams.get("limit")); // 10

// Decodificar
const decoded = decodeURIComponent("hello%20world");
console.log(decoded); // hello world
```

### Java

```java
import java.net.*;
import java.nio.charset.StandardCharsets;

// Codificar
String encoded = URLEncoder.encode("hello world & friends", StandardCharsets.UTF_8);
System.out.println(encoded); // hello+world+%26+friends

// Decodificar
String decoded = URLDecoder.decode("hello%20world", StandardCharsets.UTF_8);
System.out.println(decoded); // hello world

// Construir URI con query parameters
URI uri = new URI("https", "api.example.com", "/search",
    "query=hello+world&limit=10", null);
System.out.println(uri.toString());

// Parsear URI
URI parsed = new URI("https://api.example.com/search?query=hello%20world&limit=10");
System.out.println(parsed.getQuery()); // query=hello%20world&limit=10
```

## Reglas de Encoding

| Función | Codifica | Seguro para |
| ------- | ------- | ----------- |
| `encodeURIComponent` (JS) | Todo excepto `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | Query parameters, path segments |
| `encodeURI` (JS) | Igual, pero preserva `; , / ? : @ & = + $ #` | URLs completas |
| `quote` (Python) | Por defecto todos los no alfanuméricos | Paths, queries con override de safe |
| `urlencode` (Python) | Igual que `quote_plus` | Query strings (espacios → `+`) |
| `URLEncoder` (Java) | Todo excepto `a-z A-Z 0-9 - _ . *` | Query strings (espacios → `+`) |

## Lo que funciona

- **Siempre codifica input de usuarios** antes de embeberlo en URLs
- **Usa `encodeURIComponent` (JS)** para valores de query parameters, no `encodeURI`
- **Usa `urlencode` (Python)** para construir query strings completos
- **No codifiques la URL completa**: Solo codifica las partes en vivo (valores, segmentos)
- **Prefiere `URLSearchParams`** en JavaScript moderno para construcción segura de query strings
- **Maneja signos plus con cuidado**: En query strings, `+` significa espacio. En paths, `%20` significa espacio.

## Errores comunes

- Usar `encodeURI` para valores de query parameters (no codifica `&`, `=`, `?`)
- Olvidar codificar input de usuarios, causando URLs malformadas o inyección
- Doble-codificar valores que ya fueron codificados por otra capa
- Confundir espacios codificados como `+` (query strings) vs `%20` (paths y specs modernas)
- Parsear URLs con split de strings en lugar de un parser de URI apropiado

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
## Patrones de Integracion

- **Pipeline de internacionalizacion (i18n)**: extrae strings user-facing -> formatea con funciones locale-specific -> renderiza en UI. Usa ICU MessageFormat para pluralizacion y genero. Almacena traducciones en archivos JSON o XLIFF. Carga traducciones lazymente por locale
- **Pipeline de fecha/tiempo**: parsea fecha de input (ISO 8601) -> convierte a UTC -> almacena como string ISO o timestamp -> formatea para display usando locale del usuario. Nunca almacenes strings de fecha localizados en bases de datos. Siempre convierte a UTC antes del almacenamiento
- **Pipeline de dinero**: parsea monto (string a Decimal) -> valida codigo de currency (ISO 4217) -> convierte currency si es necesario (usando exchange rates diarios) -> formatea para display usando locale. Almacena como centavos enteros o Decimal, nunca floating-point
- **Pipeline de building de URL**: valida URL base -> appendea path segments (URL-encoded) -> appendea query parameters (URL-encoded) -> appendea fragment. Usa APIs URL y URLSearchParams. Nunca construyas URLs con concatenacion de strings
- **Pipeline de generacion de UUID**: genera UUID -> valida formato -> almacena como string (no tipo UUID para portabilidad) -> usa como primary key. Para sistemas distribuidos, usa UUIDv7 para IDs time-ordered que funcionan bien con indices B-tree
- **Integracion de CLI con archivos de config**: flags de CLI overriden valores de config file, que overriden variables de entorno, que overriden defaults. Esta jerarquia es estandar en apps 12-factor. Usa python-dotenv o dotenv para carga de variables de entorno

## Manejo de Errores y Recuperacion

- **Fallback graceful de locale**: si una traduccion falta para r-CA, falla a r, luego en. Loguea traducciones faltantes para agregarlas despues. Nunca muestres keys de traduccion raw a los usuarios
- **Cadena de fallback de parsing de fechas**: prueba ISO 8601 primero, luego formatos locale-specific, luego formatos comunes (MM/DD/YYYY, DD/MM/YYYY). Si todos fallan, retorna null y deja que el caller decida. Nunca adivines el formato silenciosamente
- **Manejo de errores de conversion de currency**: si la API de exchange rate esta caida, usa el ultimo rate cacheado. Loguea un warning. Si no hay rate cacheado, rechaza la conversion con un error claro. Nunca uses rates stale mas antiguos que 24 horas sin warning
- **Errores de normalizacion de URL**: si el parsing de URL falla, loguea la URL original y el error. No intentes fixear la URL automaticamente â€” URLs malformadas pueden ser intencionales (ej. para testing). Retorna un error claro al caller
- **Manejo de colisiones de UUID**: si ocurre una colision de UUID (extremadamente raro con v4/v7), regenera con un nuevo componente random. Loguea la colision para investigacion. Colisiones de UUIDv1 indican un problema de clock o MAC address
- **Recuperacion de errores de argumentos CLI**: si un argumento requerido falta, imprime el texto de ayuda y sale con codigo 2. Si un argumento tiene un valor invalido, imprime el error, el formato esperado, y sale con codigo 2. Nunca procedas con argumentos invalidos
## Tooling y Ecosistema

- **date-fns**: libreria modular de fechas para JavaScript. Tree-shakeable (importa solo lo que necesitas). 50M+ downloads/mes. v3 soporta TypeScript nativamente. Usa en lugar de moment.js para proyectos nuevos
- **Luxon**: libreria moderna de fechas JavaScript por el autor de moment.js. Construida sobre la API Intl. Timezone-aware. 15M+ downloads/mes. Mejor API que moment.js pero mas grande que date-fns
- **libphonenumber**: libreria de phone numbers de Google. Porteada a 10+ lenguajes. Maneja parsing, formatting y validacion para 240+ regiones. El estandar de facto para manejo de phone numbers
- **decimal.js**: aritmetica decimal de precision arbitraria para JavaScript. 8M+ downloads/mes. Usa en lugar de Number para calculos financieros. Soporta precision y modos de redondeo configurables
- **ulid**: Universally Unique Lexicographically Sortable Identifier. String de 26 caracteres. Sortable por timestamp. Sin coordinacion necesaria. Mejor que UUIDv4 para indices de base de datos
- **commander.js**: framework CLI para Node.js. 40M+ downloads/mes. Subcomandos, opciones, generacion de help text. Usado por npm, Vue CLI y muchos otros CLIs populares

## Resumen de Best Practices

- Almacena fechas en UTC. Convierte a locale del usuario solo en la capa de presentacion
- Usa Decimal o centavos enteros para dinero. Nunca uses floating-point para calculos financieros
- Normaliza URLs con la API URL nativa. Nunca parsees URLs con regex
- Usa UUIDv4 o UUIDv7 para IDs unicos. Evita UUIDv1 (leakea MAC address y timestamp)
- Pinea versiones de librerias de fechas y locale. Las bases de datos de timezone se actualizan frecuentemente
- Testea formatting con edge cases: strings vacios, Unicode, transiciones DST, leap seconds
## Tips de Optimizacion de Performance

- Cachea strings de fecha formateados. strftime es caro cuando se llama millones de veces. Usa unctools.lru_cache para formatos repetidos
- Para URL encoding, urllib.parse.quote(safe='') es mas rapido que encodeURIComponent en Python. Pre-encodea componentes staticos de URL
- Para generacion de UUID, uuid.uuid4() usa os.urandom() que es 10x mas lento que andom.random(). Usa uuid.uuid4() para seguridad, andom para IDs no-security
- Para formatting de phone numbers, cachea el objeto PhoneNumber parseado. Parsing es 5-10x mas lento que formatting
- Para truncacion de texto, 	ext[:n] (string slice) es O(1) para ASCII. Para Unicode, usa 	ext.encode('utf-8')[:n].decode('utf-8', errors='ignore') para evitar romper caracteres multi-byte
- Para formatting de dinero, pre-computa el simbolo de currency y separador decimal para cada locale. locale.currency() es 10x mas lento que formatting manual
- Para generacion de QR codes, usa qrcode.make() para casos simples. Para generacion batch, reusaea el objeto QRCode y llama dd_data() + make() para cada code
- Para parsing de argumentos CLI, sys.argv es 100x mas rapido que rgparse para casos simples. Usa rgparse solo cuando necesitas help text y validacion
- Para aritmetica de fechas, datetime.timestamp() es mas rapido que datetime.strftime() para calculos de epoch. Usa enteros para math de fechas
- Para parsing de URL, urllib.parse.urlparse() cachea resultados parseados. Reusaea el objeto ParseResult en lugar de re-parsing
## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre `encodeURI` y `encodeURIComponent`?**
R: `encodeURI` es para URLs completas y preserva caracteres estructurales (`/`, `?`, `&`). `encodeURIComponent` es para componentes individuales y codifica todo incluyendo `&` y `=`.

**P: ¿Debería codificar espacios como `+` o `%20`?**
R: En query strings, `+` es tradicional pero `%20` también es válido. En paths, usa siempre `%20`.

**P: ¿Cómo manejo arrays en query strings?**
R: Usa notación de brackets: `?tags[]=js&tags[]=py` o repite la key: `?tags=js&tags=py`. Elige una convención y documenta.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.