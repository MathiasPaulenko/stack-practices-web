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

let grid = 0;
let count = 0;
const re = /<div id="listing-grid"[\s\S]*?<\/div>/;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(re);
  if (m) {
    grid += m[0].length;
    count++;
  }
}
console.log('Listing grid:', (grid / 1024 / 1024).toFixed(2), 'MB count', count, 'avg', (grid / count / 1024).toFixed(1), 'KB');
