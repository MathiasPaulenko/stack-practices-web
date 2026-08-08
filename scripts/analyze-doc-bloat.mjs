import fs from 'fs';
import path from 'path';

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full).forEach((x) => files.push(x));
    else if (full.endsWith('.html')) files.push(full);
  }
  return files;
}

const docs = walk('dist/docs').filter((f) => !f.includes('\\es\\'));
const sizes = docs.map((f) => ({ file: path.relative('dist', f), size: fs.statSync(f).size }));
sizes.sort((a, b) => b.size - a.size);
console.log('EN docs:', docs.length, 'total:', (sizes.reduce((a, x) => a + x.size, 0) / 1024 / 1024).toFixed(2), 'MB');
for (const { file, size } of sizes.slice(0, 10)) {
  console.log(`${(size / 1024).toFixed(1)} KB  ${file}`);
}

// Analyze largest doc
const html = fs.readFileSync(docs[0], 'utf8');
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('\nLargest doc H2 sections:', h2s.length);
for (let i = 0; i < h2s.length; i++) {
  const start = h2s[i].index;
  const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
  const title = h2s[i][1].replace(/<[^>]+>/g, '').trim();
  const size = end - start;
  if (size > 500) console.log(`${size.toString().padStart(6)}  ${title}`);
}

const tables = [...html.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)];
console.log('\nTables:', tables.length, 'total:', tables.reduce((a, m) => a + m[0].length, 0));

const lis = [...html.matchAll(/<li[^>]*>[\s\S]*?<\/li>/g)];
console.log('List items:', lis.length, 'avg:', Math.round(lis.reduce((a, m) => a + m[0].length, 0) / lis.length));
