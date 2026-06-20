---
contentType: recipes
slug: parse-xml-files
title: "Parse XML Files"
description: "How to parse XML documents in Python, Java, and JavaScript with practical code examples."
metaDescription: "Learn how to parse XML files in Python, Java, and JavaScript. Practical code examples for DOM parsing, SAX, StAX, and XPath queries."
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
  metaDescription: "Learn how to parse XML files in Python, Java, and JavaScript. Practical code examples for DOM parsing, SAX, StAX, and XPath queries."
  keywords:
    - xml
    - parsing
    - python
    - javascript
    - java
    - data-processing
---

## Overview

XML remains widely used in enterprise systems, configuration files, SOAP APIs, and document formats like DOCX and RSS. Parsing XML correctly requires understanding the trade-offs between DOM (memory-based), SAX (event-driven), and modern stream parsers.

## When to Use

Use this resource when:
- Integrating with legacy SOAP services or enterprise middleware
- Parsing configuration files, RSS feeds, or sitemaps
- Extracting structured data from Microsoft Office documents (OOXML)
- Processing industry-standard formats like HL7, ISO 20022, or UBL

## Solution

### Python

```python
from xml.etree import ElementTree as ET

# DOM parsing with ElementTree (built-in)
tree = ET.parse('data.xml')
root = tree.getroot()

for child in root:
    print(child.tag, child.attrib)
    print(child.text)
```

```python
# XPath queries
namespaces = {'ns': 'http://example.com/schema'}
results = root.findall('.//ns:item', namespaces)
for item in results:
    print(item.get('id'))
```

### JavaScript

```javascript
// DOMParser in browsers
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
// DOM parsing with built-in JAXP
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
// SAX parsing for large files
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

## Explanation

- **DOM**: Loads the entire XML tree into memory. Best for small to medium files (<10MB) where random access and XPath queries are needed.
- **SAX**: Event-driven, streams the file without loading it entirely. Best for very large files where only specific elements are needed.
- **StAX** (Java): Pull-parser hybrid combining DOM convenience with SAX efficiency.
- **ElementTree** (Python): A lightweight DOM alternative with a Pythonic API. `lxml` is the high-performance alternative.
- **fast-xml-parser** (JS): Converts XML to plain JavaScript objects, ideal for REST APIs consuming SOAP backends.

## Variants

| Technology | Parser | Approach | Best For |
|------------|--------|----------|----------|
| Python | ElementTree | DOM-like | Standard parsing |
| Python | lxml | DOM + XPath | Large files & schemas |
| JavaScript | DOMParser | W3C DOM | Browser apps |
| JavaScript | fast-xml-parser | Object mapping | Node.js APIs |
| Java | JAXP DOM | DOM | Small documents |
| Java | SAX / StAX | Event-driven | Large XML streams |

## Best Practices

- **Disable DTDs and external entities** to prevent XXE injection attacks
- **Use SAX/StAX for files >10MB** to keep memory usage low
- **Validate against XSD schemas** when consuming third-party feeds
- **Prefer XPath over manual tree traversal** for complex nested queries
- **Handle namespaces explicitly** instead of ignoring them

## Common Mistakes

- **Enabling external entities**: Default parser settings may allow file system access via DTDs
- **Loading multi-gigabyte files into DOM**: Causes OutOfMemoryError or browser crashes
- **Ignoring XML namespaces**: Leads to empty query results when elements are namespaced
- **Using regex to parse XML**: XML is not a regular language; regex breaks on nested elements
- **Not handling encoding declarations**: Files may declare ISO-8859-1 but the parser defaults to UTF-8

## Frequently Asked Questions

### What is the difference between DOM and SAX parsing?

DOM loads the entire document into a tree structure in memory, allowing random access and modification. SAX processes the document as a stream of events, using minimal memory but requiring you to track state manually.

### How do I parse XML with namespaces in Python?

Pass a dictionary mapping prefixes to URIs to `ElementTree.findall()`. For example: `root.findall('.//ns:item', {'ns': 'http://example.com'})`.

### Is JSON always better than XML?

Not always. XML supports schemas (XSD), digital signatures, mixed content, and namespaces. JSON is simpler and more compact for APIs. Choose based on your interoperability and validation requirements.
