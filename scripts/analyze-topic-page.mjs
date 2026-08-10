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

const topics = walk('dist/topics');
const sizes = topics.map((f) => ({ file: path.relative('dist', f), size: fs.statSync(f).size }));
sizes.sort((a, b) => b.size - a.size);
console.log('Topic pages:', topics.length, 'total:', (sizes.reduce((a, x) => a + x.size, 0) / 1024 / 1024).toFixed(2), 'MB');
for (const { file, size } of sizes.slice(0, 10)) {
  console.log(`${(size / 1024).toFixed(1)} KB  ${file}`);
}

// Largest topic
const html = fs.readFileSync(path.join('dist', sizes[0].file), 'utf8');
console.log('\nLargest topic H2 sections:');
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
for (let i = 0; i < h2s.length; i++) {
  const start = h2s[i].index;
  const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
  const title = h2s[i][1].replace(/<[^>]+>/g, '').trim();
  const size = end - start;
  if (size > 300) console.log(`${size.toString().padStart(6)}  ${title}`);
}
