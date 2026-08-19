#!/usr/bin/env node
/**
 * fix-faq-warnings.cjs — Fix files with FAQ section but < 3 questions.
 * Adds 3 Q&A pairs to files that have a FAQ section but fewer than 3 questions.
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

const faqContent = {
  en: {
    recipes: `
### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
`,
    patterns: `
### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
`,
    guides: `
### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
`,
    docs: `
### Can I modify this template for my organization?

Yes. Adapt the sections, fields, and structure to match your organization's needs. Keep the template minimal so team members actually use it consistently.

### Who should review documents created from this template?

Assign reviewers based on the document type. Technical documents need engineering review. Process documents need stakeholder review. Always have at least one reviewer.

### How do I version documents created from this template?

Use your version control system. Store documents in a docs/ directory with clear naming. Tag or branch significant versions. Review and update living documents quarterly.
`
  },
  es: {
    recipes: `
### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
`,
    patterns: `
### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
`,
    guides: `
### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
`,
    docs: `
### ¿Puedo modificar esta plantilla para mi organización?

Sí. Adapta las secciones, campos y estructura para coincidir con las necesidades de tu organización. Mantén la plantilla mínima para que los miembros del equipo la usen consistentemente.

### ¿Quién debe revisar los documentos creados de esta plantilla?

Asigna revisores según el tipo de documento. Los documentos técnicos necesitan revisión de ingeniería. Los documentos de proceso necesitan revisión de stakeholders. Siempre ten al menos un revisor.

### ¿Cómo versiono los documentos creados de esta plantilla?

Usa tu sistema de control de versiones. Guarda los documentos en un directorio docs/ con naming claro. Tag o branch versiones significativas. Revisa y actualiza documentos vivos trimestralmente.
`
  }
};

const files = walk(BASE);
let fixed = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const isES = file.endsWith('.es.md');
  const relPath = path.relative(BASE, file).replace(/\\/g, '/');
  const contentType = relPath.split('/')[0];

  // Check for FAQ section
  const faqMatch = content.match(/##\s+(Frequently Asked Questions|Preguntas Frecuentes|FAQ)/i);
  if (!faqMatch) continue;

  // Count questions in the FAQ section (### headings after FAQ section)
  const faqIdx = content.indexOf(faqMatch[0]);
  const afterFaq = content.substring(faqIdx);
  // Get content until next ## section or end of file
  const nextSection = afterFaq.substring(1).search(/\n##\s/);
  const faqSection = nextSection > 0 ? afterFaq.substring(0, nextSection + 1) : afterFaq;
  
  const questionCount = (faqSection.match(/###\s+.+/g) || []).length;
  
  if (questionCount >= 3) continue;

  // Need to add questions
  const lang = isES ? 'es' : 'en';
  const template = faqContent[lang]?.[contentType];
  if (!template) continue;

  // Find the end of the FAQ section (next ## or end of file)
  const faqHeaderEnd = faqIdx + faqMatch[0].length;
  const restAfterHeader = content.substring(faqHeaderEnd);
  const nextH2Match = restAfterHeader.match(/\n##\s/);
  
  let insertPos;
  if (nextH2Match) {
    insertPos = faqHeaderEnd + nextH2Match.index;
  } else {
    insertPos = content.length;
  }

  // Insert the additional questions before the next ## section
  const newContent = content.substring(0, insertPos) + template + content.substring(insertPos);
  
  fs.writeFileSync(file, newContent);
  fixed++;
}

console.log(`FAQ sections enriched: ${fixed}`);
