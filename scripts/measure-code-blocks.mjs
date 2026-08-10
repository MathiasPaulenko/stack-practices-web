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

let codeSize = 0;
let codeCount = 0;
let htmlSize = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  htmlSize += html.length;
  const preMatches = [...html.matchAll(/<pre\b/g)];
  for (const m of preMatches) {
    const start = m.index;
    const end = html.indexOf('</pre>', start);
    if (end !== -1) {
      codeSize += end + 6 - start;
      codeCount++;
    }
  }
}
console.log('Total HTML:', (htmlSize / 1024 / 1024).toFixed(2), 'MB');
console.log('Code blocks size:', (codeSize / 1024 / 1024).toFixed(2), 'MB');
console.log('Code blocks count:', codeCount);
console.log('Code percentage:', (codeSize / htmlSize * 100).toFixed(1), '%');
