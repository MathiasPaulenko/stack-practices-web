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

const sectionTotals = {};
const sectionCounts = {};
const h2Re = /<h2\b[^>]*?\sid="([^"]+)"[^>]*>/gi;
const nextH2Re = /<h2\b/gi;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const positions = [];
  let m;
  while ((m = h2Re.exec(html)) !== null) {
    positions.push({ id: m[1], idx: m.index });
  }
  for (let i = 0; i < positions.length; i++) {
    nextH2Re.lastIndex = positions[i].idx + 3;
    const next = nextH2Re.exec(html);
    const end = next ? next.index : html.length;
    const size = end - positions[i].idx;
    sectionTotals[positions[i].id] = (sectionTotals[positions[i].id] || 0) + size;
    sectionCounts[positions[i].id] = (sectionCounts[positions[i].id] || 0) + 1;
  }
}
const sorted = Object.entries(sectionTotals).sort((a, b) => b[1] - a[1]);
for (const [id, total] of sorted.slice(0, 40)) {
  console.log(
    (total / 1024 / 1024).toFixed(2) + ' MB',
    id,
    'avg',
    (total / sectionCounts[id] / 1024).toFixed(1) + ' KB',
    'count',
    sectionCounts[id]
  );
}
