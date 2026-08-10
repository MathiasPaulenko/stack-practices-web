# GEO (Generative Engine Optimization) — StackPractices

> Estrategia y tacticas para optimizar el contenido para motores de respuesta de IA (ChatGPT, Perplexity, Gemini, Copilot, etc.)

---

## 1. Que es GEO

GEO (Generative Engine Optimization) es el conjunto de practicas para maximizar la probabilidad de que el contenido de StackPractices sea citado, resumido o recomendado por modelos de lenguaje e interfaces de busqueda con IA.

A diferencia del SEO tradicional (orientado a rankings de busqueda), GEO se enfoca en:
- Ser fuente de citacion en respuestas generadas
- Aparecer en "fuentes" o "referencias" de Perplexity, Copilot, etc.
- Ser recomendado cuando un usuario pregunta "como hacer X en Python"

---

## 2. Principios GEO Aplicados

### 2.1 Contenido Directamente Respondible

Los modelos de IA prefieren contenido que responde preguntas de forma clara y concisa.

**Estructura recomendada para cada articulo:**
```
## Overview
Respuesta directa en 2-3 oraciones.

## When to Use
Escenarios especificos donde aplica.

## Solution
Codigo completo y funcional.

## Explanation
Por que funciona, principios subyacentes.

## Variants
Alternativas y cuando usar cada una.

## Best Practices
Recomendaciones de expertos.

## Common Mistakes
Errores frecuentes y como evitarlos.

## FAQ
Preguntas frecuentes con respuestas concisas.
```

### 2.2 FAQ Estrategico

Las secciones FAQ son el factor mas importante para GEO porque:
- Los modelos entrenan sobre pares pregunta-respuesta
- Formato Q&A es nativo para retrieval
- Aumenta las chances de aparecer en featured snippets

**Formato obligatorio en cada contenido:**
```markdown
## Frequently Asked Questions

**Q: [Pregunta exacta que haria un usuario]?**
A: [Respuesta concisa en 1-2 parrafos]

**Q: [Pregunta relacionada]?**
A: [Respuesta]
```

**Requisitos:**
- Minimo 3 preguntas por articulo
- Las preguntas deben usar lenguaje natural (como lo escribiria un usuario)
- Las respuestas deben ser autocontenidas (entendibles sin contexto)
- Incluir preguntas en formato de long-tail search

### 2.3 Speakable Data (Schema.org)

Aunque no implementado aun, el sitio esta preparado para anadir:
```json
{
  "@type": "WebPage",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".summary", ".faq-section"]
  }
}
```

Esto indica a asistentes de voz que secciones leer.

### 2.4 Contenido Multilingue como Ventaja GEO

- Los modelos entrenan sobre corpus multilingue
- Tener versiones EN y ES del mismo contenido aumenta la superficie de citacion
- Las versiones ES pueden ser unicas en nicho (menos competencia en espanol)

**Regla:** Nunca crear contenido en un solo idioma. Siempre EN + ES.

---

## 3. Estructura de Contenido para Modelos de IA

### 3.1 Codigo como First-Class Citizen

Los modelos de IA son especialmente buenos extrayendo y citando codigo. Cada articulo debe incluir:
- Bloques de codigo completos y ejecutables
- Comentarios explicativos
- Variantes en multiples lenguajes cuando aplique

**Ejemplo de bloque de codigo optimo:**
```python
import json

def parse_json_safe(raw: str) -> dict:
    """Parse JSON string safely, returning empty dict on failure."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}

# Usage
result = parse_json_safe('{"key": "value"}')
print(result)  # {'key': 'value'}
```

### 3.2 Tablas Comparativas

Los modelos entienden bien tablas para comparaciones:
```markdown
| Approach | Time Complexity | Space Complexity | Best For |
|----------|----------------|------------------|----------|
| json.loads | O(n) | O(n) | Simple parsing |
| orjson | O(n) | O(n) | High performance |
| pydantic | O(n) | O(n) | Validation + parsing |
```

### 3.3 Listas Numeradas para Procedimientos

```markdown
1. Install the package: `pip install requests`
2. Import in your script: `import requests`
3. Make the GET request: `requests.get(url)`
4. Parse the response: `response.json()`
```

---

## 4. Autoria y Credibilidad (E-E-A-T)

Los modelos de IA tienden a citar fuentes que demuestran autoridad.

### 4.1 Elementos Implementados

