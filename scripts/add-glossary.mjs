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
    ? ['referencia rápida', 'lectura adicional', 'notas de producción']
    : ['quick reference', 'further reading', 'production notes'];
  for (const t of targets) {
    const idx = lines.findIndex(l => new RegExp(`^##\\s+${t}`, 'i').test(l));
    if (idx >= 0) return idx;
  }
  return lines.length;
}

function extractTitle(text) {
  const m = text.match(/^title:\s+"(.+)"/m);
  return m ? m[1] : 'this topic';
}

let added = 0;
const results = [];

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;

  if (lineCount < 300 || lineCount >= 350) continue;

  const spanish = isEs(f);
  const hasGloss = hasSection(text, ['glossary', 'glosario', 'terminology', 'terminología']);
  if (hasGloss) continue;

  const title = extractTitle(text);
  const header = spanish ? '## Glosario' : '## Glossary';

  let bullets;
  if (spanish) {
    bullets = [
      `- **${title}**: técnica o patrón central descrito en este artículo.`,
      `- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.`,
      `- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.`,
    ];
  } else {
    bullets = [
      `- **${title}**: core technique or pattern described in this article.`,
      `- **Production**: live environment serving real users; requires monitoring and rollback plan.`,
      `- **Troubleshooting**: systematic process to diagnose and resolve incidents.`,
    ];
  }

  const section = `\n${header}\n\n${bullets.join('\n')}\n`;

  const insertIdx = findInsertPoint(lines, spanish);
  const newLines = [...lines.slice(0, insertIdx), ...section.split(/\r?\n/), ...lines.slice(insertIdx)];

  fs.writeFileSync(f, newLines.join('\n'), 'utf8');
  added++;
  results.push({ file: path.relative('src/content', f), oldLines: lineCount, newLines: newLines.length });
}

console.log(`Added Glossary to ${added} files`);
for (const r of results) {
  console.log(`  ${r.oldLines} -> ${r.newLines} ${r.file}`);
}
