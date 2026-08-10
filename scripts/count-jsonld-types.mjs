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

const counts = {};
const sizes = {};
const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(html)) !== null) {
    let type;
    try {
      type = JSON.parse(m[1])['@type'] || 'unknown';
    } catch (e) {
      type = 'unknown';
    }
    counts[type] = (counts[type] || 0) + 1;
    sizes[type] = (sizes[type] || 0) + m[0].length;
  }
}
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
for (const [type, count] of sorted) {
  console.log(type, count, 'size', (sizes[type] / 1024 / 1024).toFixed(2), 'MB');
}
