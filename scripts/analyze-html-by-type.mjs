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

const buckets = {};
for (const f of files) {
  const rel = path.relative('dist', f).replace(/\\/g, '/');
  const stripped = rel.startsWith('es/') ? rel.slice(3) : rel;
  let type;
  if (stripped.startsWith('recipes/')) type = 'recipe';
  else if (stripped.startsWith('patterns/')) type = 'pattern';
  else if (stripped.startsWith('guides/')) type = 'guide';
  else if (stripped.startsWith('docs/')) type = 'doc';
  else if (stripped.startsWith('tags/')) type = 'tag';
  else if (stripped.startsWith('topics/')) type = 'topic';
  else if (stripped.startsWith('authors/')) type = 'author';
  else if (stripped === 'index.html') type = 'home';
  else type = 'other';
  
  const size = fs.statSync(f).size;
  if (!buckets[type]) buckets[type] = { count: 0, totalSize: 0, maxSize: 0, files: [] };
  buckets[type].count++;
  buckets[type].totalSize += size;
  if (size > buckets[type].maxSize) buckets[type].maxSize = size;
  buckets[type].files.push({ rel, size });
}

const sorted = Object.entries(buckets).sort((a, b) => b[1].totalSize - a[1].totalSize);
console.log('HTML size by page type:');
console.log('Type     | Count | Total MB | Avg KB | Max KB');
console.log('---------|-------|----------|--------|-------');
for (const [type, b] of sorted) {
  console.log(
    `${type.padEnd(8)} | ${String(b.count).padStart(5)} | ${(b.totalSize / 1024 / 1024).toFixed(2).padStart(8)} | ${(b.totalSize / b.count / 1024).toFixed(1).padStart(6)} | ${(b.maxSize / 1024).toFixed(1).padStart(5)}`
  );
}

console.log('\nTop 20 largest files:');
const all = files.map(f => ({ rel: path.relative('dist', f).replace(/\\/g, '/'), size: fs.statSync(f).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 20);
for (const f of all) {
  console.log(`  ${(f.size / 1024).toFixed(1).padStart(7)} KB  ${f.rel}`);
}
