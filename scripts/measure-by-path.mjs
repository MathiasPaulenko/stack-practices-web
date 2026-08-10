import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) files.push(full);
  }
}
walk('dist');

const groups = {};
let total = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative('dist', f).replace(/\\/g, '/');
  let key;
  if (rel.startsWith('recipes/')) key = 'recipes';
  else if (rel.startsWith('patterns/')) key = 'patterns';
  else if (rel.startsWith('guides/')) key = 'guides';
  else if (rel.startsWith('docs/')) key = 'docs';
  else if (rel.startsWith('tags/')) key = 'tags';
  else if (rel.startsWith('topics/')) key = 'topics';
  else if (rel.startsWith('authors/')) key = 'authors';
  else if (rel.startsWith('es/')) {
    if (rel.startsWith('es/recipes/')) key = 'es-recipes';
    else if (rel.startsWith('es/patterns/')) key = 'es-patterns';
    else if (rel.startsWith('es/guides/')) key = 'es-guides';
    else if (rel.startsWith('es/docs/')) key = 'es-docs';
    else if (rel.startsWith('es/tags/')) key = 'es-tags';
    else if (rel.startsWith('es/topics/')) key = 'es-topics';
    else if (rel.startsWith('es/authors/')) key = 'es-authors';
    else key = 'es-other';
  }
  else key = 'root';
  groups[key] = (groups[key] || 0) + html.length;
  total += html.length;
}

for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
  console.log(k, ':', (v / 1024 / 1024).toFixed(2), 'MB', (v / total * 100).toFixed(1), '%');
}
