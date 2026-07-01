---
contentType: recipes
slug: parse-xml-files
title: "Analizar Archivos XML"
description: "Cómo analizar documentos XML en Python, Java y JavaScript con ejemplos de código prácticos."
metaDescription: "Aprende a analizar archivos XML en Python, Java y JavaScript. Ejemplos de código para parsing DOM, SAX y consultas XPath."
difficulty: beginner
topics:
  - data
tags:
  - xml
  - parsing
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-json
  - /recipes/data/regular-expressions
  - /guides/devops/logging-monitoring-observability-guide
  - /recipes/file-handling/stream-processing
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a analizar archivos XML en Python, Java y JavaScript. Ejemplos de código para parsing DOM, SAX y consultas XPath."
  keywords:
    - xml
    - parsing
    - python
    - javascript
    - java
    - data-processing
---

## Visión General

XML sigue siendo ampliamente utilizado en sistemas empresariales, archivos de configuración, APIs SOAP y formatos de documentos como DOCX y RSS. Analizar XML correctamente requiere entender las compensaciones entre DOM (basado en memoria), SAX (basado en eventos) y parsers modernos de streaming.

## Cuándo Usar

Usa este recurso cuando:
- Integres con servicios SOAP legacy o middleware empresarial
- Analices archivos de configuración, feeds RSS o sitemaps
- Extraigas datos estructurados de documentos Microsoft Office (OOXML)
- Proceses formatos estándar de la industria como HL7, ISO 20022 o UBL

## Solución

### Python

```python
from xml.etree import ElementTree as ET

# Parsing DOM con ElementTree (incluido)
tree = ET.parse('data.xml')
root = tree.getroot()

for child in root:
    print(child.tag, child.attrib)
    print(child.text)
```

```python
# Consultas XPath
namespaces = {'ns': 'http://example.com/schema'}
results = root.findall('.//ns:item', namespaces)
for item in results:
    print(item.get('id'))
```

### JavaScript

```javascript
// DOMParser en navegadores
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

const items = xmlDoc.getElementsByTagName('item');
for (let item of items) {
    console.log(item.getAttribute('id'));
    console.log(item.textContent);
}
```

```javascript
// fast-xml-parser (Node.js)
// npm install fast-xml-parser
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});
const obj = parser.parse(xmlString);
console.log(obj.root.item[0]['@_id']);
```

### Java

```java
// Parsing DOM con JAXP integrado
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
DocumentBuilder builder = factory.newDocumentBuilder();
Document doc = builder.parse(new File("data.xml"));

NodeList items = doc.getElementsByTagName("item");
for (int i = 0; i < items.getLength(); i++) {
    Element item = (Element) items.item(i);
    System.out.println(item.getAttribute("id"));
}
```

```java
// Parsing SAX para archivos grandes
import org.xml.sax.helpers.DefaultHandler;
import org.xml.sax.Attributes;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

class XmlHandler extends DefaultHandler {
    public void startElement(String uri, String localName, String qName, Attributes attrs) {
        if (qName.equals("item")) {
            System.out.println(attrs.getValue("id"));
        }
    }
}

SAXParser parser = SAXParserFactory.newInstance().newSAXParser();
parser.parse(new File("data.xml"), new XmlHandler());
```

## Explicación

- **DOM**: Carga todo el árbol XML en memoria. Mejor para archivos pequeños a medianos (<10MB) donde se necesita acceso aleatorio y consultas XPath.
- **SAX**: Basado en eventos, procesa el archivo sin cargarlo completamente. Mejor para archivos muy grandes donde solo se necesitan elementos específicos.
- **StAX** (Java): Parser híbrido pull que combina la conveniencia de DOM con la eficiencia de SAX.
- **ElementTree** (Python): Una alternativa DOM ligera con una API pitónica. `lxml` es la alternativa de alto rendimiento.
- **fast-xml-parser** (JS): Convierte XML a objetos JavaScript simples, ideal para APIs REST que consumen backends SOAP.

## Variantes

| Tecnología | Parser | Enfoque | Mejor Para |
|------------|--------|---------|------------|
| Python | ElementTree | DOM-like | Parsing estándar |
| Python | lxml | DOM + XPath | Archivos grandes y schemas |
| JavaScript | DOMParser | W3C DOM | Apps en navegador |
| JavaScript | fast-xml-parser | Object mapping | APIs Node.js |
| Java | JAXP DOM | DOM | Documentos pequeños |
| Java | SAX / StAX | Event-driven | Streams XML grandes |

## Lo que funciona

- **Desactiva DTDs y entidades externas** para prevenir ataques XXE
- **Usa SAX/StAX para archivos >10MB** para mantener el uso de memoria bajo
- **Valida contra schemas XSD** al consumir feeds de terceros
- **Prefiere XPath sobre recorrido manual** para consultas anidadas complejas
- **Maneja namespaces explícitamente** en lugar de ignorarlos

## Errores Comunes

- **Habilitar entidades externas**: La configuración por defecto del parser puede permitir acceso al sistema de archivos vía DTDs
- **Cargar archivos multi-gigabyte en DOM**: Causa OutOfMemoryError o bloqueos del navegador
- **Ignorar namespaces XML**: Produce resultados de consulta vacíos cuando los elementos tienen namespace
- **Usar regex para parsear XML**: XML no es un lenguaje regular; regex falla con elementos anidados
- **No manejar declaraciones de codificación**: Los archivos pueden declarar ISO-8859-1 pero el parser usa UTF-8 por defecto

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre parsing DOM y SAX?

DOM carga todo el documento en una estructura de árbol en memoria, permitiendo acceso aleatorio y modificación. SAX procesa el documento como un stream de eventos, usando memoria mínima pero requiriendo que rastrees el estado manualmente.

### ¿Cómo analizo XML con namespaces en Python?

Pasa un diccionario que mapee prefijos a URIs a `ElementTree.findall()`. Por ejemplo: `root.findall('.//ns:item', {'ns': 'http://example.com'})`.

### ¿Es JSON siempre mejor que XML?

No siempre. XML soporta schemas (XSD), firmas digitales, contenido mixto y namespaces. JSON es más simple y compacto para APIs. Elige basado en tus requisitos de interoperabilidad y validación.
