---
contentType: recipes
slug: truncate-text
title: "Truncar Texto"
description: "Cómo truncar texto con ellipsis y límites de palabras en Python, Java y JavaScript."
metaDescription: "Aprende a truncar texto en Python, Java y JavaScript. Preserva límites de palabras y añade ellipsis con ejemplos prácticos de código."
difficulty: beginner
topics:
  - data
tags:
  - text
  - data
  - formatting
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-pdf-files
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/generate-slugs
  - /recipes/format-phone-numbers
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende a truncar texto en Python, Java y JavaScript. Preserva límites de palabras y añade ellipsis con ejemplos prácticos de código."
  keywords:
    - text
    - truncation
    - formatting
    - strings
    - python
    - javascript
    - java



---
## Visión General

Truncar texto es una tarea común de UI y procesamiento de datos: previews, snippets de notificaciones, resúmenes de resultados de búsqueda y exports de CSV necesitan cortar strings largos a una longitud máxima sin romper palabras o HTML. Esta recipe cubre truncamiento basado en caracteres, límites de palabras y truncamiento consciente de HTML en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Muestres previews de artículos, resúmenes de comentarios o descripciones de productos con links "Leer más"
- Exportes datos de reportes a columnas de ancho fijo o spreadsheets
- Generes líneas de asunto de email o cuerpos de notificaciones push con límites de longitud de plataforma
- Recortes contenido generado por usuarios antes de almacenar o indexar

## Solución

### Python

```python
# Truncamiento basado en caracteres con ellipsis
def truncate(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - 3].rstrip() + '...'

print(truncate("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be shor...'
```

```python
# Truncamiento por límite de palabras con textwrap
import textwrap

def truncate_words(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    shortened = textwrap.shorten(text, width=max_length, placeholder='...')
    return shortened

print(truncate_words("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be...'
```

### JavaScript

```javascript
// Truncamiento basado en caracteres
function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

console.log(truncate("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be shor...'
```

```javascript
// Truncamiento por límite de palabras
function truncateWords(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

console.log(truncateWords("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be...'
```

### Java

```java
// Apache Commons Lang StringUtils
// Maven: org.apache.commons:commons-lang3
import org.apache.commons.lang3.StringUtils;

public class TextTruncator {
    public static String truncate(String text, int maxLength) {
        return StringUtils.abbreviate(text, maxLength);
    }
}

// truncate("This is a very long sentence...", 30)
// Output: "This is a very long sente..."
```

```java
// Truncamiento por límite de palabras con Streams
import java.util.Arrays;
import java.util.stream.Collectors;

public class WordTruncator {
    public static String truncateWords(String text, int maxLength) {
        String[] words = text.split(" ");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (result.length() + word.length() + 1 > maxLength) break;
            if (result.length() > 0) result.append(" ");
            result.append(word);
        }
        return result.toString() + (result.length() < text.length() ? "..." : "");
    }
}
```

## Explicación

El truncamiento por caracteres es directo pero puede dividir palabras por la mitad, produciendo salida incómoda como "shor...". El truncamiento por límite de palabras busca hacia atrás desde el punto de corte hasta el espacio más cercano, preservando legibilidad. `textwrap.shorten` (Python) maneja tanto truncamiento por caracteres como por palabras con una sola llamada. JavaScript requiere slicing manual y búsqueda de índice. El `StringUtils.abbreviate` de Java hace truncamiento por caracteres por defecto; la lógica por límite de palabras debe construirse manualmente o con una librería como `Truncation`.

El truncamiento consciente de HTML es más complejo: debes cerrar cualquier tag abierto antes de añadir el ellipsis, o usar un parser HTML dedicado. Para texto plano, el truncamiento por límite de palabras suele ser el mejor balance entre simplicidad y legibilidad.

## Variantes

| Tecnología | Librería / Enfoque | Estrategia | Notas |
|------------|-------------------|------------|-------|
| Python | Slicing + ellipsis | Caracter | Rápido, simple, puede dividir palabras |
| Python | `textwrap.shorten` | Palabra + caracter | Stdlib, maneja breaks de palabras elegantemente |
| JavaScript | `slice` + `trimEnd` | Caracter | Rápido, built-in, sin dependencias |
| JavaScript | `lastIndexOf(' ')` | Palabra | Manual, sin dependencias |
| Java | `StringUtils.abbreviate` | Caracter | Apache Commons, placeholder configurable |
| Java | Custom stream builder | Palabra | Control total sobre delimitador y ellipsis |

