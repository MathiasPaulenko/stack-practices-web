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
