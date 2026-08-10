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

let proseTotal = 0;
let proseCount = 0;
let preTotal = 0;
let preCount = 0;
const reProse = /<section class="bg-white">[\s\S]*?<!-- Related resources -->/;
const rePre = /<pre\b[\s\S]*?<\/pre>/g;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(reProse);
  if (m) {
    proseTotal += m[0].length;
    proseCount++;
    const pre = [...m[0].matchAll(rePre)];
    for (const p of pre) {
      preTotal += p[0].length;
      preCount++;
    }
  }
}
console.log('Prose total:', (proseTotal / 1024 / 1024).toFixed(2), 'MB count', proseCount);
console.log('Pre total:', (preTotal / 1024 / 1024).toFixed(2), 'MB count', preCount);
console.log('Pre %:', (preTotal / proseTotal * 100).toFixed(1));
