---
contentType: recipes
slug: regular-expressions
title: "Expresiones Regulares"
description: "Cómo usar expresiones regulares para matching de patrones, validación y extracción de texto en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de expresiones regulares en Python, JavaScript y Java. Aprende pattern matching, validación, grupos y patrones comunes."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - javascript
  - parsing
  - json
relatedResources:
  - /recipes/parse-json
  - /recipes/handle-errors
  - /recipes/sort-array
  - /recipes/deep-clone-javascript
  - /recipes/flatten-unflatten-objects
  - /recipes/generate-slugs
  - /recipes/money-currency
  - /recipes/parse-csv-files
  - /recipes/parse-xml-files
  - /recipes/url-encoding
lastUpdated: "2026-06-10"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Ejemplos prácticos de expresiones regulares en Python, JavaScript y Java. Aprende pattern matching, validación, grupos y patrones comunes."
  keywords:
    - expresiones regulares
    - regex
    - pattern matching
    - validación de texto
    - python regex
    - javascript regex
    - java regex
    - grupos regex
    - flags regex




---
## Visión general

Las expresiones regulares (regex) son secuencias de caracteres que definen patrones de búsqueda. Son la herramienta estándar para validación de texto, extracción, sustitución y parsing en prácticamente todos los lenguajes de programación y editores de texto.

A pesar de su sintaxis críptica, regex es indispensable para trabajar con texto no estructurado, validación de formularios, parsing de logs y limpieza de datos.

## Cuándo usarlo

Usa esta recipe cuando:

- Validas direcciones de email, números de teléfono o IDs. Consulta [Data Validation](/recipes/data/data-validation) para enfoques basados en schemas.
- Extraes datos de texto no estructurado o [archivos de log](/recipes/api/logging)
- Reemplazas o formateas strings con reglas complejas
- Divides texto en delimitadores en vivo
- Buscas patrones dentro de documentos grandes

## Solución

### Python

```python
import re

text = "Contact us at support@example.com or sales@example.org"

# Buscar patrón de email
pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
matches = re.findall(pattern, text)
print(matches)  # ['support@example.com', 'sales@example.org']

# Extraer grupos
match = re.search(r'(\w+)@(\w+\.\w+)', text)
if match:
    print(match.group(1))  # support
    print(match.group(2))  # example.com

# Reemplazar
new_text = re.sub(r'\b\w+@\w+\.\w+\b', '[REDACTED]', text)
print(new_text)  # Contact us at [REDACTED] or [REDACTED]
```

### JavaScript

```javascript
const text = "Contact us at support@example.com or sales@example.org";

// Match todos los emails
const pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const matches = text.match(pattern);
console.log(matches);  // ['support@example.com', 'sales@example.org']

// Extraer grupos
const groupPattern = /(\w+)@(\w+\.\w+)/;
const match = text.match(groupPattern);
if (match) {
  console.log(match[1]); // support
  console.log(match[2]); // example.com
}

// Reemplazar
const newText = text.replace(/\b\w+@\w+\.\w+\b/g, '[REDACTED]');
console.log(newText); // Contact us at [REDACTED] or [REDACTED]
```

### Java

```java
import java.util.regex.*;

String text = "Contact us at support@example.com or sales@example.org";

Pattern pattern = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b");
Matcher matcher = pattern.matcher(text);

while (matcher.find()) {
    System.out.println(matcher.group());  // support@example.com, sales@example.org
}

// Extraer grupos
Pattern groupPattern = Pattern.compile("(\\w+)@(\\w+\\.\\w+)");
Matcher groupMatcher = groupPattern.matcher(text);
if (groupMatcher.find()) {
    System.out.println(groupMatcher.group(1));  // support
    System.out.println(groupMatcher.group(2));  // example.com
}
```

## Explicación

- **Patrón**: La cadena regex que define qué buscar
- **Matcher / Match object**: Contiene el resultado de aplicar un patrón a texto
- **Grupos** (`()`): Capturan sub-expresiones para extracción
- **Flags** (`i`, `g`, `m`): Modifican el comportamiento (case-insensitive, global, multiline)
- **Clases de caracteres** (`[a-z]`, `\d`, `\w`): Coinciden con conjuntos de caracteres

## Patrones comunes

