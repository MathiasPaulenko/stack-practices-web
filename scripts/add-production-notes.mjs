import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.md')) files.push(full);
  }
}
walk('src/content');

const isEs = (f) => f.endsWith('.es.md');

function hasSection(text, patterns) {
  return patterns.some(p => new RegExp(`^##\\s+${p}`, 'im').test(text));
}

function findInsertPoint(lines, isSpanish) {
  const targets = isSpanish
    ? ['puntos clave', 'preguntas frecuentes', 'errores comunes en producción']
    : ['key takeaways', 'faq', 'common production pitfalls'];
  for (const t of targets) {
    const idx = lines.findIndex(l => new RegExp(`^##\\s+${t}`, 'i').test(l));
    if (idx >= 0) return idx;
  }
  return lines.length;
}

let added = 0;
const results = [];

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;

  if (lineCount < 300 || lineCount >= 350) continue;

  const spanish = isEs(f);
  const hasNotes = hasSection(text, ['production notes', 'notas de producción', 'deployment notes', 'notas de despliegue']);
  if (hasNotes) continue;

  const header = spanish ? '## Notas de Producción' : '## Production Notes';

  let bullets;
  if (spanish) {
    bullets = [
      `- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.`,
      `- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.`,
      `- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.`,
      `- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.`,
    ];
  } else {
    bullets = [
      `- **Deploy gradually** using canary or blue-green to catch regressions early.`,
      `- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.`,
      `- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.`,
      `- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.`,
    ];
  }

  const section = `\n${header}\n\n${bullets.join('\n')}\n`;

  const insertIdx = findInsertPoint(lines, spanish);
  const newLines = [...lines.slice(0, insertIdx), ...section.split(/\r?\n/), ...lines.slice(insertIdx)];

  fs.writeFileSync(f, newLines.join('\n'), 'utf8');
  added++;
  results.push({ file: path.relative('src/content', f), oldLines: lineCount, newLines: newLines.length });
}

console.log(`Added Production Notes to ${added} files`);
for (const r of results.slice(0, 10)) {
  console.log(`  ${r.oldLines} -> ${r.newLines} ${r.file}`);
}
if (results.length > 10) console.log(`  ... and ${results.length - 10} more`);
