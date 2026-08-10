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

const allFiles = walk('dist');
const categories = {
  recipe: /(^|\/)recipes\//,
  pattern: /(^|\/)patterns\//,
  guide: /(^|\/)guides\//,
  doc: /(^|\/)docs\//,
  tag: /(^|\/)tags\//,
  author: /(^|\/)authors\//,
  topic: /(^|\/)topics\//,
  home: /(^|\/)index\.html$/,
};

const other = [];
for (const f of allFiles) {
  const rel = path.relative('dist', f).replace(/\\/g, '/');
  let matched = false;
  for (const [cat, re] of Object.entries(categories)) {
    if (re.test(rel)) { matched = true; break; }
  }
  if (!matched) other.push({ file: rel, size: fs.statSync(f).size });
}

other.sort((a, b) => b.size - a.size);
const total = other.reduce((a, x) => a + x.size, 0);
console.log(`Other pages: ${other.length}, total: ${(total / 1024 / 1024).toFixed(2)} MB\n`);

// Group by directory prefix
const groups = {};
for (const x of other) {
  const parts = x.file.split('/');
  const prefix = parts.length > 1 ? parts[0] : '(root)';
  if (!groups[prefix]) groups[prefix] = { count: 0, total: 0 };
  groups[prefix].count++;
  groups[prefix].total += x.size;
}
const sortedGroups = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
console.log('By prefix:');
for (const [prefix, { count, total }] of sortedGroups) {
  console.log(`  ${prefix.padEnd(20)} ${count.toString().padStart(5)} pages  ${(total / 1024 / 1024).toFixed(2)} MB`);
}

console.log('\nTop 20 largest "other" files:');
for (const x of other.slice(0, 20)) {
  console.log(`  ${(x.size / 1024).toFixed(1)} KB  ${x.file}`);
}