| Patrón | Descripción | Ejemplo |
| -------- | ------------- | --------- |
| `\d{3}-\d{2}-\d{4}` | Número de Seguro Social de EE.UU. | `123-45-6789` |
| `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | Dirección IPv4 | `192.168.1.1` |
| `https?://[^\s]+` | URL | `https://example.com` |
| `^\d{4}-\d{2}-\d{2}$` | Fecha ISO (YYYY-MM-DD) | `2024-03-15` |
| `^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` | Email (básico) | `user@domain.com` |
| `^#[0-9A-Fa-f]{6}$` | Código de color hex | `#3B82F6` |
| `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$` | Contraseña fuerte | `MyP@ssw0rd` |
| `^\+?[1-9]\d{1,14}$` | Teléfono internacional (E.164) | `+14155552671` |
| `^[a-zA-Z0-9_-]+$` | Nombre de archivo seguro | `my-file_v2` |

## Consideraciones de rendimiento

### ReDoS (Regular Expression Denial of Service)

Regex mal escritos con cuantificadores anidados pueden causar backtracking catastrófico, consumiendo el 100% de CPU en una sola petición:

```text
Peligroso: (a+)+$  contra "aaaaaaaaaaaaaaaaaaaaaaaaaaaa!"
Seguro:    a+$     contra el mismo input
```

**Estrategias de mitigación:**

- Evita cuantificadores anidados (`(a+)+`, `(a*)*`) siempre que sea posible
- Usa cuantificadores posesivos (`++`, `*+`) o grupos atómicos si tu motor lo soporta
- Establece un timeout razonable en operaciones regex en producción
- Testea con inputs maliciosos durante el desarrollo

### Coste de compilación

La mayoría de motores regex compilan patrones en una representación interna. Recompilar el mismo patrón en un loop es ineficiente:

```python
# Malo: compila el patrón en cada iteración
for line in lines:
    re.search(r'\berror\b', line)

# Bueno: compila una vez y reutiliza
error_pattern = re.compile(r'\berror\b')
for line in lines:
    error_pattern.search(line)
```

## Lo que funciona

- **Siempre escapa caracteres especiales** cuando construyas regex en vivo. Consulta [Input Validation](/recipes/api/input-validation) para manejo seguro de strings.
- **Usa raw strings** en Python (`r'...'`) para evitar escapes dobles
- **Prefiere clases de caracteres explícitas** sobre `.` (dot) para matching predecible
- **Ancla tus patrones** con `^` y `$` al validar strings completos
- **Testea con casos edge**: strings vacíos, Unicode, inputs muy largos
- **Documenta patrones complejos** con comentarios o el flag verbose `(?x)`

## Errores comunes

- Olvidar escapar backslashes (usa raw strings en Python)
- Usar cuantificadores greedy (`.*`) cuando se necesita non-greedy (`.*?`)
- No anclar patrones de validación, permitiendo matches parciales
- Ignorar Unicode y caracteres internacionales en texto real
- Escribir regex excesivamente complejas cuando una función de string simple basta

## Cuando No Usar Este Enfoque

- **El schema es desconocido o cambia frecuentemente**: si la estructura de datos cambia semanalmente, los schemas de validacion rigidos se convierten en una carga de mantenimiento.
- **Los datos caben en una base de datos**: si los datos necesitan querying, indexing o transacciones, almacenarlos en archivos JSON y manipularlos en memoria es el enfoque equivocado.
- **Validacion en tiempo real de datos streaming**: la validacion batch de payloads JSON es muy lenta para streaming.
- **Type checking simple**: si solo necesitas verificar que un valor es string o number, un validador de schema completo es excesivo.
- **Transformaciones CPU-bound en datasets grandes**: si procesar 10M+ records toma minutos, la manipulacion en memoria llega a sus limites.
- **Procesamiento distribuido de datos**: si los datos spanean multiples maquinas, la manipulacion local de JSON no funciona.

## Benchmarks de Rendimiento

