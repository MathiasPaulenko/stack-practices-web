---
contentType: recipes
slug: url-encoding-decoding
title: "Codificacion y Decodificacion de URLs"
description: "Domina la codificacion de URLs en JavaScript y otros lenguajes con encodeURI, encodeURIComponent, manejo de plus-safe, cumplimiento RFC 3986 y casos edge de decodificacion"
metaDescription: "Domina la codificacion de URLs en JavaScript con encodeURI, encodeURIComponent, cumplimiento RFC 3986, manejo plus-safe y casos edge de decodificacion."
difficulty: beginner
topics:
  - data
  - frontend
tags:
  - encoding
  - javascript
  - frontend
  - data
  - parsing
relatedResources:
  - /recipes/go-rest-api-gin
  - /recipes/data-validation-zod
  - /recipes/javascript-event-loop
  - /recipes/server-side-rendering
  - /recipes/websockets-realtime
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Domina la codificacion de URLs en JavaScript con encodeURI, encodeURIComponent, cumplimiento RFC 3986, manejo plus-safe y casos edge de decodificacion."
  keywords:
    - url encoding
    - encodeURIComponent
    - RFC 3986
    - percent encoding
    - query parameters




---
Codifica URLs y componentes URI correctamente para manejar caracteres especiales, espacios y Unicode de forma segura en browsers, servidores y APIs. Esta recipe cubre `encodeURI`, `encodeURIComponent`, cumplimiento RFC 3986, codificacion de form data y casos edge de decodificacion.

## Cuando Usar Esto

- Construyendo query strings desde [input de usuario](/recipes/api/input-validation) o datos en vivo
- Generando URLs con caracteres especiales, espacios o texto non-ASCII
- Parseando y recodificando URLs de [fuentes externas](/recipes/api/call-rest-api) de forma segura

## Solucion

### 1. encodeURI vs encodeURIComponent

```typescript
// encoding/UriComparison.ts
const url = 'https://example.com/search?q=hello world&sort=date';

// encodeURI: preserva caracteres de estructura de URL
encodeURI(url);
// 'https://example.com/search?q=hello%20world&sort=date'

// encodeURIComponent: codifica todo incluyendo caracteres de estructura
encodeURIComponent(url);
// 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26sort%3Ddate'

// Regla general:
// - encodeURI para URLs completas
// - encodeURIComponent para parametros de query individuales
```

### 2. Construccion Segura de Query Strings

```typescript
// encoding/QueryBuilder.ts
function buildQueryString(params: Record<string, string | number>): string {
  const pairs = Object.entries(params).map(([key, value]) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  });

  return pairs.join('&');
}

const query = buildQueryString({
  search: 'hello world',
  filter: 'type=news&date=today',
  emoji: '🔥',
});
// 'search=hello%20world&filter=type%3Dnews%26date%3Dtoday&emoji=%F0%9F%94%A5'
```

### 3. Decodificacion con Manejo de Casos Edge

```typescript
// encoding/SafeDecode.ts
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};

  query.replace(/^\?/, '').split('&').forEach((pair) => {
    const [key, value] = pair.split('=').map(safeDecodeURIComponent);
    if (key) params[key] = value || '';
  });

  return params;
}
```

### 4. API URLSearchParams

```typescript
// encoding/URLSearchParams.ts
const params = new URLSearchParams();

params.append('search', 'hello world');
params.append('tags', 'javascript');
params.append('tags', 'typescript');

params.toString();
// 'search=hello+world&tags=javascript&tags=typescript'

// Parsing
const url = new URL('https://example.com/?search=hello+world&tags=js&tags=ts');
url.searchParams.get('search');     // 'hello world'
url.searchParams.getAll('tags');    // ['js', 'ts']
url.searchParams.has('limit');     // false
```

### 5. Cumplimiento RFC 3986

```typescript
// encoding/RFC3986.ts
function encodeRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function decodeRFC3986(str: string): string {
  return decodeURIComponent(str.replace(/\+/g, ' '));
}
```

### 6. Codificacion en Go

```go
// encoding/url.go
package main

import (
    "fmt"
    "net/url"
)

func main() {
    fmt.Println(url.QueryEscape("hello world"))  // hello+world
    fmt.Println(url.PathEscape("hello world"))   // hello%20world

    u := &url.URL{Scheme: "https", Host: "example.com", Path: "/search"}
    q := u.Query()
    q.Set("q", "hello world")
    u.RawQuery = q.Encode()
    fmt.Println(u.String())
    // https://example.com/search?q=hello+world
}
```

## Como Funciona

- **encodeURI** codifica caracteres especiales pero preserva delimitadores de URL
- **encodeURIComponent** codifica todo incluyendo delimitadores, haciendolo seguro para valores de query parameters
- **URLSearchParams** maneja plus signs, duplicate keys y codificacion round-trip automaticamente
- **RFC 3986** define que caracteres deben ser percent-encoded en cada componente de URI

## Consideraciones de Produccion

- Siempre codifica input de usuario antes de colocarlo en URLs
- Usa APIs `URL` y `URLSearchParams` cuando esten disponibles para correccion
- Maneja input malformed gracefulmente con try-catch alrededor de `decodeURIComponent`

## Errores Comunes

- Usar `encodeURI` en valores de query parameters, que deja `&` y `=` sin codificar
- No decodificar input antes de validacion, permitiendo que valores double-encoded evaden [checks](/recipes/data/data-validation)
- Asumir que `+` en URLs siempre significa espacio; depende del contexto (query vs path)

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

**P: Por que `+` a veces decodifica a espacio?**
R: En query strings, `+` es una codificacion legacy para espacio (application/x-www-form-urlencoded). En paths de URL, `+` significa plus literal y el espacio debe ser `%20`.

**P: Deberia usar `escape()`?**
R: No. `escape()` esta deprecado, no es standard e incorrectamente maneja caracteres non-ASCII. Siempre usa `encodeURIComponent`.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.





## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de encoding y javascript para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica codificacion y decodificacion de urls** cuando necesites una solución práctica para tu caso de uso.
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
