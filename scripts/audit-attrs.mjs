import fs from 'fs';
import path from 'path';

const attrCounts = {};
const attrBytes = {};
let totalAttrBytes = 0;

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) {
      const h = fs.readFileSync(full, 'utf8');
      let m;
      const regex = /\s([a-zA-Z0-9_\-:]+)="([^"]*)"/g;
      while ((m = regex.exec(h)) !== null) {
        const name = m[1];
        const valLen = m[2].length;
        attrCounts[name] = (attrCounts[name] || 0) + 1;
        attrBytes[name] = (attrBytes[name] || 0) + name.length + 3 + valLen;
        totalAttrBytes += name.length + 3 + valLen;
      }
    }
  }
}
walk('dist');

const sorted = Object.entries(attrBytes).sort((a, b) => b[1] - a[1]);
console.log('Total attribute bytes:', (totalAttrBytes / 1024 / 1024).toFixed(2), 'MB');
console.log('Top attributes by bytes:');
for (const [name, bytes] of sorted.slice(0, 30)) {
  console.log(`${(bytes / 1024 / 1024).toFixed(2).padStart(6)} MB  ${String(attrCounts[name]).padStart(8)}  ${name}`);
}