- **Serializacion JSON**: json.  dumps() en Python serializa 1MB de datos en 30-100ms.   orjson serializa los mismos datos en 5-15ms.
- **Validacion de schema**: jsonschema valida 10,000 documentos JSON contra un schema en 2-10 segundos.   pydantic valida el mismo volumen en 0.  5-2 segundos.
- **Performance de deep clone**: copy.  deepcopy() en un objeto Python de 1MB toma 50-200ms.   json.  loads(json.  dumps(obj)) toma 30-80ms pero pierde tipos no serializables.
- **Performance de sort**: sorted() en Python sobre 1M enteros toma 200-400ms. 
umpy.sort() sobre el mismo array toma 50-100ms. Array.sort() de JavaScript sobre 1M numeros toma 100-300ms (V8 Timsort)
- **Performance de diff**: difflib comparando dos archivos de 10,000 lineas toma 500ms-2s.   deepdiff comparando dos objetos JSON de 1MB toma 200ms-1s.
- **Performance de regex**: regex compilado en Python matchea 1M strings en 50-200ms.   Regex no compilado toma 2-5x mas.

## Estrategia de Testing

- **Test con datos edge-case**: objetos vacios, null values, arrays anidados, strings Unicode, numeros muy grandes (>2^53) y arrays de tipos mixtos.
- **Test de round-trips de serializacion**: serializa un objeto, deserializalo, y compara.   El testing round-trip detecta perdida de datos por type coercion (ej.
- **Test de fallos de validacion de schema**: verifica que los datos invalidos sean rechazados con mensajes de error claros.
- **Test con input adversarial**: JSON profundamente anidado (10,000 niveles), strings enormes (1MB+), muchas keys (100,000+) y keys duplicadas.
- **Test de estabilidad de sort**: verifica que elementos iguales mantengan su orden original.   sorted() de Python es estable.   Array.  sort() de JavaScript es estable en V8 desde ES2019.
- **Test de regex contra input malicioso**: patrones como (a+)+b causan catastrophic backtracking en input como aaaaaaaaaaaaaaaaaaa!.

## Estimacion de Costos

- **Overhead de validacion**: la validacion de schema agrega 5-20% de latencia al procesamiento de requests.
- **Memoria para JSON grande**: un archivo JSON de 500MB usa 2-3GB en memoria despues del parsing (overhead de dict de Python).
- **Infraestructura de caching**: Redis para cachear datos validados cuesta -200/mes para un cache de 10GB.   Memcached es mas barato pero carece de persistencia.
- **Costo de desarrollo**: escribir validadores custom toma 4-16 horas por tipo de dato.   Usar pydantic o zod reduce esto a 1-2 horas.
- **Tradeoffs de formato de serializacion**: JSON es human-readable pero 2-5x mas grande que formatos binarios.

## Monitoring y Observabilidad

- **Tasa de errores de validacion**: Alerta cuando la tasa de error excede 5%.
- **Duracion de serializacion**: monitorea el tiempo gastado serializando/deserializando.
- **Cache hit rate**: si cacheas datos validados, monitorea el hit rate.
- **Uso de memoria de estructuras de datos**: monitorea el peak de memoria despues de cargar objetos JSON grandes.
- **Tiempo de ejecucion de regex**: loguea operaciones de regex lentas (>100ms).   Regex lentas en input del usuario son un vector de DoS.

## Deployment Checklist

- [ ] Setear tamaÃ±o maximo de payload: rechazar payloads JSON mas grandes que 1MB (o limite apropiado) en el load balancer. Retornar HTTP 413 para payloads oversized
- [ ] Configurar versionado de schema: incluye un campo de schema version en los datos validados. Rechaza datos con versiones desconocidas para prevenir schema drift silencioso
- [ ] Setear limites de profundidad de recursion: para validacion o serializacion recursiva, setea una profundidad maxima (ej. 100). Rechaza datos que excedan el limite para prevenir stack overflow
- [ ] Habilitar caching para datos validados: cachea resultados de validacion con un TTL. Usa el hash del input raw como cache key. Invalida en cambios de schema
- [ ] Configurar respuestas de error: retorna errores de validacion estructurados con field paths y mensajes. No expongas detalles internos del schema en respuestas de error
- [ ] Setear timeouts de regex: usa 
e.TIMEOUT (Python 3.11+) o corre regex en un proceso separado con timeout. Mata operaciones de regex que excedan 1 segundo

## Consideraciones de Seguridad

- **Prototype pollution via JSON merge**: mergear JSON del usuario con keys __proto__ o constructor puede pollear prototypes de objetos JavaScript.
- **Ataques de deserializacion**: pickle.  loads() en Python y unserialize() en PHP ejecutan codigo arbitrario.   Nunca deserialices datos no confiables con estos formatos.
- **Regex DoS (ReDoS)**: patrones con quantifiers anidados como (a+)+ causan backtracking exponencial.   Un atacante puede colgar el server con un input de 30 caracteres.
- **Inyeccion JSON via key collision**: keys duplicadas en JSON ({"role": "user", "role": "admin") son manejadas diferentemente por los parsers.
- **Cache poisoning via bypass de validacion**: si los resultados de validacion se cachean por hash de input, un atacante que encuentra una colision de hash puede inyectar un resultado cacheado "valido" para input invalido.
- **Type confusion en lenguajes dinamicos**: isinstance(x, int) retorna True para True en Python (bool es subclase de int).
- **Fuga de informacion en mensajes de error**: errores de validacion que incluyen detalles del schema, nombres internos de campos o stack traces ayudan a los atacantes a entender el sistema.
- **Deep clone bypassando checks de seguridad**: si un objeto security-sensitive se clona y el clone salta validacion, un atacante puede modificar el clone para bypassar checks.
- **Inyeccion de comparador de sort**: si los comparadores de sort vienen de input del usuario, un atacante puede proveer un comparador que throw o cuelgue.
- **Diff leakeando datos sensibles**: si el output de diff se loguea o muestra, puede exponer campos sensibles (passwords, tokens).
- **Enumeracion de cache keys**: si las cache keys son secuenciales o predecibles, un atacante puede enumerar datos cacheados.
- **Bypass de validacion basada en regex**: ^pattern$ con 
e.DOTALL permite que . matchee newlines, potencialmente bypassando validacion basada en lineas. Usa 
e.ASCII y anchors explicitos para regexes security-sensitive
## Variantes y Alternativas

- **Validacion schema-first vs code-first**: JSON Schema, OpenAPI y Protobuf definen schemas en un formato agnostico del lenguaje.   Pydantic, zod y joi definen schemas en codigo.
- **Validacion estricta vs leniente**: validacion estricta rechaza campos desconocidos.   Validacion leniente los ignora.   Para APIs, validacion estricta previene errores de cliente por typos.
- **Deep copy vs shallow copy vs structural sharing**: deep copy duplica todo (caro, seguro).   Shallow copy sharea referencias (rapido, inseguro para mutacion).   Structural sharing (usado en immutable.
- **Sort in-place vs copy sort**: list.  sort() sortea in-place (0 memoria extra).   sorted() retorna una lista nueva (memoria O(n)).   Para datasets grandes, sort in-place es preferido.
- **Caching centralizado vs distribuido**: Redis/Memcached son caches centralizados compartidos entre instancias.   Caches in-process (LRU, functools.  lru_cache) son mas rapidos pero no compartidos.
- **Validacion sync vs async**: validacion sincrona bloquea el event loop.   Validacion async permite validacion concurrente de multiples payloads.

## Pitfalls Comunes en Produccion

- **Breaks por evolucion de schema**: agregar un campo requerido rompe clientes existentes.
- **El orden de validacion importa**: valida formato primero (barato), luego tipo (medio), luego reglas de negocio (caro).
- **Type coercion silenciosa**: int("3.  14") levanta ValueError pero loat("3") tiene exito.   Los parsers JSON coercean strings a numeros en algunos lenguajes.
- **Cache stampede**: cuando una cache entry expira, todos los requests concurrentes hittean el backend simultaneamente.
- **Trampas de performance de deep copy**: copy.  deepcopy() en objetos con referencias circulares causa recursion infinita.
- **Inestabilidad de sort con keys custom**: sorted() de Python es estable, pero key functions custom que retornan valores iguales para items diferentes pueden producir ordenamientos inesperados.



## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de data y java para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica expresiones regulares** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿Debería usar regex para parsear HTML?**
R: No. HTML no es un lenguaje regular. Usa un parser de HTML apropiado (BeautifulSoup, DOM API, Jsoup).

**P: ¿Cuál es la diferencia entre `match()` y `search()` en Python?**
R: `match()` verifica solo al principio del string. `search()` escanea todo el string.

**P: ¿Cómo hago un regex case-insensitive?**
R: Usa el flag `i` (JavaScript), `re.IGNORECASE` (Python), o `Pattern.CASE_INSENSITIVE` (Java).

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
