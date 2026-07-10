---
contentType: recipes
slug: python-generate-qr-code
title: "Generar Códigos QR con Python"
description: "Crea códigos QR para URLs, texto y tarjetas de contacto usando la librería qrcode en Python."
metaDescription: "Genera códigos QR en Python con la librería qrcode. Crea QR personalizados para URLs, texto y vCards con estilo y corrección de errores."
difficulty: beginner
topics:
  - data
tags:
  - qr-code
  - python
  - qrcode
  - generation
  - images
relatedResources:
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/format-phone-numbers
  - /recipes/generate-pdf-report-python
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Genera códigos QR en Python con la librería qrcode. Crea QR personalizados para URLs, texto y vCards con estilo y corrección de errores."
  keywords:
    - generar qr python
    - qrcode library python
    - codigo qr vcard
    - python qr batch
    - qrcode error correction
---
## Visión General

Los códigos QR conectan lo físico y lo digital. La librería `qrcode` de Python los genera desde cualquier string: URLs, info de contacto, credenciales WiFi, links de pago. Esta recipe cubre generación básica, estilo, niveles de corrección de errores y creación en lote.

## Cuándo Usar

- Necesitas generar códigos QR para URLs o páginas de productos
- Estás creando tarjetas de contacto vCard para print o email
- Quieres codificar credenciales WiFi para acceso de invitados
- Necesitas generar cientos de códigos QR desde un CSV

## Solución

### Código QR básico

```python
import qrcode

img = qrcode.make("https://example.com")
img.save("qr_basic.png")
```

### Tamaño y corrección de errores custom

```python
import qrcode

qr = qrcode.QRCode(
    version=1,  # 1 = 21x21, aumenta con más datos
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # High = 30% recovery
    box_size=10,  # tamaño en píxeles de cada box
    border=4,  # borde mínimo (quiet zone)
)
qr.add_data("https://example.com/long-url-here")
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("qr_custom.png")
```

### Generar QR code vCard

```python
import qrcode

vcard = """BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
ORG:Acme Corp
TITLE:Software Engineer
TEL:+15551234567
EMAIL:jane@example.com
URL:https://example.com
END:VCARD"""

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M)
qr.add_data(vcard)
qr.make(fit=True)
img = qr.make_image(fill_color="#1a56db", back_color="white")
img.save("qr_vcard.png")
```

### QR code de credenciales WiFi

```python
import qrcode

wifi = "WIFI:T:WPA;S:MyNetwork;P:MyPassword;;"
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)
qr.add_data(wifi)
qr.make(fit=True)
img = qr.make_image()
img.save("qr_wifi.png")
```

### Generar en lote desde CSV

```python
import qrcode
import csv
from pathlib import Path

output_dir = Path("qr_codes")
output_dir.mkdir(exist_ok=True)

with open("urls.csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        url = row["url"]
        name = row["name"]
        img = qrcode.make(url)
        img.save(output_dir / f"{name}.png")
        print(f"Generated: {name}.png")
```

### Generar como SVG

```python
import qrcode
import qrcode.image.svg

qr = qrcode.QRCode(image_factory=qrcode.image.svg.SvgImage)
qr.add_data("https://example.com")
qr.make(fit=True)
img = qr.make_image()
img.save("qr_vector.svg")
```

## Explicación

Los códigos QR codifican datos en una matriz 2D de cuadrados negros y blancos. El parámetro `version` controla el tamaño de la matriz (1 = 21x21, hasta 40 = 177x177). Versions más altas almacenan más datos pero producen imágenes más grandes.

La corrección de errores tiene cuatro niveles:
- **L (Low)**: 7% recovery. QR code más pequeño para los datos.
- **M (Medium)**: 15% recovery. Buen default para la mayoría de los usos.
- **Q (Quartile)**: 25% recovery. Usar cuando el código puede quedar parcialmente oculto.
- **H (High)**: 30% recovery. Usar para print donde tinta o daño son posibles.

El `box_size` controla las dimensiones en píxeles. `border` (quiet zone) debe ser de al menos 4 módulos para que los scanners detecten el QR code.

## Variantes

| Formato | Librería | Output | Usar Cuando |
|---------|----------|--------|-------------|
| PNG | qrcode + Pillow | Imagen raster | Web, print |
| SVG | qrcode.image.svg | Imagen vectorial | Print, escalado |
| PNG con logo | qrcode + Pillow | QR con marca | Marketing |

## Pautas

- Usa corrección de errores H para materiales de print. La tinta puede dañar el código.
- Mantén el quiet zone en 4 o más módulos. Los scanners necesitan bordes claros.
- Testea códigos QR con múltiples apps de scanner antes de imprimir.
- Usa SVG para print. Escala sin pixelación a cualquier tamaño.
- Mantén las URLs cortas. Usa un acortador si el string es demasiado largo para version 10+.

## Errores Comunes

- Usar corrección L para print. La tinta daña códigos de corrección baja.
- Setear border a 0. Los scanners no pueden detectar el QR code sin quiet zone.
- Codificar demasiados datos. URLs de más de 100 caracteres suben la version y hacen el código difícil de escanear.
- No testear en prints físicos. Las previews en pantalla no reflejan condiciones de escaneo.
- Usar colores con bajo contraste. Los scanners necesitan módulos oscuros sobre fondos claros.

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
## Preguntas Frecuentes

### ¿Puedo agregar un logo en el centro del QR code?

Sí, pero solo con corrección de errores H. El logo cubre parte de los datos y el 30% de recovery compensa. Usa Pillow para pegar la imagen del logo en el centro del QR code.

### ¿Cuántos datos puede almacenar un QR code?

Hasta 2,953 bytes (alfanumérico) o 4,296 dígitos en version 40 con corrección L. Los límites prácticos son menores porque los códigos de alta densidad son difíciles de escanear con cámaras de teléfono.

### ¿Cómo decodifico un QR code desde una imagen?

Usa `pyzbar` con Pillow:

```python
from pyzbar.pyzbar import decode
from PIL import Image

results = decode(Image.open("qr_code.png"))
for r in results:
    print(r.data.decode())
```

### ¿La librería qrcode es gratis para uso comercial?

Sí. La librería `qrcode` tiene licencia BSD. Puedes usarla en proyectos comerciales sin restricciones.