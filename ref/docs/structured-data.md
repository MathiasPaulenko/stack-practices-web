# Structured Data (Schema.org / JSON-LD) — StackPractices

> Implementacion completa de datos estructurados, builders, y mapeo por tipo de pagina.

---

## 1. Libreria de Schemas

Archivo: `src/lib/schema.ts`

### 1.1 Funciones Exportadas

```ts
breadcrumbList(items: BreadcrumbItem[]): object
webPage({ name, description, url, locale }): object
techArticle({ headline, description, url, locale, difficulty, author, dateModified, datePublished, keywords }): object
collectionPage({ name, description, url, locale, items }): object
organization({ name, url, logo, description }): object
faqPage(faqs: { question, answer }[]): object
```

### 1.2 Helper: Trailing Slash

```ts
function ensureSlash(url: string): string {
  return url.endsWith('/') ? url : url + '/';
}
```

Todas las URLs en schemas incluyen trailing slash para consistencia.

---

## 2. Schemas por Tipo de Pagina

### 2.1 Home

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "StackPractices — Developer Knowledge Base",
      "description": "Practical code recipes...",
      "url": "https://stackpractices.com/",
      "inLanguage": "en",
      "publisher": {
        "@type": "Organization",
        "name": "StackPractices",
        "url": "https://stackpractices.com"
      }
    }
  ]
}
```

### 2.2 Pagina Estatica (about, contact, etc.)

```json
{
  "@graph": [
    { "@type": "WebPage", ... },
    { "@type": "BreadcrumbList", ... }
  ]
}
```

### 2.3 Listing Page (recipes, patterns)

```json
{
  "@graph": [
    { "@type": "CollectionPage", ... },
    { "@type": "ItemList", ... },
    { "@type": "WebPage", ... },
    { "@type": "BreadcrumbList", ... }
  ]
}
```

### 2.4 Detail Page (recipe, pattern, doc, guide)

```json
{
  "@graph": [
    {
      "@type": "TechArticle",
      "headline": "How to Parse JSON in Python",
      "description": "...",
      "url": "https://stackpractices.com/recipes/data/parse-json/",
      "inLanguage": "en",
      "educationalLevel": "Beginner",
      "author": {
        "@type": "Organization",
        "name": "StackPractices",
        "url": "https://stackpractices.com"
      },
      "dateModified": "2026-06-12",
      "keywords": ["json", "python", "parsing"]
    },
    { "@type": "WebPage", ... },
    { "@type": "BreadcrumbList", ... }
  ]
}
```

**Nota:** Si hay FAQ section:
```json
{ "@type": "FAQPage", "mainEntity": [
  {
    "@type": "Question",
    "name": "What is JSON parsing?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "JSON parsing is..."
    }
  }
] }
```

---

## 3. BreadcrumbList

### 3.1 Estructura

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://stackpractices.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Recipes",
      "item": "https://stackpractices.com/recipes/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Parse JSON",
      "item": "https://stackpractices.com/recipes/data/parse-json/"
    }
  ]
}
```

### 3.2 Mapeo difficulty -> educationalLevel

```ts
const levelMap: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
```

---

## 4. Organization Schema

Usado en Editorial Policy y About:

```json
{
  "@type": "Organization",
  "name": "StackPractices",
  "url": "https://stackpractices.com",
  "logo": "https://stackpractices.com/favicon.svg",
  "description": "Developer knowledge base for code recipes...",
  "founder": {
    "@type": "Person",
    "name": "Mathias Vladimir Paulenko Echeverz"
  }
}
```

---

## 5. FAQ Extraction

Funcion: `extractFaqs()` en `src/lib/content.ts`

### 5.1 Formatos Soportados

**Formato bold Q + A:**
```markdown
**Q: What is JSON parsing?**
A: JSON parsing is the process...
```

**Formato H3 como pregunta:**
```markdown
### What is JSON parsing?
JSON parsing is the process...
```

### 5.2 Reglas

- Reconoce parrafos que empiezan con `**Q:` como preguntas
- Respuesta = siguiente parrafo(s) hasta la siguiente Q
- Limita a 5 FAQs por pagina (evita spam)

---

## 6. Inyeccion en HTML

`Seo.astro` renderiza:

```html
<script type="application/ld+json" set:html={JSON.stringify(structuredData)}></script>
```

Astro escapa automaticamente el contenido del script.

---

## 7. Validacion

### 7.1 Herramientas

| Herramienta | URL |
|-------------|-----|
| Google Rich Results Test | search.google.com/test/rich-results |
| Schema Markup Validator | validator.schema.org |
| JSON-LD Playground | json-ld.org/playground |

### 7.2 Tests Manuales

Verificar que cada tipo de pagina pasa sin errores:
- [ ] Home -> WebPage
- [ ] About -> WebPage + BreadcrumbList
- [ ] Recipes listing -> CollectionPage + ItemList
- [ ] Recipe detail -> TechArticle + BreadcrumbList
- [ ] Recipe con FAQ -> + FAQPage
- [ ] Editorial Policy -> WebPage + Organization

---

## 8. Futuras Mejoras

- [ ] Cambiar author de `Organization` a `Person` con datos reales
- [ ] Anadir `datePublished` ademas de `dateModified`
- [ ] Anadir `speakable` para asistentes de voz
- [ ] Anadir `review` o `aggregateRating` cuando haya reviews
- [ ] Anadir `sameAs` a Organization con links sociales
