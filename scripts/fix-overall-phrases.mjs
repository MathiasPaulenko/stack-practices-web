import fs from 'fs';
import path from 'path';

const replacements = [
  // Narrative / empty-qualifier patterns (case-insensitive)
  { re: /\boverall coverage improved this sprint/gi, en: 'aggregate coverage improved this sprint from 82.3% to 84.4%', es: 'la cobertura agregada mejoró este sprint de 82.3% a 84.4%' },
  { re: /\boverall numbers hide problem areas/gi, en: 'summary metrics hide problem areas', es: 'las métricas resumidas ocultan problemas puntuales' },
  { re: /\b90% overall coverage can hide 60% critical path coverage/gi, en: '90% aggregate coverage can hide 60% critical path coverage', es: 'un 90% de cobertura agregada puede ocultar un 60% de cobertura de ruta crítica' },
  { re: /\boverall coverage can mask critical gaps/gi, en: 'aggregate coverage can mask critical gaps', es: 'la cobertura agregada puede ocultar brechas críticas' },
  { re: /\bmore meaningful than overall coverage for risk assessment/gi, en: 'more meaningful than aggregate coverage for risk assessment', es: 'más significativo que la cobertura agregada para evaluar riesgos' },
  { re: /\breduce overall costs (?:by|en) 40-50%/gi, en: 'reduce total costs by 40-50%', es: 'reducir los costos totales en un 40-50%' },
  { re: /\bthe overall structure and design/gi, en: 'the high-level structure and design', es: 'la estructura y diseño de alto nivel' },
  { re: /\btracks overall request processing time/gi, en: 'tracks total request processing time', es: 'rastrea el tiempo total de procesamiento de requests' },
  { re: /\bwithout affecting the overall system/gi, en: 'without affecting the broader system', es: 'sin afectar el sistema en conjunto' },
  { re: /\balgorithm's overall structure/gi, en: "algorithm's top-level structure", es: 'la estructura de alto nivel del algoritmo' },
  { re: /\boverall flow/gi, en: 'top-level flow', es: 'flujo de alto nivel' },
  { re: /\boverall timeout/gi, en: 'total timeout', es: 'timeout total' },
  { re: /\bOverall deadline exceeded\b/g, en: 'Total deadline exceeded', es: 'Deadline total excedido' },
  { re: /\boverall framework/gi, en: 'high-level framework', es: 'marco de alto nivel' },
  { re: /\boverall score drops below 0\.95/gi, en: 'composite score drops below 0.95', es: 'el puntaje compuesto cae por debajo de 0.95' },
  { re: /\bweighted score: overall = /gi, en: 'weighted score: composite = ', es: 'puntaje ponderado: composite = ' },
  { re: /\b`total` is the overall timeout/gi, en: '`total` is the timeout for the entire request', es: '`total` es el timeout para toda la request' },
  { re: /\bthe overall structure y design/gi, en: 'the high-level structure and design', es: 'la estructura y diseño de alto nivel' },
  // Template/table labels
  { re: /\bOverall line coverage/gi, en: 'Aggregate line coverage', es: 'Cobertura de líneas agregada' },
  { re: /\bOverall branch coverage/gi, en: 'Aggregate branch coverage', es: 'Cobertura de ramas agregada' },
  { re: /\bOverall trend/gi, en: 'Aggregate trend', es: 'Tendencia agregada' },
  { re: /\bOverall risk/gi, en: 'Aggregate risk', es: 'Riesgo agregado' },
  { re: /\bOverall methodology/gi, en: 'General methodology', es: 'Metodología general' },
  { re: /\bOverall Risk Rating/gi, en: 'Aggregate Risk Rating', es: 'Calificación de Riesgo Agregado' },
  { re: /\bOverall Result/gi, en: 'Aggregate Result', es: 'Resultado Agregado' },
  { re: /\bOverall verdict:/gi, en: 'Final verdict:', es: 'Veredicto final:' },
  { re: /\bOverall test result/gi, en: 'Aggregate test result', es: 'Resultado de prueba agregado' },
  { re: /\bOverall coordination/gi, en: 'Primary coordination', es: 'Coordinación principal' },
  { re: /\bOverall status banner/gi, en: 'Aggregate status banner', es: 'Banner de estado agregado' },
  { re: /\bOverall Score/gi, en: 'Aggregated Score', es: 'Puntaje Agregado' },
  { re: /\bOverall pipeline status/gi, en: 'Aggregate pipeline status', es: 'Estado de pipeline agregado' },
  { re: /\bretry with overall deadline/gi, en: 'retry with total deadline', es: 'retry con deadline total' },
  { re: /\bretry con overall deadline/gi, en: 'retry with total deadline', es: 'retry con deadline total' },
  { re: /\bretryéa hasta que un overall deadline expire/gi, en: 'retries until a total deadline expires', es: 'reintenta hasta que expire un deadline total' },
  { re: /\bretries until an overall deadline expires/gi, en: 'retries until a total deadline expires', es: 'reintenta hasta que expire un deadline total' },
];

// Find all .md and .es.md files
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.md')) files.push(full);
  }
}
walk('src/content');

let totalChanges = 0;
for (const f of files) {
  const isEs = f.endsWith('.es.md');
  let text = fs.readFileSync(f, 'utf8');
  let changed = false;
  for (const { re, en, es } of replacements) {
    const replacement = isEs ? es : en;
    const newText = text.replace(re, (match) => {
      // Preserve original casing for sentence starts if needed
      if (match[0] === match[0].toUpperCase() && replacement[0] !== replacement[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
    if (newText !== text) {
      changed = true;
      const count = (text.match(re) || []).length;
      totalChanges += count;
      text = newText;
    }
  }
  if (changed) {
    fs.writeFileSync(f, text, 'utf8');
    console.log(`Updated ${path.relative('src/content', f)}`);
  }
}
console.log(`\nTotal replacements: ${totalChanges}`);
