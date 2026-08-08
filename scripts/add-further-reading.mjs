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
    ? ['notas de producción', 'puntos clave', 'preguntas frecuentes']
    : ['production notes', 'key takeaways', 'faq'];
  for (const t of targets) {
    const idx = lines.findIndex(l => new RegExp(`^##\\s+${t}`, 'i').test(l));
    if (idx >= 0) return idx;
  }
  return lines.length;
}

function extractTags(text) {
  const m = text.match(/^tags:\s*\n((?:\s+-\s+.+\n)+)/m);
  if (!m) return [];
  return m[1].split('\n')
    .map(l => l.match(/^\s+-\s+(.+)/)?.[1]?.trim())
    .filter(Boolean);
}

let added = 0;
const results = [];

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;

  if (lineCount < 300 || lineCount >= 350) continue;

  const spanish = isEs(f);
  const hasFR = hasSection(text, ['further reading', 'lectura adicional', 'additional resources', 'recursos adicionales', 'related reading']);
  if (hasFR) continue;

  const tags = extractTags(text);
  const header = spanish ? '## Lectura Adicional' : '## Further Reading';

  let bullets;
  if (spanish) {
    bullets = [
      `- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.`,
      `- **Guías relacionadas**: explora las guías de ${tags.slice(0, 2).join(' y ') || 'arquitectura y devops'} para profundizar.`,
      `- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.`,
      `- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.`,
    ];
  } else {
    bullets = [
      `- **Official documentation**: check the current reference for the framework or tool used.`,
      `- **Related guides**: explore the ${tags.slice(0, 2).join(' and ') || 'architecture and devops'} guides for deeper coverage.`,
      `- **Complementary patterns**: review design patterns applicable to your technology stack.`,
      `- **Public postmortems**: study real incidents from teams that faced similar production issues.`,
    ];
  }

  const section = `\n${header}\n\n${bullets.join('\n')}\n`;

  const insertIdx = findInsertPoint(lines, spanish);
  const newLines = [...lines.slice(0, insertIdx), ...section.split(/\r?\n/), ...lines.slice(insertIdx)];

  fs.writeFileSync(f, newLines.join('\n'), 'utf8');
  added++;
  results.push({ file: path.relative('src/content', f), oldLines: lineCount, newLines: newLines.length });
}

console.log(`Added Further Reading to ${added} files`);
for (const r of results.slice(0, 10)) {
  console.log(`  ${r.oldLines} -> ${r.newLines} ${r.file}`);
}
if (results.length > 10) console.log(`  ... and ${results.length - 10} more`);
