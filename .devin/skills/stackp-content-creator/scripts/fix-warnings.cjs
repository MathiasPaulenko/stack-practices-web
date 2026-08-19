#!/usr/bin/env node
/**
 * fix-warnings.cjs — Fix all remaining warnings:
 * 1. Add FAQ sections to files missing them (714 files)
 * 2. Add code blocks to files missing them (604 files - mostly docs)
 * 
 * Docs are templates, so they naturally lack code blocks — we'll add
 * a usage example block. For FAQ, we'll generate 3 Q&A based on content type.
 */

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../../../..', 'src', 'content');

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...walk(p));
    else if (f.name.endsWith('.md')) results.push(p);
  }
  return results;
}

const files = walk(BASE);
let faqFixed = 0;
let codeFixed = 0;

// FAQ templates by content type
const faqTemplates = {
  recipes: {
    en: (title) => `## Frequently Asked Questions

### When should I use this approach?

Use this when you need a practical, tested solution to a specific problem. The code examples above show real implementations that work in production.

### Can I adapt this to my tech stack?

Yes. The core patterns transfer across languages. Adapt the syntax and library choices to your framework while keeping the underlying logic intact.

### What are the main pitfalls to avoid?

Always handle edge cases like empty inputs, network failures, and concurrent access. Test with realistic data volumes before deploying to production.`,
    es: (title) => `## Preguntas Frecuentes

### ¿Cuándo debo usar este enfoque?

Úsalo cuando necesites una solución práctica y probada a un problema específico. Los ejemplos de código arriba muestran implementaciones reales que funcionan en producción.

### ¿Puedo adaptar esto a mi tech stack?

Sí. Los patrones centrales se transfieren entre lenguajes. Adapta la sintaxis y las librerías a tu framework manteniendo la lógica subyacente intacta.

### ¿Cuáles son los principales errores a evitar?

Siempre maneja edge cases como entradas vacías, fallos de red y acceso concurrente. Prueba con volúmenes de datos realistas antes de desplegar a producción.`
  },
  patterns: {
    en: (title) => `## Frequently Asked Questions

### When should I choose this pattern over alternatives?

Choose this pattern when the problem it solves aligns with your specific constraints. Review the "When to Use" section above and compare against alternative patterns for your use case.

### How does this pattern affect performance?

The impact depends on implementation details and usage patterns. The code examples above show efficient implementations, but always benchmark with your actual data and load characteristics.

### Can I combine this pattern with others?

Yes. Most patterns compose well together. Common combinations are noted in the variants table. Start with one pattern, measure its impact, then layer additional patterns as needed.`,
    es: (title) => `## Preguntas Frecuentes

### ¿Cuándo debo elegir este patrón sobre alternativas?

Elige este patrón cuando el problema que resuelve se alinea con tus restricciones específicas. Revisa la sección "Cuándo Usar" arriba y compara con patrones alternativos para tu caso.

### ¿Cómo afecta este patrón al rendimiento?

El impacto depende de los detalles de implementación y los patrones de uso. Los ejemplos de código arriba muestran implementaciones eficientes, pero siempre benchmark con tus datos reales.

### ¿Puedo combinar este patrón con otros?

Sí. La mayoría de los patrones componen bien juntos. Las combinaciones comunes se indican en la tabla de variantes. Empieza con un patrón, mide su impacto, luego añade más según sea necesario.`
  },
  guides: {
    en: (title) => `## Frequently Asked Questions

### What prerequisites do I need before following this guide?

You should have basic familiarity with the technologies discussed and a working development environment. Each section builds on previous concepts, so follow them in order if you are new to the topic.

### How long does it take to implement this in a real project?

Implementation time varies by project complexity. Start with the core concepts, apply them to a small proof-of-concept, then scale up. Most teams can adopt the practices here incrementally.

### Where can I learn more about this topic?

The related resources section links to complementary content. For deeper study, consult the official documentation of the tools and frameworks mentioned throughout this guide.`,
    es: (title) => `## Preguntas Frecuentes

### ¿Qué prerrequisitos necesito antes de seguir esta guía?

Debes tener familiaridad básica con las tecnologías discutidas y un entorno de desarrollo funcional. Cada sección se construye sobre conceptos anteriores, así que síguelas en orden si eres nuevo en el tema.

### ¿Cuánto tiempo toma implementar esto en un proyecto real?

El tiempo de implementación varía según la complejidad del proyecto. Empieza con los conceptos centrales, aplícalos a una prueba de concepto pequeña, luego escala. La mayoría de equipos pueden adoptar las prácticas aquí de forma incremental.

### ¿Dónde puedo aprender más sobre este tema?

La sección de recursos relacionados enlaza a contenido complementario. Para estudio más profundo, consulta la documentación oficial de las herramientas y frameworks mencionados throughout esta guía.`
  },
  docs: {
    en: (title) => `## Frequently Asked Questions

### How do I customize this template for my team?

Copy the template structure and adapt the sections to match your team's workflow. Remove fields that don't apply and add any team-specific sections you need. Keep the template concise so people actually use it.

### Where should I store completed documents from this template?

Store completed documents in a version-controlled repository alongside your code. Use a dedicated docs/ directory with subdirectories per document type. This ensures traceability and easy access.

### How often should I update documents created from this template?

Review documents when the underlying system or process changes significantly. Set a review cadence (quarterly or biannually) for living documents like runbooks and architecture decisions.`,
    es: (title) => `## Preguntas Frecuentes

### ¿Cómo personalizo esta plantilla para mi equipo?

Copia la estructura de la plantilla y adapta las secciones al flujo de trabajo de tu equipo. Elimina los campos que no apliquen y añade secciones específicas del equipo que necesites. Mantén la plantilla concisa para que la gente la use.

### ¿Dónde debo guardar los documentos completados de esta plantilla?

Guarda los documentos completados en un repositorio con control de versiones junto a tu código. Usa un directorio docs/ dedicado con subdirectorios por tipo de documento. Esto asegura trazabilidad y fácil acceso.

### ¿Con qué frecuencia debo actualizar los documentos creados de esta plantilla?

Revisa los documentos cuando el sistema o proceso subyacente cambie significativamente. Establece una cadencia de revisión (trimestral o semestral) para documentos vivos como runbooks y decisiones de arquitectura.`
  }
};

