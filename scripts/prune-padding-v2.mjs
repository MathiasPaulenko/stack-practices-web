import fs from 'fs';
import path from 'path';

// Sections that are generic padding added by scripts.
// Ordered by priority (largest first for maximum impact).
const PADDING_SECTIONS = [
  'Advanced Solutions',
  'Soluciones Avanzadas',
  'Advanced Techniques',
  'Técnicas Avanzadas',
  'Additional Best Practices',
  'Mejores Prácticas Adicionales',
  'Buenas Prácticas Adicionales',
  'Buenas Prácticas Adicionales',
  'Additional Common Mistakes',
  'Errores Comunes Adicionales',
  'Errores comunes adicionales',
  'Additional FAQ',
  'FAQ Adicional',
  'Additional Frequently Asked Questions',
  'Preguntas Frecuentes Adicionales',
  'Preguntas frecuentes adicionales',
  'FAQ Adicionales',
  'Advanced Topics',
  'Temas Avanzados',
  'Production Patterns',
  'Step-by-Step Implementation',
  'Implementación Paso a Paso',
];

const PADDING_SET = new Set(PADDING_SECTIONS);
const MIN_LINES = 350;

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full).forEach((x) => files.push(x));
    else if (f.endsWith('.md')) files.push(full);
  }
  return files;
}

const allFiles = walk('src/content');
let totalPruned = 0;
let filesPruned = 0;
let totalLinesRemoved = 0;

for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const totalLines = lines.length;

  if (totalLines <= MIN_LINES) continue;

  // Find all H2 sections
  const h2s = [...text.matchAll(/^##\s+(.+)$/gm)];
  const paddingSections = [];

  for (let i = 0; i < h2s.length; i++) {
    const title = h2s[i][1].trim();
    if (PADDING_SET.has(title)) {
      const startLine = text.slice(0, h2s[i].index).split('\n').length - 1;
      let endLine;
      if (i + 1 < h2s.length) {
        endLine = text.slice(0, h2s[i + 1].index).split('\n').length - 1;
      } else {
        endLine = lines.length;
      }
      // Trim trailing empty lines
      while (endLine > startLine && lines[endLine - 1].trim() === '') endLine--;
      const sectionLines = endLine - startLine;
      paddingSections.push({ startLine, endLine, title, sectionLines });
    }
  }

  if (paddingSections.length === 0) continue;

  // Sort by size (largest first) and remove as many as possible
  paddingSections.sort((a, b) => b.sectionLines - a.sectionLines);
  const toRemove = [];
  let projectedLines = totalLines;

  for (const section of paddingSections) {
    if (projectedLines - section.sectionLines >= MIN_LINES) {
      toRemove.push(section);
      projectedLines -= section.sectionLines;
    }
  }

  if (toRemove.length === 0) continue;

  // Remove sections (from bottom to top to preserve line numbers)
  const newLines = [...lines];
  for (const { startLine, endLine, title, sectionLines } of toRemove.sort((a, b) => b.startLine - a.startLine)) {
    newLines.splice(startLine, endLine - startLine);
  }

  fs.writeFileSync(f, newLines.join('\n'));
  filesPruned++;
  totalPruned += toRemove.length;
  totalLinesRemoved += totalLines - newLines.length;
  console.log(`Pruned ${toRemove.length} sections from ${path.relative('src/content', f)} (${totalLines} -> ${newLines.length} lines)`);
  for (const { title, sectionLines } of toRemove) {
    console.log(`  - ${title} (${sectionLines} lines)`);
  }
}

console.log(`\nTotal: pruned ${totalPruned} sections from ${filesPruned} files, removed ${totalLinesRemoved} lines`);