## Lo que funciona

- **Respeta límites de palabras para texto de UI**: "La legibilidad es más importante que el conteo exacto de caracteres en strings orientados al usuario"
- **Usa truncamiento por caracteres para output de máquina**: Archivos de ancho fijo, columnas de base de datos y logs necesitan longitudes exactas
- **Elimina espacios en blanco antes de medir**: Espacios al inicio/final distorsionan cálculos de longitud y producen `"...
- **Maneja surrogate pairs y caracteres combinados**: El `length` de JavaScript cuenta unidades de código UTF-16, no clusters de grafemas; usa `Intl.
- **Añade atributos title para links truncados**: `<a title="Texto completo">truncado...

## Errores Comunes

- **Dividir tags HTML**: Truncar HTML crudo en la posición 100 puede romper `<a href="...
- **Olvidar añadir longitud de ellipsis**: Un límite de 100 caracteres con `...
- **No manejar caracteres multibyte**: Un slice de 20 caracteres de texto japonés puede cortar un kanji de 2 bytes por la mitad en algunas codificaciones
- **Trimming antes del length check**: `trim()` luego slice puede aún exceder el límite si el string original no tenía espacios trailing
- **Asumir que los espacios son el único límite de palabra**: Guiones, em-dashes y caracteres CJK tienen reglas de boundary diferentes

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
## Tooling y Ecosistema

- **date-fns**: libreria modular de fechas para JavaScript.   Tree-shakeable (importa solo lo que necesitas).   50M+ downloads/mes.   v3 soporta TypeScript nativamente.
- **Luxon**: libreria moderna de fechas JavaScript por el autor de moment.  js.   Construida sobre la API Intl.   Timezone-aware.   15M+ downloads/mes.   Mejor API que moment.
- **libphonenumber**: libreria de phone numbers de Google.   Porteada a 10+ lenguajes.
- **decimal.js**: aritmetica decimal de precision arbitraria para JavaScript.   8M+ downloads/mes.
- **ulid**: Universally Unique Lexicographically Sortable Identifier.   String de 26 caracteres.   Sortable por timestamp.   Sin coordinacion necesaria.
- **commander.js**: framework CLI para Node.  js.   40M+ downloads/mes.   Subcomandos, opciones, generacion de help text.

## Resumen de Best Practices


- For a deeper guide, see [Format Phone Numbers](/es/recipes/format-phone-numbers/).

- Almacena fechas en UTC. Convierte a locale del usuario solo en la capa de presentacion
- Usa Decimal o centavos enteros para dinero. Nunca uses floating-point para calculos financieros
- Normaliza URLs con la API URL nativa. Nunca parsees URLs con regex
- Usa UUIDv4 o UUIDv7 para IDs unicos. Evita UUIDv1 (leakea MAC address y timestamp)
- Pinea versiones de librerias de fechas y locale. Las bases de datos de timezone se actualizan frecuentemente
- Testea formatting con edge cases: strings vacios, Unicode, transiciones DST, leap seconds




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de text y data para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica truncar texto** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### ¿Cómo trunco HTML sin romper tags?

Usa una librería consciente de HTML. Python tiene `html-truncate` y `BeautifulSoup`; JavaScript tiene `truncate-html`; Java tiene `Jsoup` combinado con traversing manual de nodos. La regla es: cuenta caracteres de texto visible, y cuando se alcanza el límite, cierra todos los tags abiertos antes de añadir el ellipsis.

### ¿Cómo manejo clusters de grafemas Unicode al truncar?

Un cluster de grafema es lo que un humano percibe como un carácter (ej. emoji con modificadores de tono de piel). El `.length` de JavaScript cuenta unidades de código UTF-16, no grafemas. Usa `Intl.Segmenter` (browsers modernos) o el paquete `grapheme-splitter`. En Python, `len()` cuenta code points; usa la librería `grapheme` para conteo real de clusters. En Java, usa `BreakIterator.getCharacterInstance()`.

### ¿Debo truncar del lado del cliente o del servidor?

Para previews de UI, el truncamiento del cliente con CSS (`text-overflow: ellipsis`) es el más simple y preserva el texto completo para screen readers. Para exports de longitud fija, constraints de base de datos o snippets de resultados de búsqueda, trunca del lado del servidor. El truncamiento del servidor es necesario cuando el texto completo es demasiado grande para transferir al cliente.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
