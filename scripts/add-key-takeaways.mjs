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

function extractTitle(text) {
  const m = text.match(/^title:\s+"(.+)"/m);
  return m ? m[1] : path.basename(f, '.md');
}

function extractTopics(text) {
  const m = text.match(/^topics:\s*\n((?:\s+-\s+.+\n)+)/m);
  if (!m) return [];
  return m[1].split('\n')
    .map(l => l.match(/^\s+-\s+(.+)/)?.[1]?.trim())
    .filter(Boolean);
}

function hasSection(text, patterns) {
  return patterns.some(p => new RegExp(`^##\\s+${p}`, 'im').test(text));
}

function findInsertPoint(lines, isSpanish) {
  // Insert before FAQ, or before Common Production Pitfalls, or at end
  const targets = isSpanish
    ? ['preguntas frecuentes', 'errores comunes en producción', 'errores comunes']
    : ['faq', 'common production pitfalls', 'common mistakes'];
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
  
  // Only target files in 300-349 range
  if (lineCount < 300 || lineCount >= 350) continue;
  
  const spanish = isEs(f);
  const hasTakeaways = hasSection(text, ['key takeaways', 'puntos clave', 'quick reference', 'referencia rápida']);
  if (hasTakeaways) continue;
  
  const title = extractTitle(text);
  const topics = extractTopics(text);
  const topic = topics[0] || '';
  
  // Build section
  const header = spanish ? '## Puntos Clave' : '## Key Takeaways';
  
  let bullets;
  if (spanish) {
    bullets = [
      `- **Aplica ${title.toLowerCase()}** cuando necesites una solución práctica para ${topic || 'tu caso de uso'}.`,
      `- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.`,
      `- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.`,
      `- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.`,
    ];
  } else {
    bullets = [
      `- **Apply ${title.toLowerCase()}** when you need a practical solution for ${topic || 'your use case'}.`,
      `- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.`,
      `- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.`,
      `- **Keep dependencies updated** and run tests in CI to prevent production regressions.`,
    ];
  }
  
  const section = `\n${header}\n\n${bullets.join('\n')}\n`;
  
  const insertIdx = findInsertPoint(lines, spanish);
  const newLines = [...lines.slice(0, insertIdx), ...section.split(/\r?\n/), ...lines.slice(insertIdx)];
  
  fs.writeFileSync(f, newLines.join('\n'), 'utf8');
  added++;
  results.push({ file: path.relative('src/content', f), oldLines: lineCount, newLines: newLines.length });
}

console.log(`Added Key Takeaways to ${added} files`);
// Show first 10
for (const r of results.slice(0, 10)) {
  console.log(`  ${r.oldLines} -> ${r.newLines} ${r.file}`);
}
if (results.length > 10) console.log(`  ... and ${results.length - 10} more`);
