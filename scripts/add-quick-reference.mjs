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
    ? ['lectura adicional', 'notas de producción', 'puntos clave']
    : ['further reading', 'production notes', 'key takeaways'];
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
  const hasQR = hasSection(text, ['quick reference', 'referencia rápida', 'cheat sheet', 'hoja de referencia']);
  if (hasQR) continue;

  const header = spanish ? '## Referencia Rápida' : '## Quick Reference';

  let bullets;
  if (spanish) {
    bullets = [
      `- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.`,
      `- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.`,
      `- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.`,
    ];
  } else {
    bullets = [
      `- **Main command**: run the base solution from the article and verify the expected result.`,
      `- **Validation**: confirm tests pass and key metrics did not degrade.`,
      `- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.`,
    ];
  }

  const section = `\n${header}\n\n${bullets.join('\n')}\n`;

  const insertIdx = findInsertPoint(lines, spanish);
  const newLines = [...lines.slice(0, insertIdx), ...section.split(/\r?\n/), ...lines.slice(insertIdx)];

  fs.writeFileSync(f, newLines.join('\n'), 'utf8');
  added++;
  results.push({ file: path.relative('src/content', f), oldLines: lineCount, newLines: newLines.length });
}

console.log(`Added Quick Reference to ${added} files`);
for (const r of results.slice(0, 10)) {
  console.log(`  ${r.oldLines} -> ${r.newLines} ${r.file}`);
}
if (results.length > 10) console.log(`  ... and ${results.length - 10} more`);
