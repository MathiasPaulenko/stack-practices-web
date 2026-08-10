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

let total = 0;
let count = 0;
const re = /<script type="application\/ld\+json"[\s\S]*?<\/script>/g;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(html)) !== null) {
    total += m[0].length;
    count++;
  }
}
console.log('JSON-LD total:', (total / 1024 / 1024).toFixed(2), 'MB');
console.log('Count:', count, 'Avg:', (total / count / 1024).toFixed(1), 'KB');
