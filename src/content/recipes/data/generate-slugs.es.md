---
contentType: recipes
slug: generate-slugs
title: "Generar Slugs URL"
description: "Cómo generar slugs limpios y amigables para URLs desde strings en múltiples lenguajes."
metaDescription: "Aprende a generar slugs amigables para URLs desde strings en Python, JavaScript y Java. Slugs limpios y seguros para SEO en apps web."
difficulty: beginner
topics:
  - data
tags:
  - slug
  - url
  - sanitization
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-json
  - /recipes/data/regular-expressions
  - /recipes/api/input-validation
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a generar slugs amigables para URLs desde strings en Python, JavaScript y Java. Slugs limpios y seguros para SEO en apps web."
  keywords:
    - slug
    - url
    - sanitization
    - python
    - javascript
    - java
---

## Visión General

Los slugs URL son identificadores legibles por humanos usados en direcciones web. Un slug bien formado mejora SEO, usabilidad y compartibilidad. Generar slugs involucra transliterar caracteres no ASCII, remover símbolos especiales, colapsar espacios en blanco y asegurar unicidad.

## Cuándo Usar

Usa este recurso cuando:
- Conviertas títulos de artículos, nombres de productos o contenido generado por usuarios en URLs permanentes
- Construyas CMSs, blogs, plataformas de e-commerce o cualquier app con URLs visibles para usuarios
- Normalices nombres de archivos para assets subidos para evitar problemas de encoding
- Crees rutas amigables para SEO para contenido multi-idioma

## Solución

### Python

```python
import re
import unicodedata

def generate_slug(text):
    # Normalizar unicode y remover acentos
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    # Minúsculas y reemplazar no alfanuméricos con guiones
    text = re.sub(r'[^\w\s-]', '', text.lower())
    # Colapsar múltiples guiones/espacios
    text = re.sub(r'[-\s]+', '-', text).strip('-_')
    return text

print(generate_slug("Hello, World! 2024"))  # hello-world-2024
print(generate_slug("Café & Crème Brûlée"))  # cafe-creme-brulee
```

### JavaScript

```javascript
function generateSlug(text) {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')  // Remover diacríticos
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '-');
}

console.log(generateSlug("Hello, World! 2024"));  // hello-world-2024
console.log(generateSlug("Café & Crème Brûlée"));  // cafe-creme-brulee
```

```javascript
// Usando la popular librería slugify
// npm install slugify
import slugify from 'slugify';

slugify('Hello, World! 2024');  // hello-world-2024
slugify('Café & Crème Brûlée');  // cafe-creme-brulee
```

### Java

```java
import java.text.Normalizer;
import java.util.Locale;

public class SlugGenerator {
    public static String generateSlug(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase(Locale.ROOT)
            .replaceAll("[^\\w\\s-]", "")
            .replaceAll("[-\\s]+", "-")
            .replaceAll("^-+|$-+", "");
    }

    public static void main(String[] args) {
        System.out.println(generateSlug("Hello, World! 2024"));  // hello-world-2024
        System.out.println(generateSlug("Café & Crème Brûlée"));  // cafe-creme-brulee
    }
}
```

## Explicación

El algoritmo central es consistente entre lenguajes:
1. **Normalización Unicode** (`NFKD`) descompone caracteres acentuados en base + marca combinada, permitiendo remover diacríticos
2. **Minúsculas** asegura URLs insensibles a mayúsculas
3. **Eliminar caracteres especiales** excepto alfanuméricos, guiones y espacios
4. **Colapsar separadores** en guiones simples y trim guiones iniciales/finales

Esto produce strings ASCII-only, minúsculas, delimitados por guiones, seguros para URLs, nombres de archivo e IDs.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `python-slugify` | `slugify()` | Maneja unicode, soporta reglas específicas por idioma |
| Python | `unicodedata` + `re` | Manual | Sin dependencias, control total |
| JavaScript | `slugify` | `slugify()` | Ligera, soporta reemplazos custom |
| JavaScript | Manual | `normalize()` + regex | Cero dependencias |
| Java | `slugify` (Maven) | `Slugify` | Soporta reemplazos custom y reglas por idioma |
| Java | `Normalizer` + regex | Manual | Incluido en JDK, sin deps externas |

## Lo que funciona

- **Siempre normaliza Unicode** antes de quitar acentos para manejar é, ñ, 中文 correctamente
- **Impón longitud máxima** (ej. 100 caracteres) para prevenir URLs excesivamente largas y problemas de base de datos
- **Verifica unicidad** contra slugs existentes en tu base de datos; añade `-2`, `-3` si es necesario
- **Evita guiones iniciales/finales** que se ven poco profesionales y pueden romper resolución de URLs relativas
- **Usa minúsculas exclusivamente**; las URLs son case-sensitive en la mayoría de servidores Unix

## Errores Comunes

- **Quitar acentos sin normalización NFKD**: `é` permanece como `é` en lugar de convertirse en `e`
- **Permitir caracteres reservados de URL**: `#`, `%`, `?`, `&` tienen significado especial en URLs y deben removerse
- **No limitar longitud del slug**: Slugs extremadamente largos dañan legibilidad y pueden exceder límites de columnas de base de datos
- **Ignorar slugs duplicados**: Dos artículos con el mismo título colisionarán sin una estrategia de unicidad
- **Traducir en lugar de transliterar**: Traducir "hello" al español no es lo mismo que hacerlo seguro para URLs

## Preguntas Frecuentes

### ¿Cómo manejo scripts completamente no latinos como Chino o Árabe?

Para Chino, usa librerías de romanización Pinyin (`pypinyin` en Python, `pinyin` en JS). Para Árabe, Persa o Cirílico, usa librerías de transliteración (`unidecode`, `transliteration`). Como fallback, genera un ID aleatorio o usa un sufijo numérico.

### ¿Los slugs deben ser únicos globalmente o por usuario?

Depende de la estructura de tus URLs. Si las URLs son `/posts/:slug`, los slugs deben ser globalmente únicos. Si son `/:username/:slug`, la unicidad solo necesita asegurarse por usuario. Siempre indexa la columna slug para búsquedas rápidas.

### ¿Puedo cambiar un slug después de publicar?

Cambiar slugs rompe links existentes y bookmarks. Si debes cambiar un slug, implementa un redirect 301 del slug antiguo al nuevo. Almacena el slug antiguo en una tabla de redirects para preservar valor SEO.