- **Editorial policy:** `/editorial-policy` con proceso de revision, credenciales del autor, y politica de correcciones
- **Autor con datos reales:** Mathias Vladimir Paulenko Echeverz, 12+ anos de experiencia
- **Links verificables:** GitHub, LinkedIn, portfolio personal

### 4.2 Elementos Pendientes

- [ ] Pagina `/authors` con foto real, bio detallada, y links sociales
- [ ] Schema `Person` en lugar de `Organization` para autoria
- [ ] Fechas de publicacion y actualizacion visibles
- [ ] Citas a fuentes externas (documentacion oficial, RFCs, papers)

---

## 5. Optimizacion de Metadata para IA

### 5.1 Meta Description como "Abstract"

La meta description actua como abstract del contenido para modelos:
- Debe resumir el valor principal en 150-160 caracteres
- Debe incluir el keyword principal
- Debe ser autocontenida

**Ejemplo bueno:**
```
Learn how to parse JSON in Python using json.loads, handle errors gracefully, and validate schemas with Pydantic. Complete code examples included.
```

### 5.2 Keywords Semanticos

Ademas de keywords principales, incluir terminos semanticamente relacionados:
- Principal: "json parsing python"
- Relacionados: "deserialize", "decode", "json.loads", "json.dumps", "pydantic", "error handling"

Esto ayuda a los modelos a entender el contexto tematico.

---

## 6. Contenido que los Modelos Prefieren

### 6.1 Alto Valor Practico

Los modelos citan contenido que ofrece:
- Codigo copy-paste ready
- Explicaciones concisas
- Troubleshooting de errores comunes
- Comparaciones honestas de alternativas

### 6.2 Actualizado

Los modelos tienen cutoff de conocimiento. Contenido sobre:
- Python 3.12+ features
- Astro 5 patterns
- Tailwind CSS v4
- APIs modernas

...tiene mas chances de ser citado que contenido obsoleto.

**Politica de actualizacion:**
- Revision general cada 3-6 meses
- Updates criticos en 48h (breaking changes, vulnerabilidades)
- Fecha de `lastUpdated` visible en cada articulo

### 6.3 Unico y Original

Los modelos penalizan (o ignoran) contenido duplicado o generico. Cada articulo debe:
- Incluir ejemplos originales
- Tener una perspectiva unica
- Incluir experiencia real del autor
- Mencionar casos edge y como manejarlos

---

## 7. Distribucion y Descubrimiento

### 7.1 Fuentes que Indexan Modelos de IA

| Fuente | Estrategia |
|--------|------------|
| Perplexity | Buen SEO + estructura clara + FAQ |
| ChatGPT (Browse) | Sitemap completo + contenido actualizado |
| Copilot | GitHub presence + documentacion tecnica |
| Gemini | Schema markup + contenido estructurado |
| Bing Chat | Bing Webmaster Tools + sitemap |

### 7.2 RSS como Canal de Distribucion

El feed RSS (`/rss.xml`) permite que agregadores y crawlers de IA descubran nuevo contenido rapidamente.

---

## 8. Checklist GEO por Contenido Nuevo

- [ ] Responde directamente a una pregunta especifica
- [ ] Incluye codigo funcional y completo
- [ ] Tiene seccion FAQ con minimo 3 preguntas
- [ ] Usa lenguaje natural en preguntas (como hablaria un usuario)
- [ ] Incluye tablas comparativas donde aplique
- [ ] Menciona casos edge y errores comunes
- [ ] Tiene version en EN y ES
- [ ] Meta description funciona como abstract
- [ ] Incluye keywords semanticos
- [ ] Fecha de actualizacion visible
- [ ] Links a recursos relacionados internos
- [ ] Links a fuentes externas autoritativas

---

## 9. Medicion de Exito GEO

Las metricas de GEO son mas dificiles de medir que SEO, pero se pueden trackear:

### 9.1 Metricas Proxy

| Metrica | Herramienta | Objetivo |
|---------|-------------|----------|
| Trafico directo | Google Analytics 4 | Crecimiento sostenido |
| Trafico de referrals | GA4 | Identificar fuentes de IA |
| Brand mentions | Google Alerts, Ahrefs | "StackPractices" citado |
| Backlinks | Ahrefs, Moz | Dominios referentes |
| Engagement time | GA4 | > 2 min por sesion |

### 9.2 Tests Manuales

Periodicamente preguntar a ChatGPT, Perplexity, etc.:
- "How do I parse JSON in Python?"
- "What are the best practices for Docker multistage builds?"
- "Explain the Circuit Breaker pattern"

Verificar si StackPractices aparece en las fuentes o respuestas.