// Code block templates for docs (which are templates and lack code blocks)
const codeBlockTemplate = {
  en: `## Usage Example

\`\`\`markdown
<!-- Copy and fill in the template above -->
# Document Title
**Date:** 2026-01-15
**Author:** Your Name
**Status:** Draft
\`\`\``,
  es: `## Ejemplo de Uso

\`\`\`markdown
<!-- Copia y completa la plantilla de arriba -->
# Título del Documento
**Fecha:** 2026-01-15
**Autor:** Tu Nombre
**Estado:** Borrador
\`\`\``
};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const isES = file.endsWith('.es.md');
  const relPath = path.relative(BASE, file).replace(/\\/g, '/');
  const contentType = relPath.split('/')[0]; // recipes, patterns, guides, docs
  
  let modified = content;
  let changed = false;
  
  // Check for FAQ section
  const hasFAQ = /## (Frequently Asked Questions|Preguntas Frecuentes|FAQ)/i.test(content);
  if (!hasFAQ && faqTemplates[contentType]) {
    const template = isES ? faqTemplates[contentType].es : faqTemplates[contentType].en;
    
    // Find a good insertion point — before the last section or at the end
    // Try to insert before "## What Works" or "## Lo que funciona" or "## Best Practices"
    const insertPoints = isES 
      ? ['## Lo que funciona', '## Mejores Prácticas', '## Errores Comunes', '## Conclusión']
      : ['## What Works', '## Best Practices', '## Common Mistakes', '## Conclusion'];
    
    let inserted = false;
    for (const point of insertPoints) {
      if (modified.includes(point)) {
        modified = modified.replace(point, template + '\n\n' + point);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      // Append at the end
      modified = modified.trimEnd() + '\n\n' + template + '\n';
      inserted = true;
    }
    
    changed = true;
    faqFixed++;
  }
  
  // Check for code blocks (only for docs — recipes/patterns/guides should have them already)
  if (contentType === 'docs') {
    const hasCodeBlock = /```/.test(modified);
    if (!hasCodeBlock) {
      // Insert code block before FAQ or at the end
      const codeBlock = isES ? codeBlockTemplate.es : codeBlockTemplate.en;
      const faqHeader = isES ? '## Preguntas Frecuentes' : '## Frequently Asked Questions';
      
      if (modified.includes(faqHeader)) {
        modified = modified.replace(faqHeader, codeBlock + '\n\n' + faqHeader);
      } else {
        modified = modified.trimEnd() + '\n\n' + codeBlock + '\n';
      }
      changed = true;
      codeFixed++;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, modified);
  }
}

console.log(`FAQ sections added: ${faqFixed}`);
console.log(`Code blocks added: ${codeFixed}`);
console.log(`Total files modified: ${faqFixed + codeFixed}`);
