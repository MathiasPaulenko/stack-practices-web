import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.md')) files.push(full);
  }
}
walk('src/content');

let count = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/\boverall\b/i.test(lines[i])) {
      count++;
      console.log(`${path.relative('src/content', f)}:${i + 1}: ${lines[i].trim()}`);
    }
  }
}
console.log(`\nTotal: ${count}`);
