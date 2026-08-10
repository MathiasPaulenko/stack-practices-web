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
const classFreq = {};
let totalClassChars = 0;

for (const f of allFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const classes = [...html.matchAll(/class="([^"]*)"/g)];
  for (const m of classes) {
    const c = m[1];
    if (!c) continue;
    // Split combined classes
    const parts = c.split(/\s+/).filter(Boolean);
    // But also track full class strings
    const full = `class="${c}"`;
    classFreq[full] = (classFreq[full] || 0) + 1;
    totalClassChars += full.length;
  }
}

const sorted = Object.entries(classFreq)
  .filter(([c, n]) => n > 100)
  .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
  .slice(0, 30);

console.log(`Total class attribute chars: ${totalClassChars}`);
console.log('\nTop repeated class attributes:');
for (const [c, n] of sorted) {
  const total = n * c.length;
  console.log(`${n.toString().padStart(5)}x ${c.length}ch = ${(total / 1024).toFixed(1)}KB  ${c.slice(0, 100)}`);
}
