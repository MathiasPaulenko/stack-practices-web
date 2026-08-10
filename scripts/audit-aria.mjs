import fs from 'node:fs';
import path from 'node:path';

const counts = {};
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (f.endsWith('.html')) {
      const t = fs.readFileSync(fp, 'utf8');
      const re = /aria-label="([^"]+)"/g;
      let m;
      while ((m = re.exec(t))) {
        counts[m[1]] = (counts[m[1]] || 0) + 1;
      }
    }
  }
}
walk('dist');
const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log(arr.slice(0, 30).map(([l, n]) => `${n}\t${l}`).join('\n'));
