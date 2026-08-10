import fs from 'fs';
import path from 'path';

const contentDir = 'src/content';
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.md') || full.endsWith('.mdx')) files.push(full);
  }
}
walk(contentDir);

let total = 0;
let long5 = 0;
let long10 = 0;
let long15 = 0;
let totalLines = 0;

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const codeBlocks = [...raw.matchAll(/^```[a-z]*\s*\n([\s\S]*?)```$/gim)];
  for (const m of codeBlocks) {
    const lines = m[1].split('\n').filter((l) => l.trim() !== '').length;
    total++;
    totalLines += lines;
    if (lines > 5) long5++;
    if (lines > 10) long10++;
    if (lines > 15) long15++;
  }
}

console.log('Total code blocks:', total);
console.log('Total non-empty code lines:', totalLines);
console.log('Longer than 5 lines:', long5, '(' + (long5/total*100).toFixed(1) + '%)');
console.log('Longer than 10 lines:', long10, '(' + (long10/total*100).toFixed(1) + '%)');
console.log('Longer than 15 lines:', long15, '(' + (long15/total*100).toFixed(1) + '%)');
